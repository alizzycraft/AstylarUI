import { isDeepStrictEqual } from 'node:util';
import { resolveGeneratedReferenceNode, mappingTargets } from './generated-node-mapping-evidence.mjs';
import { reviewedTemplateTextMappings } from './input-equivalence-audit.mjs';
import { readFileSync } from 'node:fs';

// Read the frozen harness declaration without importing its executable runner.
const propertySource = readFileSync(new URL('./run-material-parity.mjs', import.meta.url), 'utf8')
  .match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
if (!propertySource || !/^(?:\s|'[A-Za-z]+'|,)+$/.test(propertySource)) throw new Error('Unknown scalar property declaration');
const materialStyleInputProperties = [...propertySource.matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
if (materialStyleInputProperties.length !== 89 || new Set(materialStyleInputProperties).size !== 89)
  throw new Error('Frozen scalar schema changed');

const one = list => list.length === 1 ? list[0] : undefined;
const cls = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);
const children = (tree, node) => tree.nodes.filter(n => n.parent === node?.key);
const byKey = (tree, key) => one(tree.nodes.filter(n => n.key === key));
const byId = (tree, id, candidate = false) => one(tree.nodes.filter(n => (candidate ? n.authored : n.attributes)?.id === id));
const ancestry = (tree, leaf) => {
  const path = [], seen = new Set();
  for (let n = leaf; n; n = n.parent === null ? undefined : byKey(tree, n.parent)) {
    if (seen.has(n.key)) return; seen.add(n.key); path.push(n);
    if (n.parent === null) return path;
  }
};

