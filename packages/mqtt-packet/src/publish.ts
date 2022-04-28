import { encodeLength } from './length';
import {
  checkQoS, IPublishPacket, PacketOptions, parseMessageId,
} from './basic';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
} from './utf8';

export default {
  encode(packet: IPublishPacket, utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    if (utf8Encoder === undefined) {
      throw new Error('utf8Encoder should provided for publish');
    }
    const packetType = 3;

    const qos = packet.qos ?? 0;

    const flags = (packet.dup ? 8 : 0)
      + (qos & 2 ? 4 : 0)
      + (qos & 1 ? 2 : 0)
      + (packet.retain ? 1 : 0);

    const variableHeader = [...encodeUTF8String(packet.topic, utf8Encoder)];

    if (qos === 1 || qos === 2) {
      if (typeof packet.messageId !== 'number' || packet.messageId < 1) {
        throw new Error('when qos is 1 or 2, packet must have id');
      }

      variableHeader.push(packet.messageId >> 8, packet.messageId & 0xff);
    }

    let { payload } = packet;

    if (typeof payload === 'string') {
      payload = utf8Encoder.encode(payload);
    }

    const fixedHeader = [
      (packetType << 4) | flags,
      ...encodeLength(variableHeader.length + payload.length),
    ];

    return [...fixedHeader, ...variableHeader, ...payload];
  },

  decode(
    buffer: Uint8Array,
    flags: number,
    remainingLength: number,
    utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IPublishPacket {
    const dup = !!(flags & 8);
    const qos = checkQoS((flags & 6) >> 1);
    const retain = !!(flags & 1);

    const topicStart = 0;
    const decodedTopic = decodeUTF8String(buffer, topicStart, utf8Decoder);
    if (decodedTopic === undefined) {
      throw new Error('Cannot parse topic');
    }
    const topic = decodedTopic.value;

    let id = 0;
    let payloadStart = topicStart + decodedTopic.length;

    if (qos > 0) {
      const idStart = payloadStart;
      id = parseMessageId(buffer, idStart);
      payloadStart += 2;
    }

    const payload = buffer.subarray(
      payloadStart,
      remainingLength,
    );

    const returnPacket: IPublishPacket = {
      cmd: 'publish',
      topic,
      payload,
      dup,
      retain,
      qos,
    };
    if (id > 0) {
      returnPacket.messageId = id;
    }
    return returnPacket;
  },
};
