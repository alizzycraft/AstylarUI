import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { collectOverlayAncestorContextSurvey } from './overlay-ancestor-context-survey.mjs';

const file = 'artifacts/material-parity/overlay-ancestor-context-current-ancestry-audit/latest-report.json';
const root = process.cwd(), baseline = JSON.parse(readFileSync(file));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function probe(mutate) {
  const raw = structuredClone(baseline), overrides = new Map();
  const replace = (file, value) => {
    const bytes = Buffer.from(JSON.stringify(value)); overrides.set(path.resolve(root, file), bytes); return hash(bytes);
  };
  const changeRecord = change => {
    const item = raw.results[0], value = JSON.parse(readFileSync(item.file)); change(value);
    item.sha256 = replace(item.file, value);
  };
  mutate?.({ raw, changeRecord, overrides });
  replace(file, raw);
  return collectOverlayAncestorContextSurvey(file, { root, readBytes: name => overrides.get(name) ?? readFileSync(name) });
}

test('survey reopens all 48 original records, runtime assets and 96 ancestor samples', () => {
  const report = collectOverlayAncestorContextSurvey(file);
  assert.equal(report.cases, 48); assert.equal(report.samples, 96);
  assert.equal(report.replayedRootProperties, 4656);
  assert.deepEqual(report.missingEnumeratedComputedAliases, ['flex', 'gap', 'gridColumn', 'gridRow', 'margin', 'padding', 'whiteSpace']);
  assert.equal(report.canonicalAttributionChanged, false);
  assert.equal(report.originalOverlayCauseEstablished, false);
  assert.equal(report.renderingEquivalent, false);
});

test('survey rejects missing, duplicated and substituted state coverage', () => {
  assert.throws(() => probe(({ raw }) => { raw.results.pop(); raw.originalStaticCases--; raw.samples -= 2; }));
  assert.throws(() => probe(({ raw }) => { raw.results[1] = structuredClone(raw.results[0]); }));
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.samples[1].state = 'original-static-root-context'; })));
});

test('survey rejects changed original root data, ancestry and viewport even with recomputed record digest', () => {
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => {
    const c = r.samples[0].context, first = c.roots[0];
    c.nodes.find(n => n.key === first.node).computed['font-size'] = '99px';
  })), /Original root style changed/);
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.samples[1].context.roots[1].ancestry.splice(1, 1); })), /ancestry/);
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.samples[0].context.viewport.width++; })));
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.samples[0].context.documentUrl = 'http://127.0.0.1:4431/reference/other?benchmark=1&profile=light'; })));
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.samples[0].context.nodes[0].attributes.style = 'transform:scale(2)'; })), /authored attributes/);
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.samples[1].context.nodes.push(r.samples[1].context.nodes[0]); })), /Duplicate ancestor/);
});

test('survey rejects stale source, capture digests, runtime evidence and broadened claims', () => {
  assert.throws(() => probe(({ raw }) => { raw.results[0].sha256 = '0'.repeat(64); }), /Changed evidence/);
  assert.throws(() => probe(({ raw }) => { raw.browser = 'other'; }));
  assert.throws(() => probe(({ raw }) => { raw.capture.sources.pop(); }));
  assert.throws(() => probe(({ raw }) => { raw.capture.sources[0].sha256 = '0'.repeat(64); }), /Changed evidence/);
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.runtime.assets[0].sha256 = '0'.repeat(64); })), /Runtime asset/);
  assert.throws(() => probe(({ changeRecord }) => changeRecord(r => { r.runtime.assets = []; })));
  assert.throws(() => probe(({ raw }) => { raw.originalOverlayCauseEstablished = true; }));
  assert.throws(() => probe(({ raw }) => { raw.canonicalAttributionChanged = true; }));
});
