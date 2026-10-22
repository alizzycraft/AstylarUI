import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const predecessorId = 'a876acae9d3f6be207b496691197002320df0c51e53df50780dd491b0ca04c45';
const predecessorFile = `artifacts/material-parity/working-audit/proposals/${predecessorId}.json`;
const predecessor = JSON.parse(fs.readFileSync(predecessorFile)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 182);
assert.equal(definitions.length, 180); assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const expectedName = 'Items per page: 10 1 – 10 of 100';
function authored(source) {
  const ast = ts.createSourceFile(candidate, source, 99, true);
  const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  const methods = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'familyElements'); assert.equal(methods.length, 1);
  const text = methods[0].getText(ast), emitted = ts.transpileModule(`class Probe { ${text} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Probe = new Function(emitted + ';return Probe;')(), probe = new Probe();
  probe.store = { state: () => ({ chips: ['Angular', 'Astylar'], chipSelections: [false, false], selected: false, pageIndex: 0, disabled: false }), tokens: () => ({}) };
  const result = {};
  for (const family of ['chips', 'paginator']) {
    const roots = probe.familyElements(family); assert.equal(roots.length, 1); const root = roots[0];
    assert.equal(root.id, `${family}-primary`); assert.equal(root.type, 'div');
    assert.equal(root.role, family === 'chips' ? 'listbox' : 'group');
    if (family === 'chips') { assert.equal(root.tabindex, undefined); assert.equal(root.ariaLabel, 'Tags'); }
    else assert.equal(root.ariaLabel, expectedName);
    result[family] = Object.fromEntries(Object.entries(root).filter(([key]) => key !== 'children'));
  }
  return { ...result, wholeMethodSha256: hash(text), excerpts: {
    chips: text.split(/\r?\n/).find(l => l.includes("if (family === 'chips')")),
    paginator: text.split(/\r?\n/).find(l => l.includes('ariaLabel: `Items per page: 10')) } };
}
const source = fs.readFileSync(candidate, 'utf8'), current = authored(source);
const chipMarker = "id: 'chips-primary', class: 'row', role: 'listbox',";
assert.equal(source.split(chipMarker).length, 2);
assert.throws(() => authored(source.replace(chipMarker, chipMarker + ' tabindex: 0,')));
assert.throws(() => authored(source.replace('ariaLabel: `Items per page: 10', 'ariaLabel: `Different group name: 10')));
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a', initialBytes = execFileSync('git', ['show', `${initial}:${candidate}`], { maxBuffer: 4000000 });
const history = { revision: initial, file: candidate, sha256: hash(initialBytes), observation: authored(initialBytes.toString()) };
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022', reportFile = `${root}/latest-report.json`;
const report = JSON.parse(fs.readFileSync(reportFile)); assert.equal(report.observations.length, 678);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const rows = report.observations.filter(r => ['chips', 'paginator'].includes(r.family)); assert.equal(rows.length, 48);
const one = values => { assert.equal(values.length, 1); return values[0]; };
function inspect(o) {
  assert.ok(['chips', 'paginator'].includes(o.family)); assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  const native = o.mode === 'reference'; assert.ok(native || o.mode === 'astylar'); const chip = o.family === 'chips';
  const group = one(o.nodes.filter(n => !n.ignored && n.role.value === (chip ? 'listbox' : 'group')));
  const dom = one(o.dom.filter(d => d.backendNodeId === group.backendDOMNodeId));
  const attrs = Object.fromEntries(Array.from({ length: dom.attributes.length / 2 }, (_, i) => dom.attributes.slice(i * 2, i * 2 + 2)));
  assert.equal(attrs[native ? 'id' : 'data-astylar-id'], `${o.family}-primary`);
  assert.equal(attrs.role, chip ? 'listbox' : 'group');
  if (chip) {
    assert.equal(group.name.value, 'Tags'); assert.equal(attrs.tabindex, native ? '0' : undefined);
    assert.deepEqual(group.properties.filter(p => p.name === 'focusable').map(p => p.value.value), native ? [true] : []);
  } else {
    assert.equal(group.name.value, native ? '' : expectedName); assert.equal(attrs['aria-label'], native ? undefined : expectedName);
  }
  return { backend: group.backendDOMNodeId, name: group.name, attributes: attrs, properties: group.properties };
}
let controls = 2; const pairs = new Map();
const observations = rows.map(row => {
  const file = `${root}/${row.file}`, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes), result = inspect(o), key = `${row.family}/${row.profile}/${row.viewport.id}`;
  const pair = pairs.get(key) ?? []; pair.push(row.mode); pairs.set(key, pair);
  for (const mutate of [v => { const group = one(v.nodes.filter(n => !n.ignored && n.role.value === (v.family === 'chips' ? 'listbox' : 'group')));
    if (v.family === 'chips') group.properties.push({ name: 'focusable', value: { value: true } }); else group.name.value += 'forged'; },
    v => { const group = one(v.nodes.filter(n => !n.ignored && n.role.value === (v.family === 'chips' ? 'listbox' : 'group')));
      one(v.dom.filter(d => d.backendNodeId === group.backendDOMNodeId)).attributes.push(v.family === 'chips' ? 'tabindex' : 'aria-label', 'forged'); }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, file, sha256: row.sha256, result };
});
assert.equal(pairs.size, 24); for (const pair of pairs.values()) assert.deepEqual(pair.sort(), ['astylar', 'reference']); assert.equal(controls, 98);
const bindingFile = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bindingFile));
const types = 'src/app/types/dom-element.ts', bridge = 'src/lib/astylar-semantic-bridge.ts';
assert.ok(fs.readFileSync(types, 'utf8').includes('tabindex?: number;')); assert.ok(fs.readFileSync(types, 'utf8').includes('ariaLabel?: string;'));
const bridgeSource = fs.readFileSync(bridge, 'utf8'); assert.ok(bridgeSource.includes('if (element.tabindex !== undefined) node.tabIndex = element.tabindex;'));
assert.ok(bridgeSource.includes("node.setAttribute('aria-label', element.ariaLabel)"));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findings = [
  { id: 'fixture-chip-listbox-tabstop-input-omitted', component: 'chips', owner: 'Material chip-listbox container focusability authoring',
    property: 'container tabindex/AX focusable', reference: 'tabindex0;AX focusable true', astylar: 'tabindex omitted;AX focusable absent',
    justification: 'Complete current/initial root authoring omits supported tabindex while all12 native backend DOM roots have tabindex0 and all12 candidate roots omit it. Bound current/installed/pinned projection supports the public input. Keep child focusability,keyboard navigation,orientation,descriptions and focus runtime ordering separate.',
    recommendation: 'Preserve the native container focusability input in future fixture correction. Do not force focus,change default listbox semantics or alter child hit regions to conceal the omission.' },
  { id: 'fixture-paginator-group-accessible-name-substitution', component: 'paginator', owner: 'Material paginator group accessible-name authoring',
    property: 'group aria-label/AX name', reference: 'no aria-label;empty AX group name', astylar: expectedName,
    justification: 'Complete current/initial root authoring supplies a content-derived ariaLabel absent from the reference. All12 paired backend DOM/AX roots expose precisely that input difference. Supported name projection is fully bound;this is not a bridge naming failure. Reference accessibility design may merit separate review,but reference truth is not changed by this audit.',
    recommendation: 'Resolve shared semantic intent explicitly in a future fixture review;do not silently rename the reference or change visible text/core accessible-name rules to manufacture parity.' }
].map(row => ({ id: row.id, file: candidate, pattern: escape(current.excerpts[row.component]),
  introducedBy: 'Initial2f440115 already contains the differing root metadata;initial runtime and API support/motive at that revision unproven.',
  classification: 'application-plugin-authoring-defect', owner: row.owner, focusedProof: 'node scripts/review-group-semantic-inputs.mjs', history: [history],
  observation: { component: row.component, staticPairs: 12, property: row.property, reference: row.reference, astylar: row.astylar, stage: 'authored SiteData before semantic projection' },
  justification: row.justification, recommendation: row.recommendation,
  evidence: [candidate, types, bridge, reportFile, bindingFile, ...observations.filter(o => o.family === row.component).map(o => o.file)].map(receipt),
  boundary: 'Twelve static pairs per family and initial/current executed authoring. Not all AX properties,keyboard/event behavior,AT traversal,current whole rendering or case closure.' }));
for (const f of findings) { assert.ok(new RegExp(f.pattern).test(source)); assert.ok(!predecessor.groups.some(r => r.id === f.id)); }
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: 182, sha256: predecessorId }, groups: [...predecessor.groups, ...findings] };
assert.deepEqual(review.groups.slice(0, -2), predecessor.groups);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-group-semantic-inputs.mjs'), saved, current, history, observations,
  sourceBindingReuse: receipt(bindingFile), report: receipt(reportFile), negativeControlsRejected: controls,
  complete182PredecessorPreserved: true, registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
