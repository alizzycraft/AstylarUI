import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory, collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { applyTrackingLabels, validateTrackingLabels, trackingLabelAttribution, proveTrackingLabel } from './tracking-input-review.mjs';
import { applyToggleTrackingHosts, proveToggleTrackingHost, trackingHostAttribution } from './tracking-input-review.mjs';
import { proveZeroTrackingToken } from './tracking-input-review.mjs';
import { applyComponentLineHeights, componentLineHeightAttribution } from './tracking-input-review.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const one = values => { assert.equal(values.length, 1); return values[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('all 46 tracking populations retain host, label, token and motion boundaries', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  // Global ordering is necessary to replay accepted retained-proof hashes.
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const families = ['checkbox', 'radio', 'slide-toggle', 'expansion', 'button-toggle'];
  const selected = cases.filter(e => families.includes(e.family));
  const retained = collectRetainedTypographyEvidence(selected, inventory);
  const snapshot = { generation: 'baf0ccb8d7f5adad44efff3a8e165448e550b7455999a182ce138975b2bfff3b',
    indexSha256: '00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0' };
  const accepted = families.flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, snapshot));
  const rows = accepted.filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
    r.property === 'letterSpacing' && r.reference !== '0');
  assert.equal(rows.length, 7);
  const normalize = bindPreciseAuditNormalization();
  let labels = 0, hosts = 0;
  for (const row of rows) {
    const members = selected.filter(e => e.family === row.family && e.styleInputs.some(i =>
      i.id === row.element && normalize(i.reference).letterSpacing === row.reference && normalize(i.astylar).letterSpacing === undefined));
    assert.equal(members.length, row.occurrences); assert.equal(new Set(members.map(keyOf)).size, members.length);
    assert.deepEqual(members.slice(0, 12).map(keyOf), row.cases);
    for (const entry of members) {
      const key = keyOf(entry), input = one(entry.styleInputs.filter(i => i.id === row.element));
      const [r, a] = modalInventoryTrees(inventory, key);
      const native = one(r.nodes.filter(n => n.attributes?.id === row.element));
      const candidate = one(a.nodes.filter(n => n.authored?.id === row.element));
      // Full-tree styles retain more properties than the 89-field scalar view.
      assert.equal(Object.keys(input.reference).length, 89);
      for (const [property, value] of Object.entries(input.reference)) assert.equal(r.styles[native.style][property], value);
      for (const [stage, scalar] of [['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
        ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) assert.deepEqual(candidate[stage], input[scalar]);
      if (row.family !== 'button-toggle') {
        const proof = one(retained.differences.filter(d => d.case === key && d.element === row.element && d.property === 'letterSpacing'));
        const receipt = one(accepted.filter(d => d.evidence.section === 'retainedTypography.differences' &&
          d.case === key && d.element === row.element && d.property === 'letterSpacing'));
        assert.equal(hash(JSON.stringify(proof)), receipt.evidence.completeRowSha256);
        assert.equal(proof.referenceNode, native.key); assert.equal(proof.astylarNode, candidate.key);
        assert.equal(proof.attribution, 'reviewed-omitted-component-text-metric');
        assert.equal(proof.classification, 'application-plugin-authoring-defect');
        assert.deepEqual(proof.values, { reference: row.reference, retained: '0', normal: undefined, effective: undefined });
        labels++;
      } else {
        assert.equal(row.reference, '0.096px'); assert.equal(native.type, 'mat-button-toggle');
        const label = one(retained.comparisons.filter(c => c.case === key && c.element === `${row.element}-label`));
        const leaf = one(r.nodes.filter(n => n.key === label.referenceNode));
        const button = one(r.nodes.filter(n => n.key === leaf.parent));
        assert.equal(leaf.type, 'span'); assert.equal(button.type, 'button'); assert.equal(button.parent, native.key);
        for (const n of [leaf, button]) {
          assert.equal(r.styles[n.style].letterSpacing, 'normal');
          assert.ok(!n.rules.map(i => r.rules[i]).some(rule => rule.active &&
            Object.keys(rule.declarations).some(k => ['letter-spacing', 'all'].includes(k))));
        }
        const token = one(native.rules.map(i => r.rules[i]).filter(rule => rule.active && rule.selector === '.mat-button-toggle-appearance-standard'));
        assert.deepEqual(token.declarations['letter-spacing'], {
          value: 'var(--mat-button-toggle-label-text-tracking, var(--mat-sys-label-large-tracking))', important: false });
        const astLabel = one(a.nodes.filter(n => n.key === label.astylarNode));
        assert.equal(astLabel.parent, candidate.key); assert.equal(astLabel.authored.id, `${row.element}-label`);
        assert.deepEqual(label.properties.letterSpacing, { reference: '0', retained: '0', normal: undefined, effective: undefined });
        hosts++;
      }
    }
  }
  assert.equal(labels, 340); assert.equal(hosts, 136);
  const scalarRows = accepted.filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const applied = applyTrackingLabels(scalarRows, cases, inventory, retained, normalize);
  const changed = applied.filter(r => r.attribution === trackingLabelAttribution);
  assert.equal(changed.length, 5); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 340);
  assert.deepEqual(validateTrackingLabels(applied, scalarRows, cases, inventory, retained, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const rawRow = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(rawRow), scalarRows.map(rawRow));
  for (let i = 0; i < scalarRows.length; i++) if (!changed.includes(applied[i])) assert.deepEqual(applied[i], scalarRows[i]);
  const entry = selected.find(e => e.family === 'checkbox'), input = one(entry.styleInputs.filter(i => i.id === 'checkbox-label'));
  const [reference, candidate] = modalInventoryTrees(inventory, keyOf(entry));
  const chosen = retained.differences.findIndex(d => d.case === keyOf(entry) && d.element === input.id && d.property === 'letterSpacing');
  assert.ok(chosen >= 0);
  for (const mutate of [d => { d.astylarNode = 'wrong-owner'; }, d => { d.values.retained = '0.256px'; },
    d => { d.reviewEvidence.referenceChain[0].node = 'wrong-ancestor'; },
    d => { d.currentPseudoStatePaintVerified = true; }]) {
    const altered = { ...retained, differences: [...retained.differences] };
    altered.differences[chosen] = structuredClone(altered.differences[chosen]); mutate(altered.differences[chosen]);
    assert.throws(() => proveTrackingLabel(entry, input, reference, candidate, altered));
  }
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === trackingLabelAttribution).reviewEvidence.observations[0].retainedProofSha256 = 'forged';
  assert.equal(validateTrackingLabels(forged, scalarRows, cases, inventory, retained, normalize).length, 1);
  const metricRows = applyComponentLineHeights(applied, cases, inventory, retained, normalize);
  const metricChanges = metricRows.filter(r => r.attribution === componentLineHeightAttribution);
  assert.equal(metricChanges.length, 4); assert.equal(metricChanges.reduce((sum, r) => sum + r.occurrences, 0), 272);
  assert.deepEqual(metricRows.map(rawRow), applied.map(rawRow));
  for (let i = 0; i < applied.length; i++) if (!metricChanges.includes(metricRows[i])) assert.deepEqual(metricRows[i], applied[i]);
  for (const row of metricChanges) for (const observation of row.reviewEvidence.observations) {
    const receipt = one(accepted.filter(r => r.evidence.section === 'retainedTypography.differences' &&
      r.case === observation.case && r.element === row.element && r.property === 'lineHeight'));
    assert.equal(observation.retainedProofSha256, receipt.evidence.completeRowSha256);
  }
  const alteredMetric = { ...retained, differences: [...retained.differences] };
  const metricIndex = alteredMetric.differences.findIndex(d => d.element === 'checkbox-label' && d.property === 'lineHeight');
  assert.ok(metricIndex >= 0); alteredMetric.differences[metricIndex] = structuredClone(alteredMetric.differences[metricIndex]);
  alteredMetric.differences[metricIndex].values.retained = '20px';
  assert.throws(() => applyComponentLineHeights(applied, cases, inventory, alteredMetric, normalize));
  const hostApplied = applyToggleTrackingHosts(applied, cases, inventory, retained, normalize);
  const hostChanges = hostApplied.filter(r => r.attribution === trackingHostAttribution);
  assert.equal(hostChanges.length, 2); assert.equal(hostChanges.reduce((sum, r) => sum + r.occurrences, 0), 136);
  assert.deepEqual(hostApplied.map(rawRow), applied.map(rawRow));
  for (let i = 0; i < applied.length; i++) if (!hostChanges.includes(hostApplied[i])) assert.deepEqual(hostApplied[i], applied[i]);
  const toggle = selected.find(e => e.family === 'button-toggle');
  const toggleInput = one(toggle.styleInputs.filter(i => i.id === 'button-toggle-one'));
  const [tr, ta] = modalInventoryTrees(inventory, keyOf(toggle));
  for (const mutate of [r => { r.nodes.find(n => n.attributes?.id === toggleInput.id).ownText = 'List'; },
    r => { const label = retained.comparisons.find(c => c.case === keyOf(toggle) && c.element === `${toggleInput.id}-label`);
      r.styles[r.nodes.find(n => n.key === label.referenceNode).style].letterSpacing = '0.096px'; },
    r => { r.nodes.find(n => n.attributes?.id === `${toggleInput.id}-button`).parent = 'wrong-host'; }]) {
    const altered = structuredClone(tr); mutate(altered);
    assert.throws(() => proveToggleTrackingHost(toggle, toggleInput, altered, ta, retained));
  }
  const allRows = [...new Set(cases.map(e => e.family))].flatMap(family =>
    queryFindings('artifacts/material-parity/working-audit', family, snapshot))
    .filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' &&
      r.property === 'letterSpacing' && r.reference === '0');
  assert.equal(allRows.length, 39);
  const ancestry = (tree, node) => {
    const keys = [];
    while (node) {
      assert.ok(!keys.includes(node.key)); keys.push(node.key);
      if (node.parent === null) return keys;
      node = one(tree.nodes.filter(n => n.key === node.parent));
    }
    assert.fail('incomplete owner ancestry');
  };
  const groups = {}, counts = {}, tokens = {}, zeroProofs = [];
  for (const row of allRows) {
    // Some owners' static rows are already reviewed; do not re-add those cases
    // to their unresolved interaction population merely because values match.
    const members = cases.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static') &&
      e.styleInputs.some(i => i.id === row.element && normalize(i.reference).letterSpacing === '0' &&
        normalize(i.astylar).letterSpacing === undefined));
    assert.equal(members.length, row.occurrences);
    assert.deepEqual(members.slice(0, 12).map(keyOf), row.cases);
    const patterns = new Set();
    for (const entry of members) {
      const [r, a] = modalInventoryTrees(inventory, keyOf(entry));
      const input = one(entry.styleInputs.filter(i => i.id === row.element));
      const native = r.nodes.find(n => n.attributes?.id === row.element);
      const candidate = one(a.nodes.filter(n => n.authored?.id === row.element));
      const identity = native ? { status: 'mapped', inputEquivalent: false, referenceNode: native.key,
        candidateNode: candidate.key, referencePath: ancestry(r, native), candidatePath: ancestry(a, candidate),
        missingRules: [], extraRules: [] } : resolveOriginAliasPair(entry, r, a, input);
      const trace = inspectOverlayOwnerDeclarations('letterSpacing', identity, r, a);
      if (['toolbar-title', 'card-title', 'dialog-title'].includes(row.element)) {
        zeroProofs.push(proveZeroTrackingToken(entry, input, r, a, identity));
        if (zeroProofs.length === 1) {
          const changed = structuredClone(a);
          changed.nodes.find(n => n.key === identity.candidateNode).normalResolvedStyle.letterSpacing = 'normal';
          assert.throws(() => proveZeroTrackingToken(entry, input, r, changed, identity));
          const altered = structuredClone(r);
          const ownerToken = trace.referencePath.flatMap(n => n.rules).find(rule => rule.declarations?.['letter-spacing']);
          assert.ok(ownerToken);
          const tokenRule = altered.rules[ownerToken.index];
          assert.ok(tokenRule); tokenRule.declarations['letter-spacing'].value = 'normal';
          assert.throws(() => proveZeroTrackingToken(entry, input, altered, a, identity));
        }
      }
      const signature = `${trace.hasRelevantRequest}/${trace.hasMotionRequest}`;
      patterns.add(signature); counts[signature] = (counts[signature] ?? 0) + 1;
      for (const node of trace.referencePath) for (const rule of node.rules) {
        if (!Object.hasOwn(rule.declarations, 'letter-spacing')) continue;
        assert.equal(rule.active, true);
        const token = rule.declarations['letter-spacing'];
        assert.equal(token.important, false); assert.ok(token.value.startsWith('var(--mat-'));
        tokens[row.element] = (tokens[row.element] ?? 0) + 1;
      }
    }
    assert.equal(patterns.size, 1);
    const signature = [...patterns][0]; groups[signature] = (groups[signature] ?? 0) + 1;
  }
  assert.deepEqual(groups, { 'true/false': 2, 'false/false': 28, 'false/true': 8, 'true/true': 1 });
  assert.deepEqual(counts, { 'true/false': 80, 'false/false': 1563, 'false/true': 366, 'true/true': 32 });
  assert.deepEqual(tokens, { 'toolbar-title': 40, 'card-title': 40, 'dialog-title': 32 });
  assert.equal(zeroProofs.length, 112);
  assert.equal(zeroProofs.filter(p => p.request.node !== p.referenceNode).length, 40);
  assert.equal(zeroProofs.filter(p => p.trace.hasMotionRequest).length, 32);
  // No classification mutation: equal leaf zeros do not establish host token,
  // inheritance, current glyph paint or rendering equivalence.
});
