import { Deferred } from '@esutils/deferred';
import {
  type QoS,
  encode,
  type AnyPacket,
  type IConnackPacket,
  type IPublishPacket,
  type IPubackPacket,
  type IPubrecPacket,
  type IPubrelPacket,
  type IPubcompPacket,
  type ISubscribePacket,
  type ISubackPacket,
  type IUnsubscribePacket,
  type IUnsubackPacket,
  type UTF8Encoder,
  type UTF8Decoder,
  type ISubscription,
  type ProtocolVersion,
  decodeHeader,
  type PublishOptions,
} from '@esutils/mqtt-packet';

export interface URL {
  readonly origin: string;

  hash: string;
  hostname: string;
  password: string;
  pathname: string;
  port: string;
  protocol: string;
  search: string;
  username: string;
}

export type ClientIdFactory = string | (() => string);

export interface BaseConnectOptions {
  retries: number;
  minDelay: number;
  maxDelay: number;
  factor: number;
  random: boolean;
}

export interface BaseClientOptions {
  protocolVersion: ProtocolVersion;
  utf8Encoder: UTF8Encoder;
  utf8Decoder: UTF8Decoder;

  url: URL;
  clientId?: ClientIdFactory;
  clientIdPrefix?: string;
  clean?: boolean;
  username?: string;
  keepalive?: number;
  password?: Uint8Array;
  connectTimeout?: number;
  pingrespTimeout?: number;
  /** Maximum wait for SUBACK before reconnecting (milliseconds). */
  subscribeTimeout?: number;
  connect?: Partial<BaseConnectOptions>;
  reconnect?: Partial<BaseConnectOptions>;
  incomingStore?: IncomingStore;
  outgoingStore?: OutgoingStore;
  maxPublishQueue?: number;
  /** Maximum complete inbound MQTT packet, including its fixed header. */
  maxPacketSize?: number;
  logger?: (msg: string, ...args: unknown[]) => void;
}

export type SubscriptionState =
| 'unknown'
| 'pending'
| 'removed'
| 'replaced'
| 'unacknowledged'
| 'acknowledged'
| 'rejected'
| 'unsubscribe-pending'
| 'unsubscribe-unacknowledged'
| 'unsubscribe-acknowledged';

export interface Subscription extends ISubscription {
  state: SubscriptionState;
  granted?: number;
}

export type ConnectionState =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'disconnected';

const packetIdLimit = 2 ** 16;

// Only used for incoming QoS 2 messages.
export abstract class IncomingStore {
  // On receiving a IPublishPacket with QoS 2 and the dup flag set to false,
  // store the packet identifier and deliver the message to the application.
  abstract store(packetId: number): Promise<void>;

  // On receiving a IPublishPacket with QoS 2 and the dup flag set to true, if
  // the store still has the packet identifier, don't resend it to the
  // application.
  abstract has(packetId: number): Promise<boolean>;

  // After receiving a IPubrelPacket, discared the packet identifier.
  abstract discard(packetId: number): Promise<void>;
}

export class IncomingMemoryStore extends IncomingStore {
  packets = new Set<number>();

  async store(packetId: number): Promise<void> {
    this.packets.add(packetId);
    await Promise.resolve();
  }

  async has(packetId: number): Promise<boolean> {
    return await Promise.resolve(this.packets.has(packetId));
  }

  async discard(packetId: number): Promise<void> {
    this.packets.delete(packetId);
    return await Promise.resolve();
  }
}

// Used for outgoing QoS 1 and 2 messages.
export abstract class OutgoingStore {
  // Store a IPublishPacket so it can be resent if the connection is lost. In QoS
  // 2, storing a IPubrelPacket (after receiving a IPubrecPacket) marks the
  // original IPublishPacket as received so it can be discarded and replaced with
  // the IPubrelPacket.
  abstract store(packet: IPublishPacket | IPubrelPacket): Promise<void>;

  // Discard the IPublishPacket or IPubrelPacket associated with this packet
  // identifier. For QoS 1, this gets called after receiveng a IPubackPacket. For
  // QoS 2, this gets called after receiving a IPubcompPacket.
  abstract discard(packetId: number): Promise<void>;

  // Used on reconnecting to resend publish and pubrel packets. Packets are
  // supposed to be resent in the order they were stored.
  abstract iterate(): AsyncIterable<IPublishPacket | IPubrelPacket>;
}

export class OutgoingMemoryStore extends OutgoingStore {
  packets = new Map<number, IPublishPacket | IPubrelPacket>();

  async store(packet: IPublishPacket | IPubrelPacket): Promise<void> {
    if (!packet.messageId) {
      throw new Error('missing packet.messageId');
    }

    this.packets.set(packet.messageId, packet);
    await Promise.resolve();
  }

  async discard(packetId: number): Promise<void> {
    this.packets.delete(packetId);
    await Promise.resolve();
  }

  async* iterate(): AsyncIterable<IPublishPacket | IPubrelPacket> {
    await Promise.resolve();
    for (const value of this.packets.values()) {
      yield value;
    }
  }
}

export const DefaultPorts: { [protocol: string]: number } = {
  mqtt: 1883,
  mqtts: 8883,
  ws: 80,
  wss: 443,
};

const defaultClientIdPrefix = 'esutils_mqtt_client';
const defaultKeepalive = 60;
const defaultConnectTimeout = 10 * 1000;
const defaultPingrespTimeout = 5 * 1000;
const defaultConnectOptions: BaseConnectOptions = {
  retries: Infinity,
  minDelay: 1000,
  maxDelay: 2000,
  factor: 1.1,
  random: false,
};

