import { encode, decode } from '@esutils/mqtt-packet';

const utf8Decoder = new TextDecoder();

console.log(
  decode(
    encode({
      cmd: 'disconnect',
    }),
    utf8Decoder,
  ),
);
