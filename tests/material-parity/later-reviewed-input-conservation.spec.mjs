import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { reconstructBeforeReviewedInputMetadata, independentlyReconstructBeforeReviewedInputs,
  reconstructBeforeReviewedSourceBatchMetadata, independentlyReconstructLaterScalarReviews,
  reconstructBeforeFollowupInputMetadata } from './later-reviewed-input-conservation.mjs';
import { bindOwnerInitialStyleSource, collectOwnerInitialStyleEvidence } from './owner-initial-style-attribution.mjs';
import { withAuditScratch } from './audit-scratch.mjs';
import { collectFullTreeInventory, collectStyleDiscrepancies } from './input-equivalence-audit.mjs';
import { collectOriginStageEvidence } from './origin-stage-inventory-evidence.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { collectFollowupInputAuditInputs } from './followup-input-audit-source-binding.mjs';
import { collectBoundFieldHostLayout, fieldHostLayoutAttribution } from './field-host-layout-source-binding.mjs';
import { restoreScalarReviewExtraction } from './position-composition-producer-transition.mjs';
import { reviewedSourceBatchAttributions } from './reviewed-source-batch-audit-source-binding.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('pre-scalar replay preserves independently bound field-host stages instead of fabricating omissions', () => withAuditScratch('field-host-prescalar-', directory => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), families = ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'];
  const results = original.results.filter(entry => families.includes(entry.family) && entry.profile === 'light' && entry.viewport.id === 'desktop')
    .map(entry => ({ ...entry, styleInputs: entry.styleInputs.filter(input => input.id === `${entry.family}-primary`) }));
  assert.equal(results.length, 6);
  const supplied = { ...original, results, interactions: [] }, file = path.join(directory, 'report.json');
  writeFileSync(file, JSON.stringify(supplied));
  const options = { root: process.cwd(), parityPath: file }, cases = results.map(entry => ({ ...entry, kind: 'static' }));
  const inventory = collectFullTreeInventory(cases), owner = collectOwnerInitialStyleEvidence(supplied, inventory);
  const origin = collectOriginStageEvidence(cases, inventory, bindPreciseAuditNormalization(), { reviewedDisjointMotion: true });
  const binding = bindOwnerInitialStyleSource(supplied, options);
  const field = collectBoundFieldHostLayout(supplied, { ...options, collectInventory: collectFullTreeInventory });
  assert.equal(field.binding.status, 'bound', field.binding.error);
  const prefix = [cases, origin, { comparisons: [], differences: [] }, ...Array.from({ length: 19 }, () => []),
    { observations: [] }, { observations: [] }, { observations: [] }, [], owner];
  const initial = collectStyleDiscrepancies(...prefix);
  const classified = collectStyleDiscrepancies(...prefix, ...Array.from({ length: 9 }, () => ({ observations: [] })), field);
  const current = classified.filter(row => row.property === 'boxSizing');
  const previous = initial.filter(row => row.property === 'boxSizing');
  assert.equal(current.length, 6); assert.equal(previous.length, 6);
  assert.ok(current.every(row => row.attribution === fieldHostLayoutAttribution && row.reference === 'content-box' && row.astylar === 'border-box'));
  const audit = { discrepancies: current, ownerInitialStyleBinding: binding, fieldHostLayoutInputs: field };
  const before = structuredClone({ audit, previous });
  const replay = independentlyReconstructLaterScalarReviews(audit, { discrepancies: previous }, current, options);
  assert.deepEqual(replay.rows, previous); assert.equal(replay.changes.length, 6);
  assert.deepEqual({ audit, previous }, before);
  const forged = structuredClone(audit); forged.fieldHostLayoutInputs.observations[0].proof.properties[0].candidateAuthored = 'forged';
  assert.throws(() => independentlyReconstructLaterScalarReviews(forged, { discrepancies: previous }, forged.discrepancies, options),
    /pre-scalar field-host evidence differs/);
  const forgedRows = structuredClone(audit); forgedRows.discrepancies[0].justification = 'forged';
  assert.throws(() => independentlyReconstructLaterScalarReviews(forgedRows, { discrepancies: previous }, forgedRows.discrepancies, options),
    /later scalar metadata does not match/);
}));