const defaultReconnectOptions: BaseConnectOptions = {
  retries: Infinity,
  minDelay: 1000,
  maxDelay: 60000,
  factor: 1.1,
  random: true,
};

/**
 * event list:
 * changeState
 * message
 */
export abstract class BaseClient {
  options: BaseClientOptions;

  protocolVersion: ProtocolVersion;

  utf8Encoder: UTF8Encoder;

  utf8Decoder: UTF8Decoder;

  url?: URL;

  clientId: string;

  keepalive: number;

  connectTimeout: number;

  pingrespTimeout: number;

  connectionState: ConnectionState = 'offline';

  everConnected: boolean = false;

  disconnectRequested: boolean = false;

  reconnectAttempt: number = 0;

  subscriptions: Subscription[] = [];

  private lastPacketId: number = 0;

  private lastPacketTime: number;

  private buffer?: Uint8Array;

  private bufferLength = 0;

  private connectionEpoch = 0;

  private connectionBlocked = false;

  private expectedPacketLength = 0;

  private readonly maxPacketSize: number;

  private unresolvedConnect?: Deferred<IConnackPacket>;

  private queuedPublishes: {
    packet: IPublishPacket;
    deferred: Deferred<void>;
  }[] = [];

  private maxPublishQueue: number;

  private unresolvedPublishes = new Map<number, Deferred<void>>();

  private incomingStore: IncomingStore;

  private outgoingStore: OutgoingStore;

  private unresolvedSubscribes = new Map<
  string,
  Deferred<ISubackPacket | undefined>
  >();

  private unresolvedUnsubscribes = new Map<
  string,
  Deferred<IUnsubackPacket | undefined>
  >();

  protected unacknowledgedSubscribes = new Map<
  number,
  {
    subscriptions: Subscription[];
    deadline: number;
  }
  >();

  private unacknowledgedUnsubscribes = new Map<
  number,
  {
    subscriptions: Subscription[];
  }
  >();

  private eventListeners: Map<string, Function[]> = new Map();

  private timers: {
    [key: string]: ReturnType<typeof setTimeout> | undefined;
  } = {};

  protected log: (msg: string, ...args: unknown[]) => void;

  public constructor(options: BaseClientOptions) {
    this.options = options;
    this.maxPacketSize = options.maxPacketSize ?? 128 * 1024;
    if (!Number.isInteger(this.maxPacketSize) || this.maxPacketSize < 2 || this.maxPacketSize > 268435460) {
      throw new Error('Invalid MQTT maximum packet size');
    }
    this.protocolVersion = this.options.protocolVersion;
    this.utf8Encoder = this.options.utf8Encoder;
    this.utf8Decoder = this.options.utf8Decoder;

    this.clientId = this.generateClientId();
    this.keepalive = typeof this.options.keepalive === 'number'
      ? this.options.keepalive
      : defaultKeepalive;

    this.connectTimeout = this.options.connectTimeout ?? defaultConnectTimeout;
    this.pingrespTimeout = this.options.pingrespTimeout ?? defaultPingrespTimeout;

    this.incomingStore = this.options.incomingStore || new IncomingMemoryStore();
    this.outgoingStore = this.options.outgoingStore || new OutgoingMemoryStore();

    this.lastPacketTime = Date.now();
    this.maxPublishQueue = this.options.maxPublishQueue ?? 16;

    this.log = this.options.logger || (() => {});
  }

  public async connect(): Promise<IConnackPacket> {
    switch (this.connectionState) {
      case 'offline':
      case 'disconnected':
        break;
      default:
        throw new Error(
          `should not be connecting in ${this.connectionState} state`,
        );
    }

    this.disconnectRequested = false;
    this.connectionBlocked = false;

    const deferred = new Deferred<IConnackPacket>();

    this.unresolvedConnect = deferred;

    this.openConnection();

    return deferred.promise;
  }

  /**
   * Publishes a message to the broker.
   *
   * The returned promise's lifecycle depends on the QoS and the connection state:
   *
   * - QoS 0 (at most once): the promise resolves as soon as the packet is
   *   written (when connected) or enqueued (when offline). There is no
   *   acknowledgement, so a QoS 0 message that is later dropped from a full
   *   queue does NOT reject — its promise has already resolved.
   * - QoS 1 / 2 (at least / exactly once): the promise stays pending until the
   *   matching PUBACK / PUBCOMP arrives. Such messages survive a disconnect via
   *   two mechanisms: while offline they wait in the in-memory publish queue and
   *   are sent on reconnect (`flushQueuedPublishes`); once sent they are tracked
   *   in `outgoingStore` and re-sent with the `dup` flag if still unacknowledged
   *   after a reconnect (`flushUnacknowledgedPublishes`). The default store is
   *   in-memory, so this survives reconnects but not a process restart unless a
   *   persistent `outgoingStore` is supplied. The promise is therefore
   *   intentionally left pending across reconnects until acknowledged.
   *
   * `maxPublishQueue` is only a memory bound for offline publishes. If it is
   * sized large enough for the application's memory budget and offline publish
   * volume, QoS > 0 messages are never dropped by normal disconnect/reconnect
   * flow. Queue overflow is the ONLY place a queued message is dropped. When
   * the offline queue already holds `maxPublishQueue` entries, the oldest entry
   * is evicted to make room for the new one. If that evicted entry is QoS > 0
   * its promise rejects with `Error('publish queue full')`; an evicted QoS 0
   * entry is silent (already resolved). Disconnecting does NOT drop or reject
   * queued messages.
   *
   * Because a QoS > 0 promise can reject on queue overflow, callers should
   * `await` it or attach a `.catch(...)` to avoid unhandled rejections.
   */
  public async publish(
    topic: string,
    payloadIn: string | Uint8Array,
    options?: PublishOptions,
  ): Promise<void> {
    const dup = (options && options.dup) || false;
    const qos = (options && options.qos) || 0;
    const retain = (options && options.retain) || false;
    const id = qos > 0 ? this.nextPacketId() : 0;
    let payload = payloadIn;
    if (typeof payload === 'string') {
      payload = this.utf8Encoder.encode(payload);
    }

    const packet: IPublishPacket = {
      cmd: 'publish',
      dup,
      qos,
      retain,
      topic,
      payload,
      messageId: id,
    };

    const deferred = new Deferred<void>();

    if (this.connectionState === 'connected') {
      this.sendPublish(packet, deferred);
    } else {
      if (!packet.qos) {
        deferred.resolve();
      }
      this.log('queueing publish');
      if (this.queuedPublishes.length >= this.maxPublishQueue) {
        const shifted = this.queuedPublishes.shift();
        if (shifted && shifted.packet.qos && shifted.packet.qos > 0) {
          shifted.deferred.reject(new Error('publish queue full'));
        }
      }
      this.queuedPublishes.push({ packet, deferred });
    }

    return deferred.promise;
  }

