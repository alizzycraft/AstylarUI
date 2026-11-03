import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { joinFilledFocusInputs, restoreFilledFocusInputs } from '../../scripts/join-material-filled-focus-inputs.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const generation = '0d7ff3c47321cb30b8188724f53b12f7341799aab55cd1703137732e301d4445';
const indexSha256 = 'e5aac04c4db56ba0d365f9a5ccb107bcba6d02455033c18515a6cf1dafd8ab0d';

test('56 retained filled-button focus owners omit the native programmatic focus layer', t => {
  // Pin an immutable accepted generation, never the moving current pointer.
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const families = ['core', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip'];
  const rows = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases
    .filter(row => families.includes(row.family) && row.case.endsWith('/focus'));
  assert.equal(rows.length, 56);
  assert.deepEqual(rows.map(row => row.case).sort(), families.flatMap(family =>
    ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2]
      .map(dpr => `interaction:${family}@${profile}/desktop-dpr${dpr}/focus`))).sort());
  const observations = [];
  for (const row of rows) {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.evidence.pairedTrees[side], source = fs.readFileSync(receipt.file);
      assert.equal(hash(source), receipt.sha256);
      return [side, JSON.parse(source)];
    }));
    assert.deepEqual(trees.reference.errors, []);
    assert.deepEqual(trees.astylar.errors, []);
    const primaryId = `${row.family}-primary`;
    const native = trees.reference.nodes.find(node => node.attributes?.id === primaryId);
    assert.ok(native?.attributes.class.includes('mat-mdc-unelevated-button'));
    assert.ok(native.attributes.class.includes('cdk-program-focused'));
    const ripple = trees.reference.nodes.find(node => node.parent === native.key && node.attributes?.class ===
      'mat-mdc-button-persistent-ripple mdc-button__ripple');
    assert.ok(ripple);
    const pseudo = ripple.pseudoElements.find(node => node.pseudo === '::before');
    assert.equal(pseudo?.generated, true);
    const style = trees.reference.styles[pseudo.style];
    assert.equal(style.opacity, '0.12');
    assert.equal(style.backgroundColor, row.case.includes('@dark/') ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
    const rule = pseudo.rules.map(i => trees.reference.rules[i]).find(rule =>
      rule.active && rule.selector.includes('cdk-program-focused') && rule.declarations.opacity);
    assert.ok(rule, 'Native layer must be tied to programmatic focus, not inferred from color');
    const button = trees.astylar.nodes.find(node => node.authored?.id === primaryId);
    assert.ok(button);
    assert.equal(button.interactionResolvedStyle.background, button.normalResolvedStyle.background);
    assert.equal(trees.astylar.nodes.filter(node => node.parent === button.key).length, 0);
    const rules = trees.astylar.rules.filter(rule => rule.selector === '.material-button:focus');
    assert.equal(rules.length, 2);
    for (const rule of rules) {
      assert.equal(rule.background, undefined);
      assert.equal(rule.boxShadow, '0 0 0 1px rgba(0,0,0,0)');
    }
    if (row.family === 'button') {
      // Real retained negative controls: disabled and unfocused outlined owners
      // must not be mistaken for the focused filled primary.
      for (const id of ['button-disabled', 'button-secondary']) {
        const control = trees.reference.nodes.find(node => node.attributes?.id === id);
        assert.ok(control);
        assert.ok(!control.attributes.class.includes('cdk-program-focused'));
        const layer = trees.reference.nodes.find(node => node.parent === control.key &&
          node.attributes?.class === 'mat-mdc-button-persistent-ripple mdc-button__ripple');
        const before = layer.pseudoElements.find(node => node.pseudo === '::before');
        assert.equal(trees.reference.styles[before.style].opacity, '0');
      }
    }
    observations.push({ case: row.case, referenceLayer: { color: style.backgroundColor, opacity: style.opacity },
      candidateFill: button.interactionResolvedStyle.background, trees: row.evidence.pairedTrees });
  }
  t.diagnostic(JSON.stringify({ generation, indexSha256, observations,
    boundary: 'Exact retained opener focus inputs only; shared application-authoring omission, not equal-input core failure, popup paint/sharpness, current rendering or whole-case closure.' }));
});

test('filled focus join preserves every parent case and rejects altered tree receipts', () => {
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  const joined = joinFilledFocusInputs(cases);
  assert.equal(joined.changed, 56);
  assert.equal(joined.canonicalPublished, false);
  assert.deepEqual(restoreFilledFocusInputs(joined.cases), cases);
  for (let i = 0; i < cases.length; i++) {
    assert.equal(joined.cases[i].inspection, cases[i].inspection);
    assert.equal(joined.cases[i].currentRendering, cases[i].currentRendering);
    if (!joined.cases[i].obligations.localPaint.retainedFilledPrimaryFocusLayer)
      assert.equal(joined.cases[i], cases[i]);
  }
  const target = cases.find(row => row.family === 'tooltip' && row.case.endsWith('/focus'));
  assert.throws(() => joinFilledFocusInputs(cases, file => file === target.evidence.pairedTrees.reference.file
    ? Buffer.from('altered') : fs.readFileSync(file)), /AssertionError/);
  assert.throws(() => joinFilledFocusInputs(cases.slice(1)), /Exact accepted parent/);
});
