import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { collectContentFlexRequests, inspectContentFlexRequests } from '../../scripts/audit-material-content-flex-requests.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'docs/material-content-flex-requests.json';
const saved = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), report = JSON.parse(saved);
const original = JSON.parse(fs.readFileSync(report.originalCapture.file));
function fixture(family) {
  const id = family === 'dialog' ? 'dialog-copy' : 'expansion-title';
  const entry = [...original.results, ...original.interactions].find(e => e.family === family && e.styleInputs.some(i => i.id === id));
  return { family, input: structuredClone(entry.styleInputs.find(i => i.id === id)),
    reference: JSON.parse(fs.readFileSync(entry.inputTrees.reference.file)),
    candidate: JSON.parse(fs.readFileSync(entry.inputTrees.astylar.file)) };
}
const inspect = f => inspectContentFlexRequests(f.family, f.input, f.reference, f.candidate);

test('content flex requests replay all original observations without rewriting canonical evidence', () => {
  const files = [file, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'];
  const before = files.map(f => hash(fs.readFileSync(f))), write = fs.writeFileSync;
  let actual;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    actual = collectContentFlexRequests();
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(hash(JSON.stringify(actual, null, 2) + '\n'), hash(saved));
  assert.deepEqual(files.map(f => hash(fs.readFileSync(f))), before);
  assert.equal(actual.casesScanned, 2311); assert.equal(actual.observations, 100);
  assert.equal(actual.propertyObservations, 168); assert.equal(actual.groups.length, 3);
  for (const pattern of actual.patterns) assert.equal(hash(JSON.stringify(pattern.proof)), pattern.sha256);
});

test('missing component flex requests are authoring differences, not demonstrated renderer failures', () => {
  for (const family of ['expansion', 'dialog']) {
    const proof = inspect(fixture(family));
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.rendererCauseProven, false);
    assert.equal(proof.geometryEffectProven, false);
    assert.equal(proof.properties.length, family === 'expansion' ? 2 : 1);
    assert.equal(proof.properties[0].referenceRequest, '1');
    assert.equal(proof.properties[0].candidateLocal, '0');
    for (const property of proof.properties) assert.equal(property.classification, 'application-plugin-authoring-defect');
  }
});

test('content flex evidence rejects identity, source, context, value and stage changes', () => {
  const mutations = [
    f => { f.input.id = 'other'; },
    f => { f.reference.errors.push('capture failed'); },
    f => { f.reference.nodes.push(f.reference.nodes[0]); },
    f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.reference.flexGrow = '0'; },
    f => { delete f.input.reference.width; },
    f => { f.input.astylarNormalResolvedStyle.flexGrow = '1'; },
    f => { f.input.astylarAuthored[0].declarations.flexGrow = '1'; },
    f => { f.input.astylarAuthored = []; },
    f => { const n = f.candidate.nodes.find(n => n.authored.id === f.input.id); n.parent = 'missing'; },
    f => { const n = f.candidate.nodes.find(n => n.authored.id === f.input.id); n.authored.textContent = 'changed'; },
    f => { const n = f.candidate.nodes.find(n => n.authored.id === f.input.id); n.authored.style = { flexGrow: '1' }; },
    f => { const n = f.candidate.nodes.find(n => n.authored.id === f.input.id); f.candidate.nodes.find(p => p.key === n.parent).normalResolvedStyle.flexDirection = 'invalid'; },
    f => { const n = f.reference.nodes.find(n => (n.attributes.id ?? n.attributes['data-parity-id']) === f.input.id);
      f.reference.rules[n.rules.find(i => f.reference.rules[i].declarations['flex-grow'])].active = false; },
    f => { const n = f.reference.nodes.find(n => (n.attributes.id ?? n.attributes['data-parity-id']) === f.input.id);
      f.reference.rules[n.rules.find(i => f.reference.rules[i].declarations['flex-grow'])].declarations['flex-grow'].value = '2'; },
  ];
  for (const family of ['expansion', 'dialog']) for (const [index, mutate] of mutations.entries()) {
    const f = fixture(family); mutate(f); assert.throws(() => inspect(f), `${family}: mutation ${index}`);
  }
});
