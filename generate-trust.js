#!/usr/bin/env node
/**
 * Trust / citability layer (2026-11-24).
 *
 * Why: AI answer engines cite only 2-7 sources per answer, and Google's 2026
 * AI-search guidance doubled the weight of Experience/authorship signals.
 * This script adds the missing citability signals the FAQ layer doesn't cover:
 *
 *   1. tools/*.html  -> author + publisher + dateModified on the WebApplication JSON-LD
 *   2. guides/*.html -> full Article JSON-LD (they previously had NONE beyond breadcrumbs)
 *   3. visible "Maintained by" byline in the footer (crawlable, AI-extractable)
 *   4. a factual comparison table on 4 high-citation tool pages
 *
 * Re-runnable: every injected block sits between START/END marker comments and is
 * replaced on each run. JSON-LD fields are merged, never duplicated.
 *
 *   node generate-trust.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const SITE_URL = SITE.url.replace(/\/+$/, '');
const SITE_NAME = 'getoolkit';
const ABOUT_URL = SITE_URL + '/about';

const ORG = {
  '@type': 'Organization',
  'name': SITE_NAME,
  'url': SITE_URL
};

/** Last git commit date (YYYY-MM-DD) for a file; falls back to mtime. */
function gitDate(relPath) {
  try {
    return execSync(`git log -1 --format=%cs -- "${relPath}"`, { cwd: ROOT })
      .toString().trim();
  } catch (_) {
    const d = fs.statSync(path.join(ROOT, relPath)).mtime;
    return d.toISOString().slice(0, 10);
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Find an ld+json block with the given @type and parse it. */
function findLd(html, type) {
  const re = /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const obj = JSON.parse(m[1]);
      if (obj['@type'] === type) return { block: m[0], obj };
    } catch (_) { /* skip malformed */ }
  }
  return null;
}

function replaceBlock(html, oldBlock, newBlock) {
  const idx = html.indexOf(oldBlock);
  if (idx === -1) throw new Error('ld block not found for replacement');
  return html.slice(0, idx) + newBlock + html.slice(idx + oldBlock.length);
}

/* ---------------------------------------------------------------- byline */

function bylineHtml(date) {
  return (
    '  <!-- TRUST-BYLINE:START -->\n' +
    `  <p style="margin:10px 0 0;font-size:12.5px;color:#888;">Maintained by the ` +
    `<a href="${ABOUT_URL}" style="color:#888;">${SITE_NAME} team</a> · ` +
    `Updated <time datetime="${date}">${date}</time></p>\n` +
    '  <!-- TRUST-BYLINE:END -->'
  );
}

function injectByline(html, relPath, changed) {
  const date = gitDate(relPath) || today();
  const fresh = bylineHtml(date);
  const endTag = '<!-- TRUST-BYLINE:END -->';
  const start = html.indexOf('<!-- TRUST-BYLINE:START -->');
  if (start !== -1) {
    const end = html.indexOf(endTag);
    const endFull = end + endTag.length;
    return { html: html.slice(0, start) + fresh + html.slice(endFull), added: false };
  }
  const footerAt = html.indexOf('<footer class="footer">');
  if (footerAt === -1) return { html, added: false };
  const footerEnd = html.indexOf('>', footerAt) + 1;
  const out = html.slice(0, footerEnd) + '\n' + fresh + html.slice(footerEnd);
  changed.byline++;
  return { html: out, added: true };
}

/* ------------------------------------------------- comparison table data */

