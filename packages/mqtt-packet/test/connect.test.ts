import { deepEqual as assertEquals } from 'assert';

import { encode, decode } from '@esutils/mqtt-packet';

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

it(
  'encodeConnectPacketWithClientId',
  () => {
    assertEquals(
      encode(
        {
          cmd: 'connect',
          clientId: 'id',
        },
        utf8Encoder,
        { protocolVersion: 4 },
      ),
      Uint8Array.from([
        // fixedHeader
        16, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolVersion
        2, // connectFlags (cleanSession)
        0, // keepalive MSB
        0, // keepalive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
      ]),
    );
  },
);

it(
  'encodeConnectPacketWithCleanFalse',
  () => {
    assertEquals(
      encode(
        {
          cmd: 'connect',
          clientId: 'id',
          clean: false,
        },
        utf8Encoder,
        { protocolVersion: 4 },
      ),
      Uint8Array.from([
        // fixedHeader
        16, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolVersion
        0, // connectFlags
        0, // keepalive MSB
        0, // keepalive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
      ]),
    );
  },
);

it(
  'encodeConnectPacketWithKeepAlive',
  () => {
    assertEquals(
      encode(
        {
          cmd: 'connect',
          clientId: 'id',
          keepalive: 300,
        },
        utf8Encoder,
        { protocolVersion: 4 },
      ),
      Uint8Array.from([
        // fixedHeader
        16, // packetType + flags
        14, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolVersion
        2, // connectFlags (cleanSession)
        1, // keepalive MSB
        44, // keepalive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
      ]),
    );
  },
);

it(
  'encodeConnectPacketWithUsernameAndPassword',
  () => {
    assertEquals(
      encode(
        {
          cmd: 'connect',
          clientId: 'id',
          username: 'user',
          password: utf8Encoder.encode('pass'),
        },
        utf8Encoder,
        { protocolVersion: 4 },
      ),
      Uint8Array.from([
        // fixedHeader
        16, // packetType + flags
        26, // remainingLength
        // variableHeader
        0, // protocolNameLength MSB
        4, // protocolNameLength LSB
        77, // 'M'
        81, // 'Q'
        84, // 'T'
        84, // 'T'
        4, // protocolVersion
        194, // connectFlags (usernameFlag, passwordFlag, cleanSession)
        0, // keepalive MSB
        0, // keepalive LSB
        // payload
        // clientId
        0, // length MSB
        2, // length LSB
        105, // 'i'
        100, // 'd'
        // username
        0, // length MSB
        4, // length LSB
        117, // 'u'
        115, // 's'
        101, // 'e'
        114, // 'r'
        // password
        0, // length MSB
        4, // length LSB
        112, // 'p'
        97, // 'a'
        115, // 's'
        115, // 's'
      ]),
    );
  },
);

it(
  'decodeConnectPacketWithUsernameAndPassword',
  () => {
    assertEquals(
      decode(
        Uint8Array.from([
          // fixedHeader
          16, // packetType + flags
          26, // remainingLength
          // variableHeader
          0, // protocolNameLength MSB
          4, // protocolNameLength LSB
          77, // 'M'
          81, // 'Q'
          84, // 'T'
          84, // 'T'
          4, // protocolVersion
          194, // connectFlags (usernameFlag, passwordFlag, cleanSession)
          0, // keepalive MSB
          0, // keepalive LSB
          // payload
          // clientId
          0, // length MSB
          2, // length LSB
          105, // 'i'
          100, // 'd'
          // username
          0, // length MSB
          4, // length LSB
          117, // 'u'
          115, // 's'
          101, // 'e'
          114, // 'r'
          // password
          0, // length MSB
          4, // length LSB
          112, // 'p'
          97, // 'a'
          115, // 's'
          115, // 's'
        ]),
        utf8Decoder,
        { protocolVersion: 4 },
      ),
      {
        cmd: 'connect',
        clientId: 'id',
        protocolId: 'MQTT',
        protocolVersion: 4,
        username: 'user',
        password: utf8Encoder.encode('pass'),
        will: undefined,
        clean: true,
        keepalive: 0,
        length: 26,
      },
    );
  },
);
