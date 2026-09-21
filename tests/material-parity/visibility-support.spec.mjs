import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectVisibilitySupport } from '../../scripts/audit-material-visibility-support.mjs';

test('public package rejects visibility while accepting a supported property with fully resolved types', () => {
  const report = collectVisibilitySupport();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-visibility-support.json')));
  assert.equal(report.unsupported.resolvedStylePropertyCount, 87);
  assert.equal(report.control.resolvedStylePropertyCount, 87);
  assert.deepEqual(report.unsupported.diagnostics.map(d => d.code), [2353]);
  assert.deepEqual(report.control.diagnostics, []);
  assert.equal(report.packedAndCurrentStyleInterfacesEqual, true);
  assert.equal(report.renderingTested, false);
  assert.equal(report.missingSnackbarCauseProven, false);
  assert.equal(report.canonicalAttributionChanged, false);
});