  protected async flushQueuedPublishes() {
    for (;;) {
      const queued = this.queuedPublishes.shift();
      if (queued === undefined) {
        break;
      }
      const { packet, deferred } = queued;

      await this.sendPublish(packet, deferred);
    }
  }

  protected async flushUnacknowledgedPublishes() {
    for await (const packet of this.outgoingStore.iterate()) {
      if (packet.cmd === 'publish') {
        await this.send({ ...packet, dup: true });
      } else {
        await this.send(packet);
      }
    }
  }

  protected async sendPublish(packet: IPublishPacket, deferred: Deferred<void>) {
    if (packet.qos && packet.qos > 0) {
      this.unresolvedPublishes.set(packet.messageId!, deferred);
      this.outgoingStore.store(packet);
    }

    await this.send(packet);

    if (!packet.qos) {
      deferred.resolve();
    }
  }

  public async subscribe(
    topic: string,
    qos?: QoS
  ): Promise<Subscription[]>;

  public async subscribe(
    topicFilters: string[],
    qos?: QoS
  ): Promise<Subscription[]>;

  public async subscribe(
    subscription: ISubscription,
    qos?: QoS
  ): Promise<Subscription[]>;

  public async subscribe(
    subscriptions: ISubscription[],
    qos?: QoS
  ): Promise<Subscription[]>;

  public async subscribe(
    input: ISubscription | string | (ISubscription | string)[],
    qos?: QoS,
  ): Promise<Subscription[]> {
    switch (this.connectionState) {
      case 'disconnecting':
      case 'disconnected':
        throw new Error(
          `should not be subscribing in ${this.connectionState} state`,
        );
      default:
        break;
    }

    const arr = Array.isArray(input) ? input : [input];
    const subs = arr.map<Subscription>((sub) => (typeof sub === 'object'
      ? {
        topic: sub.topic,
        qos: sub.qos || qos || 0,
        state: 'pending',
      }
      : { topic: sub, qos: qos || 0, state: 'pending' }));
    // Do not replace an in-flight topic: its SUBACK belongs to that request.
    // Same-QoS callers share one waiter; a conflicting QoS must wait/retry.
    const requestedQos = new Map<string, QoS>();
    for (const sub of subs) {
      const existing = this.subscriptions.find(old => old.topic === sub.topic);
      const inFlight = existing && (existing.state === 'pending' || existing.state === 'unacknowledged');
      if ((inFlight && existing.qos !== sub.qos) ||
          (requestedQos.has(sub.topic) && requestedQos.get(sub.topic) !== sub.qos)) {
        throw new Error('Subscription already in progress with different QoS');
      }
      requestedQos.set(sub.topic, sub.qos);
    }
    const promises = [];
    for (let i = 0; i < subs.length; i += 1) {
      let sub = subs[i];
      const existing = this.subscriptions.find(old => old.topic === sub.topic);
      if (existing && (existing.state === 'pending' || existing.state === 'unacknowledged')) {
        sub = existing;
      } else {
        this.subscriptions = this.subscriptions.filter(old => old.topic !== sub.topic);
        this.subscriptions.push(sub);
      }
      let deferred = this.unresolvedSubscribes.get(sub.topic);
      if (!deferred) {
        deferred = new Deferred<ISubackPacket | undefined>();
        this.unresolvedSubscribes.set(sub.topic, deferred);
      }
      promises.push(deferred.promise.then(() => sub));
    }

    // Observe every waiter before writing: SUBACK can arrive synchronously.
    const result = Promise.all(promises);
    void result.catch(() => {});
    try {
      await this.flushSubscriptions();
    } catch (error) {
      this.subscriptionFailed(new Error('SUBSCRIBE write failed'));
    }
    return result;
  }

  /** Read-only state for coordinating application retries with automatic recovery. */
  public getSubscriptionState(topic: string): SubscriptionState | undefined {
    return this.subscriptions.find(sub => sub.topic === topic)?.state;
  }

  protected async flushSubscriptions() {
    const subs = this.subscriptions.filter((sub) => sub.state === 'pending');

    if (subs.length > 0 && this.connectionState === 'connected') {
      await this.sendSubscribe(subs);
    }
  }

