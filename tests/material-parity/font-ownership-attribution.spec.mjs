import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { planFontOwnershipAttribution } from '../../scripts/audit-material-font-ownership-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
let cached;
function inputs() {
  if (cached) return cached;
  const saved = JSON.parse(readFileSync('docs/material-font-ownership-attribution-plan.json'));
  const proofs = Object.fromEntries(Object.entries(saved.proofs).map(([kind, d]) => [kind, JSON.parse(readFileSync(d.file))]));
  const original = JSON.parse(readFileSync(saved.originalCapture.file));
  const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
  // Only mutation tests use this minimal row projection. The independent CLI
  // replay below authenticates every complete row in the historical payload.
  const rows = [...saved.proposed, ...saved.preserved].map(f => ({ ...Object.fromEntries(
    ['family', 'element', 'property', 'reference', 'astylar', 'occurrences', 'cases', 'states'].map(k => [k, f[k]])), attribution: f.prior }));
  cached = { saved, proofs, original, normalize, rows }; return cached;
}

test('font ownership proposal independently replays all sources and the entire frozen canonical payload', () => {
  const receipt = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-font-ownership-attribution.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.proposedGroups, 12); assert.equal(receipt.proposedObservations, 401);
  assert.equal(receipt.preservedGroups, 1); assert.equal(receipt.preservedObservations, 6);
  assert.equal(receipt.matchingScalarObservations, 17); assert.equal(receipt.otherCompleteRows, 8327);
  assert.equal(receipt.canonicalAttributionChanged, false);
});

test('font ownership join rejects missing changed or overstated source witnesses for all four kinds', () => {
  const { proofs, original, normalize, rows } = inputs();
  const before = digest([proofs, original, rows]);
  assert.equal(planFontOwnershipAttribution(proofs, original, rows, normalize).proposedObservations, 401);
  for (const kind of ['scope', 'expansion', 'tab', 'overlay']) {
    const changes = [
      p => { p.findings.pop(); }, p => { p.findings[1] = p.findings[0]; },
      p => { p.findings[0].case = 'invented'; },
      p => { p.findings[0].originalInputSha256 = 'changed'; },
      p => { p.findings[0].inputTrees.reference.sha256 = 'changed'; },
      p => { p.findings[0].viewport.width++; },
      p => { p.findings[0].state = 'invented'; }, p => { p.findings[0].profile = 'invented'; },
      p => { p.findings[0].proof.classification = 'confirmed-core-defect'; },
      p => { p.findings[0].proof[kind === 'scope' ? 'wholeElementInputEquivalent' : 'inputEquivalent'] = true; },
      p => { p.findings[0].proof.rendererCauseProven = true; },
      p => { p.findings[0].proof.renderingEquivalent = true; },
      p => { p.findings[0].proof.candidateLocalFontSize = '99px'; },
      p => { p.findings[0].proof.referenceComputedFontSize = '99px'; },
      p => { p.canonicalAttributionChanged = true; }, p => { p.originalCasesScanned--; },
    ];
    for (const mutate of changes) {
      const p = { ...proofs[kind], findings: [...proofs[kind].findings] };
      p.findings[0] = structuredClone(p.findings[0]); mutate(p);
      assert.throws(() => planFontOwnershipAttribution({ ...proofs, [kind]: p }, original, rows, normalize));
    }
  }
  assert.equal(digest([proofs, original, rows]), before);
});

test('font ownership join preserves compact numerical matches earlier static reviews and unrelated full rows', () => {
  const { proofs, original, normalize, rows } = inputs();
  const untouched = { family: 'other', property: 'fontSize', attribution: 'existing-review', nested: { preserve: true } };
  const result = planFontOwnershipAttribution(proofs, original, [...rows, untouched], normalize);
  assert.equal(result.originalObservations, 424); assert.equal(result.matchingScalarObservations, 17);
  assert.equal(result.preservedObservations, 6); assert.equal(result.otherCompleteRows, 2);
  assert.equal(result.otherOrderedRowDigestsSha256, digest([rows.at(-1), untouched].map(digest)));
  for (const family of ['toolbar', 'paginator', 'expansion', 'tabs', 'bottom-sheet', 'dialog', 'snack-bar']) {
    assert.throws(() => planFontOwnershipAttribution(proofs,
      { ...original, results: original.results.filter(e => e.family !== family),
        interactions: original.interactions.filter(e => e.family !== family) }, rows, normalize));
  }
  const p = { ...proofs.expansion, findings: proofs.expansion.findings.filter(f => f.proof.candidateLocalFontSize === '<omitted>') };
  p.observations = p.findings.length;
  assert.throws(() => planFontOwnershipAttribution({ ...proofs, expansion: p }, original, rows, normalize));
});

test('overlay extension retains every earlier complete proposal and refuses stronger font claims', () => {
  const { saved, proofs, original, normalize, rows } = inputs();
  const previous = JSON.parse(execFileSync('git', ['show', '25ae772:docs/material-font-ownership-attribution-plan.json'], { encoding: 'utf8' }));
  assert.deepEqual(saved.proposed.filter(f => f.kind !== 'overlay'), previous.proposed);
  assert.deepEqual(saved.preserved, previous.preserved); assert.deepEqual(saved.matches, previous.matches);
  for (const kind of ['scope', 'expansion', 'tab']) assert.deepEqual(saved.proofs[kind], previous.proofs[kind]);
  const changes = [
    p => { p.candidateComputedFontSizeVerified = true; },
    p => { p.mapping.status = 'unresolved'; },
    p => { p.pageSizeMatchesReferenceOverlay = !p.pageSizeMatchesReferenceOverlay; },
  ];
  for (const mutate of changes) {
    const p = { ...proofs.overlay, findings: [...proofs.overlay.findings] };
    p.findings[0] = structuredClone(p.findings[0]); mutate(p.findings[0].proof);
    assert.throws(() => planFontOwnershipAttribution({ ...proofs, overlay: p }, original, rows, normalize));
  }
});

test('font ownership join refuses changed canonical values membership or prior review precedence', () => {
  const { proofs, original, normalize, rows } = inputs();
  const changes = [
    r => { r.pop(); }, r => { r.push(structuredClone(r[0])); },
    r => { r[0].reference = '99px'; }, r => { r[0].astylar = r[0].reference; },
    r => { r[0].occurrences--; }, r => { r[0].cases.reverse(); },
    r => { r[0].states = ['invented']; }, r => { r[0].attribution = 'existing-review'; },
    r => { r.at(-1).attribution = 'unresolved'; },
  ];
  for (const mutate of changes) {
    const r = structuredClone(rows); mutate(r);
    assert.throws(() => planFontOwnershipAttribution(proofs, original, r, normalize));
  }
});
