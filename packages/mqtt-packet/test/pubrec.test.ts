import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodeIPubrecPacket', () => {
  assertEquals(
    encode({
      cmd: 'pubrec',
      messageId: 1337,
    }, utf8Encoder, { protocolVersion: 4 }),
    Uint8Array.from([
      // fixedHeader
      0x50, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]),
  );
});

it('decodeIPubrecPacket', () => {
  assertEquals(
    decode(Uint8Array.from([
      // fixedHeader
      0x50, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]), utf8Decoder, { protocolVersion: 4 }),
    {
      cmd: 'pubrec',
      messageId: 1337,
      length: 2,
    },
  );
});

it('decodeShortIPubrecPackets', () => {
  assertEquals(decode(Uint8Array.from([0x50]), utf8Decoder, { protocolVersion: 4 }), undefined);
  assertEquals(decode(Uint8Array.from([0x50, 2]), utf8Decoder, { protocolVersion: 4 }), undefined);
  assertEquals(decode(
    Uint8Array.from([0x50, 2, 5]),
    utf8Decoder,

    { protocolVersion: 4 },
  ), undefined);
});
