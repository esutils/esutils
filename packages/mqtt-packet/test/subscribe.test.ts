import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

it('encodeISubscribePacket', () => {
  assertEquals(
    encode(
      {
        cmd: 'subscribe',
        messageId: 1,
        subscriptions: [
          { topic: 'a/b', qos: 0 },
          { topic: 'c/d', qos: 1 },
        ],
      },
      new TextEncoder(),
    ),
    Uint8Array.from([
      // fixedHeader
      0x82, // packetType + flags
      14, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0, // topic filter length MSB
      3, // topic filter length LSB
      97, // 'a'
      47, // '/'
      98, // 'b'
      0, // qos
      0, // topic filter length MSB
      3, // topic filter length LSB
      99, // 'c'
      47, // '/'
      100, // 'd'
      1, // qos
    ]),
  );
});

it('decodeISubscribePacket', () => {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0x82, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
        // payload
        0, // topic filter length MSB
        3, // topic filter length LSB
        97, // 'a'
        47, // '/'
        98, // 'b'
        0, // qos
        0, // topic filter length MSB
        3, // topic filter length LSB
        99, // 'c'
        47, // '/'
        100, // 'd'
        1, // qos
      ]),
      new TextDecoder(),
    ),
    {
      cmd: 'subscribe',
      messageId: 1,
      subscriptions: [
        { topic: 'a/b', qos: 0 },
        { topic: 'c/d', qos: 1 },
      ],
      length: 16,
    },
  );
});
