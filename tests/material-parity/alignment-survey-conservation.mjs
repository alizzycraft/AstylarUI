import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { bindOwnerCaretNormalization } from './owner-caret-source-binding.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { conserveDisabledInkGuard } from './disabled-ink-source-transition.mjs';
import { restoreMappingReadAdapterSource } from './audit-evidence-session.mjs';

export const alignmentSurveyBaseline = '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0';
const auditFile = 'tests/material-parity/input-equivalence-audit.mjs';
const helperImport = '../tests/material-parity/alignment-survey-conservation.mjs';
const helperName = 'conserveAlignmentSurveySnapshot';
const hash = x => createHash('sha256').update(x).digest('hex');
const normalized = x => x.toString('utf8').replaceAll('\r\n', '\n');
const definitions = {
  'docs/material-vertical-align-population.json': ['scripts/audit-material-vertical-align-population.mjs', 'collectVerticalAlignPopulation', 'sourceFingerprints'],
  'docs/material-text-align-ancestry.json': ['scripts/audit-material-text-align-ancestry.mjs', 'collectTextAlignAncestry', 'sourceFingerprints'],
  'docs/material-ltr-alignment-review.json': ['scripts/audit-material-ltr-alignment.mjs', 'collectLtrAlignmentReview', 'sourceFiles'],
  'docs/material-remaining-text-alignment.json': ['scripts/audit-remaining-text-alignment.mjs', 'collectRemainingTextAlignment', 'sourceFingerprints'],
};
export const alignmentAuditImports = new Map([
  ['./overlay-surface-audit-source-binding.mjs', ['collectOverlaySurfaceAuditInputs', 'applyOverlaySurfaceAuditRows',
    'validateOverlaySurfaceAuditInputs', 'validateOverlaySurfaceAuditClassifications', 'overlaySurfaceAttributions']],
  ['./chip-paint-audit-source-binding.mjs', ['collectChipPaintAuditInputs', 'applyChipPaintAuditRows',
    'validateChipPaintAuditInputs', 'validateChipPaintAuditClassifications', 'chipPaintAttribution']],
  ['./position-followup-audit-source-binding.mjs', ['collectPositionFollowupAuditInputs', 'applyPositionFollowupAuditRows',
    'validatePositionFollowupAuditInputs', 'validatePositionFollowupAuditClassifications', 'positionFollowupAttribution']],
  ['./position-composition-audit-source-binding.mjs', ['collectPositionAuditInputs', 'applyPositionAuditRows', 'validatePositionAuditInputs',
    'validatePositionAuditClassifications', 'positionCompositionAttribution']],
  ['./visibility-audit-source-binding.mjs', ['collectVisibilityAuditInputs', 'applyVisibilityAuditRows', 'validateVisibilityAuditInputs',
    'validateVisibilityAuditClassifications', 'visibilityObservationAttribution']],
  ['./root-background-classification-preparation.mjs', ['collectRootBackgroundAuditInputs', 'validateRootBackgroundEvidence', 'rootBackgroundClassificationContexts',
    'classifyRootBackgroundInput', 'validateRootBackgroundClassifications', 'rootBackgroundAttribution']],
  ['./reviewed-source-batch-audit-source-binding.mjs', ['collectReviewedSourceBatchAuditInputs', 'validateReviewedSourceBatchAuditInputs',
    'reviewedSourceBatchClassificationContexts', 'classifyReviewedSourceBatchInput', 'validateReviewedSourceBatchClassifications', 'reviewedSourceBatchAttributions']],
  ['./alignment-font-audit-source-binding.mjs', ['collectAlignmentFontAuditInputs', 'validateAlignmentFontAuditInputs',
    'alignmentFontClassificationContexts', 'classifyAlignmentFontInput', 'validateAlignmentFontClassifications', 'alignmentFontAttributions']],
  ['./text-align-audit-source-binding.mjs', ['collectTextAlignAuditInputs', 'validateTextAlignAuditInputs',
    'textAlignClassificationContexts', 'classifyTextAlignInput', 'validateTextAlignClassifications', 'textAlignAttributions']],
  ['./ltr-alignment-audit-source-binding.mjs', ['collectLtrAlignmentAuditInputs', 'validateLtrAlignmentAuditInputs',
    'ltrAlignmentClassificationContexts', 'classifyLtrAlignmentInput', 'validateLtrAlignmentClassifications', 'ltrAlignmentAttribution']],
]);
const orchestration = new Set(['buildMaterialInputAudit', 'validateMaterialInputAudit', 'renderMaterialInputAuditMarkdown',
  'collectStyleDiscrepancies', 'sourceFingerprints', 'focusedProofInventory']);
