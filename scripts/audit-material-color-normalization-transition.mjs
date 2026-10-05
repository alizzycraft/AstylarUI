import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const hash = value => createHash('sha256').update(value).digest('hex');
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const revision = '4650791a7208b841dd29f1ced015f98234949623';
const names = ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'];
function bind(source) {
  const parsed = ts.createSourceFile(moduleFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const functions = names.map(name => {
    const matches = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.equal(matches.length, 1); return matches[0].getText(parsed);
  }).join('\n').replaceAll('\r\n', '\n');
  return { normalize: new Function(functions + '\nreturn canonicalStyle;')(), sha256: hash(functions) };
}

// Scalar population transition only. This does not replay prior source-owner
// classifications or replace the canonical audit's complete builder/validator.
export function verifyCanonicalColorPopulationTransition(previousRows, currentRows, transition) {
  const key = (row, values = { reference: row.reference, candidate: row.astylar }) =>
    JSON.stringify([row.family, row.element, row.property, values.reference ?? null, values.candidate ?? null]);
  const population = rows => {
    const result = new Map();
    for (const row of rows) {
      assert.ok(Number.isSafeInteger(row.occurrences) && row.occurrences > 0, 'invalid scalar occurrence count');
      const id = key(row);
      result.set(id, (result.get(id) ?? 0) + row.occurrences);
    }
    return result;
  };
  // Classification may split one scalar into several rows. Preserve all their
  // observations; never use a one-row-per-scalar map for this boundary.
  const expected = population(previousRows), actual = population(currentRows);
  const beforeKeys = new Set(), afterKeys = new Set();
  let exposedGroups = 0, exposedObservations = 0, changedValueGroups = 0, changedValueObservations = 0;
  for (const finding of transition.findings) {
    assert.ok(['newly-visible-difference', 'changed-difference-values'].includes(finding.outcome),
      'unsupported normalization transition outcome');
    assert.ok(Number.isSafeInteger(finding.occurrences) && finding.occurrences > 0);
    assert.equal(new Set(finding.cases).size, finding.occurrences, 'transition membership is incomplete or duplicated');
    const before = key(finding, finding.before), after = key(finding, finding.after);
    assert.notEqual(before, after, 'normalization transition did not change values');
    assert.ok(!afterKeys.has(after), 'ambiguous destination scalar'); afterKeys.add(after);
    if (finding.outcome === 'newly-visible-difference') {
      assert.equal(finding.before.reference, finding.before.candidate, 'exposed scalar was previously unequal');
      assert.ok(!expected.has(before), 'previously equal scalar appears in discrepancy population');
      exposedGroups++; exposedObservations += finding.occurrences;
    } else {
      assert.notEqual(finding.before.reference, finding.before.candidate);
      assert.ok(!beforeKeys.has(before), 'duplicate source scalar'); beforeKeys.add(before);
      assert.equal(expected.get(before), finding.occurrences, 'historical scalar membership differs from source census');
      expected.delete(before);
      changedValueGroups++; changedValueObservations += finding.occurrences;
    }
    assert.notEqual(finding.after.reference, finding.after.candidate);
    assert.ok(!expected.has(after), 'normalization destination collides with another scalar');
    expected.set(after, finding.occurrences);
  }
  assert.deepEqual([...actual].sort(), [...expected].sort(),
    'canonical scalar population differs beyond source-proven color normalization');
  return { previousScalarKeys: population(previousRows).size, currentScalarKeys: actual.size,
    exposedGroups, exposedObservations, changedValueGroups, changedValueObservations,
    previousObservations: previousRows.reduce((n, r) => n + r.occurrences, 0),
    currentObservations: currentRows.reduce((n, r) => n + r.occurrences, 0),
    classificationContinuityProven: false, completeCaseMembershipProven: false,
    inputEquivalent: false, renderingEquivalent: false };
}

export function collectColorNormalizationTransition({ caseIds, previousRevision = revision } = {}) {
  assert.match(previousRevision, /^[a-f0-9]{40}$/);
  const requested = caseIds === undefined ? null : new Set(caseIds);
  if (requested) {
    assert.ok(Array.isArray(caseIds) && requested.size > 0 && requested.size === caseIds.length,
      'requested case membership is empty or duplicated');
    assert.ok(caseIds.every(id => typeof id === 'string'));
  }
  const previous = bind(execFileSync('git', ['show', `${previousRevision}:${moduleFile}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
  assert.equal(previous.sha256, '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e');
  const current = bind(readFileSync(moduleFile, 'utf8'));
  assert.notEqual(current.sha256, previous.sha256);
  const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const bytes = readFileSync(captureFile), captureHash = hash(bytes);
  assert.equal(captureHash, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), groups = new Map(), cases = new Set();
  const stageChanges = {}, outcomeCounts = {};
  let owners = 0, nonColorChanges = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      if (requested && !requested.has(caseId)) continue;
      assert.ok(!cases.has(caseId)); cases.add(caseId);
      for (const input of entry.styleInputs ?? []) {
        owners++;
        const stages = {};
        for (const stage of ['reference', 'astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) {
          const before = previous.normalize(input[stage] ?? {}), after = current.normalize(input[stage] ?? {});
          stages[stage] = { before, after };
          for (const property of new Set([...Object.keys(before), ...Object.keys(after)])) {
            if (before[property] === after[property]) continue;
            if (!/Color$/.test(property) && property !== 'color') nonColorChanges++;
            const key = `${stage}.${property}`; stageChanges[key] = (stageChanges[key] ?? 0) + 1;
          }
        }
        const r = stages.reference, a = stages.astylar;
        const properties = new Set([...Object.keys(r.before), ...Object.keys(r.after), ...Object.keys(a.before), ...Object.keys(a.after)]);
        for (const property of properties) {
          if (r.before[property] === r.after[property] && a.before[property] === a.after[property]) continue;
          const beforeEqual = r.before[property] === a.before[property], afterEqual = r.after[property] === a.after[property];
          const outcome = beforeEqual ? afterEqual ? 'equal-both-contracts' : 'newly-visible-difference'
            : afterEqual ? 'newly-equal-representation' : 'changed-difference-values';
          outcomeCounts[outcome] = (outcomeCounts[outcome] ?? 0) + 1;
          const identity = { family: entry.family, element: input.id, property, outcome,
            before: { reference: r.before[property] ?? null, candidate: a.before[property] ?? null },
            after: { reference: r.after[property] ?? null, candidate: a.after[property] ?? null } };
          const key = JSON.stringify(identity);
          if (!groups.has(key)) groups.set(key, { ...identity, cases: [] });
          groups.get(key).cases.push(caseId);
        }
      }
    }
  }
  assert.equal(nonColorChanges, 0, 'normalization correction changed non-color evidence');
  if (requested) assert.deepEqual([...cases].sort(), [...requested].sort(), 'requested original case is missing');
  return { schemaVersion: 1, kind: 'material-color-normalization-scalar-transition',
    capture: { file: captureFile, sha256: captureHash },
    previous: { module: moduleFile, revision: previousRevision, functions: names, sha256: previous.sha256 },
    current: { module: moduleFile, functions: names, sha256: current.sha256 },
    counts: { cases: cases.size, owners, nonColorChanges, stageChanges, outcomeCounts, groups: groups.size },
    findings: [...groups.values()].map(group => ({ ...group, occurrences: group.cases.length })),
    priorClassificationsRevalidated: false, canonicalReportRegenerated: false,
    inputEquivalent: false, rendererChanged: false,
    limitation: 'This compares normalized scalar inputs, not attribution ownership. Exposed differences still require source-aware classification; browser decimal serialization uncertainty must not be called a renderer defect.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectColorNormalizationTransition(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-color-normalization-transition.json';
  if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ ...report.counts, reportSha256: hash(output) }));
}
