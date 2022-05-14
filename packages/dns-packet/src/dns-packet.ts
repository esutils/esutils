/* eslint-disable no-param-reassign */
/* eslint-disable no-continue */
/* eslint-disable no-bitwise */
/* eslint-disable max-classes-per-file */
import { BufferReader } from './reader';
import { BufferWriter } from './writer';

export { BufferReader } from './reader';
export { BufferWriter } from './writer';

/**
 * [QUERY_TYPE description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.2.2
 */
export const TYPE = {
  A: 0x01,
  NS: 0x02,
  MD: 0x03,
  MF: 0x04,
  CNAME: 0x05,
  SOA: 0x06,
  MB: 0x07,
  MG: 0x08,
  MR: 0x09,
  NULL: 0x0a,
  WKS: 0x0b,
  PTR: 0x0c,
  HINFO: 0x0d,
  MINFO: 0x0e,
  MX: 0x0f,
  TXT: 0x10,
  AAAA: 0x1c,
  SRV: 0x21,
  EDNS: 0x29,
  SPF: 0x63,
  AXFR: 0xfc,
  MAILB: 0xfd,
  MAILA: 0xfe,
  ANY: 0xff,
  CAA: 0x101,
};
/**
 * [QUERY_CLASS description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.2.4
 */
export const CLASS = {
  IN: 0x01,
  CS: 0x02,
  CH: 0x03,
  HS: 0x04,
  ANY: 0xff,
};
/**
 * [EDNS_OPTION_CODE description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc6891#section-6.1.2
 */
export const EDNS_OPTION_CODE = {
  ECS: 0x08,
};

export interface HeaderInfo {
  id: number;
  qr: number;
  opcode: number;
  aa: number;
  tc: number;
  rd: number;
  ra: number;
  z: number;
  rcode: number;
  qdcount: number;
  nscount: number;
  arcount: number;
  ancount: number;
}

export interface DnsBasic {
  name: string;
  type: number;
  class: number;
}

export interface DnsQuestion extends DnsBasic {}

export interface DnsResponse extends DnsBasic {
  ttl: number;
}

export interface DnsResponseA extends DnsResponse {
  address: string;
}

export interface DnsResponseAAAA extends DnsResponse {
  address: string;
}

/**
 * [Header description]
 * @param {[type]} options [description]
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.1
 */
export class Header {
  static create(): HeaderInfo {
    return {
      id: 0,
      qr: 0,
      opcode: 0,
      aa: 0,
      tc: 0,
      rd: 0,
      ra: 0,
      z: 0,
      rcode: 0,
      qdcount: 0,
      nscount: 0,
      arcount: 0,
      ancount: 0,
    };
  }

  /**
   * [parse description]
   * @param  {[type]} buffer [description]
   * @return {[type]}        [description]
   * @docs https://tools.ietf.org/html/rfc1035#section-4.1.1
   */
  static decode(reader: BufferReader) {
    const header = Header.create();
    header.id = reader.read(16);
    header.qr = reader.read(1);
    header.opcode = reader.read(4);
    header.aa = reader.read(1);
    header.tc = reader.read(1);
    header.rd = reader.read(1);
    header.ra = reader.read(1);
    header.z = reader.read(3);
    header.rcode = reader.read(4);
    header.qdcount = reader.read(16);
    header.ancount = reader.read(16);
    header.nscount = reader.read(16);
    header.arcount = reader.read(16);
    return header;
  }

  /**
   * [toBuffer description]
   * @return {[type]} [description]
   */
  static encode(writer: BufferWriter, header: HeaderInfo) {
    writer.write(header.id, 16);
    writer.write(header.qr, 1);
    writer.write(header.opcode, 4);
    writer.write(header.aa, 1);
    writer.write(header.tc, 1);
    writer.write(header.rd, 1);
    writer.write(header.ra, 1);
    writer.write(header.z, 3);
    writer.write(header.rcode, 4);
    writer.write(header.qdcount, 16);
    writer.write(header.ancount, 16);
    writer.write(header.nscount, 16);
    writer.write(header.arcount, 16);
  }
}

