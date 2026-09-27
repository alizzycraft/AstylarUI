import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyTabScalarTypography, validateTabScalarTypography, tabScalarTypographyAttribution } from './tab-scalar-typography.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('all unresolved tab tracking and line-height scalars retain an exact existing control proof', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(c => ({ ...c, kind: 'static' })),
    ...capture.interactions.map(c => ({ ...c, kind: 'interaction' }))];
  const tabs = cases.filter(c => c.family === 'tabs');
  assert.equal(tabs.length, 70);
  // Preserve original global indexing used by the accepted full-row hashes.
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: 'f86307bd22b7699155bc1e28730c1a446c825a214d97c9258555c8b33a265162',
    indexSha256: '9222220df3105817b2f39275395d883ff8201560f00f696320dfec0171339c8a' };
  const rows = queryFindings('artifacts/material-parity/working-audit', 'tabs', snapshot);
  const properties = ['lineHeight', 'letterSpacing'];
  const selected = rows.filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
    ['tab-overview', 'tab-activity'].includes(r.element) && properties.includes(r.property));
  assert.equal(selected.length, 4);
  const control = collectControlTypographyEvidence(tabs, inventory);
  const proofs = control.differences.filter(r =>
    r.attribution === 'reviewed-tab-label-typography-input' && properties.includes(r.property));
  assert.equal(proofs.length, 280);
  let matched = 0;
  for (const row of selected) {
    const keys = [];
    for (const entry of tabs) {
      const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      const inputs = entry.styleInputs.filter(i => i.id === row.element);
      assert.equal(inputs.length, 1);
      assert.equal(inputs[0].reference[row.property], row.reference);
      assert.equal(inputs[0].astylar[row.property], row.astylar);
      const same = p => p.case === key && p.element === row.element && p.property === row.property;
      const replay = proofs.filter(same);
      const accepted = rows.filter(p => p.evidence.section === 'controlTypography.differences' && same(p));
      assert.equal(replay.length, 1); assert.equal(accepted.length, 1);
      assert.equal(replay[0].classification, 'application-plugin-authoring-defect');
      assert.equal(replay[0].reviewEvidence.sourceFinding, 'fixture-tab-label-typography-flattened');
      assert.equal(hash(JSON.stringify(replay[0])), accepted[0].evidence.completeRowSha256);
      keys.push(key); matched++;
    }
    assert.equal(new Set(keys).size, row.occurrences);
    assert.deepEqual(row.cases, keys.slice(0, 12));
  }
  assert.equal(matched, 280);
  const scalarRows = rows.filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyTabScalarTypography(scalarRows, cases, inventory, control, normalize);
  const changed = applied.filter(r => r.attribution === tabScalarTypographyAttribution);
  assert.equal(changed.length, 4);
  assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 280);
  assert.deepEqual(validateTabScalarTypography(applied, scalarRows, cases, inventory, control, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  assert.deepEqual(applied.map(raw), scalarRows.map(raw));
  for (let i = 0; i < applied.length; i++) if (applied[i].attribution !== tabScalarTypographyAttribution)
    assert.deepEqual(applied[i], scalarRows[i]);
  for (const mutate of [
    r => { r.reference = 'forged'; },
    r => { r.reviewedCases.pop(); },
    r => { r.reviewEvidence.renderingEquivalent = true; },
    r => { r.reviewEvidence.observations[0].controlProofSha256 = 'forged'; },
  ]) {
    const forged = structuredClone(applied);
    mutate(forged.find(r => r.attribution === tabScalarTypographyAttribution));
    assert.equal(validateTabScalarTypography(forged, scalarRows, cases, inventory, control, normalize).length, 1);
  }
  const missing = { ...control, differences: control.differences.filter(p => p !== proofs[0]) };
  assert.throws(() => applyTabScalarTypography(scalarRows, cases, inventory, missing, normalize));
  const duplicate = { ...control, differences: [...control.differences, proofs[0]] };
  assert.throws(() => applyTabScalarTypography(scalarRows, cases, inventory, duplicate, normalize));
  // This is proof reuse, not canonical classification or rendering acceptance.
});
