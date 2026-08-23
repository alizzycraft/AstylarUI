import { resolveComputedFontSize } from './computed-font-size.util';

describe('resolveComputedFontSize', () => {
  it('resolves em and percentage sizes against the inherited computed size', () => {
    expect(resolveComputedFontSize('0.83em', '14px')).toBe('11.62px');
    expect(resolveComputedFontSize('125%', '12px')).toBe('15px');
  });

  it('keeps rem and absolute named sizes independent of the parent', () => {
    expect(resolveComputedFontSize('1.5rem', '10px')).toBe('24px');
    expect(resolveComputedFontSize('small', '24px')).toBe('13px');
  });

  it('computes relative keywords from the inherited size', () => {
    expect(resolveComputedFontSize('smaller', '20px')).toBe('16.6px');
    expect(resolveComputedFontSize('larger', '10px')).toBe('12px');
  });
});
