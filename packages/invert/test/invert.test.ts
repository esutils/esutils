import { invert, invertValues } from '@esutils/invert';

describe('invert in typescript', () => {
  it('function type', () => {
    expect(typeof invert).toBe('function');
  });

  it('function call', () => {
    const a = {
      'foo': 'bar',
      'xxx': 'yyy'
    } as const;

    const b = invert(a)
    expect(b).toEqual({
      'bar': 'foo',
      'yyy': 'xxx'
    } as const);

    const c = invertValues(a)
    expect(c).toEqual(['bar', 'yyy'] as const);
  });
});
