import { IUnsubscribePacket, PacketOptions, parseMessageId } from './basic';
import { encodeLength } from './length';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8';

export default {
  encode(packet: IUnsubscribePacket, utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
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
    _flags: number,
    remainingLength: number,
    utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IUnsubscribePacket {
    const idStart = 0;
    const id = parseMessageId(buffer, idStart);

    if (remainingLength <= 0) {
      throw new Error('Malformed unsubscribe, no payload specified');
    }

    const topicFiltersStart = idStart + 2;
    const topicFilters: string[] = [];

    for (let i = topicFiltersStart; i < buffer.length;) {
      const topicFilter = decodeUTF8String(buffer, i, utf8Decoder);
      if (topicFilter === undefined) {
        throw new Error('Cannot parse topic');
      }
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
