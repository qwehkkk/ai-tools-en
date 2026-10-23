#!/usr/bin/env node
/**
 * Renders agent-skills.html from skills-data.json (single source of truth).
 *
 * Workflow for weekly updates:
 *   1. Refresh star counts / add / remove entries in skills-data.json
 *   2. node generate-skills-page.js
 *   3. node generate-sitemap.js && node tests/run-all.js
 *   4. commit & push
 *
 * Why data-driven: the weekly trending analysis (WorkBuddy automation) can
 * propose entry changes as data patches; comparison pages, a Chinese edition
 * and llms.txt can all render from the same records later.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DATA = path.join(ROOT, 'skills-data.json');
const OUT = path.join(ROOT, 'agent-skills.html');

const SITE_URL = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8')).url.replace(/\/+$/, '');
const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));

function esc(s) {
  return String(s).replace(/&(?!(?:amp|lt|gt|quot|apos|#\d+);)/g, '&amp;');
}

function card(e) {
  const tags = e.tags.map(t => `<span class="skill-tag">${esc(t)}</span>`).join('');
  return `    <div class="skill-card">
      <div class="skill-head"><a href="https://github.com/${e.repo}">${esc(e.repo)}</a><span class="skill-stars">&#9733; ${esc(e.stars)}</span></div>
      <div class="skill-desc">${e.desc}</div>
      <div class="skill-verdict">${e.verdict}</div>
      <div class="skill-tags">${tags}</div>
    </div>`;
}

function section(cat) {
  return `  <h2 class="skill-cat">${cat.title}</h2>
  <p class="skill-cat-desc">${cat.desc}</p>
  <div class="skill-grid">
${cat.entries.map(card).join('\n')}
  </div>`;
}

const entryCount = data.categories.reduce((n, c) => n + c.entries.length, 0);
const sections = data.categories.map(section).join('\n\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Best Agent Skills &amp; Plugins Directory (2026) | GetToolkit</title>
  <meta name="description" content="A hand-picked directory of the best agent skills and plugins for Claude Code, Cursor, Codex and Gemini CLI &mdash; categorized, with star counts and compatibility notes.">
  <link rel="canonical" href="${SITE_URL}/agent-skills">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <meta name="twitter:card" content="summary_large_image">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="GetToolkit">
  <meta property="og:title" content="Best Agent Skills &amp; Plugins Directory (2026)">
  <meta property="og:description" content="The ${entryCount} agent skills and plugins actually worth installing, categorized for Claude Code, Cursor, Codex and Gemini CLI.">
  <meta property="og:url" content="${SITE_URL}/agent-skills">
  <meta property="og:image" content="${SITE_URL}/og-image.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <link rel="stylesheet" href="css/style.css">
  <script src="js/theme.js"></script>
  <style>
    /* Page-scoped styles, built on the site's theme tokens so dark mode just works */
    .skill-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(430px, 1fr));
      gap: 14px;
      margin-top: 16px;
    }
    @media (max-width: 700px) {
      .skill-grid { grid-template-columns: 1fr; }
    }
    .skill-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 18px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      transition: border-color var(--transition), box-shadow var(--transition);
    }
    .skill-card:hover {
      border-color: var(--primary);
      box-shadow: var(--shadow-md);
    }
    .skill-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
    }
    .skill-head a {
      font-weight: 600;
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 13.5px;
      word-break: break-all;
    }
    .skill-head a:hover { color: var(--primary); }
    .skill-stars {
      flex: 0 0 auto;
      font-size: 12.5px;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
    }
    .skill-desc { font-size: 14px; color: var(--text); line-height: 1.55; }
    .skill-verdict {
      font-size: 13px;
      color: var(--text-muted);
      border-left: 3px solid var(--primary);
      padding-left: 10px;
      line-height: 1.55;
    }
    .skill-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
    .skill-tag {
      font-size: 12px;
      background: var(--primary-soft);
      color: var(--primary);
      border-radius: 4px;
      padding: 2px 8px;
    }
    .skill-cat {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 40px 0 2px;
      color: var(--text);
    }
    .skill-cat-desc { font-size: 14px; color: var(--text-muted); margin-bottom: 6px; }
    .install-box {
      margin-top: 48px;
      padding: 22px;
      background: var(--bg-alt);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
    }
    .install-box h2 {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--text);
    }
    .install-box ol { padding-left: 22px; }
    .install-box li { font-size: 14px; color: var(--text-muted); margin-bottom: 8px; line-height: 1.6; }
    .install-box code {
      font-family: var(--font-mono);
      font-size: 12.5px;
      padding: 1px 5px;
      border-radius: 4px;
      background: var(--bg);
      border: 1px solid var(--border-soft);
      color: var(--text);
    }
    .install-box li strong { color: var(--text); }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Agent Skills Directory",
    "url": "${SITE_URL}/agent-skills",
    "description": "A curated directory of agent skills and plugins for AI coding agents: Claude Code, Cursor, Codex and Gemini CLI.",
    "dateModified": "${data.updated}"
  }
  </script>
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
    <h1>Agent Skills &amp; Plugins Directory</h1>
    <p>Every coding agent now loads reusable "skills" &mdash; but they are scattered across thousands of repos. This is a hand-picked shortlist of the ones actually worth installing, for <strong>Claude Code, Cursor, Codex and Gemini CLI</strong>.</p>
    <p class="updated">Last updated ${data.updated} &middot; star counts are a snapshot from that date</p>
  </div>

${sections}

  <div class="install-box">
    <h2>How to install an agent skill (60 seconds)</h2>
    <ol>
      <li><strong>Claude Code:</strong> copy the skill folder into <code>.claude/skills/</code> in your project, or install plugins via <code>/plugin</code> from the official catalog.</li>
      <li><strong>Codex / Gemini CLI / others:</strong> most skills are plain instructions plus scripts &mdash; drop them where your agent reads project context (<code>AGENTS.md</code>, config folder), or follow the repo's README.</li>
      <li><strong>Cursor:</strong> use the plugin registry (<code>cursor/plugins</code> above) or point Rules at the skill's instructions.</li>
      <li>Start with <strong>one or two skills</strong>, not ten. Skills interact; keep only the ones that measurably improve output.</li>
    </ol>
  </div>
</main>

<footer class="footer">
  <nav class="footer-nav">
    <a href="/about">About</a>
    <a href="/privacy">Privacy</a>
    <a href="/contact">Contact</a>
    <a href="/sitemap">Sitemap</a>
  </nav>
  <p>&copy; 2026 GetToolkit. Listing is editorial and not sponsored &mdash; all projects link to their own GitHub repos.</p>
</footer>

</body>
</html>
`;

fs.writeFileSync(OUT, html, 'utf8');
console.log(`✅ agent-skills.html — ${entryCount} entries across ${data.categories.length} categories (updated ${data.updated})`);
console.log('Next: node generate-sitemap.js && node tests/run-all.js');
