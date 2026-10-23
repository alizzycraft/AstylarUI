import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
export const pointerFocusPredecessor = '6889b546f95572c1df93b4c598634b3ad3565553bc69a99ff2a9e1c6b791590c';
export const pointerFocusCapture = {
  file: 'artifacts/material-parity/configured-control-activation-distinct-20261017/latest-report.json',
  sha256: '945d1232074796ec066d8403ca606e13180c4c91a8540be062ddd7950cc1e406',
};

// Reuse measured pointer-focus boundaries in their exact cases. This does not
// substitute pointer actions for programmatic/keyboard focus or infer correctness
// from different native/generated IDs, later trees, or final selection state.
export function joinRetainedPointerFocus(predecessor, captureBytes) {
  assert.equal(hash(JSON.stringify(predecessor)), pointerFocusPredecessor);
  assert.equal(hash(captureBytes), pointerFocusCapture.sha256);
  const capture = JSON.parse(captureBytes), review = structuredClone(predecessor);
  assert.equal(capture.results.length, 113);
  const seen = new Set();
  for (const row of capture.results) {
    const id = `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
    assert.ok(!seen.has(id)); seen.add(id);
    const groups = review.groups.filter(group => group.case === id);
    assert.equal(groups.length, 1);
    const group = groups[0], activation = group.obligations.authoredActivation.configuredRawPointerObservation;
    assert.ok(activation);
    assert.deepEqual(activation.evidence.report, pointerFocusCapture);
    const focus = group.obligations.programmaticFocus;
    assert.equal(focus.disposition, 'evidence-join-pending');
    assert.equal(focus.retainedPointerFocusBoundaries, undefined);
    const observations = {};
    for (const side of ['reference', 'astylar']) {
      assert.deepEqual(activation.observations[side], row[side].observations);
      assert.deepEqual(row[side].observations.map(value => value.boundary), ['before', 'after-action', 'settled']);
      observations[side] = row[side].observations.map(value => {
        assert.equal(value.targetKind, 'focus-selector-candidate-not-pointer-hit');
        assert.ok(value.active && Array.isArray(value.activeAncestry) && Array.isArray(value.events));
        return { boundary: value.boundary, active: value.active, activeAncestry: value.activeAncestry,
          activeWithinHost: value.activeWithinHost, activeEqualsTarget: value.activeEqualsTarget,
          events: value.events };
      });
    }
    focus.retainedPointerFocusBoundaries = {
      disposition: 'inspected-retained-pointer-focus-only', case: id, caseId: row.caseId,
      sourceObligation: 'authoredActivation.configuredRawPointerObservation',
      completeSourceObservationSha256: hash(JSON.stringify(activation)),
      evidence: pointerFocusCapture, observations, currentRenderingAccepted: false,
      boundary: 'Exact retained pointer action and direct observed active owners only. Focus-selector target is not a pointer-hit witness. Later trees do not establish earlier action-time inputs. Different ID namespaces are not automatic focus failures.',
      remaining: ['Programmatic and keyboard focus need their own exact-action evidence.',
        'Complete focus restoration,source/runtime currentness,paint and whole-case acceptance remain open.'],
    };
    focus.disposition = 'partial';
  }
  assert.equal(seen.size, 113);
  const restored = structuredClone(review);
  for (const group of restored.groups) {
    const focus = group.obligations.programmaticFocus;
    if (!focus.retainedPointerFocusBoundaries) continue;
    delete focus.retainedPointerFocusBoundaries;
    focus.disposition = 'evidence-join-pending';
  }
  assert.equal(hash(JSON.stringify(restored)), pointerFocusPredecessor, 'All prior fields and remaining work must conserve');
  return review;
}

export const disabledFocusPredecessor = '6c39adadf48ddcfd2a2b80f732b4d09114e2c8ed53810cf61786026b99253e40';

export function joinRetainedDisabledFocusOwners(predecessor, read) {
  assert.equal(hash(JSON.stringify(predecessor)), disabledFocusPredecessor);
  const review = structuredClone(predecessor), logs = new Map();
  const hasOwner = value => value && Object.hasOwn(value, 'focusedOwner');
  const measured = entry => ['before','after'].every(boundary =>
    ['reference','astylar'].every(side => hasOwner(entry.observation?.[boundary]?.[side])));
  let cases = 0, actions = 0;
  const cohorts = new Map();
  for (const group of review.groups) {
    const focus = group.obligations.programmaticFocus;
    if (focus.disposition !== 'evidence-join-pending') continue;
    const raw = group.obligations.authoredActivation.retainedRawControlActions;
    if (!Array.isArray(raw) || !raw.some(measured)) continue;
    assert.match(group.case, /^interaction:(checkbox|slider)@(light|dark|contrast|custom)\/desktop-dpr[12]\/disabled$/);
    const sources = [];
    for (const [index, entry] of raw.entries()) {
      if (!measured(entry)) continue;
      const receipt = entry.evidence.log;
      if (!logs.has(receipt.file)) {
        const bytes = read(receipt.file);
        assert.equal(hash(bytes), receipt.sha256);
        logs.set(receipt.file, { sha256: receipt.sha256, rows: bytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line)) });
      }
      const log = logs.get(receipt.file); assert.equal(log.sha256, receipt.sha256);
      cohorts.set(receipt.file, (cohorts.get(receipt.file) ?? 0) + 1);
      const observation = entry.observation, c = observation.case;
      assert.equal(`interaction:${c.family}@${c.profile}/${c.viewport.id}/${c.state}`, group.case);
      const matches = log.rows.filter(row => JSON.stringify(row.case) === JSON.stringify(c));
      assert.equal(matches.length, 1); assert.deepEqual(matches[0], observation);
      assert.equal(observation.acceptance, false);
      const boundaries = [];
      const record = (boundary, value) => {
        for (const side of ['reference','astylar']) assert.ok(hasOwner(value[side]));
        boundaries.push({ boundary, reference: value.reference.focusedOwner, astylar: value.astylar.focusedOwner });
      };
      record('before', observation.before); record('after', observation.after);
      for (const field of ['keyboardBoundaries','pointerBoundaries'])
        for (const [ordinal, value] of (observation[field] ?? []).entries())
          record({ collection: field, ordinal, ...(Object.hasOwn(value,'action') ? { action:value.action } : {}) }, value);
      sources.push({ sourceIndex: index, completeSourceObservationSha256: hash(JSON.stringify(entry)), evidence: receipt,
        modes: Object.fromEntries(['keyboardOnly','disabledKeyboardOnly','disabledPointerOnly','sliderMotionOnly']
          .filter(key => Object.hasOwn(observation,key)).map(key => [key,observation[key]])), boundaries });
      actions++;
    }
    assert.equal(focus.retainedDisabledFocusOwners, undefined);
    focus.retainedDisabledFocusOwners = {
      disposition: 'inspected-serialized-owner-only', case: group.case,
      sourceObligation: 'authoredActivation.retainedRawControlActions', sources, currentRenderingAccepted: false,
      boundary: 'Exact retained disabled physical anchors. Additional keyboard/pointer/held actions remain supplementary. Recorded owner strings are not complete active-descendant association or focus-event histories;native BODY and candidate CANVAS/control owners are not normalized to equality.',
      remaining: ['Direct active-descendant identity,focus events and other focus actions remain open.',
        'Current runtime,paint,lifetime and whole-case acceptance remain unverified.'],
    };
    focus.disposition = 'partial'; cases++;
  }
  assert.equal(cases, 16); assert.equal(actions, 39);
  assert.deepEqual([...cohorts].sort(), [
    ['artifacts/material-parity/disabled-slider-held-centers-20261012.log',8],
    ['artifacts/material-parity/raw-disabled-control-keyboard-events-20261012.log',15],
    ['artifacts/material-parity/raw-disabled-control-pointer-events-20261012.log',16],
  ].sort());
  const restored = structuredClone(review);
  for (const group of restored.groups) {
    const focus = group.obligations.programmaticFocus;
    if (!focus.retainedDisabledFocusOwners) continue;
    delete focus.retainedDisabledFocusOwners; focus.disposition = 'evidence-join-pending';
  }
  assert.equal(hash(JSON.stringify(restored)), disabledFocusPredecessor);
  return review;
}
