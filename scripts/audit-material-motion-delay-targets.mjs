import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectOwnerInitialMotion } from './audit-material-owner-initial-motion.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const parentFile = 'docs/material-owner-initial-motion-review.json';
const parentHash = 'f8f90799191604823875d849fb6ae56de46dd96c37e3f91c8d540bdd48916294';
const properties = new Set(['fontStyle', 'wordSpacing', 'textTransform', 'whiteSpace',
  'overflowWrap', 'wordBreak', 'pointerEvents', 'visibility']);
const fields = new Set(['transition-property', 'transition-duration', 'transition-delay',
  'transition-timing-function', 'transition-behavior']);
const disjoint = new Set(['none', 'transform', 'box-shadow', 'border', 'opacity', 'color', 'height']);

// A second-pass declaration review, not a cascade or motion-state evaluator.
// A delay-only rule cannot supply a transition target. Require explicit,
// unconditional target witnesses on the SAME node; never borrow from ancestors.
export function inspectMotionDelayTargets(review) {
  const retained = reason => ({ disposition: 'requires-specific-review', reason,
    inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false });
  if (!properties.has(review?.proof?.property) || review.proof.source !== 'core-style-inspection' ||
      review.proof.candidateLocalDeclaration !== '<omitted>' ||
      ['inputEquivalent', 'computedCandidateVerified', 'renderingEquivalent'].some(k => review[k] !== false) ||
      review.proof.computedCandidateVerified !== false || review.proof.renderingEquivalent !== false ||
      !Array.isArray(review.proof.issues) || !review.proof.issues.length ||
      review.proof.issues.some(i => i.reason !== 'motion-request-needs-review' || i.side !== 'reference'))
    return retained('not-authenticated-reference-motion-only');
  if (!['captured-motion-targets-disjoint', 'requires-specific-review'].includes(review.disposition) ||
      review.reasons.some(r => r !== 'transition-target-not-proven-disjoint'))
    return retained('other-motion-uncertainty');
  const targets = new Map(), delays = [], issues = new Set();
  for (const request of review.requests) {
    if (request.active !== true || request.conditions?.length !== 0 ||
        !review.proof.referencePath.includes(request.node)) return retained('conditional-or-unbound-owner');
    const declarations = request.declarations, keys = Object.keys(declarations);
    if (!keys.length || keys.some(k => !fields.has(k))) return retained('not-transition-longhands');
    for (const [key, value] of Object.entries(declarations)) {
      if (!value || typeof value.value !== 'string' || typeof value.important !== 'boolean' ||
          !value.value.trim() || /(?:var\(|env\(|inherit|revert|unset|initial|[\\/])/i.test(value.value))
        return retained('unresolved-motion-value');
      issues.add(JSON.stringify({ reason: 'motion-request-needs-review', side: 'reference',
        node: request.node, source: request.selector, key, value }));
    }
    const target = declarations['transition-property'];
    if (target) {
      if (!target.value.split(',').every(t => disjoint.has(t.trim()))) return retained('overlapping-or-unknown-target');
      if (!targets.has(request.node)) targets.set(request.node, []);
      targets.get(request.node).push({ index: request.index, selector: request.selector, declaration: target });
    } else if (keys.length === 1 && keys[0] === 'transition-delay' &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:ms|s)$/.test(declarations['transition-delay'].value)) {
      delays.push(request);
    } else return retained('missing-target-not-delay-only');
  }
  if (review.proof.issues.some(i => !issues.has(JSON.stringify(i))) || issues.size !== review.proof.issues.length)
    return retained('incomplete-original-issue-membership');
  if (!targets.size || delays.some(r => !targets.has(r.node))) return retained('missing-same-node-target');
  return { disposition: 'captured-owner-target-set-disjoint',
    delayWitnesses: delays.map(r => ({ node: r.node, index: r.index, selector: r.selector,
      delay: r.declarations['transition-delay'], targets: targets.get(r.node) })),
    inputEquivalent: false, computedCandidateVerified: false, renderingEquivalent: false,
    inactiveMotionProven: false, cascadeWinnerProven: false };
}

export function collectMotionDelayTargets() {
  const bytes = readFileSync(parentFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), parentHash);
  const parent = collectOwnerInitialMotion();
  assert.ok(isDeepStrictEqual(parent, JSON.parse(bytes)), 'complete parent proof must freshly replay');
  const selected = parent.findings.filter(g => g.disposition === 'requires-specific-review');
  const patterns = [], indexes = new Map(), findings = [];
  for (const group of selected) {
    const observations = group.observations.map(o => {
      const prior = parent.patterns[o.pattern]; assert.equal(digest(prior.review), prior.sha256);
      const result = inspectMotionDelayTargets(prior.review);
      const shared = { parentPattern: o.pattern, parentPatternSha256: prior.sha256, result }, key = digest(shared);
      if (!indexes.has(key)) { indexes.set(key, patterns.length); patterns.push({ sha256: key, ...shared }); }
      return { ...o, parentPattern: o.pattern, pattern: indexes.get(key), disposition: result.disposition };
    });
    findings.push({ family: group.family, element: group.element, property: group.property,
      reference: group.reference, parentGroupSha256: digest(group), observations,
      disposition: observations.every(o => o.disposition === 'captured-owner-target-set-disjoint')
        ? 'captured-owner-target-set-disjoint' : 'requires-specific-review' });
  }
  const reviewed = findings.filter(g => g.disposition === 'captured-owner-target-set-disjoint');
  assert.equal(findings.length, 35); assert.equal(reviewed.length, 12);
  assert.equal(reviewed.reduce((n, g) => n + g.observations.length, 0), 840);
  return { schemaVersion: 1, kind: 'owner-motion-delay-target-review',
    parent: { file: parentFile, sha256: parentHash }, parentFreshlyReplayed: true,
    spec: 'https://www.w3.org/TR/css-transitions-1/#transition-delay-property',
    source: { file: 'scripts/audit-material-motion-delay-targets.mjs',
      sha256: hash(readFileSync('scripts/audit-material-motion-delay-targets.mjs', 'utf8').replaceAll('\r\n', '\n')) },
    groups: findings.length, observations: findings.reduce((n, g) => n + g.observations.length, 0),
    reviewedGroups: reviewed.length, reviewedObservations: 840, retainedGroups: findings.length - reviewed.length,
    findings, patterns, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limits: ['Captured declaration target sets only; no computed cascade winner or inactive motion is inferred.',
      'CSS delay controls timing, not target selection. Same-node explicit disjoint target witnesses are retained.',
      'Empty targets, duration-only/animation metadata, unknown targets and conditional rules remain unresolved.',
      'External inheritance, candidate computed values, indirect motion effects and current paint remain unproved.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectMotionDelayTargets(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-motion-delay-target-review.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(file, output);
  console.log(JSON.stringify({ groups: report.groups, reviewedGroups: report.reviewedGroups,
    reviewedObservations: report.reviewedObservations, retainedGroups: report.retainedGroups, sha256: hash(output) }));
}
