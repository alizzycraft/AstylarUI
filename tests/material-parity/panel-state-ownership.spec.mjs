import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { collectPanelStateOwnership, inspectPanelState } from '../../scripts/audit-material-panel-state-ownership.mjs';
import { provePanelVisibilityOwnership, applyPanelVisibilityOwnership, validatePanelVisibilityOwnership } from '../../scripts/audit-material-panel-state-ownership.mjs';
import { createHash } from 'node:crypto';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { readGapSurveySource } from './gap-survey-source-replay.mjs';

test('panel visibility scalar review conserves all 138 state-owner observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const c = JSON.parse(bytes), families = ['tabs', 'stepper'];
  const cases = [...c.results.map(e => ({ ...e, kind: 'static' })), ...c.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.includes(e.family));
  assert.equal(cases.length, 138);
  const inventory = collectFullTreeInventory(cases), normalize = bindPreciseAuditNormalization(); assert.deepEqual(inventory.errors, []);
  const rows = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, {
    generation: '9b827bb2b09ae9d20d35e1640f987c9a4972aeab04676d595d7dd5f7d6ee01ab',
    indexSha256: 'cd3d3c45aab1db7095753132870a660f456dc80e5334787f6f4508e8d30d9486',
  })).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyPanelVisibilityOwnership(rows, cases, inventory, normalize), changed = applied.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 138);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  applied.forEach((r, i) => { assert.deepEqual(raw(r), raw(rows[i])); if (!changed.includes(r)) assert.deepEqual(r, rows[i]); });
  assert.deepEqual(validatePanelVisibilityOwnership(applied, rows, cases, inventory, normalize), []);
  const forged = structuredClone(applied); forged.find(r => r.attribution === 'reviewed-panel-visibility-state-owner-substitution').reviewedCases.pop();
  assert.equal(validatePanelVisibilityOwnership(forged, rows, cases, inventory, normalize).length, 1);
  assert.throws(() => applyPanelVisibilityOwnership(rows, cases.slice(1), inventory, normalize));
  const key = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  for (const family of families) {
    const entry = cases.find(e => e.family === family), pair = modalInventoryTrees(inventory, key(entry));
    const proof = provePanelVisibilityOwnership(entry, ...pair);
    for (const mutate of [
      ([r]) => { r.ruleEvidenceComplete = false; },
      ([r]) => { delete r.nodes.find(n => n.attributes?.role === 'tabpanel' && Object.hasOwn(n.attributes, 'inert')).attributes.inert; },
      ([, a]) => { a.nodes.find(n => n.key === proof.astylarNode).normalResolvedStyle.visibility = 'visible'; },
      ([r]) => { r.styles[r.nodes.find(n => n.key === proof.referenceNode).style].fontSize = '999px'; },
    ]) { const altered = structuredClone(pair); mutate(altered); assert.throws(() => provePanelVisibilityOwnership(entry, ...altered)); }
  }
});

test('all tab and stepper captures bind active text and unequal retained state owners', () => {
  const report = collectPanelStateOwnership();
  const retained = JSON.parse(readFileSync('docs/material-panel-state-ownership.json'));
  const lfHash = source => createHash('sha256').update(source.replaceAll('\r\n', '\n')).digest('hex');
  assert.deepEqual(report.currentSourceReceipts.map(s => s.file), retained.currentSourceReceipts.map(s => s.file));
  for (const receipt of retained.currentSourceReceipts) {
    const descriptor = { file: receipt.file, sha256: receipt.lfSha256 };
    assert.equal(lfHash(readGapSurveySource(descriptor)), receipt.lfSha256);
    assert.equal(report.currentSourceReceipts.find(s => s.file === receipt.file).lfSha256,
      lfHash(readFileSync(receipt.file, 'utf8')));
    assert.throws(() => readGapSurveySource(descriptor, {
      current: file => readFileSync(file, 'utf8') + '\nconst unrelatedPanelSourceMutation = true;\n',
    }));
  }
  // Only authenticated read-only diagnostic additions are reversible. Keep the
  // saved report immutable and compare every other complete field unchanged;
  // this does not establish current runtime/rendering or live animation parity.
  assert.deepEqual({ ...report, currentSourceReceipts: retained.currentSourceReceipts }, retained);
  assert.deepEqual(report.counts, { observations: 138, tabs: 70, stepper: 68 });
  assert.equal(new Set(report.observations.map(o => o.case)).size, 138);
  assert.ok(report.observations.every(o => o.classification === 'application-plugin-authoring-defect'
    && o.selectedTextMatches && !o.equivalentStateOwnerStructure));
  assert.equal(report.liveAnimationTested, false);
  assert.equal(report.canonicalAttributionChanged, false);
});

test('state-owner proof rejects broken content, linkage, hidden-state or benchmark assumptions', () => {
  const population = JSON.parse(readFileSync('docs/material-visibility-input-population.json'));
  for (const family of ['tabs', 'stepper']) {
    const source = population.groups.find(g => g.family === family).observations[0];
    const reference = JSON.parse(readFileSync(source.inputTrees.reference.file));
    const candidate = JSON.parse(readFileSync(source.inputTrees.astylar.file));
    const panel = t => t.nodes.find(n => n.attributes?.role === 'tabpanel');
    const inactive = t => t.nodes.find(n => n.attributes?.role === 'tabpanel' && Object.hasOwn(n.attributes, 'inert'));
    const target = t => t.nodes.find(n => n.authored?.role === 'tabpanel');
    inspectPanelState(reference, candidate, family);
    for (const mutate of [
      (r, a) => a.nodes.push(structuredClone(target(a))),
      r => { delete inactive(r).attributes.inert; },
      r => { panel(r).attributes['aria-labelledby'] = 'missing'; },
      r => { panel(r).style = 99999; },
      r => { r.errors.push('bad capture'); },
      (r, a) => { target(a).authored.id = 'other'; },
      (r, a) => { if (family === 'tabs') target(a).authored.data.phase = 0.5;
        else target(a).authored.textContent = 'Wrong content'; },
    ]) {
      const r = structuredClone(reference), a = structuredClone(candidate); mutate(r, a);
      assert.throws(() => inspectPanelState(r, a, family));
    }
  }
});
