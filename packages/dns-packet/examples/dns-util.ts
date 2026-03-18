import {
  type DnsPacket,
  Packet,
  ResourceRecordTypes,
  TYPE_INVERTED,
} from '@esutils/dns-packet';
import { delay } from '@esutils/delay';

import {
  queryDnsBuffer,
  type AbortFunction,
  type DnsQueryProtocolType,
  type DnsQueryServerAddress,
} from './dns-basic';
import {
  type DnsResponse,
  dnsResponseAnswerUpdate,
  dnsResponsesSort,
  getDnsServerInfo,
} from './dns-proxy-utils';

export interface DnsQuery {
  type: number;
  protocolType: DnsQueryProtocolType;
  errors: string[];
  domainName: string;
  requestBufferOriginal: Uint8Array;
  requestBuffer: Uint8Array;
  request: DnsPacket;
  responseBuffer: Uint8Array;
}

export interface DnsQueryState {
  aborts: (AbortFunction | undefined)[];
}

export type DnsSendResponseBuffer = (responseBuffer: Uint8Array) => void;

export async function queryDns(
  dnsQueryState: DnsQueryState,
  dnsResponses: DnsResponse[],
  queryPos: number,
  query: DnsQuery,
) {
  const dnsResponse = dnsResponses[queryPos];
  const result = queryDnsBuffer(
    query.requestBuffer,
    query.protocolType,
    dnsResponse.serverAddress,
  );
  dnsQueryState.aborts[queryPos] = result.abort;
  const responseBufferOrError = await result.promise;
  if (responseBufferOrError instanceof Uint8Array) {
    dnsResponse.responseBuffer = responseBufferOrError;
    const packet = Packet.decode(responseBufferOrError, dnsResponse.errors);
    if (dnsResponse.errors.length === 0) {
      dnsResponse.response = packet;
    }
  } else {
    dnsResponse.error = responseBufferOrError;
  }
}

export async function queryDnsParallel(
  serverAddresses: DnsQueryServerAddress[],
  query: DnsQuery,
  dnsResponses: DnsResponse[],
  timeout: number,
): Promise<number[]> {
  for (const serverAddress of serverAddresses) {
    dnsResponses.push({
      serverAddress: serverAddress,
      errors: [],
    });
  }
  const dnsQueryState: DnsQueryState = {
    aborts: new Array<AbortFunction>(serverAddresses.length),
  };
  const promises: Promise<void>[] = [];
  for (let i = 0; i < dnsResponses.length; i += 1) {
    promises.push(queryDns(dnsQueryState, dnsResponses, i, query));
  }
  const timeConsumeStep = 300;
  const timeConsumeStart = performance.now();
  let dnsResponseIndexes: number[] = [];
  for (;;) {
    // delay(timeConsumeStep) used to implement timeout
    const index = await Promise.any(
      [Promise.all(promises), delay(timeConsumeStep)].map((p, i) =>
        p.then(() => i),
      ),
    );
    dnsResponseIndexes = dnsResponsesSort(dnsResponses);
    if (index === 0) {
      // all promise resolved.
      break;
    }
    const response = dnsResponses[dnsResponseIndexes[0]].response;
    if (
      performance.now() - timeConsumeStart > timeout ||
      (response &&
        (response.answers.length > 0 || response.authorities.length > 0))
    ) {
      // The total timeout deadline reached, abort them unconditionally
      // Or one of them have fetched the valid packet, means other dnsResponses can abort.
      for (const abort of dnsQueryState.aborts) {
        if (abort) {
          abort();
        }
      }
    }
  }
  return dnsResponseIndexes;
}

