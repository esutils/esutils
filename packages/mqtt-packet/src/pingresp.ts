import { IPingrespPacket, PacketOptions } from './basic';
import { UTF8Decoder, UTF8Encoder } from './utf8';

export default {
  encode(_packet: IPingrespPacket, _utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    return [0xd0, 0];
  },

  decode(
    _buffer: Uint8Array,
    _flags: number,
    _remainingLength: number,
    _utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IPingrespPacket {
    return {
      cmd: 'pingresp',
    };
  },
};
