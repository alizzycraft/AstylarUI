import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { bindHistoricalAuditNormalization, bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';
import { inspectOwnerCaretInput } from '../tests/material-parity/owner-caret-input-evidence.mjs';
import { restoreMappingReadAdapterSource } from '../tests/material-parity/audit-evidence-session.mjs';
import { borderEvidenceBaseline, verifyBorderEvidenceSourceTransition } from '../tests/material-parity/position-composition-producer-transition.mjs';
import { applyModalBoxReview } from '../tests/material-parity/modal-position-inspection.mjs';
import { rangeCaretAttribution } from '../tests/material-parity/component-caret-attributions.mjs';
export { rangeCaretAttribution } from '../tests/material-parity/component-caret-attributions.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const flags = { inputEquivalent: false, computedCandidateVerified: false, descendantCaretVerified: false,
  renderingEquivalent: false, rendererCauseProven: false };
export const rangeCaretSurveyFile = 'docs/material-range-caret-input-survey.json';

export function applyRangeCaretReviews(rows, cases, inventory, normalize) {
  return ['slider-primary', 'slider-start'].reduce((values, element) =>
    applyModalBoxReview(values, cases, inventory, normalize, {
      family: 'slider', element, properties: ['caretColor'],
      classification: 'parity-harness-defect', attribution: rangeCaretAttribution,
      owner: 'range owner browser-computed versus candidate local caret measurement boundary',
      justification: 'Both mapped owners are childless, non-contenteditable range controls. Captured ancestry has no caret/reset/motion request, while native computed caret color is compared to omitted candidate local declarations. This is an observation-stage discrepancy, not equal computed caret, visible caret, control domains or drag behavior. Unequal min/max/step inputs remain independently recorded; no candidate caret value is synthesized.',
      prove: (entry, reference, candidate) => {
        const inputs = entry.styleInputs.filter(i => i.id === element); assert.equal(inputs.length, 1);
        const proof = inspectRangeCaretInput(inputs[0], reference, candidate);
        return { ...proof, astylarNode: proof.candidateNode };
      },
    }), rows);
}

export function validateRangeCaretReviews(rows, originalRows, cases, inventory, normalize) {
  try {
    const selected = values => values.filter(r => r.attribution === rangeCaretAttribution);
    // Preserve JSON omission of undefined synthetic-root fields, not null/defaults.
    assert.ok(JSON.stringify(selected(rows)) === JSON.stringify(selected(applyRangeCaretReviews(originalRows, cases, inventory, normalize))),
      'complete range caret review differs');
    return [];
  } catch (error) { return [`range caret review does not replay: ${error.message}`]; }
}

