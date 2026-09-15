import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const spec = 'tests/material-parity/overlay-captured-root-context.spec.mjs';
const output = execFileSync(process.execPath, ['--test', spec], { encoding: 'utf8', timeout: 60000 });
assert.match(output, /# pass 2\r?\n/);
assert.match(output, /# fail 0\r?\n/);
assert.match(output, /# skipped 0\r?\n/);
const observations = output.split(/\r?\n/).filter(line => line.startsWith('# {"browser":'))
  .map(line => JSON.parse(line.slice(2)));
assert.deepEqual(observations.map(o => o.deviceScaleFactor), [1, 2]);
const sources = ['scripts/audit-material-overlay-root-context.mjs', spec,
  'tests/material-parity/input-tree-evidence.mjs', 'examples/material-showcase/src/app/reference.component.ts',
  'examples/material-showcase/src/app/astylar.component.ts', 'examples/material-showcase/src/app/app.config.ts',
  'examples/material-showcase/node_modules/@angular/cdk/fesm2022/overlay-module-Bd2UplUU.mjs'];
const result = { schemaVersion: 1, kind: 'overlay-captured-root-context-sensitivity',
  sourceFingerprints: sources.map(file => ({ file, sha256: createHash('sha256')
    .update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')).digest('hex') })),
  observations, classification: 'parity-harness-defect', owner: 'reference ancestor-context capture',
  canonicalAttributionChanged: false, originalOverlayCauseEstablished: false, renderingEquivalent: false,
  limitation: 'Captured roots are traversal boundaries, not assertions of absent DOM ancestors. These synthetic browser controls do not establish original-case document inheritance, CSS containing blocks, candidate used values or final raster.',
  nextEvidence: 'Bind a supplemental original-state capture of actual html/body/host ancestry and overlay attachment to the frozen served runtime, preserving existing trees and scalar observations.' };
const file = 'docs/material-overlay-root-context-audit.json', json = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), json);
else writeFileSync(file, json);
console.log(JSON.stringify({ cases: observations.length, dprs: observations.map(o => o.deviceScaleFactor),
  canonicalAttributionChanged: false, originalOverlayCauseEstablished: false }));
