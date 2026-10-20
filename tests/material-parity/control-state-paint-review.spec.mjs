import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { inputDifferenceClassifications } from './input-equivalence-policy.mjs';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { proveModalPositionInspection, proveBottomSheetActionLayout } from './modal-position-inspection.mjs';
import { applyControlStatePaintReview, proveControlStatePaint, controlStatePaintAttribution, cardSurfacePaintAttribution, opaqueSurfacePaintAttribution, specialPaintDefinitions, applyDisabledLabelColorReview, applyStepperLabelColorReview } from './control-state-paint-review.mjs';
import { collectHeldContentPaintInputs, proveHeldContentPaintInputs } from './control-state-paint-review.mjs';

test('retained sheet content paint separates hover focus and held layers without opener substitution', () => {
  const read = (file, expected) => {
    const bytes = readFileSync(`artifacts/material-parity/${file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    return bytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line));
  };
  const hover = read('sheet-content-hover-only-retry-20261012.log', 'e991ba0f83bd2e1883a7621816991331cae67a01c1214a3c4f33b32add5e0ca0');
  const held = read('sheet-content-held-20261012.log', '332d5c80f482c9d698aac147634234f69acd0f0b5c0c042904e8b417f88f92fd');
  const verify = (rows, pressed) => {
    assert.equal(rows[0].acceptance, false); assert.equal(rows.at(-1).acceptance, false);
    assert.equal(rows.at(-1).result, 'PASS');
    const observations = rows.filter(row => row.family === 'bottom-sheet');
    assert.deepEqual(observations.map(row => `${row.targetId}/${row.mode}`),
      ['bottom-sheet-dismiss/reference', 'bottom-sheet-dismiss/astylar', 'bottom-sheet-copy/reference', 'bottom-sheet-copy/astylar']);
    for (const id of ['bottom-sheet-dismiss', 'bottom-sheet-copy']) {
      const native = observations.find(row => row.targetId === id && row.mode === 'reference').held;
      const candidate = observations.find(row => row.targetId === id && row.mode === 'astylar').held;
      assert.equal(native.active, pressed); assert.ok(candidate.pointerOwnerPath.includes(id));
      const before = native.statePaint[0].pseudoElements.find(pseudo => pseudo.pseudo === '::before');
      assert.equal(before.style.backgroundColor, 'rgb(29, 27, 30)');
      assert.equal(before.style.opacity, pressed || id === 'bottom-sheet-dismiss' ? '0.12' : '0.08');
      const ripples = native.statePaint.filter(node => node.attributes.class === 'mat-ripple-element');
      assert.equal(ripples.length, pressed ? 1 : 0);
      if (pressed) {
        assert.equal(ripples[0].style.backgroundColor, 'color(srgb 0.113725 0.105882 0.117647 / 0.1)');
        assert.equal(ripples[0].style.display, 'block'); assert.equal(ripples[0].style.visibility, 'visible');
      }
      assert.equal(candidate.resolvedStyle.background, pressed ? '#ded8dc' : id === 'bottom-sheet-dismiss' ? '#e6e1e5' : 'transparent');
      assert.equal(candidate.resolvedStyle.borderRadius, '24px');
    }
  };
  verify(hover, false); verify(held, true);
  for (const [original, pressed, mutate] of [
    [hover, false, rows => rows[1].held.active = true],
    [hover, false, rows => rows.find(row => row.targetId === 'bottom-sheet-copy' && row.mode === 'astylar').held.resolvedStyle.background = '#ded8dc'],
    [held, true, rows => rows[1].targetId = 'bottom-sheet-primary'],
    [held, true, rows => rows[2].held.pointerOwnerPath = []],
    [held, true, rows => rows[1].held.statePaint = rows[1].held.statePaint.filter(node => node.attributes.class !== 'mat-ripple-element')],
    [held, true, rows => rows[0].acceptance = true],
  ]) {
    const altered = structuredClone(original); mutate(altered); assert.throws(() => verify(altered, pressed));
  }
});

test('retained inactive switch glyph preserves unequal primitive and missing pixel signals', () => {
  const load = (file, expected) => {
    const bytes = readFileSync(`artifacts/material-parity/${file}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), expected);
    return bytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line));
  };
  const [inputs] = load('slide-toggle-inactive-glyph-inputs-20261012.log', 'bf9916d0ed9452a5e041bbd7c5a84a7f92b22748e894a488003996affeeb60df');
  assert.equal(inputs.exactCases, 68); assert.equal(inputs.inactiveCases, 16); assert.equal(inputs.authenticatedTrees, 136);
  assert.equal(inputs.observations.length, 16);
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => ['desktop-dpr1', 'desktop-dpr2']
    .flatMap(viewport => ['activate', 'activate-leave'].map(state => `${profile}/${viewport}/${state}`))).sort();
  assert.deepEqual(inputs.observations.map(row => { const key = JSON.parse(row.case); return `${key.profile}/${key.viewport.id}/${key.state}`; }).sort(), expected);
  for (const row of inputs.observations) {
    assert.equal(row.reference.path, 'M20 13H4v-2h16v2z');
    assert.deepEqual(row.reference.nominalInkCss, [16 * 16 / 24, 2 * 16 / 24]);
    assert.deepEqual(row.candidate.requestedBox, ['12px', '2px']); assert.equal(row.candidate.radius, '1px');
    assert.equal(row.candidate.authored.type, 'span'); assert.equal(row.candidate.parentCenterRequested, true);
    assert.deepEqual(row.controlPaintGeometry, []); // No observed inner-circle center follows.
  }
  const pixels = load('slide-toggle-retained-minus-center-bands-observations-20261012.log', '107bb560a50e752b0a9a3bf383499892d1f5be8c9d30dc646b86f7c007c5131e');
  assert.equal(pixels.length, 8);
  let missing = 0;
  for (const row of pixels) {
    const key = JSON.parse(row.case); assert.equal(key.state, 'activate-leave');
    assert.equal(row.currentRenderingAccepted, false); assert.equal(row.fullGlyphParity, false);
    assert.equal(row.methodMissingSignalRetained, true);
    for (const [side, observation] of Object.entries(row.sides)) for (const band of observation.bands) {
      if (band.count === 0) {
        missing++; assert.equal(side, 'reference'); assert.equal(key.viewport.deviceScaleFactor, 1);
        assert.equal(band.threshold, 0.75); assert.equal(band.center, null); assert.equal(band.offset, null);
      } else {
        assert.ok(Number.isFinite(band.offset)); assert.ok(Math.abs(band.offset) < 0.5);
      }
    }
  }
  assert.equal(missing, 4); // Missing high-threshold native signal is retained, never a pass.
});

test('retained slider layer inputs and sampled halo pixels preserve unequal paint without core attribution', async () => {
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const readLog = (file, expected) => {
    const bytes = readFileSync(file); assert.equal(sha(bytes), expected);
    return bytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line));
  };
  const retained = readLog('artifacts/material-parity/slider-retained-state-layer-inputs-20261012.log',
    '2bb78d0a50dafdbec9252b9afdfa86bb8f6d8d53583464befdab5e230df1fc3f');
  const receipt = retained.pop();
  assert.equal(receipt.acceptance, false); assert.equal(receipt.cases, 16);
  const keys = retained.map(row => `${row.profile}/${row.viewport}/${row.state}`).sort();
  assert.deepEqual(keys, ['light', 'dark', 'contrast', 'custom'].flatMap(profile =>
    ['desktop-dpr1', 'desktop-dpr2'].flatMap(viewport => ['hover', 'held'].map(state => `${profile}/${viewport}/${state}`))).sort());
  for (const row of retained) {
    assert.equal(row.liveCandidateMaterialAlphaRecorded, false);
    assert.equal(row.localGate, true); assert.equal(row.sharpnessDiagnostic, false);
    assert.equal(row.nativeLayers.length, row.state === 'hover' ? 1 : 2);
    for (const layer of row.nativeLayers) {
      assert.equal(layer.width, '48px'); assert.equal(layer.height, '48px');
      assert.equal(layer.opacity, '1');
      assert.ok(layer.backgroundColor.endsWith(row.state === 'hover' ? '/ 0.05)' : '/ 0.2)'));
    }
  }
  const [source, ...live] = readLog('artifacts/material-parity/slider-live-state-layers-20261012.log',
    'ecf2ccf514eee587d87199852b05700d4baef4c74c51e8e9efb19e1382338022');
  const terminal = live.pop();
  assert.equal(source.acceptance, false); assert.equal(terminal.acceptance, false);
  assert.equal(terminal.captured, 2); assert.equal(terminal.result, 'PASS');
  assert.equal(source.actionBodiesSha256, source.observedBodiesSha256);
  const { PNG } = await import('pngjs');
  const verify = rows => {
    assert.deepEqual(rows.map(row => row.case.state), ['hover', 'held']);
    for (const row of rows) {
      assert.equal(row.case.family, 'slider'); assert.equal(row.case.profile, 'light');
      assert.deepEqual(row.case.viewport, { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 });
      assert.equal(row.acceptance, false); assert.deepEqual(row.errors, []);
      const native = row.paintBoundary.reference, candidate = row.paintBoundary.astylar;
      assert.equal(native.layers.length, row.case.state === 'hover' ? 1 : 2);
      for (const layer of native.layers) {
        assert.equal(layer.active, row.case.state === 'held');
        assert.equal(layer.width, 48); assert.equal(layer.height, 48);
        assert.equal(layer.background, `color(srgb 0.403922 0.313726 0.643137 / ${row.case.state === 'hover' ? '0.05' : '0.2'})`);
      }
      assert.deepEqual(candidate.layers.map(layer => [layer.name, layer.alpha]),
        [['slider-visual-start-state-layer', 0], ['slider-visual-end-state-layer', row.case.state === 'hover' ? 0.08 : 0.12]]);
      for (const layer of candidate.layers) {
        assert.equal(layer.visibility, 1); assert.equal(layer.enabled, true); assert.equal(layer.transparencyMode, 2);
        assert.deepEqual(layer.diffuse, [103 / 255, 80 / 255, 164 / 255]);
      }
      for (const side of [native, candidate]) {
        const bytes = readFileSync(side.screenshot); assert.equal(sha(bytes), side.sha256);
        const png = PNG.sync.read(bytes); assert.equal(side.samples.length, 4);
        for (const sample of side.samples) {
          assert.ok(sample.x >= 0 && sample.x < png.width && sample.y >= 0 && sample.y < png.height);
          const offset = (sample.y * png.width + sample.x) * 4;
          assert.deepEqual([...png.data.subarray(offset, offset + 4)], sample.rgba);
        }
      }
      // Only the vertical samples avoid the track. These pixels are observations,
      // not a model of combined native alpha or proof of renderer compositing.
      for (const index of [2, 3]) assert.notDeepEqual(native.samples[index].rgba, candidate.samples[index].rgba);
    }
  };
  verify(live);
  for (const mutate of [
    rows => rows.pop(),
    rows => rows[0].acceptance = true,
    rows => rows[1].paintBoundary.reference.layers.pop(),
    rows => rows[0].paintBoundary.astylar.layers[1].alpha = 0.05,
    rows => rows[1].paintBoundary.reference.layers[0].active = false,
    rows => rows[0].paintBoundary.astylar.samples[2].rgba[0]++,
    rows => rows[0].paintBoundary.reference.sha256 = '0'.repeat(64),
  ]) {
    const altered = structuredClone(live); mutate(altered); assert.throws(() => verify(altered));
  }
});

