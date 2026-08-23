import { MATERIAL_CATALOG, MATERIAL_FAMILIES } from './catalog';
import { MATERIAL_THEME_PROFILES, normalizeTheme } from './theme';

describe('material showcase catalog', () => {
  it('keeps all 36 family identities unique and measurable', () => {
    expect(MATERIAL_FAMILIES.length).toBe(36);
    expect(new Set(MATERIAL_FAMILIES).size).toBe(36);
    expect(MATERIAL_CATALOG.map((entry) => entry.id)).toEqual([...MATERIAL_FAMILIES]);
    expect(MATERIAL_CATALOG.every((entry) => entry.measurementIds.length >= 2)).toBeTrue();
    expect(MATERIAL_CATALOG.every((entry) => entry.interactions.length > 0)).toBeTrue();
    expect(MATERIAL_CATALOG.every((entry) => entry.expectedSemantics.rootRole === 'region')).toBeTrue();
  });

  it('normalizes free-form theme editor bounds', () => {
    expect(Object.keys(MATERIAL_THEME_PROFILES)).toEqual(['light', 'dark', 'contrast', 'custom']);
    expect(normalizeTheme({ ...MATERIAL_THEME_PROFILES.custom, density: 4, cornerScale: 9, typographyScale: .1 })).toEqual(jasmine.objectContaining({
      density: 0, cornerScale: 1.5, typographyScale: .85,
    }));
  });
});
