import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createTooltipOpenReviewReader } from './join-material-tooltip-open.mjs';

export const badgeLabelPaintPredecessor = '3a51fbe3299d2c0f3f7ee70822bb69e0a4f7d9ec77739e6942337d12917cfe9d';
export const badgeLabelPaintReview = '3cb9fe23409d103230b7d2f9e842d9f3dfd984fd579e5cf2cfc4c32bcef52b60';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const childKey = 'retainedBadgeLabelRegionPaint';
const receipt = (file, sha256) => ({ file, sha256 });
const diagnostic = receipt('artifacts/material-parity/badge-label-interaction-paint-20261028.log',
  '2fc649fab505e49bfe919ebcf978fb172fd5fca1cf1a921d7861e08770ab3bcc');
const overlap = receipt('artifacts/material-parity/badge-label-count-overlap-20261028.log',
  'a592ffecb2c6f84760d7f7bb941478d35408a7bbc2e54402a35c14827c70d1d8');
const diagnosis = {
  report: receipt('artifacts/material-parity/badge-texture-observation-20261028/latest-report.json',
    'd5c94aec9eb800e86c027be14ee1d0dadf63e4a12697a19c8d9dfa1b7a4576ff'),
  proof: receipt('tests/material-parity/badge-texture-observation.spec.mjs',
    'cb1237cb43fc021292dfb630883bfe1382e40df53693943e981fc10f1d80af1e'),
  result: receipt('artifacts/material-parity/badge-fractional-origin-snap-20261028.log',
    '248c3be4e2592d3591bf7a08b639d90c2eb44f9a31b2cc5cfb04fe9c61678d69'),
};
const decode = bytes => bytes.toString(bytes[0] === 255 && bytes[1] === 254 ? 'utf16le' : 'utf8').replace(/^\uFEFF/, '');

export function createBadgeLabelPaintReviewReader({ root, read }) {
  const prior = createTooltipOpenReviewReader({ root, read });
  const joined = joinBadgeLabelPaint(JSON.parse(prior.read(prior.file)).review,
    (name, options) => read(path.resolve(root, name), options));
  assert.equal(joined.sha256, badgeLabelPaintReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: joined.sha256, review: joined.review }));
  return { ...joined, file, read(name, options) {
    if (path.resolve(root, name) !== file) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'retained-badge-label-region-paint', predecessorApplicability: prior.sourceApplicability,
    boundary: 'Forty historical local crop observations and two bounded prefix diagnoses;not full glyph,original action causality,current rendering or whole-case acceptance.' } };
}

export function restoreBadgeLabelPaint(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!Object.hasOwn(group.obligations.localPaint ?? {}, childKey)) return group;
    const paint = { ...group.obligations.localPaint }; delete paint[childKey];
    return { ...group, obligations: { ...group.obligations, localPaint: paint } };
  }) };
}

// Standalone proposal transformation. No selector, accepted pointer or canonical
// source inventory is changed here; full integration remains a separate gate.
export function joinBadgeLabelPaint(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), badgeLabelPaintPredecessor);
  const verified = new Map();
  const load = r => {
    if (!verified.has(r.file)) {
      const bytes = read(r.file); assert.equal(hash(bytes), r.sha256, r.file);
      verified.set(r.file, { sha256: r.sha256, bytes });
    }
    assert.equal(verified.get(r.file).sha256, r.sha256);
    return verified.get(r.file).bytes;
  };
  const bind = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string' && typeof value.sha256 === 'string') load(value);
    for (const child of Object.values(value)) bind(child);
  };
  const [recipe, report] = decode(load(diagnostic)).trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(hash(recipe.executedSource), recipe.executedSourceSha256);
  assert.equal(recipe.executedSourceSha256, '9ee8b1ef8ed853a17bd4511e7fdf69eda10a6c82366a29623934c851c1618bbb');
  assert.equal(report.cases, 40); assert.equal(report.controls, 3);
  assert.equal(report.currentRenderingAccepted, false);
  bind(report.evidence);
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].flatMap(dpr =>
    ['focus', 'hover', 'held', 'activate', 'activate-leave'].map(state => `interaction:badge@${profile}/desktop-dpr${dpr}/${state}`)));
  assert.deepEqual(report.records.map(r => r.case).sort(), expected.toSorted());
  const rows = new Map(report.records.map(r => [r.case, r]));
  const overlapReport = JSON.parse(decode(load(overlap)));
  assert.deepEqual(overlapReport.records.map(r => r.case).sort(), expected.filter(c => c.includes('@contrast/')).toSorted());
  const overlaps = new Map(overlapReport.records.map(r => [r.case, r]));
  bind(diagnosis);
  let changed = 0, diagnosticFailures = 0, bridges = 0;
  const groups = parent.groups.map(group => {
    const row = rows.get(group.case); if (!row) return group;
    changed++;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    assert.equal(group.obligations.localPaint.disposition, 'partial');
    assert.equal(group.obligations.localPaint[childKey], undefined);
    assert.equal(row.geometry.id, 'badge-label'); assert.equal(row.geometry.missing, false);
    assert.equal(row.metrics.phaseOffset.x, 0); assert.equal(row.metrics.phaseOffset.y, 0);
    assert.deepEqual(row.evidence.pairedTrees, group.evidence.pairedTrees);
    bind(row.evidence);
    diagnosticFailures += !row.metrics.matches;
    const context = overlaps.get(group.case);
    if (context) { assert.deepEqual(context.images, row.evidence.images); bind(context.images); }
    const bridge = group.case.includes('@contrast/') && group.case.endsWith('/focus');
    bridges += bridge;
    const observation = {
      disposition: row.metrics.matches ? 'inspected-diagnostic-local-match' : 'inspected-diagnostic-local-failure',
      evidence: { diagnostic, overlap, ...report.evidence, ...row.evidence },
      geometry: row.geometry, bounds: row.bounds, metrics: row.metrics,
      originalOutputGate: row.originalOutputGate,
      ...(context ? { overlapDiagnostic: { countGeometry: context.countGeometry,
        prefixBounds: context.prefixBounds, prefixMetric: context.prefixMetric } } : {}),
      ...(bridge ? { boundedTextureDiagnosis: {
        finding: 'core-text-transparent-backing-and-local-raster-phase', evidence: diagnosis,
        boundary: 'Initial inspect-state frames exactly match retained focus frames at these two contrast DPRs;not a replay of focus events. Tests isolate backing-dependent raster and empirical CSS-baseline phase in a visible prefix,not full glyphs,all fonts,complete equal inputs or current renderer acceptance.',
      } } : {}),
      boundary: 'Historical label-rectangle union crop includes overlapping count paint;not label-only glyph evidence. The original diagnostic log wording is superseded by the overlap receipt. No phase adjustment,threshold change or masked acceptance. Prefix diagnostics do not replace full crop failures. Known nowrap,ancestor and count-token input mismatches remain. Root/corner paint,complete semantics/history/currentness and whole-case inspection remain open.',
    };
    return { ...group, obligations: { ...group.obligations,
      localPaint: { ...group.obligations.localPaint, [childKey]: observation } } };
  });
  assert.equal(changed, 40); assert.equal(diagnosticFailures, 5); assert.equal(bridges, 2);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreBadgeLabelPaint(review))), badgeLabelPaintPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed, diagnosticFailures, bridges,
    authenticatedDependencies: verified.size };
}
