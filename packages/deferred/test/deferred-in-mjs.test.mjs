import { Deferred } from '@esutils/deferred';

describe('Deferred in javascript', () => {
  it('constructor type', () => {
    expect(typeof Deferred).toBe('function');
  });

  it('constructor instance', () => {
    expect(new Deferred()).toBeInstanceOf(Deferred);
  });
});
