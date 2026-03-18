import * as fs from 'fs';
import * as net from 'net';

import {
  CLASS,
  type DnsResourceA,
  type DnsResourceAddress,
  TYPE,
  type DnsPacket,
  type DnsResource,
} from '@esutils/dns-packet';

import { type DnsQueryServerAddress } from './dns-basic';

export interface DnsServerInfo {
  tag: string;
  log?: string;
  logFile?: fs.promises.FileHandle;
  dnsList: DnsQueryServerAddress[];
}

export interface DnsServerInfoFound {
  resolved: boolean | string;
  server: DnsServerInfo;
}

export interface DnsServerDomainList {
  domains: Record<string, boolean | string>;
  tag: string;
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
    if (resolved) {
      return {
        resolved,
        server: AllDnsServerInfo[AllDomainList[i].tag],
      };
    }
  }
  return {
    resolved: true,
    server: AllDnsServerInfo.default,
  };
}

export function dnsResponseAnswerUpdate(
  name: string,
  questionType: number,
  response: DnsPacket,
  dnsServer: DnsServerInfoFound,
  address: DnsQueryServerAddress,
) {
  const answersFiltered: DnsResource[] = [];
  let newAnswerLog = `${name} ${address.ip} addrs:`;
  for (let i = 0; i < response.answers.length; i += 1) {
    const answer = response.answers[i];
    if (answer.type === TYPE.A || answer.type === TYPE.AAAA) {
      const answerIp = answer as DnsResourceAddress;
      newAnswerLog = `${newAnswerLog} ${answerIp.address}`;
      if (dnsServer.resolved === true) {
        answersFiltered.push(answer);
      }
    } else {
      answersFiltered.push(answer);
    }
  }
  if (typeof dnsServer.resolved === 'string') {
    // 39.156.66.10;110.242.68.66
    const ipList = dnsServer.resolved.split(';');
    for (let pi = 0; pi < ipList.length; pi += 1) {
      const ip = ipList[pi];
      if (net.isIP(ip) > 0) {
        const addr: DnsResourceA = {
          name,
          type: net.isIPv6(ip) ? TYPE.AAAA : TYPE.A,
          class: CLASS.IN,
          address: ip,
          ttl: 300,
          errors: [],
        };
        answersFiltered.push(addr);
      }
    }
    newAnswerLog = `${newAnswerLog} override with:${dnsServer.resolved}\n`;
    response.header.rcode = 0;
  } else {
    newAnswerLog = `${newAnswerLog}\n`;
  }
  response.answers = answersFiltered;
  return newAnswerLog;
}
