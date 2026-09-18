import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { containerFontStageTargets, inspectContainerFontStages } from './audit-material-container-font-stages.mjs';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = xs => { assert.equal(xs.length, 1, 'unique mapped owner required'); return xs[0]; };
const stack = 'Roboto, Arial, sans-serif';
// Stepper has a component token and is independently classified as unequal
// host authoring. It must not enter an inherited-page-family stage finding.
export const containerFontFamilyTargets = Object.fromEntries(Object.entries(containerFontStageTargets).filter(([, t]) => t.family !== 'stepper'));
const familyAffects = object => Object.keys(object ?? {}).some(k => ['font', 'fontfamily', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const affects = object => familyAffects(object) || Object.keys(object ?? {}).some(k => /^(animation|transition)/i.test(k));

function inspectNonFamilyMotion(rule) {
  const declarations = Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => /^(animation|transition)/i.test(k)));
  assert.deepEqual(Object.keys(declarations).sort(), ['transition-behavior', 'transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function']);
  const property = declarations['transition-property'].value;
  assert.ok(['opacity', 'none'].includes(property), 'unreviewed motion target');
  const none = property === 'none';
  const expected = { 'transition-behavior': 'normal', 'transition-delay': none ? '0s' : declarations['transition-delay'].value,
    'transition-duration': none ? '0s' : '250ms', 'transition-property': property,
    'transition-timing-function': none ? 'ease' : 'cubic-bezier(0.4, 0, 0.6, 1)' };
  assert.ok(['0s', '0ms'].includes(expected['transition-delay']));
  for (const [key, value] of Object.entries(expected)) assert.deepEqual(declarations[key], { value, important: none });
  const shorthand = rule.cssText.split(';').map(s => s.trim()).filter(s => /^(transition|animation)/i.test(s));
  assert.deepEqual(shorthand, [none ? 'transition: none !important' : 'transition: opacity 250ms cubic-bezier(0.4, 0, 0.6, 1)']);
  return { rule, disposition: 'literal-captured-transition-target-excludes-font-family', resolvedMotionVerified: false };
}

