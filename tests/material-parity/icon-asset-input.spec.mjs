import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { transformSync } from 'esbuild';
import { PNG } from 'pngjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';
import { restoreSvgProofRegistration } from './position-composition-producer-transition.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';
import { materialStaticCases, materialInteractionCases, materialProfiles, materialViewports } from './benchmark.config.mjs';
import { fingerprintDirectory } from './run-checkpoint.mjs';
import { effectiveBrowserCursor } from './cursor-metrics.mjs';
import { collectIconContextReview, validateIconContextReview, iconContextBaseline, applyIconContextReviews, validateIconContextRows } from './display-request-review.mjs';

const one = values => { assert.equal(values.length, 1); return values[0]; };

test('Icon viewport owner keeps CSS extents independent of final plane projection', t => {
  const rootFile = 'src/app/services/dom/elements/root.service.ts';
  const geometryFile = 'src/app/services/css-layout-geometry.ts';
  const sha = bytes => createHash('sha256').update(bytes).digest('hex');
  const rootBytes = readFileSync(rootFile), geometryBytes = readFileSync(geometryFile);
  const compile = (source, module = ts.ModuleKind.ESNext) => ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module, experimentalDecorators: true,
  } }).outputText;
  const printer = ts.createPrinter({ removeComments: true });
  function methods(source) {
    const ast = ts.createSourceFile('root.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), classes = [];
    function visit(node) {
      if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name?.text === 'RootService') classes.push(node);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    return ['createRootBodyElement', 'parsePadding'].map(name => printer.printNode(ts.EmitHint.Unspecified,
      one(one(classes).members.filter(member => member.name?.getText(ast) === name)), ast));
  }
  const currentMethods = methods(compile(rootBytes.toString()));
  const mapBytes = readFileSync('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map');
  assert.equal(sha(mapBytes), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
  const map = JSON.parse(mapBytes), sourceIndex = map.sources.indexOf('node_modules/astylarui/dist/lib/app/services/dom/elements/root.service.js');
  const syntax = source => {
    const ast = ts.createSourceFile('method.js', `class RootService {${source}}`, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const shape = node => {
      if (ts.isParenthesizedExpression(node)) return shape(node.expression);
      const children = []; ts.forEachChild(node, child => { children.push(shape(child)); });
      return { kind: node.kind, ...(!ts.isSourceFile(node) && typeof node.text === 'string' ? { text: node.text } : {}), children };
    };
    return shape(ast);
  };
  assert.ok(sourceIndex >= 0); assert.deepEqual(currentMethods.map(syntax), methods(map.sourcesContent[sourceIndex]).map(syntax));
  const geometry = { exports: {} }; new Function('exports', compile(geometryBytes.toString(), ts.ModuleKind.CommonJS))(geometry.exports);
  const Root = new Function('createCssLayoutBox', 'Color3', `return class RootService {${currentMethods.join('\n')}}`)(
    geometry.exports.createCssLayoutBox, class Color3 {});
  const reportBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(sha(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes), cases = [...report.results, ...report.interactions].filter(row => row.family === 'icon');
  assert.equal(cases.length, 20);
  let executions = 0;
  for (const row of cases) {
    const receipt = row.inputTrees.astylar, bytes = readFileSync(receipt.file); assert.equal(sha(bytes), receipt.sha256);
    const tree = JSON.parse(bytes), rootRule = one(tree.rules.filter(rule => rule.selector === 'root'));
    assert.deepEqual(Object.keys(rootRule).sort(), ['background', 'selector']);
    for (const projected of [[9, 7], [99, 31]]) {
      const plane = {}, calls = [], context = { elements: new Map(), elementDimensions: new Map(), layoutBoxes: new Map() };
      const render = { scene: { getEngine: () => ({ getRenderingCanvas: () => ({ clientWidth: row.viewport.width, clientHeight: row.viewport.height }) }) },
        actions: { camera: { calculateViewportDimensions: () => ({ width: projected[0], height: projected[1] }) },
          style: { findStyleBySelector: selector => { assert.equal(selector, 'root'); return rootRule; },
            parseBackgroundColor: value => ({ color: value }), parseOpacity: () => 1 },
          mesh: { createPlane: (...args) => { calls.push(args); return plane; }, positionTextMesh: () => {}, createMaterial: () => ({}) } } };
      assert.equal(new Root().createRootBodyElement({ context }, render, tree.rules), plane);
      assert.deepEqual(calls, [['root-body', ...projected]]);
      const zero = { top: 0, right: 0, bottom: 0, left: 0 };
      assert.deepEqual(context.elementDimensions.get('root-body'), { width: row.viewport.width, height: row.viewport.height, padding: zero });
      const rect = { x: 0, y: 0, width: row.viewport.width, height: row.viewport.height };
      assert.deepEqual(context.layoutBoxes.get('root-body'), { parentId: null,
        box: { borderBox: rect, contentBox: rect, padding: zero, margin: zero } }); executions++;
    }
  }
  t.diagnostic(JSON.stringify({ cases: cases.length, executions, rootSourceSha256: sha(rootBytes), geometrySourceSha256: sha(geometryBytes),
    capturedRootMethodsMatch: true, classification: 'no extra root CSS padding/origin offset in these inputs',
    boundary: 'Actual current root methods and geometry helper with inert mesh/style adapters; retained root-method source agreement. Not WebGL,descendant flow/inheritance/clipping,all root styles or full viewport-owner neutrality.' }));
});

test('Icon-specific compensation history has only the original external-image and fixed-raster authoring stages', t => {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const initial = '2f440115', raster = '48825c45';
  const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const at = (revision, name) => git(['show', `${revision}:${name}`]);
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  function inputs(source) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const leaves = [], rules = [];
    function visit(node) {
      if (ts.isIfStatement(node) && ts.isBinaryExpression(node.expression) &&
          node.expression.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken &&
          node.expression.left.getText(ast) === 'family' && ts.isStringLiteral(node.expression.right) &&
          node.expression.right.text === 'icon') leaves.push(node.thenStatement);
      if (ts.isObjectLiteralExpression(node) && node.properties.some(p => ts.isPropertyAssignment(p) &&
          p.name.getText(ast) === 'selector' && ts.isStringLiteral(p.initializer) && p.initializer.text === '.material-icon')) rules.push(node);
      ts.forEachChild(node, visit);
    }
    visit(ast);
    return Object.fromEntries([['leaf', one(leaves)], ['rule', one(rules)]].map(([key, node]) =>
      [key, printer.printNode(ts.EmitHint.Unspecified, node, ast)]));
  }
  const original = inputs(at(initial, file)), replacement = inputs(at(raster, file));
  assert.match(original.leaf, /src: '\/icons\/favorite\.svg'/);
  assert.match(replacement.leaf, /theme\.mode === 'dark' \? MATERIAL_FAVORITE_ICON_DARK : MATERIAL_FAVORITE_ICON_LIGHT/);
  assert.notEqual(original.leaf, replacement.leaf); assert.equal(original.rule, replacement.rule);
  function assertKnown(snapshot) {
    assert.equal(snapshot.rule, original.rule, 'unreviewed Icon sizing history');
    assert.ok(snapshot.leaf === original.leaf || snapshot.leaf === replacement.leaf, 'unreviewed Icon leaf history');
  }
  const revisions = [...new Set(git(['log', '--full-history', '--format=%H', '--', file]).trim().split(/\s+/))];
  const leafStages = new Set();
  for (const revision of revisions) {
    const snapshot = inputs(at(revision, file));
    assertKnown(snapshot);
    leafStages.add(snapshot.leaf);
  }
  const current = inputs(readFileSync(file, 'utf8')); assert.deepEqual(current, replacement);
  assert.equal(leafStages.size, 2);
  for (const [name, revision] of [['examples/material-showcase/src/app/material-assets.ts', raster],
    ['examples/material-showcase/public/icons/favorite.svg', initial]]) {
    const introduced = at(revision, name).replace(/\r\n/g, '\n');
    for (const version of new Set(git(['log', '--full-history', '--format=%H', '--', name]).trim().split(/\s+/)))
      assert.equal(at(version, name).replace(/\r\n/g, '\n'), introduced, `unreviewed asset history at ${version}`);
    assert.equal(readFileSync(name, 'utf8').replace(/\r\n/g, '\n'), introduced);
  }
  for (const changed of [{ ...current, leaf: current.leaf.replace("alt: 'Favorite'", "alt: 'Changed'") },
    { ...current, rule: current.rule.replace("width: '24px'", "width: '25px'") }]) {
    assert.notDeepEqual(changed, current); assert.throws(() => assertKnown(changed));
  }
  t.diagnostic(JSON.stringify({ componentRevisions: revisions.length, iconLeafStages: leafStages.size,
    initial, raster, currentIconInputsMatchRasterIntroduction: true,
    classification: 'existing fixed-raster authoring substitution; not an equal-input renderer fix',
    boundary: 'Complete reachable file-history Icon leaf/rule and asset contents only; excludes shared ancestor/theme machinery, runtime ownership, original developer intent beyond recorded comment, and whole-case closure.' }));
});

test('Icon shared ancestor history distinguishes removed heading compensation from retained input substitutions', t => {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const referenceFile = 'examples/material-showcase/src/app/reference.component.ts';
  const themeFile = 'examples/material-showcase/src/app/theme.ts';
  const initial = '2f4401157', flow = 'ee42cb3d83c685dbab922808091b803976dc35d3';
  const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 4_000_000 });
  const at = (revision, name) => git(['show', `${revision}:${name}`]).replaceAll('\r\n', '\n');
  const printer = ts.createPrinter({ removeComments: true });
  function shared(source) {
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const rules = { root: [], page: [], eyebrow: [], title: [], demo: [] }, heights = {};
    const functions = {};
    function visit(node) {
      if (ts.isObjectLiteralExpression(node)) {
        const selector = node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(ast) === 'selector')?.initializer;
        const name = selector && ts.isStringLiteral(selector) ? ({ root: 'root', '#page': 'page', '#eyebrow': 'eyebrow', '#title': 'title' })[selector.text] : null;
        const text = printer.printNode(ts.EmitHint.Unspecified, node, ast);
        if (name) rules[name].push(text);
        if (selector && ts.isTemplateExpression(selector) && selector.getText(ast) === '`#${rootId}`'
          && node.properties.some(p => p.name?.getText(ast) === 'gap')) rules.demo.push(text);
      }
      if (ts.isFunctionDeclaration(node) && ['materialReferenceHeight', 'materialDensityHeight'].includes(node.name?.text))
        functions[node.name.text] = printer.printNode(ts.EmitHint.Unspecified, node, ast);
      if (ts.isVariableDeclaration(node) && ['MATERIAL_REFERENCE_HEIGHTS', 'MATERIAL_COMPACT_REFERENCE_HEIGHTS', 'MATERIAL_CONTRAST_REFERENCE_HEIGHTS'].includes(node.name.getText(ast))) {
        const icon = node.initializer.arguments[0].properties.find(p => p.name.getText(ast) === 'icon');
        heights[node.name.getText(ast)] = Number(icon.initializer.getText(ast));
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    assert.equal(rules.root.length, 1); assert.equal(rules.page.length, 1); assert.equal(rules.demo.length, 1);
    assert.equal(Object.keys(functions).length, 2);
    return { rules, heights, functions };
  }
  const first = shared(at(initial, file)), before = shared(at(flow + '^', file));
  const corrected = shared(at(flow, file)), current = shared(readFileSync(file, 'utf8'));
  assert.deepEqual(first.rules.eyebrow, before.rules.eyebrow); assert.deepEqual(first.rules.title, before.rules.title);
  assert.deepEqual(current, corrected);
  for (const key of ['root', 'page', 'demo']) assert.deepEqual(current.rules[key], first.rules[key]);
  assert.deepEqual(current.functions, first.functions); assert.deepEqual(current.heights, first.heights);
  assert.deepEqual(Object.values(current.heights), [86, 87, 86]);
  assert.notDeepEqual(current.rules.eyebrow, first.rules.eyebrow); assert.notDeepEqual(current.rules.title, first.rules.title);
  assert.match(first.rules.title[0], /31\.875/); assert.match(first.rules.eyebrow[0], /marginBottom: '6px'/);
  assert.ok(current.rules.title.every(rule => !rule.includes('31.875')));
  assert.match(current.rules.title[0], /margin: '21\.44px 0'/);
  assert.match(current.rules.title[0], /this\.benchmarkMode \? theme\.surface/);
  assert.match(first.rules.title[0], /this\.benchmarkMode \? theme\.surface/);
  const headingChanges = git(['log', '--full-history', '--format=%H', '-G', "selector: '#(eyebrow|title)'", '--', file]).trim().split(/\s+/);
  assert.equal(headingChanges.length, 2); assert.equal(headingChanges[0], flow); assert.ok(headingChanges[1].startsWith(initial));
  const prefix = source => {
    const start = source.indexOf(':host{display:block;height:100%}.frame');
    const end = source.indexOf('.spacer{flex:1}', start); assert.ok(start >= 0 && end > start);
    return source.slice(start, end);
  };
  const reference = prefix(readFileSync(referenceFile, 'utf8'));
  assert.equal(reference, prefix(at(initial, referenceFile)));
  assert.equal(reference, prefix(at(flow + '^', referenceFile)));
  assert.match(reference, /top:-2px/); assert.match(reference, /top:-6\.5px/);
  assert.match(reference, /top:3px/); assert.match(reference, /top:6\.5px/);
  assert.match(reference, /top:\.5px/); assert.match(reference, /top:-16\.5px/);
  assert.match(reference, /\.benchmark>\.eyebrow,\.benchmark>h1\{opacity:0\}/);
  const theme = readFileSync(themeFile, 'utf8').replaceAll('\r\n', '\n');
  const ast = ts.createSourceFile(themeFile, theme, ts.ScriptTarget.Latest, true);
  const alpha = one(ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'alphaHex'));
  assert.equal(theme.slice(0, alpha.getFullStart()) + theme.slice(alpha.end), at(initial, themeFile));
  const themeChanges = git(['log', '--full-history', '--format=%H', '--', themeFile]).trim().split(/\s+/);
  assert.equal(themeChanges.length, 5);
  const themeStages = new Set();
  for (const revision of themeChanges) {
    const snapshot = at(revision, themeFile);
    assert.ok(snapshot === theme || snapshot === at(initial, themeFile)); themeStages.add(snapshot);
  }
  assert.equal(themeStages.size, 2); // three merge records do not create new content stages
  for (const [from, to] of [["padding: '36px'", "padding: '37px'"], ["margin: '21.44px 0'", "margin: '22px 0'"]]) {
    const changed = readFileSync(file, 'utf8').replace(from, to);
    assert.notEqual(changed, readFileSync(file, 'utf8'));
    assert.throws(() => assert.deepEqual(shared(changed), corrected));
  }
  t.diagnostic(JSON.stringify({ sharedAncestorHeadingHistory: true, headingStages: 2, initial, flow,
    sharedRootRulesUnchanged: true, iconHeightInputs: current.heights, themeRevisions: themeChanges.length,
    themeContentStages: themeStages.size, themeDelta: 'alphaHex helper only', negativeControls: 2,
    conclusions: ['old heading margin/height substitutions removed by reference-flow restoration',
      'current relative offsets already authored by reference;not candidate-only compensation',
      'fixed per-theme demo heights,block-versus-flex substitution and unequal benchmark masking persist since initial showcase'],
    boundary: 'Bounded shared ancestor/theme authoring history,not runtime causality,all historical source branches,remaining ownership or whole-case closure.' }));
});

