import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { sourceAuditDefinitions as currentSourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { retainedStaticSemanticPopulation, staticSemanticPredecessor, restoreStaticSemanticPolicy, restoreStaticSemanticProducer } from './static-semantic-registration.mjs';
// Original assertions below inspect the exact retained191-definition population.
const sourceAuditDefinitions = retainedStaticSemanticPopulation(currentSourceAuditDefinitions);
const hash = b => createHash('sha256').update(b).digest('hex');
const normalize = b => b.toString().replaceAll('\r\n', '\n');
test('static semantic registration preserves180 findings and exact predecessor policy', () => {
  const id = 'af08f832c5cda7a625da5f6028929b8987b7a12ceae545dd6e10b90270861347';
  const review = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${id}.json`)).review;
  assert.equal(hash(JSON.stringify(review)), id); assert.deepEqual(sourceAuditDefinitions, review.groups); assert.equal(sourceAuditDefinitions.length, 191);
  assert.deepEqual(staticSemanticPredecessor(sourceAuditDefinitions), review.groups.slice(0, 180));
  for (const i of [0, 179, 180, 190]) {
    const forged = structuredClone(sourceAuditDefinitions); forged[i].classification = 'equivalent-representation';
    assert.throws(() => staticSemanticPredecessor(forged));
  }
  assert.throws(() => staticSemanticPredecessor([...sourceAuditDefinitions, sourceAuditDefinitions.at(-1)]));
  const policy = 'tests/material-parity/input-equivalence-policy.mjs', source = normalize(fs.readFileSync(policy));
  assert.equal(restoreStaticSemanticPolicy(source), normalize(execFileSync('git', ['show', `729e6ef3:${policy}`], { maxBuffer: 4000000 })));
  assert.throws(() => restoreStaticSemanticPolicy(source + '\n// drift'));
  assert.throws(() => restoreStaticSemanticPolicy(source.replace('hidden native ID-reference', 'altered hidden native ID-reference')));
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs', producer = normalize(fs.readFileSync(producerFile));
  assert.equal(restoreStaticSemanticProducer(producer), normalize(execFileSync('git', ['show', `729e6ef3:${producerFile}`], { maxBuffer: 4000000 })));
  assert.throws(() => restoreStaticSemanticProducer(producer + '\n// drift'));
  for (const finding of sourceAuditDefinitions.slice(180)) {
    assert.ok(new RegExp(finding.pattern).test(fs.readFileSync(finding.file, 'utf8')), finding.id);
    for (const r of finding.evidence) assert.equal(hash(fs.readFileSync(r.file)), r.sha256, r.file);
  }
  assert.equal(sourceAuditDefinitions.slice(180).filter(d => d.classification === 'confirmed-core-renderer-defect').length, 1);
  assert.equal(sourceAuditDefinitions.find(d => d.id === 'core-hidden-referenced-description-targets-pruned').publicReproduction.authoredInputsEqualPerPair, true);
  const helperFile = 'tests/material-parity/tabs-semantic-registration.mjs';
  let helper = normalize(fs.readFileSync(helperFile));
  const helperAst = ts.createSourceFile(helperFile, helper, 99, true);
  const gateRestorers = helperAst.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'restorePostGateCaseReader');
  assert.equal(gateRestorers.length, 1);
  helper = helper.slice(0, gateRestorers[0].getFullStart()) + helper.slice(gateRestorers[0].end);
  const gateCall = "  let text = kind === 'case' ? restorePostGateCaseReader(source) : normalize(source);";
  assert.equal(helper.split(gateCall).length, 2);
  helper = helper.replace(gateCall, '  let text = normalize(source);');
  for (const [addition, replacement] of [
    ["import { staticSemanticPredecessor, restoreStaticSemanticPolicy, restoreStaticSemanticProducer } from './static-semantic-registration.mjs';\n", ''],
    ['  current = staticSemanticPredecessor(current);\n', ''],
    ['  const text = restoreStaticSemanticPolicy(source);', '  const text = normalize(source);'],
    ['  const text = restoreStaticSemanticProducer(source);', '  const text = normalize(source);'],
  ]) { assert.equal(helper.split(addition).length, 2); helper = helper.replace(addition, replacement); }
  assert.equal(helper, normalize(execFileSync('git', ['show', `729e6ef3:${helperFile}`], { maxBuffer: 4000000 })));
});
test('static semantic retained reviewers replay through restricted180-definition module boundary', () => {
  const loader = './scripts/static-semantic-historical-loader.mjs';
  for (const name of ['bottom-sheet-name-input-review', 'chip-orientation-input-review', 'group-semantic-input-review',
    'picker-semantic-input-review', 'checkable-semantic-input-review', 'hidden-description-input-review',
    'sort-description-input-review-final', 'toggle-group-input-review', 'static-widget-state-ax-review']) {
    const file = `artifacts/material-parity/${name}-20261022.log`, bytes = fs.readFileSync(file), result = JSON.parse(bytes);
    assert.equal(hash(fs.readFileSync(result.producer.file)), result.producer.sha256);
    assert.deepEqual(execFileSync(process.execPath, ['--import', loader, result.producer.file], { maxBuffer: 16000000 }), bytes);
  }
  assert.throws(() => execFileSync(process.execPath, ['--import', loader, '--input-type=module', '-e',
    "import('./tests/material-parity/input-equivalence-policy.mjs')"], { stdio: 'pipe' }));
});
test('static semantic case join preserves the complete predecessor after registration', () => {
  const loader = pathToFileURL(path.resolve('scripts/static-semantic-historical-loader.mjs')).href;
  const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import=${loader}`.trim() };
  assert.deepEqual(execFileSync(process.execPath, ['--max-old-space-size=4096', 'scripts/join-static-semantic-input-evidence.mjs'],
    { env, maxBuffer: 4000000 }), fs.readFileSync('artifacts/material-parity/static-semantic-input-join-20261022.log'));
});
