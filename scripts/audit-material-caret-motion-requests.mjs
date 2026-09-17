import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const transitionFields = new Set(['transition-property', 'transition-duration', 'transition-delay',
  'transition-timing-function', 'transition-behavior']);
const animationFields = new Set(['animation-name', 'animation-duration', 'animation-delay',
  'animation-timing-function', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state', 'animation-timeline',
  'animation-range-start', 'animation-range-end']);
const otherTargets = new Set(['none', 'transform', 'box-shadow', 'border', 'opacity', 'height']);
const flags = ['inputEquivalent', 'computedCandidateVerified', 'descendantCaretVerified',
  'renderingEquivalent', 'rendererCauseProven'];

// Declaration-target review only. In particular, color is NOT an unrelated
// target: caret-color:auto can depend on it. Never resolve cascade by selecting
// a nearby transition:none rule or invent missing longhands from a shorthand.
export function reviewCaretMotionRequests(proof) {
  if (!proof || proof.property !== 'caretColor' || proof.disposition !== 'requires-specific-review' ||
      flags.some(flag => proof[flag] !== false) || proof.candidateLocalCaret !== '<omitted>' ||
      typeof proof.referenceComputedCaret !== 'string' || typeof proof.referenceComputedColor !== 'string' ||
      !Array.isArray(proof.issues) || !proof.issues.length ||
      proof.issues.some(i => i.reason !== 'authored-caret-reset-or-motion-request' || i.side !== 'reference') ||
      !Array.isArray(proof.requests?.reference) || !proof.requests.reference.length ||
      !Array.isArray(proof.requests?.astylar) || proof.requests.astylar.length ||
      proof.issues.length !== proof.requests.reference.length ||
      proof.requests.reference.some(r => !proof.issues.some(i => i.node === r.node && i.source === r.source)))
    return { disposition: 'requires-review', reasons: ['incomplete-or-non-motion-proof'] };
  const reasons = [];
  for (const request of proof.requests.reference) {
    const declarations = request.declarations;
    if (!declarations || typeof declarations !== 'object' || Array.isArray(declarations) ||
        !Object.keys(declarations).length || typeof request.cssText !== 'string' || !request.cssText.trim()) {
      reasons.push('missing-original-motion-declaration'); continue;
    }
    const keys = Object.keys(declarations);
    for (const [key, declaration] of Object.entries(declarations)) {
      if (!transitionFields.has(key) && !animationFields.has(key)) reasons.push(`unreviewed-property:${key}`);
      if (!declaration || typeof declaration.value !== 'string' || typeof declaration.important !== 'boolean' ||
          !declaration.value.trim() || /(?:var\(|env\(|inherit|revert|unset|initial|[\\/])/i.test(declaration.value))
        reasons.push(`unresolved-value:${key}`);
    }
    if (keys.some(k => transitionFields.has(k))) {
      const target = declarations['transition-property']?.value;
      if (typeof target !== 'string' || !target.split(',').every(t => otherTargets.has(t.trim())))
        reasons.push('caret-color-or-unresolved-transition-target');
    }
    if (keys.some(k => animationFields.has(k)) && declarations['animation-name']?.value !== 'none')
      reasons.push('animation-name-not-proven-none');
  }
  return { disposition: reasons.length ? 'requires-review' : 'captured-motion-names-no-caret-or-color-target',
    reasons: [...new Set(reasons)] };
}

export function checkCaretMotionControls() {
  const base = { property: 'caretColor', disposition: 'requires-specific-review',
    ...Object.fromEntries(flags.map(flag => [flag, false])), candidateLocalCaret: '<omitted>',
    referenceComputedCaret: 'rgb(0, 0, 0)', referenceComputedColor: 'rgb(0, 0, 0)',
    issues: [{ reason: 'authored-caret-reset-or-motion-request', side: 'reference', node: 'owner', source: 'rule' }],
    requests: { reference: [{ node: 'owner', source: 'rule', cssText: 'transition: transform 1s; animation: none;',
      declarations: { 'transition-property': { value: 'transform', important: false },
        'transition-duration': { value: '1s', important: false },
        'animation-name': { value: 'none', important: false } } }], astylar: [] } };
  const d = p => p.requests.reference[0].declarations;
  const positive = [...otherTargets, 'opacity, transform'];
  for (const target of positive) {
    const p = structuredClone(base); d(p)['transition-property'].value = target;
    assert.equal(reviewCaretMotionRequests(p).disposition, 'captured-motion-names-no-caret-or-color-target');
  }
  const negative = [
    ...['caret-color', 'caret', 'color', 'all', 'background-color', 'var(--target)', '', 'inherit',
      'opacity, color', 'transform, caret-color', 'width'].map(value => p => { d(p)['transition-property'].value = value; }),
    p => { delete d(p)['transition-property']; },
    p => { d(p)['animation-name'].value = 'color-pulse'; },
    p => { delete d(p)['animation-name']; d(p)['animation-duration'] = { value: '0s', important: true }; },
    p => { d(p)['caret-color'] = { value: 'red', important: false }; },
    p => { d(p).all = { value: 'initial', important: true }; },
    p => { d(p).transition = { value: 'none', important: false }; },
    p => { d(p)['transition-duration'].value = ''; },
    p => { d(p)['transition-duration'].value = 'var(--duration)'; },
    p => { delete d(p)['animation-name'].important; },
    p => { p.requests.reference[0].cssText = ''; },
    p => { p.requests.reference[0].source = 'other'; },
    p => { p.issues.push({ reason: 'scalar-authored-rule-gap' }); },
    p => { p.issues[0].side = 'astylar'; },
    p => { p.requests.astylar.push({ source: '#page', caretColor: 'red' }); },
    p => { p.candidateLocalCaret = 'auto'; },
    p => { p.property = 'columnGap'; },
    ...flags.map(flag => p => { p[flag] = true; }),
  ];
  for (const [index, mutate] of negative.entries()) {
    const p = structuredClone(base); mutate(p);
    assert.equal(reviewCaretMotionRequests(p).disposition, 'requires-review', `negative ${index}`);
  }
  return { positive: positive.length, negative: negative.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  assert.ok(!args.length || args.length === 1 && args[0] === '--check', 'only --check is accepted');
  const controls = checkCaretMotionControls();
  const parentFile = 'docs/material-owner-caret-input-survey.json', parentBytes = readFileSync(parentFile);
  const parent = JSON.parse(parentBytes);
  const parentRevision = '280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb';
  const pinnedParent = execFileSync('git', ['show', `${parentRevision}:${parentFile}`], { maxBuffer: 16 * 1024 * 1024 });
  assert.deepEqual(parent, JSON.parse(pinnedParent), 'parent membership and every original observation remain pinned');
  for (const source of parent.sourceFingerprints)
    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
  assert.equal(parent.membership.groups, 145); assert.equal(parent.membership.observations, 4050);
  const groups = parent.groups.filter(g => g.reasonCounts['authored-caret-reset-or-motion-request']);
  assert.equal(groups.length, 42);
  const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const before = canonicalFiles.map(file => hash(readFileSync(file)));
  const captureBytes = readFileSync(parent.capture.file); assert.equal(hash(captureBytes), parent.capture.sha256);
  const raw = JSON.parse(captureBytes);
  const entries = new Map([...raw.results.map(e => [e, 'static']), ...raw.interactions.map(e => [e, 'interaction'])]
    .map(([e, kind]) => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e]));
  const boundary = realpathSync('artifacts/material-parity/current-ancestry-audit') + path.sep;
  const tree = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  const findings = [];
  for (const group of groups) {
    assert.equal(group.observations.length, group.canonicalOccurrences);
    assert.deepEqual(Object.keys(group.reasonCounts), ['authored-caret-reset-or-motion-request']);
    const observations = [], patterns = new Map();
    for (const original of group.observations) {
      const entry = entries.get(original.case); assert.ok(entry); assert.equal(entry.family, group.family);
      assert.deepEqual(original.inputTrees, entry.inputTrees);
      const inputs = entry.styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
      const input = inputs[0]; assert.equal(hash(JSON.stringify(input)), original.inputSha256);
      assert.equal(input.reference.caretColor, original.referenceRaw);
      assert.equal(input.reference.color, original.referenceColorRaw);
      assert.equal(Object.hasOwn(input.astylar, 'caretColor'), false); assert.equal(original.candidateRaw, '<omitted>');
      const proof = inspectOwnerCaretInput(input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar), { family: group.family });
      assert.equal(hash(JSON.stringify(proof)), original.proofSha256, 'complete original declaration/ancestry proof');
      const review = reviewCaretMotionRequests(proof), pattern = hash(JSON.stringify(proof.requests));
      if (!patterns.has(pattern)) patterns.set(pattern, { sha256: pattern, requests: proof.requests, review, cases: [] });
      assert.deepEqual(patterns.get(pattern).review, review); patterns.get(pattern).cases.push(original.case);
      observations.push({ ...original, review, requestsSha256: pattern });
    }
    findings.push({ family: group.family, element: group.element, property: group.property,
      reference: group.reference, candidate: group.candidate, canonicalRowSha256: group.canonicalRowSha256,
      observations, patterns: [...patterns.values()],
      disposition: observations.every(o => o.review.disposition === 'captured-motion-names-no-caret-or-color-target')
        ? 'captured-motion-names-no-caret-or-color-target' : 'requires-review' });
  }
  const observed = findings.flatMap(g => g.observations); assert.equal(observed.length, 1158);
  const result = { schemaVersion: 1, kind: 'original-owner-caret-motion-declaration-review',
    parent: { file: parentFile, sha256: hash(parentBytes), revision: parentRevision,
      committedSha256: hash(pinnedParent) }, capture: parent.capture,
    sources: ['scripts/audit-material-caret-motion-requests.mjs', 'tests/material-parity/owner-caret-input-evidence.mjs']
      .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    controls, counts: { groups: findings.length, observations: observed.length,
      originalCases: new Set(observed.map(o => o.case)).size,
      noCaretOrColorTargetGroups: findings.filter(g => g.disposition !== 'requires-review').length,
      remainingReviewGroups: findings.filter(g => g.disposition === 'requires-review').length,
      noCaretOrColorTargetObservations: observed.filter(o => o.review.disposition !== 'requires-review').length,
      remainingReviewObservations: observed.filter(o => o.review.disposition === 'requires-review').length },
    findings, canonicalIntegration: false, ...Object.fromEntries(flags.map(flag => [flag, false])),
    limits: ['Original captured ancestry/declarations only; no resolved motion cascade or computed candidate caret color.',
      'Color transitions remain review cases because caret-color:auto may depend on color.',
      'Partial, empty, unresolved or named-animation declarations remain review cases even alongside transition:none.',
      'Other motion may affect geometry, visibility or paint indirectly; no animation inactivity or raster equivalence follows.',
      'Existing parent membership proof is reused; all selected original scalar/tree/proof receipts are independently replayed.',
      'No canonical attribution, input substitution, renderer fix or visible empty-input caret claim.'] };
  const output = JSON.stringify(result, null, 2) + '\n', target = 'docs/material-owner-caret-motion-review.json';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
  console.log(JSON.stringify({ ...result.counts, controls, canonicalUnchanged: true, canonicalIntegration: false }));
}
