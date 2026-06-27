import * as udp from 'dgram';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { pathToFileURL } from 'url';

import pkg from '../package.json';
import { handleDnsRequest } from './dns-util';
import {
  updateDomains,
  AllDomainList,
  AllDnsServerInfo,
} from './dns-proxy-utils';

const DnsProxyVersion = pkg.version;

const DnsPort = parseInt(process.env.DNS_PORT ?? '53', 10);
const DnsQueryTimeout = 1500;
const DnsTcpMaxMessageLength = 65535;
const DnsTcpReadTimeout = parseInt(
  process.env.DNS_TCP_READ_TIMEOUT_MS ?? `${DnsQueryTimeout}`,
  10,
);
// Bound the response phase: allow the upstream query timeout plus the idle
// window as margin so a slow-but-valid response is not cut off.
const DnsTcpResponseTimeout = DnsQueryTimeout + DnsTcpReadTimeout;

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

export function handleTcpConnection(socket: net.Socket) {
  // DNS over TCP frames each message with a 2-byte big-endian length prefix.
  const receivedChunks: Buffer[] = [];
  let totalReceivedLength = 0;
  // Body length taken from the length prefix; -1 until the prefix is read.
  let expectedBodyLength = -1;
  let isConnectionOpen = true;
  // One timer guards the current phase: first reading the request, then waiting
  // for the upstream response. Firing it tears down an idle or stuck socket.
  let phaseTimer: ReturnType<typeof setTimeout> | undefined;

  function clearPhaseTimer() {
    if (phaseTimer !== undefined) {
      clearTimeout(phaseTimer);
      phaseTimer = undefined;
    }
  }

  function startPhaseTimer(durationMs = DnsTcpReadTimeout) {
    clearPhaseTimer();
    phaseTimer = setTimeout(() => {
      if (!isConnectionOpen) {
        return;
      }
      markConnectionClosed();
      console.log(`TCP connection timeout after ${durationMs}ms`);
      socket.destroy();
    }, durationMs);
  }

  function removeSocketListeners() {
    socket.off('data', onData);
    socket.off('error', onError);
    socket.off('close', onClose);
    clearPhaseTimer();
  }

  // Stop handling this connection: ignore later events and cancel the timer.
  function markConnectionClosed() {
    isConnectionOpen = false;
    removeSocketListeners();
  }

  function sendResponse(responseBuffer: Uint8Array) {
    if (!isConnectionOpen || socket.destroyed) {
      return;
    }
    // The response is being written, so the response-phase timeout is moot.
    clearPhaseTimer();
    const lengthPrefix = Buffer.alloc(2);
    lengthPrefix.writeUInt16BE(responseBuffer.length);
    socket.write(
      Buffer.concat([lengthPrefix, responseBuffer], 2 + responseBuffer.length),
    );
    socket.end();
  }

  function onData(chunk: Buffer) {
    // Any progress resets the idle read timeout.
    startPhaseTimer();
    receivedChunks.push(chunk);
    totalReceivedLength += chunk.length;

    // Decode the length prefix as soon as the first 2 bytes are available;
    // only the 2-byte prefix is needed, so concat caps the copy at 2 bytes.
    if (expectedBodyLength < 0 && totalReceivedLength >= 2) {
      const header = Buffer.concat(receivedChunks, 2);
      expectedBodyLength = header.readUInt16BE(0);
      if (expectedBodyLength > DnsTcpMaxMessageLength) {
        markConnectionClosed();
        console.log(
          `TCP message length ${expectedBodyLength} exceeds max ${DnsTcpMaxMessageLength}`,
        );
        socket.destroy();
        return;
      }
    }

    // Keep reading until the full framed message (prefix + body) has arrived.
    if (expectedBodyLength < 0 || totalReceivedLength < 2 + expectedBodyLength) {
      return;
    }

    // Request complete: stop reading and switch the timer to bound the response
    // phase so a stuck upstream cannot hold the socket open indefinitely.
    socket.off('data', onData);
    startPhaseTimer(DnsTcpResponseTimeout);
    const buffer = Buffer.concat(receivedChunks, totalReceivedLength);
    const message = buffer.subarray(2, 2 + expectedBodyLength);
    handleDnsRequest('tcp', message, sendResponse, DnsQueryTimeout).catch((error) => {
      console.log(
        `handleDnsRequest failed for requestBuffer:${Buffer.from(message).toString('hex')} with error:${error}`,
      );
      markConnectionClosed();
      socket.destroy();
    });
  }

  function onError(err: Error) {
    markConnectionClosed();
    console.log(`TCP connection error: ${err}`);
  }

  function onClose() {
    markConnectionClosed();
  }

  socket.on('data', onData);
  socket.on('error', onError);
  socket.on('close', onClose);
  startPhaseTimer();
}

