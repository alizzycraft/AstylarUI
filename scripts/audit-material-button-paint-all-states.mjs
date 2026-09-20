import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { observeButtonStatePaint } from './audit-material-button-state-paint.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const sourceFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const sourceHash = 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a';
const outputFile = 'docs/material-button-paint-all-states.json';

// Reuse the existing owner/pseudo/scalar observer, but remove the old survey's
// hover/held selection boundary. Original state labels and all inactive owners
// remain in evidence; this does not classify canonical groups or infer pixels.
export function collectButtonPaintAllStates() {
  const bytes = readFileSync(sourceFile); assert.equal(hash(bytes), sourceHash);
  const original = JSON.parse(bytes), boundary = realpathSync('artifacts/material-parity');
  const cache = new Map();
  const load = descriptor => {
    const absolute = realpathSync(descriptor.file), relative = path.relative(boundary, absolute);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    if (!cache.has(absolute)) {
      const bytes = readFileSync(absolute), tree = JSON.parse(bytes);
      assert.deepEqual(tree.errors, []); assert.equal(tree.schemaVersion, 1);
      cache.set(absolute, { sha256: hash(bytes), tree });
    }
    const result = cache.get(absolute); assert.equal(result.sha256, descriptor.sha256); return result.tree;
  };
  const findings = [], patterns = [], indexes = new Map(), scanned = [], selected = new Set();
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!scanned.includes(key)); scanned.push(key);
    const candidate = load(e.inputTrees.astylar);
    const owners = candidate.nodes.filter(n => (n.authored?.class ?? '').split(/\s+/).includes('material-button'));
    if (!owners.length) continue;
    const reference = load(e.inputTrees.reference);
    for (const node of owners) {
      const observation = observeButtonStatePaint({ ...e, state: e.state ?? 'static' }, node, reference, candidate);
      const identity = JSON.stringify([key, observation.element]); assert.ok(!selected.has(identity)); selected.add(identity);
      const { case: oldCase, family, profile, viewport, state, inputTrees, ...proof } = observation;
      const proofHash = digest(proof);
      if (!indexes.has(proofHash)) { indexes.set(proofHash, patterns.length); patterns.push({ sha256: proofHash, proof }); }
      const input = e.styleInputs.find(i => i.id === observation.element);
      findings.push({ case: key, family, profile, viewport, state, element: observation.element,
        originalInputSha256: digest(input), inputTrees, pattern: indexes.get(proofHash) });
    }
  }
  assert.equal(scanned.length, 2311);
  const priorFile = 'docs/material-button-state-paint-survey.json';
  const priorBytes = readFileSync(priorFile, 'utf8').replaceAll('\r\n', '\n'), prior = JSON.parse(priorBytes);
  const priorObservations = findings.filter(f => f.case.startsWith('interaction:') && ['hover', 'held'].includes(f.state)).map(f => {
    const { proof } = patterns[f.pattern];
    return { case: `${f.family}/${f.profile}/${f.viewport.id}/${f.state}`, family: f.family,
      profile: f.profile, viewport: f.viewport, state: f.state, inputTrees: f.inputTrees, ...proof };
  });
  assert.ok(isDeepStrictEqual(priorObservations, prior.observations), 'all 146 historical observations must be conserved');
  const active = findings.filter(f => patterns[f.pattern].proof.classification === 'application-plugin-authoring-defect');
  const sources = ['scripts/audit-material-button-paint-all-states.mjs', 'scripts/audit-material-button-state-paint.mjs',
    'examples/material-showcase/src/app/astylar.component.ts', 'examples/material-showcase/src/app/theme.ts'];
  return { schemaVersion: 1, kind: 'shared-button-all-state-paint-input-census',
    capture: { file: sourceFile, sha256: sourceHash }, priorSurvey: { file: priorFile, sha256: hash(priorBytes) },
    casesScanned: scanned.length, scannedCaseOrderSha256: digest(scanned),
    observations: findings.length, activeLayerObservations: active.length,
    inactiveLayerObservations: findings.length - active.length, preservedHistoricalObservations: priorObservations.length,
    sources: sources.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    findings, patterns, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'All original cases are scanned for authored shared material-button hosts. Active-layer authoring is reviewed, not equivalent paint, inactive paint correctness, current pseudo-state ownership or canonical classification. The old hover/held subset is conserved exactly.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const result = collectButtonPaintAllStates(), output = JSON.stringify(result, null, 2) + '\n';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(outputFile, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(outputFile, output);
  console.log(JSON.stringify({ cases: result.casesScanned, observations: result.observations,
    active: result.activeLayerObservations, inactive: result.inactiveLayerObservations,
    preserved: result.preservedHistoricalObservations, patterns: result.patterns.length, sha256: hash(output) }));
}
