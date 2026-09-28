import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { applyPreparedInputReviews, validatePreparedInputReviews } from './authored-anchor-review.mjs';
import { applyPreparedInputFollowups, validatePreparedInputFollowups } from './authored-anchor-review.mjs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyAuthoredAnchorReviews, proveAuthoredAnchor } from './authored-anchor-review.mjs';
import { applyCoreAnchorReviews, proveCoreAnchor } from './authored-anchor-review.mjs';
import { applyRelativeOwnerOffsetReviews, proveRelativeOwnerOffsets } from './authored-anchor-review.mjs';
import { applyStaticOwnerPositionReviews, proveStaticOwnerPosition } from './authored-anchor-review.mjs';
import { applyAuthoredCornerReviews, proveAuthoredCornerRequests } from './authored-anchor-review.mjs';
import { proveSheetCornerBoxEvidence } from './authored-anchor-review.mjs';
import { proveActionCornerBoxInputs, applyCardContrastCornerReview } from './authored-anchor-review.mjs';

test('runtime button paint meshes agree with measured control bounds without background textures', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/action-meshes-b399ba7-v3/latest-report.json');
  assert.equal(hash(bytes), '54f433e715c5079c499362f9b03d7249df7c294727e17b1f7f872dce9bbcf17b');
  const report = JSON.parse(bytes);
  const previousBytes = readFileSync('artifacts/material-parity/action-boxes-79bd3dd/latest-report.json');
  assert.equal(hash(previousBytes), '02576edccf740a7dcf5273ea9193ba73a4b045a8ee7558e705853e7bd458b041');
  const previous = JSON.parse(previousBytes);
  assert.deepEqual(report.captureProvenance.browserFiles, previous.captureProvenance.browserFiles);
  assert.equal(report.browser.version, previous.browser.version);
  assert.equal(report.interactions.length, 12);
  const sampleBytes = readFileSync('artifacts/material-parity/action-samples-e534c82/latest-report.json');
  assert.equal(hash(sampleBytes), 'f812bd8f67c8198300ee0e273cb57ef70879abc3b6e3e4e28fa968d2ca2f0763');
  const sample = JSON.parse(sampleBytes);
  assert.deepEqual(sample.captureProvenance.browserFiles, report.captureProvenance.browserFiles);
  assert.equal(sample.interactions.length, 1);
  assert.deepEqual(sample.interactions[0].runtimeErrors, []);
  assert.deepEqual(sample.interactions[0].controlPaintGeometry[0].rasterization,
    { antialias: true, samples: 4, renderWidth: 1440, renderHeight: 1000, canvasWidth: 1440, canvasHeight: 1000 });
  const imageReceipts = [];
  let measured = 0;
  for (const entry of report.interactions) {
    assert.deepEqual(entry.runtimeErrors, []);
    const old = previous.interactions.find(e => e.family === entry.family && e.profile === entry.profile &&
      e.viewport.id === entry.viewport.id && e.state === entry.state);
    assert.ok(old);
    const images = {};
    for (const side of ['reference', 'astylar']) {
      const file = entry.inputTrees[side].file.replace(`${side}-input-tree.json`, `${side}.png`);
      const bytes = readFileSync(file); imageReceipts.push([file, hash(bytes)]);
      images[side] = PNG.sync.read(bytes);
    }
    for (const paint of entry.controlPaintGeometry.filter(p => ['toolbar-action', 'dialog-save'].includes(p.id))) {
      measured++;
      assert.equal(paint.name, paint.id); // Element creation renames constructor-time mesh IDs.
      assert.equal(paint.material, 'StandardMaterial');
      assert.equal(paint.diffuseTexture, null);
      assert.deepEqual(paint.scaling, [1, 1, 1]);
      assert.equal(paint.enabled, true); assert.equal(paint.visible, true);
      assert.equal(paint.vertices, paint.id === 'toolbar-action' && entry.profile === 'contrast' ? 40 : 68);
      assert.equal(paint.projected.length, paint.vertices);
      const box = entry.geometry.elements.find(e => e.id === paint.id).actual;
      const x = paint.projected.map(p => p.x), y = paint.projected.map(p => p.y);
      assert.ok([...x, ...y].every(Number.isFinite));
      for (const delta of [Math.min(...x) - box.left, Math.max(...x) - box.right,
        Math.min(...y) - box.top, Math.max(...y) - box.bottom]) assert.ok(Math.abs(delta) < 0.000031);
      assert.deepEqual(entry.styleInputs.find(i => i.id === paint.id), old.styleInputs.find(i => i.id === paint.id));
      for (const side of ['reference', 'astylar']) {
        const png = images[side], dpr = entry.viewport.deviceScaleFactor;
        const b = entry.geometry.elements.find(e => e.id === paint.id)[side === 'reference' ? 'expected' : 'actual'];
        const pixel = (x, y) => { const offset = (y * png.width + x) * 4; return [...png.data.slice(offset, offset + 3)]; };
        const at = (x, y) => pixel(Math.floor(x * dpr), Math.floor(y * dpr));
        const fill = at(b.left + b.width / 2, b.top + 2), background = at(b.left + 0.5, b.top + 0.5);
        const vector = fill.map((v, i) => v - background[i]), energy = vector.reduce((s, v) => s + v * v, 0);
        const partial = [];
        for (let y = Math.floor(b.top * dpr); y < Math.floor((b.top + 5) * dpr); y++)
          for (let x = Math.floor(b.left * dpr); x < Math.floor((b.left + b.height / 2) * dpr); x++) {
            const coverage = pixel(x, y).reduce((s, v, i) => s + (v - background[i]) * vector[i], 0) / energy;
            if (coverage > 0.03 && coverage < 0.97) partial.push(coverage);
          }
        assert.ok(partial.length > 0);
        const quarterError = partial.map(v => Math.abs(v - Math.round(v * 4) / 4));
        if (side === 'astylar') assert.ok(quarterError.every(error => error < 0.035));
        else assert.ok(quarterError.some(error => error > 0.07));
      }
    }
  }
  assert.equal(measured, 8); // Empty name-based mesh observations must not pass.
  assert.equal(hash(JSON.stringify(imageReceipts)), '3c4753f6981f88dda041913e02615b8c1b7bdf726f0860aaa0d527edd4f52fa5');
});

