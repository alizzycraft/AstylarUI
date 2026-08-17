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
  return tokens.flatMap((trackToken) => expandFixedRepeatToken(trackToken));
}

function expandFixedRepeatToken(token: string): string[] {
  if (!/^repeat\(/i.test(token) || !token.endsWith(')')) return [token];
  const body = token.slice(token.indexOf('(') + 1, -1);
  let depth = 0;
  let separator = -1;
  for (let index = 0; index < body.length; index++) {
    const character = body[index];
    if (character === '(') depth++;
    if (character === ')') depth = Math.max(0, depth - 1);
    if (character === ',' && depth === 0) {
      separator = index;
      break;
    }
  }
  if (separator < 0) return [token];

  const countSource = body.slice(0, separator).trim();
  if (!/^\d+$/.test(countSource)) return [token];
  const count = Number.parseInt(countSource, 10);
  const repeatedTracks = tokenizeGridTrackList(body.slice(separator + 1));
  if (count < 1 || repeatedTracks.length === 0) return [token];
  return Array.from({ length: count }, () => repeatedTracks).flat();
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
  const unsupportedRepeat = tokens.find((token) => /^repeat\(/i.test(token));
  if (unsupportedRepeat) {
    throw new Error(
      `Unsupported Grid repeat() count in "${unsupportedRepeat}"; only positive fixed counts are supported.`,
    );
  }
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
  sizeIndefiniteFlexibleTracks = false,
): number[] | null {
  const explicitTokens = tokenizeGridTrackList(template);
  const requiredRows = Math.max(1, Math.ceil(itemOuterHeights.length / Math.max(1, columnCount)));
  const rowTokens = Array.from(
    { length: Math.max(requiredRows, explicitTokens.length) },
    (_, index) => explicitTokens[index] ?? 'auto',
  );
  const isIntrinsicTrack = (token: string) =>
    ['auto', 'min-content', 'max-content'].includes(token.toLowerCase());
  const flexFactor = (token: string): number | null => {
    if (!token.toLowerCase().endsWith('fr')) return null;
    const parsed = Number.parseFloat(token);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  };
  if (rowTokens.some((token) =>
    !isIntrinsicTrack(token) &&
    !(sizeIndefiniteFlexibleTracks && flexFactor(token) !== null) &&
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:px)?$/i.test(token),
  )) {
    return null;
  }

  const rows = rowTokens.map((token) => isIntrinsicTrack(token) || flexFactor(token) !== null
    ? 0
    : Math.max(0, Number.parseFloat(token) || 0));
  for (let index = 0; index < itemOuterHeights.length; index++) {
    const row = Math.floor(index / Math.max(1, columnCount));
    if (!isIntrinsicTrack(rowTokens[row]) && flexFactor(rowTokens[row]) === null) continue;
    const contribution = itemOuterHeights[index];
    if (contribution === null) return null;
    rows[row] = Math.max(rows[row], contribution);
  }

  const flexibleRows = rowTokens
    .map((token, index) => ({ factor: flexFactor(token), index }))
    .filter((entry): entry is { factor: number; index: number } => entry.factor !== null);
  if (flexibleRows.length > 0) {
    const flexFraction = Math.max(...flexibleRows.map(({ factor, index }) =>
      factor > 1 ? rows[index] / factor : rows[index],
    ));
    flexibleRows.forEach(({ factor, index }) => {
      rows[index] = Math.max(rows[index], flexFraction * factor);
    });
  }
  return rows;
}
