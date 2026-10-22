import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
assert.equal(definitions.length, 180);
assert.equal(hash(JSON.stringify(definitions)), 'dffdbf4e6a22d0aa95f59619aaf05e9b6b67669ff5ef84ec5d630d5411f7b3be');
const candidate = 'examples/material-showcase/src/app/astylar.component.ts', reference = 'examples/material-showcase/src/app/reference.component.ts';
function method(source, ownerName, name) {
  const ast = ts.createSourceFile('component.ts', source, 99, true);
  const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === ownerName);
  const methods = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === name); assert.equal(methods.length, 1);
  const text = methods[0].getText(ast);
  const emitted = ts.transpileModule(`class Probe { ${text} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  return { text, Probe: new Function(emitted + ';return Probe;')() };
}
function candidateName(source) {
  const { text, Probe } = method(source, 'AstylarShowcaseComponent', 'familyElements');
  const probe = new Probe(); probe.store = { state: () => ({ open: true }), tokens: () => ({}) };
  const flatten = nodes => nodes.flatMap(n => [n, ...flatten(n.children ?? [])]);
  const overlay = flatten(probe.familyElements('bottom-sheet')).filter(n => n.id === 'bottom-sheet-overlay');
  assert.equal(overlay.length, 1); assert.equal(overlay[0].ariaLabel, 'Open bottom sheet');
  return { name: overlay[0].ariaLabel, type: overlay[0].type, excerpt: text.split(/\r?\n/).find(l => l.includes("const label = family === 'dialog'")) };
}
function referenceName(source) {
  const { text, Probe } = method(source, 'ReferenceComponent', 'openBottomSheet');
  const probe = new Probe(), calls = []; probe.sheetContent = () => 'sentinel';
  probe.bottomSheet = { open: (content, options) => calls.push({ content, options }) }; probe.openBottomSheet();
  assert.deepEqual(calls, [{ content: 'sentinel', options: { ariaLabel: 'Sharing options' } }]);
  return { name: calls[0].options.ariaLabel, excerpt: text };
}
const current = { candidate: candidateName(fs.readFileSync(candidate, 'utf8')), reference: referenceName(fs.readFileSync(reference, 'utf8')) };
for (const [file, inspect, original, changed] of [
  [candidate, candidateName, 'Open bottom sheet', 'Wrong sheet name'], [reference, referenceName, 'Sharing options', 'Wrong sheet name'],
]) assert.throws(() => inspect(fs.readFileSync(file, 'utf8').replaceAll(original, changed)));
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const history = [[candidate, candidateName], [reference, referenceName]].map(([file, inspect]) => {
  const bytes = execFileSync('git', ['show', `${initial}:${file}`], { maxBuffer: 4000000 });
  return { revision: initial, file, sha256: hash(bytes), observation: inspect(bytes.toString()) };
});
const axFile = 'artifacts/material-parity/bottom-sheet-activate-ax-review-20261022.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-bottom-sheet-activate-ax.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(axFile));
const ax = JSON.parse(fs.readFileSync(axFile));
const bridgeLog = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bridgeLog));
const types = 'src/app/types/dom-element.ts', bridge = 'src/lib/astylar-semantic-bridge.ts';
assert.ok(fs.readFileSync(types, 'utf8').includes('ariaLabel?: string;'));
assert.ok(fs.readFileSync(bridge, 'utf8').includes("node.setAttribute('aria-label', element.ariaLabel)"));
const finding = {
  id: 'fixture-bottom-sheet-dialog-name-substitution', file: candidate,
  pattern: "const label = family === 'dialog' \\? 'Open dialog' : family === 'bottom-sheet' \\? 'Open bottom sheet' : 'Show snackbar'",
  introducedBy: 'Initial2f440115 already supplies Open bottom sheet while native opening options supply Sharing options;initial runtime/motive unproven.',
  classification: 'application-plugin-authoring-defect', owner: 'Material bottom-sheet dialog accessible-name authoring',
  focusedProof: 'node scripts/review-bottom-sheet-name-inputs.mjs', history,
  observation: { component: 'bottom-sheet', configuredActivatePairs: 9, property: 'dialog accessible name',
    reference: 'Sharing options', astylar: 'Open bottom sheet', stage: 'application options/SiteData ariaLabel before semantic projection' },
  justification: 'Actual AX/backend DOM in all9 configured activate pairs exposes the unequal names. Executing the complete authored opening/familyElements methods resolves those exact differing inputs;two forged-name controls reject. Initial whole sources preserve the same difference. Existing current/installed/pinned semantic projection binding replays exactly and ariaLabel is supported. This is not a core naming failure or proof of equal semantics. Keep the existing list/link substitution,local/modal lifecycle and request-before-input focus scheduling separate.',
  evidence: [candidate, reference, types, bridge, 'scripts/check-bottom-sheet-activate-ax.mjs', axFile, ax.report.file,
    'scripts/check-material-semantic-visibility-binding.mjs', bridgeLog, ...ax.observations.map(row => row.file)].map(receipt),
  recommendation: 'Preserve the reference dialog-name input independently from its opener text in future fixture correction. Do not change visible labels,force focus,convert the local sheet into a global modal or tune geometry to conceal this semantic input mismatch.',
  boundary: 'Nine pinned configured activate endpoints and initial/current executed authored names,not historical runtime,all revisions,AT navigation,paint,current whole rendering or case closure.',
};
assert.ok(new RegExp(finding.pattern).test(fs.readFileSync(candidate, 'utf8')));
assert.ok(!definitions.some(row => row.id === finding.id));
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: definitions.length, sha256: hash(JSON.stringify(definitions)) }, groups: [...definitions, finding] };
assert.deepEqual(review.groups.slice(0, -1), definitions);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
assert.equal(hash(JSON.stringify(JSON.parse(fs.readFileSync(saved.file)).review)), saved.sha256);
console.log(JSON.stringify({ producer: receipt('scripts/review-bottom-sheet-name-inputs.mjs'), saved, current, history,
  negativeControlsRejected: 2, complete180PredecessorPreserved: true, registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
