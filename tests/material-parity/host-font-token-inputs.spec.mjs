import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { collectHostFontTokens, inspectHostFontTokens, planHostFontTokens } from '../../scripts/audit-material-host-font-token-inputs.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

test('component host token omissions replay every original owner and property', () => {
  const report = collectHostFontTokens();
  assert.deepEqual(report, JSON.parse(readFileSync('docs/material-host-font-token-inputs.json')));
  assert.equal(report.ownerObservations, 172); assert.equal(report.propertyObservations, 380);
  assert.deepEqual(report.counts, { toolbar: 52, paginator: 52, stepper: 68 });
  assert.equal(report.originalCasesScanned, 2311);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/host-font-token-inputs.spec.mjs'));
  for (const o of report.observations) for (const p of o.proofs) {
    assert.equal(p.classification, 'application-plugin-authoring-defect');
    assert.equal(p.attribution, 'component-host-font-token-omission');
    assert.equal(p.candidateLocalDeclaration, '<omitted>');
    for (const flag of ['computedCandidateVerified', 'wholeElementInputEquivalent', 'rendererCauseProven',
      'renderingEquivalent', 'descendantConsumersVerified', 'themeTokenOriginVerified']) assert.equal(p[flag], false);
  }
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(report[flag], false);
});

test('token proofs reject missing requests, stage changes, resets and untrusted ownership across profiles', () => {
  const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
  let executions = 0;
  for (const family of ['toolbar', 'paginator', 'stepper']) for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const e = original.results.find(e => e.family === family && e.profile === profile && e.viewport.id === 'desktop');
    assert.ok(e);
    const input = e.styleInputs.find(i => i.id === family + '-primary');
    const reference = JSON.parse(readFileSync(e.inputTrees.reference.file)), candidate = JSON.parse(readFileSync(e.inputTrees.astylar.file));
    const rn = t => t.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === input.id);
    const an = t => t.nodes.find(n => n.authored?.id === input.id);
    const rr = t => t.rules[rn(t).rules.find(i => t.rules[i].declarations['font-family'])];
    const before = JSON.stringify([input, reference, candidate]);
    assert.equal(inspectHostFontTokens(family, input, reference, candidate).length, family === 'stepper' ? 1 : 3);
    const changes = [
      (i, r) => { rr(r).declarations['font-family'].value = 'Roboto'; },
      (i, r) => { rr(r).declarations['font-family'].important = true; },
      (i, r) => { rr(r).active = false; },
      (i, r) => { rr(r).declarations.font = { value: 'inherit', important: false }; },
      (i, r) => { rn(r).inline['font-family'] = { value: 'Roboto', important: false }; },
      (i, r) => { rn(r).attributes.style = 'font-family: Roboto'; },
      (i, r) => { r.styles[rn(r).style].fontFamily = 'Arial'; },
      (i, r) => { rn(r).parent = 'frame'; },
      (i, r) => { r.nodes.push(structuredClone(rn(r))); },
      (i, r) => { r.errors.push('incomplete'); },
      (i, _r, c) => { an(c).normalResolvedStyle.fontFamily = 'Roboto'; },
      (i, _r, c) => { an(c).interactionResolvedStyle.fontFamily = 'Roboto'; },
      (i, _r, c) => { an(c).resolvedStyle.fontFamily = 'Roboto'; },
      (i, _r, c) => { an(c).authored.style = { fontFamily: 'Roboto' }; },
      (i, _r, c) => { an(c).authored.attributes = { style: 'font-family: Roboto' }; },
      (i, _r, c) => { c.rules.push({ selector: '.' + family, fontFamily: 'Roboto' }); },
      (i, _r, c) => { c.rules.push({ selector: 'div[data-token]', fontFamily: 'Roboto' }); },
      (i, _r, c) => { c.rules.push({ selector: '#page', all: 'initial' }); },
      (i, _r, c) => { c.rules.push({ selector: '.unknown', nested: { fontFamily: 'Roboto' } }); },
      (i, _r, c) => { an(c).parent = 'root'; },
      (i, _r, c) => { an(c).authored.textContent = 'unexpected own text'; },
      (i, _r, c) => { an(c).retainedText = { font: 'Roboto' }; },
      (i, _r, c) => { c.resolvedStyleSource = 'synthesized'; },
      (i, _r, c) => { c.errors.push('incomplete'); },
      i => { i.astylarResolvedStyleEvidenceVersion = 1; },
      i => { i.reference.fontFamily = 'Arial'; },
      i => { i.astylar.fontFamily = 'Roboto'; },
      i => { i.astylarNormalResolvedStyle.fontFamily = 'Roboto'; },
      i => { i.astylarInteractionResolvedStyle.fontFamily = 'Roboto'; },
      i => { i.referenceAuthored.find(r => r.declarations['font-family']).declarations['font-family'].value = 'Roboto'; },
      i => { i.astylarAuthored.push({ selector: '.' + family, declarations: { fontFamily: 'Roboto' } }); },
    ];
    if (family !== 'stepper') changes.push(
      (i, r) => { rr(r).declarations['font-weight'].value = '400'; },
      (i, r) => { rr(r).declarations['letter-spacing'].value = 'normal'; },
      (i, r) => { r.styles[rn(r).style].fontWeight = '500'; },
      (i, r) => { r.styles[rn(r).style].letterSpacing = '1px'; },
      (i, _r, c) => { an(c).normalResolvedStyle.fontWeight = '400'; },
      (i, _r, c) => { an(c).interactionResolvedStyle.letterSpacing = '0'; },
      (i, _r, c) => { c.rules.push({ selector: '.' + family, fontWeight: '400' }); },
      (i, _r, c) => { c.rules.push({ selector: '.' + family, letterSpacing: '0' }); },
    );
    for (const [index, mutate] of changes.entries()) {
      const args = structuredClone([input, reference, candidate]); mutate(...args);
      assert.throws(() => inspectHostFontTokens(family, ...args), `${family}/${profile}/${index}`); executions++;
    }
    assert.equal(JSON.stringify([input, reference, candidate]), before);
  }
  assert.equal(executions, 436);
});

