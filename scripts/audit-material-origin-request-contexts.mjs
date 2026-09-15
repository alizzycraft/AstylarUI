import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inspectTransformOriginDeclarationStage } from '../tests/material-parity/transform-origin-stage-evidence.mjs';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';

assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
const file = 'docs/material-origin-request-contexts.json';
const hash = b => createHash('sha256').update(b).digest('hex');
const capturePath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
const bytes = readFileSync(capturePath);
assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(bytes), entries = new Map();
for (const [kind, list] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of list)
  entries.set(`${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`, e);
const stagePath = 'docs/material-transform-origin-stage-survey.json';
const stageText = readFileSync(stagePath, 'utf8').replace(/\r\n/g, '\n'), stage = JSON.parse(stageText);
assert.equal(hash(stageText), '38e1435fedaf3068f2d395d3a83d5171106a309e270430096bab5f567fb35d1a');
const selected = stage.observations.filter(o => o.status === 'unresolved');
assert.equal(selected.length, 1368);
const contexts = [], contextIds = new Map(), rows = [], treeFiles = new Set();
const load = ref => { const b = readFileSync(ref.file); assert.equal(hash(b), ref.sha256); treeFiles.add(ref.file); return JSON.parse(b); };
const relevant = k => /^(animation|transition|transform-origin|transform-box|all$)/.test(k);
for (const o of selected) {
  const e = entries.get(o.case), inputs = e.styleInputs.filter(i => i.id === o.element);
  assert.equal(inputs.length, 1); assert.deepEqual(e.inputTrees, o.inputTrees);
  const input = inputs[0], r = load(o.inputTrees.reference), a = load(o.inputTrees.astylar);
  const guarded = inspectTransformOriginDeclarationStage(e, r, a, input);
  assert.equal(guarded.status, 'unresolved'); assert.equal(guarded.reason, o.reason);
  const direct = r.nodes.filter(n => n.attributes?.id === o.element);
  const mapping = direct.length ? undefined : resolveOriginAliasPair(e, r, a, input);
  if (mapping) assert.notEqual(mapping.status, 'unresolved');
  const targets = direct.length ? direct : r.nodes.filter(n => n.key === mapping.referenceNode);
  assert.equal(targets.length, 1);
  const requests = [], owners = [], seen = new Set();
  let node = targets[0], depth = 0;
  while (node) {
    assert.ok(!seen.has(node.key)); seen.add(node.key);
    const rules = [{ selector: '<inline>', declarations: node.inline, active: true, conditions: [] }, ...node.rules.map(i => r.rules[i])];
    for (const rule of rules) {
      const declarations = Object.fromEntries(Object.entries(rule.declarations).filter(([k]) => relevant(k)));
      if (!Object.keys(declarations).length) continue;
      requests.push({ depth, type: node.type, selector: rule.selector, active: rule.active, conditions: rule.conditions,
        declarations, ...(rule.cssText ? { completeRuleCssText: rule.cssText } : {}) });
      owners.push({ key: node.key, ruleSource: rule.source ?? '<inline>' });
    }
    if (node.parent === null) break;
    const parents = r.nodes.filter(n => n.key === node.parent); assert.equal(parents.length, 1);
    node = parents[0]; depth++;
  }
  assert.ok(requests.length);
  const signature = JSON.stringify(requests);
  if (!contextIds.has(signature)) { contextIds.set(signature, contexts.length); contexts.push(requests); }
  rows.push({ case: o.case, family: o.family, element: o.element, referenceNode: targets[0].key,
    referenceOrigin: input.reference.transformOrigin, reason: o.reason, context: contextIds.get(signature), owners, inputTrees: o.inputTrees });
}
assert.equal(new Set(rows.map(o => o.case + '#' + o.element)).size, 1368);
const explicit = rows.filter(o => contexts[o.context].some(r => Object.hasOwn(r.declarations, 'transform-origin')));
assert.equal(explicit.length, 18);
for (const o of explicit) {
  assert.equal(o.element, 'tooltip-popup');
  const declarations = contexts[o.context].filter(r => Object.hasOwn(r.declarations, 'transform-origin'));
  assert.equal(declarations.length, 1); assert.equal(declarations[0].depth, 1);
  assert.deepEqual(declarations[0].declarations['transform-origin'], { value: 'center top', important: false });
}
const sourceFiles = ['scripts/audit-material-origin-request-contexts.mjs', 'tests/material-parity/transform-origin-stage-evidence.mjs',
  'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/input-equivalence-audit.mjs'];
const record = { schemaVersion: 1, kind: 'guarded-origin-request-context-inventory', baselineCommit: '45a82cc',
  capture: { file: capturePath, sha256: hash(bytes) }, priorStageSurvey: { file: stagePath, normalizedLfSha256: hash(stageText) },
  summary: { observations: rows.length, contexts: contexts.length, motionOnlyObservations: 1350,
    explicitAncestorOriginObservations: explicit.length, checkedTreeFiles: treeFiles.size },
  contexts, observations: rows,
  limitations: ['Complete captured request inventory, not cascade winners, computed motion state or animation settlement.',
    'Full rule CSS text is preserved because empty serialized longhands can originate in unresolved variable-based shorthands.',
    'The explicit tooltip origin belongs to the immediate ancestor, not to the measured surface; no inheritance or renderer equivalence is inferred.',
    'No main classification, renderer, canonical fixture, capture or registered test changes. All 1368 guarded observations remain unresolved.'],
  sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) })) };
const output = JSON.stringify(record, null, 2) + '\n';
if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), output);
else writeFileSync(file, output);
console.log(JSON.stringify({ mode: process.argv[2] ?? 'generate', file, summary: record.summary, bytes: Buffer.byteLength(output), sha256: hash(output) }));
