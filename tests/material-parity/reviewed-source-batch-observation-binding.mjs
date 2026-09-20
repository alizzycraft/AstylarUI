import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { collectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';
import { collectControlSelfAlignment } from '../../scripts/audit-material-control-self-alignment.mjs';
import { collectContentFlexRequests } from '../../scripts/audit-material-content-flex-requests.mjs';
import { collectBadgeWhitespace } from '../../scripts/audit-material-badge-whitespace.mjs';
import { collectButtonPaintAllStates } from '../../scripts/audit-material-button-paint-all-states.mjs';
import { collectButtonBaseAlpha } from '../../scripts/audit-material-button-base-alpha.mjs';
import { collectMotionDelayTargets } from '../../scripts/audit-material-motion-delay-targets.mjs';
import { bindOwnerCaretCaptureSubset } from './owner-caret-audit-source-binding.mjs';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { reviewedSourceBatchDescriptor } from './reviewed-source-batch-transition.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const serializedHash = x => hash(JSON.stringify(x, null, 2) + '\n');
const same = (a, b, why) => assert.ok(isDeepStrictEqual(a, b), why);
const key = (...xs) => JSON.stringify(xs);
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const definitions = {
  motion: ['docs/material-owner-initial-motion-review.json', collectOwnerInitialMotion],
  alignment: ['docs/material-control-self-alignment.json', collectControlSelfAlignment],
  flex: ['docs/material-content-flex-requests.json', collectContentFlexRequests],
  whitespace: ['docs/material-badge-whitespace-audit.json', collectBadgeWhitespace],
  paint: ['docs/material-button-paint-all-states.json', collectButtonPaintAllStates],
  alpha: ['docs/material-button-base-alpha.json', collectButtonBaseAlpha],
  delay: ['docs/material-motion-delay-target-review.json', collectMotionDelayTargets],
};

// Freshly replay the complete source proofs, not just the proposed members.
// Historical canonical membership is separately pinned/proved by the prepared
// batch and its full-row transition; this boundary does not reparse that payload.
export function replayReviewedSourceBatchObservations() {
  const text = readFileSync(reviewedSourceBatchDescriptor.file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(text), reviewedSourceBatchDescriptor.sha256);
  const plan = JSON.parse(text), sources = {};
  for (const [kind, [file, collect]] of Object.entries(definitions)) {
    const saved = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    assert.equal(hash(saved), plan.sources[file]);
    sources[kind] = collect();
    assert.equal(serializedHash(sources[kind]), plan.sources[file], `source replay changed: ${kind}`);
  }
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(plan.productionNormalization.module, 'utf8'),
    plan.productionNormalization);
  return { plan, sources, original: JSON.parse(bytes), normalize };
}

function sourceMembers(group, sources) {
  if (group.batch === 'owner-motion' || group.batch === 'motion-delay') {
    const kind = group.batch === 'owner-motion' ? 'motion' : 'delay', source = sources[kind];
    const found = source.findings.filter(f => f.family === group.family && f.element === group.element &&
      f.property === group.property);
    assert.equal(found.length, 1, 'source motion group missing or duplicated');
    const finding = found[0];
    if (kind === 'motion') {
      assert.equal(digest(finding), group.proofGroupSha256);
      assert.equal(digest(finding.observations), group.orderedObservationSha256);
    }
    assert.equal(finding.disposition, kind === 'motion' ? 'captured-motion-targets-disjoint' : 'captured-owner-target-set-disjoint');
    const members = finding.observations.map(o => {
      const pattern = source.patterns[o.pattern]; assert.ok(pattern);
      assert.equal(o.disposition, finding.disposition);
      if (kind === 'motion') assert.equal(pattern.sha256, digest(pattern.review));
      else { const { sha256, ...content } = pattern; assert.equal(sha256, digest(content)); }
      return { case: o.case, originalInputSha256: o.originalInputSha256, inputTrees: o.inputTrees,
        originalProofSha256: o.originalProofSha256, proofSha256: pattern.sha256, sourceFile: definitions[kind][0] };
    });
    if (kind === 'delay') same(members.map(({ inputTrees, sourceFile, ...o }) => o), group.observations,
      'delay observations differ from original proof');
    return members;
  }
  const kind = group.batch === 'layout-authoring' ? group.kind : group.batch === 'button-state-paint' ? 'paint' : 'alpha';
  assert.ok(['alignment', 'flex', 'whitespace', 'paint', 'alpha'].includes(kind));
  const source = sources[kind];
  const byOwner = new Map(source.findings.map(f => [key(f.case, f.element ?? f.proof?.element), f]));
  assert.equal(byOwner.size, source.findings.length, 'duplicate source owner');
  return group.observations.map(o => {
    const f = byOwner.get(key(o.case, group.element)); assert.ok(f, 'source owner missing');
    const proof = f.proof ?? source.patterns[f.pattern]?.proof; assert.ok(proof);
    assert.equal(o.proofSha256, digest(proof));
    assert.equal(o.originalInputSha256, f.originalInputSha256 ?? f.inputSha256);
    same(o.inputTrees, f.inputTrees, 'source input trees changed');
    if (kind === 'paint') assert.equal(o.activeLayer, true);
    return { ...o, sourceFile: definitions[kind][0] };
  });
}

