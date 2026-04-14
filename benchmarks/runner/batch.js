#!/usr/bin/env node
/**
 * Batch runner — executes all (task × condition × n) cells in a shuffled order.
 *
 * Usage:
 *   node benchmarks/runner/batch.js                    # full 60-run batch
 *   node benchmarks/runner/batch.js --category security
 *   node benchmarks/runner/batch.js --dry              # print queue only
 *   node benchmarks/runner/batch.js --seed 42          # reproducible shuffle
 */

import { writeFile, appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runControl } from './run-control.js';
import { runTreatment } from './run-treatment.js';
import { listTasks } from '../tasks/task-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { category: null, dry: false, seed: null, model: 'sonnet', tasksOnly: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--category') args.category = argv[++i];
    else if (a === '--dry') args.dry = true;
    else if (a === '--seed') args.seed = parseInt(argv[++i], 10);
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--tasks') args.tasksOnly = argv[++i].split(',');
  }
  return args;
}

// Mulberry32 seedable PRNG
function makePrng(seed) {
  let t = seed >>> 0;
  return function () {
    t |= 0; t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, prng) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQueue(filter) {
  const queue = [];
  const tasks = listTasks(filter);
  for (const task of tasks) {
    const conditions = task.conditions; // from task-registry
    const n = task.n;
    for (const cond of conditions) {
      for (let k = 1; k <= n; k++) {
        queue.push({ task_id: task.id, category: task.category, stack: task.stack, condition: cond, n: String(k) });
      }
    }
  }
  return queue;
}

async function main() {
  const args = parseArgs(process.argv);
  const filter = {};
  if (args.category) filter.category = args.category.split(',');
  if (args.tasksOnly) filter.ids = args.tasksOnly;

  const seed = args.seed ?? Math.floor(Math.random() * 1e9);
  const prng = makePrng(seed);
  const queue = shuffle(buildQueue(filter), prng);

  console.log(`[batch] Queue size: ${queue.length} (seed=${seed})`);

  const logDir = path.join(BENCHMARKS_DIR, 'results');
  await mkdir(logDir, { recursive: true });
  const batchLog = path.join(logDir, 'batch.log');
  const startTs = new Date().toISOString();
  await writeFile(batchLog, `# Phase 0.5 batch — ${startTs}\n# seed=${seed} queue_size=${queue.length}\n`);

  if (args.dry) {
    for (const item of queue) {
      console.log(`[dry] ${item.task_id} ${item.condition} n=${item.n}`);
    }
    console.log(`[batch] DRY RUN — no execution`);
    return;
  }

  const successes = [];
  const failures = [];
  let idx = 0;
  for (const item of queue) {
    idx++;
    const prefix = `[${idx}/${queue.length}] ${item.task_id} ${item.condition} n=${item.n}`;
    console.log(`\n${prefix} — starting`);
    await appendFile(batchLog, `${new Date().toISOString()} START ${prefix}\n`);

    try {
      let result;
      if (item.condition === 'control') {
        result = await runControl({ task: item.task_id, n: item.n, model: args.model });
      } else if (item.condition === 'treatment') {
        result = await runTreatment({ task: item.task_id, n: item.n, model: args.model, mode: 'manual-chain' });
      } else if (item.condition === 'fire-and-forget') {
        result = await runTreatment({ task: item.task_id, n: item.n, model: args.model, mode: 'fire-and-forget' });
      } else {
        throw new Error(`Unknown condition: ${item.condition}`);
      }
      successes.push({ ...item, run_id: result.runId });
      await appendFile(batchLog, `${new Date().toISOString()} OK    ${prefix} run_id=${result.runId}\n`);
    } catch (err) {
      failures.push({ ...item, error: err.message });
      await appendFile(batchLog, `${new Date().toISOString()} FAIL  ${prefix} error=${err.message}\n`);
      console.error(`${prefix} — FAILED: ${err.message}`);
    }
  }

  const endTs = new Date().toISOString();
  await appendFile(batchLog, `\n# Done ${endTs}\n# successes=${successes.length} failures=${failures.length}\n`);
  console.log(`\n[batch] Done. ${successes.length}/${queue.length} OK, ${failures.length} failed.`);
  console.log(`[batch] Log: ${batchLog}`);

  if (failures.length > 0) {
    console.log(`[batch] Failures:`);
    for (const f of failures) console.log(`  - ${f.task_id} ${f.condition} n=${f.n}: ${f.error}`);
  }
}

if (process.argv[1] && process.argv[1].endsWith('batch.js')) {
  main().catch((err) => {
    console.error(`[batch] FATAL: ${err.message}`);
    process.exit(2);
  });
}
