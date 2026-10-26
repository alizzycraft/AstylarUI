import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';

const directory = 'artifacts/material-parity/public-absolute-margins-20261026';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportBytes = readFileSync(`${directory}/latest-report.json`);
assert.equal(hash(reportBytes), '6e4d7b7807c1671e7716a2da46d4a3e61c9f0dd3f6011ce3e5ecb1e8717350fa');
const report = JSON.parse(reportBytes);

function verifyObservations(value) {
  assert.equal(value.kind, 'public-absolute-margin-diagnostic');
  assert.deepEqual(value.errors, []);
  assert.equal(value.results.length, 8);
  const keys = new Set();
  for (const row of value.results) {
    const key = JSON.stringify([row.dpr, row.font, row.unit]);
    assert.ok(!keys.has(key)); keys.add(key);
    assert.ok([1, 2].includes(row.dpr) && [16, 24].includes(row.font));
    assert.ok(['em', 'px'].includes(row.unit));
    assert.equal(row.context, 'block');
    assert.deepEqual(row.reference.site, row.astylar.site);
    for (const side of ['reference', 'astylar']) {
      assert.equal(row[side].inputUnchanged, true);
      assert.deepEqual(row[side].errors, []);
      const child = row[side].site.styles[2];
      assert.equal(child.position, 'absolute');
      assert.equal(child.top, '0px'); assert.equal(child.left, '0px');
      assert.equal(child.margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);
      assert.equal(child.fontSize, `${row.font}px`);
    }
    assert.equal(row.reference.computed.marginTop, `${row.font}px`);
    assert.equal(row.astylar.declared.margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);
    const offset = side => row[side].bounds.child.top - row[side].bounds.parent.top;
    assert.ok(Math.abs(offset('reference') - row.font) < .01);
    assert.ok(Math.abs(offset('astylar')) < .01);
    assert.ok(Math.abs(offset('astylar') - offset('reference')) >= 16);
    for (const owner of ['parent', 'child']) for (const axis of ['left', 'width', 'height'])
      assert.ok(Math.abs(row.reference.bounds[owner][axis] - row.astylar.bounds[owner][axis]) < .5);
  }
  assert.equal(keys.size, 8);
}

test('absolute top margin evidence preserves failing pixel controls and equal em requests', () => {
  assert.equal(hash(readFileSync('scripts/audit-public-absolute-margins.mjs')), report.scriptSha256);
  assert.equal(hash(readFileSync(report.sourceRecipe.base.file)), report.sourceRecipe.base.sha256);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256, receipt.file);
  assert.equal(hash(readFileSync(`${directory}/audit.js`)), report.runtime.bundleSha256);
  for (const row of report.results) for (const side of ['reference', 'astylar']) {
    const receipt = row[side].screenshot;
    assert.equal(path.basename(receipt.file), receipt.file);
    assert.equal(hash(readFileSync(path.join(directory, receipt.file))), receipt.sha256);
    assert.ok(row[side].assets.some(asset => asset.sha256 === report.runtime.bundleSha256));
  }
  verifyObservations(report);
  const unequal = structuredClone(report); unequal.results[0].astylar.site.styles[2].margin = '0';
  assert.throws(() => verifyObservations(unequal));
  const shifted = structuredClone(report); shifted.results[0].astylar.bounds.child.top += 16;
  assert.throws(() => verifyObservations(shifted));
  const missing = structuredClone(report); missing.results.pop();
  assert.throws(() => verifyObservations(missing));
});

test('complete current absolute positioning and margin methods match captured installed owner', () => {
  const installed = report.inputs.filter(row => row.file.endsWith('/elements/element-dimension.service.js'));
  assert.equal(installed.length, 1);
  const captured = readFileSync(installed[0].file, 'utf8');
  assert.equal(hash(captured), installed[0].sha256);
  const current = ts.transpileModule(readFileSync('src/app/services/dom/elements/element-dimension.service.ts', 'utf8'),
    { compilerOptions: { target: 99, module: 99, experimentalDecorators: true } }).outputText;
  const method = (source, name) => {
    const tree = ts.createSourceFile('dimension.js', source, 99, true, ts.ScriptKind.JS);
    assert.equal(tree.parseDiagnostics.length, 0);
    const matches = [];
    const visit = node => {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) matches.push(node);
      ts.forEachChild(node, visit);
    };
    visit(tree); assert.equal(matches.length, 1);
    const tokens = [];
    const leaves = node => {
      const children = node.getChildren(tree);
      if (children.length) children.forEach(leaves);
      else if (node.getText(tree)) tokens.push(node.getText(tree));
    };
    leaves(matches[0]); return { tokens, source: matches[0].getText(tree) };
  };
  for (const name of ['calculateDimensions', 'parseMargin', 'parsePositionLength'])
    assert.deepEqual(method(current, name).tokens, method(captured, name).tokens, name);
  const dimensions = method(current, 'calculateDimensions').source;
  assert.match(dimensions, /const margin = this\.parseMargin\(style\)/);
  assert.match(dimensions, /top = verticalOriginInset \+ this\.parsePositionLength\(/);
  assert.match(dimensions, /return \{ width, height, left, top, padding: layoutInsets, margin \}/);
});
