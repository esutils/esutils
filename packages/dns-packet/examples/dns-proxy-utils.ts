import * as fs from 'fs';
import * as net from 'net';

import {
  CLASS,
  type DnsResourceAddress,
  TYPE,
  type DnsPacket,
  TYPE_INVERTED,
} from '@esutils/dns-packet';

import { type DnsQueryServerAddress } from './dns-basic';

export interface DnsServerInfo {
  tag: string;
  log?: string;
  logFile?: fs.promises.FileHandle;
  dnsList: DnsQueryServerAddress[];
}

export interface DnsServerInfoFound {
  resolved?: string;
  server: DnsServerInfo;
}

export interface DnsServerDomainList {
  domains: Record<string, boolean | string>;
  tag: string;
}

export interface DnsResponse {
  serverAddress: DnsQueryServerAddress;

  errors: string[];
  response?: DnsPacket;
  responseBuffer?: Uint8Array;
  error?: Error;
}

export function updateDomainsFromLine(
  domains: Record<string, boolean | string>,
  line: string,
) {
  const lineTrimmed = line.trim();
  if (lineTrimmed.startsWith('#')) {
    return;
  }
  const domainMap = line.trim().split(' ');
  if (domainMap.length === 1) {
    domains[domainMap[0]] = true;
  } else if (domainMap.length === 2) {
    const [key, value] = domainMap;
    domains[key] = value;
  }
}

export function updateDomains(
  domains: Record<string, boolean | string>,
  filePath: string,
) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r\n|\n\r|\n|\r/);
  for (let i = 0; i < lines.length; i += 1) {
    updateDomainsFromLine(domains, lines[i]);
  }
}

export function checkDomains(
  domains: Record<string, boolean | string>,
  domainItems: string[],
) {
  // Support matching both python.org and .python.org
  const fullDomain = domainItems.join('.');
  if (Object.hasOwn(domains, fullDomain)) {
    return domains[fullDomain];
  }
  if (Object.hasOwn(domains, `.${fullDomain}`)) {
    return domains[`.${fullDomain}`];
  }
  for (let i = 1; i < domainItems.length; i += 1) {
    const subDomain = domainItems.slice(i).join('.');
    if (Object.hasOwn(domains, `.${subDomain}`)) {
      return domains[`.${subDomain}`];
    }
  }

  return false;
}

export const AllDomainList: DnsServerDomainList[] = [];
export const AllDnsServerInfo: Record<string, DnsServerInfo> = {};

export function getDnsServerInfo(domain: string): DnsServerInfoFound {
  const domainItems = domain.split('.');
  for (let i = 0; i < AllDomainList.length; i += 1) {
    const resolved = checkDomains(AllDomainList[i].domains, domainItems);
    if (resolved === true) {
      return {
        server: AllDnsServerInfo[AllDomainList[i].tag],
      };
    } else if (typeof resolved === 'string') {
      return {
        resolved,
        server: AllDnsServerInfo[AllDomainList[i].tag],
      };
    }
  }
  return {
    server: AllDnsServerInfo.default,
  };
}

export function dnsResponsesSort(dnsResponses: DnsResponse[]) {
  return dnsResponses
    .map((_, index) => index)
    .sort((a, b) => {
      const dnsResponseA = dnsResponses[a];
      const dnsResponseB = dnsResponses[b];
      if (!!dnsResponseA.response !== !!dnsResponseB.response) {
        return dnsResponseA.response ? -1 : 1;
      }
      if (dnsResponseA.response && dnsResponseB.response) {
        const packetA = dnsResponseA.response;
        const packetB = dnsResponseB.response;
        if (packetA.answers.length !== packetB.answers.length) {
          return packetB.answers.length - packetA.answers.length;
        }
        if (packetA.authorities.length !== packetB.authorities.length) {
          return packetB.authorities.length - packetA.authorities.length;
        }
        if (packetA.additionals.length !== packetB.additionals.length) {
          return packetB.additionals.length - packetA.additionals.length;
        }
        return a - b;
      }
      if (!!dnsResponseA.responseBuffer !== !!dnsResponseB.responseBuffer) {
        return dnsResponseA.responseBuffer ? -1 : 1;
      }
      return a - b;
    });
}

export function dnsResponseAnswerUpdate(
  name: string,
  questionType: number,
  response: DnsPacket,
  dnsServer: DnsServerInfoFound,
  address: DnsQueryServerAddress,
) {
  const DnsRecordTypeCanResolve = [TYPE.A, TYPE.AAAA, TYPE.ANY];
  if (
    dnsServer.resolved &&
    DnsRecordTypeCanResolve.indexOf(questionType) >= 0
  ) {
    // 39.156.66.10;110.242.68.66
    const ipList = dnsServer.resolved.split(';');
    for (let pi = 0; pi < ipList.length; pi += 1) {
      const ip = ipList[pi];
      if (net.isIP(ip) > 0) {
        const addr: DnsResourceAddress = {
          name,
          type: net.isIPv6(ip) ? TYPE.AAAA : TYPE.A,
          class: CLASS.IN,
          address: ip,
          ttl: 300,
          errors: [],
        };
        if (questionType === addr.type || questionType === TYPE.ANY) {
          // The address of custom resolved place at the beginnning
          response.answers.unshift(addr);
        }
      }
    }
    response.header.rcode = 0;
  }
  const ipv4Addresses: string[] = [];
  const ipv6Addresses: string[] = [];
  for (const answer of response.answers) {
    const address = (answer as DnsResourceAddress).address;
    if (answer.type === TYPE.A) {
      ipv4Addresses.push(address);
    } else if (answer.type === TYPE.AAAA) {
      ipv6Addresses.push(address);
    }
  }
  let newAnswerLog = '';
  if (questionType === TYPE.A || questionType === TYPE.ANY) {
    newAnswerLog += `${[address.ip, name, TYPE_INVERTED[questionType], ipv4Addresses.join(';')].join(',')}\n`;
  }
  if (questionType === TYPE.AAAA || questionType === TYPE.ANY) {
    newAnswerLog += `${[address.ip, name, TYPE_INVERTED[questionType], ipv6Addresses.join(';')].join(',')}\n`;
  }
  return newAnswerLog;
}
