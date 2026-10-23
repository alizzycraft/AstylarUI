import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { joinRetainedPointerFocus, pointerFocusCapture, pointerFocusPredecessor,
  joinRetainedFocusObservationBatch, disabledFocusPredecessor } from '../../scripts/join-material-retained-pointer-focus.mjs';

test('retained pointer focus reuses exact measured boundaries without substituting focus actions', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const predecessor = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${pointerFocusPredecessor}.json`)).review;
  const capture = readFileSync(pointerFocusCapture.file), report = JSON.parse(capture);
  const joined = joinRetainedPointerFocus(predecessor, capture);
  const groups = joined.groups.filter(g => g.obligations.programmaticFocus.retainedPointerFocusBoundaries);
  assert.equal(groups.length, 113);
  assert.ok(joined.groups.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  assert.ok(predecessor.groups.every(g => !g.obligations.programmaticFocus.retainedPointerFocusBoundaries));
  let boundaries = 0, trees = 0;
  for (const group of groups) {
    const source = group.obligations.authoredActivation.configuredRawPointerObservation;
    const child = group.obligations.programmaticFocus.retainedPointerFocusBoundaries;
    assert.equal(child.completeSourceObservationSha256, hash(JSON.stringify(source)));
    assert.equal(child.currentRenderingAccepted, false);
    const row = report.results.find(row => row.caseId === child.caseId);
    assert.ok(row);
    for (const side of ['reference','astylar']) {
      assert.deepEqual(child.observations[side].map(value => value.active), row[side].observations.map(value => value.active));
      const receipt = row[side].inputTree;
      assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
      trees++; boundaries += child.observations[side].length;
    }
  }
  assert.equal(trees, 226); assert.equal(boundaries, 678);
  const altered = structuredClone(predecessor);
  altered.groups[0].currentRendering = 'accepted';
  assert.throws(() => joinRetainedPointerFocus(altered, capture));
  assert.throws(() => joinRetainedPointerFocus(predecessor, Buffer.concat([capture,Buffer.from(' ')])));
});

test('disabled and AX focus reuse bind exact retained observations without widening action scope', () => {
  const predecessor = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${disabledFocusPredecessor}.json`)).review;
  const joined = joinRetainedFocusObservationBatch(predecessor, readFileSync);
  const groups = joined.groups.filter(g => g.obligations.programmaticFocus.retainedDisabledFocusOwners);
  assert.equal(groups.length, 16);
  assert.equal(groups.reduce((count,g) => count + g.obligations.programmaticFocus.retainedDisabledFocusOwners.sources.length,0),39);
  assert.ok(joined.groups.every(g => g.inspection === 'partial' && g.currentRendering === 'unverified'));
  for (const group of groups) {
    const child = group.obligations.programmaticFocus.retainedDisabledFocusOwners;
    assert.equal(child.currentRenderingAccepted,false);
    assert.match(child.boundary,/supplementary/);
    assert.equal(group.obligations.programmaticFocus.disposition,'partial');
  }
  const menu = joined.groups.filter(g => g.obligations.authoredActivation.supplementaryMenuActions);
  assert.equal(menu.length,8);
  assert.ok(menu.every(g => g.obligations.programmaticFocus.disposition === 'evidence-join-pending'));
  const ax = joined.groups.filter(g=>g.obligations.programmaticFocus.retainedAxEndpointFocus);
  assert.equal(ax.length,9);
  for(const group of ax){
    const child=group.obligations.programmaticFocus.retainedAxEndpointFocus;
    assert.equal(child.observations.length,2);assert.equal(child.currentRenderingAccepted,false);
    assert.equal(group.obligations.programmaticFocus.disposition,'partial');
    assert.match(child.boundary,/not a new core diagnosis/);
  }
  assert.throws(() => joinRetainedFocusObservationBatch(predecessor,
    file => Buffer.concat([readFileSync(file),Buffer.from(' ')])));
  assert.ok(predecessor.groups.every(g => !g.obligations.programmaticFocus.retainedDisabledFocusOwners));
});
