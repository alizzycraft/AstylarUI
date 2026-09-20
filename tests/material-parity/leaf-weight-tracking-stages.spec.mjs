import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectLeafWeightTracking, bindLeafWeightTrackingNormalization } from '../../scripts/audit-material-leaf-weight-tracking-stages.mjs';

const reportFile = 'docs/material-leaf-weight-tracking-stages.json';
const hash = x => createHash('sha256').update(x).digest('hex');
const proof = JSON.parse(readFileSync(reportFile));
const original = JSON.parse(readFileSync(proof.originalCapture.file));
const normalize = bindLeafWeightTrackingNormalization();
const caseId = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const entries = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, es]) => es.map(e => [caseId(kind, e), e])));
function fixture(f = proof.findings[0]) {
  const entry = entries.get(f.case), input = structuredClone(entry.styleInputs.find(i => i.id === f.element));
  return { input, family: entry.family, property: f.property,
    reference: JSON.parse(readFileSync(f.inputTrees.reference.file)), candidate: JSON.parse(readFileSync(f.inputTrees.astylar.file)) };
}
const run = f => inspectLeafWeightTracking(f.family, f.input, f.reference, f.candidate, f.property, normalize);
const rn = f => f.reference.nodes.find(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === f.input.id);
const an = f => f.candidate.nodes.find(n => n.authored?.id === f.input.id);

test('weight/tracking source proof replays every original capture with writes prohibited', () => {
  const watched = [reportFile, 'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
  const before = watched.map(f => hash(readFileSync(f)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--import', 'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-leaf-weight-tracking-stages.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.observations, 304);
  assert.deepEqual(result.counts, { 'badge-label': 104, 'card-copy': 104, 'divider-above': 48, 'divider-below': 48 });
  assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(watched.map(f => hash(readFileSync(f))), before);
});

test('all 304 source observations reproduce exact recorded proofs without modifying inputs', () => {
  for (const finding of proof.findings) {
    const f = fixture(finding), before = JSON.stringify(f);
    assert.deepEqual(run(f), finding.proof); assert.equal(JSON.stringify(f), before);
    assert.equal(finding.proof.retainedScalarMatches, true);
    for (const flag of ['inputEquivalent', 'wholeElementInputEquivalent', 'rendererCauseProven',
      'renderingEquivalent', 'physicalFontSelectionVerified']) assert.equal(finding.proof[flag], false);
  }
});

test('both properties reject changed ancestry text local declarations motion and retained values', () => {
  const changes = [
    f => { f.family = 'wrong'; }, f => { f.input.id = 'wrong'; },
    f => { f.input.reference[f.property] = 'changed'; },
    f => { f.input.astylar[f.property] = 'changed'; },
    f => { f.input.astylarNormalResolvedStyle[f.property] = 'changed'; },
    f => { f.input.astylarInteractionResolvedStyle[f.property] = 'changed'; },
    f => { f.reference.styles[rn(f).style][f.property] = 'changed'; },
    f => { rn(f).ownText = 'changed'; },
    f => { rn(f).parent = rn(f).key; },
    f => { an(f).authored.textContent = 'changed'; },
    f => { an(f).authored.style = { [f.property]: 'changed' }; },
    f => { an(f).authored.attributes = { ...an(f).authored.attributes, style: 'font: inherit' }; },
    f => { an(f).retainedText.source = 'plugin'; },
    f => { an(f).retainedText.style[f.property] = 'changed'; },
    f => { an(f).resolvedStyle[f.property] = 'changed'; },
    f => { an(f).normalResolvedStyle[f.property] = 'changed'; },
    f => { an(f).interactionResolvedStyle[f.property] = 'changed'; },
    f => { const css = f.property === 'fontWeight' ? 'font-weight' : 'letter-spacing';
      rn(f).inline[css] = { value: 'inherit', important: false }; },
    f => { const css = f.property === 'fontWeight' ? 'font-weight' : 'letter-spacing';
      rn(f).attributes.style = `${css}: inherit`; },
    f => { f.candidate.rules.push({ selector: '#' + f.input.id, [f.property]: 'inherit' }); },
    f => { f.candidate.rules.push({ selector: ':has(.unreviewed)', [f.property]: 'inherit' }); },
    f => { f.candidate.rules.push({ selector: '#' + f.input.id, transition: 'all 1s' }); },
    f => { f.input.referenceAuthored.push({ selector: '#' + f.input.id, declarations: { font: { value: 'inherit' } } }); },
    f => { f.input.astylarAuthored.push({ selector: '#' + f.input.id, declarations: { [f.property]: 'inherit' } }); },
  ];
  let count = 0;
  for (const property of ['fontWeight', 'letterSpacing']) for (const [index, mutate] of changes.entries()) {
    const f = fixture(proof.findings.find(f => f.property === property)); mutate(f);
    assert.throws(() => run(f), `${property} mutation ${index}`); count++;
  }
  assert.equal(count, 48);
});
