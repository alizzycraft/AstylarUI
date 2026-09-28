import assert from 'node:assert/strict';
import test from 'node:test';
import Parser from 'jsonparse';
import { compareDisabledInkCanonical, fingerprintAuditValue } from '../../scripts/check-material-disabled-ink-canonical-conservation.mjs';

function sectionHashes(value, chunkSize = 7) {
  const parser = new Parser(), sections = new Map();
  parser.onValue = function(value) {
    fingerprintAuditValue(this, value, sections);
    if (this.stack.length) delete this.value[this.key];
  };
  const bytes = Buffer.from(JSON.stringify(value));
  for (let i = 0; i < bytes.length; i += chunkSize) parser.write(bytes.subarray(i, i + chunkSize));
  return Object.fromEntries([...sections].map(([key, digest]) => [key, digest.digest('hex')]));
}

test('section fingerprints retain values, paths, order and empty structure after pruning', () => {
  const base = { evidence: { nested: [1, 'é', null, {}, []], empty: '' }, untouched: { x: true } };
  const expected = sectionHashes(base);
  assert.deepEqual(sectionHashes(base, 1), expected);
  assert.deepEqual(sectionHashes(base, 65536), expected);
  const changes = [
    v => { v.evidence.nested[0] = '1'; },
    v => { v.evidence.nested.reverse(); },
    v => { v.evidence.nested[3] = []; },
    v => { v.evidence.nested.push({}); },
    v => { delete v.evidence.empty; },
    v => { v.evidence.other = v.evidence.nested; delete v.evidence.nested; },
    v => { v.evidence.nested[2] = false; },
  ];
  for (const change of changes) {
    const copy = structuredClone(base); change(copy);
    const result = sectionHashes(copy);
    assert.notEqual(result.evidence, expected.evidence);
    assert.equal(result.untouched, expected.untouched);
  }
  assert.notDeepEqual(sectionHashes({ a: {} }), sectionHashes({ a: [] }));
  assert.notDeepEqual(sectionHashes({ a: null }), sectionHashes({}));
});

function sample() {
  const expected = Array.from({ length: 60 }, (_, i) => ({ case: `case-${i}`,
    reference: 'rgba(28.999875,26.99991,31.99995,0.38)', candidate: 'rgba(164,160,167,1)' }));
  const previous = { rows: [{ property: 'color', reference: 'retained' }], control: {
    comparisons: [{ text: 'Disabled' }], gaps: [],
    differences: expected.map(row => ({ case: row.case, family: 'button', element: 'button-disabled',
      property: 'color', values: { reference: row.reference, painted: row.candidate },
      classification: 'parity-harness-defect', attribution: 'unresolved' })),
  } };
  const current = structuredClone(previous);
  for (const row of current.control.differences) Object.assign(row, {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-disabled-button-ink',
    reviewEvidence: { referenceComputed: row.values.reference, candidatePainted: row.values.painted },
  });
  return [previous, current, expected];
}

test('canonical ink comparison conserves all unrelated records and does not mutate either report', () => {
  const args = sample(), before = structuredClone(args);
  assert.equal(compareDisabledInkCanonical(...args).changedControlRecords, 60);
  assert.deepEqual(args, before);
});

test('canonical ink comparison rejects lost, extra, reordered or changed evidence', () => {
  const mutations = [
    ([,c]) => { c.rows[0].reference = 'changed'; },
    ([,c]) => { c.control.comparisons[0].text = 'changed'; },
    ([,c]) => { c.control.gaps.push({ reason: 'new' }); },
    ([,c]) => { c.control.differences.pop(); },
    ([,c]) => { c.control.differences.reverse(); },
    ([,c]) => { c.control.differences[0].values.reference = 'rounded'; },
    ([,c]) => { c.control.differences[0].reviewEvidence.candidatePainted = 'forged'; },
    ([,c]) => { c.control.differences[0].classification = 'equivalent'; },
    ([,c]) => { c.control.differences[0].family = 'dialog'; },
    ([,,e]) => { e[0] = e[1]; },
    ([p,c]) => { c.control.differences[0] = structuredClone(p.control.differences[0]); },
  ];
  for (const mutate of mutations) {
    const args = sample(); mutate(args); assert.throws(() => compareDisabledInkCanonical(...args));
  }
});
