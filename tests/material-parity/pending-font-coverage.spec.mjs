import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectPendingFontCoverage } from '../../scripts/audit-material-pending-font-coverage.mjs';
import { materialAuditHarnessPlan } from '../../scripts/run-material-audit-harness.mjs';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function fixture() {
  const kinds = ['container', 'leaf', 'authoring', 'ownership'];
  const rows = kinds.map(kind => ({ family: kind, element: kind, property: 'fontSize', reference: '16px',
    occurrences: 1, cases: ['case:' + kind], states: ['static'], attribution: 'unresolved', rawEvidence: { retained: true } }));
  const plans = Object.fromEntries(kinds.map((kind, i) => [kind, {
    canonicalRevision: '06e50dbcd3594c5987d63a4ec38e792b87b08dde', canonicalAttributionChanged: false,
    renderingEquivalent: false, canonicalRows: 4, baselineUnresolved: 4,
    [kind === 'leaf' || kind === 'ownership' ? 'proposed' : 'findings']: [{ ...rows[i],
      canonicalRowSha256: digest(rows[i]), observations: [{ case: rows[i].cases[0] }],
      proposedClassification: i < 2 ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
      proposedAttribution: 'reviewed-' + kind, renderingEquivalent: false, inputEquivalent: false }],
  }]));
  return { plans, rows };
}
const first = p => (p.proposed ?? p.findings)[0];

test('pending font coverage authenticates the full payload and all committed proposal sources', () => {
  const result = JSON.parse(execFileSync(process.execPath,
    ['--max-old-space-size=512', 'scripts/audit-material-pending-font-coverage.mjs', '--check'],
    { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.fontGroups, 98); assert.equal(result.fontObservations, 1831);
  assert.deepEqual(result.counts, { container: { groups: 63, observations: 1150 }, leaf: { groups: 15, observations: 152 },
    authoring: { groups: 8, observations: 128 }, ownership: { groups: 12, observations: 401 } });
  assert.equal(result.uncoveredFontGroups, 0); assert.equal(result.overlappingFontGroups, 0);
  assert.equal(result.canonicalAttributionChanged, false);
  assert.ok(materialAuditHarnessPlan(process.cwd()).files.includes('tests/material-parity/pending-font-coverage.spec.mjs'));
});

test('coverage describes proposals without promoting inputs rendering or underlying proof replay', () => {
  const { plans, rows } = fixture(), before = digest([plans, rows]);
  const result = inspectPendingFontCoverage(plans, rows);
  assert.equal(result.fontGroups, 4); assert.equal(result.fontObservations, 4);
  for (const flag of ['canonicalAttributionChanged', 'underlyingProofsReplayedByThisIndex', 'inputEquivalenceEstablished',
    'renderingEquivalent', 'completeAuditAccepted']) assert.equal(result[flag], false);
  assert.equal(digest([plans, rows]), before);
});

test('coverage refuses missing overlapping renamed or formerly resolved membership', () => {
  const changes = [
    (p) => { delete p.leaf; },
    p => { p.leaf.proposed = []; },
    p => { p.container.findings.push(structuredClone(first(p.leaf))); },
    p => { first(p.ownership).element = 'invented'; },
    (_p, r) => { r[0].attribution = 'previous-review'; },
    (_p, r) => { r[0].property = 'color'; },
    (_p, r) => { r.push(structuredClone(r[0])); },
  ];
  for (const mutate of changes) { const { plans, rows } = fixture(); mutate(plans, rows); assert.throws(() => inspectPendingFontCoverage(plans, rows)); }
});

test('coverage requires every complete row and exact member evidence not just matching counts', () => {
  const changes = [
    (p) => { first(p.container).canonicalRowSha256 = 'changed'; },
    (_p, r) => { r[0].rawEvidence.retained = false; },
    p => { first(p.leaf).occurrences = 2; },
    p => { first(p.leaf).cases = ['invented']; },
    p => { first(p.leaf).states = ['hover']; },
    p => { first(p.leaf).observations = []; },
    p => { p.leaf.canonicalRevision = 'changed'; },
    p => { p.leaf.canonicalRows--; },
    p => { p.leaf.baselineUnresolved--; },
  ];
  for (const mutate of changes) { const { plans, rows } = fixture(); mutate(plans, rows); assert.throws(() => inspectPendingFontCoverage(plans, rows)); }
});

test('coverage rejects stronger equivalence renderer and promotion claims', () => {
  for (const kind of ['container', 'leaf', 'authoring', 'ownership']) {
    for (const flag of ['renderingEquivalent', 'inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven', 'computedCandidateVerified']) {
      const { plans, rows } = fixture(); first(plans[kind])[flag] = true;
      assert.throws(() => inspectPendingFontCoverage(plans, rows));
    }
    const { plans, rows } = fixture(); first(plans[kind]).proposedClassification = 'confirmed-core-defect';
    assert.throws(() => inspectPendingFontCoverage(plans, rows));
  }
  for (const flag of ['canonicalAttributionChanged', 'renderingEquivalent']) {
    const { plans, rows } = fixture(); plans.container[flag] = true;
    assert.throws(() => inspectPendingFontCoverage(plans, rows));
  }
});
