#!/usr/bin/env node
/**
 * 线上健康检查。域名一律从 site.json 读取，不手打。
 *
 * 起因：2026-10-26 因手打域名多了一个字母（gettoolkit vs getoolkit），
 * 误报到别人的域名上，得出一份完全错误的「P0 事故」结论。
 *
 * 用法：node check-live.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = __dirname;
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.json'), 'utf8'));
const SITE_URL = site.url.replace(/\/+$/, '');
const HOST = new URL(SITE_URL).hostname;

// 站点的 NS 应指向这两个（Cloudflare 分配的固定对）
const EXPECT_NS = ['asa.ns.cloudflare.com', 'tadeo.ns.cloudflare.com'];

const CHECKS = [
  { path: '/', must: ['GetToolkit', 'Agent Skills'], label: 'home' },
  { path: '/agent-skills', must: ['Biggest Movers', 'mattpocock/skills'], label: 'agent-skills' },
  { path: '/sitemap.xml', must: ['<urlset'], label: 'sitemap.xml' },
  { path: '/llms.txt', must: ['agent-skills'], label: 'llms.txt' },
  { path: '/robots.txt', must: ['Sitemap'], label: 'robots.txt' },
  // 工具页检查「Agent Skills」内链，防止目录页再次变成孤岛页面
  { path: '/tools/json-formatter', must: ['Agent Skills'], label: 'tool page +内链' },
];

function req(url, { timeout = 25000, headers = {}, redirects = 3 } = {}) {
  return new Promise((resolve) => {
    const r = https.get(url, { timeout, headers }, (res) => {
      const { statusCode } = res;
      if ([301, 302, 307, 308].includes(statusCode) && res.headers.location && redirects > 0) {
        res.resume();
        const next = new URL(res.headers.location, url).toString();
        return resolve(req(next, { timeout, headers, redirects: redirects - 1 }));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ statusCode, headers: res.headers, body, finalUrl: url }));
    });
    r.on('timeout', () => r.destroy(new Error('timeout')));
    r.on('error', (e) => resolve({ error: e.message }));
  });
}

async function doh(name, type) {
  const r = await req(
    `https://cloudflare-dns.com/dns-query?name=${name}&type=${type}`,
    { headers: { accept: 'application/dns-json' }, timeout: 15000 }
  );
  if (r.error || !r.body) return { error: r.error || 'empty response' };
  try {
    return JSON.parse(r.body);
  } catch {
    return { error: 'invalid JSON' };
  }
}

(async () => {
  console.log('=== 1. 域名核对（来自 site.json，非手打）===');
  console.log(`  site.json url : ${SITE_URL}`);
  console.log(`  hostname      : ${HOST}`);
  console.log(`  逐字符        : ${[...HOST].join(' ')}`);
  const tCount = [...HOST].filter((c) => c === 't').length;
  console.log(`  字母统计      : 长度 ${HOST.length}，t 出现 ${tCount} 次（getoolkit.com = 2 次；gettoolkit.com = 3 次，那是别人的域名）`);
  if (HOST !== 'getoolkit.com') {
    console.log(`  ⚠️ 警告：站点域名与预期 getoolkit.com 不一致，确认 site.json 是否被改过`);
  }

  console.log('\n=== 2. 权威 DNS（Cloudflare DoH，不经本机代理）===');
  let fail = 0;
  const ns = await doh(HOST, 'NS');
  if (ns.error) {
    console.log(`  ❌ NS 查询失败：${ns.error}`);
    fail++;
  } else {
    // DoH 返回的 NS 带结尾点（asa.ns.cloudflare.com.），归一化后再比对，避免假警报
    const values = (ns.Answer || []).map((a) => a.data.toLowerCase().replace(/\.$/, ''));
    console.log(`  NS: ${values.join(', ') || '(无记录)'}`);
    const ok = EXPECT_NS.every((e) => values.includes(e));
    console.log(ok ? '  ✅ NS 指向 Cloudflare（符合预期）' : '  ❌ NS 与预期不符 —— 域名可能被改指向或已易主，先停下查证');
    if (!ok) fail++;
  }
  const a = await doh(HOST, 'A');
  if (!a.error) {
    const ips = (a.Answer || []).filter((x) => x.type === 1).map((x) => x.data);
    console.log(`  A : ${ips.join(', ') || '(无记录)'}${ips.some((i) => i.startsWith('198.18.')) ? '  ⚠️ 198.18.x.x 是本机 TUN/FakeIP 假地址' : ''}`);
  }

  console.log('\n=== 3. 页面健康检查 ===');
  for (const c of CHECKS) {
    const url = SITE_URL + c.path;
    const r = await req(url);
    if (r.error) {
      console.log(`  ❌ ${c.label.padEnd(14)} ${r.error}`);
      fail++;
      continue;
    }
    const size = Buffer.byteLength(r.body, 'utf8');
    const hit = c.must.filter((m) => r.body.includes(m));
    const miss = c.must.filter((m) => !r.body.includes(m));
    const ok = r.statusCode === 200 && miss.length === 0 && size > 500;
    console.log(
      `  ${ok ? '✅' : '❌'} ${c.label.padEnd(14)} ${r.statusCode} ${r.headers['content-type'] || '-'} ${size}B  ` +
        `命中 ${hit.length}/${c.must.length}${miss.length ? ` 缺: ${miss.join(',')}` : ''}`
    );
    if (!ok) fail++;
  }

  console.log('\n=== 4. 结论 ===');
  console.log(fail === 0 ? '  ✅ 全部通过' : `  ❌ ${fail} 项异常`);
  console.log('  注意：本机可能是 TUN/FakeIP 代理，本地结果仅供参考。');
  console.log('  判定「线上是否真的生效」请再用服务端抓取交叉验证（外部网络抓同一 URL 比对标题/特征串）。');
  process.exit(fail === 0 ? 0 : 1);
})();
