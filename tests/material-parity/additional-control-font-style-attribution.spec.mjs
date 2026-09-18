import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { planAdditionalControlFontStyle } from '../../scripts/audit-material-additional-control-font-style-attribution.mjs';
import { additionalControlFontStyleTargets } from '../../scripts/audit-material-additional-control-font-style.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const file = 'docs/material-additional-control-font-style-attribution-plan.json';
test('additional control attribution independently replays original sources and the whole frozen canonical payload', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const receipt = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-additional-control-font-style-attribution.mjs', '--check'],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(receipt.proposedGroups, 4); assert.equal(receipt.proposedObservations, 168);
  assert.equal(receipt.otherCompleteRows, 8335); assert.equal(receipt.canonicalAttributionChanged, false);
  assert.deepEqual(readFileSync(file), before);
});

let template;
function fixture() {
  if (!template) {
    const plan = JSON.parse(readFileSync(file)), proof = JSON.parse(readFileSync(plan.sourceProof.file));
    const source = JSON.parse(readFileSync(proof.originalCapture.file));
    // Pure-function fixture: preserve all original case identities and exact
    // selected input objects, without unrelated captured geometry/paint fields.
    // The independent CLI test above authenticates the unmodified full payload.
    const original = Object.fromEntries(['results', 'interactions'].map(kind => [kind, source[kind].map(e => ({
      family: e.family, profile: e.profile, viewport: e.viewport, state: e.state, inputTrees: e.inputTrees,
      styleInputs: e.styleInputs.filter(i => Object.hasOwn(additionalControlFontStyleTargets, i.id)),
    }))]));
    const rows = plan.proposed.map(p => ({ ...Object.fromEntries(['family', 'element', 'property', 'reference',
      'occurrences', 'cases', 'states'].map(k => [k, p[k]])), attribution: 'unresolved' }));
    rows.push({ family: 'sentinel', element: 'other', property: 'color', reference: 'red', astylar: 'blue',
      attribution: 'previous-review', retained: true });
    const normalize = bindOwnerCaretNormalization(readFileSync(plan.productionNormalization.module, 'utf8'), plan.productionNormalization);
    template = { proof, original, rows, normalize };
  }
  const { normalize, ...mutable } = template;
  return { ...structuredClone(mutable), normalize };
}
const run = f => planAdditionalControlFontStyle(f.proof, f.original, f.rows, f.normalize);

test('additional control pure membership keeps normal paint distinct from inherited authoring and preserves unrelated rows', () => {
  const f = fixture(), before = JSON.stringify(f), p = run(f);
  assert.equal(JSON.stringify(f), before);
  assert.equal(p.proposedGroups, 4); assert.equal(p.proposedObservations, 168); assert.equal(p.otherCompleteRows, 1);
  for (const g of p.proposed) {
    assert.equal(g.proposedClassification, 'application-plugin-authoring-defect');
    assert.equal(g.observations.length, g.occurrences); assert.equal(g.astylar, undefined);
    for (const k of ['inputEquivalent', 'wholeElementInputEquivalent', 'renderingEquivalent',
      'rendererCauseProven', 'candidateComputedVerified', 'nonNormalAncestorBehaviorVerified']) assert.equal(g[k], false);
  }
});

test('additional control membership rejects dropped observations, prior-review overrides and unsupported claims', () => {
  const changes = [
    f => { f.proof.canonicalAttributionChanged = true; }, f => { f.proof.rendererChanged = true; },
    f => { f.proof.inputEquivalent = true; }, f => { f.proof.renderingEquivalent = true; },
    f => { f.proof.findings.pop(); }, f => { f.proof.findings.push(f.proof.findings[0]); },
    f => { f.proof.originalCasesScanned--; },
    f => { f.proof.findings[0].family = 'wrong'; }, f => { f.proof.findings[0].profile = 'wrong'; },
    f => { f.proof.findings[0].originalInputSha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].inputTrees.reference.sha256 = '0'.repeat(64); },
    f => { f.proof.findings[0].proof.classification = 'equivalent-representation'; },
    f => { f.proof.findings[0].proof.candidateOwner.authored.class = 'material-button'; },
    f => { f.proof.findings[0].proof.referenceReset.declarations['font-style'].value = 'normal'; },
    f => { f.proof.findings[0].proof.translatedReset.fontStyle = 'inherit'; },
    f => { f.proof.findings[0].proof.observedTextStage.fontStyle = 'italic'; },
    f => { f.proof.findings[0].proof.observedTextStage.text = 'changed'; },
    f => { f.proof.findings[0].proof.inputEquivalent = true; },
    f => { f.proof.findings[0].proof.rendererCauseProven = true; },
    f => { f.proof.findings[0].proof.nonNormalAncestorBehaviorVerified = true; },
    f => { f.original.results.push(f.original.results[0]); },
    f => { f.rows[0].attribution = 'previous-review'; }, f => { f.rows[0].reference = 'italic'; },
    f => { f.rows[0].occurrences++; }, f => { f.rows[0].cases.reverse(); },
    f => { f.rows[0].states.push('invented'); }, f => { f.rows.pop(); f.rows.push(f.rows[0]); },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(), before = JSON.stringify(f); change(f);
    assert.notEqual(JSON.stringify(f), before, `mutation ${i} must change evidence`);
    assert.throws(() => run(f), `mutation ${i}`);
  }
  assert.equal(changes.length, 27);
});
