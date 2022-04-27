import { IPingrespPacket } from './basic';
import { UTF8Encoder } from './utf8';

export default {
  encode(_packet: IPingrespPacket, _utf8Encoder?: UTF8Encoder) {
    return [0xd0, 0];
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number,
  ): IPingrespPacket {
    return {
      cmd: 'pingresp',
    };
  },
};
