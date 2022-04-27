import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

it('encodeIPublishPacket', () => {
  assertEquals(
    encode(
      {
        cmd: 'publish',
        messageId: 0,
        topic: 'a/b',
        payload: 'payload',
      },
      new TextEncoder(),
    ),
    Uint8Array.from([
      // fixedHeader
      48, // packetType + flags
      12, // remainingLength
      // variableHeader
      0, // topicLength MSB
      3, // topicLength LSB
      97, // 'a'
      47, // '/'
      98, // 'b'
      // payload
      112, // 'p'
      97, // 'a'
      121, // 'y'
      108, // 'l'
      111, // 'o'
      97, // 'a'
      100, // 'd'
    ]),
  );
});

it('decodeIPublishPacket', () => {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        48, // packetType + flags
        12, // remainingLength
        // variableHeader
        0, // topicLength MSB
        3, // topicLength LSB
        97, // 'a'
        47, // '/'
        98, // 'b'
        // payload
        112, // 'p'
        97, // 'a'
        121, // 'y'
        108, // 'l'
        111, // 'o'
        97, // 'a'
        100, // 'd'
      ]),
      utf8Decoder,
    ),
    {
      cmd: 'publish',
      dup: false,
      qos: 0,
      retain: false,
      messageId: 0,
      topic: 'a/b',
      payload: Uint8Array.from([
        112, // 'p'
        97, // 'a'
        121, // 'y'
        108, // 'l'
        111, // 'o'
        97, // 'a'
        100, // 'd'
      ]),
      length: 14,
    },
  );
});

it(
  'decodeIPublishPacketWithExtraBytes',
  () => {
    assertEquals(
      decode(
        Uint8Array.from([
          // fixedHeader
          48, // packetType + flags
          12, // remainingLength
          // variableHeader
          0, // topicLength MSB
          3, // topicLength LSB
          97, // 'a'
          47, // '/'
          98, // 'b'
          // payload
          112, // 'p'
          97, // 'a'
          121, // 'y'
          108, // 'l'
          111, // 'o'
          97, // 'a'
          100, // 'd'
          101, // 'e'
          116, // 't'
          99, // 'c'
        ]),
        utf8Decoder,
      ),
      {
        cmd: 'publish',
        dup: false,
        qos: 0,
        retain: false,
        messageId: 0,
        topic: 'a/b',
        payload: Uint8Array.from([
          112, // 'p'
          97, // 'a'
          121, // 'y'
          108, // 'l'
          111, // 'o'
          97, // 'a'
          100, // 'd'
        ]),
        length: 14,
      },
    );
  },
);
