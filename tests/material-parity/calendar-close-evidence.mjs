import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';

const script = 'scripts/audit-material-calendar-close.mjs';
const states = ['opened', 'tab-close', 'blur-close', 'refocus-close', 'activate-close'];
const keys = [null, 'Tab', 'Shift+Tab', 'Tab', 'Enter'];
const hasClass = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);
const closeText = value => typeof value === 'string' && /close\s+calendar/i.test(value);
const requiredCases = ['month/1', 'month/2', 'multi-year/1', 'multi-year/2'];

export function collectCalendarCloseEvidence(root, options = {}) {
  const absolute = path.resolve(root, options.reportPath ?? path.join(options.supplementalRoot ??
    'artifacts/material-parity', 'calendar-close-audit', 'latest-report.json'));
  const file = path.relative(root, absolute).replaceAll('\\', '/');
  const missing = { file, binding: { status: 'missing', errors: [] }, complete: false,
    cases: [], reviews: [], mismatches: [], missing: [...requiredCases], errors: [] };
  try {
    const boundary = path.resolve(root, 'artifacts/material-parity');
    const inside = (base, target) => {
      const relative = path.relative(base, target);
      return relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
    };
    assert.ok(inside(boundary, absolute), 'Calendar evidence must remain inside Material artifacts');
    if (!options.readBytes) assert.ok(inside(realpathSync(boundary), realpathSync(absolute)), 'Calendar report symlink escapes artifacts');
    const bytes = (options.readBytes ?? readFileSync)(absolute), raw = JSON.parse(bytes);
    const validation = validateCalendarCloseCapture(raw, { ...options, root, reportFile: file });
    const cases = validation.complete ? raw.results.flatMap(entry => entry.sides.reference.samples.map((reference, index) => {
      const astylar = entry.sides.astylar.samples[index];
      return { kind: 'supplemental', family: 'datepicker', profile: raw.profile,
        viewport: { ...raw.viewport, deviceScaleFactor: entry.deviceScaleFactor, id: `calendar-close-desktop-dpr${entry.deviceScaleFactor}` },
        state: `calendar-close-${entry.view}-${reference.state}`, view: entry.view, action: reference.key,
        reference, astylar, inputTrees: { reference: reference.inputTree, astylar: astylar.inputTree },
        inputEquivalent: false, finalRasterVerified: false };
    })) : [];
    return { file, sha256: createHash('sha256').update(bytes).digest('hex'), browser: raw.browser,
      capture: raw.capture, binding: validation.binding ?? { status: 'invalid', errors: [] },
      complete: validation.complete, cases, reviews: validation.cases,
      mismatches: validation.cases.map(review => ({ ...review,
        justification: 'The reference keyboard close control is authored, revealed on focus, hidden on blur and activated with Enter; the candidate does not author its counterpart and remains open after the same sequence. This is unequal control input, not an equal-input core rendering failure.' })),
      missing: validation.complete ? [] : [...requiredCases], errors: validation.errors };
  } catch (error) {
    if (error.code === 'ENOENT') return missing;
    return { ...missing, binding: { status: 'invalid', errors: [{ error: String(error.message) }] }, errors: [String(error.message)] };
  }
}

