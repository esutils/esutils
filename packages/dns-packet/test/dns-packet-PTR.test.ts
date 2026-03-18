import { checkResourcePacketEncodeDecode } from './dns-packet-util';

describe('dns-packet PTR', () => {
  it('Packet#PTR#request', function () {
    const expectedRequest_PTR = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 1,
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
        { class: 1, errors: [], name: '1.0.0.127.in-addr.arpa', type: 12 },
      ],
    };
    checkResourcePacketEncodeDecode(
      true,
      '0001010000010000000000000131013001300331323707696e2d61646472046172706100000c0001',
      expectedRequest_PTR,
    );
  });

  it('Packet#PTR#response', function () {
    const expectedResponse_PTR = {
      additionals: [],
      answers: [],
      authorities: [
        {
          admin: 'nstld.iana.org',
          class: 1,
          errors: [],
          expiration: 604800,
          minimum: 3600,
          name: 'in-addr.arpa',
          primary: 'b.in-addr-servers.arpa',
          refresh: 1800,
          retry: 900,
          serial: 2026022174,
          ttl: 2549,
          type: 6,
        },
      ],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 1,
        nscount: 1,
        opcode: 0,
        qdcount: 1,
        qr: 1,
        ra: 1,
        rcode: 3,
        rd: 1,
        tc: 0,
        z: 0,
      },
      questions: [
        { class: 1, errors: [], name: '1.0.0.127.in-addr.arpa', type: 12 },
      ],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      '0001818300010000000100000131013001300331323707696e2d61646472046172706100000c0001c01600060001000009f5003801620f696e2d616464722d73657276657273c01e056e73746c640469616e61036f72670078c2a51e000007080000038400093a8000000e10',
      expectedResponse_PTR,
    );
  });
});
