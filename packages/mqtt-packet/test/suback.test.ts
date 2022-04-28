import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

it('encodeISubackPacket', () => {
  assertEquals(
    encode({
      cmd: 'suback',
      messageId: 1,
      granted: [0, 1],
    }, utf8Encoder, { protocolVersion: 4 }),
    Uint8Array.from([
      // fixedHeader
      0x90, // packetType + flags
      4, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0,
      1,
    ]),
  );
});

it('decodeISubackPacket', () => {
  assertEquals(
    decode(Uint8Array.from([
      // fixedHeader
      0x90, // packetType + flags
      4, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0,
      1,
    ]), utf8Decoder, { protocolVersion: 4 }),
    {
      cmd: 'suback',
      messageId: 1,
      granted: [0, 1],
      length: 4,
    },
  );
});
