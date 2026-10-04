import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';
import { collectTooltipCaretContext } from './audit-material-tooltip-caret-context.mjs';
import { collectOriginalOverlayContextSurvey } from '../tests/material-parity/original-overlay-context-survey.mjs';
import { bindHistoricalAuditNormalization, bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';
import { readGapSurveySource } from '../tests/material-parity/gap-survey-source-replay.mjs';
import { applyModalBoxReview } from '../tests/material-parity/modal-position-inspection.mjs';
import { applyRangeCaretReviews } from './audit-material-range-caret-inputs.mjs';
import { applyMotionCaretReviews } from './audit-material-caret-motion-context.mjs';
import { rangeCaretAttribution, motionCaretAttribution } from '../tests/material-parity/component-caret-attributions.mjs';

const componentCaretAttributions = new Set([rangeCaretAttribution, motionCaretAttribution,
  'reviewed-overlay-motion-caret-request-omission', 'reviewed-overlay-caret-local-observation-boundary']);
export const isComponentCaretReviewRow = row => row.property === 'caretColor' && componentCaretAttributions.has(row.attribution);
export function applyComponentCaretReviews(rows, cases, inventory, normalize) {
  return [applyRangeCaretReviews, applyMotionCaretReviews, applyOverlayCaretReviews]
    .reduce((values, apply) => apply(values, cases, inventory, normalize), rows);
}
export function validateComponentCaretReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const expected = applyComponentCaretReviews(originalRows, cases, inventory, normalize).filter(isComponentCaretReviewRow);
    assert.ok(JSON.stringify(rows.filter(isComponentCaretReviewRow)) === JSON.stringify(expected),
      'complete component caret review differs');
    return [];
  } catch (error) { return [`component caret review does not replay: ${error.message}`]; }
}

const caretOwners = {
  'bottom-sheet': ['bottom-sheet-copy', 'bottom-sheet-dismiss', 'bottom-sheet-overlay', 'bottom-sheet-panel'],
  dialog: ['dialog-actions', 'dialog-cancel', 'dialog-copy', 'dialog-panel', 'dialog-save', 'dialog-title'],
  'snack-bar': ['snack-bar-overlay', 'snack-bar-surface'], tooltip: ['tooltip-popup'],
};
export function proveOverlayCaretBoundary(entry, reference, candidate, element) {
  assert.ok(caretOwners[entry.family]?.includes(element));
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const identity = resolveOriginAliasPair(entry, reference, candidate, inputs[0]);
  const trace = inspectOverlayCaretRequests(identity, reference, candidate);
  assert.equal(trace.hasDirectCaretOrResetRequest, false);
  assert.deepEqual(trace.requests.filter(r => r.side === 'astylar'), []);
  assert.deepEqual(trace.editableOwners, []);
  for (const a of trace.rawStyleAttributes) {
    assert.equal(a.side, 'reference'); assert.equal(typeof a.raw, 'string');
    for (const declaration of a.raw.split(';').filter(d => d.trim())) {
      const property = declaration.slice(0, declaration.indexOf(':')).trim();
      assert.match(property, /^[a-z-]+$/); assert.equal(relevant(property), false);
    }
  }
  const motion = ['dialog', 'tooltip'].includes(entry.family);
  assert.equal(trace.hasMotionRequest, motion);
  for (const request of trace.requests)
    assert.ok(Object.keys(request.declarations).every(k => /^(animation|transition)/.test(k)));
  const wrapper = element === 'bottom-sheet-overlay' || element === 'snack-bar-overlay';
  assert.equal(trace.scalarRuleGap, wrapper);
  assert.deepEqual(trace.ruleGapEvidence, wrapper ? {
    missing: [{ selector: '.cdk-global-overlay-wrapper', declarations: { 'z-index': { value: '1000', important: false } } }], extra: [],
  } : { missing: [], extra: [] });
  assert.ok(trace.candidatePath.every(n => n.syntheticRoot || Object.values(n.localValues).every(s => s.caretColor === '<omitted>')));
  return { referenceNode: identity.referenceNode, astylarNode: identity.candidateNode, identity, trace,
    inputEquivalent: false, renderingEquivalent: false, caretEffectProven: false,
    historicalExternalInheritanceVerified: false, candidateComputedCaretVerified: false,
    limitation: 'Captured owner paths only. External document inheritance and resolved motion effects remain unknown. The z-index rule gap is retained, not interpreted as caret equivalence or a renderer cause.' };
}
export function applyOverlayCaretReviews(rows, cases, inventory, normalize) {
  for (const [family, elements] of Object.entries(caretOwners)) for (const element of elements) {
    const motion = ['dialog', 'tooltip'].includes(family);
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family, element, properties: ['caretColor'],
      attribution: motion ? 'reviewed-overlay-motion-caret-request-omission' : 'reviewed-overlay-caret-local-observation-boundary',
      classification: motion ? 'application-plugin-authoring-defect' : 'parity-harness-defect',
      owner: 'overlay motion authoring and computed-versus-local caret measurement boundary',
      justification: motion
        ? 'Original mapped overlay ancestry contains motion declarations missing from candidate authoring and local stages. Variable-based transitions and competing animations remain intact; their effect on caret color is not inferred. Native computed caret and omitted candidate local caret are not comparable computed values. External inheritance and rendered caret correctness remain unproven.'
        : 'Exact original mapped overlay paths contain no captured caret/reset/motion requests, but the audit compares native computed caret with omitted candidate local declarations. The wrapper z-index scalar/tree rule gap, where present, remains explicit. This classifies the measurement boundary, not equal authoring, external inheritance, computed caret or rendering.',
      prove: (entry, reference, candidate) => proveOverlayCaretBoundary(entry, reference, candidate, element),
    });
  }
  return rows;
}

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = key => key.replaceAll('-', '').toLowerCase();
const relevant = key => /^(caret.*|all|animation.*|transition.*)$/.test(normalize(key));
const select = value => {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value));
  return Object.fromEntries(Object.entries(value).filter(([key]) => relevant(key)));
};
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const flags = { inputEquivalent: false, computedCandidateVerified: false,
  descendantCaretVerified: false, rendererCauseProven: false, renderingEquivalent: false };
