import { isDeepStrictEqual } from 'node:util';
import { collectRootColorInputs } from './root-color-input-evidence.mjs';

const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const unsafe = value => !object(value) || Object.keys(value).some(key =>
  ['color', 'all'].includes(key.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(key));

// Reuse the unchanged historical root reader. The extension proves declaration
// ancestry only; callers must bind owners, original scalars and source inventory.
// Keeping this separately imported avoids changing historical collector receipts.
export function extendRootColorAncestry(root, referencePath, candidatePath, canonical) {
  if (!root || root.property !== 'color' || root.classification !== 'parity-harness-defect' ||
      root.computedCandidateVerified !== false || root.finalRasterVerified !== false ||
      root.source !== 'core-style-inspection' || !Number.isInteger(root.revision) || root.revision < 0 ||
      !Array.isArray(referencePath) || !Array.isArray(candidatePath) ||
      referencePath.length <= 2 || candidatePath.length <= 2 ||
      !isDeepStrictEqual(referencePath.slice(0, 2), root.referencePath) ||
      !isDeepStrictEqual(candidatePath.slice(0, 2), root.candidatePath)) return;
  const replay = collectRootColorInputs([{ ...root, property: 'fontFamily' }], canonical);
  if (replay.length !== 1 || !isDeepStrictEqual(replay[0], root)) return;
  const complete = nodes => nodes.every((n, i) => object(n) && typeof n.key === 'string' &&
    n.key.length > 0 && (!i || n.parent === nodes[i - 1].key)) && new Set(nodes.map(n => n.key)).size === nodes.length;
  if (!complete(referencePath) || !complete(candidatePath)) return;
  const safeAttribute = value => value === undefined || typeof value === 'string' &&
    !/[\\/]/.test(value) && !/(?:^|;)\s*(?:color|all|animation[^:]*|transition[^:]*)\s*:/i.test(value);
  if (referencePath.slice(2).some(n => unsafe(n.inline) || !safeAttribute(n.attributes?.style) ||
      !object(n.computed) || canonical(n.computed).color !== root.values.reference ||
      !Array.isArray(n.rules) || n.rules.some(r => !object(r) || typeof r.active !== 'boolean' ||
        !Array.isArray(r.conditions) || unsafe(r.declarations))) ||
      candidatePath.slice(2).some(n => !object(n.authored) ||
        (n.authored.style !== undefined && unsafe(n.authored.style)) || !safeAttribute(n.authored.attributes?.style) ||
        !Array.isArray(n.rules) || n.rules.some(r => !object(r) || unsafe(r.declarations)) ||
        [n.normal, n.comparison, n.effective].some(unsafe))) return;
  return { case: root.case, family: root.family, property: 'color',
    values: structuredClone(root.values), source: root.source, revision: root.revision,
    rootElement: root.element, referencePath: structuredClone(referencePath), candidatePath: structuredClone(candidatePath),
    classification: 'parity-harness-defect', computedCandidateVerified: false, finalRasterVerified: false,
    ownerCorrespondenceVerified: false };
}
