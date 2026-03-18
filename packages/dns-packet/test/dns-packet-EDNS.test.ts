import { checkResourcePacketEncodeDecode } from './dns-packet-util';

describe('dns-packet EDNS/OPT', () => {
  it('Packet#EDNS#request#ECS#optionCode#8', function () {
    // ECS request
    const expectedRequest_EDNS_ECS = {
      additionals: [
        {
          class: 512,
          errors: [],
          name: '',
          rdata: [
            {
              optionCode: 8,
              family: 1,
              ip: '192.168.100.1',
              scopePrefixLength: 0,
              sourcePrefixLength: 32,
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
        id: 1749,
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
      questions: [{ class: 1, errors: [], name: 'www.bing.com', type: 1 }],
    };
    checkResourcePacketEncodeDecode(
      true,
      '06d501000001000000000001037777770462696e6703636f6d0000010001000029020000000000000c0008000800012000c0a86401',
      expectedRequest_EDNS_ECS,
    );
  });

  it('Packet#EDNS#response#ECS', function () {
    const expectedRequest_EDNS_ECS = {
      additionals: [
        { class: 1232, errors: [], name: '', rdata: [], ttl: 0, type: 41 },
      ],
      answers: [
        {
          class: 1,
          domain: 'www-www.bing.com.trafficmanager.net',
          errors: [],
          name: 'www.bing.com',
          ttl: 21594,
          type: 5,
        },
        {
          class: 1,
          domain: 'www.bing.com.edgekey.net',
          errors: [],
          name: 'www-www.bing.com.trafficmanager.net',
          ttl: 54,
          type: 5,
        },
        {
          class: 1,
          domain: 'e86303.dscx.akamaiedge.net',
          errors: [],
          name: 'www.bing.com.edgekey.net',
          ttl: 21594,
          type: 5,
        },
        {
          address: '23.210.216.156',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
        {
          address: '23.210.216.155',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
        {
          address: '23.210.216.160',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
        {
          address: '23.210.216.149',
          class: 1,
          errors: [],
          name: 'e86303.dscx.akamaiedge.net',
          ttl: 14,
          type: 1,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 7,
        arcount: 1,
        id: 1890,
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
      questions: [{ class: 1, errors: [], name: 'www.bing.com', type: 1 }],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      '076281800001000700000001037777770462696e6703636f6d0000010001c00c000500010000545a0025077777772d7777770462696e6703636f6d0e747261666669636d616e61676572036e657400c02a00050001000000360017037777770462696e6703636f6d07656467656b6579c04ac05b000500010000545a00190665383633303304647363780a616b616d616965646765c04ac07e000100010000000e000417d2d89cc07e000100010000000e000417d2d89bc07e000100010000000e000417d2d8a0c07e000100010000000e000417d2d89500002904d0000000000000',
      expectedRequest_EDNS_ECS,
    );
  });

  it('Packet#EDNS#request#COOKIE#optionCode#10', function () {
    const expectedRequest_EDNS_COOKIE = {
      additionals: [
        {
          class: 1232,
          errors: [],
          name: '',
          rdata: [
            {
              clientCookie: new Uint8Array([94, 127, 40, 73, 125, 30, 7, 34]),
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
        id: 23773,
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
      questions: [
        { class: 1, errors: [], name: 'sipdbz09.rcs01.5gm.wo.cn', type: 1 },
      ],
    };
    checkResourcePacketEncodeDecode(
      true,
      '5cdd012000010000000000010873697064627a30390572637330310335676d02776f02636e000001000100002904d000000000000c000a00085e7f28497d1e0722',
      expectedRequest_EDNS_COOKIE,
    );
  });

  it('Packet#EDNS#response#COOKIE', function () {
    const exptectedResponse_EDNS_COOKIE = {
      additionals: [],
      answers: [
        {
          address: '116.147.142.101',
          class: 1,
          errors: [],
          name: 'sipdbz09.rcs01.5gm.wo.cn',
          ttl: 1,
          type: 1,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 1,
        arcount: 0,
        id: 23773,
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
        { class: 1, errors: [], name: 'sipdbz09.rcs01.5gm.wo.cn', type: 1 },
      ],
    };

    checkResourcePacketEncodeDecode(
      true,
      '5cdd818000010001000000000873697064627a30390572637330310335676d02776f02636e00000100010873697064627a30390572637330310335676d02776f02636e000001000100000001000474938e65',
      exptectedResponse_EDNS_COOKIE,
    );
  });
});
