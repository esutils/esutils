import { type ISubackPacket, type PacketOptions, parseMessageId } from './basic.mjs';
import { type UTF8Decoder, type UTF8Encoder } from './utf8.mjs';

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

    /* remainingLength = 2 字节 messageId + N 个 return code，据此限定边界避免越界到粘包字节 */
    const returnCodesCount = remainingLength - 2;
    for (let i = 0; i < returnCodesCount; i += 1) {
      const returnCode = buffer[payloadStart + i];
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
