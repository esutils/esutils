/* eslint-disable max-classes-per-file */
import { Deferred } from '@esutils/deferred';
import {
  QoS,
  encode,
  AnyPacket,
  IConnackPacket,
  IPublishPacket,
  IPubackPacket,
  IPubrecPacket,
  IPubrelPacket,
  IPubcompPacket,
  ISubscribePacket,
  ISubackPacket,
  IUnsubscribePacket,
  IUnsubackPacket,
  UTF8Encoder,
  UTF8Decoder,
  ISubscription,
  ProtocolVersion,
  decodeHeader,
  PublishOptions,
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
  connect?: boolean | RetryOptions;
  reconnect?: boolean | RetryOptions;
  incomingStore?: IncomingStore;
  outgoingStore?: OutgoingStore;
  logger?: (msg: string, ...args: unknown[]) => void;
}

export interface RetryOptions {
  retries?: number;
  minDelay?: number;
  maxDelay?: number;
  factor?: number;
  random?: boolean;
}

export type SubscriptionState =
| 'unknown'
| 'pending'
| 'removed'
| 'replaced'
| 'unacknowledged'
| 'acknowledged'
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
  }

  async has(packetId: number): Promise<boolean> {
    return this.packets.has(packetId);
  }

  async discard(packetId: number): Promise<void> {
    this.packets.delete(packetId);
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
  }

  async discard(packetId: number): Promise<void> {
    this.packets.delete(packetId);
  }

  async* iterate(): AsyncIterable<IPublishPacket | IPubrelPacket> {
    // eslint-disable-next-line no-restricted-syntax
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
const defaultConnectOptions = {
  retries: Infinity,
  minDelay: 1000,
  maxDelay: 2000,
  factor: 1.1,
  random: false,
};

const defaultReconnectOptions = {
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

  connectionState: ConnectionState = 'offline';

  everConnected: boolean = false;

  disconnectRequested: boolean = false;

  reconnectAttempt: number = 0;

  subscriptions: Subscription[] = [];

  private lastPacketId: number = 0;

  private lastPacketTime: number;

  private buffer?: Uint8Array;

  private unresolvedConnect?: Deferred<IConnackPacket>;

  private queuedPublishes: {
    packet: IPublishPacket;
    deferred: Deferred<void>;
  }[] = [];

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
    [key: string]: any | undefined;
  } = {};

  protected log: (msg: string, ...args: unknown[]) => void;

  public constructor(options: BaseClientOptions) {
    this.options = options;
    this.protocolVersion = this.options.protocolVersion;
    this.utf8Encoder = this.options.utf8Encoder;
    this.utf8Decoder = this.options.utf8Decoder;

    this.clientId = this.generateClientId();
    this.keepalive = typeof this.options.keepalive === 'number'
      ? this.options.keepalive
      : defaultKeepalive;

    this.connectTimeout = this.options.connectTimeout ?? defaultConnectTimeout;
    this.incomingStore = this.options.incomingStore || new IncomingMemoryStore();
    this.outgoingStore = this.options.outgoingStore || new OutgoingMemoryStore();

    this.lastPacketTime = Date.now();

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

    const deferred = new Deferred<IConnackPacket>();

    this.unresolvedConnect = deferred;

    this.openConnection();

    return deferred.promise;
  }

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
      this.log('queueing publish');

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

      this.sendPublish(packet, deferred);
    }
  }

  protected async flushUnacknowledgedPublishes() {
    // eslint-disable-next-line no-restricted-syntax
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
    const promises = [];

    for (let i = 0; i < subs.length; i += 1) {
      const sub = subs[i];
      // Replace any matching subscription so we don't resubscribe to it
      // multiple times on reconnect. This matches what the broker is supposed
      // to do when it receives a subscribe packet containing a topic filter
      // matching an existing subscription.
      this.subscriptions = this.subscriptions.filter(
        (old) => old.topic !== sub.topic,
      );

      this.subscriptions.push(sub);

      const deferred = new Deferred<ISubackPacket | undefined>();

      this.unresolvedSubscribes.set(sub.topic, deferred);

      promises.push(deferred.promise.then(() => sub));
    }

    await this.flushSubscriptions();

    return Promise.all(promises);
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
    });

    await this.send(subscribePacket);

    for (let i = 0; i < subscriptions.length; i += 1) {
      const sub = subscriptions[i];
      sub.state = 'unacknowledged';
    }
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
    await this.send({ cmd: 'disconnect' });
    await this.close();
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
    this.buffer = undefined;
  }

  // This gets called from connect and when reconnecting.
  protected async openConnection() {
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

      this.startConnectTimer();
    } catch (err) {
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
    this.log('connectionClosed');

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

  protected bytesReceived(bytes: Uint8Array) {
    let buffer: Uint8Array | undefined;
    const oldBuffer = this.buffer;

    if (oldBuffer) {
      const newBuffer = new Uint8Array(oldBuffer.length + bytes.length);

      newBuffer.set(oldBuffer);
      newBuffer.set(bytes, oldBuffer.length);

      buffer = newBuffer;
    } else {
      const newBytes = new Uint8Array(bytes.length);
      newBytes.set(bytes);
      buffer = newBytes;
    }
    const opts = { protocolVersion: this.protocolVersion };

    for (;;) {
      const headerInfo = decodeHeader(buffer, opts);

      if (headerInfo === undefined) {
        break;
      }
      const packet = headerInfo.packetCmd.decode(
        headerInfo.buffer,
        headerInfo.flags,
        headerInfo.remainingLength,
        this.utf8Decoder,
        opts,
      );
      if (packet === undefined) {
        break;
      }

      this.log(`received ${packet.cmd} packet`, packet);

      this.packetReceived(packet);

      if (headerInfo.packetLength < buffer.length) {
        buffer = buffer.slice(headerInfo.packetLength);
      } else {
        buffer = undefined;
        break;
      }
    }

    this.buffer = buffer;
  }

  protected packetReceived(packet: AnyPacket) {
    switch (packet.cmd) {
      case 'connack':
        this.handleConnack(packet);
        break;
      case 'publish':
        this.handlePublish(packet);
        break;
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
        // TODO:
        this.log(`recv ping resp ${Date.now()}`);
        break;
      default:
        throw new Error(`Not supported ${packet.cmd}`);
    }
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
        this.incomingStore.store(packet.messageId);
        this.emit('message', packet.topic, packet.payload, packet);
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

  protected handleSuback(packet: ISubackPacket) {
    const unackSubs = this.unacknowledgedSubscribes.get(
      packet.messageId,
    );

    // TODO: verify returnCodes length matches subscriptions.length

    if (unackSubs !== undefined) {
      this.unacknowledgedSubscribes.delete(packet.messageId);

      for (let i = 0; i < unackSubs.subscriptions.length; i += 1) {
        const sub = unackSubs.subscriptions[i];
        sub.state = 'acknowledged';
        sub.granted = packet.granted[i];
        i += 1;

        const deferred = this.unresolvedSubscribes.get(sub.topic);

        if (deferred) {
          this.unresolvedSubscribes.delete(sub.topic);

          deferred.resolve(packet);
        }
      }
    } else {
      throw new Error(
        `received suback packet with unrecognized id ${packet.messageId}`,
      );
    }
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
    const { options } = this;

    let reconnectOptions;
    let defaultOptions;

    if (!this.everConnected) {
      reconnectOptions = options.connect || {};
      defaultOptions = defaultConnectOptions;
    } else {
      reconnectOptions = options.reconnect || {};
      defaultOptions = defaultReconnectOptions;
    }

    if (reconnectOptions === false) {
      return false;
    } if (reconnectOptions === true) {
      reconnectOptions = {};
    }

    const attempt = this.reconnectAttempt;
    const maxAttempts = reconnectOptions.retries ?? defaultOptions.retries;

    if (attempt >= maxAttempts) {
      return false;
    }

    // I started off using the formula in this article
    // https://dthain.blogspot.com/2009/02/exponential-backoff-in-distributed.html
    // but modified the random part so that the delay will be strictly
    // increasing.
    const min = reconnectOptions.minDelay ?? defaultOptions.minDelay;
    const max = reconnectOptions.maxDelay ?? defaultOptions.maxDelay;
    const factor = reconnectOptions.factor ?? defaultOptions.factor;
    const random = reconnectOptions.random ?? defaultOptions.random;

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

    this.startTimer('keepalive', () => this.sendKeepalive(), timeout);
  }

  protected stopKeepaliveTimer() {
    if (this.timerExists('keepalive')) {
      this.stopTimer('keepalive');
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

        // TODO: need a timer here to disconnect if we don't receive the pingresp
      }

      this.startKeepaliveTimer();
    } else {
      this.log('keepAliveTimer should have been cancelled');
    }
  }

  protected stopTimers() {
    this.stopConnectTimer();
    this.stopReconnectTimer();
    this.stopKeepaliveTimer();
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
        listener(...args);
      }
    }
  }
}