test('retained checkbox state layers preserve exact coverage and unequal authoring without paint acceptance', () => {
  const file = 'artifacts/material-parity/checkbox-retained-state-layer-inputs-20261012.log';
  const bytes = readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'f1fc60db2e7ed3c96ad402ffd1ce2cf1ff49963f3d720adce2a6abe23716022c');
  const observation = JSON.parse(bytes.toString());
  const verify = value => {
    assert.equal(value.reportSha, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
    assert.equal(value.cases, 32); assert.equal(value.authenticatedTrees, 64);
    assert.equal(value.acceptance, false);
    const colors = { light: [103, 80, 164], dark: [208, 188, 255], contrast: [0, 0, 0], custom: [0, 106, 106] };
    const sizes = { light: '40px', dark: '40px', contrast: '28px', custom: '32px' };
    const keys = [];
    for (const bucket of value.buckets) {
      assert.deepEqual(bucket.statePaint, { matches: true }); // Recorded default, not measured paint.
      assert.deepEqual(bucket.candidate.size, ['40px', '40px']);
      assert.equal(bucket.candidate.opacity, '1.0');
      for (const [profile, viewport] of bucket.contexts) {
        assert.ok(Object.hasOwn(colors, profile));
        assert.ok(['desktop-dpr1', 'desktop-dpr2'].includes(viewport));
        assert.ok(['focus', 'hover', 'held', 'selected'].includes(bucket.state));
        keys.push(`${bucket.state}/${profile}/${viewport}`);
        assert.deepEqual(bucket.native.size, [sizes[profile], sizes[profile]]);
        const primary = colors[profile];
        if (bucket.state === 'focus' || bucket.state === 'hover') {
          assert.equal(bucket.native.background, `rgb(${primary.join(', ')})`);
          assert.equal(bucket.native.opacity, bucket.state === 'focus' ? '0.12' : '0.08');
          assert.equal(bucket.candidate.background, bucket.state === 'focus' ? 'transparent' : `rgba(${primary.join(',')},0.08)`);
          assert.deepEqual(bucket.ripples, []);
        } else if (bucket.state === 'held') {
          const onSurface = profile === 'dark' ? [230, 225, 229] : [29, 27, 32];
          assert.equal(bucket.native.background, `rgb(${onSurface.join(', ')})`);
          assert.equal(bucket.native.opacity, '0.12');
          assert.equal(bucket.candidate.background, `rgba(${primary.join(',')},0.12)`);
          assert.deepEqual(bucket.ripples, [{ background: bucket.native.background, opacity: '0.1' }]);
        } else {
          assert.equal(bucket.native.background, 'rgba(0, 0, 0, 0)');
          assert.equal(bucket.native.opacity, '0');
          assert.equal(bucket.candidate.background, 'transparent');
          assert.deepEqual(bucket.ripples, []);
        }
        assert.deepEqual(bucket.generated, ['focus', 'held'].includes(bucket.state)
          ? [{ display: 'none', background: 'rgba(0, 0, 0, 0)', opacity: '1', border: '3px', color: 'rgba(0, 0, 0, 0)' }] : []);
      }
    }
    const expected = ['focus', 'hover', 'held', 'selected'].flatMap(state => Object.keys(colors)
      .flatMap(profile => ['desktop-dpr1', 'desktop-dpr2'].map(viewport => `${state}/${profile}/${viewport}`)));
    assert.equal(new Set(keys).size, 32);
    assert.deepEqual(keys.sort(), expected.sort());
  };
  verify(observation);
  for (const mutate of [
    value => value.acceptance = true,
    value => value.buckets.pop(),
    value => value.buckets[0].contexts.push(value.buckets[0].contexts[0]),
    value => value.buckets[0].candidate.background = value.buckets[0].native.background,
    value => value.buckets[0].generated[0].display = 'block',
    value => value.buckets.find(bucket => bucket.state === 'held').ripples = [],
    value => value.buckets.find(bucket => bucket.contexts[0][0] === 'contrast').native.size = ['40px', '40px'],
    value => value.buckets[0].statePaint.expected = 'measured',
  ]) {
    const altered = structuredClone(observation); mutate(altered);
    assert.throws(() => verify(altered));
  }
});

test('retained held content paint classifies missing scalar owners without fabricating case closure', async () => {
  const moduleFile = 'tests/material-parity/control-state-paint-review.mjs';
  let current = readFileSync(moduleFile, 'utf8');
  for (const addition of ["import { execFileSync } from 'node:child_process';\n", "import path from 'node:path';\n",
    "import { readRetainedSortFocusSource } from './position-composition-producer-transition.mjs';\n"]) {
    assert.equal(current.split(addition).length, 2); current = current.replace(addition, '');
  }
  const start = '// Supplemental held-content inputs are not rows in the configured scalar map.';
  const end = 'export function proveSheetActionAppearance';
  assert.equal(current.split(start).length, 2); assert.equal(current.split(end).length, 2);
  current = current.slice(0, current.indexOf(start)) + current.slice(current.indexOf(end));
  assert.equal(current, execFileSync('git', ['show', `81bacd30:${moduleFile}`], { encoding: 'utf8', maxBuffer: 4_000_000 }),
    'every existing scalar classification and validation byte remains unchanged');
  const rows = await collectHeldContentPaintInputs();
  const producer = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  const startGuard = '  if (requireComplete || report.heldContentPaintInputs !== undefined) {';
  const endGuard = '  for (const [key, attributions, validateSource, validateRows] of [';
  assert.equal(producer.split(startGuard).length, 2);
  const startIndex = producer.indexOf(startGuard), endIndex = producer.indexOf(endGuard, startIndex);
  assert.ok(endIndex > startIndex);
  const validateAddedBoundary = new Function('report', 'requireComplete', 'root', 'collectHeldContentPaintInputs',
    'const errors = [];\n' + producer.slice(startIndex, endIndex) + '\nreturn errors;');
  assert.deepEqual(validateAddedBoundary({ heldContentPaintInputs: rows }, true, process.cwd(), collectHeldContentPaintInputs), []);
  assert.deepEqual(validateAddedBoundary({}, false, process.cwd(), collectHeldContentPaintInputs), []);
  assert.equal(validateAddedBoundary({}, true, process.cwd(), collectHeldContentPaintInputs).length, 1);
  const forged = structuredClone(rows); forged[0].inputEquivalent = true;
  assert.equal(validateAddedBoundary({ heldContentPaintInputs: forged }, false, process.cwd(), collectHeldContentPaintInputs).length, 1);
  assert.deepEqual(rows.map(row => row.element), ['datepicker-day-1', 'menu-rename', 'dialog-cancel']);
  for (const row of rows) {
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.equal(row.inputEquivalent, false); assert.equal(row.renderingEquivalent, false);
    assert.equal(row.configuredCaseClosure, false);
  }
  const observations = rows.flatMap(row => ['reference', 'astylar'].map(mode => ({ family: row.family,
    mode, targetId: row.element, held: row[mode] })));
  assert.equal(proveHeldContentPaintInputs(observations).length, 3);
  for (const mutate of [
    values => values.pop(),
    values => values[0].held.active = false,
    values => values[1].held.pointerOwnerPath = ['unrelated'],
    values => values[1].held.resolvedStyle.background = 'transparent',
    values => values[0].held.statePaint.find(node => node.attributes.class?.includes('mat-calendar-body-cell-content')).style.width = '40px',
    values => values[2].held.statePaint.find(node => node.attributes.class === 'mat-ripple-element').style.display = 'none',
    values => values[2].held.statePaint.find(node => node.attributes.class === 'mat-ripple-element').rules
      .find(rule => rule.conditions.includes('(forced-colors: active)')).active = true,
  ]) {
    const altered = structuredClone(observations); mutate(altered);
    assert.notDeepEqual(altered, observations); assert.throws(() => proveHeldContentPaintInputs(altered));
  }
});
import { collectDisabledLabelColorStages } from '../../scripts/audit-material-disabled-label-color-stages.mjs';
import { collectPaintReviewSources, applyPaintReviews, validatePaintReviews, isPaintReviewRow } from './control-state-paint-review.mjs';
import { paintPopulation } from '../../scripts/check-material-position-canonical-conservation.mjs';
import { proveOmittedOwnerPaintRequest, applyOmittedOwnerPaintRequests, validateOmittedOwnerPaintRequests } from './control-state-paint-review.mjs';
import { applyOwnerMaximumWidths, validateOwnerMaximumWidths } from './control-width-observation.mjs';
import { applyBadgeMarginReviews, validateBadgeMarginReviews } from './authored-anchor-review.mjs';
import { applySliderMarginReviews, validateSliderMarginReviews } from './slider-position-request-review.mjs';
import { applyListSpacingReviews, validateListSpacingReviews } from './display-request-review.mjs';
import { applyHeadingVisibleOverflow, validateHeadingVisibleOverflow, applyTabPanelOverflowBoundary, validateTabPanelOverflowBoundary } from './control-overflow-observation.mjs';
import { applyTableVisibleOverflow, validateTableVisibleOverflow, applyControlOverflowOwnerBoundaries, validateControlOverflowOwnerBoundaries, applyRangeVisibleOverflow, validateRangeVisibleOverflow } from './control-overflow-observation.mjs';
import { proveFocusShadowSubstitution, applyFocusShadowSubstitutions, validateFocusShadowSubstitutions } from './control-state-paint-review.mjs';
import { proveCardShadowSyntax, applyCardShadowSyntax, validateCardShadowSyntax } from './control-state-paint-review.mjs';
import { proveMappedNonwidgetAppearance, applyMappedNonwidgetAppearance, validateMappedNonwidgetAppearance } from './control-state-paint-review.mjs';
import { proveRangeAppearanceInitial, applyRangeAppearanceInitial, validateRangeAppearanceInitial } from './control-state-paint-review.mjs';
import { proveAppearanceOwnerBoundary, applyAppearanceOwnerBoundaries, validateAppearanceOwnerBoundaries } from './control-state-paint-review.mjs';
import { proveSheetActionAppearance, applySheetActionAppearance, validateSheetActionAppearance } from './control-state-paint-review.mjs';
import { applyTooltipWordBreakReview, validateTooltipWordBreakReview } from './wrapping-input-review.mjs';
import { applyStepperSpacingReviews, validateStepperSpacingReviews } from './display-request-review.mjs';
import { applyChipSpacingReviews, validateChipSpacingReviews } from './display-request-review.mjs';
import { applyChoiceSpacingReviews, validateChoiceSpacingReviews } from './display-request-review.mjs';
import { applyToolbarSpacingReviews, validateToolbarSpacingReviews } from './display-request-review.mjs';
import { applyDialogActionSpacingReviews, validateDialogActionSpacingReviews } from './display-request-review.mjs';
import { applyDialogPanelGapReview, validateDialogPanelGapReview } from './display-request-review.mjs';
import { applyOverlayFlowReviews, validateOverlayFlowReviews } from './overlay-position-request-review.mjs';
import { applyPanelVisibilityOwnership, validatePanelVisibilityOwnership } from '../../scripts/audit-material-panel-state-ownership.mjs';
import { applyTooltipShrinkReviews, validateTooltipShrinkReviews } from './display-request-review.mjs';
import { applyExpansionTreeFormattingReviews, validateExpansionTreeFormattingReviews } from './display-request-review.mjs';
import { applyRemainingBorderReviews, validateRemainingBorderReviews } from './custom-owner-border-review.mjs';
import { applyFinalOwnerStyleReviews, validateFinalOwnerStyleReviews } from './custom-owner-border-review.mjs';