// Pure projection of independently replayed proofs. Missing owners/cases remain
// explicitly missing; altered/reordered inputs are rejected. This does not
// accept canonical classifications or infer computed/used values or raster.
export function bindReviewedSourceBatchObservations(supplied, { plan, sources, original, normalize }) {
  assert.equal(serializedHash(plan), reviewedSourceBatchDescriptor.sha256);
  same(Object.keys(sources).sort(), Object.keys(definitions).sort(), 'source inventory differs');
  same(Object.keys(plan.sources).sort(), Object.values(definitions).map(([file]) => file).sort(), 'plan source inventory differs');
  for (const [kind, [file]] of Object.entries(definitions))
    assert.equal(serializedHash(sources[kind]), plan.sources[file], `source changed after replay: ${kind}`);
  const subset = bindOwnerCaretCaptureSubset(supplied, original);
  const cases = new Map([['static', original.results], ['interaction', original.interactions]].flatMap(([kind, xs]) =>
    xs.map(e => [`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e])));
  const observations = [], groups = [], missingObservations = [], seen = new Set();
  for (const group of plan.findings) {
    const members = sourceMembers(group, sources), present = [];
    assert.equal(members.length, group.occurrences);
    same(members.map(o => o.case), group.cases, 'ordered source cases differ');
    for (const o of members) {
      const identity = key(o.case, group.element, group.property);
      assert.ok(!seen.has(identity), 'source observation has multiple owners'); seen.add(identity);
      const entry = cases.get(o.case); assert.ok(entry);
      same(o.inputTrees, entry.inputTrees, 'case source trees differ');
      const input = subset.inputs.get(key(o.case, group.element));
      if (!input) { missingObservations.push({ case: o.case, element: group.element, property: group.property }); continue; }
      assert.equal(digest(input), o.originalInputSha256, 'captured scalar differs from proof');
      assert.equal(normalize(input.reference ?? {})[group.property], group.reference, 'reference scalar differs');
      assert.equal(normalize(input.astylar ?? {})[group.property], group.astylar, 'candidate scalar differs');
      const member = { ...o, family: group.family, element: group.element, property: group.property,
        reference: group.reference, astylar: group.astylar, originalCompleteRowSha256: group.canonicalRowSha256,
        sourceProposalSha256: digest(group), attribution: group.attribution, classification: group.classification };
      observations.push(member); present.push(member);
    }
    if (present.length) groups.push({ originalCompleteRowSha256: group.canonicalRowSha256,
      sourceProposalSha256: digest(group), batch: group.batch, occurrences: present.length,
      cases: present.map(o => o.case), attribution: group.attribution, classification: group.classification });
  }
  assert.equal(seen.size, 6295); assert.equal(plan.findings.length, 146);
  return { sourcePlan: reviewedSourceBatchDescriptor, originalCapture: capture, observations, groups,
    coverage: { ...subset.coverage, sourceObservations: seen.size, suppliedObservations: observations.length,
      missingObservations, complete: subset.coverage.complete && !missingObservations.length },
    canonicalFilesChanged: false, inputEquivalent: false, computedCandidateVerified: false,
    cascadeWinnerProven: false, inactiveMotionProven: false, renderingEquivalent: false, rendererCauseProven: false };
}
