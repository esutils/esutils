import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodeDisconnectPacket', () => {
  assertEquals(
    encode({
      cmd: 'disconnect',
    }),
    Uint8Array.from([
      // fixedHeader
      224, // packetType + flags
      0, // remainingLength
    ]),
  );
});

it('decodeDisconnectPacket', () => {
  assertEquals(
    decode(Uint8Array.from([
      // fixedHeader
      224, // packetType + flags
      0, // remainingLength
    ]), utf8Decoder),
    {
      cmd: 'disconnect',
      length: 2,
    },
  );
});
