import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { collectColorNormalizationTransition } from './audit-material-color-normalization-transition.mjs';
import { bindHistoricalAuditNormalization, bindPreciseAuditNormalization, preciseAuditNormalization }
  from '../tests/material-parity/audit-normalization-contracts.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { borderColorProperties, borderInitialAttribution, buttonBorderResetAttribution,
  collectBorderInitialInputs, collectButtonBorderResetInputs, classifyBorderInitialInput, classifyButtonBorderResetInput }
  from '../tests/material-parity/border-initial-input-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const revision = '4650791a7208b841dd29f1ced015f98234949623';
const moduleFile = 'tests/material-parity/border-initial-input-evidence.mjs';
const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const identity = (c, id) => JSON.stringify([c, id]);
const attributions = [borderInitialAttribution, buttonBorderResetAttribution];
const metadata = c => c ? { classification: c.classification, attribution: c.attribution,
  justification: c.justification, owner: c.owner } : null;

export function verifyBorderInventorySource(previous, current) {
  const file = preciseAuditNormalization.module;
  const extract = source => {
    const ast = ts.createSourceFile(file, source.replaceAll('\r\n', '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    return ['collectFullTreeInventory', 'collectReferenceContextGaps', 'caseKey'].map(name => {
      const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
      assert.equal(nodes.length, 1); return { name, sha256: hash(nodes[0].getText(ast)) };
    });
  };
  const before = extract(previous), after = extract(current);
  same(before, after, 'inventory collection changed; review independently');
  return { file, historicalRevision: revision, functions: after, unchanged: true };
}

// Historical input and attribution must replay exactly. Current rejection is
// reported as lost coverage, never coerced into the historical classification.
export function revalidateBorderColorObservation(input, group, row, beforeProof, afterProof, before, after) {
  assert.equal(input.id, group.element); assert.ok(borderColorProperties.includes(group.property));
  assert.ok(attributions.includes(row.attribution));
  for (const field of ['family', 'element', 'property']) assert.equal(row[field], group[field]);
  same({ reference: row.reference, candidate: row.astylar }, group.before, 'historical row scalar identity');
  for (const [normalize, expected] of [[before, group.before], [after, group.after]]) {
    same({ reference: normalize(input.reference ?? {})[group.property],
      candidate: normalize(input.astylar ?? {})[group.property] }, expected, 'current or historical input values changed');
  }
  const classify = row.attribution === borderInitialAttribution ? classifyBorderInitialInput : classifyButtonBorderResetInput;
  const historical = classify(input, group.property, group.before.reference, group.before.candidate, beforeProof, before);
  assert.ok(historical, 'historical classification did not replay');
  same(metadata(historical), { classification: row.classification, attribution: row.attribution,
    justification: row.justification, owner: row.recommendedOwner }, 'historical attribution changed');
  const current = classify(input, group.property, group.after.reference, group.after.candidate, afterProof, after);
  return { historical: metadata(historical), current: metadata(current),
    outcome: !current ? 'current-classification-not-proven'
      : isDeepStrictEqual(metadata(historical), metadata(current)) ? 'classification-retained' : 'classification-changed',
    historicalProof: beforeProof, currentProof: afterProof ?? null,
    historicalProofSha256: digest(beforeProof), currentProofSha256: afterProof ? digest(afterProof) : null };
}

