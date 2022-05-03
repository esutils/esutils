import { assertEquals } from 'https://deno.land/std@0.70.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

it('encodeUnsubscribePacket', function encodeUnsubscribePacket() {
  assertEquals(
    encode(
      {
        cmd: 'unsubscribe',
        id: 1,
        topicFilters: ['a/b', 'c/d'],
      },
      new TextEncoder()
    ),
    [
      // fixedHeader
      0xa2, // packetType + flags
      12, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
      // payload
      0, // topic filter length MSB
      3, // topic filter length LSB
      97, // 'a'
      47, // '/'
      98, // 'b'
      0, // topic filter length MSB
      3, // topic filter length LSB
      99, // 'c'
      47, // '/'
      100, // 'd'
    ]
  );
});

it('decodeUnsubscribePacket', function decodeUnsubscribePacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xa2, // packetType + flags
        12, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
        // payload
        0, // topic filter length MSB
        3, // topic filter length LSB
        97, // 'a'
        47, // '/'
        98, // 'b'
        0, // topic filter length MSB
        3, // topic filter length LSB
        99, // 'c'
        47, // '/'
        100, // 'd'
      ]),
      new TextDecoder()
    ),
    {
      cmd: 'unsubscribe',
      id: 1,
      topicFilters: ['a/b', 'c/d'],
      length: 14,
    }
  );
});
