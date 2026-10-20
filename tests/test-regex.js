// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('js/regex-tester.js', 'utf8');

function makeEl() {
  return { value: '', textContent: '', className: '', innerHTML: '', style: {}, checked: false, focus() {} };
}

function boot() {
  const ids = [
    'pattern', 'test', 'replacement', 'msg', 'stats', 'highlight', 'highlightLabel',
    'matches', 'matchLabel', 'replaced', 'replaceLabel',
    'flag-g', 'flag-i', 'flag-m', 'flag-s', 'flag-u'
  ];
  const els = {};
  ids.forEach(id => (els[id] = makeEl()));
  els['flag-g'].checked = true;
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

// ---- 1. email sample ----
{
  const c = boot();
  c.els.pattern.value = '([a-z]+)@([a-z]+)\\.(com|org|net)';
  c.els['flag-i'].checked = true;
  c.els.test.value =
    'Reach us at support@getoolkit.com or sales@getoolkit.org.\n' +
    'For press enquiries: press@getoolkit.net.\n' +
    'Not an address: user@localhost, and hello@getoolkit.io is out of range.';
  c.run();
  console.log('1) email sample: ' + c.els.msg.textContent);
  check('3 matches', /Found 3 matches/.test(c.els.msg.textContent), c.els.msg.textContent);
  check('3 match stat', /<div class="num">3<\/div>/.test(c.els.stats.innerHTML), c.els.stats.innerHTML.slice(0, 60));
  check('3 capture groups', /<div class="num">3<\/div><div class="key">capture groups/.test(c.els.stats.innerHTML));
  check('highlight contains mark', c.els.highlight.innerHTML.indexOf('<mark') > -1);
  check('highlight marks the address', c.els.highlight.innerHTML.indexOf('<mark class="m1">support@getoolkit.com</mark>') > -1);
  check('io excluded', c.els.highlight.innerHTML.indexOf('hello@getoolkit.io</mark>') === -1);
  check('group rows rendered', c.els.matches.innerHTML.indexOf('group 1') > -1);
}

// ---- 2. replacement ----
{
  const c = boot();
  c.els.pattern.value = '([a-z]+)@([a-z]+)\\.com';
  c.els['flag-i'].checked = true;
  c.els.test.value = 'mail: support@getoolkit.com';
  c.els.replacement.value = '$2.$1@example.com';
  c.run();
  console.log('2) replacement: ' + c.els.replaced.value);
  check('backrefs applied', c.els.replaced.value === 'mail: getoolkit.support@example.com', c.els.replaced.value);
}

// ---- 3. invalid regex ----
{
  const c = boot();
  c.els.pattern.value = '(unclosed';
  c.els.test.value = 'anything';
  c.run();
  check('invalid regex reported', /Invalid regular expression/.test(c.els.msg.textContent), c.els.msg.textContent);
  check('invalid regex hides results', c.els.highlightLabel.style.display === 'none');
}

// ---- 4. no match ----
{
  const c = boot();
  c.els.pattern.value = 'zzzz';
  c.els.test.value = 'nothing here';
  c.run();
  check('no matches message', /No matches found/.test(c.els.msg.textContent), c.els.msg.textContent);
}

// ---- 5. empty pattern ----
{
  const c = boot();
  c.els.pattern.value = '';
  c.run();
  check('empty pattern error', /Enter a regular expression/.test(c.els.msg.textContent));
}

// ---- 6. zero-length match safety ----
{
  const c = boot();
  c.els.pattern.value = 'a*';
  c.els.test.value = 'bbb';
  const t0 = Date.now();
  c.run();
  const ms = Date.now() - t0;
  console.log('6) zero-length: ' + ms + 'ms | ' + c.els.msg.textContent);
  check('zero-length does not hang', ms < 1000, ms + 'ms');
  check('zero-length labelled', c.els.matches.innerHTML.indexOf('(empty match)') > -1);
}

// ---- 7. match cap ----
{
  const c = boot();
  c.els.pattern.value = '.';
  c.els.test.value = 'x'.repeat(30000);
  const t0 = Date.now();
  c.run();
  const ms = Date.now() - t0;
  console.log('7) cap: ' + ms + 'ms | ' + c.els.msg.textContent);
  check('cap triggers', /Stopped at 10000 matches/.test(c.els.msg.textContent), c.els.msg.textContent);
  check('cap finishes fast', ms < 2000, ms + 'ms');
}

// ---- 8. non-global ----
{
  const c = boot();
  c.els.pattern.value = '\\d+';
  c.els['flag-g'].checked = false;
  c.els.test.value = 'a1 b22 c333';
  c.run();
  check('non-global finds one', /Found 1 match\./.test(c.els.msg.textContent), c.els.msg.textContent);
}

// ---- 9. named groups ----
{
  const c = boot();
  c.els.pattern.value = '(?<year>\\d{4})-(?<month>\\d{2})';
  c.els.test.value = 'due 2026-10-20';
  c.run();
  const html = c.els.matches.innerHTML;
  check('named group year shown', html.indexOf('group 1 · year') > -1, html.slice(0, 200));
  check('named group month shown', html.indexOf('group 2 · month') > -1);
}

// ---- 10. html escaping ----
{
  const c = boot();
  c.els.pattern.value = '<script>';
  c.els['flag-i'].checked = true;
  c.els.test.value = 'payload <script>alert(1)</script> end';
  c.run();
  const html = c.els.highlight.innerHTML;
  check('no raw script tag in output', html.indexOf('<script') === -1, html.slice(0, 120));
  check('escaped script tag present', html.indexOf('&lt;script&gt;') > -1);
}

// ---- 11. long text truncation ----
{
  const c = boot();
  c.els.pattern.value = 'qqqq';
  c.els.test.value = 'z'.repeat(250000);
  const t0 = Date.now();
  c.run();
  const ms = Date.now() - t0;
  console.log('11) truncation: ' + ms + 'ms | ' + c.els.msg.textContent);
  check('truncation notice', /first 200000 characters/.test(c.els.msg.textContent), c.els.msg.textContent);
}

// ---- 12. clear ----
{
  const c = boot();
  c.els.pattern.value = 'a';
  c.els.test.value = 'a';
  c.run();
  c.clearAll();
  check('clear resets fields', c.els.pattern.value === '' && c.els.test.value === '');
  check('clear hides stats', c.els.stats.style.display === 'none');
}

console.log('\n=== regex-tester: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
