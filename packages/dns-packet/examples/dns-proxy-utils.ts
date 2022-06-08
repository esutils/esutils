import * as fs from 'fs';
import { DnsServerItem } from './dns-util';

export interface DnsServerInfo {
  tag: string
  log?: string
  logFile?: fs.promises.FileHandle
  dnsList: DnsServerItem[]
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
  for (let i = domainItems.length - 1; i >= 0; i -= 1) {
    const subDomain = domainItems.slice(i).join('.');
    // Support matching both python.org and .python.org
    if (Object.hasOwn(domains, subDomain)) {
      return domains[subDomain];
    }
    if (Object.hasOwn(domains, `.${subDomain}`)) {
      return domains[`.${subDomain}`];
    }
  }

  return false;
}
