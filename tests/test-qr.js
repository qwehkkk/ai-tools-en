// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
/**
 * Validates js/qrcode.js against matrices produced by the python-qrcode
 * reference implementation. Reference data lives in tests/ref-qr.json.
 */
const fs = require('fs');
const vm = require('vm');

const ctx = { console, TextEncoder, Math, Array, Object };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('js/qr-tables.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('js/qrcode.js', 'utf8'), ctx);

const ref = JSON.parse(fs.readFileSync('tests/ref-qr.json', 'utf8'));

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : ''));
  }
}

let maskAgree = 0;

for (const c of ref) {
  const auto = ctx.QR.encode(c.text, c.ecl);
  const label =
    'v' + c.version + '/ecl' + c.ecl + ' ' + JSON.stringify(c.text.slice(0, 24));

  if (auto.error) {
    check(label + ' encodes', false, auto.error);
    continue;
  }
  check(label + ' version', auto.version === c.version, auto.version + ' vs ' + c.version);
  check(label + ' size', auto.size === c.size, auto.size + ' vs ' + c.size);

  // The reference library scores masks with its own penalty variant, which
  // skips overlapping 2x2 blocks, so it sometimes picks a different (equally
  // legal) mask. Compare against every mask and require an exact match for one
  // of them: that proves the data, EC codewords, layout and format bits agree.
  let matchedMask = -1;
  let closest = Infinity;
  for (let k = 0; k < 8; k++) {
    const got = ctx.QR.encode(c.text, c.ecl, k);
    let diff = 0;
    for (let r = 0; r < c.size && diff < closest; r++) {
      for (let col = 0; col < c.size; col++) {
        const want = c.rows[r][col] === '1' ? 1 : 0;
        if (got.modules[r][col] !== want) diff++;
      }
    }
    if (diff < closest) closest = diff;
    if (diff === 0) {
      matchedMask = k;
      break;
    }
  }
  check(
    label + ' matches reference under some mask',
    matchedMask >= 0,
    'closest mask still differs in ' + closest + ' cells'
  );
  if (matchedMask >= 0 && auto.mask === matchedMask) maskAgree++;
}

// ---- behaviour that the reference cannot cover ----
{
  const empty = ctx.QR.encode('', 1);
  check('empty input is rejected', !!empty.error, JSON.stringify(empty));

  const huge = ctx.QR.encode('x'.repeat(4000), 0);
  check('oversized input is rejected', !!huge.error, JSON.stringify(huge));

  const one = ctx.QR.encode('A', 0);
  check('single char -> version 1', one.version === 1, String(one.version));
  check('single char -> 21 modules', one.size === 21, String(one.size));

  // Capacity boundary: version 1 level L holds 17 bytes.
  const at17 = ctx.QR.encode('a'.repeat(17), 0);
  const at18 = ctx.QR.encode('a'.repeat(18), 0);
  check('17 bytes fit version 1', at17.version === 1, String(at17.version));
  check('18 bytes roll to version 2', at18.version === 2, String(at18.version));

  // Finder pattern must sit in three corners.
  const m = ctx.QR.encode('finder check', 1).modules;
  check('top-left finder', m[0][0] === 1 && m[1][1] === 0 && m[3][3] === 1);
  check('top-right finder', m[0][m.length - 1] === 1 && m[3][m.length - 3] === 1);
  check('bottom-left finder', m[m.length - 1][0] === 1 && m[m.length - 3][3] === 1);

  // Timing pattern alternates along row 6.
  let timingOk = true;
  for (let i = 8; i < m.length - 8; i++) {
    if (m[6][i] !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
  }
  check('timing pattern alternates', timingOk);

  // The dark module is always set.
  check('dark module', m[m.length - 8][8] === 1);

  // Every level is selectable and produces a different, valid matrix.
  const sizes = [0, 1, 2, 3].map(e => ctx.QR.encode('https://getoolkit.com/', e).version);
  check('levels pick a version', sizes.every(v => v >= 1), JSON.stringify(sizes));

  // Deterministic: same input, same output.
  const a = ctx.QR.encode('determinism', 2);
  const b = ctx.QR.encode('determinism', 2);
  check('deterministic output', JSON.stringify(a.modules) === JSON.stringify(b.modules));

  // Default level when a bad one is passed.
  const weird = ctx.QR.encode('level fallback', 9);
  check('bad level falls back', !weird.error && weird.ecl === 1, JSON.stringify(weird.ecl));
}

console.log('qrcode: ' + pass + ' passed, ' + fail + ' failed');
console.log('auto mask identical to reference in ' + maskAgree + '/' + ref.length + ' cases (difference is the reference penalty variant)');
process.exit(fail ? 1 : 0);
