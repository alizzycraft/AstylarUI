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
export function collectColorNormalizationTransition() {
  const previous = bind(execFileSync('git', ['show', `${revision}:${moduleFile}`], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }));
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
  return { schemaVersion: 1, kind: 'material-color-normalization-scalar-transition',
    capture: { file: captureFile, sha256: captureHash },
    previous: { module: moduleFile, revision, functions: names, sha256: previous.sha256 },
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
