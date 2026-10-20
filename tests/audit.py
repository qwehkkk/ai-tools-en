"""Site audit for GetToolkit.

Checks the things that actually cost traffic when they break: titles and
descriptions that are missing or badly sized, canonical URLs pointing at a
redirect, pages missing from the sitemap, duplicate metadata across pages,
and pages with no usable <h1>.

    python tests/audit.py

Exits non-zero when a blocking problem is found, so it can gate a deploy.
"""

import glob
import html as htmllib
import io
import os
import re
import sys
import urllib.parse

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

SITE = None
try:
    import json
    SITE = json.load(io.open('site.json', encoding='utf-8'))['url'].rstrip('/')
except Exception:
    SITE = 'https://gettoolkit.com'

# 404 is deliberately absent from the sitemap and carries noindex, so it is
# exempt from the metadata checks that apply to indexable pages.
NOT_INDEXED = {'404.html'}


def page_url(rel):
    """Map a file on disk to the URL Cloudflare Pages actually serves."""
    if rel == 'index.html':
        return SITE + '/'
    p = rel.replace(os.sep, '/')
    if p.endswith('.html'):
        p = p[:-5]
    return SITE + '/' + p


def find(pattern, text, group=1, flags=re.I):
    m = re.search(pattern, text, flags)
    return htmllib.unescape(m.group(group)).strip() if m else ''


def audit(rel):
    raw = io.open(rel, encoding='utf-8').read()
    issues = []

    title = find(r'<title>([\s\S]*?)</title>', raw)
    desc = find(r'<meta\s+name="description"\s+content="([\s\S]*?)"', raw)
    canonical = find(r'<link\s+rel="canonical"\s+href="([^"]*)"', raw)
    og_title = find(r'<meta\s+property="og:title"\s+content="([^"]*)"', raw)
    og_image = find(r'<meta\s+property="og:image"\s+content="([^"]*)"', raw)
    og_url = find(r'<meta\s+property="og:url"\s+content="([^"]*)"', raw)
    lang = find(r'<html[^>]*\blang="([^"]*)"', raw)
    robots = find(r'<meta\s+name="robots"\s+content="([^"]*)"', raw)
    h1s = re.findall(r'<h1\b[^>]*>([\s\S]*?)</h1>', raw, re.I)

    want = page_url(rel)
    exempt = rel in NOT_INDEXED

    if not exempt:
        if not title:
            issues.append('no <title>')
        elif not (15 <= len(title) <= 65):
            issues.append('title length %d (want 15-65)' % len(title))

        if not desc:
            issues.append('no meta description')
        elif not (50 <= len(desc) <= 165):
            issues.append('description length %d (want 50-165)' % len(desc))

        if not canonical:
            issues.append('no canonical')
        elif canonical != want:
            issues.append('canonical is %s, expected %s' % (canonical, want))

        if canonical.endswith('.html'):
            issues.append('canonical keeps the .html suffix (Pages 308-redirects it)')

        if not og_title:
            issues.append('no og:title')
        if not og_image:
            issues.append('no og:image')
        elif not og_image.startswith('http'):
            issues.append('og:image is not absolute')
        if og_url and og_url != want:
            issues.append('og:url is %s, expected %s' % (og_url, want))

    if lang != 'en':
        issues.append('html lang is %r (want "en")' % lang)

    if len(h1s) != 1:
        issues.append('%d <h1> elements (want 1)' % len(h1s))
    elif not re.sub(r'<[^>]+>', '', h1s[0]).strip():
        issues.append('empty <h1>')

    if 'noindex' in robots and rel not in NOT_INDEXED:
        issues.append('noindex on an indexable page')

    return {
        'file': rel,
        'url': want,
        'title': title,
        'desc': desc,
        'h1': re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', h1s[0])).strip() if h1s else '',
        'issues': issues,
    }


pages = sorted(glob.glob('*.html') + glob.glob('tools/*.html'))
pages = [p for p in pages if not os.path.basename(p).startswith('google')]
pages = [p.replace(os.sep, '/') for p in pages]

rows = [audit(p) for p in pages]

# ---- sitemap cross-check -------------------------------------------------
sm = io.open('sitemap.xml', encoding='utf-8').read()
in_sitemap = set(re.findall(r'<loc>([^<]+)</loc>', sm))

# Every indexable page must be listed, and every listed URL must exist.
expected = {r['url'] for r in rows if os.path.basename(r['file']) not in NOT_INDEXED}
missing_from_sitemap = sorted(expected - in_sitemap)
stale_in_sitemap = sorted(in_sitemap - expected)

# ---- duplicate metadata --------------------------------------------------
dup_title = {}
dup_desc = {}
for r in rows:
    if r['title']:
        dup_title.setdefault(r['title'], []).append(r['file'])
    if r['desc']:
        dup_desc.setdefault(r['desc'], []).append(r['file'])
dup_title = {k: v for k, v in dup_title.items() if len(v) > 1}
dup_desc = {k: v for k, v in dup_desc.items() if len(v) > 1}

# ---- internal links ------------------------------------------------------
broken = []
for p in rows:
    raw = io.open(p['file'], encoding='utf-8').read()
    base = os.path.dirname(p['file'])
    for m in re.finditer(r'(?:href|src)="([^"]+)"', raw):
        u = m.group(1)
        if u.startswith(('http://', 'https://', 'mailto:', '#', 'data:', '//')):
            continue
        clean = urllib.parse.unquote(u.split('#')[0].split('?')[0])
        if not clean:
            continue
        target = clean.lstrip('/') if clean.startswith('/') else os.path.join(base, clean)
        if not any(os.path.isfile(c) for c in (target, target + '.html',
                                               os.path.join(target, 'index.html'))):
            broken.append((p['file'], u))

# ---- report --------------------------------------------------------------
print('GetToolkit site audit — %s' % SITE)
print('=' * 74)
print('%-38s %5s %5s %5s %s' % ('page', 'title', 'desc', 'h1', 'status'))
print('-' * 74)
for r in rows:
    print('%-38s %5d %5d %5d %s' % (
        r['file'][:38], len(r['title']), len(r['desc']),
        len(r['h1']), 'ok' if not r['issues'] else 'ISSUE'))
print()

blocking = 0

if missing_from_sitemap:
    blocking += len(missing_from_sitemap)
    print('Missing from sitemap.xml:')
    for u in missing_from_sitemap:
        print('  - %s' % u)

if stale_in_sitemap:
    blocking += len(stale_in_sitemap)
    print('In sitemap.xml but no matching page:')
    for u in stale_in_sitemap:
        print('  - %s' % u)

if broken:
    blocking += len(broken)
    print('Broken internal links:')
    for f, u in broken[:15]:
        print('  - %s -> %s' % (f, u))

if dup_title:
    blocking += len(dup_title)
    print('Duplicate titles:')
    for t, files in dup_title.items():
        print('  - %r in %s' % (t[:50], ', '.join(files)))

if dup_desc:
    print('Duplicate descriptions:')
    for d, files in dup_desc.items():
        print('  - %r in %s' % (d[:50], ', '.join(files)))

for r in rows:
    if r['issues']:
        blocking += len(r['issues'])
        print('%s:' % r['file'])
        for i in r['issues']:
            print('  - %s' % i)

print()
print('pages %d | sitemap %d | broken links %d | problems %d'
      % (len(rows), len(in_sitemap), len(broken), blocking))
print('Audit %s.' % ('passed' if blocking == 0 else 'FAILED'))
sys.exit(0 if blocking == 0 else 1)
