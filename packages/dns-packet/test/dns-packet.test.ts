import assert from 'assert';
import {
  Name,
  BufferWriter,
  BufferReader,
  Header,
  Question,
  CLASS,
  TYPE,
  DnsResponseA,
  DnsResponseAAAA,
  Packet,
  encodeResponseDefault,
  decodeResponseDefault,
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
    const pattern = dnsLiteralToUint8Array([3, 'w', 'w', 'w', 6, 'g', 'o', 'o', 'g', 'l', 'e', 3, 'c', 'o', 'm', 0]);
    expect(name).toEqual(pattern);
  });

  const response = Uint8Array.from([
    0x29, 0x64, 0x81, 0x80, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x00, 0x03, 0x77, 0x77, 0x77,
    0x01, 0x7a, 0x02, 0x63, 0x6e, 0x00, 0x00, 0x01,
    0x00, 0x01, 0xc0, 0x0c, 0x00, 0x01, 0x00, 0x01,
    0x00, 0x00, 0x01, 0x90, 0x00, 0x04, 0x36, 0xde,
    0x3c, 0xfc,
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

    expect(writer.toBuffer()).toEqual(Uint8Array.from([
      0x29, 0x64, 0x80, 0x00, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00]));
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
    const question = Question.create(
      'google.com',
      TYPE.A,
      CLASS.IN,
    );
    //
    Question.encode(writer, question);
    assert.deepEqual(writer.toBuffer(), Uint8Array.from([
      0x06, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03,
      0x63, 0x6f, 0x6d, 0x00, 0x00, 0x01, 0x00, 0x01,
    ]));
  });

  test('Question#decode', () => {
    const reader = new BufferReader(Uint8Array.from([
      0x06, 0x67, 0x6f, 0x6f, 0x67, 0x6c, 0x65, 0x03,
      0x63, 0x6f, 0x6d, 0x00, 0x00, 0x01, 0x00, 0x01,
    ]), 0);

    const question = Question.create('');
    Question.decode(reader, question);
    assert.deepEqual(question, {
      name: 'google.com',
      type: TYPE.A,
      class: CLASS.IN,
    });
  });

  test('Packet#decode', () => {
    const packet = Packet.decode(response, decodeResponseDefault);
    assert.equal(packet.questions[0].name, 'www.z.cn');
    assert.equal(packet.questions[0].type, TYPE.A);
    assert.equal(packet.questions[0].class, CLASS.IN);
    const answers = packet.answers as DnsResponseA[];
    assert.equal(answers[0].class, TYPE.A);
    assert.equal(answers[0].class, CLASS.IN);
    assert.equal(answers[0].address, '54.222.60.252');
  });

  it('Packet#encode', () => {
    const packet = Packet.create();
    //
    packet.header.qr = 1;
    (packet.answers as DnsResponseA[]).push({
      name: 'lsong.org',
      type: TYPE.A,
      class: CLASS.IN,
      ttl: 300,
      address: '127.0.0.1',
    });

    (packet.answers as DnsResponseAAAA[]).push({
      name: 'lsong.org',
      type: TYPE.AAAA,
      class: CLASS.IN,
      ttl: 300,
      address: '2001:db8::::ff00:42:8329',
    });
    const encoded = Packet.encode(packet, encodeResponseDefault);
    assert.deepEqual(Packet.decode(encoded, decodeResponseDefault), packet);
  });

  it('Packet#decode#random', () => {
    const buf0 = Buffer.from(
      '82d90100000100000000000003626167066974756e6573056170706c6503636f6d0000410001',
      'hex',
    ) as Uint8Array;
    assert.deepEqual(Packet.decode(buf0, decodeResponseDefault), {
      additionals: [],
      answers: [],
      authorities: [],
      errors: [],
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
      questions: [{ class: 1, name: 'bag.itunes.apple.com', type: 65 }],
    });

    const buf1 = Buffer.from(
      'b90801000001000000000000045f646e73087265736f6c76657204617270610000400001',
      'hex',
    ) as Uint8Array;
    assert.deepEqual(Packet.decode(buf1, decodeResponseDefault), {
      additionals: [],
      answers: [],
      authorities: [],
      errors: [],
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
      questions: [{ class: 1, name: '_dns.resolver.arpa', type: 64 }],
    });

    const buf2 = Buffer.from(
      '8e6f010000010000000000000873697064627a30360572637330310335676d02776f02636e0000230001',
      'hex',
    ) as Uint8Array;
    assert.deepEqual(Packet.decode(buf2, decodeResponseDefault), {
      additionals: [],
      answers: [],
      authorities: [],
      errors: [],
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
      questions: [{ class: 1, name: 'sipdbz06.rcs01.5gm.wo.cn', type: 35 }],
    });
  });
});