const TABLES = {
  'timestamp-converter': {
    title: 'Epoch time units across systems',
    lead: 'The same moment in time is represented with different digits depending on the unit. This tool converts seconds and milliseconds; for the finer units, drop the trailing digits.',
    headers: ['Unit', 'Typical source', 'This tool', 'Convert to seconds'],
    rows: [
      ['Seconds', 'Unix time: most APIs, databases and file formats', 'Supported', 'As-is'],
      ['Milliseconds', 'JavaScript Date.now(), Java System.currentTimeMillis()', 'Supported', 'Divide by 1,000'],
      ['Microseconds', 'Database event columns, profilers', 'Convert first', 'Divide by 1,000,000'],
      ['Nanoseconds', 'Go time.Now(), high-resolution timing', 'Convert first', 'Divide by 1,000,000,000']
    ]
  },
  'hash-calculator': {
    title: 'Which hash algorithm for which job',
    lead: 'All four algorithms below are computed by this tool. They differ in security status, not in convenience.',
    headers: ['Algorithm', 'Security status', 'Appropriate use'],
    rows: [
      ['MD5', 'Broken — collisions practical since 2004', 'Non-security checksums, legacy data fingerprinting'],
      ['SHA-1', 'Deprecated — collision demonstrated in 2017', 'Legacy interoperability (Git object IDs are integrity, not security)'],
      ['SHA-256', 'Secure — current default', 'Signatures, certificates, file integrity, APIs'],
      ['SHA-512', 'Secure', 'Larger digest; often faster on 64-bit hardware for bulk data']
    ],
    link: { href: '/guides/choosing-a-hash-algorithm', text: 'Full guide: choosing a hash algorithm' }
  },
  'base64-converter': {
    title: 'Base64 vs Base64URL vs Hex',
    lead: 'All three encode binary data as text, but they trade off URL safety against size.',
    headers: ['Encoding', 'Alphabet', 'URL-safe', 'Size overhead', 'Typical use'],
    rows: [
      ['Base64', 'A–Z a–z 0–9 + / =', 'No', '~+33%', 'Email attachments, data URIs, HTTP Basic auth'],
      ['Base64URL', 'Base64 with - and _, padding optional', 'Yes', '~+33%', 'JWTs, URL parameters, cookie values'],
      ['Hex', '0–9 a–f', 'Yes', '+100%', 'Debugging, checksum display, short binary blobs']
    ],
    link: { href: '/guides/base64-vs-url-encoding', text: 'Full guide: Base64 vs URL encoding' }
  },
  'uuid-generator': {
    title: 'UUID v4 vs the alternatives',
    lead: 'This tool generates UUID v4 (random). Other identifiers trade uniqueness guarantees for sortability or length.',
    headers: ['Identifier', 'Makeup', 'Sortable', 'Best for'],
    rows: [
      ['UUID v4', '122 random bits', 'No', 'Unique IDs with no coordination service'],
      ['UUID v7', 'Unix timestamp prefix + random bits', 'Yes (time-ordered)', 'Database primary keys where index locality matters'],
      ['NanoID', '21-char URL-safe string', 'No', 'Shorter IDs when storage or URL space is tight']
    ]
  }
};

function tableHtml(cfg) {
  const th = cfg.headers.map(h => `<th style="text-align:left;padding:6px 10px;border-bottom:1px solid #ddd;">${h}</th>`).join('');
  const tr = cfg.rows.map(r =>
    '<tr>' + r.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top;">${c}</td>`).join('') + '</tr>'
  ).join('\n        ');
  const link = cfg.link
    ? `\n      <p style="margin:8px 0 0;"><a href="${SITE_URL + cfg.link.href}">${cfg.link.text}</a></p>`
    : '';
  return (
    '<!-- COMPARE:START -->\n' +
    '  <section class="faq">\n' +
    `    <h2>${cfg.title}</h2>\n` +
    `    <p style="margin:0 0 10px;">${cfg.lead}</p>\n` +
    '    <div style="overflow-x:auto;">\n' +
    '      <table style="border-collapse:collapse;width:100%;font-size:14px;">\n' +
    `        <thead><tr>${th}</tr></thead>\n` +
    `        <tbody>\n        ${tr}\n        </tbody>\n` +
    '      </table>\n' +
    '    </div>' + link + '\n' +
    '  </section>\n' +
    '  <!-- COMPARE:END -->'
  );
}

