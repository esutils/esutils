import { hello } from '@esutils/dns-packet';

describe('dns-packet in typescript', () => {
  it('test hello', () => {
    expect(`${hello()}, the world`).toEqual('Hello, the world');
  });
});
