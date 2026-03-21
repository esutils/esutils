import { invert, invertValues } from '@esutils/invert';
import { BufferReader } from './reader.mjs';
import { BufferWriter } from './writer.mjs';

export { BufferReader } from './reader.mjs';
export { BufferWriter } from './writer.mjs';

/**
 * [QUERY_TYPE description]
 * @type {Object}
 * @docs List of DNS record types
 * https://en.wikipedia.org/wiki/List_of_DNS_record_types
 * https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-4
 */
export const TYPE = {
  // 3.2.2. TYPE values https://datatracker.ietf.org/doc/html/rfc1035#section-3.2.2
  A: 1, // a host address
  NS: 2, // an authoritative name server
  MD: 3, // a mail destination (OBSOLETE - use MX)
  MF: 4, // a mail forwarder (OBSOLETE - use MX)
  CNAME: 5, // the canonical name for an alias
  SOA: 6, // marks the start of a zone of authority
  MB: 7, // a mailbox domain name (EXPERIMENTAL)
  MG: 8, // a mail group member (EXPERIMENTAL)
  MR: 9, // a mail rename domain name (EXPERIMENTAL)
  NULL: 10, // a null RR (EXPERIMENTAL)
  WKS: 11, // a well known service description
  PTR: 12, // a domain name pointer
  HINFO: 13, // host information
  MINFO: 14, // mailbox or mail list information
  MX: 15, // mail exchange
  TXT: 16, // text strings

  RP: 17, // https://datatracker.ietf.org/doc/html/rfc1183#section-2.2 for Responsible Person
  AFSDB: 18, // https://datatracker.ietf.org/doc/html/rfc1183#section-1 for AFS Data Base location
  X25: 19, // https://datatracker.ietf.org/doc/html/rfc1183#section-3.1 for X.25 PSDN address
  ISDN: 20, // https://datatracker.ietf.org/doc/html/rfc1183#section-3.2 for ISDN address
  RT: 21, // https://datatracker.ietf.org/doc/html/rfc1183#section-3.3 for Route Through

  AAAA: 28, // https://datatracker.ietf.org/doc/html/rfc3596#section-2.1 DNS Extensions to Support IP Version 6
  SRV: 33, // https://datatracker.ietf.org/doc/html/rfc8553#section-3.1 SRV Specification Changes
  NAPTR: 35, // https://datatracker.ietf.org/doc/html/rfc3403#section-4 NAPTR RR Format
  DNAME: 39, // https://datatracker.ietf.org/doc/html/rfc6672#section-2 The DNAME Resource Record
  OPT: 41, // https://datatracker.ietf.org/doc/html/rfc6891 This is a pseudo-record type needed to support EDNS.
  RRSIG: 46, // https://datatracker.ietf.org/doc/html/rfc4034#section-3 RRSIG
  NSEC: 47, // https://datatracker.ietf.org/doc/html/rfc4034#section-4 NSEC
  DNSKEY: 48, // https://datatracker.ietf.org/doc/html/rfc4034#section-2 DNSKEY
  CDS: 59, // https://datatracker.ietf.org/doc/html/rfc7344#section-3.1 Child DS
  CDNSKEY: 60, // https://datatracker.ietf.org/doc/html/rfc7344#section-3.2 DNSKEY(s) the Child wants reflected in DS
  SVCB: 64, // https://datatracker.ietf.org/doc/html/rfc9460 General-purpose service binding
  HTTPS: 65, // https://datatracker.ietf.org/doc/html/rfc9460 SVCB-compatible type for use with HTTP
  SPF: 99, // https://datatracker.ietf.org/doc/html/rfc7208

  // 3.2.3. QTYPE values https://datatracker.ietf.org/doc/html/rfc1035#section-3.2.3
  AXFR: 252, // A request for a transfer of an entire zone
  MAILB: 253, // mailbox-related RRs (MB, MG or MR)
  MAILA: 254, // mail agent RRs (OBSOLETE - see MX)
  ANY: 255, // * A request for some or all records the server has available

  CAA: 257, // 257 https://datatracker.ietf.org/doc/html/rfc8659#section-4.1 Certification Authority Restriction
};

export const TYPE_INVERTED = invert(TYPE);

