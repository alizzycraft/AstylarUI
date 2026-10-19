import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const reportFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
assert.equal(receipt(reportFile).sha256, '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const report = JSON.parse(readFileSync(reportFile));
const mapFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-XOU37TRR.js.map';
assert.equal(receipt(mapFile).sha256, report.captureProvenance.browserFiles.find(row => row.file === 'chunk-XOU37TRR.js.map').sha256);
const map = JSON.parse(readFileSync(mapFile)), index = map.sources.findIndex(name => name.endsWith('/element-creation.service.js'));
assert.ok(index >= 0);
function method(source) {
  const ast = ts.createSourceFile('owner.js', source, 99, true, ts.ScriptKind.JS), found = [];
  const visit = node => {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'layoutInlineChildren') found.push(node.getText(ast));
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(found.length, 1); return found[0];
}
function tokens(source) {
  const ast = ts.createSourceFile('method.js', `class Owner {${source}}`, 99, true, ts.ScriptKind.JS), out = [];
  const leaf = node => {
    const children = node.getChildren(ast);
    if (children.length) children.forEach(leaf); else if (node.getText(ast)) out.push(node.getText(ast));
  };
  leaf(ast);
  // Same explicit syntax-only formatting boundary as the retained text owners.
  return out.filter((token, i) => !(token === ',' && ['}', ']', ')'].includes(out[i + 1])) &&
    !(token === '(' && out[i + 2] === ')' && out[i + 3] === '=>' && /^[A-Za-z_$][\w$]*$/.test(out[i + 1])) &&
    !(token === ')' && out[i + 1] === '=>' && out[i - 2] === '(' && /^[A-Za-z_$][\w$]*$/.test(out[i - 1])));
}
const sourceFile = 'src/app/services/dom/elements/element-creation.service.ts';
const installedFile = `examples/material-showcase/${map.sources[index]}`;
const current = ts.transpileModule(readFileSync(sourceFile, 'utf8'), {
  compilerOptions: { target: 99, module: 99, experimentalDecorators: true },
}).outputText;
const captured = method(map.sourcesContent[index]);
assert.deepEqual(tokens(method(current)), tokens(captured));
assert.deepEqual(tokens(method(readFileSync(installedFile, 'utf8'))), tokens(captured));
assert.notDeepEqual(tokens(captured.replace('cursorY + marginBox.top', 'cursorY + marginBox.top + 1')), tokens(captured));
const observations = [];
let maximumPlacementResidual = 0, rejectedOffsetControls = 0;
for (const row of [...report.results, ...report.interactions]) {
  const trees = {};
  for (const [side, r] of Object.entries(row.inputTrees)) {
    assert.deepEqual(receipt(r.file), r); trees[side] = JSON.parse(readFileSync(r.file));
  }
  const root = trees.astylar.nodes.find(node => node.authored.id === 'divider-root');
  const box = row.geometry.elements.find(element => element.id === 'divider-root').actual;
  for (const id of ['divider-above', 'divider-below']) {
    const paragraph = trees.astylar.nodes.find(node => node.authored.id === `${id}-row`);
    const child = trees.astylar.nodes.find(node => node.authored.id === id);
    const measured = row.textAlignment.find(element => element.id === id).measurementGeometry;
    assert.equal(child.parent, paragraph.key); assert.equal(paragraph.parent, root.key);
    assert.equal(paragraph.resolvedStyle.position, 'absolute'); assert.equal(child.resolvedStyle.display, 'inline');
    assert.equal(paragraph.resolvedStyle.padding, '0'); assert.equal(child.resolvedStyle.margin, '0');
    const dimensions = new Map([['paragraph', { width: box.width, height: parseFloat(paragraph.resolvedStyle.height),
      padding: { top: 0, right: 0, bottom: 0, left: 0 } }],
    ['child', { width: measured.astylar.width, height: measured.astylar.height }]]);
    const calls = [];
    const Owner = new Function('positionRenderedCssBox', `return class Owner {${captured}}`)(
      (_render, _mesh, placement, containing) => calls.push({ placement, containing }));
    const owner = new Owner();
    owner.borderService = { parseBorderProperties: () => ({ width: 0 }) };
    owner.styleDefaults = { getElementTypeDefaults: () => ({ display: 'inline' }) };
    owner.createElement = () => ({ name: 'child', position: { z: 0 } });
    owner.parseMarginBox = () => ({ top: 0, right: 0, bottom: 0, left: 0 });
    const parentElement = { type: 'p', id: 'paragraph' }, childElement = { type: 'span', id: 'child' };
    const render = { actions: { style: { findStyleForElement: element => element === parentElement ? paragraph.resolvedStyle : child.resolvedStyle } } };
    owner.layoutInlineChildren({ context: { elementDimensions: dimensions, layoutBoxes: new Map() } }, render,
      [childElement], { name: 'paragraph' }, [], parentElement);
    assert.equal(calls.length, 1); assert.equal(calls[0].placement.y, 0);
    assert.equal(calls[0].containing.height, parseFloat(paragraph.resolvedStyle.height));
    // Parent width is deliberately only a fitting bound; this single-child
    // path cannot wrap. This is method execution, not a used-width measurement.
    assert.ok(box.width > measured.astylar.width);
    const predictedTop = box.top + parseFloat(root.resolvedStyle.borderWidth) + parseFloat(paragraph.resolvedStyle.top);
    const residual = measured.astylar.top - predictedTop;
    maximumPlacementResidual = Math.max(maximumPlacementResidual, Math.abs(residual));
    assert.ok(Math.abs(residual) < .0001, 'retained float projection does not fit authored-top decomposition');
    assert.throws(() => assert.ok(Math.abs(measured.astylar.top - (predictedTop + 1)) < .0001)); rejectedOffsetControls++;
    observations.push({ profile: row.profile, viewport: row.viewport.id, state: row.state ?? null, id,
      declaredParagraphHeight: paragraph.resolvedStyle.height, measuredInlineHeight: measured.astylar.height,
      ownerInlineY: calls[0].placement.y, predictedTop, measuredTop: measured.astylar.top, residual,
      referenceTop: measured.reference.top, evidence: row.inputTrees });
  }
}
assert.equal(observations.length, 48); assert.equal(rejectedOffsetControls, 48);
console.log(JSON.stringify({ producer: receipt('scripts/check-divider-inline-owner-placement.mjs'),
  report: receipt(reportFile), source: receipt(sourceFile), installed: receipt(installedFile), executableMap: receipt(mapFile),
  methodTokensSha256: hash(JSON.stringify(tokens(captured))), observations, maximumPlacementResidual,
  rejectedOffsetControls, changedMethodControl: 1,
  conclusion: 'All48 retained candidate inline top positions follow authored absolute paragraph top plus root border,with zero inline Y. The larger explicit paragraph height does not vertically center this single child. Existing authoring divergence precedes layout;no new generic projected-baseline displacement is shown.',
  boundary: 'Constrained single-child method execution with mocked creation/dimensions and retained frame decomposition. Not full layout execution,used parent width,native anonymous strut equivalence,actual projected glyph baseline,paint,current-browser or whole-case acceptance. The numeric residual bound tests this retained float decomposition,not a new rendering threshold.' }));