export const overlayCaretSurveyFile = 'docs/material-overlay-caret-context-survey.json';

// Declaration inventory, not another selector/cascade engine. Unknown candidate
// selectors remain possible; inactive reference rules and empty values survive.
export function inspectOverlayCaretRequests(alias, reference, candidate) {
  assert.equal(alias.inputEquivalent, false);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(alias.status));
  const chain = (tree, keys, leaf) => {
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
    assert.equal(keys[0], leaf); assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.length);
    return keys.map((key, i) => {
      const n = tree.nodes.find(n => n.key === key); assert.ok(n);
      assert.equal(n.parent, keys[i + 1] ?? null); return n;
    });
  };
  const rp = chain(reference, alias.referencePath, alias.referenceNode);
  const cp = chain(candidate, alias.candidatePath, alias.candidateNode);
  const requests = [], attributes = [], editableOwners = [];
  const add = (side, node, source, declarations, details = {}) => {
    const selected = select(declarations);
    if (Object.keys(selected).length) requests.push({ side, node, source, declarations: selected, ...details });
  };
  const attrs = (side, node, type, value = {}) => {
    if (Object.hasOwn(value, 'style')) attributes.push({ side, node, raw: value.style });
    if (['input', 'textarea'].includes(type) || value.contenteditable !== undefined && value.contenteditable !== 'false')
      editableOwners.push({ side, node, type, contenteditable: value.contenteditable });
  };
  const referencePath = rp.map(n => {
    const s = reference.styles[n.style]; assert.ok(s && typeof s.caretColor === 'string' && typeof s.color === 'string');
    attrs('reference', n.key, n.type, n.attributes); add('reference', n.key, '<inline>', n.inline);
    assert.ok(Array.isArray(n.rules));
    for (const index of n.rules) {
      const r = reference.rules[index]; assert.ok(r && typeof r.selector === 'string' &&
        typeof r.active === 'boolean' && Array.isArray(r.conditions));
      if (Object.keys(select(r.declarations)).length) assert.ok(typeof r.cssText === 'string' && r.cssText.length);
      add('reference', n.key, r.source ?? r.selector, r.declarations,
        { index, selector: r.selector, active: r.active, conditions: r.conditions, cssText: r.cssText });
    }
    return { node: n.key, parent: n.parent, type: n.type, attributes: n.attributes,
      caretColor: s.caretColor, color: s.color };
  });
  const candidatePath = cp.map(n => {
    assert.ok(n.authored && typeof n.authored === 'object');
    if (n.parent === null && Object.keys(n.authored).length === 0) {
      for (const stage of stages) assert.equal(n[stage], undefined);
      return { node: n.key, parent: null, authored: n.authored, syntheticRoot: true,
        localValues: '<synthetic-root-has-no-style-stage>' };
    }
    attrs('astylar', n.key, n.authored.type, n.authored.attributes);
    if (n.authored.style !== undefined) add('astylar', n.key, '<inline>', n.authored.style);
    for (const [index, r] of candidate.rules.entries()) {
      assert.equal(typeof r.selector, 'string');
      if (rootInitialSelectorCanApply(r.selector, n.authored)) {
        const { selector, ...d } = r; add('astylar', n.key, selector, d, { index, possible: true });
      }
    }
    for (const stage of stages) add('astylar', n.key, stage, n[stage]);
    return { node: n.key, parent: n.parent, authored: n.authored,
      localValues: Object.fromEntries(stages.map(stage => [stage, {
        caretColor: n[stage].caretColor ?? '<omitted>', color: n[stage].color ?? '<omitted>' }])) };
  });
  const keys = requests.flatMap(r => Object.keys(r.declarations));
  return { referencePath, candidatePath, requests, rawStyleAttributes: attributes, editableOwners,
    hasDirectCaretOrResetRequest: keys.some(k => /^(caret|all$)/.test(normalize(k))),
    hasMotionRequest: keys.some(k => /^(animation|transition)/.test(normalize(k))),
    scalarRuleGap: alias.status === 'mapped-with-scalar-rule-gap',
    ruleGapEvidence: { missing: alias.missingRules, extra: alias.extraRules }, ...flags,
    limitation: 'Original captured owner paths only. Raw style attributes and possible rules are retained, not resolved. Fresh external CSSOM is separately source-bound. No candidate computed value or temporal/visible caret proof.' };
}

