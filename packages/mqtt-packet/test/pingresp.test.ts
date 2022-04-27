import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodePingrespPacket', () => {
  assertEquals(
    encode({
      cmd: 'pingresp',
    }),
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
    ),
    {
      cmd: 'pingresp',
      length: 2,
    },
  );
});

it('decodeShortPingrespPackets', () => {
  assertEquals(decode(Uint8Array.from([0xd0]), utf8Decoder), undefined);
});
