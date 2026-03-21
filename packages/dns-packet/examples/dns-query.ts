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

export function queryDnsBuffer(
  requestBuffer: Uint8Array,
  protocolType: DnsQueryProtocolType,
  serverAddress: DnsQueryServerAddress,
): AbortablePromise<Uint8Array> {
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
    case 'tls':
      response.promise = new Promise<Uint8Array | Error>((resolve) => {
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
        const lenBuffer = Buffer.alloc(2);
        lenBuffer.writeUInt16BE(requestBuffer.length);
        client.write(Buffer.concat([lenBuffer, requestBuffer]));
        readStream(response, client).then(resolve);
      });
      break;
    case 'http':
    case 'https':
    case 'h2':
    default:
      break;
  }
  return response;
}
