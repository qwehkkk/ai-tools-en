#!/usr/bin/env node
/**
 * generate-assistant-data.js — builds assets/assistant-data.json for the AI Docs Assistant.
 *
 * 1. Extracts text from tools/*.html + guides/*.html (heading-aware sections)
 * 2. Chunks: ~600 chars target, 120 overlap (validated by rag-demo eval: vector 12/12)
 * 3. If EMBED_API_KEY is set, embeds chunks via SiliconFlow (BAAI/bge-m3, free tier)
 *    and stores vectors; otherwise writes text-only data (assistant works in BM25-less
 *    vector mode disabled — the Pages Function falls back to keyword search).
 *
 * Run:  node generate-assistant-data.js [--embed]
 * The --embed flag reads EMBED_API_KEY from the environment. Output is committed
 * so the Cloudflare Pages build never needs an embedding API key.
 *
 * Rationale: the assistant answers ONLY from this site's own documentation,
 * with citations, so it can never invent facts about the tools.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'assets', 'assistant-data.json');

// ---- tuning knobs (same values validated in rag-demo/eval.mjs: 12/12 hit rate) ----
const TARGET = 600;
const OVERLAP = 120;
const EMBED_MODEL = 'BAAI/bge-m3';
const EMBED_BASE = 'https://api.siliconflow.cn/v1';

// ---- 1. extract ----
function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<li[^>]*>/gi, ' • ')
    .replace(/<(td|th)[^>]*>/gi, ' | ')
    .replace(/<(h1|h2|h3|h4|p|div|tr|section|br)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

function pageUrl(file, dir) {
  const name = path.basename(file, '.html');
  return dir === '.' ? `/${name}` : `/${dir}/${name}`;
}

function extractFile(file, dir) {
  const html = fs.readFileSync(file, 'utf8');
  const rawTitle = (html.match(/<title>([^<]+)<\/title>/) || [, path.basename(file, '.html')])[1].trim();
  const title = rawTitle.replace(/\s*\|\s*GetToolkit\s*$/i, '');
  const url = pageUrl(file, dir);
  const re = /<(h2|h3)[^>]*>([\s\S]*?)<\/\1>/gi;
  const marks = [{ pos: 0, heading: title }];
  let m;
  while ((m = re.exec(html)) !== null) marks.push({ pos: m.index + m[0].length, heading: stripTags(m[2]) });
  const records = [];
  for (let i = 0; i < marks.length; i++) {
    const segStart = i === 0 ? marks[i].pos : marks[i].pos;
    const segEnd = i + 1 < marks.length ? html.lastIndexOf('<', marks[i + 1].pos) : html.length;
    const text = stripTags(html.slice(segStart, Math.max(segStart, segEnd)));
    if (text.length >= 40) records.push({ source: title, url, section: marks[i].heading || title, text: `${marks[i].heading || title}\n${text}` });
  }
  return records;
}

const records = [];
for (const dir of ['guides', 'tools']) {
  const abs = path.join(ROOT, dir);
  for (const f of fs.readdirSync(abs)) {
    if (f.endsWith('.html')) records.push(...extractFile(path.join(abs, f), dir));
  }
}

// ---- 2. chunk ----
function splitLong(text) {
  if (text.length <= TARGET + OVERLAP) return [text];
  const parts = [];
  let i = 0;
  while (i < text.length) {
    let end = Math.min(i + TARGET, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf('\n', end), text.lastIndexOf('. ', end));
      if (boundary > i + TARGET * 0.6) end = boundary + 1;
    }
    parts.push(text.slice(i, end).trim());
    if (end >= text.length) break; // guard: last segment must not loop forever
    i = end - OVERLAP;
  }
  return parts.filter(Boolean);
}

const chunks = [];
for (const rec of records) {
  splitLong(rec.text).forEach((text, j) => {
    chunks.push(j === 0 ? { ...rec, text } : { ...rec, id: `${j}`, text });
  });
}

// ---- 3. embed (optional) ----
async function embedAll(texts) {
  const key = process.env.EMBED_API_KEY;
  if (!key) throw new Error('EMBED_API_KEY not set');
  const out = [];
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64);
    const res = await fetch(`${EMBED_BASE}/embeddings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, input: batch, encoding_format: 'float' }),
    });
    if (!res.ok) throw new Error(`embed HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    batch.forEach((_, j) => out.push(data.data[j].embedding.map(v => Number(v.toFixed(5)))));
    process.stderr.write(`  embedded ${Math.min(i + 64, texts.length)}/${texts.length}\n`);
  }
  return out;
}

let vectors = null;
if (process.argv.includes('--embed')) {
  embedAll(chunks.map(c => c.text)).then(v => {
    vectors = v;
    writeOut(vectors);
  });
} else {
  writeOut(null);
}

function writeOut(vectors) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const payload = {
    model: vectors ? EMBED_MODEL : null,
    dim: vectors ? vectors[0].length : 0,
    chunks,
    vectors,
  };
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`✅ assistant-data.json — ${chunks.length} chunks${vectors ? `, ${vectors.length} vectors (${vectors[0].length}d)` : ', NO vectors (run with --embed)'}, ${kb} KB`);
}
