import { checkQoS, ISubscribePacket, ISubscription } from './basic';
import { encodeLength } from './length';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8';

export default {
  encode(packet: ISubscribePacket, utf8Encoder?: UTF8Encoder) {
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
    remainingStart: number,
    _remainingLength: number,
    utf8Decoder: UTF8Decoder,
  ): ISubscribePacket {
    const idStart = remainingStart;
    const id = (buffer[idStart] << 8) + buffer[idStart + 1];

    const subscriptionsStart = idStart + 2;
    const subscriptions: ISubscription[] = [];

    for (let i = subscriptionsStart; i < buffer.length;) {
      const topicFilter = decodeUTF8String(buffer, i, utf8Decoder);
      i += topicFilter.length;

      const qos = checkQoS(buffer[i]);
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
