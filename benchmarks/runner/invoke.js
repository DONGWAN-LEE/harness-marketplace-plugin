#!/usr/bin/env node
/**
 * Shared wrapper for `claude -p` invocation with stream-json output parsing.
 *
 * Captures per-invocation:
 *   - tokens_in, tokens_out, cost_usd (from final result event)
 *   - tool_calls (count + by_name)
 *   - hook_events (with --include-hook-events)
 *   - elapsed_ms
 *   - exit_code, stdout, stderr
 *
 * Also appends raw newline-delimited JSON events to logPath for forensic replay.
 */

import { spawn } from 'node:child_process';
import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

/**
 * @param {object} opts
 * @param {string} opts.cwd - working directory
 * @param {string} opts.prompt - prompt body (may start with /skill-name)
 * @param {string} [opts.model='sonnet']
 * @param {number} [opts.maxBudgetUsd]
 * @param {number} [opts.timeoutMs=600000]
 * @param {string} [opts.logPath] - absolute path to append jsonl events
 * @param {boolean} [opts.includeHookEvents=true]
 * @returns {Promise<{exitCode, stdout, stderr, metrics, events}>}
 */
export async function invokeClaude(opts) {
  const {
    cwd,
    prompt,
    model = 'sonnet',
    maxBudgetUsd = null,
    timeoutMs = 600_000,
    logPath = null,
    includeHookEvents = true,
  } = opts;

  const args = [
    '-p',
    '--model', model,
    '--output-format', 'stream-json',
    '--verbose',
    '--dangerously-skip-permissions',
  ];
  if (includeHookEvents) args.push('--include-hook-events');
  if (maxBudgetUsd != null) args.push('--max-budget-usd', String(maxBudgetUsd));

  // Ensure log dir exists
  if (logPath) {
    await mkdir(path.dirname(logPath), { recursive: true });
  }

  const startTs = Date.now();
  return new Promise((resolve) => {
    const child = spawn('claude', args, {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const events = [];
    const hookEvents = [];
    const toolCalls = [];
    let tokensIn = 0;
    let tokensOut = 0;
    let costUsd = 0;
    let textOut = '';
    let errChunks = [];
    let buffer = '';
    let killedByTimeout = false;

    const timer = setTimeout(() => {
      killedByTimeout = true;
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, timeoutMs);

    child.stdout.on('data', async (chunk) => {
      buffer += chunk.toString('utf8');
      let nl;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (!line.trim()) continue;
        let event;
        try {
          event = JSON.parse(line);
        } catch {
          // Not JSON — might be plain-text tail. Append to textOut.
          textOut += line + '\n';
          continue;
        }
        events.push(event);
        if (logPath) {
          try { await appendFile(logPath, line + '\n'); } catch { /* ignore */ }
        }

        // Classify events
        // stream-json event types observed: "system", "assistant", "user", "result", "tool_use", "hook"
        if (event.type === 'result') {
          // Final result event contains usage, cost, result text
          if (event.usage) {
            tokensIn = event.usage.input_tokens ?? event.usage.prompt_tokens ?? 0;
            tokensOut = event.usage.output_tokens ?? event.usage.completion_tokens ?? 0;
          }
          if (typeof event.total_cost_usd === 'number') costUsd = event.total_cost_usd;
          else if (typeof event.cost_usd === 'number') costUsd = event.cost_usd;
          if (typeof event.result === 'string') textOut += event.result;
        } else if (event.type === 'assistant' && event.message?.content) {
          // assistant messages — extract tool_use and text
          const content = Array.isArray(event.message.content) ? event.message.content : [event.message.content];
          for (const part of content) {
            if (part.type === 'tool_use') {
              toolCalls.push({ name: part.name, id: part.id });
            } else if (part.type === 'text' && typeof part.text === 'string') {
              textOut += part.text;
            }
          }
        } else if (event.type === 'hook' || event.hook_event_name) {
          hookEvents.push(event);
        }
      }
    });

    child.stderr.on('data', (d) => errChunks.push(d));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        exitCode: -1,
        stdout: textOut,
        stderr: `spawn error: ${err.message}`,
        metrics: { elapsed_ms: Date.now() - startTs, tokens_in: 0, tokens_out: 0, cost_usd: 0, tool_calls: 0 },
        events: [],
        hookEvents: [],
        toolCalls: [],
        killedByTimeout: false,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: killedByTimeout ? 124 : (code ?? -1),
        stdout: textOut,
        stderr: Buffer.concat(errChunks).toString('utf8'),
        metrics: {
          elapsed_ms: Date.now() - startTs,
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cost_usd: costUsd,
          tool_calls: toolCalls.length,
        },
        events,
        hookEvents,
        toolCalls,
        killedByTimeout,
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/**
 * Classify hook events into blocks by hook name.
 * Returns { total, by_hook: {name: count}, events: [] }
 */
export function summarizeHookEvents(hookEvents) {
  const byHook = {};
  const blocks = [];
  for (const ev of hookEvents) {
    // stream-json hook events have shape like:
    // { type: "hook", hook_event_name: "PreToolUse", hook_name: "secret-guard", decision: "block"|"approve"|... }
    // Or they may appear inside tool_use_result style events.
    const name = ev.hook_name ?? ev.name ?? (ev.hook?.name) ?? 'unknown';
    const decision = ev.decision ?? ev.hook?.decision ?? null;
    const event = ev.hook_event_name ?? ev.event ?? null;
    byHook[name] = (byHook[name] || 0) + 1;
    if (decision === 'block' || decision === 'deny') {
      blocks.push({ hook: name, event, detail: ev.reason ?? ev.hook?.reason ?? null });
    }
  }
  return { total: hookEvents.length, by_hook: byHook, blocks };
}
