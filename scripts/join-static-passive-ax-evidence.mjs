import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { createDividerReviewedBoundariesReader, sharedButtonTouchReview } from '../tests/material-parity/text-backing-case-review-source.mjs';
const base = 'artifacts/material-parity/working-audit';
const predecessor = '50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a';
assert.equal(sharedButtonTouchReview, predecessor);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const changes = [], groups = new Map(review.groups.map(g => [g.case, g]));
const producer = receipt('scripts/join-static-passive-ax-evidence.mjs');
for (const [script, log] of [
  ['scripts/check-list-static-ax.mjs', 'artifacts/material-parity/list-static-ax-review-20261021.log'],
  ['scripts/check-passive-static-ax.mjs', 'artifacts/material-parity/passive-static-ax-review-20261021.log'],
]) {
  const bytes = execFileSync(process.execPath, [script], { maxBuffer: 2_000_000 });
  assert.deepEqual(bytes, readFileSync(log));
  const verified = JSON.parse(bytes);
  assert.equal(hash(readFileSync(verified.producer.file)), verified.producer.sha256);
  const capture = JSON.parse(readFileSync(verified.report.file));
  const rows = verified.rows.map(row => ({ ...row, family: row.family ?? 'list' }));
  const keys = new Set(rows.map(row => `static:${row.family}@${row.profile}/${row.viewport.id}`));
  for (const key of keys) {
    const group = groups.get(key); assert.ok(group);
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const pair = rows.filter(row => key === `static:${row.family}@${row.profile}/${row.viewport.id}`);
    assert.equal(pair.length, 2);
    const reference = pair.find(row => row.mode === 'reference'), astylar = pair.find(row => row.mode === 'astylar');
    assert.ok(reference && astylar); assert.deepEqual(reference.viewport, astylar.viewport);
    assert.equal(group.family, reference.family);
    const captureRecords = pair.map(row => {
      const record = capture.observations.find(c => c.mode === row.mode && c.profile === row.profile &&
        c.viewport.id === row.viewport.id && (c.family ?? 'list') === row.family);
      assert.ok(record); return record;
    });
    const semantic = group.obligations.semantics;
    assert.equal(semantic.currentStaticActualAx, undefined);
    semantic.currentStaticActualAx = {
      disposition: 'inspected-actual-ax-component-and-landmark-boundary', case: key,
      viewport: reference.viewport,
      referenceTarget: reference.target ?? reference.listTarget,
      candidateTarget: astylar.target ?? astylar.listTarget,
      observedMainLandmarks: { reference: reference.mainCount ?? reference.mainLandmarks.length,
        astylar: astylar.mainCount ?? astylar.mainLandmarks.length },
      focusedComponentProjectionMatches: reference.family !== 'sidenav',
      additionalSidenavContentMain: reference.family === 'sidenav',
      evidence: { verification: receipt(log), verifier: receipt(script), capture: verified.report,
        checkpoint: capture.provenance.checkpoint, provenance: receipt(verified.report.file.replace('latest-report.json', 'provenance.json')),
        actualAxCaptures: pair.map(row => row.evidence),
        captureProducer: capture.provenance.producer, sourceBindings: verified.sourceBindingReuse ?? receipt(log), producer },
      boundary: 'Fresh pinned static-context actual AX/backend DOM supplement. Original paired-tree anchors,all existing findings/statuses/remaining work survive. Focused projection omits ignored/generic/inline boxes explicitly;not full semantic equivalence,AT/header relations,interaction replay,paint,whole runtime/source applicability or case closure.',
    };
    assert.equal(captureRecords.length, 2);
    changes.push([semantic, 'currentStaticActualAx']);
  }
}
assert.equal(changes.length, 48);
assert.equal(groups.size, 2311);
const proposed = saveReviewProposal(base, review);
const reader = createDividerReviewedBoundariesReader({ root: process.cwd(), read: readFileSync, reviewSha256: predecessor });
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case), { read: reader.read });
assert.equal(loaded.cases.length, 2311); assert.equal(loaded.inspectionComplete, false);
assert.equal(loaded.currentRenderingAccepted, false); assert.deepEqual(loaded.unjoinedCases, []);
for (const [target, key] of changes) delete target[key];
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, addedStaticCases: 48, actualAxCaptures: 96,
  validatedDependencies: loaded.evidenceFingerprints.length, completePredecessorRecovered: true,
  cases: 2311, inspectionComplete: false, currentRenderingAccepted: false,
  selectedForExport: false, canonicalPublication: false,
  boundary: 'Queued48-case AX evidence only;does not change live173-finding export or accepted8259 package.' }));
