import * as udp from 'dgram';
import * as fs from 'fs';

import {
  decodeResponseDefault,
  DnsPacket,
  DnsResponseAddress,
  encodeResponseDefault,
  Packet,
  TYPE,
} from '@esutils/dns-packet';

import { DnsServerItem, queryMultipleDNS } from './dns-util';

const DnsPort = parseInt(process.env.DNS_PORT ?? '53', 10);

function updateDomains(domains: Record<string, number>, filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r\n|\n\r|\n|\r/);
  for (let i = 0; i < lines.length; i += 1) {
    domains[lines[i]] = 1;
  }
}

const DnsServerListMain: DnsServerItem[] = [];

const DnsServerListAuxiliary: DnsServerItem[] = [];

const DnsServerListDefault: DnsServerItem[] = [];

const HelpInfo = `
--help Print the help
  -?
  -h

--main <file> The file path of domain list that pass through main dns server;
              Can specify multiple times
--main-log <file> The file path to record main dns query, optional
--main-dns <ip> The ip of main dns server, Can specify multiple times

--auxiliary <file> The file path of domain list that pass through auxiliary dns server;
                   Can specify multiple times
--auxiliary-log <file> The file path to record auxiliary dns query, optional
--auxiliary-dns <ip> The ip of auxiliary dns server, Can specify multiple times

--default-dns <ip> The ip of default dns server, Can specify multiple times
`;

function parseArgs(argv: string[]) {
  const mainDomains = {};
  const auxiliaryDomains = {};
  let mainLog: string | undefined;
  let auxiliaryLog: string | undefined;
  let hasHelp = false;
  for (let i = 1; i < argv.length; i += 1) {
    const argi = argv[i];
    if (argi === '--help' || argi === '-h' || argi === '-?') {
      hasHelp = true;
      break;
    } else if (i < argv.length - 1) {
      const argp = argv[i + 1];
      if (argi === '--main') {
        updateDomains(mainDomains, argp);
        i += 1;
      } else if (argi === '--auxiliary') {
        updateDomains(auxiliaryDomains, argp);
        i += 1;
      } else if (argi === '--main-dns') {
        DnsServerListMain.push({
          ip: argp,
          port: 53,
        });
      } else if (argi === '--auxiliary-dns') {
        DnsServerListAuxiliary.push({
          ip: argp,
          port: 53,
        });
      } else if (argi === '--default-dns') {
        DnsServerListDefault.push({
          ip: argp,
          port: 53,
        });
      } else if (argi === '--main-log') {
        mainLog = argp;
      } else if (argi === '--auxiliary-log') {
        auxiliaryLog = argp;
      }
    }
  }
  if (hasHelp) {
    console.log(HelpInfo);
    process.exit(0);
  }
  return {
    mainDomains,
    mainLog,
    auxiliaryDomains,
    auxiliaryLog,
  };
}

const domainsInfo = parseArgs(process.argv);

function getDnsList(domain: string): DnsServerItem[] {
  const domainItems = domain.split('.');
  for (let i = domainItems.length - 1; i >= 0; i -= 1) {
    const subDomain = domainItems.slice(i).join('.');
    if (Object.hasOwn(domainsInfo.mainDomains, subDomain)) {
      return DnsServerListMain;
    }

    if (Object.hasOwn(domainsInfo.auxiliaryDomains, subDomain)) {
      return DnsServerListAuxiliary;
    }
  }

  return DnsServerListDefault;
}

async function startDnsServer() {
  const server = udp.createSocket('udp4');
  // emits when any error occurs
  server.on('error', (error) => {
    console.log(`Error: ${error}`);
    server.close();
  });

  // emits on new datagram msg
  let mainLogFile: fs.promises.FileHandle | undefined;
  if (domainsInfo.mainLog) {
    mainLogFile = await fs.promises.open(domainsInfo.mainLog, 'a');
  }
  let auxiliaryLogFile: fs.promises.FileHandle | undefined;
  if (domainsInfo.auxiliaryLog) {
    auxiliaryLogFile = await fs.promises.open(domainsInfo.auxiliaryLog, 'a');
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
        const dnsList = getDnsList(name);
        const parallelResponse = await queryMultipleDNS(dnsList, questions);
        response.header = parallelResponse.packet.header;
        response.header.id = request.header.id;
        response.questions = parallelResponse.packet.questions;
        response.answers = parallelResponse.packet.answers;
        response.authorities = parallelResponse.packet.authorities;
        response.additionals = parallelResponse.packet.additionals;
        for (let i = 0; i < response.answers.length; i += 1) {
          const answer = response.answers[i];
          if (answer.type === TYPE.A || answer.type === TYPE.AAAA) {
            const answerIp = answer as DnsResponseAddress;
            const logItem = `${name} ${answerIp.address}\n`;
            if (mainLogFile && dnsList === DnsServerListMain) {
              mainLogFile.write(logItem);
            }
            if (auxiliaryLogFile && dnsList === DnsServerListAuxiliary) {
              auxiliaryLogFile.write(logItem);
            }
          }
        }
      } catch (error) {
        if (error instanceof AggregateError) {
          console.log(error.errors);
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
    if (mainLogFile) {
      mainLogFile.close();
    }
    if (auxiliaryLogFile) {
      auxiliaryLogFile.close();
    }
    console.log('Socket is closed !');
  });

  server.bind(DnsPort);
}

startDnsServer();
