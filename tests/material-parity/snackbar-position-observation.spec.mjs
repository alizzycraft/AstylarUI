import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { proveSnackbarPositionRequests, applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';

test('34 snackbar wrappers distinguish authored composition from computed-only right/bottom offsets', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = captured.interactions.filter(e => e.family === 'snack-bar' &&
    e.styleInputs.some(i => i.id === 'snack-bar-overlay')).map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 34);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const trees = entry => modalInventoryTrees(inventory,
    `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`);
  for (const entry of cases) {
    const proof = proveSnackbarPositionRequests(entry, ...trees(entry));
    assert.equal(proof.mapping.status, 'mapped-with-scalar-rule-gap');
    assert.equal(proof.originalMissingSnackbarCauseProven, false);
    assert.equal(proof.candidateUsedOffsetsVerified, false);
  }
  const entry = cases[0];
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.resolvedStyleSource = 'paint-guess'; },
    ([r]) => { r.nodes.find(n => n.attributes?.class === 'cdk-overlay-container').parent = 'missing'; },
    ([r]) => { r.nodes.find(n => n.attributes?.class === 'cdk-global-overlay-wrapper').inline.right = { value: '0px' }; },
    ([r]) => { const rule = r.rules.find(n => n.selector === '.cdk-global-overlay-wrapper' && n.declarations.position);
      rule.cssText += 'inset-inline-end:0;'; },
    ([r]) => { const rule = r.rules.find(n => n.selector === '.cdk-global-overlay-wrapper' && n.declarations.position);
      rule.declarations.position.value = 'fixed'; },
    ([, a]) => { a.rules.push({ selector: '.snack-overlay', insetBlockEnd: '0' }); },
    ([, a]) => { a.rules.push({ selector: '[unknown]', right: '0' }); },
    ([, a]) => { a.nodes.find(n => n.authored.id === 'snack-bar-overlay').authored.style = { bottom: '0' }; },
    ([, a]) => { a.nodes.find(n => n.authored.id === 'snack-bar-overlay').normalResolvedStyle.right = '0'; },
  ]) {
    const pair = structuredClone(trees(entry)); mutate(pair);
    assert.throws(() => proveSnackbarPositionRequests(entry, ...pair));
  }
  const rows = queryFindings('artifacts/material-parity/working-audit', 'snack-bar', {
    generation: 'fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040',
    indexSha256: '672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57',
  }).filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applySnackbarPositionRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 3); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 102);
  for (const row of changed) {
    assert.equal(row.element, 'snack-bar-overlay');
    assert.equal(row.reviewedCases.length, 34);
    assert.equal(new Set(row.reviewedCases).size, 34);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewedCases', 'reviewEvidence']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateSnackbarPositionRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [r => { r.reference = 'forged'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].originalMissingSnackbarCauseProven = true; },
    r => { r.reviewEvidence.observations[0].mapping.missingRules = []; }]) {
    const altered = structuredClone(applied); mutate(altered.find(r => r.reviewedCases?.length === 34 && r.element === 'snack-bar-overlay' && r.attribution.startsWith('reviewed-snackbar-')));
    assert.ok(validate(altered).length);
  }
  assert.throws(() => applySnackbarPositionRequests(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applySnackbarPositionRequests(rows, [...cases, cases[0]], inventory, normalize));
});
