import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';

const source = readFileSync(new URL('./run-material-parity.mjs', import.meta.url), 'utf8')
  .match(/const materialStyleInputProperties = Object\.freeze\(\[([\s\S]*?)\]\);/)?.[1];
if (!source || !/^(?:\s|'[A-Za-z]+'|,)+$/.test(source)) throw new Error('Unknown scalar property schema');
const properties = [...source.matchAll(/'([^']+)'/g)].map(m => m[1]).sort();
if (properties.length !== 89 || new Set(properties).size !== 89) throw new Error('Frozen property schema changed');
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const one = list => list.length === 1 ? list[0] : undefined;
const normalized = key => key.replaceAll('-', '').toLowerCase();
const originRequest = key => /^(transformorigin|transformbox|all)$/.test(normalized(key));
const motionRequest = key => /^(animation|transition)/.test(normalized(key));
const inactive = value => value === undefined || typeof value === 'string' && ['none', 'matrix(1,0,0,1,0,0)'].includes(value.replace(/\s/g, ''));
// Opt-in investigation only. These targets do not name transform-origin;
// box/reference-size effects are deliberately NOT claimed equivalent.
const originDisjointTargets = new Set(['none', 'box-shadow', 'border']);
const motionFields = new Set(['transition-property', 'transition-duration', 'transition-delay',
  'transition-timing-function', 'transition-behavior', 'animation-name', 'animation-duration',
  'animation-delay', 'animation-timing-function', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state', 'animation-timeline', 'animation-range-start', 'animation-range-end']);
function reviewOriginMotion(declarations) {
  const requests = [];
  for (const [declarationIndex, declaration] of declarations.entries()) {
    const entries = Object.entries(declaration).filter(([key]) => motionRequest(key));
    if (!entries.length) continue;
    if (entries.some(([key, value]) => !motionFields.has(key) || !object(value) ||
        typeof value.value !== 'string' || typeof value.important !== 'boolean' || !value.value.trim() ||
        /(?:var\(|env\(|inherit|revert|unset|initial|[\\/])/i.test(value.value))) return;
    if (entries.some(([key]) => key.startsWith('transition-')) &&
        !declaration['transition-property']?.value.split(',').every(target => originDisjointTargets.has(target.trim()))) return;
    if (entries.some(([key]) => key.startsWith('animation-')) && declaration['animation-name']?.value !== 'none') return;
    requests.push({ declarationIndex, declarations: Object.fromEntries(entries) });
  }
  return requests.length ? { disposition: 'captured-origin-motion-targets-disjoint', requests,
    animationSettlementVerified: false, indirectEffectsExcluded: false } : undefined;
}
const chain = (tree, leaf) => {
  const path = [], seen = new Set();
  for (let node = leaf; node; node = one(tree.nodes.filter(n => n.key === node.parent))) {
    if (seen.has(node.key)) return; seen.add(node.key); path.unshift(node);
    if (node.parent === null) return path;
  }
};

// Guarded attribution of an observation-stage difference, NEVER equivalence.
// Motion stays unresolved by default; the opt-in review retains its exact requests.
// Explicit origin/reset requests and unproved mapping always stay unresolved.
// No computed candidate origin or reference-box geometry is synthesized here.
export function inspectTransformOriginDeclarationStage(entry, reference, candidate, input, { reviewedDisjointMotion = false } = {}) {
  const unresolved = reason => ({ status: 'unresolved', reason });
  if (!input || ![reference, candidate].every(t => t?.schemaVersion === 1 && Array.isArray(t.nodes) &&
      Array.isArray(t.rules) && Array.isArray(t.errors) && !t.errors.length && new Set(t.nodes.map(n => n.key)).size === t.nodes.length) ||
      !Array.isArray(reference.styles) || input.astylarResolvedStyleEvidenceVersion !== 2 || candidate.resolvedStyleEvidenceVersion !== 2 ||
      candidate.resolvedStyleSource !== 'core-style-inspection' || !Number.isInteger(candidate.resolvedStyleRevision) || candidate.resolvedStyleRevision < 0)
    return unresolved('missing tree or effective-style provenance');
  if (input.reference?.transformOrigin === undefined || input.astylar?.transformOrigin !== undefined ||
      !inactive(input.reference?.transform) || !inactive(input.astylar?.transform)) return unresolved('outside inactive origin-omission population');
  const direct = reference.nodes.filter(n => n.attributes?.id === input.id);
  let ref = one(direct), mapping;
  if (!direct.length) {
    mapping = resolveOriginAliasPair(entry, reference, candidate, input);
    if (mapping.status === 'unresolved') return unresolved('alias mapping: ' + mapping.reason);
    ref = one(reference.nodes.filter(n => n.key === mapping.referenceNode));
  }
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  if (!ref || !ast) return unresolved('ambiguous or missing target identity');
  const refPath = chain(reference, ref), astPath = chain(candidate, ast);
  if (!refPath || !astPath) return unresolved('missing or cyclic ancestry');
  const style = reference.styles[ref.style];
  if (!object(style) || !object(input.reference) || !isDeepStrictEqual(Object.keys(input.reference).sort(), properties) ||
      Object.entries(input.reference).some(([k, v]) => typeof v !== 'string' || style[k] !== v)) return unresolved('reference scalar/tree mismatch');
  if (input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.type !== ref.type || input.astylarStructure.type !== ast.authored.type) return unresolved('scalar/tree type mismatch');
  for (const [key, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    if (!object(input[key]) || !object(ast[stage]) || !isDeepStrictEqual(input[key], ast[stage]) ||
        Object.keys(ast[stage]).some(originRequest)) return unresolved('candidate declaration stage mismatch or explicit origin request');
  }
  const refDeclarations = [], candidateDeclarations = [];
  for (const node of refPath) {
    if (!object(node.inline) || !Array.isArray(node.rules) || node.rules.some(i => !object(reference.rules[i]?.declarations)))
      return unresolved('incomplete reference declaration evidence');
    refDeclarations.push(node.inline, ...node.rules.map(i => reference.rules[i].declarations));
  }
  for (const node of astPath) {
    if (!object(node.authored) || (node.authored.style !== undefined && !object(node.authored.style)))
      return unresolved('unknown candidate inline declaration representation');
    if (Object.keys(node.authored).some(originRequest) || candidate.rules.some(r => !object(r) || typeof r.selector !== 'string'))
      return unresolved('candidate presentation request or incomplete rule evidence');
    candidateDeclarations.push(node.authored.style ?? {}, ...candidate.rules.filter(r =>
      rootInitialSelectorCanApply(r.selector, node.authored)));
  }
  if (refDeclarations.some(d => Object.keys(d).some(originRequest)) ||
      candidateDeclarations.some(d => Object.keys(d).some(originRequest))) return unresolved('explicit origin/reference-box/reset request');
  let motionReview;
  if (refDeclarations.some(d => Object.keys(d).some(motionRequest)) ||
      candidateDeclarations.some(d => Object.keys(d).some(motionRequest))) {
    if (!reviewedDisjointMotion || candidateDeclarations.some(d => Object.keys(d).some(motionRequest)) ||
        !(motionReview = reviewOriginMotion(refDeclarations))) return unresolved('motion declarations require separate state/cascade proof');
  }
  // SVG presentation attributes and origins outside ordinary CSS boxes have a
  // different default contract. Do not infer it from a string that looks like px.
  if (refPath.some(n => ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'text', 'use'].includes(n.type) ||
      Object.keys(n.attributes ?? {}).some(originRequest))) return unresolved('SVG or presentation-origin context');
  if (!/^-?\d+(?:\.\d+)?px -?\d+(?:\.\d+)?px(?: 0px)?$/.test(style.transformOrigin)) return unresolved('non-pixel browser origin representation');
  return { status: 'observed-declaration-stage-gap', classification: 'parity-harness-defect',
    attribution: 'reviewed-origin-declaration-stage', owner: 'input audit browser-used transform origin versus candidate declaration inspection',
    element: input.id, referenceNode: ref.key, candidateNode: ast.key, referenceType: ref.type, candidateType: ast.authored.type,
    referenceOrigin: style.transformOrigin, referenceTransform: style.transform, candidateOrigin: '<omitted>',
    candidateTransform: ast.resolvedStyle.transform ?? '<omitted>', source: candidate.resolvedStyleSource, revision: candidate.resolvedStyleRevision,
    referencePath: refPath.map(n => ({ key: n.key, type: n.type, ruleIndices: n.rules })),
    candidatePath: astPath.map(n => ({ key: n.key, type: n.authored.type ?? '<synthetic-root>' })),
    mapping: mapping ? { status: mapping.status, method: mapping.method, missingRules: mapping.missingRules, extraRules: mapping.extraRules } : { status: 'direct-id' },
    inputEquivalent: false, candidateComputedOriginVerified: false, referenceBoxEqualityVerified: false, finalRasterVerified: false,
    ...(motionReview ? { motionReview } : {}),
    justification: motionReview
      ? 'The exact scalar/tree and candidate declaration stages establish different observation stages. Complete target/ancestor declarations contain no origin, reference-box or reset request; each captured reference motion rule explicitly targets none, box-shadow or border, and any animation metadata explicitly names none in that same rule. No cascade winner, animation settlement, indirect box-size effect, computed candidate origin or rendering equivalence is inferred. Known core origin limitations remain separate obligations.'
      : 'The exact captured scalar and tree agree on browser-used origin pixels while all candidate declaration stages omit the property. Complete captured target/ancestor declarations contain no origin, reference-box, reset or motion request. This attributes a comparison of different observation stages, not missing authored CSS or a computed candidate value. Default/reference-box semantics, known core transform-origin limitations, unrelated rule gaps and rendered output remain separate obligations.' };
}
