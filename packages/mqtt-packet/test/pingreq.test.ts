import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodePingreqPacket', () => {
  assertEquals(
    encode({
      cmd: 'pingreq',
    }, utf8Encoder, { protocolVersion: 4 }),
    Uint8Array.from([
      // fixedHeader
      0xc0, // packetType + flags
      0, // remainingLength
    ]),
  );
});

it('decodePingreqPacket', () => {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xc0, // packetType + flags
        0, // remainingLength
      ]),
      utf8Decoder,
      { protocolVersion: 4 },
    ),
    {
      cmd: 'pingreq',
      length: 0,
    },
  );
});

it('decodeShortPingrecPackets', () => {
  assertEquals(decode(Uint8Array.from([0xc0]), utf8Decoder, { protocolVersion: 4 }), undefined);
});
