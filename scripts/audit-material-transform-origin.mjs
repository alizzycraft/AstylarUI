import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';
import { buildMaterialInputAudit } from '../tests/material-parity/input-equivalence-audit.mjs';

// Audit sensitivity only: two browser-authored inputs expose the meaning of
// omission before testing the existing collector. This is not candidate-renderer
// parity, nor authority to relabel every captured computed-origin observation.
const sha = value => createHash('sha256').update(value).digest('hex');
const capturePath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const bytes = readFileSync(capturePath), captureSha256 = sha(bytes);
assert.equal(captureSha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), selected = [], signatures = new Set(), byFamily = {};
const inactive = value => value === undefined || ['none', 'matrix(1,0,0,1,0,0)'].includes(value.replace(/\s/g, ''));
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]])
  for (const entry of entries) for (const input of entry.styleInputs ?? []) {
    const r = input.reference ?? {}, a = input.astylar ?? {};
    if (r.transformOrigin === undefined || a.transformOrigin !== undefined || !inactive(r.transform) || !inactive(a.transform)) continue;
    const explicitOriginRules = (input.referenceAuthored ?? []).filter(rule =>
      Object.keys(rule.declarations ?? {}).some(key => key === 'transform-origin' || key === 'transformOrigin'));
    const item = { case: `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`,
      family: entry.family, element: input.id, referenceOrigin: r.transformOrigin,
      referenceTransform: r.transform ?? '<omitted>', candidateOrigin: '<omitted>', candidateTransform: a.transform ?? '<omitted>',
      explicitOriginRules };
    selected.push(item);
    signatures.add(JSON.stringify([item.family, item.element, item.referenceTransform, item.referenceOrigin]));
    byFamily[entry.family] = (byFamily[entry.family] ?? 0) + 1;
  }
assert.equal(selected.length, 6938);
assert.equal(selected.filter(row => row.explicitOriginRules.length).length, 0);

const browser = await chromium.launch({ channel: 'chrome', headless: true });
const runs = [], styleInputs = [];
try {
  for (const dpr of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: dpr });
    const trials = await page.evaluate(() => {
      document.body.style.margin = '0';
      const result = [];
      for (const initialTransform of ['none', 'matrix(1,0,0,1,0,0)'])
        for (const [mode, referenceOrigin, candidateOrigin] of [
          ['explicit-corner-versus-omitted', '0px 0px', ''],
          ['matching-corner', '0px 0px', '0px 0px'],
          ['initial-center-control', '50% 50%', ''],
        ]) {
          const make = origin => {
            const e = document.createElement('div');
            e.style.cssText = 'position:absolute;left:100px;top:100px;width:80px;height:40px;box-sizing:border-box;margin:0;padding:0;border:0';
            e.style.transformOrigin = origin; e.style.transform = initialTransform;
            document.body.append(e); return e;
          };
          const reference = make(referenceOrigin), candidate = make(candidateOrigin);
          const snapshot = e => {
            const rect = e.getBoundingClientRect(), computed = getComputedStyle(e);
            return { declaredOrigin: e.style.transformOrigin || '<omitted>', computedOrigin: computed.transformOrigin,
              computedTransform: computed.transform, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height } };
          };
          const states = [];
          for (const transform of [initialTransform, 'scale(2)', initialTransform]) {
            reference.style.transform = candidate.style.transform = transform;
            states.push({ transform, reference: snapshot(reference), candidate: snapshot(candidate) });
          }
          result.push({ mode, initialTransform, states }); reference.remove(); candidate.remove();
        }
      return result;
    });
    for (const [index, trial] of trials.entries()) {
      for (const [stateIndex, state] of trial.states.entries()) {
        const scaled = stateIndex === 1;
        const corner = trial.mode !== 'initial-center-control';
        const expected = { left: scaled && !corner ? 60 : 100, top: scaled && !corner ? 80 : 100,
          width: scaled ? 160 : 80, height: scaled ? 80 : 40 };
        assert.deepEqual(state.reference.rect, expected);
        const omitted = trial.mode !== 'matching-corner';
        assert.deepEqual(state.candidate.rect, { left: scaled && omitted ? 60 : 100, top: scaled && omitted ? 80 : 100,
          width: scaled ? 160 : 80, height: scaled ? 80 : 40 });
        assert.equal(state.reference.computedOrigin, corner ? '0px 0px' : '40px 20px');
        assert.equal(state.candidate.computedOrigin, omitted ? '40px 20px' : '0px 0px');
      }
      const initial = trial.states[0], id = `origin-${dpr}-${index}`;
      styleInputs.push({ id, reference: { transform: initial.reference.computedTransform, transformOrigin: initial.reference.computedOrigin },
        astylar: { transform: initial.candidate.computedTransform, ...(trial.mode === 'matching-corner' ? { transformOrigin: '0px 0px' } : {}) },
        referenceAuthored: [{ selector: '#' + id, active: true, declarations: {
          'transform-origin': { value: initial.reference.declaredOrigin, important: false } } }],
        astylarAuthored: trial.mode === 'matching-corner' ? [{ selector: '#' + id, declarations: { transformOrigin: '0px 0px' } }] : [] });
    }
    runs.push({ dpr, trials }); await page.close();
  }
  const inputs = { schemaVersion: 1, mode: 'report-only', results: [{ family: 'core', profile: 'light', viewport: { id: 'desktop' }, styleInputs }], interactions: [] };
  const untouched = JSON.stringify(inputs), audit = buildMaterialInputAudit(inputs);
  assert.equal(JSON.stringify(inputs), untouched);
  const sourceFiles = ['scripts/audit-material-transform-origin.mjs', 'tests/material-parity/input-equivalence-audit.mjs', 'tests/material-parity/input-equivalence-policy.mjs'];
  console.log(JSON.stringify({ schemaVersion: 1, browserVersion: browser.version(), capturePath, captureSha256,
    scope: 'Browser authored-request sensitivity plus collector behavior; not a candidate-renderer reproduction or attribution of all captured origin omissions',
    sourceFingerprints: sourceFiles.map(file => ({ file, sha256: sha(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })),
    exposure: { observations: selected.length, rawSignatures: signatures.size, withCapturedExplicitOrigin: 0,
      orderedSelectionSha256: sha(JSON.stringify(selected)), byFamily,
      limitation: 'Absence from captured scalar rule lists does not prove complete origin authoring, cascade/defaults, corresponding reference boxes or candidate computed values. Full original cases remain in the pinned raw report.' },
    runs, collector: audit.discrepancies.filter(d => d.property === 'transformOrigin').map(({ element, reference, astylar, classification, attribution, justification }) =>
      ({ element, reference, candidate: astylar ?? '<omitted>', classification, attribution: attribution ?? '<none>', justification })) }));
} finally { await browser.close(); }
