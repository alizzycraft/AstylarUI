import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { heldUpdateArtifactRoot, validateHeldUpdateEvidence } from '../tests/material-parity/button-held-update-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = `${heldUpdateArtifactRoot}/latest-report.json`, bytes = readFileSync(file);
const report = JSON.parse(bytes), proof = validateHeldUpdateEvidence(report);
const sourceFiles = ['scripts/record-button-held-update-audit.mjs', 'tests/material-parity/button-held-update-evidence.mjs',
  'tests/material-parity/button-held-update-evidence.spec.mjs', 'src/lib/astylar.ts', 'src/lib/astylar-semantic-bridge.ts',
  'src/lib/astylar-interaction-runtime.ts', '.agents/skills/astylarui-developer/references/reconciliation.md'];
const result = { schemaVersion: 1, kind: 'public-button-held-update-root-cause', report: { file, sha256: hash(bytes) },
  browser: report.browser, packages: report.packages,
  sources: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file).toString('utf8').replaceAll('\r\n', '\n')) })),
  cases: proof.cases, failedCases: proof.failedCases, passingControls: proof.passingControls,
  failedChecks: proof.failedChecks, tracedCauseCases: proof.tracedCauseCases, observedBoundaries: proof.observedBoundaries,
  observations: proof.observations, classification: 'confirmed-core-defect',
  owner: 'semantic-focus synchronization, visual reconciliation, and device-input integration',
  cause: 'A compatible public update queues semantic focus synchronization during an active pointer hold. Focusing the semantic node blurs the canvas; Babylon generates a button release from its blur handler, and Astylar dispatches pointerup/click and drops active state before native release.',
  causeProvenInPublicReduction: true, materialHistoricalCauseProven: false, canonicalAttributionChanged: false,
  renderingEquivalent: false,
  limitation: 'The installed-package public reduction proves the current causal path with and without stack tracing. It does not retroactively observe original Material call stacks, prove visual parity or implement a fix. Console error messages are not collected by this producer; page exceptions and structured diagnostics are checked.' };
const output = 'docs/material-button-held-update-root-cause.json';
if (process.argv.includes('--check')) assert.deepEqual(JSON.parse(readFileSync(output)), result);
else writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cases: proof.cases, failedCases: proof.failedCases, passingControls: proof.passingControls,
  failedChecks: proof.failedChecks, tracedCauseCases: proof.tracedCauseCases, causeProvenInPublicReduction: true }));