  private async sendSubscribe(subscriptions: Subscription[]) {
    const subscribePacket: ISubscribePacket = {
      cmd: 'subscribe',
      messageId: this.nextPacketId(),
      subscriptions: subscriptions.map((sub) => ({
        topic: sub.topic,
        qos: sub.qos,
      })),
    };

    this.unacknowledgedSubscribes.set(subscribePacket.messageId, {
      subscriptions,
      deadline: Date.now() + (this.options.subscribeTimeout ?? this.connectTimeout),
    });
    this.scheduleSubscriptionTimeout();
    // Set state before writing: a synchronous transport may deliver SUBACK.
    for (const sub of subscriptions) sub.state = 'unacknowledged';
    await this.send(subscribePacket);

  }

  public async unsubscribe(topic: string): Promise<Subscription[]>;

  public async unsubscribe(topicFilters: string[]): Promise<Subscription[]>;

  public async unsubscribe(input: string | string[]): Promise<Subscription[]> {
    switch (this.connectionState) {
      case 'disconnecting':
      case 'disconnected':
        throw new Error(
          `should not be unsubscribing in ${this.connectionState} state`,
        );
      default:
        break;
    }

    const arr = Array.isArray(input) ? input : [input];
    const promises = [];

    for (let i = 0; i < arr.length; i += 1) {
      const topic = arr[i];
      const sub = this.subscriptions.find(
        (sub_tmp) => sub_tmp.topic === topic,
      ) || { topic, qos: 0, state: 'unknown' };
      const deferred = new Deferred<IUnsubackPacket | undefined>();
      const promise = deferred.promise.then(() => sub);

      if (
        this.connectionState !== 'connected'
        && this.options.clean !== false
      ) {
        sub.state = 'removed';
      } else {
        switch (sub.state) {
          case 'pending':
            sub.state = 'removed';
            break;
          case 'removed':
          case 'replaced':
            // Subscriptions with these states should have already been removed.
            break;
          case 'unknown':
          case 'unacknowledged':
          case 'acknowledged':
            sub.state = 'unsubscribe-pending';
            break;
          case 'unsubscribe-pending':
          case 'unsubscribe-unacknowledged':
          case 'unsubscribe-acknowledged':
            // TODO: Why is this happening?
            break;
          default:
            break;
        }
      }

      this.unresolvedUnsubscribes.set(topic, deferred);

      promises.push(promise);
    }

    await this.flushUnsubscriptions();

    return Promise.all(promises);
  }

  protected async flushUnsubscriptions() {
    const subs = [];

    for (let i = 0; i < this.subscriptions.length; i += 1) {
      const sub = this.subscriptions[i];
      if (sub.state === 'removed') {
        const unresolvedSubscribe = this.unresolvedSubscribes.get(
          sub.topic,
        );

        if (unresolvedSubscribe) {
          this.unresolvedSubscribes.delete(sub.topic);

          unresolvedSubscribe.resolve(undefined);
        }

        const unresolvedUnsubscribe = this.unresolvedUnsubscribes.get(
          sub.topic,
        );

        if (unresolvedUnsubscribe) {
          this.unresolvedUnsubscribes.delete(sub.topic);

          unresolvedUnsubscribe.resolve(undefined);
        }
      }

      if (sub.state === 'unsubscribe-pending') {
        subs.push(sub);
      }
    }

    this.subscriptions = this.subscriptions.filter(
      (sub) => sub.state !== 'removed',
    );

    if (subs.length > 0 && this.connectionState === 'connected') {
      await this.sendUnsubscribe(subs);
    }
  }

  private async sendUnsubscribe(subscriptions: Subscription[]) {
    const unsubscribePacket: IUnsubscribePacket = {
      cmd: 'unsubscribe',
      messageId: this.nextPacketId(),
      unsubscriptions: subscriptions.map((sub) => sub.topic),
    };

    this.unacknowledgedUnsubscribes.set(unsubscribePacket.messageId, {
      subscriptions,
    });

    await this.send(unsubscribePacket);

    for (let i = 0; i < subscriptions.length; i += 1) {
      const sub = subscriptions[i];
      sub.state = 'unsubscribe-unacknowledged';
    }
  }

  public async disconnect(): Promise<void> {
    switch (this.connectionState) {
      case 'connected':
        await this.doDisconnect();
        break;
      case 'connecting':
        this.disconnectRequested = true;
        break;
      case 'offline':
        this.changeState('disconnected');
        this.stopTimers();
        break;
      default:
        throw new Error(
          `should not be disconnecting in ${this.connectionState} state`,
        );
    }
  }

  private async doDisconnect() {
    this.changeState('disconnecting');
    this.stopTimers();
    try {
      await this.send({ cmd: 'disconnect' });
    } finally {
      try { await this.close(); }
      finally {
        if (this.connectionState === 'disconnecting') this.changeState('disconnected');
      }
    }
  }

  // Methods implemented by subclasses

  protected abstract validateURL(url: URL): void;

  protected abstract open(url: URL): Promise<void>;

  protected abstract write(bytes: Uint8Array): Promise<void>;

  protected abstract close(): Promise<void>;

  protected encode(packet: AnyPacket): Uint8Array {
    return encode(packet, this.utf8Encoder, { protocolVersion: this.protocolVersion });
  }

  protected openConnectionInit() {
    this.connectionEpoch++;
    this.resetReceiveBuffer();
    this.abandonSubscriptions(new Error('MQTT connection replaced'));
    this.unacknowledgedUnsubscribes.clear();
  }

