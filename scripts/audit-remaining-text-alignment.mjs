import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectTextAlignAncestry } from './audit-material-text-align-ancestry.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const target = 'docs/material-remaining-text-alignment.json';
const selected = new Map([['expansion-title', 68], ['progress-bar-primary', 20],
  ['progress-spinner-primary', 20], ['bottom-sheet-overlay', 25], ['snack-bar-overlay', 34]]);
const stages = ['interactionResolvedStyle', 'normalResolvedStyle', 'resolvedStyle'];
const relevant = key => ['textalign', 'textalignlast', 'direction', 'unicodebidi', 'all']
  .includes(key.replaceAll('-', '').toLowerCase());
const relevantEntries = object => Object.entries(object).filter(([key]) => relevant(key));
const flags = { wholeElementInputEquivalent: false, candidateComputedVerified: false,
  usedAlignmentVerified: false, renderingEquivalent: false, rendererCauseProven: false };
const decision = (classification, attribution, owner, justification, additional = {}) =>
  ({ classification, attribution, owner, justification, ...additional, ...flags });

// These decisions classify the captured evidence boundary, not the eventual
// rendered alignment. Explicit requests and missing capture data stay visible.
export function reviewRemainingTextAlignment(element, p) {
  assert.ok(selected.has(element));
  assert.equal(p.reference, 'start'); assert.equal(p.candidate, '<omitted>');
  for (const key of ['candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven'])
    assert.equal(p[key], false);
  if (element.endsWith('-overlay')) {
    assert.equal(p.status, 'unresolved-alias-scalar-rule-gap');
    const identity = p.identity.generatedIdentity;
    assert.equal(identity.status, 'mapped-with-scalar-rule-gap');
    assert.equal(identity.method, 'existing-generated-owner-proof');
    assert.equal(identity.checkedReferenceProperties, 89);
    assert.deepEqual(identity.missingRules, [{ selector: '.cdk-global-overlay-wrapper',
      declarations: { 'z-index': { value: '1000', important: false } } }]);
    assert.deepEqual(identity.extraRules, []);
    assert.equal(identity.inputEquivalent, false);
    assert.equal(p.referencePath, undefined); assert.equal(p.candidatePath, undefined);
    return decision('parity-harness-defect', 'reviewed-overlay-alignment-context-capture-gap',
      'input-tree layered rule capture and generated-owner context binding',
      'The existing owner mapping verifies 89 scalar properties but records a missing layered z-index rule. The ancestry collector therefore stops before producing alignment paths. This is a known evidence-completeness defect, not proof of unequal used text alignment or a cause of missing/low overlays.',
      { alignmentInputDisposition: 'unresolved-context', captureGapExplainsScalarDifference: false });
  }
  assert.ok(p.referencePath.length && p.candidatePath.length);
  assert.equal(p.candidatePath[0].authored.id, element);
  assert.equal(p.referenceExternalAncestryCaptured, false);
  assert.equal(p.candidateInheritanceResolved, false);
  for (const node of p.referencePath) {
    assert.equal(node.computed.textAlign, 'start'); assert.equal(node.computed.direction, 'ltr');
    assert.deepEqual(relevantEntries(node.inline), []);
    assert.ok(!/(?:^|;)\s*(?:text-align(?:-last)?|direction|unicode-bidi|all)\s*:/i.test(node.attributes.style ?? ''));
  }
  const requests = p.referencePath.flatMap(node => node.requests.flatMap(rule =>
    relevantEntries(rule.declarations).map(([property, declaration]) => ({ node: node.node,
      selector: rule.selector, active: rule.active, conditions: rule.conditions, property, declaration }))));
  for (const node of p.candidatePath) {
    assert.deepEqual(Object.keys(node.localValues).sort(), stages);
    assert.deepEqual(Object.keys(node.declarations).sort(), stages);
    assert.deepEqual(relevantEntries(node.inline), []);
    assert.ok(!/(?:^|;)\s*(?:text-align(?:-last)?|direction|unicode-bidi|all)\s*:/i.test(node.authored.attributes?.style ?? ''));
    for (const stage of stages) {
      const allowed = element === 'expansion-title' && node.authored.id === 'expansion-primary';
      assert.equal(node.localValues[stage], allowed ? 'left' : '<omitted>');
      assert.deepEqual(relevantEntries(node.declarations[stage]), allowed ? [['textAlign', 'left']] : []);
    }
    for (const rule of node.possibleRules) {
      assert.equal(element, 'expansion-title'); assert.equal(node.authored.id, 'expansion-primary');
      assert.equal(rule.selector, '.expansion-trigger');
      assert.deepEqual(rule.declarations, { textAlign: 'left' });
      assert.equal(rule.mediaMinWidth, '<omitted>'); assert.equal(rule.mediaMaxWidth, '<omitted>');
    }
  }
  if (element === 'expansion-title') {
    assert.equal(p.status, 'omitted-owner-local-with-ancestor-request');
    assert.deepEqual(requests, []); assert.deepEqual(p.referenceRequestNodes, []);
    const parent = p.candidatePath[1]; assert.equal(parent.authored.id, 'expansion-primary');
    assert.equal(p.candidatePath[0].parent, parent.node);
    assert.deepEqual(p.candidateRequestNodes, [parent.node]); assert.equal(parent.possibleRules.length, 1);
    assert.deepEqual(p.candidatePath[0].retainedText, { source: 'core-text-registry', textAlign: 'left' });
    return decision('parity-harness-defect', 'reviewed-inherited-alignment-observation-stage-mismatch',
      'input audit local declarations versus ancestor requests and retained core text',
      'The title local stages omit textAlign, while its immediate candidate parent explicitly requests left and retained core text independently reports left. Reference title and ancestors compute start in LTR. Local omission is not evidence of missing applied alignment. Parent substitution, computed inheritance, formatting context and actual glyph placement remain separate obligations.',
      { alignmentInputDisposition: 'stage-mismatch-with-explicit-ancestor',
        ancestorRequest: 'left', retainedTextAlignment: 'left', inheritanceMechanismProven: false });
  }
  assert.equal(p.status, 'omitted-owner-local-without-captured-ancestor-request');
  assert.deepEqual(p.candidateRequestNodes, []);
  assert.deepEqual(p.referenceRequestNodes, [p.referencePath[0].node]);
  assert.equal(p.candidatePath[0].retainedText, null);
  const bar = element === 'progress-bar-primary';
  const selector = bar ? '.mat-mdc-progress-bar' : '.mat-mdc-progress-spinner';
  assert.equal(p.referencePath[0].type, bar ? 'mat-progress-bar' : 'mat-progress-spinner');
  assert.equal(p.candidatePath[0].authored.type, bar ? 'showcase.material:linear-progress' : 'showcase.material:circular-progress');
  assert.deepEqual(requests, [{ node: p.referencePath[0].node, selector, active: true, conditions: [],
    property: bar ? 'text-align' : 'direction', declaration: { value: bar ? 'start' : 'ltr', important: false } }]);
  return bar
    ? decision('application-plugin-authoring-defect', 'reviewed-progress-bar-alignment-request-omission',
      'showcase progress host input translation; core logical alignment support separately',
      'The active unconditional Material host rule explicitly requests text-align:start; candidate host-to-root local inputs contain no corresponding alignment request. This is a demonstrated declaration omission, not a computed inheritance diagnosis or evidence that text alignment changes the private progress geometry.',
      { alignmentInputDisposition: 'explicit-reference-request-omitted', visualImpactProven: false })
    : decision('parity-harness-defect', 'reviewed-spinner-alignment-stage-with-direction-omission',
      'input audit stage correspondence and showcase progress host direction translation',
      'Reference textAlign is computed start while candidate local stages omit it. Unlike the no-request population, the reference host explicitly requests direction:ltr and the candidate path omits direction. Preserve that separate authoring difference; do not synthesize candidate computed direction, waive private plugin behavior, or infer that this explains spinner geometry.',
      { alignmentInputDisposition: 'stage-mismatch-with-separate-direction-omission',
        relatedAuthoringDifference: { property: 'direction', referenceRequest: 'ltr', candidateRequest: '<omitted>' },
        visualImpactProven: false });
}

