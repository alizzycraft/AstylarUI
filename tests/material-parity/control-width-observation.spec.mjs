import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { controlWidthOwners, proveControlWidthRequest } from './control-width-observation.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';

test('control fixed-width requests retain all 544 original owners and reject false equivalence', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const report = JSON.parse(bytes);
  const cases = [...report.results.map(e => ({ ...e, kind: 'static' })),
    ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => controlWidthOwners[e.family]);
  const inventory = collectFullTreeInventory(cases), counts = {}, examples = new Map(), seen = new Set();
  for (const entry of cases) {
    const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    const trees = modalInventoryTrees(inventory, key);
    for (const element of Object.keys(controlWidthOwners[entry.family])) {
      const proof = proveControlWidthRequest(entry, ...trees, element);
      const owner = JSON.stringify([key, element]); assert.ok(!seen.has(owner)); seen.add(owner);
      const signature = `${element}:${proof.candidateAuthoredWidth}`;
      counts[signature] = (counts[signature] ?? 0) + 1;
      for (const flag of ['inputEquivalent', 'structuralEquivalenceVerified', 'candidateUsedLayoutVerified',
        'renderingEquivalent', 'originalRasterCauseProven']) assert.equal(proof[flag], false);
      if (!examples.has(element)) examples.set(element, { entry, trees });
    }
  }
  assert.equal(seen.size, 544);
  assert.deepEqual(counts, {
    'checkbox-primary:149.5625px': 34, 'checkbox-primary:137.5625px': 17, 'checkbox-primary:141.5625px': 17,
    'badge-primary:90.953125px': 26, 'badge-primary:81.859375px': 13, 'badge-primary:104.65625px': 13,
    'radio-primary:153px': 34, 'radio-primary:129px': 17, 'radio-primary:137px': 17,
    'slide-toggle-primary:179px': 68, 'button-toggle-primary:130px': 68, 'button-toggle-two:81px': 68,
    'chip-0:97px': 52, 'chip-0:68px': 24, 'chip-1:93px': 68, 'chip-1:64px': 8,
  });
  for (const [element, { entry, trees }] of examples) {
    const ref = r => r.nodes.find(n => n.attributes?.id === element);
    const ast = a => a.nodes.find(n => n.authored?.id === element);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([, a]) => { a.resolvedStyleSource = 'paint-guess'; },
      ([r]) => { r.nodes.push(structuredClone(ref(r))); },
      ([, a]) => { ast(a).authored.type = 'foreign'; },
      ([r]) => { ref(r).inline = { width: '100px' }; },
      ([r]) => { ref(r).attributes.style = 'inline-size:100px'; },
      ([r]) => { ref(r).rules.push(r.rules.length); r.rules.push({ active: true, cssText: '',
        declarations: { blockSize: { value: '100px' } } }); },
      ([r]) => { ref(r).rules.push(r.rules.length); r.rules.push({ active: true,
        cssText: 'owner { width:100px; }', declarations: {} }); },
      ([, a]) => { ast(a).authored.style = { width: '100px' }; },
      ([, a]) => { a.rules.push({ selector: '#' + element, inlineSize: '100px' }); },
      ([, a]) => { a.rules.push({ selector: '[unreviewed]', blockSize: '100px' }); },
      ([, a]) => { ast(a).normalResolvedStyle.width = 'auto'; },
      ([, a]) => { ast(a).interactionResolvedStyle.all = 'initial'; },
    ]) {
      const altered = structuredClone(trees); mutate(altered);
      assert.throws(() => proveControlWidthRequest(entry, ...altered, element), undefined, element);
    }
    const unrelated = structuredClone(trees); unrelated[1].rules.push({ selector: '#different-owner', width: '1px' });
    assert.deepEqual(proveControlWidthRequest(entry, ...unrelated, element),
      proveControlWidthRequest(entry, ...trees, element));
  }
  // Canonical application awaits independent source replay and exact scalar
  // membership conservation; this proof makes no rendering or default claims.
});
