import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodePingrespPacket', () => {
  assertEquals(
    encode({
      cmd: 'pingresp',
    }, utf8Encoder, { protocolVersion: 4 }),
    Uint8Array.from([
      // fixedHeader
      0xd0, // packetType + flags
      0, // remainingLength
    ]),
  );
});

it('decodePingrespPacket', () => {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xd0, // packetType + flags
        0, // remainingLength
      ]),
      utf8Decoder,
      { protocolVersion: 4 },
    ),
    {
      cmd: 'pingresp',
      length: 0,
    },
  );
});

it('decodeShortPingrespPackets', () => {
  assertEquals(decode(Uint8Array.from([0xd0]), utf8Decoder, { protocolVersion: 4 }), undefined);
});
