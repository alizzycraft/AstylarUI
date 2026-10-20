import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// Answer only whether recorded paragraph/span owners enter flex item sizing.
const hash = value => createHash('sha256').update(value).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const reportFile = 'artifacts/material-parity/current-full-20261005/latest-report.json';
assert.equal(receipt(reportFile).sha256, 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const report = JSON.parse(readFileSync(reportFile));
const provenanceFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
assert.equal(receipt(provenanceFile).sha256, '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const provenance = JSON.parse(readFileSync(provenanceFile));
const mapFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-XOU37TRR.js.map';
assert.equal(receipt(mapFile).sha256, provenance.captureProvenance.browserFiles.find(x => x.file === 'chunk-XOU37TRR.js.map').sha256);
const map = JSON.parse(readFileSync(mapFile));
function method(source, name) {
  const ast = ts.createSourceFile('owner.js', source, 99, true, ts.ScriptKind.JS), found = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === name) found.push(node.getText(ast));
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(found.length, 1); return found[0];
}
function tokens(source) {
  const ast = ts.createSourceFile('owner.js', `class Owner {${source}}`, 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  function structure(node) {
    // Ignore a redundant grouping wrapper,not the expression hierarchy. For
    // example,(a+b)*c remains a different binary tree from a+b*c.
    if (ts.isParenthesizedExpression(node)) return structure(node.expression);
    const children = []; ts.forEachChild(node, child => { children.push(structure(child)); });
    if (children.length || node.kind > ts.SyntaxKind.LastToken) return [node.kind, children];
    return [node.kind, ts.isStringLiteral(node) || ts.isIdentifier(node) ? node.text : node.getText(ast)];
  }
  return structure(ast);
}
assert.deepEqual(tokens('f(){return (a/b)*c;}'), tokens('f(){return a/b*c;}'));
assert.notDeepEqual(tokens('f(){return (a+b)*c;}'), tokens('f(){return a+b*c;}'));
const methods = {}, sourceReceipts = [];
for (const [file, names] of [
  ['flex.service', ['isFlexContainer', 'classifyFlexChild', 'processFlexChildren']],
  ['element-creation.service', ['processChildren', 'shouldUseInlineFlow']],
]) {
  const sourceFile = `src/app/services/dom/elements/${file}.ts`;
  const index = map.sources.findIndex(name => name.endsWith(`/${file}.js`)); assert.ok(index >= 0);
  const installedFile = `examples/material-showcase/${map.sources[index]}`;
  const sources = [ts.transpileModule(readFileSync(sourceFile, 'utf8'), {
    compilerOptions: { target: 99, module: 99, experimentalDecorators: true },
  }).outputText, readFileSync(installedFile, 'utf8'), map.sourcesContent[index]];
  sourceReceipts.push({ current: receipt(sourceFile), installed: receipt(installedFile),
    capturedModule: map.sources[index], capturedModuleSha256: hash(sources[2]) });
  for (const name of names) {
    const bodies = sources.map(source => method(source, name));
    for (const body of bodies.slice(1)) assert.deepEqual(tokens(body), tokens(bodies[0]));
    methods[name] = bodies[2];
  }
}
assert.notDeepEqual(tokens(methods.classifyFlexChild), tokens(methods.classifyFlexChild.replace("'positioned'", "'flow'")));
const Owner = new Function(`return class Owner {${Object.values(methods).join('\n')}}`)();
const rows = [], treeReceipts = [];
let routes = 0, positiveControls = 0, rootPartitionChecks = 0;
const itemProperties = ['order', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf'];
const itemDefaults = { order: '0', flexGrow: '0', flexShrink: '1', flexBasis: 'auto', alignSelf: 'auto' };
for (const entry of [...report.results, ...report.interactions].filter(x => x.family === 'divider')) {
  const trees = {};
  for (const [side, input] of Object.entries(entry.inputTrees)) {
    assert.deepEqual(receipt(input.file), input); treeReceipts.push(input); trees[side] = JSON.parse(readFileSync(input.file));
  }
  const ast = trees.astylar, native = trees.reference;
  const root = ast.nodes.find(n => n.authored?.id === 'divider-root');
  const nativeRoot = native.nodes.find(n => n.attributes?.id === 'divider-root');
  assert.equal(native.styles[nativeRoot.style].display, 'block');
  const children = ast.nodes.filter(n => n.parent === root.key);
  assert.equal(children.length, 3);
  assert.deepEqual(children.map(n => n.authored.id), ['divider-above-row', 'divider-primary', 'divider-below-row']);
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    const styles = new Map(ast.nodes.map(n => [n.authored, n[stage]]));
    const render = { actions: { style: { findStyleForElement: element => styles.get(element) } } };
    const owner = new Owner();
    assert.equal(owner.isFlexContainer(render, root.authored, []), true);
    assert.deepEqual(children.map(n => owner.classifyFlexChild(n[stage])), ['positioned', 'positioned', 'positioned']);
    const calls = [];
    owner.resizeStandaloneAutoHeightContainer = () => 333;
    owner.parseGapProperties = () => ({ gap: 0, rowGap: 0, columnGap: 0 });
    owner.flexLayoutService = { applySortedOrder(items) { assert.deepEqual(items, []); return items; } };
    owner.calculateFlexLayout = items => { assert.deepEqual(items, []); return []; };
    owner.resolveFlexProperties = () => { throw new Error('Positioned owners must not reach flex item sizing'); };
    const dom = { context: { elementDimensions: new Map([['root', { width: 900, height: 333,
      padding: { top: 0, right: 0, bottom: 0, left: 0 } }]]), elementStyles: new Map() },
      actions: { createElement(...args) { calls.push(args); return {}; } } };
    owner.processFlexChildren(dom, render, children.map(n => n.authored), { name: 'root' }, [], root.authored);
    assert.deepEqual(calls.map(args => args[2]), children.map(n => n.authored));
    assert.ok(calls.every(args => args.length === 5), 'Positioned creation must receive no flex-assigned position/size');
    rootPartitionChecks++;
    for (const id of ['divider-above', 'divider-below']) {
      const leaf = ast.nodes.find(n => n.authored?.id === id), paragraph = ast.nodes.find(n => n.key === leaf.parent);
      const nativeLeaf = native.nodes.find(n => n.attributes?.id === id);
      const nativeParagraph = native.nodes.find(n => n.key === nativeLeaf.parent);
      assert.equal(paragraph[stage].display, 'block'); assert.equal(paragraph[stage].position, 'absolute');
      assert.equal(leaf[stage].display, 'inline');
      assert.equal(native.styles[nativeParagraph.style].display, 'block');
      assert.equal(native.styles[nativeParagraph.style].position, 'static');
      for (const node of [paragraph, leaf]) assert.deepEqual(
        Object.fromEntries(itemProperties.map(key => [key, node[stage][key]])), itemDefaults);
      const route = [];
      owner.ancestry = { setParent() {} };
      owner.styleDefaults = { getElementTypeDefaults: () => ({ display: 'block' }) };
      owner.grid = { isGridContainer: () => false };
      owner.overflowClip = { apply() {} };
      owner.layoutInlineChildren = () => route.push('inline');
      owner.layoutBlockChildren = () => route.push('block');
      dom.actions.isFlexContainer = (...args) => owner.isFlexContainer(...args);
      dom.actions.processFlexChildren = () => route.push('flex');
      dom.context.layoutBoxes = new Map(); render.actions.camera = { projectCssViewportPoint() {} };
      owner.processChildren(dom, render, [leaf.authored], {}, [], paragraph.authored);
      assert.deepEqual(route, ['inline']); routes++;
      // Context changes must change route;the retained styles are restored.
      const original = styles.get(paragraph.authored);
      styles.set(paragraph.authored, { ...original, display: 'flex' }); route.length = 0;
      owner.processChildren(dom, render, [leaf.authored], {}, [], paragraph.authored);
      assert.deepEqual(route, ['flex']); positiveControls++;
      styles.set(paragraph.authored, original);
      for (const node of [paragraph, leaf]) rows.push({ profile: entry.profile, viewport: entry.viewport.id,
        state: entry.state ?? 'static', stage, target: node.authored.id, candidate: itemDefaults,
        reference: Object.fromEntries(itemProperties.map(key => [key,
          native.styles[(node === paragraph ? nativeParagraph : nativeLeaf).style][key]])),
        disposition: node === paragraph ? 'positioned-not-flex-item' : 'inline-child-of-block-not-flex-item',
        treeEvidence: entry.inputTrees });
    }
  }
}
assert.equal(rows.length, 288); assert.equal(routes, 144); assert.equal(rootPartitionChecks, 72);
assert.equal(positiveControls, 144);
for (const [style, expected] of [[{}, 'flow'], [{ position: 'fixed' }, 'positioned'],
  [{ display: 'none', position: 'absolute' }, 'hidden']]) {
  assert.equal(new Owner().classifyFlexChild(style), expected); positiveControls++;
}
console.log(JSON.stringify({ producer: receipt('scripts/check-divider-flex-context-inputs.mjs'), report: receipt(reportFile),
  provenance: receipt(provenanceFile), map: receipt(mapFile), sourceReceipts,
  methodTokenHashes: Object.fromEntries(Object.entries(methods).map(([name, body]) => [name, hash(JSON.stringify(tokens(body)))])),
  cases: 24, owners: 96, stageRows: rows.length, properties: itemProperties, rootPartitionChecks,
  inlineRoutes: routes, positiveControls, changedPartitionControl: true, treeReceipts, rows,
  conclusion: 'All retained candidate divider-root children are positioned and bypass flex item sizing in all three stages. Paragraphs route their sole span through inline layout,not flex layout. Their five flex-item defaults do not enter flex item sizing in these recorded contexts. Native paragraphs remain static children of a block root. Unequal root display and paragraph flow remain explicit authoring differences.',
  boundary: 'Exact partition/dispatch method execution with mocked downstream layout,creation,gap parsing,container resizing and grid exclusion. Not full renderer execution or geometry. Does not prove normal/stretch/flex-start equivalence for alignContent/alignItems/justifyContent,other formatting contexts,paint,current browser or whole-case closure. No scalar values or classifications changed.' }));
