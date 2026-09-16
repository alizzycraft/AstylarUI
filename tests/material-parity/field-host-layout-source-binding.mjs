import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { collectFieldHostLayoutInputs, fieldHostLayoutCaseKey, fieldHostLayoutProperties } from './field-host-layout-input-evidence.mjs';

export const fieldHostLayoutAttribution = 'reviewed-field-host-layout-authoring';
export const fieldHostWidthAttribution = 'reviewed-field-host-width-observation-stage';
const families = new Set(['autocomplete', 'datepicker', 'form-field', 'input', 'select', 'timepicker']);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const jsonHash = value => hash(JSON.stringify(value));
const omitted = '<omitted>';
const select = report => [['static', report.results ?? []], ['interaction', report.interactions ?? []]]
  .flatMap(([kind, rows]) => rows.map(e => ({ kind, family: e.family, profile: e.profile, viewport: e.viewport,
    ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
    styleInputs: families.has(e.family) ? e.styleInputs.filter(i => i.id === `${e.family}-primary`) : [],
    ...(Object.hasOwn(e, 'geometry') ? { geometry: e.geometry } : {}) })));
const read = (root, file) => {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  const resolved = realpathSync(path.resolve(root, file)), relative = path.relative(boundary, resolved);
  assert.ok(relative && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), 'field-host layout source escapes Material artifacts');
  return readFileSync(resolved);
};

// The caller supplies the production tree collector to avoid importing its
// composition module back into this source-bound proof. It must reopen the
// original tree descriptors and verify their digests, not synthesize styles.
export function collectBoundFieldHostLayout(report, { root = process.cwd(), parityPath, collectInventory } = {}) {
  const empty = { schemaVersion: 1, binding: { status: 'unbound' }, captures: [], observations: [], groups: [] };
  if (!parityPath) return empty;
  try {
    const bytes = read(root, parityPath), original = select(JSON.parse(bytes));
    assert.deepEqual(select(report), original, 'field-host layout case/input/geometry population differs from original capture');
    assert.ok(original.length); assert.equal(new Set(original.map(fieldHostLayoutCaseKey)).size, original.length);
    assert.equal(typeof collectInventory, 'function');
    const entries = original.filter(e => families.has(e.family));
    for (const entry of entries) assert.equal(entry.styleInputs.length, 1, 'original field-host owner is missing or ambiguous');
    const proofs = collectFieldHostLayoutInputs(collectInventory(entries, { root }), entries);
    const byCase = new Map(proofs.map(p => [p.case, p]));
    const captures = [], observations = [];
    for (const entry of original) {
      const key = fieldHostLayoutCaseKey(entry), { styleInputs, geometry, ...capture } = entry;
      captures.push({ ...capture, geometryPresent: Object.hasOwn(entry, 'geometry'),
        geometrySha256: Object.hasOwn(entry, 'geometry') ? jsonHash(geometry) : null,
        selectedOwners: styleInputs.map(input => ({ element: input.id, inputSha256: jsonHash(input) })) });
      for (const input of styleInputs) {
        const p = byCase.get(key); assert.ok(p); assert.equal(p.element, input.id);
        assert.equal(p.children.reference.length, 2);
        assert.ok(p.children.reference.every(c => c.computed.position === 'relative'));
        assert.ok(p.children.astylar.every(c => c.comparison.position === 'absolute'));
        observations.push({ case: key, family: entry.family, profile: entry.profile, viewport: entry.viewport,
          state: entry.state ?? 'static', inputSha256: jsonHash(input), proofSha256: jsonHash(p),
          proof: { element: p.element, source: p.source, revision: p.revision,
            referenceNode: p.referencePath[2].key, candidateNode: p.candidatePath[2].key,
            properties: p.properties, geometry: p.geometry,
            referenceChildrenSha256: jsonHash(p.children.reference), candidateChildrenSha256: jsonHash(p.children.astylar),
            inputEquivalent: false, computedCandidateVerified: false, originalRendererCauseProven: false } });
      }
    }
    const groups = new Map();
    for (const o of observations) for (const p of o.proof.properties) {
      const signature = JSON.stringify([o.family, o.proof.element, p.property, p.referenceComputed, p.candidateComparison]);
      if (!groups.has(signature)) groups.set(signature, { family: o.family, element: o.proof.element, ...p, reviewedCases: [], occurrences: 0 });
      const group = groups.get(signature); group.reviewedCases.push(o.case); group.occurrences++;
    }
    return { schemaVersion: 1, binding: { status: 'bound', file: path.relative(root, path.resolve(root, parityPath)).replaceAll('\\', '/'), sha256: hash(bytes) },
      captures, observations, groups: [...groups.values()] };
  } catch (error) { return { ...empty, binding: { status: 'invalid', error: String(error) } }; }
}

