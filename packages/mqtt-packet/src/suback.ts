import { ISubackPacket, PacketOptions, parseMessageId } from './basic';
import { UTF8Decoder, UTF8Encoder } from './utf8';

export default {
  encode(packet: ISubackPacket, _utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    const packetType = 9;
    const flags = 0;

    return [
      (packetType << 4) + flags,
      2 + packet.granted.length,
      packet.messageId >> 8,
      packet.messageId & 0xff,
      ...packet.granted,
    ];
  },

  decode(
    buffer: Uint8Array,
    _flags: number,
    remainingLength: number,
    _utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): ISubackPacket {
    const idStart = 0;
    const id = parseMessageId(buffer, idStart);
    const payloadStart = idStart + 2;
    const granted = [];

    if (remainingLength <= 0) {
      throw new Error('Malformed suback, no payload specified');
    }

    for (let i = payloadStart; i < buffer.length; i += 1) {
      const returnCode = buffer[i];
      /*
       For MQTT 3.1.1
       Allowed return codes:
        0x00 - Success - Maximum QoS 0
        0x01 - Success - Maximum QoS 1
        0x02 - Success - Maximum QoS 2
        0x80 - Failure
      */
      if (returnCode <= 2 || returnCode === 0x80) {
        granted.push(returnCode);
      } else {
        throw new Error('Invalid suback QoS, must be <= 2');
      }
    }

    return {
      cmd: 'suback',
      messageId: id,
      granted,
    };
  },
};
