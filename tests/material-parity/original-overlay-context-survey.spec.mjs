import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { assertOriginalOverlayEvidencePath, collectOriginalOverlayContextSurvey } from './original-overlay-context-survey.mjs';
import { originalOverlayAuditSourceCommit, originalOverlayAuditSourceFile,
  verifyHistoricalAuditModuleSource, originalOverlayMappingSourceCommit,
  originalOverlayMappingSourceFile, verifyHistoricalOverlayMappingSource,
  verifyOverlayMappingAuditProjection, conserveOriginalOverlayContextSnapshot, verifyOverlayFontSnapshot } from './historical-audit-module-source.mjs';
import { execFileSync } from 'node:child_process';

const file = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
const baseline = JSON.parse(readFileSync(file)), root = process.cwd();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('overlay font snapshot retains its historical receipt only after complete data and exact current-reader checks', () => {
  const historical = execFileSync('git', ['show', '67db724:docs/material-overlay-font-inputs.json'], { maxBuffer: 8 * 1024 * 1024 });
  const reader = readFileSync('tests/material-parity/original-overlay-context-survey.mjs');
  const live = JSON.parse(historical);
  live.sources.find(s => s.file === 'tests/material-parity/original-overlay-context-survey.mjs').sha256 =
    hash(reader.toString('utf8').replaceAll('\r\n', '\n'));
  const before = structuredClone(live);
  assert.deepEqual(verifyOverlayFontSnapshot(live, historical, reader), JSON.parse(historical));
  assert.deepEqual(live, before);
  const mutations = [
    r => { r.findings.pop(); }, r => { r.observations--; },
    r => { r.findings[0].proof.inputEquivalent = true; },
    r => { r.findings[0].originalInputSha256 = '0'.repeat(64); },
    r => { r.sources[0].sha256 = '0'.repeat(64); }, r => { r.sources[2].sha256 = '0'.repeat(64); },
    r => { r.sources.push(r.sources[2]); }, r => { r.referenceContext.independentSurveySha256 = '0'.repeat(64); },
    r => { r.inputEquivalent = true; }, r => { r.extraUnexplainedField = true; },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(live); mutate(changed);
    assert.throws(() => verifyOverlayFontSnapshot(changed, historical, reader));
  }
  assert.throws(() => verifyOverlayFontSnapshot(live, Buffer.concat([historical, Buffer.from('\n')]), reader));
  assert.throws(() => verifyOverlayFontSnapshot(live, historical, Buffer.concat([reader, Buffer.from('\n')])));
});

test('recorded TypeScript source permits a shared package root, not arbitrary source or artifact escapes', () => {
  const dependency = 'node_modules/typescript/lib/typescript.js';
  assertOriginalOverlayEvidencePath(root, dependency, true);
  const external = path.resolve(root, '../external-test-dependency');
  const resolve = value => value === path.resolve(root, 'node_modules/typescript') ? external
    : value === path.resolve(root, dependency) ? path.join(external, 'lib/typescript.js') : value;
  assertOriginalOverlayEvidencePath(root, dependency, true, resolve);
  assert.throws(() => assertOriginalOverlayEvidencePath(root, '../escaped.mjs', true, resolve));
  assert.throws(() => assertOriginalOverlayEvidencePath(root, dependency, false, resolve));
  assert.throws(() => assertOriginalOverlayEvidencePath(root, 'tests/escaped.mjs', true,
    value => value === path.resolve(root, 'tests/escaped.mjs') ? path.join(external, 'escaped.mjs') : value));
  assert.throws(() => assertOriginalOverlayEvidencePath(root, 'artifacts/material-parity/escaped.json', false,
    value => value === path.resolve(root, 'artifacts/material-parity/escaped.json') ? path.join(external, 'escaped.json') : value));
  assert.throws(() => assertOriginalOverlayEvidencePath(root, dependency, true,
    value => value === path.resolve(root, dependency) ? path.resolve(external, '../wrong-package/typescript.js') : resolve(value)));
  assert.throws(() => assertOriginalOverlayEvidencePath(root, 'node_modules/typescript/other.js', true,
    value => value === path.resolve(root, 'node_modules/typescript/other.js') ? path.join(external, 'other.js') : value));
});

function probe(mutate) {
  const raw = structuredClone(baseline), overrides = new Map();
  const put = (name, value) => {
    const bytes = Buffer.from(JSON.stringify(value)); overrides.set(path.resolve(root, name), bytes); return hash(bytes);
  };
  const record = mutateRecord => {
    const item = raw.results[0], data = JSON.parse(readFileSync(item.file)); mutateRecord(data); item.sha256 = put(item.file, data);
  };
  mutate({ raw, record, put }); put(file, raw);
  return collectOriginalOverlayContextSurvey(file, { root, readBytes: name => overrides.get(name) ?? readFileSync(name) });
}

