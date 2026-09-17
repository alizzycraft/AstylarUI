import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { rangeDragArtifactRoot, validateRangeDragEvidence } from '../tests/material-parity/public-range-drag-evidence.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = `${rangeDragArtifactRoot}/latest-report.json`, bytes = readFileSync(file), report = JSON.parse(bytes);
const proof = validateRangeDragEvidence(report);
const files = ['scripts/record-public-range-drag-audit.mjs', 'tests/material-parity/public-range-drag-evidence.mjs',
  'tests/material-parity/public-range-drag-evidence.spec.mjs', 'src/lib/astylar-interaction-runtime.ts',
  'src/lib/astylar.ts', 'src/lib/astylar-semantic-bridge.ts', 'src/app/services/dom/input/input-element.service.ts',
  'src/app/services/dom/input/range.manager.ts'];
const result = { schemaVersion: 1, kind: 'public-range-drag-root-cause-audit', report: { file, sha256: hash(bytes) },
  browser: report.browser, packages: report.packages,
  sources: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })), ...proof,
  canonicalAttributionChanged: false,
  findings: [
    { id: 'range-compatible-update-premature-release', classification: 'confirmed-core-defect',
      owner: 'semantic focus synchronization / Babylon device input / interaction runtime',
      cause: 'Identical public update reuses controls but semantic focus blurs the canvas. Babylon dispatches a release, core clears the pressed owner before native release, and subsequent drag moves stop changing the value.' },
    { id: 'range-captured-release-outside-owner', classification: 'confirmed-core-defect',
      owner: 'AstylarInteractionRuntime POINTERUP target selection',
      cause: 'Native canvas capture delivers release outside the authored control. Core commits change to the pressed owner but dispatches pointerup only to the current hit target, losing the owner release event when the hit is empty.' },
    { id: 'range-pointer-value-mapping', classification: 'confirmed-core-defect',
      owner: 'range pointer mapping and native-control geometry contract',
      cause: 'The captured core maps CSS-local X over the complete 160px input width. All non-updated traces match that formula, but browser values differ at two or three intermediate steps. The exact native thumb/track metric remains to be isolated.' },
  ],
  limitations: ['No Material plugin or overlapping range controls: these results do not prove the reported swapped-thumb cause.',
    'Pointer targeting follows shared authored CSS points, not a visual-thumb measurement. Candidate screenshots expose missing native-like range paint; visual parity is not claimed.',
    'The update proof changes only an identical document before movement. Continuous controlled-value updates, pointer cancellation, vertical/RTL ranges and transformed/scrolled ancestors remain separate.',
    'DPR and translated-host invariance apply to these inputs only; they do not establish global coordinate correctness.',
    'No production implementation or canonical Material comparison input was changed.'] };
const target = 'docs/material-public-range-drag-audit.json';
if (process.argv.includes('--check')) assert.deepEqual(JSON.parse(readFileSync(target)), result);
else writeFileSync(target, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ cases: proof.cases, pairedBoundaries: proof.pairedBoundaries,
  prematureReleaseCases: proof.prematureReleaseCases, missingOutsideReleaseCases: proof.missingOutsideReleaseCases,
  tracedCauseCases: proof.tracedCauseCases, failedChecks: proof.failedChecks }));