export function collectRemainingTextAlignment() {
  const planFile = 'docs/material-text-align-canonical-plan.json';
  const planText = readFileSync(planFile, 'utf8').replaceAll('\r\n', '\n');
  const historical = execFileSync('git', ['show', `e3bc804:${planFile}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  assert.equal(hash(planText), hash(historical));
  const plan = JSON.parse(planText), source = collectTextAlignAncestry();
  assert.equal(hash(JSON.stringify(source, null, 2) + '\n'), plan.sourceProof.sha256);
  const findings = new Map(source.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  const patterns = new Map();
  const groups = plan.retained.filter(g => selected.has(g.element)).map(g => {
    assert.equal(g.previousAttribution, 'unresolved'); assert.equal(g.occurrences, selected.get(g.element));
    const observations = g.observations.map(o => {
      const f = findings.get(JSON.stringify([o.case, g.element])); assert.ok(f);
      assert.equal(f.family, g.family); assert.equal(f.originalInputSha256, o.originalInputSha256);
      assert.deepEqual(f.inputTrees, o.inputTrees);
      const pattern = source.patterns[f.pattern]; assert.equal(pattern.sha256, o.proofSha256);
      assert.equal(digest(pattern.proof), pattern.sha256);
      const review = reviewRemainingTextAlignment(g.element, pattern.proof);
      patterns.set(pattern.sha256, pattern);
      return { ...o, review };
    });
    const review = observations[0].review;
    assert.ok(observations.every(o => isDeepStrictEqual(o.review, review)), 'mixed review decisions');
    return { ...g, observations: observations.map(({ review: _, ...o }) => o), review };
  });
  assert.equal(groups.length, 5); assert.equal(groups.reduce((n, g) => n + g.observations.length, 0), 167);
  return { schemaVersion: 1, kind: 'remaining-original-text-alignment-review',
    sourcePlan: { file: planFile, revision: 'e3bc804', sha256: hash(planText) }, sourceProof: plan.sourceProof,
    originalCapture: source.originalCapture, sourceFingerprints: [
      'scripts/audit-remaining-text-alignment.mjs', 'scripts/audit-material-text-align-ancestry.mjs',
      'examples/material-showcase/src/app/astylar.component.ts',
      'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    ].map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    groups, patterns: [...patterns.values()], groupCount: 5, observations: 167,
    contextGapObservations: 59, canonicalAttributionChanged: false,
    ...flags, limits: [
      'Original capture and source ancestry are independently replayed; the earlier frozen canonical join is reused, not rerun.',
      'The five group hashes bind the original canonical rows, not a claim that the live ledger has accepted these reviews.',
      'The 59 overlay observations have a diagnosed capture gap but alignment inputs still lack a complete context disposition.',
      'Motion declarations remain in the retained patterns; no animation settlement or plugin rendering equivalence is asserted.',
      'The expansion parent alignment request and progress plugin geometry require their own equal-input verification.',
    ] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectRemainingTextAlignment(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(hash(readFileSync(target, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(target, output);
  console.log(JSON.stringify({ groups: report.groupCount, observations: report.observations,
    contextGapObservations: report.contextGapObservations, sha256: hash(output), canonicalAttributionChanged: false }));
}
