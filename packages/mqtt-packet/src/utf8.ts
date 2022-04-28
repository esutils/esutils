// Deno and browsers have global TextEncoder and TextDecoder classes, but
// Node.js does not so we have to use an abstraction for working with UTF8.

import { decodeUint8Array, encodeUint8Array } from './basic';

export interface UTF8Encoder {
  encode: (str: string) => Uint8Array;
}

export interface UTF8Decoder {
  decode: (bytes: Uint8Array) => string;
}

export interface UTF8DecodeResult {
  length: number,
  value: string
}

export function encodeUTF8String(str: string, encoder: UTF8Encoder) {
  const bytes = encoder.encode(str);

  return encodeUint8Array(bytes);
}

export function decodeUTF8String(
  buffer: Uint8Array,
  startIndex: number,
  utf8Decoder: UTF8Decoder,
): UTF8DecodeResult | undefined {
  const bytes = decodeUint8Array(buffer, startIndex);
  if (bytes === undefined) {
    return undefined;
  }
  const value = utf8Decoder.decode(bytes);

  return {
    length: bytes.length + 2,
    value,
  };
}
