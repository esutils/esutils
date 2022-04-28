import { IUnsubackPacket, PacketOptions, parseMessageId } from './basic';
import { UTF8Decoder, UTF8Encoder } from './utf8';

export default {
  encode(packet: IUnsubackPacket, _utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    const packetType = 11;
    const flags = 0;

    return [(packetType << 4) + flags, 2, packet.messageId >> 8, packet.messageId & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _flags: number,
    remainingLength: number,
    _utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IUnsubackPacket {
    if (remainingLength !== 2) {
      throw new Error('Malformed unsuback, payload length must be 2');
    }
    if (remainingLength <= 0) {
      throw new Error('Malformed unsuback, no payload specified');
    }
    const id = parseMessageId(buffer, 0);

    return {
      cmd: 'unsuback',
      messageId: id,
    };
  },
};
