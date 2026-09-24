import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { resolveGeneratedReferenceNode } from './generated-node-mapping-evidence.mjs';
import { collectTooltipPositionComposition } from './tooltip-position-composition.mjs';
import { queryFindings, loadFindingEvidence } from '../../scripts/audit-findings-store.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
export const overlaySurfacePredecessor = Object.freeze({
  generation: 'd70aa37e4e14a9bfdc6183e0c2a7c383638d83050fc76b2d556a26b510691fa4',
  indexSha256: '4b06ed4bbcdf6f5ad969e3c61e27d27bf83810dc2e2be1224c86cac41d32a293',
});
const readBound = receipt => {
  const bytes = readFileSync(receipt.file); assert.equal(hash(bytes), receipt.sha256);
  return JSON.parse(bytes);
};

export function proveTooltipSizingRequests(observation, reference, candidate) {
  const identity = { inputEquivalent: false, status: 'mapped',
    referenceNode: observation.paths.reference[0].key,
    candidateNode: observation.paths.astylar[0].key,
    referencePath: observation.paths.reference.map(n => n.key),
    candidatePath: observation.paths.astylar.map(n => n.key),
    missingRules: [], extraRules: [] };
  const expected = { minWidth: '40px', maxWidth: '200px', minHeight: '24px', maxHeight: '40vh' };
  for (const [property, value] of Object.entries(expected)) {
    const trace = inspectOverlayOwnerDeclarations(property, identity, reference, candidate);
    const css = property.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const native = trace.referencePath[0], owner = trace.candidatePath[0];
    assert.equal(owner.authored.id, 'tooltip-popup');
    assert.ok(native.attributes.class.split(/\s+/).includes('mat-mdc-tooltip-surface'));
    assert.deepEqual(native.inline, {});
    const active = native.rules.filter(rule => rule.active && Object.hasOwn(rule.declarations, css));
    assert.equal(active.length, 1);
    assert.equal(active[0].selector, '.mat-mdc-tooltip-surface');
    assert.equal(active[0].declarations[css].value, value);
    if (property !== 'maxHeight') assert.equal(native.computed, value);
    else assert.ok(['400px', '337.6px'].includes(native.computed));
    assert.deepEqual(Object.values(owner.localValues), ['<omitted>', '<omitted>', '<omitted>']);
    assert.deepEqual(owner.inline, {});
    const relevant = key => [property.toLowerCase(), 'all'].includes(key.replaceAll('-', '').toLowerCase());
    assert.ok(owner.possibleRules.every(rule => !Object.keys(rule.declarations).some(relevant)));
    assert.doesNotMatch(owner.authored.attributes?.style ?? '', /(?:min|max)-(?:width|height)|\ball\s*:/i);
  }
  return Object.keys(expected);
}

export function proveSnackbarSurfaceRequests(r, a) {
  const mapping = resolveGeneratedReferenceNode(r, 'snack-bar-surface', 'snack-bar');
  assert.equal(mapping.status, 'mapped');
  const style = r.styles[mapping.styleIndex];
  assert.deepEqual(['backgroundColor', 'color', 'minWidth', 'maxWidth', 'paddingLeft', 'paddingRight', 'justifyContent']
    .map(key => style[key]), ['rgb(50, 48, 51)', 'rgb(245, 239, 244)', '344px', '672px', '0px', '8px', 'flex-start']);
  const active = mapping.ruleIndices.map(i => r.rules[i]).filter(rule => rule.active);
  const declarations = Object.assign({}, ...active.map(rule => rule.declarations));
  for (const [key, value] of Object.entries({ 'min-width': '344px', 'max-width': '672px',
    'padding-left': '0px', 'padding-right': '8px', 'justify-content': 'flex-start' }))
    assert.equal(declarations[key]?.value, value);
  assert.equal(declarations['background-color']?.value,
    'var(--mat-snack-bar-container-color, var(--mat-sys-inverse-surface))');
  assert.equal(declarations.color?.value,
    'var(--mat-snack-bar-supporting-text-color, var(--mat-sys-inverse-on-surface))');
  assert.equal(declarations['box-shadow']?.value, style.boxShadow);
  assert.notEqual(style.boxShadow, 'none');
  const owners = a.nodes.filter(n => n.authored.id === 'snack-bar-surface');
  assert.equal(owners.length, 1);
  const rule = a.rules.find(rule => rule.selector === '.snack-surface');
  assert.ok(rule);
  const relevant = key => /^(all|background.*|color|minwidth|maxwidth|padding.*|justifycontent|boxshadow|animation.*|transition.*)$/.test(key.replaceAll('-', '').toLowerCase());
  assert.ok(!Object.keys(owners[0].authored.style ?? {}).some(relevant), 'inline request competes with snack-surface');
  assert.doesNotMatch(owners[0].authored.attributes?.style ?? '', /(?:all|background[^:]*|color|min-width|max-width|padding[^:]*|justify-content|box-shadow|animation[^:]*|transition[^:]*)\s*:/i);
  for (const other of a.rules.filter(r => r !== rule && rootInitialSelectorCanApply(r.selector, owners[0].authored))) {
    assert.ok(!Object.keys(other).some(relevant), `competing candidate declaration: ${other.selector}`);
  }
  for (const candidate of [rule, ...['normalResolvedStyle', 'resolvedStyle', 'interactionResolvedStyle'].map(stage => owners[0][stage])]) {
    assert.deepEqual(['width', 'height', 'padding', 'justifyContent', 'background', 'color'].map(key => candidate[key]),
      ['344px', '48px', '0 18px', 'space-between', '#322f35', '#ffffff']);
    for (const key of ['minWidth', 'maxWidth', 'boxShadow']) assert.equal(Object.hasOwn(candidate, key), false);
  }
}

