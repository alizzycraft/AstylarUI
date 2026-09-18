import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { planLeafFontFamilyAttribution } from '../../scripts/audit-material-leaf-font-family-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

test('leaf-family attribution replays all original proofs and complete frozen canonical rows without writes', () => {
  const file = 'docs/material-leaf-font-family-attribution-plan.json', before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1024', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-leaf-font-family-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(readFileSync(file), before);
  assert.equal(result.proposedGroups, 4); assert.equal(result.proposedObservations, 96);
  assert.equal(result.preservedStaticGroups, 4); assert.equal(result.preservedStaticObservations, 56);
  assert.equal(result.otherCompleteRows, 8335); assert.equal(result.canonicalAttributionChanged, false);
});

let source;
function fixture() {
  if (!source) {
    const plan = JSON.parse(readFileSync('docs/material-leaf-font-family-attribution-plan.json'));
    const proof = JSON.parse(readFileSync(plan.proof.file)), full = JSON.parse(readFileSync(proof.originalCapture.file));
    const targets = new Set(proof.findings.map(o => o.element));
    const project = entries => entries.map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, styleInputs: e.styleInputs.filter(i => targets.has(i.id)) }));
    const original = { results: project(full.results), interactions: project(full.interactions) };
    // Synthetic membership rows for negative controls only; full byte-authenticated
    // canonical conservation is exercised by the independent CLI replay above.
    const rows = [...plan.proposed, ...plan.preservedStatic].map(g => ({ family: g.family, element: g.element,
      property: g.property, reference: g.reference, occurrences: g.occurrences, cases: g.cases, states: g.states,
      attribution: g.previousAttribution, retainedExtraField: true }));
    rows.push({ family: 'unrelated', element: 'sentinel', property: 'width', reference: '1px', astylar: '2px', attribution: 'unresolved' });
    source = { proof, original, rows, normalize: bindOwnerCaretNormalization(readFileSync(plan.productionNormalization.module, 'utf8'), plan.productionNormalization) };
  }
  const { normalize, ...data } = source; return { ...structuredClone(data), normalize };
}
const run = f => planLeafFontFamilyAttribution(f.proof, f.original, f.rows, f.normalize);

test('leaf-family plan preserves static same-value reviews and does not mutate any source', () => {
  const f = fixture(), before = JSON.stringify(f), plan = run(f);
  assert.equal(plan.proposedGroups, 4); assert.equal(plan.proposedObservations, 96);
  assert.equal(plan.preservedStaticGroups, 4); assert.equal(plan.preservedStaticObservations, 56);
  assert.equal(plan.otherCompleteRows, 5); assert.equal(JSON.stringify(f), before);
  assert.ok(plan.proposed.every(g => g.property === 'fontFamily' && g.renderingEquivalent === false && g.physicalFontSelectionVerified === false));
  assert.ok(plan.preservedStatic.every(g => g.previousAttribution === 'reviewed-stage-mismatch'));
  assert.equal([...plan.proposed, ...plan.preservedStatic].some(g => g.element === 'stepper-content'), false);
});

test('leaf-family join rejects changed proof membership, retained family and previous classifications', () => {
  const changes = [
    f => { f.proof.canonicalAttributionChanged = true; }, f => { f.proof.renderingEquivalent = true; },
    f => { f.proof.observations--; }, f => { f.proof.originalCasesScanned--; },
    f => { f.proof.findings.pop(); }, f => { f.proof.findings[1] = structuredClone(f.proof.findings[0]); },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].family = 'different'; }, f => { f.proof.findings[0].profile = 'different'; },
    f => { f.proof.findings[0].state = 'different'; }, f => { f.proof.findings[0].viewport.width++; },
    f => { f.proof.findings[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].proof.property = 'fontSize'; },
    f => { f.proof.findings[0].proof.authoredFamilyInheritanceMatches = false; },
    f => { f.proof.findings[0].proof.retainedFontFamilyMatches = false; },
    f => { f.proof.findings[0].proof.retainedText.style.fontFamily = 'serif'; },
    f => { f.proof.findings[0].proof.retainedText.source = 'plugin'; },
    f => { f.proof.findings[0].proof.physicalFontSelectionVerified = true; },
    f => { f.proof.findings[0].proof.rendererCauseProven = true; },
    f => { f.proof.findings[0].proof.text = 'different'; },
    f => { f.proof.counts['badge-label']--; },
    f => { f.original.results.pop(); }, f => { f.original.interactions.reverse(); },
    f => { f.rows[0].attribution = 'already-reviewed'; }, f => { f.rows[4].attribution = 'unresolved'; },
    f => { f.rows[0].cases.reverse(); }, f => { f.rows[0].occurrences--; },
    f => { f.rows[0].states.push('invented'); }, f => { f.rows.push(structuredClone(f.rows[0])); },
    f => { f.rows[0].reference = 'different'; },
  ];
  for (const [i, mutate] of changes.entries()) { const f = fixture(); mutate(f); assert.throws(() => run(f), `leaf-family mutation ${i}`); }
  assert.equal(changes.length, 30);
});
