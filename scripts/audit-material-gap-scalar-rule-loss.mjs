import assert from 'node:assert/strict';
import { readGapSurveySource } from '../tests/material-parity/gap-survey-source-replay.mjs';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectOwnerGapInput } from '../tests/material-parity/owner-gap-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const missingRule = { selector: '.cdk-global-overlay-wrapper',
  declarations: { 'z-index': { value: '1000', important: false } } };

export function reviewGapScalarRuleLoss(proof) {
  assert.deepEqual(proof.issues, [{ reason: 'scalar-authored-rule-gap' }]);
  assert.equal(proof.referenceComputed, 'normal'); assert.equal(proof.candidateLocal, '<omitted>');
  assert.equal(proof.mapping, 'existing-generated-owner-proof');
  assert.equal(proof.generatedIdentity.status, 'mapped-with-scalar-rule-gap');
  assert.equal(proof.generatedIdentity.checkedReferenceProperties, 89);
  assert.deepEqual(proof.generatedIdentity.missingRules, [missingRule]);
  assert.deepEqual(proof.generatedIdentity.extraRules, []);
  assert.equal(proof.referenceNode, proof.generatedIdentity.referenceNode);
  assert.equal(proof.astylarNode, proof.generatedIdentity.candidateNode);
  assert.deepEqual(proof.requests, { reference: [], astylar: [] });
  assert.deepEqual(proof.candidateStages, { resolvedStyle: {}, normalResolvedStyle: {}, interactionResolvedStyle: {} });
  for (const flag of ['computedCandidateVerified', 'inputEquivalent', 'renderingEquivalent']) assert.equal(proof[flag], false);
  return { classification: 'parity-harness-defect',
    attribution: 'original-overlay-scalar-layer-rule-loss',
    owner: 'tests/material-parity/run-material-parity.mjs matchedAuthoredStyles',
    justification: 'The original generated owner and all 89 scalar values match, but scalar authored capture omits the exact layered z-index rule retained by its paired full tree. Gap values remain browser-computed normal versus missing candidate local fields; neither gap computation nor layout equivalence is inferred.',
    missingRule, inputEquivalent: false, computedCandidateVerified: false,
    usedGapVerified: false, renderingEquivalent: false };
}

function checkControls(proof) {
  const mutations = [
    p => { p.issues = []; }, p => { p.issues.push({ reason: 'relevant-authored-request' }); },
    p => { p.referenceComputed = '0px'; }, p => { p.candidateLocal = '0'; },
    p => { p.generatedIdentity.status = 'mapped'; }, p => { p.generatedIdentity.checkedReferenceProperties = 88; },
    p => { p.generatedIdentity.missingRules = []; },
    p => { p.generatedIdentity.missingRules[0].declarations.gap = { value: '8px', important: false }; },
    p => { p.generatedIdentity.missingRules[0].declarations['z-index'].value = '999'; },
    p => { p.generatedIdentity.extraRules.push(missingRule); },
    p => { p.referenceNode = 'wrong'; }, p => { p.astylarNode = 'wrong'; },
    p => { p.requests.reference.push({ source: '.owner', declarations: { gap: '8px' } }); },
    p => { p.candidateStages.interactionResolvedStyle.gap = '8px'; },
    p => { p.inputEquivalent = true; }, p => { p.computedCandidateVerified = true; },
    p => { p.renderingEquivalent = true; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(proof); mutate(changed);
    assert.throws(() => reviewGapScalarRuleLoss(changed));
  }
  return mutations.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const parentFile = 'docs/material-owner-gap-input-survey.json', parentBytes = readFileSync(parentFile);
  const parent = JSON.parse(parentBytes);
  for (const source of parent.sourceFingerprints) readGapSurveySource(source);
  const rawBytes = readFileSync(parent.capture.file); assert.equal(hash(rawBytes), parent.capture.sha256);
  const raw = JSON.parse(rawBytes), entries = new Map(raw.interactions.map(e =>
    [`interaction:${e.family}@${e.profile}/${e.viewport.id}/${e.state}`, e]));
  assert.equal(entries.size, raw.interactions.length);
  const root = realpathSync('artifacts/material-parity/current-ancestry-audit') + path.sep;
  const tree = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(root));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const before = canonicalFiles.map(file => hash(readFileSync(file)));
  const groups = parent.groups.filter(g => Object.hasOwn(g.reasons, 'scalar-authored-rule-gap'));
  assert.equal(groups.length, 4);
  const findings = [], distinctCases = new Set(); let negativeControls = 0;
  for (const group of groups) {
    assert.deepEqual(Object.keys(group.reasons), ['scalar-authored-rule-gap']);
    assert.deepEqual(group.reasons['scalar-authored-rule-gap'], group.originalCases);
    const digest = createHash('sha256'), observations = [];
    for (const caseId of group.originalCases) {
      const entry = entries.get(caseId); assert.ok(entry); assert.equal(entry.family, group.family);
      const inputs = entry.styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
      const proof = inspectOwnerGapInput(inputs[0], group.property, tree(entry.inputTrees.reference),
        tree(entry.inputTrees.astylar), { family: group.family });
      digest.update(JSON.stringify({ case: caseId, proof }) + '\n');
      const review = reviewGapScalarRuleLoss(proof);
      if (!negativeControls) negativeControls = checkControls(proof);
      observations.push({ case: caseId, inputTrees: entry.inputTrees, proof, review }); distinctCases.add(caseId);
    }
    assert.equal(observations.length, group.canonicalOccurrences);
    assert.equal(digest.digest('hex'), group.proofSha256);
    findings.push({ family: group.family, element: group.element, property: group.property,
      reference: group.reference, candidate: group.candidate, proofSha256: group.proofSha256, observations });
  }
  assert.equal(distinctCases.size, 59);
  const observations = findings.reduce((n, g) => n + g.observations.length, 0); assert.equal(observations, 118);
  const sourceFiles = ['scripts/audit-material-gap-scalar-rule-loss.mjs', 'tests/material-parity/owner-gap-input-evidence.mjs',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/run-material-parity.mjs',
    'tests/material-parity/input-tree-evidence.mjs', 'tests/material-parity/input-tree-evidence.spec.mjs'];
  assert.match(readFileSync(sourceFiles.at(-1), 'utf8'), /captured Material scalar collector skips layer rules that full-tree capture retains/);
  const result = { schemaVersion: 1, kind: 'owner-gap-scalar-layer-rule-loss-review',
    parent: { file: parentFile, sha256: hash(parentBytes) }, capture: parent.capture,
    sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    groups: 4, cases: distinctCases.size, observations, negativeControls, findings,
    canonicalIntegration: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Original gap-group binding to an independently demonstrated scalar layer-rule capture defect only. The original scalar record is not repaired; layer precedence, computed candidate gaps, inherited context, used spacing and rendering are not established.' };
  const output = JSON.stringify(result, null, 2) + '\n', target = 'docs/material-gap-scalar-rule-loss.json';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), before);
  console.log(JSON.stringify({ groups: 4, cases: distinctCases.size, observations, negativeControls, canonicalUnchanged: true }));
}
