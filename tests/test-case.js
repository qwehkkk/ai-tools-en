// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('js/case-converter.js', 'utf8');

function makeEl() {
  return { value: '', textContent: '', className: '', innerHTML: '', style: {}, checked: false, focus() {} };
}

function boot() {
  const ids = ['input', 'msg', 'results', 'out-camel', 'out-pascal', 'out-snake', 'out-kebab', 'out-constant', 'out-title', 'out-sentence'];
  const els = {};
  ids.forEach(id => (els[id] = makeEl()));
  let copied = null;
  const ctx = {
    document: { getElementById: id => els[id] || null, createElement: () => makeEl() },
    navigator: { clipboard: { writeText: t => { copied = t; return Promise.resolve(); } } },
    console,
    els,
    getCopied: () => copied
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

function all(c, expected) {
  ['camel', 'pascal', 'snake', 'kebab', 'constant', 'title', 'sentence'].forEach(k => {
    const got = c.els['out-' + k].textContent;
    check('  ' + k + ' = ' + expected[k], got === expected[k], 'got "' + got + '"');
  });
}

// 1. plain spaced words
{
  const c = boot();
  c.els.input.value = 'hello world';
  c.convert();
  all(c, {
    camel: 'helloWorld',
    pascal: 'HelloWorld',
    snake: 'hello_world',
    kebab: 'hello-world',
    constant: 'HELLO_WORLD',
    title: 'Hello World',
    sentence: 'Hello world'
  });
}

// 2. camelCase input
{
  const c = boot();
  c.els.input.value = 'getToolkit';
  c.convert();
  console.log('2) getToolkit');
  all(c, {
    camel: 'getToolkit',
    pascal: 'GetToolkit',
    snake: 'get_toolkit',
    kebab: 'get-toolkit',
    constant: 'GET_TOOLKIT',
    title: 'Get Toolkit',
    sentence: 'Get toolkit'
  });
}

// 3. acronym handling
{
  const c = boot();
  c.els.input.value = 'XMLHttpRequest';
  c.convert();
  console.log('3) XMLHttpRequest');
  all(c, {
    camel: 'xmlHttpRequest',
    pascal: 'XmlHttpRequest',
    snake: 'xml_http_request',
    kebab: 'xml-http-request',
    constant: 'XML_HTTP_REQUEST',
    title: 'Xml Http Request',
    sentence: 'Xml http request'
  });
}

// 4. snake input
{
  const c = boot();
  c.els.input.value = 'user_id';
  c.convert();
  console.log('4) user_id');
  check('camel from snake', c.els['out-camel'].textContent === 'userId', c.els['out-camel'].textContent);
  check('constant from snake', c.els['out-constant'].textContent === 'USER_ID', c.els['out-constant'].textContent);
}

// 5. digits stay attached
{
  const c = boot();
  c.els.input.value = 'sha256Hash';
  c.convert();
  console.log('5) sha256Hash');
  check('snake keeps digits', c.els['out-snake'].textContent === 'sha256_hash', c.els['out-snake'].textContent);
}

// 6. empty
{
  const c = boot();
  c.els.input.value = '';
  c.convert();
  check('empty input error', /Type or paste some text/.test(c.els.msg.textContent), c.els.msg.textContent);
  check('empty hides results', c.els.results.style.display === 'none');
}

// 7. punctuation only
{
  const c = boot();
  c.els.input.value = '--- ... __';
  c.convert();
  check('punctuation only -> error', /Type or paste some text/.test(c.els.msg.textContent));
}

// 8. copy
{
  const c = boot();
  c.els.input.value = 'hello world';
  c.convert();
  c.copyOne('out-kebab');
  check('copy writes kebab value', c.getCopied() === 'hello-world', String(c.getCopied()));
}

// 9. clear
{
  const c = boot();
  c.els.input.value = 'a b';
  c.convert();
  c.clearAll();
  check('clear empties input', c.els.input.value === '');
  check('clear empties outputs', c.els['out-camel'].textContent === '');
}

console.log('\n=== case-converter: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