export function inspectContainerFontFamily(family, input, reference, candidate) {
  assert.ok(Object.hasOwn(containerFontFamilyTargets, input.id));
  const identity = inspectContainerFontStages(family, input, reference, candidate);
  const rpath = identity.referencePath.map(n => one(reference.nodes.filter(x => x.key === n.key)));
  const apath = identity.candidatePath.map(n => one(candidate.nodes.filter(x => x.key === n.key)));
  const referencePath = rpath.map((node, index) => {
    assert.equal(affects(node.inline), false);
    assert.equal(/(?:^|;)\s*(?:font|font-family|all|animation[^:]*|transition[^:]*)\s*:/i.test(node.attributes?.style ?? ''), false);
    const relevantRequests = node.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affects(rule.declarations));
    const requests = relevantRequests.filter(rule => familyAffects(rule.declarations));
    const nonFamilyMotionRequests = relevantRequests.filter(rule => Object.keys(rule.declarations).some(k => /^(animation|transition)/i.test(k))).map(inspectNonFamilyMotion);
    const page = index === rpath.length - 1;
    if (page) {
      assert.equal(requests.length, 1); assert.match(requests[0].selector, /^\.frame(?:\[_ngcontent-[\w-]+\])?$/);
      assert.deepEqual(requests[0].declarations['font-family'], { value: stack, important: false });
      assert.deepEqual(Object.keys(requests[0].declarations).filter(k => affects({ [k]: true })), ['font-family']);
    } else assert.equal(requests.length, 0, `${input.id}/${node.key}: reference family inheritance is interrupted: ${JSON.stringify(requests.map(r => ({ selector: r.selector, relevant: Object.keys(r.declarations).filter(k => affects({ [k]: true })) })))}`);
    assert.equal(reference.styles[node.style].fontFamily, stack);
    return { key: node.key, parent: node.parent, type: node.type, computedFontFamily: stack, requests, relevantRequests, nonFamilyMotionRequests };
  });
  const rules = candidate.rules.filter(affects);
  const candidatePath = apath.map((node, index) => {
    const requests = rules.filter(rule => {
      if (['.material-table th', '.material-table td'].includes(rule.selector) && !['th', 'td'].includes(node.authored.type)) return false;
      return selectorCanApply(rule.selector, node.authored);
    });
    const page = index === apath.length - 1;
    if (page) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, '#page'); assert.equal(requests[0].fontFamily, stack);
      assert.deepEqual(Object.keys(requests[0]).filter(k => affects({ [k]: true })), ['fontFamily']);
    } else assert.equal(requests.length, 0, 'candidate family request or unknown selector');
    const values = {};
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      assert.equal(node[stage].fontFamily, page ? stack : undefined);
      assert.deepEqual(Object.keys(node[stage]).filter(k => affects({ [k]: true })), page ? ['fontFamily'] : []);
      values[stage] = node[stage].fontFamily ?? '<omitted>';
    }
    return { key: node.key, parent: node.parent, authored: node.authored, values, requests };
  });
  assert.equal(input.reference.fontFamily, stack);
  assert.deepEqual(input.referenceAuthored.filter(r => affects(r.declarations)).map(r => ({ selector: r.selector, declarations: r.declarations })),
    referencePath[0].relevantRequests.map(r => ({ selector: r.selector, declarations: r.declarations })));
  assert.equal(input.astylarAuthored.filter(r => affects(r.declarations)).length, 0);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].fontFamily, undefined);
  return { property: 'fontFamily', referencePath, candidatePath,
    referenceOwnText: '', candidateOwnText: '<omitted>', referenceComputedFontFamily: stack, candidateLocalFontFamily: '<omitted>',
    candidateRelevantRules: rules.map(rule => ({ selector: rule.selector, sha256: digest(rule) })),
    classification: 'parity-harness-defect', attribution: 'container-computed-inheritance-versus-local-font-family-stage',
    owner: 'Material audit computed inheritance versus local-declaration measurement boundary',
    authoredFamilyInheritanceMatches: true, computedCandidateVerified: false, wholeElementInputEquivalent: false,
    rendererCauseProven: false, renderingEquivalent: false, descendantTypographyVerified: false,
    limitation: 'Mapped own-text-empty owners inherit the same authored page font stack without captured local family/reset requests. The progress controls retain literal opacity/none transition requests separately, not inferred resolved motion. The scalar compares browser computed inheritance with omitted candidate local declarations. No candidate computed font, physical font selection, descendant/plugin typography, layout or raster is synthesized or established.' };
}

export function collectContainerFontFamily() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = d => { const f = realpathSync(d.file); assert.ok(f.startsWith(boundary)); const bytes = readFileSync(f); assert.equal(hash(bytes), d.sha256); return JSON.parse(bytes); };
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${mode}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    const inputs = e.styleInputs.filter(i => Object.hasOwn(containerFontFamilyTargets, i.id)); if (!inputs.length) continue;
    const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    for (const input of inputs) findings.push({ case: caseId, family: e.family, element: input.id, profile: e.profile,
      viewport: e.viewport, state: e.state ?? 'static', originalInputSha256: digest(input), inputTrees: e.inputTrees,
      proof: inspectContainerFontFamily(e.family, input, r, a) });
  }
  assert.equal(seen.size, 2311);
  const counts = Object.fromEntries(Object.keys(containerFontFamilyTargets).map(id => [id, findings.filter(f => f.element === id).length]));
  assert.equal(Object.keys(counts).length, 20); assert.ok(Object.values(counts).every(n => n > 0)); assert.equal(findings.length, 1082);
  return { schemaVersion: 1, kind: 'original-container-font-family-stage-inputs', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, observations: findings.length, counts, findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);
const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };

