import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { joinSliderStateInputs, sliderStatePredecessor } from '../../scripts/join-material-slider-state-inputs.mjs';

test('Slider state-input join adds only scoped children and preserves whole predecessor', () => {
  const original = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${sliderStatePredecessor}.json`));
  const review = joinSliderStateInputs(original.review);
  const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  assert.equal(digest(review), 'c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823');
  // Adding guarded save mode changes only the producer receipt,not observations.
  const producer = 'scripts/join-material-slider-state-inputs.mjs';
  const priorProducer = execFileSync('git', ['show', `9c545fa5980453cceb6448c79ef8b5242d954bac:${producer}`]);
  const priorReceiptView = joinSliderStateInputs(original.review, (file, ...options) =>
    file === producer ? priorProducer : readFileSync(file, ...options));
  assert.equal(digest(priorReceiptView), '0b3b7964bafe4e7f4094cd640c906b4dea8fc73ed1d5b0beb6e9c3318a290bf0');
  assert.equal(review.groups.length, 2311);
  const affected = review.groups.filter(group => group.obligations.programmaticFocus.retainedSliderPointerFocus);
  assert.equal(affected.length, 16);
  const pending = (value, name) => value.groups.filter(group =>
    group.obligations[name]?.disposition === 'evidence-join-pending').length;
  assert.deepEqual(['programmaticFocus', 'authoredActivation', 'localPaint'].map(name => pending(original.review, name)),
    [1603, 1466, 949]);
  assert.deepEqual(['programmaticFocus', 'authoredActivation', 'localPaint'].map(name => pending(review, name)),
    [1587, 1466, 949]);
  assert.equal(affected.filter(group => group.obligations.localPaint.retainedSliderStateLayerInterior).length, 4);
  for (const group of affected) {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    assert.deepEqual(group.obligations.programmaticFocus.remaining,
      original.review.groups.find(prior => prior.case === group.case).obligations.programmaticFocus.remaining);
  }
  assert.equal(original.review.groups.some(group => group.obligations.programmaticFocus.retainedSliderPointerFocus), false);
  for (const suffix of ['slider-retained-state-layer.spec.mjs', 'slider-historical-black-material-integration-20261024.log',
    'latest-report.json']) {
    assert.throws(() => joinSliderStateInputs(original.review, (file, ...options) => file.endsWith(suffix)
      ? Buffer.from('unreviewed drift') : readFileSync(file, ...options)));
  }
});
