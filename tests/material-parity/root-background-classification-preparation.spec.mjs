import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectRootBackgroundAuditInputs, rootBackgroundClassificationContexts,
  classifyRootBackgroundInput, rootBackgroundAttribution, validateRootBackgroundEvidence,
  validateRootBackgroundClassifications } from './root-background-classification-preparation.mjs';
import { applySidenavBackgroundScalar, validateSidenavBackgroundScalar, sidenavBackgroundAttribution } from './root-background-classification-preparation.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { createHash } from 'node:crypto';

test('sidenav scalar join covers four complete populations and rejects incomplete or altered evidence', async () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes);
  const cases = [...original.results.map(c => ({ ...c, kind: 'static' })),
    ...original.interactions.map(c => ({ ...c, kind: 'interaction' }))].filter(c => c.family === 'sidenav');
  const { collectFullTreeInventory } = await import('./input-equivalence-audit.mjs');
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const groups = new Map();
  for (const c of cases) {
    const input = c.styleInputs.find(i => i.id === 'sidenav-primary');
    const reference = normalize(input.reference).backgroundColor, astylar = normalize(input.astylar).backgroundColor;
    const key = JSON.stringify([reference, astylar]);
    if (!groups.has(key)) groups.set(key, { family: 'sidenav', element: input.id, property: 'backgroundColor',
      reference, astylar, attribution: 'unresolved', occurrences: 0, cases: ['not-authoritative-sample'] });
    groups.get(key).occurrences++;
  }
  const rows = [...groups.values()], before = JSON.stringify(rows);
  const applied = applySidenavBackgroundScalar(rows, cases, inventory, normalize);
  assert.equal(applied.length, 4);
  assert.equal(applied.reduce((sum, r) => sum + r.reviewEvidence.proofs.length, 0), 62);
  assert.ok(applied.every(r => r.attribution === sidenavBackgroundAttribution && r.reviewEvidence.inputEquivalent === false));
  assert.equal(JSON.stringify(rows), before);
  assert.deepEqual(applied.map(r => [r.reference, r.astylar, r.occurrences, r.cases]), rows.map(r => [r.reference, r.astylar, r.occurrences, r.cases]));
  assert.deepEqual(validateSidenavBackgroundScalar(applied, rows, cases, inventory, normalize), []);
  const damaged = structuredClone(applied); damaged[0].reviewEvidence.proofs.pop();
  assert.equal(validateSidenavBackgroundScalar(damaged, rows, cases, inventory, normalize).length, 1);
  assert.equal(validateSidenavBackgroundScalar(applied.slice(1), rows, cases, inventory, normalize).length, 1);
  for (const wrongCases of [cases.slice(1), [...cases, cases[0]]])
    assert.ok(applySidenavBackgroundScalar(rows, wrongCases, inventory, normalize).some(r => r.attribution === 'unresolved'));
  const wrongRows = rows.map(r => ({ ...r, occurrences: r.occurrences + 1 }));
  assert.deepEqual(applySidenavBackgroundScalar(wrongRows, cases, inventory, normalize), wrongRows);
  const badInventory = { ...inventory, errors: [{ message: 'untrusted capture' }] };
  assert.deepEqual(applySidenavBackgroundScalar(rows, cases, badInventory, normalize), rows);
  const unrelated = { ...rows[0], element: 'sidenav-root' };
  assert.deepEqual(applySidenavBackgroundScalar([unrelated], cases, inventory, normalize), [unrelated]);
});

