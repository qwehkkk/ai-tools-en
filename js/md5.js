/* Minimal MD5 (RFC 1321) — used only for non-security convenience checksums.
   Exposes md5Hex(string) on the global object so it can be unit-tested in Node. */
(function (root) {
  'use strict';

  var S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
  ];

  var K = (function () {
    var t = [];
    for (var i = 0; i < 64; i++) {
      t[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    }
    return t;
  })();

  function rotl(x, c) {
    return (x << c) | (x >>> (32 - c));
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    var out = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        out.push(c);
      } else if (c < 0x800) {
        out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      } else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
        var c2 = str.charCodeAt(i + 1);
        var cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
        out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63));
        i++;
      } else {
        out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      }
    }
    return new Uint8Array(out);
  }

  function md5Bytes(bytes) {
    var len = bytes.length;
    var bitLenLo = (len << 3) >>> 0;
    var bitLenHi = Math.floor(len / 536870912) >>> 0;

    var padLen = (56 - ((len + 1) % 64) + 64) % 64;
    var total = len + 1 + padLen + 8;

    var buf = new Uint8Array(total);
    buf.set(bytes, 0);
    buf[len] = 0x80;

    var p = total - 8;
    buf[p] = bitLenLo & 0xff;
    buf[p + 1] = (bitLenLo >>> 8) & 0xff;
    buf[p + 2] = (bitLenLo >>> 16) & 0xff;
    buf[p + 3] = (bitLenLo >>> 24) & 0xff;
    buf[p + 4] = bitLenHi & 0xff;
    buf[p + 5] = (bitLenHi >>> 8) & 0xff;
    buf[p + 6] = (bitLenHi >>> 16) & 0xff;
    buf[p + 7] = (bitLenHi >>> 24) & 0xff;

    var a0 = 0x67452301;
    var b0 = 0xefcdab89;
    var c0 = 0x98badcfe;
    var d0 = 0x10325476;

    var M = new Array(16);

    for (var off = 0; off < total; off += 64) {
      for (var j = 0; j < 16; j++) {
        var k = off + j * 4;
        M[j] = buf[k] | (buf[k + 1] << 8) | (buf[k + 2] << 16) | (buf[k + 3] << 24);
      }

      var A = a0, B = b0, C = c0, D = d0;

      for (var i = 0; i < 64; i++) {
        var F, g;
        if (i < 16) {
          F = (B & C) | (~B & D);
          g = i;
        } else if (i < 32) {
          F = (D & B) | (~D & C);
          g = (5 * i + 1) & 15;
        } else if (i < 48) {
          F = B ^ C ^ D;
          g = (3 * i + 5) & 15;
        } else {
          F = C ^ (B | ~D);
          g = (7 * i) & 15;
        }
        F = (F + A + K[i] + M[g]) | 0;
        A = D;
        D = C;
        C = B;
        B = (B + rotl(F, S[i])) | 0;
      }

      a0 = (a0 + A) | 0;
      b0 = (b0 + B) | 0;
      c0 = (c0 + C) | 0;
      d0 = (d0 + D) | 0;
    }

    function wordToHex(w) {
      var s = '';
      for (var n = 0; n < 4; n++) {
        var byte = (w >>> (n * 8)) & 0xff;
        s += (byte < 16 ? '0' : '') + byte.toString(16);
      }
      return s;
    }

    return wordToHex(a0) + wordToHex(b0) + wordToHex(c0) + wordToHex(d0);
  }

  function md5Hex(str) {
    return md5Bytes(utf8Bytes(String(str)));
  }

  root.md5Hex = md5Hex;
  root.md5Bytes = md5Bytes;
})(typeof globalThis !== 'undefined' ? globalThis : this);