test('followup refinement authenticates the complete captured initial predecessor without a family exemption', () => withAuditScratch('followup-predecessor-', directory => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), entries = original.results.filter(entry => entry.family === 'expansion' &&
    entry.profile === 'light' && entry.viewport.id === 'desktop');
  assert.equal(entries.length, 1);
  const entry = { ...entries[0], styleInputs: entries[0].styleInputs.filter(input => input.id === 'expansion-primary') };
  const supplied = { ...original, results: [entry], interactions: [] }, file = path.join(directory, 'report.json');
  writeFileSync(file, JSON.stringify(supplied));
  const options = { root: process.cwd(), parityPath: file };
  const sourceAudit = { ownerInitialStyleBinding: bindOwnerInitialStyleSource(supplied, options) };
  const cases = [{ ...entry, kind: 'static' }], inventory = collectFullTreeInventory(cases);
  const owner = collectOwnerInitialStyleEvidence(supplied, inventory);
  const origin = collectOriginStageEvidence(cases, inventory, bindPreciseAuditNormalization(), { reviewedDisjointMotion: true });
  const initial = collectStyleDiscrepancies(cases, origin, { comparisons: [], differences: [] },
    ...Array.from({ length: 19 }, () => []), { observations: [] }, { observations: [] }, { observations: [] }, [], owner);
  const evidence = collectFollowupInputAuditInputs(supplied, options);
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  const previous = evidence.groups.map(group => {
    const matches = initial.filter(row => row.family === group.family && row.element === group.element &&
      row.property === group.property && row.reference === group.reference && row.astylar === group.astylar);
    assert.equal(matches.length, 1); return matches[0];
  });
  const current = previous.map((row, i) => ({ ...row, ...Object.fromEntries(
    ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']
      .map(key => [key, evidence.groups[i][key]])) }));
  const earlier = previous.findIndex(row => row.property === 'appearance'); assert.ok(earlier >= 0);
  assert.equal(previous[earlier].attribution, 'reviewed-owner-initial-style-observation-stage');
  assert.equal(current[earlier].attribution, 'reviewed-expansion-panel-header-owner-mismatch');
  assert.throws(() => reconstructBeforeFollowupInputMetadata(previous, current, evidence), /cannot overwrite a historical attribution/);
  const scoped = { ...options, sourceAudit }, before = structuredClone({ previous, current, evidence });
  assert.deepEqual(reconstructBeforeFollowupInputMetadata(previous, current, evidence, scoped).rows, previous);
  assert.deepEqual({ previous, current, evidence }, before);
  const forged = structuredClone(previous); forged[earlier].justification = 'forged earlier conclusion';
  assert.throws(() => reconstructBeforeFollowupInputMetadata(forged, current, evidence, scoped), /complete historical predecessor differs/);
  const forgedRaw = structuredClone(previous), forgedCurrent = structuredClone(current);
  forgedRaw[earlier].referenceAuthoredExamples = []; forgedCurrent[earlier].referenceAuthoredExamples = [];
  assert.throws(() => reconstructBeforeFollowupInputMetadata(forgedRaw, forgedCurrent, evidence, scoped), /complete historical predecessor differs/);
  assert.throws(() => reconstructBeforeFollowupInputMetadata(previous, current, evidence,
    { ...scoped, sourceAudit: { ownerInitialStyleBinding: { status: 'unbound' } } }));
}));

