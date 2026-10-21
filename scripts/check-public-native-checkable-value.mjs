import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const esbuild = createRequire(`${process.cwd()}/examples/material-showcase/package.json`)('esbuild');

// Read-only independent replay of retained failures, not a rendering pass.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const read = file => readFileSync(file);
const json = file => JSON.parse(read(file));
const runs = ['public-native-checkable-value-20261021', 'public-native-checkable-value-repeat-20261021'];
const names = ['createCheckbox', 'createRadioButton', 'createLabelMesh'];
function methods(file) {
  const ast = ts.createSourceFile(file, read(file).toString(), ts.ScriptTarget.Latest, true);
  const owners = [];
  function visit(node) {
    if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) &&
      ['CheckboxManager', '_CheckboxManager'].includes(node.name?.text)) owners.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.equal(owners.length, 1);
  return Object.fromEntries(names.map(name => {
    const found = owners[0].members.filter(member => member.name?.getText(ast) === name);
    assert.equal(found.length, 1);
    return [name, found[0].getText(ast)];
  }));
}
function canonical(method) {
  // Compile types away without minifying semantics. The only runtime binding
  // rewrites are compiler-renamed first parameters and flattened MeshBuilder.
  let code = esbuild.transformSync(`class Probe {${method}}`, { loader: 'ts',
    target: 'es2022', format: 'esm' }).code;
  code = code.replace(/\bBABYLON\.MeshBuilder\.CreatePlane\b/g, 'MeshBuilder.CreatePlane');
  const tokens = [];
  const parsed = ts.createSourceFile('method.js', code, ts.ScriptTarget.Latest, true);
  assert.equal(parsed.parseDiagnostics.length, 0);
  function collect(node) {
    if (ts.isShorthandPropertyAssignment(node)) {
      collect(node.name);
      tokens.push([ts.SyntaxKind.ColonToken, ':']);
      collect(node.name);
      return;
    }
    const children = node.getChildren(parsed);
    if (children.length) { children.forEach(collect); return; }
    const kind = node.kind;
    if (kind === ts.SyntaxKind.EndOfFileToken || kind === ts.SyntaxKind.SyntaxList) return;
    let value = ts.isStringLiteral(node) ? node.text : node.getText(parsed);
    if (kind === ts.SyntaxKind.Identifier && ['element2', 'input2'].includes(value)) {
      assert.notEqual(tokens.at(-1)?.[0], ts.SyntaxKind.DotToken, 'Do not rename a property');
      value = value.slice(0, -1);
    }
    tokens.push([kind, value]);
  }
  collect(parsed);
  // Optional trailing call-argument punctuation only; array elisions untouched.
  return tokens.filter((token, i) => !(token[0] === ts.SyntaxKind.CommaToken &&
    tokens[i + 1]?.[0] === ts.SyntaxKind.CloseParenToken));
}
const currentMethods = methods('src/app/services/dom/input/checkbox.manager.ts');
const installedMethods = methods('examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/checkbox.manager.js');
for (const name of names) assert.deepEqual(canonical(currentMethods[name]), canonical(installedMethods[name]), name);
assert.match(currentMethods.createLabelMesh, /const textContent = input\.value \|\| 'Option'/);
for (const name of ['createCheckbox', 'createRadioButton']) {
  assert.match(currentMethods[name], /element\.value \|\| element\.textContent/);
  assert.match(currentMethods[name], /this\.createLabelMesh\(/);
  const changed = currentMethods[name].replace('element.value || element.textContent', 'element.textContent');
  assert.notDeepEqual(canonical(changed), canonical(currentMethods[name]), 'Label-creation branch drift must reject');
}
for (const [before, after] of [["input.value || 'Option'", "input.textContent || 'Option'"],
  ["input.value || 'Option'", "input.value || 'Other'"]]) {
  assert.ok(currentMethods.createLabelMesh.includes(before));
  assert.notDeepEqual(canonical(currentMethods.createLabelMesh.replace(before, after)),
    canonical(currentMethods.createLabelMesh), 'Label text-source/fallback drift must reject');
}
let previous;
for (const run of runs) {
  const root = `artifacts/material-parity/${run}`;
  const report = json(`${root}/latest-report.json`);
  const provenance = json(`${root}/provenance.json`);
  assert.deepEqual(report.provenance, provenance);
  assert.equal(hash(read(`${root}/producer.mjs`)), provenance.producer.sha256);
  assert.equal(hash(read(provenance.producer.file)), provenance.producer.sha256);
  assert.equal(hash(read(`${root}/audit.js`)), provenance.bundleSha256);
  const bundledMethods = methods(`${root}/audit.js`);
  for (const name of names) assert.deepEqual(canonical(currentMethods[name]), canonical(bundledMethods[name]), `${run}:${name}`);
  for (const receipt of provenance.bundleInputs) assert.equal(hash(read(receipt.file)), receipt.sha256, receipt.file);
  for (const overlay of provenance.overlays) {
    assert.equal(hash(read(overlay.file)), overlay.originalSha256);
    assert.equal(hash(overlay.compiledSource), overlay.compiledSha256);
  }
  assert.equal(report.accepted, false);
  assert.deepEqual(report.errors, []);
  assert.equal(report.captures.length, 16);
  assert.equal(report.failures.length, 4);
  const images = new Map();
  const captures = new Map();
  for (const capture of report.captures) {
    const key = `${capture.kind}:${capture.dpr}:${capture.mode}:${capture.variant}`;
    assert.equal(captures.has(key), false, 'Duplicate capture');
    captures.set(key, capture);
    const bytes = read(`${root}/${capture.screenshot.file}`);
    assert.equal(hash(bytes), capture.screenshot.sha256);
    images.set(key, PNG.sync.read(bytes));
    assert.equal(capture.disposed.disposed, true);
    if (capture.mode === 'reference') {
      assert.equal(capture.control.native.type, capture.kind);
      assert.equal(capture.control.native.textContent, '');
      assert.equal(capture.control.native.value, capture.variant === 'value' ? 'VALUEONLY' : 'on');
    } else {
      assert.equal(capture.control.manager.type, capture.kind);
      assert.deepEqual(capture.control.manager.labelMesh,
        capture.variant === 'value' ? { name: 'label_target', visible: true } : null);
    }
  }
  const comparisons = [];
  for (const dpr of [1, 2]) for (const kind of ['radio', 'checkbox']) {
    for (const variant of ['omitted', 'value']) {
      assert.deepEqual(captures.get(`${kind}:${dpr}:reference:${variant}`).snapshot.site,
        captures.get(`${kind}:${dpr}:astylar:${variant}`).snapshot.site);
    }
    for (const mode of ['reference', 'astylar']) {
      const a = images.get(`${kind}:${dpr}:${mode}:omitted`);
      const b = images.get(`${kind}:${dpr}:${mode}:value`);
      assert.equal(a.width, 320 * dpr); assert.equal(a.height, 180 * dpr);
      assert.equal(b.width, a.width); assert.equal(b.height, a.height);
      const changed = [];
      for (let pixel = 0; pixel < a.width * a.height; pixel++) {
        if ([0, 1, 2, 3].some(channel => a.data[pixel * 4 + channel] !== b.data[pixel * 4 + channel])) changed.push(pixel);
      }
      let bounds = null;
      if (changed.length) {
        bounds = { left: a.width, top: a.height, right: -1, bottom: -1 };
        for (const pixel of changed) {
          const x = pixel % a.width, y = Math.floor(pixel / a.width);
          bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
          bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
        }
      }
      comparisons.push({ mode, dpr, kind, changedPixels: changed.length, bounds });
      assert.equal(changed.length, mode === 'reference' ? 0 : dpr === 1 ? 580 : 1903);
    }
  }
  assert.deepEqual(comparisons, report.comparisons);
  assert.deepEqual(report.failures, comparisons.filter(row => row.changedPixels).map(row =>
    ({ ...row, assertion: 'Form value alone must not change input pixels' })));
  if (previous) assert.deepEqual(comparisons, previous);
  previous = comparisons;
  console.log(JSON.stringify({ run, authenticatedInputs: provenance.bundleInputs.length,
    screenshots: images.size, failuresPreserved: report.failures.length, browser: report.browser }));
}
console.log('Retained pixel/provenance and three complete owning-method bindings pass; four semantic drift controls reject. Renderer failures remain.');
