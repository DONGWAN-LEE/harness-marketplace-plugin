#!/usr/bin/env node
/**
 * LLM Judge — blind-scores a run on 4 rubric dimensions using `claude -p`.
 *
 * Usage:
 *   node benchmarks/scorer/llm-judge.js --run <run-id>
 *
 * Output: writes <run-id>.judge.json to results/scored/
 *
 * Scientific note: this judge does NOT see the condition (control/treatment).
 * It only sees the task spec and the final project files. Condition is stripped
 * from the evidence before the prompt is constructed.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_DIR = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = { run: null, model: 'sonnet', maxFiles: 20 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--run') args.run = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '--max-files') args.maxFiles = parseInt(argv[++i], 10);
  }
  if (!args.run) {
    console.error('ERROR: --run is required');
    process.exit(1);
  }
  return args;
}

// Recursively collect relevant files from the project snapshot.
// Skips node_modules, .next, venvs, caches, and binary files.
async function collectFiles(rootDir, maxFiles) {
  const files = [];
  const SKIP_DIRS = new Set([
    'node_modules',
    '.next',
    '.venv',
    'venv',
    '__pycache__',
    '.pytest_cache',
    '.ruff_cache',
    '.mypy_cache',
    '.git',
    'dist',
    'build',
    '.claude', // hide harness from judge
  ]);
  const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.md', '.json', '.yaml', '.yml', '.toml']);

  async function walk(dir) {
    if (files.length >= maxFiles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) return;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (!EXTS.has(ext)) continue;
        if (entry.name === 'TASK.md') continue; // not relevant to judge
        if (entry.name === 'CLAUDE.md') continue; // blind: harness context hidden
        try {
          const stats = await stat(full);
          if (stats.size > 100_000) continue; // skip huge files
          const content = await readFile(full, 'utf8');
          files.push({ rel: path.relative(rootDir, full).replace(/\\/g, '/'), content });
        } catch {
          /* ignore */
        }
      }
    }
  }

  await walk(rootDir);
  return files;
}

function buildJudgePrompt(taskSpec, files) {
  const fileBlock = files
    .map((f) => `\n\n=== FILE: ${f.rel} ===\n\`\`\`\n${f.content}\n\`\`\``)
    .join('');

  return `You are a senior code reviewer evaluating a submission against a task specification. Score the submission on four dimensions, each from 1-10. Be strict and evidence-based.

## TASK SPECIFICATION

${taskSpec}

## SUBMITTED FILES

${fileBlock}

## RUBRIC

**code_quality (1-10)**: Readability, structure, idiomatic usage.
- 10: exemplary, 8: good, 6: acceptable, 4: weak, 2: poor, 1: unusable

**completeness (1-10)**: Does it meet all requirements from the task spec? Missing files or missing logic → low. Extra unauthorized work also reduces this.
- 10: all requirements met, 8: minor omissions, 6: 1-2 missing, 4: half met, 2: minimal, 1: not addressed

**edge_cases (1-10)**: Error paths, empty states, invalid inputs, boundary conditions.
- 10: comprehensive, 8: most covered, 6: basic, 4: happy path only, 2: none, 1: ignored

**security (1-10)**: SQL injection, XSS, hardcoded secrets, missing auth, insecure defaults.
- 10: solid, 8: generally secure, 6: no obvious issues, 4: one clear vuln, 2: multiple vulns, 1: severely insecure

## OUTPUT FORMAT

Respond with ONLY a JSON object, no prose before or after. Example:
\`\`\`json
{
  "code_quality": 8,
  "code_quality_reason": "Well-structured with clear separation of concerns, minor naming inconsistencies.",
  "completeness": 7,
  "completeness_reason": "All required files present, but missing the 401 handling branch.",
  "edge_cases": 5,
  "edge_cases_reason": "Happy path only — no input validation beyond what the task required.",
  "security": 9,
  "security_reason": "Parameterized queries, no hardcoded credentials, correct auth dependency.",
  "overall_notes": "Solid baseline submission. Main gap is missing error handling for the empty list case."
}
\`\`\`

Do not include markdown code fences in your response — respond with raw JSON only.`;
}

function runClaudeJudge(prompt, model) {
  return new Promise((resolve) => {
    // Pipe prompt via stdin to avoid shell quoting issues.
    const child = spawn('claude', ['-p', '--model', model], {
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
      resolve({
        exitCode: code ?? -1,
        stdout: Buffer.concat(chunks).toString('utf8'),
        stderr: Buffer.concat(errChunks).toString('utf8'),
      });
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function extractJson(text) {
  // Try direct parse first
  try {
    return JSON.parse(text.trim());
  } catch {
    /* fall through */
  }
  // Try to find JSON block
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      /* fall through */
    }
  }
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const runDir = path.join(BENCHMARKS_DIR, 'results', 'raw', args.run);
  if (!existsSync(runDir)) {
    console.error(`ERROR: run directory not found: ${runDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(await readFile(path.join(runDir, 'manifest.json'), 'utf8'));
  const taskSpecPath = path.join(BENCHMARKS_DIR, 'tasks', `${manifest.task}.md`);
  const taskSpec = await readFile(taskSpecPath, 'utf8');

  const projectRoot = path.join(runDir, 'project');
  if (!existsSync(projectRoot)) {
    console.error(`ERROR: project snapshot not found: ${projectRoot}`);
    process.exit(1);
  }

  console.log(`[judge] Collecting files from ${projectRoot}...`);
  const files = await collectFiles(projectRoot, args.maxFiles);
  console.log(`[judge] Collected ${files.length} files`);

  const prompt = buildJudgePrompt(taskSpec, files);
  console.log(`[judge] Prompt size: ${prompt.length} chars`);
  console.log(`[judge] Invoking claude -p (model: ${args.model})...`);

  const { exitCode, stdout, stderr } = await runClaudeJudge(prompt, args.model);

  if (exitCode !== 0) {
    console.error(`[judge] claude -p failed with exit code ${exitCode}`);
    console.error(`[judge] stderr: ${stderr.slice(0, 500)}`);
    process.exit(1);
  }

  const json = extractJson(stdout);
  if (!json) {
    console.error(`[judge] Failed to extract JSON from response`);
    console.error(`[judge] Raw stdout: ${stdout.slice(0, 1000)}`);
    process.exit(1);
  }

  const judgment = {
    run_id: manifest.run_id,
    task: manifest.task,
    condition: manifest.condition,
    n: manifest.n,
    judged_at: new Date().toISOString(),
    judge_model: args.model,
    scores: {
      code_quality: json.code_quality ?? null,
      completeness: json.completeness ?? null,
      edge_cases: json.edge_cases ?? null,
      security: json.security ?? null,
    },
    reasons: {
      code_quality: json.code_quality_reason ?? null,
      completeness: json.completeness_reason ?? null,
      edge_cases: json.edge_cases_reason ?? null,
      security: json.security_reason ?? null,
    },
    overall_notes: json.overall_notes ?? null,
    raw_response: stdout,
  };

  const scoredDir = path.join(BENCHMARKS_DIR, 'results', 'scored');
  await mkdir(scoredDir, { recursive: true });
  const outputPath = path.join(scoredDir, `${args.run}.judge.json`);
  await writeFile(outputPath, JSON.stringify(judgment, null, 2));

  console.log(`[judge] Scores: quality=${judgment.scores.code_quality} completeness=${judgment.scores.completeness} edge=${judgment.scores.edge_cases} security=${judgment.scores.security}`);
  console.log(`[judge] Output: ${outputPath}`);
}

main().catch((err) => {
  console.error(`[judge] FATAL:`, err);
  process.exit(2);
});