test('focused interaction capture retains actual boxes and binds target inputs to historical cases', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/action-boxes-79bd3dd/latest-report.json');
  assert.equal(hash(bytes), '02576edccf740a7dcf5273ea9193ba73a4b045a8ee7558e705853e7bd458b041');
  const report = JSON.parse(bytes);
  const originalBytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(originalBytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(originalBytes);
  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/tooltip-keyboard-runtime-813f658/checkpoint/manifest.json'));
  assert.equal(report.browser.version, checkpoint.provenance.browser);
  assert.deepEqual(report.captureProvenance.browserFiles, checkpoint.provenance.browserFiles);
  for (const item of report.captureProvenance.browserFiles)
    assert.equal(hash(readFileSync(`artifacts/material-parity/tooltip-keyboard-build-813f658/browser/${item.file}`)), item.sha256);
  assert.equal(report.interactions.length, 20);
  let measured = 0, absentDialogActions = 0;
  const imageReceipts = [], cornerObservations = [];
  for (const entry of report.interactions) {
    assert.deepEqual(entry.runtimeErrors, []);
    const previous = original.interactions.find(e => e.family === entry.family && e.profile === entry.profile &&
      e.viewport.id === entry.viewport.id && e.state === entry.state);
    assert.ok(previous);
    const images = {};
    for (const side of ['reference', 'astylar']) {
      const tree = entry.inputTrees[side];
      assert.equal(hash(readFileSync(tree.file)), tree.sha256);
      const file = tree.file.replace(`${side}-input-tree.json`, `${side}.png`);
      const bytes = readFileSync(file);
      imageReceipts.push([file, hash(bytes)]);
      images[side] = PNG.sync.read(bytes);
    }
    const targets = { badge: ['badge-count'], card: ['card-open'], toolbar: ['toolbar-action'],
      dialog: ['dialog-cancel', 'dialog-save'] }[entry.family];
    for (const id of targets) {
      const box = entry.geometry.elements.find(e => e.id === id);
      if (entry.family === 'dialog' && entry.state === 'hover') {
        assert.ok(!box || box.missing); absentDialogActions++; continue;
      }
      assert.ok(box && !box.missing); measured++;
      const input = entry.styleInputs.find(i => i.id === id), old = previous.styleInputs.find(i => i.id === id);
      // Preserve declaration order, selectors and values; only CSSOM locations
      // moved in the frozen build. Do not normalize authored style differences.
      const portable = value => ({ ...value, referenceAuthored: value.referenceAuthored.map(
        ({ sheetIndex, rulePath, ...rule }) => rule) });
      assert.deepEqual(portable(input), portable(old));
      for (const key of ['width', 'height']) assert.ok(Math.abs(box.expected[key] - box.actual[key]) < 1e-6);
      const deltaY = box.actual.top - box.expected.top;
      if (entry.family === 'dialog') assert.ok(Math.abs(deltaY + 1) < 1e-6);
      else assert.ok(Math.abs(deltaY) < 0.014);
      const edges = {};
      for (const side of ['reference', 'astylar']) {
        const png = images[side], b = box[side === 'reference' ? 'expected' : 'actual'];
        const dpr = entry.viewport.deviceScaleFactor;
        const pixel = (x, y) => {
          const px = Math.floor(x * dpr), py = Math.floor(y * dpr);
          assert.ok(px >= 0 && px < png.width && py >= 0 && py < png.height);
          const offset = (py * png.width + px) * 4;
          return [...png.data.slice(offset, offset + 3)];
        };
        const fill = pixel(b.left + b.width / 2, b.top + 2), background = pixel(b.left + 0.5, b.top + 0.5);
        const vector = fill.map((v, i) => v - background[i]);
        const energy = vector.reduce((sum, v) => sum + v * v, 0);
        if (!energy) { edges[side] = null; continue; }
        assert.ok(energy > 100);
        // Badge lower-left samples overlap label paint; retain only its upper corners.
        edges[side] = (entry.family === 'badge' ? [0, 1] : [0, 1, 2, 3]).flatMap(corner =>
          [1, 2, 3].map(y => {
            for (let x = 0; x < b.height / 2; x++) {
              const color = pixel(corner % 2 ? b.right - x - 0.5 : b.left + x + 0.5,
                corner >= 2 ? b.bottom - y - 0.5 : b.top + y + 0.5);
              if (color.reduce((sum, v, i) => sum + (v - background[i]) * vector[i], 0) / energy > 0.5) return x;
            }
            assert.fail('visible interaction edge missing');
          }));
      }
      cornerObservations.push({ id, profile: entry.profile, dpr: entry.viewport.deviceScaleFactor,
        maximumSampleDelta: edges.reference && edges.astylar ?
          Math.max(...edges.reference.map((v, i) => Math.abs(v - edges.astylar[i]))) : null });
    }
  }
  assert.equal(measured, 20);
  assert.equal(absentDialogActions, 8);
  assert.equal(hash(JSON.stringify(imageReceipts)), 'e57b3cb5f00cd134c0d9d68bb525f2e657aa73b1ace6dbfb2e8a9df9fff30364');
  assert.equal(cornerObservations.filter(e => e.maximumSampleDelta === null).length, 4);
  assert.ok(cornerObservations.filter(e => e.maximumSampleDelta === null).every(e => e.id === 'dialog-cancel'));
  // Preserve observed discrepancies; these assertions are not a parity tolerance.
  assert.deepEqual(cornerObservations.filter(e => e.maximumSampleDelta > 1), [
    { id: 'toolbar-action', profile: 'contrast', dpr: 1, maximumSampleDelta: 2 },
    { id: 'card-open', profile: 'contrast', dpr: 1, maximumSampleDelta: 3 },
    { id: 'card-open', profile: 'contrast', dpr: 2, maximumSampleDelta: 3 },
    { id: 'dialog-save', profile: 'light', dpr: 1, maximumSampleDelta: 2 },
    { id: 'dialog-save', profile: 'contrast', dpr: 1, maximumSampleDelta: 2 },
  ]);
  const producer = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  assert.ok(producer.includes('geometry: compareGeometry(referenceMeasurement.elements, astylarMeasurement.elements)'));
});

