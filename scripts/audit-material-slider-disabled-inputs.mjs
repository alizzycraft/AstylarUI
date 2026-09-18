import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = nodes => { assert.equal(nodes.length, 1, 'owner must be unique'); return nodes[0]; };
const id = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;

export function inspectSliderDisabledInputs(input, reference, candidate) {
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(input.id, 'slider-visual');
  const r = one(reference.nodes.filter(n => id(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'mat-slider'); assert.equal(a.authored.type, 'showcase.material:range-visual');
  assert.ok(r.attributes.class.split(/\s+/).includes('mdc-slider--disabled'));
  assert.equal(reference.styles[r.style].opacity, '0.38');
  assert.equal(input.reference.opacity, reference.styles[r.style].opacity);
  const rule = one(r.rules.map(index => reference.rules[index]).filter(rule => rule.active === true &&
    rule.selector === '.mat-mdc-slider.mdc-slider--disabled' && rule.declarations.opacity?.value === '0.38'));
  assert.equal(Object.hasOwn(a.authored, 'disabled'), false);
  assert.equal(Object.hasOwn(a.authored.data, 'disabled'), false);
  assert.equal(Object.hasOwn(a.authored.data, 'opacity'), false);
  assert.equal(candidate.nodes.filter(n => n.parent === a.key).length, 0);
  const parent = one(candidate.nodes.filter(n => n.key === a.parent));
  assert.equal(parent.authored.id, 'slider-pair');
  assert.ok(candidate.rules.every(rule => !Object.hasOwn(rule, 'all')), 'reset request requires separate review');
  const opacityRules = candidate.rules.filter(rule => Object.hasOwn(rule, 'opacity'));
  assert.deepEqual(opacityRules.map(rule => [rule.selector, rule.opacity]),
    [['#slider-disabled', '1'], ['#slider-start', '0'], ['#slider-primary', '0']],
    'all original opacity requests must remain visible');
  const controls = ['slider-start', 'slider-primary'].map(owner => {
    const rc = one(reference.nodes.filter(n => id(n) === owner));
    const ac = one(candidate.nodes.filter(n => n.authored?.id === owner));
    assert.equal(rc.parent, r.key); assert.equal(ac.parent, parent.key);
    assert.equal(rc.type, 'input'); assert.equal(rc.attributes.type, 'range');
    assert.equal(ac.authored.type, 'input'); assert.equal(ac.authored.inputType, 'range');
    assert.equal(Object.hasOwn(rc.attributes, 'disabled'), true); assert.equal(ac.authored.disabled, true);
    return { element: owner, reference: rc.attributes, candidate: ac.authored };
  });
  const ancestors = [], seen = new Set();
  for (let n = a; n; n = n.parent == null ? undefined : one(candidate.nodes.filter(p => p.key === n.parent))) {
    assert.ok(!seen.has(n.key), 'cyclic ancestry'); seen.add(n.key);
    if (n.key === 'root') {
      assert.equal(n.parent, null); assert.equal(n.resolvedStyle, undefined);
      ancestors.push({ node: n.key, kind: 'synthetic-root-no-captured-local-style' }); continue;
    }
    const stages = {};
    assert.equal(Object.hasOwn(n.authored, 'style'), false, 'inline request requires separate review');
    assert.equal(Object.hasOwn(n.authored.attributes ?? {}, 'style'), false);
    assert.ok(opacityRules.every(rule => rule.selector !== '#' + n.authored.id),
      'an authored opacity request applies to candidate visual ancestry');
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      assert.equal(Number(n[stage].opacity), 1, 'candidate ancestor opacity requires separate review');
      stages[stage] = n[stage].opacity;
    }
    ancestors.push({ node: n.key, authored: n.authored, opacity: stages });
  }
  assert.equal(input.astylar.opacity, a.resolvedStyle.opacity);
  assert.equal(input.astylarNormalResolvedStyle.opacity, a.normalResolvedStyle.opacity);
  assert.equal(input.astylarInteractionResolvedStyle.opacity, a.interactionResolvedStyle.opacity);
  return { referenceOwner: r.key, candidateOwner: a.key, referenceRule: rule,
    referenceOpacity: input.reference.opacity, candidateOpacity: input.astylar.opacity,
    candidateAncestors: ancestors, candidateOpacityRules: opacityRules, controls,
    classification: 'application-plugin-authoring-defect',
    owner: 'Material slider fixture disabled-state propagation to its separate visual owner',
    inputEquivalent: false, rendererCauseProven: false, renderedOpacityVerified: false,
    limitation: 'Original host opacity/disabled-state inputs differ before projection. Input controls are disabled on both sides, but candidate visual authoring has no disabled state or opacity request and its captured local ancestry remains opaque. This does not prove final group compositing, pointer behavior, or the cause of swapped/jerky dragging.' };
}

export function collectSliderDisabledInputs() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), observations = [], seen = new Set();
  let sliderCases = 0, matchingOpacityCases = 0;
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const target = realpathSync(descriptor.file); assert.ok(target.startsWith(boundary));
    const data = readFileSync(target); assert.equal(hash(data), descriptor.sha256); return JSON.parse(data);
  };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key);
    if (entry.family !== 'slider') continue;
    sliderCases++;
    const input = one(entry.styleInputs.filter(i => i.id === 'slider-visual'));
    assert.ok([input.reference.opacity, input.astylar.opacity].every(v => typeof v === 'string' && v.trim() && Number.isFinite(Number(v))));
    // Opacity's numeric serialization is the production audit's exact equality
    // rule: 1 and 1.0 are not new differences. Preserve raw scalars in witnesses.
    if (Number(input.reference.opacity) === Number(input.astylar.opacity)) { matchingOpacityCases++; continue; }
    assert.equal(kind, 'interaction'); assert.equal(entry.state, 'disabled');
    observations.push({ case: key, profile: entry.profile, viewport: entry.viewport, state: entry.state,
      originalInputSha256: digest(input), inputTrees: entry.inputTrees,
      proof: inspectSliderDisabledInputs(input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
  }
  assert.deepEqual([seen.size, sliderCases, matchingOpacityCases, observations.length], [2311, 78, 70, 8]);
  return { schemaVersion: 1, kind: 'original-slider-disabled-input-audit',
    originalCapture: { file, sha256 }, originalCasesScanned: seen.size, sliderCases, matchingOpacityCases,
    observations, canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectSliderDisabledInputs(), file = 'docs/material-slider-disabled-inputs.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ cases: report.observations.length, sliderCases: report.sliderCases,
    matchingOpacityCases: report.matchingOpacityCases, canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
