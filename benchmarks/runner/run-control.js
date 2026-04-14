#!/usr/bin/env node
/**
 * Control runner — single-shot `claude -p` baseline.
 *
 * Usage:
 *   node benchmarks/runner/run-control.js --task <task-id> --n <label>
 */

import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

import { invokeClaude, summarizeHookEvents } from './invoke.js';
import { getTask } from '../tasks/task-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(BENCHMARKS_DIR, '..');

function parseArgs(argv) {
  const args = { task: null, n: '1', model: 'sonnet', skipCleanup: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--task') args.task = argv[++i];
    else if (a === '--n') args.n = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--skip-cleanup') args.skipCleanup = true;
  }
  if (!args.task) {
    console.error('ERROR: --task is required');
    process.exit(1);
  }
  return args;
}

async function runGit(cwd, cmd) {
  try {
    execSync(`git ${cmd}`, { cwd, stdio: 'pipe' });
  } catch (err) {
    // silent — diff/commit may fail on fresh dirs
  }
}

async function snapshotProject(tempDir, outDir) {
  await mkdir(outDir, { recursive: true });
  // Copy project files excluding heavy dirs
  const skipPatterns = ['node_modules', '.next', '.venv', 'venv', '__pycache__', '.pytest_cache', '.mypy_cache'];
  await cp(tempDir, outDir, {
    recursive: true,
    filter: (src) => {
      const base = path.basename(src);
      return !skipPatterns.includes(base);
    },
  });
}

async function gitDiff(cwd) {
  try {
    const diff = execSync('git diff HEAD', { cwd, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return diff;
  } catch {
    return '';
  }
}

async function runControl(opts) {
  const { task: taskId, n, model } = opts;
  const task = getTask(taskId);
  if (!task) throw new Error(`Task not found: ${taskId}`);

  const isoTs = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `${taskId}__control__n${n}__${isoTs}`;
  const tempDir = path.join(os.tmpdir(), `bench-${runId}`);
  const resultsDir = path.join(BENCHMARKS_DIR, 'results', 'raw', runId);

  console.log(`[control] Run ${runId}`);
  console.log(`[control] Temp: ${tempDir}`);
  console.log(`[control] Results: ${resultsDir}`);

  // Copy seed
  const seedDir = path.join(BENCHMARKS_DIR, 'reference-projects', task.seed_dir);
  if (!existsSync(seedDir)) throw new Error(`Seed not found: ${seedDir}`);
  await cp(seedDir, tempDir, { recursive: true });

  // Git init for diff tracking
  await runGit(tempDir, 'init -q');
  await runGit(tempDir, 'add -A');
  await runGit(tempDir, 'commit -q -m "seed" --allow-empty');

  // Write TASK.md
  const taskPromptPath = path.join(BENCHMARKS_DIR, 'tasks', task.category, `${taskId}.md`);
  const taskPrompt = await readFile(taskPromptPath, 'utf8');
  // Extract body (after YAML frontmatter)
  const body = taskPrompt.replace(/^---\n[\s\S]*?\n---\n+/, '');
  await writeFile(path.join(tempDir, 'TASK.md'), body);

  // Invoke claude -p
  const logPath = path.join(resultsDir, 'events', 'events.jsonl');
  const result = await invokeClaude({
    cwd: tempDir,
    prompt: body,
    model,
    logPath,
    timeoutMs: 8 * 60_000,
  });

  // Snapshot project
  const projectOut = path.join(resultsDir, 'project');
  await snapshotProject(tempDir, projectOut);
  const diff = await gitDiff(tempDir);
  await writeFile(path.join(resultsDir, 'diff.patch'), diff);

  // Build manifest
  const manifest = {
    schema_version: '0.5',
    run_id: runId,
    task_id: taskId,
    category: task.category,
    stack: task.stack,
    condition: 'control',
    n,
    model,
    seed_dir: seedDir,
    temp_dir: tempDir,
    results_dir: resultsDir,
    started_at: isoTs,
    finished_at: new Date().toISOString(),
    phases: [
      {
        name: 'single-shot',
        elapsed_ms: result.metrics.elapsed_ms,
        tokens_in: result.metrics.tokens_in,
        tokens_out: result.metrics.tokens_out,
        cost_usd: result.metrics.cost_usd,
        tool_calls: result.metrics.tool_calls,
        exit_code: result.exitCode,
      },
    ],
    totals: {
      elapsed_ms: result.metrics.elapsed_ms,
      tokens_total: result.metrics.tokens_in + result.metrics.tokens_out,
      cost_usd: result.metrics.cost_usd,
      tool_calls: result.metrics.tool_calls,
    },
    hook_summary: summarizeHookEvents(result.hookEvents),
    killed_by_timeout: result.killedByTimeout,
    exit_code: result.exitCode,
    stdout_bytes: Buffer.byteLength(result.stdout),
    stderr_bytes: Buffer.byteLength(result.stderr),
  };
  await writeFile(path.join(resultsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  // Save stdout/stderr for forensics
  await writeFile(path.join(resultsDir, 'stdout.txt'), result.stdout);
  await writeFile(path.join(resultsDir, 'stderr.txt'), result.stderr);

  console.log(`[control] Done. Exit=${result.exitCode} Elapsed=${result.metrics.elapsed_ms}ms Cost=$${result.metrics.cost_usd.toFixed(4)} Tokens=${result.metrics.tokens_in + result.metrics.tokens_out} Tools=${result.metrics.tool_calls} Hooks=${result.hookEvents.length}`);

  // Cleanup temp
  if (!opts.skipCleanup) {
    try {
      await import('node:fs/promises').then(fs => fs.rm(tempDir, { recursive: true, force: true }));
    } catch { /* ignore */ }
  }

  return { runId, manifest, success: result.exitCode === 0 };
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].endsWith('run-control.js')) {
  const args = parseArgs(process.argv);
  runControl(args).catch((err) => {
    console.error(`[control] FATAL: ${err.message}`);
    process.exit(2);
  });
}

export { runControl };
