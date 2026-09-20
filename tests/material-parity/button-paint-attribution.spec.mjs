import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planButtonPaintAttribution } from '../../scripts/audit-material-shared-button-paint-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const saved = JSON.parse(readFileSync('docs/material-shared-button-paint-attribution-plan.json'));
const source = JSON.parse(readFileSync(saved.sourceProof.file));
const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
function fixture() {
  const rows = [...saved.proposed, ...saved.retained].flatMap(g => g.canonicalMatches.map(r => ({
    family: g.family, element: g.element, property: g.property, reference: g.reference, astylar: g.astylar,
    attribution: r.attribution, occurrences: r.occurrences, cases: r.cases, states: r.states,
    rawEvidence: { preserved: true } })));
  rows.push({ family: 'unrelated', element: 'other', attribution: 'prior-review', rawEvidence: { preserved: true } });
  return { source: structuredClone(source), rows };
}

test('button paint proposal preserves all-state source membership, inactive findings and previous classifications', () => {
  const f = fixture(), before = digest(f), r = planButtonPaintAttribution(f.source, f.rows, normalize);
  assert.equal(r.sourceObservations, 600); assert.equal(r.activeLayerObservations, 235);
  assert.equal(r.proposedGroups, 32); assert.equal(r.proposedObservations, 135);
  assert.equal(r.retainedGroups, 24); assert.equal(r.retainedObservations, 197);
  assert.equal(r.equalScalarObservations, 268);
  assert.equal(r.proposedGroups, saved.proposedGroups); assert.equal(r.proposedObservations, saved.proposedObservations);
  assert.equal(r.equalScalarObservations, saved.equalScalarObservations);
  assert.deepEqual(r.retained.map(g => g.reason), saved.retained.map(g => g.reason));
  assert.equal(digest(f), before);
  assert.equal(r.proposedObservations + r.retainedObservations + r.equalScalarObservations, 600);
  for (const g of r.proposed) {
    assert.equal(g.proposedClassification, 'application-plugin-authoring-defect');
    assert.ok(g.observations.every(o => o.activeLayer));
    for (const k of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(g[k], false);
    assert.deepEqual(g.observations.map(o => o.case).slice(0, 12), g.canonicalMatches[0].cases);
  }
});

test('source corruption is rejected rather than converted to an authoring finding', () => {
  const mutatePattern = (f, edit) => {
    const p = f.source.patterns[0]; edit(p.proof); p.sha256 = digest(p.proof);
  };
  const changes = [
    f => { f.source.kind = 'other'; }, f => { f.source.casesScanned--; },
    f => { f.source.findings.pop(); }, f => { f.source.preservedHistoricalObservations--; },
    f => { f.source.canonicalAttributionChanged = true; }, f => { f.source.inputEquivalent = true; },
    f => { f.source.findings[1] = structuredClone(f.source.findings[0]); },
    f => { f.source.findings[0].pattern = -1; }, f => { f.source.patterns[0].sha256 = 'changed'; },
    f => mutatePattern(f, p => { p.element = 'other'; }),
    f => mutatePattern(f, p => { p.candidate.descendantCount = 1; }),
    f => mutatePattern(f, p => { p.rendererCauseProven = true; }),
    f => mutatePattern(f, p => { p.reference.pseudo.opacity = '0.16'; }),
    f => mutatePattern(f, p => { p.classification = 'confirmed-core-renderer-defect'; }),
    f => { f.source.activeLayerObservations--; }, f => { f.source.inactiveLayerObservations--; },
  ];
  for (const [i, change] of changes.entries()) {
    const f = fixture(); change(f);
    assert.throws(() => planButtonPaintAttribution(f.source, f.rows, normalize), `mutation ${i}`);
  }
  assert.equal(changes.length, 16);
});

test('partial, missing, duplicate and previously reviewed canonical groups are retained without promotion', () => {
  const changes = [
    [f => { f.rows[0].occurrences++; }, 'incomplete-canonical-membership'],
    [f => { f.rows[0].cases.reverse(); }, 'incomplete-canonical-membership'],
    [f => { f.rows[0].states.push('unobserved'); }, 'incomplete-canonical-membership'],
    [f => { f.rows[0].attribution = 'prior-review'; }, 'prior-classification-preserved'],
    [f => { f.rows.shift(); }, 'missing-or-ambiguous-canonical-group'],
    [f => { f.rows.push(structuredClone(f.rows[0])); }, 'missing-or-ambiguous-canonical-group'],
  ];
  for (const [change, reason] of changes) {
    const f = fixture(); change(f); const before = digest(f);
    const r = planButtonPaintAttribution(f.source, f.rows, normalize);
    assert.equal(r.proposedGroups, saved.proposedGroups - 1); assert.equal(digest(f), before);
    assert.ok(r.retained.some(g => g.family === saved.proposed[0].family && g.element === saved.proposed[0].element &&
      g.reference === saved.proposed[0].reference && g.astylar === saved.proposed[0].astylar && g.reason === reason));
  }
});

test('complete button paint attribution authenticates source and frozen payload without writes', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-shared-button-paint-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.proposedGroups, saved.proposedGroups); assert.equal(result.proposedObservations, saved.proposedObservations);
  assert.equal(result.otherCompleteRows, 8339 - saved.proposedGroups);
});
