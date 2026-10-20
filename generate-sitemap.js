#!/usr/bin/env node
/**
 * Auto-generates sitemap.xml (for search engines) and sitemap.html (for users + internal linking).
 *
 * Scans tools/*.html automatically — no manual URL editing.
 * After adding a new tool page, just run:
 *     node generate-sitemap.js
 *
 * Then commit & push. Cloudflare Pages will redeploy.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, 'tools');

// Single source of truth for the site domain — see set-domain.js to change it.
const SITE_CONFIG = path.join(ROOT, 'site.json');
const SITE_URL = fs.existsSync(SITE_CONFIG)
  ? JSON.parse(fs.readFileSync(SITE_CONFIG, 'utf8')).url.replace(/\/+$/, '')
  : 'https://getoolkit.com';

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Titles/descriptions extracted from HTML are already entity-encoded
 * (e.g. "Encode &amp; Decode"). Decode them first so escapeHtml() below
 * doesn't double-encode into "&amp;amp;".
 */
function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&'); // must be last
}

/** Pull <title> and <meta name="description"> out of a tool page */
function readMeta(file) {
  const html = fs.readFileSync(file, 'utf8');
  const t = html.match(/<title>([\s\S]*?)<\/title>/);
  const d = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
  let title = t ? decodeEntities(t[1]).trim() : '';
  // Trim the " | AI Tools" suffix for cleaner display
  title = title.replace(/\s*\|\s*AI Tools\s*$/, '').trim();
  return {
    title: title || path.basename(file, '.html'),
    description: d ? decodeEntities(d[1]).trim() : ''
  };
}

// ---- Collect all tool pages ----
if (!fs.existsSync(TOOLS_DIR)) {
  console.error('❌ tools/ directory not found. Run this script from the project root.');
  process.exit(1);
}

const toolFiles = fs
  .readdirSync(TOOLS_DIR)
  .filter(f => f.endsWith('.html'))
  .sort();

const tools = toolFiles.map(f => {
  const meta = readMeta(path.join(TOOLS_DIR, f));
  return { file: f, url: `${SITE_URL}/tools/${f}`, ...meta };
});

if (tools.length === 0) {
  console.error('❌ No tool pages found in tools/.');
  process.exit(1);
}

// ---- 1. Generate sitemap.xml ----
const today = new Date().toISOString().split('T')[0];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

function addUrl(loc, changefreq, priority) {
  xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

addUrl(`${SITE_URL}/`, 'weekly', '1.0');
for (const t of tools) addUrl(t.url, 'monthly', '0.8');
addUrl(`${SITE_URL}/sitemap.html`, 'monthly', '0.5');
xml += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml  —  ${tools.length + 2} URLs`);

// ---- 2. Generate sitemap.html (human-readable, good for internal linking) ----
const listItems = tools
  .map(
    t =>
      `    <li><a href="tools/${t.file}">${escapeHtml(t.title)}</a>${
        t.description ? ` <span class="desc">— ${escapeHtml(t.description)}</span>` : ''
      }</li>`
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap - All ${tools.length} Free Tools | AI Tools</title>
  <meta name="description" content="Complete list of all ${tools.length} free online tools. JSON formatter, encoders, converters, image tools and more. No signup required.">
  <link rel="canonical" href="${SITE_URL}/sitemap.html">
  <link rel="stylesheet" href="css/style.css">
  <script src="js/theme.js"></script>
</head>
<body>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo">AI Tools</a>
    <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle dark mode" title="Toggle dark mode">
      <svg class="icon-moon" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg class="icon-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
    </button>
  </div>
</header>

<main class="container">
  <div class="tool-header">
    <h1>Sitemap</h1>
    <p>All ${tools.length} free online tools. Every tool runs in your browser — no signup, no installation, no data uploaded.</p>
  </div>

  <ul class="sitemap-list">
    <li><a href="/">Home</a> <span class="desc">— Browse all tools</span></li>
${listItems}
  </ul>
</main>

<footer class="footer">
  <p>&copy; 2026 AI Tools. All processing happens in your browser.</p>
</footer>

</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.html'), html, 'utf8');
console.log(`✅ sitemap.html —  ${tools.length} tools listed`);
console.log(`\nNext: git add . && git commit -m "..." && git push`);
