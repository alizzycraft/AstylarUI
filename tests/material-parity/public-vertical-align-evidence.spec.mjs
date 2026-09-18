import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { blueInk, inspectVerticalAlign } from '../../scripts/audit-public-vertical-align.mjs';
import { validateVerticalAlignEvidence, verticalAlignArtifactRoot, placementProof } from './public-vertical-align-evidence.mjs';
import { contexts, alignments, verticalAlignInput } from '../../examples/material-showcase/audit/vertical-align-input.mjs';
const report = JSON.parse(readFileSync(`${verticalAlignArtifactRoot}/latest-report.json`));

test('public vertical-align evidence replays all equal inputs, served package bytes, screenshots and placement formulas', () => {
  const result = validateVerticalAlignEvidence(report);
  assert.deepEqual(result, JSON.parse(readFileSync('docs/material-public-vertical-align-audit.json')));
  assert.equal(result.cases, 64); assert.equal(result.screenshots, 128);
  assert.equal(result.deltas.length, 48); assert.equal(result.deltas.filter(d => !d.deltaMatches).length, 36);
  assert.equal(result.originalMaterialLabelCauseProven, false);
});

test('vertical-align inspector rejects changed inputs, states, hosts, diagnostics and missing matrix cases', () => {
  const mutations = [
    r => { r.results.pop(); },
    r => { r.results[1] = structuredClone(r.results[0]); },
    r => { r.results[0].dpr = 3; },
    r => { r.results[0].astylar.site.styles[2].height = '81px'; },
    r => { r.results[0].reference.site.root.children[0].children[0].textContent = 'Other'; },
    r => { r.results[0].astylar.surfaceBox.y++; },
    r => { r.results[0].astylar.alignment = 'middle'; },
    r => { r.results[0].astylar.fontAvailable = false; },
    r => { r.results[0].astylar.disposed = false; },
    r => { r.results[0].astylar.diagnostics.session.status = 'rendering'; },
    r => { r.results[0].astylar.diagnostics.messages.push({ severity: 'error' }); },
    r => { r.results[0].astylar.ink.y = NaN; },
    r => { r.results[0].astylar.ink.pixels = 0; },
    r => { r.results[0].reference.reference.find(e => e.id === 'target').style.verticalAlign = 'middle'; },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const clone = structuredClone(report); mutate(clone); assert.notDeepEqual(clone, report);
    assert.throws(() => inspectVerticalAlign(clone.results), `mutation ${i}`);
  }
});

test('blue target ink metric detects translation, excludes red and transparent pixels, and rejects missing text', () => {
  function picture(dx, dy) {
    const png = new PNG({ width: 40, height: 40 }); png.data.fill(255);
    for (let y = 3; y < 13; y++) for (let x = 4; x < 8; x++) {
      png.data.set([0, 51, 204, 255], ((y + dy) * 40 + x + dx) * 4);
    }
    png.data.set([204, 51, 0, 255], 0); png.data.set([0, 51, 204, 0], 4); return png;
  }
  assert.deepEqual(blueInk(picture(0, 0), 1, { x: 0, y: 0 }), { x: 4, y: 3, width: 4, height: 10, pixels: 40 });
  assert.deepEqual(blueInk(picture(6, 8), 2, { x: 1, y: 2 }), { x: 4, y: 3.5, width: 2, height: 5, pixels: 40 });
  assert.throws(() => blueInk(new PNG({ width: 40, height: 40 }), 1, { x: 0, y: 0 }));
});

test('placement binding rejects package drift and a changed baseline formula', () => {
  const core = readFileSync('src/app/services/dom/renderer.service.ts', 'utf8');
  const installed = readFileSync('examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/renderer.service.js', 'utf8');
  const altered = installed.replace('case "baseline":', 'case "different":'); assert.notEqual(altered, installed);
  assert.throws(() => placementProof(core, altered));
  const alter = text => text.replaceAll('parentHeightPx / 2 - effectivePadding.bottom - textHeightPx / 2', '0');
  assert.notEqual(alter(core), core); assert.throws(() => placementProof(alter(core), alter(installed)));
});

test('diagnostic authoring uses declared public style fields and never renderer-private imports', () => {
  const file = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/types/style-rule.d.ts';
  const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = tree.statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'StyleRule');
  assert.ok(declaration); const allowed = new Set(declaration.members.map(n => n.name.getText(tree)));
  function validateRule(rule) { for (const key of Object.keys(rule)) assert.ok(allowed.has(key), `Undeclared public style: ${key}`); }
  for (const context of contexts) for (const alignment of alignments) verticalAlignInput(context, alignment).styles.forEach(validateRule);
  assert.throws(() => validateRule({ selector: '#parent', backgroundColor: '#eeeeee' }));
  const source = readFileSync('examples/material-showcase/audit/vertical-align.mjs', 'utf8');
  assert.match(source, /import \{ Astylar \} from 'astylarui';/);
  assert.doesNotMatch(source, /ASTYLAR_INTERNAL|astylarui\/|src\/app|\.scene|\.positionTextMesh/);
});

test('saved proof rejects fabricated ink, altered deltas, screenshot receipts and provenance', () => {
  const mutations = [
    r => { r.results[0].astylar.ink.y++; r.deltas = inspectVerticalAlign(r.results); },
    r => { r.deltas[0].astylar.y++; },
    r => { r.results[0].astylar.screenshot.sha256 = '0'.repeat(64); },
    r => { r.provenance.sha256 = '0'.repeat(64); },
  ];
  for (const [i, mutate] of mutations.entries()) {
    const clone = structuredClone(report); mutate(clone); assert.notDeepEqual(clone, report);
    assert.throws(() => validateVerticalAlignEvidence(clone), `receipt mutation ${i}`);
  }
});

test('vertical-align binding replays independently with writes prohibited', () => {
  const file = 'docs/material-public-vertical-align-audit.json', before = readFileSync(file);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/bind-public-vertical-align.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.cases, 64); assert.equal(result.screenshots, 128); assert.equal(result.check, true);
  assert.deepEqual(readFileSync(file), before);
});
