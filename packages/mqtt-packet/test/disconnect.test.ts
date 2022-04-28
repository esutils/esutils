import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodeDisconnectPacket', () => {
  assertEquals(
    encode({
      cmd: 'disconnect',
    }, utf8Encoder, { protocolVersion: 4 }),
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
    ]), utf8Decoder, { protocolVersion: 4 }),
    {
      cmd: 'disconnect',
      length: 0,
    },
  );
});
