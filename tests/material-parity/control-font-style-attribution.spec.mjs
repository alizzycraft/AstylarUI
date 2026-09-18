import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { planControlFontStyleAttribution } from '../../scripts/audit-material-control-font-style-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = x => createHash('sha256').update(x).digest('hex');
const planFile = 'docs/material-control-font-style-attribution-plan.json';
test('control font-style attribution independently replays sources and whole canonical payload without writes', () => {
  const files = [planFile, 'docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = files.map(f => digest(readFileSync(f)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1024', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-control-font-style-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.deepEqual(files.map(f => digest(readFileSync(f))), before);
  assert.equal(result.proposedGroups, 11); assert.equal(result.proposedObservations, 756);
  assert.deepEqual(result.counts, { buttonTexture: 600, rangeWithoutTextOwner: 156 });
  assert.equal(result.otherCompleteRows, 8328); assert.equal(result.canonicalAttributionChanged, false);
});

let source;
function fixture() {
  if (!source) {
    const plan = JSON.parse(readFileSync(planFile));
    const proof = JSON.parse(readFileSync(plan.sourceProof.file));
    const full = JSON.parse(readFileSync(proof.originalCapture.file));
    const targets = new Set(proof.findings.map(f => f.element));
    const project = entries => entries.map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
      styleInputs: e.styleInputs.filter(i => targets.has(i.id)) }));
    const original = { results: project(full.results), interactions: project(full.interactions) };
    // Synthetic membership for pure rejection controls only. The independent
    // CLI test above authenticates every byte and complete historical row.
    const rows = plan.proposed.map(g => ({ family: g.family, element: g.element, property: g.property,
      reference: g.reference, occurrences: g.occurrences, cases: g.cases, states: g.states,
      attribution: g.previousAttribution, retainedExtraField: true }));
    rows.push({ family: 'unrelated', element: 'sentinel', property: 'fontStyle',
      reference: 'normal', attribution: 'previously-reviewed', retainedExtraField: 'keep' });
    source = { proof, original, rows, normalize: bindOwnerCaretNormalization(
      readFileSync(plan.productionNormalization.module, 'utf8'), plan.productionNormalization) };
  }
  const { normalize, ...data } = source; return { ...structuredClone(data), normalize };
}
const run = f => planControlFontStyleAttribution(f.proof, f.original, f.rows, f.normalize);

test('control font-style join retains omissions and all unrelated evidence without claiming glyph or core defects', () => {
  const f = fixture(), before = JSON.stringify(f), result = run(f);
  assert.equal(result.proposedGroups, 11); assert.equal(result.proposedObservations, 756);
  assert.equal(result.otherCompleteRows, 1); assert.equal(JSON.stringify(f), before);
  assert.ok(result.proposed.every(g => g.proposedClassification === 'application-plugin-authoring-defect' &&
    !Object.hasOwn(g, 'astylar') && g.inputEquivalent === false && g.renderingEquivalent === false &&
    g.candidateComputedVerified === false && g.rendererCauseProven === false && g.nonNormalAncestorBehaviorVerified === false));
  assert.equal(result.proposed.filter(g => g.family === 'slider').reduce((n, g) => n + g.occurrences, 0), 156);
});

test('control font-style join rejects altered input, membership, reset semantics, text stage and prior classification', () => {
  const changes = [
    f => { f.proof.canonicalAttributionChanged = true; }, f => { f.proof.rendererChanged = true; },
    f => { f.proof.inputEquivalent = true; }, f => { f.proof.renderingEquivalent = true; },
    f => { f.proof.observations--; }, f => { f.proof.originalCasesScanned--; },
    f => { f.proof.findings.pop(); }, f => { f.proof.findings[1] = structuredClone(f.proof.findings[0]); },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].family = 'different'; }, f => { f.proof.findings[0].profile = 'different'; },
    f => { f.proof.findings[0].state = 'different'; }, f => { f.proof.findings[0].viewport.width++; },
    f => { f.proof.findings[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].proof.property = 'fontSize'; },
    f => { f.proof.findings[0].proof.classification = 'equivalent-representation'; },
    f => { f.proof.findings[0].proof.attribution = 'invented'; },
    f => { f.proof.findings[0].proof.referenceComputed = 'italic'; },
    f => { f.proof.findings[0].proof.candidateLocalDeclaration = 'normal'; },
    f => { f.proof.findings[0].proof.referenceReset.declarations['font-style'].value = 'normal'; },
    f => { f.proof.findings[0].proof.referenceReset.cssText = 'font-style: normal;'; },
    f => { f.proof.findings[0].proof.translatedReset.fontStyle = 'inherit'; },
    f => { f.proof.findings[0].proof.candidateOwner.authored.id = 'different'; },
    f => { f.proof.findings[0].proof.candidateComputedVerified = true; },
    f => { f.proof.findings[0].proof.rendererCauseProven = true; },
    f => { f.proof.findings[0].proof.nonNormalAncestorBehaviorVerified = true; },
    f => { f.proof.findings[0].proof.observedTextStage.fontStyle = 'italic'; },
    f => { f.proof.findings[0].proof.observedTextStage.text = 'changed'; },
    f => { f.proof.counts.buttonTexture--; }, f => { f.proof.counts.rangeWithoutTextOwner++; },
    f => { f.proof.findings.find(o => o.family === 'slider').proof.observedTextStage.glyphComparisonApplicable = true; },
    f => { f.original.results.pop(); }, f => { f.original.results.reverse(); },
    f => { f.rows[0].attribution = 'previously-reviewed'; }, f => { f.rows[0].reference = 'italic'; },
    f => { f.rows[0].astylar = 'normal'; }, f => { f.rows[0].occurrences--; },
    f => { f.rows[0].cases.reverse(); }, f => { f.rows[0].states.push('invented'); },
    f => { f.rows.push(structuredClone(f.rows[0])); }, f => { f.rows.shift(); },
  ];
  for (const [i, mutate] of changes.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => run(f), `control font-style mutation ${i}`);
  }
  assert.equal(changes.length, 41);
});
