import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import JSONParser from 'jsonparse';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { collectNonGridTemplateInputs, nonGridTemplateAttribution } from './grid-template-input-evidence.mjs';
import { classifyOwnerGridInitialInput, ownerGridInitialAttribution } from './owner-grid-initial-classification.mjs';
import { validateOwnerGridInitialClassifications as validate } from './owner-grid-initial-coverage.mjs';

const survey = JSON.parse(readFileSync('docs/material-owner-grid-initial-survey.json'));
const raw = (() => {
  const bytes = readFileSync(survey.capture.file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), survey.capture.sha256);
  return JSON.parse(bytes);
})();
const cases = new Map(), entries = [];
for (const [kind, rows] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of rows) {
  entries.push({ ...e, kind });
  cases.set(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e);
}
const nonGrid = (() => {
  const inventory = collectFullTreeInventory(entries);
  assert.deepEqual(inventory.errors, []);
  return collectNonGridTemplateInputs(inventory);
})();
const evidence = { schemaVersion: 1, binding: { status: 'bound', ...survey.capture },
  captures: survey.captures, observations: survey.evidence, groups: survey.groups };

// Reuse the committed preceding rows as precedence evidence, not rows fabricated
// by this validator. Stream only discrepancies; the complete report is >1 GiB.
const parser = new JSONParser();
let previous, done = false;
parser.onValue = function(value) {
  if (this.stack.length === 1) {
    if (this.key === 'discrepancies') { previous = value; done = true; }
    delete this.value[this.key];
  } else if (this.value && this.stack[1]?.key !== 'discrepancies') delete this.value[this.key];
};
for await (const chunk of createReadStream('docs/material-input-equivalence-audit.json.gz').pipe(createGunzip())) {
  parser.write(chunk); if (done) break;
}
assert.ok(previous);
const earlierRows = previous.filter(row => row.attribution === nonGridTemplateAttribution);
previous = undefined;
const covered = new Set(earlierRows.flatMap(row => row.reviewedCases.map(key => JSON.stringify([key, row.element, row.property]))));
const additional = new Map();
for (const o of survey.evidence) {
  if (covered.has(JSON.stringify([o.case, o.proof.element, o.proof.property]))) continue;
  const input = cases.get(o.case).styleInputs.find(i => i.id === o.proof.element);
  const c = classifyOwnerGridInitialInput(input, o.proof.property, input.reference[o.proof.property], input.astylar[o.proof.property], o);
  if (!c) continue;
  const key = JSON.stringify([o.family, input.id, o.proof.property]);
  if (!additional.has(key)) additional.set(key, { family: o.family, element: input.id,
    property: o.proof.property, reference: 'none', astylar: undefined,
    classification: c.classification, attribution: c.attribution, recommendedOwner: c.owner,
    justification: c.justification, reviewEvidence: c.reviewEvidence,
    reviewedCases: [], occurrences: 0, cases: [], states: [] });
  const row = additional.get(key);
  row.reviewedCases.push(o.case); row.occurrences++;
  if (row.cases.length < 12) row.cases.push(o.case);
  if (!row.states.includes(o.state)) row.states.push(o.state);
}
const rows = [...earlierRows, ...additional.values()].sort((a, b) => a.family.localeCompare(b.family) ||
  a.element.localeCompare(b.element) || a.property.localeCompare(b.property));

test('grid coverage replays every scalar and preserves all 74 earlier non-grid groups', () => {
  assert.equal(evidence.observations.length, 13824);
  assert.equal(earlierRows.length, 74);
  assert.equal(earlierRows.reduce((n, row) => n + row.occurrences, 0), 4742);
  assert.equal(additional.size, 100);
  assert.equal([...additional.values()].reduce((n, row) => n + row.occurrences, 0), 6226);
  assert.equal(rows.length, 174);
  assert.deepEqual(validate(evidence, rows, nonGrid), []);
  assert.deepEqual(validate(JSON.parse(JSON.stringify(evidence)), JSON.parse(JSON.stringify(rows)), nonGrid), []);
});

test('grid coverage rejects lost rows, precedence substitutions, changed cases and inflated claims', () => {
  for (const mutate of [
    r => { r.splice(r.findIndex(row => row.attribution === ownerGridInitialAttribution), 1); },
    r => { r.splice(r.findIndex(row => row.attribution === nonGridTemplateAttribution), 1); },
    r => { r.push(structuredClone(r[0])); },
    r => { r.find(row => row.attribution === ownerGridInitialAttribution).attribution = 'unresolved'; },
    r => { r.find(row => row.attribution === nonGridTemplateAttribution).attribution = ownerGridInitialAttribution; },
    r => { r[0].reviewedCases.pop(); },
    r => { r[0].occurrences--; },
    r => { r[0].astylar = 'none'; },
    r => { r.find(row => row.attribution === ownerGridInitialAttribution).reviewEvidence.gridLayoutEquivalent = true; },
    r => { r.find(row => row.attribution === ownerGridInitialAttribution).reviewEvidence.wholeElementInputEquivalent = true; },
  ]) {
    const changed = structuredClone(rows); mutate(changed);
    const errors = validate(evidence, changed, nonGrid);
    assert.ok(errors.length); assert.ok(errors.every(error => error.length < 400));
  }
});

test('grid scalar replay preserves negative observations and exact original provenance', () => {
  for (const mutate of [
    e => { e.binding.sha256 = '0'.repeat(64); },
    e => { e.binding.file = 'package.json'; },
    e => { e.observations.splice(e.observations.findIndex(o => o.proof.issues.length), 1); },
    e => { e.observations[0].state = 'invented-state'; },
    e => { e.observations[0].inputSha256 = '0'.repeat(64); },
    e => { e.observations.reverse(); },
  ]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validate(changed, rows, nonGrid).length);
  }
  assert.ok(validate(evidence, rows, [...nonGrid, nonGrid[0]]).length);
  assert.ok(validate(evidence, rows, []).length, 'missing earlier proofs cannot silently reclassify their rows');
});
