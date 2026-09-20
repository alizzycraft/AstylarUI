import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { collectBadgeWhitespace, inspectBadgeWhitespace } from '../../scripts/audit-material-badge-whitespace.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const file = 'docs/material-badge-whitespace-audit.json';
const saved = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), report = JSON.parse(saved);
const raw = JSON.parse(fs.readFileSync(report.capture.file));
const entry = raw.results.find(e => e.family === 'badge');
const fixture = () => ({ input: structuredClone(entry.styleInputs.find(i => i.id === 'badge-label')),
  reference: JSON.parse(fs.readFileSync(entry.inputTrees.reference.file)),
  candidate: JSON.parse(fs.readFileSync(entry.inputTrees.astylar.file)) });
const inspect = f => inspectBadgeWhitespace(f.input, f.reference, f.candidate);

test('badge whitespace replays all 52 original owners without canonical writes', () => {
  const canonical = 'docs/material-input-equivalence-audit.json';
  const before = hash(fs.readFileSync(canonical)), write = fs.writeFileSync;
  let actual;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    actual = collectBadgeWhitespace();
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(hash(JSON.stringify(actual, null, 2) + '\n'), hash(saved));
  assert.equal(hash(fs.readFileSync(canonical)), before);
  assert.equal(actual.findings.filter(f => f.kind === 'interaction').length, 40);
  for (const f of actual.findings) {
    assert.equal(f.proof.inputEquivalent, false); assert.equal(f.proof.visualEffectProven, false);
    assert.equal(f.proof.rendererCauseProven, false);
    assert.equal(f.proof.classification, 'application-plugin-authoring-defect');
  }
});

test('badge whitespace source proof rejects changed identities, ancestors, declarations and stages', () => {
  const mutations = [
    f => { f.input.id = 'other'; },
    f => { f.reference.errors.push('failed'); },
    f => { f.candidate.resolvedStyleEvidenceVersion = 1; },
    f => { f.input.reference.whiteSpace = 'nowrap'; },
    f => { f.input.reference.color = 'red'; },
    f => { f.input.astylarNormalResolvedStyle.whiteSpace = 'normal'; },
    f => { f.input.astylarAuthored = []; },
    f => { f.input.astylarAuthored[0].declarations.whiteSpace = 'normal'; },
    f => { f.candidate.nodes.find(n => n.authored.id === 'badge-label').authored.textContent = 'Other'; },
    f => { f.candidate.nodes.find(n => n.authored.id === 'badge-label').parent = 'missing'; },
    f => { f.candidate.nodes.find(n => n.authored.id === 'badge-primary').resolvedStyle.whiteSpace = 'nowrap'; },
    f => { const n = f.reference.nodes.find(n => n.attributes.id === 'badge-label'); f.reference.styles[n.style].whiteSpace = 'nowrap'; },
    f => { f.candidate.rules.find(r => r.selector === '.badge-label').whiteSpace = 'normal'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const f = fixture(); mutate(f); assert.throws(() => inspect(f), `mutation ${i}`);
  }
});