// Deliberately validates the observed omission, not hypothetical fixed behavior.
// A changed fixture or trace must be investigated rather than accepted by a
// blanket missing-control waiver. This is not final raster verification.
export function validateCalendarCloseCapture(raw, options) {
  const errors = [], cases = [];
  let binding;
  try {
    assert.equal(raw.schemaVersion, 1);
    assert.equal(raw.profile, 'light');
    assert.deepEqual(raw.viewport, { width: 1440, height: 900 });
    assert.equal(raw.results?.length, 4, 'Require both views at DPR 1 and 2');
    const expected = new Set(requiredCases);
    const flattened = [];
    for (const entry of raw.results) {
      const key = `${entry.view}/${entry.deviceScaleFactor}`;
      assert.ok(expected.delete(key), `Unexpected or repeated case ${key}`);
      assert.equal(entry.family, 'datepicker');
      for (const side of ['reference', 'astylar']) {
        assert.deepEqual(entry.sides?.[side]?.samples?.map(s => s.state), states, `Incomplete ${key}/${side} action boundaries`);
        assert.deepEqual(entry.sides[side].samples.map(s => s.key), keys);
      }
      for (let index = 0; index < states.length; index++) flattened.push(Object.fromEntries(['reference', 'astylar'].map(side =>
        [side, { runtime: entry.sides[side].runtime, inputTree: entry.sides[side].samples[index].inputTree }])));
    }
    binding = validateSupplementalCapture({ ...raw, results: flattened }, { ...options, script,
      styleProperties: Object.values(propertyGroups).flat() });
    assert.equal(binding.status, 'checkpoint-bound', JSON.stringify(binding.errors));
    const directory = path.dirname(path.resolve(options.root ?? process.cwd(), options.reportFile));
    const read = item => {
      const absolute = path.resolve(options.root ?? process.cwd(), item?.file ?? '');
      assert.equal(path.dirname(absolute), directory, 'Artifact belongs to another directory');
      if (!options.readBytes) assert.equal(path.dirname(realpathSync(absolute)), realpathSync(directory), 'Artifact symlink escapes directory');
      const bytes = (options.readBytes ?? readFileSync)(absolute);
      assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, 'Changed artifact bytes');
      return bytes;
    };
    const files = new Set();
    for (const entry of raw.results) {
      for (const side of ['reference', 'astylar']) {
        const samples = entry.sides[side].samples;
        for (const [index, sample] of samples.entries()) {
          const name = `${entry.view}/${entry.deviceScaleFactor}/${side}/${sample.state}`;
          assert.equal(typeof sample.open, 'boolean', name);
          assert.equal(typeof sample.openerFocused, 'boolean', name);
          assert.equal(typeof sample.activeIsClose, 'boolean', name);
          assert.ok(sample.active?.tag && Array.isArray(sample.controls), name);
          assert.ok(Array.isArray(sample.events) && sample.events.length, `Missing real events ${name}`);
          if (index > 0) {
            const previous = samples[index - 1].events;
            assert.deepEqual(sample.events.slice(0, previous.length), previous, 'Event history changed');
            assert.ok(sample.events.slice(previous.length).some(e => e.type === 'keydown' && e.trusted === true &&
              e.key === (index === 4 ? 'Enter' : 'Tab')), `Missing real key ${name}`);
          }
          assert.ok(!files.has(sample.screenshot?.file), 'Duplicate screenshot');
          files.add(sample.screenshot.file);
          const png = read(sample.screenshot);
          assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Missing PNG');
          assert.equal(png.readUInt32BE(16), 1440 * entry.deviceScaleFactor, 'Wrong screenshot width/DPR');
          assert.equal(png.readUInt32BE(20), 900 * entry.deviceScaleFactor, 'Wrong screenshot height/DPR');
          const tree = JSON.parse(read(sample.inputTree));
          assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length, 'Ambiguous node keys');
          if (side === 'reference') {
            const controls = tree.nodes.filter(n => n.type === 'button' && hasClass(n, 'mat-datepicker-close-button'));
            assert.equal(controls.length, index === 4 ? 0 : 1, `Wrong reference close owner ${name}`);
            if (index === 4) {
              assert.equal(sample.close, null);
              assert.equal(sample.open, false);
              assert.equal(sample.openerFocused, true);
              assert.equal(sample.activeIsClose, false);
              assert.equal(sample.active.label, 'Open calendar');
              const events = sample.events.slice(samples[index - 1].events.length);
              assert.ok(events.some(e => e.type === 'keydown' && e.key === 'Enter' && e.close && e.trusted));
              assert.ok(events.some(e => e.type === 'click' && e.close && e.trusted));
            } else {
              const control = controls[0], style = tree.styles[control.style], focused = index === 1 || index === 3;
              const dialog = tree.nodes.find(n => n.key === control.parent);
              assert.ok(dialog?.attributes?.role === 'dialog' && dialog.attributes['aria-modal'] === 'true' &&
                hasClass(dialog, 'mat-datepicker-content-container'), 'Close control has wrong dialog owner');
              assert.equal(control.attributes.type, 'button');
              assert.equal(control.attributes.disabled, undefined);
              assert.equal(tree.nodes.filter(n => n.type === (entry.view === 'month' ? 'mat-month-view' : 'mat-multi-year-view')).length, 1,
                'Reference view differs from case');
              const labels = tree.nodes.filter(n => n.parent === control.key && hasClass(n, 'mdc-button__label'));
              assert.equal(labels.length, 1);
              assert.equal(labels[0].ownText.trim(), 'Close calendar');
              assert.equal(sample.close?.text, 'Close calendar');
              assert.equal(sample.open, true);
              assert.equal(sample.openerFocused, false);
              assert.equal(sample.activeIsClose, focused);
              assert.equal(style.clip, focused ? 'auto' : 'rect(0px, 0px, 0px, 0px)');
              assert.equal(sample.close.clip, style.clip);
              assert.equal(hasClass(control, 'cdk-visually-hidden'), !focused);
              assert.equal(sample.close.position, 'absolute');
              // Absolute positioning blockifies the authored inline-flex box.
              assert.equal(sample.close.display, 'flex');
              assert.equal(sample.close.visibility, 'visible');
              assert.equal(sample.close.opacity, '1');
              if (focused) {
                assert.equal(sample.active.text, 'Close calendar');
                assert.equal(sample.close.clipPath, 'none');
                const box = sample.close.box;
                assert.ok(box && ['left', 'top', 'width', 'height'].every(p => Number.isFinite(box[p])));
                assert.ok(box.width > 1 && box.height > 1 && box.left >= 0 && box.top >= 0 &&
                  box.left + box.width <= 1440 && box.top + box.height <= 900, 'Revealed close control outside viewport');
                assert.ok(sample.events.slice(samples[index - 1].events.length).some(e =>
                  e.type === 'focusin' && e.close && e.trusted), 'No real close focus event');
              } else assert.ok(String(sample.active.class).split(/\s+/).includes('mat-calendar-body-cell'));
              if (index === 2) assert.ok(sample.events.slice(samples[index - 1].events.length).some(e =>
                e.type === 'focusout' && e.close && e.trusted), 'No real close blur event');
            }
          } else {
            assert.equal(tree.resolvedStyleEvidenceVersion, 2);
            assert.equal(tree.resolvedStyleSource, 'core-style-inspection');
            assert.ok(Number.isInteger(tree.resolvedStyleRevision) && tree.resolvedStyleRevision >= 0);
            assert.equal(sample.close, null);
            assert.equal(sample.activeIsClose, false);
            assert.equal(sample.open, true);
            const popups = tree.nodes.filter(n => n.authored?.id === 'datepicker-popup' && n.authored.role === 'dialog');
            assert.equal(popups.length, 1);
            for (const id of ['datepicker-icon', 'datepicker-header', 'datepicker-month', 'datepicker-previous', 'datepicker-next']) {
              assert.equal(tree.nodes.filter(n => n.authored?.id === id).length, 1, `Missing candidate ${id}`);
            }
            if (index < 4) {
              const gridId = entry.view === 'month' ? 'datepicker-grid' : 'datepicker-year-grid';
              const grids = tree.nodes.filter(n => n.authored?.id === gridId && n.parent === popups[0].key);
              assert.equal(grids.length, 1, 'Candidate view differs from case');
              const cells = tree.nodes.filter(n => n.parent === grids[0].key && n.authored?.type === 'button');
              assert.ok(entry.view === 'month' ? cells.length >= 28 && cells.length <= 31 : cells.length === 24,
                'Candidate cell inventory incomplete');
            }
            assert.ok(!tree.nodes.some(n => [n.authored?.id, n.authored?.textContent, n.authored?.value, n.authored?.ariaLabel]
              .some(v => closeText(v) || v === 'datepicker-close')), 'Candidate now authors a close counterpart');
            assert.ok(!sample.controls.some(n => closeText(n.text) || closeText(n.label)), 'Candidate semantic close counterpart exists');
          }
        }
      }
      cases.push({ view: entry.view, deviceScaleFactor: entry.deviceScaleFactor,
        classification: 'application-plugin-authoring-defect', sourceFinding: 'fixture-calendar-close-control-omitted',
        referenceFocusRevealBlurAndCloseVerified: true, referenceFocusRestorationVerified: true,
        candidateAuthoredCloseControlAbsent: true, inputEquivalent: false, finalRasterVerified: false,
        owner: 'showcase calendar control structure and focus/dismissal semantics' });
    }
  } catch (error) { errors.push(String(error.message)); }
  return { binding, errors, cases: errors.length ? [] : cases, complete: errors.length === 0 && cases.length === 4 };
}