test('retained static badge and action boxes bound corner evidence without inferring invisible paint', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const cases = JSON.parse(bytes).results.filter(e => ['badge', 'card', 'toolbar'].includes(e.family));
  assert.equal(cases.length, 36);
  const receipts = [], counts = { badge: 0, card: 0, toolbar: 0 };
  for (const entry of cases) {
    counts[entry.family]++;
    const id = { badge: 'badge-count', card: 'card-open', toolbar: 'toolbar-action' }[entry.family];
    const geometry = entry.geometry.elements.find(e => e.id === id);
    assert.equal(geometry.missing, false);
    const height = entry.family === 'badge' ? 16 : { light: 40, dark: 40, contrast: 24, custom: 28 }[entry.profile];
    for (const key of ['width', 'height']) assert.ok(Math.abs(geometry.expected[key] - geometry.actual[key]) < 1e-6);
    assert.equal(geometry.expected.height, height);
    const input = entry.styleInputs.find(i => i.id === id);
    assert.equal(input.reference.borderTopLeftRadius, '9999px');
    const candidateRadius = entry.family === 'badge' ? 8 : entry.family === 'toolbar' ? 20 :
      { light: 20, dark: 20, contrast: 9, custom: 21 }[entry.profile];
    assert.equal(input.astylar.borderRadius, `${candidateRadius}px`);
    const used = (radius, box) => Math.min(radius, box.width / 2, box.height / 2);
    const cssRadiusDelta = Math.abs(used(9999, geometry.expected) - used(candidateRadius, geometry.actual));
    if (entry.family === 'card' && entry.profile === 'contrast') assert.equal(cssRadiusDelta, 3);
    else assert.ok(cssRadiusDelta < 1e-6);
    const edges = {};
    for (const side of ['reference', 'astylar']) {
      const file = entry.inputTrees[side].file.replace(`${side}-input-tree.json`, `${side}.png`);
      const bytes = readFileSync(file), png = PNG.sync.read(bytes), dpr = png.width / entry.viewport.width;
      receipts.push([file, hash(bytes)]);
      const box = geometry[side === 'reference' ? 'expected' : 'actual'];
      const pixel = (x, y) => {
        const px = Math.floor(x * dpr), py = Math.floor(y * dpr);
        assert.ok(px >= 0 && px < png.width && py >= 0 && py < png.height);
        const offset = (py * png.width + px) * 4;
        return [...png.data.slice(offset, offset + 3)];
      };
      const fill = pixel(box.left + box.width / 2, box.top + 2);
      const background = pixel(box.left + 0.5, box.top + 0.5);
      const vector = fill.map((v, i) => v - background[i]);
      const energy = vector.reduce((sum, v) => sum + v * v, 0);
      if (entry.family !== 'badge') {
        assert.equal(energy, 0); // Invisible corners are unavailable evidence, not equivalent paint.
        continue;
      }
      assert.equal(geometry.expected.width, 16);
      assert.ok(energy > 1000);
      // Only upper corners: lower-left is contaminated by adjacent label paint.
      edges[side] = [false, true].flatMap(right => [1, 2, 3].map(y => {
        for (let x = 0; x < 8; x++) {
          const color = pixel(right ? box.right - x - 0.5 : box.left + x + 0.5, box.top + y + 0.5);
          const coverage = color.reduce((sum, v, i) => sum + (v - background[i]) * vector[i], 0) / energy;
          if (coverage > 0.5) return x;
        }
        assert.fail('badge upper corner missing');
      }));
      assert.ok(edges[side][0] >= 3); // Reject a square edge at x=0.
    }
    if (entry.family === 'badge')
      assert.ok(edges.reference.every((value, i) => Math.abs(value - edges.astylar[i]) <= 1));
  }
  assert.deepEqual(counts, { badge: 12, card: 12, toolbar: 12 });
  assert.equal(hash(JSON.stringify(receipts)), '9f27f73f9366a641331513b99af00b2979384ce47f5270a4aceab7f8c60941a1');
});

