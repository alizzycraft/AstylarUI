import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = nodes => { assert.equal(nodes.length, 1, 'owner must be unique'); return nodes[0]; };
const rid = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];
const affectsSize = value => Object.keys(value ?? {}).some(k => ['font', 'fontsize', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
export const containerFontStageTargets = Object.fromEntries([
  ['badge', 'span', 'span'], ['button-toggle', 'mat-button-toggle-group', 'div'], ['card', 'mat-card', 'div'],
  ['checkbox', 'mat-checkbox', 'div'], ['chips', 'mat-chip-listbox', 'div'], ['divider', 'mat-divider', 'div'],
  ['expansion', 'mat-expansion-panel', 'div'], ['grid-list', 'mat-grid-list', 'div'], ['radio', 'mat-radio-group', 'div'],
  ['sidenav', 'mat-sidenav-container', 'div'], ['slide-toggle', 'mat-slide-toggle', 'div'], ['sort', 'div', 'div'],
  ['stepper', 'mat-stepper', 'div'], ['tabs', 'mat-tab-group', 'div'], ['tree', 'mat-tree', 'div'],
].map(([family, referenceType, candidateType]) => [family + '-primary', { family, referenceType, candidateType }]));
for (const id of ['grid-tile-one', 'grid-tile-two']) containerFontStageTargets[id] =
  { family: 'grid-list', referenceType: 'mat-grid-tile', candidateType: 'div' };
// These mapped visual owners also have no captured own/retained/control text.
// This reviews their CSS font-size observation stage only; image geometry,
// plugin drawing inputs and plugin/core ownership remain separate findings.
for (const [family, id, referenceType, candidateType] of [
  ['icon', 'icon-primary', 'mat-icon', 'img'],
  ['progress-bar', 'progress-bar-primary', 'mat-progress-bar', 'showcase.material:linear-progress'],
  ['progress-spinner', 'progress-spinner-primary', 'mat-progress-spinner', 'showcase.material:circular-progress'],
  ['slider', 'slider-visual', 'mat-slider', 'showcase.material:range-visual'],
]) containerFontStageTargets[id] = { family, referenceType, candidateType };

function ancestry(tree, owner, stop) {
  const result = [], seen = new Set();
  for (let node = owner; ; node = one(tree.nodes.filter(n => n.key === node.parent))) {
    assert.ok(!seen.has(node.key), 'cyclic ancestry'); seen.add(node.key); result.push(node);
    if (stop(node)) return result;
  }
}

export function inspectContainerFontStages(family, input, reference, candidate) {
  const target = containerFontStageTargets[input.id]; assert.ok(target); assert.equal(target.family, family);
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  for (const tree of [reference, candidate]) assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  const r = one(reference.nodes.filter(n => rid(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, target.referenceType); assert.equal(a.authored.type, target.candidateType);
  assert.equal(r.ownText, ''); assert.equal(a.authored.textContent, undefined);
  assert.equal(input.referenceStructure.schemaVersion, 2); assert.equal(input.astylarStructure.schemaVersion, 2);
  assert.equal(input.referenceStructure.type, r.type); assert.equal(input.astylarStructure.type, a.authored.type);
  // The scalar reference structure exposes subtree text, not own text. Use
  // the authenticated full-tree node above for that distinct observation.
  assert.equal(input.referenceStructure.ownText, undefined); assert.equal(input.astylarStructure.ownText, '');
  assert.equal(a.retainedText, undefined); assert.equal(a.paintedControlText, undefined);
  const rp = ancestry(reference, r, n => n.key === 'frame');
  const ap = ancestry(candidate, a, n => n.authored?.id === 'page');
  assert.ok(rp.some(n => rid(n) === family + '-root')); assert.ok(ap.some(n => n.authored?.id === family + '-root'));
  const rf = rp.at(-1), af = ap.at(-1);
  assert.equal(rf.type, 'main'); assert.equal(af.authored.type, 'main');
  const scale = rf.inline['--scale']?.value; assert.ok(['1', '0.9', '1.15'].includes(scale));
  const size = `${16 * Number(scale)}px`;
  const referencePath = rp.map(node => {
    assert.equal(affectsSize(node.inline), false, 'inline size request');
    const requests = node.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affectsSize(rule.declarations));
    if (node === rf) {
      assert.equal(requests.length, 1); assert.equal(requests[0].declarations['font-size']?.value, 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false); assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
    } else assert.equal(requests.length, 0, 'reference size inheritance interrupted');
    assert.equal(reference.styles[node.style].fontSize, size);
    return { key: node.key, parent: node.parent, type: node.type, id: rid(node) ?? null, computedFontSize: size,
      sizeRequests: requests.map(rule => ({ selector: rule.selector, declarations: rule.declarations, source: rule.source })) };
  });
  const sizeRules = candidate.rules.filter(affectsSize);
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')),
    'nested rules require separate review');
  const candidatePath = ap.map(node => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false); assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const possible = sizeRules.filter(rule => {
      // Existing conservative matcher cannot exclude descendant syntax. These
      // two exact captured selectors require a terminal th/td, never a div,
      // span, section or main on the selected paths. Unknown syntax is rejected.
      if (['.material-table th', '.material-table td'].includes(rule.selector) && !['th', 'td'].includes(node.authored.type)) return false;
      return selectorCanApply(rule.selector, node.authored);
    });
    if (node === af) {
      assert.equal(possible.length, 1); assert.equal(possible[0].selector, '#page'); assert.equal(possible[0].fontSize, size);
      assert.equal(Object.hasOwn(possible[0], 'font'), false); assert.equal(Object.hasOwn(possible[0], 'all'), false);
    } else assert.equal(possible.length, 0, `candidate size request on ${node.authored.id}`);
    const values = {};
    for (const stage of stages) {
      assert.equal(Object.hasOwn(node[stage], 'font'), false); assert.equal(Object.hasOwn(node[stage], 'all'), false);
      if (node === af) assert.equal(node[stage].fontSize, size);
      else assert.equal(Object.hasOwn(node[stage], 'fontSize'), false, 'local font size present');
      values[stage] = node[stage].fontSize ?? '<omitted>';
    }
    return { key: node.key, parent: node.parent, authored: node.authored, fontSize: values, possibleSizeRequests: possible };
  });
  assert.equal(input.reference.fontSize, size);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(Object.hasOwn(input[stage], 'fontSize'), false);
  return { referencePath, candidatePath, referenceScale: scale, referenceComputedFontSize: size,
    candidateLocalFontSize: '<omitted>', candidateSizeRuleInventory: sizeRules.map(rule => ({ selector: rule.selector, sha256: digest(rule) })),
    referenceOwnText: r.ownText, candidateOwnText: '<omitted>',
    referenceChildren: reference.nodes.filter(n => n.parent === r.key).map(n => ({ key: n.key, type: n.type })),
    candidateChildren: candidate.nodes.filter(n => n.parent === a.key).map(n => ({ key: n.key, authored: n.authored })),
    classification: 'parity-harness-defect', attribution: 'container-computed-inheritance-versus-local-font-size-stage',
    owner: 'Material input audit computed versus local-declaration measurement boundary',
    authoredSizeInheritanceMatches: true, computedCandidateVerified: false, wholeElementInputEquivalent: false,
    rendererCauseProven: false, renderingEquivalent: false, descendantTypographyVerified: false,
    limitation: 'Only the font-size scalar measurement is explained. Neither selected owner has direct text. The reference computes its inherited size; candidate inspection omits local requests along a path to the same scaled page declaration. No candidate computed size is synthesized. Descendant overrides, em-dependent layout, plugin consumers, other font properties, structure, interaction and raster remain separate.' };
}

