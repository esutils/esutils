import * as udp from 'dgram';
import * as net from 'net';

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

export type AbortFunction = () => void;

export interface DnsResponseBufferPromise {
  promise: Promise<Uint8Array | Error>;
  abort?: AbortFunction;
}

export function queryDnsBuffer(
  requestBuffer: Uint8Array,
  protocolType: DnsQueryProtocolType,
  serverAddress: DnsQueryServerAddress,
): DnsResponseBufferPromise {
  const response: DnsResponseBufferPromise = {
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
    case 'http':
    case 'https':
    case 'h2':
    default:
      break;
  }
  return response;
}
