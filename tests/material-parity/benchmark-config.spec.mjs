import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { materialAbsoluteTextAlignmentTargets, materialComparisonViewport, materialFamilies, materialFocusedRasterTargets, materialInteractionCases, materialInteractionViewports, materialMobileFlowCases, materialMobileFlowFamilies, materialProfiles, materialStaticCases, materialSupplementalStaticCases, materialTextAlignmentTargets, materialTextAuditTargets, materialTextlessFamilies, materialTextOnlyTargets, materialThresholds, materialUniformBackgroundTargets, materialViewports } from './benchmark.config.mjs';

test('covers every installed Angular Material component entry point', () => {
  const packageJson = JSON.parse(readFileSync(path.resolve('node_modules/@angular/material/package.json'), 'utf8'));
  const installed = Object.keys(packageJson.exports)
    .filter((entry) => /^\.\/[a-z][a-z-]*$/.test(entry) && !entry.includes('theming'))
    .map((entry) => entry.slice(2)).sort();
  assert.deepEqual([...materialFamilies].sort(), installed);
  assert.equal(materialFamilies.length, 36);
});

test('keeps the app catalog and enforced static matrix complete', () => {
  const catalogSource = readFileSync(path.resolve('examples/material-showcase/src/app/catalog.ts'), 'utf8');
  for (const family of materialFamilies) assert.match(catalogSource, new RegExp(`['"]${family}['"]`));
  assert.equal(materialStaticCases.length,
    materialFamilies.length * materialProfiles.length * materialViewports.length + materialSupplementalStaticCases.length);
  assert.equal(materialSupplementalStaticCases.length, materialProfiles.length);
  assert.ok(materialSupplementalStaticCases.every(({ family, viewport }) =>
    family === 'divider' && viewport === materialComparisonViewport));
  assert.deepEqual(materialThresholds, {
    edgeTolerancePx: 2,
    maximumEdgeErrorPx: 5,
    minimumEdgesWithinTolerance: .95,
    resultSsim: .95,
    aggregateMedianSsim: .98,
    maximumTextCenterOffsetErrorPx: .75,
  });
  assert.deepEqual(materialTextAlignmentTargets.button,
    ['button-primary', 'button-secondary', 'button-disabled']);
  assert.ok(Object.keys(materialTextAlignmentTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialFamilies.filter((family) => !(family in materialTextAuditTargets)), materialTextlessFamilies);
  const enforcedTextTargets = new Set(Object.values(materialTextAlignmentTargets).flat());
  assert.ok(materialAbsoluteTextAlignmentTargets.every((target) => enforcedTextTargets.has(target)));
  assert.ok(materialTextOnlyTargets.every((target) => enforcedTextTargets.has(target)));
  assert.ok(Object.keys(materialUniformBackgroundTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialFocusedRasterTargets.sort,
    { element: 'sort-primary', padding: 8, minimumSsim: .80 });
  assert.deepEqual(Object.keys(materialFocusedRasterTargets).sort(),
    ['button-toggle', 'checkbox', 'chips', 'form-field', 'icon', 'paginator', 'sort', 'table']);
  assert.ok(Object.keys(materialFocusedRasterTargets).every((family) => materialFamilies.includes(family)));
  assert.equal(materialInteractionViewports.length, 2);
  for (const family of materialFamilies) {
    for (const profile of materialProfiles) {
      for (const viewport of materialInteractionViewports) {
        assert.ok(materialInteractionCases.some((entry) => entry.family === family && entry.profile === profile && entry.viewport.id === viewport.id));
        if (!['divider', 'icon', 'progress-bar', 'progress-spinner'].includes(family)) {
          assert.ok(materialInteractionCases.some((entry) => entry.family === family && entry.profile === profile &&
            entry.viewport.id === viewport.id && entry.state === 'activate-leave'));
        }
      }
    }
  }
  assert.equal(materialMobileFlowCases.length, materialMobileFlowFamilies.length * 2);
});
