import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { collectRootBackgroundInputs, inspectRootBackgroundInputs, inspectSidenavBackgroundInputs } from '../../scripts/audit-material-root-background-inputs.mjs';

const readJson = file => JSON.parse(readFileSync(file));
const original = readJson('artifacts/material-parity/current-ancestry-audit/latest-report.json');
const entry = original.results.find(row => row.family === 'card' && row.profile === 'light' && row.viewport.id === 'desktop');
const base = { input: entry.styleInputs.find(input => input.id === 'card-root'),
  reference: readJson(entry.inputTrees.reference.file), candidate: readJson(entry.inputTrees.astylar.file) };
const mix = (surface, primary, amount) => '#' + [1, 3, 5].map(index => Math.round(
  parseInt(surface.slice(index, index + 2), 16) * (1 - amount) + parseInt(primary.slice(index, index + 2), 16) * amount,
).toString(16).padStart(2, '0')).join('');
const inspect = value => inspectRootBackgroundInputs(value.input, value.reference, value.candidate, mix);
const refRoot = value => value.reference.nodes.find(node => node.attributes?.id === 'card-root');
const target = value => value.candidate.nodes.find(node => node.authored?.id === 'card-root');

test('sidenav background mismatch binds all 62 original owners and rejects competing paint paths', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  assert.equal(hash(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json')),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const members = [...original.results, ...original.interactions].filter(c => c.family === 'sidenav');
  assert.equal(members.length, 62);
  const counts = new Map();
  let sample;
  for (const member of members) {
    const trees = ['reference', 'astylar'].map(side => {
      const descriptor = member.inputTrees[side], bytes = readFileSync(descriptor.file);
      assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
    });
    const inputs = member.styleInputs.filter(i => i.id === 'sidenav-primary');
    assert.equal(inputs.length, 1);
    const value = { input: inputs[0], reference: trees[0], candidate: trees[1] };
    const before = JSON.stringify(value);
    const proof = inspectSidenavBackgroundInputs(value.input, value.reference, value.candidate);
    assert.equal(JSON.stringify(value), before);
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.rendererDefectProven, false);
    assert.equal(proof.referenceComputed, 'rgb(254, 248, 252)');
    counts.set(proof.candidateRequested, (counts.get(proof.candidateRequested) ?? 0) + 1);
    sample ??= value;
  }
  assert.deepEqual(Object.fromEntries(counts), { '#fffbfe': 16, '#1c1b1f': 16, '#ffffff': 15, '#f4fbfa': 15 });
  const ref = v => v.reference.nodes.find(n => n.attributes?.id === 'sidenav-primary');
  const ast = v => v.candidate.nodes.find(n => n.authored?.id === 'sidenav-primary');
  const mutations = [
    v => { v.reference.nodes.push(structuredClone(ref(v))); },
    v => { ref(v).inline.background = { value: 'red', important: false }; },
    v => { ref(v).rules.push(ref(v).rules.at(-1)); },
    v => { v.reference.rules[ref(v).rules.at(-1)].active = false; },
    v => { v.reference.rules[ref(v).rules.at(-1)].declarations.animation = { value: 'fade 1s' }; },
    v => { v.input.reference.height = '999px'; },
    v => { delete v.input.astylarNormalResolvedStyle; },
    v => { ast(v).interactionResolvedStyle.background = '#ffffff'; },
    v => { ast(v).authored.style = { background: 'red' }; },
    v => { v.input.astylarAuthored[0].declarations.background = '#ffffff'; },
    v => { v.candidate.rules[v.input.astylarAuthored[0].index].background = '#ffffff'; },
    v => { v.candidate.resolvedStyleSource = 'inferred'; },
    v => { v.input.astylarResolvedStyleEvidenceVersion = 1; },
  ];
  for (const mutate of mutations) {
    const v = structuredClone(sample); mutate(v);
    assert.throws(() => inspectSidenavBackgroundInputs(v.input, v.reference, v.candidate));
  }
});

test('captured source path establishes unequal root color inputs without legacy normalization', () => {
  const before = JSON.stringify(base), proof = inspect(base);
  assert.equal(proof.classification, 'application-plugin-authoring-defect');
  assert.deepEqual(proof.referenceMix, { numerators: [24588, 24074, 24860], denominator: 100 });
  assert.deepEqual(proof.candidateChannelNumerators, [24600, 24100, 24900]);
  assert.equal(proof.inputEquivalent, false);
  assert.equal(proof.rendererDefectProven, false);
  assert.equal(proof.rasterDifferenceProven, false);
  assert.equal(JSON.stringify(base), before);
});

test('source review rejects changed ownership, variables, expression, or captured stages', () => {
  const controls = [
    value => { value.input.id = 'missing-root'; },
    value => { refRoot(value).inline.background = { value: 'red', important: false }; },
    value => { const r = value.reference.rules[refRoot(value).rules[0]]; r.cssText = r.cssText.replace('94%', '95%'); },
    value => { value.reference.rules[refRoot(value).rules[0]].declarations['--surface'] = { value: '#ffffff', important: false }; },
    value => { value.reference.nodes.find(node => node.key === 'frame').inline['--surface'].value = '#ffffff'; },
    value => { value.reference.nodes.find(node => node.key === 'frame').inline['--primary'].important = true; },
    value => { value.reference.rules[refRoot(value).rules[0]].conditions.push('(min-width: 100px)'); },
    value => { target(value).authored.style = { background: '#f6f1f9' }; },
    value => { target(value).interactionResolvedStyle.background = '#ffffff'; },
    value => { value.input.astylar.background = '#ffffff'; },
    value => { value.input.astylarAuthored[0].declarations.background = '#ffffff'; },
    value => { value.input.reference.backgroundColor = 'rgb(246, 241, 249)'; },
  ];
  for (const mutate of controls) {
    const value = structuredClone(base); mutate(value);
    assert.throws(() => inspect(value));
  }
});

test('all 144 root groups and 2311 observations are freshly source-verified', () => {
  const report = collectRootBackgroundInputs();
  assert.deepEqual(report, readJson('docs/material-root-background-inputs.json'));
  assert.deepEqual(report.counts, { cases: 2311, groups: 144, families: 36 });
  const diagnostic = readJson('docs/material-fractional-color-loss.json');
  const hidden = diagnostic.findings.filter(row => row.disposition === 'difference-suppressed-by-rounding');
  const observations = rows => rows.flatMap(row => row.observations.map(observation =>
    JSON.stringify([row.family, row.element, row.property, observation.case, observation.inputSha256]))).sort();
  assert.deepEqual(observations(report.findings), observations(hidden));
  assert.equal(report.canonicalReportChanged, false);
  assert.equal(report.rendererChanged, false);
});
