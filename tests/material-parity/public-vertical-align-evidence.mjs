import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { blueInk, inspectVerticalAlign } from '../../scripts/audit-public-vertical-align.mjs';

export const verticalAlignArtifactRoot = 'artifacts/material-parity/public-vertical-align-audit-v2';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const coreFile = 'src/app/services/dom/renderer.service.ts';
const installedFile = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/renderer.service.js';

export function extractPlacement(source) {
  const tree = ts.createSourceFile('renderer.ts', source, ts.ScriptTarget.Latest, true);
  const names = ['positionTextMesh', 'resolveAnonymousFlexTextAlignment'], found = new Map();
  function visit(node) {
    if (ts.isMethodDeclaration(node) && names.includes(node.name?.getText(tree))) {
      const name = node.name.getText(tree); assert.ok(!found.has(name)); found.set(name, node.getText(tree));
    }
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.equal(found.size, names.length);
  return ts.transpileModule(`class Proof { ${names.map(name => found.get(name)).join('\n')} }`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, removeComments: true } }).outputText;
}

export function placementProof(core, installed) {
  const compiled = extractPlacement(core); assert.equal(compiled, extractPlacement(installed), 'executed package and current core placement differ');
  const Proof = new Function(`${compiled}\nreturn Proof;`)();
  const result = [];
  for (const display of ['block', 'inline']) for (const verticalAlign of ['baseline', 'middle', 'bottom', undefined]) {
    const projected = [], mesh = { position: {} };
    new Proof().positionTextMesh(mesh, { name: 'target' }, { width: 100, height: 24 }, { display, verticalAlign },
      { top: 0, right: 0, bottom: 0, left: 0 }, { width: 200, height: 80 },
      { actions: { camera: { projectCssLocalPoint: (point, z) => { projected.push(point); return { ...point, z }; } } } });
    assert.equal(projected.length, 1);
    assert.deepEqual(projected[0], { x: -50, y: verticalAlign === undefined ? -28 : verticalAlign === 'middle' ? 0 : 28 });
    assert.equal(mesh.position.y, projected[0].y);
    result.push({ display, verticalAlign: verticalAlign ?? 'omitted', cssPointBeforeProjection: projected[0] });
  }
  return { source: coreFile, sourceSha256: hash(Buffer.from(core)), installed: installedFile,
    installedSha256: hash(Buffer.from(installed)), extractedMethodsSha256: hash(Buffer.from(compiled)), result };
}

export function validateVerticalAlignEvidence(report, readArtifact = file => readFileSync(`${verticalAlignArtifactRoot}/${file}`)) {
  assert.equal(report.kind, 'public-vertical-align-applicability-reduction'); assert.equal(report.schemaVersion, 1);
  assert.deepEqual(report.runtimeErrors, []); assert.deepEqual(report.viewport, { width: 560, height: 320 });
  const deltas = inspectVerticalAlign(report.results); assert.deepEqual(report.deltas, deltas);
  const provenanceBytes = readArtifact(report.provenance.file);
  assert.equal(hash(provenanceBytes), report.provenance.sha256);
  const provenance = JSON.parse(provenanceBytes);
  assert.deepEqual(provenance.packages, report.packages);
  assert.equal(hash(readFileSync(provenance.script.file)), provenance.script.sha256);
  assert.equal(hash(readArtifact('audit.js')), provenance.bundleSha256);
  assert.ok(provenance.bundleInputs.some(i => i.file === installedFile));
  for (const input of provenance.bundleInputs) assert.equal(hash(readFileSync(input.file)), input.sha256, input.file);
  const rows = [];
  for (const entry of report.results) {
    for (const side of ['reference', 'astylar']) {
      const sample = entry[side], bytes = readArtifact(sample.screenshot.file);
      assert.equal(hash(bytes), sample.screenshot.sha256);
      const png = PNG.sync.read(bytes); assert.equal(png.width, 560 * entry.dpr); assert.equal(png.height, 320 * entry.dpr);
      assert.deepEqual(blueInk(png, entry.dpr, sample.surfaceBox), sample.ink);
      assert.ok(sample.assets.some(a => a.type === 'script' && a.sha256 === provenance.bundleSha256));
      assert.ok(sample.assets.some(a => a.type === 'document' && a.sha256 === provenance.htmlSha256));
    }
    const target = entry.astylar.resolved.elements.filter(e => e.id === 'target'); assert.equal(target.length, 1);
    for (const stage of ['normal', 'effective']) {
      assert.equal(target[0][stage].verticalAlign, entry.alignment === 'omitted' ? undefined : entry.alignment);
      assert.equal(target[0][stage].height, '80px');
      assert.equal(target[0][stage].lineHeight, '24px');
    }
    assert.equal(target[0].retainedText.style.verticalAlign, entry.alignment === 'omitted' ? undefined : entry.alignment);
    rows.push({ dpr: entry.dpr, translated: entry.translated, context: entry.context, alignment: entry.alignment,
      reference: entry.reference.ink, astylar: entry.astylar.ink, screenshots: ['reference', 'astylar'].map(side => entry[side].screenshot) });
  }
  const nonInline = deltas.filter(e => e.context !== 'inline');
  for (const delta of nonInline) {
    assert.deepEqual(delta.reference, { x: 0, y: 0 });
    assert.deepEqual(delta.astylar, { x: 0, y: delta.alignment === 'omitted' ? -56 : delta.alignment === 'middle' ? -28 : 0 });
  }
  const placement = placementProof(readFileSync(coreFile, 'utf8'), readFileSync(installedFile, 'utf8'));
  return { kind: report.kind, classification: 'confirmed-core-defect', owningSubsystem: 'core text placement / CSS vertical-align applicability',
    cases: rows.length, screenshots: rows.length * 2, browser: report.browser, packages: report.packages,
    provenance: report.provenance, artifactRoot: verticalAlignArtifactRoot,
    reportSha256: hash(readArtifact('latest-report.json')), runtimeErrors: 0,
    placement, deltas, observations: rows,
    confirmed: 'Block, flex-item and absolutely positioned text responds to vertical-align as inner-text placement; baseline is approximated as bottom.',
    scope: 'Equal-input public reduction plus unchanged source-method evaluation; not a reproduction of the full Material control-label composition.',
    originalMaterialLabelCauseProven: false, completeRenderingEquivalent: false };
}
