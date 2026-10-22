import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
assert.equal(definitions.length, 179);
assert.equal(hash(JSON.stringify(definitions)), '73f0029326c2ca8e61c572b494101875aa49ae52ce526947e4e8268c7aeb0c0b');
const axLog = 'artifacts/material-parity/tabs-static-ax-review-20261022.log';
const bridgeLog = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
for (const [script, log] of [['scripts/check-tabs-static-ax.mjs', axLog], ['scripts/check-material-semantic-visibility-binding.mjs', bridgeLog]]) {
  assert.deepEqual(execFileSync(process.execPath, [script], { maxBuffer: 3000000 }), fs.readFileSync(log));
}
const ax = JSON.parse(fs.readFileSync(axLog));
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const reference = 'examples/material-showcase/src/app/reference.component.ts';
const typesFile = 'src/app/types/dom-element.ts', bridgeFile = 'src/lib/astylar-semantic-bridge.ts';
const types = fs.readFileSync(typesFile, 'utf8'), bridge = fs.readFileSync(bridgeFile, 'utf8');
for (const field of ['ariaLabel', 'ariaControls', 'ariaLabelledby']) assert.ok(types.includes(`${field}?: string;`));
assert.ok(bridge.includes("node.setAttribute('aria-labelledby', this.nativeIdRefs(element.ariaLabelledby))"));
assert.ok(bridge.includes("node.setAttribute('aria-label', element.ariaLabel)"));
const branch = text => {
  const lines = text.split(/\r?\n/).filter(line => line.includes("if (family === 'tabs') return"));
  assert.equal(lines.length, 1);
  assert.equal((lines[0].match(/ariaControls: 'tab-panel'/g) ?? []).length, 2);
  assert.ok(!lines[0].includes('ariaLabelledby:'));
  return lines[0];
};
const explicitName = "ariaLabel: state.selected ? 'Overview content' : 'Activity content'";
const current = branch(fs.readFileSync(candidate, 'utf8'));
assert.ok(current.includes(explicitName));
const history = [];
const historical = (revision, file) => {
  const bytes = execFileSync('git', ['show', `${revision}:${file}`], { maxBuffer: 4000000 });
  const excerpt = file === candidate ? branch(bytes.toString()) : bytes.toString().split(/\r?\n/).find(line => line.includes("@case ('tabs')"));
  assert.ok(excerpt);
  history.push({ revision, file, sha256: hash(bytes), excerpt });
  return excerpt;
};
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
assert.ok(!historical(initial, candidate).includes(explicitName));
assert.ok(historical(initial, reference).includes('<mat-tab label="Overview">Overview content</mat-tab>'));
assert.ok(!historical('a0f3328b^', candidate).includes(explicitName));
assert.ok(historical('a0f3328b', candidate).includes(explicitName));
assert.ok(definitions.some(row => row.id === 'plugin-tab-panel-competing-text-renderer'));
const finding = {
  id: 'fixture-tab-panel-accessible-name-substitution', file: candidate, pattern: explicitName,
  introducedBy: 'a0f3328b introduces explicit content-as-name; initial2f440115 already omits labelledby and reuses one panel. Initial runtime and motive unproven.',
  classification: 'application-plugin-authoring-defect', owner: 'Material tab panel semantic identity and relationship authoring',
  focusedProof: 'node scripts/check-tabs-static-ax.mjs', history,
  observation: { component: 'tabs', staticPairs: 12, property: 'panel accessible name and labelledby relationship',
    reference: 'active panel named Overview through labelledby resolving to Overview tab; distinct authored panel targets',
    astylar: 'single reused panel explicitly named Overview content, no labelledby; both tabs control same panel',
    stage: 'SiteData semantic authoring before supported attribute projection' },
  justification: 'All12 pinned static AX pairs bind DOM/backend identities and preserve tab names/selection but disagree on the panel name and naming relationship. Current public fields support ariaLabel/ariaControls/ariaLabelledby; existing full current/installed/pinned bridge binding replays exactly. The candidate explicitly supplies the observed content name rather than the reference tab relationship. Initial source already omitted labelledby; the checked a0f3328b parent/child transition introduces the explicit name. This is unequal authored semantic intent, not evidence that core loses a supplied relationship. Existing private glyph-paint/baseline and accessibility-only-hiding findings remain separate.',
  evidence: [candidate, reference, typesFile, bridgeFile, 'scripts/check-tabs-static-ax.mjs', axLog, ax.report.file,
    bridgeLog, 'scripts/check-material-semantic-visibility-binding.mjs', ...ax.observations.map(row => row.file)].map(receipt),
  recommendation: 'In future comparison input work preserve stable tab/panel identities and supported labelledby relationships rather than hardcoding content as the panel name. Do not change visible text, private paint or CSS hiding to imitate accessibility output; investigate those at their already-recorded owning boundaries.',
  boundary: 'Twelve pinned initial-state static pairs and exact source transitions only; not historical runtime, every intervening revision, interactive updates, AT behavior, current rendering or case closure.',
};
assert.ok(!definitions.some(row => row.id === finding.id));
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: definitions.length, sha256: hash(JSON.stringify(definitions)) }, groups: [...definitions, finding] };
assert.deepEqual(review.groups.slice(0, -1), definitions);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(saved.file)).review)), saved.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/review-tabs-semantic-inputs.mjs'), saved, history,
  currentCandidate: current, publicInputs: [receipt(typesFile), receipt(bridgeFile)],
  complete179PredecessorPreserved: true, registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
