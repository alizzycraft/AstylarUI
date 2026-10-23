// Exact queued review adapter for the existing canonical evidence loader.
// Historical source validity is not current rendering acceptance.
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { createDividerReviewedBoundariesReader, staticSemanticInputsReview } from './text-backing-case-review-source.mjs';
import { restoreScrollbarSupplementSuite } from './static-semantic-registration.mjs';

export const popupDepthInputsReview = 'eb8ca85a92bc8707f6fe2ba7404bf1e7caaacc9e57c733faf5a4cda6588862d4';
export const scrollbarPaintInputsReview = 'eb30019d906e601dfdaf10cd7ed8a9c9de141764e92316506b5ebfb2e0a392ac';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function createPopupDepthReviewReader({ root, read, reviewSha256 }) {
  assert.ok([popupDepthInputsReview, scrollbarPaintInputsReview].includes(reviewSha256), 'Unknown popup-depth review');
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${reviewSha256}.json`);
  const envelope = JSON.parse(read(file));
  assert.equal(envelope.sha256, reviewSha256); assert.equal(hash(JSON.stringify(envelope.review)), reviewSha256);
  let scrollbarChildren = 0;
  if (reviewSha256 === scrollbarPaintInputsReview) {
    for (const group of envelope.review.groups) {
      const child = group.obligations.localPaint?.retainedConfiguredScrollbarEvidence;
      if (!child) continue;
      assert.equal(group.family, 'timepicker');
      assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
      assert.match(group.case, /^interaction:timepicker@(light|dark|contrast|custom)\/desktop-dpr[12]\/open(-scroll)?$/);
      assert.equal(child.observation.case, group.case);
      assert.deepEqual(child.observation.remaining, group.obligations.localPaint.remaining);
      delete group.obligations.localPaint.retainedConfiguredScrollbarEvidence; scrollbarChildren++;
    }
    assert.equal(scrollbarChildren, 16);
    assert.equal(hash(JSON.stringify(envelope.review)), popupDepthInputsReview, 'Complete scrollbar predecessor not recovered');
  }
  let added = 0;
  for (const group of envelope.review.groups) {
    const child = group.obligations.localPaint?.retainedPopupDepthInputApplicability;
    if (!child) continue;
    assert.ok(['tooltip', 'snack-bar'].includes(group.family));
    assert.equal(child.sharedMechanism.applicableToCaseRuntimeProven, false);
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    delete group.obligations.localPaint.retainedPopupDepthInputApplicability; added++;
  }
  assert.equal(added, 133);
  assert.equal(hash(JSON.stringify(envelope.review)), staticSemanticInputsReview, 'Complete predecessor not recovered');
  const base = createDividerReviewedBoundariesReader({ root, read, reviewSha256: staticSemanticInputsReview });
  const logicalFile = 'scripts/audit-material-tooltip-applied-theme-ownership.mjs';
  const current = read(path.resolve(root, logicalFile));
  assert.equal(hash(current), '98347c3b5ef0fa585747c399bcac78ed9fafbfb804fab56c993f2a1d819d0613');
  const historical = execFileSync('git', ['show', `9f7dc468:${logicalFile}`], { cwd: root });
  assert.equal(hash(historical), 'ee4f273b041dec7f2dd0e242e4441b6cc6690b72d7a27d01270682c98e30d10a');
  const suite = 'tests/material-parity/tooltip-position-composition.spec.mjs';
  const currentSuite = read(path.resolve(root, suite));
  let text = currentSuite.toString();
  if (hash(text) === '16f62a795af1c5e91ff7d1b014bcaf7b2dc8426d061c56530a5311c4ea4f5acd') {
    for (const [current, prior] of [
      ['assert.equal(files.length, 953); assert.equal(new Set(files.map(n => n.text)).size, 953);',
        'assert.equal(files.length, 945); assert.equal(new Set(files.map(n => n.text)).size, 945);'],
      ['assert.equal(proofs.length, 273);', 'assert.equal(proofs.length, 269);'],
    ]) { assert.equal(text.split(current).length, 2); text = text.replace(current, prior); }
    assert.equal(hash(text), '47aa6fcb8c8baa2c378251062a779d8206d09109bf4e9ff768f625fe15ec0cb1');
  }
  if (hash(text) === '47aa6fcb8c8baa2c378251062a779d8206d09109bf4e9ff768f625fe15ec0cb1') {
    for (const [current, prior] of [
      ['assert.equal(files.length, 945); assert.equal(new Set(files.map(n => n.text)).size, 945);',
        'assert.equal(files.length, 936); assert.equal(new Set(files.map(n => n.text)).size, 936);'],
      ['assert.equal(proofs.length, 269);', 'assert.equal(proofs.length, 265);'],
    ]) { assert.equal(text.split(current).length, 2); text = text.replace(current, prior); }
    assert.equal(hash(text), 'a3800445a22c96275c913e766ffca51a97e02f8a82791d287a9bb6df56440758');
  }
  if (hash(text) === 'a3800445a22c96275c913e766ffca51a97e02f8a82791d287a9bb6df56440758') {
    const current = 'assert.equal(proofs.length, 265);';
    assert.equal(text.split(current).length, 2);
    text = text.replace(current, 'assert.equal(proofs.length, 264);');
    assert.equal(hash(text), '46d0c6cabc58db8bcf7dfc159dca4192ec000461707c9587bb9a298821a42c2a');
  }
  if (hash(text) === '46d0c6cabc58db8bcf7dfc159dca4192ec000461707c9587bb9a298821a42c2a') {
    for (const [current, prior] of [
      ['assert.equal(files.length, 936); assert.equal(new Set(files.map(n => n.text)).size, 936);',
        'assert.equal(files.length, 934); assert.equal(new Set(files.map(n => n.text)).size, 934);'],
      ['assert.equal(proofs.length, 264);', 'assert.equal(proofs.length, 261);'],
    ]) { assert.equal(text.split(current).length, 2); text = text.replace(current, prior); }
    assert.equal(hash(text), '38aac86ccd974432a908d3d0c64ed35ba74096a15fe820ba6c9ecc639cbd4a27');
  }
  if (hash(text) === '38aac86ccd974432a908d3d0c64ed35ba74096a15fe820ba6c9ecc639cbd4a27') {
    for (const [current, prior] of [
      ['assert.equal(files.length, 934); assert.equal(new Set(files.map(n => n.text)).size, 934);',
        'assert.equal(files.length, 932); assert.equal(new Set(files.map(n => n.text)).size, 932);'],
      ['assert.equal(proofs.length, 261);', 'assert.equal(proofs.length, 252);'],
    ]) { assert.equal(text.split(current).length, 2); text = text.replace(current, prior); }
  }
  assert.equal(hash(text), '4bf360e2877d6b10e9dc0944fa9da61d3a24269e8fd9db236f9e325f65a5c09b');
  const ast = ts.createSourceFile(suite, text, 99, true);
  const addedTests = ast.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression)
    && n.expression.arguments[0]?.text === 'popup depth queued reader authenticates full case proposal without promoting inspection');
  assert.equal(addedTests.length, 1);
  const retainedSuite = Buffer.from(text.slice(0, addedTests[0].getFullStart()) + text.slice(addedTests[0].end));
  assert.equal(hash(retainedSuite), '2f4f5b45fb868397cc72cf874189be875be88974e5abbe134560b18ae552bbad');
  const sources = new Map([
    [path.resolve(root, logicalFile), { current, historical }],
    [path.resolve(root, suite), { current: currentSuite, historical: retainedSuite }],
  ]);
  const scrollbarSuite = 'tests/material-parity/sort-focus-structure.spec.mjs';
  const currentScrollbarSuite = read(path.resolve(root, scrollbarSuite));
  const retainedScrollbarSuite = Buffer.from(restoreScrollbarSupplementSuite(currentScrollbarSuite));
  assert.equal(hash(retainedScrollbarSuite), '9fafec85d890122fa1ad2bb2ac712975b7982c603c28f036d534f875aab0effa');
  sources.set(path.resolve(root, scrollbarSuite), { current: currentScrollbarSuite, historical: retainedScrollbarSuite });
  return {
    read(file, encoding) {
      const source = sources.get(path.resolve(file));
      if (!source) return base.read(file, encoding);
      // Always observe current bytes,so an evidence session detects source drift.
      assert.equal(hash(read(path.resolve(file))), hash(source.current));
      return encoding ? source.historical.toString(encoding) : source.historical;
    },
    sourceApplicability: {
      mode: scrollbarChildren ? 'exact-scrollbar-paint-queued-review-historical-dependency'
        : 'exact-popup-depth-queued-review-historical-dependency', reviewSha256,
      predecessorReview: staticSemanticInputsReview, completePredecessorRecovered: true, addedChildren: added + scrollbarChildren,
      ...(scrollbarChildren ? { immediatePredecessorReview: popupDepthInputsReview,
        completeImmediatePredecessorRecovered: true, scrollbarChildren } : {}),
      transitions: [...base.sourceApplicability.transitions, {
        logicalFile, currentSha256: hash(current), historicalSha256: hash(historical), historicalRevision: '9f7dc468',
      }, {
        logicalFile: suite, currentSha256: hash(currentSuite), historicalSha256: hash(retainedSuite),
        boundary: 'Only the complete additive queued-reader test is removed;all original assertions conserve.',
      }, {
        logicalFile: scrollbarSuite, currentSha256: hash(currentScrollbarSuite), historicalSha256: hash(retainedScrollbarSuite),
        boundary: 'Only three complete additive scrollbar assertions are removed;whole accepted suite bytes conserve.',
      }],
      boundary: scrollbarChildren
        ? 'Exact16-child scrollbar successor of the retained133-child depth extension only. Original receipts,statuses and remaining work preserve;not current rendering or case closure.'
        : 'Exact133-child queued extension only. Original source receipts and all partial statuses remain;no current-rendering or case-completion claim.',
    },
  };
}
