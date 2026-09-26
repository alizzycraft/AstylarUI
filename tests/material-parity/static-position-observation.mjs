import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { auditReadFileSync as readFileSync } from './audit-evidence-session.mjs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { applyModalBoxReview } from './modal-position-inspection.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const selected = ['badge-label', 'divider-above', 'divider-below', 'step-details-text',
  'step-review-text', 'table-primary', 'toolbar-title'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
export const buttonOffsetOwners = Object.freeze({
  button: ['button-primary', 'button-secondary', 'button-disabled'], card: ['card-open'],
  menu: ['menu-primary'], 'bottom-sheet': ['bottom-sheet-primary'], dialog: ['dialog-primary'],
  'snack-bar': ['snack-bar-primary'], tooltip: ['tooltip-primary'],
});

export function proveButtonOffsetObservation(entry, r, a, element) {
  assert.ok(buttonOffsetOwners[entry.family]?.includes(element));
  for (const tree of [r, a]) {
    assert.deepEqual(tree.errors, []); assert.equal(tree.ruleEvidenceComplete, true);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  const reference = one(r.nodes.filter(n => n.attributes?.id === element));
  const candidate = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(reference.type, 'button'); assert.equal(candidate.authored.type, 'button');
  assert.deepEqual(reference.inline, {}); assert.equal(candidate.authored.style, undefined);
  assert.equal(candidate.authored.attributes?.style, undefined);
  const affects = key => /^(position|top|right|bottom|left|all)$|^inset/.test(key.replaceAll('-', '').toLowerCase());
  const requests = reference.rules.map(i => r.rules[i]).filter(rule => rule.active).flatMap(rule => {
    assert.ok(!rule.cssText.includes('\\'));
    assert.doesNotMatch(rule.cssText, /(?:^|[;{])\s*(?:inset[\w-]*|top|right|bottom|left|all)\s*:/i);
    return Object.entries(rule.declarations).filter(([key]) => affects(key))
      .map(([key, value]) => ({ selector: rule.selector, conditions: rule.conditions, key, ...value }));
  });
  assert.deepEqual(requests, [{ selector: '.mdc-button', conditions: [], key: 'position', value: 'relative', important: false }]);
  const candidateRequests = a.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, candidate.authored))
    .flatMap(rule => Object.keys(rule).filter(affects).map(key => ({ selector: rule.selector, key, value: rule[key] })));
  assert.deepEqual(candidateRequests, element === 'card-open'
    ? [{ selector: '.text-button', key: 'position', value: 'relative' }] : []);
  for (const stage of ['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle']) {
    assert.ok(candidate[stage]);
    assert.ok(!Object.keys(candidate[stage]).some(key => key !== 'position' && affects(key)));
    assert.equal(candidate[stage].position, element === 'card-open' ? 'relative' : undefined);
  }
  assert.equal(r.styles[reference.style].position, 'relative');
  const offsets = ['top', 'right', 'bottom', 'left'];
  for (const key of offsets) assert.equal(r.styles[reference.style][key], '0px');
  return { element, referenceNode: reference.key, astylarNode: candidate.key,
    referencePositionRequests: requests, candidatePositionRequests: candidateRequests,
    referenceComputedOffsets: Object.fromEntries(offsets.map(key => [key, '0px'])),
    attributableProperties: offsets, candidateComputedPositionVerified: false, candidateUsedOffsetsVerified: false,
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
}

export function applyButtonOffsetObservations(rows, cases, inventory, canonicalStyle) {
  return Object.entries(buttonOffsetOwners).reduce((values, [family, elements]) => elements.reduce((current, element) =>
    applyModalBoxReview(current, cases, inventory, canonicalStyle, {
      family, element, properties: ['top', 'right', 'bottom', 'left'],
      prove: (entry, r, a) => proveButtonOffsetObservation(entry, r, a, element),
      classification: 'parity-harness-defect', attribution: 'reviewed-button-computed-offset-stage',
      owner: 'input audit CSSOM resolved offsets versus local declarations',
      justification: 'Directly mapped Material buttons explicitly request relative positioning without physical/logical insets or resets, while CSSOM reports zero offsets. Candidate local offsets are omitted. Only card-open explicitly requests relative positioning; other owner position omissions remain independently reviewed. This diagnoses mixed observation stages, not authored zeros to copy, containing-block equivalence, or a renderer cause.',
    }), values), rows);
}

export function validateButtonOffsetObservations(rows, originalRows, cases, inventory, canonicalStyle) {
  try {
    const select = values => values.filter(row => row.attribution === 'reviewed-button-computed-offset-stage');
    assert.deepEqual(select(rows), select(applyButtonOffsetObservations(originalRows, cases, inventory, canonicalStyle)));
    return [];
  } catch (error) { return [`button offsets do not replay from original owners: ${error.message}`]; }
}

export function proveStaticPositionObservation(r, a, element) {
  assert.ok(selected.includes(element));
  assert.deepEqual(r.errors, []); assert.deepEqual(a.errors, []);
  assert.equal(r.contextStyleEvidenceVersion, 1);
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  const rn = one(r.nodes.filter(n => n.attributes?.id === element));
  const an = one(a.nodes.filter(n => n.authored?.id === element));
  assert.equal(rn.type, an.authored.type);
  assert.ok(!an.authored.type.includes(':'));
  assert.equal(r.styles[rn.style].position, 'static');
  for (const name of ['position', 'all']) {
    assert.ok(!Object.hasOwn(rn.inline, name));
    for (const index of rn.rules) {
      const rule = r.rules[index]; assert.ok(rule);
      if (rule.active) assert.ok(!Object.hasOwn(rule.declarations, name));
    }
    assert.ok(!Object.hasOwn(an.authored, name));
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
      assert.ok(an[stage]); assert.ok(!Object.hasOwn(an[stage], name));
    }
  }
  assert.ok(!Object.hasOwn(an.authored, 'style'));
  // Reset support must not be guessed from omission in the stage output.
  assert.ok(a.rules.every(rule => !Object.hasOwn(rule, 'all')));
  return { element, referenceOwner: rn.key, candidateOwner: an.key, elementType: rn.type,
    referenceComputed: 'static', candidatePositionPresent: false,
    classification: 'parity-harness-defect', attribution: 'reviewed-static-position-observation-stage',
    justification: 'This scalar comparison mixes browser computed static with an omitted candidate style-stage value. The mapped same-type owners have no captured explicit position request; candidate computed position and containing-block behavior remain unproven.',
    computedCandidateVerified: false, inputEquivalent: false, renderingEquivalent: false,
    rendererCauseProven: false };
}
export function collectStaticPositionObservations() {
  const file = 'docs/material-position-input-population.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const groups = JSON.parse(bytes).groups.filter(g => selected.includes(g.element));
  assert.deepEqual(groups.map(g => g.element), selected);
  const reviewed = groups.map(g => {
    assert.equal(g.reference, 'static'); assert.equal(g.candidateOmitted, true);
    assert.equal(g.referenceExplicitPositionObservations, 0);
    assert.equal(g.candidateExplicitPositionObservations, 0);
    assert.equal(g.differingElementTypes, 0);
    return { family: g.family, element: g.element, priorRowSha256: g.priorRowSha256,
      observations: g.observations.map(o => {
        const trees = ['reference', 'astylar'].map(side => {
          const receipt = o.inputTrees[side], source = readFileSync(receipt.file);
          assert.equal(hash(source), receipt.sha256); return JSON.parse(source);
        });
        assert.deepEqual(o.referenceDeclarations, []); assert.deepEqual(o.candidateDeclarations, []);
        return { case: o.case, inputSha256: o.inputSha256, inputTrees: o.inputTrees,
          proof: proveStaticPositionObservation(...trees, g.element) };
      }) };
  });
  const count = reviewed.reduce((n, g) => n + g.observations.length, 0); assert.equal(count, 340);
  return { schemaVersion: 1, kind: 'static-position-observation-review', population: { file, sha256: hash(bytes) },
    reviewed, counts: { groups: 7, observations: count }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectStaticPositionObservations();
  writeFileSync('docs/material-static-position-observation.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
