import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const hash = value => createHash('sha256').update(value).digest('hex');
const logs = ['artifacts/material-parity/sort-focus-border-1592ce3.log', 'artifacts/material-parity/sort-focus-border-1592ce3-repeat.log'];

export function readSortBorderLog(text) {
  assert.match(text, /TOTAL: 2 FAILED, 0 SUCCESS/);
  const failures = text.split(/\r?\n/).filter(line => line.includes(': Expected ')).map(line => line.trim()).sort();
  assert.deepEqual(failures, [120, 240].flatMap(width => [
    `${width}/border/host/height: Expected 1 to be less than 0.5.`,
    `${width}/border/focus-owner/height: Expected 1 to be less than 0.5.`,
    `${width}/border/content/y: Expected 0.5 to be less than 0.5.`,
    `${width}/border/following/y: Expected 1 to be less than 0.5.`,
  ]).sort(), 'unexpected or missing assertion failures');
  const raw = text.split(/\r?\n/).filter(line => line.includes('MATERIAL_SORT_FOCUS_BORDER_AUDIT'))
    .map(line => JSON.parse(line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1)));
  assert.equal(raw.length, 12, 'six observations, each duplicated by Karma reporters');
  const unique = new Map();
  for (const observation of raw) {
    const key = `${observation.width}/${observation.step}`;
    if (unique.has(key)) assert.deepEqual(observation, unique.get(key), 'contradictory duplicate');
    else unique.set(key, observation);
  }
  assert.equal(unique.size, 6);
  const result = [];
  for (const width of [120, 240]) for (const step of ['initial', 'border', 'restored']) {
    const item = unique.get(`${width}/${step}`); assert.ok(item);
    const border = step === 'border' ? 1 : 0; assert.equal(item.border, border);
    assert.deepEqual(item.viewport, [400, 200]); assert.equal(item.dpr, 1);
    assert.match(item.browser, /HeadlessChrome\/152\./);
    const rule = item.site.styles.find(s => s.selector === '#focus-owner');
    assert.equal(rule.borderWidth, `0 0 ${border}px 0`);
    assert.equal(rule.position, 'relative'); assert.equal(rule.display, 'flex');
    assert.equal(rule.height, undefined); assert.equal(rule.top, undefined);
    const resolved = item.styles.elements.find(element => element.id === 'focus-owner');
    for (const stage of ['normal', 'effective']) {
      assert.equal(resolved[stage].borderWidth, rule.borderWidth);
      assert.equal(resolved[stage].borderStyle, 'solid');
      assert.equal(resolved[stage].height, undefined);
      assert.equal(resolved[stage].boxSizing, 'content-box');
    }
    const css = item.site.styles.map(({ selector, ...values }) => `${selector}{${Object.entries(values)
      .map(([key, value]) => `${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}:${value}`).join(';')}}`).join('\n');
    assert.equal(item.css, css, 'paired rules differ');
    const expected = [
      ['host', 0, 0, width, 27 + border, 0, 27],
      ['focus-owner', 0, 0, width, 19 + border, 0, 19],
      ['content', 0, 0, 64, 19, border ? -.5 : 0, 19],
      ['following', 0, 19 + border, width, 8, 19, 8],
    ];
    assert.equal(item.measurements.length, 4);
    for (const [i, [id, x, y, w, h, actualY, actualH]] of expected.entries()) {
      assert.deepEqual(item.measurements[i], { id, reference: { x, y, width: w, height: h },
        actual: { x, y: actualY, width: w, height: actualH } });
    }
    result.push(item);
  }
  return result;
}

export function collectSortBorderAudit() {
  const runs = logs.map(file => { const bytes = readFileSync(file); return { file, sha256: hash(bytes), observations: readSortBorderLog(bytes.toString()) }; });
  assert.deepEqual(runs[0].observations, runs[1].observations, 'repeat differs');
  const source = 'examples/material-showcase/src/app/sort-focus-border-input-audit.spec.ts';
  return { schemaVersion: 1, source: { file: source, sha256: hash(readFileSync(source)) }, runs,
    classification: 'Confirmed equal-input public reduction failure: bottom border omitted from automatic flex flow sizing.',
    limits: 'Geometry and update reduction only. Does not prove border raster, text, actual focus gestures, exact internal causal path, or historical intent.',
    rendererFixed: false, canonicalAttributionChanged: false, repeatIdentical: true };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = collectSortBorderAudit();
  writeFileSync('docs/material-sort-focus-border-public-proof.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ runs: report.runs.length, observationsPerRun: report.runs[0].observations.length, repeatIdentical: true }));
}
