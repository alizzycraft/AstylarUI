import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('authenticated retained computed paint projection omits image and compositing properties without losing raw declarations', async () => {
  const reportBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const collector = 'tests/material-parity/input-tree-evidence.mjs';
  assert.equal(hash(readFileSync(collector)), '06197edaf92b2296e3e0564771f307a1036ce7bc5eb13d8e242a5c420e7a7e3b');
  assert.equal(report.captureProvenance.harnessFiles.find(row => row.file === collector).sha256, hash(readFileSync(collector)));
  const original = gunzipSync(Buffer.from(readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').replace(/\s/g, ''), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const ast = ts.createSourceFile('original.mjs', original.toString(), 99, true);
  const declarations = ast.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]);
  const owner = declarations.filter(node => node.name.getText(ast) === 'materialStyleInputProperties');
  assert.equal(owner.length, 1);
  const array = owner[0].initializer.arguments[0];
  assert.ok(ts.isArrayLiteralExpression(array));
  const styleProperties = array.elements.map(node => { assert.ok(ts.isStringLiteral(node)); return node.text; });
  const missing = ['backgroundImage', 'filter', 'mixBlendMode', 'isolation'];
  assert.ok(missing.every(property => !styleProperties.includes(property)));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    try {
      await page.setContent('<app-reference><main class="frame"><p id="target" style="background-image:none;filter:none;mix-blend-mode:normal;isolation:auto">Above</p></main></app-reference>');
      const before = await page.evaluate(captureBrowserInputTree, { styleProperties });
      const actualBefore = await page.locator('#target').evaluate((element, fields) => Object.fromEntries(fields.map(field => [field, getComputedStyle(element)[field]])), missing);
      await page.locator('#target').evaluate(element => {
        element.style.backgroundImage = 'linear-gradient(rgb(255, 0, 0), rgb(0, 0, 255))';
        element.style.filter = 'blur(2px)'; element.style.mixBlendMode = 'multiply'; element.style.isolation = 'isolate';
      });
      const after = await page.evaluate(captureBrowserInputTree, { styleProperties });
      const actualAfter = await page.locator('#target').evaluate((element, fields) => Object.fromEntries(fields.map(field => [field, getComputedStyle(element)[field]])), missing);
      assert.deepEqual(before.errors, []); assert.deepEqual(after.errors, []);
      const first = before.nodes.find(node => node.attributes.id === 'target');
      const second = after.nodes.find(node => node.attributes.id === 'target');
      assert.deepEqual(before.styles[first.style], after.styles[second.style]);
      for (const property of missing) {
        assert.notEqual(actualBefore[property], actualAfter[property]);
        assert.equal(Object.hasOwn(before.styles[first.style], property), false);
        assert.equal(Object.hasOwn(after.styles[second.style], property), false);
      }
      assert.notDeepEqual(first.inline, second.inline, 'Raw declarations remain available;do not claim entire trees are indistinguishable');
      console.log(JSON.stringify({ browser: browser.version(), omittedComputedFields: missing,
        before: actualBefore, after: actualAfter,
        boundary: 'Exact retained collector/runner projection diagnostic only. Raw declarations preserve differences;not proof actual Material owners use these values,an observed renderer defect,or complete paint/case acceptance.' }));
    } finally { await page.close(); }
  } finally { await browser.close(); }
});
