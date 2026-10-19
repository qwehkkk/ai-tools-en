#!/usr/bin/env node
/**
 * One-command domain switch for the whole site.
 *
 * Usage:
 *     node set-domain.js en.toolona.com
 *     node set-domain.js https://tools.example.com
 *
 * What it does:
 *   1. Reads the current domain from site.json
 *   2. Replaces every occurrence across *.html / *.xml / *.txt / *.js / *.json
 *      (canonical tags, og:url, JSON-LD, sitemap.xml, robots.txt, internal links)
 *   3. Updates site.json
 *
 * Skips .git/ and node_modules/. Safe to re-run.
 *
 * After switching, remember to:
 *   - Add the domain in Cloudflare Pages -> Custom domains
 *   - Add a new URL-prefix property in Google Search Console
 *   - Re-submit the sitemap
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SITE_FILE = path.join(ROOT, 'site.json');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.github']);
const EXTS = new Set(['.html', '.xml', '.txt', '.js', '.json', '.md']);

// ---- Read current domain ----
if (!fs.existsSync(SITE_FILE)) {
  console.error('site.json not found. Cannot determine current domain.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(SITE_FILE, 'utf8'));
const oldUrl = String(config.url || '');
const oldHost = oldUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');

if (!oldHost) {
  console.error('site.json has no valid "url" value.');
  process.exit(1);
}

// ---- Parse target domain ----
let input = (process.argv[2] || '').trim();
if (!input) {
  console.error('Usage: node set-domain.js <new-domain>');
  console.error('Example: node set-domain.js en.toolona.com');
  process.exit(1);
}

const newHost = input.replace(/^https?:\/\//, '').replace(/\/+$/, '');

if (newHost === oldHost) {
  console.log(`Already using ${newHost}. Nothing to do.`);
  process.exit(0);
}

if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(newHost)) {
  console.error(`"${newHost}" does not look like a valid domain.`);
  process.exit(1);
}

// ---- Walk and replace ----
let fileCount = 0;
let hitCount = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name));
      continue;
    }
    if (!entry.isFile()) continue;

    const file = path.join(dir, entry.name);
    if (!EXTS.has(path.extname(entry.name).toLowerCase())) continue;
    if (file === SITE_FILE) continue; // handled separately below

    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes(oldHost)) continue;

    // Replace bare host — this also handles "https://old.host" since the
    // scheme prefix is untouched.
    const after = before.split(oldHost).join(newHost);
    const hits = before.split(oldHost).length - 1;

    fs.writeFileSync(file, after, 'utf8');
    fileCount++;
    hitCount += hits;
    console.log(`  ${path.relative(ROOT, file).replace(/\\/g, '/')}  (${hits})`);
  }
}

console.log(`Switching domain: ${oldHost}  ->  ${newHost}\n`);
walk(ROOT);

// ---- Update site.json ----
config.url = `https://${newHost}`;
fs.writeFileSync(SITE_FILE, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`  site.json  (1)`);

console.log(`\nDone. ${hitCount} replacement(s) across ${fileCount + 1} file(s).`);
console.log(`\nNext steps:`);
console.log(`  1. Cloudflare Pages -> your project -> Custom domains -> add ${newHost}`);
console.log(`  2. node generate-sitemap.js   (regenerates sitemap.xml + sitemap.html)`);
console.log(`  3. git add -A && git commit -m "Switch domain to ${newHost}" && git push`);
console.log(`  4. Google Search Console -> add URL-prefix property https://${newHost}`);
