import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { collectFieldHostLayoutInputs, fieldHostLayoutCaseKey } from '../tests/material-parity/field-host-layout-input-evidence.mjs';

const target = 'docs/material-field-host-layout-inputs.json';
const indexFile = 'docs/material-field-host-typography-audit.json';
const historyFile = 'docs/material-field-host-layout-history.json';
const hash = value => createHash('sha256').update(value).digest('hex');
export function loadFieldHostLayoutEvidence() {
  const index = JSON.parse(readFileSync(indexFile)), bytes = readFileSync(index.capture.file);
  assert.equal(hash(bytes), index.capture.sha256, 'original capture changed');
  const raw = JSON.parse(bytes), families = new Set(index.groups.map(g => g.family));
  const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.has(e.family));
  assert.equal(entries.length, 577);
  assert.deepEqual(entries.map(fieldHostLayoutCaseKey).sort(), index.groups.flatMap(g => g.cases).sort());
  const inventory = collectFullTreeInventory(entries);
  return { index, entries, inventory, proofs: collectFieldHostLayoutInputs(inventory, entries) };
}
export function buildFieldHostLayoutReport({ index, proofs }) {
  const groups = new Map();
  for (const proof of proofs) for (const property of proof.properties) {
    const key = JSON.stringify([proof.family, property]);
    if (!groups.has(key)) groups.set(key, { family: proof.family, element: proof.element, ...property, cases: [] });
    groups.get(key).cases.push(proof.case);
  }
  const history = JSON.parse(readFileSync(historyFile));
  assert.equal(history.revisionCount, 102);
  assert.equal(history.currentSource.sha256, hash(readFileSync(history.source, 'utf8').replaceAll('\r\n', '\n')), 'historical endpoint no longer matches working authoring');
  const sourceFiles = [indexFile, historyFile, 'scripts/audit-material-field-host-layout-inputs.mjs',
    'tests/material-parity/field-host-layout-input-evidence.mjs', 'tests/material-parity/field-host-layout-input-evidence.spec.mjs',
    'tests/material-parity/field-host-typography-evidence.mjs', 'tests/material-parity/root-initial-style-evidence.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs',
    'examples/material-showcase/src/app/astylar.component.ts'];
  return { schemaVersion: 1, kind: 'field-host-original-layout-input-survey', capture: index.capture,
    sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    history: { file: historyFile, source: history.source, line: history.currentSource.line, introducedBy: history.introducedBy,
      endpoint: history.endpoint, revisionCount: history.revisionCount, initialDerivationProven: false },
    caseCount: proofs.length, propertyObservations: proofs.reduce((n, p) => n + p.properties.length, 0), groupCount: groups.size,
    measuredCases: proofs.filter(p => p.geometry.status === 'measured-original-static-box').length,
    geometryGapCases: proofs.filter(p => p.geometry.status === 'original-capture-host-geometry-gap').length,
    canonicalIntegration: false, computedCandidateVerified: false, rendererCauseProven: false, inputEquivalent: false,
    groups: [...groups.values()].sort((a, b) => JSON.stringify([a.family, a.property, a.referenceComputed]).localeCompare(JSON.stringify([b.family, b.property, b.referenceComputed])))
      .map(g => ({ ...g, cases: g.cases.sort(), occurrences: g.cases.length })),
    cases: proofs.map(p => ({ case: p.case, family: p.family, element: p.element, source: p.source, revision: p.revision,
      inputTrees: p.inputTrees, geometry: p.geometry, proofSha256: hash(JSON.stringify(p)),
      referenceDirectChildren: p.children.reference.map(n => ({ key: n.key, type: n.type, class: n.attributes.class,
        display: n.computed.display, position: n.computed.position, height: n.computed.height })),
      candidateDirectChildren: p.children.astylar.map(n => ({ key: n.key, type: n.authored.type, id: n.authored.id ?? '<omitted>',
        class: n.authored.class ?? '<omitted>', display: n.comparison.display, position: n.comparison.position, height: n.comparison.height ?? '<omitted>' })),
      referenceParent: { key: p.referencePath[1].key, computed: p.referencePath[1].computed },
      candidateParent: { key: p.candidatePath[1].key, authoredRules: p.candidatePath[1].rules, localStyle: p.candidatePath[1].comparison },
    })).sort((a, b) => a.case.localeCompare(b.case)),
    proofSha256: hash(JSON.stringify(proofs)),
    limits: ['Source-bound authoring differences are not proof of their initial rationale or a renderer root cause.',
      'Same authored width:100% does not prove equal containing blocks, used dimensions, computed candidate values or whole-input equivalence.',
      'A zero-padding border-box may happen to measure like content-box; this does not justify replacing the reference box-model request.',
      'Matching static host geometry does not validate different formatting contexts, fixed-height substitution or absolute child composition.',
      'Flex shrink within the fixed-height candidate parent is a hypothesis for the smaller measured height; no causal equal-input reproduction is claimed.',
      'Interaction host geometry gaps are preserved; descendant typography, clipping, scrolling, hit testing and paint remain independent obligations.',
      'No renderer, plugin, canonical comparison input or canonical discrepancy classification is changed.'] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(a => a === '--check'));
  const report = buildFieldHostLayoutReport(loadFieldHostLayoutEvidence()), output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output, 'field-host layout survey is stale');
  else writeFileSync(target, output);
  console.log(JSON.stringify({ target, cases: report.caseCount, groups: report.groupCount, observations: report.propertyObservations,
    measuredCases: report.measuredCases, geometryGapCases: report.geometryGapCases, canonicalIntegration: false }));
}
