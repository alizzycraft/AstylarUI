import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { inspectCursorDefaults } from '../../scripts/audit-public-cursor-defaults.mjs';

export const cursorArtifactRoot = 'artifacts/material-parity/public-cursor-defaults-audit-v2';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const installedRoot = 'examples/material-showcase/node_modules/astylarui/dist/lib/';
const pointerFile = 'src/app/services/dom/interaction/pointer-interaction.service.ts';
const defaultsFile = 'src/app/config/browser-defaults.ts';
const registryFile = 'src/app/services/dom/interaction/text-interaction-registry.service.ts';
const typeDefaultsFile = 'src/app/services/dom/style-defaults.service.ts';
const installed = file => installedRoot + file.slice(4).replace(/\.ts$/, '.js');
const compile = source => ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, removeComments: true,
} }).outputText;

export function cursorMethodProjection(source, names) {
  const tree = ts.createSourceFile('cursor.ts', source, ts.ScriptTarget.Latest, true), found = new Map();
  function visit(node) {
    if (ts.isMethodDeclaration(node) && names.includes(node.name?.getText(tree))) {
      const name = node.name.getText(tree); assert.ok(!found.has(name)); found.set(name, node.getText(tree));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(found.size, names.length);
  return compile(`class Proof { ${names.map(n => found.get(n)).join('\n')} }`);
}

export function cursorDefaultsProjection(source) {
  const tree = ts.createSourceFile('defaults.ts', source, ts.ScriptTarget.Latest, true);
  const names = ['globalDefaultStyle', 'elementDefaults'], found = new Map();
  for (const statement of tree.statements) if (ts.isVariableStatement(statement))
    for (const declaration of statement.declarationList.declarations)
      if (names.includes(declaration.name.getText(tree))) {
        assert.ok(!found.has(declaration.name.getText(tree)));
        found.set(declaration.name.getText(tree), declaration.initializer.getText(tree));
      }
  assert.equal(found.size, names.length);
  return compile(names.map(n => `const ${n} = ${found.get(n)};`).join('\n'));
}

// Evaluate unchanged, package-matched methods independently. These are audit
// calculations, not imports or private-state mutations in the public browser app.
export function cursorSourceProof(read = file => readFileSync(file, 'utf8')) {
  const witnesses = [];
  function bind(file, project) {
    const source = read(file), packageSource = read(installed(file)), projection = project(source);
    assert.equal(projection, project(packageSource), `current/package cursor source mismatch: ${file}`);
    witnesses.push({ file, sha256: hash(source), installed: installed(file), installedSha256: hash(packageSource),
      projectionSha256: hash(projection) });
    return projection;
  }
  const defaults = bind(defaultsFile, cursorDefaultsProjection);
  const typeDefaults = bind(typeDefaultsFile, s => cursorMethodProjection(s, ['getElementTypeDefaults']));
  const defaultStyles = new Function(`${defaults}\n${typeDefaults}\nconst p=new Proof();
    return Object.fromEntries(['button','label','div'].map(type=>[type,p.getElementTypeDefaults(type).cursor]));`)();
  assert.deepEqual(defaultStyles, { button: 'pointer', label: 'pointer', div: 'default' });
  const pointer = bind(pointerFile, s => cursorMethodProjection(s, ['updateCursor', 'resolvePreferredMesh']));
  bind(registryFile, s => cursorMethodProjection(s, ['register']));
  const Proof = new Function(`${pointer}\nreturn Proof;`)(), controls = [];
  for (const cursor of ['default', 'auto', 'pointer', 'crosshair']) for (const textOwner of [false, true]) {
    const owner = { metadata: { elementId: 'target', cursor } };
    const text = { metadata: { elementId: 'target', cursor, isTextMesh: true } };
    const p = new Proof(); p.textInteractionRegistry = {
      getByMesh: () => undefined, getByElementId: id => textOwner && id === 'target' ? { mesh: text } : undefined,
    };
    const canvas = { style: { cursor: 'unset' } }, info = { pickInfo: { pickedMesh: owner } };
    const render = { scene: { getEngine: () => ({ getRenderingCanvas: () => canvas }) } };
    assert.equal(p.resolvePreferredMesh(info, render), textOwner ? text : owner);
    p.updateCursor(info, render);
    const expected = textOwner && ['default', 'auto'].includes(cursor) ? 'text' : cursor;
    assert.equal(canvas.style.cursor, expected);
    controls.push({ cursor, textOwner, directPick: 'owner-box', selected: textOwner ? 'owned-text' : 'owner-box', result: canvas.style.cursor });
  }
  return { witnesses, defaultStyles, controls };
}

export function validateCursorEvidence(report, readArtifact = file => readFileSync(`${cursorArtifactRoot}/${file}`)) {
  // Keep the exact deep-equality predicate without constructing a multi-megabyte
  // assertion diff when a corruption control deliberately replaces the report.
  assert.ok(isDeepStrictEqual(report, JSON.parse(readArtifact('latest-report.json'))),
    'report object differs from retained capture');
  assert.equal(report.kind, 'public-equal-input-cursor-default-reduction'); assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.runtimeErrors, []); assert.equal(report.evidenceError, null);
  assert.deepEqual(report.viewport, { width: 480, height: 300 });
  const differences = inspectCursorDefaults(report.results); assert.deepEqual(report.differences, differences);
  const provenanceBytes = readArtifact(report.provenance.file); assert.equal(hash(provenanceBytes), report.provenance.sha256);
  const provenance = JSON.parse(provenanceBytes); assert.deepEqual(provenance.packages, report.packages);
  assert.equal(hash(readFileSync(provenance.script.file)), provenance.script.sha256);
  assert.equal(hash(readArtifact('audit.js')), provenance.bundleSha256);
  for (const file of [defaultsFile, pointerFile, registryFile, typeDefaultsFile])
    assert.ok(provenance.bundleInputs.some(i => i.file === installed(file)));
  for (const input of provenance.bundleInputs) assert.equal(hash(readFileSync(input.file)), input.sha256, input.file);
  const observations = [];
  for (const e of report.results) {
    for (const side of ['reference', 'astylar']) {
      const assets = e[`${side}Assets`];
      assert.ok(assets.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
      assert.ok(assets.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
      const screenshot = e.stages[1][side].screenshot, bytes = readArtifact(screenshot.file);
      assert.equal(hash(bytes), screenshot.sha256);
      const png = PNG.sync.read(bytes); assert.equal(png.width, 480 * e.dpr); assert.equal(png.height, 300 * e.dpr);
    }
    observations.push({ name: e.name, dpr: e.dpr, translated: e.translated, insidePoint: e.insidePoint,
      stages: e.stages.map(s => ({ stage: s.name, referenceOwnerCursor: s.reference.target.cursor,
        candidateOwnerCursor: s.astylar.resolved.elements.find(n => n.id === 'target').effective.cursor,
        canvasCursor: s.astylar.canvasCursor, referenceHit: s.reference.hit,
        candidateHoveredOwner: s.astylar.diagnostics.interaction.hoveredElementId ?? null })),
      screenshots: ['reference', 'astylar'].map(side => e.stages[1][side].screenshot) });
  }
  return { kind: report.kind, artifactRoot: cursorArtifactRoot, reportSha256: hash(readArtifact('latest-report.json')),
    provenance: report.provenance, sourceCommit: provenance.sourceCommit, browser: report.browser, packages: report.packages,
    cases: observations.length, boundaries: observations.length * 5, screenshots: observations.length * 2,
    runtimeErrors: 0, sourceProof: cursorSourceProof(), observations, differences,
    findings: [
      { id: 'cursor-type-defaults', classification: 'documented-core-default-difference',
        firstDivergence: 'Core button/label defaults inject pointer before layout or hit testing; browser computed value is default.',
        owner: defaultsFile, cases: ['button-omitted', 'button-parent', 'label-omitted', 'label-parent', 'button-hover'],
        limitation: 'The defaults file already documents deliberate legacy styling; this is not evidence that the catalog promises exact UA defaults.' },
      { id: 'cursor-explicit-default-overridden', classification: 'confirmed-core-defect',
        firstDivergence: 'Resolved explicit default is preserved, then owner-box selection prefers owned text and updateCursor converts default to text.',
        owner: pointerFile, cases: ['label-default'],
        limitation: 'Public capture plus package-matched method evaluation; no claim that every Material missing hand cursor has this cause.' },
    ],
    originalMaterialCursorCauseProven: false, completeRenderingEquivalent: false, rendererChanged: false };
}
