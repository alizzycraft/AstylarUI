import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex'), receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const predecessorId = '17e767f287e4a499a901d8645a57981f87d17b035a668e7b8390414f03eaca96';
const predecessor = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessorId}.json`)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 184);
assert.equal(definitions.length, 180); assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const one = a => { assert.equal(a.length, 1); return a[0]; };
function authored(source) {
  const ast = ts.createSourceFile(candidate, source, 99, true), owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  const method = one(owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'familyElements')).getText(ast);
  const emitted = ts.transpileModule(`class Probe { ${method} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Probe = new Function(emitted + ';return Probe;')(), probe = new Probe();
  probe.store = { state: () => ({ selected: true, open: false, error: false, disabled: false }), tokens: () => ({ density: 0, mode: 'light' }) }; probe.focusedId = () => undefined;
  const flat = nodes => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
  const select = one(flat(probe.familyElements('select')).filter(n => n.id === 'select-control'));
  const timeNodes = flat(probe.familyElements('timepicker')), input = one(timeNodes.filter(n => n.id === 'timepicker-control')), icon = one(timeNodes.filter(n => n.id === 'timepicker-icon'));
  assert.equal(select.type, 'input'); assert.equal(select.inputType, 'text'); assert.equal(select.readonly, true); assert.equal(select.role, 'combobox');
  assert.equal(input.ariaHaspopup, 'dialog'); assert.equal(input.role, 'combobox');
  return { select, timeInput: input, timeIcon: icon, wholeMethodSha256: hash(method), excerpts: {
    select: method.split(/\r?\n/).find(l => l.includes("inputType: 'text', id: 'select-control'")),
    time: method.split(/\r?\n/).find(l => l.includes("ariaHaspopup: 'dialog'")) } };
}
const source = fs.readFileSync(candidate, 'utf8'), current = authored(source);
assert.equal(current.timeIcon.type, 'button'); assert.equal(current.timeIcon.ariaLabel, 'Open time options');
assert.equal(current.timeIcon.ariaHaspopup, undefined); assert.equal(current.timeIcon.ariaExpanded, undefined);
assert.throws(() => authored(source.replace("ariaHaspopup: 'dialog'", "ariaHaspopup: 'listbox'")));
assert.throws(() => authored(source.replace('readonly: true', 'readonly: false')));
const introduction = '7159b1d5266ed4bc03b56581b8034526abae892b', parent = execFileSync('git', ['rev-parse', introduction + '^'], { encoding: 'utf8' }).trim();
const history = ['2f440115740ff76fa9e55b3f4a11568207b2af5a', parent, introduction].map(revision => {
  const bytes = execFileSync('git', ['show', `${revision}:${candidate}`], { maxBuffer: 4000000 });
  return { revision, file: candidate, sha256: hash(bytes), observation: authored(bytes.toString()) };
});
assert.equal(history[1].observation.timeIcon.type, 'span'); assert.equal(history[2].observation.timeIcon.type, 'button');
assert.equal(history[2].observation.timeIcon.ariaLabel, current.timeIcon.ariaLabel);
assert.equal(history[2].observation.timeIcon.ariaHaspopup, undefined); assert.equal(history[2].observation.timeIcon.ariaExpanded, undefined);
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022', reportFile = root + '/latest-report.json', report = JSON.parse(fs.readFileSync(reportFile));
assert.equal(report.observations.length, 678); assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const rows = report.observations.filter(r => ['select', 'timepicker'].includes(r.family)); assert.equal(rows.length, 48);
function inspect(o) {
  assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []); const native = o.mode === 'reference'; assert.ok(native || o.mode === 'astylar');
  const combo = one(o.nodes.filter(n => !n.ignored && n.role.value === 'combobox')), dom = one(o.dom.filter(d => d.backendNodeId === combo.backendDOMNodeId));
  const attrs = Object.fromEntries(Array.from({ length: dom.attributes.length / 2 }, (_, i) => dom.attributes.slice(i * 2, i * 2 + 2)));
  const property = (node, name) => node.properties.filter(p => p.name === name).map(p => p.value.value);
  assert.equal(attrs[native ? 'id' : 'data-astylar-id'], `${o.family}-control`);
  const result = { combo: { backend: combo.backendDOMNodeId, name: combo.name, properties: combo.properties, nodeName: dom.nodeName, attributes: attrs } };
  if (o.family === 'select') {
    assert.equal(combo.name.value, 'Plan'); assert.equal(dom.nodeName, native ? 'MAT-SELECT' : 'INPUT');
    assert.equal(attrs.readonly, native ? undefined : ''); assert.equal(attrs.type, native ? undefined : 'text');
    assert.deepEqual(property(combo, 'editable'), native ? [] : ['plaintext']);
  } else {
    assert.equal(o.family, 'timepicker'); assert.equal(combo.name.value, 'Meeting time');
    assert.equal(attrs['aria-haspopup'], native ? 'listbox' : 'dialog'); assert.deepEqual(property(combo, 'hasPopup'), [native ? 'listbox' : 'dialog']);
    const icon = one(o.nodes.filter(n => !n.ignored && n.role.value === 'button')), iconDom = one(o.dom.filter(d => d.backendNodeId === icon.backendDOMNodeId));
    const iconAttrs = Object.fromEntries(Array.from({ length: iconDom.attributes.length / 2 }, (_, i) => iconDom.attributes.slice(i * 2, i * 2 + 2)));
    assert.equal(icon.name.value, native ? 'Open timepicker options' : 'Open time options');
    assert.deepEqual(property(icon, 'hasPopup'), native ? ['listbox'] : []); assert.deepEqual(property(icon, 'expanded'), native ? [false] : []);
    result.icon = { backend: icon.backendDOMNodeId, name: icon.name, properties: icon.properties, attributes: iconAttrs };
  }
  return result;
}
let controls = 2; const pairs = new Map();
const observations = rows.map(row => {
  const file = root + '/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256); const o = JSON.parse(bytes), result = inspect(o);
  const key = `${row.family}/${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? []; pair.push(row.mode); pairs.set(key, pair);
  for (const mutate of [v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'combobox')).name.value = 'forged'; },
    v => { const node = one(v.nodes.filter(n => !n.ignored && n.role.value === 'combobox')); one(v.dom.filter(d => d.backendNodeId === node.backendDOMNodeId)).attributes.push('type', 'forged', 'aria-haspopup', 'forged'); }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, file, sha256: row.sha256, result };
});
assert.equal(pairs.size, 24); for (const pair of pairs.values()) assert.deepEqual(pair.sort(), ['astylar', 'reference']); assert.equal(controls, 98);
const probeFile = 'artifacts/material-parity/readonly-combobox-native-probe-20261022.log', probe = JSON.parse(fs.readFileSync(probeFile));
assert.equal(probe.browser, '155.0.8059.80'); assert.deepEqual(probe.runtimeErrors, []); assert.equal(probe.readonlyAfter, 'Team'); assert.notEqual(probe.editableAfter, 'Team');
assert.equal(one(probe.states.filter(s => s.id === 'readonly')).readOnly, true);
for (const id of ['readonly', 'editable', 'host']) {
  const dom = one(probe.dom.filter(d => { const i = d.attributes.indexOf('id'); return i >= 0 && d.attributes[i + 1] === id; }));
  const node = one(probe.nodes.filter(n => !n.ignored && n.backendDOMNodeId === dom.backendNodeId && n.role.value === 'combobox'));
  assert.deepEqual(node.properties.filter(p => p.name === 'editable').map(p => p.value.value), id === 'host' ? [] : ['plaintext']);
}
const bindingFile = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bindingFile));
const types = 'src/app/types/dom-element.ts', bridge = 'src/lib/astylar-semantic-bridge.ts';
for (const field of ['readonly?: boolean;', 'ariaHaspopup?:', 'ariaExpanded?:']) assert.ok(fs.readFileSync(types, 'utf8').includes(field));
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const findings = [
  { id: 'fixture-timepicker-trigger-popup-metadata-substitution', component: 'timepicker', owner: 'Material timepicker combobox and toggle semantic metadata authoring',
    reference: 'input/listbox popup;toggle Open timepicker options+hasPopup listbox+expanded false', astylar: 'input/dialog popup;toggle Open time options without popup/expanded metadata',
    introducedBy: 'Initial2f440115 already authors dialog popup;7159b1d5 replaces presentation icon with the current differently named button lacking popup/expanded metadata. Historical runtime/motive unproven.',
    justification: 'All12 actual static pairs expose metadata matching the unequal authored inputs. Complete current/initial and exact icon-introduction parent/child methods execute with these values. Public fields are supported by the fully bound current/installed/pinned bridge. This is not a reason to change datepicker metadata or merge time/date focus behavior.',
    recommendation: 'Preserve native timepicker-specific popup kind and toggle metadata in future fixture correction,without changing datepicker behavior or tuning popup coordinates.' },
  { id: 'fixture-select-readonly-text-input-replaces-noneditable-host', component: 'select', owner: 'Material select control semantic element authoring',
    reference: 'non-text MAT-SELECT combobox host;no AX editable property', astylar: 'readonly text INPUT combobox;AX editable plaintext',
    introducedBy: 'Initial2f440115 already uses readonly text input;historical runtime/motive unproven.',
    justification: 'All12 paired backend controls have different semantic element kinds before projection. Candidate readonly is present in actual DOM,not dropped. A native same-Chromium control reproduces editable=plaintext on readonly text input while typed X does not change its value;generic non-text combobox has no editable property. Do not infer a readonly bridge failure from this AX token. Known core readonly-keyboard defaults remain a distinct finding;this probe does not test AstylarUI keyboard behavior.',
    recommendation: 'Review reference-equivalent noneditable semantic control composition at the fixture boundary in future implementation. Do not remove readonly,normalize away AX differences or change core editable reporting to mimic a different authored element.' }
].map(row => ({ id: row.id, file: candidate, pattern: escape(current.excerpts[row.component === 'select' ? 'select' : 'time']), introducedBy: row.introducedBy,
  classification: 'application-plugin-authoring-defect', owner: row.owner, focusedProof: 'node scripts/review-picker-semantic-inputs.mjs', history,
  observation: { component: row.component, staticPairs: 12, property: 'semantic control kind/popup metadata', reference: row.reference, astylar: row.astylar, stage: 'authored SiteData before semantic projection' },
  justification: row.justification, recommendation: row.recommendation,
  evidence: [candidate, types, bridge, reportFile, bindingFile, ...(row.component === 'select' ? [probeFile] : []), ...observations.filter(o => o.family === row.component).map(o => o.file)].map(receipt),
  boundary: 'Twelve static pairs per family,whole authored methods and bounded native Chromium diagnostic. Not all AX relationships,interaction/AT behavior,current whole rendering or case closure.' }));
for (const f of findings) { assert.ok(new RegExp(f.pattern).test(source)); assert.ok(!predecessor.groups.some(r => r.id === f.id)); }
const review = { kind: 'material-source-finding-review', registrationPending: true, predecessor: { count: 184, sha256: predecessorId }, groups: [...predecessor.groups, ...findings] };
assert.deepEqual(review.groups.slice(0, -2), predecessor.groups);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-picker-semantic-inputs.mjs'), saved, current, history, observations,
  nativeProbe: receipt(probeFile), sourceBindingReuse: receipt(bindingFile), report: receipt(reportFile), negativeControlsRejected: controls,
  complete184PredecessorPreserved: true, registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
