import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectTextAlignAncestry } from './audit-material-text-align-ancestry.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const key = r => JSON.stringify([r.family, r.element, r.property, r.reference, r.astylar]);
const proofFile = 'docs/material-text-align-ancestry.json';
const outputFile = 'docs/material-text-align-canonical-plan.json';
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const flags = { wholeElementInputEquivalent: false, candidateComputedVerified: false,
  usedAlignmentVerified: false, renderingEquivalent: false, rendererCauseProven: false };
const safeAttribute = value => value === undefined || typeof value === 'string' &&
  !/[\\]|\/\*/.test(value) && !/(?:^|;)\s*(?:text-align(?:-last)?|direction|unicode-bidi|all)\s*:/i.test(value);

export function reviewTextAlignmentObservation(proof) {
  for (const flag of ['candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven'])
    assert.equal(proof[flag], false);
  if (!proof.referencePath || !proof.candidatePath) return null;
  if (!proof.referencePath.every(n => safeAttribute(n.attributes.style)) ||
      !proof.candidatePath.every(n => safeAttribute(n.authored.attributes?.style))) return null;
  if (proof.reference === 'start' && proof.candidate === '<omitted>' &&
      proof.status === 'omitted-owner-local-without-captured-ancestor-request' &&
      !proof.referenceRequestNodes.length && !proof.candidateRequestNodes.length &&
      proof.referencePath.every(n => n.computed.textAlign === 'start' && n.computed.direction === 'ltr') &&
      proof.candidatePath.every(n => Object.values(n.localValues).every(v => v === '<omitted>'))) {
    return { classification: 'parity-harness-defect', attribution: 'reviewed-text-alignment-observation-stage-mismatch',
      owner: 'input audit browser computed alignment versus candidate local-style inspection',
      justification: 'The captured reference owner/ancestor path computes start in LTR; both captured paths contain no relevant alignment/reset/direction requests, and all candidate local stages omit textAlign. Comparing browser computed values to local declaration absence is an observation-stage mismatch. No candidate inherited/computed/used value, external reference ancestry, plugin behavior, motion activity or raster equivalence is inferred.', ...flags };
  }
  const requests = proof.referencePath.flatMap(n => [n.inline, ...n.requests.map(r => r.declarations)])
    .flatMap(d => Object.entries(d).filter(([k]) => ['textalign', 'textalignlast', 'direction', 'unicodebidi', 'all'].includes(k.replaceAll('-', '').toLowerCase())));
  if (proof.reference === 'center' && proof.candidate === '<omitted>' &&
      !proof.candidateRequestNodes.length && requests.length === 1 &&
      requests[0][0] === 'text-align' && requests[0][1].value === 'center' && !requests[0][1].important &&
      proof.referencePath[0].requests.some(r => r.active && !r.conditions.length &&
        r.selector === '.mat-mdc-tooltip-surface' && r.declarations['text-align']?.value === 'center') &&
      proof.candidatePath[0].authored.id === 'tooltip-popup' &&
      proof.candidatePath[0].retainedText?.source === 'core-text-registry' &&
      proof.candidatePath[0].retainedText.textAlign === 'left' &&
      proof.candidatePath.every(n => Object.values(n.localValues).every(v => v === '<omitted>'))) {
    return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-tooltip-scalar-text-alignment-omission',
      owner: 'showcase tooltip surface typography input translation',
      justification: 'The original active Material tooltip-surface rule requests text-align:center. Candidate popup-to-root local inputs omit it and retained core text records left. This extends the existing retained-text authoring finding to its original scalar group without replacing prior classifications. Flex centering is not substituted for text alignment; displacement, blur, motion and final raster remain unproved.', ...flags };
  }
  return null;
}

