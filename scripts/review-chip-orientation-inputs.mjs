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
const predecessorId = '835eba45b519d7ba3b026eaddba3b5c3381f4dcbc6610421b1331b47251b98ed';
const predecessorFile = `artifacts/material-parity/working-audit/proposals/${predecessorId}.json`;
const predecessor = JSON.parse(fs.readFileSync(predecessorFile)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 181);
assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
function authored(source) {
  const ast = ts.createSourceFile(candidate, source, 99, true);
  const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  const methods = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'familyElements'); assert.equal(methods.length, 1);
  const text = methods[0].getText(ast);
  const emitted = ts.transpileModule(`class Probe { ${text} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Probe = new Function(emitted + ';return Probe;')(), probe = new Probe();
  probe.store = { state: () => ({ chips: ['Angular', 'Astylar'], chipSelections: [false, false], selected: false }), tokens: () => ({}) };
  const roots = probe.familyElements('chips'); assert.equal(roots.length, 1); const root = roots[0];
  assert.equal(root.id, 'chips-primary'); assert.equal(root.role, 'listbox'); assert.equal(root.ariaLabel, 'Tags');
  assert.equal(root.ariaMultiselectable, true); assert.equal(root.ariaOrientation, undefined);
  return { authored: Object.fromEntries(Object.entries(root).filter(([key]) => key !== 'children')),
    excerpt: text.split(/\r?\n/).find(l => l.includes("if (family === 'chips')")), wholeMethodSha256: hash(text) };
}
const source = fs.readFileSync(candidate, 'utf8'), current = authored(source);
const marker = "role: 'listbox', ariaLabel: 'Tags',"; assert.equal(source.split(marker).length, 2);
assert.throws(() => authored(source.replace(marker, marker + " ariaOrientation: 'horizontal',")));
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const initialBytes = execFileSync('git', ['show', `${initial}:${candidate}`], { maxBuffer: 4000000 });
const history = { revision: initial, file: candidate, sha256: hash(initialBytes), observation: authored(initialBytes.toString()) };
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022';
const reportFile = `${root}/latest-report.json`, report = JSON.parse(fs.readFileSync(reportFile));
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
assert.equal(report.observations.length, 678);
const rows = report.observations.filter(r => r.family === 'chips'); assert.equal(rows.length, 24);
const one = values => { assert.equal(values.length, 1); return values[0]; };
function inspect(o) {
  assert.equal(o.family, 'chips'); assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  const native = o.mode === 'reference'; assert.ok(native || o.mode === 'astylar');
  const box = one(o.nodes.filter(n => !n.ignored && n.role.value === 'listbox')); assert.equal(box.name.value, 'Tags');
  const orientation = one(box.properties.filter(p => p.name === 'orientation')).value.value;
  assert.equal(orientation, native ? 'horizontal' : 'vertical');
  const dom = one(o.dom.filter(d => d.backendNodeId === box.backendDOMNodeId));
  const attributes = Object.fromEntries(Array.from({ length: dom.attributes.length / 2 }, (_, i) => dom.attributes.slice(i * 2, i * 2 + 2)));
  assert.equal(attributes.role, 'listbox'); assert.equal(attributes['aria-label'], 'Tags');
  assert.equal(attributes['aria-orientation'], native ? 'horizontal' : undefined);
  assert.equal(attributes[native ? 'id' : 'data-astylar-id'], 'chips-primary');
  return { backend: box.backendDOMNodeId, orientation, attributes, properties: box.properties };
}
let controls = 1; const pairs = new Map();
const observations = rows.map(row => {
  const file = `${root}/${row.file}`, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes), result = inspect(o), key = `${row.profile}/${row.viewport.id}`;
  const pair = pairs.get(key) ?? []; pair.push(row.mode); pairs.set(key, pair);
  for (const mutate of [v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'listbox')).properties.find(p => p.name === 'orientation').value.value = 'forged'; },
    v => { const box = one(v.nodes.filter(n => !n.ignored && n.role.value === 'listbox')), d = one(v.dom.filter(d => d.backendNodeId === box.backendDOMNodeId)); d.attributes.push('aria-orientation', 'forged'); }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { file, sha256: row.sha256, profile: row.profile, viewport: row.viewport, mode: row.mode, result };
});
assert.equal(pairs.size, 12); for (const pair of pairs.values()) assert.deepEqual(pair.sort(), ['astylar', 'reference']); assert.equal(controls, 49);
const bindingFile = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bindingFile));
const types = 'src/app/types/dom-element.ts', bridge = 'src/lib/astylar-semantic-bridge.ts';
assert.ok(fs.readFileSync(types, 'utf8').includes("ariaOrientation?: 'horizontal' | 'vertical';"));
assert.ok(fs.readFileSync(bridge, 'utf8').includes("node.setAttribute('aria-orientation', element.ariaOrientation)"));
const finding = {
  id: 'fixture-chip-listbox-orientation-input-omitted', file: candidate,
  pattern: current.excerpt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  introducedBy: 'Initial2f440115 already omits orientation on its authored listbox;initial runtime and API support/motive at that revision unproven.',
  classification: 'application-plugin-authoring-defect', owner: 'Material chip-listbox semantic orientation authoring',
  focusedProof: 'node scripts/review-chip-orientation-inputs.mjs', history: [history],
  observation: { component: 'chips', staticPairs: 12, property: 'aria-orientation/AX orientation', reference: 'horizontal',
    astylar: 'omitted input;actual AX vertical', stage: 'authored listbox SiteData before semantic projection' },
  justification: 'All12 pinned static pairs expose horizontal native versus vertical candidate listboxes. Backend DOM has explicit native aria-orientation=horizontal and no candidate attribute. Complete current/initial authored methods omit ariaOrientation;current public type and fully bound current/installed/pinned projection support it. This is unequal fixture input,not a demonstrated semantic bridge failure. Focusability,chip descriptions,keyboard behavior and paint remain separate.',
  evidence: [candidate, types, bridge, reportFile, bindingFile, ...observations.map(r => r.file)].map(receipt),
  recommendation: 'Preserve the reference semantic orientation input in a future fixture correction;do not infer orientation from screenshot layout,change core listbox defaults or tune chip geometry to hide the omission.',
  boundary: 'Twelve static AX/backend DOM pairs and executed initial/current authoring,not historical runtime,all interaction states,AT traversal,current whole rendering or case closure.'
};
assert.ok(new RegExp(finding.pattern).test(source)); assert.ok(!predecessor.groups.some(r => r.id === finding.id));
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: 181, sha256: predecessorId }, groups: [...predecessor.groups, finding] };
assert.deepEqual(review.groups.slice(0, -1), predecessor.groups);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-chip-orientation-inputs.mjs'), saved, current, history, observations,
  sourceBindingReuse: receipt(bindingFile), report: receipt(reportFile), negativeControlsRejected: controls,
  complete181PredecessorPreserved: true, registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
