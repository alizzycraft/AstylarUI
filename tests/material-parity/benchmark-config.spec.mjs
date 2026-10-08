import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { materialCaseKey } from './run-checkpoint.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { materialAbsoluteTextAlignmentTargets, materialAdditionalMeasurementTargets, materialComparisonViewport, materialFamilies, materialFocusedRasterTargets, materialGeometryExcludedTargets, materialInteractionCases, materialInteractionFocusedRasterTargets, materialInteractionTextAlignmentTargets, materialInteractionViewports, materialLeftAlignedTextTargets, materialMobileFlowCases, materialMobileFlowFamilies, materialProfiles, materialSemanticExcludedTargets, materialStaticCases, materialSupplementalStaticCases, materialTextAlignmentTargets, materialTextAlignmentToleranceOverrides, materialTextAuditTargets, materialTextlessFamilies, materialTextOnlyTargets, materialThresholds, materialUniformBackgroundTargets, materialViewports } from './benchmark.config.mjs';

test('configured input focus evidence records exact controls without replacing reference actions', t => {
  const file = 'artifacts/material-parity/configured-input-focus-20261008/latest-report.json';
  const capture = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(capture.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(capture, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  const hash = b => createHash('sha256').update(b).digest('hex');
  const runner = readFileSync(capture.actionSource.file);
  assert.equal(hash(runner), capture.actionSource.sha256);
  assert.equal(hash(runner), manifest.provenance.harnessFiles.find(r => r.file === capture.actionSource.file).sha256);
  const configFile = 'tests/material-parity/benchmark.config.mjs';
  assert.equal(hash(readFileSync(configFile)), manifest.provenance.harnessFiles.find(r => r.file === configFile).sha256);
  const ast = ts.createSourceFile('runner.mjs', runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const fn = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const block = fn('performInteraction').body.statements.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === "state === 'focus'");
  assert.equal(hash(block.thenStatement.getText(ast).slice(1, -1)), capture.actionSource.focusBodySha256);
  assert.equal(hash(fn('profileTheme').body.getText(ast)), capture.actionSource.themeBodySha256);
  const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
  const cases = materialInteractionCases.filter(c => families.includes(c.family) && c.state === 'focus');
  assert.equal(cases.length, 40); assert.equal(capture.results.length, 240);
  assert.deepEqual([...new Set(capture.results.map(r => r.caseId))].sort(), cases.map(c => materialCaseKey('interaction', c)).sort());
  const paintObservations = [];
  for (const c of cases) {
    const rows = capture.results.filter(r => r.caseId === materialCaseKey('interaction', c));
    assert.deepEqual(rows.map(r => r.sample), [0, 1, 2, 3, 4, 5]);
    for (const row of rows) {
      assert.equal(row.family, c.family); assert.equal(row.profile, c.profile); assert.deepEqual(row.viewport, c.viewport);
      assert.equal(row.action, row.sample ? 'wait 125ms' : 'original configured focus action');
      for (const side of ['reference', 'astylar']) {
        const observation = row[side].observation, control = observation.control;
        const tree = JSON.parse(readFileSync(row[side].inputTree.file));
        const id = `${c.family}-control`;
        const input = tree.nodes.find(node => side === 'reference' ? node.attributes?.id === id : node.authored?.id === id);
        assert.ok(input, 'Exact observed input must own the retained style evidence');
        if (side === 'reference') {
          const colors = { light: 'rgb(103, 80, 164)', dark: 'rgb(208, 188, 255)', contrast: 'rgb(0, 0, 0)', custom: 'rgb(0, 106, 106)' };
          assert.equal(tree.styles[input.style].caretColor, colors[c.profile]);
          assert.ok(input.rules.map(index => tree.rules[index]).some(rule =>
            rule.declarations?.['caret-color']?.value === 'var(--mat-form-field-filled-caret-color, var(--mat-sys-primary))'));
        } else {
          assert.equal(input.resolvedStyle.caretColor, undefined, 'Preserve omitted candidate caret intent, not an assumed equivalent default');
          assert.equal(input.resolvedStyle.color, '#1d1b20');
        }
        assert.equal(control.type, c.family === 'input' ? 'email' : 'text');
        assert.equal(control.value, c.family === 'form-field' ? 'Atlas' : c.family === 'input' ? 'team@example.com' : '');
        assert.equal(typeof control.focused, 'boolean');
        if (side === 'reference') assert.equal(control.id, `${c.family}-control`);
        else assert.equal(control.astylarId, `${c.family}-control`);
        if (c.family === 'input') {
          assert.equal(control.selectionStart, null); assert.equal(control.selectionEnd, null); assert.equal(control.selectionDirection, null);
        }
        assert.equal(row[side].screenshot.caret, 'initial'); assert.equal(row[side].hiddenCaretControl.caret, 'hide');
        for (const image of [row[side].screenshot, row[side].hiddenCaretControl]) {
          const bytes = readFileSync(image.file); assert.equal(hash(bytes), image.sha256);
          const png = PNG.sync.read(bytes);
          assert.equal(png.width, Math.round(image.clip.width * c.viewport.deviceScaleFactor));
          assert.equal(png.height, Math.round(image.clip.height * c.viewport.deviceScaleFactor));
        }
      }
    }
    const paint = { caseId: materialCaseKey('interaction', c) };
    for (const side of ['reference', 'astylar']) {
      // Browser caret:hide does not freeze the Babylon canvas blink. Use all
      // retained temporal pairs, not a zero same-sample delta as absence proof.
      const images = rows.flatMap(row => [row[side].screenshot, row[side].hiddenCaretControl])
        .map(image => PNG.sync.read(readFileSync(image.file)));
      const dpr = c.viewport.deviceScaleFactor, columns = [];
      for (let x = 12*dpr; x < 20*dpr; x++) {
        let longest = 0;
        for (const a of images) for (const b of images) {
          let run = 0;
          for (let y = 0; y < a.height; y++) {
            const i = (y*a.width+x)*4;
            run = [0,1,2,3].some(k => a.data[i+k] !== b.data[i+k]) ? run+1 : 0;
            longest = Math.max(longest, run);
          }
        }
        if (longest >= 10*dpr) columns.push({ x, longest });
      }
      const start = (side === 'reference' ? 16 : 15)*dpr;
      const width = (side === 'reference' ? 1 : 2)*dpr;
      assert.deepEqual(columns.map(column => column.x), Array.from({ length: width }, (_, i) => start+i));
      paint[side] = { columns, cssWidth: width/dpr,
        leftRelativeToInput: rows[0][side].screenshot.clip.x+start/dpr-rows[0][side].observation.box.x };
      assert.equal(paint[side].leftRelativeToInput, side === 'reference' ? 0 : -1);
    }
    paintObservations.push(paint);
  }
  t.diagnostic(JSON.stringify({ configuredFocusTemporalPaint: paintObservations, acceptance: false,
    scope: '40 configured contexts; temporal edge observations, not equal caret intent, vertical fringe causality or current pipeline acceptance' }));
  // This authenticates observation coverage, not focus equality or paint acceptance.
  assert.equal(capture.inputEquivalent, false); assert.equal(capture.renderingEquivalent, false);
});

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
  assert.ok(materialLeftAlignedTextTargets.includes('expansion-title'));
  assert.deepEqual(materialTextAlignmentToleranceOverrides,
    { 'tab-overview': 1.25, 'tab-activity': 1.25, 'button-toggle-one': 1 });
  assert.ok(Object.keys(materialTextAlignmentToleranceOverrides).every((target) => enforcedTextTargets.has(target)));
  assert.ok(materialTextOnlyTargets.every((target) => enforcedTextTargets.has(target)));
  assert.deepEqual(materialGeometryExcludedTargets, ['slider-start', 'slider-primary']);
  assert.deepEqual(materialAdditionalMeasurementTargets.slider, ['slider-start', 'slider-visual']);
  assert.ok(materialSemanticExcludedTargets.includes('slider-visual'));
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
