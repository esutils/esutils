import {
  BaseClient,
  type BaseClientOptions,
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

  private cancelOpen?: () => void;

  protected validateURL(url: URL) {
    // TODO: add mqtts
    if (url.protocol !== 'mqtt:') {
      throw new Error('URL protocol must be mqtt');
    }
  }

  protected async open(url: URL) {
    await this.close();
    this.socketState = 'connecting';

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        if (this.cancelOpen === cancel) this.cancelOpen = undefined;
        if (error) reject(error);
        else resolve();
      };
      const cancel = () => finish(new Error('TCP connect cancelled'));
      this.cancelOpen = cancel;
      const socket = net.connect(
        {
          host: url.hostname,
          port: Number(url.port),
        },
        () => {
          if (this.socket !== socket) return;
          this.socketState = 'connected';

          finish();
        },
      );

      this.socket = socket;
      timer = setTimeout(() => {
        if (settled || this.socket !== socket) return;
        finish(new Error('TCP connect timeout'));
        this.socket = undefined;
        socket.destroy();
      }, this.connectTimeout);

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
        if (this.socket !== socket) return;
        if (this.socketState === 'connecting') {
          this.socketState = 'failed';

          finish(err);
        }
      });

      socket.on('close', () => {
        if (this.socket !== socket) return;
        finish(new Error('TCP closed before connect'));
        this.socket = undefined;
        this.connectionClosed();
      });

      socket.on('data', (bytes: Uint8Array) => {
        if (this.socket !== socket) return;
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

    return new Promise<void>((resolve, reject) => {
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
        if (err) reject(err);
        else resolve();
      });
    });
  }

  protected async close() {
    const socket = this.socket;
    this.socket = undefined;
    this.cancelOpen?.();
    // Detach ownership before destroying; late events cannot affect a new socket.
    socket?.destroy();
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
