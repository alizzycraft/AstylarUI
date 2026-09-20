import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { planLayoutRequestAttribution } from '../../scripts/audit-material-layout-request-attribution.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';

const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const files = { alignment: 'docs/material-control-self-alignment.json', flex: 'docs/material-content-flex-requests.json',
  whitespace: 'docs/material-badge-whitespace-audit.json' };
const originals = Object.fromEntries(Object.entries(files).map(([kind, file]) => [kind, JSON.parse(readFileSync(file))]));
const saved = JSON.parse(readFileSync('docs/material-layout-request-attribution-plan.json'));
const normalize = bindOwnerCaretNormalization(readFileSync(saved.productionNormalization.module, 'utf8'), saved.productionNormalization);
function fixture() {
  return { sources: structuredClone(originals), rows: saved.proposed.map(g => ({ family: g.family, element: g.element,
    property: g.property, reference: g.reference, astylar: g.astylar, occurrences: g.occurrences,
    cases: g.observations.slice(0, 12).map(o => o.case),
    states: [...new Set(g.observations.map(o => o.case.startsWith('static:') ? 'static' : o.case.split('/').slice(2).join('/')))],
    attribution: 'unresolved', rawEvidence: { keep: true } })) };
}

test('layout request proposal preserves all eight source groups, exact memberships and unrelated rows', () => {
  const f = fixture(), before = digest(f);
  const result = planLayoutRequestAttribution(f.sources, f.rows, normalize);
  assert.equal(result.proposedGroups, 8); assert.equal(result.proposedObservations, 492);
  assert.equal(result.otherCompleteRows, 0); assert.equal(digest(f), before);
  assert.deepEqual(Object.fromEntries(['alignment', 'flex', 'whitespace'].map(kind =>
    [kind, result.proposed.filter(g => g.kind === kind).reduce((n, g) => n + g.occurrences, 0)])),
  { alignment: 272, flex: 168, whitespace: 52 });
  for (const g of result.proposed) {
    assert.equal(g.proposedClassification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven', 'compensationNecessityProven']) assert.equal(g[flag], false);
  }
  f.rows.push({ family: 'unrelated', element: 'other', attribution: 'prior-review', extra: { raw: true } });
  const extended = planLayoutRequestAttribution(f.sources, f.rows, normalize);
  assert.equal(extended.otherCompleteRows, 1);
  assert.equal(extended.otherOrderedRowDigestsSha256, digest([digest(f.rows.at(-1))]));
});

test('layout request proposal rejects altered source coverage, values, stages and canonical membership', () => {
  const mutations = [
    f => { delete f.sources.flex; }, f => { f.sources.alignment.casesScanned--; },
    f => { f.sources.flex.canonicalAttributionChanged = true; },
    f => { f.sources.whitespace.findings.pop(); },
    f => { f.sources.flex.propertyObservations--; },
    f => { f.sources.alignment.findings[1] = structuredClone(f.sources.alignment.findings[0]); },
    f => { f.sources.alignment.findings[0].reference = 'changed'; },
    f => { f.sources.alignment.findings[0].astylar = 'changed'; },
    f => { f.sources.alignment.findings[0].pattern = -1; },
    f => { f.sources.alignment.patterns[0].sha256 = 'changed'; },
    f => { f.sources.whitespace.findings[0].proof.inputEquivalent = true; },
    f => { f.sources.whitespace.findings[0].proof.rendererCauseProven = true; },
    f => { f.sources.whitespace.findings[0].proof.classification = 'confirmed-core-defect'; },
    f => { f.rows.pop(); }, f => { f.rows.push(structuredClone(f.rows[0])); },
    f => { f.rows[0].attribution = 'previously-reviewed'; },
    f => { f.rows[0].reference = 'changed'; }, f => { f.rows[0].astylar = 'changed'; },
    f => { f.rows[0].occurrences--; }, f => { f.rows[0].cases.reverse(); },
    f => { f.rows[0].states.pop(); },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f);
    assert.throws(() => planLayoutRequestAttribution(f.sources, f.rows, normalize), `mutation ${i}`);
  }
  assert.equal(mutations.length, 21);
});

test('complete layout request proposal authenticates its original sources and frozen payload without writes', () => {
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-layout-request-attribution.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.groups, 8); assert.equal(result.observations, 492);
  assert.equal(result.otherCompleteRows, 8331); assert.equal(result.canonicalFilesChanged, false);
});
