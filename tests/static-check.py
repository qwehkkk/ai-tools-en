import glob
import io
import os
import re

# Run from any directory: every path below is repo-relative.
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

problems = []

for html_file in sorted(glob.glob('*.html') + glob.glob('tools/*.html')):
    html = io.open(html_file, encoding='utf-8').read()

    scripts = re.findall(r'<script src="([^"]+)"></script>', html)
    js_text = ''
    for s in scripts:
        if s.startswith('http'):
            continue
        # pages under tools/ reference ../js/...
        p = os.path.normpath(os.path.join(os.path.dirname(html_file), s))
        if os.path.isfile(p):
            js_text += io.open(p, encoding='utf-8').read()

    if not js_text:
        continue

    html_ids = set(re.findall(r'\bid="([^"]+)"', html))
    needed_ids = set(re.findall(r"getElementById\('([^']+)'\)", js_text))
    missing_ids = sorted(needed_ids - html_ids)

    onclicks = set(re.findall(r'on(?:click|input|change)="([A-Za-z_$][\w$]*)\(', html))
    defined = set(re.findall(r'window\.([A-Za-z_$][\w$]*)\s*=', js_text)) | set(
        re.findall(r'function\s+([A-Za-z_$][\w$]*)\s*\(', js_text)
    )
    missing_fns = sorted(onclicks - defined)

    if missing_ids or missing_fns:
        problems.append((html_file, missing_ids, missing_fns))

print('pages checked:', len(glob.glob('*.html') + glob.glob('tools/*.html')))
if problems:
    for f, ids, fns in problems:
        print('  ISSUE', f)
        if ids:
            print('     missing element ids:', ids)
        if fns:
            print('     missing functions:', fns)
else:
    print('  no missing ids or handlers ✅')
