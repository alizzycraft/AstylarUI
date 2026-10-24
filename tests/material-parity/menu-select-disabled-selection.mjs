import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { menuSelectDisabledReview } from './menu-select-disabled-review-source.mjs';

const hash = s => createHash('sha256').update(s).digest('hex');
export const menuSelectionPriorHashes = Object.freeze({
  launcher: '4195a39f7ad0ceb92bacf00b4722cc3fa5755b4104a3ac4d49e4b131ef5fc11a',
  runner: '976cd58288cb8906810d8727dbdb863b113c21e3434141f87022b2e46a8d162a',
});
const flag = '--menu-select-disabled';
function transitions(kind) {
  assert.ok(Object.hasOwn(menuSelectionPriorHashes, kind));
  if (kind === 'runner') return [
    ["import { dividerOwnerFrameReview, createDividerOwnerFrameReviewReader } from '../tests/material-parity/divider-owner-frame-review-source.mjs';\n",
      "import { dividerOwnerFrameReview, createDividerOwnerFrameReviewReader } from '../tests/material-parity/divider-owner-frame-review-source.mjs';\nimport { menuSelectDisabledReview, createMenuSelectDisabledReviewReader } from '../tests/material-parity/menu-select-disabled-review-source.mjs';\n"],
    ['    const applicability=ownerFrameReaderFactory?.',
      '    const menuSelectReaderFactory = options.caseObligationReviewSha256===menuSelectDisabledReview ? createMenuSelectDisabledReviewReader : ownerFrameReaderFactory;\n    const applicability=menuSelectReaderFactory?.'],
  ];
  return [
    ['const rawRequested = process.argv.slice(2);\n', `const rawRequested = process.argv.slice(2);\nconst menuSelectDisabled = rawRequested.includes('${flag}');\nassert.ok(!menuSelectDisabled || rawRequested.every(argument => ['${flag}', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n`],
    ['const requested = rawRequested.filter', `const requested = rawRequested.filter(argument => argument !== '${flag}').filter`],
    ['|--divider-owner-frame]', `|--divider-owner-frame|${flag}]`],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (menuSelectDisabled) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${menuSelectDisabledReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['(originalRunnerRecovery || dividerComputedPaint || dividerOwnerFrame)', '(originalRunnerRecovery || dividerComputedPaint || dividerOwnerFrame || menuSelectDisabled)'],
    ["if (requested.includes('--dry-run'))", `if (menuSelectDisabled) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${menuSelectDisabledReview}';\nif (requested.includes('--dry-run'))`],
  ];
}
const once = (s, before, after) => { assert.equal(s.split(before).length, 2, 'Exact pending selection boundary required'); return s.replace(before, after); };
export function prepareMenuSelection(source, kind) {
  let s = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(s), menuSelectionPriorHashes[kind], 'Frozen complete source must authenticate');
  for (const [before, after] of transitions(kind)) s = once(s, before, after);
  return s;
}
export function restoreMenuSelection(source, kind) {
  let s = source.toString().replaceAll('\r\n', '\n');
  for (const [before, after] of transitions(kind).toReversed()) s = once(s, after, before);
  assert.equal(hash(s), menuSelectionPriorHashes[kind], 'Complete frozen source must recover');
  return s;
}
