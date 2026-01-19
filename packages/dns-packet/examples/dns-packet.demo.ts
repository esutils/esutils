import { CLASS, TYPE } from '@esutils/dns-packet';

import { queryMultipleDNS } from './dns-util';

async function demoParallel() {
  const questions = [
    {
      name: 'baidu.com',
      type: TYPE.A,
      class: CLASS.IN,
    },
  ];
  const dnsResultA = await queryMultipleDNS(
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
    questions,
    1000,
  );
  console.log(JSON.stringify(dnsResultA));
  // 180.76.76.76
  const dnsResultB = await queryMultipleDNS(
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
    questions,
    1000,
  );
  console.log(JSON.stringify(dnsResultB));
}

demoParallel();
