import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { NullEngine, Scene, MeshBuilder } from '@babylonjs/core';

// Bounded source-executed controls, not a replacement rendering harness.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const previousFile = 'artifacts/material-parity/divider-outside-owner-position-visibility-boundary-20261102.log';
const previousBytes = fs.readFileSync(previousFile);
assert.equal(hash(previousBytes), '8036235d47e196f7e0ee6cdd1dca0c8496c36ea0e0e1bdc41a838745e42f838b');
const previous = JSON.parse((previousBytes[0] === 255 && previousBytes[1] === 254
  ? previousBytes.toString('utf16le') : previousBytes.toString()).replace(/^\ufeff/, ''));
assert.equal(previous.ownerPairs, 120);
for (const receipt of previous.treeReceipts)
  assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);

const mapFile = 'artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map';
const mapBytes = fs.readFileSync(mapFile);
assert.equal(hash(mapBytes), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
const map = JSON.parse(mapBytes);
const receipts = [];
function sources(relative) {
  const module = `node_modules/astylarui/dist/lib/${relative.replace(/\.ts$/, '.js')}`;
  const index = map.sources.indexOf(module);
  assert.ok(index >= 0, module);
  const file = `src/${relative}`, current = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const captured = map.sourcesContent[index];
  receipts.push({ captured: { module, sha256: hash(captured) }, current: { file, sha256: hash(current) } });
  return [captured, current];
}
function unique(source, predicate) {
  const ast = ts.createSourceFile('consumer.ts', source, 99, true);
  assert.deepEqual(ast.parseDiagnostics, []);
  const matches = [];
  const visit = node => { if (predicate(node, ast)) matches.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(matches.length, 1);
  return matches[0].getText(ast);
}
function method(source, name, bindings = {}) {
  const text = unique(source, n => ts.isMethodDeclaration(n) && n.name?.getText() === name);
  const compiled = ts.transpileModule(`class Probe { ${text} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, removeComments: true },
  }).outputText;
  return new (new Function('MeshBuilder', ...Object.keys(bindings), `${compiled}; return Probe;`)
    (MeshBuilder, ...Object.values(bindings)))();
}
function expression(source, name) {
  const declaration = unique(source, n => ts.isVariableDeclaration(n) && n.name.getText() === name);
  return new Function('style', 'resolvedStyle', `return (${declaration.slice(declaration.indexOf('=') + 1)});`);
}
function constraintProbe(source, axis) {
  const ast = ts.createSourceFile('constraints.ts', source, 99, true), methods = [];
  const visit = n => { if (ts.isMethodDeclaration(n) && n.name?.getText() === 'calculateDimensions') methods.push(n); ts.forEachChild(n, visit); };
  visit(ast); assert.equal(methods.length, 1);
  const statements = methods[0].body.statements;
  const start = statements.findIndex(n => ts.isVariableStatement(n) &&
    n.declarationList.declarations.some(d => d.name.getText() === `min${axis}`));
  assert.ok(start >= 0);
  const selected = statements.slice(start, start + 4);
  assert.ok(ts.isVariableStatement(selected[1]) && selected[1].declarationList.declarations[0].name.getText() === `max${axis}`);
  assert.ok(ts.isIfStatement(selected[2]) && ts.isIfStatement(selected[3]));
  const value = axis.toLowerCase(), reference = `content${axis}`;
  const parse = unique(source, n => ts.isMethodDeclaration(n) && n.name?.getText() === 'parseLength');
  const compiled = ts.transpileModule(`class Probe { ${parse}
    constrain(style, ${value}, ${reference}) { let ${value}Source = 'control';
      ${selected.map(n => n.getText(ast)).join('\n')} return ${value}; } }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, removeComments: true },
  }).outputText;
  return new (new Function(`${compiled}; return Probe;`)())();
}

