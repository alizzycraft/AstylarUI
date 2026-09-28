import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { applyMotionCaretReviews, proveMotionCaretRequests, validateMotionCaretReviews, motionCaretAttribution } from '../../scripts/audit-material-caret-motion-context.mjs';

test('chip/tab caret review preserves potentially color-affecting motion requests and all original observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const captured = JSON.parse(bytes);
  const cases = [...captured.results.map(c => ({ ...c, kind: 'static' })),
    ...captured.interactions.map(c => ({ ...c, kind: 'interaction' }))].filter(c => ['chips', 'tabs'].includes(c.family));
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization();
  assert.deepEqual(inventory.errors, []);
  const rows = ['chips', 'tabs'].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, {
    generation: '7ffd3a4832d90e185be9d234b3d022f276db113767a6fcb0c3c965c51c14d592',
    indexSha256: 'b37363024107a9aeca949a701837764fdfe96e17b0aedca1549e187573dc8df4',
  })).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyMotionCaretReviews(rows, cases, inventory, normalize);
  const changed = reviewed.filter(r => r.attribution === motionCaretAttribution);
  assert.equal(changed.length, 10); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 362);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([k]) => !metadata.has(k)));
  reviewed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (r.attribution !== motionCaretAttribution) assert.deepEqual(r, rows[i]);
    else assert.ok(r.reviewEvidence.observations.every(p => !p.caretEffectProven && !p.motionInputEquivalent && !p.renderingEquivalent));
  });
  assert.deepEqual(validateMotionCaretReviews(JSON.parse(JSON.stringify(reviewed)), rows, cases, inventory, normalize), []);
  for (const mutate of [r => r.splice(r.findIndex(x => x.attribution === motionCaretAttribution), 1),
    r => { r.find(x => x.attribution === motionCaretAttribution).reviewEvidence.renderingEquivalent = true; }]) {
    const variant = structuredClone(reviewed); mutate(variant);
    assert.equal(validateMotionCaretReviews(variant, rows, cases, inventory, normalize).length, 1);
  }
  const row = changed[0], key = row.reviewedCases[0];
  const entry = cases.find(c => `${c.kind}:${c.family}@${c.profile}/${c.viewport.id}${c.state ? '/' + c.state : ''}` === key);
  const [reference, candidate] = modalInventoryTrees(inventory, key);
  for (const property of ['caretColor', 'all', 'transition']) {
    const altered = structuredClone(candidate);
    altered.nodes.find(n => n.authored?.id === row.element).authored.style = { [property]: 'initial' };
    assert.throws(() => proveMotionCaretRequests(entry, reference, altered, row.element));
  }
  const nullRoot = structuredClone(reviewed);
  nullRoot.find(r => r.attribution === motionCaretAttribution).reviewEvidence.observations[0].candidatePath[0].type = null;
  assert.equal(validateMotionCaretReviews(nullRoot, rows, cases, inventory, normalize).length, 1);
});
