import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const captureAvailabilityPredecessor = '3cb9fe23409d103230b7d2f9e842d9f3dfd984fd579e5cf2cfc4c32bcef52b60';
const childKey = 'supplementaryCaptureAvailability';
const specs = {
  chips: ['supplementaryAlternateSelection', 'activate-alternate', 'scripts/audit-material-chips-alternate.mjs'],
  stepper: ['supplementaryLeaveSelection', 'activate-leave', 'scripts/audit-material-stepper-leave.mjs'],
};
const boundary = 'Exact configured case in authenticated supplemental capture matching the predecessor recorded served build. Captured browser only; not current-browser execution, whole-library applicability, equal inputs, rendering parity or case closure.';

// Pure matcher: later capture dates and report-level references are insufficient.
export function inspectCaptureAvailability(caseKey, report, provenance, servedFiles) {
  assert.equal(report.browser, provenance.browser, 'Capture/manifest browser mismatch');
  const vector = files => {
    assert.ok(Array.isArray(files) && files.length > 0);
    const pairs = files.map(({ file, sha256 }) => {
      assert.equal(typeof file, 'string'); assert.match(sha256, /^[a-f0-9]{64}$/);
      return [file, sha256];
    }).sort(([a], [b]) => a.localeCompare(b));
    assert.equal(new Set(pairs.map(([file]) => file)).size, pairs.length, 'Duplicate asset');
    return pairs;
  };
  assert.deepEqual(vector(provenance.browserFiles), vector(servedFiles), 'Recorded served build differs');
  const matches = report.results.filter(row =>
    `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}` === caseKey);
  assert.equal(matches.length, 1, 'Missing or duplicate exact configured case');
  return { capturedBrowser: report.browser, servedVectorSha256: hash(JSON.stringify(vector(servedFiles))),
    currentRenderingAccepted: false, boundary };
}

export function restoreCaptureAvailability(review) {
  return { ...review, groups: review.groups.map(group => {
    const current = group.obligations.sourceCurrentness, added = current[childKey];
    if (!added) return group;
    const restored = { ...current, ...added.previousCensus }; delete restored[childKey];
    return { ...group, obligations: { ...group.obligations, sourceCurrentness: restored } };
  }) };
}

// Standalone successor only. No accepted pointer or canonical registration writes.
export function joinCaptureAvailability(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), captureAvailabilityPredecessor);
  const anchors = parent.groups.filter(g => g.obligations.sourceCurrentness.sharedBuildEvidence);
  assert.equal(anchors.length, 1);
  const prefix = 'examples/material-showcase/dist/material-showcase/browser/';
  const served = anchors[0].obligations.sourceCurrentness.sharedBuildEvidence.currentServedFiles.map(r => {
    assert.ok(r.file.startsWith(prefix)); return { file: r.file.slice(prefix.length), sha256: r.sha256 };
  });
  const load = receipt => {
    const bytes = read(receipt.file); assert.equal(hash(bytes), receipt.sha256, receipt.file); return bytes;
  };
  const reports = new Map(); let changed = 0;
  const groups = parent.groups.map(group => {
    const spec = specs[group.family]; if (!spec || !group.case.endsWith(`/${spec[1]}`)) return group;
    const previous = group.obligations.sourceCurrentness;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    assert.equal(previous.currentServedBuildCapture, 'no-retained-capture-matching-served-build');
    assert.deepEqual(previous.captures, []); assert.equal(previous[childKey], undefined);
    const existing = group.obligations.authoredActivation[spec[0]];
    assert.ok(existing); const receipt = existing.evidence.report;
    let verified = reports.get(receipt.file);
    if (!verified) {
      const report = JSON.parse(load(receipt)), manifestReceipt = report.capture.checkpointManifest;
      assert.deepEqual(manifestReceipt, existing.evidence.manifest);
      const provenance = JSON.parse(load(manifestReceipt)).provenance;
      assert.deepEqual(validateSupplementalCapture(report, { reportFile: receipt.file,
        expectedProvenance: provenance, script: spec[2], styleProperties: report.capture.styleProperties,
        readBytes: read }), { status: 'checkpoint-bound', errors: [] });
      verified = { report, provenance, evidence: { report: receipt, manifest: manifestReceipt } };
      reports.set(receipt.file, verified);
    }
    const observation = inspectCaptureAvailability(group.case, verified.report, verified.provenance, served);
    changed++;
    return { ...group, obligations: { ...group.obligations, sourceCurrentness: { ...previous,
      currentServedBuildCapture: 'retained-capture-matches-served-build',
      captures: [{ mode: 'supplementary-exact-case-recorded-build', browser: observation.capturedBrowser,
        evidence: verified.evidence, boundary }],
      [childKey]: { ...observation, disposition: 'inspected-capture-availability-only',
        evidence: verified.evidence, sharedBuildEvidenceCase: anchors[0].case,
        previousCensus: { currentServedBuildCapture: previous.currentServedBuildCapture, captures: previous.captures } },
    } } };
  });
  assert.equal(changed, 16); assert.equal(reports.size, 2);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreCaptureAvailability(review))), captureAvailabilityPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}
