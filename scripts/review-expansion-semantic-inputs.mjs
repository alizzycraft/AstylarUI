import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
assert.equal(definitions.length, 176);
assert.equal(hash(JSON.stringify(definitions)), '0196bd3ca3cba45bc0aae347cec98930d5fa2ebeb4a8966ce091993bb2001c86');
const bindingLog = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs']), fs.readFileSync(bindingLog));
const axLog = 'artifacts/material-parity/expansion-static-ax-review-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-expansion-static-ax.mjs']), fs.readFileSync(axLog));
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const reference = 'examples/material-showcase/src/app/reference.component.ts';
const bridge = 'src/lib/astylar-semantic-bridge.ts';
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const changed = '6e1c15666fa0c488a1accd1f4df3a6da7fe37aa7';
const parent = '354084ea1f1a6abb3e010222062e3cea9f945b61';
assert.equal(execFileSync('git', ['rev-parse', `${changed}^`], { encoding: 'utf8' }).trim(), parent);
function historical(revision, file, check) {
  const bytes = execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 4000000 });
  const text = bytes.toString(), excerpt = check(text); assert.ok(excerpt);
  return { revision, file, sha256: hash(bytes), excerpt };
}
const expansionLine = text => { const lines = text.split(/\r?\n/).filter(line => line.includes("if (family === 'expansion') return")); assert.equal(lines.length, 1); return lines[0]; };
const history = [
  historical(initial, candidate, text => {
    const line = expansionLine(text); assert.ok(line.includes("ariaControls: 'expansion-content'"));
    assert.ok(line.includes("...(state.open ? [{ type: 'p'")); assert.ok(!line.includes("role: 'region'")); return line;
  }),
  historical(initial, reference, text => {
    const line = text.split(/\r?\n/).find(line => line.includes("@case ('expansion')"));
    assert.ok(line.includes('<mat-expansion-panel')); return line;
  }),
  historical(parent, candidate, text => {
    const line = expansionLine(text); assert.ok(line.includes("...(state.open ? [{ type: 'p'")); return line;
  }),
  historical(changed, candidate, text => {
    const line = expansionLine(text); assert.ok(!line.includes('...(state.open ?'));
    const style = text.split(/\r?\n/).find(line => line.includes("selector: '#expansion-content'"));
    assert.ok(style.includes("display: state.open ? 'block' : 'none'")); return { line, style };
  }),
  historical('0175a0bdcab41e6767ec26a83f587c7aba3b1d47', bridge, text => {
    assert.ok(text.includes('.filter((element) => !element.hidden)'));
    assert.ok(text.includes('if (child.hidden) continue;'));
    assert.ok(!/\bdisplay\b|\bvisibility\b/.test(text));
    return ['.filter((element) => !element.hidden)', 'if (child.hidden) continue;'];
  }),
];
const ax = JSON.parse(fs.readFileSync(axLog));
const common = [candidate, reference, bridge, 'src/lib/astylar.ts',
  'scripts/check-expansion-static-ax.mjs', 'scripts/check-material-semantic-visibility-binding.mjs',
  bindingLog, axLog, ax.report.file, 'artifacts/material-parity/expansion-controls-retained-boundary-20261021.log',
  'artifacts/material-parity/expansion-hidden-style-boundary-20261021.log'];
const publicFiles = ['scripts/audit-public-semantic-css-hidden.mjs', 'scripts/check-public-semantic-css-hidden.mjs',
  'artifacts/material-parity/public-semantic-css-hidden-verification-final-20261021.log'];
