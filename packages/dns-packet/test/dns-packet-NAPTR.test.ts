import { checkResourcePacketEncodeDecode } from './dns-packet-util';

describe('dns-packet NAPTR', () => {
  it('Packet#NAPTR#request', function () {
    const expectedRequest_NAPTR = {
      additionals: [],
      answers: [],
      authorities: [],
      header: {
        aa: 0,
        ancount: 0,
        arcount: 0,
        id: 36463,
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
        { class: 1, name: 'sipdbz06.rcs01.5gm.wo.cn', type: 35, errors: [] },
      ],
    };
    checkResourcePacketEncodeDecode(
      true,
      '8e6f010000010000000000000873697064627a30360572637330310335676d02776f02636e0000230001',
      expectedRequest_NAPTR,
    );
  });

  it('Packet#NAPTR#response', function () {
    const expectedResponse_NAPTR = {
      additionals: [],
      answers: [
        {
          class: 1,
          errors: [],
          flags: 'S',
          name: 'sipdbz09.rcs01.5gm.wo.cn',
          order: 10,
          preference: 100,
          regexp: '',
          replacement: '_sips._tcp.sipdbz09.rcs01.5gm.wo.cn',
          services: 'SIPS+D2T',
          ttl: 600,
          type: 35,
        },
        {
          class: 1,
          errors: [],
          flags: 'S',
          name: 'sipdbz09.rcs01.5gm.wo.cn',
          order: 10,
          preference: 100,
          regexp: '',
          replacement: '_sip._tcp.sipdbz09.rcs01.5gm.wo.cn',
          "services": "SIP+D2T",
          ttl: 600,
          type: 35,
        },
      ],
      authorities: [],
      header: {
        aa: 0,
        ancount: 2,
        arcount: 0,
        id: 55829,
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
        { class: 1, errors: [], name: 'sipdbz09.rcs01.5gm.wo.cn', type: 35 },
      ],
    };
    // TODO: because of domain name compress not implemented
    checkResourcePacketEncodeDecode(
      false,
      'da15818000010002000000000873697064627a30390572637330310335676d02776f02636e0000230001c00c00230001000002580035000a0064015308534950532b44325400055f73697073045f7463700873697064627a30390572637330310335676d02776f02636e00c00c00230001000002580033000a00640153075349502b44325400045f736970045f7463700873697064627a30390572637330310335676d02776f02636e00',
      expectedResponse_NAPTR,
    );
  });
});
