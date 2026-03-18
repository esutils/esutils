import { checkResourcePacketEncodeDecode } from './dns-packet-util';

describe('dns-packet SRV', () => {
  it('Packet#SRV#request', function () {
    const expectedRequest_SRV = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 8644,
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
        {
          class: 1,
          errors: [],
          name: '_https._tcp.download.docker.com',
          type: 33,
        },
      ],
    };
    checkResourcePacketEncodeDecode(
      true,
      '21c401000001000000000000065f6874747073045f74637008646f776e6c6f616406646f636b657203636f6d0000210001',
      expectedRequest_SRV,
    );
  });

  it('Packet#SRV#response', function () {
    const expectedResponse_SRV = {
      additionals: [],
      answers: [
        {
          class: 1,
          errors: [],
          name: '_http._tcp.security.debian.org',
          port: 80,
          priority: 10,
          target: 'debian.map.fastlydns.net',
          ttl: 899,
          type: 33,
          weight: 1,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 1,
        arcount: 0,
        id: 65434,
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
      questions: [
        {
          class: 1,
          errors: [],
          name: '_http._tcp.security.debian.org',
          type: 33,
        },
      ],
    };
    checkResourcePacketEncodeDecode(
      true,
      'ff9a81800001000100000000055f68747470045f7463700873656375726974790664656269616e036f72670000210001055f68747470045f7463700873656375726974790664656269616e036f72670000210001000003830020000a000100500664656269616e036d617009666173746c79646e73036e657400',
      expectedResponse_SRV,
    );
  });
});
