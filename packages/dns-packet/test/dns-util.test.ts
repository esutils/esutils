import assert from 'assert';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { jest } from '@jest/globals';

import { CLASS, TYPE, Packet } from '@esutils/dns-packet';

import {
  buildDnsQueryParameters,
  queryDnsBuffer,
} from '../examples/dns-query';
import {
  dnsResponsesSort,
  dnsResponseAnswerUpdate,
  getDnsServerInfo,
  type DnsResponse,
} from '../examples/dns-proxy-utils';
import type { DnsQuery } from '../examples/dns-util';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GOOGLE_ANY_REQUEST_HEX = readFileSync(
  join(__dirname, 'fixtures/google-any-request.hex'),
  'utf8',
).trim();
const GOOGLE_ANY_RESPONSE_HEX = readFileSync(
  join(__dirname, 'fixtures/google-any-response.hex'),
  'utf8',
).trim();

const mockQueryDnsBuffer = jest.fn<typeof queryDnsBuffer>();
const mockGetDnsServerInfo = jest.fn<typeof getDnsServerInfo>();
const mockDnsResponseAnswerUpdate = jest.fn<typeof dnsResponseAnswerUpdate>();

await jest.unstable_mockModule('../examples/dns-query.ts', () => ({
  buildDnsQueryParameters,
  queryDnsBuffer: mockQueryDnsBuffer,
}));

await jest.unstable_mockModule('../examples/dns-proxy-utils.ts', () => ({
  dnsResponsesSort,
  getDnsServerInfo: mockGetDnsServerInfo,
  dnsResponseAnswerUpdate: mockDnsResponseAnswerUpdate,
}));

const dnsUtil = await import('../examples/dns-util');

function makeGoogleAnyQuery(): DnsQuery {
  const requestBuffer = Buffer.from(GOOGLE_ANY_REQUEST_HEX, 'hex');
  return {
    type: TYPE.ANY,
    protocolType: 'udp',
    errors: [],
    domainName: 'google.com',
    requestBuffer: requestBuffer,
    requestBufferOriginal: requestBuffer,
    request: Packet.create(),
    responseBuffer: requestBuffer,
  };
}

function mockUpstreamNoerrorAndNotimp(
  noerrorBuffer: Uint8Array,
  notimpBuffer: Uint8Array,
) {
  mockQueryDnsBuffer.mockImplementation((_requestBuffer, parameters) => {
    const buffer =
      parameters.serverAddress.ip === '8.8.8.8' ? noerrorBuffer : notimpBuffer;
    return {
      promise: Promise.resolve(buffer),
      abort: () => {},
    };
  });
}

function mockQueryDnsBufferResolved(buffer: Uint8Array) {
  mockQueryDnsBuffer.mockReturnValue({
    promise: Promise.resolve(buffer),
    abort: () => {},
  });
}

function encodeNotimpResponse(name = 'google.com'): Uint8Array {
  const packet = Packet.create();
  packet.header.qr = 1;
  packet.header.rcode = 4;
  packet.questions = [
    { name, type: TYPE.ANY, class: CLASS.IN, errors: [] },
  ];
  return Packet.encode(packet, new TextEncoder(), []);
}

beforeEach(() => {
  mockQueryDnsBuffer.mockReset();
  mockGetDnsServerInfo.mockReset();
  mockDnsResponseAnswerUpdate.mockReset();
  mockDnsResponseAnswerUpdate.mockReturnValue('');
});

test('queryDns keeps partial decode response when decode errors occur', async () => {
  const responseBuffer = Buffer.from(GOOGLE_ANY_RESPONSE_HEX, 'hex');
  mockQueryDnsBufferResolved(responseBuffer);
  const dnsQueryState = {
    aborts: [] as Array<(() => void) | undefined>,
    aborted: false,
  };
  const dnsResponses: DnsResponse[] = [
    {
      parameters: {
        protocolType: 'tcp',
        serverAddress: { ip: '8.8.8.8', port: 53 },
      },
      errors: [],
    },
  ];
  const query = makeGoogleAnyQuery();
  await dnsUtil.queryDns(dnsQueryState, dnsResponses, 0, query);
  const dnsResponse = dnsResponses[0];
  assert.ok(dnsResponse.response);
  assert.ok(dnsResponse.response.answers.length > 0);
  assert.ok(dnsResponse.errors.length > 0);
  assert.ok(dnsResponse.errors.some((error) => error.includes('CAA:257')));
});

test('queryDnsParallel prefers NOERROR over NOTIMP', async () => {
  const noerrorBuffer = Buffer.from(GOOGLE_ANY_RESPONSE_HEX, 'hex');
  const notimpBuffer = encodeNotimpResponse();
  mockUpstreamNoerrorAndNotimp(noerrorBuffer, notimpBuffer);
  const query = makeGoogleAnyQuery();
  const { responses, indexes } = await dnsUtil.queryDnsParallel(
    [
      {
        protocolType: 'tcp',
        serverAddress: { ip: '208.67.222.222', port: 53 },
      },
      {
        protocolType: 'tcp',
        serverAddress: { ip: '8.8.8.8', port: 53 },
      },
    ],
    query,
    500,
  );
  assert.equal(indexes[0], 1);
  assert.equal(responses[indexes[0]].parameters.serverAddress.ip, '8.8.8.8');
  const chosen = responses[indexes[0]];
  assert.ok(chosen.response);
  assert.equal(chosen.response.header.rcode, 0);
});

test('dnsFetchResponseBuffer uses NOERROR upstream over NOTIMP', async () => {
  const noerrorBuffer = Buffer.from(GOOGLE_ANY_RESPONSE_HEX, 'hex');
  const notimpBuffer = encodeNotimpResponse();
  mockUpstreamNoerrorAndNotimp(noerrorBuffer, notimpBuffer);
  mockGetDnsServerInfo.mockReturnValue({
    server: {
      tag: 'default',
      dnsList: [
        { ip: '208.67.222.222', port: 53 },
        { ip: '8.8.8.8', port: 53 },
      ],
    },
  });
  const query = makeGoogleAnyQuery();
  const dnsResponses: DnsResponse[] = [];
  const ok = await dnsUtil.dnsFetchResponseBuffer(query, dnsResponses, 500);
  assert.equal(ok, false);
  assert.equal(
    Buffer.from(query.responseBuffer).toString('hex'),
    GOOGLE_ANY_RESPONSE_HEX,
  );
});

test('dnsFetchResponseBuffer forwards NOTIMP when only upstream returns NOTIMP', async () => {
  const notimpBuffer = encodeNotimpResponse();
  mockQueryDnsBufferResolved(notimpBuffer);
  mockGetDnsServerInfo.mockReturnValue({
    server: {
      tag: 'default',
      dnsList: [{ ip: '208.67.222.222', port: 53 }],
    },
  });
  const query = makeGoogleAnyQuery();
  const dnsResponses: DnsResponse[] = [];
  const ok = await dnsUtil.dnsFetchResponseBuffer(query, dnsResponses, 500);
  assert.equal(ok, true);
  assert.ok(dnsResponses[0].response);
  assert.equal(dnsResponses[0].response.header.rcode, 4);
});

test('google ANY response fixture has NOERROR rcode', () => {
  const responseBuffer = Buffer.from(GOOGLE_ANY_RESPONSE_HEX, 'hex');
  const rcode =
    (responseBuffer[2] << 8 | responseBuffer[3]) & 0xf;
  assert.equal(rcode, 0);
});
