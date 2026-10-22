import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
assert.equal(definitions.length, 178);
assert.equal(hash(JSON.stringify(definitions)), '01e16e058c2a8373b9471862a176d397fc238c3e11e25124d0a23f80268f2d92');
const axLog = 'artifacts/material-parity/stepper-static-ax-review-20261022.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-stepper-static-ax.mjs'], { maxBuffer: 3000000 }), fs.readFileSync(axLog));
const ax = JSON.parse(fs.readFileSync(axLog));
const bridgeLog = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 3000000 }), fs.readFileSync(bridgeLog));
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const reference = 'examples/material-showcase/src/app/reference.component.ts';
const typesFile = 'src/app/types/dom-element.ts', bridgeFile = 'src/lib/astylar-semantic-bridge.ts';
const types = fs.readFileSync(typesFile, 'utf8'), bridge = fs.readFileSync(bridgeFile, 'utf8');
for (const name of ['ariaControls', 'ariaLabelledby']) assert.ok(types.includes(`${name}?: string;`));
assert.ok(bridge.includes("node.setAttribute('aria-controls', this.nativeIdRefs(element.ariaControls))"));
assert.ok(bridge.includes("node.setAttribute('aria-labelledby', this.nativeIdRefs(element.ariaLabelledby))"));
assert.ok(!/\bariaHidden\??\s*:/.test(types));
assert.ok(definitions.some(row => row.id === 'core-public-semantic-subset-omits-accessibility-only-hiding'));
const stepperLine = text => {
  const lines = text.split(/\r?\n/).filter(line => line.includes("if (family === 'stepper') return"));
  assert.equal(lines.length, 1); const line = lines[0];
  for (const name of ['step-details', 'step-review', 'stepper-content']) assert.ok(line.includes(`id: '${name}'`));
  assert.ok(line.includes("role: 'tabpanel'"));
  assert.ok(!/\bariaControls:|\bariaLabelledby:/.test(line));
  return line;
};
const currentCandidate = stepperLine(fs.readFileSync(candidate, 'utf8'));
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const history = [candidate, reference].map(file => {
  const bytes = execFileSync('git', ['show', `${initial}:${file}`], { maxBuffer: 4000000 });
  const excerpt = file === candidate ? stepperLine(bytes.toString())
    : bytes.toString().split(/\r?\n/).find(line => line.includes("@case ('stepper')"));
  assert.ok(excerpt); if (file === reference) assert.ok(excerpt.includes('<mat-stepper'));
  return { revision: initial, file, sha256: hash(bytes), excerpt };
});
const finding = {
  id: 'fixture-stepper-tab-panel-relationships-omitted', file: candidate,
  pattern: "id: 'stepper-content', role: 'tabpanel'",
  introducedBy: 'Initial2f440115 already omits tab ariaControls and panel ariaLabelledby;initial runtime/motive unproven.',
  classification: 'application-plugin-authoring-defect', owner: 'Material stepper tab-to-labelled-panel relationship authoring',
  focusedProof: 'node scripts/check-stepper-static-ax.mjs', history,
  observation: { component: 'stepper', staticPairs: 12, property: 'active tab controls and panel labelledby',
    reference: 'native active tab controls panel whose labelledby resolves back to that header',
    astylar: 'authored tab and single panel omit both supported relationships;actual DOM/AX agree with omissions',
    stage: 'SiteData relationship authoring before supported semantic attribute projection' },
  justification: 'All12 pinned static pairs preserve tablist name and selected states but candidate active panel is unnamed and has no labelledby,while its tabs have no controls. Whole served component/source-map bindings authenticate. Public DOMElement supports both relationship fields and current/installed/served applyAttributes methods bind exactly;current and initial candidate branches omit them. This is distinct from already-classified inactive-panel omission. Numeric accessible names1Details/2Review remain separate evidence of missing accessibility-only hiding intent and the existing public ariaHidden support limitation,not another core finding or a reason to visually hide badges.',
  evidence: [candidate, reference, typesFile, bridgeFile, 'scripts/check-stepper-static-ax.mjs', axLog,
    ax.report.file, bridgeLog, 'scripts/check-material-semantic-visibility-binding.mjs', ...ax.observations.map(row => row.file)].map(receipt),
  recommendation: 'Restore equivalent stable tab/panel identities and supported controls/labelledby authoring in future comparison inputs,including both native panels. Address accessibility-only hiding at the existing core/public boundary;do not hide visible numbers or override tab names solely to imitate output.',
  boundary: 'Actual static relationships12 pairs and initial authored omission,not initial runtime,all revisions,interactive relation updates,AT navigation or complete rendering/case acceptance.',
};
assert.equal(definitions.some(row => row.id === finding.id), false);
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: definitions.length, sha256: hash(JSON.stringify(definitions)) }, groups: [...definitions, finding] };
assert.deepEqual(review.groups.slice(0, -1), definitions);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(saved.file)).review)), saved.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/review-stepper-semantic-inputs.mjs'), saved,
  history, currentCandidate, publicRelationshipInputs: { types: receipt(typesFile), bridge: receipt(bridgeFile), fields: ['ariaControls', 'ariaLabelledby'] },
  existingHidingLimitationReused: true, complete178PredecessorPreserved: true,
  registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
