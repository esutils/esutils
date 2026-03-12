const { delay } = require('@esutils/delay');

describe('delay in javascript cjs', () => {
  it('function type', () => {
    expect(typeof delay).toBe('function');
  });
});
