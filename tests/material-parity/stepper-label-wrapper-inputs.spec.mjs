import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { stepperLabelWrapperFinding } from './stepper-label-wrapper-finding.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cls = (node, name) => node.attributes?.class?.split(/\s+/).includes(name);
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
function inspect(reference, candidate) {
  for (const id of ['step-details', 'step-review']) {
    const nativeText = one(reference.nodes.filter(n => n.attributes?.id === `${id}-text`));
    const inner = one(reference.nodes.filter(n => n.key === nativeText.parent));
    const outer = one(reference.nodes.filter(n => n.key === inner.parent));
    const header = one(reference.nodes.filter(n => n.key === outer.parent));
    assert.ok(cls(inner, 'mat-step-text-label')); assert.ok(cls(outer, 'mat-step-label'));
    assert.equal(header.attributes.role, 'tab');
    for (const [node, minWidth] of [[inner, '0px'], [outer, '50px']]) {
      const style = reference.styles[node.style];
      assert.equal(style.display, 'block'); assert.equal(style.minWidth, minWidth);
      assert.equal(style.overflowX, 'hidden'); assert.equal(style.overflowY, 'hidden');
      assert.equal(style.whiteSpace, 'nowrap'); assert.equal(style.textOverflow, 'ellipsis');
    }
    const text = one(candidate.nodes.filter(n => n.authored?.id === `${id}-text`));
    const tab = one(candidate.nodes.filter(n => n.authored?.id === id));
    assert.equal(text.parent, tab.key); assert.equal(tab.authored.role, 'tab');
    assert.equal(text.authored.textContent, nativeText.ownText);
    assert.equal(text.resolvedStyle.display, 'inline'); assert.equal(text.resolvedStyle.whiteSpace, 'nowrap');
    for (const property of ['overflow', 'overflowX', 'overflowY', 'minWidth', 'textOverflow'])
      assert.equal(text.resolvedStyle[property], undefined);
  }
}

test('68 retained Stepper cases omit native clipped minimum-width label wrappers', () => {
  const bytes = readFileSync('artifacts/material-parity/working-audit/3252368beb18426245167b716fe22c6af0d2c4ce8da283ef574f43b89cc686aa/index.json');
  assert.equal(hash(bytes), 'ff2b1a1d86fb00467f1673f6db0f4b98febc1c2f33b12d45f8c37057aee54cb5');
  const rows = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases.filter(r => r.family === 'stepper');
  assert.equal(rows.length, 68); assert.equal(new Set(rows.map(r => r.case)).size, 68);
  let controls = 0;
  for (const row of rows) {
    const receipts = row.obligations.inputStyleStructure.recordedStepperNodeAccounting.evidence.pairedTrees;
    const trees = ['reference', 'astylar'].map(side => {
      const bytes = readFileSync(receipts[side].file); assert.equal(hash(bytes), receipts[side].sha256);
      return JSON.parse(bytes);
    });
    inspect(...trees);
    for (const mutate of [
      ([r]) => { r.styles[r.nodes.find(n => cls(n, 'mat-step-label')).style].minWidth = '0px'; },
      ([r]) => { r.styles[r.nodes.find(n => cls(n, 'mat-step-text-label')).style].textOverflow = 'clip'; },
      ([, a]) => { a.nodes.find(n => n.authored?.id === 'step-review-text').parent = 'root'; },
      ([, a]) => { a.nodes.find(n => n.authored?.id === 'step-details-text').resolvedStyle.overflowX = 'hidden'; },
    ]) {
      const changed = structuredClone(trees); mutate(changed); assert.throws(() => inspect(...changed)); controls++;
    }
  }
  assert.equal(controls, 272);
  console.log(JSON.stringify({ cases: 68, nativeWrappers: 272, candidateLabels: 136, negativeControls: controls,
    classification: 'application-plugin-authoring-defect', firstDivergence: 'omitted label wrapper structure and constraints',
    boundary: 'Retained input mismatch only. Omitted candidate properties are not asserted computed defaults. No long-label clipping, anonymous-box, core defect, current rendering or whole-case acceptance.' }));
});

test('pending Stepper wrapper finding preserves the complete registry and pins initial authoring', () => {
  assert.equal(sourceAuditDefinitions.length, 204);
  assert.deepEqual(sourceAuditDefinitions[0], stepperLabelWrapperFinding);
  const predecessor = sourceAuditDefinitions.slice(1);
  assert.equal(hash(JSON.stringify(predecessor)), '6f0d54b1e201a45dcbeb15d19fc0475c3e899d1bafd4b7c87cfff185bde02573');
  assert.ok(!predecessor.some(f => f.id === stepperLabelWrapperFinding.id));
  const staged = [stepperLabelWrapperFinding, ...predecessor];
  assert.equal(staged.length, 204); assert.equal(new Set(staged.map(f => f.id)).size, 204);
  assert.deepEqual(staged, sourceAuditDefinitions);
  assert.equal(stepperLabelWrapperFinding.classification, 'application-plugin-authoring-defect');
  const file = stepperLabelWrapperFinding.file;
  const original = execFileSync('git', ['show', `2f440115:${file}`], { encoding: 'utf8' });
  for (const source of [original, readFileSync(file, 'utf8')]) {
    assert.equal([...source.matchAll(new RegExp(stepperLabelWrapperFinding.pattern, 'g'))].length, 1);
    for (const id of ['step-details-text', 'step-review-text'])
      assert.ok(source.includes(`type: 'span', id: '${id}', class: 'step-text'`));
  }
});
