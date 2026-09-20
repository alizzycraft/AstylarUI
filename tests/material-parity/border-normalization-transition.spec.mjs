import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { revalidateBorderColorObservation, verifyBorderInventorySource } from '../../scripts/audit-material-border-normalization-transition.mjs';
import { bindHistoricalAuditNormalization, bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';

const file = 'docs/material-border-normalization-transition.json';
const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
let shared;
test('inventory mapping is unchanged and rejects altered tree collection or case identity', () => {
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const previous = execFileSync('git', ['show', `4650791a7208b841dd29f1ced015f98234949623:${file}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }), current = readFileSync(file, 'utf8');
  assert.equal(verifyBorderInventorySource(previous, current).unchanged, true);
  for (const name of ['collectFullTreeInventory', 'collectReferenceContextGaps', 'caseKey'])
    assert.throws(() => verifyBorderInventorySource(previous, current.replace(`function ${name}(`, `function changed_${name}(`)));
  assert.throws(() => verifyBorderInventorySource(previous, current.replace('normalStyle: node.normalResolvedStyle', 'normalStyle: node.resolvedStyle')));
});

function fixture() {
  if (!shared) {
    const report = JSON.parse(readFileSync(file));
    const bytes = readFileSync(report.capture.file); assert.equal(hash(bytes), report.capture.sha256);
    const capture = JSON.parse(bytes), inputs = new Map();
    for (const [kind, entries] of [['static', capture.results], ['interaction', capture.interactions]])
      for (const e of entries) for (const input of e.styleInputs) inputs.set(JSON.stringify([
        `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, input.id]), input);
    shared = { report, inputs, before: bindHistoricalAuditNormalization(report.previous, report.previous.revision),
      after: bindPreciseAuditNormalization() };
  }
  return shared;
}

test('all affected border observations replay the complete frozen payload and original trees without writes', () => {
  const before = readFileSync(file), report = JSON.parse(before);
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const result = JSON.parse(execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'),
    'scripts/audit-material-border-normalization-transition.mjs', '--check'], { encoding: 'utf8', maxBuffer: 1024 * 1024 }));
  assert.equal(result.groups, 40); assert.equal(result.observations, 368);
  assert.deepEqual(result.outcomes, { 'classification-retained': 368 });
  assert.equal(result.reportSha256, hash(before)); assert.deepEqual(readFileSync(file), before);
  assert.equal(report.historicalCanonical.completeRows, 8339);
  assert.equal(report.classifier.unchanged, true);
  assert.equal(report.canonicalReportRegenerated, false); assert.equal(report.inputEquivalent, false);
});

test('current classifiers receive precise scalars and never historical rounded colors', () => {
  const { report, inputs, before, after } = fixture();
  let total = 0;
  for (const group of report.findings) for (const observation of group.observations) {
    const input = inputs.get(JSON.stringify([observation.case, group.element]));
    assert.equal(digest(input), observation.inputSha256);
    const row = { family: group.family, element: group.element, property: group.property,
      reference: group.before.reference, astylar: group.before.candidate,
      ...observation.historical, recommendedOwner: observation.historical.owner };
    const actual = revalidateBorderColorObservation(input, group, row,
      observation.historicalProof, observation.currentProof, before, after);
    const { case: c, inputSha256, inputTrees, ...expected } = observation;
    assert.deepEqual(actual, expected);
    assert.notEqual(group.before.reference, group.after.reference);
    assert.equal(actual.currentProof.referenceColor, group.after.reference);
    for (const color of Object.values(actual.currentProof.referenceBorderColors)) assert.equal(color, group.after.reference);
    assert.equal(actual.currentProof.inputEquivalent, false); assert.equal(actual.currentProof.finalRasterVerified, false);
    total++;
  }
  assert.equal(total, 368);
});

test('changed inputs and prior classifications reject; lost current proof remains explicit', () => {
  const { report, inputs, before, after } = fixture();
  for (const attribution of new Set(report.findings.map(g => g.historicalAttribution))) {
    const group = report.findings.find(g => g.historicalAttribution === attribution), o = group.observations[0];
    const original = inputs.get(JSON.stringify([o.case, group.element]));
    const row = { family: group.family, element: group.element, property: group.property,
      reference: group.before.reference, astylar: group.before.candidate,
      ...o.historical, recommendedOwner: o.historical.owner };
    const base = [original, group, row, o.historicalProof, o.currentProof];
    for (const mutate of [
      x => { x[0].id = 'wrong'; }, x => { x[0].reference.color = 'red'; },
      x => { x[0].astylar.borderColor = 'red'; }, x => { x[0].astylarResolvedStyleEvidenceVersion = 1; },
      x => { x[1].before.reference = 'wrong'; }, x => { x[1].after.reference = group.before.reference; },
      x => { x[2].classification = 'equivalent-representation'; }, x => { x[2].recommendedOwner = 'invented'; },
      x => { x[3].referenceColor = 'wrong'; },
    ]) {
      const args = structuredClone(base); mutate(args);
      assert.throws(() => revalidateBorderColorObservation(...args, before, after));
    }
    assert.throws(() => revalidateBorderColorObservation(...base, before, before));
    for (const currentProof of [undefined, { ...o.currentProof, referenceColor: group.before.reference }]) {
      const result = revalidateBorderColorObservation(original, group, row, o.historicalProof, currentProof, before, after);
      assert.equal(result.outcome, 'current-classification-not-proven'); assert.equal(result.current, null);
    }
  }
});
