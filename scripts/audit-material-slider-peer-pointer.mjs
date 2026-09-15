import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { inspectSliderInputBox } from '../tests/material-parity/slider-input-box-evidence.mjs';

const root = process.cwd(), target = 'docs/material-slider-peer-pointer-survey.json';
const hash = value => createHash('sha256').update(value).digest('hex');
const prior = JSON.parse(readFileSync('docs/material-slider-border-defaults.json'));
const bytes = readFileSync(prior.capture.file);
assert.equal(hash(bytes), prior.capture.sha256);
const raw = JSON.parse(bytes);
const entries = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'slider');
assert.equal(entries.length, 78);
const sourceFile = 'examples/material-showcase/node_modules/@angular/material/fesm2022/slider.mjs';
const source = readFileSync(sourceFile, 'utf8');
const add = "this._sibling._hostElement.classList.add('mat-mdc-slider-input-no-pointer-events');";
const remove = "this._sibling._hostElement.classList.remove('mat-mdc-slider-input-no-pointer-events');";
assert.equal(source.split(add).length, 2); assert.equal(source.split(remove).length, 2);
const observations = [];
for (const entry of entries) {
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const descriptor = entry.inputTrees[side], file = path.resolve(root, descriptor.file);
    assert.ok(file.startsWith(path.resolve(root, 'artifacts/material-parity') + path.sep));
    const treeBytes = readFileSync(file); assert.equal(hash(treeBytes), descriptor.sha256);
    trees[side] = JSON.parse(treeBytes);
  }
  const key = `${entry.kind}:slider@${entry.profile}/${entry.viewport.id}${entry.state ? `/${entry.state}` : ''}`;
  const owners = [];
  for (const id of ['slider-start', 'slider-primary']) {
    const input = entry.styleInputs.find(i => i.id === id);
    const box = inspectSliderInputBox(entry, input, trees.reference, trees.astylar); assert.ok(box, `${key}/${id}`);
    const node = trees.reference.nodes.find(n => n.key === box.reference.node);
    const candidate = trees.astylar.nodes.find(n => n.key === box.candidate.node);
    const rules = node.rules.map(i => trees.reference.rules[i]);
    const related = declarations => Object.keys(declarations ?? {}).some(k => /^(pointerevents|all|animation|transition)/.test(k.replaceAll('-', '').toLowerCase()));
    const pointerRules = rules.filter(r => related(r.declarations));
    const suppressed = id === 'slider-start' && entry.state === 'held';
    assert.equal(input.reference.pointerEvents, suppressed ? 'none' : 'auto');
    assert.equal(String(node.attributes.class).split(/\s+/).includes('mat-mdc-slider-input-no-pointer-events'), suppressed);
    if (suppressed) {
      assert.equal(pointerRules.length, 1); assert.equal(pointerRules[0].active, true);
      assert.equal(pointerRules[0].selector, '.mdc-slider__input.mat-mdc-slider-input-no-pointer-events');
      assert.deepEqual(pointerRules[0].declarations, { 'pointer-events': { value: 'none', important: false } });
    } else assert.equal(pointerRules.length, 0);
    assert.equal(input.astylar.pointerEvents, undefined);
    assert.ok(!related(candidate.authored.style));
    assert.ok(input.astylarAuthored.every(r => !related(r.declarations)));
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.ok(!related(candidate[stage]));
    owners.push({ element: id, referenceNode: node.key, candidateNode: candidate.key, referenceClass: node.attributes.class,
      referenceComputed: input.reference.pointerEvents, referencePointerRules: pointerRules,
      candidateLocalDeclaration: '<omitted>', candidateMatchingRules: input.astylarAuthored,
      candidateStagesOmitPointerEvents: true, suppressedSibling: suppressed });
  }
  observations.push({ case: key, state: entry.state ?? 'static', inputTrees: entry.inputTrees, owners });
}
const held = observations.filter(o => o.owners.some(n => n.suppressedSibling));
assert.equal(held.length, 8); assert.equal(new Set(held.map(o => o.case)).size, 8);
const sourceLine = needle => source.slice(0, source.indexOf(needle)).split('\n').length;
const files = ['scripts/audit-material-slider-peer-pointer.mjs', 'tests/material-parity/slider-input-box-evidence.mjs',
  'examples/material-showcase/src/app/astylar.component.ts', sourceFile];
const result = { schemaVersion: 1, kind: 'slider-held-sibling-pointer-request-survey', capture: prior.capture,
  sourceFingerprints: files.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
  cases: observations.length, owners: observations.length * 2, suppressedSiblingCases: held.length,
  candidateComputedPointerEventsVerified: false, dragCauseVerified: false, canonicalIntegration: false,
  installedReferenceMechanism: { file: sourceFile, pointerDownAddLine: sourceLine(add), pointerUpRemoveLine: sourceLine(remove),
    scope: 'Installed source explains the class seen in original captures; pointer-up scheduling is source evidence, not a newly replayed interaction.' },
  observations,
  findings: ['All eight original held states explicitly suppress the reference start-thumb sibling while the end thumb remains auto.',
    'The other seventy captured cases have auto on both reference inputs. Candidate matching requests and all three local snapshots omit pointer-events throughout.',
    'This is a state-input discrepancy before layout/projection. Its causal role in swapped/jerky dragging is unproven.'],
  nextProof: 'Trace both start-active and end-active sequences, pointer capture, sibling suppression and release/cancel through equivalent public inputs. Keep range domains, peer-dependent hit-region geometry and core coordinate targeting as separate variables. Do not add a fixture-local pointer patch.',
  limits: ['No candidate computed pointer-events value is synthesized from local omission.',
    'This survey does not prove ancestor consumption, actual hit-test exclusion, core pointer capture, release timing or final rendering.',
    'No canonical attribution changes, renderer changes or fixture rewrites are made.'] };
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
else writeFileSync(target, output);
console.log(JSON.stringify({ file: target, cases: result.cases, owners: result.owners, suppressedSiblingCases: held.length, dragCauseVerified: false }));
