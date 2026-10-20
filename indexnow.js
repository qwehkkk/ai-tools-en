#!/usr/bin/env node
/**
 * Push every URL in sitemap.xml to IndexNow.
 *
 * IndexNow is an open "ping" protocol: instead of waiting for a crawler to
 * come back on its own schedule, the site tells participating search engines
 * which URLs changed. Bing, Yandex, Seznam and Naver accept it today.
 *
 * The key file must be reachable on the live site before the first submit, so
 * deploy first and run this afterwards.
 *
 *   node indexnow.js          # submit every URL in sitemap.xml
 *   node indexnow.js --dry    # print the payload, submit nothing
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const sitePath = path.join(ROOT, 'site.json');
const site = readJson(sitePath);

// Create a key once and remember it, so repeat runs reuse the same file name.
if (!site.indexNowKey) {
  site.indexNowKey = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(sitePath, JSON.stringify(site, null, 2) + '\n', 'utf8');
  console.log('Generated a new IndexNow key.');
}

const key = site.indexNowKey;
const keyFile = key + '.txt';
fs.writeFileSync(path.join(ROOT, keyFile), key + '\n', 'utf8');

const host = site.url.replace(/^https?:\/\//, '').replace(/\/+$/, '');

const xml = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [];
const re = /<loc>([^<]+)<\/loc>/g;
let m;
while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());

if (!urls.length) {
  console.error('No URLs found in sitemap.xml — run node generate-sitemap.js first.');
  process.exit(1);
}

const payload = {
  host: host,
  key: key,
  keyLocation: site.url.replace(/\/+$/, '') + '/' + keyFile,
  urlList: urls
};

console.log('host        ' + host);
console.log('key file    /' + keyFile);
console.log('submitting  ' + urls.length + ' URLs');

if (process.argv.includes('--dry')) {
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
}

fetch(ENDPOINT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(payload)
})
  .then(function (res) {
    return res.text().then(function (body) {
      if (res.status === 200 || res.status === 202) {
        console.log('OK  ' + res.status + '  search engines accepted the URLs.');
      } else {
        console.log('status ' + res.status + '  ' + body.slice(0, 300));
        process.exitCode = 1;
      }
    });
  })
  .catch(function (err) {
    console.error('Request failed: ' + err.message);
    process.exitCode = 1;
  });
