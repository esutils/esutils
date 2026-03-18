import * as udp from 'dgram';
import * as fs from 'fs';

import { handleDnsRequest } from './dns-util';
import {
  updateDomains,
  AllDomainList,
  AllDnsServerInfo,
} from './dns-proxy-utils';

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
          AllDnsServerInfo[argt].log = argp;
        } else {
          AllDnsServerInfo[argt].dnsList.push({
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
      serverInfo.logFile = await fs.promises.open(serverInfo.log, 'a');
    }
  }

  server.on('message', (message: Buffer, rinfo) => {
    function sendResponse(responseBuffer: Uint8Array) {
      server.send(responseBuffer, rinfo.port, rinfo.address);
    }
    handleDnsRequest('udp', message, sendResponse, 1500).catch((error) => {
      console.log(
        `handleDnsRequest failed for requestBuffer:${Buffer.from(message).toString('hex')} with error:${error}`,
      );
    });
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

  server.on('error', (err) => {
    console.log(`Socket error received ${err}`);
    process.exit(-1);
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
    console.log('Socket is closed!');
  });

  server.bind(DnsPort);
}

startDnsServer();