test('original overlay context reader replays all 91 states and 200 original owner proofs', () => {
  const result = collectOriginalOverlayContextSurvey(file);
  assert.equal(result.cases, 91); assert.equal(result.matchedOriginalOwners, 200);
  assert.equal(result.rootProperties, 17654);
  assert.deepEqual([...new Set(result.observations.map(r => r.viewport.deviceScaleFactor))].sort(), [1, 2]);
  assert.equal(result.candidateReplayed, false); assert.equal(result.renderingEquivalent, false);
  assert.equal(result.canonicalAttributionChanged, false);
  assert.equal(result.historicalAuditSource.historicalSourceCommit, originalOverlayAuditSourceCommit);
  assert.equal(result.historicalAuditSource.recordedSha256, baseline.capture.sources.find(s => s.file === originalOverlayAuditSourceFile).sha256);
  assert.equal(result.historicalAuditSource.currentSha256, hash(readFileSync(originalOverlayAuditSourceFile)));
  assert.equal(result.historicalMappingSource.historicalSourceCommit, originalOverlayMappingSourceCommit);
  assert.equal(result.historicalMappingSource.recordedSha256, baseline.mappingSurvey.sha256);
  assert.equal(result.historicalMappingSource.currentSha256, hash(readFileSync(originalOverlayMappingSourceFile)));
  assert.equal(result.historicalMappingSource.exactMappingDataMatch, true);
  assert.equal(result.historicalMappingSource.inputEquivalent, false);
  assert.deepEqual(result.missingEnumeratedAliases, ['flex', 'gap', 'gridColumn', 'gridRow', 'margin', 'padding', 'whiteSpace']);
});

test('original overlay context rejects incomplete coverage, wrong state and corrupted function reuse', () => {
  assert.throws(() => probe(({ raw }) => { raw.results.pop(); raw.cases--; }));
  assert.throws(() => probe(({ raw }) => { raw.results[1] = raw.results[0]; }));
  assert.throws(() => probe(({ record }) => record(r => { r.state = 'invented-state'; })));
  assert.throws(() => probe(({ raw }) => { raw.reusedFunctions[0].sha256 = '0'.repeat(64); }));
  assert.throws(() => probe(({ raw }) => { raw.capture.sources.pop(); }));
});

test('original overlay context rejects changed owner styles and ancestor samples with recomputed record hashes', () => {
  assert.throws(() => probe(({ record }) => record(r => {
    const node = r.freshReferenceTree.nodes.find(n => n.key === r.proofs[0].proof.referenceNode);
    r.freshReferenceTree.styles[node.style].fontSize = '99px';
  })), /Fresh mapped owner/);
  assert.throws(() => probe(({ record }) => record(r => { r.proofs.pop(); })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.roots[1].ancestry.splice(1, 1); })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.nodes.push(r.context.nodes[0]); })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.viewport.deviceScaleFactor = 3; })));
  assert.throws(() => probe(({ record }) => record(r => { r.context.documentUrl = 'http://127.0.0.1:4431/reference/dialog?benchmark=1&profile=wrong&interaction=activate'; })));
});

test('original overlay context rejects stale runtime and claims beyond reference context', () => {
  assert.throws(() => probe(({ raw }) => { raw.browser = 'other'; }));
  assert.throws(() => probe(({ raw }) => { raw.results[0].sha256 = '0'.repeat(64); }), /Changed evidence/);
  assert.throws(() => probe(({ record }) => record(r => { r.runtime.assets[0].sha256 = '0'.repeat(64); })));
  assert.throws(() => probe(({ record }) => record(r => { r.runtime.assets = []; })));
  assert.throws(() => probe(({ raw }) => { raw.candidateReplayed = true; }));
  assert.throws(() => probe(({ raw }) => { raw.renderingEquivalent = true; }));
  assert.throws(() => probe(({ record }) => record(r => { r.candidateReplayed = true; })));
});

