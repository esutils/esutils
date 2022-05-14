/* eslint-disable no-bitwise */
/**
 * [Writer description]
 */
export class BufferWriter {
  buffer: number[];

  constructor() {
    this.buffer = [];
  }

  /**
   * [write description]
   * @param  {[type]} d    [description]
   * @param  {[type]} size [description]
   * @return {[type]}      [description]
   */
  write(d: number, size: number) {
    for (let i = 0; i < size; i += 1) {
      this.buffer.push(d & (2 ** (size - i - 1)) ? 1 : 0);
    }
  }

  /**
   * [writeBuffer description]
   * @param {[type]} b [description]
   */
  writeBuffer(b: Uint8Array) {
    for (let i = 0; i < b.length; i += 1) {
      this.buffer.push(b[i]);
    }
  }

  /**
   * [toBuffer description]
   * @return {[type]} [description]
   */
  toBuffer() {
    const arr: number[] = [];
    for (let i = 0; i < this.buffer.length; i += 8) {
      const chunk = this.buffer.slice(i, i + 8);
      arr.push(parseInt(chunk.join(''), 2));
    }
    return new Uint8Array(arr);
  }
}
