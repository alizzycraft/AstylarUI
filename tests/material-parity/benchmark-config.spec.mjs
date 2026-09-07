import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { materialAbsoluteTextAlignmentTargets, materialComparisonViewport, materialFamilies, materialFocusedRasterTargets, materialInteractionCases, materialInteractionFocusedRasterTargets, materialInteractionTextAlignmentTargets, materialInteractionViewports, materialMobileFlowCases, materialMobileFlowFamilies, materialProfiles, materialStaticCases, materialSupplementalStaticCases, materialTextAlignmentTargets, materialTextAlignmentToleranceOverrides, materialTextAuditTargets, materialTextlessFamilies, materialTextOnlyTargets, materialThresholds, materialUniformBackgroundTargets, materialViewports } from './benchmark.config.mjs';

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
  const enforcedTextTargets = new Set([
    ...Object.values(materialTextAlignmentTargets).flat(),
    ...Object.values(materialInteractionTextAlignmentTargets).flat(),
  ]);
  assert.ok(materialAbsoluteTextAlignmentTargets.every((target) => enforcedTextTargets.has(target)));
  assert.deepEqual(materialTextAlignmentToleranceOverrides,
    { 'tab-overview': 1.25, 'tab-activity': 1.25, 'button-toggle-one': 1 });
  assert.ok(Object.keys(materialTextAlignmentToleranceOverrides).every((target) => enforcedTextTargets.has(target)));
  assert.ok(materialTextOnlyTargets.every((target) => enforcedTextTargets.has(target)));
  assert.ok(Object.keys(materialUniformBackgroundTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialFocusedRasterTargets.sort,
    { element: 'sort-primary', padding: 8, minimumSsim: .80 });
  assert.deepEqual(Object.keys(materialFocusedRasterTargets).sort(),
    ['button-toggle', 'checkbox', 'chips', 'form-field', 'icon', 'paginator', 'sort', 'stepper', 'table', 'tabs']);
  assert.ok(Object.keys(materialFocusedRasterTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialInteractionFocusedRasterTargets.expansion,
    { element: 'expansion-root', padding: 8, minimumSsim: .90 });
  assert.deepEqual(materialInteractionFocusedRasterTargets.datepicker,
    { element: 'datepicker-primary', padding: 8, paddingBottom: 370, minimumSsim: .86 });
  assert.deepEqual(materialInteractionFocusedRasterTargets.chips,
    { element: 'chips-primary', padding: 8, minimumSsim: .70, states: ['activate', 'activate-alternate', 'activate-leave'] });
  assert.deepEqual(Object.keys(materialInteractionFocusedRasterTargets).sort(),
    ['autocomplete', 'bottom-sheet', 'button-toggle', 'chips', 'datepicker', 'dialog', 'expansion', 'form-field', 'input', 'menu', 'select', 'slide-toggle', 'slider', 'sort', 'stepper', 'tabs', 'timepicker', 'tooltip']);
  assert.deepEqual(materialInteractionFocusedRasterTargets['bottom-sheet'],
    { element: 'bottom-sheet-panel', padding: 0, minimumSsim: .975,
      states: ['activate', 'activate-leave', 'open'], viewports: ['comparison-pane-dpr1'] });
  assert.deepEqual(materialInteractionFocusedRasterTargets.dialog,
    { element: 'dialog-panel', padding: 8, minimumSsim: .85, states: ['open', 'open-hover-content'] });
  assert.deepEqual(materialInteractionFocusedRasterTargets.tooltip,
    { element: 'tooltip-popup', padding: 4, minimumSsim: .70, states: ['hover', 'held'] });
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'chips' && state === 'activate-alternate'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'autocomplete' && state === 'open-commit-reopen'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'select' && state === 'open-commit-reopen'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'form-field' && state === 'edit-empty-blur'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'input' && state === 'edit-empty-blur'));
  assert.ok(materialInteractionCases.some(({ family, profile, viewport, state }) =>
    family === 'bottom-sheet' && profile === 'light' && viewport.id === 'comparison-pane-dpr1' &&
    viewport.width === 900 && state === 'activate'));
  for (const state of ['drag-start', 'drag-end']) {
    assert.ok(materialInteractionCases.some((candidate) =>
      candidate.family === 'slider' && candidate.profile === 'light' &&
      candidate.viewport.id === 'comparison' && candidate.viewport.width === 609 &&
      candidate.state === state));
  }
  for (const [family, states] of [['snack-bar', ['activate', 'activate-twice']], ['tooltip', ['hover', 'held']]]) {
    for (const state of states) {
      assert.ok(materialInteractionCases.some((candidate) =>
        candidate.family === family && candidate.profile === 'light' &&
        candidate.viewport.id === 'comparison' && candidate.viewport.width === 609 &&
        candidate.state === state));
    }
  }
  for (const family of ['autocomplete', 'datepicker', 'timepicker', 'menu', 'dialog']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === family && candidate.state === 'open-dismiss-outside'));
  }
  for (const family of ['autocomplete', 'datepicker', 'timepicker', 'menu']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === family && candidate.state === 'open-dismiss-canvas'));
  }
  for (const family of ['autocomplete', 'select', 'datepicker', 'timepicker', 'menu', 'dialog']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === family && candidate.state === 'open-hover-content'));
  }
  assert.ok(materialInteractionCases.some((candidate) => candidate.family === 'datepicker' && candidate.state === 'open-secondary'));
  assert.ok(materialInteractionCases.some((candidate) => candidate.family === 'snack-bar' && candidate.state === 'auto-dismiss'));
  for (const state of ['drag-start', 'drag-end']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === 'slider' && candidate.state === state));
  }
  assert.deepEqual(materialInteractionFocusedRasterTargets.slider.states, ['hover', 'held']);
  assert.ok(Object.keys(materialInteractionFocusedRasterTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialInteractionTextAlignmentTargets.chips, ['chip-0', 'chip-1']);
  assert.deepEqual(materialInteractionTextAlignmentTargets.dialog,
    ['dialog-title', 'dialog-copy', 'dialog-cancel', 'dialog-save']);
  assert.deepEqual(materialInteractionTextAlignmentTargets.expansion, ['expansion-content']);
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
