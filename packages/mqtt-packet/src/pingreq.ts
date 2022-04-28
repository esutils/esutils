import { IPingreqPacket, PacketOptions } from './basic';
import { UTF8Decoder, UTF8Encoder } from './utf8';

export default {
  encode(_packet: IPingreqPacket, _utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    const packetType = 0b1100;
    const flags = 0b0000;

    return [(packetType << 4) + flags, 0];
  },

  decode(
    _buffer: Uint8Array,
    _flags: number,
    _remainingLength: number,
    _utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IPingreqPacket {
    return {
      cmd: 'pingreq',
    };
  },
};
