import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = object => hash(JSON.stringify(object));
const properties = ['textAlign', 'direction', 'unicodeBidi', 'writingMode'];
const cssProperty = property => property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
const expectedGap = [{ selector: '.cdk-global-overlay-wrapper',
  declarations: { 'z-index': { value: '1000', important: false } } }];
const flags = { candidateComputedVerified: false, inputEquivalent: false,
  renderingEquivalent: false, rendererCauseProven: false, canonicalAttributionChanged: false };

// Recover measurement context only. The unrelated, explicitly retained rule
// gap must neither erase valid owner ancestry nor become an equivalence waiver.
export function recoverOverlayAlignment(record, identity, traces) {
  assert.ok(['bottom-sheet', 'snack-bar'].includes(record.family));
  assert.equal(record.candidateReplayed, false); assert.equal(record.renderingEquivalent, false);
  assert.equal(identity.status, 'mapped-with-scalar-rule-gap');
  assert.equal(identity.method, 'existing-generated-owner-proof');
  assert.equal(identity.checkedReferenceProperties, 89); assert.equal(identity.inputEquivalent, false);
  assert.deepEqual(identity.missingRules, expectedGap); assert.deepEqual(identity.extraRules, []);
  assert.deepEqual(Object.keys(traces), properties);
  for (const property of properties) {
    const trace = traces[property];
    assert.equal(trace.property, property);
    assert.deepEqual(trace.referencePath.map(n => n.node), identity.referencePath);
    assert.deepEqual(trace.candidatePath.map(n => n.node), identity.candidatePath);
    assert.deepEqual(trace.ruleGaps, { missing: expectedGap, extra: [] });
    for (const key of ['candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent'])
      assert.equal(trace[key], false);
  }
  const context = record.context;
  assert.equal(context.schemaVersion, 1);
  assert.equal(context.kind, 'supplemental-reference-root-ancestor-context');
  assert.deepEqual(context.errors, []);
  const roots = context.roots.filter(r => r.captureKey === identity.referencePath.at(-1));
  assert.equal(roots.length, 1);
  const root = roots[0], nodes = new Map(context.nodes.map(n => [n.key, n]));
  assert.equal(nodes.size, context.nodes.length);
  assert.equal(root.node, root.ancestry[0]);
  assert.equal(new Set(root.ancestry).size, root.ancestry.length);
  const externalReferencePath = root.ancestry.map((key, i) => {
    const n = nodes.get(key); assert.ok(n);
    assert.equal(n.parent, root.ancestry[i + 1] ?? null);
    const computed = Object.fromEntries(properties.map(property => {
      assert.ok(Object.hasOwn(n.computed, cssProperty(property)));
      return [property, n.computed[cssProperty(property)]];
    }));
    return { node: key, parent: n.parent, type: n.type, attributes: n.attributes,
      inline: n.inline, computed };
  });
  assert.equal(externalReferencePath.at(-1).type, 'html');
  for (const property of properties)
    assert.equal(traces[property].referencePath.at(-1).computed, externalReferencePath[0].computed[property]);
  return { identity, traces, externalReferencePath,
    externalStylesheets: context.sheets.map((sheet, index) => ({ index,
      sha256: digest(sheet), ruleCount: sheet.rules.length })),
    status: 'owner-paths-recovered-with-retained-rule-gap',
    originalExternalAncestryCaptured: false, referenceExternalAncestryReplayed: true,
    externalStylesheetApplicabilityResolved: false, candidateInheritanceResolved: false,
    captureGapExplainsAlignment: false, captureGapExplainsMissingOverlay: false,
    ...flags };
}

