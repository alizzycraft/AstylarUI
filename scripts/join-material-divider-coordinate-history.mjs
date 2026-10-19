import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';

// Close the demonstrated unjoined branch-history evidence gap; no Git survey.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '1c43e73336c5dfbc1f01fb2075ab56cbc93d9a4597ab7cd7e46a3556cdf7eaf9';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const log = 'artifacts/material-parity/divider-coordinate-branch-history-20261015.log';
assert.equal(receipt(log).sha256, 'b92b250bdaa722074b3ccfa2258f9965a279d2444eb499ef572777a904fad71c');
const history = JSON.parse(readFileSync(log));
assert.equal(receipt(history.current.file).sha256, history.current.sha256);
assert.equal(history.currentRuleLinesMatchLastChange, true);
assert.equal(history.classification, 'application-plugin-authoring-defect');
assert.equal(history.definition, 'fixture-divider-replaces-paragraph-flow-with-coordinates');
assert.equal(history.commits.length, 5);
assert.deepEqual(history.commits.map(c => c.revision.slice(0, 8)), ['2f440115', 'fcde1b7d', '1f2f2aad', '662c1793', '7485fc58']);
const lines = readFileSync(history.current.file, 'utf8').split(/\r?\n/)
  .filter(line => /selector: '\.divider(?:'|-)/.test(line)).map(line => line.trim());
assert.equal(lines.length, 8);
assert.deepEqual(lines, history.commits.at(-1).dividerRuleLines);
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const modified = [];
for (const group of review.groups.filter(g => g.family === 'divider')) {
  const owner = group.obligations.historyOwnership;
  assert.equal(owner.disposition, 'partial');
  assert.equal(owner.documentedCoordinateCompensation.classification, history.classification);
  assert.equal(owner.dividerCoordinateBranchHistory, undefined);
  assert.ok(owner.remaining.includes('historical compensation disposition'));
  modified.push({ owner, previous: structuredClone(owner.remaining), case: group.case });
  owner.dividerCoordinateBranchHistory = {
    disposition: 'inspected-history-only', classification: history.classification,
    definition: history.definition, commits: history.commits.map(c => ({ revision: c.revision, date: c.date, patchSha256: c.patchSha256, sourceLFSha256: c.sourceLFSha256 })),
    currentRuleLines: lines,
    evidence: { history: receipt(log), currentSource: history.current,
      producer: receipt('scripts/join-material-divider-coordinate-history.mjs') },
    conclusion: history.conclusion,
    boundary: history.boundary,
  };
  owner.remaining = owner.remaining.map(task => task === 'historical compensation disposition'
    ? 'Remaining root-height history and renderer-causality attribution beyond the classified coordinate/theme/DPR/density/mobile branches' : task);
}
assert.equal(modified.length, 24);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case));
for (const { owner, previous } of modified) {
  delete owner.dividerCoordinateBranchHistory;
  owner.remaining = previous;
}
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(x => x.case),
  dependencyCount: loaded.evidenceFingerprints.length, allCases: loaded.cases.length,
  currentRules: lines.length, historicalCommits: history.commits.length,
  predecessorRecovered: true, scope: 'Existing history evidence joined; no fresh investigation,causal claim,whole-case closure or current-rendering promotion.' }));
