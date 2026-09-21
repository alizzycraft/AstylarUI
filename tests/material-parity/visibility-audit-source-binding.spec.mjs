import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectVisibilityAuditInputs, validateVisibilityAuditInputs, validateVisibilityAuditClassifications,
  visibilityClassificationContexts, classifyVisibilityAuditInput } from './visibility-audit-source-binding.mjs';

test('canonical-shaped visibility evidence replays sources and rejects altered aggregation', () => {
  const parityPath = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const original = JSON.parse(readFileSync(parityPath));
  const evidence = collectVisibilityAuditInputs(original, { parityPath });
  assert.equal(evidence.binding.status, 'bound', evidence.binding.error);
  assert.deepEqual(validateVisibilityAuditInputs(evidence), []);
  assert.deepEqual(validateVisibilityAuditClassifications(evidence, evidence.groups), []);
  const contexts = visibilityClassificationContexts(evidence); assert.equal(contexts.size, 530);
  let matches = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    for (const input of entry.styleInputs) {
      const observation = contexts.get(JSON.stringify([caseId, input.id, 'visibility']));
      if (!observation) continue;
      assert.equal(classifyVisibilityAuditInput(input, 'visibility', input.reference.visibility, input.astylar.visibility, observation).classification, 'parity-harness-defect');
      matches++;
    }
  }
  assert.equal(matches, 530);
  for (const mutate of [r => r.pop(), r => r.push(structuredClone(r[0])),
    r => { r[0].reference = 'hidden'; }, r => { r[0].astylar = 'visible'; },
    r => { r[0].reviewedCases.reverse(); }, r => { r[0].occurrences--; },
    r => { r[0].reviewEvidence.renderingEquivalent = true; },
    r => { r[0].classification = 'equivalent-representation'; }]) {
    const rows = structuredClone(evidence.groups); mutate(rows);
    assert.ok(validateVisibilityAuditClassifications(evidence, rows).length);
  }
  const changed = structuredClone(evidence); changed.observations[0].inputSha256 = 'forged';
  assert.ok(validateVisibilityAuditInputs(changed).length);
  assert.equal(collectVisibilityAuditInputs(original).binding.status, 'unbound');
  assert.equal(collectVisibilityAuditInputs(original, { parityPath: 'package.json' }).binding.status, 'invalid');
});
