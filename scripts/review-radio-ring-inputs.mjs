import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { saveReviewProposal } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const predecessor = '22dfe00b8db5f815fb460847c2bdc39e8d60d8e54222266b5d7dc85cadaeb7b7';
const proposalFile = `artifacts/material-parity/working-audit/proposals/${predecessor}.json`;
const prior = JSON.parse(readFileSync(proposalFile));
assert.equal(hash(JSON.stringify(prior.review)), predecessor);
assert.equal(prior.review.groups.length, 172);
assert.deepEqual(prior.review.groups.slice(0, -1), sourceAuditDefinitions);
for (const r of prior.review.groups.at(-1).evidence) assert.equal(hash(readFileSync(r.file)), r.sha256);
const log = 'artifacts/material-parity/radio-ring-inputs-20261021.log';
const replay = execFileSync(process.execPath, ['scripts/check-radio-ring-inputs.mjs'], { maxBuffer: 2_000_000 });
assert.deepEqual(replay, readFileSync(log), 'Exact retained population replay');
const report = JSON.parse(replay);
const file = 'examples/material-showcase/src/app/astylar.component.ts';
const pattern = "selector: '\\.radio-ring',";
assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern, 'g'))].length, 1);
const history = [
  ['2f440115740ff76fa9e55b3f4a11568207b2af5a', '6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24'],
  ['f3c8254c2aa63197c03e0fb2bd43cc98c0e57fed', '944417c135e7f917f88ff9772096d2b527b47c1c9911369bcecef71ed540d94c'],
].map(([revision, sha256]) => {
  const bytes = execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 2_000_000 });
  assert.equal(hash(bytes), sha256);
  const rules = bytes.toString().split(/\r?\n/).filter(line => /selector: '\.radio-(ring|dot)/.test(line)).map(line => line.trim());
  assert.equal(rules.length, 3);
  assert.match(rules[0], /borderColor: theme\.onSurface/);
  assert.match(rules[1], /borderColor: theme\.primary/);
  assert.ok(rules.every(rule => !rule.includes('opacity:')));
  return { revision, file, sha256, rules };
});
const finding = {
  id: 'fixture-radio-ring-state-paint-token-substitution', introducedBy: 'Initial2f440115 and laterf3c8254c both retain the base/selected token substitution;not every revision or compensation motive',
  file, pattern, classification: 'application-plugin-authoring-defect',
  owner: 'Material showcase radio state/theme border-color and disabled circle-opacity authoring',
  focusedProof: 'node scripts/check-radio-ring-inputs.mjs; node scripts/review-radio-ring-inputs.mjs',
  observation: { component: 'radio', owners: 136, cases: 68, ...report.counts,
    stage: 'Original native matched component rules and computed paint requests differ before candidate rendering' },
  justification: 'All136 rings map four native border sides to the candidate ring.52 enabled-unselected and8 disabled-selected color inputs differ;all16 disabled own-opacity inputs differ(.38 versus1).60 enabled-selected colors agree. Native active rules distinguish component unselected,hover,focus,selected and disabled tokens;current candidate uses onSurface base and primary selected without disabled ring opacity. Existing complete current-authoring applicability binds all68 source subtrees/styles. Two exact historical files preserve these color choices despite dot/layout changes. This is unequal requested paint,not proof that core misrenders equal color/opacity inputs.',
  history,
  evidence: [file, 'scripts/check-radio-ring-inputs.mjs', 'scripts/review-radio-ring-inputs.mjs', log,
    'artifacts/material-parity/radio-descendant-inputs-20261021.log',
    'artifacts/material-parity/radio-authoring-applicability-20261021.log', proposalFile].map(receipt),
  recommendation: 'Restore original component state/theme paint requests with original structure/CSS before evaluating core paint. Preserve disabled circle opacity separately from label opacity and selected/unselected/hover/focus tokens. Do not tune sampled colors or opacity to imitate a screenshot.',
  boundary: 'Four-side requested color and own opacity only. Ancestor compositing,inner-dot scale equivalence,animated ripple paint,actual pixels,AX,activation and complete current case rendering remain open. Distinct from disabled-label ink and native form-value label synthesis. Historical source snapshots do not establish motive or a first-bad runtime revision.',
};
assert.equal(prior.review.groups.some(r => r.id === finding.id), false);
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { proposal: predecessor, count: 172, sha256: hash(JSON.stringify(prior.review.groups)) },
  groups: [...prior.review.groups, finding] };
assert.deepEqual(review.groups.slice(0, -1), prior.review.groups);
console.log(JSON.stringify(saveReviewProposal('artifacts/material-parity/working-audit', review)));
