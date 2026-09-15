import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { buildMaterialInputAudit, validateMaterialInputAudit, collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindOwnerInitialStyleSource, collectOwnerInitialStyleEvidence, classifyOwnerInitialStyleInput,
  validateOwnerInitialStyleSource, ownerInitialStyleAttribution } from './owner-initial-style-attribution.mjs';

const index = JSON.parse(readFileSync('docs/material-owner-initial-style-membership.json'));
const bytes = readFileSync(index.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), index.capture.sha256);
const original = JSON.parse(bytes);
const raw = { results: [original.results.find(e => e.family === 'stepper')],
  interactions: [original.interactions.find(e => e.family === 'stepper' && e.state === 'activate')] };
assert.ok(raw.results[0]); assert.ok(raw.interactions[0]);
const folder = mkdtempSync('artifacts/material-parity/owner-initial-integration-test-');
const file = folder + '/capture.json';
writeFileSync(file, JSON.stringify(raw));
after(() => { unlinkSync(file); rmdirSync(folder); });
const binding = bindOwnerInitialStyleSource(raw, { parityPath: file });
const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const inventory = collectFullTreeInventory(cases);
const evidence = collectOwnerInitialStyleEvidence(raw, inventory);

test('owner initial attribution binds original cases and replays inventory without promoting omissions to equality', () => {
  assert.equal(binding.status, 'bound');
  assert.deepEqual(validateOwnerInitialStyleSource(binding, evidence), []);
  const proof = evidence.observations.find(p => p.element === 'stepper-content' && p.property === 'fontStyle');
  const input = raw.results[0].styleInputs.find(i => i.id === 'stepper-content');
  const result = classifyOwnerInitialStyleInput(input, 'fontStyle', 'normal', undefined, proof);
  assert.equal(result.attribution, ownerInitialStyleAttribution);
  assert.equal(result.classification, 'parity-harness-defect');
  assert.equal(result.reviewEvidence.computedCandidateVerified, false);
  assert.equal(result.reviewEvidence.renderingEquivalent, false);
  assert.ok(evidence.observations.filter(p => p.element === 'stepper-content' && p.property === 'visibility')
    .every(p => p.issues.some(i => i.reason === 'explicit-relevant-request')));
});

test('owner initial attribution rejects altered sources, observations and false equivalence', () => {
  assert.equal(bindOwnerInitialStyleSource(raw).status, 'unbound');
  const changed = structuredClone(raw); changed.interactions = [];
  assert.equal(bindOwnerInitialStyleSource(changed, { parityPath: file }).status, 'invalid');
  assert.equal(bindOwnerInitialStyleSource(raw, { parityPath: 'package.json' }).status, 'invalid');
  assert.ok(validateOwnerInitialStyleSource({ ...binding, sha256: '0'.repeat(64) }, evidence).length);
  for (const mutate of [
    e => e.observations.pop(),
    e => e.observations.push(structuredClone(e.observations[0])),
    e => { e.observations[0].computedCandidateVerified = true; },
    e => { e.observations[0].referenceValue = 'fabricated'; },
    e => { e.observations[0].issues = [{ reason: 'invented' }]; },
    e => { e.observations[0].case = 'foreign'; },
  ]) {
    const modified = structuredClone(evidence); mutate(modified);
    assert.ok(validateOwnerInitialStyleSource(binding, modified).length);
  }
  const input = raw.results[0].styleInputs.find(i => i.id === 'stepper-content');
  const proof = evidence.observations.find(p => p.element === input.id && p.property === 'fontStyle');
  for (const patch of [{ renderingEquivalent: true }, { computedCandidateVerified: true },
    { source: 'guessed' }, { revision: -1 }, { element: 'foreign' }, { issues: [{ reason: 'explicit-relevant-request' }] }])
    assert.equal(classifyOwnerInitialStyleInput(input, 'fontStyle', 'normal', undefined, { ...proof, ...patch }), undefined);
  assert.equal(classifyOwnerInitialStyleInput(input, 'fontStyle', 'normal', 'normal', proof), undefined);
});

test('owner initial canonical integration preserves earlier classifications and enforces exact new attribution coverage', () => {
  const audit = buildMaterialInputAudit(raw, { parityPath: file });
  const ownerRows = audit.discrepancies.filter(r => r.attribution === ownerInitialStyleAttribution);
  assert.ok(ownerRows.length > 0);
  assert.ok(ownerRows.every(r => r.reviewedCases.length === r.occurrences && r.classification === 'parity-harness-defect'));
  const content = audit.discrepancies.filter(r => r.element === 'stepper-content');
  assert.ok(content.some(r => r.attribution === 'reviewed-stage-mismatch'), 'existing static retained-text classification must survive');
  assert.ok(content.some(r => r.property === 'visibility' && r.attribution === 'unresolved'), 'visibility requests must not be waived');
  assert.ok(content.some(r => r.property === 'fontStyle' && r.attribution === ownerInitialStyleAttribution && r.occurrences === 1));
  const errors = a => validateMaterialInputAudit(a, { requireComplete: false }).filter(e => e.includes('owner initial-style'));
  assert.deepEqual(errors(audit), []);
  for (const mutate of [
    a => { a.ownerInitialStyleEvidence.observations.pop(); },
    a => { a.ownerInitialStyleBinding.status = 'unbound'; },
    a => { a.discrepancies = a.discrepancies.filter(r => r.attribution !== ownerInitialStyleAttribution); },
    a => { a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution).classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution).reviewedCases = []; },
    a => { a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution).reference = 'wrong'; },
    a => { a.discrepancies.push(structuredClone(a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution))); },
  ]) {
    const modified = structuredClone(audit); mutate(modified);
    assert.ok(errors(modified).length);
  }
});
