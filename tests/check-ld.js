// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
// Validates every JSON-LD block in the site and counts internal links.
const fs = require('fs');
const path = require('path');

function walk(dir) {
  return fs
    .readdirSync(dir)
    .filter(f => f.endsWith('.html'))
    .map(f => path.join(dir, f));
}

const files = walk('.').concat(walk('tools'));
let blocks = 0;
let bad = 0;
const linkCount = {};

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    blocks++;
    try {
      JSON.parse(m[1]);
    } catch (e) {
      bad++;
      console.log('  INVALID JSON-LD in ' + f + ': ' + e.message);
    }
  }
  // internal tool links per page
  const links = html.match(/href="(?!http|mailto|#|\.\.\/|\/)[^"]+\.?(?:html)?"/g) || [];
  linkCount[path.basename(f)] = links.length;
}

console.log('pages: ' + files.length + ' | JSON-LD blocks: ' + blocks + ' | invalid: ' + bad);

const orphans = Object.keys(linkCount).filter(k => k !== 'index.html' && k !== 'sitemap.html' && linkCount[k] < 2);
console.log(orphans.length ? '  low-link pages: ' + orphans.join(', ') : '  no isolated tool pages ✅');

// How many tools link to each tool (inbound internal links)
const inbound = {};
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  const re = /href="(?!http|mailto|#|\.\.)(\/?[a-z0-9-]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const t = m[1].replace(/^\//, '');
    if (!t || t === 'about' || t === 'privacy' || t === 'contact' || t === 'sitemap') continue;
    inbound[t] = (inbound[t] || 0) + 1;
  }
}
console.log('\ninbound internal links per page:');
Object.keys(inbound)
  .sort()
  .forEach(k => console.log('  ' + k.padEnd(28) + inbound[k]));
process.exit(bad ? 1 : 0);
