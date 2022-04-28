import { decodeLength } from './length';
import { UTF8Encoder, UTF8Decoder } from './utf8';

import connect from './connect';
import connack from './connack';
import disconnect from './disconnect';
import pingreq from './pingreq';
import pingresp from './pingresp';
import puback from './puback';
import pubcomp from './pubcomp';
import publish from './publish';
import pubrec from './pubrec';
import pubrel from './pubrel';
import suback from './suback';
import subscribe from './subscribe';
import unsuback from './unsuback';
import unsubscribe from './unsubscribe';
import {
  IConnectPacket,
  IConnackPacket,
  IDisconnectPacket,
  IPingreqPacket,
  IPingrespPacket,
  IPubackPacket,
  IPubcompPacket,
  IPublishPacket,
  IPubrecPacket,
  IPubrelPacket,
  ISubackPacket,
  ISubscribePacket,
  IUnsubackPacket,
  IUnsubscribePacket,
  PacketOptions,
  createHeaderFlagsError,
} from './basic';

export * from './basic';
export * from './length';
export * from './utf8';

export type AnyPacket =
  | IConnectPacket
  | IConnackPacket
  | IDisconnectPacket
  | IPingreqPacket
  | IPingrespPacket
  | IPubackPacket
  | IPubcompPacket
  | IPublishPacket
  | IPubrecPacket
  | IPubrelPacket
  | ISubackPacket
  | ISubscribePacket
  | IUnsubackPacket
  | IUnsubscribePacket;

export const CmdToPacketHandler = {
  connect,
  connack,
  publish,
  puback,
  pubrec,
  pubrel,
  pubcomp,
  subscribe,
  suback,
  unsubscribe,
  unsuback,
  pingreq,
  pingresp,
  disconnect,
};

export const PacketIdToCmd = [
  undefined, // 0 reserved
  connect, // 1
  connack, // 2
  publish, // 3
  puback, // 4
  pubrec, // 5
  pubrel, // 6
  pubcomp, // 7
  subscribe, // 8
  suback, // 9
  unsubscribe, // 10
  unsuback, // 11
  pingreq, // 12
  pingresp, // 13
  disconnect, // 14
  undefined, // 15
] as const;

export const PacketCmdToName = {
  0: 'reserved',
  1: 'connect',
  2: 'connack',
  3: 'publish',
  4: 'puback',
  5: 'pubrec',
  6: 'pubrel',
  7: 'pubcomp',
  8: 'subscribe',
  9: 'suback',
  10: 'unsubscribe',
  11: 'unsuback',
  12: 'pingreq',
  13: 'pingresp',
  14: 'disconnect',
  15: 'auth',
} as const;

export type PacketCmd = keyof typeof PacketCmdToName;

export const CmdHeaderFlagsV3V4 = {
  0: -2, // 'reserved'
  1: 0, // 'connect'
  2: 0, // 'connack'
  3: -1, // 'publish'
  4: 0, // 'puback'
  5: 0, // 'pubrec'
  6: 2, // 'pubrel'
  7: 0, // 'pubcomp'
  8: 2, // 'subscribe'
  9: 0, // 'suback'
  10: 2, // 'unsubscribe'
  11: 0, // 'unsuback'
  12: 0, // 'pingreq'
  13: 0, // 'pingresp'
  14: 0, // 'disconnect'
  15: -2, // 'auth'
} as const;

export function encode(
  packet: AnyPacket,
  utf8Encoder: UTF8Encoder,
  opts: PacketOptions,
): Uint8Array {
  const packetHandle = CmdToPacketHandler[packet.cmd];
  if (packetHandle === undefined) {
    throw new Error(`packet cmd ${packet.cmd} cannot be encoded`);
  }
  return Uint8Array.from(
    packetHandle.encode(packet as never, utf8Encoder, opts),
  );
}

/* return `undefined` means the buffer's length is not enough, need receive more */
export function decodeHeader(
  buffer: Uint8Array,
  _opts: PacketOptions,
) {
  if (buffer.length < 2) {
    return undefined;
  }
  const cmdId = (buffer[0] >> 4) as PacketCmd;

  const requiredHeaderFlag = CmdHeaderFlagsV3V4[cmdId];

  /* Distinguish between v3 and v5 */
  if (requiredHeaderFlag === -2) {
    throw new Error('Not supported');
  }

  const packetCmd = PacketIdToCmd[cmdId];
  if (packetCmd === undefined) {
    throw new Error('Not supported');
  }

  const headerFlag = buffer[0] & 0xf;
  if (headerFlag !== requiredHeaderFlag && requiredHeaderFlag >= 0) {
    throw new Error(createHeaderFlagsError(requiredHeaderFlag, PacketCmdToName[cmdId]));
  }

  const { length: remainingLength, bytesUsedToEncodeLength } = decodeLength(
    buffer,
    1,
  );

  const headerLength = 1 + bytesUsedToEncodeLength;
  const packetLength = headerLength + remainingLength;
  if (buffer.length < packetLength) {
    return undefined;
  }
  return {
    cmdId,
    packetCmd,
    buffer: buffer.subarray(headerLength),
    flags: headerFlag,
    packetLength: headerLength + remainingLength,
    remainingLength,
  };
}

export function decode(
  buffer: Uint8Array,
  utf8Decoder: UTF8Decoder,
  opts: PacketOptions,
): AnyPacket | undefined {
  const headerInfo = decodeHeader(buffer, opts);
  if (headerInfo === undefined) {
    return undefined;
  }
  const packet = headerInfo.packetCmd.decode(
    headerInfo.buffer,
    headerInfo.flags,
    headerInfo.remainingLength,
    utf8Decoder,
    opts,
  );

  if (packet !== undefined) {
    packet.length = headerInfo.remainingLength;
  }

  return packet;
}
