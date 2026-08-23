import { satisfies, validate } from 'compare-versions';

export function isAstylarVersion(version: string): boolean {
  return validate(version);
}

export function satisfiesAstylarVersion(version: string, range: string): boolean {
  return range.trim() === '*' || satisfies(version, range);
}

/** Validates the npm-style range subset implemented by compare-versions. */
export function isAstylarVersionRange(range: string): boolean {
  if (typeof range !== 'string' || range.trim().length === 0) return false;
  const normalized = range.trim().replace(/([><=~^]+)\s+/g, '$1');
  if (normalized === '*') return true;
  if (normalized.includes('||')) {
    return normalized.split('||').every((entry) => isAstylarVersionRange(entry));
  }
  if (normalized.includes(' - ')) {
    const parts = normalized.split(' - ');
    return parts.length === 2 && parts.every((entry) => validate(entry.trim()));
  }
  if (/\s/.test(normalized)) {
    return normalized.split(/\s+/).every((entry) => isAstylarVersionRange(entry));
  }
  const version = normalized.replace(/^[<>=~^]+/, '');
  if (!version || !validate(version)) return false;
  try {
    satisfies('0.0.0', normalized);
    return true;
  } catch {
    return false;
  }
}