export const snackbarSurfaceValues = Object.freeze({
  backgroundColor: ['rgba(50,48,51,1)', 'rgba(50,47,53,1)'],
  color: ['rgba(245,239,244,1)', 'rgba(255,255,255,1)'],
  minWidth: ['344px'], maxWidth: ['672px'],
  paddingLeft: ['0', '18px'], paddingRight: ['8px', '18px'],
  justifyContent: ['flex-start', 'space-between'],
  boxShadow: ['rgba(0,0,0,0.2) 0 3px 5px -1px,rgba(0,0,0,0.14) 0 6px 10px 0,rgba(0,0,0,0.12) 0 1px 18px 0'],
});

// One source-backed batch; no renderer fix or output-equivalence inference.
// The original snapshot is pinned so later index updates cannot silently change
// the predecessor. Reuse the same semantic proofs exercised by the existing tests.
export async function collectOverlaySurfaceReview() {
  const directory = 'artifacts/material-parity/working-audit';
  const population = readBound({ file: 'docs/material-position-input-population.json',
    sha256: '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff' });
  const snacks = population.groups.find(g => g.element === 'snack-bar-overlay').observations;
  assert.equal(snacks.length, 34); assert.equal(new Set(snacks.map(o => o.case)).size, 34);
  for (const o of snacks) proveSnackbarSurfaceRequests(readBound(o.inputTrees.reference), readBound(o.inputTrees.astylar));
  const tooltips = collectTooltipPositionComposition().observations;
  assert.equal(tooltips.length, 18);
  const tooltipValues = new Map();
  for (const o of tooltips) {
    const r = readBound(o.inputTrees.reference), a = readBound(o.inputTrees.astylar);
    const properties = proveTooltipSizingRequests(o, r, a);
    const style = r.styles[r.nodes.find(n => n.key === o.paths.reference[0].key).style];
    for (const property of properties) {
      const key = JSON.stringify([property, style[property]]);
      if (!tooltipValues.has(key)) tooltipValues.set(key, []);
      tooltipValues.get(key).push(o);
    }
  }
  const groups = [];
  for (const family of ['snack-bar', 'tooltip']) {
    const snack = family === 'snack-bar';
    const rows = queryFindings(directory, family, overlaySurfacePredecessor).filter(row =>
      row.evidence.section === 'discrepancies' &&
      row.element === (snack ? 'snack-bar-surface' : 'tooltip-popup') &&
      (snack ? Object.hasOwn(snackbarSurfaceValues, row.property) : ['minWidth', 'maxWidth', 'minHeight', 'maxHeight'].includes(row.property)));
    assert.equal(rows.length, snack ? 8 : 5);
    for (const compact of rows) {
      const row = await loadFindingEvidence(directory, family, compact.id, overlaySurfacePredecessor);
      assert.equal(row.attribution, 'unresolved');
      const observations = snack ? snacks : tooltipValues.get(JSON.stringify([row.property, row.reference]));
      assert.ok(observations);
      const cases = observations.map(o => o.case);
      if (snack) {
        const values = snackbarSurfaceValues[row.property]; assert.equal(row.reference, values[0]);
        assert.equal(Object.hasOwn(row, 'astylar'), values.length === 2);
        if (values.length === 2) assert.equal(row.astylar, values[1]);
      } else assert.equal(Object.hasOwn(row, 'astylar'), false);
      assert.equal(row.occurrences, cases.length); assert.equal(new Set(cases).size, cases.length);
      assert.deepEqual(row.cases, cases.slice(0, 12));
      assert.deepEqual(row.states, [...new Set(cases.map(key => key.split('/').at(-1)))]);
      groups.push({
        ...Object.fromEntries(['family', 'element', 'property', 'reference', 'astylar', 'occurrences']
          .filter(key => Object.hasOwn(row, key)).map(key => [key, row[key]])),
        classification: 'application-plugin-authoring-defect',
        attribution: snack ? 'reviewed-snackbar-surface-input-substitution' : 'reviewed-tooltip-sizing-constraint-omission',
        justification: snack
          ? 'The mapped reference surface requests intrinsic min/max sizing, asymmetric padding, start alignment, theme paint and a shadow; the candidate substitutes fixed sizing, symmetric padding, space-between, literal colors and no shadow. Original rule and style-stage evidence establishes unequal authoring, not a missing-paint cause.'
          : 'The mapped reference tooltip surface actively requests min/max width and height; the corresponding candidate owner has no equivalent inline, possibly matching rule or local stage request. This is unequal authoring, not proof of the reported displacement, blur or a core sizing defect.',
        recommendedOwner: 'Material overlay authoring; restore equal inputs only after general core support is proved',
        reviewedCases: cases,
        reviewEvidence: { originalCompleteRowSha256: compact.evidence.completeRowSha256,
          sourceSha256: compact.evidence.sourceSha256,
          observations: observations.map(o => ({ case: o.case, inputTrees: o.inputTrees })),
          inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false },
      });
    }
  }
  assert.equal(groups.length, 13); assert.equal(groups.reduce((n, g) => n + g.occurrences, 0), 344);
  return { schemaVersion: 1, kind: 'overlay-surface-review', predecessor: overlaySurfacePredecessor,
    groups, counts: { groups: 13, observations: 344 }, canonicalAttributionChanged: false,
    sources: ['tests/material-parity/overlay-surface-review.mjs',
      'tests/material-parity/overlay-owner-declaration-review.mjs',
      'tests/material-parity/root-initial-style-evidence.mjs',
      'tests/material-parity/generated-node-mapping-evidence.mjs',
      'tests/material-parity/tooltip-position-composition.mjs',
      'scripts/inspect-material-tooltip-position-ancestry.mjs',
      'examples/material-showcase/src/app/astylar.component.ts'].map(file => ({
        file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')),
      })) };
}

