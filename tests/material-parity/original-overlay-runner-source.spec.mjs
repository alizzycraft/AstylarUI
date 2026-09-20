import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';
import path from 'node:path';
import { recoverOriginalOverlayRunnerSource } from './original-overlay-runner-source.mjs';
import { collectOriginalOverlayContextSurvey } from './original-overlay-context-survey.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const captureFile = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
const captureBytes = readFileSync(captureFile), capture = JSON.parse(captureBytes);
const file = 'tests/material-parity/run-material-parity.mjs';
const receipt = capture.capture.sources.find(s => s.file === file), current = readFileSync(file);
const endings = JSON.parse(readFileSync(new URL('./original-overlay-runner-line-endings.json', import.meta.url)));

test('recovers exact raw overlay producer bytes and all eight original reused function receipts', () => {
  const before = hash(captureBytes), result = recoverOriginalOverlayRunnerSource(receipt, current);
  assert.equal(hash(result.bytes), receipt.sha256);
  assert.equal(result.evidence.exactHistoricalBytesRecovered, true);
  assert.equal(result.evidence.currentExecutionEquivalentProven, false);
  const ast = ts.createSourceFile(file, result.bytes.toString('utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0); assert.equal(capture.reusedFunctions.length, 8);
  for (const functionReceipt of capture.reusedFunctions) {
    const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === functionReceipt.name);
    assert.equal(matches.length, 1); assert.equal(hash(matches[0].getText(ast)), functionReceipt.sha256);
  }
  assert.equal(hash(readFileSync(captureFile)), before);
});

test('LF CRLF and retained mixed checkouts recover identical historical bytes, without waiving content changes', () => {
  const lf = current.toString('utf8').replaceAll('\r\n', '\n');
  const original = recoverOriginalOverlayRunnerSource(receipt, Buffer.from(lf)).bytes;
  for (const input of [original, Buffer.from(lf), Buffer.from(lf.replaceAll('\n', '\r\n'))])
    assert.deepEqual(recoverOriginalOverlayRunnerSource(receipt, input).bytes, original);
  assert.throws(() => recoverOriginalOverlayRunnerSource(receipt, Buffer.from(lf + '\n')));
  assert.throws(() => recoverOriginalOverlayRunnerSource(receipt, Buffer.from(lf.replace('profileTheme', 'wrongTheme'))));
  assert.throws(() => recoverOriginalOverlayRunnerSource({ ...receipt, file: 'other.mjs' }, current));
  assert.throws(() => recoverOriginalOverlayRunnerSource({ ...receipt, sha256: '0'.repeat(64) }, current));
});

test('rejects altered line-ending provenance even when counts are retained', () => {
  const mutations = [
    x => { x.schemaVersion++; }, x => { x.file = 'other'; }, x => { x.recordedSha256 = '0'.repeat(64); },
    x => { x.normalizedSha256 = '0'.repeat(64); }, x => { x.lineCount++; },
    x => { x.crlfLines.pop(); }, x => { x.crlfLines.reverse(); },
    x => { x.crlfLines[0] = x.crlfLines[1]; }, x => { x.crlfLines[0] = 0; },
    x => { x.crlfLines[x.crlfLines.length - 1] = x.lineCount; },
    x => { x.crlfLines[x.crlfLines.length - 1]++; }, x => { x.bypass = true; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    const changed = structuredClone(endings); mutate(changed);
    assert.throws(() => recoverOriginalOverlayRunnerSource(receipt, current, changed), `mutation ${index}`);
  }
});

test('recovered producer bytes compose with all 91 original overlay states and reject corrupted owners', () => {
  const sourcePath = path.resolve(file), manifestPath = path.resolve(captureFile);
  const read = overrides => name => {
    const bytes = overrides.get(name) ?? readFileSync(name);
    return name === sourcePath ? recoverOriginalOverlayRunnerSource(receipt, bytes).bytes : bytes;
  };
  const result = collectOriginalOverlayContextSurvey(captureFile, { readBytes: read(new Map()) });
  assert.equal(result.cases, 91); assert.equal(result.matchedOriginalOwners, 200);
  assert.equal(result.rootProperties, 17654); assert.equal(result.candidateReplayed, false);
  assert.equal(result.renderingEquivalent, false); assert.equal(result.canonicalAttributionChanged, false);
  // Keep the reader's independent owner and coverage checks reachable after
  // resolving the earlier byte mismatch. Recompute outer hashes deliberately.
  const raw = structuredClone(capture), descriptor = raw.results[0];
  const record = JSON.parse(readFileSync(descriptor.file));
  const node = record.freshReferenceTree.nodes.find(n => n.key === record.proofs[0].proof.referenceNode);
  record.freshReferenceTree.styles[node.style].fontSize = '99px';
  const recordBytes = Buffer.from(JSON.stringify(record)); descriptor.sha256 = hash(recordBytes);
  const overrides = new Map([[path.resolve(descriptor.file), recordBytes],
    [manifestPath, Buffer.from(JSON.stringify(raw))]]);
  assert.throws(() => collectOriginalOverlayContextSurvey(captureFile, { readBytes: read(overrides) }), /Fresh mapped owner/);
  const incomplete = structuredClone(capture); incomplete.results.pop(); incomplete.cases--;
  assert.throws(() => collectOriginalOverlayContextSurvey(captureFile, {
    readBytes: read(new Map([[manifestPath, Buffer.from(JSON.stringify(incomplete))]])) }));
});
