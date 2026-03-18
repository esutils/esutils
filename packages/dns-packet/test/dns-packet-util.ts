import assert from 'assert';
import { Packet } from '@esutils/dns-packet';

export function checkResourcePacketEncodeDecode(
  enableCheckCompressNameHex: boolean,
  hexBuf: string,
  expected: ReturnType<typeof Packet.decode>,
) {
  const buf = Buffer.from(hexBuf, 'hex');
  const errors = [] as string[];
  const decoded = Packet.decode(buf, errors);
  assert.deepEqual(decoded, expected);
  assert.deepEqual(errors, []);
  const encoded = Packet.encode(decoded, errors);
  assert.deepEqual(errors, []);
  const decodedAgain = Packet.decode(encoded, errors);
  assert.deepEqual(errors, []);

  assert.deepEqual(decodedAgain, expected);

  if (enableCheckCompressNameHex) {
    assert.deepEqual(hexBuf, Buffer.from(encoded).toString('hex'));
  }
}