// Pure, reversible metadata application. Callers must independently replay the
// collector before trusting a saved review; this function is not authentication.
export function applyOverlaySurfaceRows(rows, review) {
  assert.equal(review.kind, 'overlay-surface-review');
  assert.equal(review.canonicalAttributionChanged, false);
  assert.deepEqual(review.predecessor, overlaySurfacePredecessor);
  assert.deepEqual(review.counts, { groups: 13, observations: 344 });
  const fields = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
  const signature = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
  const expected = new Map(review.groups.map(g => [signature(g), g]));
  assert.equal(expected.size, 13); assert.equal(review.groups.length, 13);
  const seen = new Set(); let occurrences = 0;
  const output = rows.map(row => {
    const key = signature(row), decision = expected.get(key);
    if (!decision) return row;
    assert.ok(!seen.has(key), 'duplicate overlay predecessor'); seen.add(key);
    assert.equal(row.attribution, 'unresolved');
    assert.equal(digest(row), decision.reviewEvidence.originalCompleteRowSha256, 'complete overlay predecessor changed');
    assert.equal(decision.reviewedCases.length, row.occurrences);
    assert.equal(decision.classification, 'application-plugin-authoring-defect');
    occurrences += row.occurrences;
    const priorMetadata = fields.map(field => ({ field, present: Object.hasOwn(row, field),
      ...(Object.hasOwn(row, field) ? { value: structuredClone(row[field]) } : {}) }));
    const changed = { ...row, ...Object.fromEntries(fields.map(field => [field, structuredClone(decision[field])])),
      reviewEvidence: { ...structuredClone(decision.reviewEvidence), priorMetadata } };
    const restored = structuredClone(changed);
    for (const p of priorMetadata) { if (p.present) restored[p.field] = p.value; else delete restored[p.field]; }
    assert.deepEqual(restored, row, 'overlay classification must conserve every raw field');
    return changed;
  });
  assert.equal(seen.size, 13, 'overlay predecessor population incomplete');
  assert.equal(occurrences, 344);
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert.equal(process.argv[2], '--export');
  const review = await collectOverlaySurfaceReview();
  writeFileSync('docs/material-overlay-surface-review.json', JSON.stringify(review, null, 2) + '\n');
  console.log(JSON.stringify(review.counts));
}
