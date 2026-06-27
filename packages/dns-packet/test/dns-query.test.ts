import assert from 'assert';
import * as net from 'net';

import { delay } from '@esutils/delay';

import { buildDnsQueryParameters, queryDnsBuffer } from '../examples/dns-query';

const DnsAQueryGoogle = Buffer.from(
  '00020100000100000000000006676f6f676c6503636f6d0000010001',
  'hex',
) as Uint8Array;

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

function closeServer(server: net.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

test('queryDnsBuffer tcp abort on pending connect resolves without hanging', async () => {
  const { server, port } = await listenTcp();
  await closeServer(server);

  const result = queryDnsBuffer(DnsAQueryGoogle, {
    protocolType: 'tcp',
    serverAddress: { ip: '127.0.0.1', port },
  });
  result.abort!();
  const res = await Promise.race([
    result.promise,
    delay(200).then(() => 'timeout'),
  ]);
  assert.notStrictEqual(res, 'timeout');
  assert.ok(res instanceof Error);
});

test('queryDnsBuffer tcp abort synchronously after start resolves', async () => {
  const { server, port } = await listenTcp((socket) => {
    socket.on('data', () => {
      // Hold the connection open after the request arrives.
    });
  });

  const result = queryDnsBuffer(DnsAQueryGoogle, {
    protocolType: 'tcp',
    serverAddress: { ip: '127.0.0.1', port },
  });
  result.abort!();
  const res = await Promise.race([
    result.promise,
    delay(200).then(() => 'timeout'),
  ]);
  assert.notStrictEqual(res, 'timeout');
  assert.ok(res instanceof Error);

  await closeServer(server);
});

test('queryDnsBuffer tcp abort while waiting for response resolves quickly', async () => {
  const { server, port } = await listenTcp((socket) => {
    socket.on('data', () => {
      // Do not send a response.
    });
  });

  const result = queryDnsBuffer(DnsAQueryGoogle, {
    protocolType: 'tcp',
    serverAddress: { ip: '127.0.0.1', port },
  });
  await delay(50);
  result.abort!();

  const start = performance.now();
  const res = await Promise.race([
    result.promise,
    delay(200).then(() => 'timeout'),
  ]);
  assert.notStrictEqual(res, 'timeout');
  assert.ok(res instanceof Error);
  assert.ok(performance.now() - start < 500);

  await closeServer(server);
});

test('queryDnsBuffer tcp round-trip', async () => {
  const { server, port } = await listenTcp((socket) => {
    socket.on('data', (chunk: Buffer) => {
      const len = chunk.readUInt16BE(0);
      const msg = Buffer.from(chunk.subarray(2, 2 + len));
      msg[2] |= 0x80;
      const out = Buffer.alloc(2 + msg.length);
      out.writeUInt16BE(msg.length);
      msg.copy(out, 2);
      socket.end(out);
    });
  });

  const result = queryDnsBuffer(DnsAQueryGoogle, {
    protocolType: 'tcp',
    serverAddress: { ip: '127.0.0.1', port },
  });
  const res = await result.promise;
  assert.ok(res instanceof Uint8Array);
  assert.strictEqual(res[2] & 0x80, 0x80);

  await closeServer(server);
});

test('buildDnsQueryParameters udp inbound uses udp only', () => {
  const servers = [
    { ip: '8.8.8.8', port: 53 },
    { ip: '1.1.1.1', port: 53 },
  ];
  const parameters = buildDnsQueryParameters(servers, 'udp');
  assert.equal(parameters.length, 2);
  assert.deepEqual(
    parameters.map((p) => p.protocolType),
    ['udp', 'udp'],
  );
});

test('buildDnsQueryParameters tcp inbound uses tcp and udp per server', () => {
  const servers = [{ ip: '8.8.8.8', port: 53 }];
  const parameters = buildDnsQueryParameters(servers, 'tcp');
  assert.equal(parameters.length, 2);
  assert.deepEqual(
    parameters.map((p) => p.protocolType),
    ['tcp', 'udp'],
  );
  assert.deepEqual(
    parameters.map((p) => p.serverAddress.ip),
    ['8.8.8.8', '8.8.8.8'],
  );
});
