import { delay } from '@esutils/delay';

describe('delay in typescript', () => {
  it('function type', () => {
    expect(typeof delay).toBe('function');
  });

  it('function call', async () => {
    await delay(10);
  });
});