// Exact membership binding after independent source replay; never classify from
// a group count or replace a previously reviewed canonical row.
export function planTextAlignment(proof, original, rows, normalize) {
  assert.equal(proof.canonicalAttributionChanged, false);
  assert.equal(proof.inputEquivalent, false); assert.equal(proof.renderingEquivalent, false);
  const findings = new Map(proof.findings.map(f => [JSON.stringify([f.case, f.element]), f]));
  assert.equal(findings.size, proof.observations);
  assert.equal(proof.findings.length, proof.observations);
  const groups = new Map(), seen = new Set(), missing = [];
  let equal = 0, cases = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`; cases++;
    assert.equal(new Set(e.styleInputs.map(i => i.id)).size, e.styleInputs.length);
    for (const input of e.styleInputs) {
      if (!input.reference || !input.astylar) { missing.push({ case: caseId, element: input.id, originalInputSha256: digest(input) }); continue; }
      if (input.reference.textAlign === input.astylar.textAlign) { equal++; continue; }
      const identity = JSON.stringify([caseId, input.id]), f = findings.get(identity); assert.ok(f); assert.ok(!seen.has(identity)); seen.add(identity);
      assert.equal(f.family, e.family); assert.equal(f.property, 'textAlign'); assert.equal(f.originalInputSha256, digest(input));
      assert.deepEqual(f.inputTrees, e.inputTrees);
      const pattern = proof.patterns[f.pattern]; assert.ok(pattern); assert.equal(digest(pattern.proof), pattern.sha256);
      const p = pattern.proof; assert.equal(p.reference, input.reference.textAlign); assert.equal(p.candidate, input.astylar.textAlign ?? '<omitted>');
      const row = { family: e.family, element: input.id, property: 'textAlign', reference: normalize(input.reference).textAlign };
      const astylar = normalize(input.astylar).textAlign; if (astylar !== undefined) row.astylar = astylar;
      const signature = key(row), review = reviewTextAlignmentObservation(p);
      if (!groups.has(signature)) groups.set(signature, { ...row, occurrences: 0, cases: [], states: [], observations: [], statuses: {}, review });
      const g = groups.get(signature); assert.deepEqual(g.review, review, 'mixed review needs separate attribution');
      g.statuses[p.status] = (g.statuses[p.status] ?? 0) + 1;
      g.occurrences++; if (g.cases.length < 12) g.cases.push(caseId);
      if (!g.states.includes(e.state ?? 'static')) g.states.push(e.state ?? 'static');
      g.observations.push({ case: caseId, inputTrees: f.inputTrees, originalInputSha256: f.originalInputSha256, proofSha256: pattern.sha256 });
    }
  }
  assert.equal(cases, proof.casesScanned); assert.equal(seen.size, proof.observations); assert.equal(equal, proof.equalScalarObservations);
  assert.deepEqual(missing, proof.missingScalarObservations); assert.equal(groups.size, proof.groupCount);
  const sourceGroups = new Map(proof.groups.map(g => [JSON.stringify([g.family, g.element, g.reference, g.candidate]), g]));
  assert.equal(sourceGroups.size, groups.size);
  assert.equal(proof.groups.length, groups.size);
  const statuses = {};
  for (const g of groups.values()) for (const [status, count] of Object.entries(g.statuses)) statuses[status] = (statuses[status] ?? 0) + count;
  assert.deepEqual(statuses, proof.statusCounts);
  const proposed = [], retained = [], previous = [], selected = new Set();
  for (const g of groups.values()) {
    const source = sourceGroups.get(JSON.stringify([g.family, g.element, g.reference, g.astylar ?? '<omitted>'])); assert.ok(source);
    assert.equal(source.property, g.property); assert.deepEqual(source.statuses, g.statuses);
    assert.deepEqual(source.cases, g.observations.map(o => o.case));
    const matches = rows.filter(r => key(r) === key(g)); assert.equal(matches.length, 1);
    const row = matches[0]; for (const field of ['occurrences', 'cases', 'states']) assert.deepEqual(row[field], g[field]);
    const { review, statuses: observedStatuses, ...values } = g;
    const bound = { ...values, canonicalRowSha256: digest(row), previousAttribution: row.attribution };
    if (row.attribution !== 'unresolved') previous.push(bound);
    else if (!review) retained.push(bound);
    else { selected.add(row); proposed.push({ ...bound, proposedClassification: review.classification,
      proposedAttribution: review.attribution, proposedOwner: review.owner, justification: review.justification, ...flags }); }
  }
  const count = groups => groups.reduce((n, g) => n + g.occurrences, 0);
  return { casesScanned: cases, originalGroups: groups.size, originalObservations: seen.size, equalScalarObservations: equal,
    missingScalarObservations: missing, canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    proposedGroups: proposed.length, proposedObservations: count(proposed), retainedGroups: retained.length, retainedObservations: count(retained),
    previousGroups: previous.length, previousObservations: count(previous), otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)), proposed, retained, previous,
    canonicalAttributionChanged: false, rendererChanged: false, comparisonInputsChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectTextAlignmentPlan() {
  const bytes = readFileSync(proofFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(bytes, execFileSync('git', ['show', `7fa9b1b:${proofFile}`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).replaceAll('\r\n', '\n'));
  const proof = collectTextAlignAncestry(); assert.equal(hash(JSON.stringify(proof, null, 2) + '\n'), hash(bytes));
  const originalBytes = readFileSync(proof.originalCapture.file); assert.equal(hash(originalBytes), proof.originalCapture.sha256);
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const canonical = await readCaretConservationRows(file => execFileSync('git', ['show', `957774a:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  return { schemaVersion: 1, kind: 'source-bound-text-alignment-canonical-membership-proposal',
    sourceProof: { file: proofFile, revision: '7fa9b1b', sha256: hash(bytes) }, originalCapture: proof.originalCapture,
    productionNormalization: normalization, canonicalRevision: '957774a', canonicalPayload: canonical.manifest,
    ...planTextAlignment(proof, JSON.parse(originalBytes), canonical.rows, normalize) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = await collectTextAlignmentPlan(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(hash(readFileSync(outputFile, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(outputFile, output);
  console.log(JSON.stringify({ proposedGroups: report.proposedGroups, proposedObservations: report.proposedObservations,
    retainedGroups: report.retainedGroups, previousGroups: report.previousGroups, otherCompleteRows: report.otherCompleteRows,
    otherOrderedRowDigestsSha256: report.otherOrderedRowDigestsSha256, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
