/**
 * QR Code encoder, byte mode, no dependencies.
 *
 * Everything the standard requires is implemented here: Reed-Solomon error
 * correction over GF(256), the block structure from the ISO table, function
 * patterns, the zig-zag data placement, all eight masks and the penalty rules
 * that pick the best one.
 *
 * Input is UTF-8 text only (byte mode). That covers URLs, JSON, emoji and
 * Chinese; it uses more capacity than the numeric or alphanumeric modes, but
 * it means one code path instead of three and no surprises for the user.
 *
 * Load js/qr-tables.js first — this file reads the two tables it publishes.
 */
(function () {
  var RS_BLOCKS = globalThis.QR_RS_BLOCKS;
  var ALIGN = globalThis.QR_ALIGNMENT;

  if (!RS_BLOCKS || !ALIGN) {
    throw new Error('QR tables missing — load js/qr-tables.js before js/qrcode.js');
  }

  /* ------------------------------------------------------- Galois field */

  var EXP = new Array(512);
  var LOG = new Array(256);
  (function () {
    var x = 1;
    var i;
    for (i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  function gmul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  function polyMul(p, q) {
    var r = new Array(p.length + q.length - 1);
    var i, j;
    for (i = 0; i < r.length; i++) r[i] = 0;
    for (i = 0; i < p.length; i++) {
      for (j = 0; j < q.length; j++) r[i + j] ^= gmul(p[i], q[j]);
    }
    return r;
  }

  var GEN = {};
  function genPoly(n) {
    if (GEN[n]) return GEN[n];
    var g = [1];
    for (var i = 0; i < n; i++) g = polyMul(g, [1, EXP[i]]);
    GEN[n] = g;
    return g;
  }

  /** Polynomial long division; the remainder is the error-correction code. */
  function rsEncode(data, ecCount) {
    var gen = genPoly(ecCount);
    var res = new Array(data.length + ecCount);
    var i, j;
    for (i = 0; i < data.length; i++) res[i] = data[i];
    for (i = data.length; i < res.length; i++) res[i] = 0;
    for (i = 0; i < data.length; i++) {
      var coef = res[i];
      if (coef !== 0) {
        for (j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], coef);
      }
    }
    return res.slice(data.length);
  }

  /* ------------------------------------------------------------ bit stream */

  function Bits() {
    this.list = [];
  }
  Bits.prototype.put = function (value, count) {
    for (var i = count - 1; i >= 0; i--) this.list.push((value >>> i) & 1);
  };
  Bits.prototype.bytes = function () {
    var out = [];
    for (var i = 0; i < this.list.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = ((b << 1) | (this.list[i + j] || 0)) & 0xff;
      out.push(b);
    }
    return out;
  };

  // Error-correction levels index into the table as 0=L 1=M 2=Q 3=H, but the
  // format information encodes them as L=01 M=00 Q=11 H=10.
  var EC_FORMAT_BITS = [1, 0, 3, 2];
  var EC_NAMES = ['L', 'M', 'Q', 'H'];

  function dataCapacity(version, ecl) {
    var groups = RS_BLOCKS[version - 1][ecl];
    var n = 0;
    for (var i = 0; i < groups.length; i++) n += groups[i][0] * groups[i][2];
    return n;
  }

  /** Smallest version that fits this many UTF-8 bytes at this level, or -1. */
  function chooseVersion(byteCount, ecl) {
    for (var v = 1; v <= 40; v++) {
      var bits = 4 + (v < 10 ? 8 : 16) + byteCount * 8;
      if (bits <= dataCapacity(v, ecl) * 8) return v;
    }
    return -1;
  }

  function buildCodewords(bytes, version, ecl) {
    var cap = dataCapacity(version, ecl);
    var bits = new Bits();
    var i, j;

    bits.put(4, 4); // byte mode
    bits.put(bytes.length, version < 10 ? 8 : 16);
    for (i = 0; i < bytes.length; i++) bits.put(bytes[i], 8);

    // Terminator, then pad up to the byte boundary, then the two pad codewords.
    bits.put(0, Math.min(4, cap * 8 - bits.list.length));
    while (bits.list.length % 8 !== 0) bits.list.push(0);

    var data = bits.bytes();
    var pad = [0xec, 0x11];
    var k = 0;
    while (data.length < cap) data.push(pad[k++ % 2]);

    // Split into the blocks the version and level call for, then interleave.
    var groups = RS_BLOCKS[version - 1][ecl];
    var blocks = [];
    var off = 0;
    for (i = 0; i < groups.length; i++) {
      for (j = 0; j < groups[i][0]; j++) {
        var d = data.slice(off, off + groups[i][2]);
        off += groups[i][2];
        blocks.push({ data: d, ec: rsEncode(d, groups[i][1] - groups[i][2]) });
      }
    }

    var maxData = 0;
    var maxEc = 0;
    for (i = 0; i < blocks.length; i++) {
      if (blocks[i].data.length > maxData) maxData = blocks[i].data.length;
      if (blocks[i].ec.length > maxEc) maxEc = blocks[i].ec.length;
    }

    var out = [];
    for (i = 0; i < maxData; i++) {
      for (j = 0; j < blocks.length; j++) {
        if (i < blocks[j].data.length) out.push(blocks[j].data[i]);
      }
    }
    for (i = 0; i < maxEc; i++) {
      for (j = 0; j < blocks.length; j++) {
        if (i < blocks[j].ec.length) out.push(blocks[j].ec[i]);
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- matrix */

  function blank(size, value) {
    var m = [];
    for (var i = 0; i < size; i++) {
      m.push(new Array(size));
      for (var j = 0; j < size; j++) m[i][j] = value;
    }
    return m;
  }

  function maskBit(k, r, c) {
    switch (k) {
      case 0:
        return (r + c) % 2 === 0;
      case 1:
        return r % 2 === 0;
      case 2:
        return c % 3 === 0;
      case 3:
        return (r + c) % 3 === 0;
      case 4:
        return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0;
      case 5:
        return ((r * c) % 2) + ((r * c) % 3) === 0;
      case 6:
        return (((r * c) % 2) + ((r * c) % 3)) % 2 === 0;
      default:
        return (((r + c) % 2) + ((r * c) % 3)) % 2 === 0;
    }
  }

  /**
   * 15-bit format information: 5 data bits (level then mask) plus a 10-bit
   * BCH remainder, XOR-ed with the fixed mask so an all-zero result is not
   * accidentally a valid pattern.
   */
  function formatBits(ecl, mask) {
    var data = (EC_FORMAT_BITS[ecl] << 3) | mask;
    var rem = data << 10;
    for (var i = 14; i >= 10; i--) {
      if (rem & (1 << i)) rem ^= 0x537 << (i - 10);
    }
    return (((data << 10) | (rem & 0x3ff)) ^ 0x5412) & 0x7fff;
  }

  /** 18-bit version information, only present from version 7 upwards. */
  function versionBits(version) {
    var rem = version << 12;
    for (var i = 17; i >= 12; i--) {
      if (rem & (1 << i)) rem ^= 0x1f25 << (i - 12);
    }
    return ((version << 12) | (rem & 0xfff)) & 0x3ffff;
  }

  function buildMatrix(version, ecl, codewords, forceMask) {
    var size = version * 4 + 17;
    var m = blank(size, 0);
    var fixed = blank(size, false);
    var i, j, r, c;

    function set(rr, cc, v) {
      if (rr < 0 || rr >= size || cc < 0 || cc >= size) return;
      m[rr][cc] = v;
      fixed[rr][cc] = true;
    }

    function placeFinder(r0, c0) {
      for (var dr = -1; dr <= 7; dr++) {
        for (var dc = -1; dc <= 7; dc++) {
          var rr = r0 + dr;
          var cc = c0 + dc;
          if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
          var on =
            (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
            (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6)) ||
            (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4);
          set(rr, cc, on ? 1 : 0);
        }
      }
    }

    placeFinder(0, 0);
    placeFinder(size - 7, 0);
    placeFinder(0, size - 7);

    // Timing patterns.
    for (i = 8; i < size - 8; i++) {
      var v = i % 2 === 0 ? 1 : 0;
      if (!fixed[6][i]) set(6, i, v);
      if (!fixed[i][6]) set(i, 6, v);
    }

    // Alignment patterns sit on every crossing of the coordinate grid except
    // the three that would land on a finder. Crossings on the timing lines are
    // valid and simply overwrite the timing modules there.
    var coords = ALIGN[version - 1];
    function overlapsFinder(r, c) {
      var lo = 3;
      var hi = size - 4;
      return (
        (Math.abs(r - lo) <= 3 && Math.abs(c - lo) <= 3) ||
        (Math.abs(r - lo) <= 3 && Math.abs(c - hi) <= 3) ||
        (Math.abs(r - hi) <= 3 && Math.abs(c - lo) <= 3)
      );
    }
    for (i = 0; i < coords.length; i++) {
      for (j = 0; j < coords.length; j++) {
        r = coords[i];
        c = coords[j];
        if (overlapsFinder(r, c)) continue;
        for (var dr = -2; dr <= 2; dr++) {
          for (var dc = -2; dc <= 2; dc++) {
            var on = Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
            set(r + dr, c + dc, on ? 1 : 0);
          }
        }
      }
    }

    // Reserve the format and version areas so data is not placed in them.
    for (i = 0; i < 9; i++) {
      if (!fixed[8][i]) set(8, i, 0);
      if (!fixed[i][8]) set(i, 8, 0);
    }
    for (i = 0; i < 8; i++) {
      set(8, size - 1 - i, 0);
      set(size - 1 - i, 8, 0);
    }
    if (version >= 7) {
      for (i = 0; i < 6; i++) {
        for (j = 0; j < 3; j++) {
          set(size - 11 + j, i, 0);
          set(i, size - 11 + j, 0);
        }
      }
    }

    set(size - 8, 8, 1); // the always-dark module

    // Data placement: two columns at a time, snaking up and down.
    var bitIdx = 0;
    var total = codewords.length * 8;
    var row = size - 1;
    var inc = -1;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--; // skip the vertical timing column
      for (;;) {
        for (var k = 0; k < 2; k++) {
          c = col - k;
          if (!fixed[row][c]) {
            var bit = 0;
            if (bitIdx < total) bit = (codewords[bitIdx >> 3] >>> (7 - (bitIdx & 7))) & 1;
            m[row][c] = bit;
            bitIdx++;
          }
        }
        row += inc;
        if (row < 0 || row >= size) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }

    function applyMask(k) {
      for (var rr = 0; rr < size; rr++) {
        for (var cc = 0; cc < size; cc++) {
          if (!fixed[rr][cc] && maskBit(k, rr, cc)) m[rr][cc] ^= 1;
        }
      }
    }

    /**
     * The 15 bits run most-significant first: position 0 of the sequence lands
     * on bit 14 of the value, and the last position lands on bit 0.
     */
    function placeFormat(bits) {
      for (var b = 0; b < 15; b++) {
        var bit = (bits >> (14 - b)) & 1;
        if (b < 6) set(8, b, bit);
        else if (b === 6) set(8, 7, bit);
        else if (b === 7) set(8, 8, bit);
        else if (b === 8) set(7, 8, bit);
        else set(14 - b, 8, bit);

        // Second copy: seven modules up the right-hand column, then eight
        // along the bottom edge.
        if (b < 7) set(size - 1 - b, 8, bit);
        else set(8, size - 15 + b, bit);
      }
    }

    if (version >= 7) {
      var vbits = versionBits(version);
      for (i = 0; i < 18; i++) {
        var vb = (vbits >> i) & 1;
        set(Math.floor(i / 3), size - 11 + (i % 3), vb);
        set(size - 11 + (i % 3), Math.floor(i / 3), vb);
      }
    }

    if (typeof forceMask === 'number' && forceMask >= 0 && forceMask <= 7) {
      applyMask(forceMask);
      placeFormat(formatBits(ecl, forceMask));
      return { version: version, ecl: ecl, size: size, mask: forceMask, modules: m };
    }

    var bestMask = 0;
    var bestScore = Infinity;
    for (var mk = 0; mk < 8; mk++) {
      applyMask(mk);
      placeFormat(formatBits(ecl, mk));
      var score = penalty(m, size);
      if (score < bestScore) {
        bestScore = score;
        bestMask = mk;
      }
      applyMask(mk); // XOR again to undo
    }
    applyMask(bestMask);
    placeFormat(formatBits(ecl, bestMask));

    return { version: version, ecl: ecl, size: size, mask: bestMask, modules: m };
  }

  /** The four penalty rules from the spec; lowest total wins. */
  function penalty(m, size) {
    var score = 0;
    var r, c, i;

    // Rule 1: runs of five or more same-coloured modules.
    for (r = 0; r < size; r++) {
      var run = 1;
      for (c = 1; c < size; c++) {
        if (m[r][c] === m[r][c - 1]) {
          run++;
        } else {
          if (run >= 5) score += 3 + (run - 5);
          run = 1;
        }
      }
      if (run >= 5) score += 3 + (run - 5);
    }
    for (c = 0; c < size; c++) {
      var runC = 1;
      for (r = 1; r < size; r++) {
        if (m[r][c] === m[r - 1][c]) {
          runC++;
        } else {
          if (runC >= 5) score += 3 + (runC - 5);
          runC = 1;
        }
      }
      if (runC >= 5) score += 3 + (runC - 5);
    }

    // Rule 2: 2x2 blocks of one colour.
    for (r = 0; r < size - 1; r++) {
      for (c = 0; c < size - 1; c++) {
        var v = m[r][c];
        if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
      }
    }

    // Rule 3: the 1:1:3:1:1 finder-like pattern, with a quiet area on one side.
    var patA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var patB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    var limit = size - 11;
    for (r = 0; r < size; r++) {
      for (c = 0; c <= limit; c++) {
        var a = true;
        var b = true;
        for (i = 0; i < 11; i++) {
          if (m[r][c + i] !== patA[i]) a = false;
          if (m[r][c + i] !== patB[i]) b = false;
        }
        if (a) score += 40;
        if (b) score += 40;
      }
    }
    for (c = 0; c < size; c++) {
      for (r = 0; r <= limit; r++) {
        var a2 = true;
        var b2 = true;
        for (i = 0; i < 11; i++) {
          if (m[r + i][c] !== patA[i]) a2 = false;
          if (m[r + i][c] !== patB[i]) b2 = false;
        }
        if (a2) score += 40;
        if (b2) score += 40;
      }
    }

    // Rule 4: deviation from an even split of dark and light modules.
    var dark = 0;
    for (r = 0; r < size; r++) {
      for (c = 0; c < size; c++) if (m[r][c]) dark++;
    }
    var percent = (dark * 100) / (size * size);
    score += Math.floor(Math.abs(percent - 50) / 5) * 10;

    return score;
  }

  /* ------------------------------------------------------------------ text */

  function utf8(str) {
    if (typeof TextEncoder !== 'undefined') {
      var enc = new TextEncoder();
      var arr = enc.encode(str);
      return Array.prototype.slice.call(arr);
    }
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      if (code < 0x80) {
        out.push(code);
      } else if (code < 0x800) {
        out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
      } else if (code >= 0xd800 && code <= 0xdbff && i + 1 < str.length) {
        var next = str.charCodeAt(i + 1);
        var cp = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        out.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f)
        );
        i++;
      } else {
        out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
      }
    }
    return out;
  }

  /**
   * Encode text. `ecl` is 0=L 1=M 2=Q 3=H.
   * `forceMask` (0-7) skips the penalty search; used by the test harness to
   * compare against a reference matrix built with a specific mask.
   * Returns { version, ecl, size, mask, modules } or { error }.
   */
  function encode(text, ecl, forceMask) {
    if (typeof ecl !== 'number' || ecl < 0 || ecl > 3) ecl = 1;
    var bytes = utf8(String(text == null ? '' : text));
    if (!bytes.length) return { error: 'Enter some text or a URL first.' };

    var version = chooseVersion(bytes.length, ecl);
    if (version < 0) {
      return {
        error:
          'That is too much text for a QR code — the limit is 2953 bytes at level L. It is ' +
          bytes.length +
          ' bytes.'
      };
    }

    var codewords = buildCodewords(bytes, version, ecl);
    var matrix = buildMatrix(version, ecl, codewords, forceMask);
    matrix.bytes = bytes.length;
    matrix.level = EC_NAMES[ecl];
    return matrix;
  }

  globalThis.QR = {
    encode: encode,
    chooseVersion: chooseVersion,
    dataCapacity: dataCapacity,
    LEVELS: { L: 0, M: 1, Q: 2, H: 3 }
  };
})();