// https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-4
export const ResourceRecordTypes = invertValues(TYPE);

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
 * @docs https://www.iana.org/assignments/dns-parameters/dns-parameters.xhtml#dns-parameters-11
 */
export const EDNS_OPTION_CODE = {
  ECS: 0x08, // OPTION-CODE = 8 https://datatracker.ietf.org/doc/html/rfc7871#section-6
  COOKIE: 0x0a, // OPTION-CODE = 10 https://datatracker.ietf.org/doc/html/rfc7873#section-4
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

export interface DnsBasicState {
  errors: string[];
  // Map from domain name offset to the domain name parts array, used for name decompression and compression
  domainNameMap: Map<number, string[]>;
}

export interface DnsDecodeState extends DnsBasicState {
  reader: BufferReader;
  textDecoder: TextDecoder;
}

export interface DnsEncodeState extends DnsBasicState {
  writer: BufferWriter;
  textEncoder: TextEncoder;
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
  optionCode: number;
}

// https://datatracker.ietf.org/doc/html/rfc7871#section-6
export interface DnsResourceECS extends DnsResourceEDNS {
  family: number;
  sourcePrefixLength: number;
  scopePrefixLength: number;
  ip: string;
}

// https://datatracker.ietf.org/doc/html/rfc7873#section-4
export interface DnsResourceDnsCookie extends DnsResourceEDNS {
  clientCookie: Uint8Array; // (fixed size, 8 bytes)
  serverCookie?: Uint8Array; // (variable size, 8 to 32 bytes)
}

// https://datatracker.ietf.org/doc/html/rfc6891#section-6.1.2
export interface DnsResourceOPT extends DnsResourceAddress {
  rdata: DnsResourceEDNS[];
}

export interface DnsResourceNS extends DnsResource {
  ns: string;
}

export interface DnsResourceCNAME extends DnsResource {
  domain: string;
}

// https://datatracker.ietf.org/doc/html/rfc6672#section-2
export interface DnsResourceDNAME extends DnsResource {
  target: string;
  compression: boolean;
}

// https://datatracker.ietf.org/doc/html/rfc9460#name-the-svcb-record-type
export interface DnsResourceSVCB extends DnsResource {
  svcPriority: number;
  targetName: string;
  svcParams: Uint8Array;
}

// https://datatracker.ietf.org/doc/html/rfc3403#section-4
export interface DnsResourceNAPTR extends DnsResource {
  order: number;
  preference: number;
  flags: string;
  services: string;
  regexp: string;
  replacement: string;
}

// https://datatracker.ietf.org/doc/html/rfc1035#section-3.3.14
export interface DnsResourceSPF extends DnsResource {
  characterStrings: string[];
}

// https://datatracker.ietf.org/doc/html/rfc1035#section-3.3.13
export interface DnsResourceSOA extends DnsResource {
  primary: string;
  admin: string;
  serial: number;
  refresh: number;
  retry: number;
  expiration: number;
  minimum: number;
}

export interface DnsResourceHINFO extends DnsResource {
  cpu: string;
  os: string;
}

// https://datatracker.ietf.org/doc/html/rfc2782
export interface DnsResourceSRV extends DnsResource {
  priority: number;
  weight: number;
  port: number;
  target: string;
}

/**
 * [Header description]
 * @type {Object}
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
  static decode(state: DnsDecodeState) {
    const { reader } = state;
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
  static encode(state: DnsEncodeState, header: HeaderInfo) {
    const { writer } = state;
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
 * @docs https://datatracker.ietf.org/doc/html/rfc1035#section-4.1.4
 * @return {[type]}        [description]
 */
export class Name {
  public static LENGTH_BITS: number = 6;
  public static LENGTH_MASK: number = (1 << Name.LENGTH_BITS) - 1;

  /**
   * @param reader
   * @param length When length provided, means the name decoded is the latest domain name of the resource record, so that
   *  it's length is limited by the resource record length, and the reader should not read beyond the resource record body.
   * @returns
   */
  static decode(state: DnsDecodeState, info: DnsBasic) {
    const { reader } = state;
    const name = [];
    let o: number | undefined;
    const offset = reader.offset;
    let len = reader.read(8);
    let readed = 0;
    while (len) {
      const compressionSign = len >> Name.LENGTH_BITS;
      switch (compressionSign) {
        case 0x3: {
          const next_byte = reader.read(8);
          const pos = ((len & Name.LENGTH_MASK) << 8) | next_byte;
          const offsetDelta = pos * 8 - reader.offset;
          if (offsetDelta >= -16) {
            // Pointer to the current position or other invalid position, skip out
            info.errors.push(`Decode domain name with invalid offsetDelta: ${offsetDelta} at offset: ${offset} bytes`);
            len = 0;
          } else {
            if (o === undefined) o = reader.offset;
            reader.offset = pos * 8;
            len = reader.read(8);
          }
          break;
        }
        case 0x00: {
          let part = '';
          while (len > 0) {
            len -= 1;
            part += String.fromCharCode(reader.read(8));
          }
          name.push(part);
          len = reader.read(8);
          break;
        }
        default:
          // (The 10 and 01 combinations are reserved for future use.)
          len = 0;
          info.errors.push(`Decode domain name comes with compressionSign: ${compressionSign} at offset: ${offset} bytes`);
          break;
      }
    }
    if (o !== undefined) {
      reader.offset = o;
    }
    readed = (reader.offset - offset) >> 3;
    return { name: name.join('.'), readed: readed };
  }

  static encode(state: DnsEncodeState, domain: string) {
    const { writer } = state;
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

export class CharacterString {
  static decode(state: DnsDecodeState) {
    const { reader } = state;
    const len = reader.read(8);
    const cs = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      cs[i] = reader.read(8);
    }
    return { cs: state.textDecoder.decode(cs), readed: len + 1 };
  }

  static encode(state: DnsEncodeState, s: string, info: DnsBasic) {
    const { writer } = state;
    const cs = state.textEncoder.encode(s);
    if (cs.length <= 255) {
      writer.write(cs.length, 8);
      for (let i = 0; i < cs.length; i += 1) {
        writer.write(cs[i], 8);
      }
    } else {
      info.errors.push(
        `Invalid cs.length:${cs.length} for ${JSON.stringify(info)}`,
      );
    }
  }
}

/**
 * Question section format
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.2
 */
export class Question {
  static create(name?: string, type?: number, cls?: number): DnsQuestion {
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
  static decode(this: void, state: DnsDecodeState, question: DnsQuestion) {
    const { reader } = state;
    const { name } = Name.decode(state, question);
    question.name = name;
    question.type = reader.read(16);
    question.class = reader.read(16);
  }

  static encode(this: void, state: DnsEncodeState, question: DnsQuestion) {
    const { writer } = state;
    Name.encode(state, question.name);
    writer.write(question.type, 16);
    writer.write(question.class, 16);
  }
}

/**
 * Resource record format
 * @docs https://tools.ietf.org/html/rfc1035#section-4.1.3
 */
export class Resource {
  static encodeLengthReserve(state: DnsEncodeState, bitLength: number = 16) {
    const { writer } = state;
    // Reserve bitLength bits for resource length
    const offset = writer.buffer.length;
    writer.write(0, bitLength);
    return offset;
  }

  static encodeLength(
    state: DnsEncodeState,
    offset: number,
    bitLength: number = 16,
  ) {
    const { writer } = state;
    const lengthInBits = writer.buffer.length - offset - bitLength;
    writer.update(offset, lengthInBits >> 3, bitLength);
  }

  /**
   * [encode description]
   * @param  writer [description]
   * @param  info   [description]
   * @return The offset of the reserved 16 bits for resource body length
   */
  static encode(state: DnsEncodeState, info: DnsResource) {
    const { writer } = state;
    Name.encode(state, info.name);
    writer.write(info.type, 16);
    writer.write(info.class, 16);
    writer.write(info.ttl, 32);
    // Reserve 16 bits for resource length
    return Resource.encodeLengthReserve(state, 16);
  }

  /**
   * [decode description]
   * @param  {[type]} reader [description]
   * @return The length of the resource body
   */
  static decode(state: DnsDecodeState, info: DnsResource) {
    const { reader } = state;
    const { name } = Name.decode(state, info);
    info.name = name;
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
  static encode(state: DnsEncodeState, info: DnsResourceA) {
    const { writer } = state;
    const parts = info.address.split('.');
    for (const part of parts) {
      writer.write(parseInt(part, 10), 8);
    }
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceA) {
    const { reader } = state;
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
  static encode(state: DnsEncodeState, info: DnsResourceAAAA) {
    const { writer } = state;
    const parts = info.address.split(':');
    for (const part of parts) {
      writer.write(parseInt(part, 16), 16);
    }
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceAAAA) {
    const { reader } = state;
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
  static encode(state: DnsEncodeState, info: DnsResourceCNAME) {
    Name.encode(state, info.domain);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceCNAME) {
    const { name, readed: readedName } = Name.decode(state, info);
    length -= readedName;
    if (length !== 0) {
      info.errors.push(
        `ResourceCNAME decode ${JSON.stringify(info)} failed ${length}`,
      );
    }
    info.domain = name;
  }
}

/**
 * [DNAME description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc6672#section-2
 */
export class ResourceDNAME {
  static encode(state: DnsEncodeState, info: DnsResourceDNAME) {
    // TODO: DNAME can not be compressed
    Name.encode(state, info.target);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceDNAME) {
    const { name, readed: readedName } = Name.decode(state, info);
    length -= readedName;
    if (length !== 0) {
      info.errors.push(
        `ResourceDNAME decode ${JSON.stringify(info)} failed ${length}`,
      );
    }
    info.target = name;
    info.compression = false;
  }
}

/**
 * [SVCB/HTTPS description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc9460#name-the-svcb-record-type
 */
export class ResourceSVCB {
  static encode(state: DnsEncodeState, info: DnsResourceSVCB) {
    const { writer } = state;
    writer.write(info.svcPriority, 16);
    Name.encode(state, info.targetName);
    for (let i = 0; i < info.svcParams.length; i += 1) {
      writer.write(info.svcParams[i], 8);
    }
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceSVCB) {
    const { reader } = state;
    info.svcPriority = reader.read(16);
    length -= 2;
    const { name: targetName, readed: readedTarget } = Name.decode(state, info);
    length -= readedTarget;
    info.targetName = targetName;
    info.svcParams = new Uint8Array(length);
    for (let i = 0; i < info.svcParams.length; i += 1) {
      info.svcParams[i] = reader.read(8);
    }
  }
}

/**
 * [NAPTR description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc3403#section-4.1
 */
export class ResourceNAPTR {
  static encode(state: DnsEncodeState, info: DnsResourceNAPTR) {
    const { writer } = state;
    writer.write(info.order, 16);
    writer.write(info.preference, 16);
    CharacterString.encode(state, info.flags, info);
    CharacterString.encode(state, info.services, info);
    CharacterString.encode(state, info.regexp, info);
    Name.encode(state, info.replacement);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceNAPTR) {
    const { reader } = state;
    info.order = reader.read(16);
    length -= 2;
    info.preference = reader.read(16);
    length -= 2;
    const { cs: flags, readed: readedFlags } = CharacterString.decode(state);
    info.flags = flags;
    length -= readedFlags;
    const { cs: services, readed: readedServices } =
      CharacterString.decode(state);
    info.services = services;
    length -= readedServices;
    const { cs: regexp, readed: readedRegexp } = CharacterString.decode(state);
    info.regexp = regexp;
    length -= readedRegexp;
    const { name: replacement, readed: readedReplacement } = Name.decode(state, info);
    info.replacement = replacement;
    length -= readedReplacement;
    if (length != 0) {
      info.errors.push(`ResourceNAPTR decode ${JSON.stringify(info)} failed`);
    }
  }
}

/**
 * [MX description]
 * @param {[type]} exchange [description]
 * @param {[type]} priority [description]
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.9
 */
export class ResourceMX {
  static encode(state: DnsEncodeState, info: DnsResourceMX) {
    const { writer } = state;
    writer.write(info.priority, 16);
    Name.encode(state, info.exchange);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceMX) {
    const { reader } = state;
    info.priority = reader.read(16);
    length -= 2;
    const { name: exchange, readed: readedExchange } = Name.decode(state, info);
    info.exchange = exchange;
    length -= readedExchange;
    if (length != 0) {
      info.errors.push(`ResourceMX decode ${JSON.stringify(info)} failed`);
    }
  }
}

/**
 * [NS description]
 * @type {Object}
 * @docs https://tools.ietf.org/html/rfc1035#section-3.3.11
 */
export class ResourceNS {
  static encode(state: DnsEncodeState, info: DnsResourceNS) {
    Name.encode(state, info.ns);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceNS) {
    const { name, readed } = Name.decode(state, info);
    info.ns = name;
    length -= readed;
    if (length != 0) {
      info.errors.push(`ResourceNS decode ${JSON.stringify(info)} failed`);
    }
  }
}

/**
 * [SPF/TXT description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc1035#section-3.3.14
 */
export class ResourceSPF {
  static encode(state: DnsEncodeState, info: DnsResourceSPF) {
    // write each string to output
    for (const characterString of info.characterStrings) {
      CharacterString.encode(state, characterString, info);
    }
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceSPF) {
    const characterStrings = [] as string[];
    let bytesRead = 0;

    while (bytesRead < length) {
      const { cs: characterString, readed } = CharacterString.decode(state);
      characterStrings.push(characterString);
      bytesRead += readed;
    }
    length -= bytesRead;
    if (length != 0) {
      info.errors.push(`ResourceSPF decode ${JSON.stringify(info)} failed`);
    }
    info.characterStrings = characterStrings;
  }
}

/**
 * [SOA description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc1035#section-3.3.13
 */
export class ResourceSOA {
  static encode(state: DnsEncodeState, info: DnsResourceSOA) {
    Name.encode(state, info.primary);
    Name.encode(state, info.admin);
    const { writer } = state;
    writer.write(info.serial, 32);
    writer.write(info.refresh, 32);
    writer.write(info.retry, 32);
    writer.write(info.expiration, 32);
    writer.write(info.minimum, 32);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceSOA) {
    const { name: primary, readed: readedPrimary } = Name.decode(state, info);
    info.primary = primary;
    length -= readedPrimary;
    const { name: admin, readed: readedAdmin } = Name.decode(state, info);
    info.admin = admin;
    length -= readedAdmin;
    const { reader } = state;
    info.serial = reader.read(32);
    info.refresh = reader.read(32);
    info.retry = reader.read(32);
    info.expiration = reader.read(32);
    info.minimum = reader.read(32);
    length -= 20;
    if (length != 0) {
      info.errors.push(`ResourceSOA decode ${JSON.stringify(info)} failed`);
    }
  }
}

/**
 * [HINFO description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc1035#section-3.3.2
 */
export class ResourceHINFO {
  static encode(state: DnsEncodeState, info: DnsResourceHINFO) {
    CharacterString.encode(state, info.cpu, info);
    CharacterString.encode(state, info.os, info);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceHINFO) {
    const { cs: cpu, readed: readedCpu } = CharacterString.decode(state);
    info.cpu = cpu;
    length -= readedCpu;
    const { cs: os, readed: readedOs } = CharacterString.decode(state);
    info.os = os;
    length -= readedOs;

    if (length != 0) {
      info.errors.push(`ResourceHINFO decode ${JSON.stringify(info)} failed`);
    }
  }
}

/**
 * [SRV description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc2782
 */
export class ResourceSRV {
  static encode(state: DnsEncodeState, info: DnsResourceSRV) {
    const { writer } = state;
    writer.write(info.priority, 16);
    writer.write(info.weight, 16);
    writer.write(info.port, 16);
    Name.encode(state, info.target);
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceSRV) {
    const { reader } = state;
    info.priority = reader.read(16);
    info.weight = reader.read(16);
    info.port = reader.read(16);
    length -= 6;
    const { name: target, readed: readedTarget } = Name.decode(state, info);
    info.target = target;
    length -= readedTarget;
    if (length != 0) {
      info.errors.push(`ResourceSRV decode ${JSON.stringify(info)} failed`);
    }
  }
}

export class ECS {
  static create(clientIp: string): DnsResourceECS {
    const [ip, prefixLength] = clientIp.split('/');
    const numPrefixLength = parseInt(prefixLength) || 32;
    return {
      optionCode: EDNS_OPTION_CODE.ECS,
      family: 1,
      sourcePrefixLength: numPrefixLength,
      scopePrefixLength: 0,
      ip,
    };
  }

  static decode(state: DnsDecodeState, length: number): DnsResourceECS {
    const { reader } = state;
    const rdata: DnsResourceECS = {
      optionCode: EDNS_OPTION_CODE.ECS,
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

  static encode(state: DnsEncodeState, rdata: DnsResourceECS) {
    const { writer } = state;
    const ip = rdata.ip.split('.').map((s) => parseInt(s));
    writer.write(rdata.family, 16);
    writer.write(rdata.sourcePrefixLength, 8);
    writer.write(rdata.scopePrefixLength, 8);
    writer.write(ip[0], 8);
    writer.write(ip[1], 8);
    writer.write(ip[2], 8);
    writer.write(ip[3], 8);
  }
}

export class DnsCookie {
  static create(
    clientCookie: Uint8Array,
    serverCookie?: Uint8Array,
  ): DnsResourceDnsCookie {
    const clientCookieCopied = new Uint8Array(clientCookie);
    let serverCookieCopied: Uint8Array | undefined;
    if (serverCookie) {
      serverCookieCopied = new Uint8Array(serverCookie);
    }
    return {
      optionCode: EDNS_OPTION_CODE.COOKIE,
      clientCookie: clientCookieCopied,
      serverCookie: serverCookieCopied,
    };
  }

  static decode(state: DnsDecodeState, length: number): DnsResourceDnsCookie {
    const { reader } = state;
    const clientCookie = new Uint8Array(8);
    for (let i = 0; i < 8; i += 1) {
      clientCookie[i] = reader.read(8);
    }
    let serverCookie: Uint8Array | undefined;
    length -= 8;
    if (length > 0) {
      serverCookie = new Uint8Array(length);
      for (let i = 0; i < serverCookie.length; i += 1) {
        serverCookie[i] = reader.read(i);
      }
    }
    const rdata: DnsResourceDnsCookie = {
      optionCode: EDNS_OPTION_CODE.COOKIE,
      clientCookie: clientCookie,
      serverCookie: serverCookie,
    };
    return rdata;
  }

  static encode(
    state: DnsEncodeState,
    rdata: DnsResourceDnsCookie,
    info: DnsResourceOPT,
  ) {
    const { writer } = state;
    if (rdata.clientCookie.length == 8) {
      for (let i = 0; i < 8; i += 1) {
        writer.write(rdata.clientCookie[i], 8);
      }
    } else {
      for (let i = 0; i < 8; i += 1) {
        writer.write(rdata.clientCookie[i], 0);
      }
      info.errors.push(
        `Invalid clientCookie length:${rdata.clientCookie.length}`,
      );
    }
    if (rdata.serverCookie) {
      for (let i = 0; i < rdata.serverCookie.length; i += 1) {
        writer.write(rdata.serverCookie[i], 8);
      }
    }
  }
}

/**
 * [Extension Mechanisms for DNS description]
 * @type {Object}
 * @docs https://datatracker.ietf.org/doc/html/rfc6891
 */
export class ResourceOPT {
  static encode(state: DnsEncodeState, info: DnsResourceOPT) {
    for (const rdata of info.rdata) {
      state.writer.write(rdata.optionCode, 16);
      const offsetOptionRdata = Resource.encodeLengthReserve(state, 16);
      switch (rdata.optionCode) {
        case EDNS_OPTION_CODE.ECS:
          ECS.encode(state, rdata as DnsResourceECS);
          break;
        case EDNS_OPTION_CODE.COOKIE:
          DnsCookie.encode(state, rdata as DnsResourceDnsCookie, info);
          break;
        default:
          info.errors.push(
            `ResourceOPT encode do not supported optionCode ${rdata.optionCode}`,
          );
          break;
      }
      Resource.encodeLength(state, offsetOptionRdata, 16);
    }
  }

  static decode(state: DnsDecodeState, length: number, info: DnsResourceOPT) {
    const { reader } = state;
    info.rdata = [];
    while (length) {
      const optionCode = reader.read(16);
      const optionLength = reader.read(16); // In octet (https://tools.ietf.org/html/rfc6891#page-8)
      switch (optionCode) {
        case EDNS_OPTION_CODE.ECS: {
          info.rdata.push(ECS.decode(state, optionLength));
          break;
        }
        case EDNS_OPTION_CODE.COOKIE: {
          info.rdata.push(DnsCookie.decode(state, optionLength));
          break;
        }
        default:
          reader.read(optionLength); // Ignore data that doesn't understand
          info.errors.push(
            `ResourceOPT decode do not supported optionCode ${optionCode}: optionLength:${optionLength}`,
          );
          break;
      }

      length = length - 4 - optionLength;
    }
  }
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

export function encodeResource(state: DnsEncodeState, info: DnsResource) {
  const offset = Resource.encode(state, info);
  switch (info.type) {
    case TYPE.A:
      ResourceA.encode(state, info as DnsResourceA);
      break;
    case TYPE.NS:
      ResourceNS.encode(state, info as DnsResourceNS);
      break;
    case TYPE.CNAME:
    case TYPE.PTR:
      ResourceCNAME.encode(state, info as DnsResourceCNAME);
      break;
    case TYPE.SOA:
      ResourceSOA.encode(state, info as DnsResourceSOA);
      break;
    case TYPE.HINFO:
      ResourceHINFO.encode(state, info as DnsResourceHINFO);
      break;
    case TYPE.MX:
      ResourceMX.encode(state, info as DnsResourceMX);
      break;
    case TYPE.TXT:
    case TYPE.SPF:
      ResourceSPF.encode(state, info as DnsResourceSPF);
      break;
    case TYPE.AAAA:
      ResourceAAAA.encode(state, info as DnsResourceAAAA);
      break;
    case TYPE.SRV:
      ResourceSRV.encode(state, info as DnsResourceSRV);
      break;
    case TYPE.NAPTR:
      ResourceNAPTR.encode(state, info as DnsResourceNAPTR);
      break;
    case TYPE.DNAME:
      ResourceDNAME.encode(state, info as DnsResourceDNAME);
      break;
    case TYPE.OPT /* EDNS */:
      ResourceOPT.encode(state, info as DnsResourceOPT);
      break;
    case TYPE.SVCB:
    case TYPE.HTTPS:
      ResourceSVCB.encode(state, info as DnsResourceSVCB);
      break;
    default:
      info.errors.push(
        `encodeResource Not supported DNS TYPE ${TYPE_INVERTED[info.type]}:${info.type}`,
      );
  }
  Resource.encodeLength(state, offset);
}

function decodeResource(state: DnsDecodeState, info: DnsResource) {
  const length = Resource.decode(state, info);
  switch (info.type) {
    case TYPE.A:
      ResourceA.decode(state, length, info as DnsResourceA);
      break;
    case TYPE.NS:
      ResourceNS.decode(state, length, info as DnsResourceNS);
      break;
    case TYPE.CNAME:
    case TYPE.PTR:
      ResourceCNAME.decode(state, length, info as DnsResourceCNAME);
      break;
    case TYPE.SOA:
      ResourceSOA.decode(state, length, info as DnsResourceSOA);
      break;
    case TYPE.HINFO:
      ResourceHINFO.decode(state, length, info as DnsResourceHINFO);
      break;
    case TYPE.MX:
      ResourceMX.decode(state, length, info as DnsResourceMX);
      break;
    case TYPE.TXT:
    case TYPE.SPF:
      ResourceSPF.decode(state, length, info as DnsResourceSPF);
      break;
    case TYPE.AAAA:
      ResourceAAAA.decode(state, length, info as DnsResourceAAAA);
      break;
    case TYPE.SRV:
      ResourceSRV.decode(state, length, info as DnsResourceSRV);
      break;
    case TYPE.NAPTR:
      ResourceNAPTR.decode(state, length, info as DnsResourceNAPTR);
      break;
    case TYPE.DNAME:
      ResourceDNAME.decode(state, length, info as DnsResourceDNAME);
      break;
    case TYPE.OPT /* EDNS */:
      ResourceOPT.decode(state, length, info as DnsResourceOPT);
      break;
    case TYPE.SVCB:
    case TYPE.HTTPS:
      ResourceSVCB.decode(state, length, info as DnsResourceSVCB);
      break;
    default: {
      const bufferToSkip = new Uint8Array(length);
      for (let i = 0; i < length; i += 1) {
        bufferToSkip[i] = state.reader.read(8);
      }
      info.errors.push(
        `decodeResource Not supported DNS TYPE ${TYPE_INVERTED[info.type]}:${info.type} {${bufferToSkip.toString()}}`,
      );
    }
  }
}

function decodeSingle(
  state: DnsDecodeState,
  tag: string,
  parsed: DnsBasic[],
  count: number,
  isQuestion: boolean = false,
) {
  for (let i = 0; i < count; i += 1) {
    try {
      const info = createDnsBasic();
      if (isQuestion) {
        Question.decode(state, info);
      } else {
        decodeResource(state, info as DnsResource);
      }
      if (info.errors.length > 0) {
        state.errors.push(
          `decode ${tag} ${i} has errors: ${info.errors.join(';')}`,
        );
      }
      parsed.push(info);
    } catch (e) {
      state.errors.push((e as Error).message);
    }
  }
}

function encodeSingle(
  state: DnsEncodeState,
  tag: string,
  dnsBasicList: DnsBasic[],
  isQuestion: boolean = false,
) {
  for (let i = 0; i < dnsBasicList.length; i += 1) {
    try {
      const info = dnsBasicList[i];
      if (isQuestion) {
        Question.encode(state, info as DnsQuestion);
      } else {
        encodeResource(state, info as DnsResource);
      }
      if (info.errors.length > 0) {
        state.errors.push(`${tag} ${i} has errors: ${info.errors.join(';')}`);
      }
    } catch (e) {
      state.errors.push((e as Error).message);
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

  static createDnsDecodeState(
    buffer: Uint8Array,
    decoder: TextDecoder,
    errors: string[],
  ): DnsDecodeState {
    return {
      errors: errors,
      textDecoder: decoder,
      reader: new BufferReader(buffer),
      domainNameMap: new Map<number, string[]>(),
    };
  }

  static createDnsEncodeState(
    encoder: TextEncoder,
    errors: string[],
  ): DnsEncodeState {
    return {
      errors: errors,
      textEncoder: encoder,
      writer: new BufferWriter(),
      domainNameMap: new Map<number, string[]>(),
    };
  }

  /**
   * [random header id]
   * @return {[type]} [description]
   */
  static randomHeaderId() {
    return (Math.random() * 65535) | 0;
  }

  static decode(buffer: Uint8Array, decoder: TextDecoder, errors: string[]) {
    const state: DnsDecodeState = Packet.createDnsDecodeState(
      buffer,
      decoder,
      errors,
    );
    const dnsParsed = Packet.create();
    let header: HeaderInfo | undefined;
    try {
      header = Header.decode(state);
      dnsParsed.header = header;
    } catch (e) {
      state.errors.push(`Error decoding DNS header: ${(e as Error).message}`);
    }
    if (!header) {
      return dnsParsed;
    }
    decodeSingle(state, 'questions', dnsParsed.questions, header.qdcount, true);
    decodeSingle(state, 'answers', dnsParsed.answers, header.ancount);
    decodeSingle(state, 'authorities', dnsParsed.authorities, header.nscount);
    decodeSingle(state, 'additionals', dnsParsed.additionals, header.arcount);
    return dnsParsed;
  }

  static encode(dnsEntry: DnsPacket, encoder: TextEncoder, errors: string[]) {
    const state = Packet.createDnsEncodeState(encoder, errors);
    dnsEntry.header.qdcount = dnsEntry.questions.length;
    dnsEntry.header.ancount = dnsEntry.answers.length;
    dnsEntry.header.nscount = dnsEntry.authorities.length;
    dnsEntry.header.arcount = dnsEntry.additionals.length;
    Header.encode(state, dnsEntry.header);
    encodeSingle(state, 'questions', dnsEntry.questions, true);
    encodeSingle(state, 'answers', dnsEntry.answers);
    encodeSingle(state, 'authorities', dnsEntry.authorities);
    encodeSingle(state, 'additionals', dnsEntry.additionals);

    return state.writer.toBuffer();
  }
}
