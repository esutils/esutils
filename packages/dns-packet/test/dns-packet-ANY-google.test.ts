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
      questions: [{ class: 1, errors: [], name: 'google.com', type: 255 }],
    };
    checkResourcePacketEncodeDecode(
      true,
      '00020100000100000000000006676f6f676c6503636f6d0000ff0001',
      expectedRequest_ANY,
    );
  });

  it('Packet#ANY#response', function () {
    // nslookup -port=53 -type=any google.com 8.8.8.8
    const expectedResponse_ANY = {
      additionals: [],
      answers: [
        {
          address: '142.251.41.14',
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 1,
        },
        {
          address: '2607:f8b0:4007:806::::200e',
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 28,
        },
        {
          characterStrings: [
            'cisco-ci-domain-verification=47c38bc8c4b74b7233e9053220c1bbe76bcc1cd33c7acf7acd36cd6a5332004b',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          class: 1,
          errors: [],
          exchange: 'smtp.google.com',
          name: 'google.com',
          priority: 10,
          ttl: 284,
          type: 15,
        },
        {
          characterStrings: [
            'globalsign-smime-dv=CDYX+XFHUw2wml6/Gb8+59BsH31KzUr6c1l2BPvqKX8=',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: ['apple-domain-verification=30afIBcvSuDV2PLX'],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: ['docusign=05958488-4752-4ef2-95eb-aa7ba8a3bd0e'],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          class: 1,
          errors: [],
          name: 'google.com',
          svcParams: new Uint8Array([0, 1, 0, 6, 2, 104, 50, 2, 104, 51]),
          svcPriority: 1,
          targetName: '',
          ttl: 21584,
          type: 65,
        },
        {
          characterStrings: [
            'google-site-verification=wD8N7i1JTNTkezJ49swvWW48f8_9xveREV4oB-0Hf5o',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: ['docusign=1b0a6754-49b1-4db5-8540-d2c12664b289'],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          class: 1,
          errors: [],
          name: 'google.com',
          ns: 'ns1.google.com',
          ttl: 21584,
          type: 2,
        },
        {
          characterStrings: [
            'onetrust-domain-verification=6d685f1d41a94696ad7ef771f68993e0',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: [
            'google-site-verification=4ibFUgB-wXLQ_S7vsXVomSTVamuOXBiVAzpR5IZ87D0',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: [
            'onetrust-domain-verification=0d477fe608074e6f9c12bca7826035cc',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: [
            'google-site-verification=TV9-DBe4R80X4v0M4U_bd_J9cpOJM0nikft0jAgjmsQ',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          admin: 'dns-admin.google.com',
          class: 1,
          errors: [],
          expiration: 1800,
          minimum: 60,
          name: 'google.com',
          primary: 'ns1.google.com',
          refresh: 900,
          retry: 900,
          serial: 887603846,
          ttl: 44,
          type: 6,
        },
        {
          class: 1,
          errors: [],
          name: 'google.com',
          ns: 'ns2.google.com',
          ttl: 21584,
          type: 2,
        },
        {
          characterStrings: ['MS=E4A68B9AB2BB9670BCE15412F62916164C0B20BB'],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          characterStrings: [
            'facebook-domain-verification=22rm551cu4k0ab0bxsw536tlds4h95',
          ],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          class: 1,
          errors: [],
          name: 'google.com',
          ns: 'ns4.google.com',
          ttl: 21584,
          type: 2,
        },
        {
          characterStrings: ['v=spf1 include:_spf.google.com ~all'],
          class: 1,
          errors: [],
          name: 'google.com',
          ttl: 284,
          type: 16,
        },
        {
          class: 1,
          errors: [
            'decodeResource Not supported DNS TYPE CAA:257 {0,5,105,115,115,117,101,112,107,105,46,103,111,111,103}',
          ],
          name: 'google.com',
          ttl: 21584,
          type: 257,
        },
        {
          class: 1,
          errors: [],
          name: 'google.com',
          ns: 'ns3.google.com',
          ttl: 21584,
          type: 2,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 23,
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
      questions: [{ class: 1, errors: [], name: 'google.com', type: 255 }],
    };
    checkResourcePacketEncodeDecode(
      false,
      '00028180000100170000000006676f6f676c6503636f6d0000ff0001c00c000100010000011c00048efb290ec00c001c00010000011c00102607f8b040070806000000000000200ec00c001000010000011c005e5d636973636f2d63692d646f6d61696e2d766572696669636174696f6e3d34376333386263386334623734623732333365393035333232306331626265373662636331636433336337616366376163643336636436613533333230303462c00c000f00010000011c0009000a04736d7470c00cc00c001000010000011c004140676c6f62616c7369676e2d736d696d652d64763d434459582b584648557732776d6c362f4762382b353942734833314b7a55723663316c32425076714b58383dc00c001000010000011c002b2a6170706c652d646f6d61696e2d766572696669636174696f6e3d33306166494263765375445632504c58c00c001000010000011c002e2d646f63757369676e3d30353935383438382d343735322d346566322d393565622d616137626138613362643065c00c0041000100005450000d00010000010006026832026833c00c001000010000011c004544676f6f676c652d736974652d766572696669636174696f6e3d7744384e3769314a544e546b657a4a34397377765757343866385f39787665524556346f422d304866356fc00c001000010000011c002e2d646f63757369676e3d31623061363735342d343962312d346462352d383534302d643263313236363462323839c00c00020001000054500006036e7331c00cc00c001000010000011c003e3d6f6e6574727573742d646f6d61696e2d766572696669636174696f6e3d3664363835663164343161393436393661643765663737316636383939336530c00c001000010000011c004544676f6f676c652d736974652d766572696669636174696f6e3d346962465567422d77584c515f5337767358566f6d535456616d754f58426956417a705235495a38374430c00c001000010000011c003e3d6f6e6574727573742d646f6d61696e2d766572696669636174696f6e3d3064343737666536303830373465366639633132626361373832363033356363c00c001000010000011c004544676f6f676c652d736974652d766572696669636174696f6e3d5456392d44426534523830583476304d34555f62645f4a3963704f4a4d306e696b6674306a41676a6d7351c00c000600010000002c0022c23509646e732d61646d696ec00c34e7c2860000038400000384000007080000003cc00c00020001000054500006036e7332c00cc00c001000010000011c002c2b4d533d45344136384239414232424239363730424345313534313246363239313631363443304232304242c00c001000010000011c003c3b66616365626f6f6b2d646f6d61696e2d766572696669636174696f6e3d3232726d3535316375346b3061623062787377353336746c647334683935c00c00020001000054500006036e7334c00cc00c001000010000011c002423763d7370663120696e636c7564653a5f7370662e676f6f676c652e636f6d207e616c6cc00c0101000100005450000f00056973737565706b692e676f6f67c00c00020001000054500006036e7333c00c0000',
      expectedResponse_ANY,
      [
        'decode answers 21 has errors: decodeResource Not supported DNS TYPE CAA:257 {0,5,105,115,115,117,101,112,107,105,46,103,111,111,103}',
      ],
    );
  });
});
