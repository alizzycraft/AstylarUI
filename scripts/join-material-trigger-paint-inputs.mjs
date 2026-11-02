import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
export const triggerPaintPredecessor = '38aca39a69052334314e3584d33682195702b9690b024c5150fbd22c338e8ee1';
const clipKey = 'retainedClippingCallerRouting', paintKey = 'retainedTriggerStatePaint';
const base = 'artifacts/material-parity/';
const clipReceipt = { file: base + 'divider-clipping-caller-routing-ancestry-bound-20261102.log',
  sha256: 'd22da5998550d9f33c89c9139efaa240bcd85900f974b9937515597688861475' };
const paintReceipt = { file: base + 'snackbar-paint-classification-array-integration-20261102.log',
  sha256: '271927651863a32c1a4ca76b3ec631644de2f5a0cd868e3100fac4ca0203e93c' };
const producerSnapshot = { file: base + 'trigger-paint-clipping-producer-20261102.mjs',
  sha256: 'b08c882e548ad27d76e39379ed64a15096352889d1389620a30cd818b6b9a277' };
const decode = bytes => (bytes[0] === 255 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/, '');

export function restoreRetainedTriggerPaintInputs(cases) {
  return cases.map(row => {
    const input = row.obligations.inputStyleStructure, paint = row.obligations.localPaint;
    if (!input[clipKey] && !paint[paintKey]) return row;
    const obligations = { ...row.obligations };
    if (input[clipKey]) {
      const next = { ...input }; delete next[clipKey]; obligations.inputStyleStructure = next;
    }
    if (paint[paintKey]) {
      const next = { ...paint, disposition: paint[paintKey].parentDisposition };
      delete next[paintKey]; obligations.localPaint = next;
    }
    return { ...row, obligations };
  });
}

