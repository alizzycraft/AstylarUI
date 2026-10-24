import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dividerComputedPaintReview } from '../tests/material-parity/divider-computed-paint-review-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const names = ['retainedRemainingOwnerReview', 'actualFrameExtentObservation', 'inlineAlignmentConsumption', 'actualInlineAlignmentInputSensitivity'];
export function restoreDividerOwnerFrameEvidence(review) {
  return { ...review, groups: review.groups.map(group => {
    if (group.family !== 'divider') return group;
    const input = { ...group.obligations.inputStyleStructure };
    for (const name of names) delete input[name];
    return { ...group, obligations: { ...group.obligations, inputStyleStructure: input } };
  }) };
}
export function joinDividerOwnerFrameEvidence(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), dividerComputedPaintReview);
  const receipt = file => ({ file, sha256: hash(read(file)) });
  const decode = (file, expected, lines = false) => {
    const bytes = read(file); assert.equal(hash(bytes), expected);
    const text = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le').slice(1) : bytes.toString('utf8');
    const rows = lines ? text.trim().split(/\r?\n/).map(row => JSON.parse(row)) : [JSON.parse(text)];
    return { data: rows.at(-1), evidence: { file, sha256: expected } };
  };
  const owners = decode('artifacts/material-parity/divider-frame-box-inputs-final-20261024.log', '1079d7c625336f18169c3aee9ac3629b69c266a88e8a59669cfbd2ebed15b71e');
  const frame = decode('artifacts/material-parity/divider-frame-sizes-20261024.log', '5f13b3c4acc99e075ec7d8b92383358ce91270ea3cd4611c6766dbe300ca6c48', true);
  const frameVerify = decode('artifacts/material-parity/divider-frame-sizes-verification-20261024.log', '0909ca0ac5706678995bd2941f13fbcac2167de17ca62ecbb5638376ddb5ea88');
  const alignment = decode('artifacts/material-parity/divider-alignment-inputs-public-updates-20261024.log', '6e66daee958d3b3d58a9a419ff2a8c4425138e629a517279e9faec27731b8ab7', true);
  const alignmentVerify = decode('artifacts/material-parity/divider-alignment-inputs-public-verification-final-20261024.log', '164d0bad58575ed17c5736505429a9689af31e0ab0ca7434fa8e1e57bab24e94');
  const inline = decode('artifacts/material-parity/divider-inline-alignment-reads-final-20261024.log', '3e7be917fc26d72dedc86280cb0b06e3f3a4075e57a110f59de58f1be004bf2f');
  for (const item of [owners, frameVerify, alignmentVerify, inline]) assert.deepEqual(receipt(item.data.producer.file), item.data.producer);
  assert.equal(receipt('scripts/audit-material-divider-frame-sizes.mjs').sha256, frame.data.producerSha256);
  assert.equal(receipt('scripts/audit-material-divider-alignment-inputs.mjs').sha256, alignment.data.producerSha256);
  assert.deepEqual(frameVerify.data.capture, frame.evidence); assert.deepEqual(alignmentVerify.data.capture, alignment.evidence);
  assert.equal(frameVerify.data.physicalContexts, 20); assert.equal(frameVerify.data.maximumAbsoluteFrameError, 0);
  assert.equal(alignmentVerify.data.contexts, 4); assert.equal(alignmentVerify.data.alignmentVariants, 16);
  assert.equal(inline.data.observations, 48); assert.equal(inline.data.consumedPropertyControls, 2);
  assert.equal(owners.data.observations.length, 24); assert.equal(owners.data.unequalFrameBoxSizingRequests, 24);
  const evidence = { ownerReview: owners.evidence, frame: frame.evidence, frameVerification: frameVerify.evidence,
    alignment: alignment.evidence, alignmentVerification: alignmentVerify.evidence, inline: inline.evidence,
    producers: [owners.data.producer, frameVerify.data.producer, alignmentVerify.data.producer, inline.data.producer,
      receipt('scripts/audit-material-divider-frame-sizes.mjs'), receipt('scripts/audit-material-divider-alignment-inputs.mjs')],
    join: receipt('scripts/join-material-divider-owner-frame-evidence.mjs') };
  let cases = 0, alignedCases = 0;
  const groups = predecessor.groups.map(group => {
    if (group.family !== 'divider') return group;
    const match = /^(static|interaction):divider@([^/]+)\/([^/]+)(?:\/inspect)?$/.exec(group.case); assert.ok(match);
    const [, kind, profile, viewport] = match, cohort = viewport === 'desktop-dpr1' ? 'desktop' : viewport;
    const ownerRows = owners.data.observations.filter(row => row.case === group.case); assert.equal(ownerRows.length, 1);
    assert.deepEqual(ownerRows[0].evidence, group.evidence.pairedTrees);
    const frames = frame.data.results.filter(row => row.profile === profile && row.context.id === cohort);
    assert.deepEqual(frames.map(row => row.side), ['reference', 'astylar']);
    const input = { ...group.obligations.inputStyleStructure };
    for (const name of names) assert.equal(input[name], undefined);
    input[names[0]] = { disposition: 'inspected-bounded-remaining-owner-domains', ...ownerRows[0], evidence,
      boundary: 'Nine recorded owners map,including five outside scalar targets. Only recorded frame box-model,shared heading offset/masking/logical alignment and inventory domains;not every property or complete input equivalence.' };
    input[names[1]] = { disposition: 'inspected-supplementary-physical-frame-extents', profile, cohort: frames[0].context,
      originalCaseKind: kind, browser: frame.data.browser, reference: frames[0].observation, astylar: frames[1].observation, evidence,
      boundary: 'Read-only retained-build physical context,not original action replay. Matching frame extents do not erase unequal box-sizing requests or prove descendants,paint,current-core or full-case acceptance;DPR1 inspect is a physical alias only.' };
    input[names[2]] = { disposition: 'inspected-retained-inline-method-property-consumption',
      forbiddenFields: inline.data.forbiddenFields, observedStyleReads: inline.data.observedStyleReads,
      methodTokensSha256: inline.data.methodTokensSha256, evidence,
      boundary: 'Retained single-span method execution only;mocked creation/dimension boundaries remain explicit. Not absence of other consumers or native alignment equivalence.' };
    if (cohort === 'desktop') {
      const rows = alignment.data.results.filter(row => row.profile === profile); assert.equal(rows.length, 1);
      const { original, ...observation } = rows[0].observation;
      assert.equal(observation.originalUnchanged, true); assert.equal(observation.variants.length, 5);
      input[names[3]] = { disposition: 'inspected-supplementary-public-update-input-sensitivity', profile,
        cohort: { width: 1440, height: 1000, deviceScaleFactor: 1 }, browser: alignment.data.browser,
        originalCaseKind: kind, observation, originalInputSha256: hash(JSON.stringify(original)), evidence,
        boundary: 'Four-theme desktop DPR1 public diagnostic updates only. Original inputs restore;individual/combined normal alignment requests preserve retained layouts and height controls alter them. Not original case actions,other viewport/DPR,native equivalence or paint. Inspect case is only a physical alias.' };
      alignedCases++;
    }
    cases++;
    return { ...group, obligations: { ...group.obligations, inputStyleStructure: input } };
  });
  assert.equal(cases, 24); assert.equal(alignedCases, 8);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreDividerOwnerFrameEvidence(review))), dividerComputedPaintReview);
  return { review, sha256: hash(JSON.stringify(review)), cases, alignedCases, addedChildren: cases * 3 + alignedCases };
}
