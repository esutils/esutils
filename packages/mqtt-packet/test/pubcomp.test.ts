import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodeIPubcompPacket', () => {
  assertEquals(
    encode({
      cmd: 'pubcomp',
      messageId: 1337,
    }),
    Uint8Array.from([
      // fixedHeader
      0x70, // packetType + flags
      2, // remainingLength
      // variableHeader
      5, // id MSB
      57, // id LSB
    ]),
  );
});

it('decodeIPubcompPacket', () => {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x70, // packetType + flags
        2, // remainingLength
        // variableHeader
        5, // id MSB
        57, // id LSB
      ]),
      utf8Decoder,
    ),
    {
      cmd: 'pubcomp',
      messageId: 1337,
      length: 4,
    },
  );
});

it('decodeShortIPubcompPackets', () => {
  assertEquals(decode(Uint8Array.from([0x70]), utf8Decoder), undefined);
  assertEquals(decode(Uint8Array.from([0x70, 2]), utf8Decoder), undefined);
  assertEquals(decode(Uint8Array.from([0x70, 2, 5]), utf8Decoder), undefined);
});
