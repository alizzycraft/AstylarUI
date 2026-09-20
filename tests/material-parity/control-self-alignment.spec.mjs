import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { collectControlSelfAlignment, inspectControlSelfAlignment } from '../../scripts/audit-material-control-self-alignment.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const file = 'docs/material-control-self-alignment.json';
const savedText = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), saved = JSON.parse(savedText);
const raw = JSON.parse(fs.readFileSync(saved.originalCapture.file));
const fixture = family => {
  const e = raw.results.find(e => e.family === family && e.profile === 'light');
  return { family, input: structuredClone(e.styleInputs.find(i => i.id === family + '-primary')),
    reference: JSON.parse(fs.readFileSync(e.inputTrees.reference.file)),
    candidate: JSON.parse(fs.readFileSync(e.inputTrees.astylar.file)) };
};
const inspect = d => inspectControlSelfAlignment(d.family, d.input, d.reference, d.candidate);

test('replays all 272 original control observations and initial-showcase source history without writes', () => {
  const protectedFiles = [file, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'];
  const before = protectedFiles.map(f => [f, hash(fs.readFileSync(f))]);
  const write = fs.writeFileSync;
  let actual;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    actual = collectControlSelfAlignment();
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(hash(JSON.stringify(actual, null, 2) + '\n'), hash(savedText));
  for (const [f, digest] of before) assert.equal(hash(fs.readFileSync(f)), digest, f);
  assert.equal(actual.casesScanned, 2311); assert.equal(actual.observations, 272);
  assert.equal(actual.groups.length, 4); assert.equal(actual.history.historicalWitnesses.length, 4);
  for (const p of actual.patterns) assert.equal(hash(JSON.stringify(p.proof)), p.sha256);
});

test('unequal layout context is classified before any renderer or compensation-necessity claim', () => {
  for (const g of saved.groups) {
    const result = inspect(fixture(g.family));
    assert.equal(result.classification, 'application-plugin-authoring-defect');
    assert.equal(result.referenceNodes[0].computed.alignSelf, 'auto');
    assert.equal(result.referenceNodes[1].computed.display, 'block');
    assert.equal(result.explicitOwnerRequest.declarations.alignSelf, 'flex-start');
    for (const key of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven',
      'compensationNecessityProven', 'canonicalAttributionChanged']) assert.equal(result[key], false);
  }
});

test('rejects changed identity, parent context, source declarations and local inspection stages', () => {
  const mutations = [
    d => { d.input.id = 'wrong'; },
    d => { d.reference.nodes.push(d.reference.nodes[0]); },
    d => { d.candidate.nodes.push(d.candidate.nodes[0]); },
    d => { d.reference.errors.push('capture failure'); },
    d => { d.candidate.resolvedStyleEvidenceVersion = 1; },
    d => { d.input.reference.alignSelf = 'center'; },
    d => { delete d.input.reference.width; },
    d => { d.input.referenceStructure.type = 'unrelated'; },
    d => { d.input.astylarNormalResolvedStyle.alignSelf = 'auto'; },
    d => { d.input.astylarAuthored.find(r => r.declarations.alignSelf !== undefined).selector = '#other'; },
    d => { d.input.astylarAuthored = d.input.astylarAuthored.filter(r => r.declarations.alignSelf === undefined); },
    d => { d.input.astylarAuthored.push(d.input.astylarAuthored.find(r => r.declarations.alignSelf !== undefined)); },
    d => { const owner = d.candidate.nodes.find(n => n.authored.id === d.input.id); owner.parent = 'absent'; },
    d => { const parent = d.candidate.nodes.find(n => n.authored.id === d.family + '-root'); parent.resolvedStyle.display = 'block'; },
    d => { const parent = d.candidate.nodes.find(n => n.authored.id === d.family + '-root'); parent.normalResolvedStyle.flexDirection = 'row'; },
  ];
  for (const family of saved.groups.map(g => g.family)) for (const mutate of mutations) {
    const d = fixture(family); mutate(d); assert.throws(() => inspect(d));
  }
});
