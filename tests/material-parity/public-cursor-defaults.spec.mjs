import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { inspectCursorDefaults } from '../../scripts/audit-public-cursor-defaults.mjs';
import { cursorCases, cursorInput } from '../../examples/material-showcase/audit/cursor-default-input.mjs';
import { cursorArtifactRoot, cursorSourceProof, validateCursorEvidence } from './public-cursor-defaults-evidence.mjs';
import { assertHistoricalCursorReceipt } from './historical-cursor-receipt-assertion.mjs';
const report = JSON.parse(readFileSync(`${cursorArtifactRoot}/latest-report.json`));
const file = 'docs/material-public-cursor-defaults-audit.json';

test('cursor evidence replays equal inputs, served package bytes, exact hit owners, states and source methods', () => {
  const result = validateCursorEvidence(report);
  assertHistoricalCursorReceipt(result);
  assert.equal(result.cases, 36); assert.equal(result.boundaries, 180); assert.equal(result.screenshots, 72);
  assert.equal(result.differences.length, 148);
  assert.equal(result.differences.filter(d => d.boundary === 'owner-style').length, 88);
  assert.equal(result.differences.filter(d => d.boundary === 'blank-inset-effective-cursor').length, 60);
  assert.equal(result.findings[0].classification, 'documented-core-default-difference');
  assert.equal(result.findings[1].classification, 'confirmed-core-defect');
  assert.equal(result.originalMaterialCursorCauseProven, false);
  assert.equal(result.completeRenderingEquivalent, false); assert.equal(result.rendererChanged, false);
});

test('explicit label default resolves correctly but the effective cursor differs at every interior boundary', () => {
  for (const entry of report.results.filter(e => e.name === 'label-default')) {
    for (const stage of entry.stages.slice(1, 4)) {
      assert.equal(stage.reference.target.cursor, 'default');
      assert.equal(stage.astylar.resolved.elements.find(e => e.id === 'target').effective.cursor, 'default');
      assert.equal(stage.reference.hit.pointTouchesText, false);
      assert.equal(stage.astylar.canvasCursor, 'text');
    }
  }
  for (const entry of report.results.filter(e => ['button-default', 'button-pointer', 'div-parent'].includes(e.name)))
    for (const stage of entry.stages.slice(1, 4)) assert.equal(stage.reference.target.cursor, stage.astylar.canvasCursor);
});

test('cursor inspector rejects unequal inputs, text-hit probes, wrong ownership, unready sessions and missing matrix states', () => {
  const changes = [
    r => r.pop(),
    r => { r[1] = structuredClone(r[0]); },
    r => { r[0].dpr = 3; },
    r => { r[0].insidePoint.x--; },
    r => { r[0].stages.pop(); },
    r => { r[0].stages[1].reference.hit.pointTouchesText = true; },
    r => { r[0].stages[1].reference.hit.id = 'parent'; },
    r => { r[0].stages[1].astylar.diagnostics.interaction.hoveredElementId = 'parent'; },
    r => { r[0].stages[1].astylar.surfaceBox.x++; },
    r => { r[0].stages[1].reference.target.box.width++; },
    r => { r[0].stages[1].astylar.site.styles[1].left = '20px'; },
    r => { r[0].stages[1].astylar.diagnostics.session.status = 'rendering'; },
    r => { r[0].stages[1].astylar.diagnostics.messages.push({ severity: 'error' }); },
    r => { r[0].astylarDisposed = false; },
  ];
  for (const [index, mutate] of changes.entries()) {
    const clone = structuredClone(report.results); mutate(clone); assert.notDeepEqual(clone, report.results);
    assert.throws(() => inspectCursorDefaults(clone), `mutation ${index}`);
  }
});

test('retained raw report, served bundle, screenshot and provenance changes are not silently accepted', () => {
  for (const target of ['latest-report.json', 'audit.js', 'provenance.json', report.results[0].stages[1].reference.screenshot.file])
    assert.throws(() => validateCursorEvidence(report, name => name === target
      ? Buffer.from('{}') : readFileSync(`${cursorArtifactRoot}/${name}`)), target);
});

test('source proof rejects changed package formulas and evaluates text-owner selection rather than a copied formula', () => {
  const read = file => readFileSync(file, 'utf8');
  const proof = cursorSourceProof(read);
  assert.equal(proof.controls.length, 8);
  assert.deepEqual(proof.controls.filter(c => c.cursor === 'default').map(c => c.result), ['default', 'text']);
  for (const textOwner of [false, true])
    assert.equal(proof.controls.find(c => c.cursor === 'crosshair' && c.textOwner === textOwner).result, 'crosshair');
  for (const replace of [
    s => s.replace("cursor !== 'default'", "cursor !== 'wait'"),
    s => s.replace('return ownedTextEntry.mesh;', 'return directMesh;'),
  ]) {
    let changed = false;
    assert.throws(() => cursorSourceProof(file => {
      const text = read(file);
      if (file.endsWith('pointer-interaction.service.js')) { const altered = replace(text); changed = altered !== text; return altered; }
      return text;
    }));
    assert.equal(changed, true);
  }
});

test('cursor diagnostic is public authoring, with no Material plugin or private renderer imports', () => {
  const path = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/types/style-rule.d.ts';
  const tree = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = tree.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'StyleRule');
  const allowed = new Set(declaration.members.map(n => n.name.getText(tree)));
  for (const name of cursorCases) for (const rule of cursorInput(name).styles)
    for (const key of Object.keys(rule)) assert.ok(allowed.has(key), key);
  const source = readFileSync('examples/material-showcase/audit/cursor-defaults.mjs', 'utf8');
  assert.match(source, /import \{ Astylar \} from 'astylarui';/);
  assert.doesNotMatch(source, /ASTYLAR_INTERNAL|astylarui\/|src\/app|\.scene|\.metadata|materialPlugin/);
});

test('cursor evidence can be independently replayed without writing or recapturing', () => {
  const before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/bind-public-cursor-defaults.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.cases, 36); assert.equal(result.differences, 148); assert.equal(result.check, true);
  assert.deepEqual(readFileSync(file), before);
});
