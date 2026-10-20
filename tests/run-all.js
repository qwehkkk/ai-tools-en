// Runs every check in this folder and prints a single summary.
//
//   node tests/run-all.js
//
// Each child process is started from the repo root so the individual scripts
// can keep using repo-relative paths.

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const isWin = process.platform === 'win32';
const py = isWin
  ? 'C:/Users/Administrator/.workbuddy/binaries/python/versions/3.13.12/python.exe'
  : 'python3';

const suites = [
  ['text diff', 'node', ['tests/test-text-diff.js'], /passed/],
  ['regex tester', 'node', ['tests/test-regex.js'], /passed/],
  ['case converter', 'node', ['tests/test-case.js'], /passed/],
  ['cron explainer', 'node', ['tests/test-cron.js'], /passed/],
  ['qr encoder', 'node', ['tests/test-qr.js'], /qrcode:/],
  ['structured data', 'node', ['tests/check-ld.js'], /^pages:/],
  ['element ids', py, ['tests/static-check.py'], /✅|missing/],
  ['site audit', py, ['tests/audit.py'], /^pages \d/]
];

let failed = 0;
const results = [];

for (const [name, cmd, args, want] of suites) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0;

  // Individual suites print their own counts; pick the line that carries the
  // number rather than whatever happens to be last.
  const lines = out.trim().split('\n').filter(l => l.trim());
  const hit = lines.filter(l => want.test(l)).slice(-1)[0] || lines.slice(-1)[0] || '';

  results.push({ name, ok, tail: hit.trim().replace(/^=\s*|\s*=$/g, '') });
  if (!ok) failed++;
}

console.log('');
console.log('='.repeat(58));
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(18)} ${r.tail.slice(0, 46)}`);
}
console.log('='.repeat(58));
console.log(failed === 0 ? 'All suites passed.' : `${failed} suite(s) failed.`);

process.exit(failed === 0 ? 0 : 1);
