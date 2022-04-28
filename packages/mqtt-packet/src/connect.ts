import { encodeLength } from './length';
import {
  checkProtocolId,
  checkProtocolVersion,
  checkQoS,
  decodeUint8Array,
  encodeUint8Array,
  IConnectPacket,
  PacketOptions,
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
  encode(packet: IConnectPacket, utf8Encoder: UTF8Encoder, _opts: PacketOptions) {
    const packetType = 1;
    const flags = 0;

    const protocolId = encodeUTF8String(
      packet.protocolId ?? 'MQTT',
      utf8Encoder,
    );
    const protocolVersion = packet.protocolVersion ?? 4;

    const usernameFlag = packet.username !== undefined;
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

    if (packet.will) {
      if (packet.will.topic !== undefined) {
        payload.push(...encodeUTF8String(packet.will.topic, utf8Encoder));
      }
      if (packet.will.payload !== undefined) {
        payload.push(...encodeUint8Array(packet.will.payload));
      }
    }
    if (packet.username !== undefined) {
      payload.push(...encodeUTF8String(packet.username, utf8Encoder));
    }

    if (packet.password !== undefined) {
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
    _flags: number,
    _remainingLength: number,
    utf8Decoder: UTF8Decoder,
    _opts: PacketOptions,
  ): IConnectPacket {
    const protocolNameStart = 0;
    const protocolIdString = decodeUTF8String(
      buffer,
      protocolNameStart,
      utf8Decoder,
    );
    if (protocolIdString === undefined) {
      throw new Error('Cannot parse protocolId');
    }
    const protocolId = checkProtocolId(protocolIdString.value);
    const protocolLevelIndex = protocolNameStart + protocolIdString.length;
    if (protocolLevelIndex >= buffer.length) {
      throw new Error('Packet too short');
    }
    const protocolVersion = checkProtocolVersion(buffer[protocolLevelIndex]);

    const connectFlagsIndex = protocolLevelIndex + 1;
    if (connectFlagsIndex >= buffer.length) {
      throw new Error('Packet too short');
    }
    const connectFlags = buffer[connectFlagsIndex];
    const usernameFlag = !!(connectFlags & 128);
    const passwordFlag = !!(connectFlags & 64);
    const willRetain = !!(connectFlags & 32);
    const willQoS = checkQoS((connectFlags & (16 + 8)) >> 3, 'invalid will qos');
    const willFlag = !!(connectFlags & 4);
    const cleanSession = !!(connectFlags & 2);
    const connectFlagBit0 = !!(connectFlags & 1);

    if (connectFlagBit0) {
      throw new Error('connectFlag bit 0 should be 0');
    }

    if (!willFlag) {
      if (willRetain) {
        throw new Error('Will Retain Flag must be set to zero when Will Flag is set to 0');
      }
      if (willQoS) {
        throw new Error('Will QoS must be set to zero when Will Flag is set to 0');
      }
    }

    const keepAliveIndex = connectFlagsIndex + 1;
    if (keepAliveIndex + 1 > buffer.length) {
      throw new Error('Packet too short');
    }
    const keepalive = (buffer[keepAliveIndex] << 8) + buffer[keepAliveIndex + 1];
    let clientIdStart = keepAliveIndex + 2;
    const clientId = decodeUTF8String(buffer, clientIdStart, utf8Decoder);
    if (clientId === undefined) {
      throw new Error('Packet too short');
    }
    let willTopic: UTF8DecodeResult | undefined;
    let willMessage: Uint8Array | undefined;
    if (willFlag) {
      const willTopicStart = clientIdStart + clientId.length;
      willTopic = decodeUTF8String(buffer, willTopicStart, utf8Decoder);
      if (willTopic === undefined) {
        throw new Error('Cannot parse will topic');
      }
      const willMessageStart = willTopicStart + willTopic.length;
      willMessage = decodeUint8Array(buffer, willMessageStart);
      if (willMessage === undefined) {
        throw new Error('Cannot parse will payload');
      }
      clientIdStart += willTopic.length + willMessage.length + 2;
    }

    let username: UTF8DecodeResult | undefined;
    let password: Uint8Array | undefined;

    const usernameStart = clientIdStart + clientId.length;

    if (usernameFlag) {
      username = decodeUTF8String(buffer, usernameStart, utf8Decoder);
      if (username === undefined) {
        throw new Error('Cannot parse username');
      }
    }

    if (passwordFlag) {
      const passwordStart = usernameStart + (username ? username.length : 0);
      password = decodeUint8Array(buffer, passwordStart);
      if (password === undefined) {
        throw new Error('Cannot parse password');
      }
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
          payload: willMessage,
          topic: willTopic?.value,
        }
        : undefined,
      clean: cleanSession,
      keepalive,
    };
  },
};
