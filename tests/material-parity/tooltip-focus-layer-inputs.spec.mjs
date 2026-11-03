import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const generation = '0d7ff3c47321cb30b8188724f53b12f7341799aab55cd1703137732e301d4445';
const indexSha256 = 'e5aac04c4db56ba0d365f9a5ccb107bcba6d02455033c18515a6cf1dafd8ab0d';

test('eight retained tooltip focus owners omit the native programmatic focus layer', t => {
  // Pin an immutable accepted generation, never the moving current pointer.
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const rows = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases
    .filter(row => row.family === 'tooltip' && row.case.endsWith('/focus'));
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map(row => row.case).sort(), ['light', 'dark', 'contrast', 'custom']
    .flatMap(profile => [1, 2].map(dpr => `interaction:tooltip@${profile}/desktop-dpr${dpr}/focus`)).sort());
  const observations = [];
  for (const row of rows) {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.evidence.pairedTrees[side], source = fs.readFileSync(receipt.file);
      assert.equal(hash(source), receipt.sha256);
      return [side, JSON.parse(source)];
    }));
    assert.deepEqual(trees.reference.errors, []);
    assert.deepEqual(trees.astylar.errors, []);
    const ripple = trees.reference.nodes.find(node => node.attributes?.class ===
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
    const button = trees.astylar.nodes.find(node => node.authored?.id === 'tooltip-primary');
    assert.ok(button);
    assert.equal(button.interactionResolvedStyle.background, button.normalResolvedStyle.background);
    assert.equal(trees.astylar.nodes.filter(node => node.parent === button.key).length, 0);
    const rules = trees.astylar.rules.filter(rule => rule.selector === '.material-button:focus');
    assert.equal(rules.length, 2);
    for (const rule of rules) {
      assert.equal(rule.background, undefined);
      assert.equal(rule.boxShadow, '0 0 0 1px rgba(0,0,0,0)');
    }
    observations.push({ case: row.case, referenceLayer: { color: style.backgroundColor, opacity: style.opacity },
      candidateFill: button.interactionResolvedStyle.background, trees: row.evidence.pairedTrees });
  }
  t.diagnostic(JSON.stringify({ generation, indexSha256, observations,
    boundary: 'Exact retained opener focus inputs only; shared application-authoring omission, not equal-input core failure, popup paint/sharpness, current rendering or whole-case closure.' }));
});