/**
 * [encode_name description]
 * @param  {[type]} domain [description]
 * @return {[type]}        [description]
 */
export class Name {
  public static COPY: number = 0xc0;

  static decode(reader: BufferReader) {
    const name = [];
    let o;
    let len = reader.read(8);
    while (len) {
      if ((len & Name.COPY) === Name.COPY) {
        len -= Name.COPY;
        len <<= 8;
        const pos = len + reader.read(8);
        if (!o) o = reader.offset;
        reader.offset = pos * 8;
        len = reader.read(8);
        continue;
      } else {
        let part = '';
        while (len > 0) {
          len -= 1;
          part += String.fromCharCode(reader.read(8));
        }
        name.push(part);
        len = reader.read(8);
      }
    }
    if (o) reader.offset = o;
    return name.join('.');
  }

  static encode(domain: string, writer: BufferWriter) {
    // TODO: domain name compress
    (domain || '')
      .split('.')
      .filter((part) => !!part)
      .forEach((part) => {
        writer.write(part.length, 8);
        part.split('').map((c) => {
          writer.write(c.charCodeAt(0), 8);
          return c.charCodeAt(0);
        });
      });
    writer.write(0, 8);
  }
}

/**
 * Question section format
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.2
 */
export class Question {
  static create(name: string, type?: number, cls?: number): DnsQuestion {
    return {
      name: name ?? '',
      type: type ?? TYPE.ANY,
      class: cls ?? CLASS.ANY,
    };
  }

  /**
   * [parse description]
   * @param  {[type]} reader [description]
   * @return {[type]}        [description]
   */
  static decode(reader: BufferReader, question: DnsQuestion) {
    question.name = Name.decode(reader);
    question.type = reader.read(16);
    question.class = reader.read(16);
  }

  static encode(writer: BufferWriter, question: DnsQuestion) {
    Name.encode(question.name, writer);
    writer.write(question.type, 16);
    writer.write(question.class, 16);
  }
}

/**
 * Resource record format
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.3
 */
export class Resource {
  /**
   * [encode description]
   * @param  {[type]} resource [description]
   * @param  {[type]} writer   [description]
   * @return {[type]}          [description]
   */
  static encode(writer: BufferWriter, info: DnsResponse) {
    Name.encode(info.name, writer);
    writer.write(info.type, 16);
    writer.write(info.class, 16);
    writer.write(info.ttl, 32);
  }

  /**
   * [parse description]
   * @param  {[type]} reader [description]
   * @return {[type]}        [description]
   */
  static decode(reader: BufferReader, info: DnsResponse) {
    info.name = Name.decode(reader);
    info.type = reader.read(16);
    info.class = reader.read(16);
    info.ttl = reader.read(32);
    return reader.read(16);
  }
}

/**
 * [A description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.4.1
 */
export class ResourceA {
  static encode(writer: BufferWriter, info: DnsResponseA) {
    Resource.encode(writer, info);
    const parts = info.address.split('.');
    writer.write(parts.length, 16);
    parts.forEach((part) => {
      writer.write(parseInt(part, 10), 8);
    });
  }

  static decode(reader: BufferReader, length: number, info: DnsResponseA) {
    const parts = [];
    while (length > 0) {
      length -= 1;
      parts.push(reader.read(8));
    }
    info.address = parts.join('.');
  }
}

/**
 * [AAAA description]
 * @type {Object}
 * @docs https://en.wikipedia.org/wiki/IPv6
 */
export class ResourceAAAA {
  static encode(writer: BufferWriter, info: DnsResponseAAAA) {
    Resource.encode(writer, info);
    const parts = info.address.split(':');
    writer.write(parts.length * 2, 16);
    parts.forEach((part) => {
      writer.write(parseInt(part, 16), 16);
    });
  }

  static decode(reader: BufferReader, length: number, info: DnsResponseAAAA) {
    const parts = [];
    while (length) {
      length -= 2;
      parts.push(reader.read(16));
    }
    info.address = parts
      .map((part) => (part > 0 ? part.toString(16) : ''))
      .join(':');
  }
}

export type DecodeFunction = (reader: BufferReader, info: DnsBasic) => void;
export type EncodeFunction = (writer: BufferWriter, info: DnsBasic) => void;

