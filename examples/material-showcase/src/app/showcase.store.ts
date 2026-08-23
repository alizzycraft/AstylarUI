import { Injectable, computed, signal } from '@angular/core';
import { MATERIAL_FAMILIES, MaterialFamily } from './catalog';
import { MATERIAL_THEME_PROFILES, MaterialThemeConfig, normalizeTheme, resolveTheme } from './theme';

export interface ShowcaseState {
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly error: boolean;
  readonly open: boolean;
  readonly sliderValue: number;
  readonly sliderStart: number;
  readonly pageIndex: number;
  readonly sortDirection: 'asc' | 'desc';
  readonly chips: readonly string[];
}

export type BenchmarkPhase = 'start' | 'held' | 'settled';

export const DEFAULT_SHOWCASE_STATE: ShowcaseState = Object.freeze({
  disabled: false,
  selected: true,
  error: false,
  open: false,
  sliderValue: 65,
  sliderStart: 30,
  pageIndex: 0,
  sortDirection: 'asc',
  chips: ['Angular', 'Astylar'],
});

@Injectable({ providedIn: 'root' })
export class ShowcaseStore {
  readonly family = signal<MaterialFamily>('button');
  readonly theme = signal<MaterialThemeConfig>(MATERIAL_THEME_PROFILES.light);
  readonly tokens = computed(() => resolveTheme(this.theme()));
  readonly state = signal<ShowcaseState>(DEFAULT_SHOWCASE_STATE);
  readonly benchmarkPhase = signal<BenchmarkPhase>('settled');
  readonly revision = signal(0);
  readonly familyIndex = computed(() => MATERIAL_FAMILIES.indexOf(this.family()));

  constructor() {
    if (typeof window === 'undefined') return;
    const parameters = new URLSearchParams(window.location.search);
    const profile = parameters.get('profile');
    if (parameters.get('benchmark') === '1' && profile && profile in MATERIAL_THEME_PROFILES) {
      this.theme.set(MATERIAL_THEME_PROFILES[profile as keyof typeof MATERIAL_THEME_PROFILES]);
    }
    const interaction = parameters.get('interaction');
    if (parameters.get('benchmark') === '1' && interaction === 'disabled') {
      this.state.set(Object.freeze({ ...DEFAULT_SHOWCASE_STATE, disabled: true }));
    } else if (parameters.get('benchmark') === '1' && interaction === 'error') {
      this.state.set(Object.freeze({ ...DEFAULT_SHOWCASE_STATE, error: true }));
    }
  }

  selectFamily(family: MaterialFamily): void { this.family.set(family); }
  setTheme(theme: MaterialThemeConfig): void { this.theme.set(normalizeTheme(theme)); }
  setState(state: ShowcaseState): void { this.state.set(normalizeShowcaseState(state)); }
  patchState(patch: Partial<ShowcaseState>): void { this.setState({ ...this.state(), ...patch }); }
  setBenchmarkPhase(phase: BenchmarkPhase): void { this.benchmarkPhase.set(phase); }
  reset(): void { this.theme.set(MATERIAL_THEME_PROFILES.light); this.state.set(DEFAULT_SHOWCASE_STATE); this.benchmarkPhase.set('settled'); this.revision.update((value) => value + 1); }
}

export function normalizeShowcaseState(state: ShowcaseState): ShowcaseState {
  const sliderValue = normalizeStepValue(state.sliderValue, DEFAULT_SHOWCASE_STATE.sliderValue);
  const sliderStart = Math.min(sliderValue, normalizeStepValue(state.sliderStart, DEFAULT_SHOWCASE_STATE.sliderStart));
  return Object.freeze({
    disabled: state.disabled === true,
    selected: state.selected !== false,
    error: state.error === true,
    open: state.open === true,
    sliderValue,
    sliderStart,
    pageIndex: normalizeInteger(state.pageIndex, DEFAULT_SHOWCASE_STATE.pageIndex, 0, 9),
    sortDirection: state.sortDirection === 'desc' ? 'desc' : 'asc',
    chips: [...new Set((state.chips ?? []).map(String).filter(Boolean))],
  });
}

function normalizeStepValue(value: unknown, fallback: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(100, Math.round(numeric / 5) * 5)) : fallback;
}

function normalizeInteger(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(minimum, Math.min(maximum, Math.round(numeric))) : fallback;
}
