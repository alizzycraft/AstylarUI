import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { collectCalendarCloseEvidence } from './calendar-close-evidence.mjs';
import { collectTooltipStateEvidence } from './tooltip-state-evidence.mjs';
import { supplementalLineBoxSequences, supplementalLineBoxCaseKey as caseKey } from './supplemental-line-box-evidence.mjs';
import { validateControlLineBoxMeasurement } from './control-line-box-validation.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const identity = item => JSON.stringify([item.case, item.element, item.referenceNode]);
const captureFiles = ['scripts/audit-material-supplemental-line-boxes.mjs',
  'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'];
const measurementFiles = ['tests/material-parity/supplemental-line-box-evidence.mjs',
  'tests/material-parity/control-line-box-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
  'tests/material-parity/input-equivalence-policy.mjs', 'tests/material-parity/calendar-close-evidence.mjs',
  'tests/material-parity/tooltip-state-evidence.mjs'];
const hasClass = (node, name) => String(node.attributes?.class ?? '').split(/\s+/).includes(name);

// Validate observations, never derive a natural height from candidate paint or
// borrow an observation from a main-checkpoint state with a similar name.
export function loadSupplementalLineBoxReport({ root = process.cwd(), reportPath, cases, inventory,
  controlTypography, expectedProvenance, styleProperties, readBytes }) {
  const selectedCases = cases.filter(item => item.kind === 'supplemental' &&
    ((item.family === 'datepicker' && item.state.startsWith('calendar-close-')) ||
     (item.family === 'tooltip' && item.state.startsWith('tooltip-state-'))));
  const selectedKeys = new Set(selectedCases.map(caseKey));
  const targets = controlTypography.comparisons.filter(item => selectedKeys.has(item.case) && item.properties.lineHeight.reference === 'normal');
  const pending = targets.map(item => ({ case: item.case, element: item.element, referenceNode: item.referenceNode }));
  const result = { schemaVersion: 1, file: reportPath, observations: [], missing: pending, errors: [],
    scope: 'Validated supplemental reference CSS natural line boxes. No input-equivalence, overlay, interaction, visibility, baseline or raster verdict.' };
  if (reportPath === undefined) return result;
  try {
    assert.ok(expectedProvenance?.browser, 'missing selected-run provenance');
    assert.deepEqual(inventory.errors, [], 'invalid selected input inventory');
    const sequences = supplementalLineBoxSequences(selectedCases);
    assert.equal(new Set(targets.map(identity)).size, targets.length, 'duplicate target identity');
    const resolve = (file, source = false) => {
      assert.equal(typeof file, 'string', 'missing evidence path');
      const absolute = path.resolve(root, file), boundary = path.resolve(root, source ? '.' : 'artifacts/material-parity');
      assert.ok(absolute.startsWith(boundary + path.sep), 'evidence path escapes boundary');
      if (!readBytes) assert.ok(realpathSync(absolute).startsWith(realpathSync(boundary) + path.sep), 'evidence symlink escapes boundary');
      return absolute;
    };
    const read = (file, source = false) => (readBytes ?? readFileSync)(resolve(file, source));
    const hashed = (item, source = false) => {
      assert.match(item?.sha256 ?? '', /^[a-f0-9]{64}$/, 'missing evidence digest');
      const bytes = read(item.file, source);
      assert.equal(digest(bytes), item.sha256, `changed evidence: ${item.file}`); return bytes;
    };
    const bytes = read(reportPath), raw = JSON.parse(bytes); result.sha256 = digest(bytes);
    assert.equal(raw.schemaVersion, 1); assert.equal(raw.capture?.schemaVersion, 1);
    assert.equal(raw.browser, expectedProvenance.browser, 'changed browser');
    const manifest = JSON.parse(hashed(raw.capture.checkpointManifest));
    assert.equal(manifest.schemaVersion, 1);
    assert.deepEqual(manifest.provenance, expectedProvenance, 'different capture run');
    assert.deepEqual(raw.capture.styleProperties, styleProperties, 'changed captured style set');
    assert.deepEqual(raw.capture.sources.map(s => s.file).sort(), [...captureFiles].sort(), 'changed capture sources');
    for (const item of raw.capture.sources) hashed(item, true);
    assert.deepEqual(raw.measurementSources.map(s => s.file).sort(), [...measurementFiles].sort(), 'changed measurement sources');
    for (const item of raw.measurementSources) {
      assert.equal(path.dirname(resolve(item.snapshot)), path.dirname(resolve(reportPath)), 'snapshot outside report directory');
      assert.equal(path.basename(item.snapshot), `source-${item.sha256}.txt`, 'changed snapshot filename');
      hashed({ file: item.snapshot, sha256: item.sha256 });
      // Archived selector/report code is retained, never executed. Measurement
      // and action-driving implementations must remain the reviewed originals.
      if (measurementFiles.slice(0, 2).includes(item.file)) hashed(item, true);
    }
    assert.equal(raw.sourceReports?.length, 2, 'missing original source reports');
    const originalSources = [collectCalendarCloseEvidence, collectTooltipStateEvidence].map((collect, index) => {
      const source = raw.sourceReports[index]; hashed(source);
      const original = collect(root, { reportPath: source.file, expectedProvenance, readBytes });
      assert.equal(original.complete, true, 'invalid original supplemental report');
      assert.deepEqual(original.errors, [], 'original supplemental evidence errors');
      assert.equal(original.sha256, source.sha256, 'original report digest mismatch'); return original;
    });
    const originals = new Map(originalSources.flatMap(s => s.cases).map(c => [caseKey(c), c]));
    assert.equal(originals.size, selectedCases.length, 'changed original case count');
    for (const selected of selectedCases)
      assert.deepEqual(selected, originals.get(caseKey(selected)), 'selected case differs from original supplemental capture');
    const assets = new Map(expectedProvenance.browserFiles.map(a => [a.file, a.sha256]));
    assert.equal(assets.size, expectedProvenance.browserFiles.length, 'duplicate expected asset');
    const ordered = sequences.flatMap(sequence => sequence.entries);
    assert.deepEqual(raw.results?.map(r => r.case), ordered.map(caseKey), 'incomplete or reordered captured boundaries');
    assert.equal(raw.cases, ordered.length, 'changed case count');
    const targetMap = new Map(targets.map(t => [identity(t), t])), seen = new Set(), observations = [];
    let ordinal = 0;
    for (const sequence of sequences) {
      let previous;
      for (const [actionIndex, selected] of sequence.entries.entries()) {
        const index = raw.results[ordinal++], key = caseKey(selected);
        const sameDirectory = (item, suffix) => {
          assert.equal(path.dirname(resolve(item.file)), path.dirname(resolve(reportPath)), 'observation outside report directory');
          assert.equal(path.basename(item.file), `${digest(key)}${suffix}`, 'changed observation filename');
        };
        sameDirectory(index, '.json'); const evidence = JSON.parse(hashed(index));
        assert.equal(evidence.case, key, 'changed case identity');
        for (const field of ['family', 'profile', 'state', 'viewport'])
          assert.deepEqual(evidence[field], selected[field], `changed case ${field}`);
        assert.equal(evidence.query, sequence.query, 'changed original query');
        assert.equal(evidence.view, sequence.view ?? null); assert.equal(evidence.cohort, sequence.cohort ?? null);
        assert.equal(evidence.actionIndex, actionIndex, 'changed action boundary');
        assert.deepEqual(evidence.originalInputTrees, selected.inputTrees, 'changed original paired trees');
        for (const side of ['reference', 'astylar']) hashed(evidence.originalInputTrees[side]);
        sameDirectory(evidence.inputTree, '-reference.json'); sameDirectory(evidence.screenshot, '.png');
        const fresh = JSON.parse(hashed(evidence.inputTree)), png = Buffer.from(hashed(evidence.screenshot));
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'invalid PNG');
        assert.equal(png.subarray(12, 16).toString(), 'IHDR', 'missing PNG dimensions');
        assert.equal(png.readUInt32BE(16), selected.viewport.width * selected.viewport.deviceScaleFactor, 'changed PNG width');
        assert.equal(png.readUInt32BE(20), selected.viewport.height * selected.viewport.deviceScaleFactor, 'changed PNG height');
        assert.equal(fresh.schemaVersion, 1); assert.deepEqual(fresh.errors, [], 'invalid fresh tree');
        assert.equal(new Set(fresh.nodes.map(n => n.key)).size, fresh.nodes.length, 'duplicate fresh node');
        assert.deepEqual(evidence.runtime?.errors, [], 'missing runtime or runtime errors');
        for (const type of ['document', 'script', 'stylesheet', 'font'])
          assert.ok(evidence.runtime.assets.some(a => a.type === type), `missing runtime ${type}`);
        for (const asset of evidence.runtime.assets) {
          assert.ok(['document', 'script', 'stylesheet', 'font'].includes(asset.type), 'unexpected runtime asset');
          assert.match(asset.sha256 ?? '', /^[a-f0-9]{64}$/);
          assert.equal(asset.sha256, assets.get(asset.file), 'changed served asset');
        }
        validateSupplementalLineBoxBoundary({ evidence, selected, actionIndex, previous, fresh });
        previous = evidence;
        const maps = inventory.cases.filter(c => c.case === key && c.side === 'reference');
        assert.equal(maps.length, 1, 'ambiguous original reference inventory');
        const original = inventory.variants[maps[0].variant];
        const expectedTargets = targets.filter(t => t.case === key);
        assert.ok(Array.isArray(evidence.measurements));
        assert.equal(evidence.measurements.length, expectedTargets.length, 'changed per-boundary target count');
        assert.equal(index.observations, expectedTargets.length, 'changed index observation count');
        for (const measurement of evidence.measurements) {
          const id = identity({ ...measurement, case: key }), target = targetMap.get(id);
          assert.ok(target, 'unmapped metric'); assert.ok(!seen.has(id), 'duplicate metric'); seen.add(id);
          validateControlLineBoxMeasurement({ measurement, target, fresh, original, inventory, selected });
          observations.push({ ...measurement, case: key, evidence: { file: index.file, sha256: index.sha256,
            inputTree: evidence.inputTree, screenshot: evidence.screenshot, originalInputTrees: evidence.originalInputTrees,
            sourceReports: raw.sourceReports, capture: raw.capture, measurementSources: raw.measurementSources } });
        }
      }
    }
    assert.equal(observations.length, targets.length, 'missing target observations');
    assert.equal(raw.observations, observations.length, 'changed total observation count');
    result.observations = observations; result.missing = [];
  } catch (error) { result.errors.push(String(error)); }
  return result;
}

