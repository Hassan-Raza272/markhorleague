/**
 * Hermes lacks TextEncoder/TextDecoder (and often latin1).
 * jsPDF's PNG decoder requires `new TextDecoder('latin1')` at import time.
 */
(function polyfillTextEncoding() {
  const g =
    typeof globalThis !== 'undefined'
      ? globalThis
      : typeof global !== 'undefined'
        ? global
        : typeof window !== 'undefined'
          ? window
          : this;

  function needsPolyfill() {
    if (typeof g.TextDecoder !== 'function' || typeof g.TextEncoder !== 'function') {
      return true;
    }
    try {
      // eslint-disable-next-line no-new
      new g.TextDecoder('latin1');
      return false;
    } catch {
      return true;
    }
  }

  if (!needsPolyfill()) {
    return;
  }

  function normalizeLabel(label) {
    return String(label || 'utf-8')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function isLatin1(label) {
    const n = normalizeLabel(label);
    return (
      n === 'latin1' ||
      n === 'iso88591' ||
      n === 'iso8859' ||
      n === 'ascii' ||
      n === 'usascii' ||
      n === 'binary'
    );
  }

  function decodeUtf8(bytes) {
    let out = '';
    let i = 0;
    while (i < bytes.length) {
      const c = bytes[i++];
      if (c < 0x80) {
        out += String.fromCharCode(c);
      } else if (c < 0xe0) {
        const c2 = bytes[i++];
        out += String.fromCharCode(((c & 0x1f) << 6) | (c2 & 0x3f));
      } else if (c < 0xf0) {
        const c2 = bytes[i++];
        const c3 = bytes[i++];
        out += String.fromCharCode(
          ((c & 0x0f) << 12) | ((c2 & 0x3f) << 6) | (c3 & 0x3f),
        );
      } else {
        const c2 = bytes[i++];
        const c3 = bytes[i++];
        const c4 = bytes[i++];
        let cp =
          ((c & 0x07) << 18) |
          ((c2 & 0x3f) << 12) |
          ((c3 & 0x3f) << 6) |
          (c4 & 0x3f);
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      }
    }
    return out;
  }

  function encodeUtf8(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
      let cp = str.charCodeAt(i);
      if (cp >= 0xd800 && cp <= 0xdbff && i + 1 < str.length) {
        const low = str.charCodeAt(i + 1);
        if (low >= 0xdc00 && low <= 0xdfff) {
          cp = 0x10000 + ((cp - 0xd800) << 10) + (low - 0xdc00);
          i++;
        }
      }
      if (cp < 0x80) {
        bytes.push(cp);
      } else if (cp < 0x800) {
        bytes.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      } else if (cp < 0x10000) {
        bytes.push(
          0xe0 | (cp >> 12),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
      } else {
        bytes.push(
          0xf0 | (cp >> 18),
          0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f),
          0x80 | (cp & 0x3f),
        );
      }
    }
    return new Uint8Array(bytes);
  }

  function toUint8Array(input) {
    if (input == null) {
      return new Uint8Array(0);
    }
    if (input instanceof Uint8Array) {
      return input;
    }
    if (input instanceof ArrayBuffer) {
      return new Uint8Array(input);
    }
    if (ArrayBuffer.isView && ArrayBuffer.isView(input)) {
      return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    }
    return new Uint8Array(input);
  }

  function TextDecoder(label) {
    this.encoding = label || 'utf-8';
    this._latin1 = isLatin1(label);
  }

  TextDecoder.prototype.decode = function decode(input) {
    const bytes = toUint8Array(input);
    if (this._latin1) {
      let s = '';
      for (let i = 0; i < bytes.length; i++) {
        s += String.fromCharCode(bytes[i]);
      }
      return s;
    }
    return decodeUtf8(bytes);
  };

  function TextEncoder() {
    this.encoding = 'utf-8';
  }

  TextEncoder.prototype.encode = function encode(str) {
    return encodeUtf8(String(str == null ? '' : str));
  };

  g.TextDecoder = TextDecoder;
  g.TextEncoder = TextEncoder;
})();
