import {
  PacketOptions, decode, encode, AnyPacket,
} from '@esutils/mqtt-packet';

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

describe('Invalid variable byte integer', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  let buffer = Buffer.from([0, 1, 0]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });

  buffer = Buffer.from([16, 255, 255, 255, 255]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });

  buffer = Buffer.from([16, 255, 255, 255, 128]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });

  buffer = Buffer.from([16, 255, 255, 255, 255, 1]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });

  buffer = Buffer.from([16, 255, 255, 255, 255, 127]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });

  buffer = Buffer.from([16, 255, 255, 255, 255, 128]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });

  buffer = Buffer.from([16, 255, 255, 255, 255, 255, 1]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('malformed length');
  });
});

describe('minimal connect', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 18,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: false,
    keepalive: 30,
    clientId: 'test',
  };
  const buffer = Buffer.from([
    16, 18, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    0, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('minimal connect with clientId as Buffer', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 18,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: false,
    keepalive: 30,
    clientId: 'test',
  };
  const buffer = Buffer.from([
    16, 18, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    0, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

/* not support bidge,and  protocolVersion only supoort 3 and 4 */
describe('connect MQTT bridge 132', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 18,
    protocolId: 'MQIsdp',
    protocolVersion: 4,
    clean: false,
    keepalive: 30,
    clientId: 'test',
  };
  const buffer = Buffer.from([
    16, 18, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    4, // Protocol version
    0, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('no clientId with 3.1.1', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 12,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    keepalive: 30,
    clientId: '',
  };
  const buffer = Buffer.from([
    16, 12, // Header
    0, 4, // Protocol ID length
    77, 81, 84, 84, // Protocol ID
    4, // Protocol version
    2, // Connect flags
    0, 30, // Keepalive
    0, 0, // Client ID length
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('default connect', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 16,
    protocolId: 'MQTT',
    protocolVersion: 4,
    clean: true,
    keepalive: 0,
    clientId: 'test',
  };
  const buffer = Buffer.from([
    16, 16,
    0, 4,
    77, 81, 84, 84,
    4,
    2,
    0, 0,
    0, 4,
    116, 101, 115, 116,
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Version 4 CONACK', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connack',
    length: 2,
    sessionPresent: false,
    returnCode: 1,
  };
  const buffer = Buffer.from([
    32, 2, // Fixed Header (CONNACK, Remaining Length)
    0, 1, // Variable Header
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('empty will payload', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 47,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    will: {
      retain: true,
      qos: 2,
      topic: 'topic',
      payload: Buffer.alloc(0),
    },
    clean: true,
    keepalive: 30,
    clientId: 'test',
    username: 'username',
    password: Buffer.from('password'),
  };
  const buffer = Buffer.from([
    16, 47, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
    0, 5, // Will topic length
    116, 111, 112, 105, 99, // Will topic
    0, 0, // Will payload length
    // Will payload
    0, 8, // Username length
    117, 115, 101, 114, 110, 97, 109, 101, // Username
    0, 8, // Password length
    112, 97, 115, 115, 119, 111, 114, 100, // Password
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('empty string username payload', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 20,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    keepalive: 30,
    clientId: 'test',
    username: '',
  };
  const buffer = Buffer.from([
    16, 20, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    130, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
    0, 0, // Username length
    // Empty Username payload
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('empty buffer password payload', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 30,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    keepalive: 30,
    clientId: 'test',
    username: 'username',
    password: Buffer.from(''),
  };
  const buffer = Buffer.from([
    16, 30, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    194, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
    0, 8, // Username length
    117, 115, 101, 114, 110, 97, 109, 101, // Username payload
    0, 0, // Password length
    // Empty password payload
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('empty string username and password payload', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 22,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    clean: true,
    keepalive: 30,
    clientId: 'test',
    username: '',
    password: Buffer.from(''),
  };
  const buffer = Buffer.from([
    16, 22, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    194, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
    0, 0, // Username length
    // Empty Username payload
    0, 0, // Password length
    // Empty password payload
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('maximal connect', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 54,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    will: {
      retain: true,
      qos: 2,
      topic: 'topic',
      payload: Buffer.from('payload'),
    },
    clean: true,
    keepalive: 30,
    clientId: 'test',
    username: 'username',
    password: Buffer.from('password'),
  };
  const buffer = Buffer.from([
    16, 54, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
    0, 5, // Will topic length
    116, 111, 112, 105, 99, // Will topic
    0, 7, // Will payload length
    112, 97, 121, 108, 111, 97, 100, // Will payload
    0, 8, // Username length
    117, 115, 101, 114, 110, 97, 109, 101, // Username
    0, 8, // Password length
    112, 97, 115, 115, 119, 111, 114, 100, // Password
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('max connect with special chars', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connect',
    length: 57,
    protocolId: 'MQIsdp',
    protocolVersion: 3,
    will: {
      retain: true,
      qos: 2,
      topic: 'tòpic',
      payload: Buffer.from('pay£oad'),
    },
    clean: true,
    keepalive: 30,
    clientId: 'te$t',
    username: 'u$ern4me',
    password: Buffer.from('p4$$w0£d'),
  };
  const buffer = Buffer.from([
    16, 57, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 4, // Client ID length
    116, 101, 36, 116, // Client ID
    0, 6, // Will topic length
    116, 195, 178, 112, 105, 99, // Will topic
    0, 8, // Will payload length
    112, 97, 121, 194, 163, 111, 97, 100, // Will payload
    0, 8, // Username length
    117, 36, 101, 114, 110, 52, 109, 101, // Username
    0, 9, // Password length
    112, 52, 36, 36, 119, 48, 194, 163, 100, // Password
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Cannot parse protocolId', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  it('decode1', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 4,
        0, 6,
        77, 81,
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid protocol id');
  });

  it('decode2', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 8, // Fixed header
        0, 15, // string length 15 --> 15 > 8 --> error!
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
        77, 81, 73, 115, 100, 112,
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid protocol id');
  });
});

describe('Packet too short', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  it('decode1', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 8, // Header
        0, 6, // Protocol ID length
        77, 81, 73, 115, 100, 112, // Protocol ID
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Packet too short');
  });

  it('decode2', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 10, // Header
        0, 6, // Protocol ID length
        77, 81, 73, 115, 100, 112, // Protocol ID
        3, // Protocol version
        246, // Connect flags
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Packet too short');
  });

  it('decode3', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 10, // Header
        0, 6, // Protocol ID length
        77, 81, 73, 115, 100, 112, // Protocol ID
        3, // Protocol version
        246, // Connect flags
        0, 30, // Keepalive
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Packet too short');
  });

  it('decode4', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 9,
        0, 6,
        77, 81, 73, 115, 100, 112,
        3,
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Packet too short');
  });
});

describe('Cannot parse will topic', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 16, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 2, // Will topic length
    0, 0, // Will topic
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Cannot parse will topic');
  });
});

describe('Cannot parse will payload', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 23, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 5, // Will topic length
    116, 111, 112, 105, 99, // Will topic
    0, 2, // Will payload length
    0, 0, // Will payload
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Cannot parse will payload');
  });
});

describe('Cannot parse username', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 32, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 5, // Will topic length
    116, 111, 112, 105, 99, // Will topic
    0, 7, // Will payload length
    112, 97, 121, 108, 111, 97, 100, // Will payload
    0, 2, // Username length
    0, 0, // Username
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Cannot parse username');
  });
});

describe('Cannot parse password', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 42, // Header
    0, 6, // Protocol ID length
    77, 81, 73, 115, 100, 112, // Protocol ID
    3, // Protocol version
    246, // Connect flags
    0, 30, // Keepalive
    0, 5, // Will topic length
    116, 111, 112, 105, 99, // Will topic
    0, 7, // Will payload length
    112, 97, 121, 108, 111, 97, 100, // Will payload
    0, 8, // Username length
    117, 115, 101, 114, 110, 97, 109, 101, // Username
    0, 2, // Password length
    0, 0, // Password
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Cannot parse password');
  });
});

describe('Invalid header flag bits, must be 0x0 for connect packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    18, 10, // Header
    0, 4, // Protocol ID length
    0x4d, 0x51, 0x54, 0x54, // Protocol ID
    3, // Protocol version
    2, // Connect flags
    0, 30, // Keepalive
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for connect packet');
  });
});

