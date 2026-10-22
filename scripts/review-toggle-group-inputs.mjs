import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex'), receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const predecessorId = '6f890ed1c2073b5ebe8d6364167d39ece7b8a1c6f55de21b5326d85caca877f1';
const predecessor = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessorId}.json`)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 190);
assert.equal(definitions.length, 180); assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const primitiveFinding = 'fixture-toggle-native-button-substitution'; assert.ok(definitions.some(d => d.id === primitiveFinding));
function methods(source) {
  const ast = ts.createSourceFile(candidate, source, 99, true);
  const owner = one(ast.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent'));
  return Object.fromEntries(owner.members.filter(n => ts.isMethodDeclaration(n) && ['familyElements', 'selectionMark', 'composite'].includes(n.name.getText(ast)))
    .map(n => [n.name.getText(ast), n.getText(ast).replaceAll('\r\n', '\n')]));
}
function authored(source, modern = true) {
  const parts = methods(source); assert.ok(parts.familyElements); assert.ok(parts.composite);
  const emitted = ts.transpileModule(`class Probe {${Object.values(parts).join('\n')}}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Probe = new Function(emitted + ';return Probe;')(), states = [];
  for (const selected of [false, true]) {
    const p = new Probe(); p.store = { state: () => ({ selected, disabled: false }), tokens: () => ({}) }; p.focusedId = () => undefined;
    const root = one(p.familyElements('button-toggle')); assert.equal(root.role, 'radiogroup'); assert.equal(root.id, 'button-toggle-primary');
    assert.equal(root.ariaLabel, modern ? 'ListGrid' : undefined); assert.equal(root.ariaDisabled, false);
    assert.deepEqual(root.children.map(n => n.type), modern ? ['div', 'div'] : ['button', 'button']);
    if (modern) assert.deepEqual(root.children.map(n => [n.ariaLabel, n.ariaChecked, n.tabindex]), [['List', !selected, selected ? -1 : 0], ['Grid', selected, selected ? 0 : -1]]);
    states.push({ selected, root: Object.fromEntries(Object.entries(root).filter(([k]) => k !== 'children')),
      controls: root.children.map(n => Object.fromEntries(Object.entries(n).filter(([k]) => k !== 'children'))) });
  }
  return { states, completeMethodHashes: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, hash(v)])) };
}
const source = fs.readFileSync(candidate, 'utf8'), current = authored(source), marker = "role: 'radiogroup', ariaLabel: 'ListGrid'";
assert.equal(source.split(marker).length, 2); assert.throws(() => authored(source.replace(marker, "role: 'radiogroup', ariaLabel: 'Other'")));
assert.throws(() => authored(source.replace("type: 'div', id: 'button-toggle-one'", "type: 'button', id: 'button-toggle-one'")));
const introduced = 'c47d589ac2cf1967cc321df38339cb64dabb3732', parent = execFileSync('git', ['rev-parse', introduced + '^'], { encoding: 'utf8' }).trim();
const history = ['2f440115740ff76fa9e55b3f4a11568207b2af5a', parent, introduced].map(revision => {
  const bytes = execFileSync('git', ['show', `${revision}:${candidate}`], { maxBuffer: 4000000 });
  return { revision, file: candidate, sha256: hash(bytes), observation: authored(bytes.toString(), revision === introduced) };
});
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log';
const binding = one(JSON.parse(fs.readFileSync(bindingFile)).bindings.filter(b => b.current.file === candidate));
assert.equal(receipt(candidate).sha256, binding.current.sha256); assert.equal(receipt(binding.sourceMap.file).sha256, binding.sourceMap.sha256);
const map = JSON.parse(fs.readFileSync(binding.sourceMap.file)), index = map.sources.indexOf(binding.sourcePath); assert.ok(index >= 0);
assert.deepEqual(methods(map.sourcesContent[index]), methods(source));
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022', reportFile = root + '/latest-report.json', report = JSON.parse(fs.readFileSync(reportFile));
assert.equal(report.observations.length, 678); assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(receipt(r.file).sha256, r.sha256);
const attrs = d => Object.fromEntries(Array.from({ length: d.attributes.length / 2 }, (_, i) => d.attributes.slice(i * 2, i * 2 + 2)));
function inspect(o) {
  assert.equal(o.family, 'button-toggle'); assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  const native = o.mode === 'reference'; assert.ok(native || o.mode === 'astylar');
  const group = one(o.nodes.filter(n => !n.ignored && n.role.value === 'radiogroup'));
  const groupDom = one(o.dom.filter(d => d.backendNodeId === group.backendDOMNodeId)), ga = attrs(groupDom);
  assert.equal(ga[native ? 'id' : 'data-astylar-id'], 'button-toggle-primary'); assert.equal(ga['aria-disabled'], 'false');
  assert.equal(group.name.value, native ? '' : 'ListGrid'); assert.equal(ga['aria-label'], native ? undefined : 'ListGrid');
  const radios = o.nodes.filter(n => !n.ignored && n.role.value === 'radio'); assert.equal(radios.length, 2);
  const controls = radios.map((n, i) => {
    const d = one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId)), a = attrs(d), id = `button-toggle-${i ? 'two' : 'one'}`;
    assert.equal(n.parentId, group.nodeId); assert.equal(n.name.value, i ? 'Grid' : 'List');
    assert.equal(d.nodeName, native ? 'BUTTON' : 'DIV'); assert.equal(a[native ? 'id' : 'data-astylar-id'], native ? id + '-button' : id);
    assert.equal(a.type, native ? 'button' : undefined); assert.equal(a.tabindex, i ? '0' : '-1'); assert.equal(a['aria-checked'], String(!!i));
    assert.equal(a['aria-label'], native ? undefined : i ? 'Grid' : 'List');
    assert.deepEqual(n.properties.filter(p => p.name === 'checked').map(p => p.value.value), [String(!!i)]);
    assert.deepEqual(n.properties.filter(p => p.name === 'invalid').map(p => p.value.value), native ? ['false'] : []);
    assert.deepEqual(n.properties.filter(p => p.name === 'focusable').map(p => p.value.value), [true]);
    if (native) assert.ok(a.name); else assert.equal(a.name, undefined);
    return { backend: n.backendDOMNodeId, nodeName: d.nodeName, name: n.name, attributes: a, properties: n.properties };
  });
  if (native) assert.equal(controls[0].attributes.name, controls[1].attributes.name);
  return { group: { backend: group.backendDOMNodeId, nodeName: groupDom.nodeName, name: group.name, attributes: ga, properties: group.properties }, controls };
}
const rows = report.observations.filter(r => r.family === 'button-toggle'); assert.equal(rows.length, 24);
const pairs = new Map(); let controls = 2;
const observations = rows.map(row => {
  const file = root + '/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256); const o = JSON.parse(bytes);
  assert.equal(o.mode, row.mode); assert.deepEqual(o.viewport, row.viewport); const result = inspect(o);
  const key = `${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? []; pair.push(row.mode); pairs.set(key, pair);
  for (const mutate of [v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'radiogroup')).name.value += 'forged'; },
    v => { const n = v.nodes.find(n => !n.ignored && n.role.value === 'radio'); one(v.dom.filter(d => d.backendNodeId === n.backendDOMNodeId)).nodeName = 'SPAN'; },
    v => { v.nodes.find(n => !n.ignored && n.role.value === 'radio').properties.find(p => p.name === 'checked').value.value = 'forged'; }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, file, sha256: row.sha256, result };
});
assert.equal(pairs.size, 12); for (const pair of pairs.values()) assert.deepEqual(pair.sort(), ['astylar', 'reference']); assert.equal(controls, 74);
const finding = {
  id: 'fixture-toggle-group-accessible-name-substitution', file: candidate, pattern: "role: 'radiogroup', ariaLabel: 'ListGrid'",
  introducedBy: introduced + ' adds explicit group name while replacing native controls;initial and immediate parent leave group unnamed.',
  classification: 'application-plugin-authoring-defect', owner: 'Material button-toggle group accessible-name authoring', focusedProof: 'node scripts/review-toggle-group-inputs.mjs', history,
  observation: { component: 'button-toggle', staticPairs: 12, property: 'group aria-label/AX name', reference: 'no aria-label;empty AX group name', astylar: 'explicit ListGrid label and AX name', stage: 'authored group metadata before semantic projection' },
  justification: 'All12 pinned static pairs authenticate the root group and child backend identities. Current complete authoring and its actual selectionMark/composite helpers execute both selection states and match captured source-map methods. Complete initial and immediate pre/post c47d589a methods locate addition of ListGrid at authoring. Existing native-button-substitution finding owns the separate BUTTON-to-DIV difference;the checked/name/tabstop projections agree but do not erase native naming/validity/form-name input differences. This is not a core default accessible-name failure or evidence that the native group should be renamed.',
  recommendation: 'Preserve reference group-name intent in later fixture correction;restore native-control intent under its existing finding before assessing remaining defaults. Do not change the reference label,core naming algorithm or paint geometry to manufacture parity.',
  evidence: [candidate, bindingFile, binding.sourceMap.file, reportFile, ...observations.map(o => o.file)].map(receipt),
  boundary: 'Twelve enabled static pairs and executed authored selection variants only. Native primitive metadata is preserved under its existing finding,not a new defect. Not keyboard/form submission,disabled states,paint,current whole rendering or case closure.'
};
assert.ok(new RegExp(finding.pattern).test(source)); assert.ok(!predecessor.groups.some(d => d.id === finding.id));
const review = { kind: 'material-source-finding-review', registrationPending: true, predecessor: { count: 190, sha256: predecessorId }, groups: [...predecessor.groups, finding] };
assert.deepEqual(review.groups.slice(0, -1), predecessor.groups); const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-toggle-group-inputs.mjs'), saved, current, history, sourceBindingReuse: receipt(bindingFile), observations,
  negativeControlsRejected: controls, reusedPrimitiveFinding: primitiveFinding, complete190PredecessorPreserved: true,
  registrationPending: true, canonicalPublication: false, renderingAccepted: false, inspectionComplete: false }));