// Check actual omitted input slots, not inferred default values from the triage.
let constraintOwnerPairs = 0, omittedConstraintSlots = 0;
let objectFitOwnerExclusions = 0, normalContentOwners = 0, svgContextOnlySlots = 0;
let maskedHeadingOwners = 0;
let omittedZeroMinHeightOwners = 0, matchingPercentMinHeightOwners = 0;
let blockContainerOwners = 0, containerOnlyInputSlots = 0;
const ownTransformInputs = [];
const ownClipInputs = [];
for (let i = 0; i < previous.treeReceipts.length; i += 2) {
  const a = JSON.parse(fs.readFileSync(previous.treeReceipts[i].file));
  const b = JSON.parse(fs.readFileSync(previous.treeReceipts[i + 1].file));
  // Reject scope expansion rather than assuming a future SVG/image/control
  // owner or generated content is covered by this HTML-only applicability proof.
  assert.ok(a.nodes.every(n => ['main', 'p', 'h1', 'section', 'span', 'mat-divider'].includes(n.type)));
  assert.ok(a.nodes.every(n => (n.pseudoElements ?? []).every(p => p.generated !== true)));
  assert.ok(b.nodes.every(n => !n.authored.type || ['main', 'p', 'h1', 'section', 'span', 'div'].includes(n.authored.type)));
  const owners = [['page', a.nodes.find(n => n.key === 'frame')],
    ['eyebrow', a.nodes.find(n => n.attributes?.class === 'eyebrow')],
    ['title', a.nodes.find(n => n.type === 'h1')],
    ...['divider-above', 'divider-below'].map(id => {
      const leaf = a.nodes.find(n => n.attributes?.id === id);
      assert.ok(leaf); return [`${id}-row`, a.nodes.find(n => n.key === leaf.parent)];
    })];
  for (const [id, native] of owners) {
    assert.ok(native);
    if (id === 'eyebrow' || id === 'title') {
      assert.equal(a.styles[native.style].opacity, '0');
      maskedHeadingOwners++;
    }
    const candidates = b.nodes.filter(n => n.authored?.id === id); assert.equal(candidates.length, 1);
    const referenceClip = Object.fromEntries(['overflowX', 'overflowY', 'clipPath', 'clip']
      .map(field => [field, a.styles[native.style][field]]));
    assert.deepEqual(referenceClip, { overflowX: 'visible', overflowY: 'visible', clipPath: 'none', clip: 'auto' });
    for (const stage of ['resolvedStyle', 'normalResolvedStyle'])
      for (const field of ['overflow', 'overflowX', 'overflowY', 'clipPath', 'clip'])
        assert.equal(candidates[0][stage][field], undefined);
    ownClipInputs.push({ referenceTree: previous.treeReceipts[i], id, referenceClip,
      candidate: 'overflow/overflowX/overflowY/clipPath/clip omitted in normal and effective declaration snapshots' });
    assert.equal(a.styles[native.style].transform, 'none');
    assert.equal(candidates[0].resolvedStyle.transform, undefined);
    assert.equal(candidates[0].normalResolvedStyle.transform, undefined);
    assert.equal(candidates[0].resolvedStyle.transformOrigin, undefined);
    assert.match(a.styles[native.style].transformOrigin, /^-?[\d.]+px -?[\d.]+px(?: 0px)?$/);
    ownTransformInputs.push({ referenceTree: previous.treeReceipts[i], id,
      referenceTransform: a.styles[native.style].transform,
      referenceUsedOrigin: a.styles[native.style].transformOrigin,
      candidateTransform: '<omitted>', candidateOrigin: '<omitted>' });
    assert.equal(a.styles[native.style].display, 'block');
    assert.equal(candidates[0].resolvedStyle.display, 'block');
    assert.equal(candidates[0].normalResolvedStyle.display, 'block');
    for (const [field, expected] of [['flexDirection', 'row'], ['flexWrap', 'nowrap'],
      ['gridTemplateColumns', 'none'], ['gridTemplateRows', 'none']]) {
      assert.equal(a.styles[native.style][field], expected);
      assert.equal(candidates[0].resolvedStyle[field], field.startsWith('grid') ? undefined : expected);
      containerOnlyInputSlots++;
    }
    blockContainerOwners++;
    if (id === 'page') {
      assert.equal(a.styles[native.style].minHeight, '100%');
      assert.equal(candidates[0].resolvedStyle.minHeight, '100%');
      assert.equal(candidates[0].normalResolvedStyle.minHeight, '100%');
      matchingPercentMinHeightOwners++;
    } else {
      assert.equal(a.styles[native.style].minHeight, '0px');
      assert.equal(candidates[0].resolvedStyle.minHeight, undefined);
      assert.equal(candidates[0].normalResolvedStyle.minHeight, undefined);
      omittedZeroMinHeightOwners++;
    }
    for (const [property, reference] of [['minWidth', '0px'], ['maxWidth', 'none'], ['maxHeight', 'none']]) {
      assert.equal(a.styles[native.style][property], reference);
      assert.equal(candidates[0].resolvedStyle[property], undefined);
      assert.equal(candidates[0].normalResolvedStyle[property], undefined);
      omittedConstraintSlots++;
    }
    assert.ok(['main', 'p', 'h1'].includes(native.type));
    assert.equal(a.styles[native.style].objectFit, 'fill');
    assert.equal(candidates[0].resolvedStyle.objectFit, undefined);
    objectFitOwnerExclusions++;
    assert.equal(a.styles[native.style].content, 'normal');
    assert.equal(candidates[0].resolvedStyle.content, undefined);
    assert.equal(native.ownText, candidates[0].authored.textContent ?? candidates[0].authored.value ?? '');
    normalContentOwners++;
    for (const [property, value] of [['fill', 'rgb(0, 0, 0)'], ['stroke', 'none'], ['strokeWidth', '1px']]) {
      assert.equal(a.styles[native.style][property], value);
      assert.equal(candidates[0].resolvedStyle[property], undefined);
      svgContextOnlySlots++;
    }
    constraintOwnerPairs++;
  }
}
assert.equal(constraintOwnerPairs, 120); assert.equal(omittedConstraintSlots, 360);
assert.equal(maskedHeadingOwners, 48);
assert.equal(omittedZeroMinHeightOwners, 96); assert.equal(matchingPercentMinHeightOwners, 24);
assert.equal(blockContainerOwners, 120); assert.equal(containerOnlyInputSlots, 480);
assert.equal(ownClipInputs.length, 120);
assert.ok(fs.readFileSync('examples/material-showcase/src/app/reference.component.ts', 'utf8')
  .includes('.benchmark>.eyebrow,.benchmark>h1{opacity:0}'));
