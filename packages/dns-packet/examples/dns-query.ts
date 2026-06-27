import * as udp from 'dgram';
import * as net from 'net';
import * as tls from 'tls';

import { readStream } from './dns-net';
import { type AbortablePromise } from './abortable-promise';

export interface DnsQueryServerAddress {
  ip: string;
  port: number;
}

export type DnsQueryProtocolType =
  | 'udp'
  | 'tcp'
  | 'tls'
  | 'http'
  | 'https'
  | 'h2';

export interface DnsQueryParameters {
  protocolType: DnsQueryProtocolType;
  serverAddress: DnsQueryServerAddress;
}

export function buildDnsQueryParameters(
  serverAddresses: DnsQueryServerAddress[],
  protocolType: DnsQueryProtocolType,
): DnsQueryParameters[] {
  const protocolTypes: DnsQueryProtocolType[] =
    protocolType === 'tcp' ? ['tcp', 'udp'] : [protocolType];
  const parameters: DnsQueryParameters[] = [];
  for (const serverAddress of serverAddresses) {
    for (const pt of protocolTypes) {
      parameters.push({
        protocolType: pt,
        serverAddress: serverAddress,
      });
    }
  }
  return parameters;
}

function connectStreamDnsQuery(
  client: net.Socket,
  requestBuffer: Uint8Array,
  readyEvent: 'connect' | 'secureConnect',
): AbortablePromise<Uint8Array> {
  const lenBuffer = Buffer.alloc(2);
  lenBuffer.writeUInt16BE(requestBuffer.length);
  const requestPacket = Buffer.concat([lenBuffer, requestBuffer]);

  const abortable: AbortablePromise<Uint8Array> = {
    promise: Promise.resolve(new Error('Not started')),
  };

  let clientDestroyed = false;
  function destroyClient() {
    if (!clientDestroyed) {
      clientDestroyed = true;
      client.destroy();
    }
  }

  // Hung or unused connects are aborted by destroying the socket.
  abortable.abort = destroyClient;

  abortable.promise = new Promise<Uint8Array | Error>((resolve) => {
    function removeConnectListeners() {
      client.off(readyEvent, onSocketReady);
      client.off('error', onSocketError);
      client.off('close', onSocketClose);
    }

    function onSocketError(error: Error) {
      removeConnectListeners();
      resolve(error);
    }

    function onSocketClose() {
      removeConnectListeners();
      resolve(clientDestroyed ? new Error('ClosedByAbort') : new Error('Closed'));
    }

    function onSocketReady() {
      removeConnectListeners();
      if (clientDestroyed) {
        resolve(new Error('ClosedByAbort'));
        return;
      }

      client.write(requestPacket);
      readStream(abortable, client).then(resolve);

      // readStream replaces abort with socket.end(); chain it with destroy.
      const endSocketForRead = abortable.abort;
      abortable.abort = () => {
        destroyClient();
        if (endSocketForRead) {
          endSocketForRead();
        }
      };
    }

    client.once(readyEvent, onSocketReady);
    client.once('error', onSocketError);
    client.once('close', onSocketClose);
  });

  return abortable;
}

export function queryDnsBuffer(
  requestBuffer: Uint8Array,
  parameters: DnsQueryParameters,
): AbortablePromise<Uint8Array> {
  const { protocolType, serverAddress } = parameters;
  const response: AbortablePromise<Uint8Array> = {
    promise: Promise.resolve(new Error('Not supported')),
  };
  switch (protocolType) {
    case 'udp':
      response.promise = new Promise<Uint8Array | Error>((resolve) => {
        const client = udp.createSocket(
          net.isIPv4(serverAddress.ip) ? 'udp4' : 'udp6',
        );
        let closed = false;
        function done() {
          if (!closed) {
            closed = true;
            client.close();
          }
        }
        response.abort = done;
        client.send(
          requestBuffer,
          0,
          requestBuffer.length,
          serverAddress.port,
          serverAddress.ip,
          (error) => {
            if (error) {
              resolve(error);
              done();
            }
          },
        );
        client.once('message', (msg) => {
          resolve(msg);
          done();
        });
        client.once('close', () => {
          if (closed) {
            resolve(new Error('ClosedByAbort'));
          } else {
            closed = true;
            resolve(new Error('Closed'));
          }
        });
        client.once('error', (error) => {
          resolve(error);
          done();
        });
      });
      break;
    case 'tcp':
    case 'tls': {
      const client: net.Socket =
        protocolType === 'tcp'
          ? net.connect({
              port: serverAddress.port,
              host: serverAddress.ip,
            })
          : tls.connect({
              port: serverAddress.port,
              host: serverAddress.ip,
              servername: serverAddress.ip,
            });
      const streamQuery = connectStreamDnsQuery(
        client,
        requestBuffer,
        protocolType === 'tcp' ? 'connect' : 'secureConnect',
      );
      response.promise = streamQuery.promise;
      response.abort = streamQuery.abort;
      break;
    }
    case 'http':
    case 'https':
    case 'h2':
    default:
      break;
  }
  return response;
}
