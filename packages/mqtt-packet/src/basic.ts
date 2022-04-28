/* eslint-disable max-len */
export type QoS = 0 | 1 | 2;
/*
  3 = MQTT V3.1
  4 = MQTT V3.1.1
  5 = MQTT V5
*/
export type ProtocolVersion = 3 | 4 | 5;
export type ProtocolId = 'MQTT' | 'MQIsdp';

export function checkQoS(qos: number, error?: string): QoS {
  if (qos !== 0 && qos !== 1 && qos !== 2) {
    throw new Error(error ?? 'invalid qos');
  }
  return qos;
}

export function checkProtocolVersion(version: number): ProtocolVersion {
  if (version !== 3 && version !== 4 && version !== 5) {
    throw new Error('Invalid protocol version');
  }
  return version;
}

export function checkProtocolId(id: string): ProtocolId {
  if (id !== 'MQTT' && id !== 'MQIsdp') {
    throw new Error('Invalid protocol id');
  }
  return id;
}

export declare type PacketCmd =
  | 'auth'
  | 'connack'
  | 'connect'
  | 'disconnect'
  | 'pingreq'
  | 'pingresp'
  | 'puback'
  | 'pubcomp'
  | 'publish'
  | 'pubrel'
  | 'pubrec'
  | 'suback'
  | 'subscribe'
  | 'unsuback'
  | 'unsubscribe';

export type UserProperties = { [index: string]: string | string[] };

export interface IPacket {
  cmd: PacketCmd;
  messageId?: number; /* Packet Identifier */
  length?: number;
}
export interface IConnectPacket extends IPacket {
  cmd: 'connect';
  clientId: string;
  protocolVersion?: ProtocolVersion /* `undefined` means `4` */;
  protocolId?: ProtocolId /* `undefined` means `MQTT` */;
  clean?: boolean /* `undefined` means `true` */;
  keepalive?: number;
  username?: string;
  password?: Uint8Array;
  will?: {
    topic?: string
    payload?: Uint8Array
    retain?: boolean;
    qos?: QoS;
  };
}

export interface IConnackPacket extends IPacket {
  cmd: 'connack';
  sessionPresent?: boolean;

  /*
  | Value |                  Return Code Response                  |                                     Description                                    |
  |:-----:|:------------------------------------------------------:|:----------------------------------------------------------------------------------:|
  | 0     | 0x00 Connection Accepted                               | Connection accepted                                                                |
  | 1     | 0x01 Connection Refused, unacceptable protocol version | The Server does not support the level of the MQTT protocol requested by the Client |
  | 2     | 0x02 Connection Refused, identifier rejected           | The Client identifier is correct UTF-8 but not allowed by the Server               |
  | 3     | 0x03 Connection Refused, Server unavailable            | The Network Connection has been made but the MQTT service is unavailable           |
  | 4     | 0x04 Connection Refused, bad user name or password     | The data in the user name or password is malformed                                 |
  | 5     | 0x05 Connection Refused, not authorized                | The Client is not authorized to connect                                            |
  | 6-255 |                                                        | Reserved for future use                                                            |
  */
  returnCode?: number; /* Only for MQTT Version 3.1.1 */
}

export interface IDisconnectPacket extends IPacket {
  cmd: 'disconnect';
}

export interface IPingreqPacket extends IPacket {
  cmd: 'pingreq';
}

export interface IPingrespPacket extends IPacket {
  cmd: 'pingresp';
}

export interface IPubackPacket extends IPacket {
  cmd: 'puback';
  messageId: number;
}

export interface IPubcompPacket extends IPacket {
  cmd: 'pubcomp';
  messageId: number;
}

export interface PublishOptions {
  qos?: QoS;
  dup?: boolean;
  retain?: boolean;
}

export interface IPublishPacket extends PublishOptions, IPacket {
  cmd: 'publish';
  messageId?: number; // only for qos1 and qos2
  topic: string;
  payload: Uint8Array;
}

export interface IPubrecPacket extends IPacket {
  cmd: 'pubrec';
  messageId: number;
}

export interface IPubrelPacket extends IPacket {
  cmd: 'pubrel';
  messageId: number;
}

export interface ISubackPacket extends IPacket {
  cmd: 'suback';
  messageId: number;
  granted: number[];
}

export interface ISubscription {
  topic: string;
  qos: QoS;
}

export interface ISubscribePacket extends IPacket {
  cmd: 'subscribe';
  messageId: number;
  subscriptions: ISubscription[];
}

export interface IUnsubackPacket extends IPacket {
  cmd: 'unsuback';
  messageId: number;
}

export interface IUnsubscribePacket extends IPacket {
  cmd: 'unsubscribe';
  messageId: number;
  unsubscriptions: string[];
}

export interface PacketOptions {
  protocolVersion: ProtocolVersion
}

export function encodeUint8Array(bytes: Uint8Array) {
  return [bytes.length >> 8, bytes.length & 0xff, ...bytes];
}

export function decodeUint8Array(
  buffer: Uint8Array,
  startIndex: number,
): Uint8Array | undefined {
  if (startIndex >= buffer.length || (startIndex + 2 > buffer.length)) {
    return undefined;
  }
  const length = (buffer[startIndex] << 8) + buffer[startIndex + 1];
  const bytes = buffer.subarray(startIndex + 2, startIndex + 2 + length);
  return bytes;
}

export function parseMessageId(buffer: Uint8Array, startIndex: number): number {
  if (startIndex + 2 > buffer.length) {
    throw new Error('Cannot parse messageId');
  }
  return (buffer[startIndex] << 8) | buffer[startIndex + 1];
}

export function createHeaderFlagsError(requiredHeaderFlag: number, types: string): string {
  return `Invalid header flag bits, must be 0x${requiredHeaderFlag.toString(16)} for ${types} packet`;
}