export async function dnsFetchResponseBuffer(
  query: DnsQuery,
  dnsResponses: DnsResponse[],
  timeout: number,
) {
  const requestPacketOriginal = Packet.decode(
    query.requestBufferOriginal,
    query.errors,
  );
  if (query.errors.length === 0) {
    const questions = requestPacketOriginal.questions.filter(
      (x) => ResourceRecordTypes.indexOf(x.type) >= 0,
    );
    query.request = Object.assign({}, requestPacketOriginal);
    if (questions.length != requestPacketOriginal.questions.length) {
      query.request.questions = questions;
    }
    if (questions.length > 0) {
      query.domainName = questions[0].name;
      query.type = questions[0].type;
    }
    query.requestBuffer = Packet.encode(query.request, query.errors);
  }

  if (query.errors.length > 0 || query.domainName.length == 0) {
    return false;
  }

  const dnsServer = getDnsServerInfo(query.domainName);
  const dnsResponseIndexes = await queryDnsParallel(
    dnsServer.server.dnsList,
    query,
    dnsResponses,
    timeout,
  );
  const dnsClientChoosed = dnsResponses[dnsResponseIndexes[0]];
  // Default use the original responseBuffer buffer
  if (dnsClientChoosed.responseBuffer) {
    query.responseBuffer = dnsClientChoosed.responseBuffer;
  }
  if (!dnsClientChoosed.response) {
    return false;
  }

  const response: DnsPacket = {
    header: query.request.header,
    questions: query.request.questions,
    answers: [],
    authorities: [],
    additionals: [],
  };
  const responseChoosed = dnsClientChoosed.response;
  response.header = responseChoosed.header;
  response.questions = responseChoosed.questions;
  response.answers = responseChoosed.answers;
  response.authorities = responseChoosed.authorities;
  response.additionals = responseChoosed.additionals;

  // Record the queried results
  const newAnswerLog = dnsResponseAnswerUpdate(
    query.domainName,
    query.type,
    response,
    dnsServer,
    dnsClientChoosed.serverAddress,
  );
  if (dnsServer.server.logFile && newAnswerLog.length > 0) {
    dnsServer.server.logFile.write(newAnswerLog);
  }
  const responseBufferEncoded = Packet.encode(
    response,
    dnsClientChoosed.errors,
  );
  if (dnsClientChoosed.errors.length > 0) {
    return false;
  }
  query.responseBuffer = responseBufferEncoded;
  return true;
}

export function dumpDnsResponses(query: DnsQuery, dnsResponses: DnsResponse[]) {
  let message = `Request dns for type: ${TYPE_INVERTED[query.type]} domain:'${query.domainName}'\n`;
  message += ` requestPackage:${JSON.stringify(query.request)}\n`;
  if (query.errors.length > 0) {
    message += ` requestPackage encode errors: ${query.errors.join(';')}\n`;
  }
  message += ` requestBufferOriginal: ${Buffer.from(query.requestBufferOriginal).toString('hex')}\n`;
  message += ` requestBuffer: ${Buffer.from(query.requestBuffer).toString('hex')}\n`;
  message += ` responseBufferC: ${Buffer.from(query.responseBuffer).toString('hex')}\n`;
  for (const dnsResponse of dnsResponses) {
    message += ` By ${dnsResponse.serverAddress.ip}\n`;
    if (dnsResponse.responseBuffer) {
      message += `  responseBuffer: ${Buffer.from(dnsResponse.responseBuffer).toString('hex')}\n`;
      message += `  response: ${JSON.stringify(dnsResponse.response)}\n`;
    } else {
      message += `  failed with error: ${dnsResponse.error}\n`;
    }
    if (dnsResponse.errors.length > 0) {
      message += `  errors: ${dnsResponse.errors.join(';')}\n`;
    }
  }
  return message;
}

export async function handleDnsRequest(
  type: DnsQueryProtocolType,
  message: Uint8Array,
  sendResponseBuffer: DnsSendResponseBuffer,
  timeout: number,
) {
  const query: DnsQuery = {
    type: 0,
    protocolType: type,
    requestBufferOriginal: message,
    requestBuffer: message,
    responseBuffer: message, // Directly ack with the request message
    domainName: '',
    errors: [],
    request: Packet.create(),
  };
  const dnsResponses: DnsResponse[] = [];
  let needDump = false;
  try {
    const dnsFetched = await dnsFetchResponseBuffer(
      query,
      dnsResponses,
      timeout,
    );
    needDump = !dnsFetched;
  } catch (error) {
    console.log(error);
    if (error instanceof Error) {
      console.log(error.stack);
    }
    needDump = true;
  }
  if (needDump || process.env.DNS_ENABLE_UDP_DUMP === '1') {
    console.log(dumpDnsResponses(query, dnsResponses));
  }

  sendResponseBuffer(query.responseBuffer);
}
