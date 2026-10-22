import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const candidate = 'examples/material-showcase/src/app/astylar.component.ts';
const predecessorId = '841cdeeb0bdc7f5a6d43a8cab99de11a4b64118f8887b9bc008be397db1c89fd';
const predecessor = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessorId}.json`)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 189);
assert.equal(definitions.length, 180); assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const tooltipFinding = 'fixture-tooltip-persistent-description-association-conditioned-on-popup';
assert.ok(definitions.some(d => d.id === tooltipFinding));
function method(source) {
  const ast = ts.createSourceFile(candidate, source, 99, true);
  const owner = one(ast.statements.filter(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent'));
  return one(owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === 'familyElements')).getText(ast).replaceAll('\r\n', '\n');
}
function authored(source) {
  const text = method(source), emitted = ts.transpileModule(`class Probe { ${text} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None } }).outputText;
  const Probe = new Function(emitted + ';return Probe;')();
  const flat = nodes => nodes.flatMap(n => [n, ...flat(n.children ?? [])]);
  const states = [];
  for (const open of [false, true]) for (const focused of [false, true]) {
    const p = new Probe(); p.store = { state: () => ({ open, sortDirection: 'asc' }), tokens: () => ({ density: 0, onSurface: '#1d1b20' }) };
    p.focusedId = () => focused ? 'sort-trigger' : undefined; p.focusVisibleId = p.focusedId;
    const sort = flat(p.familyElements('sort')), trigger = one(sort.filter(n => n.id === 'sort-trigger'));
    assert.equal(trigger.ariaDescribedby, undefined);
    assert.ok(!sort.some(n => n.textContent === 'Sort' || n.value === 'Sort'));
    const tooltip = flat(p.familyElements('tooltip')), help = one(tooltip.filter(n => n.id === 'tooltip-primary'));
    assert.equal(help.ariaDescribedby, open ? 'tooltip-popup' : undefined);
    assert.equal(tooltip.filter(n => n.id === 'tooltip-popup').length, open ? 1 : 0);
    states.push({ open, focused, sortTrigger: Object.fromEntries(Object.entries(trigger).filter(([k]) => k !== 'children')), tooltipAssociation: help.ariaDescribedby ?? null });
  }
  return { wholeMethodSha256: hash(text), states };
}
const source = fs.readFileSync(candidate, 'utf8'), current = authored(source);
const marker = "type: 'div', id: 'sort-trigger', class:";
assert.equal(source.split(marker).length, 2);
assert.throws(() => authored(source.replace(marker, "type: 'div', id: 'sort-trigger', ariaDescribedby: 'sort-help', class:")));
const initialRevision = '2f440115740ff76fa9e55b3f4a11568207b2af5a';
const initialBytes = execFileSync('git', ['show', `${initialRevision}:${candidate}`], { maxBuffer: 4000000 });
const history = { revision: initialRevision, file: candidate, sha256: hash(initialBytes), observation: authored(initialBytes.toString()) };
const bindingFile = 'artifacts/material-parity/list-static-ax-review-20261021.log';
const bindings = JSON.parse(fs.readFileSync(bindingFile)).bindings;
for (const binding of bindings) {
  assert.equal(receipt(binding.current.file).sha256, binding.current.sha256);
  assert.equal(receipt(binding.sourceMap.file).sha256, binding.sourceMap.sha256);
  const map = JSON.parse(fs.readFileSync(binding.sourceMap.file)), index = map.sources.indexOf(binding.sourcePath); assert.ok(index >= 0);
  if (binding.current.file === candidate) assert.equal(method(map.sourcesContent[index]), method(source));
  else assert.equal(map.sourcesContent[index].replaceAll('\r\n', '\n'), fs.readFileSync(binding.current.file, 'utf8').replaceAll('\r\n', '\n'));
}
const root = 'artifacts/material-parity/remaining-static-ax-resume-20261022', reportFile = root + '/latest-report.json';
const report = JSON.parse(fs.readFileSync(reportFile)); assert.equal(report.observations.length, 678);
assert.equal(report.provenance.checkpoint.sha256, '9d0f1220ea6c2ca95cbfb143d94f7f5680a0d8cb11e074db879768f9763fd5b0');
for (const r of Object.values(report.provenance).filter(r => r?.file && r?.sha256)) assert.equal(receipt(r.file).sha256, r.sha256);
const attrs = d => Object.fromEntries(Array.from({ length: d.attributes.length / 2 }, (_, i) => d.attributes.slice(i * 2, i * 2 + 2)));
function inspect(o) {
  assert.equal(o.browser, '155.0.8059.80'); assert.deepEqual(o.runtimeErrors, []);
  assert.ok(['sort', 'tooltip'].includes(o.family)); assert.ok(['reference', 'astylar'].includes(o.mode));
  const native = o.mode === 'reference', name = o.family === 'sort' ? 'Sort by name' : 'Hover for help';
  const n = one(o.nodes.filter(n => !n.ignored && n.role.value === 'button' && n.name.value === name));
  const d = one(o.dom.filter(d => d.backendNodeId === n.backendDOMNodeId)), a = attrs(d);
  if (native && o.family === 'sort') {
    const parent = one(o.nodes.filter(p => p.nodeId === n.parentId));
    const parentDom = one(o.dom.filter(d => d.backendNodeId === parent.backendDOMNodeId));
    assert.equal(attrs(parentDom).id, 'sort-trigger'); assert.equal(a.role, 'button');
    assert.ok(a.class.split(' ').includes('mat-sort-header-container'));
  } else assert.equal(a[native ? 'id' : 'data-astylar-id'], o.family === 'sort' ? 'sort-trigger' : 'tooltip-primary');
  assert.equal(n.description?.value, native ? o.family === 'sort' ? 'Sort' : 'Create a project' : undefined);
  const links = n.properties.filter(p => p.name === 'describedby'); assert.equal(links.length, native ? 1 : 0);
  let target;
  if (native) {
    const link = one(links), related = one(link.value.relatedNodes); assert.equal(a['aria-describedby'], related.idref);
    target = one(o.dom.filter(d => d.backendNodeId === related.backendDOMNodeId)); assert.equal(attrs(target).id, related.idref);
  } else assert.equal(a['aria-describedby'], undefined);
  return { backend: n.backendDOMNodeId, name: n.name, description: n.description, attributes: a, links, target };
}
const rows = report.observations.filter(r => ['sort', 'tooltip'].includes(r.family)); assert.equal(rows.length, 48);
const pairs = new Map(); let controls = 1;
const observations = rows.map(row => {
  const file = root + '/' + row.file, bytes = fs.readFileSync(file); assert.equal(hash(bytes), row.sha256);
  const o = JSON.parse(bytes); assert.equal(o.family, row.family); assert.equal(o.mode, row.mode); assert.deepEqual(o.viewport, row.viewport);
  const result = inspect(o), key = `${row.family}/${row.profile}/${row.viewport.id}`, pair = pairs.get(key) ?? [];
  pair.push(row.mode); pairs.set(key, pair);
  for (const mutate of [v => { one(v.nodes.filter(n => !n.ignored && n.role.value === 'button')).description = { value: 'forged' }; },
    v => { const n = one(v.nodes.filter(n => !n.ignored && n.role.value === 'button')); const d = one(v.dom.filter(d => d.backendNodeId === n.backendDOMNodeId));
      d.attributes = d.attributes.filter((value, i, all) => i % 2 ? all[i - 1] !== 'aria-describedby' : value !== 'aria-describedby');
      d.attributes.push('aria-describedby', 'forged-target'); }]) {
    const forged = structuredClone(o); mutate(forged); assert.throws(() => inspect(forged)); controls++;
  }
  return { family: row.family, profile: row.profile, viewport: row.viewport, mode: row.mode, file, sha256: row.sha256, result };
});
assert.equal(pairs.size, 24); for (const pair of pairs.values()) assert.deepEqual(pair.sort(), ['astylar', 'reference']); assert.equal(controls, 97);
const finding = {
  id: 'fixture-sort-description-association-omitted', file: candidate,
  pattern: "type: 'div', id: 'sort-trigger', class:", classification: 'application-plugin-authoring-defect',
  introducedBy: 'Initial2f440115 already omits the sort description input;first runtime/motive and public support at that revision are unproven.',
  owner: 'Material sort action-description relationship and target authoring before semantic projection',
  focusedProof: 'node scripts/review-sort-description-inputs.mjs', history: [history],
  observation: { component: 'sort', staticPairs: 12, property: 'aria-describedby/AX description', reference: 'related target resolves;AX description Sort', astylar: 'no relationship or Sort help target supplied;AX description absent', stage: 'authored SiteData' },
  justification: 'All12 pinned static pairs authenticate actual backend DOM/AX association and target identity. Complete initial/current authoring executes across open/focused variants and omits the sort relationship and help target. Complete current familyElements matches the captured source map;reference source also binds. This establishes unequal fixture input before the renderer,not hidden-target pruning or a coordinate defect. The separately demonstrated equal-input hidden-reference core failure remains required and must not be masked when equivalent hidden help is eventually authored. Tooltip static observations reuse its existing persistent-description finding rather than adding a duplicate.',
  recommendation: 'Preserve native action-help intent through the shared public relationship contract in later implementation,after fixing the independently demonstrated core hidden-target behavior. Do not copy help into the accessible name,expose hidden help visually,change reference truth or use placement offsets.',
  evidence: [candidate, 'examples/material-showcase/src/app/reference.component.ts', bindingFile, ...bindings.map(b => b.sourceMap.file), reportFile, ...observations.filter(o => o.family === 'sort').map(o => o.file)].map(receipt),
  boundary: 'Twelve initial-state sort pairs,plus12 tooltip controls and executed authored open/focused variants. Not all interactive AX endpoints,AT behavior,sort toggling,paint or complete-case/current whole-rendering acceptance.'
};
assert.ok(new RegExp(finding.pattern).test(source)); assert.ok(!predecessor.groups.some(d => d.id === finding.id));
const review = { kind: 'material-source-finding-review', registrationPending: true, predecessor: { count: 189, sha256: predecessorId }, groups: [...predecessor.groups, finding] };
assert.deepEqual(review.groups.slice(0, -1), predecessor.groups);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-sort-description-inputs.mjs'), saved, current, history, bindings, observations,
  negativeControlsRejected: controls, reusedTooltipFinding: tooltipFinding, complete189PredecessorPreserved: true,
  registrationPending: true, canonicalPublication: false, inspectionComplete: false, renderingAccepted: false }));
