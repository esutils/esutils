import { encode, decode, decodeHeader, decodeLength } from '@esutils/mqtt-packet';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const options = { protocolVersion: 4 as const };
const join = (...frames: Uint8Array[]) => Uint8Array.from(frames.flatMap(frame => Array.from(frame)));

it.each([0, 1, 2] as const)('waits for every byte of a fragmented UTF-8 PUBLISH at QoS %i', qos => {
  const frame = encode({ cmd: 'publish', topic: 'device/命令/😀', payload: new Uint8Array(150).fill(7),
    qos, messageId: qos ? 42 : undefined }, encoder, options);
  for (let end = 0; end < frame.length; end++) {
    expect(decode(frame.subarray(0, end), decoder, options)).toBeUndefined();
  }
  expect(decode(frame, decoder, options)).toMatchObject({ cmd: 'publish', topic: 'device/命令/😀', qos,
    payload: new Uint8Array(150).fill(7) });
});

it('isolates SUBACK return codes and PUBLISH payloads from coalesced following packets', () => {
  const suback = encode({cmd:'suback',messageId:42,granted:[0,128]},encoder,options);
  const publish = encode({cmd:'publish',topic:'cmd',qos:0,payload:encoder.encode('body')},encoder,options);
  const ping = encode({cmd:'pingresp'},encoder,options);
  const bytes = join(suback,publish,ping);
  const header = decodeHeader(bytes,options)!;
  expect(header.buffer.length).toBe(header.remainingLength);
  expect(decode(bytes,decoder,options)).toMatchObject({cmd:'suback',granted:[0,128]});
  expect(decode(bytes.subarray(header.packetLength),decoder,options)).toMatchObject({
    cmd:'publish',topic:'cmd',payload:encoder.encode('body')});
});

it('rejects an overflowing topic field even when the following packet has enough bytes', () => {
  const malformed = Uint8Array.from([0x30,2,0,5]);
  const following = encode({cmd:'publish',topic:'valid',qos:0,payload:encoder.encode('ok')},encoder,options);
  expect(()=>decode(join(malformed,following),decoder,options)).toThrow(/topic/i);
  expect(decode(following,decoder,options)).toMatchObject({topic:'valid',payload:encoder.encode('ok')});
});

it.each([{bytes:[0x80]},{bytes:[0x80,0x80]},{bytes:[0x80,0x80,0x80]}])('waits for an incomplete Remaining Length %j', ({bytes}) => {
  expect(decodeLength(Uint8Array.from(bytes),0)).toBeUndefined();
  expect(decodeHeader(Uint8Array.from([0x30,...bytes]),options)).toBeUndefined();
});

it('rejects a four-byte unterminated Remaining Length immediately', () => {
  expect(()=>decodeLength(Uint8Array.from([0x80,0x80,0x80,0x80]),0)).toThrow(/malformed/i);
  expect(()=>decodeHeader(Uint8Array.from([0x30,0x80,0x80,0x80,0x80]),options)).toThrow(/malformed/i);
});

it.each([
  [0x20,0],[0x20,1],[0x20,3], // CONNACK must contain two bytes.
  [0x40,0],[0x40,1],[0x40,3], // PUBACK must contain two bytes.
  [0xd0,1],                  // PINGRESP has no body.
  [0x90,0],[0x90,1],[0x90,2], // SUBACK needs identifier and at least one result.
])('rejects invalid body length: header=%i remaining=%i', (header,length) => {
  expect(()=>decode(Uint8Array.from([header,length,...new Array(length).fill(0),0xd0,0]),decoder,options)).toThrow();
});
