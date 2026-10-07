import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { verifyCaseIndexAssertionMigration } from '../tests/material-parity/case-index-assertion-migration.mjs';
import { verifyOverlayMappingAuditProjection } from '../tests/material-parity/historical-audit-module-source.mjs';
import { readGapSurveySource } from '../tests/material-parity/gap-survey-source-replay.mjs';

// Authenticate source applicability without replacing historical receipts.
// The CLI additionally replays the original complete root index and report tests.
const hash = value => createHash('sha256').update(value).digest('hex');
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const indexFile = 'docs/material-root-initial-style-audit.json';
export function verifyRootInitialSourceApplicability(saved, { sourcesOnly = false,
  readSource = file => readFileSync(file) } = {}) {
const baseline = execFileSync('git', ['rev-parse', '4dc770a'], { encoding: 'utf8' }).trim();
const previous = execFileSync('git', ['show', `${baseline}:${moduleFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(previous.replaceAll('\r\n', '\n')), saved.sourceFingerprints.find(s => s.file === moduleFile).sha256);
const parse = source => ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = parse(readSource(moduleFile).toString()), prior = parse(previous);
const producerProjection = verifyOverlayMappingAuditProjection(
  saved.sourceFingerprints.find(s => s.file === moduleFile), readSource(moduleFile), Buffer.from(previous));
const selectedFunctions = ['collectFullTreeInventory', 'collectReferenceContextGaps', 'caseKey'];
const functionText = (ast, name) => {
  const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.equal(matches.length, 1, name); return matches[0].getText(ast);
};
for (const name of selectedFunctions) assert.equal(functionText(current, name), functionText(prior, name), name);
const contextDeclaration = ast => {
  const statements = ast.statements.filter(n => ts.isVariableStatement(n) &&
    n.declarationList.declarations.some(d => ts.isIdentifier(d.name) && d.name.text === 'referenceContextProperties'));
  assert.equal(statements.length, 1); return statements[0].getText(ast);
};
assert.equal(contextDeclaration(current), contextDeclaration(prior));
const auditTestFile = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const priorTest = execFileSync('git', ['show', `${baseline}:${auditTestFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(priorTest.replaceAll('\r\n', '\n')), saved.sourceFingerprints.find(s => s.file === auditTestFile).sha256);
// First conserve the complete historical suite through the inventory-only
// revision, then reuse the existing independently tested migration proof.
const intermediateTest = execFileSync('git', ['show', `6833850:${auditTestFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(intermediateTest.replaceAll('\r\n', '\n')), 'efc291793bbc87b3630b7a9821325cc1c3b3aeb6326385444f1b0ac8ae57d4d4');
let intermediateProjection = intermediateTest.replaceAll('\r\n', '\n');
for (const line of ["import { execFileSync } from 'node:child_process';\n", "import ts from 'typescript';\n"]) {
  assert.equal(intermediateProjection.split(line).length, 2); intermediateProjection = intermediateProjection.replace(line, '');
}
const priorTestAst = parse(priorTest), currentTestAst = parse(intermediateProjection);
assert.equal(priorTestAst.statements.length, currentTestAst.statements.length);
const changedTestStatements = [];
for (let i = 0; i < priorTestAst.statements.length; i++) {
  if (priorTestAst.statements[i].getText(priorTestAst) === currentTestAst.statements[i].getText(currentTestAst)) continue;
  const statement = currentTestAst.statements[i];
  assert.ok(ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression));
  const call = statement.expression;
  assert.equal(call.expression.getText(currentTestAst), 'test');
  assert.ok(ts.isStringLiteral(call.arguments[0])); changedTestStatements.push(call.arguments[0].text);
}
assert.deepEqual(changedTestStatements, ['records source fingerprints and actual visual acceptance fields']);
const testProjection = sourcesOnly ? { currentSuiteConservationProven: false, migrationReplayPending: true }
  : verifyCaseIndexAssertionMigration(intermediateTest, readSource(auditTestFile));

const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
const oldPolicy = execFileSync('git', ['show', `${baseline}:${policyFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(oldPolicy.replaceAll('\r\n', '\n')), saved.sourceFingerprints.find(s => s.file === policyFile).sha256);
// Preserve the original 132-to-145 projection. Authenticate the later exact
// 145-to-148 extension first rather than repinning the historical receipt.
const stagePolicy = execFileSync('git', ['show', `aee5b612:${policyFile}`],
  { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
assert.equal(hash(stagePolicy.replaceAll('\r\n', '\n')),
  '31da603b0edb345c1a0db556d39814b796131cc588b7b9d94628b4e25d2d7024');
let livePolicy = readSource(policyFile).toString().replaceAll('\r\n', '\n');
const disabledAst = parse(livePolicy);
const disabledDefinitions = disabledAst.statements.find(n => ts.isVariableStatement(n)
  && n.declarationList.declarations[0].name.text === 'sourceAuditDefinitions')
  .declarationList.declarations[0].initializer.arguments[0].elements;
assert.equal(disabledDefinitions.length, 150);
const disabledDefinition = disabledDefinitions.at(-1);
assert.equal(hash(disabledDefinition.getText(disabledAst)),
  '7626e81967618fd12be6b2c0b78f490b8b95742be323cc58587c22ab94fa3e11',
  'exact disabled radio focus finding changed');
const disabledStart = livePolicy.lastIndexOf('\n', disabledDefinition.getStart(disabledAst)) + 1;
const disabledEnd = livePolicy.indexOf('\n', disabledDefinition.end) + 1;
livePolicy = livePolicy.slice(0, disabledStart) + livePolicy.slice(disabledEnd);
const focusAst = parse(livePolicy);
const focusDefinitions = focusAst.statements.find(n => ts.isVariableStatement(n)
  && n.declarationList.declarations[0].name.text === 'sourceAuditDefinitions')
  .declarationList.declarations[0].initializer.arguments[0].elements;
assert.equal(focusDefinitions.length, 149);
const focusDefinition = focusDefinitions.at(-1);
assert.equal(hash(focusDefinition.getText(focusAst)),
  'fff7c05ddd2b4f2479189e74282922824dd23859cb2bed81c24b3680d0e7915f',
  'exact progress focus finding changed');
const focusStart = livePolicy.lastIndexOf('\n', focusDefinition.getStart(focusAst)) + 1;
const focusEnd = livePolicy.indexOf('\n', focusDefinition.end) + 1;
const preFocusPolicy = livePolicy.slice(0, focusStart) + livePolicy.slice(focusEnd);
assert.equal(hash(preFocusPolicy), 'f3aee82479768601bc520cbf754540815d7704d496989cd8b5c614bd4646cdbd',
  'complete 148-definition predecessor policy remains unchanged');
const stageAst = parse(stagePolicy), liveAst = parse(preFocusPolicy);
assert.equal(liveAst.statements.length, stageAst.statements.length);
let laterDefinitions;
for (let i = 0; i < stageAst.statements.length; i++) {
  const before = stageAst.statements[i], after = liveAst.statements[i];
  if (before.getText(stageAst) === after.getText(liveAst)) continue;
  assert.ok(ts.isVariableStatement(before) && ts.isVariableStatement(after));
  assert.equal(before.declarationList.declarations[0].name.text, 'sourceAuditDefinitions');
  assert.equal(after.declarationList.declarations[0].name.text, 'sourceAuditDefinitions');
  assert.equal(hash(after.getText(liveAst)),
    'd3fa95deb59c1bd2009564f2d10a2c2e1e2fc2b334c3b5d76c7bf289aa2c2a0a',
    'later policy extension changed');
  const elements = n => n.declarationList.declarations[0].initializer.arguments[0].elements;
  const priorDefinitions = elements(before);
  laterDefinitions = elements(after);
  assert.deepEqual([priorDefinitions.length, laterDefinitions.length], [145, 148]);
  const id = n => n.arguments[0].properties.find(p => p.name?.text === 'id').initializer.text;
  assert.deepEqual(laterDefinitions.slice(0, 2).map(id), [
    'core-public-semantic-subset-omits-accessibility-only-hiding',
    'fixture-list-content-wrappers-and-row-sizing-substituted']);
  assert.equal(id(laterDefinitions.at(-1)), 'core-svg-dimensionless-image-upload-not-adapted');
  assert.equal(new Set(laterDefinitions.map(id)).size, 148);
  assert.deepEqual(laterDefinitions.slice(2, -1).map(n => n.getText(liveAst)),
    priorDefinitions.map(n => n.getText(stageAst)), 'all 145 prior definition bodies and order remain');
}
assert.equal(laterDefinitions?.length, 148, 'the explicit later policy extension is required');
// The checkpoint also adds one exact evidence receipt to an existing finding.
// Project only that addition away for the original 132-to-145 assertion.
const tooltipReceipt = ",\n      { file: 'artifacts/material-parity/tooltip-live-ownership-cycles-verified-20261005.log', sha256: 'caface4e738b983984d97660263a44c9d116e0b78b94df203e9b96e4d4b5f8fc' }";
assert.equal(stagePolicy.split(tooltipReceipt).length, 2);
assert.equal(hash(readSource('artifacts/material-parity/tooltip-live-ownership-cycles-verified-20261005.log')),
  'caface4e738b983984d97660263a44c9d116e0b78b94df203e9b96e4d4b5f8fc');
const policyBefore = parse(oldPolicy), policyAfter = parse(stagePolicy.replace(tooltipReceipt, ''));
assert.equal(policyBefore.statements.length, policyAfter.statements.length);
let oldDefinitions, newDefinitions;
for (let i = 0; i < policyBefore.statements.length; i++) {
  const before = policyBefore.statements[i], after = policyAfter.statements[i];
  if (before.getText(policyBefore) === after.getText(policyAfter)) continue;
  assert.ok(ts.isVariableStatement(before) && ts.isVariableStatement(after));
  const name = before.declarationList.declarations[0].name.text;
  assert.equal(after.declarationList.declarations[0].name.text, name);
  const expected = { inputDifferenceClassifications: '68ba288a713e172819ff5c03e0b2bcad29d3f23a20a8212ae841539a002de5fb',
    sourceAuditDefinitions: '9fbc01ddcb846d0d040fd744fb7d9976ac5f020ec510277dca42811b0311777c' };
  assert.ok(Object.hasOwn(expected, name), 'unreviewed policy statement changed');
  assert.equal(hash(after.getText(policyAfter)), expected[name], 'policy additions changed');
  const elements = n => n.declarationList.declarations[0].initializer.arguments[0].elements;
  if (name === 'inputDifferenceClassifications') {
    assert.deepEqual(elements(after).map(n => n.text).filter(v => v !== 'documented-limitation'), elements(before).map(n => n.text));
  } else {
    oldDefinitions = elements(before); newDefinitions = elements(after);
    const id = n => n.arguments[0].properties.find(p => p.name?.text === 'id').initializer.text;
    assert.equal(new Set(newDefinitions.map(id)).size, newDefinitions.length);
    const retained = newDefinitions.filter(n => oldDefinitions.some(old => id(old) === id(n)));
    assert.deepEqual(retained.map(n => n.getText(policyAfter)), oldDefinitions.map(n => n.getText(policyBefore)));
  }
}
assert.deepEqual([oldDefinitions.length, newDefinitions.length], [132, 145]);
const border = saved.sourceFingerprints.find(s => s.file === 'tests/material-parity/border-initial-input-evidence.mjs');
assert.equal(hash(readGapSurveySource(border, { current: file => readSource(file).toString() })
  .replaceAll('\r\n', '\n')), border.sha256);
const proofFile = 'tests/material-parity/root-initial-style-evidence.spec.mjs';
const proofDescriptor = saved.sourceFingerprints.find(s => s.file === proofFile);
let proofSource = readSource(proofFile).toString().replaceAll('\r\n', '\n');
const proofImport = "import { verifyRootInitialSourceApplicability } from '../../scripts/diagnose-material-root-initial-receipt.mjs';\n";
const proofGuard = "  const applicability = verifyRootInitialSourceApplicability(durable);\n" +
  "  assert.equal(applicability.testProjection.allOtherStatementsConserved, true);\n" +
  "  assert.equal(applicability.producerProjection.normalizationTransition.historicalAndCurrentColorValuesEquivalent, false);";
assert.equal(proofSource.split(proofImport).length, 2);
assert.equal(proofSource.split(proofGuard).length, 2);
proofSource = proofSource.replace(proofImport, '').replace(proofGuard,
  "  for (const source of durable.sourceFingerprints)\n" +
  "    assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\\r\\n', '\\n')), source.sha256, source.file);");
assert.equal(hash(proofSource), proofDescriptor.sha256, 'entire root-initial suite conservation');
for (const descriptor of saved.sourceFingerprints) {
  if ([moduleFile, auditTestFile, policyFile, border.file, proofFile].includes(descriptor.file)) continue;
  assert.equal(hash(readSource(descriptor.file).toString().replaceAll('\r\n', '\n')),
    descriptor.sha256, descriptor.file);
}
return { baseline, selectedFunctions, producerProjection, changedTestStatements, testProjection };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
const sourcesOnly = process.argv.length === 3 && process.argv[2] === '--sources-only';
assert.ok(process.argv.length === 2 || sourcesOnly, 'Usage: node scripts/diagnose-material-root-initial-receipt.mjs [--sources-only]');
const saved = JSON.parse(readFileSync(indexFile));
const { baseline, selectedFunctions, producerProjection, changedTestStatements, testProjection } =
  verifyRootInitialSourceApplicability(saved, { sourcesOnly });
const auditTestFile = 'tests/material-parity/input-equivalence-audit.spec.mjs';
const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';

if (sourcesOnly) {
  console.log(JSON.stringify({ kind: 'root-initial-style-source-applicability-diagnostic', baseline,
    unchangedInventoryFunctions: selectedFunctions, unchangedReferenceContextDeclaration: true,
    producerProjection, intermediateSuiteChangedStatements: changedTestStatements, testProjection,
    policyProjection: { originalDefinitions: 132, historicalProjectedDefinitions: 145, preFocusDefinitions: 148, preDisabledRadioDefinitions: 149, currentDefinitions: 150, allOriginalDefinitionsConserved: true,
      addedClassification: 'documented-limitation', allOtherPolicyStatementsConserved: true },
    borderSelectorTransitionAuthenticated: true, historicalReceiptsRewritten: false,
    caseReplayExecuted: false, canonicalClassificationVerified: false, renderingEquivalent: false, evidenceFilesWritten: false }));
  process.exit(0);
}

const file = 'tests/material-parity/root-initial-style-evidence.spec.mjs';
const source = readFileSync(file, 'utf8');
const anchor = "  const applicability = verifyRootInitialSourceApplicability(durable);\n" +
  "  assert.equal(applicability.testProjection.allOtherStatementsConserved, true);\n" +
  "  assert.equal(applicability.producerProjection.normalizationTransition.historicalAndCurrentColorValuesEquivalent, false);";
const normalized = source.replaceAll('\r\n', '\n');
assert.equal(normalized.split(anchor).length, 2, 'exact authenticated source-applicability guard');
const insertion = `
  for (const p of proofs) {
    assert.equal(p.candidatePath[1].comparison[p.property], undefined);
    assert.equal(p.classification, 'parity-harness-defect');
    for (const flag of ['computedCandidateVerified', 'descendantConsumersVerified', 'finalRasterVerified']) assert.equal(p[flag], false);
  }
  const diagnosticChanges = durable.sourceFingerprints.flatMap(s => {
    const current = hash(readFileSync(s.file, 'utf8').replaceAll('\\r\\n', '\\n'));
    return current === s.sha256 ? [] : [{ file: s.file, previous: s.sha256, current }];
  });
  assert.deepEqual(diagnosticChanges.map(s => s.file), ${JSON.stringify([moduleFile, auditTestFile, file, 'tests/material-parity/border-initial-input-evidence.mjs', policyFile])});
  const { sourceFingerprints: diagnosticReceipts, ...diagnosticPayload } = durable;
  console.log(JSON.stringify({ kind: 'root-initial-style-source-applicability-replay',
    source: ${JSON.stringify(file)}, sourceSha256: ${JSON.stringify(hash(normalized))}, baseline: ${JSON.stringify(baseline)},
    unchangedFunctions: ${JSON.stringify(selectedFunctions)},
    changedTestStatements: ${JSON.stringify(changedTestStatements)},
    producerProjection: ${JSON.stringify(producerProjection)},
    testProjection: ${JSON.stringify(testProjection)},
    policyProjection: { originalDefinitions: 132, historicalProjectedDefinitions: 145, preFocusDefinitions: 148, preDisabledRadioDefinitions: 149, currentDefinitions: 150, allOriginalDefinitionsConserved: true,
      addedClassification: 'documented-limitation', allOtherPolicyStatementsConserved: true },
    cases: entries.length, properties: Object.keys(rootInitialStyleValues).length,
    observations: proofs.length, groups: durable.groups.length,
    changedSources: diagnosticChanges, unchangedNonReceiptSha256: hash(JSON.stringify(diagnosticPayload)),
    originalMembershipSha256: hash(JSON.stringify(actual)),
    completeOriginalIndexVerified: true, subsequentAssertionsVerified: true,
    originalAssertionRetained: true, evidenceFilesWritten: false, renderingEquivalent: false }));
`;
const augmented = normalized.replace(anchor, insertion + anchor);
assert.equal(augmented.replace(insertion, ''), normalized);
const parsed = parse(augmented);
assert.equal(parsed.parseDiagnostics.length, 0);
let relocated = augmented;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  const specifier = node.moduleSpecifier;
  if (specifier.text.startsWith('node:')) continue;
  assert.ok(specifier.text.startsWith('.'), 'review new package imports');
  const url = new URL(specifier.text, pathToFileURL(path.resolve(file))).href;
  relocated = relocated.slice(0, specifier.getStart(parsed)) + JSON.stringify(url) + relocated.slice(specifier.end);
}
const moved = parse(relocated);
assert.equal(moved.parseDiagnostics.length, 0);
assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const omitPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(omitPath(parsed.statements[i], parsed), omitPath(moved.statements[i], moved));
}
await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
}
