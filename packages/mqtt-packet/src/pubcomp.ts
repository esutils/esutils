import { IPubcompPacket, PacketOptions, parseMessageId } from './basic';
import { UTF8Decoder, UTF8Encoder } from './utf8';

export default {
  encode(packet: IPubcompPacket, _utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    const packetType = 7;
    const flags = 0;

    return [(packetType << 4) + flags, 2, packet.messageId >> 8, packet.messageId & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _flags: number,
    _remainingLength: number,
    _utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IPubcompPacket {
    const id = parseMessageId(buffer, 0);
    return {
      cmd: 'pubcomp',
      messageId: id,
    };
  },
};
