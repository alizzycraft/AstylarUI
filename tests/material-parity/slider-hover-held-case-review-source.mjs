import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRetainedFocusReviewReader } from '../../scripts/join-material-retained-pointer-focus.mjs';
import { sliderHoverHeldPredecessor, sliderHoverHeldCapture } from '../../scripts/join-material-slider-hover-held.mjs';

export const sliderHoverHeldReview = 'c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

// Only two reviewed test edits are reversed. Whole prior source authentication
// is mandatory;the adapter does not normalize arbitrary new changes away.
export function restoreSliderHoverHeldBenchmark(bytes) {
  assert.equal(hash(bytes), 'd4102f705bf61418286a18932697a5ab95a2e4bb507d237fe3b61bc6914c62ce');
  let source = bytes.toString();
  const start = source.indexOf("test('configured slider hover and held retain raw pointer boundaries without accepting paint'");
  const end = source.indexOf("test('retained public unchanged-root updates preserve semantic focus failure at both DPRs'");
  assert.ok(start >= 0 && end > start);
  source = source.slice(0, start) + source.slice(end);
  const additions = [
    '  // The new direct-owner probe supersedes this producer, not its historical\n  // captured bytes. Resolve only this exact source from the retained snapshot;\n  // the validator still authenticates it against the original capture receipt.\n',
    "  const originalProducer = Buffer.from(readFileSync('docs/evidence/material-configured-input-focus-runner-20261008.mjs.b64', 'utf8').trim(), 'base64');\n",
    "  assert.equal(createHash('sha256').update(originalProducer).digest('hex'), '307719402d9a19d5e9204ab0f7609e2d43bb52c14de9979c833e9ce5a644f089');\n",
  ];
  for (const addition of additions) {
    assert.equal(source.split(addition).length, 2); source = source.replace(addition, '');
  }
  const before = "    script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: Object.values(propertyGroups).flat(),\n    readBytes: absolute => absolute === path.resolve('scripts/audit-material-configured-input-focus.mjs') ? originalProducer : readFileSync(absolute) }),";
  const after = "    script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: Object.values(propertyGroups).flat() }),";
  assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  const restored = Buffer.from(source);
  assert.equal(hash(restored), '31f2cb8ec0aa6299e4854d07b70f8031e0e646a2a39812841e984e5a7098ab57');
  return restored;
}

export function createSliderHoverHeldReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, sliderHoverHeldReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${reviewSha256}.json`);
  const envelope = JSON.parse(read(file));
  assert.equal(envelope.sha256, reviewSha256); assert.equal(hash(JSON.stringify(envelope.review)), reviewSha256);
  const captureBytes = read(path.resolve(root, sliderHoverHeldCapture.file));
  assert.equal(hash(captureBytes), sliderHoverHeldCapture.sha256);
  const capture = JSON.parse(captureBytes);
  let removed = 0;
  for (const group of envelope.review.groups) {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const activation = group.obligations.authoredActivation, child = activation.configuredSliderHoverHeld;
    if (!child) continue;
    const row = capture.results.find(row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}` === group.case);
    assert.ok(row); assert.equal(child.case, group.case); assert.equal(child.state, row.state);
    assert.equal(activation.disposition, 'partial');
    for (const side of ['reference', 'astylar']) assert.deepEqual(child.observations[side], row[side].observations);
    assert.deepEqual(child.evidence.report, sliderHoverHeldCapture);
    delete activation.configuredSliderHoverHeld; activation.disposition = 'evidence-join-pending'; removed++;
  }
  assert.equal(removed, 16);
  assert.equal(hash(JSON.stringify(envelope.review)), sliderHoverHeldPredecessor);
  const priorRead = (absolute, options) => {
    if (absolute === path.resolve(root, 'tests/material-parity/benchmark-config.spec.mjs')) {
      const bytes = restoreSliderHoverHeldBenchmark(read(absolute));
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    if (absolute === path.resolve(root, 'scripts/audit-material-configured-input-focus.mjs')) {
      const bytes = Buffer.from(read(path.resolve(root, 'docs/evidence/material-configured-input-focus-runner-20261008.mjs.b64')).toString().trim(), 'base64');
      assert.equal(hash(bytes), '307719402d9a19d5e9204ab0f7609e2d43bb52c14de9979c833e9ce5a644f089');
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    return read(absolute, options);
  };
  const prior = createRetainedFocusReviewReader({ root, read: priorRead, reviewSha256: sliderHoverHeldPredecessor });
  return { read: prior.read, sourceApplicability: {
    mode: 'exact-slider-hover-held-successor', reviewSha256, children: removed,
    completePredecessorRecovered: true, predecessorApplicability: prior.sourceApplicability,
    boundary: 'Only16 raw-action children and pending-to-partial dispositions. Bounded prior-source restoration;no renderer,paint,current rendering or whole-case acceptance.',
  } };
}