export function collectOverlayCaretContext() {
  const parentFile = 'docs/material-owner-caret-input-survey.json';
  const revision = '42fd47312ed6acc093d55eeced5e86b595a4d364';
  const parentBytes = readFileSync(parentFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(parentBytes, execFileSync('git', ['show', `${revision}:${parentFile}`],
    { maxBuffer: 32 * 1024 * 1024, encoding: 'utf8' }).replaceAll('\r\n', '\n'));
  const parent = JSON.parse(parentBytes);
  const historicalNormalize = bindHistoricalAuditNormalization(parent.productionNormalization, revision);
  const currentNormalize = bindPreciseAuditNormalization();
  const parentSourceChecks = parent.sourceFingerprints.map(s => {
    const current = hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n'));
    const normalization = s.file === parent.productionNormalization.module;
    if (normalization) {
      const historical = execFileSync('git', ['show', `${revision}:${s.file}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
      assert.equal(hash(historical.replaceAll('\r\n', '\n')), s.sha256);
    } else readGapSurveySource(s);
    return { file: s.file, recorded: s.sha256, current,
      verification: normalization ? 'historical-replay-and-current-caret-value-revalidation'
        : current !== s.sha256 ? 'exact-historical-source-restoration' : 'complete-source' };
  });
  const groups = parent.groups.filter(g => g.reasonCounts['unreviewed-captured-root-context']); assert.equal(groups.length, 13);
  const legacy = collectOriginalOverlayContextSurvey('artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json');
  const tooltip = collectTooltipCaretContext();
  const root = realpathSync('artifacts/material-parity') + path.sep;
  const hashed = d => {
    assert.ok(realpathSync(d.file).startsWith(root)); const bytes = readFileSync(d.file);
    assert.equal(hash(bytes), d.sha256, d.file); return JSON.parse(bytes);
  };
  const captures = [legacy.capture, tooltip.capture].map(d => ({ descriptor: d, raw: hashed(d) }));
  const sources = new Map();
  for (const c of captures) for (const d of c.raw.results) {
    assert.ok(!sources.has(d.case)); sources.set(d.case, { manifest: c.descriptor, descriptor: d, result: hashed(d) });
  }
  assert.equal(sources.size, 109);
  const rows = [], cases = new Set(); let observations = 0, ruleGaps = 0, motionOwners = 0, directOwners = 0;
  for (const g of groups) {
    assert.equal(g.observations.length, g.canonicalOccurrences);
    const members = [];
    for (const o of g.observations) {
      const source = sources.get(o.case); assert.ok(source); cases.add(o.case);
      const { result } = source, record = hashed(result.checkpointRecord), e = record.result;
      assert.equal(record.sha256, hash(JSON.stringify(e)));
      assert.equal(JSON.parse(record.key).kind, 'interaction');
      assert.equal(`interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}`, o.case);
      assert.equal(e.family, g.family); assert.deepEqual(o.inputTrees, e.inputTrees);
      const reference = hashed(e.inputTrees.reference), candidate = hashed(e.inputTrees.astylar);
      const inputs = e.styleInputs.filter(i => i.id === g.element); assert.equal(inputs.length, 1); const input = inputs[0];
      assert.equal(hash(JSON.stringify(input)), o.inputSha256);
      for (const style of [input.reference, input.astylar])
        assert.equal(historicalNormalize(style).caretColor, currentNormalize(style).caretColor,
          'overlay caret normalization changed');
      const proof = inspectOwnerCaretInput(input, reference, candidate, { family: g.family });
      assert.equal(hash(JSON.stringify(proof)), o.proofSha256);
      assert.deepEqual(proof.issues.map(i => i.reason), o.reasons);
      const alias = resolveOriginAliasPair(e, reference, candidate, input);
      assert.deepEqual(resolveOriginAliasPair(e, result.freshReferenceTree, candidate, input), alias);
      assert.deepEqual(inspectOwnerCaretInput(input, result.freshReferenceTree, candidate, { family: g.family }), proof);
      const review = inspectOverlayCaretRequests(alias, reference, candidate);
      assert.deepEqual(review.referencePath.map(n => n.node).reverse(), proof.referencePath);
      assert.deepEqual(review.candidatePath.map(n => n.node).reverse(), proof.candidatePath);
      const overlay = result.context.roots.find(r => r.captureKey === alias.referencePath.at(-1)); assert.ok(overlay);
      const external = overlay.ancestry.map(key => {
        const n = result.context.nodes.find(n => n.key === key); assert.ok(n);
        return { node: key, parent: n.parent, type: n.type, attributes: n.attributes,
          inline: n.inline, computedCaretAndMotion: Object.fromEntries(Object.entries(n.computed)
            .filter(([k]) => relevant(k) || k === 'color')) };
      });
      members.push({ case: o.case, original: o, checkpointRecord: result.checkpointRecord,
        freshSource: source.descriptor, originalAlias: alias, review, freshExternalContext: external,
        freshExternalSheetsSha256: hash(JSON.stringify(result.context.sheets)),
        historicalExternalContextVerified: false, historicalMotionVerified: false, candidateReplayed: false });
      observations++; if (review.scalarRuleGap) ruleGaps++;
      if (review.hasMotionRequest) motionOwners++; if (review.hasDirectCaretOrResetRequest) directOwners++;
    }
    rows.push({ family: g.family, element: g.element, property: g.property,
      canonicalRowSha256: g.canonicalRowSha256, canonicalOccurrences: g.canonicalOccurrences,
      reference: g.reference, candidate: g.candidate, observations: members });
  }
  assert.equal(observations, 378); assert.equal(cases.size, 109); assert.equal(ruleGaps, 59);
  return { schemaVersion: 1, kind: 'original-overlay-caret-declaration-and-fresh-context-survey',
    parent: { file: parentFile, revision, normalizedSha256: hash(parentBytes) },
    parentSourceChecks, freshCaptures: captures.map(c => c.descriptor),
    originalOverlayContextVerification: { onDiskReaderPasses: true, filesWritten: false,
      reader: 'tests/material-parity/original-overlay-context-survey.mjs',
      historicalCaptureReceiptsPreserved: true, candidateReplayed: false, renderingEquivalent: false },
    originalOverlayContextSummary: {
      cases: legacy.cases, matchedOriginalOwners: legacy.matchedOriginalOwners,
      historicalAuditSource: legacy.historicalAuditSource, historicalMappingSource: legacy.historicalMappingSource },
    tooltipContextSummary: { cases: tooltip.cases, originalScalarChecks: tooltip.originalScalarChecks },
    counts: { groups: rows.length, cases: cases.size, observations, originalScalarChecks: observations * 89,
      scalarRuleGapObservations: ruleGaps, motionRequestObservations: motionOwners, directCaretOrResetObservations: directOwners },
    groups: rows, ...flags, canonicalAttributionChanged: false,
    limitation: 'Source-bound review of all retained overlay caret groups. Fresh reference context does not replace unrecorded historical ancestry/motion. Original declaration requests and scalar authored-rule gaps remain explicit; no candidate replay, cascade reconstruction or equivalence classification.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectOverlayCaretContext();
  report.sourceFingerprints = ['scripts/audit-material-overlay-caret-context.mjs',
    'tests/material-parity/owner-caret-input-evidence.mjs', 'tests/material-parity/origin-alias-mapping-evidence.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/original-overlay-context-survey.mjs',
    'tests/material-parity/owner-caret-source-binding.mjs',
    'scripts/audit-material-tooltip-caret-context.mjs']
    .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) }));
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(overlayCaretSurveyFile, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(overlayCaretSurveyFile, output);
  console.log(JSON.stringify({ kind: report.kind, ...report.counts, ...flags, canonicalAttributionChanged: false }));
}
