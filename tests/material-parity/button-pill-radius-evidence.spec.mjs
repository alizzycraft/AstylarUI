import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { inspectButtonPillRadius, selectedButtonInputs } from './button-pill-radius-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const durable = JSON.parse(readFileSync('docs/material-button-pill-radius-audit.json'));
const bytes = readFileSync(durable.capture.file); assert.equal(hash(bytes), durable.capture.sha256);
const original = JSON.parse(bytes);
const entries = [...original.results.map(e => ({ ...e, kind: 'static' })),
  ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };

test('shared button radius survey replays every original owner and retains unequal authored intent', () => {
  assert.equal(entries.length, 2311);
  assert.deepEqual([durable.cases, durable.owners, durable.families, durable.groups.length, durable.propertyOccurrences],
    [480, 600, 7, 108, 2400]);
  assert.equal(durable.classification, 'application-plugin-authoring-defect');
  for (const flag of ['canonicalAttributionChanged', 'authoredIntentEquivalent', 'originalRasterCauseProven',
    'candidateUsedPaintVerified', 'renderingEquivalent']) assert.equal(durable[flag], false);
  assert.deepEqual(durable.sourceFingerprints.map(s => s.file), [
    'scripts/audit-material-button-pill-radii.mjs', 'tests/material-parity/button-pill-radius-evidence.mjs',
    'tests/material-parity/button-pill-radius-evidence.spec.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs', 'examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/astylar.component.ts']);
  for (const s of durable.sourceFingerprints)
    assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const observations = [];
  for (const e of entries) {
    const inputs = selectedButtonInputs(e);
    // Inspect all candidate trees, including cases with no selected owners.
    const a = read(e.inputTrees.astylar), ids = a.nodes.filter(n => n.authored?.class?.split(/\s+/)
      .includes('material-button')).map(n => n.authored.id).sort();
    assert.deepEqual(inputs.map(i => i.id).sort(), ids);
    if (!inputs.length) continue;
    const r = read(e.inputTrees.reference);
    for (const input of inputs) observations.push({ case: keyOf(e), family: e.family, profile: e.profile,
      viewport: e.viewport, state: e.state ?? 'static', inputTrees: e.inputTrees,
      proof: inspectButtonPillRadius(e, input, r, a) });
  }
  assert.deepEqual(observations, durable.observations);
  const grouped = durable.groups.flatMap(g => g.cases.map(c => JSON.stringify([c, g.family, g.element, g.property, g.reference, g.candidate])));
  const replayed = observations.flatMap(o => o.proof.properties.map(p => JSON.stringify([o.case, o.family, o.proof.element,
    p.property, p.reference, p.candidate])));
  assert.deepEqual(grouped.sort(), replayed.sort());
  assert.equal(new Set(grouped).size, 2400);
});

test('button radius proof rejects changed owner, radius, shorthand, declarations and stage evidence', () => {
  const e = entries.find(e => e.family === 'button' && e.profile === 'light');
  const i = selectedButtonInputs(e)[0], r = read(e.inputTrees.reference), a = read(e.inputTrees.astylar);
  const mutations = [
    v => { v.i.id = 'foreign-owner'; },
    v => { v.r.nodes.push(structuredClone(v.r.nodes.find(n => n.attributes?.id === i.id))); },
    v => { v.i.reference.borderTopRightRadius = '20px'; },
    v => { v.i.reference.fontSize = '99px'; },
    v => { v.i.astylarInteractionResolvedStyle.borderRadius = '99px'; },
    v => { v.a.resolvedStyleSource = 'private-paint-guess'; },
    v => { v.a.rules.push({ selector: '#' + i.id, borderRadius: '9999px' }); },
    v => { v.a.nodes.find(n => n.authored?.id === i.id).authored.style = { borderRadius: '9999px' }; },
    v => { v.r.nodes.find(n => n.attributes?.id === i.id).inline = { 'border-radius': { value: '20px', important: false } }; },
    v => { v.r.rules.find(r => r.cssText?.includes('--mat-button-filled-container-shape')).cssText = ''; },
    v => { v.r.rules.find(r => r.cssText?.includes('--mat-button-filled-container-shape')).active = false; },
    v => { v.r.rules.find(r => r.cssText?.includes('--mat-button-filled-container-shape')).declarations.all = { value: 'initial', important: true }; },
    v => { v.e.profile = 'unreviewed'; },
  ];
  assert.ok(inspectButtonPillRadius(e, i, r, a));
  for (const [index, mutate] of mutations.entries()) {
    const value = structuredClone({ e, i, r, a }); mutate(value);
    assert.throws(() => inspectButtonPillRadius(value.e, value.i, value.r, value.a), undefined, `negative control ${index}`);
  }
});

for (const deviceScaleFactor of [1, 2]) test(`browser pill and finite radii coincide only under constrained dimensions, DPR ${deviceScaleFactor}`, async t => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 240, height: 150 }, deviceScaleFactor });
    await page.setContent('<style>body{margin:0;background:white}#shape{position:absolute;left:20px;top:20px;background:#6750a4}</style><div id="shape"></div>');
    const results = [];
    for (const [radius, originalHeight] of [[20, 40], [15, 24], [30, 28]]) {
      for (const [control, width, height, equal] of [['captured-height', 180, originalHeight, true],
        ['expanded-height', 180, 80, false], ['narrow-width', 20, 80, true]]) {
        const captures = [];
        for (const request of ['9999px', radius + 'px']) {
          const values = await page.evaluate(({ request, width, height }) => {
            const n = document.getElementById('shape');
            Object.assign(n.style, { width: width + 'px', height: height + 'px', borderRadius: request });
            const b = n.getBoundingClientRect();
            return { request, computed: getComputedStyle(n).borderTopLeftRadius,
              box: { x: b.x, y: b.y, width: b.width, height: b.height } };
          }, { request, width, height });
          captures.push({ ...values, sha256: hash(await page.screenshot({ clip: { x: 10, y: 10, width: 200, height: 100 } })) });
        }
        assert.deepEqual(captures[0].box, captures[1].box);
        assert.notEqual(captures[0].computed, captures[1].computed);
        assert.equal(captures[0].sha256 === captures[1].sha256, equal, JSON.stringify({ radius, control }));
        results.push({ radius, control, equal, captures });
      }
    }
    t.diagnostic(JSON.stringify({ browser: browser.version(), deviceScaleFactor, results,
      scope: 'isolated browser-only radius/shape calibration; not Astylar paint or original screenshot equivalence' }));
  } finally { await browser.close(); }
});