test('historical source verification preserves the recorded digest and distinguishes current code', () => {
  const recorded = baseline.capture.sources.find(s => s.file === originalOverlayAuditSourceFile);
  const before = structuredClone(recorded), current = readFileSync(originalOverlayAuditSourceFile);
  const historical = execFileSync('git', ['show', `${originalOverlayAuditSourceCommit}:${originalOverlayAuditSourceFile}`], { maxBuffer: 4 * 1024 * 1024 });
  const result = verifyHistoricalAuditModuleSource(recorded, current);
  assert.deepEqual(recorded, before);
  assert.equal(result.recordedSha256, hash(historical)); assert.equal(result.currentSha256, hash(current));
  assert.equal(result.exactCurrentSourceMatch, false);
  assert.equal(verifyHistoricalAuditModuleSource(recorded, historical).exactCurrentSourceMatch, true);
  assert.throws(() => verifyHistoricalAuditModuleSource({ ...recorded, sha256: hash(current) }, current), /Historical audit-module receipt/);
  assert.throws(() => verifyHistoricalAuditModuleSource({ ...recorded, file: 'different.mjs' }, current));
  assert.throws(() => verifyHistoricalAuditModuleSource(recorded, current, { readRevision: () => Buffer.from('corrupt history') }), /Historical audit-module receipt/);
  assert.throws(() => probe(({ raw }) => { raw.capture.sources.find(s => s.file === originalOverlayAuditSourceFile).sha256 = hash(current); }), /Historical audit-module receipt/);
});

test('historical mapping verification permits only independently bound lineage refreshes', () => {
  const recorded = baseline.mappingSurvey, before = structuredClone(recorded);
  const currentBytes = readFileSync(originalOverlayMappingSourceFile), current = JSON.parse(currentBytes);
  const result = verifyHistoricalOverlayMappingSource(recorded, currentBytes);
  assert.deepEqual(recorded, before);
  assert.equal(result.evidence.recordedSha256, '36507ec938f338be4e6e6840a88ac8866045f4914852a62c25f7d7ff1ca4bd13');
  assert.equal(result.evidence.exactCurrentSourceMatch, false);
  for (const mutate of [
    r => { r.cases.pop(); }, r => { r.cases[1] = r.cases[0]; },
    r => { r.observations.pop(); }, r => { r.observations[0].proof.checkedReferenceProperties--; },
    r => { r.groups[0].occurrences++; }, r => { r.capture.sha256 = '0'.repeat(64); },
    r => { r.inputSurvey.file = 'package.json'; }, r => { r.inputSurvey.sha256 = '0'.repeat(64); },
    r => { r.sourceFingerprints.pop(); }, r => { r.sourceFingerprints[0].sha256 = '0'.repeat(64); },
    r => { r.sourceFingerprints[0].extra = 'unreviewed'; },
    r => { r.renderingEquivalent = true; }, r => { r.computedCandidateVerified = true; },
  ]) {
    const changed = structuredClone(current); mutate(changed);
    assert.throws(() => verifyHistoricalOverlayMappingSource(recorded, Buffer.from(JSON.stringify(changed))));
  }
  assert.throws(() => verifyHistoricalOverlayMappingSource({ ...recorded, file: 'other.json' }, currentBytes));
  assert.throws(() => verifyHistoricalOverlayMappingSource({ ...recorded, sha256: hash(currentBytes) }, currentBytes), /Historical overlay mapping receipt/);
  assert.throws(() => verifyHistoricalOverlayMappingSource(recorded, currentBytes,
    { readRevision: () => currentBytes }), /Historical overlay mapping receipt/);
  assert.throws(() => verifyHistoricalOverlayMappingSource(recorded, currentBytes,
    { readCurrentSource: () => Buffer.from('changed dependency') }), /Current mapping source/);
  assert.throws(() => probe(({ raw }) => { raw.mappingSurvey.sha256 = hash(currentBytes); }), /Historical overlay mapping receipt/);
  assert.throws(() => probe(({ put }) => {
    const changed = structuredClone(current); changed.observations.pop(); put(originalOverlayMappingSourceFile, changed);
  }), /Current overlay mapping data/);
});

