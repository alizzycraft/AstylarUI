import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { buildMaterialInputAudit, validateMaterialInputAudit } from './input-equivalence-audit.mjs';
import { rootShadowAttribution } from './root-shadow-source-binding.mjs';
import { rootFlowHeightAttribution } from './root-flow-height-source-binding.mjs';
import { bindHistoricalAuditNormalization, bindPreciseAuditNormalization, preciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { withAuditScratch } from './audit-scratch.mjs';
import { restoreOverflowStageTestSource, applyTableVisibleOverflow, applyRangeVisibleOverflow } from './control-overflow-observation.mjs';

const original = JSON.parse(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json'));
const baselineCommit = '502ea44a064d49cd4c273bd93dfb5d51f6adbc87';
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const priorSource = execFileSync('git', ['show', `${baselineCommit}:${moduleFile}`], { maxBuffer: 4 * 1024 * 1024 }).toString('utf8');
const parsed = ts.createSourceFile(moduleFile, priorSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const current = ts.createSourceFile(moduleFile, readFileSync(moduleFile, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const functionText = (f, name) => f.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name).getText(f);
for (const name of ['reviewedTemplateTextMappings', 'canonicalStyle', 'equivalentValue'])
  assert.equal(functionText(current, name), functionText(parsed, name));
// Run the real prior pipeline; only relative module locations change.
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
function selectStates(rows) {
  const seen = new Set();
  return rows.filter(e => {
    const key = JSON.stringify([e.family, e.state ?? 'static']);
    if (seen.has(key)) return false; seen.add(key); return true;
  }).map(e => ({ ...e, styleInputs: e.styleInputs.filter(i => i.id === e.family + '-root') }));
}

test('root shadow builder overflow dependencies preserve original tests after stage extraction migration', () => {
  const file = 'tests/material-parity/control-overflow-observation.spec.mjs';
  const source = readFileSync(file, 'utf8');
  const restored = restoreOverflowStageTestSource(source);
  assert.equal(hash(restored), '8008b11bce62333459b75577f6d08c5c5fd17dcad28a5acbadadb252a3d76f51');
  for (const changed of [source.replace('assert.equal(source.split(marker).length, 2)', 'assert.ok(true)'),
    source.replace('return beforeTypographyReviews;', 'return discrepancies;'),
    source + '\n// unrelated change\n'])
    assert.throws(() => restoreOverflowStageTestSource(changed));
  // Exercise both actual dependency gates without claiming any owner coverage.
  assert.deepEqual(applyTableVisibleOverflow([], [], {}, x => x), []);
  assert.deepEqual(applyRangeVisibleOverflow([], [], {}, x => x), []);
});

test('root shadow selected inputs have exactly one independently authenticated normalization transition', () => {
  assert.equal(hash(readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json')),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const historical = bindHistoricalAuditNormalization({ ...preciseAuditNormalization,
    sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' }, baselineCommit);
  const precise = bindPreciseAuditNormalization();
  const entries = [...selectStates(original.results), ...selectStates(original.interactions)];
  assert.equal(entries.length, 277);
  assert.equal(new Set(entries.map(e => e.family)).size, 36);
  for (const entry of entries) {
    assert.equal(entry.styleInputs.length, 1);
    const input = entry.styleInputs[0];
    const before = historical(input.reference), after = precise(input.reference);
    assert.equal(before.backgroundColor, 'rgba(246,241,249,1)');
    assert.equal(after.backgroundColor, 'rgba(245.879925,240.73989,248.60001,1)');
    // Compare the entire normalized object, not a list of permitted properties.
    // This projection is diagnostic only: live audit values remain precise.
    assert.deepEqual({ ...after, backgroundColor: before.backgroundColor }, before);
    for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
      assert.deepEqual(precise(input[stage] ?? {}), historical(input[stage] ?? {}));
    assert.equal(precise(input.astylar).backgroundColor, before.backgroundColor);
    assert.equal(after.boxShadow, before.boxShadow);
  }
});

function withCapture(run) {
  return withAuditScratch('root-shadow-integration-', directory => {
    const raw = { ...original, results: selectStates(original.results), interactions: selectStates(original.interactions) };
    assert.equal(raw.results.length, 36);
    assert.deepEqual([...new Set(raw.interactions.map(e => JSON.stringify([e.family, e.state])))],
      [...new Set(original.interactions.map(e => JSON.stringify([e.family, e.state])))]);
    const file = path.join(directory, 'report.json'); writeFileSync(file, JSON.stringify(raw));
    return run(raw, { root: process.cwd(), parityPath: file, supplementalRoot: directory });
  });
}

test('root shadow production integration preserves scalar rows and existing attribution precedence', () => withCapture((raw, options) => {
  const inputBefore = structuredClone(raw), previous = prior.buildMaterialInputAudit(raw, options);
  const audit = buildMaterialInputAudit(raw, options), rows = audit.discrepancies.filter(r => r.attribution === rootShadowAttribution);
  assert.equal(rows.length, 36);
  assert.equal(rows.reduce((sum, r) => sum + r.occurrences, 0), raw.results.length + raw.interactions.length);
  for (const r of rows) assert.deepEqual([r.element, r.property, r.reference, r.astylar],
    [r.family + '-root', 'boxShadow', 'rgba(0,0,0,0.133) 0 2px 8px 0', '0 2px 8px rgba(0,0,0,0.14)']);
  assert.deepEqual(raw, inputBefore);
  // Precise normalization exposes one root background difference per selected
  // capture. Authenticate its exact membership, never exempt all color rows.
  const backgrounds = audit.discrepancies.filter(r => r.property === 'backgroundColor' && r.element === r.family + '-root');
  assert.equal(backgrounds.length, 36);
  assert.equal(backgrounds.reduce((sum, r) => sum + r.occurrences, 0), 277);
  for (const row of backgrounds) {
    const members = [['static', raw.results], ['interaction', raw.interactions]].flatMap(([kind, entries]) =>
      entries.filter(e => e.family === row.family).map(e => ({
        key: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
        state: e.state ?? 'static',
      })));
    assert.deepEqual([row.reference, row.astylar],
      ['rgba(245.879925,240.73989,248.60001,1)', 'rgba(246,241,249,1)']);
    assert.equal(row.occurrences, members.length);
    assert.deepEqual(row.cases, members.slice(0, 12).map(m => m.key));
    assert.deepEqual(row.states, [...new Set(members.map(m => m.state))]);
    // The background proof requires the full original population; this reduced
    // integration must not acquire a source-attribution/equivalence claim.
    assert.equal(row.attribution, 'unresolved');
    assert.equal(row.classification, 'parity-harness-defect');
    assert.equal(row.reviewEvidence, undefined);
    assert.equal(row.reviewedCases, undefined);
    const input = raw.results.find(e => e.family === row.family).styleInputs[0];
    const compact = rules => (rules ?? []).slice(-4).map(({ selector, declarations }) => ({ selector, declarations }));
    assert.deepEqual(row.referenceAuthoredExamples, compact(input.referenceAuthored));
    assert.deepEqual(row.astylarAuthoredExamples, compact(input.astylarAuthored));
  }
  const backgroundKeys = new Set(backgrounds.map(r => JSON.stringify(scalar(r))));
  assert.ok(previous.discrepancies.every(r => !backgroundKeys.has(JSON.stringify(scalar(r)))));
  assert.deepEqual(audit.discrepancies.filter(r => !backgroundKeys.has(JSON.stringify(scalar(r)))).map(scalar),
    previous.discrepancies.map(scalar));
  // The current pipeline also contains a later, independently source-bound
  // root-flow finding. Check its exact limited coverage instead of treating a
  // legitimate reviewed attribution as an unrelated change or ignoring it.
  const laterFlow = audit.discrepancies.filter(r => r.attribution === rootFlowHeightAttribution);
  // This family/state-only selection uses single-rule paginator captures;
  // the all-case authoring integration separately covers its repeated rules.
  assert.equal(laterFlow.length, 6);
  assert.deepEqual([...new Set(laterFlow.map(r => r.family))].sort(), ['button', 'toolbar']);
  assert.equal(audit.rootFlowHeightInputs.observations.filter(o => !o.proof.heightOverrides.length).length, 6);
  assert.equal(laterFlow.reduce((sum, r) => sum + r.occurrences, 0),
    audit.rootFlowHeightInputs.observations.filter(o => o.proof.heightOverrides.length === 1).length * 3);
  const selected = new Set([...rows, ...laterFlow].map(r => JSON.stringify(scalar(r))));
  assert.ok(previous.discrepancies.filter(r => selected.has(JSON.stringify(scalar(r)))).every(r => r.attribution === 'unresolved'));
  const others = r => r.discrepancies.filter(d => !selected.has(JSON.stringify(scalar(d))) &&
    !backgroundKeys.has(JSON.stringify(scalar(d))));
  if (hash(JSON.stringify(others(audit))) !== hash(JSON.stringify(others(previous)))) {
    const oldRows = new Map(others(previous).map(r => [JSON.stringify(scalar(r)), r]));
    writeFileSync(path.join(options.supplementalRoot, 'changed-unrelated-rows.json'), JSON.stringify(
      others(audit).filter(r => JSON.stringify(r) !== JSON.stringify(oldRows.get(JSON.stringify(scalar(r)))))
        .map(r => ({ before: oldRows.get(JSON.stringify(scalar(r))), after: r })), null, 2));
  }
  assert.equal(hash(JSON.stringify(others(audit))), hash(JSON.stringify(others(previous))));
  assert.ok(!validateMaterialInputAudit(audit, { requireComplete: false }).some(e => /root shadow|root flow height/.test(e)));
}));

test('root shadow production validation rejects detached evidence missing rows and false claims', () => withCapture((raw, options) => {
  const audit = buildMaterialInputAudit(raw, options);
  for (const mutate of [r => { delete r.rootShadowInputs; },
    r => { r.rootShadowInputs.observations = []; r.rootShadowInputs.captures = []; },
    r => { r.discrepancies = r.discrepancies.filter(d => d.attribution !== rootShadowAttribution); },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reviewEvidence.renderingEquivalent = true; },
    r => { r.discrepancies.find(d => d.attribution === rootShadowAttribution).reviewedCases.pop(); }]) {
    const changed = structuredClone(audit); mutate(changed);
    assert.ok(validateMaterialInputAudit(changed, { requireComplete: false }).some(e => e.includes('root shadow')));
  }
}));