describe('Connect flag bit 0 must be 0, but got 1', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 10, // Header
    0, 4, // Protocol ID length
    0x4d, 0x51, 0x54, 0x54, // Protocol ID
    3, // Protocol version
    3, // Connect flags
    0, 30, // Keepalive
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('connectFlag bit 0 should be 0');
  });
});

describe('Will Retain Flag must be set to zero when Will Flag is set to 0', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 10, // Header
    0, 4, // Protocol ID length
    0x4d, 0x51, 0x54, 0x54, // Protocol ID
    3, // Protocol version
    0x22, // Connect flags
    0, 30, // Keepalive
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Will Retain Flag must be set to zero when Will Flag is set to 0');
  });
});

describe('Will QoS must be set to zero when Will Flag is set to 0', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  it('decode1', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 10, // Header
        0, 4, // Protocol ID length
        0x4d, 0x51, 0x54, 0x54, // Protocol ID
        3, // Protocol version
        0x12, // Connect flags
        0, 30, // Keepalive
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Will QoS must be set to zero when Will Flag is set to 0');
  });

  it('decode2', () => {
    expect(() => {
      const buffer = Buffer.from([
        16, 10, // Header
        0, 4, // Protocol ID length
        0x4d, 0x51, 0x54, 0x54, // Protocol ID
        3, // Protocol version
        0xa, // Connect flags
        0, 30, // Keepalive
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Will QoS must be set to zero when Will Flag is set to 0');
  });
});

describe('Malformed unsuback, payload length must be 2', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  opts.protocolVersion = 4;
  it('decode1', () => {
    const buffer = Buffer.from([
      176, // Header
      1, // Packet length
      1,
    ]);
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Malformed unsuback, payload length must be 2');
  });

  opts.protocolVersion = 3;
  it('decode2', () => {
    expect(() => {
      const buffer = Buffer.from([
        176, // Header
        1, // Packet length
        1,
      ]);
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Malformed unsuback, payload length must be 2');
  });
});

describe('connack with return code 0', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connack',
    length: 2,
    sessionPresent: false,
    returnCode: 0,
  };
  const buffer = Buffer.from([
    32, 2, 0, 0,
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('connack with return code 0 session present bit set', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connack',
    length: 2,
    sessionPresent: true,
    returnCode: 0,
  };
  const buffer = Buffer.from([
    32, 2, 1, 0,
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('connack with return code 5', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'connack',
    length: 2,
    sessionPresent: false,
    returnCode: 5,
  };
  const buffer = Buffer.from([
    32, 2, 0, 5,
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for connack packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    33, 2, // header
    0, // flags
    5, // return code
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for connack packet');
  });
});

describe('Invalid connack flags, bits 7-1 must be set to 0', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    32, 2, // header
    2, // flags
    5, // return code
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid connack flags, bits 7-1 must be set to 0');
  });
});

describe('minimal publish', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'publish',
    retain: false,
    qos: 0,
    dup: false,
    length: 10,
    topic: 'test',
    payload: Buffer.from('test'),
  };
  const buffer = Buffer.from([
    48, 10, // Header
    0, 4, // Topic length
    116, 101, 115, 116, // Topic (test)
    116, 101, 115, 116, // Payload (test)
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('2KB publish packet', () => {
  const data = Buffer.alloc(2048);
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'publish',
    retain: false,
    qos: 0,
    dup: false,
    length: 2054,
    topic: 'test',
    payload: data,
  };
  const buffer = Buffer.concat([Buffer.from([
    48, 134, 16, // Header
    0, 4, // Topic length
    116, 101, 115, 116, // Topic (test)
  ]), data]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('maximal publish', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'publish',
    retain: true,
    qos: 2,
    length: 12,
    dup: true,
    topic: 'test',
    messageId: 10,
    payload: Buffer.from('test'),
  };
  const buffer = Buffer.from([
    61, 12, // Header
    0, 4, // Topic length
    116, 101, 115, 116, // Topic
    0, 10, // Message ID
    116, 101, 115, 116, // Payload
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('publish all strings generate', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'publish',
    retain: true,
    qos: 2,
    length: 12,
    dup: true,
    topic: 'test',
    messageId: 10,
    payload: Buffer.from('test'),
  };
  const buffer = Buffer.from([
    61, 12, // Header
    0, 4, // Topic length
    116, 101, 115, 116, // Topic
    0, 10, // Message ID
    116, 101, 115, 116, // Payload
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('empty publish', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'publish',
    retain: false,
    qos: 0,
    dup: false,
    length: 6,
    topic: 'test',
    payload: Buffer.alloc(0),
  };
  const buffer = Buffer.from([
    48, 6, // Header
    0, 4, // Topic length
    116, 101, 115, 116, // Topic
    // Empty payload
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Packet must not have both QoS bits set to 1', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    0x36, 6, // Header
    0, 4, // Topic length
    116, 101, 115, 116, // Topic
    // Empty payload
  ]);

  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('invalid qos');
  });
});

describe('puback', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'puback',
    length: 2,
    messageId: 2,
  };
  const buffer = Buffer.from([
    64, 2, // Header
    0, 2, // Message ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for puback packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    65, 2, // Header
    0, 2, // Message ID
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for puback packet');
  });
});

describe('pubrec', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'pubrec',
    length: 2,
    messageId: 2,
  };
  const buffer = Buffer.from([
    80, 2, // Header
    0, 2, // Message ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for pubrec packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    81, 2, // Header
    0, 2, // Message ID
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for pubrec packet');
  });
});

describe('pubrel', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'pubrel',
    length: 2,
    messageId: 2,
  };
  const buffer = Buffer.from([
    98, 2, // Header
    0, 2, // Message ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x2 for pubrel packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    96, 2, // Header
    0, 2, // Message ID
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x2 for pubrel packet');
  });
});

