import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { planLeafWeightTracking } from '../../scripts/audit-material-leaf-weight-tracking-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const file = 'docs/material-leaf-weight-tracking-attribution-plan.json';
const hash = x => createHash('sha256').update(x).digest('hex');
test('weight/tracking plan authenticates original sources and complete frozen canonical payload without writes', () => {
  const watched = [file, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = watched.map(f => hash(readFileSync(f)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1024', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-leaf-weight-tracking-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const result = JSON.parse(output);
  assert.equal(result.proposedGroups, 8); assert.equal(result.proposedObservations, 192);
  assert.equal(result.preservedStaticGroups, 8); assert.equal(result.preservedStaticObservations, 112);
  assert.equal(result.otherCompleteRows, 8331); assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(watched.map(f => hash(readFileSync(f))), before);
});

let cached;
function fixture() {
  if (!cached) {
    const plan = JSON.parse(readFileSync(file)), proof = JSON.parse(readFileSync(plan.sourceProof.file));
    const full = JSON.parse(readFileSync(plan.originalCapture.file)), targets = new Set(proof.findings.map(f => f.element));
    const project = es => es.map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, styleInputs: e.styleInputs.filter(i => targets.has(i.id)) }));
    // Synthetic rows for rejection sensitivity only; the test above reads and
    // authenticates every byte/row of the real canonical payload independently.
    const rows = [...plan.proposed, ...plan.preserved].map(g => ({ family: g.family, element: g.element,
      property: g.property, reference: g.reference, occurrences: g.occurrences, cases: g.cases,
      states: g.states, attribution: g.previousAttribution, retainedRawField: true }));
    rows.push({ family: 'unrelated', element: 'sentinel', property: 'width', attribution: 'unresolved' });
    cached = { proof, original: { results: project(full.results), interactions: project(full.interactions) }, rows,
      normalize: bindOwnerCaretNormalization(readFileSync(plan.productionNormalization.module, 'utf8'), plan.productionNormalization) };
  }
  const { normalize, ...data } = cached; return { ...structuredClone(data), normalize };
}
const run = f => planLeafWeightTracking(f.proof, f.original, f.rows, f.normalize);

test('weight/tracking attribution preserves same-value static reviews and source objects', () => {
  const f = fixture(), before = JSON.stringify(f), plan = run(f);
  assert.equal(plan.proposedGroups, 8); assert.equal(plan.proposedObservations, 192);
  assert.equal(plan.preservedStaticGroups, 8); assert.equal(plan.preservedStaticObservations, 112);
  assert.equal(plan.otherCompleteRows, 9); assert.equal(JSON.stringify(f), before);
  assert.ok(plan.proposed.every(p => !p.inputEquivalent && !p.renderingEquivalent && !p.rendererCauseProven));
});

test('weight/tracking membership rejects changed source values cases provenance and prior attributions', () => {
  const changes = [
    f => { f.proof.observations--; }, f => { f.proof.originalCasesScanned--; },
    f => { f.proof.findings.pop(); }, f => { f.proof.findings[1] = structuredClone(f.proof.findings[0]); },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].property = 'fontFamily'; },
    f => { f.proof.findings[0].profile = 'changed'; }, f => { f.proof.findings[0].state = 'changed'; },
    f => { f.proof.findings[0].inputTrees.astylar.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].proof.retainedScalarMatches = false; },
    f => { f.proof.findings[0].proof.retainedText.source = 'plugin'; },
    f => { f.proof.findings[0].proof.retainedRaw = '500'; },
    f => { f.proof.findings[0].proof.normalizedRetained = '500'; },
    f => { f.proof.findings[0].proof.text = 'changed'; },
    f => { f.proof.findings[0].proof.renderingEquivalent = true; },
    f => { f.proof.findings[0].proof.physicalFontSelectionVerified = true; },
    f => { f.rows[0].attribution = 'reviewed-stage-mismatch'; }, f => { f.rows[8].attribution = 'unresolved'; },
    f => { f.rows[0].occurrences--; }, f => { f.rows[0].cases.reverse(); },
    f => { f.rows[0].states.push('invented'); }, f => { f.rows[0].reference = 'changed'; },
    f => { f.rows.push(structuredClone(f.rows[0])); }, f => { f.original.results.pop(); },
    f => { f.proof.findings.reverse(); },
  ];
  for (const [index, mutate] of changes.entries()) { const f = fixture(); mutate(f); assert.throws(() => run(f), `mutation ${index}`); }
  assert.equal(changes.length, 25);
});
