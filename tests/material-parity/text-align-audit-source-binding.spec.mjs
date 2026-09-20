import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { assertAlignmentAdapterReceiptSource } from './alignment-adapter-receipt-source.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { projectTextAlignInputs, textAlignClassificationContexts, classifyTextAlignInput,
  validateTextAlignClassifications, stageTextAlignTransitions, collectTextAlignAuditInputs } from './text-align-audit-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex'), digest = x => hash(JSON.stringify(x));
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
test('text alignment adapter independently replays complete original ancestry and exact membership without writes', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectTextAlignAuditInputs,validateTextAlignAuditInputs,validateTextAlignClassifications}
      from'./tests/material-parity/text-align-audit-source-binding.mjs';
    const r=JSON.parse(readFileSync('${originalFile}'));
    const e=collectTextAlignAuditInputs(r,{parityPath:'${originalFile}'});
    assert.equal(e.binding.status,'bound',e.binding.error);assert.equal(e.coverage.complete,true);
    assert.equal(e.binding.normalizationContracts.current.sha256,'27fcf8d751bb10a5a7e9426a4d21b83de3c0d9242387d75a67613b953940c773');
    assert.notEqual(e.binding.normalizationContracts.historicalPlans.sha256,e.binding.normalizationContracts.current.sha256);
    assert.equal(e.binding.sourceProofReplayed,true);assert.equal(e.binding.frozenCanonicalJoinReplayedNow,false);
    assert.deepEqual(validateTextAlignAuditInputs(e),[]);assert.deepEqual(validateTextAlignClassifications(e,e.groups),[]);
    console.log(JSON.stringify({groups:e.groups.length,observations:e.observations.length,cases:e.coverage.sourceCases}));`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(output), { groups: 49, observations: 2677, cases: 2311 });
});

let shared;
function fixture() {
  if (!shared) {
    const original = JSON.parse(readFileSync(originalFile)), file = 'docs/material-text-align-canonical-plan.json';
    const text = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), plan = JSON.parse(text);
    const proof = JSON.parse(readFileSync(plan.sourceProof.file)), n = plan.productionNormalization;
    const normalize = bindPreciseAuditNormalization();
    const wanted = new Set(plan.proposed.map(p => p.observations[0].case)), subset = {};
    for (const [kind, field] of [['static', 'results'], ['interaction', 'interactions']])
      subset[field] = original[field].filter(e => wanted.has(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`));
    shared = { original, plan, proof, normalize, subset, descriptor: { file, revision: 'e3bc804', sha256: hash(text) } };
  }
  const { original, normalize, ...rest } = shared;
  return { original, normalize, ...structuredClone(rest) };
}

