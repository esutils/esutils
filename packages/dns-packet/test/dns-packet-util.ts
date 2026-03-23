import assert from 'assert';
import { Packet } from '@esutils/dns-packet';

export function checkResourcePacketDecodeInvalid(
  hexBuf: string,
  expectedErrors: string[],
) {
  const buf = Buffer.from(hexBuf, 'hex');
  const errors = [] as string[];
  const textDecoder = new TextDecoder();
  Packet.decode(buf, textDecoder, errors);
  assert.deepStrictEqual(errors, expectedErrors);
}

export function checkResourcePacketEncodeDecode(
  enableCheckCompressNameHex: boolean,
  hexBuf: string,
  expected: ReturnType<typeof Packet.decode>,
  expectedErrors: string[] = [],
) {
  const buf = Buffer.from(hexBuf, 'hex');
  const errors = [] as string[];
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  const decoded = Packet.decode(buf, textDecoder, errors);
  assert.deepStrictEqual(decoded, expected);
  assert.deepStrictEqual(errors, expectedErrors);
  if (expectedErrors.length > 0) {
    return;
  }
  const encoded = Packet.encode(decoded, textEncoder, errors);
  assert.deepEqual(errors, []);
  const decodedAgain = Packet.decode(encoded, textDecoder, errors);
  assert.deepEqual(errors, []);

  assert.deepEqual(decodedAgain, expected);

  if (enableCheckCompressNameHex) {
    assert.deepEqual(hexBuf, Buffer.from(encoded).toString('hex'));
  }
}
