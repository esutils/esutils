const { AsyncSemaphore } = require('@esutils/async-semaphore');

describe('AsyncSemaphore in javascript cjs', () => {
  it('constructor type', () => {
    expect(typeof AsyncSemaphore).toBe('function');
  });

  it('constructor instance', () => {
    expect(new AsyncSemaphore(1)).toBeInstanceOf(AsyncSemaphore);
  });
});
