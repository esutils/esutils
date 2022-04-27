import { IUnsubscribePacket } from './basic';
import { encodeLength } from './length';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8';

export default {
  encode(packet: IUnsubscribePacket, utf8Encoder?: UTF8Encoder) {
    if (utf8Encoder === undefined) {
      throw new Error('utf8Encoder should provided for unsubscribe');
    }
    const packetType = 0b1010;
    const flags = 0b0010;

    const variableHeader = [packet.messageId >> 8, packet.messageId & 0xff];

    const payload = [];

    for (let i = 0; i < packet.unsubscriptions.length; i += 1) {
      const topic = packet.unsubscriptions[i];
      payload.push(...encodeUTF8String(topic, utf8Encoder));
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
  ): IUnsubscribePacket {
    const idStart = remainingStart;
    const id = (buffer[idStart] << 8) + buffer[idStart + 1];

    const topicFiltersStart = idStart + 2;
    const topicFilters: string[] = [];

    for (let i = topicFiltersStart; i < buffer.length;) {
      const topicFilter = decodeUTF8String(buffer, i, utf8Decoder);
      i += topicFilter.length;

      topicFilters.push(topicFilter.value);
    }

    return {
      cmd: 'unsubscribe',
      messageId: id,
      unsubscriptions: topicFilters,
    };
  },
};