test('mapping projection rejects changed retained functions imports and links into changed orchestration', () => {
  const source = JSON.parse(readFileSync(originalOverlayMappingSourceFile)).sourceFingerprints.find(s => s.file === originalOverlayAuditSourceFile);
  const anchor = execFileSync('git', ['show', `4dc770a:${source.file}`], { maxBuffer: 4 * 1024 * 1024 });
  let current = readFileSync(source.file, 'utf8');
  // Exercise the permitted import shape even when this infrastructure commit
  // is checked out before the separate builder integration.
  if (!current.includes("from './reviewed-input-audit-source-binding.mjs'")) current +=
    "\nimport { collectReviewedInputAuditInputs, validateReviewedInputAuditInputs, reviewedInputClassificationContexts, classifyReviewedInput, validateReviewedInputClassifications } from './reviewed-input-audit-source-binding.mjs';\n";
  if (!current.includes("from './reviewed-input-proposal-transition.mjs'")) current +=
    "\nimport { reviewedInputAttributions } from './reviewed-input-proposal-transition.mjs';\n";
  if (!current.includes("from './followup-input-audit-source-binding.mjs'")) current +=
    "\nimport { collectFollowupInputAuditInputs, validateFollowupInputAuditInputs, followupInputClassificationContexts, classifyFollowupInput, validateFollowupInputClassifications } from './followup-input-audit-source-binding.mjs';\n";
  if (!current.includes("from './followup-input-proposal-transition.mjs'")) current +=
    "\nimport { followupInputAttributions } from './followup-input-proposal-transition.mjs';\n";
  const result = verifyOverlayMappingAuditProjection(source, Buffer.from(current), anchor);
  assert.ok(result.retainedStatements > 100); assert.equal(result.recordedSha256, source.sha256);
  assert.equal(result.normalizationTransition.historicalAndCurrentColorValuesEquivalent, false);
  assert.notEqual(result.normalizationTransition.historicalSha256, result.normalizationTransition.currentSha256);
  const corrected = execFileSync('git', ['show', `${result.normalizationTransition.correctionRevision}:${source.file}`],
    { maxBuffer: 4 * 1024 * 1024 });
  assert.deepEqual(verifyOverlayMappingAuditProjection(source, corrected, anchor).normalizationTransition,
    result.normalizationTransition);
  const mutations = [
    s => s.replace('function reviewedTemplateTextMappings(', 'function alteredTemplateTextMappings('),
    s => s.replace('function canonicalStyle(', 'function alteredCanonicalStyle('),
    s => s.replace('function normalizeColor(', 'function alteredNormalizeColor('),
    s => s.replace('function normalizeColor(value) {', "function normalizeColor(value) { return 'rounded-away';"),
    s => s + '\nconst unexplainedMappingInput = 1;\n',
    s => s + '\nimport { unrelated } from "./unreviewed.mjs";\n',
    s => s.replace("from './benchmark.config.mjs'", "from './changed-benchmark.mjs'"),
    s => s.replace('classifyReviewedInput, validateReviewedInputClassifications', 'classifyReviewedInput, unexpectedAlias'),
    s => s.replace('classifyFollowupInput, validateFollowupInputClassifications', 'classifyFollowupInput, unexpectedAlias'),
    s => s.replace('import { followupInputAttributions }', 'import { followupInputAttributions as otherAttributions }'),
    s => s.replace('import { followupInputAttributions }', 'import defaultAttributions, { followupInputAttributions }'),
    s => s + "\nimport { followupInputAttributions } from './followup-input-proposal-transition.mjs';\n",
    s => s + '\nfunction mappingReachesFollowup() { return classifyFollowupInput({}); }\n',
    s => s + '\nfunction mappingReachesOrchestration() { return buildMaterialInputAudit({}); }\n',
    s => s + '\nfunction mappingReachesCollector() { return collectStyleDiscrepancies([]); }\n',
  ];
  for (const mutate of mutations) { const changed = mutate(current); assert.notEqual(changed, current);
    assert.throws(() => verifyOverlayMappingAuditProjection(source, Buffer.from(changed), anchor)); }
  assert.throws(() => verifyOverlayMappingAuditProjection({ ...source, sha256: '0'.repeat(64) }, Buffer.from(current), anchor));
  assert.throws(() => verifyOverlayMappingAuditProjection(source, anchor, anchor), /color normalizer/);
});

test('original context snapshot preserves all observations and rejects receipt laundering', () => {
  const live = collectOriginalOverlayContextSurvey(file), before = structuredClone(live);
  const result = conserveOriginalOverlayContextSnapshot(live);
  assert.deepEqual(live, before); assert.deepEqual(result.observations, live.observations);
  assert.equal(result.cases, 91); assert.equal(result.matchedOriginalOwners, 200);
  for (const mutate of [
    r => { r.observations.pop(); }, r => { r.rootProperties--; },
    r => { r.historicalAuditSource.currentSha256 = '0'.repeat(64); },
    r => { r.historicalAuditSource.recordedSha256 = '0'.repeat(64); },
    r => { r.historicalMappingSource.currentSourceChecks = [{ retainedStatements: -1 }]; },
    r => { r.historicalMappingSource.currentSha256 = '0'.repeat(64); },
    r => { r.historicalMappingSource.exactMappingDataMatch = false; },
    r => { r.renderingEquivalent = true; },
  ]) { const changed = structuredClone(live); mutate(changed); assert.throws(() => conserveOriginalOverlayContextSnapshot(changed)); }
  if (live.historicalMappingSource.currentSourceChecks) {
    const missing = structuredClone(live); delete missing.historicalMappingSource.currentSourceChecks;
    assert.throws(() => conserveOriginalOverlayContextSnapshot(missing));
  }
});
