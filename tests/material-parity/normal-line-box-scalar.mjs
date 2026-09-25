import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const one = values => values.length === 1 ? values[0] : undefined;
const keyOf = c => `${c.kind ?? (c.state ? 'interaction' : 'static')}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}`;
const accepted = new Set(['reviewed-normal-line-box-stage-comparison', 'reviewed-interactive-normal-line-box-stage-comparison']);
export const normalLineBoxScalarAttribution = 'reviewed-button-host-normal-line-box-stage';

export function validateNormalLineBoxScalar(rows, originalRows, cases, inventory, controlTypography) {
  const selected = values => values.filter(r => r.attribution === normalLineBoxScalarAttribution);
  const expected = selected(applyNormalLineBoxScalar(originalRows, cases, inventory, controlTypography));
  // Canonical JSON omits undefined fields; compare the persisted representation
  // without turning omitted values into CSS defaults.
  return isDeepStrictEqual(JSON.parse(JSON.stringify(selected(rows))), JSON.parse(JSON.stringify(expected))) ? [] :
    ['button-host line-height attribution lacks original membership and exact validated control-owner replay'];
}

// The caller must independently validate/replay controlTypography first. This
// join is not a validator for detached measurement reports or forged proofs.
// It consumes original cases, never the scalar row's sampled `cases` list.
export function applyNormalLineBoxScalar(rows, cases, inventory, controlTypography) {
  return rows.map(row => {
    if (row.attribution !== 'unresolved' || row.property !== 'lineHeight' ||
        row.reference !== 'normal' || row.astylar !== undefined) return row;
    const members = cases.filter(c => c.family === row.family && c.styleInputs?.some(i =>
      i.id === row.element && i.reference?.lineHeight === 'normal' && i.astylar?.lineHeight === undefined));
    if (!members.length || members.length !== row.occurrences || new Set(members.map(keyOf)).size !== members.length) return row;
    const proofs = [];
    for (const member of members) {
      const key = keyOf(member);
      const input = one(member.styleInputs.filter(i => i.id === row.element));
      if (!input || input.reference?.lineHeight !== 'normal' || !input.astylar || input.astylar.lineHeight !== undefined) return row;
      if (inventory.errors?.some(e => e.case === key)) return row;
      const maps = ['reference', 'astylar'].map(side => one(inventory.cases.filter(c => c.case === key && c.side === side)));
      if (maps.some(m => !m)) return row;
      const [ref, ast] = maps.map(m => inventory.variants[m.variant]);
      if (ref?.side !== 'reference' || ast?.side !== 'astylar') return row;
      const host = one(ref.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === row.element));
      const candidate = one(ast.nodes.filter(n => n.authored?.id === row.element));
      if (host?.type !== 'button' || candidate?.authored?.type !== 'button') return row;
      const label = one(ref.nodes.filter(n => n.parent === host.key && n.type === 'span' &&
        (n.attributes?.class ?? '').split(/\s+/).includes('mdc-button__label')));
      if (!label) return row;
      const hs = inventory.styles[host.style], ls = inventory.styles[label.style];
      if (hs?.side !== 'reference' || ls?.side !== 'reference' || hs.value?.lineHeight !== 'normal' ||
          ['lineHeight', 'fontSize', 'fontWeight', 'fontStyle', 'fontFamily', 'letterSpacing'].some(p =>
            hs.value[p] === undefined || hs.value[p] !== ls.value?.[p])) return row;
      const difference = one(controlTypography.differences.filter(d => d.case === key &&
        d.element === row.element && d.property === 'lineHeight'));
      const evidence = difference?.reviewEvidence, observation = evidence?.observation;
      if (!accepted.has(difference?.attribution) || difference.classification !== 'parity-harness-defect' ||
          difference.referenceNode !== label.key || difference.astylarNode !== candidate.key ||
          difference.source !== 'core-control-texture' || difference.values?.reference !== 'normal' ||
          observation?.referenceNode !== label.key || observation.fontReady !== true ||
          !Number.isFinite(observation.naturalHeight) || observation.naturalHeight <= 0 ||
          difference.values.painted !== `${observation.naturalHeight}px` ||
          evidence.currentPaintedLineHeight !== difference.values.painted ||
          evidence.inputEquivalent !== false || evidence.finalRasterVerified !== false ||
          evidence.candidateOmissionChain?.[0]?.node !== candidate.key) return row;
      proofs.push({ case: key, host: host.key, referenceLabel: label.key, candidate: candidate.key,
        controlAttribution: difference.attribution,
        controlProofSha256: createHash('sha256').update(JSON.stringify(difference)).digest('hex') });
    }
    return { ...row, classification: 'parity-harness-defect', attribution: normalLineBoxScalarAttribution,
      recommendedOwner: 'input audit button-host versus validated control-label line-height stages',
      justification: 'Every original member maps one reference button host to its direct label with matching line-height and font inputs. Its exact candidate text owner already has an independently validated natural-line-box proof. This explains normal versus omitted resolved declarations only; it does not assert equal authored inputs, font fallback, baseline, wrapping, placement or raster.',
      reviewEvidence: { proofs, inputEquivalent: false, finalRasterVerified: false } };
  });
}
