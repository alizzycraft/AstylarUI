import {
  isAstylarVersion,
  isAstylarVersionRange,
  satisfiesAstylarVersion,
} from './astylar-semver';

describe('Astylar semantic versions', () => {
  it('validates versions and npm-style range forms used by public contracts', () => {
    expect(isAstylarVersion('1.2.3')).toBeTrue();
    expect(isAstylarVersion('latest')).toBeFalse();
    expect(isAstylarVersionRange('*')).toBeTrue();
    expect(isAstylarVersionRange('^1.2.0')).toBeTrue();
    expect(isAstylarVersionRange('>=1.0.0 <2.0.0')).toBeTrue();
    expect(isAstylarVersionRange('1.2.3 - 2.0.0')).toBeTrue();
    expect(isAstylarVersionRange('1.2.3 || >=2.0.0 <3.0.0')).toBeTrue();
    expect(isAstylarVersionRange('>=0.0.0 || not-a-range')).toBeFalse();
  });

  it('supports unrestricted, comparator, caret, tilde, and disjoint matching', () => {
    expect(satisfiesAstylarVersion('99.0.0', '*')).toBeTrue();
    expect(satisfiesAstylarVersion('1.5.0', '^1.2.0')).toBeTrue();
    expect(satisfiesAstylarVersion('2.0.0', '^1.2.0')).toBeFalse();
    expect(satisfiesAstylarVersion('1.2.9', '~1.2.0')).toBeTrue();
    expect(satisfiesAstylarVersion('1.3.0', '~1.2.0')).toBeFalse();
    expect(satisfiesAstylarVersion('2.4.0', '<2.0.0 || >=2.3.0 <3.0.0')).toBeTrue();
  });
});