  // This gets called from connect and when reconnecting.
  protected async openConnection() {
    if (this.connectionBlocked) return;
    try {
      this.changeState('connecting');

      this.url = this.getURL();

      this.log(`opening connection to ${JSON.stringify(this.url)}`);
      this.openConnectionInit();
      await this.open(this.url);

      await this.send({
        cmd: 'connect',
        clientId: this.clientId,
        username: this.options.username,
        password: this.options.password,
        clean: this.options.clean !== false,
        keepalive: this.keepalive,
      });

      if (this.connectionState === 'connecting') this.startConnectTimer();
    } catch (err) {
      if (this.connectionBlocked) return;
      const error = err as Error;
      this.log(`caught error opening connection: ${error.message}`);

      this.changeState('offline');

      if (!this.startReconnectTimer()) {
        this.notifyConnectRejected(new Error('connection failed'));
      }
    }
  }

  // This gets called when the connection is fully established (after receiving the CONNACK packet).
  protected connectionEstablished(connackPacket: IConnackPacket) {
    if (this.options.clean !== false || !connackPacket.sessionPresent) {
      for (let i = 0; i < this.subscriptions.length; i += 1) {
        const sub = this.subscriptions[i];
        if (sub.state === 'rejected') continue;
        if (sub.state === 'unsubscribe-pending') {
          sub.state = 'removed';
        } else {
          sub.state = 'pending';
        }
      }
    }
    if (this.unresolvedConnect) {
      this.log('resolving initial connect');

      this.unresolvedConnect.resolve(connackPacket);
    }

    if (this.disconnectRequested) {
      this.doDisconnect();
    } else {
      this.startKeepaliveTimer();
    }
  }

  // This gets called by subclasses when the connection is unexpectedly closed.
  protected connectionClosed() {
    if (this.connectionBlocked) return;
    this.log('connectionClosed');
    this.resetReceiveBuffer();
    this.abandonSubscriptions(new Error('MQTT connection closed'));

    switch (this.connectionState) {
      case 'disconnecting':
        this.changeState('disconnected');
        break;
      default:
        this.changeState('offline');
        this.reconnectAttempt = 0;
        this.startReconnectTimer();
        break;
    }

    this.stopKeepaliveTimer();
  }

  private resetReceiveBuffer() {
    this.buffer = undefined;
    this.bufferLength = 0;
    this.expectedPacketLength = 0;
  }

  protected bytesReceived(bytes: Uint8Array) {
    if (bytes.length > 0) this.stopWaitDataTimer();
    let offset = 0;
    try {
      while (offset < bytes.length) {
        // Accumulate at most five header bytes before allocating the body.
        if (!this.buffer) this.buffer = new Uint8Array(Math.min(5, this.maxPacketSize));
        while (!this.expectedPacketLength && offset < bytes.length) {
          if (this.bufferLength >= this.buffer.length) throw new Error('MQTT packet size or length invalid');
          const byte = bytes[offset++];
          this.buffer[this.bufferLength++] = byte;
          if (this.bufferLength < 2) continue;
          if (byte & 128) {
            if (this.bufferLength === 5) throw new Error('Malformed MQTT remaining length');
            continue;
          }
          let remainingLength = 0;
          let multiplier = 1;
          for (let i = 1; i < this.bufferLength; i++) {
            remainingLength += (this.buffer[i] & 127) * multiplier;
            multiplier *= 128;
          }
          const packetLength = this.bufferLength + remainingLength;
          if (packetLength > this.maxPacketSize) throw new Error('MQTT packet size exceeds limit');
          this.expectedPacketLength = packetLength;
          if (packetLength > this.buffer.length) {
            const packetBuffer = new Uint8Array(packetLength);
            packetBuffer.set(this.buffer.subarray(0, this.bufferLength));
            this.buffer = packetBuffer;
          }
        }
        if (!this.expectedPacketLength) break;
        const count = Math.min(bytes.length - offset, this.expectedPacketLength - this.bufferLength);
        this.buffer.set(bytes.subarray(offset, offset + count), this.bufferLength);
        this.bufferLength += count;
        offset += count;
        if (this.bufferLength < this.expectedPacketLength) break;

        const buffer = this.buffer.subarray(0, this.bufferLength);
        this.resetReceiveBuffer();
        const opts = { protocolVersion: this.protocolVersion };
        const headerInfo = decodeHeader(buffer, opts);
        if (!headerInfo) throw new Error('Malformed MQTT header');
        const packet = headerInfo.packetCmd.decode(
          headerInfo.buffer, headerInfo.flags, headerInfo.remainingLength, this.utf8Decoder, opts,
        );
        if (!packet) throw new Error('Malformed MQTT packet');
        this.log(`received ${packet.cmd} packet`, packet);
        const previousState = this.connectionState;
        this.packetReceived(packet);
        if (this.connectionState !== previousState && this.connectionState !== 'connected') return;
      }
    } catch (error) {
      this.resetReceiveBuffer();
      throw error; // Transport owner closes this connection and starts recovery.
    }
  }

  protected packetReceived(packet: AnyPacket) {
    switch (packet.cmd) {
      case 'connack':
        this.handleConnack(packet);
        break;
      case 'publish': {
        const epoch = this.connectionEpoch;
        void this.handlePublish(packet).catch(error => this.incomingFailed(error, epoch));
        break;
      }
      case 'puback':
        this.handlePuback(packet);
        break;
      case 'pubrec':
        this.handlePubrec(packet);
        break;
      case 'pubrel':
        this.handlePubrel(packet);
        break;
      case 'pubcomp':
        this.handlePubcomp(packet);
        break;
      case 'suback':
        this.handleSuback(packet);
        break;
      case 'unsuback':
        this.handleUnsuback(packet);
        break;
      case 'pingresp':
        this.stopPingrespTimer();
        break;
      default:
        throw new Error(`Not supported ${packet.cmd}`);
    }
  }

