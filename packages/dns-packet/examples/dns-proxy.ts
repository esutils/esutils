import * as udp from 'dgram';
import * as fs from 'fs';
import * as net from 'net';

import {
  CLASS,
  decodeResponseDefault,
  DnsPacket,
  DnsResponse,
  DnsResponseA,
  DnsResponseAddress,
  encodeResponseDefault,
  Packet,
  TYPE,
} from '@esutils/dns-packet';

import { queryMultipleDNS } from './dns-util';
import { updateDomains, checkDomains, DnsServerInfo } from './dns-proxy-utils';

const DnsPort = parseInt(process.env.DNS_PORT ?? '53', 10);

const HelpInfo = `
--help Print the help
  -?
  -h

--domain-list <tag> <file>
  Can specify multiple times, the priority are depends on it's appear time
    <tag> one of 'main' 'auxiliary' 'default'
    <file> The file path of domain list that pass through main dns server;
--log <tag> <file>
  Can specify multiple times
    <tag> one of 'main' 'auxiliary' 'default'
    <file> The file path to record main dns query
--dns <tag> <ip>
  Can specify multiple times
    <tag> one of 'main' 'auxiliary' 'default'
    <ip> The ip of main dns server
`;

interface DomainList {
  domains: Record<string, boolean | string>
  tag: string
}

const AllDomainList: DomainList[] = [];
const AllDnsServerInfo: Record<string, DnsServerInfo> = {};

function parseArgs(argv: string[]) {
  let hasHelp = false;
  for (let i = 1; i < argv.length; i += 1) {
    const argi = argv[i];
    if (argi === '--help' || argi === '-h' || argi === '-?') {
      hasHelp = true;
      break;
    } else if (i < argv.length - 2) {
      const argt = argv[i + 1];
      const argp = argv[i + 2];
      if (argi === '--domain-list') {
        const domains = {};
        updateDomains(domains, argp);
        AllDomainList.push({
          tag: argt,
          domains,
        });
        i += 2;
      } else if (argi === '--log' || argi === '--dns') {
        if (!Object.hasOwn(AllDnsServerInfo, argt)) {
          AllDnsServerInfo[argt] = {
            tag: argt,
            dnsList: [],
          };
        }
        if (argi === '--log') {
          AllDnsServerInfo[argt]!.log = argp;
        } else {
          AllDnsServerInfo[argt]!.dnsList.push({
            ip: argp,
            port: 53,
          });
        }
        i += 2;
      }
    }
  }
  if (hasHelp) {
    console.log(HelpInfo);
    process.exit(0);
  }
}

parseArgs(process.argv);

interface DnsServerInfoFound {
  resolved: boolean | string
  server: DnsServerInfo
}

function getDnsServerInfo(domain: string): DnsServerInfoFound {
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

async function startDnsServer() {
  const server = udp.createSocket('udp4');
  // emits when any error occurs
  server.on('error', (error) => {
    console.log(`Error: ${error}`);
    server.close();
  });

  const tags = Object.keys(AllDnsServerInfo);
  for (let i = 0; i < tags.length; i += 1) {
    const tag = tags[i];
    const serverInfo = AllDnsServerInfo[tag];
    if (serverInfo.log) {
      // eslint-disable-next-line no-await-in-loop
      serverInfo.logFile = await fs.promises.open(serverInfo.log, 'a');
    }
  }
  server.on('message', async (message, rinfo) => {
    const request = Packet.decode(message, decodeResponseDefault);
    const questions = request.questions.filter(
      (x) => x.type === TYPE.A || x.type === TYPE.AAAA || x.type === TYPE.CNAME,
    );
    const response: DnsPacket = {
      header: request.header,
      errors: [],
      questions: request.questions,
      answers: [],
      authorities: [],
      additionals: [],
    };
    if (questions.length === 1) {
      try {
        const { name } = questions[0]!;
        const dnsServer = getDnsServerInfo(name);
        const parallelResponse = await queryMultipleDNS(dnsServer.server.dnsList, questions);
        response.header = parallelResponse.packet.header;
        response.header.id = request.header.id;
        response.questions = parallelResponse.packet.questions;
        response.answers = parallelResponse.packet.answers;
        response.authorities = parallelResponse.packet.authorities;
        response.additionals = parallelResponse.packet.additionals;
        const answersFiltered: DnsResponse[] = [];
        let newAnswerLog = `${name} ${parallelResponse.ip} addrs:`;
        for (let i = 0; i < response.answers.length; i += 1) {
          const answer = response.answers[i];
          if (answer.type === TYPE.A || answer.type === TYPE.AAAA) {
            const answerIp = answer as DnsResponseAddress;
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
              const addr: DnsResponseA = {
                name,
                type: net.isIPv6(ip) ? TYPE.AAAA : TYPE.A,
                class: CLASS.IN,
                address: ip,
                ttl: 300,
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

        if (dnsServer.server.logFile) {
          dnsServer.server.logFile.write(newAnswerLog);
        }
      } catch (error) {
        let printError = true;
        if (error instanceof AggregateError) {
          for (let i = 0; i < error.errors.length; i += 1) {
            const childError = error.errors[i] as Error;
            if (childError.message.indexOf('request timedout for') < 0) {
              printError = false;
            }
          }
        }
        if (printError) {
          console.log(error);
        }
      }
    }
    // console.log(`The naswer is: ${JSON.stringify(response.answers)}`);
    const responseBuffer = Packet.encode(response, encodeResponseDefault);
    server.send(responseBuffer, rinfo.port, rinfo.address);
  });

  // emits when socket is ready and listening for datagram msgs
  server.on('listening', () => {
    const address = server.address();
    const { port } = address;
    const { family } = address;
    const ipaddr = address.address;
    console.log(`Server is listening at port: ${port}`);
    console.log(`Server ip: ${ipaddr}`);
    console.log(`Server is IP4/IP6: ${family}`);
  });

  // emits after the socket is closed using socket.close();
  server.on('close', () => {
    for (let i = 0; i < tags.length; i += 1) {
      const tag = tags[i];
      const serverInfo = AllDnsServerInfo[tag];
      if (serverInfo.logFile) {
        serverInfo.logFile.close();
      }
    }
    console.log('Socket is closed !');
  });

  server.bind(DnsPort);
}

startDnsServer();
