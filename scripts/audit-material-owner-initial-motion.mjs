import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOwnerInitialStyle, ownerInitialValues } from '../tests/material-parity/owner-initial-style-survey.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const transitionFields = new Set(['transition-property', 'transition-duration', 'transition-delay',
  'transition-timing-function', 'transition-behavior']);
const animationFields = new Set(['animation-name', 'animation-duration', 'animation-delay',
  'animation-timing-function', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state', 'animation-timeline', 'animation-range-start', 'animation-range-end']);
// Each target is disjoint from every one of the eight audited properties.
// This does not claim these transitions have no indirect layout/paint effect.
const disjointTargets = new Set(['none', 'transform', 'box-shadow', 'border', 'opacity', 'color', 'height']);

export function inspectOwnerInitialMotion(input, property, reference, candidate, family) {
  assert.ok(Object.hasOwn(ownerInitialValues, property));
  const proof = inspectOwnerInitialStyle(input, property, reference, candidate,
    { family, reviewedGeneratedOwners: true });
  const reasons = [], requests = [];
  if (!proof.issues.length || proof.issues.some(i => i.reason !== 'motion-request-needs-review' || i.side !== 'reference')) {
    return { proof, disposition: 'requires-specific-review', reasons: ['not-reference-motion-only'], requests,
      inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false };
  }
  const covered = new Set();
  for (const nodeKey of proof.referencePath) {
    const node = reference.nodes.find(n => n.key === nodeKey);
    for (const index of node.rules) {
      const rule = reference.rules[index];
      const declarations = Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => /^(animation|transition)/.test(k)));
      if (!Object.keys(declarations).length) continue;
      requests.push({ node: nodeKey, index, selector: rule.selector, active: rule.active, conditions: rule.conditions, declarations });
      for (const [key, value] of Object.entries(declarations)) {
        const issue = { reason: 'motion-request-needs-review', side: 'reference', node: nodeKey,
          source: rule.selector, key, value };
        covered.add(JSON.stringify(issue));
        if (!transitionFields.has(key) && !animationFields.has(key)) reasons.push('unreviewed-motion-field');
        if (!value || typeof value.value !== 'string' || typeof value.important !== 'boolean' ||
            !value.value.trim() || /(?:var\(|env\(|inherit|revert|unset|initial|[\\/])/i.test(value.value))
          reasons.push('unresolved-motion-value');
      }
      if (Object.keys(declarations).some(k => transitionFields.has(k))) {
        const target = declarations['transition-property']?.value;
        if (typeof target !== 'string' || !target.split(',').every(t => disjointTargets.has(t.trim())))
          reasons.push('transition-target-not-proven-disjoint');
      }
      if (Object.keys(declarations).some(k => animationFields.has(k)) && declarations['animation-name']?.value !== 'none')
        reasons.push('animation-name-not-proven-none');
    }
  }
  if (proof.issues.some(i => !covered.has(JSON.stringify(i)))) reasons.push('motion-source-not-bound-to-complete-rule');
  return { proof, disposition: reasons.length ? 'requires-specific-review' : 'captured-motion-targets-disjoint',
    reasons: [...new Set(reasons)], requests, inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false };
}

export function collectOwnerInitialMotion() {
  const parentFile = 'docs/material-owner-initial-style-mappings.json', parentBytes = readFileSync(parentFile);
  assert.equal(hash(parentBytes), 'df30ba34cc75ffac7b1187f1f27f25b9bbba59c067da485e19566434cf09f9f0');
  const parent = JSON.parse(parentBytes), rawBytes = readFileSync(parent.capture.file);
  assert.equal(hash(rawBytes), parent.capture.sha256);
  const raw = JSON.parse(rawBytes), entries = new Map();
  for (const [kind, rows] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of rows) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!entries.has(key)); entries.set(key, e);
  }
  assert.equal(entries.size, 2311);
  const groups = parent.groups.filter(g => Object.keys(g.reasons).length === 1 && g.reasons['motion-request-needs-review']);
  assert.equal(groups.length, 121);
  const boundary = realpathSync('artifacts/material-parity'), treeCache = new Map();
  const load = descriptor => {
    const key = JSON.stringify(descriptor); if (treeCache.has(key)) return treeCache.get(key);
    const target = realpathSync(descriptor.file), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    const bytes = readFileSync(target); assert.equal(hash(bytes), descriptor.sha256);
    const tree = JSON.parse(bytes); treeCache.set(key, tree); return tree;
  };
  const patterns = [], patternIndexes = new Map(), findings = [];
  for (const g of groups) {
    const proofHasher = createHash('sha256'), observations = [];
    assert.deepEqual(g.cases, g.reviewedCases); assert.equal(new Set(g.cases).size, g.cases.length);
    for (const key of g.cases) {
      const e = entries.get(key); assert.ok(e); assert.equal(e.family, g.family);
      const inputs = e.styleInputs.filter(i => i.id === g.element); assert.equal(inputs.length, 1);
      const review = inspectOwnerInitialMotion(inputs[0], g.property, load(e.inputTrees.reference), load(e.inputTrees.astylar), e.family);
      proofHasher.update(JSON.stringify({ case: key, proof: review.proof }) + '\n');
      // Revision is per-capture provenance, not a distinct declaration pattern.
      // Preserve it on the observation and authenticate the complete proof.
      const { revision, ...sharedProof } = review.proof;
      const sharedReview = { ...review, proof: sharedProof };
      const digest = hash(JSON.stringify(sharedReview));
      if (!patternIndexes.has(digest)) { patternIndexes.set(digest, patterns.length); patterns.push({ sha256: digest, review: sharedReview }); }
      observations.push({ case: key, inputTrees: e.inputTrees, originalInputSha256: hash(JSON.stringify(inputs[0])),
        originalProofSha256: hash(JSON.stringify(review.proof)), revision,
        pattern: patternIndexes.get(digest), disposition: review.disposition });
    }
    assert.equal(proofHasher.digest('hex'), g.proofSha256, 'complete original diagnostic proof changed');
    assert.equal(observations.length, g.occurrences);
    findings.push({ family: g.family, element: g.element, property: g.property, reference: g.reference,
      candidateLocalDeclaration: g.candidateLocalDeclaration, preservedStaticCases: g.preservedStaticCases,
      proofSha256: g.proofSha256, observations, disposition: observations.every(o => o.disposition === 'captured-motion-targets-disjoint')
        ? 'captured-motion-targets-disjoint' : 'requires-specific-review' });
  }
  assert.equal(findings.reduce((n, g) => n + g.observations.length, 0), 7254);
  const sources = ['scripts/audit-material-owner-initial-motion.mjs', 'tests/material-parity/owner-initial-style-survey.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs'];
  return { schemaVersion: 1, kind: 'owner-initial-motion-target-review', parent: { file: parentFile, sha256: hash(parentBytes) },
    capture: parent.capture, sourceFingerprints: sources.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    groups: findings.length, observations: 7254, disjointGroups: findings.filter(g => g.disposition === 'captured-motion-targets-disjoint').length,
    remainingReviewGroups: findings.filter(g => g.disposition === 'requires-specific-review').length, findings, patterns,
    canonicalAttributionChanged: false, inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false,
    limits: ['Scope is the pinned historical 121-group motion-only backlog, not all current unresolved findings.',
      'All original diagnostic results and ordered memberships are freshly replayed; no raw request or issue is deleted.',
      'Per-rule target checks do not resolve cascade, animations, inherited/used candidate values or CSSOM/Web Animations state.',
      'No candidate computed initial value, input equivalence, output equivalence or absence of indirect visual effects is inferred.',
      'Missing targets, variables, resets, shorthand motion, named animations and non-motion issues remain review cases.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const result = collectOwnerInitialMotion(), output = JSON.stringify(result, null, 2) + '\n';
  const target = 'docs/material-owner-initial-motion-review.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(target, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(target, output);
  console.log(JSON.stringify({ groups: result.groups, observations: result.observations, disjointGroups: result.disjointGroups,
    remainingReviewGroups: result.remainingReviewGroups, patterns: result.patterns.length, sha256: hash(output) }));
}
