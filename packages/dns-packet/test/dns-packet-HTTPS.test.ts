import { checkResourcePacketEncodeDecode } from './dns-packet-util';

describe('dns-packet HTTPS', () => {
  it('Packet#HTTPS#request', function () {
    const expectedRequest_HTTPS = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 200,
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
          name: 'dap.pat-issuer.cloudflare.com',
          type: 65,
        },
      ],
    };
    checkResourcePacketEncodeDecode(
      true,
      '00c801000001000000000000036461700a7061742d6973737565720a636c6f7564666c61726503636f6d0000410001',
      expectedRequest_HTTPS,
    );
  });

  it('Packet#HTTPS#response', function () {
    const expectedResponse_HTTPS = {
      additionals: [],
      answers: [
        {
          class: 1,
          errors: [],
          name: 'dap.pat-issuer.cloudflare.com',
          svcParams: new Uint8Array([
            0, 1, 0, 3, 2, 104, 50, 0, 4, 0, 8, 104, 18, 24, 21, 104, 18, 25,
            21, 0, 6, 0, 32, 38, 6, 71, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 18, 24,
            21, 38, 6, 71, 0, 0, 0, 0, 0, 0, 0, 0, 0, 104, 18, 25, 21,
          ]),
          svcPriority: 1,
          targetName: '',
          ttl: 606,
          type: 65,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 1,
        arcount: 0,
        id: 63745,
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
          name: 'dap.pat-issuer.cloudflare.com',
          type: 65,
        },
      ],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      'f90181800001000100000000036461700a7061742d6973737565720a636c6f7564666c61726503636f6d0000410001c00c004100010000025e003a00010000010003026832000400086812181568121915000600202606470000000000000000006812181526064700000000000000000068121915',
      expectedResponse_HTTPS,
    );
  });
});
