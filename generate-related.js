#!/usr/bin/env node
/**
 * Injects breadcrumbs and a "Related tools" block into every tool page.
 *
 * Why this exists: without it, every tool page is an orphan except for the
 * link from the homepage. Crawlers discover a site through links, so cross
 * links between related tools + BreadcrumbList structured data are the
 * cheapest indexing win available.
 *
 * Re-runnable: content between the markers is replaced every time.
 *
 *     node generate-related.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, 'tools');
const SITE_URL = fs.existsSync(path.join(ROOT, 'site.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8')).url.replace(/\/+$/, '')
  : 'https://getoolkit.com';

/** Hand-picked neighbours, 4 per tool. Order matters: strongest link first. */
const GROUPS = {
  'json-formatter': ['json-csv-converter', 'regex-tester', 'url-encoder', 'html-entities'],
  'json-csv-converter': ['json-formatter', 'case-converter', 'word-counter', 'lorem-ipsum-generator'],
  'base64-converter': ['url-encoder', 'hash-calculator', 'html-entities', 'image-compressor'],
  'url-encoder': ['base64-converter', 'html-entities', 'regex-tester', 'json-csv-converter'],
  'html-entities': ['url-encoder', 'base64-converter', 'case-converter', 'word-counter'],
  'uuid-generator': ['hash-calculator', 'base64-converter', 'lorem-ipsum-generator', 'timestamp-converter'],
  'word-counter': ['lorem-ipsum-generator', 'regex-tester', 'text-diff', 'case-converter'],
  'lorem-ipsum-generator': ['word-counter', 'uuid-generator', 'case-converter', 'text-diff'],
  'hash-calculator': ['base64-converter', 'uuid-generator', 'timestamp-converter', 'text-diff'],
  'timestamp-converter': ['hash-calculator', 'uuid-generator', 'color-converter', 'regex-tester'],
  'color-converter': ['image-compressor', 'timestamp-converter', 'hash-calculator', 'lorem-ipsum-generator'],
  'image-compressor': ['color-converter', 'base64-converter', 'json-formatter', 'word-counter'],
  'case-converter': ['word-counter', 'lorem-ipsum-generator', 'json-csv-converter', 'html-entities'],
  'text-diff': ['regex-tester', 'json-formatter', 'word-counter', 'html-entities'],
  'regex-tester': ['text-diff', 'word-counter', 'json-formatter', 'html-entities']
};

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readMeta(file) {
  const html = fs.readFileSync(file, 'utf8');
  const h = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const d = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
  const heading = h ? decodeEntities(h[1]).replace(/<[^>]+>/g, '').trim() : '';
  let desc = d ? decodeEntities(d[1]).trim() : '';
  // Trim the description down to its first sentence for the card.
  const cut = desc.match(/^(.*?[.!?])(\s|$)/);
  if (cut && cut[1].length <= 110) desc = cut[1];
  return {
    title: heading || path.basename(file, '.html'),
    description: desc
  };
}

/**
 * Pull the card copy straight off the homepage: same wording, same titles,
 * and it doubles as a check that every tool has a card on the homepage.
 */
function readHomepageCards() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const re = /<a href="tools\/([^"]+)" class="tool-card">[\s\S]*?<h3>([\s\S]*?)<\/h3>[\s\S]*?<p>([\s\S]*?)<\/p>/g;
  const cards = {};
  let m;
  while ((m = re.exec(html)) !== null) {
    cards[m[1]] = { title: decodeEntities(m[2]).trim(), description: decodeEntities(m[3]).trim() };
  }
  return cards;
}

const files = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith('.html')).sort();
const meta = {};
const home = readHomepageCards();
for (const f of files) {
  const slug = path.basename(f, '.html');
  const own = readMeta(path.join(TOOLS_DIR, f));
  meta[slug] = home[slug] && home[slug].title ? home[slug] : own;
}
for (const slug of Object.keys(meta)) {
  if (!home[slug]) console.warn('⚠️  no homepage card for: ' + slug);
}

