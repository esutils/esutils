import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodePingreqPacket', () => {
  assertEquals(
    encode({
      cmd: 'pingreq',
    }),
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
    ),
    {
      cmd: 'pingreq',
      length: 2,
    },
  );
});

it('decodeShortPingrecPackets', () => {
  assertEquals(decode(Uint8Array.from([0xc0]), utf8Decoder), undefined);
});
