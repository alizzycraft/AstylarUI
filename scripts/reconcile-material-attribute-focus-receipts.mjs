import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { restoreAttributeFocusPolicy } from '../tests/material-parity/semantic-text-transform-registration.mjs';

// Specific two-file applicability transition,not a capture-receipt rewrite or
// generic fingerprint bypass. Original reports and the predecessor stay intact.
const base = 'artifacts/material-parity/working-audit';
const predecessor = '649143f5b98cd6c344e9a59fe4fded12e295f1d0eb5fe7844cb57a87c93a7d58';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const policy = 'tests/material-parity/input-equivalence-policy.mjs';
const suite = 'tests/material-parity/input-boundary-evidence.spec.mjs';
const currentPolicy = readFileSync(policy), currentSuite = readFileSync(suite);
assert.equal(hash(currentPolicy), '55c7e9cf1c634ebd8b01409b1836d1513f24e0c5ada656ce16f591aee1fd50a2');
assert.equal(hash(currentSuite), '34f8ec1e30814a6a026004b7320898fcd4709192293d5f89d00025508e182ae5');
const priorPolicy = Buffer.from(restoreAttributeFocusPolicy(currentPolicy));
const priorSuite = execFileSync('git', ['show', `3b317663:${suite}`], { maxBuffer: 4_000_000 });
assert.equal(hash(priorPolicy), 'de4d7a74b1576d8120a607a63bc61b86df610ced64dcd9f1f24c332c934546fe');
assert.equal(hash(priorSuite), '2aeff54b756f9adbf7c8e5a6a8ff6e1db73adef93ff30a3def6a7a3d858eef74');
assert.ok(currentSuite.subarray(0, priorSuite.length).equals(priorSuite));
assert.throws(() => restoreAttributeFocusPolicy(currentPolicy.toString() + '\n// unrelated drift'));
assert.ok(!Buffer.from(currentSuite.toString().replace('import assert', 'import changed')).subarray(0, priorSuite.length).equals(priorSuite));
const source = ts.createSourceFile(suite, currentSuite.toString(), ts.ScriptTarget.Latest, true);
const divider = source.statements.filter(ts.isExpressionStatement).map(n => n.expression)
  .find(n => ts.isCallExpression(n) && n.expression.getText(source) === 'test' &&
    n.arguments[0]?.text === 'divider actual-theme AX cohorts preserve exact contexts and runtime receipts');
assert.equal(hash(divider.arguments[1].getText(source)), 'a0c5e039b2e92db68febff91b127d23f0fa9de7782409c7a79bc5ea83a1cf911');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const replayLog = 'artifacts/material-parity/attribute-focus-retained-owner-proof-replay-20261017.log';
const dividerLog = 'artifacts/material-parity/attribute-focus-divider-exact-registered-proof-20261017.log';
const replay = readFileSync(replayLog, 'utf8'), exact = readFileSync(dividerLog, 'utf8');
assert.match(replay, /# pass 5\b/); assert.match(replay, /# fail 1\b/);
assert.match(replay, /not ok \d+ - retained divider responsive accessibility/);
for (const name of ['Icon pending image Angular remount', 'minimal public mount cancellation',
  'current initial-render reporter', 'Icon live theme replacement', 'retained progress focus caps'])
  assert.match(replay, new RegExp(`ok \\d+ - ${name}`));
assert.match(exact, /ok 1 - divider actual-theme AX cohorts/);
assert.match(exact, /# pass 1\b/); assert.match(exact, /# fail 0\b/);

const pointerBytes = readFileSync(`${base}/current.json`), pointer = JSON.parse(pointerBytes);
const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`);
assert.equal(hash(indexBytes), pointer.indexSha256);
const coverage = JSON.parse(indexBytes).metadata.coverage;
const configured = [...coverage.caseInventory.static, ...coverage.caseInventory.interaction];
const predecessorFile = `${base}/proposals/${predecessor}.json`;
// Validate the preserved predecessor at an explicitly historical two-read
// boundary. All other dependencies are read as they actually exist now.
const historical = new Map([[path.resolve(policy), priorPolicy], [path.resolve(suite), priorSuite]]);
const historicalRead = (file, options) => {
  const bytes = historical.get(path.resolve(String(file)));
  return bytes ? options === 'utf8' ? bytes.toString() : bytes : readFileSync(file, options);
};
loadCaseObligationReview(predecessorFile, predecessor, configured, { read: historicalRead });
const review = JSON.parse(readFileSync(predecessorFile)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const changes = new Map([[policy, { before: hash(priorPolicy), after: hash(currentPolicy), count: 0 }],
  [suite, { before: hash(priorSuite), after: hash(currentSuite), count: 0 }]]);
const modified = [], affected = [];
const evidence = { producer: receipt('scripts/reconcile-material-attribute-focus-receipts.mjs'),
  registration: receipt('artifacts/material-parity/attribute-focus-registration-conservation-20261017.log'),
  suiteConservation: receipt('artifacts/material-parity/attribute-focus-current-suite-conservation-20261017.log'),
  retainedReplay: receipt(replayLog), exactDividerReplay: receipt(dividerLog) };
for (const row of review.groups) {
  const transitions = new Set();
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    const transition = changes.get(value.file);
    if (transition && typeof value.sha256 === 'string') {
      assert.equal(value.sha256, transition.before);
      modified.push({ value, previous: value.sha256 }); value.sha256 = transition.after;
      transition.count++; transitions.add(value.file);
    }
    for (const child of Object.values(value)) visit(child);
  }
  visit(row);
  if (!transitions.size) continue;
  const owner = row.obligations.sourceCurrentness;
  assert.equal(owner.disposition, 'partial');
  assert.equal(owner.attributeFocusReceiptApplicability, undefined); affected.push(owner);
  owner.attributeFocusReceiptApplicability = { disposition: 'inspected-source-applicability-only',
    predecessorReview: predecessor,
    transitions: [...transitions].map(logicalFile => ({ logicalFile,
      historicalRevision: '3b317663', recordedSha256: changes.get(logicalFile).before,
      currentSha256: changes.get(logicalFile).after })), evidence,
    boundary: 'Current analysis/proof receipts only. Prior policy bytes and complete original suite survive exactly; original captures and this predecessor remain preserved. Five relevant retained assertions and the exact queued divider callback pass. Separate older responsive-divider raw-helper failure remains historical and unresolved by this transition. Not current browser rendering,AT,case closure or permission to refresh capture receipts.' };
}
assert.equal(changes.get(policy).count, 737); assert.equal(changes.get(suite).count, 120);
const proposal = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
for (const owner of affected) delete owner.attributeFocusReceiptApplicability;
for (const { value, previous } of modified) value.sha256 = previous;
assert.equal(hash(JSON.stringify(review)), predecessor, 'Unrelated case data changed');
assert.deepEqual(readFileSync(`${base}/current.json`), pointerBytes);
console.log(JSON.stringify({ predecessor, proposal, receiptUpdates: modified.length,
  policyReferences: 737, suiteReferences: 120, affectedCases: affected.length,
  cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
  entirePredecessorRecovered: true, negativeSourceControls: 2, exactDividerCallbackPreserved: true,
  historicalReadsExplicit: 2, originalCapturesRewritten: false, acceptedPointerUnchanged: true,
  inspectionComplete: loaded.inspectionComplete, currentRenderingAccepted: loaded.currentRenderingAccepted }));
