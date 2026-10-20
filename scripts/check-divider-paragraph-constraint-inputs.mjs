import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';

// Bounded retained-input question: do these owners request any min/max clamp?
// This does not execute the complete dimension/layout pipeline or prove parity.
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
const moduleIndex = map.sources.findIndex(name => name.endsWith('/element-dimension.service.js'));
assert.ok(moduleIndex >= 0);
const sourceFile = 'src/app/services/dom/elements/element-dimension.service.ts';
const installedFile = `examples/material-showcase/${map.sources[moduleIndex]}`;
const current = ts.transpileModule(readFileSync(sourceFile, 'utf8'), {
  compilerOptions: { target: 99, module: 99, experimentalDecorators: true },
}).outputText;
const sources = [current, readFileSync(installedFile, 'utf8'), map.sourcesContent[moduleIndex]];
function blocks(source) {
  const ast = ts.createSourceFile('dimension.js', source, 99, true, ts.ScriptKind.JS);
  const methods = [];
  function visit(node) {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'calculateDimensions') methods.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(methods.length, 1);
  const statements = methods[0].body.statements;
  return ['Width', 'Height'].map(axis => {
    const start = statements.findIndex(s => ts.isVariableStatement(s) &&
      s.declarationList.declarations.some(d => d.name.getText(ast) === `min${axis}`));
    assert.ok(start >= 0);
    const selected = statements.slice(start, start + 4);
    assert.ok(ts.isVariableStatement(selected[1]));
    assert.equal(selected[1].declarationList.declarations[0].name.getText(ast), `max${axis}`);
    assert.ok(selected.slice(2).every(ts.isIfStatement));
    assert.match(selected[3].expression.getText(ast), new RegExp(`^max${axis} !== undefined`));
    return selected.map(s => s.getText(ast)).join('\n');
  });
}
function tokens(source) {
  // Parse templates before walking lexical leaves; a raw scanner requires
  // template-tail rescanning and otherwise consumes following code as text.
  const ast = ts.createSourceFile('blocks.js', source, 99, true, ts.ScriptKind.JS), result = [];
  assert.equal(ast.parseDiagnostics.length, 0);
  function visit(node) {
    const children = node.getChildren(ast);
    if (children.length) children.forEach(visit);
    else if (node.getText(ast)) result.push(node.getText(ast));
  }
  visit(ast);
  return result;
}
const extracted = sources.map(blocks);
for (const pair of extracted.slice(1)) for (let i = 0; i < 2; i++)
  assert.deepEqual(tokens(pair[i]), tokens(extracted[0][i]));
assert.notDeepEqual(tokens(extracted[0][0].replace('Math.max(width, minWidth)', 'Math.min(width, minWidth)')),
  tokens(extracted[0][0]));
