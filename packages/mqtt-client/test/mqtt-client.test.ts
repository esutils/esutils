import { BaseClient } from '@esutils/mqtt-client';

describe('mqtt client in typescript', () => {
  it('test hello', () => {
    expect(typeof BaseClient).toEqual('function');
  });
});
