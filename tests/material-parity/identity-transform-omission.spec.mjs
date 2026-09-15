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

test('inactive transforms cannot establish origin-omission input equivalence', () => {
  const inputs = [];
  for (const transform of ['none', 'matrix(1,0,0,1,0,0)']) for (const origin of ['0px 0px', '20px 30px', '40px 20px', '50% 50%'])
    for (const authored of [true, false]) {
      const id = `origin-${inputs.length}`;
      inputs.push({ id, reference: { transform, transformOrigin: origin }, astylar: { transform },
        referenceAuthored: authored ? [{ selector: '#' + id, active: true, declarations: {
          'transform-origin': { value: origin, important: false } } }] : [], astylarAuthored: [] });
    }
  const raw = report(inputs), before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  for (const i of inputs) {
    const d = audit.discrepancies.find(d => d.element === i.id && d.property === 'transformOrigin');
    assert.ok(d, i.id); assert.equal(d.astylar, undefined);
    assert.notEqual(d.classification, 'equivalent-representation', i.id);
    assert.equal(d.attribution, 'unresolved', i.id);
  }
  assert.equal(JSON.stringify(raw), before);
  const matching = report(inputs.map(i => ({ ...i, astylar: { ...i.reference } })));
  assert.deepEqual(buildMaterialInputAudit(matching).discrepancies, []);
});

test('all captured inactive origin omissions remain visible without scalar equivalence', () => {
  const record = JSON.parse(readFileSync('docs/material-transform-origin-omission-audit.json')).verification.data;
  const bytes = readFileSync(record.capturePath);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), record.captureSha256);
  const raw = JSON.parse(bytes), selected = { schemaVersion: raw.schemaVersion, mode: 'report-only', results: [], interactions: [] };
  const inactive = value => value === undefined || ['none', 'matrix(1,0,0,1,0,0)'].includes(value.replace(/\s/g, ''));
  let count = 0;
  for (const key of ['results', 'interactions']) for (const e of raw[key]) {
    const styleInputs = (e.styleInputs ?? []).filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined &&
      inactive(i.reference?.transform) && inactive(i.astylar?.transform)).map(i => ({ id: i.id,
      reference: { transformOrigin: i.reference.transformOrigin, transform: i.reference.transform },
      astylar: { transform: i.astylar?.transform }, referenceAuthored: i.referenceAuthored, astylarAuthored: i.astylarAuthored,
      astylarResolvedStyleEvidenceVersion: i.astylarResolvedStyleEvidenceVersion,
      astylarNormalResolvedStyle: i.astylarNormalResolvedStyle,
      astylarInteractionResolvedStyle: i.astylarInteractionResolvedStyle }));
    count += styleInputs.length;
    if (styleInputs.length) selected[key].push({ family: e.family, profile: e.profile, viewport: e.viewport, state: e.state, styleInputs });
  }
  assert.equal(count, record.exposure.observations);
  const before = JSON.stringify(selected), audit = buildMaterialInputAudit(selected);
  const origins = audit.discrepancies.filter(d => d.property === 'transformOrigin');
  assert.equal(origins.reduce((n, d) => n + d.occurrences, 0), count);
  assert.ok(origins.every(d => d.astylar === undefined && d.attribution === 'unresolved' && d.classification !== 'equivalent-representation'));
  assert.equal(JSON.stringify(selected), before);
  // This isolates scalar-policy exposure. Full-tree attribution and full raw
  // replay are separate; omission never supplies invented computed geometry.
});

test('origin sensitivity browser controls replay without the historical false waiver', () => {
  const record = JSON.parse(readFileSync('docs/material-transform-origin-omission-audit.json')).verification.data;
  const run = spawnSync(process.execPath, ['scripts/audit-material-transform-origin.mjs'], { encoding: 'utf8', maxBuffer: 2000000 });
  assert.equal(run.status, 0, run.stderr);
  const actual = JSON.parse(run.stdout);
  for (const key of ['capturePath', 'captureSha256', 'scope', 'exposure', 'runs']) assert.deepEqual(actual[key], record[key], key);
  assert.equal(actual.collector.length, record.collector.length);
  for (const item of actual.collector) {
    assert.equal(item.candidate, '<omitted>'); assert.equal(item.attribution, 'unresolved');
    assert.notEqual(item.classification, 'equivalent-representation');
  }
  assert.equal(record.collector.filter(i => i.reference === '0 0' && i.classification === 'equivalent-representation').length, 4);
});

