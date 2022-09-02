import { BaseClient, BaseClientOptions } from '@esutils/mqtt-client';
import { Deferred } from '@esutils/deferred';
import * as net from 'net';

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

class TestClient extends BaseClient {
  private socket?: net.Socket;

  public constructor(options: BaseClientOptions) {
    super(options);
    this.connectionState = 'connecting';
  }

  // eslint-disable-next-line class-methods-use-this
  protected validateURL(url: URL) {
    if (url.protocol !== 'mqtt:') {
      throw new Error('URL protocol must be mqtt');
    }
  }

  protected async open(_url: URL) {
    this.socket = undefined;
  }

  protected async write(_bytes: Uint8Array) {
    this.socket = undefined;
  }

  protected async close() {
    this.socket = undefined;
  }

  public bytesReceived(bytes: Uint8Array) {
    super.bytesReceived(bytes);
  }

  public stop() {
    super.stopTimers();
  }
}

const ConnectAckSplitted: number[][] = [
  // Connet Ack 分包
  [32],
  [2],
  [0],
  [0],
];

describe('mqtt client in typescript', () => {
  it('test BaseClient constructor', () => {
    expect(typeof BaseClient).toEqual('function');
  });

  it('test decode', async () => {
    const client = new TestClient({
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
      logger: (msg: string, ...args: unknown[]) => {
        console.log(msg, ...args);
      },
      username: process.env.MQTT_USERNAME,
      password: Buffer.from(process.env.MQTT_PASSWORD ?? ''),
      utf8Decoder,
      protocolVersion: 4,
      clientId: 'mytest',
    });

    const defer = new Deferred<void>();
    client.on('changeState', (x:{ from: string, to: string }) => {
      if (x.to === 'connected') {
        defer.resolve();
      } else {
        defer.reject('not connected');
      }
    });

    const recvBuffer = new Uint8Array(8192);
    for (let i = 0; i < ConnectAckSplitted.length; i += 1) {
      const len = ConnectAckSplitted[i].length;
      recvBuffer.set(new Uint8Array(ConnectAckSplitted[i]), 0);
      const bytes = recvBuffer.subarray(0, len);
      client.bytesReceived(bytes);
    }

    await defer.promise;
    client.stop();
  });
});
