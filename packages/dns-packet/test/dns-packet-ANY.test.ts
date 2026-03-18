import { checkResourcePacketEncodeDecode } from './dns-packet-util';

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

  it('Packet#ANY#response', function () {
    const expectedResponse_ANY = {
      header: {
        id: 2,
        qr: 1,
        opcode: 0,
        aa: 0,
        tc: 0,
        rd: 1,
        ra: 1,
        z: 0,
        rcode: 0,
        qdcount: 1,
        nscount: 0,
        arcount: 0,
        ancount: 12,
      },
      questions: [{ name: 'bing.com', type: 255, class: 1, errors: [] }],
      answers: [
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'ns1-204.azure-dns.com',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'ns3-204.azure-dns.org',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'dns3.p09.nsone.net',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'dns2',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'ns2-204.azure-dns',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'dns1',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'dns4.\x00\x01',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 5199,
          ns: 'ns4-204.azure-dns.info',
        },
        {
          name: 'bing.com',
          type: 1,
          class: 1,
          errors: [],
          ttl: 1915,
          address: '150.171.28.10',
        },
        {
          name: 'bing.com',
          type: 1,
          class: 1,
          errors: [],
          ttl: 1915,
          address: '150.171.27.10',
        },
        {
          name: 'bing.com',
          type: 28,
          class: 1,
          errors: [],
          ttl: 1905,
          address: '2620:1ec:33:1::::10',
        },
        {
          name: 'bing.com',
          type: 28,
          class: 1,
          errors: [],
          ttl: 1905,
          address: '2620:1ec:33:::::10',
        },
      ],
      authorities: [],
      additionals: [],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      '000281800001000c000000000462696e6703636f6d0000ff0001c00c000200010000144f0014076e73312d32303409617a7572652d646e73c011c00c000200010000144f0017076e73332d32303409617a7572652d646e73036f726700c00c000200010000144f001404646e733303703039056e736f6e65036e657400c00c000200010000144f000704646e7332c0c6c00c000200010000144f0014076e73322d32303409617a7572652d646e73c0d0c00c000200010000144f000704646e7331c0c6c00c000200010000144f000704646e7334c0c6c00c000200010000144f0018076e73342d32303409617a7572652d646e7304696e666f00c00c000100010000077b000496ab1c0ac00c000100010000077b000496ab1b0ac00c001c0001000007710010262001ec003300010000000000000010c00c001c0001000007710010262001ec003300000000000000000010',
      expectedResponse_ANY,
    );
  });

  it('Packet#ANY#response#invalid#name', function () {
    const expectedResponse_ANY = {
      header: {
        id: 2,
        qr: 1,
        opcode: 0,
        aa: 0,
        tc: 1,
        rd: 1,
        ra: 1,
        z: 0,
        rcode: 0,
        qdcount: 1,
        nscount: 0,
        arcount: 0,
        ancount: 10,
      },
      questions: [{ name: 'bing.com', type: 255, class: 1, errors: [] }],
      answers: [
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 1379,
          characterStrings: [
            new Uint8Array([
              118, 61, 115, 112, 102, 49, 32, 105, 110, 99, 108, 117, 100, 101,
              58, 115, 112, 102, 46, 112, 114, 111, 116, 101, 99, 116, 105, 111,
              110, 46, 111, 117, 116, 108, 111, 111, 107, 46, 99, 111, 109, 32,
              45, 97, 108, 108,
            ]),
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 1379,
          characterStrings: [
            new Uint8Array([
              102, 97, 99, 101, 98, 111, 111, 107, 45, 100, 111, 109, 97, 105,
              110, 45, 118, 101, 114, 105, 102, 105, 99, 97, 116, 105, 111, 110,
              61, 48, 57, 121, 103, 56, 117, 122, 99, 102, 110, 113, 110, 108,
              113, 101, 107, 122, 115, 98, 119, 106, 120, 121, 121, 56, 114,
              100, 99, 107, 55,
            ]),
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 1379,
          characterStrings: [
            new Uint8Array([
              103, 111, 111, 103, 108, 101, 45, 115, 105, 116, 101, 45, 118,
              101, 114, 105, 102, 105, 99, 97, 116, 105, 111, 110, 61, 79, 107,
              82, 89, 56, 82, 50, 54, 49, 115, 104, 75, 53, 66, 56, 117, 69,
              119, 118, 115, 70, 90, 112, 57, 110, 81, 50, 103, 82, 111, 72, 97,
              118, 71, 108, 114, 117, 111, 107, 49, 97, 122, 99,
            ]),
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 1379,
          characterStrings: [
            new Uint8Array([
              103, 111, 111, 103, 108, 101, 45, 115, 105, 116, 101, 45, 118,
              101, 114, 105, 102, 105, 99, 97, 116, 105, 111, 110, 61, 83, 72,
              117, 83, 72, 78, 48, 72, 118, 51, 110, 119, 66, 73, 57, 83, 111,
              51, 50, 57, 75, 119, 102, 98, 81, 55, 120, 76, 105, 102, 54, 52,
              83, 82, 119, 99, 71, 83, 100, 87, 78, 65, 85,
            ]),
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 1379,
          characterStrings: [
            new Uint8Array([
              118, 61, 109, 115, 118, 49, 32, 116, 61, 54, 48, 57, 55, 65, 55,
              69, 65, 45, 53, 51, 70, 55, 45, 52, 48, 50, 56, 45, 66, 65, 55,
              54, 45, 54, 56, 54, 57, 67, 66, 50, 56, 52, 67, 53, 52,
            ]),
          ],
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 37267,
          ns: 'ns2-204.azure-dns.net',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 37267,
          ns: 'dns2.p09.nsone',
        },
        {
          name: 'bing.com',
          type: 2,
          class: 1,
          errors: [],
          ttl: 37267,
          ns: 'ns3-204.azure-dns.org',
        },
        {
          name: 'bing.com',
          type: 1,
          class: 1,
          errors: [],
          ttl: 316,
          address: '150.171.28.10',
        },
        {
          name: 'bing.com',
          type: 1,
          class: 1,
          errors: [],
          ttl: 316,
          address: '150.171.27.10',
        },
      ],
      authorities: [],
      additionals: [],
    };
    // TODO: because of domain name compress not implemented
    // TODO: Invalid name parse maybe need better solution
    checkResourcePacketEncodeDecode(
      false,
      '000283800001000a000000000462696e6703636f6d0000ff0001c00c0010000100000563002f2e763d7370663120696e636c7564653a7370662e70726f74656374696f6e2e6f75746c6f6f6b2e636f6d202d616c6cc00c0010000100000563003c3b66616365626f6f6b2d646f6d61696e2d766572696669636174696f6e3d3039796738757a63666e716e6c71656b7a7362776a787979387264636b37c00c0010000100000563004544676f6f676c652d736974652d766572696669636174696f6e3d4f6b5259385232363173684b3542387545777673465a70396e513267526f486176476c72756f6b31617a63c00c0010000100000563004544676f6f676c652d736974652d766572696669636174696f6e3d53487553484e304876336e77424939536f3332394b7766625137784c6966363453527763475364574e4155c00c0010000100000563002e2d763d6d73763120743d36303937413745412d353346372d343032382d424137362d363836394342323834433534c00c00020001000091930017076e73322d32303409617a7572652d646e73036e657400c00c0002000100009193001104646e733203703039056e736f6e65c1b7c00c00020001000091930017076e73332d32303409617a7572652d646e73036f726700c00c000100010000013c000496ab1c0ac00c000100010000013c000496ab1b0a',
      expectedResponse_ANY,
    );
  });
});
