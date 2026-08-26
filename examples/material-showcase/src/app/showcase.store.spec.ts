import { TestBed } from '@angular/core/testing';
import { DEFAULT_SHOWCASE_STATE, ShowcaseStore, normalizeShowcaseState } from './showcase.store';
import { MATERIAL_THEME_PROFILES, contrastRatio } from './theme';

describe('ShowcaseStore', () => {
  it('normalizes shared component state and keeps paired slider thumbs ordered', () => {
    const state = normalizeShowcaseState({
      ...DEFAULT_SHOWCASE_STATE,
      sliderValue: 42,
      sliderStart: 93,
      pageIndex: Number.NaN,
      chips: ['Angular', 'Angular', '', 'Astylar'],
    });

    expect(state.sliderValue).toBe(40);
    expect(state.sliderStart).toBe(40);
    expect(state.pageIndex).toBe(0);
    expect(state.chips).toEqual(['Angular', 'Astylar']);
    expect(state.chipSelections).toEqual([true, true]);
  });

  it('tracks chip selections independently while shared selected state resets all chips', () => {
    const store = TestBed.inject(ShowcaseStore);

    store.patchState({ chipSelections: [false, true] });
    expect(store.state().chipSelections).toEqual([false, true]);

    store.patchState({ selected: false });
    expect(store.state().chipSelections).toEqual([false, false]);
  });

  it('resets theme, state, and benchmark phase together', () => {
    const store = TestBed.inject(ShowcaseStore);
    store.setTheme(MATERIAL_THEME_PROFILES.dark);
    store.patchState({ open: true });
    store.setBenchmarkPhase('held');

    store.reset();

    expect(store.theme()).toEqual(MATERIAL_THEME_PROFILES.light);
    expect(store.state()).toEqual(DEFAULT_SHOWCASE_STATE);
    expect(store.benchmarkPhase()).toBe('settled');
  });

  it('resolves profile foregrounds with WCAG contrast', () => {
    for (const profile of Object.values(MATERIAL_THEME_PROFILES)) {
      const store = TestBed.inject(ShowcaseStore);
      store.setTheme(profile);
      const tokens = store.tokens();
      expect(contrastRatio(tokens.primary, tokens.onPrimary)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tokens.surface, tokens.onSurface)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
