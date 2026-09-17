import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { buttonBoxSizingAttribution } from './button-box-sizing-classification.mjs';
import test from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { buttonFlexAttribution } from './button-flex-source-binding.mjs';
import { buttonHostRequestAttribution } from './button-host-request-source-binding.mjs';
import { buttonFixedWidthAttribution } from './button-fixed-width-classification.mjs';
import { selectedButtonInputs } from './button-pill-radius-evidence.mjs';
import { assertLaterGapClassifications } from './owner-gap-integration-conservation.mjs';

const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const baselineCommit = '61659474f71dbf5eb02cae07243adb8fef8aec03';
const priorSource = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, priorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name));
// Execute the actual committed prior pipeline. Only import locations change.
let relocated = priorSource;
for (const node of [...parsed.statements.filter(ts.isImportDeclaration)].reverse()) {
  if (!node.moduleSpecifier.text.startsWith('./')) continue;
  const s = node.moduleSpecifier, url = new URL(s.text, pathToFileURL(path.resolve(moduleFile))).href;
  relocated = relocated.slice(0, s.getStart(parsed)) + JSON.stringify(url) + relocated.slice(s.end);
}
const relocatedFile = ts.createSourceFile(moduleFile, relocated, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(relocatedFile.statements.length, parsed.statements.length);
for (let i = 0; i < parsed.statements.length; i++) {
  const withoutPath = (n, f) => ts.isImportDeclaration(n) ? n.getText(f).replace(n.moduleSpecifier.getText(f), '<import>') : n.getText(f);
  assert.equal(withoutPath(parsed.statements[i], parsed), withoutPath(relocatedFile.statements[i], relocatedFile));
}
const prior = await import(`data:text/javascript;base64,${Buffer.from(relocated).toString('base64')}`);
const scalar = r => [r.family, r.element, r.property, r.reference, r.astylar, r.occurrences, r.cases, r.states];
const hash = b => createHash('sha256').update(b).digest('hex');
const attributions = [buttonFlexAttribution, buttonHostRequestAttribution];
function selectStates(rows) {
  const seen = new Set();
  return rows.filter(e => {
    const key = JSON.stringify([e.family, e.profile, e.state ?? 'static']);
    if (seen.has(key)) return false; seen.add(key); return true;
  }).map(e => {
    const ids = new Set(selectedButtonInputs(e).map(i => i.id));
    ids.add(e.family + '-root');
    return { ...e, styleInputs: e.styleInputs.filter(i => ids.has(i.id)) };
  });
}

test('button requests production integration preserves raw values and prior classifications', () => {
  const directory = mkdtempSync(path.resolve('artifacts/material-parity/button-requests-integration-'));
  try {
    const raw = { ...original, results: selectStates(original.results), interactions: selectStates(original.interactions) };
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    const options = { root: process.cwd(), parityPath: file, supplementalRoot: directory };
    const inputBefore = structuredClone(raw), previous = prior.buildMaterialInputAudit(raw, options);
    const audit = buildMaterialInputAudit(raw, options);
    const selected = audit.discrepancies.filter(r => attributions.includes(r.attribution));
    for (const attribution of attributions) assert.equal(selected.filter(r => r.attribution === attribution).length, 27);
    const expectedOwners = [...raw.results, ...raw.interactions].flatMap(selectedButtonInputs).length;
    assert.equal(audit.buttonFlexInputs.observations.length, expectedOwners);
    assert.equal(audit.buttonHostRequestInputs.observations.length, expectedOwners);
    assert.equal(selected.reduce((n, r) => n + r.occurrences, 0), expectedOwners * 6);
    const laterWidths = audit.discrepancies.filter(r => r.attribution === buttonFixedWidthAttribution);
    assert.equal(laterWidths.length, 8);
    assert.equal(audit.buttonFixedWidthInputs.observations.length, expectedOwners);
    assert.equal(audit.buttonFixedWidthInputs.groups.length, 9);
    const matchingCoreOwners = audit.buttonFixedWidthInputs.observations.filter(o => o.element === 'core-primary').length;
    assert.equal(laterWidths.reduce((n, r) => n + r.occurrences, 0), expectedOwners - matchingCoreOwners);
    assert.deepEqual(raw, inputBefore);
    assert.deepEqual(audit.discrepancies.map(scalar), previous.discrepancies.map(scalar));
    const boxes = audit.discrepancies.filter(r => r.attribution === buttonBoxSizingAttribution);
    assert.equal(boxes.length, 9);
    assert.equal(audit.buttonBoxSizingInputs.observations.length, expectedOwners);
    assert.equal(boxes.reduce((n, r) => n + r.occurrences, 0), expectedOwners);
    const keys = new Set([...selected, ...laterWidths, ...boxes].map(r => JSON.stringify(scalar(r))));
    const old = previous.discrepancies.filter(r => keys.has(JSON.stringify(scalar(r))));
    assert.equal(old.length, 71); assert.ok(old.every(r => r.attribution === 'unresolved'));
    const laterGaps = assertLaterGapClassifications(audit, previous);
    assert.equal(laterGaps.size, 18);
    assert.equal(audit.discrepancies.filter(r => laterGaps.has(JSON.stringify(scalar(r))))
      .reduce((n, r) => n + r.occurrences, 0), 566);
    assert.ok([...laterGaps].every(key => !keys.has(key)), 'later classifications cannot replace the original formatting/width/box proof');
    const others = r => r.discrepancies.filter(d => {
      const key = JSON.stringify(scalar(d));
      return !keys.has(key) && !laterGaps.has(key);
    });
    assert.ok(isDeepStrictEqual(others(audit), others(previous)), 'complete unrelated rows remain unchanged after original groups and independently verified later gaps');
    const errors = validateMaterialInputAudit(audit, { requireComplete: false });
    assert.deepEqual(errors.filter(e => /button flex|button host request|button fixed width|button box sizing/.test(e)), []);
    for (const row of selected) {
      assert.equal(row.reviewEvidence.inputEquivalent, false);
      assert.equal(row.reviewEvidence.candidateUsedLayoutVerified, false);
      assert.equal(row.reviewEvidence.originalRasterCauseProven, false);
      assert.equal(row.reviewEvidence.renderingEquivalent, false);
    }
    const mutated = structuredClone(audit);
    delete mutated.buttonFlexInputs;
    delete mutated.buttonHostRequestInputs;
    const invalid = validateMaterialInputAudit(mutated, { requireComplete: false });
    assert.ok(invalid.some(e => e.includes('button flex')));
    assert.ok(invalid.some(e => e.includes('button host request')));
    console.log(JSON.stringify({ diagnosticCases: raw.results.length + raw.interactions.length,
      sourceBoundOwners: expectedOwners, newGroups: selected.length + laterWidths.length + boxes.length,
      formattingHostGroups: selected.length, widthGroups: laterWidths.length, matchingCoreOwnersRetained: matchingCoreOwners,
      boxSizingGroups: boxes.length, observations: [...selected, ...laterWidths, ...boxes].reduce((n, r) => n + r.occurrences, 0),
      unchangedScalarRows: audit.discrepancies.length,
      independentlyVerifiedLaterGapGroups: laterGaps.size,
      unchangedCompleteRows: others(audit).length,
      unchangedCompleteRowsSha256: hash(JSON.stringify(others(audit))),
      baselineCommit, inputEquivalent: false }));
  } finally {
    assert.ok(directory.startsWith(path.resolve('artifacts/material-parity') + path.sep));
    rmSync(directory, { recursive: true, force: true });
  }
});