export function validateBoundFieldHostLayout(evidence, { root = process.cwd(), collectInventory } = {}) {
  if (evidence?.binding?.status !== 'bound') return ['field-host layout lacks original source binding'];
  try {
    const bytes = read(root, evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
    const replay = collectBoundFieldHostLayout(JSON.parse(bytes), { root, parityPath: evidence.binding.file, collectInventory });
    if (replay.binding.status !== 'bound' || !isDeepStrictEqual(evidence, replay)) return ['field-host layout evidence differs from original source replay'];
  } catch (error) { return [`field-host layout source replay failed: ${error}`]; }
  return [];
}

export function classifyFieldHostLayoutInput(input, property, reference, candidate, observation, canonicalStyle) {
  const p = observation?.proof, v = p?.properties?.find(v => v.property === property);
  if (!p || !v || !fieldHostLayoutProperties.includes(property) || !families.has(observation.family) ||
      input?.id !== `${observation.family}-primary` || p.element !== input.id || observation.inputSha256 !== jsonHash(input) ||
      p.source !== 'core-style-inspection' || !Number.isInteger(p.revision) || p.revision < 0 ||
      !/^(?:static|interaction):/.test(observation.case) || !/^[a-f\d]{64}$/.test(observation.proofSha256) ||
      ['inputEquivalent', 'computedCandidateVerified', 'originalRendererCauseProven'].some(flag => p[flag] !== false) ||
      ['inputEquivalent', 'computedCandidateVerified', 'rendererCauseProven'].some(flag => v[flag] !== false) ||
      v.referenceComputed !== input.reference[property] ||
      v.candidateComparison !== (input.astylar[property] ?? omitted) ||
      v.candidateNormal !== (input.astylarNormalResolvedStyle[property] ?? omitted) ||
      v.candidateEffective !== (input.astylarInteractionResolvedStyle[property] ?? omitted) ||
      canonicalStyle(input.reference)[property] !== reference || canonicalStyle(input.astylar)[property] !== candidate ||
      (property === 'width' ? v.referenceAuthored !== '100%' || v.candidateAuthored !== '100%' || v.classification !== 'harness-instrumentation-defect'
        : v.classification !== 'application-plugin-authoring-defect')) return;
  const width = property === 'width';
  return { classification: width ? 'parity-harness-defect' : 'application-plugin-authoring-defect',
    attribution: width ? fieldHostWidthAttribution : fieldHostLayoutAttribution,
    owner: width ? 'Material input audit computed width versus local percentage stages' : 'Material showcase shared field-shell layout authoring',
    reviewEvidence: { case: observation.case, element: input.id, inputSha256: observation.inputSha256,
      proofSha256: observation.proofSha256, source: p.source, revision: p.revision,
      referenceNode: p.referenceNode, candidateNode: p.candidateNode, ...v,
      geometry: p.geometry, referenceChildrenSha256: p.referenceChildrenSha256, candidateChildrenSha256: p.candidateChildrenSha256,
      wholeElementInputEquivalent: false, originalRendererCauseProven: false },
    justification: width
      ? 'Original reference and candidate both author width:100%, but the scalar report compares browser computed pixels with a retained local percentage. Independently bound source trees and all three candidate stages explain the observation-stage difference without inventing candidate computed values. Containing blocks, formatting contexts, fixed-height/absolute-child composition and used dimensions remain independently unequal or unverified; shared percentage spelling is not whole-input or rendering equivalence.'
      : 'Original Material host rules and candidate field-shell authoring request different layout semantics: reference inline-flex column/min-width:0 with automatic content-box height versus a fixed-height relative border-box block and align-self:flex-start. The reference has in-flow wrappers while candidate children are absolute. Source-bound declarations take precedence over generic zero-versus-omission equivalence. Matching measured static boxes do not validate this substituted composition; interaction geometry gaps remain explicit, and neither original author intent nor original renderer/raster causality is inferred.' };
}

export function validateFieldHostLayoutClassifications(evidence, discrepancies, canonicalStyle, { root = process.cwd() } = {}) {
  try {
    assert.equal(evidence?.binding?.status, 'bound');
    const bytes = read(root, evidence.binding.file); assert.equal(hash(bytes), evidence.binding.sha256);
    const original = select(JSON.parse(bytes)), byOwner = new Map(evidence.observations.map(o => [JSON.stringify([o.case, o.proof.element]), o]));
    assert.equal(byOwner.size, evidence.observations.length);
    const groups = new Map(); let count = 0;
    for (const entry of original) for (const input of entry.styleInputs) {
      const key = fieldHostLayoutCaseKey(entry), o = byOwner.get(JSON.stringify([key, input.id]));
      assert.ok(o); count++;
      assert.deepEqual([o.family, o.profile, o.viewport, o.state], [entry.family, entry.profile, entry.viewport, entry.state ?? 'static']);
      for (const property of fieldHostLayoutProperties) {
        const reference = canonicalStyle(input.reference)[property], candidate = canonicalStyle(input.astylar)[property];
        const c = classifyFieldHostLayoutInput(input, property, reference, candidate, o, canonicalStyle); assert.ok(c);
        const signature = JSON.stringify([entry.family, input.id, property, reference, candidate]);
        if (!groups.has(signature)) groups.set(signature, { family: entry.family, element: input.id, property, reference, astylar: candidate,
          classification: c.classification, attribution: c.attribution, recommendedOwner: c.owner, justification: c.justification,
          reviewEvidence: c.reviewEvidence, reviewedCases: [], occurrences: 0, cases: [], states: [] });
        const row = groups.get(signature); row.reviewedCases.push(key); row.occurrences++;
        if (row.cases.length < 12) row.cases.push(key);
        if (!row.states.includes(o.state)) row.states.push(o.state);
      }
    }
    assert.equal(count, evidence.observations.length);
    const expected = [...groups.values()].sort((a, b) => a.family.localeCompare(b.family) || a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
    const fields = ['family', 'element', 'property', 'reference', 'astylar', 'classification', 'attribution', 'recommendedOwner', 'justification',
      'reviewEvidence', 'reviewedCases', 'occurrences', 'cases', 'states'];
    const actual = discrepancies.filter(r => [fieldHostLayoutAttribution, fieldHostWidthAttribution].includes(r.attribution))
      .map(r => Object.fromEntries(fields.map(k => [k, r[k]])));
    assert.ok(isDeepStrictEqual(actual, expected), 'field-host layout classifications differ from complete original case/property/state coverage');
  } catch (error) { return [`field-host layout classification replay failed: ${error}`]; }
  return [];
}
