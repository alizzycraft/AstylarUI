import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { planAuthoringInputAttribution, bindAuthoringInputEquivalence } from '../../scripts/audit-material-authoring-input-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let cached;
function inputs() {
  if (cached) return cached;
  const saved = JSON.parse(readFileSync('docs/material-authoring-input-attribution-plan.json'));
  const proofs = Object.fromEntries(Object.entries(saved.proofs).map(([kind, descriptor]) => [kind, JSON.parse(readFileSync(descriptor.file))]));
  const original = JSON.parse(readFileSync(saved.originalCapture.file));
  const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
  const equivalent = bindAuthoringInputEquivalence(readFileSync(saved.productionEquivalence.module, 'utf8'), saved.productionEquivalence);
  // Minimal canonical projections are for join mutation tests only. The CLI
  // test below independently authenticates the complete historical payload.
  const rows = saved.findings.map(f => ({ ...Object.fromEntries(
    ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'].map(k => [k, f[k]])), attribution: 'unresolved' }));
  cached = { saved, proofs, original, normalize, equivalent, rows }; return cached;
}

test('authoring proposal replays all sources and authenticates every frozen canonical row', () => {
  const receipt = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-authoring-input-attribution.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.proposedGroups, 9); assert.equal(receipt.proposedObservations, 136);
  assert.equal(receipt.otherCompleteRows, 8330); assert.equal(receipt.baselineUnresolved, 2160);
  assert.deepEqual(receipt.counts, { container: { owners: 104, matching: 52, unequal: 52 },
    range: { owners: 156, matching: 80, unequal: 76 }, disabled: { owners: 78, matching: 70, unequal: 8 } });
  assert.equal(receipt.canonicalAttributionChanged, false);
});

test('each authoring proof rejects incomplete changed or overstated source witnesses', () => {
  const { proofs, original, normalize, equivalent, rows } = inputs();
  const before = digest([proofs, original, rows]);
  assert.equal(planAuthoringInputAttribution(proofs, original, rows, normalize, equivalent).proposedObservations, 136);
  for (const kind of ['container', 'range', 'disabled']) {
    const field = kind === 'disabled' ? 'observations' : 'findings';
    const changes = [
      p => { p[field].pop(); },
      p => { p[field][1] = p[field][0]; },
      p => { p[field][0].case = 'invented'; },
      p => { p[field][0].originalInputSha256 = 'changed'; },
      p => { p[field][0].inputTrees.reference.sha256 = 'changed'; },
      p => { p[field][0].viewport.width++; },
      p => { p[field][0].state = 'other'; },
      p => { p[field][0].proof.classification = 'confirmed-core-defect'; },
      p => { p[field][0].proof.inputEquivalent = true; },
      p => { p[field][0].proof.rendererCauseProven = true; },
      p => { p.canonicalAttributionChanged = true; },
      p => { p.originalCasesScanned--; },
      p => { p[field][0].proof[kind === 'disabled' ? 'candidateOpacity' : 'candidateFontSize'] = '999'; },
      p => { p[field][0].proof[kind === 'disabled' ? 'referenceOpacity' : 'referenceFontSize'] = '999'; },
      p => { p[field][0].proof[kind === 'disabled' ? 'renderedOpacityVerified' : 'renderingEquivalent'] = true; },
    ];
    for (const mutate of changes) {
      const p = { ...proofs[kind], [field]: [...proofs[kind][field]] };
      p[field][0] = structuredClone(p[field][0]); mutate(p);
      assert.throws(() => planAuthoringInputAttribution({ ...proofs, [kind]: p }, original, rows, normalize, equivalent));
    }
  }
  assert.equal(digest([proofs, original, rows]), before);
});

test('authoring join preserves numeric matches unrelated rows and the full original population', () => {
  const { proofs, original, normalize, equivalent, rows } = inputs();
  const untouched = { family: 'unrelated', property: 'fontSize', attribution: 'existing-review', evidence: { preserve: true } };
  const report = planAuthoringInputAttribution(proofs, original, [...rows, untouched], normalize, equivalent);
  assert.equal(report.otherCompleteRows, 1); assert.equal(report.otherOrderedRowDigestsSha256, digest([digest(untouched)]));
  for (const family of ['list', 'table', 'slider']) {
    const altered = { ...original, results: original.results.filter(e => e.family !== family) };
    assert.throws(() => planAuthoringInputAttribution(proofs, altered, rows, normalize, equivalent));
  }
  for (const kind of ['container', 'range']) {
    const p = { ...proofs[kind], findings: proofs[kind].findings.filter(f => !f.proof.scalarMatches) };
    assert.throws(() => planAuthoringInputAttribution({ ...proofs, [kind]: p }, original, rows, normalize, equivalent));
  }
  const disabled = { ...proofs.disabled, matchingOpacityCases: proofs.disabled.matchingOpacityCases - 1 };
  assert.throws(() => planAuthoringInputAttribution({ ...proofs, disabled }, original, rows, normalize, equivalent));
});

test('authoring join rejects canonical membership changes and replacement of existing attribution', () => {
  const { proofs, original, normalize, equivalent, rows } = inputs();
  const changes = [
    r => { r.pop(); }, r => { r.push(structuredClone(r[0])); },
    r => { r[0].reference = '999px'; }, r => { r[0].astylar = r[0].reference; },
    r => { r[0].occurrences--; }, r => { r[0].cases.reverse(); },
    r => { r[0].states = ['invented']; }, r => { r[0].attribution = 'existing-review'; },
  ];
  for (const mutate of changes) {
    const r = structuredClone(rows); mutate(r);
    assert.throws(() => planAuthoringInputAttribution(proofs, original, r, normalize, equivalent));
  }
});

test('production equivalence is source-bound and retains numeric opacity equality without erasing font differences', () => {
  const { saved } = inputs();
  const source = readFileSync(saved.productionEquivalence.module, 'utf8');
  const equivalent = bindAuthoringInputEquivalence(source, saved.productionEquivalence);
  assert.equal(equivalent('opacity', '1', '1.0', {}, {}), true);
  assert.equal(equivalent('opacity', '0.38', '1.0', {}, {}), false);
  assert.equal(equivalent('fontSize', '14.4px', '16px', {}, {}), false);
  assert.equal(equivalent('fontSize', '16px', '16px', {}, {}), true);
  assert.throws(() => bindAuthoringInputEquivalence(source.replace("property === 'opacity' && Number(reference)", "property === 'fontSize' && Number(reference)"), saved.productionEquivalence));
  assert.throws(() => bindAuthoringInputEquivalence(source.replace('function equivalentValue(', 'function otherValue('), saved.productionEquivalence));
});
