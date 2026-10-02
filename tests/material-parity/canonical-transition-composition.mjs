import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

const sourcePlan = row => row.reviewEvidence?.sourcePlan;

// A source-bound transition may refresh its plan receipt while the frozen
// canonical row still carries the receipt authenticated when it was generated.
// Reconcile that metadata only after proving every other row value and the
// source-join identity are identical; this is not a value-equality relaxation.
export function reconcileSourcePlanReceipts(expected, frozen) {
  if (expected.length !== frozen.length) throw new Error('receipt row count changed');
  const rows = structuredClone(expected);
  let reconciled = 0;
  for (let i = 0; i < expected.length; i++) {
    const currentPlan = sourcePlan(expected[i]);
    const frozenPlan = sourcePlan(frozen[i]);
    if (isDeepStrictEqual(currentPlan, frozenPlan)) continue;
    if (!currentPlan || !frozenPlan) throw new Error(`missing source-plan receipt at row ${i}`);
    const currentEvidence = { ...expected[i].reviewEvidence, sourcePlan: undefined };
    const frozenEvidence = { ...frozen[i].reviewEvidence, sourcePlan: undefined };
    if (!isDeepStrictEqual(currentEvidence, frozenEvidence))
      throw new Error(`source-plan receipt masks value drift at row ${i}`);
    for (const key of ['file', 'sourceProofsReplayed', 'originalCanonicalJoinReplayed']) {
      if (currentPlan[key] !== frozenPlan[key])
        throw new Error(`source-plan receipt identity changed at row ${i}: ${key}`);
    }
    rows[i].reviewEvidence.sourcePlan = frozenPlan;
    reconciled++;
  }
  return { rows, reconciled };
}

// The caller must authenticate the frozen payload bytes and independently
// reconstruct every expected row before calling this boundary. Keep the frozen
// serialization for the next byte-sensitive proof only after proving complete,
// ordered value equality. This does not authenticate either input by itself.
export function conserveIntermediateCanonicalRows(expected, frozen) {
  assert.equal(expected.length, frozen.length, 'intermediate canonical row count changed');
  let serializationOnlyRows = 0;
  for (let i = 0; i < expected.length; i++) {
    assert.ok(isDeepStrictEqual(expected[i], frozen[i]),
      `intermediate canonical row ${i} differs from independently reconstructed evidence`);
    if (JSON.stringify(expected[i]) !== JSON.stringify(frozen[i])) serializationOnlyRows++;
  }
  return { rows: structuredClone(frozen), serializationOnlyRows };
}
