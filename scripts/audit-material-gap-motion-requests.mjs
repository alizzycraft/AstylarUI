import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOwnerGapInput } from '../tests/material-parity/owner-gap-input-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const transitionFields = new Set(['transition-property', 'transition-duration', 'transition-delay',
  'transition-timing-function', 'transition-behavior']);
const animationFields = new Set(['animation-name', 'animation-duration', 'animation-delay',
  'animation-timing-function', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state', 'animation-timeline',
  'animation-range-start', 'animation-range-end']);
const nonGapTargets = new Set(['none', 'transform', 'box-shadow', 'border', 'opacity']);

// This deliberately does not resolve cascade or declare animations inactive.
// It answers only whether the captured local declarations name a direct gap
// transition/keyframe target. Border/transform motion can still affect output.
export function reviewGapMotionRequests(proof) {
  const reasons = [];
  if (!proof || proof.referenceComputed !== 'normal' ||
      proof.inputEquivalent !== false || proof.renderingEquivalent !== false ||
      !Array.isArray(proof.issues) || proof.issues.length !== 1 ||
      proof.issues[0].reason !== 'relevant-authored-request' || proof.issues[0].side !== 'reference' ||
      !Array.isArray(proof.requests?.reference) || !proof.requests.reference.length ||
      !Array.isArray(proof.requests?.astylar) || proof.requests.astylar.length ||
      !proof.candidateStages || Object.keys(proof.candidateStages).sort().join(',') !==
        'interactionResolvedStyle,normalResolvedStyle,resolvedStyle' ||
      Object.values(proof.candidateStages).some(s => !s || Object.keys(s).length)) {
    return { disposition: 'requires-review', reasons: ['incomplete-or-non-motion-proof'] };
  }
  for (const request of proof.requests.reference) {
    const declarations = request.declarations;
    if (!declarations || !Object.keys(declarations).length) { reasons.push('empty-request'); continue; }
    const keys = Object.keys(declarations);
    for (const [key, declaration] of Object.entries(declarations)) {
      if (!transitionFields.has(key) && !animationFields.has(key)) reasons.push(`unreviewed-property:${key}`);
      if (!declaration || typeof declaration.value !== 'string' || typeof declaration.important !== 'boolean' ||
          !declaration.value.trim() || /(?:var\(|env\(|inherit|revert|unset|initial|[\\/])/i.test(declaration.value))
        reasons.push(`unresolved-value:${key}`);
    }
    if (keys.some(k => transitionFields.has(k))) {
      const target = declarations['transition-property']?.value;
      if (typeof target !== 'string' || !target.split(',').every(t => nonGapTargets.has(t.trim())))
        reasons.push('transition-target-not-proven-non-gap');
    }
    if (keys.some(k => animationFields.has(k)) && declarations['animation-name']?.value !== 'none')
      reasons.push('animation-name-not-proven-none');
  }
  return { disposition: reasons.length ? 'requires-review' : 'captured-motion-does-not-name-gap',
    reasons: [...new Set(reasons)] };
}

export function checkGapMotionControls() {
  const base = { referenceComputed: 'normal', inputEquivalent: false, renderingEquivalent: false,
    issues: [{ reason: 'relevant-authored-request', side: 'reference' }],
    requests: { reference: [{ source: '.owner', declarations: {
      'transition-property': { value: 'box-shadow', important: false },
      'transition-duration': { value: '280ms', important: false },
      'animation-name': { value: 'none', important: true },
    } }], astylar: [] },
    candidateStages: { resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} } };
  const mutate = change => { const v = structuredClone(base); change(v); return v; };
  const declaration = v => v.requests.reference[0].declarations;
  const rejected = [
    ...['gap', 'row-gap', 'column-gap', 'all', 'var(--target)', '', 'inherit', 'opacity, gap'].map(value =>
      v => { declaration(v)['transition-property'].value = value; }),
    v => { delete declaration(v)['transition-property']; },
    v => { declaration(v)['animation-name'].value = 'gap-pulse'; },
    v => { delete declaration(v)['animation-name']; declaration(v)['animation-duration'] = { value: '0s', important: true }; },
    v => { declaration(v).gap = { value: '8px', important: false }; },
    v => { declaration(v).all = { value: 'initial', important: true }; },
    v => { declaration(v).transition = { value: 'none', important: false }; },
    v => { declaration(v)['transition-duration'].value = ''; },
    v => { delete declaration(v)['animation-name'].important; },
    v => { v.issues.push({ reason: 'scalar-authored-rule-gap' }); },
    v => { v.candidateStages.interactionResolvedStyle.gap = '2px'; },
    v => { v.requests.astylar.push({ source: '.owner', declarations: { gap: '2px' } }); },
    v => { v.inputEquivalent = true; },
    v => { delete v.candidateStages.normalResolvedStyle; },
  ];
  assert.equal(reviewGapMotionRequests(base).disposition, 'captured-motion-does-not-name-gap');
  assert.equal(reviewGapMotionRequests(mutate(v => { declaration(v)['transition-property'].value = 'opacity, transform'; })).disposition,
    'captured-motion-does-not-name-gap');
  for (const [index, change] of rejected.entries())
    assert.equal(reviewGapMotionRequests(mutate(change)).disposition, 'requires-review', `rejection ${index}`);
  return { positive: 2, negative: rejected.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 0 || args.length === 1 && args[0] === '--check', 'only --check is accepted');
  const controls = checkGapMotionControls();
  const parentFile = 'docs/material-owner-gap-input-survey.json';
  const survey = JSON.parse(readFileSync(parentFile));
  for (const source of survey.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
  const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const canonicalHashes = canonicalFiles.map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const groups = survey.groups.filter(g => g.candidate === '<omitted>' &&
    !g.allOriginalCasesHaveLocalOmissionEvidence && !g.reasons['scalar-authored-rule-gap']);
  assert.equal(groups.length, 34);
  const captureBytes = readFileSync(survey.capture.file);
  assert.equal(hash(captureBytes), survey.capture.sha256);
  const raw = JSON.parse(captureBytes);
  const entries = new Map([...raw.results.map(e => [e, 'static']), ...raw.interactions.map(e => [e, 'interaction'])]
    .map(([e, kind]) => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e]));
  const boundary = realpathSync('artifacts/material-parity/current-ancestry-audit') + path.sep;
  const trees = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  const findings = [];
  for (const group of groups) {
    const replayHash = createHash('sha256'), patterns = new Map();
    const cases = [];
    for (const caseId of group.originalCases) {
      const entry = entries.get(caseId); assert.ok(entry);
      const inputs = entry.styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
      const proof = inspectOwnerGapInput(inputs[0], group.property,
        trees(entry.inputTrees.reference), trees(entry.inputTrees.astylar), { family: group.family });
      replayHash.update(JSON.stringify({ case: caseId, proof }) + '\n');
      const review = reviewGapMotionRequests(proof);
      const key = JSON.stringify(proof.requests);
      if (!patterns.has(key)) patterns.set(key, { requests: proof.requests, review, cases: [] });
      patterns.get(key).cases.push(caseId);
      cases.push({ case: caseId, ...review });
    }
    assert.equal(replayHash.digest('hex'), group.proofSha256, 'complete original proof projection changed');
    assert.equal(cases.length, group.canonicalOccurrences);
    findings.push({ family: group.family, element: group.element, property: group.property,
      reference: group.reference, candidate: group.candidate, proofSha256: group.proofSha256,
      observations: cases.length, cases, patterns: [...patterns.values()],
      disposition: cases.every(c => c.disposition === 'captured-motion-does-not-name-gap')
        ? 'captured-motion-does-not-name-gap' : 'requires-review' });
  }
  const result = { schemaVersion: 1, kind: 'owner-gap-motion-declaration-review',
    parent: { file: parentFile, sha256: hash(readFileSync(parentFile)) }, capture: survey.capture,
    sources: ['scripts/audit-material-gap-motion-requests.mjs', 'tests/material-parity/owner-gap-input-evidence.mjs']
      .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    controls, groups: findings.length, observations: findings.reduce((n, g) => n + g.observations, 0),
    directGapTargetsNotNamedGroups: findings.filter(g => g.disposition === 'captured-motion-does-not-name-gap').length,
    remainingReviewGroups: findings.filter(g => g.disposition === 'requires-review').length,
    findings, canonicalIntegration: false, inputEquivalent: false, renderingEquivalent: false,
    limits: ['Captured local declarations only, not a resolved motion cascade or computed candidate style.',
      'Non-gap transitions can affect visible geometry/paint indirectly; no animation or rendering equivalence is claimed.',
      'Unknown, empty, missing, reset and named-animation declarations remain review cases.',
      'No canonical attribution or omitted-value substitution is performed.'] };
  const output = JSON.stringify(result, null, 2) + '\n', target = 'docs/material-owner-gap-motion-review.json';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  assert.deepEqual(canonicalFiles.map(file => ({ file, sha256: hash(readFileSync(file)) })), canonicalHashes);
  console.log(JSON.stringify({ groups: result.groups, observations: result.observations,
    directGapTargetsNotNamedGroups: result.directGapTargetsNotNamedGroups,
    remainingReviewGroups: result.remainingReviewGroups, controls, canonicalUnchanged: true }));
}