test('prepared 106-group followup conserves raw records and all prior classifications', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const accepted = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '4880964fc1018a1fd6409f7c7af2ddaa5fc21a82e45dab3a0cc5fce5a6019156',
    indexSha256: '5e86f89a05cd88843d7dd6130ed13c88cdb6371efb389d73a934c8d9f953511b',
  })).filter(r => r.evidence.section === 'discrepancies');
  const prepared = applyPreparedInputFollowups(accepted, cases, inventory, bindPreciseAuditNormalization());
  const batch = prepared.filter((r, i) => r !== accepted[i]);
  assert.equal(accepted.length, 8483); assert.equal(prepared.length, accepted.length);
  assert.equal(batch.length, 106); assert.equal(batch.reduce((n, r) => n + r.occurrences, 0), 4635);
  const populations = [
    ['reviewed-display-request-substitution', 15, 844], ['reviewed-display-owner-substitution', 2, 138],
    ['reviewed-display-computed-local-boundary', 1, 52], ['reviewed-inherited-word-computed-local-boundary', 46, 1764],
    ['reviewed-font-initial-computed-local-boundary', 24, 955], ['reviewed-overlay-weight-token-request-omission', 4, 107],
    ['reviewed-range-weight-inherit-observation-boundary', 2, 156], ['reviewed-page-family-computed-local-boundary', 5, 326],
    ['reviewed-toggle-family-token-request-omission', 2, 136], ['reviewed-overlay-family-ancestry-substitution', 5, 157],
  ];
  for (const [attribution, groups, observations] of populations) {
    const matches = batch.filter(r => r.attribution === attribution);
    assert.equal(matches.length, groups, attribution);
    assert.equal(matches.reduce((n, r) => n + r.occurrences, 0), observations, attribution);
  }
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  prepared.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(accepted[i]));
    if (accepted[i].attribution !== 'unresolved') assert.deepEqual(r, accepted[i]);
    if (r !== accepted[i]) {
      assert.equal(accepted[i].attribution, 'unresolved');
      assert.equal(r.reviewEvidence.inputEquivalent, false); assert.equal(r.reviewEvidence.renderingEquivalent, false);
      assert.equal(r.reviewEvidence.observations.length, r.occurrences);
    }
  });
  assert.equal(batch.filter(r => r.classification === 'application-plugin-authoring-defect').length, 28);
  assert.equal(batch.filter(r => r.classification === 'parity-harness-defect').length, 78);
  assert.equal(prepared.filter(r => r.attribution === 'unresolved').length, 180);
  assert.ok(prepared.some(r => r.family === 'tooltip' && r.property === 'wordBreak' && r.attribution === 'unresolved'));
  assert.deepEqual(validatePreparedInputFollowups(prepared, accepted, cases, inventory, bindPreciseAuditNormalization()), []);
  const tampered = [...prepared], index = prepared.findIndex((r, i) => r !== accepted[i]);
  tampered[index] = { ...tampered[index], justification: 'unsupported replacement' };
  assert.equal(validatePreparedInputFollowups(tampered, accepted, cases, inventory, bindPreciseAuditNormalization()).length, 1);
});

