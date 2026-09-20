import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import ts from 'typescript';
import { collectOwnerInitialMotion } from '../../scripts/audit-material-owner-initial-motion.mjs';
import { verifyMotionSourceConservation } from './motion-source-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const moduleFile = 'tests/material-parity/input-equivalence-audit.mjs';
const revision = '4650791a7208b841dd29f1ced015f98234949623';
const delayHash = 'cbaa92d9fc5900bb7a0efc6b8f99a9ee0d3fde3edd0c1080840fc9ddd4c4ddd4';

// Re-execute the unchanged, authenticated delay collector with the explicitly
// conserved historical parent. No report hash is rewritten or called current.
export function replayReviewedBatchMotion() {
  const motion = JSON.parse(readFileSync('docs/material-owner-initial-motion-review.json', 'utf8'));
  const fresh = collectOwnerInitialMotion();
  const historical = execFileSync('git', ['show', `${revision}:${moduleFile}`], { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const conservation = verifyMotionSourceConservation(motion, fresh, historical, readFileSync(moduleFile, 'utf8'));
  const delay = JSON.parse(readFileSync('docs/material-motion-delay-target-review.json', 'utf8'));
  assert.equal(hash(JSON.stringify(delay, null, 2) + '\n'), delayHash);
  const source = readFileSync(delay.source.file, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(source), delay.source.sha256, 'delay collector changed');
  const ast = ts.createSourceFile(delay.source.file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const declarations = ast.statements.filter(n => ts.isVariableStatement(n) || ts.isFunctionDeclaration(n));
  assert.equal(ast.statements.filter(n => !ts.isImportDeclaration(n) && !declarations.includes(n)).length, 1,
    'unexpected delay collector execution boundary');
  const collect = new Function('assert', 'createHash', 'readFileSync', 'isDeepStrictEqual', 'collectOwnerInitialMotion',
    declarations.map(n => n.getText(ast).replace(/^export /, '')).join('\n') + '\nreturn collectMotionDelayTargets;')(
    assert, createHash, readFileSync, isDeepStrictEqual, () => motion);
  const replayed = collect();
  assert.ok(isDeepStrictEqual(replayed, delay), 'complete delay replay differs');
  return { motion, delay, conservation: { ...conservation,
    delayReport: { file: 'docs/material-motion-delay-target-review.json', sha256: delayHash },
    delaySource: delay.source, delayGroups: delay.groups, delayObservations: delay.observations,
    delayReexecutedAgainstConservedHistoricalParent: true } };
}
