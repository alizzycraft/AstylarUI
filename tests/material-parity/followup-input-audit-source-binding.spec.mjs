import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { collectFollowupInputAuditInputs, projectFollowupInputAuditInputs,
  followupInputClassificationContexts, classifyFollowupInput, validateFollowupInputAuditInputs,
  validateFollowupInputClassifications } from './followup-input-audit-source-binding.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const caseKey = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('followup builder boundary replays original sources and binds all observations without writes', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectFollowupInputAuditInputs,validateFollowupInputAuditInputs,followupInputClassificationContexts,classifyFollowupInput}
      from'./tests/material-parity/followup-input-audit-source-binding.mjs';
    const report=JSON.parse(readFileSync('${originalFile}'));
    const e=collectFollowupInputAuditInputs(report,{parityPath:'${originalFile}'});
    assert.equal(e.binding.status,'bound',e.binding.error);assert.equal(e.coverage.complete,true);
    assert.equal(e.groups.length,66);assert.equal(e.observations.length,2640);
    assert.equal(e.binding.sourceProofsReplayed,true);assert.equal(e.binding.frozenCanonicalJoinReplayedNow,false);
    assert.deepEqual(validateFollowupInputAuditInputs(e),[]);
    const contexts=followupInputClassificationContexts(e);assert.equal(contexts.size,2640);
    let classified=0;
    for(const[kind,entries]of[['static',report.results],['interaction',report.interactions]])for(const entry of entries){
      const c=kind+':'+entry.family+'@'+entry.profile+'/'+entry.viewport.id+(entry.state?'/'+entry.state:'');
      for(const input of entry.styleInputs)for(const o of e.observations.filter(o=>o.case===c&&o.element===input.id)){
        assert.equal(contexts.get(JSON.stringify([c,input.id,o.property])),o);
        const result=classifyFollowupInput(input,o.property,o.reference,o.astylar,o);
        assert.equal(result.attribution,o.classification.attribution);assert.equal(result.reviewEvidence.inputEquivalent,false);classified++;
      }
    }
    assert.equal(classified,2640);console.log(JSON.stringify({groups:e.groups.length,observations:classified,
      originalCases:e.coverage.sourceCases,complete:e.coverage.complete}));`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(result, { groups: 66, observations: 2640, originalCases: 2311, complete: true });
});

let fixtureSource;
function fixture() {
  if (!fixtureSource) {
    const binding = JSON.parse(readFileSync('docs/material-followup-input-proposal-binding.json'));
    const transition = JSON.parse(readFileSync('docs/material-followup-input-transition-dry-run.json'));
    const original = JSON.parse(readFileSync(originalFile));
    const wanted = new Set(Object.keys(binding.plans).flatMap(k =>
      binding.groups.find(g => g.kind === k).proposal.observations.slice(0, 2).map(o => o.case)));
    const supplied = { results: original.results.filter(e => wanted.has(caseKey('static', e))),
      interactions: original.interactions.filter(e => wanted.has(caseKey('interaction', e))) };
    const descriptor = JSON.parse(readFileSync(binding.plans.controlFontStyle.file)).productionNormalization;
    const normalize = bindOwnerCaretNormalization(readFileSync(descriptor.module, 'utf8'), descriptor);
    fixtureSource = { binding, transition, original, supplied, normalize };
  }
  const { original, normalize, ...mutable } = fixtureSource;
  return { ...structuredClone(mutable), original, normalize };
}
const project = f => projectFollowupInputAuditInputs(f.binding, f.transition, f.supplied, f.original, f.normalize);

test('followup subsets enumerate omissions and preserve exact classifier boundaries', () => {
  const f = fixture(), before = digest(f.supplied), result = project(f);
  assert.equal(result.coverage.complete, false);
  assert.ok(result.coverage.missingCases.length > 0); assert.ok(result.coverage.missingObservations.length > 0);
  assert.equal(result.coverage.suppliedObservations + result.coverage.missingObservations.length, 2640);
  const inputs = new Map([['static', f.supplied.results], ['interaction', f.supplied.interactions]]
    .flatMap(([kind, es]) => es.flatMap(e => e.styleInputs.map(i => [JSON.stringify([caseKey(kind, e), i.id]), i]))));
  for (const o of result.observations) {
    const input = inputs.get(JSON.stringify([o.case, o.element])); assert.ok(input);
    const c = classifyFollowupInput(input, o.property, o.reference, o.astylar, o);
    assert.equal(c.owner, o.classification.recommendedOwner); assert.equal(c.reviewEvidence.rendererCauseProven, false);
    for (const args of [
      [{ ...input, id: 'changed' }, o.property, o.reference, o.astylar, o],
      [input, 'changed', o.reference, o.astylar, o],
      [input, o.property, 'changed', o.astylar, o],
      [input, o.property, o.reference, 'changed', o],
    ]) assert.throws(() => classifyFollowupInput(...args));
  }
  assert.equal(digest(f.supplied), before);
  assert.equal(classifyFollowupInput({}, 'width', '1px', undefined, undefined), undefined);
  assert.equal(followupInputClassificationContexts({ observations: result.observations }).size, 0);
});

test('followup projection rejects changed input identity, membership, and unsupported claims', () => {
  const first = f => [...f.supplied.results, ...f.supplied.interactions][0];
  const changes = [
    f => { first(f).profile = 'invented'; }, f => { first(f).viewport.width++; },
    f => { first(f).inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { first(f).styleInputs[0].reference.fontSize = '999px'; },
    f => { first(f).styleInputs[0].astylar.color = 'red'; },
    f => { first(f).styleInputs.reverse(); }, f => { first(f).styleInputs.push(first(f).styleInputs[0]); },
    f => { assert.ok(f.supplied.interactions.length > 1); f.supplied.interactions.reverse(); },
    f => { f.supplied.interactions.push(f.supplied.interactions[0]); },
    f => { f.transition.binding.sha256 = '0'.repeat(64); },
    f => { f.transition.canonicalFilesChanged = true; }, f => { f.transition.completeAuditAccepted = true; },
    f => { f.transition.changes.pop(); },
    f => { f.transition.changes[0].projectedRow.classification = 'equivalent-representation'; },
    f => { f.transition.changes[0].projectedRow.reviewEvidence.inputEquivalent = true; },
    f => { f.transition.changes[0].projectedRow.reviewEvidence.rendererCauseProven = true; },
    f => { f.transition.changes[0].projectedRow.reviewEvidence.originalObservationsSha256 = '0'.repeat(64); },
    f => { f.binding.groups[0].proposal.observations.pop(); },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(), mutable = () => ({ binding: f.binding, transition: f.transition, supplied: f.supplied });
    const before = digest(mutable()); change(f);
    assert.notEqual(digest(mutable()), before, `mutation ${i} must actually change the fixture`);
    assert.throws(() => project(f), `mutation ${i}`);
  }
  assert.equal(changes.length, 18);
});

test('followup unbound and changed caller requests cannot acquire classifications', () => {
  assert.equal(collectFollowupInputAuditInputs({}).binding.status, 'unbound');
  const e = collectFollowupInputAuditInputs({}, { parityPath: originalFile });
  assert.equal(e.binding.status, 'invalid'); assert.match(e.binding.error, /caller differs/);
  assert.deepEqual(e.observations, []); assert.deepEqual(e.groups, []);
  assert.ok(validateFollowupInputAuditInputs(e, { requireComplete: false }).length);
  assert.equal(followupInputClassificationContexts(e).size, 0);
});

test('followup emitted-row validation rejects missing reviews and changes to raw values or classifications', () => {
  const projection = project(fixture()), evidence = { binding: { status: 'bound' }, ...projection };
  const rows = evidence.groups.map(({ originalCompleteRowSha256: _sha, ...row }) => row);
  assert.deepEqual(validateFollowupInputClassifications(evidence, rows), []);
  const changes = [
    xs => { xs.pop(); }, xs => { xs.push(structuredClone(xs[0])); },
    xs => { xs[0].attribution = 'unresolved'; }, xs => { xs[0].classification = 'equivalent-representation'; },
    xs => { xs[0].occurrences++; }, xs => { xs[0].cases.push('invented'); },
    xs => { xs[0].reviewedCases.pop(); }, xs => { xs[0].states.push('invented'); },
    xs => { xs[0].reference = 'altered'; }, xs => { xs[0].astylar = 'altered'; },
    xs => { xs[0].recommendedOwner = 'wrong'; }, xs => { xs[0].justification = 'unsupported'; },
    xs => { xs[0].reviewEvidence.rendererCauseProven = true; },
    xs => { xs[0].reviewEvidence.originalCompleteRowSha256 = '0'.repeat(64); },
  ];
  for (const change of changes) { const xs = structuredClone(rows); change(xs);
    assert.ok(validateFollowupInputClassifications(evidence, xs).length); }
  assert.equal(changes.length, 14);
  assert.ok(validateFollowupInputClassifications({ ...evidence, binding: { status: 'unbound' } }, rows).length);
});
