import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex'), receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const predecessorId = '0951b7aea1b37f03ead47c7870385ca328c4fe59d4a721be9099b4ab121eef02';
const predecessor = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessorId}.json`)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 186);
assert.equal(definitions.length, 180); assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const one = a => { assert.equal(a.length, 1); return a[0]; }, candidate = 'examples/material-showcase/src/app/astylar.component.ts';
function authored(source, checkboxType = 'div') {
  const ast = ts.createSourceFile(candidate, source, 99, true), owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  const method = one(owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'familyElements')).getText(ast);
  const helpers = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'selectionMark').map(n => n.getText(ast));
  const emitted = ts.transpileModule(`class Probe { ${method}\n${helpers.join('\n')} }`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Probe = new Function(emitted + ';return Probe;')(), result = [];
  for (const selected of [false, true]) {
    const probe = new Probe(); probe.store = { state: () => ({ selected, disabled: false, open: false, error: false }), tokens: () => ({ primary: '#6750a4', onPrimary: '#ffffff', mode: 'light', density: 0 }) };
    const flat = a => a.flatMap(n => [n, ...flat(n.children ?? [])]);
    for (const family of ['checkbox', 'radio', 'slide-toggle']) {
      const nodes = flat(probe.familyElements(family)), ids = family === 'radio' ? ['radio-solo', 'radio-team'] : [`${family}-primary`];
      const controls = ids.map(id => {
        const n = one(nodes.filter(n => n.id === id)); assert.equal(n.type, family === 'checkbox' ? checkboxType : 'div');
        if (n.type === 'input') { assert.equal(n.inputType, 'checkbox'); assert.equal(n.checked, selected); }
        else { assert.equal(n.role, family === 'radio' ? 'radio' : family === 'checkbox' ? 'checkbox' : 'switch'); assert.equal(n.ariaChecked, id === 'radio-solo' ? !selected : selected); }
        return Object.fromEntries(Object.entries(n).filter(([key]) => key !== 'children'));
      }); result.push({ family, selected, controls });
    }
  }
  return { states: result, wholeMethodSha256: hash(method), wholeHelperHashes: helpers.map(hash), excerpts: {
    radio: method.split(/\r?\n/).find(l => l.includes("type: 'div', id: 'radio-solo'")),
    'slide-toggle': method.split(/\r?\n/).find(l => l.includes("type: 'div', id: 'slide-toggle-primary'")) } };
}
const source = fs.readFileSync(candidate, 'utf8'), current = authored(source);
for (const marker of ["type: 'div', id: 'radio-solo'", "type: 'div', id: 'slide-toggle-primary'"])
  assert.throws(() => authored(source.replace(marker, marker.replace("'div'", "'button'"))));
const initial = '2f440115740ff76fa9e55b3f4a11568207b2af5a', initialBytes = execFileSync('git', ['show', `${initial}:${candidate}`], { maxBuffer: 4000000 });
const history = { revision: initial, file: candidate, sha256: hash(initialBytes), observation: authored(initialBytes.toString(), 'input') };
const historyFile = 'artifacts/material-parity/queued-control-source-history-20261020.log', historical = JSON.parse(fs.readFileSync(historyFile));
assert.deepEqual(execFileSync(process.execPath, historical.producerArgs, { maxBuffer: 4000000 }), fs.readFileSync(historyFile));
const checkboxTransition = one(historical.history.filter(r => r.kind === 'checkbox-disabled-primitive'));
assert.equal(checkboxTransition.commit, 'c47d589ac2cf1967cc321df38339cb64dabb3732');
const knownCheckboxFinding = 'fixture-checkbox-disabled-native-primitive-substitution'; assert.ok(definitions.some(r => r.id === knownCheckboxFinding));
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022', reportFile = root + '/latest-report.json', report = JSON.parse(fs.readFileSync(reportFile));
assert.equal(report.observations.length, 678); assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(hash(fs.readFileSync(r.file)), r.sha256);
const specs = { checkbox: [['checkbox', 'Include archived', 'true']], radio: [['radio', 'Solo', 'false'], ['radio', 'Team', 'true']], 'slide-toggle': [['switch', 'Automatic updates', 'true']] };
function inspect(o) {
  assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []); const native = o.mode === 'reference'; assert.ok(native || o.mode === 'astylar');
  const nodes = o.nodes.filter(n => !n.ignored && ['checkbox', 'radio', 'switch'].includes(n.role.value)); assert.equal(nodes.length, specs[o.family].length);
  return nodes.map((n, i) => {
    const [role, name, checked] = specs[o.family][i]; assert.equal(n.role.value, role); assert.equal(n.name.value, name);
    const prop = key => n.properties.filter(p => p.name === key); assert.equal(one(prop('checked')).value.value, checked); assert.equal(one(prop('focusable')).value.value, true);
    const d = one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId));
    const attrs = Object.fromEntries(Array.from({ length: d.attributes.length / 2 }, (_, i) => d.attributes.slice(i * 2, i * 2 + 2)));
    assert.equal(d.nodeName, native ? o.family === 'slide-toggle' ? 'BUTTON' : 'INPUT' : 'DIV');
    assert.equal(attrs.type, native ? o.family === 'slide-toggle' ? 'button' : o.family : undefined);
    assert.deepEqual(prop('invalid').map(p => p.value.value), native ? ['false'] : []);
    const association = prop('labelledby'); assert.equal(association.length, native ? 1 : 0); const labels = [];
    if (native) {
      const target = one(association[0].value.relatedNodes); assert.equal(target.text, name);
      const label = one(o.dom.filter(d => d.backendNodeId === target.backendDOMNodeId)); assert.equal(label.nodeName, 'LABEL');
      const labelAttrs = Object.fromEntries(Array.from({ length: label.attributes.length / 2 }, (_, i) => label.attributes.slice(i * 2, i * 2 + 2)));
      assert.equal(labelAttrs.for, attrs.id); labels.push({ backend: target.backendDOMNodeId, text: target.text, attributes: labelAttrs });
      if (o.family === 'radio') { assert.ok(attrs.name); assert.equal(attrs.value, i ? 'team' : 'solo'); }
    } else {
      assert.equal(attrs.role, role); assert.equal(attrs.name, undefined); assert.equal(attrs.value, undefined);
      assert.equal(attrs['aria-checked'], checked); assert.equal(attrs['aria-label'], o.family === 'radio' ? undefined : name);
    }
    return { role, name: n.name, backend: n.backendDOMNodeId, nodeName: d.nodeName, attributes: attrs, properties: n.properties, labels };
  });
}
let controls = 2; const pairs = new Map();
const observations = report.observations.filter(r => Object.hasOwn(specs, r.family)).map(row => {
  const file = root + '/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256); const o = JSON.parse(bytes), result = inspect(o);
  const key = `${row.family}/${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? {}; assert.equal(pair[row.mode], undefined); pair[row.mode] = { o, result }; pairs.set(key, pair);
  for (const mutate of [v => { v.nodes.find(n => !n.ignored && ['checkbox', 'radio', 'switch'].includes(n.role.value)).properties.find(p => p.name === 'checked').value.value = 'forged'; },
    v => { const node = v.nodes.find(n => !n.ignored && ['checkbox', 'radio', 'switch'].includes(n.role.value)); one(v.dom.filter(d => d.backendNodeId === node.backendDOMNodeId)).nodeName = 'SPAN'; }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, file, sha256: row.sha256, result };
});
assert.equal(observations.length, 72); assert.equal(pairs.size, 36); assert.equal(controls, 146);
for (const pair of pairs.values()) {
  assert.deepEqual(Object.keys(pair).sort(), ['astylar', 'reference']); assert.deepEqual(pair.reference.o.viewport, pair.astylar.o.viewport);
  assert.deepEqual(pair.reference.result.map(n => [n.role, n.name.value]), pair.astylar.result.map(n => [n.role, n.name.value]));
}
const bindingFile = 'artifacts/material-parity/material-semantic-visibility-binding-retry-20261021.log';
assert.deepEqual(execFileSync(process.execPath, ['scripts/check-material-semantic-visibility-binding.mjs'], { maxBuffer: 4000000 }), fs.readFileSync(bindingFile));
const types = 'src/app/types/dom-element.ts', bridge = 'src/lib/astylar-semantic-bridge.ts';
for (const field of ['inputType?: string;', 'name?: string;', 'checked?: boolean;', 'disabled?: boolean;']) assert.ok(fs.readFileSync(types, 'utf8').includes(field));
const findings = [
  { id: 'fixture-radio-native-input-group-replaced-by-role-divs', component: 'radio', owner: 'Material radio native input/group/value and label composition authoring',
    reference: 'native radio inputs with shared name,solo/team values,HTML labels and explicit aria-invalid=false', astylar: 'role-radio DIVs with ariaChecked,no form name/value and content naming',
    recommendation: 'Preserve reference-equivalent native input/group/value/label intent in future fixture correction. Retain the separate public native-checkable value-label core failure rather than masking it with role-DIV authoring or fabricated ARIA defaults.' },
  { id: 'fixture-switch-native-button-replaced-by-role-div', component: 'slide-toggle', owner: 'Material switch native button and label composition authoring',
    reference: 'native BUTTON role switch with associated HTML label', astylar: 'DIV role switch with direct ariaLabel and ariaChecked',
    recommendation: 'Preserve reference-equivalent button/label intent in future fixture correction. Do not turn generic role widgets into native form controls through core special cases or add offsets to hide the structural input difference.' }
].map(row => ({ id: row.id, file: candidate, pattern: current.excerpts[row.component].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  introducedBy: 'Initial2f440115 already authors the role-DIV representation;historical runtime/motive unproven.',
  classification: 'application-plugin-authoring-defect', owner: row.owner, focusedProof: 'node scripts/review-checkable-semantic-inputs.mjs', history: [history],
  observation: { component: row.component, staticPairs: 12, property: 'native semantic control and label/form metadata', reference: row.reference, astylar: row.astylar, stage: 'authored control kind and metadata before projection' },
  justification: 'All12 enabled static pairs preserve names/checked state but expose the different primitive,validity and label association inputs. Complete current/initial family methods execute both selected states with actual selectionMark helper when present. Supported native types/control fields and fully bound current/installed/pinned projection distinguish application composition from a proven core projection failure. Native defaults and explicit reference aria-invalid metadata remain recorded separately;no form-submission,disabled-focus or keyboard outcome is inferred from static AX.',
  recommendation: row.recommendation,
  evidence: [candidate, types, bridge, reportFile, bindingFile, ...observations.filter(o => o.family === row.component).map(o => o.file)].map(receipt),
  boundary: 'Twelve enabled static pairs per new finding and initial/current executed authoring. Checkbox reuses its existing cause/history separately. Not full control/form behavior,all disabled states,AT,paint,current whole rendering or case closure.' }));
for (const f of findings) { assert.ok(new RegExp(f.pattern).test(source)); assert.ok(!predecessor.groups.some(r => r.id === f.id)); }
const review = { kind: 'material-source-finding-review', registrationPending: true, predecessor: { count: 186, sha256: predecessorId }, groups: [...predecessor.groups, ...findings] };
assert.deepEqual(review.groups.slice(0, -2), predecessor.groups); const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-checkable-semantic-inputs.mjs'), saved, current, history, observations,
  sourceBindingReuse: receipt(bindingFile), existingCheckboxFinding: knownCheckboxFinding, existingCheckboxHistory: receipt(historyFile),
  reusedCheckboxTransition: { kind: checkboxTransition.kind, commit: checkboxTransition.commit, excerptSha256: checkboxTransition.excerptSha256 },
  report: receipt(reportFile), negativeControlsRejected: controls, complete186PredecessorPreserved: true,
  registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