test('modal non-widget native appearance is invariant across mapped tags and noop transition context', async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: dpr });
      try {
        for (const type of ['mat-dialog-actions', 'mat-dialog-content', 'mat-bottom-sheet-container', 'div', 'p', 'section']) {
          for (const motion of [false, true]) {
            await page.setContent(`<style>body{margin:0}#probe{display:block;box-sizing:border-box;position:absolute;left:20px;top:20px;width:220px;height:100px;margin:0;padding:8px;background:#238b45;color:white;font:16px/24px Arial}
              ${motion ? '#probe{transition:var(--mat-dialog-transition,transform 150ms ease)}.noop #probe{transition:none}' : ''}</style>
              <div class="noop"><${type} id="probe"><span>Modal content</span></${type}></div>`);
            const samples = [];
            for (const appearance of ['', 'auto', 'none']) {
              const observation = await page.evaluate(value => {
                const node = document.getElementById('probe'); node.style.appearance = value;
                const style = getComputedStyle(node), bounds = node.getBoundingClientRect();
                return { appearance: style.appearance, transition: style.transitionProperty,
                  width: bounds.width, height: bounds.height, text: node.textContent };
              }, appearance);
              assert.equal(observation.appearance, appearance || 'none');
              assert.equal(observation.width, 220); assert.equal(observation.height, 100);
              assert.equal(observation.text, 'Modal content');
              if (motion) assert.equal(observation.transition, 'none');
              samples.push(await page.screenshot());
            }
            assert.ok(samples[0].equals(samples[1]) && samples[0].equals(samples[2]), `${type}/${dpr}/${motion}`);
            await page.locator('#probe').evaluate(node => { node.style.background = '#ff0000'; });
            assert.ok(!samples[0].equals(await page.screenshot()), 'visible paint sensitivity');
          }
        }
        // Native-control positive control: the same appearance toggle is observable.
        await page.setContent('<input type="checkbox" checked style="width:40px;height:40px">');
        const control = await page.screenshot();
        await page.locator('input').evaluate(node => { node.style.appearance = 'none'; });
        assert.ok(!control.equals(await page.screenshot()), 'native appearance sensitivity');
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});

test('remaining modal appearance distinguishes link substitutions from non-widget owners across 171 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = report.interactions.filter(e => ['dialog', 'bottom-sheet'].includes(e.family))
    .map(e => ({ ...e, kind: 'interaction' }));
  const inventory = collectFullTreeInventory(cases);
  const expected = {
    'dialog-actions': ['mat-dialog-actions', 'div', 32],
    'dialog-copy': ['mat-dialog-content', 'p', 32],
    'dialog-panel': ['div', 'section', 32],
    'bottom-sheet-panel': ['mat-bottom-sheet-container', 'section', 25],
    'bottom-sheet-copy': ['a', 'button', 25],
    'bottom-sheet-dismiss': ['a', 'button', 25],
  };
  let observations = 0, linkSubstitutions = 0;
  for (const [element, [nativeType, candidateType, count]] of Object.entries(expected)) {
    const matching = cases.filter(e => e.styleInputs.some(i => i.id === element));
    assert.equal(matching.length, count);
    for (const entry of matching) {
      const key = `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
      const [r, a] = modalInventoryTrees(inventory, key);
      const { mapping } = proveModalPositionInspection(entry, r, a, element);
      const native = r.nodes.find(n => n.key === mapping.referenceNode);
      const candidate = a.nodes.find(n => n.key === mapping.candidateNode);
      assert.equal(native.type, nativeType); assert.equal(candidate.authored.type, candidateType);
      assert.equal(r.styles[native.style].appearance, 'none');
      const declarations = native.rules.flatMap(i => Object.entries(r.rules[i].declarations));
      assert.deepEqual(declarations.filter(([k]) => /^(appearance|-webkit-appearance|-moz-appearance|all)$/.test(k)), []);
      const motion = declarations.filter(([k]) => /^(animation|transition)/.test(k));
      if (element === 'dialog-panel') {
        assert.equal(motion.length, 10);
        assert.ok(motion.some(([k, v]) => k === 'transition-property' && v.value === 'none'));
        assert.ok(motion.some(([k, v]) => k === 'transition-property' && v.value === ''));
      } else assert.deepEqual(motion, []);
      if (nativeType === 'a') {
        const proof = proveBottomSheetActionLayout(entry, r, a, element);
        assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
        linkSubstitutions++;
      }
      observations++;
    }
  }
  assert.equal(observations, 171); assert.equal(linkSubstitutions, 50);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'bottom-sheet', {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applySheetActionAppearance(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-sheet-action-appearance-substitution');
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 50);
  assert.deepEqual(validateSheetActionAppearance(applied, rows, cases, inventory, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  applied.forEach((r, i) => { if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-sheet-action-appearance-substitution').reviewedCases.pop();
  assert.equal(validateSheetActionAppearance(forged, rows, cases, inventory, normalize).length, 1);
  const entry = cases.find(e => e.styleInputs.some(i => i.id === 'bottom-sheet-copy'));
  const pair = modalInventoryTrees(inventory, `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`);
  const proof = proveSheetActionAppearance(entry, ...pair, 'bottom-sheet-copy');
  for (const mutate of [
    (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'a'; },
    (r, a) => { a.rules.push({ selector: '#bottom-sheet-copy', appearance: 'none' }); },
    r => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].appearance = 'auto'; },
  ]) {
    const altered = structuredClone(pair); mutate(...altered);
    assert.throws(() => proveSheetActionAppearance(entry, ...altered, 'bottom-sheet-copy'));
  }
});

test('chip and tab appearance binds distinct observation owners across all 222 cases', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), families = ['chips', 'tabs'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyAppearanceOwnerBoundaries(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-appearance-owner-boundary');
  assert.deepEqual(changed.map(r => [r.element, r.occurrences]), [['chip-0', 76], ['chip-1', 76], ['tab-panel', 70]]);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateAppearanceOwnerBoundaries(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-appearance-owner-boundary').reviewedCases.pop();
  assert.equal(validateAppearanceOwnerBoundaries(forged, rows, cases, inventory, normalize).length, 1);
  for (const row of changed) {
    const key = row.reviewedCases[0], entry = cases.find(e =>
      `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const original = modalInventoryTrees(inventory, key), proof = proveAppearanceOwnerBoundary(entry, ...original, row.element);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
    if (row.family === 'chips') {
      assert.equal(proof.motion.length, 2); assert.equal(proof.referenceActionAppearance, 'auto');
      const altered = structuredClone(original);
      altered[0].styles[altered[0].nodes.find(n => n.key === proof.referenceActionNode).style].appearance = 'none';
      assert.throws(() => proveAppearanceOwnerBoundary(entry, ...altered, row.element));
    }
    for (const mutate of [
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'section'; },
      (r, a) => { a.rules.push({ selector: '#' + row.element, appearance: 'none' }); },
      r => { r.ruleEvidenceComplete = false; },
    ]) {
      const pair = structuredClone(original); mutate(...pair);
      assert.throws(() => proveAppearanceOwnerBoundary(entry, ...pair, row.element));
    }
  }
});

