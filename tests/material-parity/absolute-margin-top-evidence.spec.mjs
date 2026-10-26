import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { dividerMarginSources, prepareDividerMarginRegistry, restoreDividerMarginRegistry,
  prepareDividerMarginSharedSource, restoreDividerMarginSharedSource, createDividerMarginPriorRead } from './divider-margin-registration.mjs';
import { createFocusSelectionAuditPriorRead, restoreFocusSelectionAuditRegistry } from './public-tab-selection-finding.mjs';

const directory = 'artifacts/material-parity/public-absolute-margins-20261026';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const reportBytes = readFileSync(`${directory}/latest-report.json`);
assert.equal(hash(reportBytes), '6e4d7b7807c1671e7716a2da46d4a3e61c9f0dd3f6011ce3e5ecb1e8717350fa');
const report = JSON.parse(reportBytes);

test('pending Divider margin registry preserves every accepted source and proof declaration', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const live = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const source = restoreDividerMarginRegistry(live);
  assert.equal(hash(source), '58ef02255929abc8ff050ec922de31f5120e2a038fec034e95e49c1052843527');
  const staged = prepareDividerMarginRegistry(source);
  assert.equal(restoreDividerMarginRegistry(staged), source);
  if (live !== source) assert.equal(live, staged);
  assert.throws(() => prepareDividerMarginRegistry(source + '\n// drift'));
  assert.throws(() => restoreDividerMarginRegistry(staged + '\n// drift'));
  assert.throws(() => prepareDividerMarginRegistry(staged));
  const arrays = value => {
    const tree = ts.createSourceFile(file, value, 99, true, ts.ScriptKind.JS), result = {};
    assert.equal(tree.parseDiagnostics.length, 0);
    for (const name of ['sourceFingerprints', 'focusedProofInventory']) {
      const fn = tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
      let array;
      const find = node => { if (!array && ts.isArrayLiteralExpression(node)) array = node; ts.forEachChild(node, find); };
      find(fn); result[name] = array.elements.map(node => node.getText(tree));
    }
    return result;
  };
  const before = arrays(source), after = arrays(staged);
  assert.equal(before.sourceFingerprints.length, 1077); assert.equal(after.sourceFingerprints.length, 1085);
  assert.equal(before.focusedProofInventory.length, 407); assert.equal(after.focusedProofInventory.length, 412);
  assert.deepEqual(after.sourceFingerprints.slice(8), before.sourceFingerprints);
  assert.deepEqual(after.focusedProofInventory.slice(5), before.focusedProofInventory);
  assert.equal(new Set(after.sourceFingerprints.map(value => new Function(`return ${value}`)())).size, 1085);
  for (const name of dividerMarginSources) assert.ok(readFileSync(name).length > 0);
  const proof = (_root, name, pattern, title) => {
    assert.equal([...readFileSync(name, 'utf8').matchAll(new RegExp(pattern.source, 'g'))].length, 1, title);
    return title;
  };
  for (const declaration of after.focusedProofInventory.slice(0, 5))
    new Function('proof', 'root', `return ${declaration}`)(proof, process.cwd());
  for (const name of ['tests/material-parity/public-tab-selection-finding.mjs', 'tests/material-parity/public-email-selection.spec.mjs']) {
    const current = readFileSync(name, 'utf8').replaceAll('\r\n', '\n');
    const prior = restoreDividerMarginSharedSource(current, name), next = prepareDividerMarginSharedSource(prior, name);
    assert.equal(restoreDividerMarginSharedSource(next, name), prior);
    if (current !== prior) assert.equal(current, next);
    assert.throws(() => restoreDividerMarginSharedSource(next + '\n// drift', name));
    assert.throws(() => prepareDividerMarginSharedSource(prior + '\n// drift', name));
    const read = createDividerMarginPriorRead({ root: process.cwd(), read: (requested, options) => {
      const value = path.resolve(requested) === path.resolve(file) ? staged : next;
      return typeof options === 'string' ? value : Buffer.from(value);
    } });
    assert.equal(read(file, 'utf8'), source);
    assert.equal(read(name, 'utf8'), prior);
  }
  // The established predecessor validator, not this delta adapter, owns older
  // generations. Check nested reuse and rejection through that real path.
  const historical = createFocusSelectionAuditPriorRead({ root: process.cwd(), read: readFileSync });
  const nested = createFocusSelectionAuditPriorRead({ root: process.cwd(), read: historical });
  assert.equal(nested(file, 'utf8'), historical(file, 'utf8'));
  assert.equal(restoreFocusSelectionAuditRegistry(staged, 'producer'),
    restoreFocusSelectionAuditRegistry(source, 'producer'));
  assert.throws(() => restoreFocusSelectionAuditRegistry(staged + '\n// unrelated drift', 'producer'));
  for (const value of [source, staged]) {
    const dirtyRead = () => Buffer.from(value + '\n// unrelated drift');
    assert.throws(() => createFocusSelectionAuditPriorRead({ root: process.cwd(), read: dirtyRead })(file));
  }
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), live);
});

