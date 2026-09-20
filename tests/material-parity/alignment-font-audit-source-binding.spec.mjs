import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { projectAlignmentFontInputs, alignmentFontClassificationContexts, classifyAlignmentFontInput,
  validateAlignmentFontClassifications, stageAlignmentFontTransitions } from './alignment-font-audit-source-binding.mjs';
import { createHash } from 'node:crypto';
import { assertAlignmentAdapterReceiptSource } from './alignment-adapter-receipt-source.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
test('alignment/font adapter independently replays all original sources and validates complete membership without writes', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectAlignmentFontAuditInputs,validateAlignmentFontAuditInputs,validateAlignmentFontClassifications}
      from'./tests/material-parity/alignment-font-audit-source-binding.mjs';
    const r=JSON.parse(readFileSync('${originalFile}'));
    const e=collectAlignmentFontAuditInputs(r,{parityPath:'${originalFile}'});
    assert.equal(e.binding.status,'bound',e.binding.error);assert.equal(e.coverage.complete,true);
    assert.equal(e.binding.sourceProofsReplayed,true);assert.equal(e.binding.frozenCanonicalJoinReplayedNow,false);
    assert.equal(e.groups.length,72);assert.equal(e.observations.length,4016);
    assert.deepEqual(validateAlignmentFontAuditInputs(e),[]);
    assert.deepEqual(validateAlignmentFontClassifications(e,e.groups),[]);
    console.log(JSON.stringify({groups:e.groups.length,observations:e.observations.length,cases:e.coverage.sourceCases}));`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(output), { groups: 72, observations: 4016, cases: 2311 });
});

let shared;
function fixture() {
  if (!shared) {
    const original = JSON.parse(readFileSync(originalFile)), plans = {}, proofs = {}, descriptors = {};
    for (const [kind, file] of Object.entries({ alignment: 'docs/material-vertical-align-canonical-plan.json',
      fontStyle: 'docs/material-additional-control-font-style-attribution-plan.json' })) {
      const text = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
      plans[kind] = JSON.parse(text); descriptors[kind] = { file, revision: 'f8a1642', sha256: hash(text) };
      proofs[kind] = JSON.parse(readFileSync(plans[kind].sourceProof.file));
    }
    const n = plans.alignment.productionNormalization;
    const normalize = bindOwnerCaretNormalization(readFileSync(n.module, 'utf8'), n);
    const wanted = new Set(Object.values(plans).flatMap(p => p.proposed.flatMap(g => g.observations.slice(0, 1).map(o => o.case))));
    const subset = {};
    for (const [kind, field] of [['static', 'results'], ['interaction', 'interactions']])
      subset[field] = original[field].filter(e => wanted.has(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`));
    shared = { original, plans, proofs, descriptors, normalize, subset };
  }
  const { original, normalize, ...rest } = shared;
  return { original, normalize, ...structuredClone(rest) };
}

