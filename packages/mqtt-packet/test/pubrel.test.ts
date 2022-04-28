import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodeIPubrelPacket', () => {
  assertEquals(
    encode({
      cmd: 'pubrel',
      messageId: 1337,
    }, utf8Encoder, { protocolVersion: 4 }),
    Uint8Array.from([
      // fixedHeader
      0x62, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]),
  );
});

it('decodeIPubrelPacket', () => {
  assertEquals(
    decode(Uint8Array.from([
      // fixedHeader
      0x62, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]), utf8Decoder, { protocolVersion: 4 }),
    {
      cmd: 'pubrel',
      messageId: 1337,
      length: 2,
    },
  );
});

it('decodeShortIPubrelPackets', () => {
  assertEquals(decode(Uint8Array.from([0x62]), utf8Decoder, { protocolVersion: 4 }), undefined);
  assertEquals(decode(Uint8Array.from([0x62, 2]), utf8Decoder, { protocolVersion: 4 }), undefined);
  assertEquals(decode(
    Uint8Array.from([0x62, 2, 5]),
    utf8Decoder,

    { protocolVersion: 4 },
  ), undefined);
});