test('retained Divider paragraph positioning is not the equal-input absolute-top reduction', () => {
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const original = JSON.parse(bytes);
  const cases = [...original.results, ...original.interactions].filter(row => row.family === 'divider');
  assert.equal(cases.length, 24);
  const inventory = collectFullTreeInventory(cases);
  for (const key of ['gaps', 'resolvedStyleGaps', 'stateStyleGaps', 'errors'])
    assert.deepEqual(inventory[key], []);
  let referencePairs = 0, candidatePairs = 0;
  const verify = (side, style) => {
    if (side === 'reference') {
      assert.equal(style.position, 'static');
      assert.equal(style.top, 'auto');
    } else {
      assert.equal(style.position, 'absolute');
      assert.equal(style.margin, '1em 0');
      assert.ok(Object.hasOwn(style, 'top'));
      assert.ok(Number.isFinite(parseFloat(style.top)));
      assert.notEqual(parseFloat(style.top), 0);
    }
  };
  for (const entry of inventory.cases) {
    const variant = inventory.variants[entry.variant];
    for (const id of ['divider-above', 'divider-below']) {
      const leaf = variant.nodes.find(node => node.attributes?.id === id);
      const paragraph = entry.side === 'reference'
        ? variant.nodes.find(node => node.key === leaf.parent)
        : variant.nodes.find(node => node.authored?.id === `${id}-row`);
      const style = inventory.styles[paragraph.style].value;
      verify(entry.side, style);
      if (entry.side === 'reference') {
        referencePairs++;
        assert.throws(() => verify(entry.side, { ...style, position: 'absolute' }));
      } else {
        candidatePairs++;
        assert.throws(() => verify(entry.side, { ...style, top: '0px' }));
        assert.throws(() => verify(entry.side, { ...style, margin: '0' }));
      }
    }
  }
  assert.equal(referencePairs, 48); assert.equal(candidatePairs, 48);
  // Matching candidate requests do not turn native normal flow into positioned
  // layout or prove that the independent core failure caused the original gap.
});

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
  const originalBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(originalBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const original = JSON.parse(originalBytes);
  const originalMapName = 'chunk-3JXWRYJY.js.map';
  const originalMapRoot = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser';
  const originalMapBytes = readFileSync(`${originalMapRoot}/${originalMapName}`);
  const originalMapReceipt = original.captureProvenance.browserFiles.find(row => row.file === originalMapName);
  assert.equal(hash(originalMapBytes), originalMapReceipt.sha256);
  const originalScriptName = originalMapName.slice(0, -4);
  const originalScriptReceipt = original.captureProvenance.browserFiles.find(row => row.file === originalScriptName);
  assert.equal(hash(readFileSync(`${originalMapRoot}/${originalScriptName}`)), originalScriptReceipt.sha256);
  const originalMap = JSON.parse(originalMapBytes);
  const originalOwners = originalMap.sources.map((name, index) => ({ name, index }))
    .filter(row => row.name.endsWith('/elements/element-dimension.service.js'));
  assert.equal(originalOwners.length, 1);
  const originalOwner = originalMap.sourcesContent[originalOwners[0].index];
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
    const shape = node => {
      if (ts.isParenthesizedExpression(node)) return shape(node.expression);
      const children = [];
      ts.forEachChild(node, child => { children.push(shape(child)); });
      if (ts.isBlock(node) && children.length === 0) return [node.kind, []];
      return children.length ? [node.kind, children] : [node.kind, node.getText(tree)];
    };
    leaves(matches[0]); return { tokens, source: matches[0].getText(tree), shape: shape(matches[0]) };
  };
  for (const name of ['calculateDimensions', 'parseMargin', 'parsePositionLength']) {
    assert.deepEqual(method(current, name).tokens, method(captured, name).tokens, name);
    // Historical formatter changes comments, trailing commas and redundant
    // parentheses. Compare the complete semantic AST, preserving operators,
    // expression grouping, calls and all statements; retain strict token checks
    // above for the current public-capture owner.
    assert.equal(hash(JSON.stringify(method(current, name).shape)),
      hash(JSON.stringify(method(originalOwner, name).shape)), `original capture ${name}`);
  }
  assert.notEqual(hash(JSON.stringify(method(originalOwner, 'calculateDimensions').shape)),
    hash(JSON.stringify(method(originalOwner.replace('top = verticalOriginInset +', 'top = verticalOriginInset -'),
      'calculateDimensions').shape)));
  const dimensions = method(current, 'calculateDimensions').source;
  assert.match(dimensions, /const margin = this\.parseMargin\(style\)/);
  assert.match(dimensions, /top = verticalOriginInset \+ this\.parsePositionLength\(/);
  assert.match(dimensions, /return \{ width, height, left, top, padding: layoutInsets, margin \}/);

  // Execute the authenticated original dimension owner with recorded paragraph
  // requests. This is a method replay, not a historical runtime observation.
  const originalTree = ts.createSourceFile('original.js', originalOwner, 99, true, ts.ScriptKind.JS);
  const methods = [];
  const collect = node => {
    if (ts.isMethodDeclaration(node)) methods.push(node.getText(originalTree));
    else ts.forEachChild(node, collect);
  };
  collect(originalTree);
  const Owner = new Function(`return class Owner {${methods.join('\n')}}`)();
  const owner = new Owner();
  const creationIndex = originalMap.sources.findIndex(name => name.endsWith('/elements/element-creation.service.js'));
  assert.ok(creationIndex >= 0);
  const creationTree = ts.createSourceFile('creation.js', originalMap.sourcesContent[creationIndex], 99, true, ts.ScriptKind.JS);
  const creators = [];
  const findCreator = node => {
    if (ts.isMethodDeclaration(node) && node.name.getText(creationTree) === 'createElement') creators.push(node);
    else ts.forEachChild(node, findCreator);
  };
  findCreator(creationTree); assert.equal(creators.length, 1);
  const statements = creators[0].body.statements;
  const calculationIndex = statements.findIndex(statement => ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(declaration => declaration.name.getText(creationTree) === 'calculatedDimensions'));
  assert.ok(calculationIndex > 0);
  // Execute the entire original prefix, not a handwritten model of its merges.
  // Stop before Babylon creation; external recovery/plugin/observer boundaries
  // are explicit no-op stubs, while the resolver supplies the captured style.
  const handoff = new Function('dom', 'render', 'element', 'parent', 'styles',
    statements.slice(0, calculationIndex + 1).map(statement => statement.getText(creationTree)).join('\n') +
    '\nreturn { style, calculatedDimensions };');
  const caller = {
    documentRecovery: { placeholderFor: () => null },
    capabilityRegistry: { resolveElement: () => null },
    interactionService: { ensurePointerObserver: () => {} },
    styleDefaults: { getElementTypeDefaults: () => { throw Error('Unexpected style fallback'); } },
    dimensionService: owner,
  };
  const render = { actions: { style: { getElementTypeDefaults: () => ({ display: 'block' }) } } };
  let replayed = 0;
  for (const row of [...original.results, ...original.interactions].filter(row => row.family === 'divider')) {
    const receipt = row.inputTrees.astylar, bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256);
    const tree = JSON.parse(bytes), root = tree.nodes.find(node => node.authored?.id === 'divider-root');
    const rootBox = row.geometry.elements.find(element => element.id === 'divider-root').actual;
    const parent = { name: root.authored.id };
    const dom = { context: {
      elementDimensions: new Map([[parent.name, { width: rootBox.width, height: rootBox.height,
        padding: owner.parsePadding(render, root.resolvedStyle, undefined) }]]),
      elementStyles: new Map([[parent.name, { normal: root.normalResolvedStyle }]]),
      hoverStates: new Map(),
    } };
    for (const id of ['divider-above-row', 'divider-below-row']) {
      const paragraph = tree.nodes.find(node => node.authored?.id === id);
      assert.equal(paragraph.authored.type, 'p');
      assert.ok(!paragraph.authored.textContent);
      assert.equal(paragraph.resolvedStyle.margin, '1em 0');
      const before = JSON.stringify(paragraph.resolvedStyle);
      assert.equal(paragraph.authored.style, undefined);
      const capturedStyle = structuredClone(paragraph.resolvedStyle);
      const replayRender = { actions: { style: { ...render.actions.style,
        findStyleForElement: element => { assert.equal(element, paragraph.authored); return capturedStyle; } } } };
      const passed = handoff.call(caller, dom, replayRender, paragraph.authored, parent, []);
      assert.equal(passed.style, capturedStyle);
      assert.equal(JSON.stringify(passed.style), before);
      const actual = owner.calculateDimensions(dom, render, paragraph.authored,
        paragraph.resolvedStyle, parent, []);
      assert.deepEqual(passed.calculatedDimensions, actual);
      assert.equal(JSON.stringify(paragraph.resolvedStyle), before);
      assert.deepEqual(actual.margin, { top: 1, right: 0, bottom: 1, left: 0 });
      const control = owner.calculateDimensions(dom, render, paragraph.authored,
        { ...paragraph.resolvedStyle, margin: '24px 0' }, parent, []);
      assert.deepEqual(control.margin, { top: 24, right: 0, bottom: 24, left: 0 });
      for (const key of ['left', 'top', 'width', 'height']) assert.equal(actual[key], control[key]);
      replayed++;
    }
  }
  assert.equal(replayed, 48);
});
