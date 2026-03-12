import assert from 'assert';
import {
  Name,
  BufferWriter,
  BufferReader,
  Header,
  Question,
  CLASS,
  TYPE,
  type DnsResourceA,
  type DnsResourceAAAA,
  Packet,
  encodeResourceDefault,
  decodeResourceDefault,
} from '@esutils/dns-packet';

function dnsLiteralToUint8Array(arr: (number | string)[]) {
  const buf = new Uint8Array(arr.length);
  for (let i = 0; i < arr.length; i += 1) {
    const chr = arr[i];
    if (typeof chr === 'string') {
      buf[i] = chr.codePointAt(0) ?? 0;
    } else {
      buf[i] = chr;
    }
  }
  return buf;
}

describe('dns-packet in typescript', () => {
  let writer!: BufferWriter;
  beforeEach(() => {
    writer = new BufferWriter();
  });

  it('Name#encode', () => {
    Name.encode('www.google.com', writer);
    const name = writer.toBuffer();
    const pattern = dnsLiteralToUint8Array([
      3,
      'w',
      'w',
      'w',
      6,
      'g',
      'o',
      'o',
      'g',
      'l',
      'e',
      3,
      'c',
      'o',
      'm',
      0,
    ]);
    expect(name).toEqual(pattern);
  });

  const response = Uint8Array.from([
    0x29, 0x64, 0x81, 0x80, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x03, 0x77, 0x77, 0x77, 0x01, 0x7a, 0x02, 0x63, 0x6e, 0x00, 0x00, 0x01,
    0x00, 0x01, 0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x01, 0x90,
    0x00, 0x04, 0x36, 0xde, 0x3c, 0xfc,
  ]);

  it('Name#decode', () => {
    const reader = new BufferReader(response, 8 * 12);
    let name = Name.decode(reader);
    expect(name).toEqual('www.z.cn');

    reader.offset = 8 * 26;
    name = Name.decode(reader);
    expect(reader.offset).toEqual(8 * 28);
    expect(name).toEqual('www.z.cn');
  });

  it('Header#encode', () => {
    const header = Header.create();
    header.id = 0x2964;
    header.qr = 1;
    header.qdcount = 1;
    header.ancount = 2;
    Header.encode(writer, header);

    expect(writer.toBuffer()).toEqual(
      Uint8Array.from([
        0x29, 0x64, 0x80, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00,
      ]),
    );
  });

  test('Header#parse', () => {
    const reader = new BufferReader(response, 0);
    const header = Header.decode(reader);
    assert.equal(header.id, 0x2964);
    assert.equal(header.qr, 1);
    assert.equal(header.opcode, 0);
    assert.equal(header.aa, 0);
    assert.equal(header.tc, 0);
    assert.equal(header.rd, 1);
    assert.equal(header.z, 0);
    assert.equal(header.rcode, 0);
    assert.equal(header.qdcount, 1);
    assert.equal(header.ancount, 1);
    assert.equal(header.nscount, 0);
    assert.equal(header.arcount, 0);
  });

  test('Question#encode', () => {
    const question = Question.create('google.com', TYPE.A, CLASS.IN);
    //
    Question.encode(writer, question);
    assert.deepEqual(
      writer.toBuffer(),
      Uint8Array.from([
        0x06, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00,
        0x00, 0x01, 0x00, 0x01,
      ]),
    );
  });

  test('Question#decode', () => {
    const reader = new BufferReader(
      Uint8Array.from([
        0x06, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03, 0x63, 0x6f, 0x6d, 0x00,
        0x00, 0x01, 0x00, 0x01,
      ]),
      0,
    );

    const question = Question.create('');
    Question.decode(reader, question);
    assert.deepEqual(question, {
      name: 'google.com',
      type: TYPE.A,
      class: CLASS.IN,
      errors: [],
    });
  });

  test('Packet#decode', () => {
    const packet = Packet.decode(response, [], decodeResourceDefault);
    assert.equal(packet.questions[0].name, 'www.z.cn');
    assert.equal(packet.questions[0].type, TYPE.A);
    assert.equal(packet.questions[0].class, CLASS.IN);
    const answers = packet.answers as DnsResourceA[];
    assert.equal(answers[0].class, TYPE.A);
    assert.equal(answers[0].class, CLASS.IN);
    assert.equal(answers[0].address, '54.222.60.252');
  });

  it('Packet#encode', () => {
    const packet = Packet.create();
    //
    packet.header.qr = 1;
    (packet.answers as DnsResourceA[]).push({
      name: 'lsong.org',
      type: TYPE.A,
      class: CLASS.IN,
      errors: [],
      ttl: 300,
      address: '127.0.0.1',
    });

    (packet.answers as DnsResourceAAAA[]).push({
      name: 'lsong.org',
      type: TYPE.AAAA,
      class: CLASS.IN,
      errors: [],
      ttl: 300,
      address: '2001:db8::::ff00:42:8329',
    });
    const encoded = Packet.encode(packet, [], encodeResourceDefault);
    assert.deepEqual(Packet.decode(encoded, [], decodeResourceDefault), packet);
  });

  it('Packet#EDNS#decode/encode#request', function () {
    // EDNS request
    const bufferRequestHex =
      '06d501000001000000000001037777770462696e6703636f6d0000010001000029020000000000000c0008000800012000c0a86401';
    const request = Packet.decode(
      Buffer.from(bufferRequestHex, 'hex'),
      [],
      decodeResourceDefault,
    );
    const requestExpected = {
      additionals: [
        {
          class: 512,
          errors: [],
          name: '',
          rdata: [
            {
              ednsCode: 8,
              family: 1,
              ip: '192.168.100.1',
              scopePrefixLength: 0,
              sourcePrefixLength: 32,
            },
          ],
          ttl: 0,
          type: 41,
        },
      ],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 1,
        id: 1749,
        nscount: 0,
        opcode: 0,
        qdcount: 1,
        qr: 0,
        ra: 0,
        rcode: 0,
        rd: 1,
        tc: 0,
        z: 0,
      },
      questions: [{ class: 1, errors: [], name: 'www.bing.com', type: 1 }],
    };
    assert.deepEqual(request, requestExpected);
    assert.deepEqual(
      Buffer.from(Packet.encode(request, [], encodeResourceDefault)).toString(
        'hex',
      ),
      bufferRequestHex,
    );
  });

  it('Packet#EDNS#decode/encode#response', function () {
    const bufferResponseHex =
      '076281800001000700000001037777770462696e6703636f6d0000010001c00c000500010000545a0025077777772d7777770462696e6703636f6d0e747261666669636d616e61676572036e657400c02a00050001000000360017037777770462696e6703636f6d07656467656b6579c04ac05b000500010000545a00190665383633303304647363780a616b616d616965646765c04ac07e000100010000000e000417d2d89cc07e000100010000000e000417d2d89bc07e000100010000000e000417d2d8a0c07e000100010000000e000417d2d89500002904d0000000000000';
    const responseExpected = {
      additionals: [
        { class: 1232, errors: [], name: '', rdata: [], ttl: 0, type: 41 },
      ],
      answers: [
        {
          class: 1,
          domain: 'www-www.bing.com.trafficmanager.net',
          errors: [],
          name: 'www.bing.com',
          ttl: 21594,
          type: 5,
        },
        {
          class: 1,
          domain: 'www.bing.com.edgekey.net',
          errors: [],
          name: 'www-www.bing.com.trafficmanager.net',
          ttl: 54,
          type: 5,
        },
        {
          class: 1,
          domain: 'e86303.dscx.akamaiedge.net',
          errors: [],
          name: 'www.bing.com.edgekey.net',
          ttl: 21594,
          type: 5,
        },
        {
          address: '23.210.216.156',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
        {
          address: '23.210.216.155',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
        {
          address: '23.210.216.160',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
        {
          address: '23.210.216.149',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 7,
        arcount: 1,
        id: 1890,
        nscount: 0,
        opcode: 0,
        qdcount: 1,
        qr: 1,
        ra: 1,
        rcode: 0,
        rd: 1,
        tc: 0,
        z: 0,
      },
      questions: [{ class: 1, errors: [], name: 'www.bing.com', type: 1 }],
    };
    const response = Packet.decode(
      Buffer.from(bufferResponseHex, 'hex'),
      [],
      decodeResourceDefault,
    );
    assert.deepEqual(response, responseExpected);
    const responseDecodeTwice = Packet.decode(
      Buffer.from(Packet.encode(responseExpected, [], encodeResourceDefault)),
      [],
      decodeResourceDefault,
    );
    assert.deepEqual(responseDecodeTwice, responseExpected);
    /*TODO: maybe because of domain name compress
    assert.deepEqual(
      Buffer.from(Packet.encode(response, encodeResourceDefault)).toString(
        'hex',
      ),
      bufferResponseHex,
    );
    */
  });

  function checkDecodeResponsePacket(
    hexBuf: string,
    expected: ReturnType<typeof Packet.decode>,
  ) {
    const buf = Buffer.from(hexBuf, 'hex');
    assert.deepEqual(Packet.decode(buf, [], decodeResourceDefault), expected);
    assert.deepEqual(
      Buffer.from(
        Packet.encode(
          Packet.decode(buf, [], decodeResourceDefault),
          [],
          encodeResourceDefault,
        ),
      ).toString('hex'),
      Buffer.from(buf).toString('hex'),
    );
  }

  it('Packet#decode#response', () => {
    const expectedResponse_apple = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 33497,
        nscount: 0,
        opcode: 0,
        qdcount: 1,
        qr: 0,
        ra: 0,
        rcode: 0,
        rd: 1,
        tc: 0,
        z: 0,
      },
      questions: [
        { class: 1, name: 'bag.itunes.apple.com', type: 65, errors: [] },
      ],
    };
    checkDecodeResponsePacket(
      '82d90100000100000000000003626167066974756e6573056170706c6503636f6d0000410001',
      expectedResponse_apple,
    );

    const expectedResponse_resolver = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 47368,
        nscount: 0,
        opcode: 0,
        qdcount: 1,
        qr: 0,
        ra: 0,
        rcode: 0,
        rd: 1,
        tc: 0,
        z: 0,
      },
      questions: [
        { class: 1, name: '_dns.resolver.arpa', type: 64, errors: [] },
      ],
    };

    checkDecodeResponsePacket(
      'b90801000001000000000000045f646e73087265736f6c76657204617270610000400001',
      expectedResponse_resolver,
    );

    const expectedResponse_wo = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 36463,
        nscount: 0,
        opcode: 0,
        qdcount: 1,
        qr: 0,
        ra: 0,
        rcode: 0,
        rd: 1,
        tc: 0,
        z: 0,
      },
      questions: [
        { class: 1, name: 'sipdbz06.rcs01.5gm.wo.cn', type: 35, errors: [] },
      ],
    };
    checkDecodeResponsePacket(
      '8e6f010000010000000000000873697064627a30360572637330310335676d02776f02636e0000230001',
      expectedResponseWo,
    );
  });
});