// Narrow the original input-owner exclusion without pretending that a range is
// a text editor, synthesizing computed candidate caret, or waiving other input
// differences. Existing ancestry/declaration/three-stage checks still run first.
export function inspectRangeCaretInput(input, reference, candidate) {
  const proof = inspectOwnerCaretInput(input, reference, candidate, { family: 'slider' });
  assert.equal(proof.disposition, 'requires-specific-review');
  for (const [key, value] of Object.entries(flags)) assert.equal(proof[key], value);
  assert.equal(proof.mapping, 'unique-shared-id');
  assert.deepEqual(proof.requests, { reference: [], astylar: [] });
  assert.deepEqual(proof.issues, [
    { reason: 'editable-or-input-owner-needs-separate-proof', side: 'reference', node: proof.referenceNode },
    { reason: 'editable-or-input-owner-needs-separate-proof', side: 'astylar', node: proof.astylarNode },
  ]);
  const r = reference.nodes.find(n => n.key === proof.referenceNode);
  const a = candidate.nodes.find(n => n.key === proof.astylarNode);
  assert.equal(r.type, 'input'); assert.equal(r.attributes.type, 'range');
  assert.equal(a.authored.type, 'input'); assert.equal(a.authored.inputType, 'range');
  assert.equal(r.attributes.id, input.id); assert.equal(a.authored.id, input.id);
  assert.ok(!reference.nodes.some(n => n.parent === r.key)); assert.ok(!candidate.nodes.some(n => n.parent === a.key));
  for (const attrs of [r.attributes, a.authored.attributes ?? {}])
    assert.ok(attrs.contenteditable === undefined || attrs.contenteditable === 'false');
  assert.equal(proof.candidateLocalCaret, '<omitted>');
  assert.equal(proof.referenceComputedCaret, input.reference.caretColor);
  const fields = ['min', 'max', 'step'];
  for (const field of fields) {
    assert.equal(typeof r.attributes[field], 'string'); assert.equal(typeof a.authored[field], 'string');
  }
  assert.equal(typeof r.value, 'string'); assert.equal(typeof a.authored.value, 'string');
  assert.equal(typeof a.authored.disabled, 'boolean');
  return { originalProofSha256: digest(proof), originalIssues: proof.issues,
    referenceNode: r.key, candidateNode: a.key,
    observationStage: 'browser-computed-caret-versus-omitted-candidate-local-declaration',
    referenceComputedCaret: proof.referenceComputedCaret, referenceComputedColor: proof.referenceComputedColor,
    candidateLocalCaret: proof.candidateLocalCaret,
    candidateLocalColor: a.resolvedStyle.color ?? '<omitted>',
    referenceControl: { type: r.attributes.type, ...Object.fromEntries(fields.map(k => [k, r.attributes[k]])),
      value: r.value, disabled: Object.hasOwn(r.attributes, 'disabled'), attributes: r.attributes },
    candidateControl: { ...a.authored },
    nonCaretControlDifferences: [...fields, 'value', 'disabled'].flatMap(field => {
      const rv = field === 'value' ? r.value : field === 'disabled' ? Object.hasOwn(r.attributes, 'disabled') : r.attributes[field];
      const av = a.authored[field]; return rv === av ? [] : [{ field, reference: rv, candidate: av }];
    }),
    originalAncestry: { reference: proof.referencePath, candidate: proof.candidatePath },
    ...flags, wholeControlInputEquivalent: false,
    limitation: 'Range identity and original no-request ancestry are proven. No candidate computed caret, user-agent cascade, visible caret or interaction correctness is inferred. Distinct min/max/step/value inputs are retained independently, not excused by this caret-stage review.' };
}

