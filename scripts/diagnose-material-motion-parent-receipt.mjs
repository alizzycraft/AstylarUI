import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { loadGapReviewMembership, recordGapReviewMembership } from './bind-material-gap-review-membership.mjs';
import { bindPendingMotionCapture } from './bind-material-pending-motion-capture.mjs';

// Diagnose a stale receipt without changing any original verifier, receipt,
// canonical classification or input consumed by the live full-harness run.
const args = process.argv.slice(2);
assert.ok(!args.length || args.length === 1 && args[0] === '--check');
const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const revision = 'a98ef5d70022f3b36c1d70f5edd73f20061a1732';
const surveyFile = 'docs/material-owner-gap-input-survey.json';
const cssomFile = 'docs/material-motion-cssom-capture-proof.json';
const bindingFile = 'docs/material-pending-motion-capture-binding.json';
const verifier = 'scripts/verify-material-motion-cssom-capture.mjs';
const auditModule = 'tests/material-parity/input-equivalence-audit.mjs';
const original = file => JSON.parse(execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 16 * 1024 * 1024 }));
const saved = file => JSON.parse(readFileSync(file));
const survey = saved(surveyFile), previousSurvey = original(surveyFile), previousCssom = original(cssomFile), cssom = saved(cssomFile);
const protectedFiles = [surveyFile, cssomFile, bindingFile, verifier,
  'docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz', 'docs/material-input-equivalence-audit.md'];
const before = protectedFiles.map(file => hash(readFileSync(file)));
const normalizeSource = text => text.replaceAll('\r\n', '\n');
for (const s of survey.sourceFingerprints) assert.equal(hash(normalizeSource(readFileSync(s.file, 'utf8'))), s.sha256);
const projectedSurvey = structuredClone(survey);
const changedFingerprints = projectedSurvey.sourceFingerprints.filter((s, i) => {
  const old = previousSurvey.sourceFingerprints[i]; assert.equal(s.file, old.file); return s.sha256 !== old.sha256;
});
assert.equal(changedFingerprints.length, 1); assert.equal(changedFingerprints[0].file, auditModule);
projectedSurvey.sourceFingerprints = previousSurvey.sourceFingerprints;
assert.deepEqual(projectedSurvey, previousSurvey, 'survey findings changed beyond the single source receipt');
assert.deepEqual(cssom, previousCssom, 'saved CSSOM proof changed since the historical baseline');
assert.notEqual(cssom.parent.sha256, hash(readFileSync(surveyFile)), 'expected original stale-parent failure no longer exists');

// Preserve all browser/source assertions, replacing only the output sink. AST
// relocation lets the unchanged verifier execute from stdin with no temp file.
const source = readFileSync(verifier, 'utf8');
const sink = "  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\\r\\n', '\\n'), output);\n  else writeFileSync(target, output);\n  console.log(JSON.stringify({ cases: records.length, browser: report.browser, assertionsPassed: true, mode: args[0] ?? 'generate' }));";
assert.equal(source.split(sink).length, 2);
const replacement = '  console.log(JSON.stringify(report));';
const augmented = source.replace(sink, replacement);
assert.equal(augmented.replace(replacement, sink), source);
const parse = text => ts.createSourceFile(verifier, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const parsed = parse(augmented);
assert.equal(parsed.parseDiagnostics.length, 0);
let relocated = augmented;
for (const n of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  const s = n.moduleSpecifier; if (!s.text.startsWith('.')) continue;
  const url = new URL(s.text, pathToFileURL(path.resolve(verifier))).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const moved = parse(relocated); assert.equal(moved.parseDiagnostics.length, 0); assert.equal(moved.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const text = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(text(parsed.statements[i], parsed), text(moved.statements[i], moved));
}
const fresh = JSON.parse(execFileSync(process.execPath, ['--input-type=module'], { input: relocated, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
assert.deepEqual(fresh.parent, { file: surveyFile, sha256: hash(readFileSync(surveyFile)) });
const compareReplay = candidate => {
  assert.deepEqual({ ...candidate, parent: cssom.parent, browser: cssom.browser }, cssom,
    'browser or original-case evidence changed beyond parent receipt and recorded browser version');
};
compareReplay(fresh);
const inputs = await loadGapReviewMembership(), membership = recordGapReviewMembership(inputs);
assert.deepEqual(membership, saved('docs/material-gap-review-membership.json'));
const rows = bindPendingMotionCapture(membership, fresh);
assert.deepEqual(rows, saved(bindingFile).rows, 'original pending-motion memberships or conclusions changed');
const mutations = [
  x => { x.originalDialogCases.pop(); },
  x => { x.originalDialogCases[0].cssText = 'transition: none'; },
  x => { x.originalDialogCases[0].scalarRetainsCssText = true; },
  x => { x.originalDialogCases[0].inputTrees.reference.sha256 = 'changed'; },
  x => { x.cases[0].computed.transitionDuration = '1s'; },
  x => { x.cases.reverse(); },
  x => { x.assertionsPassed = false; },
];
for (const mutate of mutations) { const changed = structuredClone(fresh); mutate(changed); assert.throws(() => compareReplay(changed)); }
assert.deepEqual(protectedFiles.map(file => hash(readFileSync(file))), before);
const report = { schemaVersion: 1, kind: 'pending-motion-parent-receipt-diagnostic', baselineRevision: revision,
  originalFailureRetained: true, protectedFilesUnchanged: true,
  changedSource: { file: auditModule, previous: previousSurvey.sourceFingerprints.find(s => s.file === auditModule).sha256,
    current: changedFingerprints[0].sha256 },
  unchangedSurveyProjectionSha256: digest(projectedSurvey),
  parentReceipt: { saved: cssom.parent, current: fresh.parent },
  browser: { saved: cssom.browser, fresh: fresh.browser },
  unchangedCssomProjectionSha256: digest(cssom), verifier: { file: verifier, sha256: hash(normalizeSource(source)), outputSinkOnlyAdapted: true },
  browserControls: fresh.cases.length, originalDialogCases: fresh.originalDialogCases.length,
  unchangedPendingGroups: rows.length, unchangedPendingObservations: rows.reduce((n, r) => n + r.observations.length, 0),
  unchangedBindingRowsSha256: digest(rows), rejectionControls: mutations.length,
  canonicalIntegration: false, inputEquivalent: false, originalResolvedMotionVerified: false, renderingEquivalent: false,
  limitation: 'Read-only replay diagnoses a stale receipt and conserves all original findings. It does not repair the original failing test or prove renderer, computed-motion, or gap-layout parity.' };
const output = JSON.stringify(report, null, 2) + '\n', target = 'docs/material-motion-parent-receipt-diagnostic.json';
if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(target, output);
console.log(JSON.stringify(report));