for (const run of ['public-semantic-css-hidden-20261021', 'public-semantic-css-hidden-repeat-20261021']) {
  const root = `artifacts/material-parity/${run}`, report = JSON.parse(fs.readFileSync(`${root}/latest-report.json`));
  publicFiles.push(...['latest-report.json', 'provenance.json', 'failure.json', 'producer.mjs', 'audit.js'].map(file => `${root}/${file}`),
    ...report.captures.map(row => `${root}/${row.file}`));
}
const findings = [{
  id: 'core-semantic-css-visibility-not-projected', file: bridge, pattern: 'filter\\(\\(element\\) => !element\\.hidden\\)',
  introducedBy: 'Initial0175a0bd bridge source filters authored hidden without CSS visibility;first-bad runtime unproven.6e1c156 changes Material collapsed content from omission to CSS hiding.',
  classification: 'confirmed-core-renderer-defect', owner: 'core resolved CSS visibility to semantic DOM reconciliation',
  focusedProof: 'node scripts/check-public-semantic-css-hidden.mjs', history,
  observation: { component: 'expansion and minimal public text', property: 'CSS-hidden actual AX exposure',
    reference: 'CSS display:none/visibility:hidden text absent from actual AX',
    astylar: 'same resolved requests but Hidden content StaticText remains exposed',
    publicCaptures: 32, publicFailures: 8, materialStaticPairs: 12, stage: 'semantic reconciliation consumes authored hidden only' },
  justification: 'Two package-root runs use identical paired SiteData and resolve both hidden CSS values correctly. Visible/authored-hidden controls pass;CSS-hidden text is exposed atDPR1/2. Complete current/installed/public-bundle methods and pinned Material served methods/compiler helper bind. Distinct from unsupported ariaHidden accessibility-only intent:these are supported visual CSS hiding requests,not unequal authored semantics. The region-target mismatch is separately classified.',
  evidence: [...new Set([...common, ...publicFiles])].map(receipt),
  recommendation: 'At the core semantic reconciliation boundary,derive semantic inclusion from authoritative resolved CSS visibility including ancestry and updates. Do not patch Material by conditionally deleting content or adding accessibility-only fixture flags to conceal supported CSS hiding failures.',
  boundary: 'Static text/AX visibility atDPR1/2 and12 Material collapsed contexts;not inherited visibility override semantics,updates,AT traversal,all core methods or complete rendering acceptance.',
}, {
  id: 'fixture-expansion-controlled-region-replaced-with-paragraph', file: candidate, pattern: "ariaControls: 'expansion-content'",
  introducedBy: 'Initial2f440115 already controls a plain paragraph versus Material custom panel;initial runtime/region projection and motive unproven.',
  classification: 'application-plugin-authoring-defect', owner: 'Material expansion header-to-labelled-content-region authoring',
  focusedProof: 'node scripts/check-expansion-static-ax.mjs', history,
  observation: { component: 'expansion', retainedCases: 68, actualStaticPairs: 12,
    reference: 'header controls wrapper role=region labelled by header',
    astylar: 'header controls unlabelled P expansion-content', stage: 'authored relationship-target structure before semantic bridge' },
  justification: 'All68 original authenticated target chains expose unequal DOM/SiteData inputs. Pinned collapsed AX binds candidate controls to its paragraph. Native hidden target is absent from collapsed actual AX;no open-state actual region behavior is inferred. This names the semantic role/label/relationship substitution,not a duplicate finding about already-classified absolute flow/top/paragraph-spacing changes.',
  evidence: [...new Set([...common, ...ax.observations.map(row => row.file)])].map(receipt),
  recommendation: 'Restore equivalent header/labelled-region relationship intent in future comparison inputs,then evaluate core behavior. Keep the generic CSS visibility defect separate;do not make core invent a region for an authored paragraph.',
  boundary: 'Retained target attributes68 cases and actual collapsed AX12 pairs;not open-state region AX,AT navigation,initial runtime or whole-case acceptance.',
}];
for (const finding of findings) assert.equal(definitions.some(row => row.id === finding.id), false);
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: definitions.length, sha256: hash(JSON.stringify(definitions)) }, groups: [...definitions, ...findings] };
assert.deepEqual(review.groups.slice(0, -2), definitions);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(saved.file)).review)), saved.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/review-expansion-semantic-inputs.mjs'), saved,
  complete176PredecessorPreserved: true, history, publicAndMaterialVerifiersReplayedExactly: true,
  registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