const consumers = extracted.map(pair => pair.map((block, index) => {
  const axis = index === 0 ? 'width' : 'height', title = index === 0 ? 'Width' : 'Height';
  return new Function('style', axis, `content${title}`,
    `let ${axis}Source='probe';${block};return {value:${axis},source:${axis}Source};`);
}));
const properties = ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'];
const expectedNative = { minWidth: '0px', maxWidth: 'none', minHeight: '0px', maxHeight: 'none' };
const rows = [], treeReceipts = [];
let unchangedExecutions = 0, positiveControls = 0, rejectedMutations = 0;
function noClamps(style) {
  for (const key of properties) assert.equal(Object.hasOwn(style, key), false);
}
function nativeDefaults(style) {
  assert.deepEqual(Object.fromEntries(properties.map(key => [key, style[key]])), expectedNative);
}
for (const entry of [...report.results, ...report.interactions].filter(x => x.family === 'divider')) {
  const trees = {};
  for (const [side, input] of Object.entries(entry.inputTrees)) {
    assert.deepEqual(receipt(input.file), input); treeReceipts.push(input);
    trees[side] = JSON.parse(readFileSync(input.file));
  }
  for (const id of ['divider-above', 'divider-below']) {
    const leaf = trees.reference.nodes.find(n => n.attributes?.id === id);
    assert.ok(leaf); assert.equal(leaf.type, 'span');
    const parent = trees.reference.nodes.find(n => n.key === leaf.parent);
    assert.equal(parent.type, 'p');
    for (const [native, candidateId] of [[parent, `${id}-row`], [leaf, id]]) {
      const candidate = trees.astylar.nodes.find(n => n.authored?.id === candidateId);
      assert.ok(candidate); assert.equal(candidate.authored.type, native.type);
      const nativeStyle = trees.reference.styles[native.style]; nativeDefaults(nativeStyle);
      // Keep original declarations and omissions, not synthesized computed defaults.
      const relevant = key => /^(?:min|max)(?:width|height)$|^all$/i.test(key.replaceAll('-', ''));
      assert.ok(!Object.keys(native.inline).some(relevant));
      assert.ok(native.rules.map(i => trees.reference.rules[i]).every(rule =>
        !Object.keys(rule.declarations).some(relevant)));
      assert.ok(!Object.keys(candidate.authored.style ?? {}).some(relevant));
      assert.equal(candidate.authored.attributes?.style, undefined);
      // Raw capture trees carry errors arrays,not the inventory adapter's
      // synthesized ruleEvidenceComplete marker. Reject actual capture errors.
      assert.deepEqual(trees.reference.errors, []);
      assert.deepEqual(trees.astylar.errors, []);
      const applicableRules = trees.astylar.rules.filter(rule =>
        rootInitialSelectorCanApply(rule.selector, candidate.authored));
      assert.ok(applicableRules.every(rule => !Object.keys(rule).some(relevant)));
      const stages = {};
      for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
        const style = candidate[stage]; noClamps(style);
        stages[stage] = Object.fromEntries(properties.map(key => [key, { status: 'omitted' }]));
        for (const pair of consumers) for (let axis = 0; axis < 2; axis++) {
          const initial = axis === 0 ? 333 : 222;
          const actual = pair[axis].call({ parseLength() { throw new Error('Absent clamp must not parse'); } }, style, initial, 900);
          assert.deepEqual(actual, { value: initial, source: 'probe' }); unchangedExecutions++;
        }
      }
      for (const key of properties) {
        assert.throws(() => noClamps({ ...candidate.resolvedStyle, [key]: '1px' }));
        assert.throws(() => nativeDefaults({ ...nativeStyle, [key]: '1px' })); rejectedMutations += 2;
      }
      rows.push({ profile: entry.profile, viewport: entry.viewport.id, state: entry.state ?? 'static',
        target: candidateId, referenceKey: native.key, astylarKey: candidate.key,
        referenceDisplay: nativeStyle.display, astylarDisplay: candidate.resolvedStyle.display,
        reference: Object.fromEntries(properties.map(key => [key, nativeStyle[key]])), candidateStages: stages,
        trees: entry.inputTrees });
    }
  }
}
assert.equal(rows.length, 96); assert.equal(unchangedExecutions, 1728); assert.equal(rejectedMutations, 768);
for (const pair of consumers) for (let axis = 0; axis < 2; axis++) {
  const title = axis === 0 ? 'Width' : 'Height';
  const context = { parseLength(value) { assert.match(value, /^\d+px$/); return parseFloat(value); } };
  for (const [style, expected] of [
    [{ [`min${title}`]: '400px' }, 400], [{ [`max${title}`]: '200px' }, 200],
    [{ [`min${title}`]: '400px', [`max${title}`]: '200px' }, 400],
  ]) { assert.equal(pair[axis].call(context, style, 333, 900).value, expected); positiveControls++; }
}
assert.equal(positiveControls, 18);
console.log(JSON.stringify({ producer: receipt('scripts/check-divider-paragraph-constraint-inputs.mjs'),
  report: receipt(reportFile), provenance: receipt(provenanceFile), source: receipt(sourceFile),
  installed: receipt(installedFile), map: receipt(mapFile), capturedModuleSha256: hash(sources[2]),
  selectorExclusionHelper: receipt('tests/material-parity/root-initial-style-evidence.mjs'),
  selectorPrimitiveHelper: receipt('tests/material-parity/border-initial-input-evidence.mjs'),
  constraintBlockHashes: extracted[0].map(block => hash(JSON.stringify(tokens(block)))),
  cases: rows.length / 4, owners: rows.length, nativePropertySlots: rows.length * 4,
  candidateOwnStageSlots: rows.length * 12, unchangedExecutions, positiveControls, rejectedMutations,
  changedConsumerRejected: true, treeReceipts, rows,
  conclusion: 'No min/max clamp is authored on these96 retained paragraph/span owners. Native computed values are preserved as0px/none;all candidate own-stage fields remain omitted. Exact current/installed/captured constraint blocks conserve and leave positive probe dimensions unchanged without parser calls;positive min/max/conflict controls engage clamps.',
  boundary: 'Constraint-branch applicability only,not complete calculateDimensions execution or proof of equal dimensions. Native inline sizing applicability and browser computed defaults are not candidate serialization aliases. Does not close normal line boxes,alignment,inheritance,other properties,paint,current runtime,or any case. Existing absolute flow compensation remains a separate authoring failure.' }));
