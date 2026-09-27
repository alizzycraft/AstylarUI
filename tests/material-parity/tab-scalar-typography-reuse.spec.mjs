import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory, collectControlTypographyEvidence } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyTabScalarTypography, validateTabScalarTypography, tabScalarTypographyAttribution } from './tab-scalar-typography.mjs';
import { applyButtonAuthoredTypography, validateButtonAuthoredTypography, buttonAuthoredTypographyAttribution } from './normal-line-box-scalar.mjs';
import { applyVisibleButtonOverflow, validateVisibleButtonOverflow, visibleButtonOverflowAttribution } from './control-overflow-observation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('tab and button typography scalars retain exact existing control proofs and owner bindings', () => {
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
  const properties = ['fontFamily', 'lineHeight', 'letterSpacing'];
  const normalize = bindPreciseAuditNormalization();
  const selected = rows.filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
    ['tab-overview', 'tab-activity'].includes(r.element) && properties.includes(r.property));
  assert.equal(selected.length, 6);
  const control = collectControlTypographyEvidence(tabs, inventory);
  const proofs = control.differences.filter(r =>
    r.attribution === 'reviewed-tab-label-typography-input' && properties.includes(r.property));
  assert.equal(proofs.length, 420);
  let matched = 0;
  for (const row of selected) {
    const keys = [];
    for (const entry of tabs) {
      const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      const inputs = entry.styleInputs.filter(i => i.id === row.element);
      assert.equal(inputs.length, 1);
      assert.equal(normalize(inputs[0].reference)[row.property], row.reference);
      assert.equal(normalize(inputs[0].astylar)[row.property], row.astylar);
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
  assert.equal(matched, 420);
  const scalarRows = rows.filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyTabScalarTypography(scalarRows, cases, inventory, control, normalize);
  const changed = applied.filter(r => r.attribution === tabScalarTypographyAttribution);
  assert.equal(changed.length, 6);
  assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 420);
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
  const current = { generation: 'ef6da409ae1162433b0419814fe7e7e33b7659805d8e672f407d8b4c84878145',
    indexSha256: 'a25ffe1f2d083f23fafe6e615566544a9aedf7b9559e2084309551568982cca9' };
  const buttonRows = ['toolbar', 'button'].flatMap(family =>
    queryFindings('artifacts/material-parity/working-audit', family, current));
  const buttonControl = collectControlTypographyEvidence(cases.filter(c => ['toolbar', 'button'].includes(c.family)), inventory);
  const selectedProofs = buttonControl.differences.filter(p =>
    ['reviewed-toolbar-button-line-height-input', 'reviewed-disabled-button-ink'].includes(p.attribution));
  assert.equal(selectedProofs.length, 99);
  for (const proof of selectedProofs) {
    const accepted = buttonRows.filter(p => p.evidence.section === 'controlTypography.differences' &&
      p.case === proof.case && p.element === proof.element && p.property === proof.property);
    assert.equal(accepted.length, 1);
    assert.equal(hash(JSON.stringify(proof)), accepted[0].evidence.completeRowSha256);
  }
  const originals = buttonRows.filter(r => r.evidence.section === 'discrepancies')
    .map(({ id, evidence, ...row }) => row);
  const joined = applyButtonAuthoredTypography(originals, cases, inventory, buttonControl, normalize);
  const changes = joined.filter(r => r.attribution === buttonAuthoredTypographyAttribution);
  assert.equal(changes.length, 6);
  assert.equal(changes.reduce((sum, r) => sum + r.occurrences, 0), 99);
  assert.deepEqual(joined.map(raw), originals.map(raw));
  for (let i = 0; i < joined.length; i++) if (joined[i].attribution !== buttonAuthoredTypographyAttribution)
    assert.deepEqual(joined[i], originals[i]);
  assert.deepEqual(validateButtonAuthoredTypography(joined, originals, cases, inventory, buttonControl, normalize), []);
  for (const mutate of [
    p => { p.referenceNode = 'wrong-label'; },
    p => { p.values.reference = 'forged'; },
    p => { p.astylarNode = 'wrong-control'; },
    p => { p.reviewEvidence.sourceFinding = 'wrong-source'; },
  ]) {
    const forged = structuredClone(buttonControl);
    mutate(forged.differences.find(p => p.attribution === selectedProofs[0].attribution));
    assert.throws(() => applyButtonAuthoredTypography(originals, cases, inventory, forged, normalize));
  }
  const forged = structuredClone(joined);
  forged.find(r => r.attribution === buttonAuthoredTypographyAttribution).reviewedCases.pop();
  assert.equal(validateButtonAuthoredTypography(forged, originals, cases, inventory, buttonControl, normalize).length, 1);
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8').replaceAll('\r\n', '\n');
  const start = source.indexOf("  const authoredTypographyDiscrepancies = ownerInitialStyleBinding.status === 'bound'");
  const end = source.indexOf('  const beforeNormalLineBoxScalars =', start);
  assert.ok(start > 0 && end > start);
  const functions = { applyTabScalarTypography, applyButtonAuthoredTypography, applyVisibleButtonOverflow };
  const run = new Function('ownerInitialStyleBinding', 'modalDiscrepancies', 'cases', 'elementInventory',
    'controlTypography', 'canonicalStyle', ...Object.keys(functions), source.slice(start, end) + '\nreturn authoredTypographyDiscrepancies;');
  const combinedRows = [...new Set(cases.map(c => c.family))].flatMap(family =>
    queryFindings('artifacts/material-parity/working-audit', family, current))
    .filter(r => r.evidence.section === 'discrepancies').sort((a, b) => a.evidence.ordinal - b.evidence.ordinal)
    .map(({ id, evidence, ...row }) => row);
  assert.equal(combinedRows.length, 8483);
  const combinedControl = collectControlTypographyEvidence(cases.filter(c => ['tabs', 'toolbar', 'button'].includes(c.family)), inventory);
  const proposal = run({ status: 'bound' }, combinedRows, cases, inventory, combinedControl, normalize, ...Object.values(functions));
  assert.deepEqual(proposal, applyVisibleButtonOverflow(applyButtonAuthoredTypography(
    applyTabScalarTypography(combinedRows, cases, inventory, combinedControl, normalize),
    cases, inventory, combinedControl, normalize), cases, inventory, normalize));
  const batch = proposal.filter(r => [tabScalarTypographyAttribution, buttonAuthoredTypographyAttribution, visibleButtonOverflowAttribution].includes(r.attribution));
  assert.equal(batch.length, 36); assert.equal(batch.reduce((n, r) => n + r.occurrences, 0), 1951);
  assert.equal(proposal.filter(r => r.attribution === 'unresolved').length, 1060);
  assert.deepEqual(proposal.map(raw), combinedRows.map(raw));
  for (let i = 0; i < proposal.length; i++) if (!batch.includes(proposal[i])) assert.deepEqual(proposal[i], combinedRows[i]);
  assert.equal(run({ status: 'unbound' }, combinedRows, cases, inventory, combinedControl, normalize, ...Object.values(functions)), combinedRows);
  const validationStart = source.indexOf('      const authoredControlReplay =');
  const validationEnd = source.indexOf('      errors.push(...validateNormalLineBoxScalar(', validationStart);
  assert.ok(validationStart > 0 && validationEnd > validationStart);
  const validators = { validateTabScalarTypography, validateButtonAuthoredTypography, validateVisibleButtonOverflow, collectControlTypographyEvidence };
  const validateProduction = new Function('report', 'replayedRows', 'cases', 'canonicalStyle',
    ...Object.keys(validators), 'const errors = [];\n' + source.slice(validationStart, validationEnd) + '\nreturn errors;');
  const validate = values => validateProduction({ discrepancies: values, elementInventory: inventory, controlTypography: combinedControl },
    combinedRows, cases, normalize, ...Object.values(validators));
  assert.deepEqual(validate(proposal), []);
  const forgedControls = structuredClone(combinedControl);
  forgedControls.differences.find(d => d.attribution === 'reviewed-tab-label-typography-input').values.painted = 'forged';
  assert.ok(validateProduction({ discrepancies: proposal, elementInventory: inventory, controlTypography: forgedControls },
    combinedRows, cases, normalize, ...Object.values(validators)).length);
  for (const attribution of [tabScalarTypographyAttribution, buttonAuthoredTypographyAttribution, visibleButtonOverflowAttribution]) {
    const changed = structuredClone(proposal);
    changed.find(r => r.attribution === attribution).reviewedCases.pop();
    assert.equal(validate(changed).length, 1);
  }
  // This is proof reuse, not canonical classification or rendering acceptance.
});
