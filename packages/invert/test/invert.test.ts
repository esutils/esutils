import { invert } from '@esutils/invert';

describe('invert in typescript', () => {
  it('function type', () => {
    expect(typeof invert).toBe('function');
  });

  it('function call', async () => {
    const a = {
      'foo': 'bar',
      'xxx': 'yyy'
    } as const;

    const b = invert(a)
    expect(b).toEqual({
      'bar': 'foo',
      'yyy': 'xxx'
    } as const);
  });
});
