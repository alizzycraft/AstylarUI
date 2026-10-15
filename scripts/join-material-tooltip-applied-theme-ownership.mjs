import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { materialStaticCases, materialInteractionCases, materialMobileFlowCases } from '../tests/material-parity/benchmark.config.mjs';
import { loadCaseObligationReview, saveReviewProposal } from './audit-findings-store.mjs';

// Exact physical-cohort join,not a substitute for each configured state's actions.
const script = 'scripts/join-material-tooltip-applied-theme-ownership.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const predecessor = '649034f898fb79a4649d76c967b8cef5bcc212b309042649220c4908c3e1c408';
const review = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const file = 'artifacts/material-parity/tooltip-applied-theme-ownership-20261016/latest-report.json';
assert.equal(receipt(file).sha256, '8b0745b4d144737be009c65c56b670048f505b994c74b38bb793118239c36ad3');
const proof = JSON.parse(readFileSync(file));
const verified = JSON.parse(execFileSync(process.execPath,
  ['scripts/audit-material-tooltip-applied-theme-ownership.mjs', '--verify', file], { encoding: 'utf8' }));
assert.equal(verified.contexts, 12);
const key = (profile, viewport) => JSON.stringify([profile, viewport.width, viewport.height, viewport.deviceScaleFactor]);
const cohorts = new Map(proof.results.map(row => [key(row.profile, row.viewport), row]));
assert.equal(cohorts.size, 12);
const configured = new Map();
for (const [kind, cases] of [['static', materialStaticCases], ['interaction', [...materialInteractionCases, ...materialMobileFlowCases]]]) {
  for (const row of cases) {
    const id = `${kind}:${row.family}@${row.profile}/${row.viewport.id}${row.state ? '/' + row.state : ''}`;
    assert.ok(!configured.has(id)); configured.set(id, row);
  }
}
assert.equal(configured.size, 2311);
const previous = [], counts = {};
for (const row of review.groups.filter(row => row.family === 'tooltip')) {
  const configuration = configured.get(row.case); assert.ok(configuration);
  const cohort = cohorts.get(key(configuration.profile, configuration.viewport));
  if (!cohort) continue;
  for (const side of ['reference', 'astylar']) {
    const captured = row.evidence.pairedTrees[side], bytes = readFileSync(captured.file);
    assert.equal(hash(bytes), captured.sha256);
    const tree = JSON.parse(bytes); assert.deepEqual(tree.errors, []);
    if (side === 'reference') {
      const frame = tree.nodes.filter(node => node.attributes?.class?.split(' ').includes('frame'));
      assert.equal(frame.length, 1);
      const rgb = cohort.reference.appliedTheme.surface.slice(1).match(/../g).map(x => parseInt(x, 16));
      assert.equal(tree.styles[frame[0].style].backgroundColor, `rgb(${rgb.join(', ')})`);
    } else {
      const page = tree.nodes.filter(node => node.authored?.id === 'page'); assert.equal(page.length, 1);
      assert.equal(page[0].normalResolvedStyle.background.toLowerCase(), cohort.astylar.appliedTheme.surface.toLowerCase());
    }
  }
  assert.deepEqual(cohort.astylar.cycles.map(c => c.live.materials), [14, 15, 16]);
  assert.deepEqual(cohort.astylar.cycles.map(c => c.tracked.materials), [13, 13, 13]);
  const original = row.obligations.historyOwnership;
  assert.equal(original.sameCohortAppliedThemePointerCycles, undefined);
  previous.push({ row, original });
  row.obligations.historyOwnership = { ...original, sameCohortAppliedThemePointerCycles: {
    disposition: 'inspected-failure', outcome: 'live-material-growth-despite-tracked-plateau',
    physicalContext: { profile: configuration.profile, viewport: configuration.viewport },
    cycles: cohort.astylar.cycles, disposal: cohort.astylar.disposal,
    evidence: { report: receipt(file), pairedTrees: row.evidence.pairedTrees,
      captureSources: proof.capture.sources, themeSource: proof.themeSource, join: receipt(script) },
    boundary: 'Same physical context and applied surface theme,ordinary pointer cycles only. Not exact configured action/state,all input equality,keyboard,late async,remount,isolation,paint or whole-case/current rendering acceptance.',
  } };
  assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
  counts[configuration.profile] = (counts[configuration.profile] ?? 0) + 1;
}
assert.equal(previous.length, 45);
assert.deepEqual(counts, { dark: 15, contrast: 15, custom: 15 });
const proposal = saveReviewProposal('artifacts/material-parity/working-audit', review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, [...configured.keys()]);
assert.equal(loaded.inspectionComplete, false); assert.equal(loaded.currentRenderingAccepted, false);
for (const { row, original } of previous) row.obligations.historyOwnership = original;
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposal, boundedOwnershipJoins: previous.length, counts,
  configuredCases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  unrelatedReviewConserved: true, inspectionComplete: false, currentRenderingAccepted: false }));