const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
function parse(file, source) {
  const ast = ts.createSourceFile(file, normalized(source), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0); return ast;
}
function exactNamedImport(node, names) {
  assert.ok(node.importClause && !node.importClause.name && !node.importClause.isTypeOnly);
  assert.ok(ts.isNamedImports(node.importClause.namedBindings));
  assert.deepEqual(node.importClause.namedBindings.elements.map(n => {
    assert.ok(n.propertyName === undefined, 'import aliases are not permitted'); return n.name.text;
  }), names);
}

// Permit reviewed orchestration and the separately authenticated color-precision
// correction. All other retained statements must match; this does not assert
// that historical/current normalized color values are equivalent.
export function verifyAlignmentAuditProjection(previous, current) {
  const historicalNormalization = { ...preciseAuditNormalization,
    sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
  bindOwnerCaretNormalization(normalized(previous), historicalNormalization);
  bindPreciseAuditNormalization(normalized(current));
  const disabledInkGuardTransition = conserveDisabledInkGuard(current);
  const project = (source, changed) => {
    const ast = parse(auditFile, source), removed = new Set(), imports = new Set(), retained = [];
    for (const node of ast.statements) {
      if (ts.isFunctionDeclaration(node) && node.name?.text === 'normalizeColor') continue;
      if (ts.isFunctionDeclaration(node) && orchestration.has(node.name?.text)) {
        assert.ok(!removed.has(node.name.text)); removed.add(node.name.text); continue;
      }
      if (changed && ts.isImportDeclaration(node) && alignmentAuditImports.has(node.moduleSpecifier.text)) {
        assert.ok(!imports.has(node.moduleSpecifier.text)); imports.add(node.moduleSpecifier.text);
        exactNamedImport(node, alignmentAuditImports.get(node.moduleSpecifier.text)); continue;
      }
      const visit = n => {
        if (ts.isIdentifier(n)) assert.ok(!orchestration.has(n.text), 'mapping reaches altered orchestration');
        ts.forEachChild(n, visit);
      };
      visit(node); retained.push(printer.printNode(ts.EmitHint.Unspecified, node, ast));
    }
    assert.deepEqual([...removed].sort(), [...orchestration].sort());
    return retained;
  };
  const before = project(previous, false), after = project(disabledInkGuardTransition.source, true);
  assert.equal(hash(JSON.stringify(after)), hash(JSON.stringify(before)), 'mapping or normalization changed');
  return { retainedStatements: before.length, retainedStatementsSha256: hash(JSON.stringify(before)),
    disabledInkGuardTransition: Object.fromEntries(Object.entries(disabledInkGuardTransition).filter(([key]) => key !== 'source')),
    normalizationTransition: { historical: historicalNormalization, current: preciseAuditNormalization,
      colorValuesEquivalent: false } };
}

// Collector changes are restricted to one exact import and wrapping its final
// object return. Unwrap that call, then compare the entire parsed source.
export function verifyAlignmentCollectorProjection(reportFile, previous, current) {
  const definition = definitions[reportFile]; assert.ok(definition);
  const [file, functionName] = definition, old = parse(file, previous), now = parse(file, current);
  let imports = 0, wraps = 0;
  const transformed = ts.transform(now, [context => {
    const visit = node => {
      if (ts.isImportDeclaration(node) && node.moduleSpecifier.text === helperImport) {
        exactNamedImport(node, [helperName]); imports++; return undefined;
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === helperName) {
        assert.equal(node.arguments.length, 2); assert.ok(ts.isStringLiteral(node.arguments[0]));
        assert.equal(node.arguments[0].text, reportFile); assert.ok(ts.isObjectLiteralExpression(node.arguments[1]));
        assert.ok(ts.isReturnStatement(node.parent)); assert.ok(ts.isBlock(node.parent.parent));
        const owner = node.parent.parent.parent;
        assert.ok(ts.isFunctionDeclaration(owner) && owner.name?.text === functionName);
        assert.ok(owner.body.statements.at(-1) === node.parent, 'conservation must wrap the final return'); wraps++;
        return node.arguments[1];
      }
      return ts.visitEachChild(node, visit, context);
    };
    return root => ts.visitNode(root, visit);
  }]);
  try {
    assert.equal(imports, 1); assert.equal(wraps, 1);
    assert.equal(hash(printer.printFile(transformed.transformed[0])), hash(printer.printFile(old)),
      'collector changed beyond final historical-receipt conservation');
  } finally { transformed.dispose(); }
  return { file, functionName, unchangedCollectorBody: true };
}

export function verifyAlignmentSurveyConservation(reportFile, current, {
  readCurrent = file => readFileSync(file),
  readBaseline = file => execFileSync('git', ['show', `${alignmentSurveyBaseline}:${file}`], { maxBuffer: 48 * 1024 * 1024 }),
} = {}) {
  const definition = definitions[reportFile]; assert.ok(definition, 'unreviewed survey');
  const originalText = normalized(readBaseline(reportFile));
  assert.equal(hash(normalized(readCurrent(reportFile))), hash(originalText), 'original survey artifact changed');
  const original = JSON.parse(originalText), field = definition[2];
  const projected = JSON.parse(JSON.stringify(current)), receipts = projected[field], oldReceipts = original[field];
  assert.deepEqual(receipts.map(r => r.file), oldReceipts.map(r => r.file));
  const changes = [];
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i], old = oldReceipts[i];
    assert.deepEqual(Object.keys(receipt).sort(), ['file', 'sha256']);
    const currentBytes = readCurrent(receipt.file); assert.equal(hash(normalized(currentBytes)), receipt.sha256);
    if (receipt.sha256 === old.sha256) continue;
    const oldBytes = readBaseline(receipt.file); assert.equal(hash(normalized(oldBytes)), old.sha256);
    let proof;
    if (receipt.file === auditFile) proof = verifyAlignmentAuditProjection(oldBytes, currentBytes);
    else if (receipt.file === 'tests/material-parity/generated-node-mapping-evidence.mjs') {
      assert.equal(restoreMappingReadAdapterSource(old, currentBytes), normalized(oldBytes));
      proof = { exactReaderImportTransition: true, completeMappingSourceConserved: true };
    }
    else {
      const sourceReport = Object.keys(definitions).find(key => definitions[key][0] === receipt.file);
      assert.ok(sourceReport, `unreviewed changed source: ${receipt.file}`);
      proof = verifyAlignmentCollectorProjection(sourceReport, oldBytes, currentBytes);
    }
    changes.push({ file: receipt.file, historicalSha256: old.sha256, currentSha256: receipt.sha256, proof });
    receipts[i] = old;
  }
  assert.equal(hash(JSON.stringify(projected)), hash(JSON.stringify(original)), 'survey observations or non-source metadata changed');
  return { report: original, evidence: { reportFile, baseline: alignmentSurveyBaseline,
    unchangedHistoricalReportSha256: hash(originalText), sourceChanges: changes,
    allObservationsUnchanged: true, historicalReceiptsPreserved: true } };
}

// Returns the original snapshot only AFTER replaying and comparing every fresh
// observation. Its source receipts remain historical; they are not current hashes.
export function conserveAlignmentSurveySnapshot(reportFile, current) {
  return verifyAlignmentSurveyConservation(reportFile, current).report;
}
