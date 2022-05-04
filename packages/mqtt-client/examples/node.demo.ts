/* eslint-disable max-classes-per-file */
import {
  BaseClient,
  BaseClientOptions,
} from '@esutils/mqtt-client';

import * as net from 'net';

export interface ClientOptions extends BaseClientOptions {

}

const utf8Encoder = {
  encode(str: string) {
    return Buffer.from(str, 'utf8');
  },
};

const utf8Decoder = {
  decode(bytes: Uint8Array) {
    return Buffer.from(bytes).toString('utf8');
  },
};

export class Client extends BaseClient {
  private socket?: net.Socket;

  private socketState?:'connecting' | 'connected' | 'failed';

  // eslint-disable-next-line class-methods-use-this
  protected validateURL(url: URL) {
    // TODO: add mqtts
    if (url.protocol !== 'mqtt:') {
      throw new Error('URL protocol must be mqtt');
    }
  }

  protected async open(url: URL) {
    this.socketState = 'connecting';

    return new Promise<void>((resolve, reject) => {
      const socket = net.connect(
        {
          host: url.hostname,
          port: Number(url.port),
        },
        () => {
          this.socketState = 'connected';

          resolve();
        },
      );

      this.socket = socket;

      // From the Node.js documentation:
      //
      // This function is asynchronous. When the connection is established, the
      // 'connect' event will be emitted. If there is a problem connecting,
      // instead of a 'connect' event, an 'error' event will be emitted with the
      // error passed to the 'error' listener. The last parameter
      // connectListener, if supplied, will be added as a listener for the
      // 'connect' event once.
      //
      // https://nodejs.org/dist/latest-v12.x/docs/api/net.html#net_socket_connect

      socket.on('error', (err: Error) => {
        if (this.socketState === 'connecting') {
          this.socketState = 'failed';

          reject(err);
        }
      });

      socket.on('end', () => {
        this.connectionClosed();
      });

      socket.on('data', (bytes: Uint8Array) => {
        this.bytesReceived(bytes);
      });
    });
  }

  protected async write(bytes: Uint8Array) {
    if (!this.socket) {
      throw new Error('no connection');
    }

    const { socket } = this;

    this.log('writing bytes', bytes);

    return new Promise<void>((resolve, _) => {
      // From the Node.js documentation:
      //
      // The writable.write() method writes some data to the stream, and calls
      // the supplied callback once the data has been fully handled. If an error
      // occurs, the callback may or may not be called with the error as its
      // first argument. To reliably detect write errors, add a listener for the
      // 'error' event.
      //
      // https://nodejs.org/dist/latest-v12.x/docs/api/stream.html#stream_writable_write_chunk_encoding_callback
      //
      // We already add a listener for error events when the connection is opened.

      socket.write(bytes, (err?: Error) => {
        if (!err) {
          resolve();
        }
      });
    });
  }

  protected async close() {
    if (!this.socket) {
      throw new Error('no connection');
    }

    // Afer this method gets called, the listener for the end event added in the
    // open method will get called.
    this.socket.end();

    this.socket = undefined;
  }
}

async function main() {
  const client = new Client({
    url: {
      origin: 'null',
      protocol: 'mqtt:',
      username: '',
      password: '',
      hostname: 'emqx-test.growlogin.net',
      pathname: '',
      search: '',
      hash: '',
      port: '',
    },
    utf8Encoder,
    username: process.env.MQTT_USERNAME,
    password: Buffer.from(process.env.MQTT_PASSWORD ?? ''),
    utf8Decoder,
    protocolVersion: 4,
    clientId: 'mytest',
  });
  console.log('Start connecting');
  await client.connect();
  console.log('Connected');

  client.on('message', (topic: string, payload: Uint8Array) => {
    console.log(topic, Buffer.from(payload).toString('utf-8'));
    client.publish('/testack', payload);
  });
  console.log('before subscribe');
  await client.subscribe('/test');
  console.log('end subscribe');
}

main();