  private incomingFailed(error: unknown, epoch: number) {
    if (epoch !== this.connectionEpoch ||
        (this.connectionState !== 'connected' && this.connectionState !== 'connecting')) return;
    this.log('MQTT incoming message rejected', error);
    this.emit('transportFailure', error);
    this.stopTimers();
    this.changeState('offline');
    void this.close().catch(reason => this.log('receive close failed', reason)).then(() => {
      if (epoch === this.connectionEpoch && this.connectionState === 'offline') this.startReconnectTimer();
    });
  }

  protected protocolViolation(msg: string) {
    this.log('protocolViolation', msg);
  }

  protected async handleConnack(packet: IConnackPacket) {
    switch (this.connectionState) {
      case 'connecting':
        break;
      default:
        throw new Error(
          `should not be receiving connack packets in ${this.connectionState} state`,
        );
    }

    if (packet.returnCode !== 0) {
      const error = new Error(`MQTT CONNACK refused: ${packet.returnCode}`);
      const retryable = packet.returnCode === 3;
      const epoch = this.connectionEpoch;
      this.connectionBlocked = !retryable;
      this.stopTimers();
      this.emit('connackRejected', packet.returnCode, retryable);
      this.changeState(retryable ? 'offline' : 'disconnected');
      try { await this.close(); }
      catch (reason) { this.log('CONNACK refusal close failed', reason); }
      if (epoch !== this.connectionEpoch) return;
      // Server unavailable is transient: preserve the original initialization
      // waiter so a later successful login continues normal subscription setup.
      if (!retryable || !this.startReconnectTimer()) this.notifyConnectRejected(error);
      return;
    }
    this.everConnected = true;
    this.stopConnectTimer();
    this.connectionEstablished(packet);
    this.changeState('connected');

    await this.flushSubscriptions();
    await this.flushUnsubscriptions();
    await this.flushUnacknowledgedPublishes();
    await this.flushQueuedPublishes();
  }

  protected async handlePublish(packet: IPublishPacket): Promise<void> {
    if (packet.qos === 0) {
      this.emit('message', packet.topic, packet.payload, packet);
    } else if (packet.qos === 1) {
      if (typeof packet.messageId !== 'number' || packet.messageId < 1) {
        this.protocolViolation(
          'publish packet with qos 1 is missing id',
        );
        return;
      }

      this.emit('message', packet.topic, packet.payload, packet);

      this.send({
        cmd: 'puback',
        messageId: packet.messageId,
      });
    } else if (packet.qos === 2) {
      if (typeof packet.messageId !== 'number' || packet.messageId < 1) {
        this.protocolViolation(
          'publish packet with qos 2 is missing id',
        );
        return;
      }

      const emitMessage = !packet.dup || !(await this.incomingStore.has(packet.messageId));

      if (emitMessage) {
        await this.incomingStore.store(packet.messageId);
        try { this.emit('message', packet.topic, packet.payload, packet); }
        catch (error) {
          // Rejected messages were never accepted by the application. Do not
          // retain a deduplication record or acknowledge them on redelivery.
          await this.incomingStore.discard(packet.messageId);
          throw error;
        }
      }

      this.send({
        cmd: 'pubrec',
        messageId: packet.messageId,
      });
    }
  }

  protected handlePuback(packet: IPubackPacket) {
    this.outgoingStore.discard(packet.messageId);

    const deferred = this.unresolvedPublishes.get(packet.messageId);

    if (deferred) {
      this.unresolvedPublishes.delete(packet.messageId);
      deferred.resolve();
    } else {
      this.log(`received puback packet with unrecognized id ${packet.messageId}`);
    }
  }

  protected handlePubrec(packet: IPubrecPacket) {
    const pubrel: IPubrelPacket = {
      cmd: 'pubrel',
      messageId: packet.messageId,
    };

    this.outgoingStore.store(pubrel);

    this.send(pubrel);
  }

  protected handlePubrel(packet: IPubrelPacket) {
    this.incomingStore.discard(packet.messageId);

    this.send({
      cmd: 'pubcomp',
      messageId: packet.messageId,
    });
  }

  protected handlePubcomp(packet: IPubcompPacket) {
    this.outgoingStore.discard(packet.messageId);

    const deferred = this.unresolvedPublishes.get(packet.messageId);

    if (deferred) {
      this.unresolvedPublishes.delete(packet.messageId);
      deferred.resolve();
    } else {
      this.log(`received pubcomp packet with unrecognized id ${packet.messageId}`);
    }
  }

  private scheduleSubscriptionTimeout() {
    this.stopTimer('subscribe');
    let deadline = Infinity;
    for (const request of this.unacknowledgedSubscribes.values()) {
      deadline = Math.min(deadline, request.deadline);
    }
    if (deadline !== Infinity) {
      this.startTimer('subscribe', () => {
        this.subscriptionFailed(new Error('SUBACK timeout'));
      }, Math.max(0, deadline - Date.now()));
    }
  }

  private abandonSubscriptions(error: Error) {
    this.stopTimer('subscribe');
    for (const request of this.unacknowledgedSubscribes.values()) {
      for (const sub of request.subscriptions) {
        sub.state = 'pending';
        const deferred = this.unresolvedSubscribes.get(sub.topic);
        if (deferred) {
          this.unresolvedSubscribes.delete(sub.topic);
          deferred.reject(error);
        }
      }
    }
    this.unacknowledgedSubscribes.clear();
  }

