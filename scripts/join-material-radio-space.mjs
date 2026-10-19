import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { saveReviewProposal, loadCaseObligationReview } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

const base = 'artifacts/material-parity/working-audit';
const predecessor = '1c7a7e2b522fef3a86d64845a9037af639046be9efc998ea5e7aea6b69778a53';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const reportFile = 'artifacts/material-parity/radio-space-bound-20261019/latest-report.json';
assert.equal(receipt(reportFile).sha256, '54a0fd31807035ff172c5d99efc7a7286f334a4813626bd520984909511164bb');
const report = JSON.parse(readFileSync(reportFile));
const verifyFile = 'artifacts/material-parity/radio-space-independent-verify-20261019.log';
const verification = JSON.parse(readFileSync(verifyFile));
assert.equal(verification.reportSha256, receipt(reportFile).sha256); assert.equal(verification.cases, 8);
const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
const build = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
const files = ['chunk-JPEJK334.js', 'chunk-JPEJK334.js.map'];
for (const file of files) assert.equal(receipt(build + file).sha256, manifest.provenance.browserFiles.find(r => r.file === file).sha256);
const map = JSON.parse(readFileSync(build + files[1])), sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
const indices = map.sources.flatMap((s, i) => s === 'src/app/astylar.component.ts' ? [i] : []);
assert.equal(indices.length, 1);
assert.equal(map.sourcesContent[indices[0]], readFileSync(sourceFile, 'utf8'));
const definition = sourceAuditDefinitions.find(d => d.id === 'fixture-composite-keyboard-handler-omits-activation-and-navigation');
assert.equal(definition.classification, 'application-plugin-authoring-defect');
function check(row) {
  assert.equal(row.scenario, 'configured-focus-then-enabled-unchecked-Space');
  for (const side of ['reference', 'astylar']) {
    const obs = row[side].observations;
    assert.deepEqual(obs.map(o => o.boundary), ['before', 'after-focus', 'after-space', 'settled']);
    for (const o of obs) assert.equal(o.state.radioControls.length, 2);
    for (const o of obs.slice(0, 2)) assert.deepEqual(o.state.radioControls.map(n => n.checked), [false, true]);
    for (const o of obs.slice(2)) assert.deepEqual(o.state.radioControls.map(n => n.checked), side === 'reference' ? [true, false] : [false, true]);
    const last = obs.at(-1);
    for (const type of ['keydown', 'keyup']) {
      const keys = last.events.filter(e => e.type === type);
      assert.equal(keys.length, 1); assert.equal(keys[0].key, ' '); assert.equal(keys[0].code, 'Space'); assert.equal(keys[0].trusted, true);
      assert.equal(keys[0].target.token, last.active.token);
    }
    for (const type of ['click', 'input', 'change']) assert.equal(last.events.filter(e => e.type === type).length, side === 'reference' ? 1 : 0);
  }
  assert.ok(row.reference.observations.at(-1).state.radioControls.every(n => n.tag === 'INPUT' && n.inputType === 'radio'));
  assert.ok(row.astylar.observations.at(-1).state.radioControls.every(n => n.tag === 'DIV' && n.role === 'radio' && ['true', 'false'].includes(n.ariaChecked)));
  const keys = row.astylar.observations.at(-1).retainedTypedEvents.filter(e => e.type === 'keydown');
  assert.equal(keys.length, 1); assert.equal(keys[0].targetId, 'radio-solo');
}
let rejectedControls = 0;
for (const row of report.results) {
  check(row);
  const changed = structuredClone(row); changed.astylar.observations.at(-1).state.radioControls[0].checked = true;
  assert.throws(() => check(changed)); rejectedControls++;
  const untrusted = structuredClone(row); untrusted.astylar.observations.at(-1).events.find(e => e.type === 'keydown').trusted = false;
  assert.throws(() => check(untrusted)); rejectedControls++;
}
const review = JSON.parse(readFileSync(`${base}/proposals/${predecessor}.json`)).review;
assert.equal(hash(JSON.stringify(review)), predecessor);
const modified = [];
for (const row of report.results) {
  const key = `interaction:radio@${row.profile}/${row.viewport.id}/focus`;
  const groups = review.groups.filter(g => g.case === key); assert.equal(groups.length, 1);
  const activation = groups[0].obligations.authoredActivation;
  assert.equal(activation.disposition, 'partial'); assert.equal(activation.enabledUncheckedSpace, undefined);
  const task = 'other keys and pointer activation boundaries'; assert.ok(activation.remaining.includes(task));
  modified.push({ activation, remaining: structuredClone(activation.remaining), case: key });
  activation.enabledUncheckedSpace = { disposition: 'inspected-failure', definition: definition.id,
    classification: definition.classification, owner: definition.owner,
    conclusion: 'After configured focus on unchecked solo,trusted Space reaches both DOM targets and candidate keydown callback. Native radio selects solo and emits click/input/change;role-only candidate remains team with no activation. Existing authored native-control/keyboard-strategy mismatch,not demonstrated core key-delivery failure.',
    evidence: { report: receipt(reportFile), verification: receipt(verifyFile), manifest: report.capture.checkpointManifest,
      source: receipt(sourceFile), served: files.map(f => receipt(build + f)), pairedTrees: [row.reference.inputTree, row.astylar.inputTree],
      producer: receipt('scripts/join-material-radio-space.mjs') },
    boundary: 'Eight enabled unchecked Space contexts only. Candidate typed event records callback arrival,not its key payload. Does not replace Arrow/disabled/selected/paint/update/current-runtime obligations or close whole case.' };
  activation.remaining = activation.remaining.map(s => s === task ? 'Other keys/pointer activation beyond inspected ArrowLeft/ArrowRight and enabled-unchecked Space' : s);
}
assert.equal(modified.length, 8);
const proposed = saveReviewProposal(base, review);
const loaded = loadCaseObligationReview(proposed.file, proposed.sha256, review.groups.map(g => g.case));
for (const { activation, remaining } of modified) { delete activation.enabledUncheckedSpace; activation.remaining = remaining; }
assert.equal(hash(JSON.stringify(review)), predecessor);
console.log(JSON.stringify({ predecessor, proposed, cases: modified.map(x => x.case), rejectedControls,
  source: receipt(sourceFile), mappedSourceExact: true, dependencyCount: loaded.evidenceFingerprints.length,
  allCases: loaded.cases.length, predecessorRecovered: true, scope: 'Existing authoring finding extended with eight precise Space failures;not renderer implementation or whole-case acceptance.' }));
