import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodeIPubackPacket', () => {
  assertEquals(
    encode({
      cmd: 'puback',
      messageId: 1337,
    }, utf8Encoder, { protocolVersion: 4 }),
    Uint8Array.from([
      // fixedHeader
      0x40, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]),
  );
});

it('decodeIPubackPacket', () => {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x40, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      utf8Decoder,
      { protocolVersion: 4 },
    ),
    {
      cmd: 'puback',
      messageId: 1337,
      length: 2,
    },
  );
});

it('decodeShortIPubackPackets', () => {
  assertEquals(decode(Uint8Array.from([0x40]), utf8Decoder, { protocolVersion: 4 }), undefined);
  assertEquals(decode(Uint8Array.from([0x40, 2]), utf8Decoder, { protocolVersion: 4 }), undefined);
  assertEquals(decode(
    Uint8Array.from([0x40, 2, 5]),
    utf8Decoder,

    { protocolVersion: 4 },
  ), undefined);
});
