import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectButtonPaintAllStates } from '../../scripts/audit-material-button-paint-all-states.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { applyOverlayTriggerPaintReview, overlayTriggerPaintAttribution } from './overlay-trigger-paint-review.mjs';

test('overlay trigger paint joins all 53 observations without flattening native states', () => {
  const hash = value => createHash('sha256').update(value).digest('hex');
  const bytes = readFileSync('docs/material-button-paint-all-states.json', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), 'd73d512b70e0e4924c09d0c27ffce9469e087feb4a21314c19be26b235e6d5b9');
  const source = collectButtonPaintAllStates(); assert.deepEqual(source, JSON.parse(bytes));
  const snapshot = { generation: 'd25a9078972edf1884a4e56a7c17f4a7b3d249d3ed22933811f69daa4aafda9a',
    indexSha256: 'c1934e90c7ca80ff121da83a6871d10da201f798f37cdb92f8badce7c24529ad' };
  const rows = [...new Set(source.findings.map(f => f.family))].flatMap(f =>
    queryFindings('artifacts/material-parity/working-audit', f, snapshot)).filter(r => r.evidence.section === 'discrepancies');
  const normalize = bindPreciseAuditNormalization();
  const result = applyOverlayTriggerPaintReview(rows, source, normalize);
  const reviewed = result.filter(r => r.attribution === overlayTriggerPaintAttribution);
  assert.equal(reviewed.length, 8);
  assert.equal(reviewed.reduce((n, r) => n + r.occurrences, 0), 53);
  const observations = reviewed.flatMap(r => r.reviewEvidence.observations);
  assert.deepEqual(Object.fromEntries(['0', '0.08', '0.12'].map(opacity =>
    [opacity, observations.filter(o => o.nativeLayerOpacity === opacity).length])), { '0': 33, '0.08': 16, '0.12': 4 });
  const metadata = new Set(['classification', 'attribution', 'recommendedOwner', 'justification', 'reviewEvidence', 'reviewedCases']);
  const raw = row => Object.fromEntries(Object.entries(row).filter(([k]) => !metadata.has(k)));
  for (let i = 0; i < rows.length; i++) {
    assert.deepEqual(raw(result[i]), raw(rows[i]));
    if (result[i].attribution !== overlayTriggerPaintAttribution) assert.deepEqual(result[i], rows[i]);
    else {
      assert.equal(result[i].reviewEvidence.originalRowSha256, hash(JSON.stringify(rows[i])));
      assert.equal(result[i].reviewEvidence.rendererCauseProven, false);
      assert.equal(result[i].reviewEvidence.renderingEquivalent, false);
    }
  }
  const first = reviewed[0], firstCase = first.reviewedCases[0];
  const patternIndex = source.findings.find(f => f.case === firstCase && f.element === first.element).pattern;
  for (const mutate of [p => { p.candidate.sharedStateRules = []; },
    p => { p.candidate.sharedStateRules.find(r => r.selector === '.material-button:hover').background = '#000000'; },
    p => { p.candidate.normal.background = '#000000'; },
    p => { p.candidate.interaction.background = '#000000'; }]) {
    const forged = structuredClone(source), pattern = forged.patterns[patternIndex];
    mutate(pattern.proof); pattern.sha256 = hash(JSON.stringify(pattern.proof));
    assert.throws(() => applyOverlayTriggerPaintReview(rows, forged, normalize));
  }
  const partial = structuredClone(rows), index = rows.findIndex(r => r.element === first.element && r.reference === first.reference && r.astylar === first.astylar && r.property === 'backgroundColor');
  partial[index].occurrences++;
  assert.deepEqual(applyOverlayTriggerPaintReview(partial, source, normalize)[index], partial[index]);
});
