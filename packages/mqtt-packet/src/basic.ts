/* eslint-disable max-len */
export type QoS = 0 | 1 | 2;
export type ProtocolVersion = 3 | 4 | 5;
export type ProtocolId = 'MQTT' | 'MQIsdp';

export function checkQoS(qos: number): QoS {
  if (qos !== 0 && qos !== 1 && qos !== 2) {
    throw new Error('invalid qos');
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
    throw new Error('Invalid protocol version');
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

export interface IPublishPacket extends IPacket {
  cmd: 'publish';
  messageId: number;
  qos?: QoS;
  dup?: boolean;
  retain?: boolean;
  topic: string;
  payload: string | Uint8Array;
}

export interface IPubrecPacket extends IPacket {
  cmd: 'pubrec';
  messageId: number;
}

export interface IPubrelPacket extends IPacket {
  cmd: 'pubrel';
  messageId: number;
}

export interface ISubackPacket {
  cmd: 'suback';
  messageId: number;
  granted: number[];
}

export interface ISubscription {
  topic: string;
  qos: QoS;
}

export interface ISubscribePacket {
  cmd: 'subscribe';
  messageId: number;
  subscriptions: ISubscription[];
}

export interface IUnsubackPacket {
  cmd: 'unsuback';
  messageId: number;
}

export interface IUnsubscribePacket {
  cmd: 'unsubscribe';
  messageId: number;
  unsubscriptions: string[];
}

export function encodeUint8Array(bytes: Uint8Array) {
  return [bytes.length >> 8, bytes.length & 0xff, ...bytes];
}

export function decodeUint8Array(
  buffer: Uint8Array,
  startIndex: number,
): Uint8Array {
  const length = (buffer[startIndex] << 8) + buffer[startIndex + 1];
  const bytes = buffer.subarray(startIndex + 2, startIndex + 2 + length);
  return bytes;
}
