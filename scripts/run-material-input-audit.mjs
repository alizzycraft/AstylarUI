import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  buildMaterialInputAudit,
  parseMaterialInputAuditArguments,
  renderMaterialInputAuditMarkdown,
  validateMaterialInputAudit,
} from '../tests/material-parity/input-equivalence-audit.mjs';
import {
  assertMaterialInputAuditCurrentStream,
  encodeMaterialInputAuditStream,
} from '../tests/material-parity/input-audit-report-stream.mjs';
import { materialInputAuditPayloadFile } from '../tests/material-parity/input-audit-report-codec.mjs';
import { withAuditEvidenceSession, auditReadFileSync } from '../tests/material-parity/audit-evidence-session.mjs';
import { attachCaseObligationCoverage, assertCaseObligationCoverage } from './audit-findings-store.mjs';
import { popupDepthInputsReview, createPopupDepthReviewReader } from '../tests/material-parity/popup-depth-case-review-source.mjs';
import { scrollbarPaintInputsReview } from '../tests/material-parity/popup-depth-case-review-source.mjs';
import { tableLabelPaintReview, createTableLabelReviewReader } from '../tests/material-parity/table-label-case-review-source.mjs';
import { createTextBackingReviewReader, textBackingRetainedReview, createDividerReviewedBoundariesReader, dividerReviewedBoundariesReview, inactiveParagraphInputsReview, filledFieldStructureReview, chipPaintReview, chipGraphicReview, controlInputReview, dividerPropertyContextReview, sharedButtonTouchReview, passiveStaticAxReview, cardInputsReview, expansionSemanticsReview, stepperInputsReview, tabsMenuSheetReview, staticSemanticInputsReview } from '../tests/material-parity/text-backing-case-review-source.mjs';

const root = process.cwd();
const options = parseMaterialInputAuditArguments(process.argv.slice(2), root);
const { check, allowPartial, parityPath } = options;
const jsonPath = path.resolve(root, 'docs/material-input-equivalence-audit.json');
const payloadPath = path.resolve(root, 'docs', materialInputAuditPayloadFile);
const markdownPath = path.resolve(root, 'docs/material-input-equivalence-audit.md');
const progressStarted = performance.now();
const progress = phase => {
  if (process.env.ASTYLAR_AUDIT_PROGRESS !== '1') return;
  console.error(JSON.stringify({ auditProgress: phase, elapsedMs: performance.now() - progressStarted,
    memory: process.memoryUsage() }));
};

assert.ok(existsSync(parityPath), `Run material parity first; missing ${parityPath}`);
progress('read-reference');
const parityReport = JSON.parse(readFileSync(parityPath, 'utf8'));
const { audit, errors } = withAuditEvidenceSession(() => {
  progress('build-audit');
  const audit = buildMaterialInputAudit(parityReport, { ...options, root });
  if (options.caseObligationReview !== undefined) {
    progress('join-case-obligations');
    const readerFactory=options.caseObligationReviewSha256===tableLabelPaintReview ? createTableLabelReviewReader : options.caseObligationReviewSha256===scrollbarPaintInputsReview ? createPopupDepthReviewReader : options.caseObligationReviewSha256===popupDepthInputsReview ? createPopupDepthReviewReader : [dividerReviewedBoundariesReview,inactiveParagraphInputsReview,filledFieldStructureReview,chipPaintReview,chipGraphicReview,controlInputReview,dividerPropertyContextReview,sharedButtonTouchReview,passiveStaticAxReview,cardInputsReview,expansionSemanticsReview,stepperInputsReview,tabsMenuSheetReview,staticSemanticInputsReview].includes(options.caseObligationReviewSha256)
      ? createDividerReviewedBoundariesReader
      : options.caseObligationReviewSha256===textBackingRetainedReview ? createTextBackingReviewReader : undefined;
    const applicability=readerFactory?.({root,read:auditReadFileSync,reviewSha256:options.caseObligationReviewSha256});
    audit.coverage = attachCaseObligationCoverage(audit.coverage, options.caseObligationReview,
      options.caseObligationReviewSha256, { root, read: applicability?.read ?? auditReadFileSync });
    if(applicability)audit.coverage.inspectionEvidence.sourceApplicability=applicability.sourceApplicability;
  }
  progress('validate-audit');
  assertCaseObligationCoverage(audit.coverage);
  const errors = validateMaterialInputAudit(audit, { requireComplete: !allowPartial });
  progress('verify-evidence-session');
  return { audit, errors };
}, { root, cold: process.env.ASTYLAR_AUDIT_COLD === '1', onMetrics: metrics => console.log(JSON.stringify({ evidenceSession: metrics })) });
progress('render-markdown');
const markdown = renderMaterialInputAuditMarkdown(audit);

if (errors.length > 0) {
  progress('validation-failed');
} else if (check) {
  progress('check-canonical');
  await assertMaterialInputAuditCurrentStream(audit, JSON.parse(readFileSync(jsonPath, 'utf8')), readFileSync(payloadPath));
  assert.equal(readFileSync(markdownPath, 'utf8'), markdown, 'checked-in human audit is stale');
} else {
  progress('encode-canonical');
  const { manifest, payload } = await encodeMaterialInputAuditStream(audit);
  progress('write-canonical');
  writeFileSync(payloadPath, payload);
  writeFileSync(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(markdownPath, markdown);
}
if (!errors.length) progress('complete');

console.log(`# Material input-equivalence audit`);
console.log(`- Parity evidence: ${path.relative(root, parityPath)}`);
console.log(`- Coverage: ${audit.coverage.executedStatic}/${audit.coverage.configuredStatic} static, ${audit.coverage.executedInteractions}/${audit.coverage.configuredInteractions} interaction`);
console.log(`- Unique differences: ${audit.summary.uniqueStyleDifferences}`);
console.log(`- Occurrences: ${audit.summary.totalStyleDifferenceOccurrences}`);
console.log(`- Source findings: ${audit.summary.sourceFindings}`);
console.log(`- Input equivalent: ${audit.summary.inputEquivalent ? 'yes' : 'no'}`);
if (errors.length > 0) {
  console.error(errors.map((error) => `- ERROR: ${error}`).join('\n'));
  process.exitCode = 1;
}
