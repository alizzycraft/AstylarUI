import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertAlignmentAdapterReceiptSource } from './alignment-adapter-receipt-source.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { projectLtrAlignmentInputs, ltrAlignmentClassificationContexts, classifyLtrAlignmentInput,
  validateLtrAlignmentClassifications, stageLtrAlignmentTransitions, collectLtrAlignmentAuditInputs } from './ltr-alignment-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex'), digest = x => hash(JSON.stringify(x));
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
test('LTR adapter independently replays original contexts, browser control and source history without writes', () => {
  const files = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'];
  const before = files.map(f => hash(readFileSync(f)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectLtrAlignmentAuditInputs,validateLtrAlignmentAuditInputs,validateLtrAlignmentClassifications}
      from'./tests/material-parity/ltr-alignment-audit-source-binding.mjs';
    const r=JSON.parse(readFileSync('${originalFile}'));
    const e=collectLtrAlignmentAuditInputs(r,{parityPath:'${originalFile}'});
    assert.equal(e.binding.status,'bound',e.binding.error);assert.equal(e.coverage.complete,true);
    assert.equal(e.binding.sourceReview.sourceProofReplayed,true);
    assert.equal(e.binding.sourceReview.frozenCanonicalJoinReplayedNow,false);
    assert.deepEqual(validateLtrAlignmentAuditInputs(e),[]);assert.deepEqual(validateLtrAlignmentClassifications(e,e.groups),[]);
    console.log(JSON.stringify({groups:e.groups.length,observations:e.observations.length,cases:e.coverage.sourceCases}));`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(output), { groups: 4, observations: 178, cases: 2311 });
  assert.deepEqual(files.map(f => hash(readFileSync(f))), before);
});

let shared;
function fixture() {
  if (!shared) {
    const original = JSON.parse(readFileSync(originalFile)), file = 'docs/material-ltr-alignment-review.json';
    const text = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), review = JSON.parse(text);
    const plan = JSON.parse(readFileSync(review.sourcePlan.file)), n = plan.productionNormalization;
    const normalize = bindOwnerCaretNormalization(readFileSync(n.module, 'utf8'), n);
    const wanted = new Set(review.groups.map(p => p.observations[0].case)), subset = {};
    for (const [kind, field] of [['static', 'results'], ['interaction', 'interactions']])
      subset[field] = original[field].filter(e => wanted.has(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`));
    shared = { original, review, normalize, subset, descriptor: { file, revision: '140ba41', sha256: hash(text) } };
  }
  const { original, normalize, ...rest } = shared;
  return { original, normalize, ...structuredClone(rest) };
}

