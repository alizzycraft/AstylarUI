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
