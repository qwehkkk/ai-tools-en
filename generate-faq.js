#!/usr/bin/env node
/**
 * Turns the FAQ blocks that already exist on every tool page into FAQPage
 * structured data, and exports them to tests/faq-data.json for evaluation.
 *
 * Why a script and not hand-written JSON-LD:
 *   Google requires the structured data to match the visible Q&A on the page.
 *   Parsing the page itself is the only way to guarantee they never drift —
 *   if someone edits the copy, re-running this regenerates matching JSON-LD.
 *
 * Re-runnable: content between the markers is replaced every time.
 *
 *     node generate-faq.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TOOLS_DIR = path.join(ROOT, 'tools');
const OUT_JSON = path.join(ROOT, 'tests', 'faq-data.json');
const SITE_URL = fs.existsSync(path.join(ROOT, 'site.json'))
  ? JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8')).url.replace(/\/+$/, '')
  : 'https://getoolkit.com';

const MIN_FAQ = 4;   // fewer than this and the page looks thin next to the others

function decodeEntities(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d))
    .replace(/&amp;/g, '&');
}

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '');
}

function text(html) {
  return decodeEntities(stripTags(html)).replace(/\s+/g, ' ').trim();
}

/** Pull the visible Q&A straight out of the page. */
function parseFaq(html) {
  const re = /<div class="faq-item">\s*<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/g;
  const out = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    const q = text(m[1]);
    const a = text(m[2]);
    if (q && a) out.push({ q, a });
  }
  return out;
}

function replaceBetween(html, start, end, block, insertBefore) {
  const re = new RegExp(start + '[\\s\\S]*?' + end);
  // 必须用函数形式：String.replace 的替换串里 $& / $1 是特殊模式。
  // 本页 FAQ 里就有讲正则替换语法的 "$1 … $&"，直接传字符串会把整个匹配
  // 展开塞进答案里，把 JSON-LD 搞坏（regex-tester 真踩过一次）。
  if (re.test(html)) return html.replace(re, () => block);
  const idx = html.indexOf(insertBefore);
  if (idx === -1) throw new Error('insertion point not found: ' + insertBefore);
  return html.slice(0, idx) + block + '\n' + html.slice(idx);
}

const files = fs.readdirSync(TOOLS_DIR).filter(f => f.endsWith('.html')).sort();
const data = [];
let changed = 0;
const warnings = [];

for (const f of files) {
  const slug = path.basename(f, '.html');
  const file = path.join(TOOLS_DIR, f);
  let html = fs.readFileSync(file, 'utf8');
  const faq = parseFaq(html);

  if (!faq.length) {
    warnings.push(`${slug}: 页面里没有找到 faq-item，跳过`);
    continue;
  }
  if (faq.length < MIN_FAQ) warnings.push(`${slug}: 只有 ${faq.length} 条 FAQ（建议 ≥${MIN_FAQ}）`);

  const ld =
    '<!-- FAQ-LD:START -->\n' +
    '  <script type="application/ld+json">\n' +
    JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faq.map(x => ({
        '@type': 'Question',
        'name': x.q,
        'acceptedAnswer': { '@type': 'Answer', 'text': x.a }
      }))
    }, null, 2).split('\n').map(l => '  ' + l).join('\n') +
    '\n  </script>\n' +
    '  <!-- FAQ-LD:END -->';

  html = replaceBetween(html, '<!-- FAQ-LD:START -->', '<!-- FAQ-LD:END -->', ld, '</head>');
  fs.writeFileSync(file, html, 'utf8');
  changed++;

  for (const x of faq) {
    data.push({
      name: `${slug} :: ${x.q}`,
      keywords: [],
      desc: x.a,
      page: `tools/${f}`
    });
  }
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(`✅ FAQPage JSON-LD 已注入 ${changed} 个工具页，共 ${data.length} 条问答`);
console.log(`   导出: tests/faq-data.json`);
if (warnings.length) {
  console.log('\n⚠️  需要关注:');
  for (const w of warnings) console.log('   - ' + w);
}
console.log('\nNext: python ../seo-eval/eval_faq.py tests/faq-data.json --site .');
