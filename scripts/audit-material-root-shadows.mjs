import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { inspectRootShadowInput } from '../tests/material-parity/root-shadow-input-evidence.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const capture = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(capture);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const report = JSON.parse(bytes), entries = [...report.results.map(e => ({ ...e, kind: 'static' })),
  ...report.interactions.map(e => ({ ...e, kind: 'interaction' }))];
assert.equal(entries.length, 2311);
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
assert.equal(new Set(entries.map(keyOf)).size, entries.length);
const read = d => { const bytes = readFileSync(d.file); assert.equal(hash(bytes), d.sha256); return JSON.parse(bytes); };
const observations = entries.map(e => ({ case: keyOf(e), family: e.family, profile: e.profile, viewport: e.viewport,
  state: e.state ?? 'static', inputTrees: e.inputTrees, proof: inspectRootShadowInput(e, read(e.inputTrees.reference), read(e.inputTrees.astylar)) }));
const groups = [...new Set(entries.map(e => e.family))].sort().map(family => ({ family, element: `${family}-root`,
  property: 'boxShadow', cases: observations.filter(o => o.family === family).map(o => o.case) }));
assert.equal(groups.length, 36);
const reference = 'examples/material-showcase/src/app/reference.component.ts', candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const introducedBy = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const referenceRequest = 'box-shadow:0 2px 8px #0002', candidateRequest = "boxShadow: '0 2px 8px rgba(0,0,0,0.14)'";
for (const [file, request] of [[reference, referenceRequest], [candidate, candidateRequest]]) {
  assert.ok(readFileSync(file, 'utf8').includes(request));
  const historical = execFileSync('git', ['show', `${introducedBy}:${file}`], { maxBuffer: 1024 * 1024 }).toString();
  assert.ok(historical.includes(request));
  assert.equal(execFileSync('git', ['log', '--format=%H', '-S', request, '--', file]).toString().trim(), introducedBy);
}
const files = ['scripts/audit-material-root-shadows.mjs', 'tests/material-parity/root-shadow-input-evidence.mjs',
  'tests/material-parity/root-shadow-input-evidence.spec.mjs',
  'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs', reference, candidate];
const output = { schemaVersion: 1, kind: 'shared-root-shadow-input-audit', capture: { file: capture, sha256: hash(bytes) },
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  sourceRequests: { reference: referenceRequest, candidate: candidateRequest, introducedBy,
    historyFinding: 'Both unequal requests date to the initial showcase, not a demonstrated later parity compensation.' },
  cases: observations.length, families: groups.length, classification: 'application-plugin-authoring-defect',
  firstDivergence: 'authored shadow color alpha', owner: 'Material showcase shared container authoring',
  canonicalAttributionChanged: false, inputEquivalent: false, originalRasterCauseProven: false,
  candidateUsedPaintVerified: false, renderingEquivalent: false, groups, observations,
  limitation: 'Exact original requests, owner/scalar/stage joins and input provenance only. Does not establish shadow raster, clipping, blur kernels, other container styling or whole-render equivalence. No fixture changes.' };
const file = 'docs/material-root-shadow-input-audit.json', text = JSON.stringify(output, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(file, 'utf8'), text); else writeFileSync(file, text);
console.log(JSON.stringify({ cases: observations.length, groups: groups.length, inputEquivalent: false,
  canonicalAttributionChanged: false, originalRasterCauseProven: false, history: output.sourceRequests.historyFinding }));