export async function collectBorderNormalizationTransition() {
  const source = readFileSync(moduleFile, 'utf8').replaceAll('\r\n', '\n');
  const oldSource = execFileSync('git', ['show', `${revision}:${moduleFile}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
  assert.equal(hash(source), hash(oldSource), 'border classifier changed; review separately from normalization');
  const inventorySource = verifyBorderInventorySource(execFileSync('git',
    ['show', `${revision}:${preciseAuditNormalization.module}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }),
  readFileSync(preciseAuditNormalization.module, 'utf8'));
  const transition = collectColorNormalizationTransition();
  same(transition, JSON.parse(readFileSync('docs/material-color-normalization-transition.json')), 'scalar transition changed');
  const previous = bindHistoricalAuditNormalization(transition.previous, revision), current = bindPreciseAuditNormalization();
  const canonical = await readCaretConservationRows(file => execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const selected = transition.findings.filter(g => borderColorProperties.includes(g.property)).flatMap(group => {
    const rows = canonical.rows.filter(r => r.family === group.family && r.element === group.element && r.property === group.property &&
      r.reference === group.before.reference && r.astylar === group.before.candidate);
    assert.equal(rows.length, 1, 'changed border group has missing or ambiguous prior row');
    return attributions.includes(rows[0].attribution) ? [{ group, row: rows[0] }] : [];
  });
  assert.equal(selected.length, 40); assert.equal(selected.reduce((n, x) => n + x.group.occurrences, 0), 368);
  const bytes = readFileSync(transition.capture.file); assert.equal(hash(bytes), transition.capture.sha256);
  const capture = JSON.parse(bytes), wanted = new Set(selected.flatMap(x => x.group.cases));
  const cases = [['static', capture.results], ['interaction', capture.interactions]].flatMap(([kind, entries]) =>
    entries.map(e => ({ ...e, kind }))).filter(e => wanted.has(key(e)));
  assert.equal(cases.length, wanted.size);
  const inventory = collectFullTreeInventory(cases);
  for (const field of ['errors', 'gaps', 'resolvedStyleGaps', 'stateStyleGaps', 'referenceContextGaps'])
    assert.equal(inventory[field].length, 0, `captured tree ${field}`);
  const collect = normalize => new Map([
    ...collectBorderInitialInputs(inventory, normalize), ...collectButtonBorderResetInputs(inventory, normalize)
  ].map(p => [identity(p.case, p.element), p]));
  const oldProofs = collect(previous), newProofs = collect(current);
  const entries = new Map(cases.map(e => [key(e), e])), seen = new Set(), counts = {};
  const findings = selected.map(({ group, row }) => {
    assert.equal(row.occurrences, group.occurrences); assert.equal(group.cases.length, group.occurrences);
    same(row.reviewedCases, group.cases, 'complete prior membership changed');
    const observations = group.cases.map(c => {
      const e = entries.get(c); assert.ok(e); assert.equal(e.family, group.family);
      const inputs = e.styleInputs.filter(i => i.id === group.element); assert.equal(inputs.length, 1);
      const id = identity(c, group.element), membership = identity(id, group.property);
      assert.ok(!seen.has(membership)); seen.add(membership);
      const proof = revalidateBorderColorObservation(inputs[0], group, row, oldProofs.get(id), newProofs.get(id), previous, current);
      counts[proof.outcome] = (counts[proof.outcome] ?? 0) + 1;
      return { case: c, inputSha256: digest(inputs[0]), inputTrees: e.inputTrees, ...proof };
    });
    return { ...group, historicalRowSha256: digest(row), historicalAttribution: row.attribution, observations };
  });
  return { schemaVersion: 1, kind: 'material-border-color-normalization-revalidation',
    capture: transition.capture, previous: transition.previous, current: preciseAuditNormalization,
    historicalCanonical: { revision, manifest: canonical.manifest, completeRows: canonical.rows.length },
    classifier: { file: moduleFile, historicalRevision: revision, sha256: hash(source), unchanged: true },
    inventorySource,
    counts: { groups: findings.length, observations: seen.size, cases: cases.length, outcomes: counts }, findings,
    canonicalReportRegenerated: false, rendererChanged: false, comparisonInputsChanged: false, inputEquivalent: false,
    limitation: 'Revalidates only the 40 previously reviewed changed-value border groups. Does not resolve the 16 unclassified color groups, prove rendered pixels, or establish full-builder integration.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = await collectBorderNormalizationTransition(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-border-normalization-transition.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(file, output);
  console.log(JSON.stringify({ ...report.counts, reportSha256: hash(output) }));
}
