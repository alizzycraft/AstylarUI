import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { visibilityCases, visibilityInput } from '../../examples/material-showcase/audit/visibility-input.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('public visibility capture preserves equal inputs, controls, diagnosed unsupported behavior and raw failures', () => {
  const receipt = JSON.parse(readFileSync('docs/material-public-visibility-audit.json'));
  const bytes = readFileSync(receipt.report), report = JSON.parse(bytes), directory = path.dirname(receipt.report);
  assert.equal(hash(bytes), receipt.reportSha256);
  assert.equal(hash(readFileSync(path.join(directory, 'provenance.json'))), receipt.provenanceSha256);
  assert.deepEqual(report.runtimeErrors, []);
  assert.deepEqual(report.results.map(e => `${e.name}/${e.dpr}`), [1, 2].flatMap(d => visibilityCases.map(n => `${n}/${d}`)));
  const blue = [0, 0, 255, 255], red = [255, 0, 0, 255], green = [0, 255, 0, 255], white = [255, 255, 255, 255];
  const expected = {
    omitted: [[blue, red, green], ['child', 'parent', 'after']],
    visible: [[blue, red, green], ['child', 'parent', 'after']],
    hidden: [[red, red, green], ['parent', 'parent', 'after']],
    'parent-hidden': [[white, white, green], ['audit-stage', 'audit-stage', 'after']],
    'child-visible': [[blue, white, green], ['child', 'audit-stage', 'after']],
    'display-none': [[green, white, white], ['after', 'audit-stage', 'audit-stage']],
  };
  for (const e of report.results) {
    assert.deepEqual(e.reference.colors, expected[e.name][0]);
    assert.deepEqual(e.reference.samples.map(s => s.hit), expected[e.name][1]);
    assert.deepEqual(e.astylar.colors, e.name === 'display-none'
      ? [green, [204, 25, 25, 255], [204, 25, 25, 255]] : [blue, red, green]);
    assert.deepEqual(e.astylar.samples.map(s => s.hit), e.name === 'display-none' ? ['after', undefined, undefined] : ['child', 'parent', 'after']);
    for (const side of ['reference', 'astylar']) {
      assert.equal(e[side].disposed, true);
      assert.equal(hash(readFileSync(path.join(directory, e[side].screenshot.file))), e[side].screenshot.sha256);
      assert.equal(e[side].samples.length, 3);
      for (const s of e[side].samples) assert.deepEqual(s.site, visibilityInput(e.name));
    }
    for (const s of e.astylar.samples) {
      assert.equal(s.diagnostics.messages.length, visibilityInput(e.name).styles.filter(v => 'visibility' in v).length);
      assert.ok(s.diagnostics.messages.every(m => m.code === 'unsupported-style-property' && m.property === 'visibility' && m.severity === 'warning'));
    }
  }
  assert.equal(report.differences.length, 20);
  assert.equal(report.differences.filter(d => d.kind === 'hover-target').length, receipt.visibilityHoverDifferences);
  assert.equal(report.differences.filter(d => d.kind === 'raster-sample' && d.name !== 'display-none').length, receipt.visibilityRasterDifferences);
  assert.equal(report.differences.filter(d => d.name === 'display-none').length, receipt.separateDisplayNoneBackgroundDifferences);
});
