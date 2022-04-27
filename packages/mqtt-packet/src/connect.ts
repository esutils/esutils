import { encodeLength } from './length';
import {
  checkProtocolId,
  checkProtocolVersion,
  decodeUint8Array,
  encodeUint8Array,
  IConnectPacket,
  QoS,
} from './basic';
import {
  UTF8Encoder,
  UTF8Decoder,
  encodeUTF8String,
  decodeUTF8String,
  UTF8DecodeResult,
} from './utf8';

export default {
  encode(packet: IConnectPacket, utf8Encoder?: UTF8Encoder) {
    if (utf8Encoder === undefined) {
      throw new Error('utf8Encoder should provided for connect');
    }
    const packetType = 1;
    const flags = 0;

    const protocolId = encodeUTF8String(
      packet.protocolId ?? 'MQTT',
      utf8Encoder,
    );
    const protocolVersion = packet.protocolVersion ?? 4;

    const usernameFlag = !!packet.username;
    const passwordFlag = !!packet.password;
    const willRetain = packet.will?.retain ?? false;
    const willQoS: QoS = packet.will?.qos ?? 0;
    const willFlag = !!packet.will;
    const cleanSession = packet.clean === undefined ? true : packet.clean ?? false;
    const connectFlags = (usernameFlag ? 128 : 0)
      + (passwordFlag ? 64 : 0)
      + (willRetain ? 32 : 0)
      + (willQoS & 2 ? 16 : 0)
      + (willQoS & 1 ? 8 : 0)
      + (willFlag ? 4 : 0)
      + (cleanSession ? 2 : 0);

    const keepalive = packet.keepalive ?? 0;

    const variableHeader = [
      ...protocolId,
      protocolVersion,
      connectFlags,
      keepalive >> 8,
      keepalive & 0xff,
    ];

    const payload = [...encodeUTF8String(packet.clientId, utf8Encoder)];

    if (packet.username) {
      payload.push(...encodeUTF8String(packet.username, utf8Encoder));
    }

    if (packet.password) {
      payload.push(...encodeUint8Array(packet.password));
    }

    const fixedHeader = [
      (packetType << 4) | flags,
      ...encodeLength(variableHeader.length + payload.length),
    ];

    return [...fixedHeader, ...variableHeader, ...payload];
  },

  decode(
    buffer: Uint8Array,
    remainingStart: number,
    _remainingLength: number,
    utf8Decoder: UTF8Decoder,
  ): IConnectPacket {
    const protocolNameStart = remainingStart;
    const protocolIdString = decodeUTF8String(
      buffer,
      protocolNameStart,
      utf8Decoder,
    );
    const protocolId = checkProtocolId(protocolIdString.value);
    const protocolLevelIndex = protocolNameStart + protocolIdString.length;
    const protocolVersion = checkProtocolVersion(buffer[protocolLevelIndex]);

    const connectFlagsIndex = protocolLevelIndex + 1;
    const connectFlags = buffer[connectFlagsIndex];
    const usernameFlag = !!(connectFlags & 128);
    const passwordFlag = !!(connectFlags & 64);
    const willRetain = !!(connectFlags & 32);
    const willQoS = (connectFlags & (16 + 8)) >> 3;
    const willFlag = !!(connectFlags & 4);
    const cleanSession = !!(connectFlags & 2);

    if (willQoS !== 0 && willQoS !== 1 && willQoS !== 2) {
      throw new Error('invalid will qos');
    }

    const keepAliveIndex = connectFlagsIndex + 1;
    const keepalive = (buffer[keepAliveIndex] << 8) + buffer[keepAliveIndex + 1];

    const clientIdStart = keepAliveIndex + 2;
    const clientId = decodeUTF8String(buffer, clientIdStart, utf8Decoder);

    let username: UTF8DecodeResult | undefined;
    let password: Uint8Array | undefined;

    const usernameStart = clientIdStart + clientId.length;

    if (usernameFlag) {
      username = decodeUTF8String(buffer, usernameStart, utf8Decoder);
    }

    if (passwordFlag) {
      const passwordStart = usernameStart + (username ? username.length : 0);
      password = decodeUint8Array(buffer, passwordStart);
    }

    return {
      cmd: 'connect',
      protocolId,
      protocolVersion,
      clientId: clientId.value,
      username: username?.value,
      password,
      will: willFlag
        ? {
          retain: willRetain,
          qos: willQoS,
        }
        : undefined,
      clean: cleanSession,
      keepalive,
    };
  },
};