test('range initial appearance binds all 156 hidden original range owners without claiming none support', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'slider');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'slider', {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyRangeAppearanceInitial(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-range-appearance-initial-request');
  assert.equal(changed.length, 2); assert.deepEqual(changed.map(r => r.occurrences), [78, 78]);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateRangeAppearanceInitial(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-range-appearance-initial-request').reviewedCases.pop();
  assert.equal(validateRangeAppearanceInitial(forged, rows, cases, inventory, normalize).length, 1);
  const entry = cases[0], key = `${entry.kind}:slider@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
  for (const element of ['slider-start', 'slider-primary']) {
    const original = modalInventoryTrees(inventory, key), proof = proveRangeAppearanceInitial(entry, ...original, element);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
    assert.match(proof.separateSupportGap, /explicit none/);
    for (const mutation of [
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).authored.inputType = 'text'; },
      (r, a) => { a.rules.push({ selector: '#' + element, appearance: 'none' }); },
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.appearance = 'auto'; },
      r => { r.ruleEvidenceComplete = false; },
      r => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].opacity = '1'; },
    ]) {
      const pair = structuredClone(original); mutation(...pair);
      assert.throws(() => proveRangeAppearanceInitial(entry, ...pair, element));
    }
  }
});

test('mapped nonwidget appearance retains alias gaps and unchanged public evidence for all 232 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), families = ['bottom-sheet', 'snack-bar', 'tooltip', 'dialog'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyMappedNonwidgetAppearance(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-mapped-nonwidget-appearance-initial-request');
  assert.deepEqual(changed.map(r => [r.element, r.occurrences]), [
    ['bottom-sheet-overlay', 25], ['bottom-sheet-panel', 25], ['snack-bar-overlay', 34], ['snack-bar-surface', 34], ['tooltip-popup', 18],
    ['dialog-actions', 32], ['dialog-copy', 32], ['dialog-panel', 32],
  ]);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateMappedNonwidgetAppearance(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => changed.some(c => c.element === r.element && c.property === r.property))
    .reviewEvidence.observations[0].mapping.missingRules = [];
  assert.equal(validateMappedNonwidgetAppearance(forged, rows, cases, inventory, normalize).length, 1);
  for (const row of changed) {
    const key = row.reviewedCases[0], entry = cases.find(e =>
      `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === key);
    const original = modalInventoryTrees(inventory, key), proof = proveMappedNonwidgetAppearance(entry, ...original, row.element);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
    if (row.element === 'dialog-panel') {
      assert.equal(proof.motion.length, 10); assert.equal(proof.motionEquivalenceProven, false);
      const changedMotion = structuredClone(original);
      changedMotion[0].rules.find(rule => rule.selector === '._mat-animation-noopable .mat-mdc-dialog-surface')
        .declarations['transition-property'].value = 'all';
      assert.throws(() => proveMappedNonwidgetAppearance(entry, ...changedMotion, row.element));
    }
    for (const mutation of [
      (r, a) => { a.nodes.find(n => n.key === proof.astylarNode).authored.type = 'button'; },
      (r, a) => { a.rules.push({ selector: '#' + row.element, appearance: 'none' }); },
      (r, a) => { a.rules.push({ selector: '#' + row.element, transition: 'all 1s' }); },
      r => { r.ruleEvidenceComplete = false; },
      r => { r.nodes.find(n => n.key === proof.referenceNode).inline.all = { value: 'initial', important: false }; },
    ]) {
      const pair = structuredClone(original); mutation(...pair);
      assert.throws(() => proveMappedNonwidgetAppearance(entry, ...pair, row.element));
    }
  }
});

test('focus shadow substitution binds every original owner and rejects altered outline or state evidence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), families = ['core', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyFocusShadowSubstitutions(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-focus-outline-shadow-substitution');
  assert.deepEqual(Object.fromEntries(changed.map(r => [r.family, r.occurrences])),
    { core: 32, button: 32, menu: 50, 'bottom-sheet': 43, dialog: 16, 'snack-bar': 51, tooltip: 41 });
  assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 265);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateFocusShadowSubstitutions(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-focus-outline-shadow-substitution').reviewedCases.pop();
  assert.equal(validateFocusShadowSubstitutions(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyFocusShadowSubstitutions(rows, cases.filter(e => e.family !== 'core'), inventory, normalize));
  const first = changed[0].reviewedCases[0], entry = cases.find(e =>
    `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === first);
  const original = modalInventoryTrees(inventory, first);
  const mutate = change => {
    const pair = structuredClone(original); change(...pair);
    assert.throws(() => proveFocusShadowSubstitution(entry, ...pair));
  };
  mutate((r, a) => { a.ruleEvidenceComplete = false; });
  mutate((r, a) => { a.nodes.find(n => n.authored?.id === 'core-primary').normalResolvedStyle.boxShadow = 'none'; });
  mutate((r, a) => { a.rules.find(rule => rule.selector === '.material-button:focus').boxShadow = 'none'; });
  mutate((r, a) => { a.rules.push({ selector: '.material-button:focus', outline: 'none' }); });
  mutate(r => { r.rules.find(rule => rule.selector === '.mdc-button').declarations['outline-style'].value = 'solid'; });
  mutate(r => { r.nodes.push(structuredClone(r.nodes.find(n => n.attributes?.id === 'core-primary'))); });
});

test('public range appearance separates initial auto equivalence from unsupported none paint', async () => {
  const { build } = await import('esbuild'), { createServer } = await import('node:http');
  const { resolve } = await import('node:path'), { chromium } = await import('playwright-core');
  const { PNG } = await import('pngjs'), { default: ts } = await import('typescript');
  const installed = readFileSync('examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/range.manager.js', 'utf8');
  assert.equal(createHash('sha256').update(installed.replaceAll('\r\n', '\n')).digest('hex'),
    '07e99a20d6effa8434b9efdf49d720d5774258dea5e71e056f3d28ca82fdce5a');
  const compiled = ts.transpileModule(readFileSync('src/app/services/dom/input/range.manager.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const method = s => {
    const start = s.indexOf('    createRange('), end = s.indexOf('    setValue(', start);
    assert.ok(start > 0 && end > start); return s.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(method(compiled), method(installed));
  let source = readFileSync('examples/material-showcase/audit/range-drag.mjs', 'utf8');
  const replace = (from, to) => { assert.equal(source.split(from).length, 2); source = source.replace(from, to); };
  replace("document.body.style.cssText =", `site.styles.push({ selector: 'input', zIndex: '1', background: 'transparent', opacity: query.get('opacity') ?? '1',
    ...(query.get('appearance') === 'omitted' ? {} : { appearance: query.get('appearance') }) });
document.body.style.cssText =`);
  replace('return { mode, translated, stackTracing, site:', `return { nativeAppearance: mode === 'reference' ? getComputedStyle(document.getElementById('first')).appearance : null,
    mode, translated, stackTracing, site:`);
  const built = await build({ stdin: { contents: source, resolveDir: resolve('examples/material-showcase/audit'), sourcefile: 'range-appearance-diagnostic.mjs' },
    bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  assert.ok(Object.keys(built.metafile.inputs).some(p => p.includes('node_modules/astylarui/')));
  assert.ok(!Object.keys(built.metafile.inputs).some(p => /^src\//.test(p)));
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/audit.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/audit.js' ? built.outputFiles[0].contents : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const samples = {};
      for (const mode of ['reference', 'astylar']) {
        samples[mode] = [];
        for (const [appearance, opacity] of [['omitted', '1'], ['auto', '1'], ['none', '1'], ['auto', '0']]) {
          const page = await browser.newPage({ viewport: { width: 480, height: 180 }, deviceScaleFactor: dpr });
          const errors = []; page.on('pageerror', e => errors.push(e.message));
          try {
            await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&appearance=${appearance}&opacity=${opacity}`);
            await page.waitForFunction(() => !!window.rangeDragAudit);
            await page.evaluate(() => window.rangeDragAudit.settle()); await page.waitForTimeout(250);
            const snapshot = await page.evaluate(() => window.rangeDragAudit.snapshot());
            assert.deepEqual(errors, []);
            assert.deepEqual(snapshot.controls.map(c => c.type), ['range', 'range']);
            if (mode === 'astylar') {
              assert.deepEqual(snapshot.diagnostics.messages.filter(m => m.severity === 'error'), []);
              const first = snapshot.resolved.elements.find(e => e.id === 'first');
              assert.equal(first.normal.appearance, appearance === 'omitted' ? undefined : appearance);
              assert.equal(first.effective.appearance, first.normal.appearance);
            } else assert.equal(snapshot.nativeAppearance, appearance === 'omitted' ? 'auto' : appearance);
            samples[mode].push({ snapshot, pixels: PNG.sync.read(await page.screenshot()).data });
            await page.evaluate(() => window.rangeDragAudit.dispose());
          } finally { await page.close(); }
        }
      }
      for (let i = 0; i < 4; i++) assert.deepEqual(samples.reference[i].snapshot.site, samples.astylar[i].snapshot.site);
      for (const mode of ['reference', 'astylar']) {
        assert.equal(samples[mode][0].pixels.equals(samples[mode][1].pixels), true, `${mode}: omitted matches auto`);
        assert.equal(samples[mode][1].pixels.equals(samples[mode][3].pixels), false, `${mode}: opacity sensitivity rejects invisible controls`);
      }
      assert.equal(samples.reference[1].pixels.equals(samples.reference[2].pixels), false, 'native none changes range paint');
      assert.equal(samples.astylar[1].pixels.equals(samples.astylar[2].pixels), true, 'core range currently ignores none');
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});

