import { assertEquals } from 'https://deno.land/std@0.70.0/testing/asserts.ts';
import { encode, decode } from './mod.ts';

it('encodeUnsubackPacket', function encodeUnsubackPacket() {
  assertEquals(
    encode({
      cmd: 'unsuback',
      id: 1,
    }),
    [
      // fixedHeader
      0xb0, // packetType + flags
      2, // remainingLength
      // variableHeader
      0, // id MSB
      1, // id LSB
    ]
  );
});

it('decodeUnsubackPacket', function decodeUnsubackPacket() {
  assertEquals(
    decode(
      Uint8Array.from([
        // fixedHeader
        0xb0, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // id MSB
        1, // id LSB
      ])
    ),
    {
      cmd: 'unsuback',
      id: 1,
      length: 4,
    }
  );
});
