import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';

// Extend the existing pending source review, not the canonical definitions.
const hash = value => createHash('sha256').update(value).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const store = 'artifacts/material-parity/working-audit';
const previousId = 'f39d4c4cf1065eadfa494307434e7b1c17d393d8bc5794ca7d0fffd9974780e4';
const previousFile = `${store}/proposals/${previousId}.json`;
const previous = JSON.parse(fs.readFileSync(previousFile));
assert.equal(hash(JSON.stringify(previous.review)), previousId);
assert.equal(definitions.length, 173);
assert.equal(hash(JSON.stringify(definitions)), 'fd942c4c5cc68504b8511e308960c5e8b3223f0bc0656e35721df5942f207796');
assert.deepEqual(previous.review.groups.slice(0, 173), definitions);
assert.equal(previous.review.groups.length, 174);
const replay = (script, file) => {
  const bytes = execFileSync(process.execPath, [script], { maxBuffer: 4000000 });
  assert.deepEqual(bytes, fs.readFileSync(file));
  return JSON.parse(bytes);
};
const listFile = 'artifacts/material-parity/list-static-ax-review-20261021.log';
const passiveFile = 'artifacts/material-parity/passive-static-ax-review-20261021.log';
const list = replay('scripts/check-list-static-ax.mjs', listFile);
const passive = replay('scripts/check-passive-static-ax.mjs', passiveFile);
assert.equal(list.counts.extraCandidateMainLandmarks, 12);
assert.deepEqual(passive.counts, { pairedStaticCases: 36, captures: 72,
  matchingTableGridProjections: 24, additionalSharedPageMains: 36, additionalSidenavContentMains: 12 });
const historyFile = 'artifacts/material-parity/sidenav-main-authoring-history-20261021.log';
const history = JSON.parse(fs.readFileSync(historyFile));
for (const row of history.history) {
  const bytes = execFileSync('git', ['show', `${row.revision}:${row.file}`], { maxBuffer: 4000000 });
  assert.equal(hash(bytes), row.sha256);
  assert.ok(bytes.toString().includes(row.excerpt));
}
assert.deepEqual(history.currentActualAxEvidence, receipt(passiveFile));
const shared = structuredClone(previous.review.groups.at(-1));
assert.equal(shared.id, 'fixture-showcase-outer-and-semantic-page-duplicate-main-landmarks');
shared.observation = { ...shared.observation,
  component: 'shared showcase frame;48 static list/sidenav/grid-list/table cases',
  pairedStaticCases: 48, captures: 96 };
shared.justification += ' A separate retained72-capture actual-AX supplement verifies the same outer-frame/inner-page ancestor relationship in all36 static sidenav/grid-list/table cases. Sidenav has a third, separately authored content MAIN;do not conflate its local owner with the shared page owner.';
shared.evidence.push(receipt('scripts/capture-passive-static-ax.mjs'), receipt('scripts/check-passive-static-ax.mjs'),
  receipt(passiveFile), receipt('artifacts/material-parity/passive-static-ax-20261021/latest-report.json'),
  ...passive.rows.map(row => row.evidence));
shared.boundary = 'Actual duplicate page exposure verified for48 static pairs/96 captures only;not interaction states,all36 families,AT behavior,all AX associations,paint,first-bad runtime or compensation motive. Keep the original12-case proposal and checkpoint rejection.';
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const finding = {
  id: 'fixture-sidenav-content-promoted-to-main-landmark',
  introducedBy: 'Initial2f440115 candidate authors MAIN for sidenav-content versus reference MAT-SIDENAV-CONTENT;initial runtime and motive unproven',
  file: candidate, pattern: "type: 'main', id: 'sidenav-content'",
  classification: 'application-plugin-authoring-defect',
  owner: 'Material showcase sidenav content semantic element authoring',
  focusedProof: 'node scripts/check-passive-static-ax.mjs',
  observation: { component: 'sidenav-content', pairedStaticCases: 12, captures: 24,
    reference: 'MAT-SIDENAV-CONTENT exposed as generic with Main content text',
    astylar: 'MAIN exposed as main with Main content text',
    stage: 'authored content element before semantic bridge projection' },
  justification: 'All12 static pairs retain actual AX nodes resolved by backend DOM identity. Reference content is generic;candidate content is main. Current served component source maps bind to current authoring;candidate explicitly requests MAIN. Initial whole Git source bytes already retain this input mismatch. The renderer preserves the requested role;this is separate from the shared outer/page duplicate MAIN and not evidence that core invented a landmark.',
  history: history.history,
  evidence: [candidate, 'examples/material-showcase/src/app/reference.component.ts',
    'scripts/check-passive-static-ax.mjs', passiveFile, historyFile,
    'artifacts/material-parity/passive-static-ax-20261021/latest-report.json'].map(receipt),
  recommendation: 'Author sidenav content with the reference generic semantic contract while retaining its content and layout intent. Do not suppress MAIN roles in core or hide intended content to compensate.',
  boundary: 'Twelve static pairs only;not dynamic sidenav behavior,AT traversal,all header/description associations,layout/paint equivalence,initial runtime or compensation intent.',
};
assert.equal(fs.readFileSync(candidate, 'utf8').split(finding.pattern).length, 2);
assert.equal(definitions.some(row => row.id === finding.id), false);
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: 173, sha256: hash(JSON.stringify(definitions)) },
  groups: [...definitions, shared, finding] };
assert.deepEqual(review.groups.slice(0, 173), definitions);
const saved = saveReviewProposal(store, review);
assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(saved.file)).review)), saved.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/review-passive-main-landmarks.mjs'),
  previousProposal: receipt(previousFile), saved, complete173PredecessorPreserved: true,
  sharedPageStaticPairs: 48, distinctSidenavContentPairs: 12, captures: 96,
  bothOriginalVerifiersReplayExactly: true, initialHistoryReauthenticated: true,
  canonicalPublication: false, boundary: 'Pending source classification only;no registration,case closure,renderer/fixture changes or rendering acceptance.' }));
