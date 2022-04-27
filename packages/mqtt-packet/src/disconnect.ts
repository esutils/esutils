import { IDisconnectPacket } from './basic';
import { UTF8Encoder } from './utf8';

export default {
  encode(_packet: IDisconnectPacket, _utf8Encoder?: UTF8Encoder) {
    const packetType = 14;
    const flags = 0;

    return [(packetType << 4) | flags, 0];
  },

  decode(
    _buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number,
  ): IDisconnectPacket {
    return {
      cmd: 'disconnect',
    };
  },
};