test('LTR subset projection preserves missing coverage, original identity and six reserved groups', () => {
  const f = fixture(), e = { binding: { status: 'bound' }, ...projectLtrAlignmentInputs(f.subset, f) };
  assert.equal(e.coverage.complete, false); assert.ok(e.coverage.missingObservations.length);
  assert.equal(e.observations.length + e.coverage.missingObservations.length, 178); assert.equal(e.groups.length, 4);
  const contexts = ltrAlignmentClassificationContexts(e); assert.equal(contexts.size, e.observations.length);
  const reserved = new Set(f.review.otherRetainedGroups.map(g => g.originalCompleteRowSha256));
  assert.ok(e.groups.every(g => !reserved.has(g.originalCompleteRowSha256)));
  const inputs = new Map([['static', f.subset.results], ['interaction', f.subset.interactions]].flatMap(([kind, es]) => es.flatMap(e =>
    e.styleInputs.map(i => [JSON.stringify([`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, i.id]), i]))));
  for (const o of e.observations) {
    const input = inputs.get(JSON.stringify([o.case, o.element]));
    assert.equal(contexts.get(JSON.stringify([o.case, o.element, o.property])), o);
    const c = classifyLtrAlignmentInput(input, o.property, o.reference, o.astylar, o);
    assert.equal(c.attribution, o.classification.attribution); assert.equal(c.reviewEvidence.actualPlacementVerified, false);
  }
  assert.deepEqual(validateLtrAlignmentClassifications(e, e.groups), []);
  assert.ok(validateLtrAlignmentClassifications(e, e.groups.slice(1)).length);
  assert.ok(validateLtrAlignmentClassifications(e, [...e.groups, e.groups[0]]).length);
  const changed = structuredClone(e.groups); changed[0].reviewEvidence.actualPlacementVerified = true;
  assert.ok(validateLtrAlignmentClassifications(e, changed).length);
  const o = e.observations[0], input = inputs.get(JSON.stringify([o.case, o.element]));
  assert.throws(() => classifyLtrAlignmentInput({ ...input, id: 'wrong' }, o.property, o.reference, o.astylar, o));
  assert.throws(() => classifyLtrAlignmentInput(input, o.property, 'right', o.astylar, o));
  assert.equal(classifyLtrAlignmentInput({}, 'textAlign', 'start', 'left', undefined), undefined);
  assert.equal(collectLtrAlignmentAuditInputs({}).binding.status, 'unbound');
  assert.equal(collectLtrAlignmentAuditInputs({}, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('LTR projection rejects changed direction, scope, members and original input ordering', () => {
  const mutations = [
    f => { f.review.groups[0].proposedClassification = 'confirmed-core-defect'; },
    f => { f.review.groups.pop(); },
    f => { f.review.groups[0].observations.pop(); },
    f => { f.review.groups[0].observations[0].candidateComputedVerified = true; },
    f => { f.review.groups[0].observations[0].writingModes[0].direction = 'rtl'; },
    f => { f.review.groups[0].observations[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.subset.results[0].styleInputs[0].id = 'changed'; },
    f => { f.subset.results[0].viewport.width++; },
    f => { f.subset.results.push(f.subset.results[0]); },
    f => { f.subset.results.reverse(); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => projectLtrAlignmentInputs(f.subset, f), `mutation ${index}`);
  }
});

test('LTR transition changes metadata only and rejects changed or previously reviewed canonical rows', () => {
  const f = fixture(), e = { binding: { status: 'bound' }, ...projectLtrAlignmentInputs(f.original, f) };
  const raw = ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'];
  const rows = e.groups.map(g => ({ ...Object.fromEntries(raw.filter(k => g[k] !== undefined).map(k => [k, g[k]])),
    classification: 'parity-harness-defect', attribution: 'unresolved', justification: 'synthetic mechanics test',
    recommendedOwner: 'unchanged', additionalData: { values: [1, 2, 3] } }));
  const bind = (rows, evidence) => rows.forEach((row, i) => {
    evidence.groups[i].originalCompleteRowSha256 = digest(row);
    evidence.groups[i].reviewEvidence.originalCompleteRowSha256 = digest(row);
  });
  bind(rows, e); rows.push({ attribution: 'previous-review', property: 'width', extra: [1, 2] });
  const before = digest(rows), result = stageLtrAlignmentTransitions(rows, e);
  assert.equal(digest(rows), before); assert.equal(result.changes.length, 4); assert.equal(result.unchangedCompleteRows, 1);
  assert.equal(result.previousUnresolved, 4); assert.equal(result.projectedUnresolved, 0);
  assert.deepEqual(result.rows.at(-1), rows.at(-1)); assert.equal(result.canonicalFilesChanged, false);
  for (let i = 0; i < 4; i++) for (const key of [...raw, 'additionalData']) assert.deepEqual(result.rows[i][key], rows[i][key]);
  const mutations = [
    (r, x) => { r[0].reference = 'changed'; },
    (r, x) => { r.splice(0, 1); },
    (r, x) => { r.push(r[0]); },
    (r, x) => { x.groups.push(x.groups[0]); },
    (r, x) => { x.coverage.complete = false; },
    (r, x) => { x.groups[0].occurrences++; },
    (r, x) => { r[0].attribution = 'previous-review'; bind(r.slice(0, 4), x); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const r = structuredClone(rows), x = structuredClone(e); mutate(r, x);
    assert.throws(() => stageLtrAlignmentTransitions(r, x), `transition mutation ${index}`);
  }
});

test('full-current-payload receipt binds every proposed LTR row without claiming integration', () => {
  const receipt = JSON.parse(readFileSync('docs/material-ltr-alignment-transition-dry-run.json'));
  assert.equal(receipt.kind, 'source-replayed-ltr-alignment-current-dry-run-receipt');
  assertAlignmentAdapterReceiptSource(receipt.sourceBinding);
  const bytes = readFileSync(receipt.log.file); assert.equal(hash(bytes), receipt.log.sha256);
  const result = JSON.parse(bytes), review = fixture().review;
  assert.equal(result.kind, 'source-replayed-ltr-alignment-current-dry-run');
  assert.equal(result.canonical.compressedSha256, receipt.canonicalCompressedSha256);
  assert.equal(result.canonical.uncompressedSha256, receipt.canonicalUncompressedSha256);
  assert.equal(result.changes.length, receipt.changedGroups);
  assert.equal(result.changes.reduce((n, r) => n + r.occurrences, 0), receipt.changedObservations);
  const before = new Set(result.changes.map(c => c.previousCompleteRowSha256));
  assert.equal(before.size, 4); assert.deepEqual(before, new Set(review.groups.map(p => p.canonicalRowSha256)));
  for (const change of result.changes) {
    const p = review.groups.find(p => p.canonicalRowSha256 === change.previousCompleteRowSha256);
    for (const key of ['family', 'element', 'property', 'occurrences']) assert.equal(change[key], p[key]);
    assert.equal(change.attribution, p.proposedAttribution); assert.match(change.projectedCompleteRowSha256, /^[a-f0-9]{64}$/);
  }
  for (const key of ['canonicalRows', 'unchangedCompleteRows', 'unchangedOrderedRowDigestsSha256',
    'previousUnresolved', 'projectedUnresolved', 'canonicalFilesChanged', 'inputEquivalent', 'renderingEquivalent'])
    assert.deepEqual(result[key], receipt[key]);
  assert.equal(receipt.canonicalRows, 8339); assert.equal(receipt.changedGroups, 4);
  assert.equal(receipt.changedObservations, 178); assert.equal(receipt.unchangedCompleteRows, 8335);
  assert.equal(receipt.previousUnresolved, 1960); assert.equal(receipt.projectedUnresolved, 1956);
  assert.equal(receipt.canonicalIntegration, false); assert.equal(receipt.canonicalFilesChanged, false);
  assert.equal(receipt.inputEquivalent, false); assert.equal(receipt.renderingEquivalent, false);
});
