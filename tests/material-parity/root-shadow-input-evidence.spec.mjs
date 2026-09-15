import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { inspectRootShadowInput, rootShadowReferenceComputed } from './root-shadow-input-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const durable = JSON.parse(readFileSync('docs/material-root-shadow-input-audit.json'));
const bytes = readFileSync(durable.capture.file); assert.equal(hash(bytes), durable.capture.sha256);
const original = JSON.parse(bytes);
const entries = [...original.results.map(e => ({ ...e, kind: 'static' })), ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('root shadow survey preserves all original cases owners styles and classification limits', () => {
  assert.equal(durable.cases, 2311); assert.equal(durable.families, 36);
  assert.equal(durable.classification, 'application-plugin-authoring-defect');
  for (const flag of ['canonicalAttributionChanged', 'inputEquivalent', 'originalRasterCauseProven', 'candidateUsedPaintVerified', 'renderingEquivalent'])
    assert.equal(durable[flag], false);
  assert.deepEqual(durable.groups.map(g => g.family), [...new Set(entries.map(e => e.family))].sort());
  assert.deepEqual(durable.sourceFingerprints.map(s => s.file), [
    'scripts/audit-material-root-shadows.mjs', 'tests/material-parity/root-shadow-input-evidence.mjs',
    'tests/material-parity/root-shadow-input-evidence.spec.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs', 'examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/astylar.component.ts']);
  assert.deepEqual(durable.observations.map(o => o.case), entries.map(key));
  assert.equal(new Set(durable.observations.map(o => o.case)).size, 2311);
  for (const s of durable.sourceFingerprints) assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i], o = durable.observations[i];
    assert.equal(o.family, e.family); assert.equal(o.profile, e.profile); assert.deepEqual(o.viewport, e.viewport);
    assert.equal(o.state, e.state ?? 'static'); assert.deepEqual(o.inputTrees, e.inputTrees);
    assert.deepEqual(inspectRootShadowInput(e, read(e.inputTrees.reference), read(e.inputTrees.astylar)), o.proof);
    assert.equal(o.proof.classification, 'application-plugin-authoring-defect');
    for (const flag of ['inputEquivalent', 'originalRasterCauseProven', 'candidateUsedPaintVerified', 'renderingEquivalent'])
      assert.equal(o.proof[flag], false);
  }
  for (const group of durable.groups) {
    assert.equal(group.property, 'boxShadow'); assert.equal(group.element, group.family + '-root');
    assert.deepEqual(group.cases, entries.filter(e => e.family === group.family).map(key));
  }
});

test('root shadow proof rejects altered scalars rules stages identities and competing requests', () => {
  const e = entries[0], r = read(e.inputTrees.reference), a = read(e.inputTrees.astylar);
  const id = e.family + '-root';
  const mutations = [
    v => { v.e.styleInputs.find(i => i.id === id).reference.boxShadow = 'none'; },
    v => { v.e.styleInputs.find(i => i.id === id).astylarNormalResolvedStyle.boxShadow = 'none'; },
    v => { v.r.nodes.push(structuredClone(v.r.nodes.find(n => n.attributes?.id === id))); },
    v => { v.a.nodes.find(n => n.authored?.id === id).authored.id = 'foreign'; },
    v => { v.a.resolvedStyleSource = 'invented'; },
    v => { v.a.nodes.find(n => n.authored?.id === id).authored.style = { boxShadow: 'none' }; },
    v => { v.r.nodes.find(n => n.attributes?.id === id).inline['box-shadow'] = { value: 'none', important: true }; },
    v => { v.r.rules.find(r => r.declarations?.['box-shadow']).active = false; },
    v => { v.a.rules.push({ selector: '#' + id, boxShadow: 'none' }); },
    v => { v.a.rules.find(r => r.selector === '#' + id)['box-shadow'] = 'none'; },
    v => { v.e.styleInputs.find(i => i.id === id).reference.fontSize = '999px'; },
  ];
  assert.ok(inspectRootShadowInput(e, r, a));
  for (const [i, mutate] of mutations.entries()) {
    const v = structuredClone({ e, r, a }); mutate(v);
    assert.throws(() => inspectRootShadowInput(v.e, v.r, v.a), undefined, `negative control ${i}`);
  }
});

for (const deviceScaleFactor of [1, 2]) test(`browser shadow serialization preserves alpha differences at DPR ${deviceScaleFactor}`, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
    const result = await page.evaluate(() => {
      const requests = ['0 2px 8px #0002', '0px 2px 8px 0px #00000022',
        'rgba(0,0,0,0.13333333333333333) 0 2px 8px', '0 2px 8px rgba(0,0,0,0.14)',
        'rgba(0,0,0,0.14) 0px 2px 8px 0px'];
      return requests.map(request => {
        const element = document.createElement('section');
        element.style.cssText = 'position:absolute;left:30px;top:30px;width:100px;height:50px';
        element.style.boxShadow = request; document.body.append(element);
        const b = element.getBoundingClientRect();
        return { request, declared: element.style.boxShadow, computed: getComputedStyle(element).boxShadow,
          box: { x: b.x, y: b.y, width: b.width, height: b.height } };
      });
    });
    for (const row of result) assert.deepEqual(row.box, result[0].box);
    for (const row of result.slice(0, 3)) assert.equal(row.computed, rootShadowReferenceComputed);
    assert.equal(result[3].computed, 'rgba(0, 0, 0, 0.14) 0px 2px 8px 0px');
    assert.equal(result[4].computed, result[3].computed);
    assert.notEqual(result[0].computed, result[3].computed);
    t.diagnostic(JSON.stringify({ browser: browser.version(), deviceScaleFactor, result,
      scope: 'browser request normalization and box geometry only; no candidate paint or shadow-raster equivalence' }));
  } finally { await browser.close(); }
});
