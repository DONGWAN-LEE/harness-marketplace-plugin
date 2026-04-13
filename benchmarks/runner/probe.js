#!/usr/bin/env node
/**
 * Probe — verifies that `claude -p "/project-plan <task>"` actually resolves
 * the project-plan skill and writes state/results/plan.json when a rendered
 * harness is present in the target dir.
 *
 * Results: writes benchmarks/results/probe.json with mode={"native"|"injection"|"fail"}.
 */

import { writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { invokeClaude } from './invoke.js';
import { renderHarness } from './render-harness.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');

async function probe() {
  const tempDir = path.join(os.tmpdir(), `bench-probe-${Date.now()}`);
  const seedDir = path.join(BENCHMARKS_DIR, 'reference-projects', 'nextjs-supabase-seed');
  const harnessDir = path.join(BENCHMARKS_DIR, 'reference-projects', 'nextjs-supabase-harness');

  console.log(`[probe] Setting up test dir: ${tempDir}`);
  await cp(seedDir, tempDir, { recursive: true });
  await cp(harnessDir, tempDir, { recursive: true, force: true });
  await renderHarness(tempDir, 'nextjs-supabase');

  const skillPath = path.join(tempDir, '.claude', 'skills', 'project-plan', 'SKILL.md');
  if (!existsSync(skillPath)) {
    console.error(`[probe] FAIL: SKILL.md not rendered at ${skillPath}`);
    return { mode: 'fail', reason: 'skill-not-rendered' };
  }
  console.log(`[probe] SKILL.md present: ${skillPath}`);

  const planResultPath = path.join(tempDir, '.claude', 'skills', 'project-harness', 'state', 'results', 'plan.json');

  console.log(`[probe] Invoking: claude -p "/project-plan test probe task"`);
  const result = await invokeClaude({
    cwd: tempDir,
    prompt: '/project-plan simple test task: create a README with one line',
    model: 'sonnet',
    timeoutMs: 120_000,
    logPath: path.join(BENCHMARKS_DIR, 'results', 'probe-events.jsonl'),
  });

  console.log(`[probe] Exit code: ${result.exitCode}`);
  console.log(`[probe] Elapsed: ${result.metrics.elapsed_ms}ms`);
  console.log(`[probe] Tool calls: ${result.metrics.tool_calls}`);
  console.log(`[probe] Hook events: ${result.hookEvents.length}`);
  console.log(`[probe] Stdout (first 500 chars): ${result.stdout.slice(0, 500)}`);

  // Signals of success: skill resolved AND produced plan.json (or at least mentioned plan in output)
  const planJsonWritten = existsSync(planResultPath);
  const outputMentionsPlan = /plan(ning)?|classif/i.test(result.stdout);
  const toolsUsed = result.metrics.tool_calls > 0;

  let mode = 'fail';
  let reason = null;
  if (planJsonWritten) {
    mode = 'native-full';
    reason = 'plan.json written — skill executed the full flow';
  } else if (toolsUsed && outputMentionsPlan) {
    mode = 'native-partial';
    reason = 'skill resolved (tools used + plan mentioned) but no plan.json artifact';
  } else if (result.exitCode === 0 && outputMentionsPlan) {
    mode = 'text-only';
    reason = 'response relates to planning but no tool use or artifact';
  } else {
    mode = 'injection';
    reason = 'skill may not have resolved natively — fallback injection recommended';
  }

  const report = {
    timestamp: new Date().toISOString(),
    mode,
    reason,
    exit_code: result.exitCode,
    elapsed_ms: result.metrics.elapsed_ms,
    tokens_in: result.metrics.tokens_in,
    tokens_out: result.metrics.tokens_out,
    cost_usd: result.metrics.cost_usd,
    tool_calls: result.metrics.tool_calls,
    hook_events_count: result.hookEvents.length,
    stdout_snippet: result.stdout.slice(0, 2000),
    plan_json_written: planJsonWritten,
  };

  const resultsDir = path.join(BENCHMARKS_DIR, 'results');
  await mkdir(resultsDir, { recursive: true });
  await writeFile(path.join(resultsDir, 'probe.json'), JSON.stringify(report, null, 2));
  console.log(`[probe] Mode: ${mode}`);
  console.log(`[probe] Reason: ${reason}`);
  console.log(`[probe] Report: ${path.join(resultsDir, 'probe.json')}`);

  // Cleanup
  try { await rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }

  return report;
}

if (process.argv[1] && process.argv[1].endsWith('probe.js')) {
  probe().catch((err) => {
    console.error(`[probe] FATAL: ${err.message}`);
    process.exit(2);
  });
}

export { probe };
