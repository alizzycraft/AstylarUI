import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectRootFlowHeightOverrides } from '../tests/material-parity/root-flow-height-override-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(capture);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), families = ['button', 'toolbar', 'paginator'];
const entries = [['static', raw.results], ['interaction', raw.interactions]]
  .flatMap(([kind, rows]) => rows.filter(e => families.includes(e.family)).map(e => ({ ...e, kind })));
const read = d => { const b = readFileSync(d.file); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
const observations = entries.map(e => ({ case: `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
  family: e.family, profile: e.profile, viewport: e.viewport, state: e.state ?? 'static', inputTrees: e.inputTrees,
  proof: inspectRootFlowHeightOverrides(e, read(e.inputTrees.reference), read(e.inputTrees.astylar)) }));
assert.equal(observations.length, 164); assert.equal(new Set(observations.map(o => o.case)).size, 164);
assert.equal(observations.filter(o => o.proof.heightOverrides.length).length, 138);
const source = 'examples/material-showcase/src/app/astylar.component.ts';
const request = "display: 'flex', flexDirection: 'column', gap: '16px'";
const introducedBy = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
assert.ok(readFileSync(source, 'utf8').includes(request));
assert.ok(execFileSync('git', ['show', `${introducedBy}:${source}`], { maxBuffer: 1024 * 1024 }).toString().includes(request));
const files = ['scripts/audit-material-root-flow-height-overrides.mjs',
  'tests/material-parity/root-flow-height-override-evidence.mjs', 'tests/material-parity/root-flow-height-override-evidence.spec.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
  source, 'examples/material-showcase/src/app/reference.component.ts'];
const report = { schemaVersion: 1, kind: 'root-flow-height-override-input-audit',
  capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  history: { request, presentAtInitialShowcaseCommit: introducedBy,
    finding: 'The formatting substitution was present in initial showcase authoring; responsive height-rule history is not attributed by this proof.' },
  cases: observations.length, repeatedRootCases: 138, singleRootControls: 26,
  unresolvedPropertyObservationsReviewed: 414, canonicalAttributionChanged: false,
  inputEquivalent: false, heightBehaviorVerified: false, originalRasterCauseProven: false, renderingEquivalent: false,
  observations,
  limitation: 'Complete affected-family root-flow evidence including height-only repeated selector controls. No canonical classification change, height/layout validation or raster claim.' };
const file = 'docs/material-root-flow-height-overrides.json', text = JSON.stringify(report, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), text);
else writeFileSync(file, text);
console.log(JSON.stringify({ cases: report.cases, repeatedRootCases: 138, singleRootControls: 26,
  unresolvedPropertyObservationsReviewed: 414, canonicalAttributionChanged: false }));