describe('pubcomp', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'pubcomp',
    length: 2,
    messageId: 2,
  };
  const buffer = Buffer.from([
    112, 2, // Header
    0, 2, // Message ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for pubcomp packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    113, 2, // Header
    0, 2, // Message ID
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for pubcomp packet');
  });
});

describe('Invalid header flag bits, must be 0x2 for subscribe packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    128, 9, // Header (subscribeqos=0length=9)
    0, 6, // Message ID (6)
    0, 4, // Topic length,
    116, 101, 115, 116, // Topic (test)
    0, // Qos (0)
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x2 for subscribe packet');
  });
});

describe('subscribe to one topic', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'subscribe',
    length: 9,
    subscriptions: [
      {
        topic: 'test',
        qos: 0,
      },
    ],
    messageId: 6,
  };
  const buffer = Buffer.from([
    130, 9, // Header (subscribeqos=1length=9)
    0, 6, // Message ID (6)
    0, 4, // Topic length,
    116, 101, 115, 116, // Topic (test)
    0, // Qos (0)
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid subscribe QoS, must be <= 2', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    130, 9, // Header (subscribeqos=0length=9)
    0, 6, // Message ID (6)
    0, 4, // Topic length,
    116, 101, 115, 116, // Topic (test)
    3, // Qos
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('invalid qos');
  });
});

