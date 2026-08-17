export function tokenizeGridTrackList(template: string | undefined): string[] {
  const source = template?.trim() ?? '';
  if (!source) return [];
  const tokens: string[] = [];
  let token = '';
  let depth = 0;
  for (const character of source) {
    if (/\s/.test(character) && depth === 0) {
      if (token) tokens.push(token);
      token = '';
      continue;
    }
    token += character;
    if (character === '(') depth++;
    if (character === ')') depth = Math.max(0, depth - 1);
  }
  if (token) tokens.push(token);
  return tokens;
}

function resolveDefiniteTrackLength(value: string, percentageReference: number): number {
  const parsed = value.trim().endsWith('%')
    ? percentageReference * Number.parseFloat(value) / 100
    : Number.parseFloat(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export function resolveGridTracks(
  template: string | undefined,
  availableSize: number,
  gap: number,
  fallbackCount: number,
): number[] {
  const tokens = tokenizeGridTrackList(template);
  const trackTokens = tokens.length ? tokens : Array.from({ length: fallbackCount }, () => '1fr');
  const trackSpace = Math.max(0, availableSize - Math.max(0, trackTokens.length - 1) * gap);
  let fixed = 0;

  const parsed = trackTokens.map((token) => {
    const minmax = /^minmax\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/i.exec(token);
    if (minmax) {
      const minimum = resolveDefiniteTrackLength(minmax[1], availableSize);
      const maximum = minmax[2].trim();
      if (maximum.endsWith('fr')) {
        const value = Number.parseFloat(maximum);
        const fraction = Number.isFinite(value) && value > 0 ? value : 1;
        return { type: 'fr' as const, value: fraction, minimum };
      }
      const maximumLength = resolveDefiniteTrackLength(maximum, availableSize);
      const pixels = Math.max(minimum, maximumLength);
      fixed += pixels;
      return { type: 'fixed' as const, value: pixels, minimum: 0 };
    }
    if (token.endsWith('fr')) {
      const value = Number.parseFloat(token);
      const fraction = Number.isFinite(value) && value > 0 ? value : 1;
      return { type: 'fr' as const, value: fraction, minimum: 0 };
    }
    const pixels = resolveDefiniteTrackLength(token, availableSize);
    fixed += pixels;
    return { type: 'fixed' as const, value: pixels, minimum: 0 };
  });

  let remaining = Math.max(0, trackSpace - fixed);
  const flexible = parsed
    .map((track, index) => ({ track, index }))
    .filter((entry) => entry.track.type === 'fr');
  const allocations = new Map<number, number>();
  let active = flexible;

  while (active.length > 0) {
    const fractionTotal = active.reduce((sum, entry) => sum + entry.track.value, 0);
    const constrained = active.filter((entry) =>
      remaining * entry.track.value / fractionTotal < entry.track.minimum,
    );
    if (constrained.length === 0) {
      active.forEach((entry) => allocations.set(
        entry.index,
        remaining * entry.track.value / fractionTotal,
      ));
      break;
    }
    constrained.forEach((entry) => {
      allocations.set(entry.index, entry.track.minimum);
      remaining = Math.max(0, remaining - entry.track.minimum);
    });
    const constrainedIndexes = new Set(constrained.map((entry) => entry.index));
    active = active.filter((entry) => !constrainedIndexes.has(entry.index));
  }

  return parsed.map((track, index) => track.type === 'fr'
    ? allocations.get(index) ?? track.minimum
    : track.value);
}

export function resolveIntrinsicGridRows(
  template: string | undefined,
  columnCount: number,
  itemOuterHeights: Array<number | null>,
): number[] | null {
  const explicitTokens = tokenizeGridTrackList(template);
  const requiredRows = Math.max(1, Math.ceil(itemOuterHeights.length / Math.max(1, columnCount)));
  const rowTokens = Array.from(
    { length: Math.max(requiredRows, explicitTokens.length) },
    (_, index) => explicitTokens[index] ?? 'auto',
  );
  if (rowTokens.some((token) => token !== 'auto' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(token))) {
    return null;
  }

  const rows = rowTokens.map((token) => token === 'auto'
    ? 0
    : Math.max(0, Number.parseFloat(token) || 0));
  for (let index = 0; index < itemOuterHeights.length; index++) {
    const row = Math.floor(index / Math.max(1, columnCount));
    if (rowTokens[row] !== 'auto') continue;
    const contribution = itemOuterHeights[index];
    if (contribution === null) return null;
    rows[row] = Math.max(rows[row], contribution);
  }
  return rows;
}