export interface SectionDecoder {
  section: string;
  decode: DecodeFunction;
  count: number;
}

export function createDnsBasic(): DnsBasic {
  return {
    name: '',
    type: TYPE.ANY,
    class: CLASS.ANY,
  };
}

export interface DnsPacket {
  header: HeaderInfo;
  questions: DnsQuestion[];
  answers: DnsResponse[];
  authorities: DnsResponse[];
  additionals: DnsResponse[];
  errors: Error[];
}

function decodeSingle(
  reader: BufferReader,
  parsed: DnsBasic[],
  errors: Error[],
  decode: DecodeFunction,
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    try {
      const info = createDnsBasic();
      decode(reader, info);
      parsed.push(info);
    } catch (e) {
      errors.push(e as Error);
    }
  }
}

function encodeSingle(
  writer: BufferWriter,
  dnsBasicList: DnsBasic[],
  errors: Error[],
  encode: EncodeFunction,
) {
  for (let i = 0; i < dnsBasicList.length; i += 1) {
    try {
      encode(writer, dnsBasicList[i]);
    } catch (e) {
      errors.push(e as Error);
    }
  }
}

export function encodeResponseDefault(writer: BufferWriter, info: DnsBasic) {
  switch (info.type) {
    case TYPE.A:
      ResourceA.encode(writer, info as DnsResponseA);
      break;
    case TYPE.AAAA:
      ResourceAAAA.encode(writer, info as DnsResponseAAAA);
      break;
    default:
      throw new Error(`Not supported DNS TYPE ${info.type}`);
  }
}

export function decodeResponseDefault(reader: BufferReader, info: DnsBasic) {
  const length = Resource.decode(reader, info as DnsResponse);
  switch (info.type) {
    case TYPE.A:
      ResourceA.decode(reader, length, info as DnsResponseA);
      break;
    case TYPE.AAAA:
      ResourceAAAA.decode(reader, length, info as DnsResponseAAAA);
      break;
    default:
      throw new Error(`Not supported DNS TYPE ${info.type}`);
  }
}

export class Packet {
  static create(): DnsPacket {
    return {
      header: Header.create(),
      errors: [],
      questions: [],
      answers: [],
      authorities: [],
      additionals: [],
    };
  }

  /**
   * [random header id]
   * @return {[type]} [description]
   */
  static randomHeaderId() {
    return (Math.random() * 65535) | 0;
  }

  static decode(buffer: Uint8Array, decoder: DecodeFunction) {
    const reader = new BufferReader(buffer);
    const dnsParsed = Packet.create();
    const header = Header.decode(reader);
    dnsParsed.header = header;
    decodeSingle(
      reader,
      dnsParsed.questions,
      dnsParsed.errors,
      Question.decode,
      header.qdcount,
    );
    decodeSingle(
      reader,
      dnsParsed.answers,
      dnsParsed.errors,
      decoder,
      header.ancount,
    );
    decodeSingle(
      reader,
      dnsParsed.authorities,
      dnsParsed.errors,
      decoder,
      header.nscount,
    );
    decodeSingle(
      reader,
      dnsParsed.additionals,
      dnsParsed.errors,
      decoder,
      header.arcount,
    );
    return dnsParsed;
  }

  static encode(dnsEntry: DnsPacket, encoder: EncodeFunction) {
    const writer = new BufferWriter();
    dnsEntry.header.qdcount = dnsEntry.questions.length;
    dnsEntry.header.ancount = dnsEntry.answers.length;
    dnsEntry.header.nscount = dnsEntry.authorities.length;
    dnsEntry.header.arcount = dnsEntry.additionals.length;
    Header.encode(writer, dnsEntry.header);
    encodeSingle(writer, dnsEntry.questions, dnsEntry.errors, Question.encode);
    encodeSingle(writer, dnsEntry.answers, dnsEntry.errors, encoder);
    encodeSingle(writer, dnsEntry.authorities, dnsEntry.errors, encoder);
    encodeSingle(writer, dnsEntry.additionals, dnsEntry.errors, encoder);

    return writer.toBuffer();
  }
}
