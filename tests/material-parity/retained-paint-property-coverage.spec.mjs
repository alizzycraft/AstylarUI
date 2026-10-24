import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureBrowserInputTree } from './input-tree-evidence.mjs';
import path from 'node:path';
import { materialStaticCases, materialInteractionCases } from './benchmark.config.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('remaining retained Divider computed paint covers every configured physical viewport cohort', () => {
  const bytes = readFileSync('artifacts/material-parity/divider-computed-paint-context-remaining-resolved-20261024.log');
  assert.equal(hash(bytes), '2d9b69e805b4a114c4b2fbdcca3263ec60de3ebebcd2f83d480a3f1f09f84c3a');
  const report = JSON.parse(bytes.toString('utf16le').replace(/^\ufeff/, ''));
  assert.equal(report.producerSha256, hash(readFileSync('scripts/audit-material-divider-paint-context-remaining.mjs')));
  assert.equal(hash(readFileSync('scripts/audit-material-divider-paint-context.mjs')), 'bbac18bb5c6fcc0c1d3ccfda7843d8a46b63e99d39cf70305a439bb5e389b1a3');
  assert.equal(report.browser, '155.0.8059.85');
  const baselineBytes = readFileSync(report.baseline.file); assert.equal(hash(baselineBytes), report.baseline.sha256);
  assert.equal(report.baseline.sha256, '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
  const assets = new Map(JSON.parse(baselineBytes).captureProvenance.browserFiles.map(row => [row.file, row.sha256]));
  const contexts = [
    { id: 'tablet', width: 768, height: 1024, deviceScaleFactor: 1 },
    { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 2 },
    { id: 'comparison', width: 609, height: 844, deviceScaleFactor: 1 },
    { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
  ];
  assert.deepEqual(report.results.map(row => `${row.context.id}/${row.profile}/${row.side}`), contexts.flatMap(context =>
    ['light', 'dark', 'contrast', 'custom'].flatMap(profile => ['reference', 'astylar'].map(side => `${context.id}/${profile}/${side}`))));
  const defaults = { backgroundImage: 'none', filter: 'none', backdropFilter: 'none', mixBlendMode: 'normal', isolation: 'auto', opacity: '1' };
  const inspect = values => { for (const [property, value] of Object.entries(defaults)) assert.equal(values[property], value); };
  const observed = new Map(), usedFiles = new Map(); let owners = 0, controls = 0;
  const desktopBytes = readFileSync('artifacts/material-parity/divider-computed-paint-context-20261024.log');
  assert.equal(hash(desktopBytes), '9d43d99a8832060378094f4c241250061d08b6db28107858e09d0865f62c6807');
  const desktop = JSON.parse(desktopBytes.toString('utf16le').replace(/^\ufeff/, ''));
  assert.equal(desktop.results.length, 8);
  for (const row of desktop.results) {
    const key = `${row.profile}/1440/1000/1`;
    if (!observed.has(key)) observed.set(key, new Set()); observed.get(key).add(row.side);
  }
  for (const row of report.results) {
    assert.deepEqual(row.context, contexts.find(context => context.id === row.context.id));
    const { width, height, deviceScaleFactor: dpr } = row.context;
    assert.deepEqual(row.observation.viewport, { width, height, dpr });
    const key = `${row.profile}/${width}/${height}/${dpr}`;
    if (!observed.has(key)) observed.set(key, new Set()); observed.get(key).add(row.side);
    assert.equal(row.observation.targets.length, row.side === 'reference' ? 2 : 1);
    for (const target of row.observation.targets) {
      assert.equal(target.chain.length, row.side === 'reference' ? 8 : 7); assert.equal(target.chain.at(-1).tag, 'html');
      for (const node of target.chain) {
        inspect(node.values); owners++;
        for (const property of Object.keys(defaults)) { assert.throws(() => inspect({ ...node.values, [property]: 'mutated' })); controls++; }
      }
    }
    for (const asset of row.assets) { assert.equal(asset.sha256, assets.get(asset.file)); usedFiles.set(asset.file, asset.sha256); }
  }
  const configured = [...materialStaticCases, ...materialInteractionCases].filter(row => row.family === 'divider');
  const expected = new Set(configured.map(row => `${row.profile}/${row.viewport.width}/${row.viewport.height}/${row.viewport.deviceScaleFactor}`));
  assert.equal(configured.length, 24); assert.equal(expected.size, 20);
  assert.deepEqual([...observed.keys()].sort(), [...expected].sort());
  assert.ok([...observed.values()].every(sides => sides.size === 2));
  for (const [file, sha256] of usedFiles) assert.equal(hash(readFileSync(path.join('examples/material-showcase/dist/material-showcase/browser', file))), sha256);
  assert.equal(owners, 368); assert.equal(controls, 2208);
  console.log(JSON.stringify({ additionalPairedContexts: 16, owners, controls, physicalCohorts: expected.size, configuredAliases: configured.length,
    boundary: 'Only missing computed DOM paint/host properties in retained served viewport cohorts;desktop DPR1 evidence remains separately pinned. Physical alias mapping is not execution of the original24-case test or current/case rendering acceptance.' }));
});