export function joinRetainedTriggerPaintInputs(cases, read = fs.readFileSync) {
  assert.equal(hash(JSON.stringify(cases)), triggerPaintPredecessor, 'Exact accepted695dea7b parent cases required');
  assert.equal(cases.length, 2311);
  const receipts = new Map();
  const bind = receipt => {
    assert.equal(hash(read(receipt.file)), receipt.sha256, receipt.file);
    if (receipts.has(receipt.file)) assert.equal(receipts.get(receipt.file), receipt.sha256, 'Conflicting source generation');
    receipts.set(receipt.file, receipt.sha256); return read(receipt.file);
  };
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string' && typeof value.sha256 === 'string') bind(value);
    for (const child of Object.values(value)) collect(child);
  };
  const ownSources = ['scripts/join-material-trigger-paint-inputs.mjs', 'tests/material-parity/snackbar-position-observation.spec.mjs']
    .map(file => ({ file, sha256: hash(read(file)) }));
  ownSources.forEach(bind);
  const clipText = decode(bind(clipReceipt)), clip = JSON.parse(clipText.slice(clipText.indexOf('{')));
  assert.equal(clip.producer.file, 'scripts/check-divider-omitted-owner-consumers.mjs');
  assert.equal(clip.producer.sha256, producerSnapshot.sha256); bind(producerSnapshot); bind(clip.sourceMap);
  const selectedSources = clip.sources.filter(r => ['src/app/services/dom/elements/overflow-clip.service.ts',
    'src/app/services/dom/elements/element-creation.service.ts', 'src/lib/astylar-scroll-runtime.ts'].includes(r.current.file));
  assert.equal(new Set(selectedSources.map(r => r.current.file)).size, 3);
  selectedSources.forEach(r => bind(r.current));
  assert.equal(clip.ownClippingInputs.observations.length, 120);
  assert.equal(clip.ownClippingInputs.overflowEntryControls, 18);
  assert.deepEqual(Object.fromEntries(Object.entries(clip.clippingCallRouting).filter(([key]) => key !== 'treeReceipts' && key !== 'conclusion' && key !== 'boundary')),
    { clippingCallerStyles: 432, clippingCallerMissingStyle: 432, clippingReconcileContexts: 48, clippingReconcilePositiveControls: 96 });
  const clipEvidence = [...receipts].map(([file, sha256]) => ({ file, sha256 }));

  const paintText = decode(bind(paintReceipt));
  assert.match(paintText, /# tests 5\r?\n# suites 0\r?\n# pass 5\r?\n# fail 0/);
  // Decode Node TAP's escaped hash markers,not CSS values or audit differences.
  const records = paintText.split(/\r?\n/).filter(line => line.startsWith('# {'))
    .map(line => JSON.parse(line.slice(2).replaceAll('\\#', '#')));
  const one = predicate => { const rows = records.filter(predicate); assert.equal(rows.length, 1); return rows[0]; };
  const expired = one(r => r.observations?.length === 2 && r.observations.every(o => Object.hasOwn(o, 'outsideTrigger')));
  const focus = one(r => r.case === 'interaction:snack-bar@light/desktop-dpr1/focus' && r.nativeFocus);
  const states = one(r => r.observations?.map(o => o.state).join(',') === 'hover,held');
  assert.ok(expired.observations.every(o => o.outsideTrigger === 0 && o.rejectedPixelControl === 1));
  assert.equal(focus.nativeFocus.whiteOpacity, '0.12'); assert.equal(focus.candidateFocusRules.length, 2);
  assert.equal(focus.rejectedMeasuredBranchControl, 1); assert.equal(states.imageBeforeReleaseBeforeEvents, true);
  collect(expired); collect(focus); collect(states);
  bind({ file: base + 'current-full-20261005/checkpoint/aad85d65f08c81ab7b919738039cad8032be30219c31d907e50a1cf3541e72bc.json',
    sha256: 'af0cc215d1602569193b84ee4255c4a4fcda1e79ccc6578698ae818935537749' });
  const paintEvidence = [...receipts].filter(([file]) => !clipEvidence.some(r => r.file === file) || ownSources.some(r => r.file === file))
    .map(([file, sha256]) => ({ file, sha256 }));
  const stateRecords = new Map([['auto-dismiss', expired], ['focus', focus], ...states.observations.map(r => [r.state, r])]);
  const changed = { divider: 0, snackbar: 0 };
  const joined = cases.map(row => {
    assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
    if (row.family === 'divider') {
      const input = row.obligations.inputStyleStructure; assert.equal(input[clipKey], undefined);
      const pair = row.evidence.pairedTrees;
      const owners = clip.ownClippingInputs.observations.filter(r => r.referenceTree.file === pair.reference.file && r.referenceTree.sha256 === pair.reference.sha256);
      assert.deepEqual(owners.map(r => r.id), ['page', 'eyebrow', 'title', 'divider-above-row', 'divider-below-row']);
      assert.equal(clip.clippingCallRouting.treeReceipts.filter(r => r.file === pair.astylar.file && r.sha256 === pair.astylar.sha256).length, 1);
      collect(pair); changed.divider++;
      return { ...row, obligations: { ...row.obligations, inputStyleStructure: { ...input, [clipKey]: {
        disposition: 'inspected-bounded-source-routing', observations: owners,
        sharedControlCounts: { entry: 18, callerStyle: 432, missingStyle: 432, reconcileContexts: 48, positiveReconcile: 96 },
        producerSnapshot, evidence: clipEvidence,
        boundary: 'Shared captured/current source-method controls with stubbed resolver/layout/paint;not432 independent controls per case. Own/recorded-tree entry selection only,not original runtime calls,outside-tree ancestors,clip shader state,anonymous layout,current rendering or case closure.',
      } } } };
    }
    const prefix = 'interaction:snack-bar@light/desktop-dpr1/';
    if (!row.case.startsWith(prefix) || !stateRecords.has(row.case.slice(prefix.length))) return row;
    const paint = row.obligations.localPaint; assert.equal(paint[paintKey], undefined);
    assert.equal(paint.disposition, 'evidence-join-pending'); collect(row.evidence.pairedTrees); changed.snackbar++;
    const state = row.case.slice(prefix.length);
    return { ...row, obligations: { ...row.obligations, localPaint: { ...paint, disposition: 'partial', [paintKey]: {
      disposition: 'inspected-bounded-original-state-paint', parentDisposition: paint.disposition, state,
      observation: stateRecords.get(state), evidence: paintEvidence,
      sourceFindingIds: state === 'focus' ? ['fixture-filled-button-programmatic-focus-layer-omitted', 'audit-state-paint-unmeasured-family-returns-success'] : [],
      remaining: ['Full corresponding glyph/edge/ripple/animation paint and equivalent input composition',
        'Original timed/action causality beyond endpoint/recipe evidence and complete current-code applicability'],
      boundary: 'One original light/DPR1 case per state. Per-renderer expired residual,one focus input/fill mismatch or opaque hover/held samples only;not complete paint,continuous timing,current rendering or whole-case inspection closure. Post-release event lists do not timestamp held images.',
    } } } };
  });
  assert.deepEqual(changed, { divider: 24, snackbar: 4 });
  assert.equal(hash(JSON.stringify(restoreRetainedTriggerPaintInputs(joined))), triggerPaintPredecessor);
  return { cases: joined, changed, sha256: hash(JSON.stringify(joined)), canonicalPublished: false };
}
