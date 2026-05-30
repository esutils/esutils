import { BaseClient, BaseClientOptions } from '@esutils/mqtt-client';

const utf8Encoder = {
  encode: (str: string) => Buffer.from(str, 'utf8') as Uint8Array,
};

const utf8Decoder = {
  decode: (bytes: Uint8Array) => Buffer.from(bytes).toString('utf8'),
};

class OfflineTestClient extends BaseClient {
  public constructor(maxPublishQueue: number) {
    super({
      url: {
        origin: 'null',
        protocol: 'mqtt:',
        username: '',
        password: '',
        hostname: 'localhost',
        pathname: '',
        search: '',
        hash: '',
        port: '',
      },
      utf8Encoder,
      utf8Decoder,
      protocolVersion: 4,
      clientId: 'publish-queue-test',
      maxPublishQueue,
    });
    this.connectionState = 'offline';
  }

  // eslint-disable-next-line class-methods-use-this
  protected validateURL() {}

  protected async open() {}

  protected async write() {}

  protected async close() {}
}

// Returns true if the promise is still pending after flushing the microtask queue.
async function isPending(promise: Promise<unknown>) {
  const pendingMarker = Symbol('pending');
  promise.catch(() => {});
  const settled = promise.then(() => 'settled');
  return (await Promise.race([settled, Promise.resolve(pendingMarker)])) === pendingMarker;
}

describe('publish queue while offline', () => {
  it('resolves a QoS 0 publish immediately instead of hanging', async () => {
    const client = new OfflineTestClient(2);

    await expect(client.publish('topic', 'payload', { qos: 0 })).resolves.toBeUndefined();
  });

  it('rejects the dropped QoS 1 publish on overflow and keeps survivors pending', async () => {
    const client = new OfflineTestClient(2);

    const first = client.publish('topic', 'first', { qos: 1 });
    const second = client.publish('topic', 'second', { qos: 1 });
    const third = client.publish('topic', 'third', { qos: 1 });

    await expect(first).rejects.toThrow('publish queue full');
    expect(await isPending(second)).toBe(true);
    expect(await isPending(third)).toBe(true);
  });
});