assert.equal(objectFitOwnerExclusions, 120); assert.equal(normalContentOwners, 120); assert.equal(svgContextOnlySlots, 360);
let constraintControls = 0;
const explicitNoneObservations = [];
for (const [version, source] of sources('app/services/dom/elements/element-dimension.service.ts').entries()) {
  for (const axis of ['Width', 'Height']) {
    const probe = constraintProbe(source, axis);
    const min = `min${axis}`, max = `max${axis}`;
    for (const [style, initial, expected] of [
      [{}, 80, 80], [{ [min]: '0px' }, 80, 80], [{ [max]: 'none' }, 80, 0],
      [{ [max]: '40px' }, 80, 40], [{ [max]: '100px' }, 80, 80],
      [{ [min]: '120px' }, 80, 120], [{ [min]: '120px', [max]: '40px' }, 80, 120],
      [{ [max]: '50%' }, 150, 100], [{ [min]: '25%' }, 20, 50], [{ [max]: '0px' }, 80, 0],
    ]) { assert.equal(probe.constrain(style, initial, 200), expected); constraintControls++; }
    explicitNoneObservations.push({ version: version === 0 ? 'captured' : 'current', axis,
      omittedResult: probe.constrain({}, 80, 200), explicitNoneResult: probe.constrain({ [max]: 'none' }, 80, 200),
      firstDivergence: 'parseLength(none) returns 0 before the maximum-size clamp',
      classification: 'source-demonstrated divergence; public-API rendering reproduction still required' });
  }
}
let diagnosticControls = 0;
let transformParserControls = 0;
for (const source of sources('app/services/dom/elements/css-transform.ts')) {
  const declaration = unique(source, n => ts.isFunctionDeclaration(n) && n.name?.text === 'parseCssTransform')
    .replace(/^export\s+/, '');
  const compiled = ts.transpileModule(declaration, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const parse = new Function(`${compiled};return parseCssTransform;`)();
  for (const value of [undefined, '', 'none', ' NONE ']) {
    assert.equal(parse(value), null); transformParserControls++;
  }
  assert.deepEqual(parse('translate(1.25px, -2.5px)').translate, { x: 1.25, y: -2.5, z: 0 });
  assert.deepEqual(parse('scale(2)').scale, { x: 2, y: 2, z: 1 });
  assert.notEqual(parse('translate(0px, 0px)'), null);
  transformParserControls += 3;
}
assert.equal(ownTransformInputs.length, 120);
let containerDispatchControls = 0;
for (const [file, name, active] of [
  ['app/services/dom/elements/flex.service.ts', 'isFlexContainer', ['flex', 'inline-flex']],
  ['app/services/dom/elements/grid.service.ts', 'isGridContainer', ['grid', 'inline-grid']],
]) for (const source of sources(file)) {
  const probe = method(source, name);
  for (const display of [undefined, 'block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'FLEX']) {
    const style = { display, flexDirection: 'column', flexWrap: 'wrap', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '20px' };
    const render = { actions: { style: { findStyleForElement: () => style } } };
    assert.equal(probe[name](render, {}, [], { context: { elementStyles: new Map() } }), active.includes(display?.toLowerCase()));
    containerDispatchControls++;
  }
}
const percentageHeightRouting = [];
for (const [version, source] of sources('app/services/dom/elements/element-creation.service.ts').entries()) {
  const probe = method(source, 'definiteContainingBlockContentHeight');
  probe.hasFlexAssignedHeight = method(source, 'hasFlexAssignedHeight').hasFlexAssignedHeight;
  const parent = { id: 'root-body' }, page = { id: 'page' };
  probe.ancestry = { getParent: () => parent };
  const dom = { context: { elementDimensions: new Map([['root-body', {
    height: 600, padding: { top: 10, bottom: 20 },
  }]]), elementStyles: new Map(), elements: new Map() } };
  assert.equal(probe.definiteContainingBlockContentHeight(dom, page), 570);
  const dimensions = dom.context.elementDimensions.get('root-body');
  parent.id = 'auto-parent'; dom.context.elementDimensions.set(parent.id, dimensions);
  assert.equal(probe.definiteContainingBlockContentHeight(dom, page), undefined);
  dom.context.elementStyles.set(parent.id, { normal: { height: 'auto' } });
  assert.equal(probe.definiteContainingBlockContentHeight(dom, page), undefined);
  dom.context.elementStyles.set(parent.id, { normal: { height: '600px' } });
  assert.equal(probe.definiteContainingBlockContentHeight(dom, page), 570);
  dom.context.elementStyles.set(parent.id, { normal: { height: 'auto' } });
  dom.context.elements.set(parent.id, { metadata: { astylarFlexAssignedSize: { width: 800, height: 600 } } });
  assert.equal(probe.definiteContainingBlockContentHeight(dom, page), 570);
  const parser = method(source, 'parseAutoBlockConstraint');
  assert.equal(parser.parseAutoBlockConstraint('100%', 16, 570), 570);
  assert.equal(parser.parseAutoBlockConstraint('100%', 16, undefined), undefined);
  percentageHeightRouting.push({ version: version ? 'current' : 'captured', controls: 7,
    rootContentHeight: 570, indefiniteParentReference: 'undefined',
    boundary: 'Actual source methods with explicit CSS registry inputs and ancestry stub; not native containing-block semantics, actual page ancestor/registry execution or complete percentage-height support.' });
}
for (const source of sources('lib/astylar-diagnostics.ts')) {
  const declaration = unique(source, n => ts.isVariableDeclaration(n) && n.name.getText() === 'styleProperties');
  const styleProperties = new Function(`return (${declaration.slice(declaration.indexOf('=') + 1)});`)();
  const probe = method(source, 'validateStyle', { styleProperties }), warnings = [];
  probe.report = value => warnings.push(value);
  probe.fail = () => { throw new Error('malformed style control'); };
  const input = { selector: '#box', maxWidth: 'none', maxHeight: 'none' };
  probe.validateStyle(input, 'styles[0]');
  assert.deepEqual(input, { selector: '#box', maxWidth: 'none', maxHeight: 'none' });
  assert.deepEqual(warnings, []); diagnosticControls += 2;
  probe.validateStyle({ selector: '#box', unknownConstraintControl: 'none' }, 'styles[0]');
  assert.equal(warnings.length, 1); assert.equal(warnings[0].code, 'unsupported-style-property'); diagnosticControls++;
  assert.throws(() => probe.validateStyle(null, 'styles[0]'), /malformed style control/); diagnosticControls++;
}

// Reuse the already-confirmed public height reduction, not another capture or
// a new defect. Its recorded commit predates the dirty fixture used at capture.
const historicalHeightEvidence = [];
for (const [dpr, reportSha256] of [
  [1, '9d543522ec810326a21a70f2380927e89004bdeaa76b1e39bb0e16e524384aaf'],
  [2, '328717504126767c10146f819650f6de4afb905db948a80003b1b87a385dd058'],
]) {
  const directory = `artifacts/material-parity/dialog-sizing-trace-80efa42-v2-dpr${dpr}`;
  const resultBytes = fs.readFileSync(`${directory}/result.json`); assert.equal(hash(resultBytes), reportSha256);
  const report = JSON.parse(resultBytes), provenanceBytes = fs.readFileSync(`${directory}/provenance.json`);
  const provenance = JSON.parse(provenanceBytes), bundle = fs.readFileSync(`${directory}/audit.js`);
  assert.equal(hash(bundle), provenance.bundleSha256);
  assert.equal(hash(bundle), provenance.runtimeAssets.find(r => r.url === '/audit.js').sha256);
  const git = (revision, file) => execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 8_000_000 });
  assert.equal(hash(git(provenance.commit, 'scripts/audit-overlay-layout-stage.mjs')), provenance.runnerSha256);
  const spec = 'src/parity/overlay-layout-stage.audit.spec.ts';
  assert.equal(hash(git('2a6b8d07', spec)), provenance.inputs.find(r => r.file === spec).sha256);
  assert.notEqual(hash(git(provenance.commit, spec)), provenance.inputs.find(r => r.file === spec).sha256);
  for (const file of ['src/app/services/dom/elements/element-dimension.service.ts', 'src/app/services/dom/elements/flex.service.ts']) {
    const receipt = provenance.compiledReceipts.find(r => r.source === file); assert.ok(receipt);
    assert.equal(hash(git(provenance.commit, file)), receipt.sourceSha256);
  }
  assert.deepEqual(report.errors, []);
  const noneName = 'dialog-intrinsic-explicit-autoheight-nolimit-autowidth';
  const omittedName = 'dialog-intrinsic-explicit-autoheight-omitlimit-autowidth';
  const none = report.observations.find(r => r.composition === noneName);
  const omitted = report.observations.find(r => r.composition === omittedName);
  assert.ok(none && omitted);
  for (const id of ['wrapper', 'container', 'inner', 'pane']) {
    const a = none.observations.find(r => r.id === id), b = omitted.observations.find(r => r.id === id);
    assert.equal(a.reference.height, 104); assert.equal(a.local.height, 0); assert.equal(a.css.height, 0); assert.equal(a.projected.height, 0);
    assert.equal(b.reference.height, 104); assert.equal(b.local.height, 104); assert.equal(b.css.height, 104); assert.equal(b.projected.height, 104);
  }
  const noneCalls = none.sizingTrace.find(r => r.method === 'parseIntrinsicPixelLength').calls.filter(r => r.value === 'none');
  assert.equal(noneCalls.length, 11); assert.ok(noneCalls.every(r => r.result === 0));
  assert.equal(omitted.sizingTrace.find(r => r.method === 'parseIntrinsicPixelLength').calls.filter(r => r.value === 'none').length, 0);
  assert.equal(report.result.results.find(r => r.description.includes(`${noneName} at`)).status, 'failed');
  assert.equal(report.result.results.find(r => r.description.includes(`${omittedName} at`)).status, 'passed');
  historicalHeightEvidence.push({ directory, reportSha256, provenanceSha256: hash(provenanceBytes), bundleSha256: hash(bundle),
    recordedCommit: provenance.commit, exactFixtureRevision: '2a6b8d07', browser: report.browser,
    noneParserCalls: noneCalls.length, panels: 4, noneHeight: 0, omittedHeight: 104, nativeHeight: 104,
    boundary: 'Previously confirmed historical public height reduction; focused recipe/core-source and bundle receipts checked, not all transitive inputs or fresh current-browser rendering. Width-none public rendering remains separate.' });
}
let positionControls = 0;
const parent = {}, viewport = {}, dom = { context: { elements: new Map([['root-body', viewport]]) } };
for (const source of sources('app/services/dom/elements/element-dimension.service.ts')) {
  const probe = method(source, 'resolveLayoutParent'), positioned = expression(source, 'usesPositionedContainingBlock');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    const style = position === undefined ? {} : { position };
    assert.equal(probe.resolveLayoutParent(dom, style, parent), position === 'fixed' ? viewport : parent);
    assert.equal(positioned(style), position === 'absolute' || position === 'fixed');
    positionControls += 2;
  }
  assert.equal(probe.resolveLayoutParent({ context: { elements: new Map() } }, { position: 'fixed' }, parent), parent);
  positionControls++;
}
for (const source of sources('app/services/dom/elements/element-creation.service.ts')) {
  const removed = expression(source, 'isRemovedFromFlow');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    assert.equal(removed(undefined, { position }), position === 'absolute' || position === 'fixed'); positionControls++;
  }
}
for (const source of sources('app/services/dom/elements/flex.service.ts')) {
  const probe = method(source, 'classifyFlexChild');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    assert.equal(probe.classifyFlexChild({ position }), ['absolute', 'fixed'].includes(position) ? 'positioned' : 'flow');
    assert.equal(probe.classifyFlexChild({ position, display: 'none' }), 'hidden'); positionControls += 2;
  }
}
for (const source of sources('app/services/dom/positioning/stacking-context.manager.ts')) {
  const probe = method(source, 'establishesStackingContext');
  for (const position of [undefined, 'static', 'relative', 'absolute', 'fixed']) {
    assert.equal(probe.establishesStackingContext({ position, zIndex: '7' }), position !== undefined && position !== 'static');
    assert.equal(probe.establishesStackingContext({ position, zIndex: 'auto' }), false); positionControls += 2;
  }
}

