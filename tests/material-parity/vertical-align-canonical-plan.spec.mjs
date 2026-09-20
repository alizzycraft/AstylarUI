import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { planVerticalAlignPopulation } from '../../scripts/bind-material-vertical-align-population.mjs';
import { bindHistoricalAuditNormalization } from './audit-normalization-contracts.mjs';

const file = 'docs/material-vertical-align-canonical-plan.json';
test('alignment membership independently replays all original proofs and authenticates the frozen canonical payload without writes', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/bind-material-vertical-align-population.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.proposedGroups, 68); assert.equal(receipt.proposedObservations, 3848);
  assert.equal(receipt.retainedGapGroups, 2); assert.equal(receipt.previouslyReviewedGroups, 45);
  assert.equal(receipt.reservedGroups, 1); assert.equal(receipt.reservedObservations, 68);
  assert.equal(receipt.otherCompleteRows, 8271); assert.equal(receipt.canonicalAttributionChanged, false);
  assert.deepEqual(readFileSync(file), before);
});

let template;
function fixture() {
  if (!template) {
    const plan = JSON.parse(readFileSync(file)), proof = JSON.parse(readFileSync(plan.sourceProof.file));
    const source = JSON.parse(readFileSync(proof.originalCapture.file));
    const original = Object.fromEntries(['results', 'interactions'].map(kind => [kind, source[kind].map(e => ({
      family: e.family, profile: e.profile, viewport: e.viewport, state: e.state, inputTrees: e.inputTrees,
      styleInputs: e.styleInputs,
    }))]));
    // Pure projection fixture, not canonical authentication. The independent
    // test above uses every byte of the original committed canonical payload.
    const existingPlan = JSON.parse(readFileSync(plan.reservedPlan.file));
    const rows = [...plan.proposed, ...plan.retainedGaps, ...plan.previouslyReviewed].map(g => ({
      ...Object.fromEntries(['family', 'element', 'property', 'reference', 'occurrences', 'cases', 'states']
        .map(k => [k, g[k]])), ...(Object.hasOwn(g, 'astylar') ? { astylar: g.astylar } : {}),
      attribution: g.previousAttribution,
    }));
    for (const g of plan.reservedByExistingPlan) rows.push(existingPlan.groups.find(p =>
      p.proposal.canonicalRowSha256 === g.canonicalRowSha256).originalCompleteRow);
    rows.push({ family: 'sentinel', element: 'unrelated', property: 'color', reference: 'red', astylar: 'blue',
      attribution: 'previous-review', retained: true });
    const normalize = bindHistoricalAuditNormalization(plan.productionNormalization, '957774a');
    template = { original, proof, rows, normalize, existingPlan };
  }
  const { normalize, ...mutable } = template;
  return { ...structuredClone(mutable), normalize };
}
const run = f => planVerticalAlignPopulation(f.proof, f.original, f.rows, f.normalize, f.existingPlan);

test('alignment proposal separates new review, existing review, and incomplete capture evidence without changing inputs', () => {
  const f = fixture(), before = JSON.stringify(f), p = run(f);
  assert.equal(JSON.stringify(f), before);
  assert.equal(p.originalGroups, 116); assert.equal(p.originalObservations, 6886);
  assert.equal(p.proposedGroups, 68); assert.equal(p.proposedObservations, 3848);
  assert.equal(p.previouslyReviewedGroups, 45); assert.equal(p.previouslyReviewedObservations, 2911);
  assert.equal(p.reservedGroups, 1); assert.equal(p.reservedObservations, 68);
  assert.equal(p.reservedByExistingPlan[0].element, 'expansion-primary');
  assert.equal(p.reservedByExistingPlan[0].existingProposedAttribution, 'reviewed-expansion-panel-header-owner-mismatch');
  assert.equal(p.retainedGapGroups, 2); assert.equal(p.retainedGapObservations, 59);
  assert.equal(p.otherCompleteRows, 49); assert.equal(p.equalScalarObservations, 52);
  assert.equal(p.missingScalarObservations.length, 8);
  const categories = {};
  for (const g of p.proposed) {
    categories[g.status] ??= { groups: 0, observations: 0 };
    categories[g.status].groups++; categories[g.status].observations += g.occurrences;
    assert.equal(g.previousAttribution, 'unresolved'); assert.equal(g.observations.length, g.occurrences);
    for (const flag of ['wholeElementInputEquivalent', 'usedAlignmentVerified', 'renderingEquivalent', 'rendererCauseProven'])
      assert.equal(g[flag], false);
  }
  assert.deepEqual(categories, {
    'computed-initial-versus-omitted-local-declaration': { groups: 53, observations: 2936 },
    'reference-explicit-middle-versus-candidate-omission': { groups: 4, observations: 194 },
    'candidate-explicit-middle-versus-reference-baseline': { groups: 11, observations: 718 },
  });
  for (const g of p.retainedGaps) {
    assert.equal(g.status, 'unresolved-alias-scalar-rule-gap'); assert.equal(g.previousAttribution, 'unresolved');
    assert.equal(g.proposedAttribution, undefined);
  }
});

test('alignment binding rejects missing, duplicated, changed and overclaimed source membership', () => {
  const changes = [
    f => { f.proof.rendererChanged = true; }, f => { f.proof.canonicalAttributionChanged = true; },
    f => { f.proof.comparisonInputsChanged = true; }, f => { f.proof.findings.pop(); },
    f => { f.proof.findings.push(f.proof.findings[0]); }, f => { f.proof.casesScanned--; },
    f => { f.proof.findings[0].family = 'changed'; }, f => { f.proof.findings[0].profile = 'changed'; },
    f => { f.proof.findings[0].state = 'changed'; }, f => { f.proof.findings[0].property = 'lineHeight'; },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].proof.reference = 'middle'; },
    f => { f.proof.findings[0].proof.candidate = 'middle'; },
    f => { f.proof.findings[0].proof.renderingEquivalent = true; },
    f => { f.proof.findings[0].proof.rendererCauseProven = true; },
    f => { f.proof.findings[0].proof.classification = 'equivalent-representation'; },
    f => { f.proof.findings[0].proof.status = 'invented'; },
    f => { f.proof.equalScalarObservations++; }, f => { f.proof.missingScalarObservations.pop(); },
    f => { f.proof.groups[1] = f.proof.groups[0]; }, f => { f.proof.groups[0].cases.pop(); },
    f => { f.proof.statusCounts['computed-initial-versus-omitted-local-declaration']++; },
    f => { f.original.results.push(f.original.results[0]); },
    f => { f.rows[0].occurrences++; }, f => { f.rows[0].cases.reverse(); },
    f => { f.rows[0].states.push('invented'); }, f => { f.rows[0].reference = 'bottom'; },
    f => { f.rows.push(f.rows[0]); }, f => { f.rows.shift(); },
    f => { f.existingPlan.canonicalRevision = 'different'; },
    f => { f.existingPlan.groups.push(f.existingPlan.groups[0]); f.existingPlan.proposedGroups++; },
    f => { f.existingPlan.groups.find(g => g.originalCompleteRow.property === 'verticalAlign').originalCompleteRow.justification = 'changed'; },
    f => { f.existingPlan.groups.find(g => g.originalCompleteRow.property === 'verticalAlign').proposal.canonicalRowSha256 = '0'.repeat(64); },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(); change(f); assert.throws(() => run(f), `mutation ${i}`);
  }
  assert.equal(changes.length, 34);
});
