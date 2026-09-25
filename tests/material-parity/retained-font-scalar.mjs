import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { checkGeneratedMappingPair } from './generated-node-mapping-evidence.mjs';

const one = values => values.length === 1 ? values[0] : undefined;
const keyOf = c => `${c.kind ?? (c.state ? 'interaction' : 'static')}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}`;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const sourceAttribution = 'reviewed-inherited-component-font-stack';
export const retainedFontScalarAttribution = 'reviewed-scalar-component-font-omission';
const generated = new Set(['stepper-content', 'tooltip-popup']);
const index = (values, key) => {
  const result = new Map();
  for (const value of values) {
    const k = key(value);
    if (!result.has(k)) result.set(k, []);
    result.get(k).push(value);
  }
  return result;
};

// Join only independently replayed/validated retained typography. This is not
// an authenticator for detached reports. Original cases and inventory must also
// be authenticated by the caller; sampled scalar `cases` are never membership.
export function applyRetainedFontScalar(rows, cases, inventory, retained, normalize) {
  const proofKey = d => JSON.stringify([d.case, d.element, d.property]);
  const differences = index(retained.differences, proofKey);
  const comparisons = index(retained.comparisons, d => JSON.stringify([d.case, d.element]));
  const mappings = index(inventory.cases, c => JSON.stringify([c.case, c.side]));
  const aliasTrees = new Map();
  return rows.map(row => {
    const weight = row.property === 'fontWeight' && row.family === 'button-toggle' &&
      ['button-toggle-one', 'button-toggle-two'].includes(row.element) && row.reference === '500';
    if (row.attribution !== 'unresolved' || row.astylar !== undefined ||
        !(weight || row.property === 'fontFamily' && row.reference === 'roboto')) return row;
    const property = row.property;
    const members = cases.filter(c => c.family === row.family && c.styleInputs?.some(i =>
      i.id === row.element && i.reference && i.astylar &&
      normalize(i.reference)[property] === row.reference && normalize(i.astylar)[property] === undefined));
    if (!members.length || members.length !== row.occurrences || new Set(members.map(keyOf)).size !== members.length) return row;
    const proofs = [];
    for (const member of members) {
      const key = keyOf(member), input = one(member.styleInputs.filter(i => i.id === row.element));
      if (!input || input.astylarResolvedStyleEvidenceVersion !== 2 || inventory.errors?.some(e => e.case === key)) return row;
      const maps = ['reference', 'astylar'].map(side => one(mappings.get(JSON.stringify([key, side])) ?? []));
      if (maps.some(m => !m)) return row;
      const [ref, ast] = maps.map(m => inventory.variants[m.variant]);
      if (ref?.side !== 'reference' || ast?.side !== 'astylar' || ast.resolvedStyleEvidenceVersion !== 2 ||
          ast.resolvedStyleSource !== 'core-style-inspection' || !Number.isInteger(maps[1].resolvedStyleRevision)) return row;
      const candidate = one(ast.nodes.filter(n => n.authored?.id === row.element));
      let reference = one(ref.nodes.filter(n => n.attributes?.id === row.element));
      if (generated.has(row.element)) {
        // Reuse the existing active-panel/overlay alias proof, including scalar
        // structure, rule order and style snapshots. Never match by font alone.
        if (!aliasTrees.has(key)) aliasTrees.set(key, modalInventoryTrees(inventory, key));
        const check = checkGeneratedMappingPair(member, ...aliasTrees.get(key), row.element);
        if (check.status !== 'mapped' || check.candidate.key !== candidate?.key) return row;
        reference = one(ref.nodes.filter(n => n.key === check.node.key));
      }
      if (!reference || !candidate) return row;
      const referenceStyle = inventory.styles[reference.style];
      if (referenceStyle?.side !== 'reference' || !input.reference || Object.keys(input.reference).length !== 89 ||
          Object.entries(input.reference).some(([p, value]) => referenceStyle.value?.[p] !== value)) return row;
      for (const [scalar, stage] of [['astylar', 'style'], ['astylarNormalResolvedStyle', 'normalStyle'],
        ['astylarInteractionResolvedStyle', 'interactionStyle']]) {
        const style = inventory.styles[candidate[stage]];
        if (!input[scalar] || style?.side !== 'astylar' || !isDeepStrictEqual(input[scalar], style.value)) return row;
      }
      if (weight) {
        const label = `${row.element}-label`;
        const difference = one(differences.get(JSON.stringify([key, label, property])) ?? []);
        const comparison = one(comparisons.get(JSON.stringify([key, label])) ?? []);
        const proof = difference?.reviewEvidence, values = difference?.values;
        const referenceChain = proof?.referenceChain, candidateChain = proof?.candidateChain;
        // The scalar is the host, not the text leaf. Prove that both complete
        // reviewed chains actually include that host; never join by value alone.
        const linked = (chain, nodes, leaf, host) => Array.isArray(chain) && chain.length > 1 &&
          chain[0].node === leaf && chain.some(p => p.node === host) &&
          new Set(chain.map(p => p.node)).size === chain.length && chain.every((p, i) => {
            const node = one(nodes.filter(n => n.key === p.node));
            return node && (i === chain.length - 1 || node.parent === chain[i + 1].node);
          });
        if (difference?.family !== row.family || difference.attribution !== 'reviewed-control-label-token-input' ||
            difference.classification !== 'application-plugin-authoring-defect' || difference.source !== 'core-text-registry' ||
            difference.revision !== maps[1].resolvedStyleRevision || comparison?.revision !== difference.revision ||
            comparison?.source !== 'core-text-registry' || comparison.currentPseudoStatePaintVerified !== false ||
            comparison.referenceNode !== difference.referenceNode || comparison.astylarNode !== difference.astylarNode ||
            !isDeepStrictEqual(comparison.properties?.fontWeight, values) ||
            values?.reference !== '500' || values.retained !== '400' || values.normal !== undefined || values.effective !== undefined ||
            proof?.property !== property || proof.referenceComputed !== '500' || proof.candidateRetained !== '400' ||
            !linked(referenceChain, ref.nodes, difference.referenceNode, reference.key) ||
            !linked(candidateChain, ast.nodes, difference.astylarNode, candidate.key) ||
            referenceChain.some(p => p.computed?.fontWeight !== '500') ||
            candidateChain.some(p => !p.normal || !p.effective || p.normal.fontWeight !== undefined || p.effective.fontWeight !== undefined) ||
            proof.referenceRule?.selector !== '.mat-button-toggle-appearance-standard' ||
            proof.referenceRule.declarations?.['font-weight']?.value !== 'var(--mat-button-toggle-label-text-weight, var(--mat-sys-label-large-weight))') return row;
        proofs.push({ case: key, referenceNode: reference.key, candidateNode: candidate.key,
          retainedLabel: label, proofSha256: hash(difference) });
        continue;
      }
      const difference = one(differences.get(JSON.stringify([key, row.element, 'fontFamily'])) ?? []);
      const comparison = one(comparisons.get(JSON.stringify([key, row.element])) ?? []);
      const evidence = difference?.reviewEvidence, values = difference?.values;
      if (difference?.family !== row.family || difference.attribution !== sourceAttribution ||
          difference.classification !== 'application-plugin-authoring-defect' || difference.source !== 'core-text-registry' ||
          difference.referenceNode !== reference.key || difference.astylarNode !== candidate.key ||
          difference.inputEquivalent !== false || difference.currentPseudoStatePaintVerified !== false ||
          values?.reference !== 'roboto' || values.retained !== 'roboto,arial,sans-serif' ||
          values.normal !== undefined || values.effective !== undefined ||
          comparison?.referenceNode !== reference.key || comparison.astylarNode !== candidate.key ||
          comparison.source !== 'core-text-registry' || !isDeepStrictEqual(comparison.properties?.fontFamily, values) ||
          evidence?.referenceChain?.[0]?.node !== reference.key || evidence?.candidateChain?.[0]?.node !== candidate.key ||
          evidence.referenceComputed !== values.reference || evidence.candidateRetained !== values.retained) return row;
      proofs.push({ case: key, referenceNode: reference.key, candidateNode: candidate.key, proofSha256: hash(difference) });
    }
    return { ...row, classification: 'application-plugin-authoring-defect', attribution: retainedFontScalarAttribution,
      recommendedOwner: 'showcase Material component font-token translation and reference structure',
      justification: weight
        ? 'Every original button-toggle host scalar is present in both ancestry chains of its independently validated component-label token proof. Material requests weight 500; candidate declarations omit it and the text registry retains 400. Host and leaf identities are distinct and explicitly joined. This is unequal component typography authoring, not a synthesized host computed value or proof of current glyph, geometry or raster parity.'
        : 'Every original scalar member maps to the exact owner of an independently validated inherited-component-font proof. The reference component requests Roboto; candidate normal/effective declarations omit the component override and retain the page fallback stack. Omitted scalar fields remain omitted. This is unequal component authoring, not font-list equivalence or proof of current glyph, geometry or raster parity.',
      reviewEvidence: { sourceAttribution: weight ? 'reviewed-control-label-token-input' : sourceAttribution,
        proofs, inputEquivalent: false, renderingEquivalent: false } };
  });
}

export function validateRetainedFontScalar(rows, originalRows, cases, inventory, retained, normalize) {
  const selected = values => values.filter(r => r.attribution === retainedFontScalarAttribution);
  const expected = selected(applyRetainedFontScalar(originalRows, cases, inventory, retained, normalize));
  return isDeepStrictEqual(JSON.parse(JSON.stringify(selected(rows))), JSON.parse(JSON.stringify(expected))) ? [] :
    ['component font scalar attribution lacks complete original membership and validated retained-owner replay'];
}
