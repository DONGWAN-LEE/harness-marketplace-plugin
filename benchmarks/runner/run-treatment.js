#!/usr/bin/env node
/**
 * Treatment runner — manual-chain pipeline invocation.
 *
 * Executes (for non-pipeline tasks):
 *   1. /project-plan <task>
 *   2. /project-implement
 *   3. /project-verify
 *
 * For pipeline tasks also enables:
 *   - /project-debug (if classification flags it)
 *   - Regression loop: if verify says regression_needed, re-invoke implement + verify once.
 *
 * fire-and-forget mode: only /project-implement is called (for orchestration-vs-hooks isolation).
 *
 * Usage:
 *   node benchmarks/runner/run-treatment.js --task <task-id> --n <label> [--mode manual-chain|fire-and-forget]
 */

import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { invokeClaude, summarizeHookEvents } from './invoke.js';
import { renderHarness } from './render-harness.js';
import { getTask } from '../tasks/task-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { task: null, n: '1', model: 'sonnet', mode: 'manual-chain', skipCleanup: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--task') args.task = argv[++i];
    else if (a === '--n') args.n = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--mode') args.mode = argv[++i];
    else if (a === '--skip-cleanup') args.skipCleanup = true;
  }
  if (!args.task) {
    console.error('ERROR: --task is required');
    process.exit(1);
  }
  return args;
}

async function runGit(cwd, cmd) {
  try { execSync(`git ${cmd}`, { cwd, stdio: 'pipe' }); } catch { /* silent */ }
}

