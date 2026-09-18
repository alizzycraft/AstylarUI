import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { planExpansionOwnerAttribution } from '../../scripts/audit-material-expansion-owner-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
test('expansion attribution independently replays all owner proofs and every canonical byte without writes', () => {
  const file = 'docs/material-expansion-owner-attribution-plan.json';
  const watched = [file, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = watched.map(f => hash(readFileSync(f)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1024', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-expansion-owner-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const result = JSON.parse(output), saved = JSON.parse(readFileSync(file));
  assert.equal(result.groups, 43); assert.equal(result.observations, saved.proposedObservations);
  assert.equal(result.preservedReviewedOwnerGroups, 59); assert.equal(result.otherCompleteRows, 8296);
  assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(watched.map(f => hash(readFileSync(f))), before);
});

let cached;
function fixture() {
  if (!cached) {
    const plan = JSON.parse(readFileSync('docs/material-expansion-owner-attribution-plan.json'));
    const proof = JSON.parse(readFileSync(plan.sourceProof.file));
    const full = JSON.parse(readFileSync(plan.originalCapture.file));
    const project = entries => entries.map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
      styleInputs: e.family === 'expansion' ? e.styleInputs.filter(i => i.id === 'expansion-primary') : [] }));
    // Synthetic canonical rows only exercise the pure join's rejection guards.
    // The independent check above authenticates and scans the actual full payload.
    const rows = [...plan.proposed, ...plan.preserved].map(g => ({ family: g.family, element: g.element,
      property: g.property, reference: g.reference, astylar: g.astylar, occurrences: g.occurrences,
      cases: g.cases, states: g.states, attribution: g.previousAttribution, retainedExtraField: true }));
    rows.push({ family: 'unrelated', element: 'sentinel', property: 'width', attribution: 'unresolved' });
    const normalize = bindOwnerCaretNormalization(readFileSync(plan.productionNormalization.module, 'utf8'), plan.productionNormalization);
    cached = { proof, original: { results: project(full.results), interactions: project(full.interactions) }, rows, normalize };
  }
  const { normalize, ...data } = cached; return { ...structuredClone(data), normalize };
}
const run = f => planExpansionOwnerAttribution(f.proof, f.original, f.rows, f.normalize);

test('owner attribution preserves all prior reviewed groups and does not turn correspondence into equivalence', () => {
  const f = fixture(), before = JSON.stringify(f), plan = run(f);
  assert.equal(plan.proposedGroups, 43); assert.equal(plan.preservedReviewedOwnerGroups, 59);
  assert.equal(plan.otherCompleteRows, 60); assert.equal(plan.disabledHeaderCursorDifferencesRetained, 8);
  assert.equal(JSON.stringify(f), before);
  assert.ok(plan.proposed.every(r => r.proposedClassification === 'parity-harness-defect' &&
    !r.inputEquivalent && !r.renderingEquivalent && !r.rendererCauseProven && !r.canonicalMappingChanged));
});

test('owner attribution rejects changed owners, raw evidence, membership, states and unsupported claims', () => {
  const changes = [
    f => { f.proof.inputEquivalent = true; }, f => { f.proof.canonicalAttributionChanged = true; },
    f => { f.proof.observations--; }, f => { f.proof.originalCasesScanned--; },
    f => { f.proof.findings.pop(); }, f => { f.proof.findings[1] = structuredClone(f.proof.findings[0]); },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].profile = 'different'; }, f => { f.proof.findings[0].state = 'different'; },
    f => { f.proof.findings[0].viewport.width++; },
    f => { f.proof.findings[0].proof.originalReferenceOwner.type = 'mat-expansion-panel-header'; },
    f => { f.proof.findings[0].proof.originalCandidateOwner.authored.role = 'region'; },
    f => { f.proof.findings[0].proof.originalReferenceOwner.computed.fontWeight = '500'; },
    f => { f.proof.findings[0].proof.originalCandidateOwner.stages.resolvedStyle.fontWeight = '400'; },
    f => { f.proof.findings[0].proof.checkedOriginalReferenceProperties--; },
    f => { f.proof.findings[0].proof.renderingEquivalent = true; },
    f => { f.proof.findings[0].proof.canonicalMappingChanged = true; },
    f => { f.rows[0].occurrences--; }, f => { f.rows[0].cases.reverse(); },
    f => { f.rows[0].states.push('invented'); }, f => { f.rows[0].reference = 'changed'; },
    f => { f.rows[0].astylar = 'changed'; }, f => { f.rows[0].attribution = 'already-reviewed'; },
    f => { f.rows[43].attribution = 'unresolved'; },
    f => { f.rows.push(structuredClone(f.rows[0])); }, f => { f.rows.splice(0, 1); },
    f => { f.original.results.pop(); }, f => { f.original.interactions.reverse(); },
  ];
  for (const [index, mutate] of changes.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => run(f), `owner attribution mutation ${index}`);
  }
  assert.equal(changes.length, 29);
});
