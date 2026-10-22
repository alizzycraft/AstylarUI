import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reviewId = 'ff305b14217b7123b98a2e00f3ecb9ad443cd89606eaf688ea11f6118b7fb069';
const reviewFile = `artifacts/material-parity/working-audit/proposals/${reviewId}.json`;
const review = JSON.parse(fs.readFileSync(reviewFile)).review; assert.equal(hash(JSON.stringify(review)), reviewId);
const rows = review.groups.filter(row => ['form-field', 'input'].includes(row.family)); assert.equal(rows.length, 152);
const logFile = 'artifacts/material-parity/filled-field-structure-ledger-review-20261020.log', log = fs.readFileSync(logFile);
assert.equal(hash(log), '5fadba044b06bd7dd601687ab0f30ecde740413623feaf55d6bd2d0a2e5b6a09');
// Reuse the existing TAP envelope decoder and already-inspected owner mapping.
const lines = log.toString().split(/\r?\n/), start = lines.findIndex(l => l.startsWith('# FIELD_STRUCTURE_REVIEW '));
assert.ok(start >= 0); const end = lines.findIndex((l, i) => i > start && l.startsWith('# Subtest:')); assert.ok(end > start);
const serialized = lines.slice(start, end).map(l => { assert.ok(l.startsWith('# ')); return l.slice(2); }).join('').slice('FIELD_STRUCTURE_REVIEW '.length);
const proof = JSON.parse(serialized.replace(/\\([\\#])/g, '$1'));
assert.equal(proof.rows.length, 577); assert.ok(lines.includes('# pass 1') && lines.includes('# fail 0'));
for (const r of [proof.report, proof.source, proof.proof]) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const prior = new Map(proof.rows.map(row => [row.case, row]));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
function inspect(row, native, candidate) {
  const mapped = prior.get(row.case); assert.deepEqual(row.obligations.inputStyleStructure.retainedFilledFieldStructure.observation, mapped);
  assert.deepEqual(mapped.inputTrees, row.evidence.pairedTrees);
  const knownNative = ['frame', 'frame/0', 'frame/1', 'frame/2', ...['host', 'wrapper', 'flex', 'infix', 'control', 'floatingLabel', 'label'].map(k => mapped.reference[k]),
    ...(mapped.reference.focusLayer ? [mapped.reference.focusLayer.key] : []), mapped.reference.underline.key];
  const knownCandidate = ['root/0', 'root/0/0', 'root/0/1', 'root/0/2', ...['shell', 'surface', 'region', 'label', 'control', 'genericLine', 'alternateLine'].map(k => mapped.astylar[k]).filter(Boolean)];
  for (const [side, tree, known] of [['reference', native, knownNative], ['candidate', candidate, knownCandidate]]) {
    assert.deepEqual(tree.errors, []); assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    assert.equal(new Set(known).size, known.length);
    for (const key of known) one(tree.nodes.filter(n => n.key === key));
    for (const n of tree.nodes) {
      assert.equal(n.parent, n.key === (side === 'reference' ? 'frame' : 'root') ? null : n.key.slice(0, n.key.lastIndexOf('/')));
      if (side === 'reference') assert.ok(tree.styles[n.style]);
      else if (n.key !== 'root') for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.ok(n[stage]);
    }
  }
  assert.equal(candidate.nodes[0].key, 'root'); assert.deepEqual(candidate.nodes[0].authored, {});
  const extraNative = native.nodes.filter(n => !knownNative.includes(n.key));
  const extraCandidate = candidate.nodes.filter(n => n.key !== 'root' && !knownCandidate.includes(n.key));
  const error = extraNative.some(n => n.type === 'mat-error'), field = row.family === 'form-field';
  assert.ok(!error || field); assert.equal(extraNative.length, field && !error ? 4 : 3);
  assert.equal(extraCandidate.length, field ? 1 : 0);
  const subscript = one(extraNative.filter(n => n.parent === mapped.reference.host));
  assert.equal(subscript.type, 'div'); assert.equal(subscript.attributes.class, 'mat-mdc-form-field-subscript-wrapper mat-mdc-form-field-bottom-align'); assert.equal(subscript.ownText, '');
  const wrapper = one(extraNative.filter(n => n.parent === subscript.key));
  assert.equal(wrapper.type, 'div'); assert.equal(wrapper.ownText, '');
  assert.equal(wrapper.attributes.class, error ? 'mat-mdc-form-field-error-wrapper' : 'mat-mdc-form-field-hint-wrapper');
  const children = extraNative.filter(n => n.parent === wrapper.key); assert.equal(children.length, field && !error ? 2 : 1);
  if (field) {
    const label = one(children.filter(n => n.type === (error ? 'mat-error' : 'mat-hint'))), counterpart = extraCandidate[0];
    assert.equal(label.ownText, error ? 'Project name is required' : 'Public label');
    assert.equal(counterpart.authored.type, 'span'); assert.equal(counterpart.authored.id, `form-field-${error ? 'error' : 'hint'}`);
    assert.equal(counterpart.authored.textContent, label.ownText);
    if (error) { assert.equal(wrapper.attributes['aria-live'], 'polite'); assert.equal(wrapper.attributes['aria-atomic'], 'true'); }
  }
  if (!error) { const spacer = one(children.filter(n => n.attributes.class === 'mat-mdc-form-field-hint-spacer')); assert.equal(spacer.type, 'div'); assert.equal(spacer.ownText, ''); }
  assert.deepEqual([...knownNative, ...extraNative.map(n => n.key)].sort(), native.nodes.map(n => n.key).sort());
  assert.deepEqual([...knownCandidate, ...extraCandidate.map(n => n.key)].sort(), candidate.nodes.slice(1).map(n => n.key).sort());
  return { reusedNativeKeys: knownNative, reusedCandidateKeys: knownCandidate,
    captionBranch: { reference: extraNative.map(n => ({ key: n.key, parent: n.parent, type: n.type, text: n.ownText, attributes: n.attributes })),
      candidate: extraCandidate.map(n => ({ key: n.key, parent: n.parent, authored: n.authored })) },
    error, shape: `${native.nodes.length}/${candidate.nodes.length}` };
}
let controls = 0, referenceNodes = 0, candidateNodes = 0, newNativeCaptionRecords = 0; const counts = {}, shapes = {};
const observations = rows.map(row => {
  const pair = {}; for (const side of ['reference', 'astylar']) { const r = row.evidence.pairedTrees[side], bytes = fs.readFileSync(r.file); assert.equal(hash(bytes), r.sha256); pair[side] = JSON.parse(bytes); }
  const result = inspect(row, pair.reference, pair.astylar);
  counts[row.family] = (counts[row.family] ?? 0) + 1; const key = `${row.family}:${result.shape}`; shapes[key] = (shapes[key] ?? 0) + 1;
  for (const mutate of [p => p.reference.nodes.pop(), p => p.astylar.nodes.pop(),
    p => { p.reference.nodes.find(n => n.key === result.captionBranch.reference[0].key).ownText = 'forged'; }, p => { p.astylar.nodes[5].parent = 'root'; }]) {
    const forged = structuredClone(pair); mutate(forged); assert.throws(() => inspect(row, forged.reference, forged.astylar)); controls++;
  }
  referenceNodes += pair.reference.nodes.length; candidateNodes += pair.astylar.nodes.length; newNativeCaptionRecords += result.captionBranch.reference.length;
  return { case: row.case, evidence: row.evidence.pairedTrees, ...result };
});
assert.deepEqual(counts, { 'form-field': 76, input: 76 }); assert.equal(controls, 608);
assert.deepEqual(shapes, { 'form-field:17/11': 28, 'form-field:17/12': 32, 'form-field:16/11': 8, 'form-field:16/12': 8, 'input:16/10': 28, 'input:16/11': 40, 'input:15/10': 8 });
console.log(JSON.stringify({ producer: { file: 'scripts/check-basic-field-recorded-nodes.mjs', sha256: hash(fs.readFileSync('scripts/check-basic-field-recorded-nodes.mjs')) },
  review: { file: reviewFile, reviewSha256: reviewId }, reusedStructureProof: { file: logFile, sha256: hash(log) }, counts, shapes,
  referenceNodes, candidateNodes, newNativeCaptionRecords, negativeControlsRejected: controls, observations,
  boundary: 'Complete retained element accounting for152 basic-field/input cases by reusing the authenticated577-case wrapper proof and inspecting only the previously unaccounted caption wrappers,spacers,hints/errors. Existing error-live-region/hint-association causes remain separate;no wrapper/corner investigation repeated. Not full styles,anonymous/pseudo/AX,editing/caret,paint,currentness or whole-case closure. No frozen-source change.',
  canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
