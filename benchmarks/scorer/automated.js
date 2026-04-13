#!/usr/bin/env node
/**
 * Automated scorer — evaluates a completed run against its task's acceptance criteria.
 *
 * Usage:
 *   node benchmarks/scorer/automated.js --run <run-id>
 *   node benchmarks/scorer/automated.js --run-dir benchmarks/results/raw/<run-id>
 *
 * Output: JSON scorecard written to benchmarks/results/scored/<run-id>.json and printed to stdout.
 */

import { readFile, writeFile, mkdir, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { TASK_CHECKS } from './task-checks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { run: null, runDir: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') args.run = argv[++i];
    else if (a === '--run-dir') args.runDir = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node automated.js --run <run-id>`);
      process.exit(0);
    }
  }
  if (!args.run && !args.runDir) {
    console.error('ERROR: --run or --run-dir is required');
    process.exit(1);
  }
  return args;
}

async function fileExistsCheck(projectRoot, rel) {
  const full = path.join(projectRoot, rel);
  return existsSync(full);
}

async function fileContainsCheck(projectRoot, rel, pattern) {
  const full = path.join(projectRoot, rel);
  if (!existsSync(full)) return { pass: false, reason: 'file-missing' };
  try {
    const content = await readFile(full, 'utf8');
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return { pass: regex.test(content), reason: regex.test(content) ? 'match' : 'no-match' };
  } catch (err) {
    return { pass: false, reason: `read-error: ${err.message}` };
  }
}

async function runCheck(check, projectRoot) {
  switch (check.type) {
    case 'file_exists': {
      const pass = await fileExistsCheck(projectRoot, check.path);
      return { id: check.id, type: check.type, pass, detail: check.path };
    }
    case 'file_contains': {
      const result = await fileContainsCheck(projectRoot, check.path, check.pattern);
      return { id: check.id, type: check.type, pass: result.pass, detail: `${check.path}: ${result.reason}` };
    }
    case 'file_not_contains': {
      const result = await fileContainsCheck(projectRoot, check.path, check.pattern);
      // invert: pass if NOT contains (or if file doesn't exist, neutral fail)
      if (!existsSync(path.join(projectRoot, check.path))) {
        return { id: check.id, type: check.type, pass: true, detail: 'file-missing-ok' };
      }
      return { id: check.id, type: check.type, pass: !result.pass, detail: `${check.path}: ${result.reason}` };
    }
    case 'any_of': {
      const subResults = [];
      for (const sub of check.checks) {
        const r = await runCheck({ id: `${check.id}-sub`, ...sub }, projectRoot);
        subResults.push(r);
      }
      const pass = subResults.some((r) => r.pass);
      return { id: check.id, type: check.type, pass, detail: subResults.map((r) => `${r.type}:${r.pass}`).join(',') };
    }
    default:
      return { id: check.id, type: check.type, pass: false, detail: `unknown-check-type` };
  }
}

function runCommand(cmd, cwd, timeoutMs = 60000) {
  try {
    const output = execSync(cmd, {
      cwd,
      encoding: 'utf8',
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
    });
    return { pass: true, exitCode: 0, output: output.slice(0, 2000) };
  } catch (err) {
    return {
      pass: false,
      exitCode: err.status ?? -1,
      output: (err.stdout?.toString() ?? '' + err.stderr?.toString() ?? '').slice(0, 2000),
    };
  }
}

async function parseHookBlocks(runDir) {
  const logFile = path.join(runDir, 'hook-blocks.log');
  if (!existsSync(logFile)) return { total: 0, by_hook: {}, events: [] };
  const content = await readFile(logFile, 'utf8');
  const lines = content.split('\n').filter((l) => l.trim());
  const byHook = {};
  const events = [];
  for (const line of lines) {
    const m = line.match(/hook=(\S+)\s+reason=(\S+)\s+extra=(.*)/);
    if (m) {
      const [, hook, reason, extra] = m;
      byHook[hook] = (byHook[hook] || 0) + 1;
      events.push({ hook, reason, extra });
    }
  }
  return { total: lines.length, by_hook: byHook, events };
}

async function scoreRun(runDir) {
  const manifestPath = path.join(runDir, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`manifest.json not found in ${runDir}`);
  }
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const taskId = manifest.task;
  const taskConfig = TASK_CHECKS[taskId];
  if (!taskConfig) {
    throw new Error(`Task ${taskId} not found in TASK_CHECKS registry`);
  }

  const projectRoot = path.join(runDir, 'project');
  if (!existsSync(projectRoot)) {
    throw new Error(`Project snapshot not found at ${projectRoot}`);
  }

  // Run acceptance checks
  const checkResults = [];
  for (const check of taskConfig.checks) {
    const result = await runCheck(check, projectRoot);
    checkResults.push(result);
  }

  const passedChecks = checkResults.filter((r) => r.pass).length;
  const totalChecks = checkResults.length;
  const checkScore = totalChecks > 0 ? passedChecks / totalChecks : 0;

  // Run runtime checks (build/test/lint) — gracefully skip if deps missing
  const runtimeResults = [];
  for (const rtCheck of taskConfig.runtime_checks || []) {
    const reqPath = path.join(projectRoot, rtCheck.requires);
    if (!existsSync(reqPath)) {
      runtimeResults.push({
        id: rtCheck.id,
        pass: null,
        skipped: true,
        reason: `missing ${rtCheck.requires}`,
      });
      continue;
    }
    const result = runCommand(rtCheck.cmd, projectRoot);
    runtimeResults.push({ id: rtCheck.id, ...result });
  }

  // Parse hook-blocks if treatment
  const hookBlocks = manifest.condition === 'treatment' ? await parseHookBlocks(runDir) : null;

  const scorecard = {
    run_id: manifest.run_id,
    task: taskId,
    difficulty: manifest.difficulty,
    stack: manifest.stack,
    condition: manifest.condition,
    n: manifest.n,
    scored_at: new Date().toISOString(),
    check_results: checkResults,
    checks_passed: passedChecks,
    checks_total: totalChecks,
    check_score: checkScore,
    runtime_results: runtimeResults,
    hook_blocks: hookBlocks,
    run_metadata: {
      exit_code: manifest.exit_code,
      elapsed_ms: manifest.elapsed_ms,
      stdout_bytes: manifest.stdout_bytes,
      stderr_bytes: manifest.stderr_bytes,
    },
  };

  return scorecard;
}

async function main() {
  const args = parseArgs(process.argv);
  const runDir = args.runDir ?? path.join(BENCHMARKS_DIR, 'results', 'raw', args.run);
  const runId = args.run ?? path.basename(runDir);

  console.log(`[scorer] Scoring run: ${runId}`);

  const scorecard = await scoreRun(runDir);

  const scoredDir = path.join(BENCHMARKS_DIR, 'results', 'scored');
  await mkdir(scoredDir, { recursive: true });
  const outputPath = path.join(scoredDir, `${runId}.json`);
  await writeFile(outputPath, JSON.stringify(scorecard, null, 2));

  console.log(`[scorer] Checks: ${scorecard.checks_passed}/${scorecard.checks_total} (${(scorecard.check_score * 100).toFixed(1)}%)`);
  if (scorecard.hook_blocks) {
    console.log(`[scorer] Hook blocks: ${scorecard.hook_blocks.total}`);
  }
  for (const rt of scorecard.runtime_results) {
    if (rt.skipped) {
      console.log(`[scorer] Runtime ${rt.id}: SKIPPED (${rt.reason})`);
    } else {
      console.log(`[scorer] Runtime ${rt.id}: ${rt.pass ? 'PASS' : 'FAIL'}`);
    }
  }
  console.log(`[scorer] Output: ${outputPath}`);
}

main().catch((err) => {
  console.error(`[scorer] FATAL:`, err);
  process.exit(2);
});