export function planContainerFontFamily(proof, original, rows, normalize) {
  for (const flag of ['canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent', 'renderingEquivalent']) assert.equal(proof[flag], false);
  assert.equal(proof.observations, proof.findings.length);
  const byOwner = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f])); assert.equal(byOwner.size, proof.findings.length);
  const groups = new Map(), seen = new Set(), cases = new Set();
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${mode}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!cases.has(caseId)); cases.add(caseId);
    for (const input of e.styleInputs.filter(i => Object.hasOwn(containerFontFamilyTargets, i.id))) {
      const key = JSON.stringify([caseId, input.id]), f = byOwner.get(key); assert.ok(f); assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(f.family, e.family); assert.equal(f.profile, e.profile); assert.equal(f.state, e.state ?? 'static');
      assert.deepEqual(f.viewport, e.viewport); assert.deepEqual(f.inputTrees, e.inputTrees); assert.equal(f.originalInputSha256, digest(input));
      const p = f.proof; assert.equal(p.property, 'fontFamily'); assert.equal(p.classification, 'parity-harness-defect');
      assert.equal(p.attribution, 'container-computed-inheritance-versus-local-font-family-stage');
      assert.equal(p.authoredFamilyInheritanceMatches, true); assert.equal(p.candidateLocalFontFamily, '<omitted>');
      for (const flag of ['computedCandidateVerified', 'wholeElementInputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'descendantTypographyVerified']) assert.equal(p[flag], false);
      assert.equal(p.referenceComputedFontFamily, input.reference.fontFamily);
      const reference = normalize(input.reference).fontFamily, candidate = normalize(input.astylar).fontFamily;
      assert.equal(reference, 'roboto,arial,sans-serif'); assert.equal(candidate, undefined);
      const row = { family: e.family, element: input.id, property: 'fontFamily', reference }, sig = signature(row);
      if (!groups.has(sig)) groups.set(sig, { ...row, occurrences: 0, cases: [], states: [], observations: [] });
      const group = groups.get(sig); group.occurrences++;
      if (group.cases.length < 12) group.cases.push(caseId);
      if (!group.states.includes(f.state)) group.states.push(f.state);
      group.observations.push({ case: caseId, inputSha256: f.originalInputSha256, inputTrees: f.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(cases.size, proof.originalCasesScanned); assert.equal(seen.size, proof.observations);
  assert.deepEqual(Object.fromEntries(Object.keys(containerFontFamilyTargets).map(id => [id, proof.findings.filter(f => f.element === id).length])), proof.counts);
  const selected = new Set(), proposed = [];
  for (const [sig, group] of groups) {
    const row = one(rows.filter(r => signature(r) === sig)); assert.equal(row.attribution, 'unresolved');
    for (const k of ['occurrences', 'cases', 'states']) assert.deepEqual(row[k], group[k]);
    assert.ok(!selected.has(row)); selected.add(row);
    proposed.push({ ...group, canonicalRowSha256: digest(row), proposedClassification: 'parity-harness-defect',
      proposedAttribution: 'reviewed-container-font-family-declaration-stage', inputEquivalent: false, computedCandidateVerified: false,
      rendererCauseProven: false, renderingEquivalent: false });
  }
  return { canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    originalCasesScanned: cases.size, proposedGroups: groups.size, proposedObservations: seen.size,
    otherCompleteRows: rows.length - selected.size, otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    proposed, canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectContainerFontFamilyPlan() {
  const file = 'docs/material-container-font-family-stages.json', bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectContainerFontFamily(); assert.equal(bytes, JSON.stringify(proof, null, 2) + '\n');
  const original = (() => {
    const bytes = readFileSync(proof.originalCapture.file); assert.equal(hash(bytes), proof.originalCapture.sha256);
    const parsed = JSON.parse(bytes), project = entries => entries.map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees, styleInputs: e.styleInputs.filter(i => Object.hasOwn(containerFontFamilyTargets, i.id)) }));
    return { results: project(parsed.results), interactions: project(parsed.interactions) };
  })();
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const { manifest, rows } = await readCaretConservationRows(file => execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const result = planContainerFontFamily(proof, original, rows, normalize);
  assert.equal(result.proposedGroups, 20); assert.equal(result.proposedObservations, 1082);
  return { schemaVersion: 1, kind: 'container-font-family-proposed-attribution', canonicalRevision, canonicalPayload: manifest,
    proof: { file, sha256: hash(bytes) }, productionNormalization: normalization, ...result };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(args.every(a => ['--check', '--plan'].includes(a))); assert.equal(new Set(args).size, args.length);
  const plan = args.includes('--plan'), report = plan ? await collectContainerFontFamilyPlan() : collectContainerFontFamily();
  const file = plan ? 'docs/material-container-font-family-attribution-plan.json' : 'docs/material-container-font-family-stages.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, proposedGroups: report.proposedGroups,
    proposedObservations: report.proposedObservations, otherCompleteRows: report.otherCompleteRows,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