test('alignment/font projection preserves subset gaps, exact classifier input and earlier ownership reservations', () => {
  const f = fixture(), e = { binding: { status: 'bound' }, ...projectAlignmentFontInputs(f.subset, f) };
  assert.equal(e.coverage.complete, false); assert.ok(e.coverage.missingObservations.length);
  assert.equal(e.observations.length + e.coverage.missingObservations.length, 4016);
  const contexts = alignmentFontClassificationContexts(e);
  assert.equal(contexts.size, e.observations.length);
  assert.equal(e.groups.length, 72);
  assert.ok(!e.groups.some(g => g.element === 'expansion-primary'));
  assert.ok(!e.groups.some(g => ['bottom-sheet-overlay', 'snack-bar-overlay'].includes(g.element)));
  const inputs = new Map([['static', f.subset.results], ['interaction', f.subset.interactions]].flatMap(([kind, es]) => es.flatMap(e =>
    e.styleInputs.map(i => [JSON.stringify([`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, i.id]), i]))));
  for (const o of e.observations) {
    const input = inputs.get(JSON.stringify([o.case, o.element]));
    assert.equal(contexts.get(JSON.stringify([o.case, o.element, o.property])), o);
    const c = classifyAlignmentFontInput(input, o.property, o.reference, o.astylar, o);
    assert.equal(c.attribution, o.classification.attribution); assert.equal(c.reviewEvidence.rendererCauseProven, false);
  }
  assert.deepEqual(validateAlignmentFontClassifications(e, e.groups), []);
  assert.ok(validateAlignmentFontClassifications(e, e.groups.slice(1)).length);
  const changed = structuredClone(e.groups); changed[0].occurrences++;
  assert.ok(validateAlignmentFontClassifications(e, changed).length);
  const o = e.observations[0], i = inputs.get(JSON.stringify([o.case, o.element]));
  assert.throws(() => classifyAlignmentFontInput({ ...i, id: 'wrong' }, o.property, o.reference, o.astylar, o));
  assert.throws(() => classifyAlignmentFontInput(i, o.property, 'wrong', o.astylar, o));
  assert.equal(classifyAlignmentFontInput({}, 'width', '1px', undefined, undefined), undefined);
});

test('alignment/font projection rejects changed plans, proofs, original inputs and membership', () => {
  const changes = [
    f => { f.plans.alignment.proposed[0].proposedClassification = 'equivalent-representation'; },
    f => { f.plans.alignment.proposed.pop(); },
    f => { f.plans.fontStyle.proposed[0].observations.pop(); },
    f => { f.plans.fontStyle.proposed[0].renderingEquivalent = true; },
    f => { f.proofs.alignment.findings[0].proof.rendererCauseProven = true; },
    f => { f.proofs.fontStyle.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.subset.results[0].styleInputs[0].id = 'changed'; },
    f => { f.subset.results[0].viewport.width++; },
    f => { f.subset.results.push(f.subset.results[0]); },
    f => { f.subset.results.reverse(); },
  ];
  for (const [i, mutate] of changes.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => projectAlignmentFontInputs(f.subset, f), `mutation ${i}`);
  }
});

test('alignment/font metadata transition refuses changed or previously classified rows and preserves unrelated rows', () => {
  const f = fixture();
  const e = { binding: { status: 'bound' }, ...projectAlignmentFontInputs(f.original, f) };
  const rawFields = ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'];
  const digest = x => hash(JSON.stringify(x));
  const rows = e.groups.map(group => ({ ...Object.fromEntries(rawFields.filter(k => group[k] !== undefined).map(k => [k, group[k]])),
    classification: 'parity-harness-defect', attribution: 'unresolved', justification: 'synthetic mechanics test',
    recommendedOwner: 'unchanged', preservedExtraField: { a: [1, 2, 3] } }));
  const bindHashes = (rows, e) => rows.forEach((row, i) => {
    e.groups[i].originalCompleteRowSha256 = digest(row);
    e.groups[i].reviewEvidence.originalCompleteRowSha256 = digest(row);
  });
  bindHashes(rows, e);
  rows.push({ attribution: 'previously-reviewed', property: 'width', nested: { retain: [1, 2] } });
  const before = digest(rows), projected = stageAlignmentFontTransitions(rows, e);
  assert.equal(digest(rows), before); assert.equal(projected.changes.length, 72);
  assert.equal(projected.unchangedCompleteRows, 1); assert.equal(projected.previousUnresolved, 72);
  assert.equal(projected.projectedUnresolved, 0); assert.deepEqual(projected.rows.at(-1), rows.at(-1));
  for (let i = 0; i < 72; i++) {
    for (const key of rawFields) assert.deepEqual(projected.rows[i][key], rows[i][key]);
    assert.deepEqual(projected.rows[i].preservedExtraField, rows[i].preservedExtraField);
  }
  const changes = [
    (r, x) => { r[0].reference = 'changed'; },
    (r, x) => { r.splice(0, 1); },
    (r, x) => { r.push(r[0]); },
    (r, x) => { x.groups.push(x.groups[0]); },
    (r, x) => { x.coverage.complete = false; },
    (r, x) => { x.groups[0].occurrences++; },
    (r, x) => { r[0].attribution = 'previous-review'; bindHashes(r.slice(0, 72), x); },
  ];
  for (const [index, mutate] of changes.entries()) {
    const r = structuredClone(rows), x = structuredClone(e); mutate(r, x);
    assert.throws(() => stageAlignmentFontTransitions(r, x), `transition mutation ${index}`);
  }
});

test('saved current dry run preserves its exact source and full-row transition receipt without claiming promotion', () => {
  const receipt = JSON.parse(readFileSync('docs/material-alignment-font-transition-dry-run.json'));
  assert.equal(receipt.kind, 'source-replayed-alignment-font-current-dry-run');
  assertAlignmentAdapterReceiptSource(receipt.sourceBinding);
  const log = readFileSync(receipt.log.file);
  assert.equal(hash(log), 'f10d893aea55dbb907e5dd4235ef7e95bbf6f1ed500a79887fb349172a5d5506');
  assert.equal(hash(log), receipt.log.sha256);
  const { schemaVersion, kind, sourceBinding, log: descriptor, canonicalIntegration, ...result } = receipt;
  assert.deepEqual(result, JSON.parse(log));
  assert.equal(canonicalIntegration, false); assert.equal(result.canonicalFilesChanged, false);
  assert.equal(result.changes.length, 72); assert.equal(result.changes.reduce((n, c) => n + c.occurrences, 0), 4016);
  assert.equal(result.canonicalRows, 8339); assert.equal(result.unchangedCompleteRows, 8267);
  assert.equal(result.previousUnresolved, 1960); assert.equal(result.projectedUnresolved, 1888);
  assert.equal(result.inputEquivalent, false); assert.equal(result.renderingEquivalent, false);
});
