import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { buildMaterialInputAudit } from './input-equivalence-audit.mjs';

const probes = [
  ['fontStyle', 'normal', 'italic'], ['letterSpacing', '0px', '2px'], ['wordSpacing', '0px', '4px'],
  ['textTransform', 'none', 'uppercase'], ['whiteSpace', 'normal', 'pre'], ['overflowWrap', 'normal', 'anywhere'],
  ['wordBreak', 'normal', 'break-all'], ['pointerEvents', 'auto', 'none'], ['visibility', 'visible', 'hidden'],
];
const digest = value => createHash('sha256').update(value).digest('hex');
const input = (property, value, explicit = true, candidate) => ({
  id: property + (explicit ? '-explicit' : '-unproven'), reference: { [property]: value },
  astylar: candidate === undefined ? {} : { [property]: candidate },
  astylarNormalResolvedStyle: candidate === undefined ? {} : { [property]: candidate },
  astylarInteractionResolvedStyle: candidate === undefined ? {} : { [property]: candidate },
  astylarResolvedStyleEvidenceVersion: 2,
  referenceAuthored: explicit ? [{ selector: '#' + property + '-explicit', active: true, declarations: {
    [property.replace(/[A-Z]/g, c => '-' + c.toLowerCase())]: { value, important: false },
  } }] : [], astylarAuthored: [],
});
const rawReport = styleInputs => ({ schemaVersion: 1, mode: 'report-only', generatedAt: '2026-09-15T00:00:00.000Z',
  browser: { name: 'diagnostic' }, summary: { meetsAcceptance: false }, interactionSummary: { meetsAcceptance: false },
  results: [{ family: 'core', profile: 'light', viewport: { id: 'desktop' }, styleInputs }], interactions: [],
});

test('inherited defaults cannot establish equivalent omission without authored and ancestry evidence', () => {
  const raw = rawReport(probes.flatMap(([property, value]) => [input(property, value), input(property, value, false)]));
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  for (const i of raw.results[0].styleInputs) {
    const property = Object.keys(i.reference)[0], d = audit.discrepancies.find(d => d.element === i.id && d.property === property);
    assert.ok(d, i.id); assert.equal(d.astylar, undefined);
    assert.notEqual(d.classification, 'equivalent-representation', i.id + ' is not a verified inherited value');
    assert.equal(d.attribution, 'unresolved');
  }
  assert.equal(audit.summary.inputEquivalent, false); assert.equal(JSON.stringify(raw), before);
});

test('explicit inherited values and the explicit normal-zero tracking alias remain comparable', () => {
  const raw = rawReport(probes.map(([property, value]) => input(property, value, true, value)));
  assert.deepEqual(buildMaterialInputAudit(raw).discrepancies, []);
  const aliases = rawReport([input('letterSpacing', 'normal', true, '0px')]);
  const before = JSON.stringify(aliases);
  assert.deepEqual(buildMaterialInputAudit(aliases).discrepancies, []);
  assert.equal(JSON.stringify(aliases), before, 'Do not rewrite raw normal/zero declarations');
});

for (const deviceScaleFactor of [1, 2]) test(`nine inherited defaults diverge from omissions after ancestor changes at DPR ${deviceScaleFactor}`, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
    const observations = await page.evaluate(probes => probes.map(([property, initial, changed]) => {
      const parent = document.createElement('div'), explicit = document.createElement('div'), omitted = document.createElement('div');
      explicit.textContent = omitted.textContent = 'same text'; explicit.style[property] = initial;
      parent.append(explicit, omitted); document.body.append(parent);
      const read = () => ({ explicit: getComputedStyle(explicit)[property], omitted: getComputedStyle(omitted)[property] });
      const before = read(); parent.style[property] = changed; const inherited = read();
      parent.style[property] = ''; const restored = read(); parent.remove();
      return { property, explicitRequest: initial, ancestorChange: changed, before, inherited, restored };
    }), probes);
    const record = JSON.parse(readFileSync('docs/material-inherited-default-assumption-audit.json'));
    assert.deepEqual(observations, record.evidence.runs.find(r => r.deviceScaleFactor === deviceScaleFactor).observations);
    for (const o of observations) {
      assert.notEqual(o.inherited.explicit, o.inherited.omitted, o.property); assert.deepEqual(o.restored, o.before);
      const normalize = v => ['normal', '0px', '0'].includes(v) ? '0' : v;
      if (['letterSpacing', 'wordSpacing'].includes(o.property)) assert.equal(normalize(o.before.explicit), normalize(o.before.omitted));
      else assert.equal(o.before.explicit, o.before.omitted);
    }
    t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor,
      scope: 'Browser computed-style sensitivity only; not candidate computed values, layout, hit testing or raster', observations }));
  } finally { await browser.close(); }
});

test('inherited-default population preserves every raw value pair and complete per-property case set', () => {
  const record = JSON.parse(readFileSync('docs/material-inherited-default-assumption-audit.json')), index = record.population.data;
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(digest(bytes), index.captureSha256);
  const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  assert.equal(entries.length, index.caseCount);
  const properties = probes.map(([p]) => p), pairKey = (p, v) => JSON.stringify([p, v]);
  const historicalPairs = new Map(index.pairProbes.map(p => [pairKey(p.property, p.reference), p.eligible]));
  const actualPairs = new Set(), coverage = Object.fromEntries(properties.map(p => [p,
    { observedReference: 0, candidateOmitted: 0, policyEligible: 0, elements: new Set(), cases: new Set() }]));
  for (const e of entries) for (const i of e.styleInputs ?? []) for (const p of properties) {
    if (i.reference?.[p] === undefined) continue;
    const c = coverage[p]; c.observedReference++;
    if (i.astylar?.[p] !== undefined) continue;
    c.candidateOmitted++; const key = pairKey(p, i.reference[p]); actualPairs.add(key);
    assert.ok(historicalPairs.has(key), 'Unreviewed raw value ' + key);
    if (!historicalPairs.get(key)) continue;
    c.policyEligible++; c.elements.add(e.family + '/' + i.id);
    c.cases.add(e.kind + ':' + e.family + '@' + e.profile + '/' + e.viewport.id + (e.state ? '/' + e.state : ''));
  }
  assert.deepEqual([...actualPairs].sort(), [...historicalPairs.keys()].sort());
  const actual = properties.map(property => {
    const c = coverage[property]; return { property, observedReference: c.observedReference, candidateOmitted: c.candidateOmitted,
      policyEligible: c.policyEligible, uniqueElements: c.elements.size, uniqueCases: c.cases.size,
      completeSortedCaseListSha256: digest(JSON.stringify([...c.cases].sort())), elements: [...c.elements].sort() };
  });
  assert.deepEqual(actual, index.properties);
  assert.equal(actual.reduce((n, p) => n + p.policyEligible, 0), 58835);
  // Historical eligibility identifies the exposure population; it must not remain an equivalence rule.
  const audit = buildMaterialInputAudit(rawReport(index.pairProbes.filter(p => p.eligible).map(p => input(p.property, p.reference))));
  for (const p of index.pairProbes.filter(p => p.eligible)) {
    const d = audit.discrepancies.find(d => d.element === p.property + '-explicit' && d.property === p.property);
    assert.ok(d); assert.equal(d.attribution, 'unresolved'); assert.notEqual(d.classification, 'equivalent-representation');
  }
});