function injectTable(html, slug, changed) {
  const cfg = TABLES[slug];
  if (!cfg) return html;
  const start = html.indexOf('<!-- COMPARE:START -->');
  if (start !== -1) {
    const end = html.indexOf('<!-- COMPARE:END -->');
    const endFull = html.indexOf('>', end) + 1;
    return html.slice(0, start) + tableHtml(cfg) + html.slice(endFull);
  }
  const faqAt = html.indexOf('<section class="faq">');
  if (faqAt === -1) { changed.tableMiss.push(slug); return html; }
  changed.tables++;
  return html.slice(0, faqAt) + tableHtml(cfg) + '\n' + html.slice(faqAt);
}

/* ------------------------------------------------------------------ main */

const dirs = ['tools', 'guides'];
const changed = { ld: 0, article: 0, byline: 0, tables: 0, tableMiss: [] };

for (const dir of dirs) {
  const abs = path.join(ROOT, dir);
  for (const f of fs.readdirSync(abs).filter(x => x.endsWith('.html')).sort()) {
    const rel = `${dir}/${f}`;
    let html = fs.readFileSync(path.join(abs, f), 'utf8');
    const date = gitDate(rel) || today();

    // 1. WebApplication JSON-LD (tools)
    const wa = findLd(html, 'WebApplication');
    if (wa) {
      wa.obj.author = ORG;
      wa.obj.publisher = ORG;
      wa.obj.dateModified = date;
      if (!wa.obj.datePublished) wa.obj.datePublished = date;
      const pretty = JSON.stringify(wa.obj, null, 2).split('\n').map(l => '  ' + l).join('\n');
      const newBlock = wa.block.replace(/[\s\S]*<\/script>/, pretty + '\n  </script>');
      html = replaceBlock(html, wa.block, newBlock);
      changed.ld++;
    }

    // 2. Article JSON-LD (guides had none)
    if (dir === 'guides' && !findLd(html, 'Article')) {
      const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1] || f;
      const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '';
      const art = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': title.replace(/\s*[|–-]\s*getoolkit\.com\s*$/i, ''),
        'description': desc,
        'author': ORG,
        'publisher': ORG,
        'datePublished': date,
        'dateModified': date,
        'mainEntityOfPage': `${SITE_URL}/${dir}/${f.replace(/\.html$/, '')}`
      };
      const block =
        '  <!-- ARTICLE-LD:START -->\n' +
        '  <script type="application/ld+json">\n' +
        JSON.stringify(art, null, 2).split('\n').map(l => '  ' + l).join('\n') +
        '\n  </script>\n' +
        '  <!-- ARTICLE-LD:END -->';
      if (html.includes('</head>')) {
        html = html.replace('</head>', block + '\n</head>');
        changed.article++;
      }
    } else if (dir === 'guides') {
      const art = findLd(html, 'Article');
      art.obj.dateModified = date;
      const pretty = JSON.stringify(art.obj, null, 2).split('\n').map(l => '  ' + l).join('\n');
      const newBlock = art.block.replace(/[\s\S]*<\/script>/, pretty + '\n  </script>');
      html = replaceBlock(html, art.block, newBlock);
    }

    // 3. byline
    const r = injectByline(html, rel, changed);
    html = r.html;

    // 4. comparison table (tools only, selected slugs)
    if (dir === 'tools') html = injectTable(html, f.replace(/\.html$/, ''), changed);

    fs.writeFileSync(path.join(abs, f), html, 'utf8');
  }
}

console.log(`✅ trust layer:` +
  `\n   - WebApplication author/publisher/dateModified: ${changed.ld} pages` +
  `\n   - Article JSON-LD (guides): ${changed.article}` +
  `\n   - byline injected: ${changed.byline}` +
  `\n   - comparison tables: ${changed.tables}` +
  (changed.tableMiss.length ? `\n   ⚠️ no <section class="faq"> insertion point: ${changed.tableMiss.join(', ')}` : ''));