describe('subscribe to three topics', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'subscribe',
    length: 23,
    subscriptions: [
      {
        topic: 'test',
        qos: 0,
      }, {
        topic: 'uest',
        qos: 1,
      }, {
        topic: 'tfst',
        qos: 2,
      },
    ],
    messageId: 6,
  };
  const buffer = Buffer.from([
    130, 23, // Header (publishqos=1length=9)
    0, 6, // Message ID (6)
    0, 4, // Topic length,
    116, 101, 115, 116, // Topic (test)
    0, // Qos (0)
    0, 4, // Topic length
    117, 101, 115, 116, // Topic (uest)
    1, // Qos (1)
    0, 4, // Topic length
    116, 102, 115, 116, // Topic (tfst)
    2, // Qos (2)
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('suback', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'suback',
    length: 5,
    granted: [0, 1, 2],
    messageId: 6,
  };
  const buffer = Buffer.from([
    144, 5, // Header
    0, 6, // Message ID
    0, 1, 2,
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid suback code', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    144, 6, // Header
    0, 6, // Message ID
    0, 1, 2, 0x79, // Granted qos (0, 1, 2) and an invalid code
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid suback QoS, must be <= 2');
  });
});

describe('unsubscribe', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'unsubscribe',
    length: 14,
    unsubscriptions: [
      'tfst',
      'test',
    ],
    messageId: 7,
  };
  const buffer = Buffer.from([
    162, 14,
    0, 7, // Message ID (7)
    0, 4, // Topic length
    116, 102, 115, 116, // Topic (tfst)
    0, 4, // Topic length,
    116, 101, 115, 116, // Topic (test)
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x2 for unsubscribe packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    160, 14,
    0, 7, // Message ID (7)
    0, 4, // Topic length
    116, 102, 115, 116, // Topic (tfst)
    0, 4, // Topic length,
    116, 101, 115, 116, // Topic (test)
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x2 for unsubscribe packet');
  });
});