test('scalar stage extraction preserves complete production source and rejects drift', () => {
  const current = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  const previous = execFileSync('git', ['show', '81b4fffb:tests/material-parity/input-equivalence-audit.mjs'],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  assert.equal(restoreScalarReviewExtraction(current), previous);
  assert.throws(() => restoreScalarReviewExtraction(current.replace('  return discrepancies;', '  return [];')));
  assert.throws(() => restoreScalarReviewExtraction(current + '\n// unrelated change\n'));
});

test('production scalar replay authenticates and restores all retained later reviews', () => {
  const file = 'artifacts/material-parity/owner-grid-integration-vjGiTG/report.json';
  const capture = readFileSync(file);
  assert.equal(createHash('sha256').update(capture).digest('hex'), '35622f289c9a8576679702c77be4b9bceb4a58f8a402be88f3639ffc0af15b37');
  const bytes = readFileSync('artifacts/material-parity/owner-grid-integration-vjGiTG/unrelated-row-differences.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '8c368166d0c8c752957112356516429cd912b8cc01aaeda33affe0c3b427321e');
  const pairs = JSON.parse(bytes).differences.filter(p => !reviewedSourceBatchAttributions.includes(p.current.attribution));
  assert.equal(pairs.length, 1133);
  const previous = { discrepancies: pairs.map(p => p.previous) };
  const audit = { discrepancies: pairs.map(p => p.current),
    ownerInitialStyleBinding: bindOwnerInitialStyleSource(JSON.parse(capture), { root: process.cwd(), parityPath: file }) };
  const before = digest({ audit, previous });
  const restored = independentlyReconstructLaterScalarReviews(audit, previous);
  assert.deepEqual(restored.rows, previous.discrepancies);
  assert.equal(restored.changes.length, 1133);
  assert.equal(digest({ audit, previous }), before, 'source reconstruction mutated supplied evidence');
  assert.throws(() => independentlyReconstructLaterScalarReviews({ ...audit,
    ownerInitialStyleBinding: { ...audit.ownerInitialStyleBinding, status: 'unbound' } }, previous));
});

test('source-batch subset reconstruction preserves complete raw rows and unrelated mutations', () => {
  const file = 'artifacts/material-parity/owner-grid-integration-vjGiTG/unrelated-row-differences.json';
  const bytes = readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), '8c368166d0c8c752957112356516429cd912b8cc01aaeda33affe0c3b427321e');
  const pairs = JSON.parse(bytes).differences.filter(p => reviewedSourceBatchAttributions.includes(p.current.attribution));
  assert.equal(pairs.length, 108);
  const previous = pairs.map(p => p.previous), current = pairs.map(p => p.current);
  // Pure reconstruction fixture only; the public entry point independently
  // replays sources before it can use this projection.
  const evidence = { binding: { status: 'bound' }, groups: current.map(row => ({ ...row,
    originalCompleteRowSha256: row.reviewEvidence.originalCompleteRowSha256 })),
    coverage: { suppliedObservations: current.reduce((n, r) => n + r.occurrences, 0) } };
  const before = digest({ previous, current, evidence });
  const restored = reconstructBeforeReviewedSourceBatchMetadata(previous, current, evidence);
  assert.deepEqual(restored.rows, previous); assert.equal(restored.changes.length, 108);
  assert.equal(restored.changes.reduce((n, r) => n + r.occurrences, 0), 318);
  assert.equal(digest({ previous, current, evidence }), before);
  const unrelated = { family: 'other', element: 'other', property: 'width', reference: '1px',
    astylar: '2px', occurrences: 1, cases: ['other'], states: ['static'], attribution: 'unresolved' };
  const changed = { ...unrelated, justification: 'unexplained mutation' };
  const retained = reconstructBeforeReviewedSourceBatchMetadata([...previous, unrelated], [...current, changed], evidence);
  assert.deepEqual(retained.rows.at(-1), changed); assert.notDeepEqual(retained.rows, [...previous, unrelated]);
  for (const mutate of [
    x => x.current.pop(), x => { x.current[0].reference = 'forged'; },
    x => { x.current[0].extraRawField = true; x.evidence.groups[0].extraRawField = true; },
    x => { x.previous[0].attribution = 'already-reviewed'; },
    x => { x.current[0].reviewedCases.pop(); },
    x => { x.evidence.binding.status = 'unbound'; },
  ]) {
    const altered = structuredClone({ previous, current, evidence }); mutate(altered);
    assert.throws(() => reconstructBeforeReviewedSourceBatchMetadata(altered.previous, altered.current, altered.evidence));
  }
});
function fixture() {
  const binding = JSON.parse(readFileSync('docs/material-reviewed-input-proposal-binding.json'));
  const transition = JSON.parse(readFileSync('docs/material-reviewed-input-transition-dry-run.json'));
  const previous = binding.groups.map(g => structuredClone(g.originalCompleteRow));
  const byHash = new Map(transition.changes.map(c => [c.originalCompleteRowSha256, c.projectedRow]));
  const current = previous.map(r => structuredClone(byHash.get(digest(r))));
  const groups = current.map(row => {
    const { family, element, property, reference, astylar, occurrences, cases, states, reviewedCases,
      classification, attribution, justification, recommendedOwner, reviewEvidence } = row;
    return { family, element, property, reference, astylar, occurrences, cases, states, reviewedCases,
      classification, attribution, justification, recommendedOwner, reviewEvidence,
      originalCompleteRowSha256: reviewEvidence.originalCompleteRowSha256 };
  });
  const evidence = { binding: { status: 'bound' }, groups: structuredClone(groups),
    coverage: { suppliedObservations: groups.reduce((n, g) => n + g.occurrences, 0) } };
  return { previous, current, evidence };
}