test('prepared 153-group batch conserves all scalar records and retains focused anchor/corner proofs', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), families = ['slide-toggle', 'badge', 'core', 'card', 'checkbox', 'sidenav', 'toolbar', 'chips', 'icon', 'list', 'tree', 'paginator', 'tabs', 'stepper', 'expansion', 'sort', 'button-toggle'];
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const accepted = [...new Set(cases.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'a593d4c7e804b6cf5ba863163122fde6cb31774c88c5fe6f97f6504cee2fa948',
    indexSha256: 'c5224eea34da7aa30570bcad482ac04e55c39ba0a8988a0d7ec0b88629f350c1',
  })).filter(r => r.evidence.section === 'discrepancies');
  const prepared = applyPreparedInputReviews(accepted, cases, inventory, bindPreciseAuditNormalization());
  const batch = prepared.filter((r, i) => r !== accepted[i]);
  assert.equal(accepted.length, 8483); assert.equal(batch.length, 153);
  assert.equal(batch.reduce((n, r) => n + r.occurrences, 0), 6909);
  const batchMetadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const batchRaw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !batchMetadata.has(k)));
  prepared.forEach((r, i) => {
    assert.deepEqual(batchRaw(r), batchRaw(accepted[i]));
    if (r !== accepted[i]) {
      assert.equal(accepted[i].attribution, 'unresolved');
      assert.equal(r.reviewEvidence.inputEquivalent, false); assert.equal(r.reviewEvidence.renderingEquivalent, false);
    }
  });
  assert.deepEqual(validatePreparedInputReviews(prepared, accepted, cases, inventory, bindPreciseAuditNormalization()), []);
  const tampered = [...prepared], index = prepared.findIndex((r, i) => r !== accepted[i]);
  tampered[index] = { ...tampered[index], justification: 'unsupported replacement' };
  assert.equal(validatePreparedInputReviews(tampered, accepted, cases, inventory, bindPreciseAuditNormalization()).length, 1);
  const rows = families.flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: 'fca6a4354e9c006e21066f0d19ea9435afacf436d226cda1c78f5ee420bea137',
    indexSha256: '5a5e8c8a31681e088f432bfd23d00327cd3757b383e8ccad50d1edc45f5f4472',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyAuthoredAnchorReviews(rows, cases, inventory, bindPreciseAuditNormalization());
  const changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 10); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 344);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== rows[i]) assert.equal(rows[i].attribution, 'unresolved'); });
  const combined = applyCoreAnchorReviews(reviewed, cases, inventory, bindPreciseAuditNormalization());
  const coreChanges = combined.filter((r, i) => r !== reviewed[i]);
  assert.equal(coreChanges.length, 5); assert.equal(coreChanges.reduce((n, r) => n + r.occurrences, 0), 260);
  combined.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== reviewed[i]) assert.equal(reviewed[i].attribution, 'unresolved'); });
  const relative = applyRelativeOwnerOffsetReviews(combined, cases, inventory, bindPreciseAuditNormalization());
  const relativeChanges = relative.filter((r, i) => r !== combined[i]);
  assert.equal(relativeChanges.length, 22); assert.equal(relativeChanges.reduce((n, r) => n + r.occurrences, 0), 1258);
  relative.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== combined[i]) assert.equal(combined[i].attribution, 'unresolved'); });
  const stationary = applyStaticOwnerPositionReviews(relative, cases, inventory, bindPreciseAuditNormalization());
  const staticChanges = stationary.filter((r, i) => r !== relative[i]);
  assert.equal(staticChanges.length, 16); assert.equal(staticChanges.reduce((n, r) => n + r.occurrences, 0), 918);
  stationary.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== relative[i]) assert.equal(relative[i].attribution, 'unresolved'); });
  const corners = applyAuthoredCornerReviews(stationary, cases, inventory, bindPreciseAuditNormalization());
  const cornerChanges = corners.filter((r, i) => r !== stationary[i]);
  assert.equal(cornerChanges.length, 28); assert.equal(cornerChanges.reduce((n, r) => n + r.occurrences, 0), 576);
  corners.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== stationary[i]) assert.equal(stationary[i].attribution, 'unresolved'); });
  let cornerOwners = 0;
  const mutatedProfiles = new Set();
  for (const entry of cases.filter(e => ['chips', 'button-toggle'].includes(e.family))) {
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.kind === 'interaction' ? '/' + entry.state : ''}`;
    const [r, a] = modalInventoryTrees(inventory, key);
    for (const element of entry.family === 'chips' ? ['chip-0', 'chip-1'] : ['button-toggle-primary']) {
      const proof = proveAuthoredCornerRequests(entry, r, a, element); cornerOwners++;
      assert.equal(proof.usedCornerEquivalenceProven, false); assert.equal(proof.clippingCauseProven, false);
      const mutationKey = `${entry.family}/${entry.profile}/${element}`;
      if (mutatedProfiles.has(mutationKey)) continue;
      mutatedProfiles.add(mutationKey);
      for (const declaration of ['border-radius: 0;', 'border-top-left-radius: 1px;', 'all: initial;']) {
        const native = structuredClone(r);
        const rule = native.rules.find(rule => rule.selector === proof.referenceRequests.at(-1).selector);
        rule.cssText += ' ' + declaration;
        assert.throws(() => proveAuthoredCornerRequests(entry, native, a, element));
      }
      const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline['border-radius'] = { value: '0', important: false };
      assert.throws(() => proveAuthoredCornerRequests(entry, native, a, element));
      const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + element, borderRadius: proof.candidateRadius });
      assert.throws(() => proveAuthoredCornerRequests(entry, r, candidate, element));
      const stage = structuredClone(a); stage.nodes.find(n => n.key === proof.astylarNode).interactionResolvedStyle.borderRadius = '0';
      assert.throws(() => proveAuthoredCornerRequests(entry, r, stage, element));
    }
  }
  assert.equal(cornerOwners, 220); assert.equal(mutatedProfiles.size, 12);
  let sheetOwners = 0, equalSheetCorners = 0;
  for (const entry of cases.filter(e => e.family === 'bottom-sheet' && e.styleInputs.some(i => i.id === 'bottom-sheet-copy'))) {
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`);
    for (const element of ['bottom-sheet-dismiss', 'bottom-sheet-copy']) {
      const proof = proveSheetCornerBoxEvidence(entry, r, a, element); sheetOwners++;
      if (proof.sameCssCornerGeometry) equalSheetCorners++;
      assert.equal(proof.candidateUsedPaintVerified, false); assert.equal(proof.renderingEquivalent, null);
      const altered = structuredClone(entry); altered.overlayPlacement.astylarRows[element === 'bottom-sheet-dismiss' ? 0 : 1].height = 50;
      assert.throws(() => proveSheetCornerBoxEvidence(altered, r, a, element));
      const swapped = structuredClone(a);
      const first = swapped.nodes.findIndex(n => n.authored?.id === 'bottom-sheet-dismiss');
      const second = swapped.nodes.findIndex(n => n.authored?.id === 'bottom-sheet-copy');
      [swapped.nodes[first], swapped.nodes[second]] = [swapped.nodes[second], swapped.nodes[first]];
      assert.throws(() => proveSheetCornerBoxEvidence(entry, r, swapped, element));
    }
  }
  assert.equal(sheetOwners, 50); assert.equal(equalSheetCorners, 38);
  let actionOwners = 0, unequalActionCorners = 0;
  for (const entry of cases.filter(e => ['card', 'toolbar', 'dialog'].includes(e.family))) {
    const elements = (entry.styleInputs ?? []).map(input => input.id).filter(id => ['card-open', 'toolbar-action', 'dialog-cancel', 'dialog-save'].includes(id));
    if (!elements.length) continue;
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
    for (const element of elements) {
      const proof = proveActionCornerBoxInputs(entry, r, a, element); actionOwners++;
      if (!proof.sameShapeOnEqualWideBoxes) unequalActionCorners++;
      assert.equal(proof.renderingEquivalent, null); assert.equal(proof.candidateUsedLayoutMeasured, false);
      const altered = structuredClone(a); altered.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.height = '100px';
      assert.throws(() => proveActionCornerBoxInputs(entry, r, altered, element));
      const native = structuredClone(r);
      const owner = native.nodes.find(node => node.key === proof.referenceNode);
      const ruleIndex = owner.rules.find(index => native.rules[index].active && native.rules[index].selector === proof.referenceRequests[0].selector);
      assert.notEqual(ruleIndex, undefined);
      native.rules[ruleIndex].cssText += ' border-radius: 0;';
      assert.throws(() => proveActionCornerBoxInputs(entry, native, a, element));
    }
  }
  assert.equal(actionOwners, 168); assert.equal(unequalActionCorners, 13);
  const cardCorners = applyCardContrastCornerReview(corners, cases, inventory, bindPreciseAuditNormalization());
  const cardCornerChanges = cardCorners.filter((r, i) => r !== corners[i]);
  assert.equal(cardCornerChanges.length, 4); assert.equal(cardCornerChanges.reduce((n, r) => n + r.occurrences, 0), 52);
  cardCorners.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (r !== corners[i]) assert.equal(corners[i].attribution, 'unresolved'); });
  for (const row of staticChanges) {
    const entry = cases.find(e => e.family === row.family);
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}`);
    const proof = proveStaticOwnerPosition(entry, r, a, row.element);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.position = { value: 'static', important: false };
    assert.throws(() => proveStaticOwnerPosition(entry, native, a, row.element));
    const altered = structuredClone(a); altered.rules.push({ selector: '#' + row.element, position: 'static' });
    assert.throws(() => proveStaticOwnerPosition(entry, r, altered, row.element));
  }
  for (const family of ['badge', 'card', 'checkbox', 'sidenav', 'toolbar']) {
    const entry = cases.find(e => e.family === family);
    const [r, a] = modalInventoryTrees(inventory, `${entry.kind}:${family}@${entry.profile}/${entry.viewport.id}`);
    const proof = proveRelativeOwnerOffsets(entry, r, a);
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.top = { value: '0', important: false };
    assert.throws(() => proveRelativeOwnerOffsets(entry, native, a));
    const altered = structuredClone(a); altered.rules.push({ selector: '#' + altered.nodes.find(n => n.key === proof.astylarNode).authored.id, top: '0' });
    assert.throws(() => proveRelativeOwnerOffsets(entry, r, altered));
  }
  const core = cases.find(e => e.family === 'core');
  const [cr, ca] = modalInventoryTrees(inventory, `${core.kind}:core@${core.profile}/${core.viewport.id}`);
  const cp = proveCoreAnchor(core, cr, ca); assert.equal(cp.containingBlockEquivalenceProven, false);
  const native = structuredClone(cr); native.nodes.find(n => n.key === cp.identity.referenceNode).inline.left = { value: '0px', important: false };
  assert.throws(() => proveCoreAnchor(core, native, ca));
  const candidate = structuredClone(ca); candidate.rules.push({ selector: '#core-primary', transform: 'translateZ(0px)' });
  assert.throws(() => proveCoreAnchor(core, cr, candidate));
  for (const family of ['slide-toggle', 'badge']) {
    const entry = cases.find(e => e.family === family), key = `${entry.kind}:${family}@${entry.profile}/${entry.viewport.id}`;
    const [r, a] = modalInventoryTrees(inventory, key), proof = proveAuthoredAnchor(entry, r, a);
    assert.equal(proof.rendererCauseProven, false); assert.equal(proof.compoundPlacementEquivalenceProven, false);
    const candidate = structuredClone(a); candidate.rules.push({ selector: '#' + (family === 'badge' ? 'badge-count' : 'slide-toggle-label'), top: '8px' });
    assert.throws(() => proveAuthoredAnchor(entry, r, candidate));
    const native = structuredClone(r); native.nodes.find(n => n.key === proof.referenceNode).inline.top = { value: '8px', important: false };
    assert.throws(() => proveAuthoredAnchor(entry, native, a));
    if (family === 'badge') {
      for (const mutation of ['margin: 0;', 'margin: var(--mat-badge-container-overlap-offset, -12px); margin: 0;']) {
        const altered = structuredClone(r);
        altered.rules.find(rule => rule.selector === '.mat-badge-medium.mat-badge-overlap .mat-badge-content').cssText = mutation;
        assert.throws(() => proveAuthoredAnchor(entry, altered, a));
      }
    }
  }
});