test('host token proposal independently authenticates all canonical rows and original source owners', () => {
  const result = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-host-font-token-inputs.mjs', '--plan', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.proposedGroups, 7); assert.equal(result.proposedObservations, 380);
  assert.equal(result.otherCompleteRows, 8332); assert.equal(result.canonicalAttributionChanged, false);
});

// Small synthetic row witnesses test the join boundary only. The independent
// CLI replay above, not these witnesses, authenticates real canonical contents.
function joinFixture() {
  const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
  const input = { id: 'toolbar-primary', reference: { fontFamily: 'Roboto', fontWeight: '400', letterSpacing: 'normal' }, astylar: {} };
  const caseId = 'static:toolbar@light/desktop', viewport = { id: 'desktop' }, inputTrees = { reference: { sha256: 'reference' }, astylar: { sha256: 'candidate' } };
  const proofs = Object.entries(input.reference).map(([property, referenceComputed]) => ({ property, referenceComputed,
    candidateLocalDeclaration: '<omitted>', classification: 'application-plugin-authoring-defect', attribution: 'component-host-font-token-omission',
    computedCandidateVerified: false, wholeElementInputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false,
    descendantConsumersVerified: false, themeTokenOriginVerified: false }));
  const proof = { canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false,
    ownerObservations: 1, originalCasesScanned: 1, propertyObservations: 3, counts: { toolbar: 1, paginator: 0, stepper: 0 },
    observations: [{ case: caseId, family: 'toolbar', element: input.id, profile: 'light', state: 'static', viewport,
      inputTrees, originalInputSha256: digest(input), proofs }] };
  const original = { results: [{ family: 'toolbar', profile: 'light', viewport, inputTrees, styleInputs: [input] }], interactions: [] };
  const rows = proofs.map(p => ({ family: 'toolbar', element: input.id, property: p.property, reference: p.referenceComputed,
    occurrences: 1, cases: [caseId], states: ['static'], attribution: 'unresolved', completeRawEvidence: { preserve: true } }));
  rows.push({ family: 'unrelated', element: 'unrelated', property: 'fontSize', attribution: 'existing-review', completeRawEvidence: { preserve: true } });
  return { proof, original, rows };
}

test('host token proposal rejects changed membership prior reviews scalar inputs and stronger claims', () => {
  const changes = [
    x => { x.proof.observations = []; },
    x => { x.proof.observations.push(structuredClone(x.proof.observations[0])); x.proof.ownerObservations++; },
    x => { x.original.results = []; },
    x => { x.original.results.push(structuredClone(x.original.results[0])); },
    x => { x.proof.observations[0].originalInputSha256 = 'changed'; },
    x => { x.proof.observations[0].inputTrees = { reference: { sha256: 'changed' } }; },
    x => { x.proof.observations[0].proofs.pop(); },
    x => { x.proof.observations[0].proofs[0].referenceComputed = 'Arial'; },
    x => { x.rows[0].attribution = 'existing-review'; },
    x => { x.rows[0].occurrences++; },
    x => { x.rows[0].cases = ['invented']; },
    x => { x.rows[0].states = ['hover']; },
    x => { x.rows.push(structuredClone(x.rows[0])); },
    x => { x.rows[0].reference = 'Arial'; },
    x => { x.proof.propertyObservations--; },
    x => { x.proof.counts.toolbar--; },
    x => { x.proof.observations[0].proofs[0].classification = 'confirmed-core-defect'; },
    ...['computedCandidateVerified', 'wholeElementInputEquivalent', 'rendererCauseProven', 'renderingEquivalent',
      'descendantConsumersVerified', 'themeTokenOriginVerified'].map(flag => x => { x.proof.observations[0].proofs[0][flag] = true; }),
    ...['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent'].map(flag => x => { x.proof[flag] = true; }),
  ];
  const base = joinFixture(), before = JSON.stringify(base), positive = planHostFontTokens(base.proof, base.original, base.rows, x => x);
  assert.equal(positive.proposedGroups, 3); assert.equal(positive.otherCompleteRows, 1); assert.equal(positive.canonicalAttributionChanged, false);
  assert.equal(JSON.stringify(base), before);
  for (const [index, change] of changes.entries()) {
    const x = joinFixture(); change(x);
    assert.throws(() => planHostFontTokens(x.proof, x.original, x.rows, x => x), 'join mutation ' + index);
  }
  assert.equal(changes.length, 27);
});
