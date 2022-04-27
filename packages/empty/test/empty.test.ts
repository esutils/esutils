import { hello } from '@esutils/empty';

describe('empty in typescript', () => {
  it('test hello', () => {
    expect(`${hello()}, the world`).toEqual('Hello, the world');
  });
});
