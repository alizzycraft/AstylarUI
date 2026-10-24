import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('all retained Divider chains preserve variable background shorthand but no explicit filter or blend requests', () => {
  const file = 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'ed7ecfea82fef0406fc9e0430a2df16a7db4555d2fdd074568c96cb5f3b39868');
  const envelope = JSON.parse(bytes);
  assert.equal(hash(JSON.stringify(envelope.review)), envelope.sha256);
  const groups = envelope.review.groups.filter(group => group.family === 'divider');
  assert.equal(groups.length, 24);
  let pairs = 0, nativeOwners = 0, candidateOwners = 0, shorthandRules = 0, negativeControls = 0;
  const read = receipt => { const bytes = readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256); return JSON.parse(bytes); };
  const chain = (tree, start) => {
    assert.ok(start); const nodes = [], seen = new Set();
    for (let node = start; node; node = tree.nodes.find(row => row.key === node.parent)) {
      assert.ok(!seen.has(node.key)); seen.add(node.key); nodes.push(node);
      if (node.parent !== null && node.parent !== undefined) assert.ok(tree.nodes.some(row => row.key === node.parent));
    }
    return nodes;
  };
  const inspectDeclarations = declarations => {
    for (const field of ['filter', 'backdrop-filter', 'mix-blend-mode', 'isolation']) assert.equal(Object.hasOwn(declarations, field), false);
  };
  for (const group of groups) {
    const native = read(group.evidence.pairedTrees.reference), candidate = read(group.evidence.pairedTrees.astylar);
    assert.deepEqual(native.errors, []); assert.deepEqual(candidate.errors, []);
    for (const id of ['divider-above', 'divider-below']) {
      const nativeChain = chain(native, native.nodes.find(node => node.attributes?.id === id));
      const candidateChain = chain(candidate, candidate.nodes.find(node => node.authored?.id === id));
      assert.equal(nativeChain.length, 4); assert.equal(candidateChain.length, 5);
      nativeOwners += nativeChain.length; candidateOwners += candidateChain.length; pairs++;
      for (const node of nativeChain) {
        inspectDeclarations(node.inline);
        for (const index of node.rules) {
          const rule = native.rules[index]; assert.equal(rule.active, true);
          inspectDeclarations(rule.declarations);
          if (!rule.cssText.includes('background:')) continue;
          assert.match(rule.cssText, /background: (?:var\(--surface\)|color-mix\(in srgb, var\(--surface\) 94%, var\(--primary\)\));/);
          assert.equal(rule.declarations['background-image'].value, '');
          assert.equal(rule.declarations['background-color'].value, '');
          shorthandRules++;
        }
      }
      const frame = nativeChain.at(-1);
      for (const token of ['--surface', '--primary']) assert.match(frame.inline[token].value, /^#[0-9a-f]{6}$/i);
      for (const node of candidateChain) for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
        const style = node[stage] ?? {};
        for (const field of ['backgroundImage', 'filter', 'backdropFilter', 'mixBlendMode', 'isolation']) assert.equal(Object.hasOwn(style, field), false);
      }
      for (const property of ['filter', 'backdrop-filter', 'mix-blend-mode', 'isolation']) {
        assert.throws(() => inspectDeclarations({ ...nativeChain[0].inline, [property]: { value: 'injected', important: false } })); negativeControls++;
      }
    }
  }
  assert.equal(pairs, 48); assert.equal(nativeOwners, 192); assert.equal(candidateOwners, 240);
  assert.equal(shorthandRules, 96); assert.equal(negativeControls, 192);
  console.log(JSON.stringify({ cases: groups.length, pairs, nativeOwners, candidateOwners, shorthandRules, negativeControls,
    boundary: 'Recorded leaf-to-frame/root request inspection only. Variable shorthand has empty serialized longhands,not computed none. No ancestors outside capture,used compositing,shader execution,current runtime or whole-case equivalence inferred.' }));
});

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
