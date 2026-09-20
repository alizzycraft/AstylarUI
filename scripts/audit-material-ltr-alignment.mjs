import assert from 'node:assert/strict';
import { conserveAlignmentSurveySnapshot } from '../tests/material-parity/alignment-survey-conservation.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectTextAlignAncestry } from './audit-material-text-align-ancestry.mjs';
import { inspectKeywordReference } from './capture-text-align-keyword-reference.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const target = 'docs/material-ltr-alignment-review.json';
const selected = new Set(['sort-primary', 'stepper-content', 'bottom-sheet-dismiss', 'bottom-sheet-copy']);
const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
export function inspectCapturedLtrAlignment(proof, tree) {
  assert.equal(proof.reference, 'start'); assert.equal(proof.candidate, 'left');
  assert.equal(proof.status, 'explicit-owner-local-versus-browser-computed');
  assert.equal(proof.referenceRequestNodes.length, 0);
  assert.ok(proof.referencePath.length && proof.candidatePath.length);
  const writingModes = [];
  for (const node of proof.referencePath) {
    const original = tree.nodes.find(n => n.key === node.node); assert.ok(original);
    const css = tree.styles[original.style]; assert.ok(css);
    assert.equal(css.textAlign, 'start'); assert.equal(css.direction, 'ltr');
    assert.equal(css.writingMode, 'horizontal-tb'); assert.equal(css.textAlignLast, 'auto');
    assert.equal(node.computed.textAlign, css.textAlign); assert.equal(node.computed.direction, css.direction);
    writingModes.push({ node: node.node, writingMode: css.writingMode, direction: css.direction, textAlignLast: css.textAlignLast });
  }
  assert.deepEqual(Object.keys(proof.candidatePath[0].localValues).sort(),
    ['interactionResolvedStyle', 'normalResolvedStyle', 'resolvedStyle']);
  assert.ok(Object.values(proof.candidatePath[0].localValues).every(value => value === 'left'));
  return { writingModes, capturedRequestedEdgeCorrespondence: true, wholeElementInputEquivalent: false,
    candidateComputedVerified: false, actualPlacementVerified: false, renderingEquivalent: false, rendererCauseProven: false };
}

export function collectLtrAlignmentReview() {
  const planFile = 'docs/material-text-align-canonical-plan.json';
  const planText = readFileSync(planFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(planText, execFileSync('git', ['show', `e3bc804:${planFile}`], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).replaceAll('\r\n', '\n'));
  const plan = JSON.parse(planText), source = collectTextAlignAncestry();
  assert.equal(hash(JSON.stringify(source, null, 2) + '\n'), plan.sourceProof.sha256);
  const logFile = 'artifacts/material-parity/field-host-flow-input-audit/text-align-keyword-reference-v2.log';
  const logBytes = readFileSync(logFile), reference = JSON.parse(logBytes);
  assert.equal(reference.source.sha256, hash(readFileSync(reference.source.file)));
  assert.deepEqual(reference.controls, inspectKeywordReference(reference));
  const byCase = new Map(source.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const groups = plan.retained.filter(g => selected.has(g.element)).map(group => {
    assert.equal(group.previousAttribution, 'unresolved');
    const observations = group.observations.map(o => {
      const f = byCase.get(JSON.stringify([o.case, group.element])); assert.ok(f);
      assert.equal(f.family, group.family); assert.equal(f.originalInputSha256, o.originalInputSha256);
      assert.deepEqual(f.inputTrees, o.inputTrees);
      const pattern = source.patterns[f.pattern]; assert.equal(pattern.sha256, o.proofSha256);
      const file = realpathSync(o.inputTrees.reference.file); assert.ok(file.startsWith(boundary));
      const bytes = readFileSync(file); assert.equal(hash(bytes), o.inputTrees.reference.sha256);
      return { ...o, ...inspectCapturedLtrAlignment(pattern.proof, JSON.parse(bytes)) };
    });
    assert.equal(observations.length, group.occurrences);
    return { ...group, observations, proposedClassification: 'equivalent-representation',
      proposedAttribution: 'reviewed-captured-ltr-alignment-keyword-correspondence',
      recommendedOwner: 'input audit direction-scoped alignment comparison; core logical text alignment remains separate',
      justification: 'Only the alignment-edge request corresponds: every original reference owner/ancestor is horizontal LTR with text-align:start and text-align-last:auto, while candidate owner-local stages explicitly retain left. The browser control confirms the LTR correspondence and rejects its extension to RTL. Structure, inheritance, actual placement, generic logical-keyword support and rendering equivalence are not inferred.',
      inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
  });
  assert.equal(groups.length, 4); assert.equal(groups.reduce((n, g) => n + g.occurrences, 0), 178);
  const history = ['2f44011', '4e58f58^', '4e58f58'].map(ref => {
    const revision = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
    const text = execFileSync('git', ['show', `${revision}:${sourceFile}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
    const selectors = ["selector: '.sort-header'", "selector: '.bottom-sheet-option'", "selector: '#stepper-content'"];
    return { revision, file: sourceFile, sha256: hash(text), declarations: selectors.map(selector => {
      const lines = text.split('\n'), index = lines.findIndex(line => line.includes(selector)); assert.ok(index >= 0);
      return { selector, line: index + 1, source: lines[index].trim() };
    }) };
  });
  assert.ok(history[0].declarations.slice(0, 2).every(d => d.source.includes("textAlign: 'left'")));
  assert.ok(!history[1].declarations[2].source.includes('textAlign'));
  assert.ok(history[2].declarations[2].source.includes("textAlign: 'left'"));
  return conserveAlignmentSurveySnapshot('docs/material-ltr-alignment-review.json', { schemaVersion: 1, kind: 'original-direction-scoped-text-alignment-review',
    sourcePlan: { file: planFile, revision: 'e3bc804', sha256: hash(planText) }, sourceProof: plan.sourceProof,
    originalCapture: source.originalCapture,
    browserControl: { file: logFile, sha256: hash(logBytes), source: reference.source,
      browserVersion: reference.browserVersion, cases: reference.results.length, controls: reference.controls.length },
    sourceFiles: ['scripts/audit-material-ltr-alignment.mjs', sourceFile, 'src/app/services/text/text-style-parser.service.ts']
      .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    groups, groupCount: groups.length, observations: 178, history,
    otherRetainedGroups: plan.retained.filter(g => !selected.has(g.element)).map(g => ({ family: g.family,
      element: g.element, occurrences: g.occurrences, originalCompleteRowSha256: g.canonicalRowSha256 })),
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limits: ['This supplements the original complete ancestry census; it does not normalize start to left globally.',
      'Candidate local requests are not computed inheritance, used line boxes or actual painted alignment.',
      'Browser controls test keyword geometry only; no Astylar rendering or Material screenshot equivalence is claimed.',
      'Historical source introductions do not prove author intent or the behavior of historical builds.',
      'Six other retained groups, including the separately reviewed expansion owner, stay outside this proposal.'] });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectLtrAlignmentReview(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ groups: report.groupCount, observations: report.observations,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
