import { invert } from '@esutils/invert';
import { BufferReader } from './reader.mjs';
import { BufferWriter } from './writer.mjs';

export { BufferReader } from './reader.mjs';
export { BufferWriter } from './writer.mjs';

/**
 * [QUERY_TYPE description]
 * @type {Object}
 * @docs List of DNS record types
 * https://en.wikipedia.org/wiki/List_of_DNS_record_types
 */
export const TYPE = {
  // 3.2.2. TYPE values https://datatracker.ietf.org/doc/html/rfc1035#section-3.2.2
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

  AAAA: 0x1c, // 28 https://www.rfc-editor.org/rfc/rfc3596 DNS Extensions to Support IP Version 6
  SRV: 0x21, // 33 https://datatracker.ietf.org/doc/html/rfc8553#section-3.1 SRV Specification Changes
  NAPTR: 0x23, // 35 https://datatracker.ietf.org/doc/html/rfc3403#section-4 NAPTR RR Format
  DNAME: 0x27, // 39 https://www.rfc-editor.org/rfc/rfc6672#section-2 The DNAME Resource Record
  SVCB: 0x40, // 64 https://www.rfc-editor.org/rfc/rfc9460
  HTTPS: 0x41, // 65 https://www.rfc-editor.org/rfc/rfc9460
  OPT: 0x29, // 41 https://datatracker.ietf.org/doc/html/rfc6891 This is a pseudo-record type needed to support EDNS.
  SPF: 0x63, // 99 https://datatracker.ietf.org/doc/html/rfc7208

  // 3.2.3. QTYPE values https://datatracker.ietf.org/doc/html/rfc1035#section-3.2.3
  AXFR: 0xfc,
  MAILB: 0xfd,
  MAILA: 0xfe,
  ANY: 0xff,

  CAA: 0x101, // 257 https://www.rfc-editor.org/rfc/rfc8659 RFC 8659 DNS Certification Authority Authorization (CAA) Resource Record
};

export const TYPE_INVERTED = invert(TYPE);

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
 * @docs https://datatracker.ietf.org/doc/html/rfc6891#section-6.1.2
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
  ancount: number;
  nscount: number;
  arcount: number;
}

export interface DnsBasic {
  name: string;
  type: number;
  class: number;
  errors: string[];
}

export interface DnsQuestion extends DnsBasic {}

export interface DnsResource extends DnsBasic {
  ttl: number;
}

export interface DnsResourceAddress extends DnsResource {
  address: string;
}

export interface DnsResourceA extends DnsResourceAddress {}

export interface DnsResourceMX extends DnsResource {
  exchange: string;
  priority: number;
}

export interface DnsResourceAAAA extends DnsResourceAddress {}

export interface DnsResourceEDNS {
  ednsCode: number;
}

export interface DnsResourceECS extends DnsResourceEDNS {
  family: number;
  sourcePrefixLength: number;
  scopePrefixLength: number;
  ip: string;
}

export interface DnsResourceOPT extends DnsResourceAddress {
  rdata: DnsResourceEDNS[];
}

export interface DnsResourceNS extends DnsResource {
  ns: string;
}

export interface DnsResourceCNAME extends DnsResource {
  domain: string;
}

