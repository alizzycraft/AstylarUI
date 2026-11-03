import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const generation = '8f94a1075751d28052fab3f5b4e3f3e9da3b45057d0bdb9875362fdfb32ed727';
const indexSha256 = 'e043b3feaa8d780828df6c5486c83914e773598643e6eb798b91f60e67323878';

function inspect(reference, candidate, focused) {
  const hosts = reference.nodes.filter(n => n.attributes?.id === 'toolbar-action');
  assert.equal(hosts.length, 1);
  const host = hosts[0];
  assert.equal(host.attributes.class.includes('cdk-program-focused'), focused);
  const layers = reference.nodes.filter(n => n.parent === host.key &&
    n.attributes?.class?.split(/\s+/).includes('mat-mdc-button-persistent-ripple'));
  assert.equal(layers.length, 1);
  const pseudo = layers[0].pseudoElements.find(p => p.pseudo === '::before');
  assert.equal(pseudo.generated, true);
  const style = reference.styles[pseudo.style];
  assert.equal(style.opacity, focused ? '0.12' : '0');
  if (focused) assert.ok(pseudo.rules.map(i => reference.rules[i]).some(r =>
    r.active && r.selector.includes('cdk-program-focused') && r.declarations.opacity));
  const buttons = candidate.nodes.filter(n => n.authored?.id === 'toolbar-action');
  assert.equal(buttons.length, 1);
  const button = buttons[0];
  assert.equal(button.normalResolvedStyle.background, 'transparent');
  assert.equal(button.resolvedStyle.background, 'transparent');
  assert.equal(candidate.nodes.filter(n => n.key.startsWith(button.key + '/')).length, 0);
  assert.ok(!candidate.rules.some(r => /(?:\.toolbar-action|#toolbar-action):focus/.test(r.selector)));
  return { referenceLayer: { color: style.backgroundColor, opacity: style.opacity },
    candidateBackground: button.resolvedStyle.background };
}

test('toolbar text-button focus omits the native layer independently of filled-button scope', t => {
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  const rows = cases.filter(r => r.family === 'toolbar' && r.case.endsWith('/focus'));
  assert.deepEqual(rows.map(r => r.case).sort(), ['light', 'dark', 'contrast', 'custom']
    .flatMap(p => [1, 2].map(d => `interaction:toolbar@${p}/desktop-dpr${d}/focus`)).sort());
  const observations = [];
  for (const row of rows) {
    const load = item => Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = item.evidence.pairedTrees[side], bytes = fs.readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      const tree = JSON.parse(bytes); assert.deepEqual(tree.errors, []);
      return [side, tree];
    }));
    const trees = load(row);
    observations.push({ case: row.case, ...inspect(trees.reference, trees.astylar, true),
      evidence: row.evidence.pairedTrees });
    const control = cases.find(r => r.case === row.case.replace(/\/focus$/, '/activate-leave'));
    assert.ok(control);
    const inactive = load(control);
    inspect(inactive.reference, inactive.astylar, false);
    const changed = structuredClone(trees.astylar);
    changed.nodes.find(n => n.authored?.id === 'toolbar-action').resolvedStyle.background = '#ffffff';
    assert.throws(() => inspect(trees.reference, changed, true));
  }
  const source = fs.readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(source), 'b493a355679903f988e29f0dafbb95d2d6cce41275302fce5c978ae55f423b9f');
  assert.ok(source.includes("selector: '.toolbar-action:hover'"));
  assert.ok(!/(?:\.toolbar-action|#toolbar-action):focus/.test(source));
  t.diagnostic(JSON.stringify({ generation, indexSha256, observations, inactiveControls: 8,
    boundary: 'Retained unfilled toolbar action focus input omission, not physical paint, equal-input core failure, current runtime or whole-case acceptance. Pending coherent inventory/coverage integration.' }));
});

test('retained toolbar leave pixels change despite identical recorded candidate action nodes', t => {
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  const observations = [];
  // Decoded hashes bind the retained pixels now; they are not asserted to be
  // original capture-time PNG receipts or evidence of current runtime behavior.
  const expected = {
    contrast: ['d92d051a206d13c6c271aa7687794e28b72b9f7125b8a3660c986921b2bbc674',
      'f9896fcf571545583cdde2b6fbf1e5f4eb4c884007fea64196793e5cfa05568f',
      '3fa01f0a4ded2cc404ab43b90abf17fe782b58834b5e250f2209f2ca6cb499a3'],
    custom: ['e8fe0c41ac81b7f28ecc7c0d8410a82feebe3336096a529d38c59f51c5989a06',
      'd96c98f74c3bc79056561c711c5b97b8d70eac2a8d12f3d1781c35bab1d5cad5',
      'eb940f0404f89c1399608b06133ce9b7ed75b975e3f1fbdd9750e5a5f43eb6df'],
  };
  for (const profile of ['contrast', 'custom']) {
    const ids = [`static:toolbar@${profile}/desktop`,
      `interaction:toolbar@${profile}/desktop-dpr1/activate-leave`];
    const nodes = [], pixels = [];
    for (const id of ids) {
      const row = cases.find(r => r.case === id); assert.ok(row);
      const receipt = row.evidence.pairedTrees.astylar, treeBytes = fs.readFileSync(receipt.file);
      assert.equal(hash(treeBytes), receipt.sha256);
      const nodesForId = JSON.parse(treeBytes).nodes.filter(n => n.authored?.id === 'toolbar-action');
      assert.equal(nodesForId.length, 1); nodes.push(nodesForId[0]);
      pixels.push(Object.fromEntries(['reference', 'astylar'].map(side => {
        const file = row.evidence.pairedTrees[side].file.replace(`${side}-input-tree.json`,
          `toolbar-action-alignment-${side}.png`);
        const image = PNG.sync.read(fs.readFileSync(file));
        return [side, { width: image.width, height: image.height, rgbaSha256: hash(image.data) }];
      })));
    }
    assert.deepEqual(nodes[0], nodes[1]);
    assert.deepEqual(pixels[0].reference, pixels[1].reference);
    assert.equal(pixels[0].reference.rgbaSha256, expected[profile][0]);
    assert.equal(pixels[0].astylar.rgbaSha256, expected[profile][1]);
    assert.equal(pixels[1].astylar.rgbaSha256, expected[profile][2]);
    assert.notEqual(pixels[0].astylar.rgbaSha256, pixels[1].astylar.rgbaSha256);
    observations.push({ profile, cases: ids, pixels });
  }
  t.diagnostic(JSON.stringify({ observations,
    boundary: 'Recorded node identity does not prove complete equal runtime inputs. Core cause, original timing/material/focus ownership, current rendering and whole-case acceptance remain unproved.' }));
});
