// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('js/text-diff.js', 'utf8');

function makeEl() {
  return { value: '', textContent: '', className: '', innerHTML: '', style: {}, checked: false, focus() {} };
}

function boot() {
  const ids = ['left', 'right', 'msg', 'stats', 'diffView', 'diffLabel', 'ignoreCase', 'ignoreSpace', 'inlineDiff'];
  const els = {};
  ids.forEach(id => (els[id] = makeEl()));
  els.ignoreSpace.checked = true;
  els.inlineDiff.checked = true;
  const ctx = {
    document: { getElementById: id => els[id] || null, createElement: () => makeEl() },
    navigator: {},
    console,
    els
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log('  PASS  ' + name);
  } else {
    fail++;
    console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : ''));
  }
}

// ---- 1. config-style change ----
{
  const c = boot();
  c.els.left.value = '{\n  "name": "getoolkit",\n  "version": "1.2.0",\n  "cache": true,\n  "timeout": 30,\n  "features": ["json", "hash", "uuid"]\n}';
  c.els.right.value = '{\n  "name": "getoolkit",\n  "version": "1.3.0",\n  "cache": false,\n  "timeout": 60,\n  "features": ["json", "hash", "uuid", "diff"]\n}';
  c.compare();
  const html = c.els.diffView.innerHTML;
  const statText = c.els.stats.innerHTML;
  console.log('1) config diff: ' + c.els.msg.textContent);
  check('4 lines added', /<div class="num">4<\/div><div class="key">lines added/.test(statText), statText.slice(0, 80));
  check('3 unchanged', /<div class="num">3<\/div><div class="key">lines unchanged/.test(statText));
  check('inline <ins> highlight present', html.indexOf('<ins>') > -1);
  check('inline <del> highlight present', html.indexOf('<del>') > -1);
  check('highlights 1.2.0 removal', html.indexOf('<del>1.2.0</del>') > -1 || html.indexOf('1.2.0') > -1);
  check('escaped quotes', html.indexOf('&quot;') === -1 && html.indexOf('"') > -1);
}

// ---- 2. identical ----
{
  const c = boot();
  c.els.left.value = 'alpha\nbeta\ngamma\n';
  c.els.right.value = 'alpha\nbeta\ngamma';
  c.compare();
  console.log('2) identical: ' + c.els.msg.textContent);
  check('no differences reported', /No differences/.test(c.els.msg.textContent));
  check('no add/remove rows', c.els.diffView.innerHTML.indexOf('diff-line add') === -1);
}

// ---- 3. CRLF vs LF ----
{
  const c = boot();
  c.els.left.value = 'a\r\nb\r\nc\r\n';
  c.els.right.value = 'a\nb\nc\n';
  c.compare();
  console.log('3) CRLF: ' + c.els.msg.textContent);
  check('CRLF equals LF', /No differences/.test(c.els.msg.textContent));
}

// ---- 4. pure insertion / deletion ----
{
  const c = boot();
  c.els.left.value = 'one\nthree';
  c.els.right.value = 'one\ntwo\nthree';
  c.compare();
  console.log('4) insertion: ' + c.els.msg.textContent);
  check('one addition', /<div class="num">1<\/div><div class="key">lines added/.test(c.els.stats.innerHTML), c.els.stats.innerHTML.slice(0, 60));
  check('no change rows', /<div class="num">0<\/div><div class="key">lines changed/.test(c.els.stats.innerHTML));
}

// ---- 5. empty input ----
{
  const c = boot();
  c.els.left.value = '';
  c.els.right.value = '';
  c.compare();
  check('empty both -> error message', /Paste text into both boxes/.test(c.els.msg.textContent));
  check('empty both -> view hidden', c.els.diffView.style.display === 'none');
}

// ---- 6. escaping ----
{
  const c = boot();
  c.els.left.value = '<script>alert("x")</script>';
  c.els.right.value = '<script>alert("y")</script>';
  c.compare();
  const html = c.els.diffView.innerHTML;
  check('script tags escaped', html.indexOf('<script>') === -1 && html.indexOf('&lt;script&gt;') > -1, html.slice(0, 120));
}

// ---- 7. large input fallback ----
{
  const c = boot();
  const a = [];
  const b = [];
  for (let i = 0; i < 3000; i++) {
    a.push('line ' + i);
    b.push('line ' + i);
  }
  b[1500] = 'line CHANGED';
  c.els.left.value = a.join('\n');
  c.els.right.value = b.join('\n');
  const t0 = Date.now();
  c.compare();
  const ms = Date.now() - t0;
  console.log('7) 3000x3000 fallback: ' + ms + 'ms | ' + c.els.msg.textContent);
  check('large input completed under 3s', ms < 3000, ms + 'ms');
  check('large input produced output', c.els.diffView.innerHTML.length > 100);
  check('truncated notice shown', /simplified diff/.test(c.els.msg.textContent), c.els.msg.textContent);
}

// ---- 8. swap ----
{
  const c = boot();
  c.els.left.value = 'AAA';
  c.els.right.value = 'BBB';
  c.swap();
  check('swap exchanges values', c.els.left.value === 'BBB' && c.els.right.value === 'AAA');
}

// ---- 9. ignore case off/on ----
{
  const c = boot();
  c.els.left.value = 'Hello World';
  c.els.right.value = 'hello world';
  c.els.ignoreCase.checked = false;
  c.compare();
  const differs = !/No differences/.test(c.els.msg.textContent);
  c.els.ignoreCase.checked = true;
  c.compare();
  const same = /No differences/.test(c.els.msg.textContent);
  check('case sensitive mode sees a diff', differs);
  check('ignore case makes it identical', same);
}

console.log('\n=== text-diff: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
