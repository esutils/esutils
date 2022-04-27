import { IPubrecPacket } from './basic';
import { UTF8Encoder } from './utf8';

export default {
  encode(packet: IPubrecPacket, _utf8Encoder?: UTF8Encoder) {
    const packetType = 5;
    const flags = 0;

    return [(packetType << 4) + flags, 2, packet.messageId >> 8, packet.messageId & 0xff];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number,
  ): IPubrecPacket {
    const id = (buffer[2] << 8) + buffer[3];

    return {
      cmd: 'pubrec',
      messageId: id,
    };
  },
};
