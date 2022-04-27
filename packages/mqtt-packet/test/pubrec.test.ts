import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodeIPubrecPacket', () => {
  assertEquals(
    encode({
      cmd: 'pubrec',
      messageId: 1337,
    }),
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
    ]), utf8Decoder),
    {
      cmd: 'pubrec',
      messageId: 1337,
      length: 4,
    },
  );
});

it('decodeShortIPubrecPackets', () => {
  assertEquals(decode(Uint8Array.from([0x50]), utf8Decoder), undefined);
  assertEquals(decode(Uint8Array.from([0x50, 2]), utf8Decoder), undefined);
  assertEquals(decode(Uint8Array.from([0x50, 2, 5]), utf8Decoder), undefined);
});
