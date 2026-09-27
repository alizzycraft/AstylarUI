import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { applyModalBoxReview } from './modal-position-inspection.mjs';

export const tabScalarTypographyAttribution = 'reviewed-tab-scalar-typography-owner';
const one = values => { assert.equal(values.length, 1); return values[0]; };

// Consume independently replayed control evidence, as the existing dialog and
// normal-line-box scalar bridges do. This is not a detached-proof validator.
export function applyTabScalarTypography(rows, cases, inventory, control, normalize) {
  let result = rows;
  for (const element of ['tab-overview', 'tab-activity']) {
    for (const property of ['lineHeight', 'letterSpacing']) {
      result = applyModalBoxReview(result, cases, inventory, normalize, {
        family: 'tabs', element, properties: [property],
        attribution: tabScalarTypographyAttribution,
        owner: 'showcase Material tab content/label structure and typography input translation',
        justification: 'The complete scalar population joins the existing independently replayed tab-label typography authoring proof at the same native leaf and candidate control. The nested label line-height and tracking token were flattened or omitted. Local omissions remain omitted; actual paint is evidence, not a replacement scalar value. No core rendering cause or final-raster equivalence is inferred.',
        prove: (entry, reference, candidate) => {
          const key = `${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
          const proof = one(control.differences.filter(p => p.case === key && p.family === 'tabs' &&
            p.element === element && p.property === property));
          assert.equal(proof.attribution, 'reviewed-tab-label-typography-input');
          assert.equal(proof.classification, 'application-plugin-authoring-defect');
          assert.equal(proof.source, 'core-control-texture');
          assert.equal(proof.reviewEvidence.sourceFinding, 'fixture-tab-label-typography-flattened');
          const native = one(reference.nodes.filter(n => n.attributes?.id === element));
          const ast = one(candidate.nodes.filter(n => n.authored?.id === element));
          assert.equal(native.type, 'span'); assert.equal(ast.authored.type, 'button');
          assert.equal(ast.authored.role, 'tab');
          assert.equal(proof.referenceNode, native.key); assert.equal(proof.astylarNode, ast.key);
          assert.equal(proof.values.reference, normalize(reference.styles[native.style])[property]);
          for (const [value, stage] of [['normal', 'normalResolvedStyle'], ['effective', 'interactionResolvedStyle']])
            assert.equal(proof.values[value], normalize(ast[stage])[property]);
          return { case: key, element, property, referenceNode: native.key, astylarNode: ast.key,
            sourceAttribution: proof.attribution,
            controlProofSha256: createHash('sha256').update(JSON.stringify(proof)).digest('hex'),
            inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
        },
      });
    }
  }
  return result;
}

export function validateTabScalarTypography(rows, originalRows, cases, inventory, control, normalize) {
  try {
    const select = values => values.filter(r => r.attribution === tabScalarTypographyAttribution);
    assert.deepEqual(select(rows), select(applyTabScalarTypography(originalRows, cases, inventory, control, normalize)));
    return [];
  } catch (error) {
    return [`tab scalar typography does not replay from original cases and validated control proofs: ${error.message}`];
  }
}
