import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { buildMaterialInputAudit } from './input-equivalence-audit.mjs';

// Characterization of an audit blind spot, NOT an equivalence waiver. This
// intentionally records today's unsafe filter before a separately tested fix.
test('line-height normal omission is currently suppressed even with an explicit reference request', () => {
  const input = { id: 'diagnostic', reference: { lineHeight: 'normal', fontSize: '16px' }, astylar: { fontSize: '16px' },
    astylarNormalResolvedStyle: { fontSize: '16px' }, astylarInteractionResolvedStyle: { fontSize: '16px' },
    astylarResolvedStyleEvidenceVersion: 2,
    referenceAuthored: [{ selector: '#diagnostic', active: true, declarations: { 'line-height': { value: 'normal', important: false } } }],
    astylarAuthored: [] };
  const raw = { schemaVersion: 1, mode: 'report-only', generatedAt: '2026-09-14T00:00:00.000Z', browser: { name: 'diagnostic' },
    summary: { meetsAcceptance: false }, interactionSummary: { meetsAcceptance: false },
    results: [{ family: 'core', profile: 'light', viewport: { id: 'desktop' }, styleInputs: [input] }], interactions: [] };
  const before = JSON.stringify(raw), report = buildMaterialInputAudit(raw);
  assert.equal(report.discrepancies.some(d => d.element === 'diagnostic' && d.property === 'lineHeight'), false,
    'Known audit defect: equivalentValue drops this observation before authored-request/ancestry review');
  assert.equal(report.summary.inputEquivalent, false, 'This incomplete synthetic report is not acceptance evidence');
  assert.equal(JSON.stringify(raw), before);
});

for (const deviceScaleFactor of [1, 2]) {
  test(`line-height normal and omission diverge under inherited line height at DPR ${deviceScaleFactor}`, async t => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
      await page.setContent('<style>#parent{font:16px Arial,sans-serif;width:200px}#explicit{line-height:normal}</style><main id="parent"><div id="explicit">Text</div><div id="omitted">Text</div></main>');
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => {
        const parent = document.getElementById('parent');
        const read = () => Object.fromEntries(['explicit', 'omitted'].map(id => {
          const n = document.getElementById(id), s = getComputedStyle(n);
          return [id, { lineHeight: s.lineHeight, fontSize: s.fontSize, height: n.getBoundingClientRect().height }];
        }));
        const initial = read(); parent.style.lineHeight = '40px'; const changedAncestor = read();
        parent.style.removeProperty('line-height'); return { initial, changedAncestor, restored: read() };
      });
      assert.deepEqual(result.initial.explicit, result.initial.omitted);
      assert.equal(result.initial.explicit.lineHeight, 'normal');
      assert.equal(result.changedAncestor.explicit.lineHeight, 'normal');
      assert.equal(result.changedAncestor.omitted.lineHeight, '40px');
      assert.equal(result.changedAncestor.omitted.height, 40);
      assert.equal(result.changedAncestor.explicit.height, result.initial.explicit.height);
      assert.notEqual(result.changedAncestor.explicit.height, result.changedAncestor.omitted.height);
      assert.deepEqual(result.restored, result.initial);
      t.diagnostic(JSON.stringify({ browserVersion: browser.version(), deviceScaleFactor,
        scope: 'Browser reference sensitivity, not Astylar rendering. Demonstrates why the scalar filter needs request/ancestry evidence.', result }));
    } finally { await browser.close(); }
  });
}

test('line-height omission survey retains the full raw population affected by the unconditional predicate', t => {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), groups = new Map();
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) for (const i of e.styleInputs ?? []) {
    if (i.reference?.lineHeight !== 'normal' || i.astylar?.lineHeight !== undefined) continue;
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? `/${e.state}` : ''}`;
    const id = `${e.family}/${i.id}`;
    if (!groups.has(id)) groups.set(id, { family: e.family, element: i.id, cases: [], referenceDirectRequests: 0, candidateDirectRequests: 0 });
    const g = groups.get(id); g.cases.push(key);
    const requests = rules => rules?.some(r => Object.keys(r.declarations ?? {}).some(k => ['lineheight', 'font', 'all'].includes(k.replaceAll('-', '').toLowerCase()))) ?? false;
    if (requests(i.referenceAuthored)) g.referenceDirectRequests++;
    if (requests(i.astylarAuthored)) g.candidateDirectRequests++;
  }
  const population = [...groups.values()].sort((a, b) => `${a.family}/${a.element}`.localeCompare(`${b.family}/${b.element}`)).map(g => {
    assert.equal(new Set(g.cases).size, g.cases.length);
    return { family: g.family, element: g.element, occurrences: g.cases.length, referenceDirectRequests: g.referenceDirectRequests,
      candidateDirectRequests: g.candidateDirectRequests, completeCaseListSha256: createHash('sha256').update(JSON.stringify(g.cases.sort())).digest('hex') };
  });
  assert.ok(population.length > 0);
  t.diagnostic(JSON.stringify({ scope: 'Unconditional-filter exposure population, not confirmed authoring/core defects. Ancestors, controls and separate typography evidence still require review.',
    capture: { file, sha256 }, groups: population, occurrences: population.reduce((n, g) => n + g.occurrences, 0) }));
});
