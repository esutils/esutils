import assert from 'assert';

import { Packet, type DnsResource } from '@esutils/dns-packet';

import {
  dnsResponsesSort,
  type DnsResponse,
} from '../examples/dns-proxy-utils';

test('check sort dns clients single', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: new Uint8Array(0),
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [0]);
});

test('check sort dns clients [response, !response]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: new Uint8Array(0),
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [0, 1]);
});

test('check sort dns clients [answers 1, answers 1]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: undefined,
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: undefined,
    },
  ];
  dnsResponses[0].response!.answers = [{}] as DnsResource[];
  dnsResponses[1].response!.answers = [{}] as DnsResource[];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [0, 1]);
});

test('check sort dns clients [answers 1, answers 2]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: undefined,
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: undefined,
    },
  ];
  dnsResponses[0].response!.answers = [{}] as DnsResource[];
  dnsResponses[1].response!.answers = [{}, {}] as DnsResource[];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [1, 0]);
});

test('check sort dns clients [authorities 1, authorities 2]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: undefined,
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: undefined,
    },
  ];
  dnsResponses[0].response!.answers = [{}, {}] as DnsResource[];
  dnsResponses[1].response!.answers = [{}, {}] as DnsResource[];
  dnsResponses[0].response!.authorities = [{}] as DnsResource[];
  dnsResponses[1].response!.authorities = [{}, {}] as DnsResource[];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [1, 0]);
});

test('check sort dns clients [!response, response]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: Packet.create(),
      responseBuffer: new Uint8Array(0),
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [1, 0]);
});

test('check sort dns clients [!responseBuffer, responseBuffer]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: undefined,
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [1, 0]);
});

test('check sort dns clients [responseBuffer, !responseBuffer]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: undefined,
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [0, 1]);
});

test('check sort dns clients [responseBuffer,responseBuffer,responseBuffer]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: new Uint8Array(0),
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [0, 1, 2]);
});

test('check sort dns clients [!responseBuffer,!responseBuffer,!responseBuffer]', () => {
  const dnsResponses: DnsResponse[] = [
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: undefined,
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: undefined,
    },
    {
      serverAddress: { ip: '', port: 0 },
      errors: [],
      error: new Error(''),
      response: undefined,
      responseBuffer: undefined,
    },
  ];
  assert.deepEqual(dnsResponsesSort(dnsResponses), [0, 1, 2]);
});
