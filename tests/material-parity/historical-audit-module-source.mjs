import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { isDeepStrictEqual } from 'node:util';

// The 91-state capture predates tooltip wrapping classification. Its source
// receipt describes the producer then, not a promise that today's audit module
// has identical bytes. Never rewrite that receipt to a current-source digest.
export const originalOverlayAuditSourceCommit = '65487aeba6a26f9715f302f92b4ee454161a94ef';
export const originalOverlayAuditSourceFile = 'tests/material-parity/input-equivalence-audit.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const mappingAuditRevision = '4dc770a';
// The integration changes audit orchestration, not any mapping implementation.
// Verify every other statement exactly and reject references from retained
// statements into the changed functions. This is not a blanket hash exemption.
export function verifyOverlayMappingAuditProjection(recorded, currentBytes, historicalBytes) {
  const old = historicalBytes.toString('utf8').replaceAll('\r\n', '\n');
  const current = currentBytes.toString('utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(old), recorded.sha256, 'Current mapping source historical anchor changed');
  const excluded = new Set(['buildMaterialInputAudit', 'validateMaterialInputAudit', 'renderMaterialInputAuditMarkdown',
    'collectStyleDiscrepancies', 'sourceFingerprints', 'focusedProofInventory']);
  const additions = new Map([
    ['./reviewed-input-audit-source-binding.mjs', ['collectReviewedInputAuditInputs', 'validateReviewedInputAuditInputs',
      'reviewedInputClassificationContexts', 'classifyReviewedInput', 'validateReviewedInputClassifications']],
    ['./reviewed-input-proposal-transition.mjs', ['reviewedInputAttributions']],
    ['./followup-input-audit-source-binding.mjs', ['collectFollowupInputAuditInputs', 'validateFollowupInputAuditInputs',
      'followupInputClassificationContexts', 'classifyFollowupInput', 'validateFollowupInputClassifications']],
    ['./followup-input-proposal-transition.mjs', ['followupInputAttributions']],
    ['./alignment-font-audit-source-binding.mjs', ['collectAlignmentFontAuditInputs', 'validateAlignmentFontAuditInputs',
      'alignmentFontClassificationContexts', 'classifyAlignmentFontInput', 'validateAlignmentFontClassifications', 'alignmentFontAttributions']],
    ['./text-align-audit-source-binding.mjs', ['collectTextAlignAuditInputs', 'validateTextAlignAuditInputs',
      'textAlignClassificationContexts', 'classifyTextAlignInput', 'validateTextAlignClassifications', 'textAlignAttributions']],
    ['./ltr-alignment-audit-source-binding.mjs', ['collectLtrAlignmentAuditInputs', 'validateLtrAlignmentAuditInputs',
      'ltrAlignmentClassificationContexts', 'classifyLtrAlignmentInput', 'validateLtrAlignmentClassifications', 'ltrAlignmentAttribution']],
  ]);
  function project(text, isCurrent) {
    const parsed = ts.createSourceFile(recorded.file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(parsed.parseDiagnostics.length, 0, 'Current mapping source cannot be parsed');
    const removed = new Set(), imports = new Set(), statements = [];
    for (const node of parsed.statements) {
      if (ts.isFunctionDeclaration(node) && excluded.has(node.name?.text)) {
        assert.ok(!removed.has(node.name.text)); removed.add(node.name.text); continue;
      }
      if (isCurrent && ts.isImportDeclaration(node) && additions.has(node.moduleSpecifier.text)) {
        assert.ok(!imports.has(node.moduleSpecifier.text)); imports.add(node.moduleSpecifier.text);
        const clause = node.importClause; assert.ok(clause && !clause.name && !clause.isTypeOnly);
        assert.ok(ts.isNamedImports(clause.namedBindings));
        assert.deepEqual(clause.namedBindings.elements.map(n => { assert.equal(n.propertyName, undefined); return n.name.text; }), additions.get(node.moduleSpecifier.text));
        continue;
      }
      function visit(n) { if (ts.isIdentifier(n)) assert.ok(!excluded.has(n.text), 'Current mapping source reaches changed audit orchestration'); ts.forEachChild(n, visit); }
      visit(node); statements.push(node.getText(parsed));
    }
    assert.deepEqual([...removed].sort(), [...excluded].sort());
    return statements;
  }
  const before = project(old, false), after = project(current, true);
  assert.deepEqual(after, before, 'Current mapping source changed outside reviewed audit orchestration');
  return { file: recorded.file, historicalRevision: mappingAuditRevision, recordedSha256: recorded.sha256,
    currentSha256: hash(current), retainedStatements: before.length, retainedStatementsSha256: hash(JSON.stringify(before)),
    verification: 'all-other-statements-identical-and-no-retained-references-to-changed-orchestration' };
}
export function verifyHistoricalAuditModuleSource(recorded, currentBytes, { root = process.cwd(),
  readRevision = () => execFileSync('git', ['show', `${originalOverlayAuditSourceCommit}:${originalOverlayAuditSourceFile}`],
    { cwd: root, maxBuffer: 4 * 1024 * 1024 }) } = {}) {
  assert.equal(recorded.file, originalOverlayAuditSourceFile);
  assert.match(recorded.sha256, /^[a-f0-9]{64}$/);
  const historicalBytes = readRevision();
  assert.equal(hash(historicalBytes), recorded.sha256, 'Historical audit-module receipt does not match committed source');
  const currentSha256 = hash(currentBytes);
  return { file: recorded.file, recordedSha256: recorded.sha256,
    historicalSourceCommit: originalOverlayAuditSourceCommit, currentSha256,
    exactCurrentSourceMatch: currentSha256 === recorded.sha256,
    scope: 'Historical source receipt only; current mapping behavior requires complete owner-proof replay and negative controls.' };
}

export const originalOverlayMappingSourceCommit = 'cab0cc3cc53b3728bb4022b89e0fe47168c18bae';
export const originalOverlayMappingSourceFile = 'docs/material-overlay-owner-mapping-survey.json';

// A historical capture binds the mapping bytes used then. A metadata refresh
// must neither overwrite that receipt nor waive changed mapping observations.
export function verifyHistoricalOverlayMappingSource(recorded, currentBytes, { root = process.cwd(),
  readRevision = () => execFileSync('git', ['show', `${originalOverlayMappingSourceCommit}:${originalOverlayMappingSourceFile}`],
    { cwd: root, maxBuffer: 8 * 1024 * 1024 }),
  readCurrentSource = file => readFileSync(path.resolve(root, file)),
} = {}) {
  assert.equal(recorded.file, originalOverlayMappingSourceFile);
  assert.match(recorded.sha256, /^[a-f0-9]{64}$/);
  const historicalBytes = readRevision();
  assert.equal(hash(historicalBytes), recorded.sha256, 'Historical overlay mapping receipt does not match committed evidence');
  const historical = JSON.parse(historicalBytes), current = JSON.parse(currentBytes);
  const data = report => {
    const copy = structuredClone(report);
    delete copy.sourceFingerprints;
    delete copy.inputSurvey.sha256;
    return copy;
  };
  assert.deepEqual(data(current), data(historical), 'Current overlay mapping data differs from the recorded historical population');
  assert.deepEqual(current.sourceFingerprints.map(s => s.file), historical.sourceFingerprints.map(s => s.file),
    'Overlay mapping source inventory changed');
  const currentSourceChecks = [];
  for (const source of current.sourceFingerprints) {
    assert.deepEqual(Object.keys(source).sort(), ['file', 'sha256']);
    const sourceBytes = readCurrentSource(source.file);
    if (source.file === originalOverlayAuditSourceFile && hash(sourceBytes.toString('utf8').replaceAll('\r\n', '\n')) !== source.sha256) {
      const anchor = execFileSync('git', ['show', `${mappingAuditRevision}:${source.file}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
      currentSourceChecks.push(verifyOverlayMappingAuditProjection(source, sourceBytes, anchor));
    } else assert.equal(hash(sourceBytes.toString('utf8').replaceAll('\r\n', '\n')), source.sha256,
      `Current mapping source changed: ${source.file}`);
  }
  assert.equal(hash(readCurrentSource(current.inputSurvey.file)), current.inputSurvey.sha256,
    'Current mapping parent binding changed');
  return { mapping: historical, evidence: {
    file: recorded.file, recordedSha256: recorded.sha256, historicalSourceCommit: originalOverlayMappingSourceCommit,
    currentSha256: hash(currentBytes), exactCurrentSourceMatch: hash(currentBytes) === recorded.sha256,
    mappingDataSha256: hash(JSON.stringify(data(historical))), exactMappingDataMatch: true,
    ...(currentSourceChecks.length ? { currentSourceChecks } : {}),
    inputEquivalent: false, renderingEquivalent: false,
    scope: 'Historical mapping bytes are hash-bound to committed evidence. Every current field except source fingerprints and the parent-report digest must match exactly; current sources and parent bytes are separately hash-checked. Complete original/fresh owner-proof replay remains required. This does not assert parent-report semantic or rendering equivalence.',
  } };
}

// Replay today's context first, then preserve the historical proof's lineage
// receipt only if ALL observations and every non-current-source field agree.
// The returned object is explicitly the original snapshot, not a current hash.
export function conserveOriginalOverlayContextSnapshot(context, { root = process.cwd() } = {}) {
  const file = 'docs/material-original-overlay-context-survey.json';
  const original = JSON.parse(execFileSync('git', ['show', `${mappingAuditRevision}:${file}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 }));
  delete original.sourceFingerprints;
  const projected = structuredClone(context);
  assert.equal(projected.historicalAuditSource.currentSha256, hash(readFileSync(path.resolve(root, originalOverlayAuditSourceFile))));
  const sourceChanged = projected.historicalAuditSource.currentSha256 !== original.historicalAuditSource.currentSha256;
  projected.historicalAuditSource.currentSha256 = original.historicalAuditSource.currentSha256;
  const checks = projected.historicalMappingSource.currentSourceChecks;
  if (sourceChanged) assert.equal(checks?.length, 1, 'changed current source requires the exact mapping projection proof');
  if (checks) {
    assert.equal(checks.length, 1);
    const source = JSON.parse(readFileSync(path.resolve(root, originalOverlayMappingSourceFile))).sourceFingerprints.find(s => s.file === originalOverlayAuditSourceFile);
    const current = readFileSync(path.resolve(root, source.file));
    const anchor = execFileSync('git', ['show', `${mappingAuditRevision}:${source.file}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
    assert.deepEqual(checks[0], verifyOverlayMappingAuditProjection(source, current, anchor));
    delete projected.historicalMappingSource.currentSourceChecks;
  }
  assert.deepEqual(projected, original, 'original overlay context data or non-current receipt changed');
  return original;
}

// The shared-dependency boundary correction in 2144373 changes the verifier,
// not the captured font observations. Preserve the historical snapshot only
// after full fresh replay matches it and the current reader is exactly the
// reviewed corrected implementation. Never rewrite its original source receipt.
export function verifyOverlayFontSnapshot(live, historicalBytes, currentReaderBytes) {
  assert.equal(hash(historicalBytes), '3f06636fd36443605c6a5df9667ab159d2abc0a87672bd1546d5aabbfabfa759',
    'historical overlay font snapshot changed');
  const currentSha = hash(currentReaderBytes.toString('utf8').replaceAll('\r\n', '\n'));
  assert.equal(currentSha, 'e94b253c1c51105c785ee361863fc1d58d5b8b7b406911d6853d7b3c5b56016f',
    'overlay reader differs from the reviewed shared-dependency correction');
  const original = JSON.parse(historicalBytes), projected = structuredClone(live);
  const file = 'tests/material-parity/original-overlay-context-survey.mjs';
  const old = original.sources.filter(s => s.file === file), now = projected.sources.filter(s => s.file === file);
  assert.equal(old.length, 1); assert.equal(now.length, 1);
  assert.equal(old[0].sha256, '71422c360dcd115e4ee2f49162f3de882d757435aab1f531840355c7eea32c93');
  assert.equal(now[0].sha256, currentSha);
  now[0].sha256 = old[0].sha256;
  assert.ok(isDeepStrictEqual(projected, original), 'fresh overlay font data or other lineage changed');
  return original;
}

export function conserveOverlayFontInputSnapshot(live) {
  return verifyOverlayFontSnapshot(live, execFileSync('git',
    ['show', '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0:docs/material-overlay-font-inputs.json'],
    { maxBuffer: 8 * 1024 * 1024 }), readFileSync('tests/material-parity/original-overlay-context-survey.mjs'));
}