test('public button focus distinguishes none from transparent shadow without changing native outline', async () => {
  const { build } = await import('esbuild');
  const { createServer } = await import('node:http');
  const { resolve } = await import('node:path');
  const { chromium } = await import('playwright-core');
  const { PNG } = await import('pngjs');
  const { default: ts } = await import('typescript');
  const installedPath = 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js';
  const installed = readFileSync(installedPath, 'utf8');
  assert.equal(createHash('sha256').update(installed).digest('hex'),
    '6ad4f51ca47a9e1956a66b6e724105a66aaff582c53b0b30374fb6051723f5f8');
  const compiled = ts.transpileModule(readFileSync('src/lib/astylar.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
  const focusMethod = value => {
    const start = value.indexOf('    configureFocusIndicator(elementId, siteData) {');
    const end = value.indexOf('    setElementPseudoState(', start);
    assert.ok(start > 0 && end > start);
    return value.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(focusMethod(compiled), focusMethod(installed), 'installed focus decision matches source');
  let source = readFileSync('examples/material-showcase/audit/button-pointer-focus.mjs', 'utf8');
  const replace = (from, to) => {
    assert.equal(source.split(from).length, 2, `unique public reduction anchor: ${from}`);
    source = source.replace(from, to);
  };
  replace('const children =', "styles.push({ selector: 'button:focus', boxShadow: new URLSearchParams(location.search).get('shadow') });\nconst children =");
  replace("display: 'block', boxSizing:", "zIndex: new URLSearchParams(location.search).get('z'), display: 'block', boxSizing:");
  replace('return { mode, authored: site,', `return { meshEvidence: surface?.scene.meshes.map(m => ({ name:m.name, enabled:m.isEnabled(), visible:m.isVisible, position:m.getAbsolutePosition().asArray(), color:m.material?.emissiveColor?.asArray() })), indicators: surface?.scene.meshes.filter(m => m.name.startsWith('focusIndicator_first_') && m.isVisible).map(m => ({ name: m.name, alpha: m.material?.alpha })),
      nativeOutline: mode === 'reference' ? getComputedStyle(document.getElementById('first')).outline : null,
      authored: site, mode,`);
  const built = await build({ stdin: { contents: source, resolveDir: resolve('examples/material-showcase/audit'),
    sourcefile: 'focus-shadow-diagnostic.mjs' }, bundle: true, write: false, format: 'esm',
    platform: 'browser', target: 'es2022', metafile: true });
  const packageInputs = Object.keys(built.metafile.inputs).filter(p => p.includes('node_modules/astylarui/'));
  assert.ok(packageInputs.length > 0, 'public root import must resolve the installed package');
  assert.ok(!Object.keys(built.metafile.inputs).some(p => /^src\//.test(p)), 'no renderer source deep imports');
  const bundle = built.outputFiles[0].contents;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', req.url === '/audit.js' ? 'text/javascript' : 'text/html');
    res.end(req.url === '/audit.js' ? bundle : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) for (const z of ['0', '1']) {
      const samples = {};
      for (const mode of ['reference', 'astylar']) {
        samples[mode] = [];
        for (const shadow of ['none', '0 0 0 1px rgba(0,0,0,0)']) {
          const page = await browser.newPage({ viewport: { width: 440, height: 200 }, deviceScaleFactor: dpr });
          const errors = []; page.on('pageerror', error => errors.push(error.message));
          try {
            await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&z=${z}&shadow=${encodeURIComponent(shadow)}`);
            await page.waitForFunction(() => !!window.buttonFocusAudit);
            await page.evaluate(() => window.buttonFocusAudit.settle());
            await page.keyboard.press('Tab');
            await page.evaluate(() => window.buttonFocusAudit.settle());
            await page.waitForTimeout(250); // Match the existing public focus reduction's capture boundary.
            const snapshot = await page.evaluate(() => window.buttonFocusAudit.snapshot());
            assert.deepEqual(errors, []); assert.equal(snapshot.authoredUnchanged, true);
            assert.equal(snapshot.activeButton, 'first');
            assert.ok(snapshot.nativeEvents.some(e => e.type === 'keydown' && e.key === 'Tab' && e.trusted));
            if (mode === 'astylar') assert.deepEqual(snapshot.diagnostics.messages.filter(m => m.severity === 'error'), []);
            samples[mode].push({ snapshot, pixels: PNG.sync.read(await page.screenshot()).data });
            await page.evaluate(() => window.buttonFocusAudit.dispose());
          } finally { await page.close(); }
        }
      }
      const [rn, rt] = samples.reference, [an, at] = samples.astylar;
      for (let i = 0; i < 2; i++) assert.deepEqual(samples.reference[i].snapshot.authored, samples.astylar[i].snapshot.authored);
      assert.equal(rn.snapshot.nativeOutline, rt.snapshot.nativeOutline);
      assert.doesNotMatch(rn.snapshot.nativeOutline, /\bnone\b/);
      assert.equal(rn.pixels.equals(rt.pixels), true, 'native focus pixels retain the same outline');
      assert.equal(an.snapshot.indicators.length, 8, 'none retains the two four-edge core fallback rings');
      assert.deepEqual(at.snapshot.indicators, [], 'transparent shadow disables fallback');
      const owner = an.snapshot.meshEvidence.find(m => m.name === 'first');
      const ring = an.snapshot.meshEvidence.find(m => m.name.startsWith('focusIndicator_'));
      assert.ok(Math.abs(ring.position[2] - owner.position[2] + .02) < 1e-6);
      console.log(JSON.stringify({ dpr, z, equalPixels: an.pixels.equals(at.pixels),
        focusDepth: ring.position[2], ownerDepth: owner.position[2] }));
      assert.equal(an.pixels.equals(at.pixels), z === '0', 'explicit stacking separates focus paint from the baseline occlusion');
    }
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});

test('card shadow serialization preserves all original layers and browser pixels', async () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'card');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const rows = queryFindings('artifacts/material-parity/working-audit', 'card', {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyCardShadowSyntax(rows, cases, inventory, normalize);
  assert.equal(applied.filter((r, i) => r !== rows[i]).length, 1);
  const changed = applied.find(r => r.attribution === 'reviewed-card-shadow-layer-serialization');
  assert.equal(changed.occurrences, 52); assert.equal(changed.reviewedCases.length, 52);
  assert.deepEqual(validateCardShadowSyntax(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-card-shadow-layer-serialization').reviewedCases.pop();
  assert.equal(validateCardShadowSyntax(forged, rows, cases, inventory, normalize).length, 1);
  const first = cases[0], pair = modalInventoryTrees(inventory,
    `${first.kind}:card@${first.profile}/${first.viewport.id}${first.state ? '/' + first.state : ''}`);
  pair[1].rules.find(r => r.selector === '.material-card').boxShadow = 'none';
  assert.throws(() => proveCardShadowSyntax(first, ...pair, normalize));
  const inputs = [...report.results, ...report.interactions].filter(e => e.family === 'card')
    .flatMap(e => e.styleInputs.filter(i => i.id === 'card-primary'));
  assert.equal(inputs.length, 52);
  const { build } = await import('esbuild');
  const built = await build({ entryPoints: ['src/app/services/dom/elements/box-shadow.ts'],
    bundle: true, write: false, platform: 'node', format: 'esm' });
  const { parseBoxShadow } = await import('data:text/javascript;base64,' +
    Buffer.from(built.outputFiles[0].contents).toString('base64'));
  const layers = value => parseBoxShadow(value).map(layer => ({ ...layer,
    color: layer.color.replaceAll(' ', '') }));
  const expected = [
    { offsetX: 0, offsetY: 2, blur: 1, spread: -1, color: 'rgba(0,0,0,0.2)' },
    { offsetX: 0, offsetY: 1, blur: 1, spread: 0, color: 'rgba(0,0,0,0.14)' },
    { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: 'rgba(0,0,0,0.12)' },
  ];
  const pairs = new Map();
  for (const input of inputs) {
    assert.deepEqual(layers(input.reference.boxShadow), expected);
    for (const style of [input.astylar, input.astylarNormalResolvedStyle, input.astylarInteractionResolvedStyle])
      assert.deepEqual(layers(style.boxShadow), expected);
    const authored = input.astylarAuthored.filter(r => r.declarations.boxShadow);
    assert.equal(authored.length, 1);
    assert.deepEqual(layers(authored[0].declarations.boxShadow), expected);
    pairs.set(JSON.stringify([input.reference.boxShadow, input.astylar.boxShadow]),
      [input.reference.boxShadow, input.astylar.boxShadow]);
  }
  assert.equal(pairs.size, 1);
  const { chromium } = await import('playwright-core');
  const { PNG } = await import('pngjs');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const deviceScaleFactor of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 220, height: 140 }, deviceScaleFactor });
      await page.setContent('<style>body{margin:0;background:white}div{position:absolute;left:40px;top:30px;width:140px;height:70px;border-radius:12px;background:#f8f2f6}</style><div></div>');
      const capture = async shadow => {
        const computed = await page.evaluate(value => {
          const node = document.querySelector('div'); node.style.boxShadow = value;
          return getComputedStyle(node).boxShadow;
        }, shadow);
        return { computed, pixels: PNG.sync.read(await page.screenshot()).data };
      };
      for (const [reference, candidate] of pairs.values()) {
        const r = await capture(reference), a = await capture(candidate);
        assert.equal(a.computed, r.computed); assert.deepEqual(a.pixels, r.pixels);
        // These controls must remain observable; do not canonicalize shadow away.
        assert.notDeepEqual((await capture('none')).pixels, r.pixels);
        assert.notDeepEqual((await capture(candidate.replace('3px', '8px'))).pixels, r.pixels);
        assert.notDeepEqual(layers(candidate.replace('3px', '8px')), expected);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  // Browser syntax equivalence plus core parser equivalence is not WebGL raster parity.
});

test('omitted owner paint requests preserve all 77 original observations and reject competing inputs', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes), owners = { badge: 'badge-count', 'bottom-sheet': 'bottom-sheet-panel' };
  const families = [...Object.keys(owners), 'chips', 'tabs', 'slider', 'list', 'card', 'dialog', 'table', 'core', 'button', 'menu', 'snack-bar', 'tooltip', 'stepper', 'radio', 'checkbox', 'toolbar'];
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => families.includes(e.family) || ['expansion', 'tree', 'button-toggle', 'divider', 'progress-bar', 'progress-spinner', 'icon'].includes(e.family));
  const inventory = collectFullTreeInventory(cases), counts = {}, samples = new Map();
  assert.deepEqual(inventory.errors, []);
  for (const entry of cases.filter(e => owners[e.family] && e.styleInputs.some(i => i.id === owners[e.family]))) {
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const proof = proveOmittedOwnerPaintRequest(entry, ...pair);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.coreDefectProven, false);
    assert.equal(proof.originalRasterCauseProven, false);
    counts[entry.family] = (counts[entry.family] ?? 0) + 1;
    if (!samples.has(entry.family)) samples.set(entry.family, { entry, pair, proof });
  }
  assert.deepEqual(counts, { badge: 52, 'bottom-sheet': 25 });
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '0a30ca894170b342e4521c01e4fcb23ed990d70cea789fe89bd4eba0baf663fb',
    indexSha256: 'edf9c2de34728dc874460796853460dd5d39bafd71d4db41cba257366ec50cc0',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyOmittedOwnerPaintRequests(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === 'reviewed-owner-paint-request-omission');
  assert.equal(changed.length, 2); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 77);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  const validate = values => validateOmittedOwnerPaintRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === 'reviewed-owner-paint-request-omission').reviewedCases.pop();
  assert.equal(validate(forged).length, 1);
  // Execute the production tail against the authenticated preceding checkpoint.
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  const start = source.indexOf('  const discrepancies =', source.indexOf('  const beforeOwnerOmissionReviews ='));
  const end = source.indexOf('  const classifications =', start);
  assert.ok(start > 0 && end > start);
  const tail = new Function('ownerInitialStyleBinding', 'beforeOwnerOmissionReviews', 'cases', 'elementInventory',
    'canonicalStyle', 'applyOwnerMaximumWidths', 'applyOmittedOwnerPaintRequests', 'applyBadgeMarginReviews',
    'applySliderMarginReviews', 'applyListSpacingReviews', 'applyHeadingVisibleOverflow', 'applyTabPanelOverflowBoundary',
    'applyTableVisibleOverflow', 'applyControlOverflowOwnerBoundaries', 'applyRangeVisibleOverflow', 'applyFocusShadowSubstitutions', 'applyCardShadowSyntax', 'applyMappedNonwidgetAppearance', 'applyRangeAppearanceInitial', 'applyAppearanceOwnerBoundaries', 'applySheetActionAppearance', 'applyTooltipWordBreakReview', 'applyStepperSpacingReviews', 'applyChipSpacingReviews', 'applyChoiceSpacingReviews', 'applyToolbarSpacingReviews', 'applyDialogActionSpacingReviews', 'applyDialogPanelGapReview', 'applyOverlayFlowReviews', 'applyPanelVisibilityOwnership', 'applyTooltipShrinkReviews', 'applyExpansionTreeFormattingReviews', 'applyRemainingBorderReviews', 'applyFinalOwnerStyleReviews', source.slice(start, end) + '\nreturn discrepancies;');
  const applies = [applyOwnerMaximumWidths, applyOmittedOwnerPaintRequests, applyBadgeMarginReviews, applySliderMarginReviews, applyListSpacingReviews, applyHeadingVisibleOverflow, applyTabPanelOverflowBoundary, applyTableVisibleOverflow, applyControlOverflowOwnerBoundaries, applyRangeVisibleOverflow, applyFocusShadowSubstitutions, applyCardShadowSyntax, applyMappedNonwidgetAppearance, applyRangeAppearanceInitial, applyAppearanceOwnerBoundaries, applySheetActionAppearance];
  applies.push(applyTooltipWordBreakReview, applyStepperSpacingReviews, applyChipSpacingReviews, applyChoiceSpacingReviews, applyToolbarSpacingReviews, applyDialogActionSpacingReviews, applyDialogPanelGapReview, applyOverlayFlowReviews, applyPanelVisibilityOwnership, applyTooltipShrinkReviews, applyExpansionTreeFormattingReviews, applyRemainingBorderReviews, applyFinalOwnerStyleReviews);
  const combined = tail({ status: 'bound' }, rows, cases, inventory, normalize, ...applies);
  assert.deepEqual(combined, [...applies].reverse().reduce((values, apply) => apply(values, cases, inventory, normalize), rows));
  const batch = combined.filter((r, i) => r !== rows[i]);
  assert.equal(batch.length, 118); assert.equal(batch.reduce((sum, r) => sum + r.occurrences, 0), 5916);
  assert.deepEqual(combined.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!batch.includes(combined[i])) assert.deepEqual(combined[i], rows[i]);
  assert.deepEqual(validate(combined), []);
  assert.deepEqual(validateOwnerMaximumWidths(combined, rows, cases, inventory, normalize), []);
  for (const validate of [validateBadgeMarginReviews, validateSliderMarginReviews, validateListSpacingReviews, validateHeadingVisibleOverflow, validateTabPanelOverflowBoundary, validateTableVisibleOverflow, validateControlOverflowOwnerBoundaries, validateRangeVisibleOverflow, validateFocusShadowSubstitutions, validateCardShadowSyntax, validateMappedNonwidgetAppearance, validateRangeAppearanceInitial, validateAppearanceOwnerBoundaries, validateSheetActionAppearance])
    assert.deepEqual(validate(combined, rows, cases, inventory, normalize), []);
  assert.equal(tail({ status: 'unbound' }, rows, cases, inventory, normalize,
    ...applies.map(() => () => assert.fail('unbound owner review ran'))), rows);
  for (const name of ['validateOwnerMaximumWidths', 'validateOmittedOwnerPaintRequests', 'validateBadgeMarginReviews', 'validateSliderMarginReviews', 'validateListSpacingReviews', 'validateHeadingVisibleOverflow', 'validateTabPanelOverflowBoundary', 'validateTableVisibleOverflow', 'validateControlOverflowOwnerBoundaries', 'validateRangeVisibleOverflow', 'validateFocusShadowSubstitutions', 'validateCardShadowSyntax', 'validateMappedNonwidgetAppearance', 'validateRangeAppearanceInitial', 'validateAppearanceOwnerBoundaries', 'validateSheetActionAppearance'])
    assert.ok(source.includes(`errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));`));
  assert.ok(source.includes("errors.push('owner omission review attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('spacing composition review attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('heading and tab overflow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('table and control overflow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('shadow attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('mapped non-widget appearance attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('range appearance attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('appearance owner attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('sheet appearance attribution lacks bound original cases')"));
  assert.ok(source.includes("errors.push('tooltip word-break attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateTooltipWordBreakReview(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateTooltipWordBreakReview(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('stepper spacing attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateStepperSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateStepperSpacingReviews(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('chip spacing attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateChipSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateChipSpacingReviews(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('choice spacing attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateChoiceSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateChoiceSpacingReviews(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('toolbar spacing attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateToolbarSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateToolbarSpacingReviews(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('dialog action spacing attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateDialogActionSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateDialogActionSpacingReviews(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('dialog panel gap attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateDialogPanelGapReview(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateDialogPanelGapReview(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('overlay flow attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateOverlayFlowReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateOverlayFlowReviews(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('panel visibility attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validatePanelVisibilityOwnership(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validatePanelVisibilityOwnership(combined, rows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('tooltip shrink attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateTooltipShrinkReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(validateTooltipShrinkReviews(combined, rows, cases, inventory, normalize), []);
  const currentRows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '8fbd2e22dfd801587ce6c1dce90e6daba668171ae26eae0a9c834142a8bd0a43',
    indexSha256: '6f86d55a6ea6be0f1533ac893579bf517769061ed25a13812b0370c46b7c06e6',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const currentApplied = tail({ status: 'bound' }, currentRows, cases, inventory, normalize, ...applies);
  const currentBatch = currentApplied.filter((r, i) => r !== currentRows[i]);
  assert.equal(currentBatch.length, 98); assert.equal(currentBatch.reduce((n, r) => n + r.occurrences, 0), 4789);
  assert.deepEqual(currentApplied.map(raw), currentRows.map(raw));
  currentApplied.forEach((r, i) => { if (!currentBatch.includes(r)) assert.deepEqual(r, currentRows[i]); });
  const checkpointRows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const checkpointApplied = tail({ status: 'bound' }, checkpointRows, cases, inventory, normalize, ...applies);
  const checkpointBatch = checkpointApplied.filter((r, i) => r !== checkpointRows[i]);
  assert.equal(checkpointBatch.length, 63);
  assert.equal(checkpointBatch.reduce((n, r) => n + r.occurrences, 0), 2960);
  assert.deepEqual(checkpointBatch.filter(r => !inputDifferenceClassifications.includes(r.classification)), [], 'Every reviewed classification must be recognized by canonical validation');
  assert.equal(inputDifferenceClassifications.includes('unreviewed-limitation'), false);
  assert.equal(checkpointBatch.find(r => r.family === 'tooltip' && r.property === 'wordBreak').classification, 'documented-limitation');
  assert.ok(checkpointBatch.filter(r => r.family === 'tooltip' && r.property === 'flexShrink').every(r => r.classification === 'application-plugin-authoring-defect'));
  assert.deepEqual(checkpointApplied.map(raw), checkpointRows.map(raw));
  checkpointApplied.forEach((r, i) => { if (!checkpointBatch.includes(r)) assert.deepEqual(r, checkpointRows[i]); });
  assert.deepEqual(validateTooltipWordBreakReview(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateStepperSpacingReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateChipSpacingReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateChoiceSpacingReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateToolbarSpacingReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateDialogActionSpacingReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateDialogPanelGapReview(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateOverlayFlowReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validatePanelVisibilityOwnership(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  assert.deepEqual(validateTooltipShrinkReviews(checkpointApplied, checkpointRows, cases, inventory, normalize), []);
  const formattingRows = ['expansion', 'tree', 'button-toggle', 'divider', 'progress-bar', 'progress-spinner', 'icon'].flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const expandedRows = [...checkpointRows, ...formattingRows];
  const expanded = tail({ status: 'bound' }, expandedRows, cases, inventory, normalize, ...applies);
  const expandedBatch = expanded.filter((r, i) => r !== expandedRows[i]);
  assert.equal(expandedBatch.length, 75); assert.equal(expandedBatch.reduce((n, r) => n + r.occurrences, 0), 3528);
  assert.deepEqual(expanded.map(raw), expandedRows.map(raw));
  expanded.forEach((r, i) => { if (!expandedBatch.includes(r)) assert.deepEqual(r, expandedRows[i]); });
  assert.deepEqual(expanded, [...applies].reverse().reduce((values, apply) => apply(values, cases, inventory, normalize), expandedRows));
  assert.deepEqual(validateExpansionTreeFormattingReviews(expanded, expandedRows, cases, inventory, normalize), []);
  assert.deepEqual(validateRemainingBorderReviews(expanded, expandedRows, cases, inventory, normalize), []);
  assert.deepEqual(validateFinalOwnerStyleReviews(expanded, expandedRows, cases, inventory, normalize), []);
  assert.ok(source.includes("errors.push('final owner style attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateFinalOwnerStyleReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.ok(source.includes("errors.push('remaining border attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateRemainingBorderReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.ok(source.includes("errors.push('expansion/tree formatting attribution lacks bound original cases')"));
  assert.ok(source.includes('errors.push(...validateExpansionTreeFormattingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));'));
  assert.deepEqual(tail({ status: 'unbound' }, expandedRows, cases, inventory, normalize, ...applies.map(() => () => { throw new Error('unbound review'); })), expandedRows);
  for (const [family, { entry, pair, proof }] of samples) {
    const property = family === 'badge' ? 'textOverflow' : 'boxShadow';
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style][property] = 'none'; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle[property] = 'none'; },
      ([, a]) => { a.rules.push({ selector: '#' + owners[family], [property]: 'none' }); },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).authored.style = { all: 'initial' }; },
    ]) {
      const altered = structuredClone(pair); mutate(altered);
      assert.throws(() => proveOmittedOwnerPaintRequest(entry, ...altered));
    }
  }
});

test('disabled label colors reuse all 32 retained-stage proofs without filling omitted locals', () => {
  const evidence = collectDisabledLabelColorStages();
  assert.deepEqual(evidence, JSON.parse(readFileSync('docs/material-disabled-label-color-stages.json')));
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = ['checkbox', 'radio', 'expansion'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const result = applyDisabledLabelColorReview(rows, evidence);
  const changed = result.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 8); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 32);
  assert.equal(changed.flatMap(r => r.reviewEvidence.observations).filter(o => o.ownColorOmitted).length, 24);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  result.forEach((r, i) => assert.deepEqual(raw(r), raw(rows[i])));
  const missing = structuredClone(evidence); missing.observations.pop();
  assert.throws(() => applyDisabledLabelColorReview(rows, missing));
  const invented = structuredClone(evidence);
  invented.observations.find(o => o.candidateLocal === null).candidateLocal = 'rgba(29,27,32,1)';
  assert.throws(() => applyDisabledLabelColorReview(rows, invented));
  const equivalent = structuredClone(evidence); equivalent.observations[0].renderingEquivalent = true;
  assert.throws(() => applyDisabledLabelColorReview(rows, equivalent));
});

test('control paint preserves owner boundaries and all 397 captured observations', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), cases = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = ['tabs', 'card', 'dialog', 'toolbar', 'grid-list', 'button-toggle', 'bottom-sheet', 'divider', 'slider'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const stepperRows = queryFindings('artifacts/material-parity/working-audit', 'stepper', snapshot)
    .filter(r => r.evidence.section === 'discrepancies');
  const stepperCases = cases.filter(e => e.family === 'stepper');
  const retained = collectRetainedTypographyEvidence(stepperCases, inventory);
  const stepperResult = applyStepperLabelColorReview(stepperRows, stepperCases, retained, normalize);
  const changedStepper = stepperResult.filter((r, i) => r !== stepperRows[i]);
  assert.equal(changedStepper.length, 2); assert.equal(changedStepper.reduce((n, r) => n + r.occurrences, 0), 136);
  const lostRetained = structuredClone(retained);
  lostRetained.differences = lostRetained.differences.filter((p, i) => i !==
    retained.differences.findIndex(p => p.property === 'color' && p.attribution === 'reviewed-stepper-text-input'));
  assert.throws(() => applyStepperLabelColorReview(stepperRows, stepperCases, lostRetained, normalize));
  const filled = structuredClone(stepperCases);
  filled[0].styleInputs.find(i => i.id === 'step-details-text').astylar.color = '#000000';
  assert.throws(() => applyStepperLabelColorReview(stepperRows, filled, retained, normalize));
  const result = applyControlStatePaintReview(rows, cases, inventory, normalize);
  const reviewed = result.filter(r => [controlStatePaintAttribution, cardSurfacePaintAttribution, opaqueSurfacePaintAttribution,
    ...Object.values(specialPaintDefinitions).map(d => d.attribution)].includes(r.attribution));
  assert.equal(reviewed.length, 54); assert.equal(reviewed.reduce((n, r) => n + r.occurrences, 0), 397);
  const observations = reviewed.flatMap(r => r.reviewEvidence.observations);
  const ranges = observations.filter(o => o.defaultStageDivergence);
  assert.equal(ranges.length, 16);
  assert.ok(ranges.every(o => o.backgroundAuthoringEquivalent && o.originalInputLayersInvisible && !o.visibleThumbCauseProven));
  assert.equal(hash(readFileSync('artifacts/material-parity/range-background-default-public-5ee5ae4.log')),
    ranges[0].publicReductionLogSha256);
  for (const observation of ranges) {
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}/${e.state}` === observation.case);
    const input = entry.styleInputs.find(i => i.id === observation.element);
    const [r, a] = modalInventoryTrees(inventory, observation.case);
    const enabled = structuredClone(a);
    enabled.nodes.find(n => n.key === observation.astylarNode).authored.disabled = false;
    assert.throws(() => proveControlStatePaint(entry, input, r, enabled, normalize));
    const authored = structuredClone(r);
    authored.nodes.find(n => n.key === observation.referenceNode).inline.background = { value: 'transparent', important: false };
    assert.throws(() => proveControlStatePaint(entry, input, authored, a, normalize));
    const visible = structuredClone(input);
    visible.astylar.opacity = '1';
    assert.throws(() => proveControlStatePaint(entry, visible, r, a, normalize));
  }
  const tabs = observations.filter(o => o.element.startsWith('tab-'));
  assert.deepEqual(['0', '0.04', '0.12'].map(opacity => tabs.filter(o => o.nativeLayerOpacity === opacity).length), [8, 26, 8]);
  const cancel = observations.filter(o => o.element === 'dialog-cancel');
  assert.deepEqual(['0.08', '0.12'].map(opacity => cancel.filter(o => o.nativeLayerOpacity === opacity).length), [3, 5]);
  assert.equal(observations.filter(o => o.element === 'card-open').length, 24);
  assert.equal(observations.filter(o => o.element === 'card-primary').length, 13);
  const toolbar = observations.filter(o => o.element === 'toolbar-action');
  assert.equal(toolbar.length, 24); assert.ok(toolbar.every(o => o.candidateAuthoredRuleProjectionGaps.length === 1));
  assert.equal(toolbar.filter(o => o.candidateMatchedStateRules.length === 2).length, 8);
  assert.equal(observations.filter(o => o.nativeOwnPaintRequestAbsent).length, 172);
  assert.equal(observations.filter(o => o.nativeBackdrop).length, 25);
  assert.equal(observations.filter(o => o.candidateFillUnconditional).length, 25);
  assert.equal(observations.filter(o => o.flow).length, 24);
  const toggles = observations.filter(o => o.nativeFocusLayer);
  assert.equal(toggles.length, 24); assert.equal(toggles.filter(o => o.nativeRipples.length === 1).length, 8);
  assert.deepEqual(['rgb(29, 27, 32)', 'rgb(230, 225, 229)'].map(color =>
    toggles.filter(o => o.nativeLayerBackground === color).length), [18, 6]);
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  stepperResult.forEach((r, i) => assert.deepEqual(raw(r), raw(stepperRows[i])));
  for (let i = 0; i < rows.length; i++) {
    assert.deepEqual(raw(result[i]), raw(rows[i]));
    if (!reviewed.includes(result[i])) assert.deepEqual(result[i], rows[i]);
    else assert.equal(result[i].reviewEvidence.originalRowSha256, hash(JSON.stringify(rows[i])));
  }
  for (const element of ['tab-activity', 'card-open', 'dialog-cancel', 'card-primary', 'toolbar-action', 'grid-tile-one', 'button-toggle-primary',
    'bottom-sheet-dismiss', 'bottom-sheet-overlay', 'divider-primary', 'button-toggle-two']) {
    const observation = observations.find(o => o.element === element);
    const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === observation.case);
    const input = entry.styleInputs.find(i => i.id === element);
    const [r, a] = modalInventoryTrees(inventory, observation.case);
    const altered = structuredClone(a);
    altered.nodes.find(n => n.key === observation.astylarNode).resolvedStyle.background = '#000000';
    assert.throws(() => proveControlStatePaint(entry, input, r, altered, normalize));
    const changedRules = structuredClone(a);
    const selector = element === 'card-primary' ? '.material-card' : observation.candidatePaintRequest?.selector ?? observation.candidateMatchedStateRules[0].selector;
    changedRules.rules.find(rule => rule.selector === selector).background = '#000000';
    assert.throws(() => proveControlStatePaint(entry, input, r, changedRules, normalize));
    if (observation.nativeLayer) {
      const changedNative = structuredClone(r);
      const layer = changedNative.nodes.find(n => n.key === observation.nativeLayer);
      changedNative.styles[layer.pseudoElements.find(p => p.pseudo === '::before').style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeOwnPaintRequestAbsent) {
      const changedNative = structuredClone(r);
      changedNative.nodes.find(n => n.key === observation.referenceNode).inline.background = { value: 'white', important: false };
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeBackdrop) {
      const changedNative = structuredClone(r);
      changedNative.styles[changedNative.nodes.find(n => n.key === observation.nativeBackdrop).style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
    if (observation.nativeFocusLayer) {
      const changedNative = structuredClone(r);
      changedNative.styles[changedNative.nodes.find(n => n.key === observation.nativeFocusLayer).style].opacity = '0.5';
      assert.throws(() => proveControlStatePaint(entry, input, changedNative, a, normalize));
    }
  }
  const incomplete = structuredClone(rows), changedIndex = rows.findIndex(r => r.element === reviewed[0].element && r.property === 'backgroundColor' && r.attribution === 'unresolved');
  incomplete[changedIndex].occurrences++;
  assert.throws(() => applyControlStatePaintReview(incomplete, cases, inventory, normalize));
  const currentSnapshot = { generation: '04ec615b0e97cdc75f44b817efca421d24a79cb04d7bc1f2f22969b99a4c4240',
    indexSha256: '7698638b57da8d8c8f4bf50902886f11c3d3304e45078771917b804c6c30a075' };
  const allRows = [...new Set(cases.map(e => e.family))].flatMap(f =>
    queryFindings('artifacts/material-parity/working-audit', f, currentSnapshot)).filter(r => r.evidence.section === 'discrepancies');
  const sources = collectPaintReviewSources();
  const combined = applyPaintReviews(allRows, cases, inventory, retained, normalize, sources);
  const changed = combined.filter((r, i) => r !== allRows[i]);
  assert.equal(changed.length, 72); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 618);
  const population = {};
  for (const row of changed) {
    const count = population[row.attribution] ??= { groups: 0, observations: 0 };
    count.groups++; count.observations += row.occurrences;
  }
  assert.deepEqual(population, paintPopulation);
  combined.forEach((r, i) => { assert.deepEqual(raw(r), raw(allRows[i])); if (!isPaintReviewRow(r)) assert.deepEqual(r, allRows[i]); });
  assert.deepEqual(validatePaintReviews(JSON.parse(JSON.stringify(combined)), allRows, cases, inventory, retained, normalize, sources), []);
  assert.ok(validatePaintReviews(combined.filter(r => r !== changed[0]), allRows, cases, inventory, retained, normalize, sources).length);
  const fabricated = structuredClone(combined);
  fabricated.find(isPaintReviewRow).reviewEvidence.renderingEquivalent = true;
  assert.ok(validatePaintReviews(fabricated, allRows, cases, inventory, retained, normalize, sources).length);
});

// Append-only: retain every published proof body and its line anchors above.
test('retained chip focus indicators do not establish a visible missing outline', () => {
  const bytes = readFileSync('artifacts/material-parity/chip-focus-indicator-retained-inputs-20261020.log');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '3df845222863b4a52e7a3e4cccd3f629ae3343707029114bb7fbe075fa2da3b1');
  const original = JSON.parse(bytes.toString().replace(/^\uFEFF/, ''));
  const verify = result => {
    assert.equal(result.cases, 76); assert.equal(result.owners, 152);
    assert.equal(result.report.sha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
    assert.equal(result.groups.reduce((sum, group) => sum + group.count, 0), 152);
    let generated = 0, absent = 0;
    for (const group of result.groups) {
      assert.equal(group.position, 'absolute'); assert.equal(group.pointerEvents, 'none');
      assert.equal(group.background, 'rgba(0, 0, 0, 0)');
      assert.equal(group.border, '0px'); assert.equal(group.boxShadow, 'none');
      assert.equal(group.pseudo.length, 1);
      const pseudo = group.pseudo[0]; assert.equal(pseudo.pseudo, '::before');
      if (pseudo.generated) {
        generated += group.count;
        assert.equal(pseudo.style.display, 'none');
        assert.equal(pseudo.style.borderTopWidth, '3px');
        assert.equal(pseudo.style.borderTopColor, 'rgba(0, 0, 0, 0)');
      } else { absent += group.count; assert.equal(pseudo.style, null); }
    }
    assert.deepEqual({ generated, absent }, { generated: 40, absent: 112 });
    assert.match(result.boundary, /No candidate pixel or current runtime acceptance/);
  };
  verify(original);
  for (const mutate of [
    r => r.groups.find(g => g.pseudo[0].generated).pseudo[0].style.display = 'block',
    r => r.groups.find(g => g.pseudo[0].generated).pseudo[0].style.borderTopColor = 'black',
    r => r.groups[0].count++,
    r => r.boundary = 'Current rendering accepted',
  ]) { const altered = structuredClone(original); mutate(altered); assert.throws(() => verify(altered)); }
});

test('retained chip state paint preserves separate native alpha layers and opaque host substitutions', () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/chip-state-layer-retained-inputs-20261020.log');
  assert.equal(hash(bytes), '725676d749bfd6a9c75a89b7e3dea0ca35438b568861eca21a91ce0f2945a997');
  const original = JSON.parse(bytes.toString().replace(/^\uFEFF/, ''));
  const reportBytes = readFileSync(original.report.file); assert.equal(hash(reportBytes), original.report.sha256);
  assert.equal(original.report.sha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const cases = report.interactions.filter(e => e.family === 'chips' && ['focus', 'hover', 'held'].includes(e.state));
  const identity = row => `${row.profile}/${typeof row.viewport === 'string' ? row.viewport : row.viewport.id}/${row.state}`;
  const expectedCases = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => ['desktop-dpr1', 'desktop-dpr2']
    .flatMap(viewport => ['focus', 'hover', 'held'].map(state => `${profile}/${viewport}/${state}`))).sort();
  assert.deepEqual(cases.map(identity).sort(), expectedCases);
  const source = readFileSync(original.component.file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(source), original.component.normalizedSha256);
  assert.equal(original.component.normalizedSha256, 'b493a355679903f988e29f0dafbb95d2d6cce41275302fce5c978ae55f423b9f');
  assert.equal(/selector: '\.chip[^']*:focus/.test(source), false);
  const history = execFileSync('git', ['-c', 'gc.auto=0', '-c', 'maintenance.auto=false', 'show',
    'ae9cdad226ea19f05c0a791e4fba23e8de5f60a0', '--', original.component.file], { encoding: 'utf8' });
  for (const rule of [
    "{ selector: '.chip:hover', background: mixHex(theme.surfaceContainer, theme.onSurface, .08) }",
    "{ selector: '.chip:active', background: mixHex(theme.surfaceContainer, theme.onSurface, .12) }",
    "{ selector: '.chip.selected:hover', background: mixHex('#eadef7', '#4b4357', .08) }",
    "{ selector: '.chip.selected:active', background: mixHex('#eadef7', '#4b4357', .12) }",
  ]) {
    assert.ok(source.includes(rule));
    assert.ok(history.split(/\r?\n/).some(line => line.startsWith('+') && line.includes(rule)));
  }
  const runner = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  assert.ok(runner.includes("if (family !== 'button' || state !== 'activate-leave') return { matches: true };"));
  const verify = result => {
    assert.equal(result.cases, 24); assert.equal(result.authenticatedTrees, 48);
    assert.deepEqual(result.observations.map(identity).sort(), expectedCases);
    assert.match(result.boundary, /not a local-paint measurement/);
    for (const row of result.observations) {
      const entry = cases.find(c => identity(c) === identity(row)); assert.ok(entry);
      assert.deepEqual(row.treeReceipts, entry.inputTrees);
      const trees = Object.fromEntries(Object.entries(row.treeReceipts).map(([side, receipt]) => {
        const data = readFileSync(receipt.file); assert.equal(hash(data), receipt.sha256);
        const tree = JSON.parse(data); assert.deepEqual(tree.errors, []); return [side, tree];
      }));
      const host = trees.reference.nodes.find(n => n.attributes?.id === 'chip-0');
      const layer = trees.reference.nodes.find(n => n.key === row.reference.key);
      assert.equal(layer.parent, host.key); assert.equal(row.reference.parent, host.key);
      assert.equal(layer.attributes.class, 'mat-mdc-chip-focus-overlay');
      const native = trees.reference.styles[layer.style];
      assert.equal(row.reference.background, native.backgroundColor);
      assert.equal(row.reference.opacity, native.opacity);
      assert.equal(native.backgroundColor, row.state === 'hover' ? 'rgb(73, 69, 78)' : 'rgb(75, 67, 87)');
      assert.equal(native.opacity, row.state === 'hover' ? '0.08' : '0.12');
      const candidate = trees.astylar.nodes.find(n => n.key === row.candidate.key);
      assert.equal(candidate.authored.id, 'chip-0');
      assert.deepEqual(row.candidate.children, ['chip-0-mark', 'chip-0-label']);
      assert.deepEqual(trees.astylar.nodes.filter(n => n.parent === candidate.key).map(n => n.authored.id), row.candidate.children);
      for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
        for (const property of ['background', 'opacity', 'borderRadius', 'width', 'height'])
          assert.equal(row.candidate.stages[stage][property], candidate[stage][property] ?? null);
      }
      const actual = row.candidate.stages.interactionResolvedStyle;
      assert.equal(actual.background, { focus: '#eadef7', hover: '#ddd2ea', held: '#d7cbe4' }[row.state]);
      assert.equal(actual.opacity, '1.0');
      assert.equal(native.height, ['light', 'dark'].includes(row.profile) ? '32px' : '24px');
      assert.equal(actual.height, native.height);
      assert.deepEqual(row.recordedStatePaint, { matches: true }); // Default, not measured parity.
    }
  };
  verify(original);
  for (const mutate of [
    r => r.observations.pop(),
    r => r.observations[0].reference.opacity = '0',
    r => r.observations[0].candidate.stages.interactionResolvedStyle.background = '#000000',
    r => r.observations[0].candidate.children.push('invented-state-layer'),
    r => r.observations[0].treeReceipts.reference.sha256 = '0'.repeat(64),
    r => r.boundary = 'Current rendering accepted',
  ]) { const altered = structuredClone(original); mutate(altered); assert.throws(() => verify(altered)); }
});
