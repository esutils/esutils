import { checkResourcePacketEncodeDecode } from './dns-packet-util';

// Fetch dns for bing.com from 8.8.8.8 type: 16 typeName: TXT by
describe('dns-packet TXT', () => {
  it('Packet#TXT#request', function () {
    const expectedRequest_TXT = {
      additionals: [
        {
          class: 1232,
          errors: [],
          name: '',
          rdata: [
            {
              clientCookie: new Uint8Array([
                150, 207, 179, 199, 149, 198, 134, 58,
              ]),
              optionCode: 10,
              serverCookie: undefined,
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
        id: 10337,
        nscount: 0,
        opcode: 0,
        qdcount: 1,
        qr: 0,
        ra: 0,
        rcode: 0,
        rd: 1,
        tc: 0,
        z: 2,
      },
      questions: [{ class: 1, errors: [], name: 'bing.com', type: 16 }],
    };
    checkResourcePacketEncodeDecode(
      true,
      '2861012000010000000000010462696e6703636f6d000010000100002904d000000000000c000a000896cfb3c795c6863a',
      expectedRequest_TXT,
    );
  });

  it('Packet#TXT#response', function () {
    const expectedResponse_TXT = {
      header: {
        id: 8313,
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
        ancount: 5,
      },
      questions: [{ name: 'bing.com', type: 16, class: 1, errors: [] }],
      answers: [
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 3185,
          characterStrings: [
            'v=spf1 include:spf.protection.outlook.com -all',
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 3185,
          characterStrings: [
            'v=msv1 t=6097A7EA-53F7-4028-BA76-6869CB284C54',
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 3185,
          characterStrings: [
            'facebook-domain-verification=09yg8uzcfnqnlqekzsbwjxyy8rdck7',
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 3185,
          characterStrings: [
            'google-site-verification=SHuSHN0Hv3nwBI9So329KwfbQ7xLif64SRwcGSdWNAU',
          ],
        },
        {
          name: 'bing.com',
          type: 16,
          class: 1,
          errors: [],
          ttl: 3185,
          characterStrings: [
          "google-site-verification=OkRY8R261shK5B8uEwvsFZp9nQ2gRoHavGlruok1azc"
          ],
        },
      ],
      authorities: [],
      additionals: [],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      '2079818000010005000000000462696e6703636f6d0000100001c00c0010000100000c71002f2e763d7370663120696e636c7564653a7370662e70726f74656374696f6e2e6f75746c6f6f6b2e636f6d202d616c6cc00c0010000100000c71002e2d763d6d73763120743d36303937413745412d353346372d343032382d424137362d363836394342323834433534c00c0010000100000c71003c3b66616365626f6f6b2d646f6d61696e2d766572696669636174696f6e3d3039796738757a63666e716e6c71656b7a7362776a787979387264636b37c00c0010000100000c71004544676f6f676c652d736974652d766572696669636174696f6e3d53487553484e304876336e77424939536f3332394b7766625137784c6966363453527763475364574e4155c00c0010000100000c71004544676f6f676c652d736974652d766572696669636174696f6e3d4f6b5259385232363173684b3542387545777673465a70396e513267526f486176476c72756f6b31617a63',
      expectedResponse_TXT,
    );
  });
});
