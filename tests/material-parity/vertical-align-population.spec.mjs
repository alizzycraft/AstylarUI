import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectVerticalAlignPopulationInput } from '../../scripts/audit-material-vertical-align-population.mjs';

const file = 'docs/material-vertical-align-population.json';
const saved = JSON.parse(readFileSync(file));
const originalBytes = readFileSync(saved.originalCapture.file);
assert.equal(createHash('sha256').update(originalBytes).digest('hex'), saved.originalCapture.sha256);
const original = JSON.parse(originalBytes);
const entries = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) =>
  es.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
function fixture(finding = saved.findings.find(f => f.element === 'checkbox-label')) {
  const entry = entries.get(finding.case);
  return { input: structuredClone(entry.styleInputs.find(i => i.id === finding.element)),
    reference: JSON.parse(readFileSync(finding.inputTrees.reference.file)),
    candidate: JSON.parse(readFileSync(finding.inputTrees.astylar.file)) };
}
const inspect = f => inspectVerticalAlignPopulationInput(f.input, f.reference, f.candidate);
const a = f => f.candidate.nodes.find(n => n.authored?.id === f.input.id);
const r = f => f.reference.nodes.find(n => n.attributes?.id === f.input.id || n.attributes?.['data-parity-id'] === f.input.id);

test('alignment survey covers the whole original scalar difference population, not just pending groups', () => {
  assert.equal(saved.casesScanned, 2311); assert.equal(entries.size, 2311);
  assert.equal(saved.groupCount, 116); assert.equal(saved.observations, 6886);
  assert.equal(saved.missingScalarObservations.length, 8);
  assert.deepEqual(saved.statusCounts, {
    'computed-initial-versus-omitted-local-declaration': 4932,
    'reference-explicit-middle-versus-candidate-omission': 794,
    'unresolved-mapping': 442,
    'candidate-explicit-middle-versus-reference-baseline': 718,
  });
  const identities = [];
  for (const [caseId, entry] of entries) for (const input of entry.styleInputs) {
    if (input.reference && input.astylar && input.reference.verticalAlign !== input.astylar.verticalAlign)
      identities.push(JSON.stringify([caseId, input.id]));
  }
  assert.deepEqual(saved.findings.map(f => JSON.stringify([f.case, f.element])), identities);
  assert.equal(new Set(identities).size, 6886);
  assert.equal(saved.groups.reduce((n, g) => n + g.occurrences, 0), 6886);
  for (const f of saved.findings) {
    for (const key of ['wholeElementInputEquivalent', 'usedAlignmentVerified', 'renderingEquivalent',
      'rendererCauseProven', 'canonicalAttributionChanged']) assert.equal(f.proof[key], false);
  }
});

test('each alignment group replays its source owners without changing evidence', () => {
  for (const group of saved.groups) {
    const finding = saved.findings.find(f => f.case === group.cases[0] && f.element === group.element);
    const f = fixture(finding), before = JSON.stringify(f);
    assert.deepEqual(inspect(f), finding.proof);
    assert.equal(JSON.stringify(f), before);
  }
  const dialog = saved.findings.find(f => f.element === 'dialog-copy');
  assert.equal(dialog.proof.mapping.referenceIdentity, 'data-parity-id');
  assert.equal(dialog.proof.mapping.sameElementType, false);
  assert.equal(dialog.proof.referenceOwner.type, 'mat-dialog-content');
  assert.equal(dialog.proof.candidateOwner.type, 'p');
  const plugin = saved.findings.find(f => f.element === 'tab-panel');
  assert.equal(plugin.proof.candidateOwner.privatePluginType, true);
  assert.equal(plugin.proof.retainedText, null);
});

test('history locates all eight explicit candidate requests without claiming a concealed renderer cause', () => {
  const history = saved.explicitCandidateRequestHistory;
  assert.equal(history.revisionsScanned, 102);
  assert.equal(history.endpointRevision, '9f713c0930ea5c3692e96f5f62a05d38863abcb8');
  assert.equal(history.historicalRenderingReplayed, false);
  assert.equal(history.concealedCoreCauseProven, false);
  assert.deepEqual(history.requests.map(r => r.selector), ['.checkbox-label', '.dialog-copy', '.expansion-title',
    '.radio-label', '.step-text', '.switch-label', '.tab', '.tab-panel']);
  for (const request of history.requests) {
    assert.equal(request.transitions.length, 1);
    const change = request.transitions[0];
    assert.equal(change.revision, request.selector === '.dialog-copy'
      ? 'bc0e4493bdad98a694635ff57ff5746ee285d040' : '354084ea1f1a6abb3e010222062e3cea9f945b61');
    assert.equal(change.middleBefore, false); assert.equal(change.middleAfter, true);
    assert.ok(change.beforeLines.every(line => !/verticalAlign:\s*'middle'/.test(line)));
    assert.ok(change.afterLines.some(line => /verticalAlign:\s*'middle'/.test(line)));
    assert.ok(request.currentLines.some(line => /verticalAlign:\s*'middle'/.test(line)));
  }
});

