import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { getHeapStatistics } from 'node:v8';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, tabsMenuSheetReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
assert.ok(getHeapStatistics().heap_size_limit >= 3 * 1024 ** 3, 'Use node --max-old-space-size=4096 after heavy export work finishes');
const hash = b => createHash('sha256').update(b).digest('hex'), receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const base = 'artifacts/material-parity/working-audit', predecessor = '48e8e7caf8d66cde0536ac9592f76e60c2ea47d9ac8e9bb295b453ed48ad991b';
const review = JSON.parse(fs.readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const pointerFile = base + '/current.json', pointer = fs.readFileSync(pointerFile), producer = receipt('scripts/join-static-semantic-input-evidence.mjs');
const groups = new Map(review.groups.map(r => [r.case, r])); assert.equal(groups.size, 2311);
const batches = [
  ['chip-orientation', 'chip-orientation-input-review', 24, 49],
  ['group-metadata', 'group-semantic-input-review', 48, 98],
  ['picker-metadata', 'picker-semantic-input-review', 48, 98],
  ['checkable-composition', 'checkable-semantic-input-review', 72, 146],
  ['sort-tooltip-description', 'sort-description-input-review-final', 48, 97],
  ['toggle-group', 'toggle-group-input-review', 24, 74],
  ['widget-state', 'static-widget-state-ax-review', 216, 540],
];
const changes = [], verifications = [], caseIds = new Set(), familyIds = new Set(), counts = {};
for (const [batch, name, expected, negatives] of batches) {
  const file = `artifacts/material-parity/${name}-20261022.log`, bytes = fs.readFileSync(file), result = JSON.parse(bytes);
  assert.equal(receipt(result.producer.file).sha256, result.producer.sha256);
  assert.deepEqual(execFileSync(process.execPath, [result.producer.file], { maxBuffer: 16000000 }), bytes);
  assert.equal(result.observations.length, expected); assert.equal(result.negativeControlsRejected, negatives);
  assert.equal(result.canonicalPublication, false); assert.equal(result.renderingAccepted, false);
  const verification = receipt(file); verifications.push(verification); const pairs = new Map();
  for (const row of result.observations) {
    assert.equal(receipt(row.file).sha256, row.sha256); const raw = JSON.parse(fs.readFileSync(row.file));
    const family = row.family ?? raw.family; assert.equal(family, raw.family); assert.equal(row.mode, raw.mode);
    assert.deepEqual(row.viewport, raw.viewport); assert.deepEqual(raw.runtimeErrors, []);
    const key = `static:${family}@${row.profile}/${row.viewport.id}`; if (row.case) assert.equal(row.case, key);
    const group = groups.get(key); assert.equal(group?.family, family);
    const pair = pairs.get(key) ?? []; pair.push({ row, family }); pairs.set(key, pair);
  }
  assert.equal(pairs.size, expected / 2);
  for (const [key, pair] of pairs) {
    assert.deepEqual(pair.map(r => r.row.mode).sort(), ['astylar', 'reference']);
    assert.deepEqual(pair[0].row.viewport, pair[1].row.viewport);
    const group = groups.get(key); assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const owner = group.obligations.semantics, child = `retainedStaticSemanticInputReview:${batch}`; assert.ok(owner); assert.equal(owner[child], undefined);
    const sourceProposal = result.saved ? receipt(result.saved.file) : undefined;
    owner[child] = {
      disposition: 'inspected-bounded-retained-static-AX-and-input-attribution-not-full-semantics',
      observations: pair.map(({ row }) => ({ mode: row.mode, ...(row.result ? { result: row.result } : { projections: row.projections, owners: row.owners }) })),
      evidence: { producer, verifier: result.producer, verification,
        raw: pair.map(({ row }) => ({ file: row.file, sha256: row.sha256 })),
        ...(sourceProposal ? { pendingSourceReview: sourceProposal } : {}),
        ...(result.sourceBindingReuse ? { sourceBindingReuse: result.sourceBindingReuse } : {}),
        ...(result.projectionBindingReuse ? { projectionBindingReuse: result.projectionBindingReuse } : {}) },
      boundary: result.boundary ?? 'Only the exact assertions in the receipt-bound focused review apply. Input differences remain explicit;the pending finding review records authoring/history/ownership limits. Not all AX relationships,interaction,AT,paint,current whole-rendering or complete case inspection.'
    };
    changes.push([owner, child]); caseIds.add(key); familyIds.add(group.family); counts[batch] = (counts[batch] ?? 0) + 1;
  }
}
assert.equal(changes.length, 240); assert.equal(caseIds.size, 228); assert.equal(familyIds.size, 19);
const proposal = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: fs.readFileSync, reviewSha256: tabsMenuSheetReview });
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, review.groups.map(r => r.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [owner, key] of changes) delete owner[key]; assert.equal(hash(JSON.stringify(review)), predecessor);
assert.deepEqual(fs.readFileSync(pointerFile), pointer);
console.log(JSON.stringify({ producer, predecessor, proposal, verifications, counts, addedChildren: changes.length,
  uniqueStaticCases: caseIds.size, families: [...familyIds], validatedDependencies: loaded.evidenceFingerprints.length,
  completePredecessorRecovered: true, acceptedPointerUnchanged: true, selectedForExport: false, canonicalPublication: false,
  inspectionComplete: false, currentRenderingAccepted: false,
  boundary: 'Joins already-reviewed static semantic assertions and pending source classifications to exact configured cases. Overlapping chip orientation/group reviews remain separate children,not twice the unique coverage. Original partial statuses,remaining-work lists and acceptance flags preserve. No new capture,renderer/fixture modification or source registration.' }));
