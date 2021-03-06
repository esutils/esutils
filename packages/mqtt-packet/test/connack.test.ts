import { deepEqual as assertEquals } from 'assert';

import {
  encode, decode,
} from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();
const utf8Encoder = new TextEncoder();

describe('connack', () => {
  it('encodeConnackPacket', () => {
    assertEquals(
      encode({
        cmd: 'connack',
        sessionPresent: false,
        returnCode: 0,
      }, utf8Encoder, { protocolVersion: 4 }),
      Uint8Array.from([
      // fixedHeader
        32, // packetType + flags
        2, // remainingLength
        // variableHeader
        0, // connack flags
        0, // return code
      ]),
    );
  });

  it('decodeConnackPacket', () => {
    assertEquals(
      decode(
        Uint8Array.from([
        // fixedHeader
          32, // packetType + flags
          2, // remainingLength
          // variableHeader
          0, // connack flags
          0, // return code
        ]),
        utf8Decoder,
        { protocolVersion: 4 },
      ),
      {
        cmd: 'connack',
        sessionPresent: false,
        returnCode: 0,
        length: 2,
      },
    );
  });

  it(
    'enodeConnackPacketWithSessionPresent',
    () => {
      assertEquals(
        encode(
          {
            cmd: 'connack',
            sessionPresent: true,
            returnCode: 0,
          },
          utf8Encoder,
          { protocolVersion: 4 },
        ),
        Uint8Array.from([
        // fixedHeader
          32, // packetType + flags
          2, // remainingLength
          // variableHeader
          1, // connack flags (sessionPresent)
          0, // return code
        ]),
      );
    },
  );

  it(
    'decodeConnackPacketWithSessionPresent',
    () => {
      assertEquals(
        decode(
          Uint8Array.from([
          // fixedHeader
            32, // packetType + flags
            2, // remainingLength
            // variableHeader
            1, // connack flags (sessionPresent)
            0, // return code
          ]),
          utf8Decoder,
          { protocolVersion: 4 },
        ),
        {
          cmd: 'connack',
          sessionPresent: true,
          returnCode: 0,
          length: 2,
        },
      );
    },
  );

  it(
    'decodeConnackPacketWithReturnCode',
    () => {
      assertEquals(
        decode(
          Uint8Array.from([
          // fixedHeader
            32, // packetType + flags
            2, // remainingLength
            // variableHeader
            0, // connack flags
            4, // return code (bad username or password)
          ]),
          utf8Decoder,
          { protocolVersion: 4 },
        ),
        {
          cmd: 'connack',
          sessionPresent: false,
          returnCode: 4,
          length: 2,
        },
      );
    },
  );

  it('decodeShortConnackPackets', () => {
    assertEquals(decode(Uint8Array.from([32]), utf8Decoder, { protocolVersion: 4 }), undefined);
    assertEquals(decode(Uint8Array.from([32, 2]), utf8Decoder, { protocolVersion: 4 }), undefined);
    assertEquals(decode(
      Uint8Array.from([32, 2, 0]),
      utf8Decoder,
      { protocolVersion: 4 },
    ), undefined);
  });
});
