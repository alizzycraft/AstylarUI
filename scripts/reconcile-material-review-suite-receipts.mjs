import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { loadCaseObligationReview, saveReviewProposal } from './audit-findings-store.mjs';

// Narrow applicability repair for two demonstrated stale suite dependencies.
// This is not a general receipt refresh or a current-rendering certificate.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const revision = '24c2532d';
const predecessor = '58ec5402d137657aa2d223d78db4fc56d1baec38a80d33d745bf07b233d656a1';
const base = 'artifacts/material-parity/working-audit';
export const suiteReceiptTransitions = Object.freeze([
  { file: 'tests/material-parity/input-boundary-evidence.spec.mjs',
    before: '34f8ec1e30814a6a026004b7320898fcd4709192293d5f89d00025508e182ae5',
    after: '9ef883389c3aa8811d3a0a4756bc9e6f7cce82158c62ea453c08b4bb654c6367',
    changed: ['checkpoint application source census confines drift to the documented serializer diagnostic',
      'runtime wiring and metadata retain original assertions beyond authenticated diagnostic drift'],
    added: [], references: 120, cases: 100 },
  { file: 'tests/material-parity/icon-asset-input.spec.mjs',
    before: '6f46df6414ba1ff25cdbe9b106b2e3d456d8e1c140c2bde11314b738ee2fd675',
    after: '5b6d0f9164da1d711943fb9203137b5efa0d0693bbd4252ad00ad6143f414de4',
    changed: ['Icon review conserves complete original rows and rejects input drift'],
    added: ['Icon review skips only explicitly non-Icon populations without altering their rows'], references: 80, cases: 20 },
]);
const proofLogs = [
  ['checkpoint-app-retained-map-census-20261018', 'd6ca0a158f92c5e4e6a4049345380d5bdfff86b55ce8efef976ee9489795e6fe', 1],
  ['runtime-wiring-current-equality-20261018', 'd32f9aa43a4c520e39f72e62057dba6e9dc36d34c4549ad0fce4c7195be9e6c0', 2],
  ['icon-subset-projection-complete-controls-20261018', '9f6c3cf533250fc409f81ccbd91e04f6de20794d495e939da528e06b71b57744', 2],
];
const testCall = node => ts.isExpressionStatement(node) && ts.isCallExpression(node.expression) &&
  node.expression.expression.getText() === 'test' ? node.expression : undefined;
