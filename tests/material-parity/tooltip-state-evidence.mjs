import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';

const cohorts = ['benchmark-open', 'benchmark-hover', 'ordinary'];
const actions = ['initial', 'hover', 'press', 'release', 'leave'];
const hasClass = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);

// This verifies the observed state mismatch, not a hypothetical corrected
// tooltip or its pixels. Changed traces require review, not an automatic waiver.
export function validateTooltipStateCapture(raw, options) {
  const errors = [], observations = [];
  let binding;
  try {
    assert.equal(raw.schemaVersion, 1);
    assert.equal(raw.profile, 'light');
    assert.deepEqual(raw.viewport, { width: 1440, height: 1000 });
    assert.deepEqual(raw.cohorts, cohorts); assert.deepEqual(raw.actions, actions);
    assert.equal(raw.settleDelayMs, 250);
    const keys = [1, 2].flatMap(dpr => cohorts.flatMap(cohort => actions.map(action => `${dpr}/${cohort}/${action}`)));
    assert.deepEqual(raw.results?.map(e => `${e.deviceScaleFactor}/${e.cohort}/${e.action}`), keys, 'Incomplete or reordered action matrix');
    binding = validateSupplementalCapture(raw, { ...options, script: 'scripts/audit-material-tooltip-state.mjs',
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
    const histories = new Map(), screenshots = new Set();
    for (const entry of raw.results) {
      assert.equal(entry.family, 'tooltip');
      const counts = {};
      for (const side of ['reference', 'astylar']) {
        const sample = entry[side], tree = JSON.parse(read(sample.inputTree));
        assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length, 'Ambiguous tree keys');
        const ref = side === 'reference';
        const triggers = tree.nodes.filter(n => (ref ? n.attributes : n.authored)?.id === 'tooltip-primary');
        assert.equal(triggers.length, 1, 'Missing or duplicate trigger');
        const trigger = triggers[0];
        if (ref) { assert.equal(trigger.type, 'button'); assert.equal(trigger.attributes.mattooltip, 'Create a project'); }
        else { assert.equal(trigger.authored.type, 'button'); assert.equal(trigger.authored.value, 'Hover for help'); }
        const popup = tree.nodes.filter(n => ref ? hasClass(n, 'mat-mdc-tooltip-surface') : n.authored?.id === 'tooltip-popup');
        const expected = ref ? ['hover', 'press'].includes(entry.action)
          : entry.action === 'release' || (entry.cohort !== 'benchmark-open' && ['hover', 'press'].includes(entry.action));
        assert.equal(popup.length, Number(expected), 'Popup tree differs from reviewed action state');
        assert.equal(sample.popupCount, popup.length, 'Fabricated popup count');
        assert.equal(sample.retainedPopupCount, popup.filter(n => n.retainedText?.source === 'core-text-registry').length);
        if (ref) {
          assert.equal(sample.referenceShown, expected);
          assert.equal(Boolean(sample.referencePopup), expected);
          if (expected) {
            assert.equal(popup[0].ownText.trim(), 'Create a project');
            assert.equal(sample.referencePopup.text, 'Create a project');
            assert.ok(hasClass(tree.nodes.find(n => n.key === popup[0].parent), 'mat-mdc-tooltip-show'));
          }
        } else {
          assert.equal(tree.resolvedStyleEvidenceVersion, 2);
          assert.equal(tree.resolvedStyleSource, 'core-style-inspection');
          assert.ok(Number.isInteger(tree.resolvedStyleRevision) && tree.resolvedStyleRevision >= 0);
          assert.equal(sample.candidateOpen, expected);
          assert.equal(Boolean(sample.candidatePopupBox), expected);
          if (expected) {
            assert.equal(popup[0].authored.role, 'tooltip'); assert.equal(popup[0].authored.textContent, 'Create a project');
            assert.equal(popup[0].retainedText?.source, 'core-text-registry');
          }
        }
        assert.ok(sample.triggerBox && ['x', 'y', 'width', 'height'].every(p => Number.isFinite(sample.triggerBox[p])) &&
          sample.triggerBox.width > 0 && sample.triggerBox.height > 0, 'Missing pointer target');
        const key = `${entry.deviceScaleFactor}/${entry.cohort}/${side}`, previous = histories.get(key) ?? [];
        assert.ok(Array.isArray(sample.events));
        assert.deepEqual(sample.events.slice(0, previous.length), previous, 'Changed event history');
        const added = sample.events.slice(previous.length), required = { hover: 'pointermove', press: 'pointerdown', release: 'click', leave: 'pointermove' }[entry.action];
        const x = entry.action === 'leave' ? 1 : sample.triggerBox.x + sample.triggerBox.width / 2;
        const y = entry.action === 'leave' ? 1 : sample.triggerBox.y + sample.triggerBox.height / 2;
        if (required) assert.ok(added.some(e => e.type === required && e.trusted === true &&
          Math.abs(e.clientX - x) < 1 && Math.abs(e.clientY - y) < 1), 'Missing real pointer action at the sampled target');
        if (entry.action === 'release') assert.ok(added.some(e => e.type === 'pointerup' && e.trusted === true), 'Missing real release');
        histories.set(key, sample.events);
        assert.ok(!screenshots.has(sample.screenshot?.file), 'Duplicate screenshot'); screenshots.add(sample.screenshot.file);
        const png = read(sample.screenshot);
        assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
        assert.equal(png.readUInt32BE(16), 1440 * entry.deviceScaleFactor);
        assert.equal(png.readUInt32BE(20), 1000 * entry.deviceScaleFactor);
        counts[side] = popup.length;
      }
      assert.equal(entry.presenceMatches, counts.reference === counts.astylar, 'Fabricated presence acceptance');
      observations.push({ cohort: entry.cohort, dpr: entry.deviceScaleFactor, action: entry.action, counts,
        presenceMatches: entry.presenceMatches, inputEquivalent: false, finalRasterVerified: false });
    }
  } catch (error) { errors.push(String(error.message)); }
  return { complete: errors.length === 0, binding, observations, errors };
}
