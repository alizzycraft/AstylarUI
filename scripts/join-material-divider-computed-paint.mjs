import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { originalRunnerReview } from '../tests/material-parity/original-material-runner-review-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const childNames = ['retainedPaintProjectionCoverage', 'retainedDOMPaintContext'];
export function restoreDividerComputedPaint(review) {
  return { ...review, groups: review.groups.map(group => {
    if (group.family !== 'divider') return group;
    const input = { ...group.obligations.inputStyleStructure }, paint = { ...group.obligations.localPaint };
    delete input[childNames[0]]; delete paint[childNames[1]];
    return { ...group, obligations: { ...group.obligations, inputStyleStructure: input, localPaint: paint } };
  }) };
}

export function joinDividerComputedPaint(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), originalRunnerReview);
  const receipt = file => { const bytes = read(file); return { file, sha256: hash(bytes) }; };
  const capture = (file, sha256) => {
    const bytes = read(file); assert.equal(hash(bytes), sha256);
    return { evidence: { file, sha256 }, report: JSON.parse(bytes.toString('utf16le').replace(/^\ufeff/, '')) };
  };
  const desktop = capture('artifacts/material-parity/divider-computed-paint-context-20261024.log', '9d43d99a8832060378094f4c241250061d08b6db28107858e09d0865f62c6807');
  const remaining = capture('artifacts/material-parity/divider-computed-paint-context-remaining-resolved-20261024.log', '2d9b69e805b4a114c4b2fbdcca3263ec60de3ebebcd2f83d480a3f1f09f84c3a');
  const verification = receipt('artifacts/material-parity/divider-paint-coverage-coherent-20261024.log');
  assert.equal(verification.sha256, '32feb82531cf7301a0105376bab5535546e200ebb2fa0e0a5dba6b85400f8555');
  const evidence = { desktop: desktop.evidence, remaining: remaining.evidence, verification,
    proof: receipt('tests/material-parity/retained-paint-property-coverage.spec.mjs'),
    desktopProducer: receipt('scripts/audit-material-divider-paint-context.mjs'),
    remainingProducer: receipt('scripts/audit-material-divider-paint-context-remaining.mjs'),
    join: receipt('scripts/join-material-divider-computed-paint.mjs') };
  assert.equal(evidence.desktopProducer.sha256, desktop.report.producerSha256);
  assert.equal(evidence.remainingProducer.sha256, remaining.report.producerSha256);
  const reports = [...desktop.report.results.map(row => ({ ...row, context: { id: 'desktop', width: 1440, height: 1000, deviceScaleFactor: 1 }, capture: desktop.evidence })),
    ...remaining.report.results.map(row => ({ ...row, capture: remaining.evidence }))];
  assert.equal(reports.length, 40);
  const defaults = { backgroundImage: 'none', filter: 'none', backdropFilter: 'none', mixBlendMode: 'normal', isolation: 'auto', opacity: '1' };
  for (const row of reports) for (const target of row.observation.targets) for (const owner of target.chain)
    for (const [property, expected] of Object.entries(defaults)) assert.equal(owner.values[property], expected);
  let cases = 0;
  const groups = predecessor.groups.map(group => {
    if (group.family !== 'divider') return group;
    const match = /^(static|interaction):divider@([^/]+)\/([^/]+)(?:\/inspect)?$/.exec(group.case); assert.ok(match);
    const [, kind, profile, viewport] = match, cohort = viewport === 'desktop-dpr1' ? 'desktop' : viewport;
    const rows = reports.filter(row => row.profile === profile && row.context.id === cohort);
    assert.equal(rows.length, 2); assert.deepEqual(rows.map(row => row.side), ['reference', 'astylar']);
    assert.equal(group.obligations.inputStyleStructure[childNames[0]], undefined);
    assert.equal(group.obligations.localPaint[childNames[1]], undefined);
    cases++;
    return { ...group, obligations: { ...group.obligations,
      inputStyleStructure: { ...group.obligations.inputStyleStructure, [childNames[0]]: {
        disposition: 'inspected-recorded-request-and-projection-boundary',
        omittedComputedProperties: ['backgroundImage', 'filter', 'mixBlendMode', 'isolation'],
        recordedChainRequests: 'No explicit filter/backdrop-filter/blend/isolation requests in retained matched rules/inline chains;variable background shorthand survives despite empty serialized longhands.',
        evidence, boundary: 'Raw declarations remain available;not complete computed styles,anonymous boxes or a renderer diagnosis.' } },
      localPaint: { ...group.obligations.localPaint, [childNames[1]]: {
        disposition: 'inspected-matching-retained-physical-context', profile, cohort: rows[0].context,
        browser: desktop.report.browser, originalCaseKind: kind,
        reference: rows[0].observation.targets, candidateDOMHost: rows[1].observation.targets,
        evidence, boundary: 'New read-only observations on retained served bytes,not replay of original case or interaction. Desktop-DPR1 inspect is a physical alias only. No candidate logical material/shader/group-compositing,current-core or whole-case acceptance;all existing remaining tasks preserve.' } },
    } };
  });
  assert.equal(cases, 24);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreDividerComputedPaint(review))), originalRunnerReview);
  return { review, sha256: hash(JSON.stringify(review)), cases, addedChildren: cases * 2 };
}
