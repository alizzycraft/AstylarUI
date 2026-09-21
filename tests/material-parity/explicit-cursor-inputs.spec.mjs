import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectExplicitCursors, inspectExplicitCursor } from '../../scripts/audit-material-explicit-cursors.mjs';
import { assertExplicitCursorCensusConserved } from './explicit-cursor-census-conservation.mjs';

const read = file => JSON.parse(readFileSync(file));
const digest = x => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const report = read('docs/material-explicit-cursor-inputs.json');

test('explicit cursor census replays every original case and all 763 differing owner inputs', () => {
  const replay = collectExplicitCursors(); assertExplicitCursorCensusConserved(replay);
  assert.equal(report.casesScanned, 2311); assert.equal(report.groupCount, 19);
  assert.equal(report.observations, 763); assert.equal(report.patterns.length, 204);
  assert.equal(report.equalScalarObservations, 881);
  assert.equal(report.autoCursorObservationsRetainedOutsideScope, 5294);
  assert.equal(report.missingScalarObservations, 8);
  const scopes = {};
  for (const g of report.groups) for (const [scope, count] of Object.entries(g.requestScopes)) scopes[scope] = (scopes[scope] ?? 0) + count;
  assert.deepEqual(scopes, { 'owner-request': 485, 'ancestor-request': 152, 'no-captured-request': 126 });
  const keys = report.findings.map(f => JSON.stringify([f.case, f.element]));
  assert.equal(new Set(keys).size, 763);
  for (const p of report.patterns) {
    assert.equal(p.sha256, digest(p.proof));
    for (const flag of ['actualHitTargetVerified', 'effectivePointerCursorVerified', 'cascadeWinnerVerified',
      'historicalCauseVerified', 'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(p.proof[flag], false);
  }
  assert.equal(report.canonicalAttributionChanged, false);
});

test('case-level hover success cannot waive radio label, disabled sibling or range visual cursor differences', () => {
  const witnessed = report.findings.filter(f => f.caseLevelCursorProbeNotOwnerEvidence?.reference);
  assert.equal(witnessed.length, 40);
  assert.equal(new Set(witnessed.map(f => f.case)).size, 24);
  assert.deepEqual([...new Set(witnessed.map(f => f.element))].sort(),
    ['button-disabled', 'button-secondary', 'radio-solo-label', 'radio-team-label', 'slider-visual']);
  for (const f of witnessed) {
    assert.ok(f.case.endsWith('/hover'));
    assert.deepEqual(f.caseLevelCursorProbeNotOwnerEvidence, { reference: 'pointer', astylar: 'pointer', matches: true });
    const p = report.patterns[f.pattern].proof;
    assert.notEqual(p.reference, p.candidate); assert.equal(p.effectivePointerCursorVerified, false);
  }
  const source = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  assert.ok(source.includes("if (state !== 'hover') return { matches: true };"));
  assert.ok(source.includes("document.elementFromPoint(x, y)"));
});

test('cursor evidence rejects changed scalar identity, stages, mappings and broken ancestry', () => {
  const raw = read(report.originalCapture.file), e = raw.results.find(e => e.family === 'radio');
  const input = e.styleInputs.find(i => i.id === 'radio-solo-label');
  const reference = read(e.inputTrees.reference.file), candidate = read(e.inputTrees.astylar.file);
  const inspect = (i, r, a) => inspectExplicitCursor(i, r, a, 'radio');
  assert.equal(inspect(input, reference, candidate).candidateRequestScope, 'ancestor-request');
  const mutations = [
    ([i]) => { i.reference.cursor = 'auto'; },
    ([i]) => { i.astylar.cursor = 'default'; },
    ([i]) => { i.astylarNormalResolvedStyle.cursor = 'default'; },
    ([i]) => { i.astylarInteractionResolvedStyle.cursor = 'default'; },
    ([i]) => { i.id = 'missing'; },
    ([,r]) => { r.nodes.find(n => n.attributes?.id === input.id).type = 'button'; },
    ([,r]) => { const n = r.nodes.find(n => n.attributes?.id === input.id); r.styles[n.style].cursor = 'pointer'; },
    ([,r]) => { const n = r.nodes.find(n => n.attributes?.id === input.id); n.parent = n.key; },
    ([,,a]) => { a.nodes.find(n => n.authored?.id === input.id).parent = 'missing'; },
    ([,,a]) => { a.nodes.push(structuredClone(a.nodes.find(n => n.authored?.id === input.id))); },
    ([,,a]) => { a.resolvedStyleEvidenceVersion = 1; },
    ([i]) => { i.referenceAuthored.push({ selector: 'span', declarations: { cursor: { value: 'pointer', important: false } } }); },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const args = structuredClone([input, reference, candidate]); mutate(args);
    assert.throws(() => inspect(...args), `cursor corruption ${index}`);
  }
});

test('source witnesses retain hover-only Material intent and independently suspect core type defaults', () => {
  const native = readFileSync('examples/material-showcase/node_modules/@angular/material/fesm2022/button.mjs', 'utf8');
  assert.ok(native.includes('.mdc-button:hover{cursor:pointer}'));
  assert.ok(native.includes('.mdc-button:disabled{cursor:default;pointer-events:none}'));
  const source = readFileSync('src/app/config/browser-defaults.ts', 'utf8');
  const button = source.slice(source.indexOf('  button: {'), source.indexOf('  select: {'));
  assert.ok(button.includes('cursor: "pointer"'));
  const dialog = report.groups.filter(g => ['dialog-cancel', 'dialog-save'].includes(g.element));
  assert.equal(dialog.length, 2);
  for (const g of dialog) for (const index of g.patterns) {
    const p = report.patterns[index].proof;
    assert.equal(p.candidateRequestScope, 'no-captured-request');
    assert.equal(p.candidatePath[0].authored.type, 'button');
    assert.equal(p.rendererCauseProven, false);
  }
});
