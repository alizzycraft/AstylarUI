import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { proveSnackbarPositionRequests, applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';

test('ordinary snackbar opens in bounds but loses paint behind the short-surface camera', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const file = 'artifacts/material-parity/snackbar-boundary-e331e79/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '51434ca9c9a9d375e778c3185881b9bb09be2e28baa8133b99f67d216d4c0994');
  const report = JSON.parse(bytes), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const binding = validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-snackbar-boundary.mjs',
    styleProperties: Object.values(propertyGroups).flat() });
  assert.equal(binding.status, 'checkpoint-bound', JSON.stringify(binding.errors));
  assert.equal(manifest.provenance.core.length, 104);
  for (const receipt of manifest.provenance.core) {
    assert.equal(hash(readFileSync(receipt.source)), receipt.sourceSha256);
    assert.equal(hash(readFileSync(`examples/material-showcase/node_modules/astylarui/dist/lib/${receipt.file}`)), receipt.sha256);
  }
  assert.deepEqual(report.results.map(e => [e.deviceScaleFactor, e.viewport.height, e.action]),
    [1, 2].flatMap(d => [1000, 240].flatMap(h => ['initial', 'click'].map(a => [d, h, a]))));
  for (const row of report.results) {
    const clicked = row.action === 'click', short = row.viewport.height === 240, dpr = row.deviceScaleFactor;
    assert.equal(row.astylar.candidateOpen, clicked);
    for (const side of ['reference', 'astylar']) {
      const sample = row[side], tree = JSON.parse(readFileSync(sample.inputTree.file));
      const popups = tree.nodes.filter(n => side === 'reference'
        ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-snackbar-surface')
        : n.authored?.id === 'snack-bar-surface');
      assert.equal(popups.length, Number(clicked));
      const pngBytes = readFileSync(sample.screenshot.file);
      assert.equal(hash(pngBytes), sample.screenshot.sha256);
      const png = PNG.sync.read(pngBytes);
      assert.equal(png.width, 900 * dpr); assert.equal(png.height, row.viewport.height * dpr);
      if (!clicked) { assert.equal(sample.box, null); assert.equal(sample.darkPixels, 0); continue; }
      assert.ok(sample.clicks.some(e => e.trusted && e.x >= sample.trigger.x && e.x <= sample.trigger.x + sample.trigger.width &&
        e.y >= sample.trigger.y && e.y <= sample.trigger.y + sample.trigger.height));
      for (const [key, expected] of Object.entries({ left: 278, top: row.viewport.height - 56, width: 344, height: 48 })) {
        assert.ok(Math.abs(sample.box[key] - expected) < .01, `${side} ${key}`);
      }
      let darkPixels = 0;
      for (let y = Math.ceil(sample.box.top * dpr); y < Math.floor(sample.box.bottom * dpr); y++) {
        for (let x = Math.ceil(sample.box.left * dpr); x < Math.floor(sample.box.right * dpr); x++) {
          const i = (y * png.width + x) * 4;
          if (png.data[i] < 80 && png.data[i + 1] < 80 && png.data[i + 2] < 80) darkPixels++;
        }
      }
      assert.equal(darkPixels, sample.darkPixels);
      if (side === 'astylar' && short) assert.equal(darkPixels, 0);
      else assert.ok(darkPixels > 15000 * dpr * dpr);
    }
    if (clicked) {
      assert.equal(row.astylar.meshes.length, 1);
      const mesh = row.astylar.meshes[0];
      assert.equal(mesh.enabled, true); assert.equal(mesh.visible, true); assert.equal(mesh.visibility, 1);
      assert.equal(mesh.z > row.astylar.cameraZ, short);
    }
  }
});