test('fixed-descendant context proof is preserved and owned in the main audit inventory', () => {
  const evidence = JSON.parse(readFileSync('docs/material-identity-transform-context-audit.json'));
  assert.equal(evidence.findingId, 'fixed-descendant-ignores-transformed-containing-block');
  assert.equal(evidence.sourceFingerprints.length, 11);
  for (const { file, sha256 } of evidence.sourceFingerprints)
    assert.equal(createHash('sha256').update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex'), sha256, file);
  const transforms = ['<omitted>', 'none', 'translateZ(0px)', 'matrix(1,0,0,1,0,0)', 'translate(0px)', 'scale(1)', 'rotate(0deg)'];
  const verify = runs => {
    assert.equal(runs.length, 2);
    assert.deepEqual(runs[0].observations, runs[1].observations);
    for (const run of runs) {
      assert.equal(run.exitCode, 1); assert.equal(run.tests, 14);
      assert.equal(run.passed, 9); assert.equal(run.failed, 5);
      assert.equal(run.observations.length, 14);
      assert.equal(new Set(run.observations.map(o => o.mode + '/' + o.transform)).size, 14);
      for (const mode of ['fixed-child', 'stacking']) for (const transform of transforms) {
        const o = run.observations.find(row => row.mode === mode && row.transform === transform);
        assert.ok(o, mode + '/' + transform);
        const identity = !['<omitted>', 'none'].includes(transform);
        assert.equal(o.dpr, 1); assert.deepEqual(o.viewport, [320, 200]);
        assert.deepEqual(o.renderSize, [320, 200]); assert.deepEqual(o.diagnostics, []);
        assert.equal(o.candidateNormal, transform); assert.equal(o.candidateEffective, transform);
        assert.equal(o.referenceTransform.replace(/\s/g, ''), identity ? 'matrix(1,0,0,1,0,0)' : 'none');
        const host = { left: 80, top: 60, width: 100, height: 100 };
        assert.deepEqual(o.observations['context-host'], { actual: host, reference: host });
        if (mode === 'fixed-child') {
          assert.equal(o.stack, undefined);
          assert.deepEqual(o.observations['context-child'].actual, { left: 5, top: 7, width: 10, height: 10 });
          assert.deepEqual(o.observations['context-child'].reference,
            { left: identity ? 85 : 5, top: identity ? 67 : 7, width: 10, height: 10 });
        } else {
          assert.deepEqual(o.observations['context-child'], { actual: host, reference: host });
          assert.equal(o.stack.referenceHit, identity ? 'context-sibling' : 'context-child');
          assert.equal(o.stack.expectedColor, identity ? 'rgb(0, 0, 255)' : 'rgb(255, 0, 0)');
          assert.deepEqual(o.stack.actualPixel, identity ? [0, 0, 255, 255] : [255, 0, 0, 255]);
        }
      }
    }
  };
  verify(evidence.verification.runs);
  for (const mutate of [
    runs => runs[0].observations.pop(),
    runs => { for (const run of runs) run.observations[0].dpr = 2; },
    runs => { for (const run of runs) run.observations[0].candidateEffective = 'scale(1)'; },
    runs => { for (const run of runs) run.observations[0].diagnostics.push({ severity: 'error' }); },
    runs => { for (const run of runs) for (const o of run.observations) o.observations['context-child'].actual = o.observations['context-child'].reference; },
    runs => { for (const run of runs) run.observations.find(o => o.stack).stack.actualPixel = [0, 0, 0, 255]; },
  ]) {
    const copy = structuredClone(evidence.verification.runs); mutate(copy);
    assert.throws(() => verify(copy));
  }
  const audit = buildMaterialInputAudit(report([]));
  const finding = audit.sourceFindings.find(f => f.id === 'core-fixed-descendant-ignores-transformed-containing-block');
  assert.ok(finding, 'the demonstrated defect must be included in the main findings');
  assert.equal(finding.detected, true); assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.match(finding.owner, /core.*CSS containing-block/);
  assert.match(finding.introducedBy, /d3ef6dc3/);
  assert.ok(audit.focusedProofs.some(p => p.file === finding.focusedProof && p.line > 0 && p.status !== 'missing'));
  assert.ok(audit.implementationPlan.some(p => p.priority === 1.2 && /containing block/.test(p.action)));
  assert.deepEqual(audit.implementationPlan.map(p => p.priority), audit.implementationPlan.map(p => p.priority).sort((a, b) => a - b));
  for (const { file, sha256 } of evidence.sourceFingerprints)
    assert.deepEqual(audit.sourceFingerprints.filter(f => f.file === file), [{ file, sha256 }]);
  assert.deepEqual(audit.discrepancies, []); // A source proof does not manufacture Material scalar attribution.
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
