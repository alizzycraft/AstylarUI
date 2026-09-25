import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { collectRootTypographyInputs } from './root-typography-input-evidence.mjs';
import { collectRootColorInputs } from './root-color-input-evidence.mjs';
import { rootInitialSelectorCanApply } from './root-initial-style-evidence.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { inspectDescendantColor } from './root-color-descendant-evidence.mjs';
import { originStageTrees } from './origin-stage-inventory-evidence.mjs';

test('descendant color binds all scoped original owners and preserves reviewed static siblings and explicit requests', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const index = JSON.parse(readFileSync('docs/material-root-color-audit.json'));
  const bytes = readFileSync(index.capture.file);
  assert.equal(hash(bytes), index.capture.sha256);
  const raw = JSON.parse(bytes), canonical = bindPreciseAuditNormalization();
  const entries = [...raw.results.map(e => ({...e, kind: 'static'})), ...raw.interactions.map(e => ({...e, kind: 'interaction'}))];
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const inventory = collectFullTreeInventory(entries);
  assert.deepEqual(inventory.errors, []);
  const roots = collectRootColorInputs(collectRootTypographyInputs(inventory, canonical, rootInitialSelectorCanApply), canonical);
  assert.equal(roots.length, 2311);
  const byCase = new Map(roots.map(r => [r.case, r]));
  const snapshot = { generation: '65c72350ed907939fbbbdae030f4aebcb7e83f1039de66fb4b3cb2c747a30c56',
    indexSha256: '2e1e8bbf6b89cd1d640a0c1bf2aca86f723d19e13f864cd5b6d753d05769c44e' };
  const rows = [...new Set(entries.map(e => e.family))].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.attribution === 'unresolved' && r.property === 'color' && r.astylar === undefined &&
      ['rgba(29,27,32,1)', 'rgba(230,225,229,1)'].includes(r.reference));
  assert.equal(rows.length, 68);
  let acceptedGroups = 0, accepted = 0, excluded = 0, retainedStatic = 0, mutationCount = 0;
  for (const row of rows) {
    const matches = entries.filter(e => e.family === row.family).flatMap(e => e.styleInputs
      .filter(i => i.id === row.element && canonical(i.reference ?? {}).color === row.reference && i.astylar?.color === undefined)
      .map(input => ({e,input})));
    const members = matches.filter(({e}) => row.states.includes(e.state ?? 'static'));
    retainedStatic += matches.length - members.length;
    assert.ok(matches.filter(m => !members.includes(m)).every(m => m.e.kind === 'static'));
    assert.equal(members.length, row.occurrences, row.element);
    assert.deepEqual(members.slice(0, 12).map(({e}) => key(e)), row.cases);
    const results = members.map(({e,input}) => {
      const trees = originStageTrees(inventory, key(e)); assert.ok(trees);
      const f = { input, root: byCase.get(key(e)), ...trees,
        context: {family: e.family, case: key(e)} };
      const inspect = x => inspectDescendantColor(x.input, x.root, x.reference, x.candidate, canonical, x.context);
      const proof = inspect(f);
      if (proof) {
        assert.equal(proof.element, input.id); assert.equal(proof.ownerCorrespondenceVerified, true);
        for (const flag of ['computedCandidateVerified', 'finalRasterVerified', 'inputEquivalent', 'renderingEquivalent'])
          assert.equal(proof[flag], false);
        if (e === members[0].e) {
          const mutations = [
            x => { x.context.case += '/different'; }, x => { x.context.family = 'different'; },
            x => { x.candidate.resolvedStyleRevision++; }, x => { x.input.reference.color = 'red'; },
            x => { x.input.astylarInteractionResolvedStyle.color = 'red'; },
            x => { x.input.referenceStructure.text += 'changed'; },
            x => { x.reference.nodes.find(n => n.key === proof.mapping.referenceNode).parent = 'missing'; },
            x => { x.candidate.nodes.push(structuredClone(x.candidate.nodes.at(-1))); },
            x => { x.candidate.rules.push({selector: `#${input.id}:hover`, color: 'red'}); },
            x => { x.reference.nodes.find(n => n.key === proof.mapping.referenceNode).inline.color = {value: 'inherit', important: false}; },
          ];
          for (const mutate of mutations) {
            // Mutations do not touch global reference style/rule pools; sharing
            // these immutable arrays avoids copying the entire audit per case.
            const changed = { ...f, input: structuredClone(f.input), context: {...f.context},
              reference: {...f.reference, nodes: structuredClone(f.reference.nodes)}, candidate: structuredClone(f.candidate) };
            mutate(changed); assert.equal(inspect(changed), undefined); mutationCount++;
          }
        }
      }
      return !!proof;
    });
    assert.ok(results.every(r => r === results[0]), `mixed owner proof: ${row.element}`);
    if (results[0]) { acceptedGroups++; accepted += members.length; } else excluded += members.length;
  }
  assert.equal(acceptedGroups, 46); assert.equal(accepted, 1196); assert.equal(excluded, 446);
  assert.equal(retainedStatic, 152); assert.equal(mutationCount, 460);
});
