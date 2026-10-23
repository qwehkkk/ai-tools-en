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

/** Keep sitemap.html readable: long meta descriptions get cut at a word boundary */
function truncate(s, max = 110) {
  if (!s || s.length <= max) return s;
  return s.slice(0, max).replace(/[\s,;:.]+\S*$/, '') + '…';
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
    .replace(/&(mdash|ndash|middot|rsquo|lsquo|rdquo|ldquo|hellip|nbsp);/g,
      (all, name) => ({mdash:'—',ndash:'–',middot:'·',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',hellip:'…',nbsp:' '}[name] || all))
    .replace(/&amp;/g, '&'); // must be last
}

/** Pull <h1>, <title> and <meta name="description"> out of a page */
function readMeta(file) {
  const html = fs.readFileSync(file, 'utf8');
  const t = html.match(/<title>([\s\S]*?)<\/title>/);
  const h = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const d = html.match(/<meta\s+name="description"\s+content="([\s\S]*?)"/);
  let title = t ? decodeEntities(t[1]).trim() : '';
  // Trim the " | GetToolkit" suffix for cleaner display
  title = title.replace(/\s*\|\s*GetToolkit\s*$/, '').trim();
  // Prefer the on-page <h1>: it is written for humans and reads better in a
  // list than a full SEO title ("About GetToolkit - Free Browser-Based Tools").
  const heading = h ? decodeEntities(h[1]).replace(/<[^>]+>/g, '').trim() : '';
  return {
    title: heading || title || path.basename(file, '.html'),
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

/**
 * Cloudflare Pages serves HTML at extensionless paths and 308-redirects
 * "/foo.html" -> "/foo". Canonicals, sitemap <loc>s and internal links must
 * point at the final URL, otherwise Google indexes redirect hops.
 */
function cleanUrl(p) {
  return p.replace(/\.html$/, '');
}

const tools = toolFiles.map(f => {
  const meta = readMeta(path.join(TOOLS_DIR, f));
  return { file: f, slug: cleanUrl(f), url: `${SITE_URL}/tools/${cleanUrl(f)}`, ...meta };
});

if (tools.length === 0) {
  console.error('❌ No tool pages found in tools/.');
  process.exit(1);
}

// ---- Collect root-level pages (About, Privacy, Contact, ...) ----
// Anything ending in .html at the project root is included automatically,
// except the ones that must never appear in a sitemap:
//   index.html  -> represented by "/" itself
//   404.html    -> noindex
//   sitemap.html-> added manually at the lowest priority
//   google*.html-> search-console verification file, not a page
const ROOT_EXCLUDE = /^(index|404|sitemap|google[a-z0-9]+)\.html$/i;

const pages = fs
  .readdirSync(ROOT)
  .filter(f => f.endsWith('.html') && !ROOT_EXCLUDE.test(f))
  .sort()
  .map(f => {
    const meta = readMeta(path.join(ROOT, f));
    return { file: f, slug: cleanUrl(f), url: `${SITE_URL}/${cleanUrl(f)}`, ...meta };
  });

// ---- 1. Generate sitemap.xml ----
const today = new Date().toISOString().split('T')[0];

let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

function addUrl(loc, changefreq, priority) {
  xml += `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>\n`;
}

addUrl(`${SITE_URL}/`, 'weekly', '1.0');
for (const t of tools) addUrl(t.url, 'monthly', '0.8');
for (const p of pages) addUrl(p.url, 'yearly', '0.4');
addUrl(`${SITE_URL}/sitemap`, 'monthly', '0.3');
xml += '</urlset>\n';

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`✅ sitemap.xml  —  ${tools.length + pages.length + 2} URLs`);

// ---- 2. Generate sitemap.html (human-readable, good for internal linking) ----
const listItems = tools
  .map(
    t =>
      `    <li><a href="tools/${t.slug}">${escapeHtml(t.title)}</a>${
        t.description ? ` <span class="desc">— ${escapeHtml(truncate(t.description))}</span>` : ''
      }</li>`
  )
  .join('\n');

const pageItems = pages
  .map(
    p =>
      `    <li><a href="${p.slug}">${escapeHtml(p.title)}</a>${
        p.description ? ` <span class="desc">— ${escapeHtml(truncate(p.description))}</span>` : ''
      }</li>`
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sitemap - All ${tools.length} Free Tools | GetToolkit</title>
  <meta name="description" content="Complete list of all ${tools.length} free online tools. JSON formatter, encoders, converters, image tools and more. No signup required.">
  <link rel="canonical" href="${SITE_URL}/sitemap">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta name="twitter:card" content="summary_large_image">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="GetToolkit">
  <meta property="og:title" content="Sitemap - All ${tools.length} Free Tools | GetToolkit">
  <meta property="og:description" content="Complete list of all ${tools.length} free online tools. JSON formatter, encoders, converters, image tools and more. No signup required.">
  <meta property="og:url" content="${SITE_URL}/sitemap">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <link rel="stylesheet" href="css/style.css">
  <script src="js/theme.js"></script>
</head>
<body>

<header class="header">
  <div class="header-inner">
    <a href="/" class="logo">GetToolkit</a>
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

  <h2 class="sitemap-heading">Site pages</h2>
  <ul class="sitemap-list">
${pageItems}
    <li><a href="sitemap">Sitemap</a> <span class="desc">— This page</span></li>
  </ul>
</main>

<footer class="footer">
  <nav class="footer-nav">
    <a href="/about">About</a>
    <a href="/privacy">Privacy</a>
    <a href="/contact">Contact</a>
    <a href="/sitemap">Sitemap</a>
  </nav>
  <p>&copy; 2026 GetToolkit. All processing happens in your browser.</p>
</footer>

</body>
</html>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.html'), html, 'utf8');
console.log(`✅ sitemap.html —  ${tools.length} tools listed`);

// ---- 3. Generate llms.txt (for AI agents / LLM crawlers discovering the site) ----
// Markdown-formatted site map: what the site is, plus every page with a one-line
// description. Same page list as the sitemap, so it never drifts out of sync.
const meta = t => t.description ? ` — ${decodeEntities(t.description)}` : '';
let llms = `# GetToolkit\n\n> Free online developer tools that run entirely in the browser. No signup, no installation, no data uploaded. Also home of a curated Agent Skills & Plugins directory for AI coding agents.\n\n`;
llms += `## Pages\n\n`;
llms += `- [Home](${SITE_URL}/): Browse all ${tools.length} free tools.\n`;
for (const t of tools) llms += `- [${t.title}](${t.url})${meta(t)}\n`;
for (const p of pages) llms += `- [${p.title}](${p.url})${meta(p)}\n`;
llms += `- [Sitemap](${SITE_URL}/sitemap): Complete list of all pages.\n`;
fs.writeFileSync(path.join(ROOT, 'llms.txt'), llms, 'utf8');
console.log(`✅ llms.txt — ${tools.length + pages.length + 2} pages listed`);
console.log(`\nNext: git add . && git commit -m "..." && git push`);