export function collectContainerFontStages() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [];
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const target = realpathSync(descriptor.file); assert.ok(target.startsWith(boundary));
    const data = readFileSync(target); assert.equal(hash(data), descriptor.sha256); return JSON.parse(data);
  };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key);
    const selected = entry.styleInputs.filter(i => Object.hasOwn(containerFontStageTargets, i.id));
    if (!selected.length) continue;
    const reference = tree(entry.inputTrees.reference), candidate = tree(entry.inputTrees.astylar);
    for (const input of selected) findings.push({ case: key, family: entry.family, element: input.id, viewport: entry.viewport,
      state: entry.state ?? 'static', originalInputSha256: digest(input), inputTrees: entry.inputTrees,
      proof: inspectContainerFontStages(entry.family, input, reference, candidate) });
  }
  assert.equal(seen.size, 2311);
  const counts = Object.fromEntries(Object.keys(containerFontStageTargets).map(id => [id, findings.filter(f => f.element === id).length]));
  assert.ok(Object.values(counts).every(n => n > 0));
  return { schemaVersion: 1, kind: 'original-own-text-empty-container-font-size-stage-proof',
    originalCapture: { file, sha256 }, originalCasesScanned: seen.size, observations: findings.length, counts, findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

const canonicalRevision = '06e50dbcd3594c5987d63a4ec38e792b87b08dde';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const signature = row => JSON.stringify([row.family, row.element, row.property, row.reference, row.astylar]);

export function planContainerFontStages(proof, original, rows, normalize) {
  assert.equal(proof.canonicalAttributionChanged, false); assert.equal(proof.observations, proof.findings.length);
  const byOwner = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  assert.equal(byOwner.size, proof.findings.length);
  const groups = new Map(), seen = new Set(), caseIds = new Set();
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const caseId = `${mode}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!caseIds.has(caseId)); caseIds.add(caseId);
    for (const input of entry.styleInputs.filter(i => Object.hasOwn(containerFontStageTargets, i.id))) {
      const key = JSON.stringify([caseId, input.id]), finding = byOwner.get(key); assert.ok(finding);
      assert.ok(!seen.has(key)); seen.add(key);
      assert.equal(finding.family, entry.family); assert.equal(finding.state, entry.state ?? 'static');
      assert.equal(finding.originalInputSha256, digest(input));
      assert.deepEqual(finding.viewport, entry.viewport); assert.deepEqual(finding.inputTrees, entry.inputTrees);
      const p = finding.proof, r = normalize(input.reference).fontSize, a = normalize(input.astylar).fontSize;
      assert.equal(a, undefined); assert.equal(r, p.referenceComputedFontSize); assert.equal(typeof r, 'string');
      assert.equal(p.candidateLocalFontSize, '<omitted>'); assert.equal(p.authoredSizeInheritanceMatches, true);
      assert.equal(p.classification, 'parity-harness-defect');
      for (const flag of ['computedCandidateVerified', 'wholeElementInputEquivalent', 'rendererCauseProven', 'renderingEquivalent', 'descendantTypographyVerified'])
        assert.equal(p[flag], false);
      const identity = { family: entry.family, element: input.id, property: 'fontSize', reference: r }, sig = signature(identity);
      if (!groups.has(sig)) groups.set(sig, { ...identity, occurrences: 0, cases: [], states: [], observations: [] });
      const group = groups.get(sig); group.occurrences++;
      if (group.cases.length < 12) group.cases.push(caseId);
      if (!group.states.includes(finding.state)) group.states.push(finding.state);
      group.observations.push({ case: caseId, inputSha256: finding.originalInputSha256, inputTrees: finding.inputTrees, proofSha256: digest(p) });
    }
  }
  assert.equal(caseIds.size, proof.originalCasesScanned); assert.equal(seen.size, proof.observations);
  assert.deepEqual(Object.fromEntries(Object.keys(containerFontStageTargets).map(id =>
    [id, [...groups.values()].filter(g => g.element === id).reduce((n, g) => n + g.occurrences, 0)])), proof.counts);
  const selected = new Set(), findings = [];
  for (const [sig, group] of groups) {
    const row = one(rows.filter(r => signature(r) === sig)); assert.equal(row.attribution, 'unresolved');
    for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], group[field]);
    assert.ok(!selected.has(row)); selected.add(row);
    findings.push({ ...group, canonicalRowSha256: digest(row), proposedClassification: 'parity-harness-defect',
      proposedAttribution: 'reviewed-container-font-size-declaration-stage', computedCandidateVerified: false, renderingEquivalent: false });
  }
  return { originalCasesScanned: caseIds.size, proposedGroups: groups.size, proposedObservations: seen.size,
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size, otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    findings, canonicalAttributionChanged: false, renderingEquivalent: false };
}

export async function collectContainerFontStagePlan() {
  const proofFile = 'docs/material-container-font-stages.json', proofBytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  const proof = collectContainerFontStages(); assert.equal(proofBytes, JSON.stringify(proof, null, 2) + '\n');
  // Authenticate the complete original first, then retain only the case fields
  // and selected input owners that the join actually reads. Keeping the full
  // 117 MB capture object alive beside the historical canonical rows exceeds
  // the bounded heap. Every case remains; unrelated canonical rows are still
  // authenticated and included in the conservation digest below.
  const original = (() => {
    const bytes = readFileSync(proof.originalCapture.file); assert.equal(hash(bytes), proof.originalCapture.sha256);
    const parsed = JSON.parse(bytes);
    const project = entries => entries.map(e => ({ family: e.family, profile: e.profile, viewport: e.viewport,
      ...(e.state ? { state: e.state } : {}), inputTrees: e.inputTrees,
      styleInputs: e.styleInputs.filter(i => Object.hasOwn(containerFontStageTargets, i.id)) }));
    return { results: project(parsed.results), interactions: project(parsed.interactions) };
  })();
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const { manifest, rows } = await readCaretConservationRows(file =>
    execFileSync('git', ['show', `${canonicalRevision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'container-font-size-stage-proposed-canonical-attribution',
    proof: { file: proofFile, sha256: hash(proofBytes) }, originalCapture: proof.originalCapture,
    productionNormalization: normalization, canonicalRevision, canonicalPayload: manifest,
    ...planContainerFontStages(proof, original, rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(args.every(a => ['--check', '--plan'].includes(a))); assert.equal(new Set(args).size, args.length);
  const plan = args.includes('--plan'), report = plan ? await collectContainerFontStagePlan() : collectContainerFontStages();
  const file = plan ? 'docs/material-container-font-stage-plan.json' : 'docs/material-container-font-stages.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    otherCompleteRows: report.otherCompleteRows, baselineUnresolved: report.baselineUnresolved,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
