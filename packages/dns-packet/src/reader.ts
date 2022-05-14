/* eslint-disable no-bitwise */

function p(a: number[]) {
  let n = 0;
  const f = a.length - 1;
  for (let i = f; i >= 0; i -= 1) {
    if (a[f - i]) n += 2 ** i;
  }
  return n;
}

/**
 * [Reader description]
 * @param {[type]} buffer [description]
 * @param {[type]} offset [description]
 */
export class BufferReader {
  buffer: Uint8Array;

  public offset: number;

  constructor(buffer: Uint8Array, offset?: number) {
    this.buffer = buffer;
    this.offset = offset || 0;
  }

  /**
   * [read description]
   * @param  {[type]} buffer [description]
   * @param  {[type]} offset [description]
   * @param  {[type]} length [description]
   * @return {[type]}        [description]
   */
  static read(buffer: Uint8Array, offset: number, length: number) {
    let a: number[] = [];
    let c = Math.ceil(length / 8);
    let l = Math.floor(offset / 8);
    const m = offset % 8;
    function t(n: number) {
      const r = [0, 0, 0, 0, 0, 0, 0, 0];
      for (let i = 7; i >= 0; i -= 1) {
        r[7 - i] = n & 2 ** i ? 1 : 0;
      }
      a = a.concat(r);
    }
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    while (c--) t(view.getUint8(l++));
    return p(a.slice(m, m + length));
  }

  /**
   * [read description]
   * @param  {[type]} size [description]
   * @return {[type]}      [description]
   */
  read(size: number) {
    const val = BufferReader.read(this.buffer, this.offset, size);
    this.offset += size;
    return val;
  }
}
