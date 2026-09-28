import assert from 'node:assert/strict';
import { proveGridPositionSubstitution } from '../../scripts/audit-material-grid-position-substitution.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

const relevant = key => /^(all|position|top|right|bottom|left)$|^(inset|animation|transition)/.test(key.replaceAll('-', '').toLowerCase());
const requests = declarations => Object.fromEntries(Object.entries(declarations ?? {}).filter(([key]) => relevant(key)));

export function proveGridOffsetRequests(entry, reference, candidate, element) {
  assert.equal(entry.family, 'grid-list');
  const composition = proveGridPositionSubstitution(reference, candidate);
  const root = element === 'grid-list-primary';
  assert.ok(root || ['grid-tile-one', 'grid-tile-two'].includes(element));
  const pair = root ? { referenceKey: composition.referenceRootKey, candidateKey: composition.candidateRootKey }
    : composition.tiles.find(t => t.id === element);
  const r = reference.nodes.find(n => n.key === pair.referenceKey), a = candidate.nodes.find(n => n.key === pair.candidateKey);
  const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
  const input = inputs[0]; assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'], ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.deepEqual(input[scalar], a[stage]);
    assert.deepEqual(requests(a[stage]), root ? {} : { position: 'relative' });
  }
  assert.equal(reference.ruleEvidenceComplete, true); assert.equal(candidate.ruleEvidenceComplete, true);
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  const own = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored));
  const candidateRequests = own.map(({ selector, ...style }) => ({ selector, declarations: requests(style) }))
    .filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(candidateRequests, root ? [] : [{ selector: '.grid-tile', declarations: { position: 'relative' } }]);
  const nativeRules = r.rules.map(i => reference.rules[i]);
  for (const rule of nativeRules.filter(rule => rule.active)) assert.doesNotMatch(rule.cssText, /\\/);
  const nativeRequests = nativeRules.filter(rule => rule.active).map(rule => ({ selector: rule.selector, declarations: requests(rule.declarations) }))
    .filter(rule => Object.keys(rule.declarations).length);
  assert.deepEqual(nativeRequests, [{ selector: root ? '.mat-grid-list' : '.mat-grid-tile',
    declarations: { position: { value: root ? 'relative' : 'absolute', important: false } } }]);
  assert.deepEqual(requests(r.inline), root ? {} : {
    left: { value: element === 'grid-tile-one' ? '0px' : 'calc(50% + 0.5px)', important: false },
    top: { value: '0px', important: false },
  });
  return { referenceNode: r.key, astylarNode: a.key, composition, nativeRequests, referenceInline: r.inline,
    candidateRequests, referenceComputed: reference.styles[r.style],
    inputEquivalent: false, renderingEquivalent: false, candidateUsedOffsetsVerified: false, rendererCauseProven: false };
}

export function applyGridOffsetReviews(rows, cases, inventory, normalize) {
  for (const element of ['grid-list-primary', 'grid-tile-one', 'grid-tile-two']) {
    const root = element === 'grid-list-primary', prove = (entry, r, a) => proveGridOffsetRequests(entry, r, a, element);
    if (!root) rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family: 'grid-list', element, properties: ['top', 'left'], prove,
      attribution: 'reviewed-grid-inset-request-substitution', owner: 'showcase positioned-tile layout translation',
      justification: 'Native absolute tiles explicitly request top zero and left zero or calc(50% + 0.5px); candidate relative grid items omit both insets. The existing composition proof establishes unequal layout requests before rendering. Preserve calc intent rather than copying sampled pixels; no renderer offset cause or rendering equivalence is established.',
    });
    rows = applyModalBoxReview(rows, cases, inventory, normalize, {
      family: 'grid-list', element, properties: root ? ['top', 'right', 'bottom', 'left'] : ['right', 'bottom'], prove,
      classification: 'parity-harness-defect', attribution: 'reviewed-grid-computed-inset-boundary',
      owner: 'computed native offsets versus local candidate declarations',
      justification: 'These native pixel offsets are computed, not authored inset requests: the relative root has no insets and absolute tiles have no right/bottom requests. Candidate local declarations omit these properties. This measurement-stage discrepancy coexists with the separately proven layout substitution; it does not prove candidate used offsets, equivalent layout or a core coordinate defect.',
    });
  }
  return rows;
}
