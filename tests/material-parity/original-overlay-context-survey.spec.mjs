import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { collectOriginalOverlayContextSurvey } from './original-overlay-context-survey.mjs';

const file = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
const baseline = JSON.parse(readFileSync(file)), root = process.cwd();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function probe(mutate) {
  const raw = structuredClone(baseline), overrides = new Map();
  const put = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(value)); overrides.set(path.resolve(root, name), bytes); return hash(bytes);
  };
  const record = mutateRecord => {
    const item = raw.results[0], data = JSON.parse(readFileSync(item.file)); mutateRecord(data); item.sha256 = put(item.file, data);
  };
  mutate({ raw, record }); put(file, raw);
  return collectOriginalOverlayContextSurvey(file, { root, readBytes: name => overrides.get(name) ?? readFileSync(name) });
}

test('original overlay context reader replays all 91 states and 200 original owner proofs', () => {
  const result = collectOriginalOverlayContextSurvey(file);
  assert.equal(result.cases, 91); assert.equal(result.matchedOriginalOwners, 200);
  assert.equal(result.rootProperties, 17654);
  assert.deepEqual([...new Set(result.observations.map(r => r.viewport.deviceScaleFactor))].sort(), [1, 2]);
  assert.equal(result.candidateReplayed, false); assert.equal(result.renderingEquivalent, false);
  assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(result.missingEnumeratedAliases, ['flex', 'gap', 'gridColumn', 'gridRow', 'margin', 'padding', 'whiteSpace']);
});

test('original overlay context rejects incomplete coverage, wrong state and corrupted function reuse', () => {
  assert.throws(() => probe(({ raw }) => { raw.results.pop(); raw.cases--; }));
  assert.throws(() => probe(({ raw }) => { raw.results[1] = raw.results[0]; }));
  assert.throws(() => probe(({ record }) => record(r => { r.state = 'invented-state'; })));
  assert.throws(() => probe(({ raw }) => { raw.reusedFunctions[0].sha256 = '0'.repeat(64); }));
  assert.throws(() => probe(({ raw }) => { raw.capture.sources.pop(); }));
});

test('original overlay context rejects changed owner styles and ancestor samples with recomputed record hashes', () => {
  assert.throws(() => probe(({ record }) => record(r => {
    const node = r.freshReferenceTree.nodes.find(n => n.key === r.proofs[0].proof.referenceNode);
    r.freshReferenceTree.styles[node.style].fontSize = '99px';
  })), /Fresh mapped owner/);
  assert.throws(() => probe(({ record }) => record(r => { r.proofs.pop(); })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.roots[1].ancestry.splice(1, 1); })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.nodes.push(r.context.nodes[0]); })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.viewport.deviceScaleFactor = 3; })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.documentUrl = 'http://127.0.0.1:4431/reference/dialog?benchmark=1&profile=wrong&interaction=activate'; })));
});

test('original overlay context rejects stale runtime and claims beyond reference context', () => {
  assert.throws(() => probe(({ raw }) => { raw.browser = 'other'; }));
  assert.throws(() => probe(({ raw }) => { raw.results[0].sha256 = '0'.repeat(64); }), /Changed evidence/);
  assert.throws(() => probe(({ record }) => record(r => { r.runtime.assets[0].sha256 = '0'.repeat(64); })));
  assert.throws(() => probe(({ record }) => record(r => { r.runtime.assets = []; })));
  assert.throws(() => probe(({ raw }) => { raw.candidateReplayed = true; }));
  assert.throws(() => probe(({ raw }) => { raw.renderingEquivalent = true; }));
  assert.throws(() => probe(({ record }) => record(r => { r.candidateReplayed = true; })));
});
