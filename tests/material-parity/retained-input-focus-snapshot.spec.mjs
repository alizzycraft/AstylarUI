import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

// This is a retained-data boundary check, not a fresh browser observation or
// a replacement for paired, action-timed DOM/renderer focus measurements.
const capture = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const captureSha = 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62';
const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
const profiles = ['light', 'dark', 'contrast', 'custom'];
const viewports = ['desktop-dpr1', 'desktop-dpr2'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const trees = new Map();
let retained;

function loadCapture() {
  if (retained) return retained;
  const bytes = readFileSync(capture);
  assert.equal(hash(bytes), captureSha);
  retained = JSON.parse(bytes);
  // Pin the recorded producer identity. This does not recover its missing
  // original bytes or assert that today's runner implements that procedure.
  assert.equal(retained.captureProvenance.harnessFiles.find(row =>
    row.file === 'tests/material-parity/run-material-parity.mjs').sha256,
  'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  return retained;
}

function tree(receipt) {
  const key = `${receipt.file}:${receipt.sha256}`;
  if (!trees.has(key)) {
    const bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256, receipt.file);
    trees.set(key, JSON.parse(bytes));
  }
  return trees.get(key);
}

function inspectSnapshot(row) {
  const primary = `${row.family}-primary`;
  assert.deepEqual(row.focus, { reference: primary, astylar: primary, matches: true });
  const referenceEvents = row.eventComparison.reference.map(event => event.type);
  const candidateEvents = row.eventComparison.astylar.map(event => event.type);
  const reportedPointerFocus = referenceEvents.includes('pointerdown');
  const relevant = events => events.filter(type =>
    ['pointerdown', 'focus', 'pointerup', 'click'].includes(type));
  assert.deepEqual(referenceEvents, reportedPointerFocus
    ? ['pointerdown', 'focus', 'pointerup', 'click'] : ['focus']);
  assert.deepEqual(relevant(candidateEvents), referenceEvents,
    'Reported pointer/focus modality must not be substituted');
  assert.equal(row.resourceSnapshots.length, 1, 'Only one retained snapshot is claimed');
  const snapshot = row.resourceSnapshots[0];
  for (const field of ['phase', 'label', 'timestamp']) {
    assert.equal(Object.hasOwn(snapshot, field), false, 'Do not invent a timed endpoint');
  }
  const logicalId = snapshot.surface.interaction.focusedElementId;
  assert.equal(logicalId, `${row.family}-control`, 'Wrong recorded logical focus owner');
  assert.equal(typeof snapshot.surface.interaction.focusVisible, 'boolean');
  const candidate = tree(row.inputTrees.astylar);
  const owner = candidate.nodes.find(node => node.authored?.id === logicalId);
  assert.equal(owner?.authored.type, 'input', 'Logical owner must be the declared input');
  const byKey = new Map(candidate.nodes.map(node => [node.key, node]));
  const seen = new Set(), ancestors = [];
  for (let node = owner; node; node = byKey.get(node.parent)) {
    assert.equal(seen.has(node.key), false, 'Cyclic input-owner ancestry');
    seen.add(node.key); ancestors.push(node.authored?.id);
  }
  assert.ok(ancestors.includes(primary), 'Input must belong to the expected component');
  const reference = tree(row.inputTrees.reference);
  const host = reference.nodes.find(node => node.attributes?.id === primary);
  assert.ok(host);
  const inputs = reference.nodes.filter(node => node.type === 'input' &&
    (node.key === host.key || node.key.startsWith(`${host.key}/`)));
  assert.equal(inputs.length, 1, 'Declared native input correspondence only');
  return { focusVisible: snapshot.surface.interaction.focusVisible, reportedPointerFocus };
}

test('retained input focus snapshots bind declared logical owners without proving paired DOM focus', t => {
  const rows = loadCapture().interactions.filter(row =>
    families.includes(row.family) && row.state === 'focus');
  const key = row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
  const expected = families.flatMap(family => profiles.flatMap(profile =>
    viewports.map(viewport => `interaction:${family}@${profile}/${viewport}/focus`)));
  assert.equal(rows.length, 40);
  assert.deepEqual(rows.map(key).sort(), expected.sort());
  const visibilityFalse = [];
  for (const row of rows) {
    const result = inspectSnapshot(row);
    assert.equal(result.reportedPointerFocus, row.family === 'timepicker');
    if (!result.focusVisible) visibilityFalse.push(key(row));
  }
  // Preserve the observed eight false flags; this is not expected-correct UI
  // behavior or a painted-focus measurement. All normalized matches are true.
  assert.deepEqual(visibilityFalse.sort(), profiles.flatMap(profile => viewports.map(viewport =>
    `interaction:timepicker@${profile}/${viewport}/focus`)).sort());
  t.diagnostic('40 exact historical cases; 80 authenticated trees; renderer logical input owners map inside the expected components. The32 focus-callback-only rows have focusVisible=true;all8 Timepicker rows report pointer/focus callbacks and focusVisible=false. Full raw pointerenter/move records remain preserved. Matching component IDs and unlabelled snapshots do not prove event trust, paired DOM owners, action ordering, focus paint, current rendering or case closure.');
});

test('matching normalized IDs cannot conceal wrong owners, missing modality or fabricated timing', () => {
  const row = loadCapture().interactions.find(row => row.family === 'autocomplete' &&
    row.profile === 'light' && row.viewport.id === 'desktop-dpr1' && row.state === 'focus');
  const wrongOwner = structuredClone(row);
  wrongOwner.resourceSnapshots[0].surface.interaction.focusedElementId = 'autocomplete-primary';
  assert.equal(wrongOwner.focus.matches, true);
  assert.throws(() => inspectSnapshot(wrongOwner), /Wrong recorded logical focus owner/);
  const inventedPhase = structuredClone(row);
  inventedPhase.resourceSnapshots[0].phase = 'after-action';
  assert.throws(() => inspectSnapshot(inventedPhase), /Do not invent a timed endpoint/);
  const missingVisibility = structuredClone(row);
  delete missingVisibility.resourceSnapshots[0].surface.interaction.focusVisible;
  assert.throws(() => inspectSnapshot(missingVisibility));
  const pointerCase = structuredClone(loadCapture().interactions.find(row =>
    row.family === 'timepicker' && row.profile === 'light' &&
    row.viewport.id === 'desktop-dpr1' && row.state === 'focus'));
  pointerCase.eventComparison.reference = pointerCase.eventComparison.reference.filter(event =>
    event.type === 'focus');
  assert.throws(() => inspectSnapshot(pointerCase), /modality must not be substituted/);
});
