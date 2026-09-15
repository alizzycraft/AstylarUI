import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { buildMaterialInputAudit } from './input-equivalence-audit.mjs';

const report = styleInputs => ({ schemaVersion: 1, mode: 'report-only', results: [
  { family: 'core', profile: 'light', viewport: { id: 'desktop' }, styleInputs },
], interactions: [] });
const input = (id, reference, candidate, authored = true) => ({ id,
  reference: { transform: reference }, astylar: candidate === undefined ? {} : { transform: candidate },
  referenceAuthored: authored ? [{ selector: '#' + id, active: true,
    declarations: { transform: { value: reference, important: false } } }] : [], astylarAuthored: [],
  astylarNormalResolvedStyle: candidate === undefined ? {} : { transform: candidate },
  astylarInteractionResolvedStyle: candidate === undefined ? {} : { transform: candidate },
  astylarResolvedStyleEvidenceVersion: 2,
});

test('identity transforms cannot establish equivalence to an omitted transform', () => {
  const transforms = ['matrix(1,0,0,1,0,0)', 'matrix(1, 0, 0, 1, 0, 0)', 'translate(0px)', 'scale(1)',
    'rotate(0deg)', 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)'];
  const raw = report(transforms.flatMap((value, index) => [input(`explicit-${index}`, value), input(`unproven-${index}`, value, undefined, false)]));
  const untouched = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  for (const observed of raw.results[0].styleInputs) {
    const difference = audit.discrepancies.find(d => d.element === observed.id && d.property === 'transform');
    assert.ok(difference, observed.id);
    assert.equal(difference.astylar, undefined);
    assert.notEqual(difference.classification, 'equivalent-representation', observed.id);
    assert.equal(difference.attribution, 'unresolved', observed.id);
  }
  assert.equal(JSON.stringify(raw), untouched);
});

test('explicit matching transforms remain comparable and none does not become identity', () => {
  const equal = report(['none', 'matrix(1,0,0,1,0,0)', 'translate(0px)', 'scale(1)', 'rotate(12deg)']
    .map((value, index) => input(`matching-${index}`, value, value)));
  assert.deepEqual(buildMaterialInputAudit(equal).discrepancies, []);
  const unequal = buildMaterialInputAudit(report([input('identity-to-none', 'matrix(1,0,0,1,0,0)', 'none')]));
  assert.ok(unequal.discrepancies.some(d => d.property === 'transform' && d.classification !== 'equivalent-representation'));
  const initial = buildMaterialInputAudit(report([input('none-to-omitted', 'none')]));
  assert.equal(initial.discrepancies.find(d => d.property === 'transform')?.classification, 'equivalent-representation');
});

test('all captured identity-transform omissions retain their complete raw case population', () => {
  const record = JSON.parse(readFileSync('docs/material-identity-transform-omission-audit.json')).verification;
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.captureSha256);
  const raw = JSON.parse(bytes), selected = { ...raw, results: [], interactions: [] }, groups = new Map();
  for (const [kind, key] of [['static', 'results'], ['interaction', 'interactions']]) for (const entry of raw[key]) {
    const styleInputs = (entry.styleInputs ?? []).filter(i =>
      i.reference?.transform?.replace(/\s/g, '') === 'matrix(1,0,0,1,0,0)' && i.astylar?.transform === undefined);
    if (!styleInputs.length) continue;
    selected[key].push({ ...entry, styleInputs });
    for (const i of styleInputs) {
      const groupKey = JSON.stringify([entry.family, i.id]);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push(`${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    }
  }
  assert.equal([...groups.values()].reduce((n, cases) => n + cases.length, 0), 140);
  assert.equal(groups.size, record.groups.length);
  for (const g of record.groups) assert.deepEqual(groups.get(JSON.stringify([g.family, g.element])), g.cases);
  const audit = buildMaterialInputAudit(selected);
  const differences = audit.discrepancies.filter(d => d.property === 'transform');
  assert.equal(differences.reduce((n, d) => n + d.occurrences, 0), 140);
  for (const difference of differences) {
    assert.notEqual(difference.classification, 'equivalent-representation');
    assert.equal(difference.attribution, 'unresolved');
  }
});

test('browser identity-transform containing-block and stacking controls replay at both DPRs', () => {
  const record = JSON.parse(readFileSync('docs/material-identity-transform-omission-audit.json')).verification;
  const run = spawnSync(process.execPath, ['scripts/audit-material-identity-transform.mjs'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const actual = JSON.parse(run.stdout);
  for (const key of ['captureSha256', 'scope', 'identityMatrixObservations', 'candidateOmitted', 'groups', 'runs'])
    assert.deepEqual(actual[key], record[key], key);
});