async function startDnsServer() {
  const server = udp.createSocket('udp4');

  const tags = Object.keys(AllDnsServerInfo);
  for (let i = 0; i < tags.length; i += 1) {
    const tag = tags[i];
    const serverInfo = AllDnsServerInfo[tag];
    if (serverInfo.log) {
      serverInfo.logFile = await fs.promises.open(serverInfo.log, 'a');
    }
  }

  let logFilesClosed = false;
  function closeLogFiles() {
    if (logFilesClosed) {
      return;
    }
    logFilesClosed = true;
    for (let i = 0; i < tags.length; i += 1) {
      const tag = tags[i];
      const serverInfo = AllDnsServerInfo[tag];
      if (serverInfo.logFile) {
        serverInfo.logFile.close();
      }
    }
  }

  server.on('message', (message: Buffer, rinfo) => {
    function sendResponse(responseBuffer: Uint8Array) {
      server.send(responseBuffer, rinfo.port, rinfo.address);
    }
    handleDnsRequest('udp', message, sendResponse, DnsQueryTimeout).catch((error) => {
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
    console.log(`Server version: ${DnsProxyVersion}`);
    console.log(`Server is listening at port: ${port}`);
    console.log(`Server ip: ${ipaddr}`);
    console.log(`Server is IP4/IP6: ${family}`);
  });

  // emits after the socket is closed using socket.close();
  let udpServerClosed = false;
  server.on('close', () => {
    udpServerClosed = true;
    closeLogFiles();
    console.log('Socket is closed!');
  });

  const tcpServer = net.createServer(handleTcpConnection);
  let closingServers = false;
  let tcpServerClosed = false;

  function closeServersAndExit(exitCode: number) {
    if (closingServers) {
      return;
    }
    closingServers = true;
    let pending = 2;
    function tryExit() {
      pending -= 1;
      if (pending === 0) {
        process.exit(exitCode);
      }
    }
    // Account for a server that already closed before this runs; otherwise the
    // pending close event would never fire and the process would hang.
    if (udpServerClosed) {
      tryExit();
    } else {
      server.once('close', tryExit);
      server.close();
    }
    if (tcpServerClosed) {
      tryExit();
    } else {
      tcpServer.once('close', tryExit);
      tcpServer.close();
    }
  }

  server.on('error', (err) => {
    console.log(`Socket error received ${err}`);
    closeServersAndExit(-1);
  });

  tcpServer.on('error', (err) => {
    console.log(`TCP server error received ${err}`);
    closeServersAndExit(-1);
  });

  tcpServer.on('listening', () => {
    const address = tcpServer.address();
    if (address && typeof address === 'object') {
      console.log(`TCP server is listening at port: ${address.port}`);
    }
  });

  tcpServer.on('close', () => {
    tcpServerClosed = true;
    closeLogFiles();
    console.log('TCP socket is closed!');
  });

  server.bind(DnsPort);
  tcpServer.listen(DnsPort);
}

function isMainModule() {
  const entryPoint = process.argv[1];
  return entryPoint !== undefined
    && import.meta.url === pathToFileURL(path.resolve(entryPoint)).href;
}

if (isMainModule()) {
  parseArgs(process.argv);
  startDnsServer();
}
