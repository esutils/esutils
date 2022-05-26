import * as udp from 'dgram';

import {
  decodeResponseDefault,
  DnsPacket,
  DnsQuestion,
  encodeResponseDefault,
  Packet,
} from '@esutils/dns-packet';

export interface QueryDnsResult {
  ip: string;
  packet: DnsPacket;
}

/* TODO: Add abort signal */
export async function queryDNS(
  dnsServerIp: string,
  port: number,
  questions: DnsQuestion[],
) {
  const query = Packet.create();
  query.header.id = Packet.randomHeaderId();
  // https://github.com/song940/node-dns/issues/29
  query.header.rd = 1;
  query.questions = questions;
  const client = udp.createSocket('udp4');
  let clientClosed = false;
  let clientRejected = false;
  let dnsResolved = false;
  const { name } = questions[0];
  return new Promise<QueryDnsResult>((resolve, reject) => {
    function done(timer: NodeJS.Timeout) {
      clearTimeout(timer);
      if (!clientClosed) {
        clientClosed = true;
        client.close();
      }
    }
    function raiseError(err: Error) {
      if (!clientRejected) {
        clientRejected = true;
        reject(err);
      }
    }
    const timer = setTimeout(() => {
      done(timer);
      raiseError(new Error(`request timedout for ${name}`));
    }, 10000);
    client.once('message', (message) => {
      dnsResolved = true;
      done(timer);
      const response = Packet.decode(message, decodeResponseDefault);
      if (response.answers.length === 0) {
        raiseError(new Error(`no answer for ${name}`));
        return;
      }
      resolve({
        ip: dnsServerIp,
        packet: response,
      });
    });
    client.once('close', () => {
      if (!dnsResolved) {
        raiseError(new Error('dns not retrieved'));
      }
    });
    client.once('error', raiseError);
    // DNS request timeout to 10 seconds
    const buf = Packet.encode(query, encodeResponseDefault);
    client.send(buf, port, dnsServerIp, (err) => err && raiseError(err));
  });
}

export interface DnsServerItem {
  ip: string;
  port: number;
}

export async function queryMultipleDNS(
  servers: DnsServerItem[],
  questions: DnsQuestion[],
) {
  const promises: Promise<QueryDnsResult>[] = [];
  for (let i = 0; i < servers.length; i += 1) {
    promises.push(queryDNS(servers[i].ip, servers[i].port, questions));
  }
  return Promise.any(promises);
}