function replaceBetween(html, start, end, block, insertBefore) {
  const re = new RegExp(start + '[\\s\\S]*?' + end);
  if (re.test(html)) return html.replace(re, block);
  if (!insertBefore) throw new Error('insertion point not found');
  const idx = html.indexOf(insertBefore);
  if (idx === -1) throw new Error('insertion point not found: ' + insertBefore);
  return html.slice(0, idx) + block + '\n' + html.slice(idx);
}

let changed = 0;

for (const f of files) {
  const slug = path.basename(f, '.html');
  const file = path.join(TOOLS_DIR, f);
  let html = fs.readFileSync(file, 'utf8');
  const info = meta[slug];

  // ---- 1. Breadcrumbs ----
  const crumbs =
    '<!-- CRUMBS:START -->\n' +
    '  <nav class="crumbs" aria-label="Breadcrumb">\n' +
    '    <a href="../">Home</a><span class="sep">&rsaquo;</span><a href="../#tools">Tools</a>' +
    '<span class="sep">&rsaquo;</span><span aria-current="page">' + escapeHtml(info.title) + '</span>\n' +
    '  </nav>\n' +
    '  <!-- CRUMBS:END -->';

  html = replaceBetween(html, '<!-- CRUMBS:START -->', '<!-- CRUMBS:END -->', crumbs, '  <div class="tool-header">');

  // ---- 2. BreadcrumbList structured data ----
  const ld =
    '<!-- BREADCRUMB-LD:START -->\n' +
    '  <script type="application/ld+json">\n' +
    '  {\n' +
    '    "@context": "https://schema.org",\n' +
    '    "@type": "BreadcrumbList",\n' +
    '    "itemListElement": [\n' +
    '      { "@type": "ListItem", "position": 1, "name": "Home", "item": "' + SITE_URL + '/" },\n' +
    '      { "@type": "ListItem", "position": 2, "name": "Tools", "item": "' + SITE_URL + '/#tools" },\n' +
    '      { "@type": "ListItem", "position": 3, "name": "' + escapeHtml(info.title) + '", "item": "' +
    SITE_URL + '/tools/' + slug + '" }\n' +
    '    ]\n' +
    '  }\n' +
    '  </script>\n' +
    '  <!-- BREADCRUMB-LD:END -->';

  html = replaceBetween(html, '<!-- BREADCRUMB-LD:START -->', '<!-- BREADCRUMB-LD:END -->', ld, '</head>');

  // ---- 3. Related tools ----
  let picks = (GROUPS[slug] || []).filter(s => meta[s]);
  if (picks.length < 4) {
    // Fall back to the first few other tools so no page is left without links.
    for (const s of Object.keys(meta)) {
      if (s !== slug && picks.indexOf(s) === -1) picks.push(s);
      if (picks.length === 4) break;
    }
  }
  picks = picks.slice(0, 4);

  const cards = picks
    .map(
      s =>
        '    <a href="' + s + '" class="tool-card">\n' +
        '      <h3>' + escapeHtml(meta[s].title) + '</h3>\n' +
        '      <p>' + escapeHtml(meta[s].description) + '</p>\n' +
        '    </a>'
    )
    .join('\n');

  const related =
    '<!-- RELATED:START -->\n' +
    '  <section class="related">\n' +
    '    <h2>Related tools</h2>\n' +
    '    <div class="tool-grid compact">\n' +
    cards + '\n' +
    '    </div>\n' +
    '    <p class="related-all"><a href="../">See all ' + files.length + ' free tools &rarr;</a></p>\n' +
    '  </section>\n' +
    '  <!-- RELATED:END -->';

  html = replaceBetween(html, '<!-- RELATED:START -->', '<!-- RELATED:END -->', related, '</main>');

  fs.writeFileSync(file, html, 'utf8');
  changed++;
}

console.log('✅ related + breadcrumbs injected into ' + changed + ' tool pages');
console.log('\nNext: node generate-sitemap.js && git add -A && git commit && git push');
