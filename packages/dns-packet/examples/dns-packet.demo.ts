import { CLASS, TYPE, Packet } from '@esutils/dns-packet';

import { type DnsQuery, queryDnsParallel } from './dns-util';
import { type DnsResponse } from './dns-proxy-utils';

async function demoParallel() {
  const queryPacket = Packet.create();
  queryPacket.header.id = Packet.randomHeaderId();
  // https://github.com/song940/node-dns/issues/29
  queryPacket.header.rd = 1;
  queryPacket.questions = [
    {
      name: 'baidu.com',
      type: TYPE.A,
      class: CLASS.IN,
      errors: [],
    },
  ];
  const requestBuffer = Packet.encode(queryPacket, []);
  const query: DnsQuery = {
    type: TYPE.A,
    protocolType: 'udp',
    errors: [],
    domainName: 'baidu.com',
    requestBuffer: requestBuffer,
    requestBufferOriginal: requestBuffer,
    request: queryPacket,
    responseBuffer: requestBuffer,
  };
  const dnsResultA: DnsResponse[] = [];
  await queryDnsParallel(
    [
      {
        ip: '1.1.1.1',
        port: 53,
      },
      {
        ip: '1.1.1.2',
        port: 53,
      },
    ],
    query,
    dnsResultA,
    1000,
  );
  dnsResultA[0].responseBuffer = undefined;
  dnsResultA[1].responseBuffer = undefined;
  console.log(JSON.stringify(dnsResultA, null, 2));

  // 180.76.76.76
  const dnsResultB: DnsResponse[] = [];
  await queryDnsParallel(
    [
      {
        ip: '114.114.114.114',
        port: 53,
      },
      {
        ip: '223.5.5.5',
        port: 53,
      },
    ],
    query,
    dnsResultB,
    1000,
  );
  dnsResultB[0].responseBuffer = undefined;
  dnsResultB[1].responseBuffer = undefined;
  console.log(JSON.stringify(dnsResultB, null, 2));
}

demoParallel();