test('Icon image completion callbacks retain explicit owners across captured and current sources', t => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const mapBytes = readFileSync('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map');
  assert.equal(hash(mapBytes), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
  const map = JSON.parse(mapBytes);
  // Parse/print both JS bodies identically:formatting and optional single-arrow
  // parameter parentheses differ in the two compiler outputs,not owner behavior.
  const canonical = text => transformSync(`class Owner {${text}}`, {
    loader: 'js', target: 'esnext', format: 'esm', legalComments: 'none', minifyWhitespace: true,
  }).code;
  const source = file => readFileSync(file, 'utf8');
  const parse = (file, text) => ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  function member(tree, name) {
    const nodes = [];
    function visit(node) {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) nodes.push(node);
      ts.forEachChild(node, visit);
    }
    visit(tree); return one(nodes);
  }
  const owners = [
    ['src/app/services/dom/elements/image-resource.service.ts', ['getTexture', 'getNaturalSize', 'getSceneTextures', 'subscribe', 'retain', 'disposeScene', 'entriesFor', 'recordLoaded', 'recordError', 'isCurrent', 'emit']],
    ['src/app/services/dom/elements/element-creation.service.ts', ['createElement']],
    ['src/lib/astylar.ts', ['createScene', 'collectImageSources']],
    ['src/lib/astylar-semantic-bridge.ts', ['applyAttributes', 'reconcileElement', 'dispose', 'disconnectInteractions']],
  ];
  let methods = 0, ownerMutationControls = 0;
  for (const [file, names] of owners) {
    const tree = parse(file, source(file)), installed = 'node_modules/astylarui/dist/lib/' + file.slice(4).replace(/\.ts$/, '.js');
    const index = map.sources.indexOf(installed); assert.ok(index >= 0, installed);
    const captured = parse(installed, map.sourcesContent[index]);
    for (const name of names) {
      const emitted = ts.transpileModule(`class Owner {${member(tree, name).getText(tree)}}`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
      }).outputText;
      const compiled = parse('compiled.js', emitted);
      assert.equal(canonical(member(compiled, name).getText(compiled)),
        canonical(member(captured, name).getText(captured))); methods++;
      if (name === 'isCurrent' || name === 'createScene') {
        const body = member(compiled, name).getText(compiled);
        const changed = name === 'isCurrent' ? body.replace('=== entry', '!== entry')
          : body.replace('event.scene !== scene', 'event.scene === scene');
        assert.notEqual(changed, body); assert.notEqual(canonical(changed), canonical(body)); ownerMutationControls++;
      }
    }
  }
  const creationFile = 'src/app/services/dom/elements/element-creation.service.ts';
  const creation = parse(creationFile, source(creationFile)), callbacks = [];
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(creation) === 'configureImage') callbacks.push(node.initializer);
    ts.forEachChild(node, visit);
  }
  visit(creation); const callback = one(callbacks).getText(creation);
  let guardControls = 0;
  for (const mode of ['parent-disposed', 'content-disposed', 'live']) {
    let reads = 0, updates = 0;
    const render = { actions: { mesh: { updateMeshWithBorderRadius: () => { updates++; }, positionTextMesh: () => { updates++; } } } };
    const get = new Function('mesh', 'imageContent', 'resourceTexture', 'dimensions', 'style', 'render', 'texture', 'projectCssSize', 'projectCssPoint', `return (${callback});`);
    const run = get.call({ imageLayout: { calculateFit: () => ({ renderedWidth: 24, renderedHeight: 24, uScale: 1, vScale: 1, uOffset: 0, vOffset: 0 }) } },
      { isDisposed: () => mode === 'parent-disposed' }, { isDisposed: () => mode === 'content-disposed' },
      { getSize: () => { reads++; return { width: 24, height: 24 }; } },
      { width: 24, height: 24, padding: { top: 0, right: 0, bottom: 0, left: 0 } }, {}, render, {},
      (_context, size) => size, (_context, point, z) => ({ ...point, z }));
    run(); assert.equal(reads, mode === 'live' ? 1 : 0); assert.equal(updates, mode === 'live' ? 2 : 0); guardControls++;
  }
  const bridge = source('src/lib/astylar-semantic-bridge.ts');
  assert.doesNotMatch(bridge, /onload|onerror|addEventListener\(['"](?:load|error)['"]/);
  assert.match(bridge, /if \(element\.src && node instanceof HTMLImageElement\) node\.src = element\.src/);
  const renderer = source('src/lib/astylar.ts');
  assert.match(renderer, /await readiness;\s*if \(scene\.isDisposed\) return/);
  assert.match(renderer, /if \(event\.scene !== scene \|\| session\.isDisposed\) return/);
  assert.match(renderer, /session\.addCleanup\(this\.imageResources\.subscribe/);
  assert.match(renderer, /session\.addCleanup\(\(\) => this\.imageResources\.disposeScene\(scene\)\)/);
  assert.match(renderer, /fontSet\.removeEventListener\('loadingdone', handleFontsLoaded\)/);
  t.diagnostic(JSON.stringify({ iconCallbackOwnerInventory: true, capturedCurrentMethodsMatch: methods,
    visualCompletionGuardControls: guardControls, ownerMutationControls, semanticImageCustomCompletionCallbacks: 0,
    fontReadyAndSubscriptionGuards: 'inspected source;not a new font race execution',
    boundary: 'Complete named source-owner equality and actual configureImage guard execution with stubs. Resource peer/stale-entry behavior is separately covered by five Jasmine tests;not native callback delivery,all peer/browser races or whole-case closure.' }));
});

test('Icon closure retains explicitly unproven context obligations despite zero unresolved attribution', () => {
  const canonical = JSON.parse(readFileSync('docs/material-input-equivalence-audit.json'));
  const pointer = JSON.parse(readFileSync('artifacts/material-parity/working-audit/current.json'));
  assert.equal(pointer.generation, canonical.compressedSha256);
  const rows = queryFindings('artifacts/material-parity/working-audit', 'icon');
  assert.equal(rows.length, 212);
  const pending = rows.filter(row => row.classification === 'parity-harness-defect' && !row.attribution);
  const counts = pending.reduce((counts,row) => { counts[row.property] = (counts[row.property] ?? 0) + 1; return counts; }, {});
  assert.deepEqual(counts, { alignContent: 2, alignItems: 2, cursor: 2, flex: 2, justifyContent: 2, width: 3 });
  assert.equal(pending.length, 13);
  assert.equal(pending.reduce((sum,row) => sum + row.occurrences, 0), 220);
  for (const row of pending) {
    assert.equal(row.evidence.section, 'discrepancies');
    assert.equal(row.evidence.sourceSha256, canonical.uncompressedSha256);
    assert.notEqual(row.attribution, 'unresolved');
    assert.match(row.justification, /not a proven|cannot establish equivalence|has not been safely expanded|must compare equivalent authored expressions/);
    assert.deepEqual(row.states, row.property === 'width' && row.occurrences === 4 ? ['static'] : ['static', 'inspect']);
  }
  // This is a closure-readiness blocker list, not a new source finding,
  // failing-case census, rendering result or waiver of the required checks.
});

test('all configured Icon owners retain block versus flex parent-context divergence', () => {
  const raw = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest(raw), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(raw), key = row => `${row.kind}:${row.family}@${row.profile}/${row.viewport.id}${row.state ? '/' + row.state : ''}`;
  const rows = [...capture.results.map(row => ({ ...row, kind: 'static' })), ...capture.interactions.map(row => ({ ...row, kind: 'interaction' }))].filter(row => row.family === 'icon');
  const configured = [...materialStaticCases.map(row => ({ ...row, kind: 'static' })), ...materialInteractionCases.map(row => ({ ...row, kind: 'interaction' }))].filter(row => row.family === 'icon');
  assert.equal(rows.length, 20); assert.deepEqual(rows.map(key).sort(), configured.map(key).sort());
  function inspect(tree, side) {
    const attrs = node => side === 'reference' ? node.attributes : node.authored;
    const style = node => side === 'reference' ? tree.styles[node.style] : node.resolvedStyle;
    const root = one(tree.nodes.filter(node => attrs(node)?.id === 'icon-root'));
    const icon = one(tree.nodes.filter(node => attrs(node)?.id === 'icon-primary'));
    const parent = one(tree.nodes.filter(node => node.key === root.parent));
    assert.equal(icon.parent, root.key); assert.equal(style(parent).display, 'block');
    assert.equal(style(root).display, side === 'reference' ? 'block' : 'flex');
    assert.equal(style(root).flexDirection, side === 'reference' ? 'row' : 'column');
    assert.equal(style(root).flexWrap, 'nowrap'); assert.equal(style(icon).display, 'inline-block');
    for (const owner of [root, icon]) {
      const values = style(owner);
      assert.deepEqual([values.flexGrow, values.flexShrink, values.flexBasis], ['0', '1', 'auto']);
      if (side === 'reference') assert.equal(values.flex, '0 1 auto');
      assert.equal(values.alignItems, side === 'reference' ? 'normal' : 'stretch');
      assert.equal(values.alignContent, side === 'reference' ? 'normal' : 'stretch');
      assert.equal(values.justifyContent, side === 'reference' ? 'normal' : 'flex-start');
    }
  }
  for (const row of rows) for (const side of ['reference', 'astylar']) {
    const receipt = row.inputTrees[side], bytes = readFileSync(receipt.file); assert.equal(digest(bytes), receipt.sha256);
    const tree = JSON.parse(bytes); inspect(tree, side);
    const changed = structuredClone(tree), root = changed.nodes.find(node => (node.attributes?.id ?? node.authored?.id) === 'icon-root');
    if (side === 'reference') changed.styles[root.style].display = 'flex'; else root.resolvedStyle.display = 'block';
    assert.throws(() => inspect(changed, side));
  }
  // Matching flex longhands do not make the icon placement equivalent:
  // the native icon is not a flex item; the candidate is. Root authoring
  // diverges before layout. No claim about current rendered CSS support.
});

test('Icon root width expressions preserve content-box to border-box intent across configured cases', () => {
  const raw = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest(raw), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(raw);
  const rows = [...capture.results.map(row => ({ ...row, kind: 'static' })), ...capture.interactions.map(row => ({ ...row, kind: 'interaction' }))].filter(row => row.family === 'icon');
  assert.equal(rows.length, 20);
  function inspect(reference, candidate, viewport) {
    const native = one(reference.nodes.filter(node => node.attributes?.id === 'icon-root'));
    const converted = one(candidate.nodes.filter(node => node.authored?.id === 'icon-root'));
    const parent = one(reference.nodes.filter(node => node.key === native.parent));
    const outer = reference.styles[parent.style], nativeStyle = reference.styles[native.style], convertedStyle = converted.resolvedStyle;
    assert.equal(outer.boxSizing, 'border-box'); assert.equal(parseFloat(outer.width), viewport.width);
    assert.equal(outer.paddingLeft, '36px'); assert.equal(outer.paddingRight, '36px');
    assert.equal(outer.borderLeftWidth, '0px'); assert.equal(outer.borderRightWidth, '0px');
    assert.equal(nativeStyle.boxSizing, 'content-box'); assert.equal(nativeStyle.maxWidth, '720px');
    assert.equal(nativeStyle.paddingLeft, '28px'); assert.equal(nativeStyle.paddingRight, '28px');
    assert.equal(nativeStyle.borderLeftWidth, '1px'); assert.equal(nativeStyle.borderRightWidth, '1px');
    const demoRules = native.rules.map(index => reference.rules[index]).filter(rule => rule.declarations['max-width']?.value === '720px');
    assert.equal(demoRules.length, 1); assert.equal(demoRules[0].declarations.width, undefined);
    assert.equal(convertedStyle.boxSizing, 'border-box'); assert.equal(convertedStyle.width, '100%');
    assert.equal(convertedStyle.padding, '28px'); assert.equal(convertedStyle.borderWidth, '1px');
    const extra = 28 * 2 + 1 * 2, available = viewport.width - 36 * 2;
    assert.equal(convertedStyle.maxWidth, `${720 + extra}px`);
    const expectedBorderWidth = Math.min(available, 720 + extra);
    assert.equal(parseFloat(nativeStyle.width) + extra, expectedBorderWidth);
    return expectedBorderWidth;
  }
  const widths = new Set();
  for (const row of rows) {
    const pair = ['reference','astylar'].map(side => {
      const receipt = row.inputTrees[side], bytes = readFileSync(receipt.file); assert.equal(digest(bytes), receipt.sha256); return JSON.parse(bytes);
    });
    const width = inspect(...pair, row.viewport); widths.add(width);
    if (row.kind === 'static') assert.equal(one(row.geometry.elements.filter(element => element.id === 'icon-root')).expected.width, width);
    const changed = structuredClone(pair); changed[1].nodes.find(node => node.authored?.id === 'icon-root').resolvedStyle.maxWidth = '720px';
    assert.throws(() => inspect(...changed, row.viewport));
  }
  assert.deepEqual([...widths].sort((a,b)=>a-b), [318,696,778]);
  // This proves the scoped authored size conversion, not authoritative current
  // candidate used dimensions, projection correctness or all box-model support.
});

test('Icon and blank-root effective cursors agree in verified applied-theme pointer cohorts', () => {
  const raw = readFileSync('artifacts/material-parity/icon-effective-cursor-themed-20261010/latest-report.json');
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest(raw), 'c42ca16d0160bb60a3cc692a44f57feded71e324c6c37d14df2e0c8ba3ee4293');
  const record = JSON.parse(raw);
  for (const receipt of [record.capture.checkpointManifest, ...record.capture.sources]) assert.equal(digest(readFileSync(receipt.file)), receipt.sha256);
  const manifest = JSON.parse(readFileSync(record.capture.checkpointManifest.file));
  assert.deepEqual(fingerprintDirectory('examples/material-showcase/dist/material-showcase/browser'), manifest.provenance.browserFiles);
  const assets = new Map(manifest.provenance.browserFiles.map(receipt => [receipt.file, receipt.sha256]));
  const exports = {};
  new Function('exports', ts.transpileModule(readFileSync('examples/material-showcase/src/app/theme.ts','utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText)(exports);
  const viewports = [...materialViewports, { ...materialViewports[0], id: 'desktop-dpr2', deviceScaleFactor: 2 }];
  function inspect(row) {
    const expected = materialProfiles.flatMap(profile => viewports.flatMap(viewport => ['reference','astylar'].map(side => `${profile}/${viewport.id}/${side}`)));
    assert.deepEqual(row.results.map(result => `${result.profile}/${result.viewport.id}/${result.side}`).sort(), expected.sort());
    for (const result of row.results) {
      assert.deepEqual(result.viewport, one(viewports.filter(viewport => viewport.id === result.viewport.id)));
      assert.deepEqual(result.theme, exports.MATERIAL_THEME_PROFILES[result.profile]);
      assert.deepEqual(result.runtime.errors, []); assert(result.runtime.assets.length > 0);
      for (const asset of result.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
      assert.deepEqual(result.targets.map(target => target.id), ['icon-root','icon-primary']);
      for (const target of result.targets) {
        assert.equal(target.textAtPoint, false);
        assert.equal(target.hitType, result.side === 'astylar' ? 'canvas' : target.id === 'icon-root' ? 'section' : 'path');
        assert.equal(target.hitCursor, result.side === 'reference' ? 'auto' : 'default');
        assert.equal(target.ownerCursor, target.hitCursor);
        assert.equal(target.effectiveCursor, effectiveBrowserCursor(target.hitCursor, target.textAtPoint));
        assert.equal(target.effectiveCursor, 'default');
      }
    }
  }
  inspect(record);
  for (const mutate of [row => { row.results.pop(); }, row => { row.results.find(result => result.profile === 'dark').theme.mode = 'light'; },
    row => { row.results[0].targets[0].textAtPoint = true; }, row => { row.results[1].targets[0].hitCursor = 'pointer'; }]) {
    const changed = structuredClone(record); mutate(changed); assert.throws(() => inspect(changed));
  }
});

test('Icon context proposal changes only eight reviewed metadata groups and preserves scalar evidence', () => {
  const review = collectIconContextReview(), rows = queryFindings('artifacts/material-parity/working-audit', 'icon', iconContextBaseline);
  const metadata = new Set(['classification','attribution','justification','recommendedOwner','reviewedCases','reviewEvidence']);
  const unchanged = row => Object.fromEntries(Object.entries(row).filter(([key])=>!metadata.has(key)));
  assert.equal(review.canonicalAttributionChanged, false); assert.equal(review.groups.length, 8);
  assert.equal(review.groups.reduce((sum,row)=>sum+row.occurrences,0),120);
  for (const receipt of review.sources) assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
  for (const group of review.groups) {
    const prior = one(rows.filter(row=>row.id===group.id));
    assert.deepEqual(unchanged(group), unchanged(prior));
    assert.equal(group.reviewEvidence.originalCompleteRowSha256, prior.evidence.completeRowSha256);
    assert.equal(group.reviewedCases.length, prior.occurrences);
    assert.equal(group.reviewEvidence.renderingEquivalent, false); assert.equal(group.reviewEvidence.rendererCauseProven, false);
    assert.equal(group.classification, group.property==='width'||group.element==='icon-root'&&group.property==='flex'?'equivalent-representation':'application-plugin-authoring-defect');
  }
  assert.equal(rows.filter(row=>row.classification==='parity-harness-defect'&&!row.attribution).length,13);
  // Original pending population remains immutable even after publication.
  assert.deepEqual(validateIconContextReview(review), []);
  for (const mutate of [row=>{row.groups[0].reference='forged-value';},row=>{row.groups[0].reviewEvidence.renderingEquivalent=true;}]) {
    const changed=structuredClone(review);mutate(changed);assert.equal(validateIconContextReview(changed).length,1);
  }
});

test('Icon review conserves complete original rows and rejects input drift', async () => {
  const review = collectIconContextReview();
  const original = await loadFindingEvidence('artifacts/material-parity/working-audit', 'icon', review.groups.map(row => row.id), iconContextBaseline);
  const unrelated = { family: 'unrelated', reference: 'preserve-me' };
  const updated = applyIconContextReviews([...original, unrelated]);
  assert.equal(updated.at(-1), unrelated);
  const metadata = new Set(['classification','attribution','justification','recommendedOwner','reviewedCases','reviewEvidence']);
  const inputs = row => Object.fromEntries(Object.entries(row).filter(([key]) => !metadata.has(key)));
  original.forEach((row, index) => assert.deepEqual(inputs(updated[index]), inputs(row)));
  assert.equal(updated.filter(row => row.attribution === 'reviewed-icon-parent-context-and-width-intent').length, 8);
  assert.deepEqual(validateIconContextRows(updated), []);
  const badMetadata = structuredClone(updated); badMetadata[0].justification = 'forged';
  assert.equal(validateIconContextRows(badMetadata).length, 1);
  const forged = structuredClone(original); forged[0].reference = 'forged';
  assert.throws(() => applyIconContextReviews(forged));
  assert.throws(() => applyIconContextReviews(original.slice(1)));
  assert.throws(() => applyIconContextReviews([...original, original[0]]));
});

test('SVG upload cause registration conserves all predecessor source findings', () => {
  const priorSource = execFileSync('git', ['show', '91b730a9:tests/material-parity/input-equivalence-policy.mjs'],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const prior = Function(priorSource.replace(/^export const /gm, 'const ') + ';return sourceAuditDefinitions;')();
  assert.equal(prior.length, 147);
  assert.equal(sourceAuditDefinitions.length, 148);
  assert.deepEqual(sourceAuditDefinitions.slice(0, -1), prior);
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'core-svg-dimensionless-image-upload-not-adapted');
  assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  assert.equal(finding.evidence.length, 4);
  for (const receipt of finding.evidence)
    assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
  assert.deepEqual(finding.observation.dpr, [1, 2]);
  assert.match(finding.justification, /not a general alpha/);
  assert.match(finding.justification, /separately documented support limitation/);
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const producer = readFileSync(producerFile, 'utf8');
  const priorProducer = execFileSync('git', ['show', '009c9634:' + producerFile],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(restoreSvgProofRegistration(producer), priorProducer.replaceAll('\r\n', '\n'));
  for (const fragment of ['original SVG GPU upload adaptation boundary',
    'decoded native image dimensions isolate upload adaptation', 'not inline SVG support,currentColor inheritance'])
    assert.throws(() => restoreSvgProofRegistration(producer.replace(fragment, fragment + ' altered')),
      /exact one-entry addition/);
});

test('retained Icon inspect pixels expose DPR sharpness without adding acceptance gates', () => {
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const raw = readFileSync('artifacts/material-parity/icon-inspect-local-paint-20261007.log');
  assert.equal(digest(raw), 'a253a8331dfffa856f1f886451487cb6a4a394a56837054fdb7a4eb448b6b1d7');
  const [receipt, ...observed] = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
  const reportBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(digest(reportBytes), receipt.reportSha256);
  const runner = readFileSync('tests/material-parity/run-material-parity.mjs');
  assert.equal(digest(runner), receipt.runnerSha256);
  const metricBytes = readFileSync('tests/material-parity/focused-raster-metrics.mjs');
  assert.equal(digest(metricBytes), 'c84839968d5ba77534a0af4d56f31f187cd941e607a8418959a1b0771f92e1e0');
  const ast = ts.createSourceFile('runner.mjs', runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declaration = one(ast.statements.filter(s => ts.isFunctionDeclaration(s) && s.name?.text === 'cropPng'));
  const crop = Function('PNG', `${declaration.getText(ast)};return cropPng;`)(PNG);
  const cases = JSON.parse(reportBytes).interactions.filter(row => row.family === 'icon');
  assert.equal(cases.length, 8);
  assert.equal(observed.length, 8);
  assert.equal(new Set(cases.map(row => `${row.profile}/${row.viewport.id}`)).size, 8);
  for (const row of cases) {
    const recorded = one(observed.filter(r => r.profile === row.profile && r.viewport === row.viewport.id));
    assert.equal(row.state, 'inspect');
    assert.deepEqual(row.focusedRasters, []);
    assert.equal(recorded.configuredLocalTargets, 0);
    const directory = `artifacts/material-parity/current-full-20261005/interactions/icon/${row.profile}/${row.viewport.id}/inspect`;
    const referenceBytes = readFileSync(`${directory}/reference.png`);
    const candidateBytes = readFileSync(`${directory}/astylar.png`);
    assert.equal(digest(referenceBytes), recorded.referenceSha256);
    assert.equal(digest(candidateBytes), recorded.astylarSha256);
    const reference = PNG.sync.read(referenceBytes), candidate = PNG.sync.read(candidateBytes);
    const scale = row.viewport.deviceScaleFactor;
    assert.equal(reference.width, row.viewport.width * scale);
    assert.equal(candidate.width, reference.width);
    assert.equal(candidate.height, reference.height);
    const box = one(row.geometry.elements.filter(element => element.id === 'icon-primary')).expected;
    const bounds = {
      left: Math.max(0, Math.floor((box.left - 8) * scale)),
      top: Math.max(0, Math.floor((box.top - 8) * scale)),
      right: Math.min(reference.width, Math.ceil((box.right + 8) * scale)),
      bottom: Math.min(reference.height, Math.ceil((box.bottom + 8) * scale)),
    };
    assert.deepEqual(bounds, recorded.bounds);
    const metrics = evaluateFocusedRaster(crop(reference, bounds), crop(candidate, bounds), { minimumSsim: 0.8 });
    assert.deepEqual(metrics, recorded.diagnostic);
    assert.equal(metrics.sharpness.meetsTarget, scale === 1);
    assert.equal(metrics.matches, true); // Diagnostic static threshold, not an interaction acceptance gate.
  }
});

test('inline SVG support boundary remains distinct from external image currentColor', () => {
  const file = 'src/lib/astylar-core-capabilities.ts';
  const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declarations = tree.statements.filter(ts.isVariableStatement)
    .flatMap(statement => statement.declarationList.declarations);
  const declaration = one(declarations.filter(d => d.name.getText(tree) === 'ASTYLAR_CORE_ELEMENT_TYPES'));
  assert.ok(ts.isCallExpression(declaration.initializer));
  const argument = declaration.initializer.arguments[0];
  const array = ts.isSatisfiesExpression(argument) ? argument.expression : argument;
  assert.ok(ts.isArrayLiteralExpression(array));
  assert.ok(array.elements.every(ts.isStringLiteral));
  const names = array.elements.map(element => element.text);
  assert.ok(names.includes('img'));
  assert.equal(names.includes('svg'), false);
  assert.equal(names.includes('path'), false);
  const catalog = JSON.parse(readFileSync('docs/compatibility/capabilities.json'));
  const boundary = one(catalog.unsupported.elements.filter(entry => entry.names.includes('svg')));
  assert.equal(boundary.classification, 'unsupported');
  assert.equal(boundary.pluginCanSupply, true);
  assert.match(readFileSync('src/lib/astylar-core-plugin.ts', 'utf8'),
    /elements: ASTYLAR_CORE_ELEMENT_TYPES\.map/);
  const bytes = readFileSync('artifacts/material-parity/icon-original-svg-boundary-20261007.log');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    '141359f90bfa4f1d859dc0815625e6754474a36a57f25e818b5a8e019b43d811');
  const references = bytes.toString().split(/\r?\n/).filter(l => l.startsWith('{'))
    .map(JSON.parse).filter(row => row.mode === 'reference');
  assert.deepEqual(references.map(row => row.dpr), [1, 2]);
  for (const row of references) {
    assert.ok(row.data.images.every(image => image.color === 'rgb(255, 0, 255)'));
    assert.ok(row.samples.every(sample => sample.heartCenter.join(',') === '0,0,0,255'));
  }
});

test('retained original SVG upload failure binds public runtime and matched alpha controls', () => {
  const digest = bytes => createHash('sha256').update(bytes).digest('hex');
  const load = (name, expected) => {
    const raw = readFileSync(`artifacts/material-parity/${name}.log`);
    assert.equal(digest(raw), expected);
    return raw.toString().split(/\r?\n/).filter(line => line.startsWith('{')).map(JSON.parse);
  };
  const runtime = load('icon-svg-runtime-upload-20261007',
    '9cba551e122dc41ca7cb01fe80d201ba18799e26f8c628d7f1b22cd34ffd9f53');
  const controls = load('icon-svg-alpha-controls-20261007',
    '764a2dfba3828497e65b13bae2fad600fb091aba12f8e40f910ef74c0c0d1231');
  const [upload] = load('icon-svg-native-upload-boundary-20261007',
    'd08a6efff4c16dcd148ba1b4f5430bcfdb2eccbda8da5fcfe62c95648edb3aac');
  const [owners] = load('icon-svg-owner-binding-20261007',
    '3fad20ad2f518a13036ebd10a3d6197ca9bd4faa53235039ec3d4121e9b17ba2');
  for (const collection of [runtime, controls]) {
    assert.equal(collection[0].receipts.length, 2515);
    for (const receipt of collection[0].receipts)
      assert.equal(digest(readFileSync(receipt.file)), receipt.sha256);
  }
  assert.equal(digest(readFileSync(upload.source.file)), upload.source.sha256);
  for (const binding of owners.bindings) {
    assert.equal(digest(readFileSync(binding.sourceFile)), binding.sourceSha256);
    assert.equal(digest(readFileSync(binding.installedFile)), binding.installedSha256);
    const compiled = ts.transpileModule(readFileSync(binding.sourceFile, 'utf8'),
      { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const extract = text => {
      const start = text.indexOf(binding.start), end = text.indexOf(binding.end, start);
      assert.ok(start >= 0 && end > start);
      return text.slice(start, end).replace(/\s+/g, ' ').trim();
    };
    assert.equal(extract(compiled), extract(readFileSync(binding.installedFile, 'utf8')));
    assert.equal(digest(extract(compiled)), binding.normalizedMethodSha256);
  }
  const verifyRuntime = rows => {
    assert.deepEqual(rows.map(r => r.dpr), [1, 2]);
    for (const row of rows) {
      assert.deepEqual(row.errors, []);
      assert.deepEqual(row.data.diagnostics, []);
      assert.equal(row.disposed, true);
      const call = one(row.data.uploads);
      assert.equal(call.error, 1281);
      assert.deepEqual([call.width, call.height, call.naturalWidth, call.naturalHeight], [150, 150, 150, 150]);
      assert.match(call.stack, /_prepareWebGLTexture/);
      assert.ok(row.data.textures.every(t => t.ready));
      const raw = readFileSync(row.raster.file);
      assert.equal(digest(raw), row.raster.sha256);
      assert.equal(digest(readFileSync(row.raster.matchesOriginal)), row.raster.sha256);
      const image = PNG.sync.read(raw);
      const offset = (21 * row.dpr * image.width + 21 * row.dpr) * 4;
      assert.deepEqual([...image.data.subarray(offset, offset + 4)], [0, 0, 0, 255]);
    }
  };
  verifyRuntime(runtime.slice(1));
  const altered = structuredClone(runtime.slice(1)); altered[0].data.uploads[0].error = 0;
  assert.throws(() => verifyRuntime(altered));
  assert.equal(controls.length, 9);
  for (const row of controls.slice(1)) {
    assert.deepEqual(row.errors, []);
    assert.deepEqual(row.data.errors, []);
    assert.equal(row.disposed, true);
    assert.equal(digest(readFileSync(row.raster.file)), row.raster.sha256);
    for (const sample of row.samples) {
      assert.deepEqual(sample.transparentCorner, [240, 240, 240, 255]);
      assert.deepEqual(sample.heartCenter, [0, 0, 0, 255]);
    }
    for (const texture of row.data.textures) assert.deepEqual(texture.alphaRange, [0, 255]);
  }
  assert.deepEqual(upload.results.map(r => r.kind), ['original', 'dimensioned', 'png', 'original-assigned-size']);
  for (const row of upload.results) {
    assert.equal(row.uploadError, row.kind === 'original' ? 1281 : 0);
    assert.equal(row.complete, row.kind !== 'original');
    assert.equal(row.readError, row.kind === 'original' ? 1286 : 0);
  }
});

function inspect(entry, reference, candidate, assets, svgPath) {
  for (const tree of [reference, candidate]) {
    assert.deepEqual(tree.errors, []);
    assert.equal(tree.ruleEvidenceComplete, true);
  }
  const ref = one(reference.nodes.filter(n => n.attributes?.id === 'icon-primary'));
  const ast = one(candidate.nodes.filter(n => n.authored?.id === 'icon-primary'));
  assert.equal(ref.type, 'mat-icon');
  assert.equal(ast.authored.type, 'img');
  const svg = one(reference.nodes.filter(n => n.parent === ref.key));
  assert.equal(svg.type, 'svg');
  assert.equal(svg.attributes.viewBox, '0 0 24 24');
  assert.equal(svg.attributes.preserveAspectRatio, 'xMidYMid meet');
  const path = one(reference.nodes.filter(n => n.parent === svg.key));
  assert.equal(path.type, 'path');
  assert.equal(path.attributes.d, svgPath);
  assert.equal(path.attributes.fill, 'currentColor');
  const mode = entry.profile === 'dark' ? 'DARK' : 'LIGHT';
  assert.equal(ast.authored.src, assets[mode]);
  const bytes = Buffer.from(ast.authored.src.split(',')[1], 'base64');
  assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
  assert.equal(bytes.readUInt32BE(16), 24);
  assert.equal(bytes.readUInt32BE(20), 24);
  const input = one(entry.styleInputs.filter(i => i.id === 'icon-primary'));
  assert.equal(reference.styles[ref.style].objectFit, 'fill');
  for (const [field, stage] of [['astylar', 'resolvedStyle'],
    ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[field], ast[stage]);
    assert.equal(ast[stage].objectFit, 'contain');
    assert.equal(ast[stage].width, '24px');
    assert.equal(ast[stage].height, '24px');
  }
  return { mode, assetInputEquivalent: false, coreDefectProven: false, rasterVerified: false };
}

test('all original icon owners replace currentColor SVG with fixed 24px theme rasters', () => {
  const finding = one(sourceAuditDefinitions.filter(d => d.id === 'fixture-icon-svg-replaced-by-fixed-raster'));
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  assert.match(finding.focusedProof, /icon-asset-input\.spec\.mjs/);
  const authoredSource = readFileSync(finding.file, 'utf8');
  assert.equal([...authoredSource.matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  assert.doesNotMatch(authoredSource.replace(
    new RegExp(finding.pattern, 'g'), "src: '/icons/favorite.svg'"), new RegExp(finding.pattern));
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'icon');
  assert.equal(cases.length, 20);
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []);
  const source = readFileSync('examples/material-showcase/src/app/material-assets.ts', 'utf8');
  const assets = Object.fromEntries([...source.matchAll(
    /export const MATERIAL_FAVORITE_ICON_(LIGHT|DARK)\s*=\s*'(data:image\/png;base64,[^']+)'/g,
  )].map(m => [m[1], m[2]]));
  assert.deepEqual(Object.keys(assets).sort(), ['DARK', 'LIGHT']);
  const svg = readFileSync('examples/material-showcase/public/icons/favorite.svg', 'utf8');
  const svgPath = one([...svg.matchAll(/<path fill="currentColor" d="([^"]+)"/g)])[1];
  const counts = { LIGHT: 0, DARK: 0 };
  for (const entry of cases) {
    const pair = modalInventoryTrees(inventory,
      `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    const result = inspect(entry, ...pair, assets, svgPath);
    counts[result.mode]++;
    assert.equal(result.coreDefectProven, false);
    assert.equal(result.rasterVerified, false);
    const changed = structuredClone(pair);
    changed[1].nodes.find(n => n.authored?.id === 'icon-primary').authored.src = '/icons/favorite.svg';
    assert.throws(() => inspect(entry, ...changed, assets, svgPath));
    assert.throws(() => inspect(entry, ...pair, assets, svgPath + 'Z'));
    const resized = structuredClone(pair);
    resized[1].nodes.find(n => n.authored?.id === 'icon-primary').resolvedStyle.width = '25px';
    assert.throws(() => inspect(entry, ...resized, assets, svgPath));
    const wrongDimensions = { ...assets };
    const png = Buffer.from(assets[result.mode].split(',')[1], 'base64');
    png.writeUInt32BE(48, 16);
    wrongDimensions[result.mode] = 'data:image/png;base64,' + png.toString('base64');
    const changedAsset = structuredClone(pair);
    changedAsset[1].nodes.find(n => n.authored?.id === 'icon-primary').authored.src = wrongDimensions[result.mode];
    assert.throws(() => inspect(entry, ...changedAsset, wrongDimensions, svgPath));
  }
  assert.deepEqual(counts, { LIGHT: 15, DARK: 5 });
});
