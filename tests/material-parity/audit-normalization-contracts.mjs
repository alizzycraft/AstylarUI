import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

export const preciseAuditNormalization = Object.freeze({
  module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: Object.freeze(['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber']),
  sha256: '27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773',
});

export function bindPreciseAuditNormalization(source = readFileSync(preciseAuditNormalization.module, 'utf8')) {
  return bindOwnerCaretNormalization(source, preciseAuditNormalization);
}

// Only for replaying an explicitly pinned historical proof. Never substitute
// this function's rounded values for live audit classification values.
export function bindHistoricalAuditNormalization(descriptor, revision) {
  assert.equal(descriptor.module, preciseAuditNormalization.module);
  assert.match(revision, /^[a-f0-9]{7,40}$/);
  const source = execFileSync('git', ['show', `${revision}:${descriptor.module}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  return bindOwnerCaretNormalization(source, descriptor);
}
