import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectOwnerInitialMotion } from './audit-material-owner-initial-motion.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const revision = '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0';
const proofFile = 'docs/material-owner-initial-motion-review.json';
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const flags = ['inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent'];

// Pure membership/classification proposal. Authentication belongs to the full
// collector below; a self-consistent object alone is not source evidence.
export function planOwnerMotionAttribution(motion, rows, normalize) {
  assert.equal(motion.kind, 'owner-initial-motion-target-review');
  assert.equal(motion.canonicalAttributionChanged, false);
  for (const flag of flags) assert.equal(motion[flag], false);
  const proposed = [], retained = [], selected = new Set(), identities = new Set();
  let observations = 0;
  for (const g of motion.findings) {
    const identity = JSON.stringify([g.family, g.element, g.property]);
    assert.ok(!identities.has(identity), 'duplicate motion group'); identities.add(identity);
    assert.equal(g.candidateLocalDeclaration, '<omitted>');
    const reference = normalize({ [g.property]: g.reference })[g.property];
    const candidates = rows.filter(r => r.family === g.family && r.element === g.element &&
      r.property === g.property && r.reference === reference && r.astylar === undefined && r.attribution === 'unresolved');
    assert.equal(candidates.length, 1, 'missing or changed unresolved canonical group');
    const row = candidates[0], cases = g.observations.map(o => o.case);
    assert.equal(row.occurrences, cases.length); assert.equal(new Set(cases).size, cases.length);
    same(row.cases, cases.slice(0, 12), 'ordered canonical case sample changed');
    const states = cases.map(key => key.startsWith('static:') ? 'static' : key.split('/').slice(2).join('/'));
    same(row.states, [...new Set(states)], 'canonical state membership changed');
    assert.ok(cases.length > 0);
    for (const o of g.observations) {
      const pattern = motion.patterns[o.pattern]; assert.ok(pattern);
      assert.equal(pattern.sha256, digest(pattern.review), 'motion pattern changed');
      const review = pattern.review, p = review.proof;
      assert.equal(review.disposition, o.disposition);
      assert.equal(p.property, g.property); assert.equal(p.element, g.element);
      assert.equal(normalize({ [g.property]: p.referenceComputed })[g.property], reference);
      assert.equal(p.candidateLocalDeclaration, '<omitted>');
      assert.equal(p.source, 'core-style-inspection');
      assert.ok(Number.isInteger(o.revision) && o.revision >= 0);
      for (const flag of flags) assert.equal(review[flag], false);
      assert.equal(p.computedCandidateVerified, false); assert.equal(p.renderingEquivalent, false);
      assert.ok(p.issues.length > 0 && p.issues.every(i => i.reason === 'motion-request-needs-review' && i.side === 'reference'));
      assert.match(o.originalInputSha256, /^[a-f0-9]{64}$/); assert.match(o.originalProofSha256, /^[a-f0-9]{64}$/);
      if (review.disposition === 'captured-motion-targets-disjoint') assert.deepEqual(review.reasons, []);
      else assert.equal(review.disposition, 'requires-specific-review');
    }
    const eligible = g.observations.every(o => o.disposition === 'captured-motion-targets-disjoint');
    assert.equal(g.disposition, eligible ? 'captured-motion-targets-disjoint' : 'requires-specific-review');
    const joined = { family: g.family, element: g.element, property: g.property, reference,
      candidateLocalDeclaration: '<omitted>', occurrences: row.occurrences,
      canonicalRowSha256: digest(row), proofGroupSha256: digest(g), cases,
      orderedObservationSha256: digest(g.observations), preservedStaticCases: g.preservedStaticCases };
    if (eligible) {
      selected.add(row);
      proposed.push({ ...joined, classification: 'parity-harness-defect',
        attribution: 'reviewed-owner-motion-initial-observation-stage',
        recommendedOwner: 'input audit computed-value versus local-declaration observation boundary',
        justification: 'The mapped source captures a browser-computed initial value against omission at every candidate local declaration stage. All captured reference motion requests name disjoint properties or explicitly name no animation. Original requests and issues remain in the bound proof. This attributes the observation-stage distinction only; external inheritance, candidate computed/used values, indirect motion effects and renderer behavior are not established.',
        inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false, rendererCauseProven: false });
    } else retained.push({ ...joined, disposition: 'requires-specific-review' });
    observations += cases.length;
  }
  assert.equal(motion.groups, motion.findings.length); assert.equal(motion.observations, observations);
  assert.equal(motion.disjointGroups, proposed.length); assert.equal(motion.remainingReviewGroups, retained.length);
  return { sourceGroups: motion.groups, sourceObservations: observations, proposedGroups: proposed.length,
    proposedObservations: proposed.reduce((n, g) => n + g.occurrences, 0), retainedGroups: retained.length,
    retainedObservations: retained.reduce((n, g) => n + g.occurrences, 0), canonicalRows: rows.length,
    baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, retained, canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectOwnerMotionAttribution() {
  const bytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), 'f8f90799191604823875d849fb6ae56de46dd96c37e3f91c8d540bdd48916294');
  const motion = collectOwnerInitialMotion();
  same(motion, JSON.parse(bytes), 'entire original motion proof must freshly replay');
  const normalization = JSON.parse(readFileSync('docs/material-font-ownership-attribution-plan.json')).productionNormalization;
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const { manifest, rows } = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const plan = planOwnerMotionAttribution(motion, rows, normalize);
  assert.equal(plan.sourceGroups, 121); assert.equal(plan.sourceObservations, 7254);
  assert.equal(plan.proposedGroups, 86); assert.equal(plan.proposedObservations, 4708);
  assert.equal(plan.retainedGroups, 35); assert.equal(plan.retainedObservations, 2546);
  return { schemaVersion: 1, kind: 'source-replayed-owner-motion-attribution-proposal',
    sourceProof: { file: proofFile, sha256: hash(bytes) }, sourceProofReplayed: true,
    canonicalRevision: revision, canonicalPayload: manifest, productionNormalization: normalization,
    scope: 'Historical proposal only. Current canonical integration and complete-row conservation remain separate. No renderer, plugin or reference changes.',
    ...plan };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const result = await collectOwnerMotionAttribution(), output = JSON.stringify(result, null, 2) + '\n';
  const file = 'docs/material-owner-motion-attribution-plan.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(file, output);
  console.log(JSON.stringify({ proposedGroups: result.proposedGroups, proposedObservations: result.proposedObservations,
    retainedGroups: result.retainedGroups, retainedObservations: result.retainedObservations,
    otherCompleteRows: result.otherCompleteRows, sha256: hash(output), canonicalFilesChanged: false }));
}
