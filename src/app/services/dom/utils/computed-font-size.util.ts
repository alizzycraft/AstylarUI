const NAMED_ABSOLUTE_SIZES: Record<string, number> = {
  'xx-small': 9,
  'x-small': 10,
  small: 13,
  medium: 16,
  large: 18,
  'x-large': 24,
  'xx-large': 32,
};

/** Resolve a cascaded font-size to its computed pixel value. */
export function resolveComputedFontSize(
  value: string | undefined,
  inheritedValue = '16px',
): string {
  const inheritedPixels = absolutePixels(inheritedValue, 16);
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return asPixels(inheritedPixels);

  if (normalized === 'smaller') return asPixels(inheritedPixels * 0.83);
  if (normalized === 'larger') return asPixels(inheritedPixels * 1.2);
  if (normalized in NAMED_ABSOLUTE_SIZES) return asPixels(NAMED_ABSOLUTE_SIZES[normalized]);

  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return asPixels(inheritedPixels);
  if (normalized.endsWith('rem')) return asPixels(numeric * 16);
  if (normalized.endsWith('em')) return asPixels(numeric * inheritedPixels);
  if (normalized.endsWith('%')) return asPixels(numeric * inheritedPixels / 100);
  return asPixels(Math.max(1, numeric));
}

function asPixels(value: number): string {
  return `${Math.round(value * 1_000_000) / 1_000_000}px`;
}

function absolutePixels(value: string, fallback: number): number {
  const normalized = value.trim().toLowerCase();
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return fallback;
  if (normalized.endsWith('rem')) return numeric * 16;
  if (normalized.endsWith('%')) return numeric * fallback / 100;
  if (normalized.endsWith('em')) return numeric * fallback;
  return Math.max(1, numeric);
}
