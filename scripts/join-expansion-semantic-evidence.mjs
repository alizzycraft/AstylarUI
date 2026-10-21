import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, cardInputsReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
const base = 'artifacts/material-parity/working-audit', predecessor = cardInputsReview;
assert.equal(predecessor, '20dfb80485f094eaec4025e56ac7d5bb4a375f388643d192cb14f5d5fecbf82b');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const groups = new Map(review.groups.map(g => [g.case, g])); assert.equal(groups.size, 2311);
const pointer = readFileSync(`${base}/current.json`), producer = receipt('scripts/join-expansion-semantic-evidence.mjs');
const pendingSourceReview = receipt(`${base}/proposals/bfba66484e2e218edab363a40ade43294d0fdc588b7063daea22e2e5bf065059.json`);
const targetFile = 'artifacts/material-parity/expansion-controls-retained-boundary-20261021.log';
const styleFile = 'artifacts/material-parity/expansion-hidden-style-boundary-20261021.log';
const targets = JSON.parse(readFileSync(targetFile)), styles = JSON.parse(readFileSync(styleFile));
assert.equal(targets.cases, 68); assert.equal(styles.cases, 68);
const publicBinding = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs']), readFileSync(publicBinding));
const changes = [];
const acceptedInputBindings = [];
for (const row of targets.observations) {
  const group = groups.get(row.case); assert.equal(group.family, 'expansion');
  const style = styles.observations.filter(s => s.case === row.case); assert.equal(style.length, 1);
  assert.deepEqual(style[0].evidence, row.evidence.astylar);
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const ref = group.evidence.pairedTrees[side], bytes = readFileSync(ref.file);
    assert.equal(hash(bytes), ref.sha256); trees[side] = JSON.parse(bytes);
  }
  const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
  const header = one(trees.reference.nodes.filter(n => n.type === 'mat-expansion-panel-header'));
  const target = one(trees.reference.nodes.filter(n => n.attributes?.id === header.attributes['aria-controls']));
  const candidateHeader = one(trees.astylar.nodes.filter(n => n.authored?.id === 'expansion-primary'));
  const candidateTarget = one(trees.astylar.nodes.filter(n => n.authored?.id === candidateHeader.authored.ariaControls));
  assert.deepEqual([target.type, target.attributes.role, target.attributes['aria-labelledby'] === header.attributes.id],
    [row.referenceTarget.type, row.referenceTarget.attributes.role, true]);
  assert.deepEqual(candidateTarget.authored, row.candidateTarget.authored);
  assert.deepEqual([header.attributes['aria-expanded'], candidateHeader.authored.ariaExpanded], row.expanded);
  const candidateDisplayRequests = Object.fromEntries(['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']
    .map(stage => [stage, candidateTarget[stage].display]));
  assert.deepEqual(candidateDisplayRequests, style[0].display);
  acceptedInputBindings.push({ case: row.case, accepted: group.evidence.pairedTrees, historical: row.evidence });
  const semantic = group.obligations.semantics;
  assert.equal(semantic.retainedExpansionTargetInputs, undefined);
  semantic.retainedExpansionTargetInputs = { disposition: 'inspected-unequal-relationship-target-inputs',
    referenceHeader: { key: header.key, attributes: header.attributes },
    referenceTarget: { key: target.key, type: target.type, attributes: target.attributes },
    candidateTarget: { key: candidateTarget.key, authored: candidateTarget.authored }, expanded: row.expanded, candidateDisplayRequests,
    evidence: { pairedTrees: group.evidence.pairedTrees, historicalPairedTrees: row.evidence,
      targetObservation: receipt(targetFile), styleObservation: receipt(styleFile),
      producer, pendingSourceReview },
    boundary: 'Recorded target role/label/structure and CSS hiding inputs only;not actual interaction AX,AT behavior,paint or case closure.' };
  changes.push([semantic, 'retainedExpansionTargetInputs']);
}
const axFile = 'artifacts/material-parity/expansion-static-ax-review-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-expansion-static-ax.mjs']), readFileSync(axFile));
const ax = JSON.parse(readFileSync(axFile)), capture = JSON.parse(readFileSync(ax.report.file)), pairs = new Map();
const captureProducer = { ...capture.provenance.producer,
  file: path.relative(process.cwd(), capture.provenance.producer.file).replaceAll('\\', '/') };
assert.ok(!path.isAbsolute(captureProducer.file) && !captureProducer.file.startsWith('../'));
assert.equal(hash(readFileSync(captureProducer.file)), captureProducer.sha256);
for (const row of ax.observations) {
  const key = `static:expansion@${row.profile}/${row.viewport.id}`;
  const pair = pairs.get(key) ?? []; pair.push(row); pairs.set(key, pair);
}
assert.equal(pairs.size, 12);
for (const [key, pair] of pairs) {
  assert.equal(pair.length, 2); assert.deepEqual(pair.map(r => r.mode).sort(), ['astylar', 'reference']);
  const group = groups.get(key), semantic = group.obligations.semantics;
  assert.equal(semantic.currentStaticActualAx, undefined);
  semantic.currentStaticActualAx = { disposition: 'inspected-collapsed-content-ax-visibility-failure',
    observations: pair.map(row => ({ mode: row.mode, result: row.result })),
    evidence: { actualAxCaptures: pair.map(row => ({ file: row.file, sha256: row.sha256 })),
      verification: receipt(axFile), capture: ax.report, captureProducer,
      checkpoint: capture.provenance.checkpoint, publicCoreBinding: receipt(publicBinding), producer, pendingSourceReview },
    boundary: 'Pinned static collapsed-state exposure only. Separate authored target substitution and public-proven core visibility defect;no complete semantic/AT/interaction/paint acceptance.' };
  changes.push([semantic, 'currentStaticActualAx']);
}
assert.equal(changes.length, 80);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [object, key] of changes) delete object[key];
assert.equal(hash(JSON.stringify(review)), predecessor); assert.deepEqual(readFileSync(`${base}/current.json`), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, retainedTargetCases: 68, actualAxCases: 12,
  addedChildren: changes.length, validatedDependencies: loaded.evidenceFingerprints.length,
  acceptedInputBindings,
  completePredecessorRecovered: true, acceptedPointerUnchanged: true, inspectionComplete: false,
  currentRenderingAccepted: false, selectedForExport: false, canonicalPublication: false }));
