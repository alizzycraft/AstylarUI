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
