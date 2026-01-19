import * as fs from 'fs';
import { DnsServerAddress } from './dns-util';

export interface DnsServerInfo {
  tag: string
  log?: string
  logFile?: fs.promises.FileHandle
  dnsList: DnsServerAddress[]
}

export function updateDomainsFromLine(domains: Record<string, boolean | string>, line: string) {
  const domainMap = line.trim().split(' ');
  if (domainMap.length === 1) {
    domains[domainMap[0]] = true;
  } else if (domainMap.length === 2) {
    const [key, value] = domainMap;
    domains[key] = value;
  }
}

export function updateDomains(domains: Record<string, boolean | string>, filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r\n|\n\r|\n|\r/);
  for (let i = 0; i < lines.length; i += 1) {
    updateDomainsFromLine(domains, lines[i]);
  }
}

export function checkDomains(domains: Record<string, boolean | string>, domainItems: string[]) {
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