test('alignment proof rejects changed stages and does not waive ambiguous or competing declarations', () => {
  const invalid = [
    f => { f.reference.errors.push('capture'); }, f => { f.candidate.errors.push('capture'); },
    f => { f.reference.nodes.push(structuredClone(r(f))); },
    f => { f.candidate.resolvedStyleSource = 'other'; },
    f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.astylarResolvedStyleEvidenceVersion = 1; },
    f => { f.input.referenceStructure.type = 'p'; },
    f => { f.input.astylarStructure.type = 'p'; },
    f => { delete f.input.reference.color; },
    f => { f.input.reference.color = 'changed'; },
    f => { f.input.astylar.verticalAlign = 'baseline'; },
    f => { a(f).normalResolvedStyle.verticalAlign = 'baseline'; },
    f => { f.input.referenceAuthored.push({ selector: 'span', declarations: { color: { value: 'red', important: false } } }); },
    f => { f.input.astylarAuthored.find(rule => rule.selector === '.checkbox-label').declarations.verticalAlign = 'baseline'; },
  ];
  for (const [index, mutate] of invalid.entries()) {
    const f = fixture(), before = JSON.stringify(f); mutate(f);
    assert.notEqual(JSON.stringify(f), before);
    assert.throws(() => inspect(f), `invalid source ${index}`);
  }
  const ambiguous = [
    f => { f.candidate.rules.push({ selector: ':is(span)', verticalAlign: 'baseline' }); },
    f => { f.candidate.rules.push({ selector: '#' + f.input.id, all: 'unset' }); },
    f => { f.candidate.rules.find(rule => rule.selector === '.checkbox-label').mediaMaxWidth = '500px'; },
    f => { r(f).attributes.style = 'vertical-align:middle'; },
    f => { r(f).attributes.style = 'vertical-\\61lign:middle'; },
    f => { r(f).attributes.style = '/* unresolved syntax */ color:red'; },
    f => { a(f).authored.style = { verticalAlign: 'middle' }; },
    f => { a(f).authored.attributes = { style: 'all:unset' }; },
    f => { a(f).authored.verticalAlign = 'middle'; },
  ];
  for (const [index, mutate] of ambiguous.entries()) {
    const f = fixture(), before = JSON.stringify(f); mutate(f);
    assert.notEqual(JSON.stringify(f), before);
    assert.equal(inspect(f).classification, 'unresolved', `ambiguous source ${index}`);
  }
  assert.equal(invalid.length + ambiguous.length, 23);
  for (const status of ['computed-initial-versus-omitted-local-declaration', 'reference-explicit-middle-versus-candidate-omission']) {
    const f = fixture(saved.findings.find(finding => finding.proof.status === status));
    assert.equal(inspect(f).status, status);
    f.input.astylarAuthored.push({ selector: '#' + f.input.id, declarations: { verticalAlign: 'baseline' } });
    assert.equal(inspect(f).classification, 'unresolved', 'scalar/tree authored-stage disagreement must remain visible');
  }
});

test('missing or ambiguous identity mappings remain unresolved instead of using matching style or text', () => {
  for (const mutate of [
    f => { r(f).attributes.id = 'other'; },
    f => { a(f).authored.id = 'other'; },
    f => { const n = structuredClone(r(f)); n.key += '/ambiguous'; f.reference.nodes.push(n); },
    f => { const n = structuredClone(a(f)); n.key += '/ambiguous'; f.candidate.nodes.push(n); },
  ]) {
    const f = fixture(); mutate(f); const proof = inspect(f);
    assert.equal(proof.status, 'unresolved-mapping'); assert.equal(proof.classification, 'unresolved');
  }
});

test('complete alignment report regenerates from authenticated captures in enforced no-write mode', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-vertical-align-population.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.groups, 116); assert.equal(result.observations, 6886);
  assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(readFileSync(file), before);
});