test('text alignment subset keeps missing coverage, classifier identity and all reserved groups explicit', () => {
  const f = fixture(), e = { binding: { status: 'bound' }, ...projectTextAlignInputs(f.subset, f) };
  assert.equal(e.coverage.complete, false); assert.ok(e.coverage.missingObservations.length);
  assert.equal(e.observations.length + e.coverage.missingObservations.length, 2677); assert.equal(e.groups.length, 49);
  const contexts = textAlignClassificationContexts(e); assert.equal(contexts.size, e.observations.length);
  const reserved = new Set([...f.plan.retained, ...f.plan.previous].map(p => p.canonicalRowSha256));
  assert.ok(e.groups.every(g => !reserved.has(g.originalCompleteRowSha256)));
  const inputs = new Map([['static', f.subset.results], ['interaction', f.subset.interactions]].flatMap(([kind, es]) => es.flatMap(e =>
    e.styleInputs.map(i => [JSON.stringify([`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, i.id]), i]))));
  for (const o of e.observations) {
    const input = inputs.get(JSON.stringify([o.case, o.element]));
    assert.equal(contexts.get(JSON.stringify([o.case, o.element, o.property])), o);
    const reference = f.normalize(input.reference ?? {})[o.property];
    const astylar = f.normalize(input.astylar ?? {})[o.property];
    assert.equal(reference, o.reference); assert.equal(astylar, o.astylar);
    const c = classifyTextAlignInput(input, o.property, reference, astylar, o);
    assert.equal(c.attribution, o.classification.attribution); assert.equal(c.reviewEvidence.computedCandidateVerified, false);
  }
  assert.deepEqual(validateTextAlignClassifications(e, e.groups), []);
  assert.ok(validateTextAlignClassifications(e, e.groups.slice(1)).length);
  const duplicate = [...e.groups, e.groups[0]]; assert.ok(validateTextAlignClassifications(e, duplicate).length);
  const changed = structuredClone(e.groups); changed[0].occurrences++; assert.ok(validateTextAlignClassifications(e, changed).length);
  const o = e.observations[0], input = inputs.get(JSON.stringify([o.case, o.element]));
  assert.throws(() => classifyTextAlignInput({ ...input, id: 'wrong' }, o.property, o.reference, o.astylar, o));
  assert.throws(() => classifyTextAlignInput(input, o.property, 'wrong', o.astylar, o));
  assert.equal(classifyTextAlignInput({}, 'width', '1px', undefined, undefined), undefined);
  assert.equal(collectTextAlignAuditInputs({}).binding.status, 'unbound');
  assert.equal(collectTextAlignAuditInputs({}, { parityPath: 'package.json' }).binding.status, 'invalid');
});

test('text alignment projection rejects changed proposals, ancestry, members and original input ordering', () => {
  const mutations = [
    f => { f.plan.proposed[0].proposedClassification = 'equivalent-representation'; },
    f => { f.plan.proposed.pop(); },
    f => { f.plan.proposed[0].observations.pop(); },
    f => { f.plan.proposed[0].candidateComputedVerified = true; },
    f => { f.proof.patterns[0].proof.referencePath[0].computed.direction = 'rtl'; },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.subset.results[0].styleInputs[0].id = 'changed'; },
    f => { f.subset.results[0].viewport.width++; },
    f => { f.subset.results.push(f.subset.results[0]); },
    f => { f.subset.results.reverse(); },
    f => { const normalize = f.normalize; f.normalize = input => ({
      ...normalize(input), textAlign: 'incorrect-current-value' }); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => projectTextAlignInputs(f.subset, f), `mutation ${index}`);
  }
});

test('text alignment transition preserves all raw fields and rejects changed or previously reviewed rows', () => {
  const f = fixture(), e = { binding: { status: 'bound' }, ...projectTextAlignInputs(f.original, f) };
  const raw = ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'];
  const rows = e.groups.map(g => ({ ...Object.fromEntries(raw.filter(k => g[k] !== undefined).map(k => [k, g[k]])),
    classification: 'parity-harness-defect', attribution: 'unresolved', justification: 'synthetic mechanics test',
    recommendedOwner: 'unchanged', additionalData: { values: [1, 2, 3] } }));
  const bind = (rows, evidence) => rows.forEach((row, i) => {
    evidence.groups[i].originalCompleteRowSha256 = digest(row); evidence.groups[i].reviewEvidence.originalCompleteRowSha256 = digest(row);
  });
  bind(rows, e); rows.push({ attribution: 'previous-review', property: 'width', extra: [1, 2] });
  const before = digest(rows), result = stageTextAlignTransitions(rows, e);
  assert.equal(digest(rows), before); assert.equal(result.changes.length, 49); assert.equal(result.unchangedCompleteRows, 1);
  assert.equal(result.previousUnresolved, 49); assert.equal(result.projectedUnresolved, 0);
  assert.deepEqual(result.rows.at(-1), rows.at(-1)); assert.equal(result.canonicalFilesChanged, false);
  for (let i = 0; i < 49; i++) for (const key of [...raw, 'additionalData']) assert.deepEqual(result.rows[i][key], rows[i][key]);
  const mutations = [
    (r, x) => { r[0].reference = 'changed'; },
    (r, x) => { r.splice(0, 1); },
    (r, x) => { r.push(r[0]); },
    (r, x) => { x.groups.push(x.groups[0]); },
    (r, x) => { x.coverage.complete = false; },
    (r, x) => { x.groups[0].occurrences++; },
    (r, x) => { r[0].attribution = 'previous-review'; bind(r.slice(0, 49), x); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const r = structuredClone(rows), x = structuredClone(e); mutate(r, x);
    assert.throws(() => stageTextAlignTransitions(r, x), `transition mutation ${index}`);
  }
});

test('current full-payload dry-run receipt binds every proposed row without claiming canonical integration', () => {
  const receipt = JSON.parse(readFileSync('docs/material-text-align-transition-dry-run.json'));
  assert.equal(receipt.kind, 'source-replayed-text-alignment-current-dry-run-receipt');
  assertAlignmentAdapterReceiptSource(receipt.sourceBinding);
  const bytes = readFileSync(receipt.log.file); assert.equal(hash(bytes), receipt.log.sha256);
  const result = JSON.parse(bytes), plan = fixture().plan;
  assert.equal(result.kind, 'source-replayed-text-alignment-current-dry-run');
  assert.equal(result.canonical.compressedSha256, receipt.canonicalCompressedSha256);
  assert.equal(result.canonical.uncompressedSha256, receipt.canonicalUncompressedSha256);
  assert.equal(result.changes.length, receipt.changedGroups);
  assert.equal(result.changes.reduce((n, r) => n + r.occurrences, 0), receipt.changedObservations);
  const before = new Set(result.changes.map(c => c.previousCompleteRowSha256));
  assert.equal(before.size, 49); assert.deepEqual(before, new Set(plan.proposed.map(p => p.canonicalRowSha256)));
  for (const change of result.changes) {
    const p = plan.proposed.find(p => p.canonicalRowSha256 === change.previousCompleteRowSha256);
    for (const key of ['family', 'element', 'property', 'occurrences']) assert.equal(change[key], p[key]);
    assert.equal(change.attribution, p.proposedAttribution); assert.match(change.projectedCompleteRowSha256, /^[a-f0-9]{64}$/);
  }
  for (const key of ['canonicalRows', 'unchangedCompleteRows', 'unchangedOrderedRowDigestsSha256',
    'previousUnresolved', 'projectedUnresolved', 'canonicalFilesChanged', 'inputEquivalent', 'renderingEquivalent'])
    assert.deepEqual(result[key], receipt[key]);
  assert.equal(receipt.canonicalRows, 8339); assert.equal(receipt.changedGroups, 49);
  assert.equal(receipt.changedObservations, 2677); assert.equal(receipt.unchangedCompleteRows, 8290);
  assert.equal(receipt.previousUnresolved, 1960); assert.equal(receipt.projectedUnresolved, 1911);
  assert.equal(receipt.canonicalIntegration, false); assert.equal(receipt.canonicalFilesChanged, false);
  assert.equal(receipt.inputEquivalent, false); assert.equal(receipt.renderingEquivalent, false);
});
