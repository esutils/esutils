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
} from './basic';

export * from './basic';
export * from './length';

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
export type AnyPacketWithLength = AnyPacket & { length: number };

const cmdToPacketHandler = {
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

const packetTypesById = [
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
] as const;

export function encode(
  packet: AnyPacket,
  utf8Encoder?: UTF8Encoder,
): Uint8Array {
  const packetHandle = cmdToPacketHandler[packet.cmd];
  if (packetHandle === undefined) {
    throw new Error(`packet cmd ${packet.cmd} cannot be encoded`);
  }
  return Uint8Array.from(packetHandle.encode(packet as never, utf8Encoder));
}

export function decode(
  buffer: Uint8Array,
  utf8Decoder: UTF8Decoder,
): AnyPacket | undefined {
  if (buffer.length < 2) {
    return undefined;
  }

  const id = buffer[0] >> 4;
  const packetType = packetTypesById[id];

  if (packetType === undefined) {
    throw new Error(`packet type ${id} cannot be decoded`);
  }

  const { length: remainingLength, bytesUsedToEncodeLength } = decodeLength(
    buffer,
    1,
  );

  const packetLength = 1 + bytesUsedToEncodeLength + remainingLength;

  if (buffer.length < packetLength) {
    return undefined;
  }

  const packet = packetType.decode(
    buffer,
    1 + bytesUsedToEncodeLength,
    remainingLength,
    utf8Decoder,
  );

  const packetWithLength = <AnyPacketWithLength>packet;

  packetWithLength.length = packetLength;

  return packetWithLength;
}