// Execute only the actual clipping entry guard. A rejecting parent traps any
// geometry/material work; positive controls must reach it. This does not test
// clipping geometry, ancestors, shader composition or browser pixels.
let overflowEntryControls = 0;
for (const source of sources('app/services/dom/elements/overflow-clip.service.ts')) {
  const reached = new Error('clip geometry reached');
  const probe = method(source, 'apply', { resolveCssViewportRect() { throw reached; } });
  const parent = new Proxy({}, { get() { throw reached; } });
  for (const style of [{}, { overflow: undefined }, { overflow: 'visible' },
    { overflowX: 'hidden' }, { clipPath: 'inset(0)' }]) {
    assert.doesNotThrow(() => probe.apply(parent, style, new Map(), () => { throw reached; }));
    overflowEntryControls++;
  }
  for (const overflow of ['hidden', 'clip', 'auto', 'scroll']) {
    assert.throws(() => probe.apply(parent, { overflow }, new Map(), () => { throw reached; }),
      error => error === reached);
    overflowEntryControls++;
  }
}
assert.equal(overflowEntryControls, 18);

// Actual core mesh construction on the installed matching Babylon version.
// This tests initial visibility flags, not CSS visibility support or raster paint.
const engine = new NullEngine(), scene = new Scene(engine);
let meshControls = 0;
try {
  for (const source of sources('app/services/babylon-mesh.service.ts')) {
    const probe = method(source, 'createPlane'); probe.scene = scene;
    const mesh = probe.createPlane('omitted-owner-visibility', 40, 20);
    assert.equal(mesh.isVisible, true); assert.equal(mesh.visibility, 1); assert.equal(mesh.isEnabled(), true);
    mesh.isVisible = false; assert.equal(mesh.isVisible, false);
    mesh.isVisible = true; mesh.visibility = 0; assert.equal(mesh.visibility, 0);
    meshControls += 5; mesh.dispose();
  }
} finally { scene.dispose(); engine.dispose(); }
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-omitted-owner-consumers.mjs',
  sha256: hash(fs.readFileSync('scripts/check-divider-omitted-owner-consumers.mjs')) },
  previous: { file: previousFile, sha256: hash(previousBytes) },
  sourceMap: { file: mapFile, sha256: hash(mapBytes) }, sources: receipts,
  positionControls, meshControls, constraintOwnerPairs, omittedConstraintSlots, constraintControls, explicitNoneObservations,
  diagnosticControls, historicalHeightEvidence,
  ownTransformInputs, transformParserControls,
  ownClippingInputs: { observations: ownClipInputs, overflowEntryControls,
    conclusion: 'All120 exact owners retain native visible overflow axes,none clipPath and auto clip against candidate omissions. Captured/current OverflowClipService.apply returns before geometry/material access for omitted or visible overflow;four positive shorthand values enter geometry.',
    boundary: 'Own-input snapshots and this one core entry guard only. Axis-only and clipPath positive tokens do not activate this guard;their other consumers/support remain unproved. Not ancestor/viewport clipping,call-site style propagation,legacy clip applicability,shader/raster paint,current rendering or whole-case equivalence. Do not normalize absent declarations to native computed values.' },
  ownTransformBoundary: '120 native none versus omitted candidate transform requests route to null in captured/current parser controls. Preserve all raw used-origin pixels and candidate omissions. This is own-parser applicability only,not origin/default equivalence,ancestor transforms,stacking,containing blocks,projection or paint. Zero translation remains a non-null transform;do not normalize it to none.',
  containerInputRouting: { blockContainerOwners, containerOnlyInputSlots, containerDispatchControls,
    conclusion: 'All120 exact owners have block display on both sides. Captured/current flex/grid dispatch predicates reject block even with non-default flex/track requests; positive flex/grid display controls select their own path.',
    boundary: 'Own-container dispatch and four recorded fields only; not flex/grid item roles,block content alignment,gaps,all downstream consumers,native used formatting,anonymous layout or whole-case equivalence.' },
  percentageHeightRouting,
  minimumHeightInputs: { omittedZeroMinHeightOwners, matchingPercentMinHeightOwners,
    conclusion: '96 non-page owners omit candidate minHeight against native 0px; actual captured/current height-constraint controls preserve a positive height for both omission and explicit zero. All24 pages explicitly retain matching 100% tokens.',
    boundary: 'Constraint block and recorded inputs only. Percentage containing-height definiteness, box sizing, intrinsic sizing and other layout consumers remain separate; equal 100% tokens do not prove used page heights.' },
  failedHeadingControlBoundary: { maskedHeadingOwners,
    conclusion: 'All 48 retained native heading owners have opacity:0. Zero-change heading color controls cannot establish visible fill/stroke applicability. Preserve failed November2 trials; do not promote them to passes or unmask the reference.',
    inspectionPromoted: false },
  outsideOwnerApplicability: {
    objectFitOwnerExclusions, normalContentOwners, svgContextOnlySlots,
    objectFit: 'Inactive on the 120 exact non-replaced main/p/h1 owners; no image/replacement content is captured. Not an omitted-to-fill normalization for arbitrary elements.',
    content: '120 exact normal-content owners preserve authored own text, with no generated pseudo-content in their recorded trees. Preserve raw normal instead of substituting a draft computed-value spelling.',
    svgFields: '360 default-valued slots with no recorded SVG descendants. Context only: not blanket HTML text fill/stroke applicability, inherited-paint support or raster acceptance.',
    primaryReferences: [
      'https://www.w3.org/TR/2023/CRD-css-images-3-20231218/#the-object-fit',
      'https://www.w3.org/TR/2025/WD-css-content-3-20251204/#content-property',
      'https://www.w3.org/TR/SVG2/painting.html#FillProperty',
    ],
    boundary: 'Exact retained trees only. Not complete anonymous-content, glyph/material, inherited SVG paint, current-browser or whole-case closure; drafts are context, not implementation acceptance.',
  },
  conclusion: 'Omitted and explicit static share the inspected captured/current layout-parent, containing-block, block/flex-flow and stacking branches. Captured/current plane construction starts with visible flags; absence in declaration snapshots is not a hidden flag.',
  constraintConclusion: 'The 360 recorded omitted constraint fields do not invoke a maximum clamp; minWidth:0 does not change the positive control size. Explicit maximum none instead clamps to zero in captured/current source blocks. This separate source divergence must not be hidden by rewriting none to omission; it is not an observed explicit-none input on these 120 owner pairs.',
  boundary: 'Source-executed routing/constraint blocks and NullEngine initial flags only. Not complete used geometry, public-API explicit-none rendering, CSS visibility inheritance/support, every visual owner, compositing/clipping, browser raster, current runtime or whole-case closure.',
  inspectionPromoted: false, currentRenderingAccepted: false }, null, 2));