test('pure historical reconstruction restores exactly reviewed metadata and retains unrelated differences', () => {
  const f = fixture(), before = digest(f);
  const result = reconstructBeforeReviewedInputMetadata(f.previous, f.current, f.evidence);
  assert.deepEqual(result.rows, f.previous); assert.equal(result.changes.length, 134);
  assert.equal(result.changes.reduce((n, r) => n + r.occurrences, 0), 3325);
  assert.equal(digest(f), before, 'inputs mutated');
  const other = { family: 'unrelated', element: 'other', property: 'width', reference: '10px',
    astylar: '11px', occurrences: 1, cases: ['original'], states: ['static'], attribution: 'unresolved' };
  const changed = { ...other, justification: 'unexplained later change' };
  f.previous.push(other); f.current.push(changed);
  const retained = reconstructBeforeReviewedInputMetadata(f.previous, f.current, f.evidence);
  assert.deepEqual(retained.rows.at(-1), changed);
  assert.notDeepEqual(retained.rows, f.previous, 'unrelated change must remain detectable');
});

test('historical reconstruction rejects missing membership, changed raw inputs and unsupported metadata', () => {
  const mutations = [
    f => { f.previous.pop(); }, f => { f.previous.push(structuredClone(f.previous[0])); },
    f => { f.previous[0].attribution = 'already-reviewed'; },
    f => { f.current.pop(); }, f => { f.current.push(structuredClone(f.current[0])); },
    f => { f.current[0].reference = 'changed'; }, f => { f.current[0].occurrences++; },
    f => { f.current[0].cases.push('invented'); }, f => { f.current[0].states.reverse(); f.current[0].states.push('invented'); },
    f => { f.current[0].referenceAuthoredExamples = ['changed']; },
    f => { f.current[0].astylarAuthoredExamples = ['changed']; },
    f => { f.current[0].extraRawField = 'new'; },
    f => { f.current[0].attribution = 'unresolved'; },
    f => { f.current[0].classification = 'equivalent-representation'; },
    f => { f.current[0].justification = 'invented'; },
    f => { f.current[0].reviewedCases.pop(); },
    f => { f.current[0].reviewEvidence.rendererCauseProven = true; },
    f => { f.evidence.binding.status = 'unbound'; },
    f => { f.evidence.groups.pop(); }, f => { f.evidence.coverage.suppliedObservations++; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => reconstructBeforeReviewedInputMetadata(f.previous, f.current, f.evidence), `mutation ${index}`);
  }
  assert.equal(mutations.length, 20);
});

test('historical entry point rejects a self-consistent but unauthenticated source projection', () => {
  const f = fixture();
  assert.throws(() => independentlyReconstructBeforeReviewedInputs(
    { discrepancies: f.current, reviewedInputs: f.evidence }, { discrepancies: f.previous }));
});

test('historical entry point independently rejects unauthenticated source-batch evidence', () => {
  assert.throws(() => independentlyReconstructBeforeReviewedInputs({ discrepancies: [],
    reviewedSourceBatchInputs: { binding: { status: 'bound' }, groups: [], coverage: { suppliedObservations: 0 } } },
  { discrepancies: [] }), /reviewed source batch replay failed/);
});

test('historical reconstruction independently authenticates every reviewed source before restoring metadata', () => {
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectReviewedInputAuditInputs}from'./tests/material-parity/reviewed-input-audit-source-binding.mjs';
    import{independentlyReconstructBeforeReviewedInputs}from'./tests/material-parity/later-reviewed-input-conservation.mjs';
    const file='artifacts/material-parity/current-ancestry-audit/latest-report.json';
    const evidence=collectReviewedInputAuditInputs(JSON.parse(readFileSync(file)),{parityPath:file});
    assert.equal(evidence.binding.status,'bound',evidence.binding.error);
    const binding=JSON.parse(readFileSync('docs/material-reviewed-input-proposal-binding.json'));
    const transition=JSON.parse(readFileSync('docs/material-reviewed-input-transition-dry-run.json'));
    const byHash=new Map(transition.changes.map(c=>[c.originalCompleteRowSha256,c.projectedRow]));
    const previous=binding.groups.map(g=>g.originalCompleteRow);
    const current=binding.groups.map(g=>byHash.get(g.proposal.canonicalRowSha256));
    const result=independentlyReconstructBeforeReviewedInputs({discrepancies:current,reviewedInputs:evidence},{discrepancies:previous});
    assert.deepEqual(result.rows,previous);assert.equal(result.changes.length,134);
    assert.equal(result.changes.reduce((n,r)=>n+r.occurrences,0),3325);
    const changed=structuredClone(evidence);changed.observations.pop();
    assert.throws(()=>independentlyReconstructBeforeReviewedInputs({discrepancies:current,reviewedInputs:changed},{discrepancies:previous}));
    console.log(JSON.stringify({sourceGroups:134,sourceObservations:3325,sourceReplayed:true,canonicalFilesChanged:false}));`;
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.deepEqual(JSON.parse(output), { sourceGroups: 134, sourceObservations: 3325,
    sourceReplayed: true, canonicalFilesChanged: false });
});
