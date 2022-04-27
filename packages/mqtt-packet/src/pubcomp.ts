import { IPubcompPacket } from './basic';
import { UTF8Encoder } from './utf8';

export default {
  encode(packet: IPubcompPacket, _utf8Encoder?: UTF8Encoder) {
    const packetType = 7;
    const flags = 0;

    return [(packetType << 4) + flags, 2, packet.messageId >> 8, packet.messageId & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number,
  ): IPubcompPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      cmd: 'pubcomp',
      messageId: id,
    };
  },
};