export function collectRangeCaretInputs() {
  const parentFile = 'docs/material-owner-caret-input-survey.json', revision = 'f70c6b92f1135a7a5196e1393e8767345892de7f';
  const parentBytes = readFileSync(parentFile), parent = JSON.parse(parentBytes);
  assert.deepEqual(parent, JSON.parse(execFileSync('git', ['show', `${revision}:${parentFile}`], { maxBuffer: 32 * 1024 * 1024 })));
  const parentSourceChecks = parent.sourceFingerprints.map(s => {
    const bytes = readFileSync(s.file), current = hash(bytes.toString('utf8').replaceAll('\r\n', '\n'));
    const normalization = s.file === parent.productionNormalization.module;
    const mappingAdapter = s.file === 'tests/material-parity/generated-node-mapping-evidence.mjs' && current !== s.sha256;
    const borderTransition = s.file === 'tests/material-parity/border-initial-input-evidence.mjs' && current !== s.sha256;
    if (mappingAdapter) restoreMappingReadAdapterSource(s, bytes);
    else if (borderTransition) {
      const historical = execFileSync('git', ['show', `${borderEvidenceBaseline}:${s.file}`]);
      assert.equal(verifyBorderEvidenceSourceTransition(historical, bytes).historicalSha256, s.sha256);
    } else if (!normalization) assert.equal(current, s.sha256, s.file);
    return { file: s.file, recorded: s.sha256, current,
      verification: normalization ? 'historical-replay-and-current-caret-value-revalidation'
        : mappingAdapter ? 'exact-reader-import-transition-with-complete-mapping-source-conserved'
        : borderTransition ? 'authenticated-border-extension-with-shared-selector-conserved' : 'complete-source' };
  });
  const canonicalStyle = bindHistoricalAuditNormalization(parent.productionNormalization, revision);
  const currentStyle = bindPreciseAuditNormalization();
  const signature = (family, element, reference) => JSON.stringify([family, element, reference]);
  const groups = parent.groups.filter(g => g.reasonCounts['editable-or-input-owner-needs-separate-proof']);
  assert.equal(groups.length, 4);
  const joined = new Map(groups.map(g => [signature(g.family, g.element, g.reference), { group: g, observations: [] }]));
  assert.equal(joined.size, 4);
  const captureBytes = readFileSync(parent.capture.file); assert.equal(hash(captureBytes), parent.capture.sha256);
  const raw = JSON.parse(captureBytes), seen = new Set(), selectedCases = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of entries) {
    const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key); const owners = new Set(), selected = [];
    for (const input of e.styleInputs) {
      assert.ok(!owners.has(input.id)); owners.add(input.id);
      if (canonicalStyle(input.astylar ?? {}).caretColor !== undefined) continue;
      const record = joined.get(signature(e.family, input.id, canonicalStyle(input.reference ?? {}).caretColor));
      if (record) selected.push({ input, record });
    }
    if (!selected.length) continue;
    selectedCases.add(key); const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    for (const { input, record } of selected) {
      for (const side of ['reference', 'astylar'])
        assert.equal(currentStyle(input[side] ?? {}).caretColor, canonicalStyle(input[side] ?? {}).caretColor,
          'range caret membership changed under current normalization');
      const o = record.group.observations[record.observations.length]; assert.ok(o);
      assert.equal(o.case, key); assert.equal(o.inputSha256, digest(input)); assert.deepEqual(o.inputTrees, e.inputTrees);
      const review = inspectRangeCaretInput(input, r, a); assert.equal(review.originalProofSha256, o.proofSha256);
      assert.equal(review.referenceComputedCaret, o.referenceRaw); assert.equal(review.referenceComputedColor, o.referenceColorRaw);
      assert.equal(review.candidateLocalCaret, o.candidateRaw);
      record.observations.push({ case: key, profile: e.profile, viewport: e.viewport, state: e.state ?? 'static', original: o, review });
    }
  }
  assert.equal(seen.size, 2311); assert.equal(selectedCases.size, 78);
  const findings = [...joined.values()].map(({ group, observations }) => {
    assert.equal(observations.length, group.canonicalOccurrences); assert.equal(observations.length, group.observations.length);
    assert.deepEqual(observations.map(o => o.original), group.observations);
    return { family: group.family, element: group.element, property: group.property, reference: group.reference,
      candidate: group.candidate, canonicalRowSha256: group.canonicalRowSha256, observations };
  });
  const observations = findings.flatMap(g => g.observations); assert.equal(observations.length, 156);
  return { schemaVersion: 1, kind: 'original-range-caret-input-review', parent: { file: parentFile, sha256: hash(parentBytes), revision },
    parentSourceChecks,
    capture: parent.capture, originalCasesScanned: seen.size, selectedCases: selectedCases.size,
    groups: findings.length, observations: observations.length, originalScalarChecks: observations.length * 89,
    controlDifferences: Object.fromEntries(['min', 'max', 'step', 'value', 'disabled'].map(field =>
      [field, observations.filter(o => o.review.nonCaretControlDifferences.some(d => d.field === field)).length])),
    findings, ...flags, canonicalAttributionChanged: false,
    limitation: 'Complete original range-owner review only. Equal range types do not make authored control domains/steps, rendering, caret behavior, or interaction equivalent. No original input, fixture or canonical classification changed.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  if (args[0] === '--check') {
    // Validate immutable historical evidence with explicit current receipts;
    // never overwrite it merely because the audit producer has advanced.
    execFileSync(process.execPath, ['scripts/check-material-range-caret-inputs.mjs'], { stdio: 'inherit' });
    process.exit(0);
  }
  const report = collectRangeCaretInputs();
  report.sourceFingerprints = ['scripts/audit-material-range-caret-inputs.mjs',
    'tests/material-parity/owner-caret-input-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs']
    .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) }));
  const output = JSON.stringify(report, null, 2) + '\n';
  writeFileSync(rangeCaretSurveyFile, output);
  const { findings, sourceFingerprints, ...summary } = report; console.log(JSON.stringify(summary));
}
