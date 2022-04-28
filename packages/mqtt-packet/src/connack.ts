import { IConnackPacket, PacketOptions } from './basic';
import { UTF8Decoder, UTF8Encoder } from './utf8';

export default {
  encode(packet: IConnackPacket, _utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
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
    _flags: number,
    remainingLength: number,
    _utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IConnackPacket | undefined {
    if (remainingLength < 2) {
      return undefined;
    }
    if (buffer[0] & 0xfe) {
      throw new Error('Invalid connack flags, bits 7-1 must be set to 0');
    }
    const sessionPresent = (buffer[0] & 0x1) === 1;
    const returnCode = buffer[1];

    return {
      cmd: 'connack',
      sessionPresent,
      returnCode,
    };
  },
};