test('all root background source proofs bind precise unequal values to exact original cases', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  const evidence = collectRootBackgroundAuditInputs(original,
    { parityPath: 'artifacts/material-parity/current-ancestry-audit/latest-report.json' });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  const contexts = rootBackgroundClassificationContexts(evidence);
  assert.equal(contexts.size, 2311); assert.equal(evidence.groups.length, 144);
  assert.equal(evidence.canonicalIntegration, false);
  assert.equal(evidence.canonicalCoverageProven, false);
  let reviewed = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      const input = entry.styleInputs.find(input => input.id === entry.family + '-root');
      const observation = contexts.get(JSON.stringify([key, input.id, 'backgroundColor']));
      assert.ok(observation);
      const classify = (value = input, property = 'backgroundColor', reference = observation.reference,
        candidate = observation.astylar) => classifyRootBackgroundInput(value, property, reference, candidate, observation);
      const result = classify();
      assert.equal(result.attribution, rootBackgroundAttribution);
      assert.equal(result.classification, 'application-plugin-authoring-defect');
      assert.equal(result.reviewEvidence.rendererCauseProven, false);
      assert.notEqual(observation.reference, observation.astylar);
      assert.throws(() => classify(input, 'color'));
      assert.throws(() => classify(input, 'backgroundColor', observation.astylar));
      assert.throws(() => classify(input, 'backgroundColor', observation.reference, '#ffffff'));
      assert.throws(() => classify({ ...input, id: 'unrelated-root' }));
      assert.throws(() => classify({ ...input, astylar: { ...input.astylar, background: '#ffffff' } }));
      assert.equal(classifyRootBackgroundInput(input, 'backgroundColor', observation.reference,
        observation.astylar, undefined), undefined);
      reviewed++;
    }
  }
  assert.equal(reviewed, 2311);
  assert.equal(rootBackgroundClassificationContexts({ ...evidence, binding: { status: 'unbound' } }).size, 0);
  assert.throws(() => rootBackgroundClassificationContexts({ ...evidence,
    observations: [...evidence.observations, evidence.observations[0]] }));
  assert.deepEqual(validateRootBackgroundEvidence(evidence), []);
  assert.deepEqual(validateRootBackgroundClassifications(evidence, evidence.groups), []);
  assert.deepEqual(validateRootBackgroundClassifications(evidence,
    [...evidence.groups].reverse().concat({ attribution: 'unrelated' })), []);
  const controls = [
    rows => rows.pop(),
    rows => rows.push(structuredClone(rows[0])),
    rows => { rows[0].reference = rows[0].astylar; },
    rows => { rows[0].occurrences++; },
    rows => { rows[0].reviewedCases[0] = 'unreviewed-case'; },
    rows => { rows[0].cases.pop(); },
    rows => { rows[0].states = []; },
    rows => { rows[0].classification = 'equivalent'; },
    rows => { rows[0].recommendedOwner = 'renderer'; },
    rows => { rows[0].reviewEvidence.rendererCauseProven = true; },
    rows => { rows[0].attribution = 'unresolved'; },
  ];
  for (const mutate of controls) {
    const rows = structuredClone(evidence.groups); mutate(rows);
    assert.equal(validateRootBackgroundClassifications(evidence, rows).length, 1);
  }
  assert.equal(validateRootBackgroundClassifications({ ...evidence,
    binding: { status: 'unbound' } }, evidence.groups).length, 1);
  // A forged claim can remain internally consistent; only independent source
  // replay can reject it. Exercise that distinction explicitly.
  const forged = structuredClone(evidence);
  forged.groups[0].reviewEvidence.rendererCauseProven = true;
  assert.deepEqual(validateRootBackgroundClassifications(forged, forged.groups), []);
  assert.equal(validateRootBackgroundEvidence(forged).length, 1);
});

test('collector refuses missing provenance, another worktree, external paths and incomplete callers', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  assert.equal(collectRootBackgroundAuditInputs({}).binding.status, 'unbound');
  for (const options of [
    { parityPath, root: '..' },
    { parityPath: 'docs/material-root-background-inputs.json' },
    { parityPath },
  ]) {
    const evidence = collectRootBackgroundAuditInputs({}, options);
    assert.equal(evidence.binding.status, 'invalid');
    assert.deepEqual(evidence.observations, []);
    assert.deepEqual(evidence.groups, []);
    assert.equal(rootBackgroundClassificationContexts(evidence).size, 0);
  }
});
