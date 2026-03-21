import {
  checkResourcePacketDecodeInvalid,
  checkResourcePacketEncodeDecode,
} from './dns-packet-util';

// nslookup -type=any bing.com
describe('dns-packet ANY', () => {
  it('Packet#ANY#request', function () {
    const expectedRequest_ANY = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 2,
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
      questions: [{ class: 1, errors: [], name: 'bing.com', type: 255 }],
    };
    checkResourcePacketEncodeDecode(
      true,
      '0002010000010000000000000462696e6703636f6d0000ff0001',
      expectedRequest_ANY,
    );
  });

  it('Packet#ANY#response#invalid', function () {
    // nslookup -type=any bing.com 180.76.76.76
    checkResourcePacketDecodeInvalid(
      '000281800001000d000000000462696e6703636f6d0000ff0001c00c000d000100000e920009075246433834383200c00c001c0001000000a80010262001ec003300010000000000000010c00c0001000100000214000496ab1c0ac00c0001000100000214000496ab1b0ac00c000200010001ef660018076e73342d32303409617a7572652d646e7304696e666f00c00c000200010001ef66001404646e733303703039056e736f6e65036e657400c00c000200010001ef66000704646e7334c0bcc00c000200010001ef660014076e73322d32303409617a7572652d646e73c0c6c00c000200010001ef66000704646e7331c0bcc00c000200010001ef660014076e73312d32303409617a7572652d646e73c011c00c000200010001ef660017076e73332d32303409617a7572652d646e73036f726700c00c000200010001ef66000704646e7332c0bcc00c001c0001000000a80010262001ec003300000000000000000010',
      [
        'decode answers 6 has errors: Decode domain name comes with compressionSign: 1 at offset: 1496 bytes',
        'decode answers 8 has errors: Decode domain name comes with compressionSign: 1 at offset: 1904 bytes',
        'decode answers 11 has errors: Decode domain name comes with compressionSign: 1 at offset: 2592 bytes',
      ],
    );

    checkResourcePacketDecodeInvalid(
      '000281800001000b000000000462696e6703636f6d0000ff0001c00c00020001000214cb000704646e7334c086c00c00020001000214cb0017076e73332d32303409617a7572652d646e73036f726700c00c00020001000214cb000704646e7331c086c00c00020001000214cb0018076e73342d32303409617a7572652d646e7304696e666f00c00c00020001000214cb000704646e7332c086c00c00020001000214cb0017076e73312d32303409617a7572652d646e7303636f6d00c00c000d00010000092d0009075246433834383200c00c001c0001000008a70010262001ec003300010000000000000010c00c001c0001000008a70010262001ec003300000000000000000010c00c00020001000214cb0017076e73322d32303409617a7572652d646e73036e657400c00c00020001000214cb001404646e733303703039056e736f6e65036e657400',
      [
        'decode answers 0 has errors: Decode domain name with invalid offsetDelta: 712 at offset: 304 bytes',
        'decode answers 2 has errors: Decode domain name with invalid offsetDelta: 280 at offset: 736 bytes',
      ],
    );

    checkResourcePacketDecodeInvalid(
      '000281800001000c000000000462696e6703636f6d0000ff0001c00c000200010000144f0014076e73312d32303409617a7572652d646e73c011c00c000200010000144f0017076e73332d32303409617a7572652d646e73036f726700c00c000200010000144f001404646e733303703039056e736f6e65036e657400c00c000200010000144f000704646e7332c0c6c00c000200010000144f0014076e73322d32303409617a7572652d646e73c0d0c00c000200010000144f000704646e7331c0c6c00c000200010000144f000704646e7334c0c6c00c000200010000144f0018076e73342d32303409617a7572652d646e7304696e666f00c00c000100010000077b000496ab1c0ac00c000100010000077b000496ab1b0ac00c001c0001000007710010262001ec003300010000000000000010c00c001c0001000007710010262001ec003300000000000000000010',
      [
        'decode answers 3 has errors: Decode domain name with invalid offsetDelta: 432 at offset: 1096 bytes',
        'decode answers 4 has errors: Decode domain name with invalid offsetDelta: 256 at offset: 1248 bytes',
        'decode answers 5 has errors: Decode domain name with invalid offsetDelta: 24 at offset: 1504 bytes',
      ],
    );

    checkResourcePacketDecodeInvalid(
      '000283800001000a000000000462696e6703636f6d0000ff0001c00c0010000100000563002f2e763d7370663120696e636c7564653a7370662e70726f74656374696f6e2e6f75746c6f6f6b2e636f6d202d616c6cc00c0010000100000563003c3b66616365626f6f6b2d646f6d61696e2d766572696669636174696f6e3d3039796738757a63666e716e6c71656b7a7362776a787979387264636b37c00c0010000100000563004544676f6f676c652d736974652d766572696669636174696f6e3d4f6b5259385232363173684b3542387545777673465a70396e513267526f486176476c72756f6b31617a63c00c0010000100000563004544676f6f676c652d736974652d766572696669636174696f6e3d53487553484e304876336e77424939536f3332394b7766625137784c6966363453527763475364574e4155c00c0010000100000563002e2d763d6d73763120743d36303937413745412d353346372d343032382d424137362d363836394342323834433534c00c00020001000091930017076e73322d32303409617a7572652d646e73036e657400c00c0002000100009193001104646e733203703039056e736f6e65c1b7c00c00020001000091930017076e73332d32303409617a7572652d646e73036f726700c00c000100010000013c000496ab1c0ac00c000100010000013c000496ab1b0a',
      [
        'decode answers 6 has errors: Decode domain name with invalid offsetDelta: -16 at offset: 3392 bytes',
      ],
    );

    checkResourcePacketDecodeInvalid(
      '000281800001000d000000000462696e6703636f6d0000ff0001c00c001c00010000013a0010262001ec003300010000000000000010c00c0001000100000c98000496ab1c0ac00c0001000100000c98000496ab1b0ac00c0002000100025498001404646e733103703039056e736f6e65036e657400c00c00020001000254980017076e73322d32303409617a7572652d646e73036e657400c00c00020001000254980017076e73312d32303409617a7572652d646e7303636f6d00c00c0002000100025498000704646e7334c083c00c0002000100025498000704646e7333c083c00c00020001000254980017076e73332d32303409617a7572652d646e73036f726700c00c00020001000254980018076e73342d32303409617a7572652d646e7304696e666f00c00c0002000100025498000704646e7332c083c00c000d000100000e920009075246433834383200c00c001c00010000013a0010262001ec003300000000000000000010',
      [
        'decode answers 6 has errors: Decode domain name comes with compressionSign: 1 at offset: 1600 bytes',
        'decode answers 7 has errors: Decode domain name comes with compressionSign: 1 at offset: 1752 bytes',
        'decode answers 10 has errors: Decode domain name comes with compressionSign: 1 at offset: 2472 bytes',
      ],
    );
  });

  it('Packet#ANY#response#valid', function () {
    // nslookup -type=any bing.com 180.76.76.76
    const expectedResponse_ANY = {
      additionals: [],
      answers: [
        {
          class: 1,
          cpu: 'RFC8482',
          errors: [],
          name: 'bing.com',
          os: '',
          ttl: 430,
          type: 13,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'dns4.p09.nsone.net',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'ns4-204.azure-dns.info',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'dns2.p09.nsone.net',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'ns2-204.azure-dns.net',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'ns1-204.azure-dns.com',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'dns3.p09.nsone.net',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'dns1.p09.nsone.net',
          ttl: 125905,
          type: 2,
        },
        {
          class: 1,
          errors: [],
          name: 'bing.com',
          ns: 'ns3-204.azure-dns.org',
          ttl: 125905,
          type: 2,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 9,
        arcount: 0,
        id: 2,
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
      questions: [{ class: 1, errors: [], name: 'bing.com', type: 255 }],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      '0002818000010009000000000462696e6703636f6d0000ff0001c00c000d0001000001ae0009075246433834383200c00c000200010001ebd1001404646e733403703039056e736f6e65036e657400c00c000200010001ebd10018076e73342d32303409617a7572652d646e7304696e666f00c00c000200010001ebd1000704646e7332c040c00c000200010001ebd10014076e73322d32303409617a7572652d646e73c04ac00c000200010001ebd10014076e73312d32303409617a7572652d646e73c011c00c000200010001ebd1000704646e7333c040c00c000200010001ebd1000704646e7331c040c00c000200010001ebd10017076e73332d32303409617a7572652d646e73036f726700',
      expectedResponse_ANY,
    );
  });
});
