import { invert } from '@esutils/invert';

const a = {
  'foo': 'bar',
  'xxx': 'yyy'
} as const;

const b = invert(a)

console.log(b)
