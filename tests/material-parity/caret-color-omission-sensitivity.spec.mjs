import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { buildMaterialInputAudit } from './input-equivalence-audit.mjs';

const digest = value => createHash('sha256').update(value).digest('hex');
const input = (id, caretColor, color, explicit = true) => ({
  id, reference: { caretColor, color }, astylar: color === undefined ? {} : { color },
  astylarNormalResolvedStyle: color === undefined ? {} : { color },
  astylarInteractionResolvedStyle: color === undefined ? {} : { color }, astylarResolvedStyleEvidenceVersion: 2,
  referenceAuthored: explicit ? [{ selector: '#' + id, active: true,
    declarations: { 'caret-color': { value: 'auto', important: false } } }] : [], astylarAuthored: [],
});
const rawReport = styleInputs => ({ schemaVersion: 1, mode: 'report-only', generatedAt: '2026-09-14T00:00:00.000Z',
  browser: { name: 'diagnostic' }, summary: { meetsAcceptance: false }, interactionSummary: { meetsAcceptance: false },
  results: [{ family: 'core', profile: 'light', viewport: { id: 'desktop' }, styleInputs }], interactions: [],
});

test('caret-color omission remains recorded and unresolved without request and ancestry proof', () => {
  const raw = rawReport([input('explicit-auto', 'rgb(0, 0, 255)', '#0000ff'),
    input('unproven-omission', 'rgb(0, 0, 255)', '#0000ff', false),
    input('different-text-color', 'rgb(255, 0, 0)', '#0000ff')]);
  const before = JSON.stringify(raw), audit = buildMaterialInputAudit(raw);
  for (const i of raw.results[0].styleInputs) {
    const d = audit.discrepancies.find(d => d.element === i.id && d.property === 'caretColor');
    assert.ok(d, `Retain the caret observation for ${i.id}; text color is not inherited-caret evidence`);
    assert.equal(d.astylar, undefined);
    assert.equal(d.attribution, 'unresolved');
    assert.notEqual(d.classification, 'equivalent-representation', 'The fallback classifier must not repeat the unsafe assumption');
  }
  assert.equal(audit.summary.inputEquivalent, false);
  assert.equal(JSON.stringify(raw), before);
});

for (const deviceScaleFactor of [1, 2]) test(`explicit auto caret differs from inherited omission with equal text colors at DPR ${deviceScaleFactor}`, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
    await page.setContent('<style>#parent,input{color:rgb(0,0,255)}#explicit{caret-color:auto}</style><main id=parent><input id=explicit><input id=omitted></main>');
    const result = await page.evaluate(() => {
      const parent = document.getElementById('parent');
      const read = () => Object.fromEntries(['explicit', 'omitted'].map(id => {
        const s = getComputedStyle(document.getElementById(id)); return [id, { color: s.color, caretColor: s.caretColor }];
      }));
      const initial = read(); parent.style.caretColor = 'rgb(255,0,0)'; const inherited = read();
      parent.style.removeProperty('caret-color'); return { initial, inherited, restored: read() };
    });
    assert.deepEqual(result.initial.explicit, result.initial.omitted);
    assert.equal(result.inherited.explicit.color, result.inherited.omitted.color);
    assert.equal(result.inherited.explicit.caretColor, 'rgb(0, 0, 255)');
    assert.equal(result.inherited.omitted.caretColor, 'rgb(255, 0, 0)');
    assert.deepEqual(result.restored, result.initial);
    t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor,
      scope: 'Browser computed-style sensitivity only, not candidate computed values or visible caret rendering', result }));
  } finally { await browser.close(); }
});

test('caret-color exposure index preserves every formerly suppressed raw element and case', () => {
  const index = JSON.parse(readFileSync('docs/material-caret-color-omission-audit.json')).evidence;
  const bytes = readFileSync(index.capture.file); assert.equal(digest(bytes), index.capture.sha256);
  const raw = JSON.parse(bytes), entries = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  assert.equal(entries.length, index.caseCount);
  // Historical exposure pairs are retained as evidence, not used as a new equivalence rule.
  const key = (caret, color) => JSON.stringify([caret, color ?? '<omitted>']);
  const recordedPairs = new Set(index.pairProbes.map(p => key(p.reference, p.candidateColor)));
  const formerlySuppressed = new Set(index.pairProbes.filter(p => p.suppressed).map(p => key(p.reference, p.candidateColor)));
  const actualPairs = new Set(), groups = new Map();
  for (const e of entries) for (const i of e.styleInputs ?? []) {
    if (i.reference?.caretColor === undefined || i.astylar?.caretColor !== undefined) continue;
    const pair = key(i.reference.caretColor, i.astylar?.color); actualPairs.add(pair);
    if (!formerlySuppressed.has(pair)) continue;
    const id = e.family + '/' + i.id;
    if (!groups.has(id)) groups.set(id, { family: e.family, element: i.id, cases: [],
      referenceDirectRequests: 0, candidateDirectRequests: 0, valuePairs: new Set() });
    const g = groups.get(id); g.cases.push(e.kind + ':' + e.family + '@' + e.profile + '/' + e.viewport.id + (e.state ? '/' + e.state : ''));
    g.valuePairs.add(JSON.stringify([i.reference.caretColor, i.astylar.color]));
    const requests = rules => (rules ?? []).some(r => Object.keys(r.declarations ?? {}).some(k => ['caretcolor', 'all'].includes(k.replaceAll('-', '').toLowerCase())));
    if (requests(i.referenceAuthored)) g.referenceDirectRequests++;
    if (requests(i.astylarAuthored)) g.candidateDirectRequests++;
  }
  assert.deepEqual([...actualPairs].sort(), [...recordedPairs].sort());
  assert.equal(formerlySuppressed.size, 10);
  const actual = [...groups.values()].sort((a, b) => (a.family + '/' + a.element).localeCompare(b.family + '/' + b.element)).map(g => {
    assert.equal(new Set(g.cases).size, g.cases.length);
    return { family: g.family, element: g.element, occurrences: g.cases.length,
      referenceDirectRequests: g.referenceDirectRequests, candidateDirectRequests: g.candidateDirectRequests,
      completeCaseListSha256: digest(JSON.stringify(g.cases.sort())), valuePairs: [...g.valuePairs].sort().map(JSON.parse) };
  });
  assert.deepEqual(actual, index.exposure.groups);
  assert.equal(actual.length, 25); assert.equal(actual.reduce((n, g) => n + g.occurrences, 0), 1371);
  const audit = buildMaterialInputAudit(rawReport(index.pairProbes.filter(p => p.suppressed).map(p => input(p.id, p.reference, p.candidateColor))));
  for (const p of index.pairProbes.filter(p => p.suppressed)) {
    const d = audit.discrepancies.find(d => d.element === p.id && d.property === 'caretColor');
    assert.ok(d, p.id); assert.equal(d.attribution, 'unresolved'); assert.equal(d.astylar, undefined);
  }
});
