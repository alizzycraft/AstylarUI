export interface MaterialThemeConfig {
  readonly mode: 'light' | 'dark';
  readonly primary: string;
  readonly tertiary: string;
  readonly surface: string;
  readonly error: string;
  readonly density: number;
  readonly cornerScale: number;
  readonly typographyScale: number;
}

export interface ResolvedMaterialTheme extends MaterialThemeConfig {
  readonly onPrimary: string;
  readonly onTertiary: string;
  readonly onSurface: string;
  readonly onError: string;
  readonly surfaceContainer: string;
}

export const MATERIAL_THEME_PROFILES = Object.freeze({
  light: { mode: 'light', primary: '#6750a4', tertiary: '#7d5260', surface: '#fffbfe', error: '#b3261e', density: 0, cornerScale: 1, typographyScale: 1 },
  dark: { mode: 'dark', primary: '#d0bcff', tertiary: '#efb8c8', surface: '#1c1b1f', error: '#f2b8b5', density: 0, cornerScale: 1, typographyScale: 1 },
  contrast: { mode: 'light', primary: '#000000', tertiary: '#203864', surface: '#ffffff', error: '#8b0000', density: -5, cornerScale: .75, typographyScale: .9 },
  custom: { mode: 'light', primary: '#006a6a', tertiary: '#a43c42', surface: '#f4fbfa', error: '#ba1a1a', density: -2, cornerScale: 1.5, typographyScale: 1.15 },
} satisfies Record<string, MaterialThemeConfig>);

export function normalizeTheme(config: MaterialThemeConfig): MaterialThemeConfig {
  const color = (value: string, fallback: string) => /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
  return Object.freeze({
    mode: config.mode === 'dark' ? 'dark' : 'light',
    primary: color(config.primary, '#6750a4'),
    tertiary: color(config.tertiary, '#7d5260'),
    surface: color(config.surface, '#fffbfe'),
    error: color(config.error, '#b3261e'),
    density: Math.max(-5, Math.min(0, Math.round(config.density))),
    cornerScale: Math.max(.5, Math.min(1.5, config.cornerScale)),
    typographyScale: Math.max(.85, Math.min(1.25, config.typographyScale)),
  });
}

export function resolveTheme(config: MaterialThemeConfig): ResolvedMaterialTheme {
  const normalized = normalizeTheme(config);
  return Object.freeze({
    ...normalized,
    onPrimary: contrastingText(normalized.primary),
    onTertiary: contrastingText(normalized.tertiary),
    onSurface: normalized.mode === 'dark' ? '#e6e1e5' : '#1d1b20',
    onError: contrastingText(normalized.error),
    surfaceContainer: mixHex(normalized.surface, normalized.primary, .06),
  });
}

export function mixHex(background: string, foreground: string, foregroundAmount: number): string {
  const amount = Math.max(0, Math.min(1, foregroundAmount));
  const channel = (index: number) => Math.round(
    Number.parseInt(background.slice(index, index + 2), 16) * (1 - amount) +
    Number.parseInt(foreground.slice(index, index + 2), 16) * amount,
  ).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}

export function contrastRatio(first: string, second: string): number {
  const light = Math.max(relativeLuminance(first), relativeLuminance(second));
  const dark = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (light + .05) / (dark + .05);
}

function contrastingText(background: string): '#000000' | '#ffffff' {
  return contrastRatio(background, '#000000') >= contrastRatio(background, '#ffffff') ? '#000000' : '#ffffff';
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}