// Measurement identity only. Reuse structural proofs, then compare every raw
// scalar with the independently captured node. This does not equate inputs.
export function resolveOriginAliasPair(entry, reference, candidate, input) {
  const reject = reason => ({ status: 'unresolved', reason });
  const id = input?.id;
  if (!id || ![reference, candidate].every(t => t?.schemaVersion === 1 && Array.isArray(t.nodes) &&
      Array.isArray(t.rules) && Array.isArray(t.errors) && t.errors.length === 0 && new Set(t.nodes.map(n => n.key)).size === t.nodes.length) ||
      reference.nodes.some(n => n.attributes?.id === id)) return reject('invalid trees or direct ID shadows alias');
  const ast = byId(candidate, id, true);
  if (!ast || candidate.resolvedStyleEvidenceVersion !== 2 || candidate.resolvedStyleSource !== 'core-style-inspection' ||
      !Number.isInteger(candidate.resolvedStyleRevision) || candidate.resolvedStyleRevision < 0 ||
      input.astylarResolvedStyleEvidenceVersion !== 2) return reject('candidate identity or stage provenance missing');
  let ref, method, evidence;
  if (mappingTargets[id]) {
    evidence = resolveGeneratedReferenceNode(reference, id, entry.family);
    if (evidence.status !== 'mapped') return reject(evidence.reason);
    ref = byKey(reference, evidence.node.key); method = 'existing-generated-owner-proof';
  } else if (entry.family === 'paginator' && ['paginator-size', 'paginator-range'].includes(id)) {
    evidence = one(reviewedTemplateTextMappings(entry.family, reference, candidate).filter(m => m.element === id));
    ref = evidence && byKey(reference, evidence.referenceNode); method = 'existing-paginator-text-owner-proof';
  } else if (entry.family === 'dialog' && ['dialog-panel', 'dialog-title', 'dialog-copy', 'dialog-actions', 'dialog-cancel', 'dialog-save'].includes(id)) {
    const title = one(reviewedTemplateTextMappings('dialog', reference, candidate).filter(m => m.element === 'dialog-title-label'));
    evidence = title?.reviewEvidence;
    if (evidence) {
      ref = id === 'dialog-panel' ? evidence.referencePath[1] : id === 'dialog-title' ? evidence.referenceTitle :
        id === 'dialog-copy' ? evidence.referenceCopy : one(evidence.referenceActions.filter(n => n.attributes?.['data-parity-id'] === id));
    }
    method = 'existing-dialog-full-structure-proof';
  } else if (entry.family === 'bottom-sheet' && ['bottom-sheet-panel', 'bottom-sheet-dismiss', 'bottom-sheet-copy'].includes(id)) {
    evidence = resolveGeneratedReferenceNode(reference, 'bottom-sheet-overlay', entry.family);
    const owner = evidence.status === 'mapped' && one(evidence.owners.filter(n => n.type === 'mat-bottom-sheet-container'));
    const panel = owner && byKey(reference, owner.key);
    const list = panel && one(children(reference, panel));
    const items = list && children(reference, list);
    if (!panel || !cls(panel, 'mat-bottom-sheet-container') || list?.type !== 'mat-nav-list' || items.length !== 2 ||
        items.some(n => n.type !== 'a' || !cls(n, 'mat-mdc-list-item') || n.attributes.href !== '#')) return reject('bottom-sheet owner/list/order not established');
    ref = id === 'bottom-sheet-panel' ? panel : items[id === 'bottom-sheet-dismiss' ? 0 : 1];
    method = 'existing-overlay-owner-and-exact-list-order';
  } else if ((entry.family === 'slider' && id === 'slider-visual') || (entry.family === 'tabs' && id === 'tab-panel')) {
    ref = one(reference.nodes.filter(n => n.attributes?.['data-parity-id'] === id));
    if (entry.family === 'slider') {
      const start = byId(reference, 'slider-start'), end = byId(reference, 'slider-primary');
      if (ref?.type !== 'mat-slider' || !cls(ref, 'mat-mdc-slider') || start?.type !== 'input' || end?.type !== 'input' ||
          start.parent !== ref.key || end.parent !== ref.key || !Object.hasOwn(start.attributes, 'matsliderstartthumb') ||
          !Object.hasOwn(end.attributes, 'matsliderendthumb')) return reject('slider parity target and thumb ownership not established');
    } else {
      const path = ref && ancestry(reference, ref), host = path && one(path.filter(n => n.type === 'mat-tab-group'));
      const panel = path && one(path.filter(n => n.attributes?.role === 'tabpanel'));
      if (ref?.type !== 'span' || !host || !panel || !cls(panel, 'mat-mdc-tab-body-active')) return reject('active tab parity target not established');
    }
    method = 'unique-parity-attribute-with-component-ownership';
  } else return reject('unreviewed origin alias');
  if (!ref || !ancestry(reference, ref) || !ancestry(candidate, ast)) return reject('reviewed mapping or ancestry missing');
  // Keep the exact frozen 89-field observation contract, not a one-property match.
  const style = reference.styles?.[ref.style];
  if (!style || !input.reference || Object.keys(input.reference).length !== 89 ||
      !isDeepStrictEqual(Object.keys(input.reference).sort(), [...materialStyleInputProperties].sort()) ||
      Object.entries(input.reference).some(([k, v]) => style[k] !== v)) return reject('reference scalar/node styles differ');
  if (input.referenceStructure?.schemaVersion !== 2 || input.referenceStructure.type !== ref.type ||
      input.astylarStructure?.schemaVersion !== 2 || input.astylarStructure.type !== ast.authored.type) return reject('scalar/node types differ');
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    if (!input[scalar] || !ast[stage] || !isDeepStrictEqual(input[scalar], ast[stage])) return reject('candidate scalar/node stages differ');
  }
  const expected = ref.rules.map(i => reference.rules[i]).filter(r => r.active === true)
    .map(r => ({ selector: r.selector, declarations: r.declarations }));
  if (Object.keys(ref.inline ?? {}).length) expected.push({ selector: '<inline>', declarations: ref.inline });
  const actual = input.referenceAuthored?.map(r => ({ selector: r.selector, declarations: r.declarations }));
  const missingRules = expected.filter(r => !actual?.some(a => isDeepStrictEqual(a, r)));
  const extraRules = actual?.filter(r => !expected.some(a => isDeepStrictEqual(a, r))) ?? [];
  const rulesMatch = isDeepStrictEqual(expected, actual);
  return { status: rulesMatch ? 'mapped' : 'mapped-with-scalar-rule-gap', method,
    referenceNode: ref.key, candidateNode: ast.key, referenceType: ref.type, candidateType: ast.authored.type,
    checkedReferenceProperties: Object.keys(input.reference).length, referenceOrigin: style.transformOrigin,
    candidateOrigin: ast.resolvedStyle.transformOrigin ?? '<omitted>', missingRules, extraRules,
    referencePath: ancestry(reference, ref).map(n => n.key), candidatePath: ancestry(candidate, ast).map(n => n.key),
    inputEquivalent: false, computedCandidateOriginVerified: false,
    claim: 'Captured measurement identity and scalar/node consistency only. Rule gaps remain explicit; no style, structure, origin or output equivalence inferred.' };
}