describe('unsuback', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'unsuback',
    length: 2,
    messageId: 8,
  };
  const buffer = Buffer.from([
    176, 2, // Header
    0, 8, // Message ID
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('pingreq', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'pingreq',
    length: 0,
  };
  const buffer = Buffer.from([
    192, 0, // Header
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for pingreq packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    193, 0, // Header
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for pingreq packet');
  });
});

describe('pingresp', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'pingresp',
    length: 0,
  };
  const buffer = Buffer.from([
    208, 0, // Header
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for pingresp packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    209, 0, // Header
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for pingresp packet');
  });
});

describe('disconnect', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const packet: AnyPacket = {
    cmd: 'disconnect',
    length: 0,
  };
  const buffer = Buffer.from([
    224, 0, // Header
  ]);

  it('encode', () => {
    const encoded = encode(packet, utf8Encoder, opts);
    if (encoded.length < 10000) {
      expect(Buffer.from(encoded).toString('hex')).toEqual(Buffer.from(buffer).toString('hex'));
    } else {
      expect(encoded).toEqual(buffer);
    }
  });

  it('decode', () => {
    const decodedPacket = decode(buffer, utf8Decoder, opts);
    expect(decodedPacket).toEqual(packet);
  });
});

describe('Invalid header flag bits, must be 0x0 for disconnect packet', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    225, 0, // Header
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid header flag bits, must be 0x0 for disconnect packet');
  });
});

describe('Invalid protocolId', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 18,
    0, 6,
    65, 65, 65, 65, 65, 65, // AAAAAA
    3, // Protocol version
    0, // Connect flags
    0, 10, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid protocol id');
  });
});

describe('Invalid protocol version', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 18,
    0, 6,
    77, 81, 73, 115, 100, 112, // Protocol ID
    1, // Protocol version
    0, // Connect flags
    0, 10, // Keepalive
    0, 4, // Client ID length
    116, 101, 115, 116, // Client ID
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid protocol version');
  });
});

describe('Cannot parse protocolId', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    16, 8, // Fixed header
    0, 15, // string length 15 --> 15 > 8 --> error!
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
    77, 81, 73, 115, 100, 112,
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Invalid protocol id');
  });
});

describe('Not supported auth packet for this version MQTT', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    240, 36, // Header
    0, // reason code
    34, // properties length
    21, 0, 4, 116, 101, 115, 116, // auth method
    22, 0, 4, 0, 1, 2, 3, // auth data
    31, 0, 4, 116, 101, 115, 116, // reasonString
    38, 0, 4, 116, 101, 115, 116, 0, 4, 116, 101, 115, 116, // userProperties
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Not supported');
  });
});

describe('Malformed Subscribe Payload', () => {
  const opts: PacketOptions = { protocolVersion: 4 };
  const buffer = Buffer.from([
    130, 14, // subscribe header and remaining length
    0, 123, // packet ID
    0, 10, // topic filter length
    104, 105, 106, 107, 108, 47, 109, 110, 111, // topic filter with length of 9 bytes
    0, // requested QoS
  ]);
  it('decode', () => {
    expect(() => {
      decode(buffer, utf8Decoder, opts);
    }).toThrow('Malformed Subscribe Payload');
  });
});
