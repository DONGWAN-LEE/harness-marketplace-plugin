#!/usr/bin/env node
/**
 * Benchmark runner — executes a single task in an isolated working directory.
 *
 * Usage:
 *   node benchmarks/runner/run.js --task nextjs-basic --condition control --n 1
 *   node benchmarks/runner/run.js --task fastapi-advanced --condition treatment --n 2
 *   node benchmarks/runner/run.js --task nextjs-basic --condition control --n 1 --dry-run
 *
 * Options:
 *   --task        Task ID (filename in benchmarks/tasks/ without .md)
 *   --condition   'control' (seed only) or 'treatment' (seed + harness overlay)
 *   --n           Run number within (task, condition) cell, used for run-id
 *   --model       Claude model to use (default: sonnet)
 *   --dry-run     Print what would happen without invoking claude
 *   --keep-temp   Don't cleanup temp directory after run
 */

import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile, cp, stat, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(BENCHMARKS_DIR, '..');

function parseArgs(argv) {
  const args = {
    task: null,
    condition: null,
    n: 1,
    model: 'sonnet',
    dryRun: false,
    keepTemp: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--task') args.task = argv[++i];
    else if (a === '--condition') args.condition = argv[++i];
    else if (a === '--n') args.n = parseInt(argv[++i], 10);
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '--keep-temp') args.keepTemp = true;
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node run.js --task <id> --condition <control|treatment> --n <num> [--model sonnet] [--dry-run] [--keep-temp]`);
      process.exit(0);
    }
  }
  if (!args.task) {
    console.error('ERROR: --task is required');
    process.exit(1);
  }
  if (!['control', 'treatment'].includes(args.condition)) {
    console.error('ERROR: --condition must be "control" or "treatment"');
    process.exit(1);
  }
  return args;
}

function parseTaskSpec(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Task spec missing YAML frontmatter');
  }
  const frontmatter = {};
  for (const line of match[1].split('\n')) {
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) frontmatter[m[1]] = m[2].trim();
  }
  return { frontmatter, prompt: match[2].trim() };
}

async function copyDirectory(src, dest) {
  await cp(src, dest, { recursive: true, force: true });
}

async function isDirectory(p) {
  try {
    const s = await stat(p);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function runClaude(prompt, cwd, model, logFile, settingsPath) {
  return new Promise((resolve) => {
    // Pass prompt via stdin to avoid shell quoting issues with multi-line text.
    const args = [
      '-p',
      '--model',
      model,
      '--dangerously-skip-permissions',
    ];
    if (settingsPath) {
      args.push('--settings', settingsPath);
    }
    const child = spawn('claude', args, {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    const chunks = [];
    const errChunks = [];
    child.stdout.on('data', (d) => chunks.push(d));
    child.stderr.on('data', (d) => errChunks.push(d));
    child.on('error', (err) => {
      resolve({ exitCode: -1, stdout: '', stderr: `spawn error: ${err.message}` });
    });
    child.on('close', (code) => {
      const stdout = Buffer.concat(chunks).toString('utf8');
      const stderr = Buffer.concat(errChunks).toString('utf8');
      resolve({ exitCode: code ?? -1, stdout, stderr });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

async function main() {
  const args = parseArgs(process.argv);

  // Load task spec
  const taskPath = path.join(BENCHMARKS_DIR, 'tasks', `${args.task}.md`);
  if (!existsSync(taskPath)) {
    console.error(`ERROR: task spec not found: ${taskPath}`);
    process.exit(1);
  }
  const taskContent = await readFile(taskPath, 'utf8');
  const { frontmatter, prompt } = parseTaskSpec(taskContent);

  const seedDir = path.join(BENCHMARKS_DIR, 'reference-projects', frontmatter.seed_dir);
  const harnessDir = path.join(BENCHMARKS_DIR, 'reference-projects', frontmatter.harness_dir);

  if (!(await isDirectory(seedDir))) {
    console.error(`ERROR: seed directory not found: ${seedDir}`);
    process.exit(1);
  }
  if (args.condition === 'treatment' && !(await isDirectory(harnessDir))) {
    console.error(`ERROR: harness directory not found: ${harnessDir}`);
    process.exit(1);
  }

  // Generate run ID
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const runId = `${args.task}__${args.condition}__n${args.n}__${timestamp}`;

  // Create results dir for this run
  const resultsDir = path.join(BENCHMARKS_DIR, 'results', 'raw', runId);
  await mkdir(resultsDir, { recursive: true });

  // Create temp working directory
  const tempDir = path.join(os.tmpdir(), `bench-${runId}`);
  await mkdir(tempDir, { recursive: true });

  const manifest = {
    run_id: runId,
    task: args.task,
    difficulty: frontmatter.difficulty,
    stack: frontmatter.stack,
    condition: args.condition,
    n: args.n,
    model: args.model,
    seed_dir: seedDir,
    harness_dir: args.condition === 'treatment' ? harnessDir : null,
    temp_dir: tempDir,
    results_dir: resultsDir,
    started_at: new Date().toISOString(),
  };

  console.log(`[runner] Run ID: ${runId}`);
  console.log(`[runner] Task: ${args.task} (${frontmatter.difficulty}, ${frontmatter.stack})`);
  console.log(`[runner] Condition: ${args.condition}`);
  console.log(`[runner] Temp dir: ${tempDir}`);
  console.log(`[runner] Results: ${resultsDir}`);

  // Step 1: Copy seed to temp dir
  console.log(`[runner] Copying seed...`);
  await copyDirectory(seedDir, tempDir);

  // Step 2: Overlay harness if treatment
  if (args.condition === 'treatment') {
    console.log(`[runner] Overlaying harness...`);
    await copyDirectory(harnessDir, tempDir);
    // Hook scripts keep their exec bit from the source tree on Unix;
    // on Windows bash (Git Bash) invokes them via `bash hook.sh` so exec bit is irrelevant.
  }

  // Write the task prompt to the temp dir so Claude can reference it
  await writeFile(path.join(tempDir, 'TASK.md'), prompt, 'utf8');

  if (args.dryRun) {
    console.log(`[runner] DRY RUN — would invoke: claude -p "${prompt.slice(0, 80)}..." --model ${args.model} --cwd ${tempDir}`);
    manifest.dry_run = true;
    manifest.finished_at = new Date().toISOString();
    await writeFile(path.join(resultsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
    return;
  }

  // Step 3: Invoke claude -p
  // Claude Code auto-discovers .claude/settings.json from cwd (verified via debug logs).
  // No need to pass --settings explicitly.
  console.log(`[runner] Invoking claude -p (model: ${args.model})...`);
  const startTime = Date.now();
  const { exitCode, stdout, stderr } = await runClaude(prompt, tempDir, args.model, path.join(resultsDir, 'claude.log'), null);
  const elapsedMs = Date.now() - startTime;

  console.log(`[runner] claude exit=${exitCode}, elapsed=${(elapsedMs / 1000).toFixed(1)}s`);

  // Step 4: Persist outputs
  await writeFile(path.join(resultsDir, 'stdout.txt'), stdout);
  await writeFile(path.join(resultsDir, 'stderr.txt'), stderr);

  // Step 5: Snapshot final project state (excluding node_modules, .venv)
  const projectSnapshotDir = path.join(resultsDir, 'project');
  await mkdir(projectSnapshotDir, { recursive: true });
  await cp(tempDir, projectSnapshotDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      const rel = path.relative(tempDir, src);
      const parts = rel.split(path.sep);
      if (parts.includes('node_modules')) return false;
      if (parts.includes('.venv') || parts.includes('venv')) return false;
      if (parts.includes('.next')) return false;
      if (parts.includes('__pycache__')) return false;
      if (parts.includes('.pytest_cache')) return false;
      if (parts.includes('.ruff_cache')) return false;
      if (parts.includes('.mypy_cache')) return false;
      return true;
    },
  });

  // Step 6: Capture hook-blocks log if treatment
  if (args.condition === 'treatment') {
    const hookLog = path.join(tempDir, '.claude', 'hook-blocks.log');
    if (existsSync(hookLog)) {
      await cp(hookLog, path.join(resultsDir, 'hook-blocks.log'));
    } else {
      await writeFile(path.join(resultsDir, 'hook-blocks.log'), '');
    }
  }

  manifest.exit_code = exitCode;
  manifest.elapsed_ms = elapsedMs;
  manifest.finished_at = new Date().toISOString();
  manifest.stdout_bytes = stdout.length;
  manifest.stderr_bytes = stderr.length;
  await writeFile(path.join(resultsDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Step 7: Cleanup temp dir unless --keep-temp
  if (!args.keepTemp) {
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn(`[runner] Warning: failed to cleanup ${tempDir}: ${err.message}`);
    }
  } else {
    console.log(`[runner] Keeping temp dir at ${tempDir}`);
  }

  console.log(`[runner] Done: ${runId}`);
  process.exit(exitCode === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(`[runner] FATAL:`, err);
  process.exit(2);
});
