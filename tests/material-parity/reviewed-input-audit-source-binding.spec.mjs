import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { collectReviewedInputAuditInputs, projectReviewedInputAuditInputs,
  reviewedInputClassificationContexts, classifyReviewedInput, validateReviewedInputAuditInputs,
  validateReviewedInputClassifications } from './reviewed-input-audit-source-binding.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const originalFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const caseKey = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('synchronous builder boundary independently replays all source proofs without writing or claiming a fresh frozen join', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const code = `import assert from 'node:assert/strict';import{readFileSync}from'node:fs';
    import{collectReviewedInputAuditInputs,validateReviewedInputAuditInputs,reviewedInputClassificationContexts,classifyReviewedInput}
      from './tests/material-parity/reviewed-input-audit-source-binding.mjs';
    const report=JSON.parse(readFileSync('${originalFile}'));
    const e=collectReviewedInputAuditInputs(report,{parityPath:'${originalFile}'});
    assert.equal(e.binding.status,'bound',e.binding.error);assert.equal(e.coverage.complete,true);
    assert.equal(e.groups.length,134);assert.equal(e.observations.length,3325);
    assert.equal(e.binding.sourceProofsReplayed,true);assert.equal(e.binding.frozenCanonicalJoinReplayedNow,false);
    assert.deepEqual(validateReviewedInputAuditInputs(e),[]);
    const contexts=reviewedInputClassificationContexts(e);assert.equal(contexts.size,3325);
    let classified=0;
    for(const[kind,entries]of[['static',report.results],['interaction',report.interactions]])for(const entry of entries){
      const c=kind+':'+entry.family+'@'+entry.profile+'/'+entry.viewport.id+(entry.state?'/'+entry.state:'');
      for(const input of entry.styleInputs)for(const property of['fontSize','fontFamily','fontWeight','letterSpacing','opacity','backgroundColor']){
        const o=contexts.get(JSON.stringify([c,input.id,property]));if(!o)continue;
        const result=classifyReviewedInput(input,property,o.reference,o.astylar,o);
        assert.equal(result.attribution,o.classification.attribution);assert.equal(result.reviewEvidence.inputEquivalent,false);classified++;
      }
    }
    assert.equal(classified,3325);console.log(JSON.stringify({groups:e.groups.length,observations:classified,
      originalCases:e.coverage.sourceCases,complete:e.coverage.complete,freshFrozenJoin:false}));`;
  const out = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), '--input-type=module', '-e', code],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const result = JSON.parse(out); assert.equal(result.originalCases, 2311);
  assert.equal(result.groups, 134); assert.equal(result.observations, 3325);
});

let fixtureSource;
function fixture() {
  if (!fixtureSource) {
    const binding = JSON.parse(readFileSync('docs/material-reviewed-input-proposal-binding.json'));
    const transition = JSON.parse(readFileSync('docs/material-reviewed-input-transition-dry-run.json'));
    const original = JSON.parse(readFileSync(originalFile));
    const wanted = new Set(Object.keys(binding.plans).map(k => binding.groups.find(g => g.kind === k).proposal.observations[0].case));
    const supplied = { results: original.results.filter(e => wanted.has(caseKey('static', e))),
      interactions: original.interactions.filter(e => wanted.has(caseKey('interaction', e))) };
    const normalize = bindOwnerCaretNormalization(readFileSync(binding.productionNormalization.module, 'utf8'), binding.productionNormalization);
    fixtureSource = { binding, transition, original, supplied, normalize };
  }
  const { original, normalize, ...mutable } = fixtureSource;
  return { ...structuredClone(mutable), original, normalize };
}
const project = f => projectReviewedInputAuditInputs(f.binding, f.transition, f.supplied, f.original, f.normalize);

test('partial original captures enumerate omissions and preserve exact classifier inputs', () => {
  const f = fixture(), before = digest(f.supplied), result = project(f);
  assert.equal(result.coverage.complete, false); assert.ok(result.coverage.missingCases.length > 0);
  assert.ok(result.coverage.missingObservations.length > 0);
  assert.equal(result.coverage.suppliedObservations + result.coverage.missingObservations.length, 3325);
  const all = new Map([...f.supplied.results.map(e => ['static', e]), ...f.supplied.interactions.map(e => ['interaction', e])]
    .flatMap(([kind, e]) => e.styleInputs.map(input => [JSON.stringify([caseKey(kind, e), input.id]), input])));
  for (const o of result.observations) {
    const input = all.get(JSON.stringify([o.case, o.element])); assert.ok(input);
    const c = classifyReviewedInput(input, o.property, o.reference, o.astylar, o);
    assert.equal(c.attribution, o.classification.attribution);
    assert.equal(c.owner, o.classification.recommendedOwner);
    assert.equal(c.reviewEvidence.rendererCauseProven, false);
    for (const args of [
      [{ ...input, id: 'different' }, o.property, o.reference, o.astylar, o],
      [input, 'different', o.reference, o.astylar, o],
      [input, o.property, 'different', o.astylar, o],
      [input, o.property, o.reference, 'different', o],
    ]) assert.throws(() => classifyReviewedInput(...args));
  }
  assert.equal(digest(f.supplied), before);
  assert.equal(classifyReviewedInput({}, 'width', '1px', undefined, undefined), undefined);
  assert.equal(reviewedInputClassificationContexts({ observations: result.observations }).size, 0);
});

test('projection rejects altered inputs, changed source order, duplicate memberships and unsupported claims', () => {
  const first = f => f.supplied.results[0];
  const mutations = [
    f => { first(f).profile = 'invented'; },
    f => { first(f).viewport.width++; },
    f => { first(f).inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { first(f).styleInputs[0].reference.fontSize = '999px'; },
    f => { first(f).styleInputs[0].astylar.color = 'red'; },
    f => { first(f).styleInputs.reverse(); },
    f => { first(f).styleInputs.push(first(f).styleInputs[0]); },
    f => { f.supplied.results.reverse(); },
    f => { f.supplied.results.push(first(f)); },
    f => { f.transition.binding.sha256 = '0'.repeat(64); },
    f => { f.transition.canonicalFilesChanged = true; },
    f => { f.transition.completeAuditAccepted = true; },
    f => { f.transition.changes.pop(); },
    f => { f.transition.changes[0].projectedRow.classification = 'equivalent-representation'; },
    f => { f.transition.changes[0].projectedRow.reviewEvidence.inputEquivalent = true; },
    f => { f.transition.changes[0].projectedRow.reviewEvidence.rendererCauseProven = true; },
    f => { f.transition.changes[0].projectedRow.reviewEvidence.originalObservationsSha256 = '0'.repeat(64); },
    f => { f.binding.groups[0].proposal.observations.pop(); },
  ];
  for (const [i, mutate] of mutations.entries()) { const f = fixture(); mutate(f); assert.throws(() => project(f), `mutation ${i}`); }
  assert.equal(mutations.length, 18);
});

test('unbound and altered-caller requests never acquire reviewed classifications', () => {
  assert.equal(collectReviewedInputAuditInputs({}).binding.status, 'unbound');
  const e = collectReviewedInputAuditInputs({}, { parityPath: originalFile });
  assert.equal(e.binding.status, 'invalid'); assert.match(e.binding.error, /caller differs/);
  assert.deepEqual(e.observations, []); assert.deepEqual(e.groups, []);
  assert.ok(validateReviewedInputAuditInputs(e, { requireComplete: false }).length);
  assert.equal(reviewedInputClassificationContexts(e).size, 0);
});

test('emitted row validation rejects missing reviews, invented membership and changed metadata', () => {
  const f = fixture(), projection = project(f), evidence = { binding: { status: 'bound' }, ...projection };
  const rows = evidence.groups.map(({ originalCompleteRowSha256, ...row }) => row);
  assert.deepEqual(validateReviewedInputClassifications(evidence, rows), []);
  const mutations = [
    xs => { xs.pop(); }, xs => { xs.push(structuredClone(xs[0])); },
    xs => { xs[0].attribution = 'unresolved'; }, xs => { xs[0].classification = 'equivalent-representation'; },
    xs => { xs[0].occurrences++; }, xs => { xs[0].cases.push('invented'); },
    xs => { xs[0].reviewedCases.pop(); }, xs => { xs[0].states.push('invented'); },
    xs => { xs[0].reference = 'altered'; }, xs => { xs[0].astylar = 'altered'; },
    xs => { xs[0].recommendedOwner = 'wrong'; }, xs => { xs[0].justification = 'unsupported'; },
    xs => { xs[0].reviewEvidence.rendererCauseProven = true; },
    xs => { xs[0].reviewEvidence.originalCompleteRowSha256 = '0'.repeat(64); },
  ];
  for (const mutate of mutations) { const changed = structuredClone(rows); mutate(changed);
    assert.ok(validateReviewedInputClassifications(evidence, changed).length); }
  assert.equal(mutations.length, 14);
  assert.ok(validateReviewedInputClassifications({ ...evidence, binding: { status: 'unbound' } }, rows).length);
});