// Action evidence is cumulative within each original sequence. Validate both
// that prefix and the observed state; equal line heights cannot waive either.
export function validateSupplementalLineBoxBoundary({ evidence, selected, actionIndex, previous, fresh }) {
  assert.ok(Number.isInteger(actionIndex) && actionIndex >= 0 && actionIndex < 5, 'invalid boundary');
  assert.ok(Array.isArray(evidence.events), 'missing action trace');
  assert.equal(typeof evidence.activeId, 'string', 'missing observed focus');
  for (const field of ['calendarOpen', 'activeIsClose', 'openerFocused', 'tooltipPresent', 'tooltipShown'])
    assert.equal(typeof evidence[field], 'boolean', `missing state ${field}`);
  for (const event of evidence.events) {
    assert.ok(['pointermove', 'pointerover', 'pointerout', 'pointerdown', 'pointerup', 'click', 'keydown', 'focusin', 'focusout'].includes(event.type), 'unexpected event');
    assert.equal(event.trusted, true, 'untrusted event');
    assert.equal(typeof event.id, 'string'); assert.equal(typeof event.tag, 'string');
    if (event.type.startsWith('pointer') || event.type === 'click')
      assert.ok(Number.isFinite(event.clientX) && Number.isFinite(event.clientY), 'missing pointer coordinates');
  }
  if (actionIndex > 0) {
    assert.ok(previous, 'missing preceding boundary');
    assert.deepEqual(evidence.events.slice(0, previous.events.length), previous.events, 'changed cumulative event prefix');
  } else assert.equal(previous, undefined, 'sequence did not reset');
  if (selected.family === 'datepicker') {
    assert.equal(evidence.triggerBox, null);
    assert.equal(evidence.calendarOpen, selected.reference.open);
    assert.equal(evidence.activeIsClose, selected.reference.activeIsClose);
    assert.equal(evidence.openerFocused, selected.reference.openerFocused);
    assert.equal(fresh.nodes.filter(n => n.type === 'mat-datepicker-content').length, evidence.calendarOpen ? 1 : 0, 'calendar tree contradicts state');
    assert.equal(evidence.tooltipPresent, false); assert.equal(evidence.tooltipShown, false);
    const expectedKeys = [[], ['Tab'], ['Tab', 'Shift', 'Tab'], ['Tab', 'Shift', 'Tab', 'Tab'], ['Tab', 'Shift', 'Tab', 'Tab', 'Enter']][actionIndex];
    assert.deepEqual(evidence.events.filter(e => e.type === 'keydown').map(e => e.key), expectedKeys, 'changed calendar key sequence');
    const activations = evidence.events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type)).map(e => e.type);
    const expected = Array.from({ length: selected.view === 'multi-year' ? 2 : 1 }, () => ['pointerdown', 'pointerup', 'click']).flat();
    if (actionIndex === 4) expected.push('click');
    assert.deepEqual(activations, expected, 'changed calendar activation sequence');
  } else {
    assert.equal(selected.family, 'tooltip');
    for (const field of ['calendarOpen', 'activeIsClose', 'openerFocused']) assert.equal(evidence[field], false);
    assert.equal(Number(evidence.tooltipPresent), selected.reference.popupCount);
    assert.equal(evidence.tooltipShown, selected.reference.referenceShown);
    assert.equal(fresh.nodes.filter(n => hasClass(n, 'mat-mdc-tooltip-surface')).length, Number(evidence.tooltipPresent), 'tooltip tree contradicts state');
    const box = evidence.triggerBox;
    assert.ok(box && ['x', 'y', 'width', 'height'].every(p => Number.isFinite(box[p])) && box.width > 0 && box.height > 0, 'invalid trigger box');
    if (previous) assert.deepEqual(box, previous.triggerBox, 'changed trigger box');
    const trigger = fresh.nodes.filter(n => n.attributes?.id === 'tooltip-primary');
    assert.equal(trigger.length, 1, 'ambiguous trigger owner');
    assert.equal(trigger[0].type, 'button');
    assert.equal(trigger[0].attributes.mattooltip, 'Create a project');
    assert.deepEqual(box, selected.reference.triggerBox, 'trigger box differs from original capture');
    assert.equal(evidence.activeId, actionIndex < 2 ? '' : 'tooltip-primary', 'changed trigger focus');
    assert.equal(evidence.events.filter(e => e.type === 'keydown').length, 0, 'unexpected tooltip keyboard input');
    const activations = evidence.events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
    assert.deepEqual(activations.map(e => e.type), actionIndex < 2 ? [] : actionIndex === 2 ? ['pointerdown'] : ['pointerdown', 'pointerup', 'click'], 'changed tooltip activation sequence');
    for (const event of activations) assert.ok(Math.abs(event.clientX - box.x - box.width / 2) < 1 && Math.abs(event.clientY - box.y - box.height / 2) < 1, 'activation outside trigger center');
    const moves = evidence.events.filter(e => e.type === 'pointermove');
    assert.equal(moves.length, actionIndex === 0 ? 0 : actionIndex === 4 ? 2 : 1, 'changed tooltip move sequence');
    if (moves.length) {
      assert.equal(moves[0].clientX, box.x + box.width / 2); assert.equal(moves[0].clientY, box.y + box.height / 2);
    }
    if (actionIndex === 4) { assert.equal(moves[1].clientX, 1); assert.equal(moves[1].clientY, 1); }
  }
}
