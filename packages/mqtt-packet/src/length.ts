export function encodeLength(len: number) {
  const output = [];

  let x = len;
  do {
    let encodedByte = x % 128;

    x = Math.floor(x / 128);

    if (x > 0) {
      encodedByte |= 128;
    }

    output.push(encodedByte);
  } while (x > 0);

  return output;
}

export function decodeLength(buffer: Uint8Array, startIndex: number) {
  let i = startIndex;
  let encodedByte = 0;
  let value = 0;
  let multiplier = 1;

  do {
    encodedByte = buffer[i];
    i += 1;

    value += (encodedByte & 127) * multiplier;

    if (multiplier > 128 * 128 * 128) {
      throw Error('malformed length');
    }

    multiplier *= 128;
  } while ((encodedByte & 128) !== 0);

  return { length: value, bytesUsedToEncodeLength: i - startIndex };
}