test('34 snackbar wrappers distinguish authored composition from computed-only right/bottom offsets', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = captured.interactions.filter(e => e.family === 'snack-bar' &&
    e.styleInputs.some(i => i.id === 'snack-bar-overlay')).map(e => ({ ...e, kind: 'interaction' }));
  assert.equal(cases.length, 34);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  const trees = entry => modalInventoryTrees(inventory,
    `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`);
  for (const entry of cases) {
    const proof = proveSnackbarPositionRequests(entry, ...trees(entry));
    assert.equal(proof.mapping.status, 'mapped-with-scalar-rule-gap');
    assert.equal(proof.originalMissingSnackbarCauseProven, false);
    assert.equal(proof.candidateUsedOffsetsVerified, false);
  }
  const entry = cases[0];
  for (const mutate of [
    ([r]) => { r.ruleEvidenceComplete = false; },
    ([, a]) => { a.resolvedStyleSource = 'paint-guess'; },
    ([r]) => { r.nodes.find(n => n.attributes?.class === 'cdk-overlay-container').parent = 'missing'; },
    ([r]) => { r.nodes.find(n => n.attributes?.class === 'cdk-global-overlay-wrapper').inline.right = { value: '0px' }; },
    ([r]) => { const rule = r.rules.find(n => n.selector === '.cdk-global-overlay-wrapper' && n.declarations.position);
      rule.cssText += 'inset-inline-end:0;'; },
    ([r]) => { const rule = r.rules.find(n => n.selector === '.cdk-global-overlay-wrapper' && n.declarations.position);
      rule.declarations.position.value = 'fixed'; },
    ([, a]) => { a.rules.push({ selector: '.snack-overlay', insetBlockEnd: '0' }); },
    ([, a]) => { a.rules.push({ selector: '[unknown]', right: '0' }); },
    ([, a]) => { a.nodes.find(n => n.authored.id === 'snack-bar-overlay').authored.style = { bottom: '0' }; },
    ([, a]) => { a.nodes.find(n => n.authored.id === 'snack-bar-overlay').normalResolvedStyle.right = '0'; },
  ]) {
    const pair = structuredClone(trees(entry)); mutate(pair);
    assert.throws(() => proveSnackbarPositionRequests(entry, ...pair));
  }
  const rows = queryFindings('artifacts/material-parity/working-audit', 'snack-bar', {
    generation: 'fea569edc8edf1e05d1686bcb7c2a8eecc0bfb53bff5d5b8baeb6fbb59602040',
    indexSha256: '672b4d61922a8ef775f4e2c723ca09c9ab70684d93822cd3fe3b53d0df6c9d57',
  }).filter(row => row.evidence.section === 'discrepancies');
  const before = structuredClone(rows), applied = applySnackbarPositionRequests(rows, cases, inventory, normalize);
  assert.deepEqual(rows, before);
  const changed = applied.filter((row, i) => row !== rows[i]);
  assert.equal(changed.length, 3); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 102);
  for (const row of changed) {
    assert.equal(row.element, 'snack-bar-overlay');
    assert.equal(row.reviewedCases.length, 34);
    assert.equal(new Set(row.reviewedCases).size, 34);
    const restored = { ...row };
    for (const key of ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewedCases', 'reviewEvidence']) delete restored[key];
    Object.assign(restored, row.reviewEvidence.priorMetadata);
    assert.deepEqual(restored, rows.find(r => r.id === row.id));
  }
  const validate = values => validateSnackbarPositionRequests(values, rows, cases, inventory, normalize);
  assert.deepEqual(validate(applied), []);
  for (const mutate of [r => { r.reference = 'forged'; }, r => r.reviewedCases.pop(),
    r => { r.reviewEvidence.observations[0].originalMissingSnackbarCauseProven = true; },
    r => { r.reviewEvidence.observations[0].mapping.missingRules = []; }]) {
    const altered = structuredClone(applied); mutate(altered.find(r => r.reviewedCases?.length === 34 && r.element === 'snack-bar-overlay' && r.attribution.startsWith('reviewed-snackbar-')));
    assert.ok(validate(altered).length);
  }
  assert.throws(() => applySnackbarPositionRequests(rows, cases.slice(1), inventory, normalize));
  assert.throws(() => applySnackbarPositionRequests(rows, [...cases, cases[0]], inventory, normalize));
});
