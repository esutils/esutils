import { IPingreqPacket } from './basic';
import { UTF8Encoder } from './utf8';

export default {
  encode(_packet: IPingreqPacket, _utf8Encoder?: UTF8Encoder) {
    const packetType = 0b1100;
    const flags = 0b0000;

    return [(packetType << 4) + flags, 0];
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number,
  ): IPingreqPacket {
    return {
      cmd: 'pingreq',
    };
  },
};
