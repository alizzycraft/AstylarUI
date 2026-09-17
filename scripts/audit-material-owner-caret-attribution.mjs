import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { classifyOwnerCaretInput, ownerCaretAttributions } from '../tests/material-parity/owner-caret-classification.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = object => hash(JSON.stringify(object));
const signature = (family, element, reference) => JSON.stringify([family, element, reference]);
export const ownerCaretAttributionFile = 'docs/material-owner-caret-attribution.json';

export function collectOwnerCaretAttribution() {
  const parentFile = 'docs/material-owner-caret-input-survey.json', parentBytes = readFileSync(parentFile);
  const parent = JSON.parse(parentBytes), revision = '280e86c013c7ba6ed0b3be58e3cd1a60ecadb0bb';
  assert.deepEqual(parent, JSON.parse(execFileSync('git', ['show', `${revision}:${parentFile}`],
    { maxBuffer: 16 * 1024 * 1024 })));
  for (const s of parent.sourceFingerprints)
    assert.equal(hash(readFileSync(s.file, 'utf8').replaceAll('\r\n', '\n')), s.sha256);
  const source = readFileSync(parent.productionNormalization.module, 'utf8');
  const parsed = ts.createSourceFile(parent.productionNormalization.module, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const functions = parent.productionNormalization.functions.map(name => {
    const nodes = parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(parsed);
  }).join('\n');
  assert.equal(hash(functions.replaceAll('\r\n', '\n')), parent.productionNormalization.sha256);
  const canonicalStyle = new Function(functions + '\nreturn canonicalStyle;')();
  const capture = readFileSync(parent.capture.file); assert.equal(hash(capture), parent.capture.sha256);
  const original = JSON.parse(capture), groups = new Map(parent.groups.map(g =>
    [signature(g.family, g.element, g.reference), { group: g, observations: [] }]));
  assert.equal(groups.size, 145); assert.equal(parent.groups.length, 145);
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  const seen = new Set(), selectedCases = [];
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!seen.has(caseId)); seen.add(caseId);
      const owners = new Set(), selected = [];
      for (const input of entry.styleInputs) {
        assert.ok(!owners.has(input.id)); owners.add(input.id);
        const reference = canonicalStyle(input.reference ?? {}).caretColor;
        const candidate = canonicalStyle(input.astylar ?? {}).caretColor;
        if (candidate !== undefined) continue;
        const group = groups.get(signature(entry.family, input.id, reference));
        if (group) selected.push({ input, reference, candidate, record: group });
      }
      if (!selected.length) continue;
      selectedCases.push({ case: caseId, inputTrees: entry.inputTrees });
      const referenceTree = tree(entry.inputTrees.reference), candidateTree = tree(entry.inputTrees.astylar);
      for (const { input, reference, candidate, record } of selected) {
        const proof = inspectOwnerCaretInput(input, referenceTree, candidateTree, { family: entry.family });
        const parentObservation = record.group.observations[record.observations.length];
        assert.ok(parentObservation); assert.equal(parentObservation.case, caseId);
        assert.equal(parentObservation.inputSha256, digest(input));
        assert.equal(parentObservation.proofSha256, digest(proof));
        assert.deepEqual(parentObservation.inputTrees, entry.inputTrees);
        assert.equal(parentObservation.referenceRaw, input.reference.caretColor);
        assert.equal(parentObservation.referenceColorRaw, input.reference.color);
        assert.equal(parentObservation.candidateRaw, '<omitted>'); assert.equal(Object.hasOwn(input.astylar, 'caretColor'), false);
        const observation = { case: caseId, family: entry.family, profile: entry.profile,
          viewport: entry.viewport, state: entry.state ?? 'static', reference, inputSha256: digest(input),
          proofSha256: parentObservation.proofSha256, proof };
        const classification = classifyOwnerCaretInput(input, 'caretColor', reference, candidate, observation);
        record.observations.push({ ...parentObservation,
          classification: classification ?? null,
          disposition: classification ? 'reviewed-observation-stage' : 'requires-specific-review' });
      }
    }
  }
  assert.equal(seen.size, 2311); assert.deepEqual(selectedCases, parent.cases);
  const findings = [...groups.values()].map(({ group, observations }) => {
    assert.equal(observations.length, group.observations.length);
    assert.equal(observations.length, group.canonicalOccurrences);
    const statuses = [...new Set(observations.map(o => o.classification?.attribution ?? 'requires-specific-review'))];
    assert.equal(statuses.length, 1, 'mixed membership must not be summarized as a reviewed group');
    return { family: group.family, element: group.element, property: group.property,
      reference: group.reference, candidate: group.candidate, canonicalRowSha256: group.canonicalRowSha256,
      disposition: statuses[0], observations };
  });
  const counts = Object.fromEntries([...Object.values(ownerCaretAttributions), 'requires-specific-review'].map(status => {
    const xs = findings.filter(g => g.disposition === status);
    return [status, { groups: xs.length, observations: xs.reduce((n, g) => n + g.observations.length, 0) }];
  }));
  assert.deepEqual(counts, {
    [ownerCaretAttributions.local]: { groups: 86, observations: 2358 },
    [ownerCaretAttributions.motion]: { groups: 32, observations: 796 },
    'requires-specific-review': { groups: 27, observations: 896 },
  });
  return { schemaVersion: 1, kind: 'original-owner-caret-attribution-candidate',
    parent: { file: parentFile, sha256: hash(parentBytes), revision }, capture: parent.capture,
    originalCasesScanned: seen.size, selectedCases: selectedCases.length,
    groups: findings.length, observations: findings.reduce((n, g) => n + g.observations.length, 0),
    counts, findings, canonicalIntegration: false, inputEquivalent: false,
    computedCandidateVerified: false, descendantCaretVerified: false, renderingEquivalent: false, rendererCauseProven: false,
    limitation: 'Candidate attribution only, after exact original-case replay. Unequal observation stages do not establish equal input or output. The 27 retained groups, external inheritance and visible caret behavior remain separate review work.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const canonical = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
    'docs/material-input-equivalence-audit.md'];
  const before = canonical.map(file => hash(readFileSync(file)));
  const report = collectOwnerCaretAttribution();
  report.sourceFingerprints = ['scripts/audit-material-owner-caret-attribution.mjs',
    'tests/material-parity/owner-caret-classification.mjs', 'tests/material-parity/owner-caret-input-evidence.mjs',
    'scripts/audit-material-caret-motion-requests.mjs'].map(file =>
      ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) }));
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(ownerCaretAttributionFile, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(ownerCaretAttributionFile, output);
  assert.deepEqual(canonical.map(file => hash(readFileSync(file))), before);
  const { findings, sourceFingerprints, ...summary } = report;
  console.log(JSON.stringify({ ...summary, canonicalUnchanged: true }));
}