  private subscriptionFailed(error: Error) {
    const topics: string[] = [];
    for (const request of this.unacknowledgedSubscribes.values()) {
      for (const sub of request.subscriptions) topics.push(sub.topic);
    }
    this.abandonSubscriptions(error);
    if (topics.length) this.emit('subscriptionRecovery', topics);

    if (this.connectionState !== 'connected') return;
    this.log(error.message);
    this.stopTimers();
    this.changeState('offline');
    void this.close().catch(reason => this.log('subscription close failed', reason))
      .then(() => {
        if (this.connectionState === 'offline') this.startReconnectTimer();
      });
  }

  protected handleSuback(packet: ISubackPacket) {
    const unackSubs = this.unacknowledgedSubscribes.get(
      packet.messageId,
    );

    if (this.connectionState !== 'connected' || unackSubs === undefined) {
      this.log('ignoring stale SUBACK');
      return;
    }

    // verify returnCodes length matches subscriptions.length
    if (unackSubs.subscriptions.length !== packet.granted.length) {
      this.subscriptionFailed(new Error('SUBACK return-code count mismatch'));
      return;
    }
    this.unacknowledgedSubscribes.delete(packet.messageId);
    for (let i = 0; i < unackSubs.subscriptions.length; i += 1) {
      const sub = unackSubs.subscriptions[i];
      sub.granted = packet.granted[i];
      sub.state = sub.granted <= 2 ? 'acknowledged' : 'rejected';

      const deferred = this.unresolvedSubscribes.get(sub.topic);

      if (deferred) {
        this.unresolvedSubscribes.delete(sub.topic);

        if (sub.state === 'rejected') deferred.reject(new Error('SUBACK subscription rejected'));
        else deferred.resolve(packet);
      }
    }
    this.scheduleSubscriptionTimeout();
    const accepted = unackSubs.subscriptions.filter(sub => sub.state === 'acknowledged').map(sub => sub.topic);
    const rejected = unackSubs.subscriptions.filter(sub => sub.state === 'rejected').map(sub => sub.topic);
    if (accepted.length) this.emit('subscribed', accepted);
    if (rejected.length) this.emit('subscriptionRejected', rejected);
  }

  protected handleUnsuback(packet: IUnsubackPacket) {
    const unackSubs = this.unacknowledgedUnsubscribes.get(
      packet.messageId,
    );

    if (unackSubs !== undefined) {
      this.unacknowledgedUnsubscribes.delete(packet.messageId);

      for (let i = 0; i < unackSubs.subscriptions.length; i += 1) {
        const sub = unackSubs.subscriptions[i];
        sub.state = 'unsubscribe-acknowledged';

        this.subscriptions = this.subscriptions.filter((s) => s !== sub);

        const deferred = this.unresolvedUnsubscribes.get(sub.topic);

        if (deferred) {
          this.unresolvedUnsubscribes.delete(sub.topic);

          deferred.resolve(packet);
        }
      }
    } else {
      throw new Error(
        `received unsuback packet with unrecognized id ${packet.messageId}`,
      );
    }
  }

  protected startConnectTimer() {
    this.startTimer(
      'connect',
      () => {
        this.connectTimedOut();
      },
      this.connectTimeout,
    );
  }

  protected connectTimedOut() {
    switch (this.connectionState) {
      case 'connecting':
        break;
      default:
        throw new Error(
          `connect timer should not be timing out in ${this.connectionState} state`,
        );
    }

    this.changeState('offline');

    this.close();

    this.notifyConnectRejected(new Error('connect timed out'));

    this.reconnectAttempt = 0;

    this.startReconnectTimer();
  }

  protected notifyConnectRejected(err: Error) {
    if (this.unresolvedConnect) {
      this.log('rejecting initial connect');

      this.unresolvedConnect.reject(err);
    }
  }

  protected stopConnectTimer() {
    if (this.timerExists('connect')) {
      this.stopTimer('connect');
    }
  }

  protected startReconnectTimer() {
    if (this.connectionBlocked) return false;
    const { options } = this;

    let connectOptions: Partial<BaseConnectOptions> = {};
    let defaultOptions: BaseConnectOptions;

    if (!this.everConnected) {
      if (options.connect) connectOptions = options.connect;
      defaultOptions = defaultConnectOptions;
    } else {
      if (options.reconnect) connectOptions = options.reconnect;
      defaultOptions = defaultReconnectOptions;
    }

    const attempt = this.reconnectAttempt;
    const maxAttempts = connectOptions.retries ?? defaultOptions.retries;

    if (attempt >= maxAttempts) {
      return false;
    }

    // I started off using the formula in this article
    // https://dthain.blogspot.com/2009/02/exponential-backoff-in-distributed.html
    // but modified the random part so that the delay will be strictly
    // increasing.
    const min = connectOptions.minDelay ?? defaultOptions.minDelay;
    const max = connectOptions.maxDelay ?? defaultOptions.maxDelay;
    const factor = connectOptions.factor ?? defaultOptions.factor;
    const random = connectOptions.random ?? defaultOptions.random;

    // The old way:
    // const randomness = 1 + (random ? Math.random() : 0);
    // const delay = Math.floor(Math.min(randomness * min * Math.pow(factor, attempt), max));

    // The new way:
    const thisDelay = min * factor ** attempt;
    const nextDelay = min * factor ** (attempt + 1);
    const diff = nextDelay - thisDelay;
    const randomness = random ? diff * Math.random() : 0;
    const delay = Math.floor(Math.min(thisDelay + randomness, max));

    this.log(`reconnect attempt ${attempt + 1} in ${delay}ms`);

    this.startTimer(
      'reconnect',
      () => {
        this.reconnectAttempt += 1;
        this.openConnection();
      },
      delay,
    );

    return true;
  }