export interface DnsResourceSPF extends DnsResource {
  data: string;
}
export interface DnsResourceSOA extends DnsResource {
  primary: string;
  admin: string;
  serial: number;
  refresh: number;
  retry: number;
  expiration: number;
  minimum: number;
}
export interface DnsResourceSRV extends DnsResource {
  priority: number;
  weight: number;
  port: number;
  target: string;
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
      errors: [],
    };
  }

  /**
   * [parse description]
   * @param  {[type]} reader [description]
   * @return {[type]}        [description]
   */
  static decode(this: void, reader: BufferReader, question: DnsQuestion) {
    question.name = Name.decode(reader);
    question.type = reader.read(16);
    question.class = reader.read(16);
  }

  static encode(this: void, writer: BufferWriter, question: DnsQuestion) {
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
  static encodeLengthReserve(writer: BufferWriter, bitLength: number = 16) {
    // Reserve bitLength bits for resource length
    const offset = writer.buffer.length;
    writer.write(0, bitLength);
    return offset;
  }

  static encodeLength(writer: BufferWriter, offset: number) {
    const lengthInBits = writer.buffer.length - offset - 16;
    writer.update(offset, lengthInBits / 8, 16);
  }

  /**
   * [encode description]
   * @param  writer [description]
   * @param  info   [description]
   * @return The offset of the reserved 16 bits for resource body length
   */
  static encode(writer: BufferWriter, info: DnsResource) {
    Name.encode(info.name, writer);
    writer.write(info.type, 16);
    writer.write(info.class, 16);
    writer.write(info.ttl, 32);
    // Reserve 16 bits for resource length
    return Resource.encodeLengthReserve(writer, 16);
  }

  /**
   * [decode description]
   * @param  {[type]} reader [description]
   * @return The length of the resource body
   */
  static decode(reader: BufferReader, info: DnsResource) {
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
  static encode(writer: BufferWriter, info: DnsResourceA) {
    const offset = Resource.encode(writer, info);
    const parts = info.address.split('.');
    parts.forEach((part) => {
      writer.write(parseInt(part, 10), 8);
    });
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, length: number, info: DnsResourceA) {
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
  static encode(writer: BufferWriter, info: DnsResourceAAAA) {
    const offset = Resource.encode(writer, info);
    const parts = info.address.split(':');
    parts.forEach((part) => {
      writer.write(parseInt(part, 16), 16);
    });
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, length: number, info: DnsResourceAAAA) {
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

/**
 * [CNAME description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.1
 */
export class ResourceCNAME {
  static encode(writer: BufferWriter, info: DnsResourceCNAME) {
    const offset = Resource.encode(writer, info);
    Name.encode(info.domain, writer);
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, _length: number, info: DnsResourceCNAME) {
    info.domain = Name.decode(reader);
  }
}

/**
 * [MX description]
 * @param {[type]} exchange [description]
 * @param {[type]} priority [description]
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.9
 */
export class ResourceMX {
  static encode(writer: BufferWriter, info: DnsResourceMX) {
    const offset = Resource.encode(writer, info);
    writer.write(info.priority, 16);
    Name.encode(info.exchange, writer);
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, length: number, info: DnsResourceMX) {
    info.priority = reader.read(16);
    info.exchange = Name.decode(reader);
  }
}

/**
 * [NS description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.11
 */
export class ResourceNS {
  static encode(writer: BufferWriter, info: DnsResourceNS) {
    const offset = Resource.encode(writer, info);
    Name.encode(info.ns, writer);
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, length: number, info: DnsResourceNS) {
    info.ns = Name.decode(reader);
  }
}

export class ResourceSPF {
  static encode(writer: BufferWriter, info: DnsResourceAAAA) {
    const offset = Resource.encode(writer, info);
    /*
    writer = writer || new Packet.Writer();

    // make sure that resource data is a an array of strings
    const characterStrings = Array.isArray(record.data) ? record.data : [ record.data ];
    // convert array of strings to array of buffers
    const characterStringBuffers = characterStrings.map(function(characterString) {
      if (Buffer.isBuffer(characterString)) {
        return characterString;
      }
      if (typeof characterString === 'string') {
        return Buffer.from(characterString, 'utf8');
      }
      return false;
    }).filter(function(characterString) {
      // remove invalid values from the array
      return characterString;
    });

    // calculate byte length of resource strings
    const bufferLength = characterStringBuffers.reduce(function(sum, characterStringBuffer) {
      return sum + characterStringBuffer.length;
    }, 0);

    // write string length to output
    writer.write(bufferLength + characterStringBuffers.length, 16); // response length

    // write each string to output
    characterStringBuffers.forEach(function(buffer) {
      writer.write(buffer.length, 8); // text length
      buffer.forEach(function(c) {
        writer.write(c, 8);
      });
    });

    return writer.toBuffer();
    */
    Resource.encodeLength(writer, offset);
  }

  static decode(
    _reader: BufferReader,
    _length: number,
    _info: DnsResourceAAAA,
  ) {
    /*
    const parts = [];
    let bytesRead = 0; let chunkLength = 0;

    while (bytesRead < length) {
      chunkLength = reader.read(8); // text length
      bytesRead++;

      while (chunkLength--) {
        parts.push(reader.read(8));
        bytesRead++;
      }
    }

    this.data = Buffer.from(parts).toString('utf8');
    return this;
    */
  }
}

export class ResourceSOA {
  static encode(writer: BufferWriter, info: DnsResourceSOA) {
    const offset = Resource.encode(writer, info);
    Name.encode(info.primary, writer);
    Name.encode(info.admin, writer);
    writer.write(info.serial, 32);
    writer.write(info.refresh, 32);
    writer.write(info.retry, 32);
    writer.write(info.expiration, 32);
    writer.write(info.minimum, 32);
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, _length: number, info: DnsResourceSOA) {
    info.primary = Name.decode(reader);
    info.admin = Name.decode(reader);
    info.serial = reader.read(32);
    info.refresh = reader.read(32);
    info.retry = reader.read(32);
    info.expiration = reader.read(32);
    info.minimum = reader.read(32);
  }
}

export class ResourceSRV {
  static encode(writer: BufferWriter, info: DnsResourceSRV) {
    const offset = Resource.encode(writer, info);
    writer.write(info.priority, 16);
    writer.write(info.weight, 16);
    writer.write(info.port, 16);
    Name.encode(info.target, writer);
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, _length: number, info: DnsResourceSRV) {
    info.priority = reader.read(16);
    info.weight = reader.read(16);
    info.port = reader.read(16);
    info.target = Name.decode(reader);
  }
}

export class ECS {
  static create(clientIp: string): DnsResourceECS {
    const [ip, prefixLength] = clientIp.split('/');
    const numPrefixLength = parseInt(prefixLength) || 32;
    return {
      ednsCode: EDNS_OPTION_CODE.ECS,
      family: 1,
      sourcePrefixLength: numPrefixLength,
      scopePrefixLength: 0,
      ip,
    };
  }

  static decode(reader: BufferReader, length: number): DnsResourceECS {
    const rdata: DnsResourceECS = {
      ednsCode: EDNS_OPTION_CODE.ECS,
      family: reader.read(16),
      sourcePrefixLength: reader.read(8),
      scopePrefixLength: reader.read(8),
      ip: '',
    };
    length = length - 4;

    if (rdata.family === 1) {
      const ipv4Octets = [];
      while (length--) {
        const octet = reader.read(8);
        ipv4Octets.push(octet);
      }
      while (ipv4Octets.length < 4) {
        ipv4Octets.push(0);
      }
      rdata.ip = ipv4Octets.join('.');
    }

    if (rdata.family === 2) {
      const ipv6Segments = [];
      for (; length; length -= 2) {
        const segment = reader.read(16).toString(16);
        ipv6Segments.push(segment);
      }
      while (ipv6Segments.length < 8) {
        ipv6Segments.push('0');
      }
      rdata.ip = ipv6Segments.join(':');
    }
    return rdata;
  }

  static encode(rdata: DnsResourceECS, writer: BufferWriter) {
    writer.write(rdata.ednsCode, 16);
    const offset = Resource.encodeLengthReserve(writer, 16);
    const ip = rdata.ip.split('.').map((s) => parseInt(s));
    writer.write(rdata.family, 16);
    writer.write(rdata.sourcePrefixLength, 8);
    writer.write(rdata.scopePrefixLength, 8);
    writer.write(ip[0], 8);
    writer.write(ip[1], 8);
    writer.write(ip[2], 8);
    writer.write(ip[3], 8);
    Resource.encodeLength(writer, offset);
  }
}

export class ResourceOPT {
  static encode(writer: BufferWriter, info: DnsResourceOPT) {
    const offset = Resource.encode(writer, info);
    for (const rdata of info.rdata) {
      switch (rdata.ednsCode) {
        case EDNS_OPTION_CODE.ECS:
          ECS.encode(rdata as DnsResourceECS, writer);
          break;
        default:
          info.errors.push(
            `ResourceOPT encode do not supported ednsCode ${rdata.ednsCode}`,
          );
          break;
      }
    }
    Resource.encodeLength(writer, offset);
  }

  static decode(reader: BufferReader, length: number, info: DnsResourceOPT) {
    info.rdata = [];
    while (length) {
      const ednsCode = reader.read(16);
      const ednsLength = reader.read(16); // In octet (https://tools.ietf.org/html/rfc6891#page-8)
      switch (ednsCode) {
        case EDNS_OPTION_CODE.ECS: {
          info.rdata.push(ECS.decode(reader, ednsLength));
          break;
        }
        default:
          reader.read(ednsLength); // Ignore data that doesn't understand
          info.errors.push(
            `ResourceOPT decode do not supported ednsCode ${ednsCode}: ednsLength:${ednsLength}`,
          );
      }
      length = length - 4 - ednsLength;
    }
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
    errors: [],
  };
}

export interface DnsPacket {
  header: HeaderInfo;
  questions: DnsQuestion[];
  answers: DnsResource[];
  authorities: DnsResource[];
  additionals: DnsResource[];
}

function decodeSingle(
  reader: BufferReader,
  tag: string,
  parsed: DnsBasic[],
  errors: string[],
  decode: DecodeFunction,
  count: number,
) {
  for (let i = 0; i < count; i += 1) {
    try {
      const info = createDnsBasic();
      decode(reader, info);
      errors.push(`decode ${tag} ${i} has errors: ${info.errors.join(';')}`);
      parsed.push(info);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
}

function encodeSingle(
  writer: BufferWriter,
  tag: string,
  dnsBasicList: DnsBasic[],
  errors: string[],
  encode: EncodeFunction,
) {
  for (let i = 0; i < dnsBasicList.length; i += 1) {
    try {
      encode(writer, dnsBasicList[i]);
      errors.push(
        `${tag} ${i} has errors: ${dnsBasicList[i].errors.join(';')}`,
      );
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
}

export function encodeResourceDefault(writer: BufferWriter, info: DnsBasic) {
  switch (info.type) {
    case TYPE.A:
      ResourceA.encode(writer, info as DnsResourceA);
      break;
    case TYPE.AAAA:
      ResourceAAAA.encode(writer, info as DnsResourceAAAA);
      break;
    case TYPE.CNAME:
    case TYPE.DNAME:
    case TYPE.PTR:
      ResourceCNAME.encode(writer, info as DnsResourceCNAME);
      break;
    case TYPE.SOA:
      ResourceSOA.encode(writer, info as DnsResourceSOA);
      break;
    case TYPE.OPT /* EDNS */:
      ResourceOPT.encode(writer, info as DnsResourceOPT);
      break;
    default:
      info.errors.push(
        `encodeResourceDefault Not supported DNS TYPE ${TYPE_INVERTED[info.type]}:${info.type}`,
      );
  }
}

export function decodeResourceDefault(reader: BufferReader, info: DnsBasic) {
  const length = Resource.decode(reader, info as DnsResource);
  switch (info.type) {
    case TYPE.A:
      ResourceA.decode(reader, length, info as DnsResourceA);
      break;
    case TYPE.AAAA:
      ResourceAAAA.decode(reader, length, info as DnsResourceAAAA);
      break;
    case TYPE.CNAME:
    case TYPE.DNAME:
    case TYPE.PTR:
      ResourceCNAME.decode(reader, length, info as DnsResourceCNAME);
      break;
    case TYPE.SOA:
      ResourceSOA.decode(reader, length, info as DnsResourceSOA);
      break;
    case TYPE.OPT /* EDNS */:
      ResourceOPT.decode(reader, length, info as DnsResourceOPT);
      break;
    default: {
      for (let lengthToRead = length; lengthToRead > 0; lengthToRead -= 1) {
        reader.read(8);
      }
      info.errors.push(
        `decodeResourceDefault Not supported DNS TYPE ${TYPE_INVERTED[info.type]}:${info.type}`,
      );
    }
  }
}

export class Packet {
  static create(): DnsPacket {
    return {
      header: Header.create(),
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

  static decode(buffer: Uint8Array, errors: string[], decoder: DecodeFunction) {
    const reader = new BufferReader(buffer);
    const dnsParsed = Packet.create();
    let header: HeaderInfo | undefined;
    try {
      header = Header.decode(reader);
      dnsParsed.header = header;
    } catch (e) {
      errors.push(`Error decoding DNS header: ${(e as Error).message}`);
    }
    if (!header) {
      return dnsParsed;
    }
    decodeSingle(
      reader,
      'questions',
      dnsParsed.questions,
      errors,
      Question.decode,
      header.qdcount,
    );
    decodeSingle(
      reader,
      'answers',
      dnsParsed.answers,
      errors,
      decoder,
      header.ancount,
    );
    decodeSingle(
      reader,
      'authorities',
      dnsParsed.authorities,
      errors,
      decoder,
      header.nscount,
    );
    decodeSingle(
      reader,
      'additionals',
      dnsParsed.additionals,
      errors,
      decoder,
      header.arcount,
    );
    return dnsParsed;
  }

  static encode(
    dnsEntry: DnsPacket,
    errors: string[],
    encoder: EncodeFunction,
  ) {
    const writer = new BufferWriter();
    dnsEntry.header.qdcount = dnsEntry.questions.length;
    dnsEntry.header.ancount = dnsEntry.answers.length;
    dnsEntry.header.nscount = dnsEntry.authorities.length;
    dnsEntry.header.arcount = dnsEntry.additionals.length;
    Header.encode(writer, dnsEntry.header);
    encodeSingle(
      writer,
      'questions',
      dnsEntry.questions,
      errors,
      Question.encode,
    );
    encodeSingle(writer, 'answers', dnsEntry.answers, errors, encoder);
    encodeSingle(writer, 'authorities', dnsEntry.authorities, errors, encoder);
    encodeSingle(writer, 'additionals', dnsEntry.additionals, errors, encoder);

    return writer.toBuffer();
  }
}
