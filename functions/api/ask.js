// Cloudflare Pages Function — POST /api/ask
// RAG endpoint for the AI Docs Assistant. Keys live in Pages env vars, never in the client.
//
// Required env vars (set in Cloudflare Pages -> Settings -> Environment variables):
//   SILICONFLOW_API_KEY  — SiliconFlow key (query embedding, bge-m3 free tier)
//   DEEPSEEK_API_KEY     — DeepSeek key (answer generation, ~<0.01 CNY per question)
//
// Flow: rate limit -> load static RAG data -> embed question -> cosine top-6 ->
//       DeepSeek with "answer only from sources, cite [n]" -> JSON response.
// No CORS headers: same-origin only, so third parties can't drain the keys.

const EMBED_BASE = 'https://api.siliconflow.cn/v1';
const EMBED_MODEL = 'BAAI/bge-m3';
const CHAT_BASE = 'https://api.deepseek.com/v1';
const CHAT_MODEL = 'deepseek-chat';

// Best-effort in-memory rate limit (per worker isolation): 6/min, 30/day per IP.
const hits = new Map();
const RATE_MIN = 6, RATE_DAY = 30;
function rateLimited(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { min: [], day: [] };
  rec.min = rec.min.filter(t => now - t < 60_000);
  rec.day = rec.day.filter(t => now - t < 86_400_000);
  if (rec.min.length >= RATE_MIN || rec.day.length >= RATE_DAY) {
    hits.set(ip, rec);
    return true;
  }
  rec.min.push(now); rec.day.push(now);
  hits.set(ip, rec);
  if (hits.size > 5000) hits.clear(); // crude memory guard
  return false;
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

async function embedQuery(key, question) {
  const res = await fetch(`${EMBED_BASE}/embeddings`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: [question], encoding_format: 'float' }),
  });
  if (!res.ok) throw new Error(`embed HTTP ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

async function retrieve(env, question) {
  const asset = await env.ASSETS.fetch(new URL('/assets/assistant-data.json', 'https://x.invalid'));
  if (!asset.ok) throw new Error('assistant data missing');
  const rag = await asset.json();
  const chunks = rag.chunks;

  // Vector path (primary — eval: 12/12)
  if (rag.vectors) {
    const qv = await embedQuery(env.SILICONFLOW_API_KEY, question);
    const scored = chunks
      .map((c, i) => ({ ...c, score: cosine(qv, rag.vectors[i]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
    return scored;
  }

  // Fallback path (no vectors): naive keyword scoring — keeps the assistant useful
  const terms = question.toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length > 1);
  const scored = chunks
    .map(c => {
      const hay = c.text.toLowerCase();
      let score = 0;
      for (const t of terms) if (hay.includes(t)) score += t.length > 4 ? 2 : 1;
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  return scored.filter(s => s.score > 0);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SILICONFLOW_API_KEY || !env.DEEPSEEK_API_KEY) {
    return json({ error: 'Assistant is not configured yet. Please try again later.' }, 503);
  }

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (rateLimited(ip)) {
    return json({ error: 'Too many questions. Please try again later.' }, 429);
  }

  let question;
  try {
    const body = await request.json();
    question = String(body.question || '').trim();
  } catch {
    return json({ error: 'Invalid request.' }, 400);
  }
  if (!question || question.length > 300) {
    return json({ error: 'Please ask a question of 1-300 characters.' }, 400);
  }

  let sources;
  try {
    sources = await retrieve(env, question);
  } catch (e) {
    return json({ error: 'Retrieval failed. Please try again later.' }, 502);
  }
  if (!sources.length) {
    return json({ answer: "I couldn't find anything about that in the site documentation.", sources: [] });
  }

  const contextText = sources
    .map((c, i) => `[${i + 1}] (${c.source}) ${c.text}`)
    .join('\n\n---\n\n');

  let answer;
  try {
    const res = await fetch(`${CHAT_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: 'You are the documentation assistant for getoolkit.com, a suite of free browser-based developer tools. Answer ONLY from the provided sources. If the sources do not cover the question, say so plainly — do not invent facts. Keep answers under 180 words. End with citation markers like [1] [2] referencing the sources you used.' },
          { role: 'user', content: `Sources:\n${contextText}\n\nQuestion: ${question}` },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });
    if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
    const data = await res.json();
    answer = data.choices[0].message.content;
  } catch {
    return json({ error: 'Generation failed. Please try again later.' }, 502);
  }

  return json({
    answer,
    sources: sources.map(c => ({ title: c.source, url: c.url, section: c.section })),
  });
}
