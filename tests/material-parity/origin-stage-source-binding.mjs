import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectTransformOriginDeclarationStage } from './transform-origin-stage-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport?.id}${e.state ? '/' + e.state : ''}`;
const casesOf = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, entries]) => entries.map(e => ({ ...e, kind,
    styleInputs: (e.styleInputs ?? []).filter(i => i.reference?.transformOrigin !== undefined && i.astylar?.transformOrigin === undefined) }))
    .filter(e => e.styleInputs.length));
const captureOf = e => ({ kind: e.kind, family: e.family, profile: e.profile, viewport: { id: e.viewport?.id },
  ...(e.state ? { state: e.state } : {}), styleInputs: e.styleInputs });
const safePath = (root, file) => {
  const full = path.resolve(root, file), allowed = path.resolve(root, 'artifacts/material-parity') + path.sep;
  if (!full.startsWith(allowed)) throw new Error('origin evidence path is outside Material artifacts');
  return full;
};

export function bindOriginStageSource(report, { root = process.cwd(), parityPath } = {}) {
  if (!parityPath) return { status: 'unbound', reason: 'No original parity report path supplied; no source-bound origin attribution.' };
  try {
    const full = safePath(root, parityPath), bytes = readFileSync(full), original = JSON.parse(bytes);
    const project = r => casesOf(r).map(e => ({ ...captureOf(e), inputTrees: e.inputTrees }));
    if (!isDeepStrictEqual(project(original), project(report))) throw new Error('supplied origin cases or tree references differ from original capture');
    return { status: 'bound', file: path.relative(root, full).replaceAll('\\', '/'), sha256: hash(bytes),
      observations: casesOf(original).reduce((n, e) => n + e.styleInputs.length, 0) };
  } catch (error) { return { status: 'invalid', error: String(error) }; }
}

// Independent source replay binds BOTH completeness and the declarations used by
// the proof. Matching a report against its own retained captures is insufficient.
// Pooled reference rule indices may differ; all other proof fields must match.
export function validateOriginStageSource(binding, evidence, { root = process.cwd(), canonicalStyle = s => s, reviewedDisjointMotion = false } = {}) {
  const errors = [];
  if (binding?.status !== 'bound') return ['origin stage evidence lacks original capture binding'];
  if (evidence?.reviewedDisjointMotion !== (reviewedDisjointMotion ? true : undefined))
    return ['origin motion review mode differs from required source replay mode'];
  try {
    const bytes = readFileSync(safePath(root, binding.file));
    if (hash(bytes) !== binding.sha256) throw new Error('original origin capture digest changed');
    const cases = casesOf(JSON.parse(bytes)), captures = cases.map(captureOf);
    if (!isDeepStrictEqual(captures, evidence?.captures)) throw new Error('origin case/scalar coverage differs from original capture');
    if (binding.observations !== cases.reduce((n, e) => n + e.styleInputs.length, 0)) throw new Error('origin source observation count changed');
    const comparable = o => ({ ...o, ...(o.referencePath ? {
      referencePath: o.referencePath.map(({ ruleIndices, ...node }) => node),
    } : {}) });
    let index = 0;
    for (const entry of cases) {
      const trees = {};
      for (const side of ['reference', 'astylar']) {
        const ref = entry.inputTrees?.[side];
        if (!ref?.file || !ref.sha256) throw new Error('original case lacks source tree references');
        const treeBytes = readFileSync(safePath(root, ref.file));
        if (hash(treeBytes) !== ref.sha256) throw new Error('original origin tree digest changed');
        trees[side] = JSON.parse(treeBytes);
      }
      for (const input of entry.styleInputs) {
        const proof = { case: keyOf(entry), family: entry.family, element: input.id, property: 'transformOrigin',
          comparisonOrigin: canonicalStyle({ transformOrigin: input.reference.transformOrigin }).transformOrigin,
          ...inspectTransformOriginDeclarationStage(entry, trees.reference, trees.astylar, input, { reviewedDisjointMotion }) };
        if (!isDeepStrictEqual(comparable(proof), comparable(evidence.observations?.[index] ?? {})))
          throw new Error(`origin proof differs from original source at ${keyOf(entry)}#${input.id}`);
        index++;
      }
    }
    if (evidence.observations.length !== index) throw new Error('origin source observation coverage changed');
  } catch (error) { errors.push(String(error)); }
  return errors;
}
