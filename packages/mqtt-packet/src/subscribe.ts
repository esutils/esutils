import {
  checkQoS, ISubscribePacket, ISubscription, PacketOptions, parseMessageId,
} from './basic';
import { encodeLength } from './length';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8';

export default {
  encode(packet: ISubscribePacket, utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    if (utf8Encoder === undefined) {
      throw new Error('utf8Encoder should provided for subscription');
    }
    const packetType = 8;
    const flags = 0b0010; // bit 2 must be 1 in 3.1.1

    const variableHeader = [packet.messageId >> 8, packet.messageId & 0xff];

    const payload = [];

    for (let i = 0; i < packet.subscriptions.length; i += 1) {
      const sub = packet.subscriptions[i];
      payload.push(...encodeUTF8String(sub.topic, utf8Encoder), sub.qos);
    }

    const fixedHeader = [
      (packetType << 4) | flags,
      ...encodeLength(variableHeader.length + payload.length),
    ];

    return [...fixedHeader, ...variableHeader, ...payload];
  },

  decode(
    buffer: Uint8Array,
    _flags: number,
    remainingLength: number,
    utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): ISubscribePacket {
    const idStart = 0;
    const id = parseMessageId(buffer, idStart);
    if (remainingLength <= 0) {
      throw new Error('Malformed subscribe, no payload specified');
    }
    const subscriptionsStart = idStart + 2;
    const subscriptions: ISubscription[] = [];
    for (let i = subscriptionsStart; i < buffer.length;) {
      const topicFilter = decodeUTF8String(buffer, i, utf8Decoder);
      if (topicFilter === undefined) {
        throw new Error('Cannot parse topic');
      }
      i += topicFilter.length;
      if (i >= buffer.length) {
        throw new Error('Malformed Subscribe Payload');
      }
      const options = buffer[i];
      if (options & 0xfc) {
        throw new Error('Invalid subscribe topic flag bits, bits 7-2 must be 0');
      }
      const qos = checkQoS(options & 0x3);
      i += 1;

      subscriptions.push({
        topic: topicFilter.value,
        qos,
      });
    }

    return {
      cmd: 'subscribe',
      messageId: id,
      subscriptions,
    };
  },
};
