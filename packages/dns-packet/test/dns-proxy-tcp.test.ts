import assert from 'assert';
import { spawn } from 'child_process';
import * as udp from 'dgram';
import * as net from 'net';
import * as path from 'path';
import { fileURLToPath } from 'url';

import { jest } from '@jest/globals';

const DnsAQueryGoogle = Buffer.from(
  '00020100000100000000000006676f6f676c6503636f6d0000010001',
  'hex',
);

import { handleDnsRequest } from '../examples/dns-util';

const mockHandleDnsRequest = jest.fn<typeof handleDnsRequest>();

process.env.DNS_TCP_READ_TIMEOUT_MS = '100';

await jest.unstable_mockModule('../examples/dns-util', () => ({
  handleDnsRequest: mockHandleDnsRequest,
}));

const { handleTcpConnection } = await import('../examples/dns-proxy');

// Resolve the package directory from this test file so the spawned child works
// regardless of which jest config (root or package) drives the suite.
const packageDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

function listenTcp(
  onConnection?: (socket: net.Socket) => void,
): Promise<{ server: net.Server; port: number }> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((socket) => {
      if (onConnection) {
        onConnection(socket);
      }
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('listen failed'));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}

function listenTcpPort(port: number): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, () => {
      resolve(server);
    });
  });
}

function listenUdp(): Promise<{ socket: udp.Socket; port: number }> {
  return new Promise((resolve, reject) => {
    const socket = udp.createSocket('udp4');
    socket.once('error', reject);
    socket.bind(0, () => {
      const address = socket.address();
      if (typeof address === 'string') {
        reject(new Error('listen failed'));
        return;
      }
      resolve({ socket, port: address.port });
    });
  });
}

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function closeSocket(socket: udp.Socket): Promise<void> {
  return new Promise((resolve) => {
    socket.close(() => resolve());
  });
}

function frameMessage(message: Buffer): Buffer {
  const framed = Buffer.alloc(2 + message.length);
  framed.writeUInt16BE(message.length);
  message.copy(framed, 2);
  return framed;
}

beforeEach(() => {
  mockHandleDnsRequest.mockReset();
});

test('handleTcpConnection forwards framed response', async () => {
  const responseBody = Buffer.from('abcd');
  const forwardImpl: typeof handleDnsRequest = (
    _type,
    _message,
    sendResponse,
    _timeout,
  ) => {
    sendResponse(responseBody);
    return Promise.resolve();
  };
  mockHandleDnsRequest.mockImplementation(forwardImpl);

  const { server, port } = await listenTcp(handleTcpConnection);
  const client = net.connect(port, '127.0.0.1');
  client.write(frameMessage(DnsAQueryGoogle));

  const response = await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    client.on('data', (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const buf = Buffer.concat(chunks);
      if (buf.length >= 2) {
        const len = buf.readUInt16BE(0);
        if (buf.length >= 2 + len) {
          resolve(buf.subarray(2, 2 + len));
        }
      }
    });
    client.once('error', reject);
  });

  assert.deepEqual(response, responseBody);
  client.end();
  await closeServer(server);
});

test('handleTcpConnection disconnect mid-read does not call handleDnsRequest', async () => {
  const { server, port } = await listenTcp(handleTcpConnection);
  const client = net.connect(port, '127.0.0.1');
  client.write(Buffer.from([0x00, 0x1c]));
  client.destroy();

  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(mockHandleDnsRequest.mock.calls.length, 0);
  await closeServer(server);
});

test('handleTcpConnection partial read times out', async () => {
  const { server, port } = await listenTcp(handleTcpConnection);
  const client = net.connect(port, '127.0.0.1');
  client.write(Buffer.from([0x00, 0x1c]));

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.equal(mockHandleDnsRequest.mock.calls.length, 0);
  client.destroy();
  await closeServer(server);
});

test('handleTcpConnection ignores sendResponse after disconnect', async () => {
  const lateResponseImpl: typeof handleDnsRequest = (
    _type,
    _message,
    sendResponse,
    _timeout,
  ) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        sendResponse(Buffer.from('late'));
        resolve();
      }, 50);
    });
  };
  mockHandleDnsRequest.mockImplementation(lateResponseImpl);

  const { server, port } = await listenTcp(handleTcpConnection);
  const client = net.connect(port, '127.0.0.1');
  client.write(frameMessage(DnsAQueryGoogle));
  await new Promise((resolve) => setTimeout(resolve, 10));
  client.destroy();

  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(mockHandleDnsRequest.mock.calls.length, 1);
  await closeServer(server);
});

test('dns-proxy startup shutdown handles duplicate listener errors', async () => {
  const udpBlocker = await listenUdp();
  const tcpBlocker = await listenTcpPort(udpBlocker.port);
  try {
    const result = await new Promise<{
      code: number | null;
      killed: boolean;
      output: string;
    }>((resolve) => {
      const child = spawn(
        process.execPath,
        ['--import=tsx', 'examples/dns-proxy.ts'],
        {
          cwd: packageDir,
          env: {
            ...process.env,
            DNS_PORT: `${udpBlocker.port}`,
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      const chunks: Buffer[] = [];
      let killed = false;
      const timer = setTimeout(() => {
        killed = true;
        child.kill();
      }, 5000);
      child.stdout.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      child.stderr.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          code,
          killed,
          output: Buffer.concat(chunks).toString(),
        });
      });
    });

    assert.equal(result.killed, false);
    assert.notEqual(result.code, 0);
    assert.ok(
      result.output.includes('Socket error received')
        || result.output.includes('TCP server error received'),
      `expected listener-error output, got: ${result.output}`,
    );
    assert.equal(result.output.includes('ERR_SOCKET_DGRAM_NOT_RUNNING'), false);
  } finally {
    await closeServer(tcpBlocker);
    await closeSocket(udpBlocker.socket);
  }
});
