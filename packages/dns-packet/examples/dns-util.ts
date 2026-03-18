import * as udp from 'dgram';

import {
  decodeResourceDefault,
  type DnsPacket,
  type DnsQuestion,
  encodeResourceDefault,
  Packet,
} from '@esutils/dns-packet';

import { type DnsQueryServerAddress } from './dns-basic';

export type DnsPacketErrorType =
  | 'Normal' // means not a error
  | 'Timeout'
  | 'SendError'
  | 'SocketError';

export interface QueryDnsResult {
  type: DnsPacketErrorType;
  packet: DnsPacket | null;
  error: Error | null;
}

export interface DnsResponse {
  address: DnsQueryServerAddress;
  client: udp.Socket;
  closed: boolean;
  name: string;
  result: QueryDnsResult | undefined;
}

export interface QueryDnsState {
  promises: Promise<DnsResponse>[];
  noAnswerCount: number;
  servers: DnsResponse[];
}
export interface QueryDnsFinalResult {
  result: DnsResponse;
  state: QueryDnsState;
}

export async function queryDNS(
  server: DnsResponse,
  questions: DnsQuestion[],
  timeout: number,
) {
  const query = Packet.create();
  query.header.id = Packet.randomHeaderId();
  // https://github.com/song940/node-dns/issues/29
  query.header.rd = 1;
  query.questions = questions;
  return new Promise<DnsResponse>((resolve) => {
    let timerCleared = false;
    function resolveWith(result: QueryDnsResult) {
      if (server.result === undefined) {
        server.result = result;
        resolve(server);
      }
    }
    function done(timer: NodeJS.Timeout) {
      if (!timerCleared) {
        timerCleared = true;
        clearTimeout(timer);
      }
      if (!server.closed) {
        server.closed = true;
        server.client.close();
      }
    }
    function raiseError(
      timer: NodeJS.Timeout,
      type: DnsPacketErrorType,
      err: Error | null,
    ) {
      resolveWith({
        type,
        packet: null,
        error: err,
      });
      done(timer);
    }
    const timer = setTimeout(() => {
      raiseError(timer, 'Timeout', new Error('request timeout'));
    }, timeout);
    server.client.once('message', (message: Uint8Array) => {
      done(timer);
      resolveWith({
        type: 'Normal',
        packet: Packet.decode(message, decodeResourceDefault),
        error: null,
      });
    });
    server.client.once('close', () => {
      server.closed = true;
      done(timer);
    });
    server.client.once('error', (error) =>
      raiseError(timer, 'SocketError', error),
    );
    // DNS request timeout to 10 seconds
    const buf = Packet.encode(query, encodeResourceDefault);
    server.client.send(buf, server.address.port, server.address.ip, (err) => {
      if (err) {
        raiseError(timer, 'SendError', err);
      } else {
        // means have no error
      }
    });
  });
}

export async function queryMultipleDNS(
  serverAddresses: DnsQueryServerAddress[],
  questions: DnsQuestion[],
  timeout: number,
): Promise<QueryDnsFinalResult> {
  const state: QueryDnsState = {
    promises: [],
    noAnswerCount: 0,
    servers: [],
  };
  for (let i = 0; i < serverAddresses.length; i += 1) {
    const serverInfo: DnsResponse = {
      address: serverAddresses[i],
      client: udp.createSocket('udp4'),
      closed: false,
      name: questions[0].name,
      result: undefined,
    };
    state.servers.push(serverInfo);
    state.promises.push(queryDNS(serverInfo, questions, timeout));
  }
  const result = await Promise.any(state.promises);
  return {
    result,
    state,
  };
}