export async function collectOverlayAlignmentRecovery({ root = process.cwd() } = {}) {
  const reportFile = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
  const rootPath = path.resolve(root), boundary = realpathSync(path.join(rootPath, 'artifacts/material-parity'));
  const read = file => readFileSync(path.resolve(rootPath, file));
  const bound = descriptor => {
    const absolute = realpathSync(path.resolve(rootPath, descriptor.file));
    const relative = path.relative(boundary, absolute);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    const bytes = readFileSync(absolute); assert.equal(hash(bytes), descriptor.sha256);
    return JSON.parse(bytes);
  };
  // Replay the original verifier from its evidence worktree, with its exact raw
  // source receipts. Do not rewrite historical receipts for a different checkout.
  const fromRoot = file => import(pathToFileURL(path.join(rootPath, file)).href);
  const { collectOriginalOverlayContextSurvey } = await fromRoot('tests/material-parity/original-overlay-context-survey.mjs');
  const { resolveOriginAliasPair } = await fromRoot('tests/material-parity/origin-alias-mapping-evidence.mjs');
  const { inspectOverlayOwnerDeclarations } = await fromRoot('tests/material-parity/overlay-owner-declaration-review.mjs');
  const verification = collectOriginalOverlayContextSurvey(reportFile, { root: rootPath });
  assert.equal(verification.cases, 91); assert.equal(verification.matchedOriginalOwners, 200);
  const manifestBytes = read(reportFile), manifest = JSON.parse(manifestBytes);
  const selectionFile = 'docs/material-remaining-text-alignment.json', selectionBytes = read(selectionFile);
  const selection = JSON.parse(selectionBytes);
  const selected = selection.groups.filter(g => ['bottom-sheet-overlay', 'snack-bar-overlay'].includes(g.element));
  assert.equal(selected.length, 2);
  const descriptors = new Map(manifest.results.map(d => [d.case, d]));
  assert.equal(descriptors.size, manifest.results.length);
  const findings = [], patterns = [], indexes = new Map();
  for (const group of selected) {
    assert.equal(group.observations.length, group.element === 'bottom-sheet-overlay' ? 25 : 34);
    assert.equal(group.property, 'textAlign');
    for (const observation of group.observations) {
      const descriptor = descriptors.get(observation.case); assert.ok(descriptor);
      const record = bound(descriptor), checkpoint = bound(record.checkpointRecord);
      assert.equal(record.case, observation.case); assert.equal(record.family, group.family);
      assert.equal(checkpoint.sha256, digest(checkpoint.result));
      assert.deepEqual(record.originalInputTrees, observation.inputTrees);
      const input = checkpoint.result.styleInputs.filter(i => i.id === group.element);
      assert.equal(input.length, 1); assert.equal(digest(input[0]), observation.originalInputSha256);
      const reference = bound(record.originalInputTrees.reference), candidate = bound(record.originalInputTrees.astylar);
      const identities = record.proofs.filter(p => p.element === group.element); assert.equal(identities.length, 1);
      const identity = resolveOriginAliasPair(record, reference, candidate, input[0]);
      assert.deepEqual(identity, identities[0].proof);
      const traces = Object.fromEntries(properties.map(property => [property,
        inspectOverlayOwnerDeclarations(property, identity, reference, candidate)]));
      assert.equal(traces.textAlign.referencePath[0].computed, 'start');
      assert.deepEqual(Object.values(traces.textAlign.candidatePath[0].localValues), ['<omitted>', '<omitted>', '<omitted>']);
      const proof = recoverOverlayAlignment(record, identity, traces), sha256 = digest(proof);
      if (!indexes.has(sha256)) { indexes.set(sha256, patterns.length); patterns.push({ sha256, proof }); }
      findings.push({ case: observation.case, family: group.family, element: group.element,
        originalInputSha256: observation.originalInputSha256, inputTrees: observation.inputTrees,
        contextRecord: descriptor, pattern: indexes.get(sha256) });
    }
  }
  assert.equal(findings.length, 59); assert.equal(new Set(findings.map(f => f.case)).size, 59);
  return { schemaVersion: 1, kind: 'overlay-alignment-context-recovery',
    sourceSelection: { file: selectionFile, sha256: hash(selectionBytes) },
    contextCapture: { file: reportFile, sha256: hash(manifestBytes), verifiedCases: verification.cases,
      matchedOwners: verification.matchedOriginalOwners },
    sourceFingerprints: ['tests/material-parity/original-overlay-context-survey.mjs',
      'tests/material-parity/origin-alias-mapping-evidence.mjs',
      'tests/material-parity/overlay-owner-declaration-review.mjs'].map(file => ({ file, sha256: hash(read(file)) })),
    recoverySource: { file: 'scripts/audit-overlay-alignment-recovery.mjs',
      sha256: hash(readFileSync(fileURLToPath(import.meta.url), 'utf8').replaceAll('\r\n', '\n')) },
    groupCount: selected.length, observations: findings.length, patterns, findings, ...flags,
    limits: [
      'Identity and all original scalar values are replayed, not whole-element input equivalence.',
      'The known missing layered z-index rule remains recorded; neither scalar nor canonical evidence is rewritten.',
      'External reference ancestors are a later same-state replay, not previously unrecorded historical observations.',
      'External CSSOM is hash-bound but not resolved here; candidate stages are local declarations, not computed inheritance.',
      'This evidence does not explain missing, clipped, low, blurry or misaligned overlay rendering.',
    ] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  assert.ok(args.every(a => a === '--check' || a.startsWith('--evidence-root=')));
  assert.ok(args.filter(a => a.startsWith('--evidence-root=')).length <= 1);
  const root = args.find(a => a.startsWith('--evidence-root='))?.slice('--evidence-root='.length) ?? process.cwd();
  const report = await collectOverlayAlignmentRecovery({ root }), output = JSON.stringify(report, null, 2) + '\n';
  const target = new URL('../docs/material-overlay-alignment-recovery.json', import.meta.url);
  if (args.includes('--check')) assert.equal(hash(readFileSync(target, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(target, output);
  console.log(JSON.stringify({ groups: report.groupCount, observations: report.observations,
    patterns: report.patterns.length, canonicalAttributionChanged: false, sha256: hash(output) }));
}