const testName = node => testCall(node)?.arguments[0]?.text;
const parse = (file, bytes) => {
  const tree = ts.createSourceFile(file, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(tree.parseDiagnostics.length, 0); return tree;
};
const assertions = node => {
  const found = [];
  const visit = n => {
    if (ts.isCallExpression(n) && n.expression.getText().startsWith('assert.')) found.push(n.getText());
    ts.forEachChild(n, visit);
  };
  visit(node); return found;
};

export function verifyMaterialReviewSuiteTransitions({ read = readFileSync } = {}) {
  const historicalSources = new Map(), sources = [];
  for (const transition of suiteReceiptTransitions) {
    const previous = execFileSync('git', ['show', `${revision}:${transition.file}`], { maxBuffer: 4_000_000 });
    const current = read(transition.file);
    assert.equal(hash(previous), transition.before, 'historical suite source changed');
    assert.equal(hash(current), transition.after, 'unreviewed suite source drift');
    historicalSources.set(path.resolve(transition.file), previous);
    const before = parse(transition.file, previous), after = parse(transition.file, current);
    const additions = after.statements.filter(node => transition.added.includes(testName(node)));
    assert.deepEqual(additions.map(testName), transition.added);
    const retained = after.statements.filter(node => !additions.includes(node));
    assert.equal(retained.length, before.statements.length, 'suite statement population changed');
    const changed = [];
    let unchangedStatements = 0, unchangedTestCallbacks = 0, preservedIconStatements = 0;
    for (let i = 0; i < retained.length; i++) {
      const old = before.statements[i], now = retained[i], name = testName(old);
      if (old.getText(before) === now.getText(after)) {
        unchangedStatements++; if (name) unchangedTestCallbacks++; continue;
      }
      assert.equal(testName(now), name);
      assert.ok(transition.changed.includes(name), 'unrelated proof callback or statement changed');
      changed.push(name);
      if (transition.file.endsWith('icon-asset-input.spec.mjs')) {
        const oldBody = testCall(old).arguments[1].body.statements;
        const newBody = testCall(now).arguments[1].body.statements;
        let cursor = 0;
        for (const statement of oldBody) {
          while (cursor < newBody.length && statement.getText(before) !== newBody[cursor].getText(after)) cursor++;
          assert.ok(cursor < newBody.length, 'original Icon review statement lost or reordered');
          cursor++; preservedIconStatements++;
        }
      } else {
        const present = new Set(assertions(now));
        for (const assertion of assertions(old)) {
          // The old wrapper forced stale installed diagnostic drift. Its current
          // equality replacement is verified by the pinned two-test log below.
          if (name.startsWith('runtime wiring') && assertion === 'assert.equal(diagnosticDifferences, 1)') continue;
          assert.ok(present.has(assertion), 'original diagnostic assertion lost');
        }
      }
    }
    assert.deepEqual(changed, transition.changed);
    sources.push({ ...transition, historicalRevision: revision, unchangedStatements, unchangedTestCallbacks, preservedIconStatements });
  }
  const evidence = proofLogs.map(([name, sha256, passes]) => {
    const file = `artifacts/material-parity/${name}.log`, bytes = read(file), text = bytes.toString();
    assert.equal(hash(bytes), sha256, 'source transition proof log changed');
    for (const [field, value] of [['pass', passes], ['fail', 0], ['skipped', 0], ['cancelled', 0]])
      assert.match(text, new RegExp(`# ${field} ${value}\\b`));
    return { file, sha256 };
  });
  return { historicalSources, sources, evidence, renderingEquivalent: false, inspectionComplete: false };
}

export function reconcileMaterialReviewSuiteReceipts() {
  const verified = verifyMaterialReviewSuiteTransitions();
  const pointerFile = `${base}/current.json`, pointerBytes = readFileSync(pointerFile), pointer = JSON.parse(pointerBytes);
  assert.equal(pointer.generation, 'cd867bbed4534ee4f2e827ac9caea3b706a053bb7a867fceb5bcb26d54e0ecd5');
  const indexBytes = readFileSync(`${base}/${pointer.generation}/index.json`);
  assert.equal(hash(indexBytes), pointer.indexSha256);
  const coverage = JSON.parse(indexBytes).metadata.coverage;
  const configured = [...coverage.caseInventory.static, ...coverage.caseInventory.interaction];
  const sourceFile = `${base}/proposals/${predecessor}.json`;
  const historicalRead = (file, options) => {
    const bytes = verified.historicalSources.get(path.resolve(String(file)));
    return bytes ? options === 'utf8' ? bytes.toString() : bytes : readFileSync(file, options);
  };
  loadCaseObligationReview(sourceFile, predecessor, configured, { read: historicalRead });
  const review = JSON.parse(readFileSync(sourceFile)).review;
  assert.equal(hash(JSON.stringify(review)), predecessor);
  const changes = new Map(verified.sources.map(source => [source.file, { ...source, updates: 0, caseIds: new Set() }]));
  const modified = [], affected = [];
  const evidence = { producer: { file: 'scripts/reconcile-material-review-suite-receipts.mjs',
    sha256: hash(readFileSync('scripts/reconcile-material-review-suite-receipts.mjs')) }, proofs: verified.evidence };
  for (const row of review.groups) {
    const changedFiles = new Set();
    const visit = value => {
      if (!value || typeof value !== 'object') return;
      const change = changes.get(value.file);
      if (change && typeof value.sha256 === 'string') {
        assert.equal(value.sha256, change.before);
        modified.push({ value, previous: value.sha256 }); value.sha256 = change.after;
        change.updates++; change.caseIds.add(row.case); changedFiles.add(value.file);
      }
      for (const child of Object.values(value)) visit(child);
    };
    visit(row);
    if (!changedFiles.size) continue;
    const owner = row.obligations.sourceCurrentness;
    assert.equal(owner.disposition, 'partial'); assert.equal(owner.reviewSuiteReceiptApplicability, undefined);
    affected.push(owner);
    owner.reviewSuiteReceiptApplicability = { disposition: 'inspected-source-applicability-only', predecessorReview: predecessor,
      transitions: [...changedFiles].map(file => ({ logicalFile: file, historicalRevision: revision,
        recordedSha256: changes.get(file).before, currentSha256: changes.get(file).after })), evidence,
      boundary: 'Two exact audit-suite transitions only. Other proof callbacks/statements and original Icon assertions are conserved; changed diagnostics retain original owner assertions with separately verified retained-map/current-equality boundaries. Historical captures and predecessor are unchanged. Not current browser rendering,complete lifecycle,all-source acceptance or whole-case closure.' };
  }
  for (const change of changes.values()) {
    assert.equal(change.updates, change.references); assert.equal(change.caseIds.size, change.cases);
  }
  const proposal = saveReviewProposal(base, review);
  const loaded = loadCaseObligationReview(proposal.file, proposal.sha256, configured);
  for (const owner of affected) delete owner.reviewSuiteReceiptApplicability;
  for (const change of modified) change.value.sha256 = change.previous;
  assert.equal(hash(JSON.stringify(review)), predecessor, 'unrelated case review data changed');
  assert.deepEqual(readFileSync(pointerFile), pointerBytes);
  return { predecessor, proposal, receiptUpdates: modified.length, affectedCases: affected.length,
    cases: loaded.cases.length, dependencies: loaded.evidenceFingerprints.length,
    sources: verified.sources, historicalReadsExplicit: 2, entirePredecessorRecovered: true,
    acceptedPointerUnchanged: true, inspectionComplete: loaded.inspectionComplete,
    currentRenderingAccepted: loaded.currentRenderingAccepted };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--verify-only');
  if (process.argv[2] === '--verify-only') {
    const { historicalSources, ...proof } = verifyMaterialReviewSuiteTransitions();
    console.log(JSON.stringify(proof, null, 2));
  } else console.log(JSON.stringify(reconcileMaterialReviewSuiteReceipts(), null, 2));
}
