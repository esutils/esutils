import { IConnackPacket } from './basic';
import { UTF8Encoder } from './utf8';

export default {
  encode(packet: IConnackPacket, _utf8Encoder?: UTF8Encoder) {
    const packetType = 2;
    const flags = 0;

    return [
      (packetType << 4) + flags,
      2,
      packet.sessionPresent === true ? 1 : 0,
      packet.returnCode ?? 0,
    ];
  },

  decode(
    buffer: Uint8Array,
    _remainingStart: number,
    _remainingLength: number,
  ): IConnackPacket {
    const sessionPresent = (buffer[2] & 0x1) === 1;
    const returnCode = buffer[3];

    return {
      cmd: 'connack',
      sessionPresent,
      returnCode,
    };
  },
};
