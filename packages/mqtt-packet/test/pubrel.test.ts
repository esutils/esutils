import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodeIPubrelPacket', () => {
  assertEquals(
    encode({
      cmd: 'pubrel',
      messageId: 1337,
    }),
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
    ]), utf8Decoder),
    {
      cmd: 'pubrel',
      messageId: 1337,
      length: 4,
    },
  );
});

it('decodeShortIPubrelPackets', () => {
  assertEquals(decode(Uint8Array.from([0x62]), utf8Decoder), undefined);
  assertEquals(decode(Uint8Array.from([0x62, 2]), utf8Decoder), undefined);
  assertEquals(decode(Uint8Array.from([0x62, 2, 5]), utf8Decoder), undefined);
});
