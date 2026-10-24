import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/snackbar-open-ax-postdelay-20261024/latest-report.json';
function load() {
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), '85bc6372c060c9ae4a5dc5e8bf6a4684c5e64a27186a932ad6d57b7c134c5a65');
  const report = JSON.parse(bytes), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const historicalScript = execFileSync('git', ['show', '2a73f7fb:scripts/audit-material-snackbar-ax.mjs']);
  assert.equal(hash(historicalScript), 'a18b81cbe8a125d66e9246e54db459e509b2b47f598ad2559f619c5bf0a167a2');
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-snackbar-ax.mjs', styleProperties: Object.values(propertyGroups).flat(),
    readBytes: absolute => absolute === path.resolve('scripts/audit-material-snackbar-ax.mjs') ? historicalScript : readFileSync(absolute) }),
  { status: 'checkpoint-bound', errors: [] });
  return { report, manifest };
}
function mappedOwner(manifest, report, mapName, sourceSuffix, expected) {
  const root = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
  const bytes = readFileSync(root + mapName), receipt = manifest.provenance.browserFiles.find(x => x.file === mapName);
  assert.equal(hash(bytes), receipt.sha256);
  const jsName = mapName.slice(0, -4), js = readFileSync(root + jsName);
  assert.equal(hash(js), manifest.provenance.browserFiles.find(x => x.file === jsName).sha256);
  assert.ok(['reference', 'astylar'].some(side => report.results[0][side].runtime.assets.some(x => x.sha256 === hash(js))));
  const map = JSON.parse(bytes), index = map.sources.findIndex(x => x.endsWith(sourceSuffix));
  assert.ok(index >= 0); const owner = map.sourcesContent[index];
  assert.equal(hash(Buffer.from(owner)), expected); return owner;
}

test('snackbar post-delay action AX is positive while live atomic policies remain unequal', () => {
  const { report } = load(); assert.equal(report.results.length, 1); assert.equal(report.observationDelayMs, 300);
  const own = target => target.nodes.find(n => n.backendDOMNodeId === target.backendNodeId);
  for (const side of ['reference', 'astylar']) {
    const evidence = report.results[0][side], action = own(evidence.ax.undo);
    assert.ok(evidence.elapsedSinceSettlementMs >= 300);
    assert.equal(action.ignored, false); assert.equal(action.role.value, 'button'); assert.equal(action.name.value, 'UNDO');
    assert.ok(action.properties.some(x => x.name === 'focusable' && x.value.value === true));
  }
  const native = own(report.results[0].reference.ax.surface), candidate = own(report.results[0].astylar.ax.surface);
  assert.equal(native.role.value, 'generic'); assert.equal(candidate.role.value, 'status');
  const atomic = n => n.properties.find(x => x.name === 'atomic').value.value;
  assert.equal(atomic(native), false); assert.equal(atomic(candidate), true);
  // DOM intent/AX exposure is evidence, not proof of speech or all configured cases.
});

test('snackbar retained post-announcement keyboard UNDO dismisses with trusted Enter on both sides', () => {
  const file = 'artifacts/material-parity/snackbar-undo-keyboard-20261024/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), '355427c50acac7e37580421e54ca63053e34a1fd5ab1a8cd6ed82fc680c783fb');
  const report = JSON.parse(bytes), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-snackbar-ax.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.keyboardUndo, true); assert.equal(report.observationDelayMs, 300);
  for (const side of ['reference', 'astylar']) {
    const observation = report.results[0][side].keyboardUndo;
    assert.equal(observation.focused, true); assert.equal(observation.popupCountAfter, 0);
    assert.ok(observation.events.some(e => e.type === 'keydown' && e.key === 'Enter' && e.trusted));
  }
  assert.deepEqual(report.results[0].reference.keyboardUndo.events.map(e => e.type), ['focus', 'keydown', 'click', 'keyup']);
  assert.deepEqual(report.results[0].astylar.keyboardUndo.events.map(e => e.type), ['focus', 'keydown']);
});

test('snackbar retained status atomic policy is authored and conditionally copied by core', () => {
  const { report, manifest } = load();
  const app = mappedOwner(manifest, report, 'chunk-JPEJK334.js.map', 'src/app/astylar.component.ts',
    '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd');
  assert.match(app, /class: 'snack-surface', role: 'status', ariaLive: 'polite' as const, ariaAtomic: true/);
  const bridge = mappedOwner(manifest, report, 'chunk-3JXWRYJY.js.map', '/astylar-semantic-bridge.js',
    '590d49a2a4d5e205c10cf18a1e2e45a3f768079afad86f5ea330f7c6136088e8');
  assert.match(bridge, /if \(element\.ariaAtomic !== undefined\) \{\s*node\.setAttribute\('aria-atomic', String\(element\.ariaAtomic\)\)/);
  const native = mappedOwner(manifest, report, 'chunk-7SL66K3U.js.map', '/snack-bar.mjs',
    '418aa2d9a5ab17b171eed626a2806249a2fffd10b6bb71894a293e25281dd6c2');
  assert.match(native, /_announceDelay = 150/);
  assert.match(native, /inertElement\.removeAttribute\('aria-hidden'\)/);
});
