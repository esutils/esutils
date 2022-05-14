/* eslint-disable no-await-in-loop */
import * as udp from 'dgram';

import {
  CLASS, decodeResponseDefault, DnsPacket, encodeResponseDefault, Packet, TYPE,
} from '@esutils/dns-packet';

import { delay } from '@esutils/delay';

const port = 53;

async function queryDNS(dns: string) {
  const query = Packet.create();
  query.header.id = Packet.randomHeaderId();
  // https://github.com/song940/node-dns/issues/29
  query.header.rd = 1;
  query.questions.push({
    name: 'baidu.com',
    type: TYPE.A,
    class: CLASS.IN,
  });
  const client = udp.createSocket('udp4');
  return new Promise<DnsPacket>((resolve, reject) => {
    client.once('message', (message) => {
      client.close();
      const response = Packet.decode(message, decodeResponseDefault);
      resolve(response);
    });
    const buf = Packet.encode(query, encodeResponseDefault);
    client.send(buf, port, dns, (err) => err && reject(err));
  });
}

let finished = false;
async function demo(dns: string) {
  while (!finished) {
    const result = await queryDNS(dns);
    console.log(`dns:${dns} from ${JSON.stringify(result)}`);
    if (result.answers.length > 0) {
      return;
    }
    await delay(1000);
  }
}

async function demoParallel() {
  const promises = [];
  promises.push(demo('1.1.1.1'));
  promises.push(demo('114.114.114.114'));
  promises.push(demo('8.8.8.8'));
  promises.push(demo('8.1.0.0'));
  await Promise.race(promises);
  finished = true;
}

demoParallel();