  protected stopReconnectTimer() {
    if (this.timerExists('reconnect')) {
      this.stopTimer('reconnect');
    }
  }

  protected startKeepaliveTimer() {
    if (!this.keepalive) {
      return;
    }

    // This method doesn't get called until after sending the connect packet
    // so this.lastPacketTime should have a value.
    const elapsed = Date.now() - this.lastPacketTime;
    const timeout = this.keepalive * 1000 - elapsed;

    this.startTimer('keepalive', () => {
      this.sendKeepalive()
    }, timeout);
  }

  protected stopKeepaliveTimer() {
    if (this.timerExists('keepalive')) {
      this.stopTimer('keepalive');
    }
  }

  protected startPingrespTimer() {
    this.startTimer('pingresp', () => {
      if (this.connectionState === 'connected') {
        this.startWaitDataTimer();
      }
    }, this.pingrespTimeout);
  }

  protected stopPingrespTimer() {
    if (this.timerExists('pingresp')) {
      this.stopTimer('pingresp');
    }
  }

  protected startWaitDataTimer() {
    this.startTimer('waitdata', () => {
      this.doDisconnect();
      this.reconnectAttempt = 0;
      this.startReconnectTimer();
    }, this.pingrespTimeout);
  }

  protected stopWaitDataTimer() {
    if (this.timerExists('waitdata')) {
      this.stopTimer('waitdata');
    }
  }

  protected async sendKeepalive() {
    if (this.connectionState === 'connected') {
      const elapsed = Date.now() - this.lastPacketTime;
      const timeout = this.keepalive * 1000;

      if (elapsed >= timeout) {
        await this.send({
          cmd: 'pingreq',
        });

        this.startPingrespTimer();
      }

      this.startKeepaliveTimer();
    } else {
      this.log('keepAliveTimer should have been cancelled');
    }
  }

  protected stopTimers() {
    this.resetReceiveBuffer();
    const error = new Error('MQTT operation stopped');
    this.abandonSubscriptions(error);
    // Also finish callers queued while offline, before any SUBSCRIBE was sent.
    for (const deferred of this.unresolvedSubscribes.values()) deferred.reject(error);
    this.unresolvedSubscribes.clear();
    this.stopConnectTimer();
    this.stopReconnectTimer();
    this.stopKeepaliveTimer();
    this.stopPingrespTimer();
    this.stopWaitDataTimer();
  }

  protected startTimer(
    name: string,
    cb: (...args: unknown[]) => void,
    delay: number,
  ) {
    if (this.timerExists(name)) {
      this.log(`timer ${name} already exists`);

      this.stopTimer(name);
    }

    this.log(`starting timer ${name} for ${delay}ms`);

    this.timers[name] = setTimeout(() => {
      delete this.timers[name];

      this.log(`invoking timer ${name} callback`);

      cb();
    }, delay);
  }

  protected stopTimer(name: string) {
    if (!this.timerExists(name)) {
      this.log(`no timer ${name} to stop`);

      return;
    }

    this.log(`stopping timer ${name}`);

    const id = this.timers[name];

    if (id) {
      clearTimeout(id);

      delete this.timers[name];
    }
  }

  protected timerExists(name: string) {
    return !!this.timers[name];
  }

  // Utility methods
  protected changeState(newState: ConnectionState) {
    const oldState = this.connectionState;
    this.connectionState = newState;
    this.log(`changeState: ${oldState} -> ${newState}`);
    this.emit('changeState', { from: oldState, to: newState });
  }

  protected generateClientId() {
    let clientId;

    if (typeof this.options.clientId === 'string') {
      clientId = this.options.clientId;
    } else if (typeof this.options.clientId === 'function') {
      clientId = this.options.clientId();
    } else {
      const prefix = this.options.clientIdPrefix || defaultClientIdPrefix;
      const suffix = Math.random().toString(36).slice(2);

      clientId = `${prefix}-${suffix}`;
    }

    return clientId;
  }

  private getURL(): URL {
    const { url } = this.options;

    const protocol = url.protocol.slice(0, -1);

    if (url.port === '') {
      url.port = DefaultPorts[protocol].toString();
    }

    this.validateURL(url);

    return url;
  }

  protected nextPacketId() {
    this.lastPacketId = (this.lastPacketId + 1) % packetIdLimit;

    // Don't allow packet id to be 0.
    if (this.lastPacketId === 0) {
      this.lastPacketId = 1;
    }

    return this.lastPacketId;
  }

  protected async send(packet: AnyPacket) {
    const bytes = this.encode(packet);

    await this.write(bytes);

    this.lastPacketTime = Date.now();
  }

  public on(eventName: string, listener: Function) {
    let listeners = this.eventListeners.get(eventName);

    if (!listeners) {
      listeners = [];
      this.eventListeners.set(eventName, listeners);
    }

    listeners.push(listener);
  }

  public off(eventName: string, listener: Function) {
    const listeners = this.eventListeners.get(eventName);

    if (listeners) {
      this.eventListeners.set(
        eventName,
        listeners.filter((l) => l !== listener),
      );
    }
  }

  protected emit(eventName: string, ...args: unknown[]) {
    const listeners = this.eventListeners.get(eventName);

    if (listeners) {
      for (let i = 0; i < listeners.length; i += 1) {
        const listener = listeners[i];
        (listener as (...args: unknown[]) => void)(...args);
      }
    }
  }
}