async function snapshotProject(tempDir, outDir) {
  await mkdir(outDir, { recursive: true });
  const skipPatterns = new Set(['node_modules', '.next', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache']);
  await cp(tempDir, outDir, {
    recursive: true,
    filter: (src) => !skipPatterns.has(path.basename(src)),
  });
}

async function gitDiff(cwd) {
  try { return execSync('git diff HEAD', { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }); } catch { return ''; }
}

function phaseSummary(name, result, exitCode) {
  return {
    name,
    elapsed_ms: result.metrics.elapsed_ms,
    tokens_in: result.metrics.tokens_in,
    tokens_out: result.metrics.tokens_out,
    cost_usd: result.metrics.cost_usd,
    tool_calls: result.metrics.tool_calls,
    hook_events: result.hookEvents.length,
    exit_code: exitCode,
    killed_by_timeout: result.killedByTimeout,
  };
}

async function runTreatment(opts) {
  const { task: taskId, n, model, mode } = opts;
  const task = getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const condLabel = mode === 'fire-and-forget' ? 'fireforget' : 'treatment';
  const isoTs = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `${taskId}__${condLabel}__n${n}__${isoTs}`;
  const tempDir = path.join(os.tmpdir(), `bench-${runId}`);
  const resultsDir = path.join(BENCHMARKS_DIR, 'results', 'raw', runId);

  console.log(`[treatment] Run ${runId} (mode=${mode})`);
  console.log(`[treatment] Temp: ${tempDir}`);

  // Copy seed + overlay harness
  const seedDir = path.join(BENCHMARKS_DIR, 'reference-projects', task.seed_dir);
  const harnessDir = path.join(BENCHMARKS_DIR, 'reference-projects', task.harness_dir);
  if (!existsSync(seedDir)) throw new Error(`Seed not found: ${seedDir}`);
  if (!existsSync(harnessDir)) throw new Error(`Harness overlay not found: ${harnessDir}`);

  await cp(seedDir, tempDir, { recursive: true });
  await cp(harnessDir, tempDir, { recursive: true, force: true });

  // Render project-harness skills (orchestrator + plan + debug + implement + verify)
  await renderHarness(tempDir, task.stack);

  // Git init
  await runGit(tempDir, 'init -q');
  await runGit(tempDir, 'add -A');
  await runGit(tempDir, 'commit -q -m "seed + harness" --allow-empty');

  // Write TASK.md
  const taskPromptPath = path.join(BENCHMARKS_DIR, 'tasks', task.category, `${taskId}.md`);
  const taskPrompt = await readFile(taskPromptPath, 'utf8');
  const body = taskPrompt.replace(/^---\n[\s\S]*?\n---\n+/, '');
  await writeFile(path.join(tempDir, 'TASK.md'), body);

  const phases = [];
  const allHookEvents = [];

  const skillStatePath = path.join(tempDir, '.claude', 'skills', 'project-harness', 'state');

  // ===== Phase 1: Plan (skip in fire-and-forget) =====
  if (mode !== 'fire-and-forget') {
    console.log(`[treatment] Phase 1: /project-plan`);
    const planPrompt = `/project-plan ${body}`;
    const planResult = await invokeClaude({
      cwd: tempDir,
      prompt: planPrompt,
      model,
      logPath: path.join(resultsDir, 'events', 'plan.jsonl'),
      timeoutMs: 5 * 60_000,
    });
    phases.push(phaseSummary('plan', planResult, planResult.exitCode));
    allHookEvents.push(...planResult.hookEvents);

    // Capture any handoff state
    const planResultFile = path.join(skillStatePath, 'results', 'plan.json');
    if (existsSync(planResultFile)) {
      console.log(`[treatment] Plan result captured: ${planResultFile}`);
    } else {
      console.log(`[treatment] WARN: plan.json not written — skill may not have resolved; continuing`);
    }
  }

  // ===== Phase 2: Debug (only if task.enable_debug and type=bugfix) =====
  if (mode !== 'fire-and-forget' && task.enable_debug) {
    console.log(`[treatment] Phase 2: /project-debug`);
    const debugResult = await invokeClaude({
      cwd: tempDir,
      prompt: `/project-debug ${body}`,
      model,
      logPath: path.join(resultsDir, 'events', 'debug.jsonl'),
      timeoutMs: 5 * 60_000,
    });
    phases.push(phaseSummary('debug', debugResult, debugResult.exitCode));
    allHookEvents.push(...debugResult.hookEvents);
  }

  // ===== Phase 3: Implement =====
  console.log(`[treatment] Phase 3: /project-implement`);
  const implPrompt = mode === 'fire-and-forget'
    ? `/project-implement ${body}`
    : `/project-implement (use plan from state/results/plan.json if present)`;
  const implResult = await invokeClaude({
    cwd: tempDir,
    prompt: implPrompt,
    model,
    logPath: path.join(resultsDir, 'events', 'implement.jsonl'),
    timeoutMs: 8 * 60_000,
  });
  phases.push(phaseSummary('implement', implResult, implResult.exitCode));
  allHookEvents.push(...implResult.hookEvents);

  // ===== Phase 4: Verify (skip in fire-and-forget) =====
  let regressionLoopInvoked = false;
  let regressionLoopRecovered = false;
  if (mode !== 'fire-and-forget') {
    console.log(`[treatment] Phase 4: /project-verify`);
    const verifyResult = await invokeClaude({
      cwd: tempDir,
      prompt: `/project-verify`,
      model,
      logPath: path.join(resultsDir, 'events', 'verify.jsonl'),
      timeoutMs: 5 * 60_000,
    });
    phases.push(phaseSummary('verify', verifyResult, verifyResult.exitCode));
    allHookEvents.push(...verifyResult.hookEvents);

    // Check if regression loop needed
    const verifyJsonPath = path.join(skillStatePath, 'results', 'verify.json');
    if (existsSync(verifyJsonPath)) {
      try {
        const v = JSON.parse(await readFile(verifyJsonPath, 'utf8'));
        if (v.regression_needed === true || v.needs_fix === true) {
          regressionLoopInvoked = true;
          console.log(`[treatment] Phase 5: Regression loop (implement #2)`);
          const impl2 = await invokeClaude({
            cwd: tempDir,
            prompt: `/project-implement --regression (fix issues from verify.json)`,
            model,
            logPath: path.join(resultsDir, 'events', 'implement2.jsonl'),
            timeoutMs: 8 * 60_000,
          });
          phases.push(phaseSummary('implement-2', impl2, impl2.exitCode));
          allHookEvents.push(...impl2.hookEvents);

          console.log(`[treatment] Phase 6: /project-verify (post-regression)`);
          const v2 = await invokeClaude({
            cwd: tempDir,
            prompt: `/project-verify`,
            model,
            logPath: path.join(resultsDir, 'events', 'verify2.jsonl'),
            timeoutMs: 5 * 60_000,
          });
          phases.push(phaseSummary('verify-2', v2, v2.exitCode));
          allHookEvents.push(...v2.hookEvents);

          // Check recovery
          if (existsSync(verifyJsonPath)) {
            try {
              const vv = JSON.parse(await readFile(verifyJsonPath, 'utf8'));
              regressionLoopRecovered = vv.regression_needed !== true && vv.needs_fix !== true;
            } catch { /* ignore */ }
          }
        }
      } catch { /* ignore */ }
    }
  }

  // ===== Snapshot =====
  const projectOut = path.join(resultsDir, 'project');
  await snapshotProject(tempDir, projectOut);
  const diff = await gitDiff(tempDir);
  await writeFile(path.join(resultsDir, 'diff.patch'), diff);

  // Copy state/ and handoffs/ separately for easier inspection
  if (existsSync(skillStatePath)) {
    await cp(skillStatePath, path.join(resultsDir, 'skill-state'), { recursive: true });
  }

  const totalElapsed = phases.reduce((s, p) => s + p.elapsed_ms, 0);
  const totalTokens = phases.reduce((s, p) => s + p.tokens_in + p.tokens_out, 0);
  const totalCost = phases.reduce((s, p) => s + p.cost_usd, 0);
  const totalTools = phases.reduce((s, p) => s + p.tool_calls, 0);

  // Handoff files present?
  const handoffDir = path.join(skillStatePath, 'handoffs');
  const resultsSubDir = path.join(skillStatePath, 'results');
  const handoffFiles = existsSync(handoffDir)
    ? (await import('node:fs/promises').then(fs => fs.readdir(handoffDir).catch(() => [])))
    : [];
  const resultFiles = existsSync(resultsSubDir)
    ? (await import('node:fs/promises').then(fs => fs.readdir(resultsSubDir).catch(() => [])))
    : [];

  const manifest = {
    schema_version: '0.5',
    run_id: runId,
    task_id: taskId,
    category: task.category,
    stack: task.stack,
    condition: mode === 'fire-and-forget' ? 'fire-and-forget' : 'treatment',
    treatment_mode: mode,
    n,
    model,
    seed_dir: seedDir,
    harness_dir: harnessDir,
    temp_dir: tempDir,
    results_dir: resultsDir,
    started_at: isoTs,
    finished_at: new Date().toISOString(),
    phases,
    totals: {
      elapsed_ms: totalElapsed,
      tokens_total: totalTokens,
      cost_usd: totalCost,
      tool_calls: totalTools,
    },
    hook_summary: summarizeHookEvents(allHookEvents),
    pipeline: {
      handoffs_present: handoffFiles,
      result_files_present: resultFiles,
      regression_loop_invoked: regressionLoopInvoked,
      regression_loop_recovered: regressionLoopRecovered,
    },
  };
  await writeFile(path.join(resultsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const summary = `phases=${phases.length} elapsed=${totalElapsed}ms cost=$${totalCost.toFixed(4)} tokens=${totalTokens} tools=${totalTools} hooks=${allHookEvents.length}${regressionLoopInvoked ? ' loop=invoked' : ''}${regressionLoopRecovered ? ' recovered=yes' : ''}`;
  console.log(`[treatment] Done. ${summary}`);

  if (!opts.skipCleanup) {
    try { await rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  return { runId, manifest, success: phases.every(p => p.exit_code === 0) };
}

if (process.argv[1] && process.argv[1].endsWith('run-treatment.js')) {
  const args = parseArgs(process.argv);
  runTreatment(args).catch((err) => {
    console.error(`[treatment] FATAL: ${err.message}`);
    process.exit(2);
  });
}

export { runTreatment };