test('retained served Divider computed paint excludes image filters and blending through actual HTML hosts', () => {
  const bytes = readFileSync('artifacts/material-parity/divider-computed-paint-context-20261024.log');
  assert.equal(hash(bytes), '9d43d99a8832060378094f4c241250061d08b6db28107858e09d0865f62c6807');
  const report = JSON.parse(bytes.toString('utf16le').replace(/^\ufeff/, ''));
  assert.equal(report.producerSha256, hash(readFileSync('scripts/audit-material-divider-paint-context.mjs')));
  assert.equal(report.browser, '155.0.8059.85');
  assert.equal(report.baseline.sha256, '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
  const baselineBytes = readFileSync(report.baseline.file);
  assert.equal(hash(baselineBytes), report.baseline.sha256);
  const baseline = JSON.parse(baselineBytes), expected = new Map(baseline.captureProvenance.browserFiles.map(row => [row.file, row.sha256]));
  assert.equal(expected.size, 1887); assert.equal(report.results.length, 8);
  assert.deepEqual(report.results.map(row => `${row.profile}/${row.side}`),
    ['light', 'dark', 'contrast', 'custom'].flatMap(profile => ['reference', 'astylar'].map(side => `${profile}/${side}`)));
  const usedFiles = new Map(), defaults = { backgroundImage: 'none', filter: 'none', backdropFilter: 'none', mixBlendMode: 'normal', isolation: 'auto', opacity: '1' };
  const inspect = values => { for (const [property, value] of Object.entries(defaults)) assert.equal(values[property], value); };
  let owners = 0, controls = 0;
  for (const row of report.results) {
    assert.equal(row.assets.length, row.side === 'reference' ? 518 : 519);
    for (const asset of row.assets) { assert.equal(asset.sha256, expected.get(asset.file)); usedFiles.set(asset.file, asset.sha256); }
    assert.deepEqual(row.observation.targets.map(target => target.id), row.side === 'reference' ? ['divider-above', 'divider-below'] : ['canvas-host']);
    for (const target of row.observation.targets) {
      assert.deepEqual(target.chain.map(node => node.tag), row.side === 'reference'
        ? ['span', 'p', 'section', 'main', 'app-reference', 'app-root', 'body', 'html']
        : ['canvas', 'astylar-surface', 'main', 'app-astylar-showcase', 'app-root', 'body', 'html']);
      for (const node of target.chain) {
        inspect(node.values); owners++;
        for (const property of Object.keys(defaults)) { assert.throws(() => inspect({ ...node.values, [property]: 'mutated' })); controls++; }
      }
    }
  }
  for (const [file, sha256] of usedFiles) assert.equal(hash(readFileSync(path.join('examples/material-showcase/dist/material-showcase/browser', file))), sha256);
  assert.equal(owners, 92); assert.equal(controls, 552);
  console.log(JSON.stringify({ contexts: 8, owners, controls, servedFilesAuthenticated: usedFiles.size,
    boundary: 'Missing computed fields and actual DOM ancestors only,in four retained desktop DPR1 themes. Not all24 configured Divider contexts,candidate logical materials,shader/group compositing,current code or whole-case parity.' }));
});

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
