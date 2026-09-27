import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { explicitNowrapTargets as targets, proveExplicitNowrap, applyExplicitNowrap,
  validateExplicitNowrap, explicitNowrapAttribution, applyOmittedNowrap,
  validateOmittedNowrap, omittedNowrapAttribution, proveOmittedNowrap } from './wrapping-input-review.mjs';

const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('six explicit nowrap substitutions retain all 344 original owner/state observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), families = new Set(Object.values(targets).map(t => t[0]));
  const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.has(e.family));
  const inventory = collectFullTreeInventory(cases);
  assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: 'ef6da409ae1162433b0419814fe7e7e33b7659805d8e672f407d8b4c84878145',
    indexSha256: 'a25ffe1f2d083f23fafe6e615566544a9aedf7b9559e2084309551568982cca9' };
  const rows = [...families].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot));
  let total = 0;
  for (const [element, [family, selector, count]] of Object.entries(targets)) {
    const row = one(rows.filter(r => r.evidence.section === 'discrepancies' &&
      r.element === element && r.property === 'whiteSpace' && r.attribution === 'unresolved'));
    assert.equal(row.reference, 'normal'); assert.equal(row.astylar, 'nowrap');
    const proofs = [];
    for (const entry of cases.filter(e => e.family === family)) {
      const input = one(entry.styleInputs.filter(i => i.id === element));
      const [reference, candidate] = modalInventoryTrees(inventory, keyOf(entry));
      proofs.push(proveExplicitNowrap(entry, input, reference, candidate));
      if (proofs.length === 1) {
        const missingRule = { ...candidate, rules: candidate.rules.filter(r =>
          !(r.selector === selector && r.whiteSpace === 'nowrap')) };
        assert.throws(() => proveExplicitNowrap(entry, input, reference, missingRule));
        const forged = structuredClone(input);
        forged.astylarNormalResolvedStyle.whiteSpace = 'normal';
        assert.throws(() => proveExplicitNowrap(entry, forged, reference, candidate));
        const changedReference = structuredClone(reference);
        const n = changedReference.nodes.find(n => n.key === proofs[0].referenceNode);
        changedReference.styles[n.style].whiteSpace = 'nowrap';
        assert.throws(() => proveExplicitNowrap(entry, input, changedReference, candidate));
      }
    }
    assert.equal(proofs.length, count); assert.equal(row.occurrences, count);
    assert.equal(new Set(proofs.map(p => p.case)).size, count);
    assert.deepEqual(row.cases, proofs.map(p => p.case).slice(0, 12));
    total += count;
  }
  assert.equal(total, 344);
  const originalRows = rows.filter(r => r.evidence.section === 'discrepancies')
    .map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyExplicitNowrap(originalRows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === explicitNowrapAttribution);
  assert.equal(changed.length, 6);
  assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 344);
  assert.deepEqual(validateExplicitNowrap(applied, originalRows, cases, inventory, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const rawRow = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(rawRow), originalRows.map(rawRow));
  for (let i = 0; i < applied.length; i++) if (applied[i].attribution !== explicitNowrapAttribution)
    assert.deepEqual(applied[i], originalRows[i]);
  for (const mutate of [r => r.reviewedCases.pop(), r => { r.reviewEvidence.inputEquivalent = true; },
    r => { r.reviewEvidence.observations[0].selector = '#forged'; }]) {
    const forged = structuredClone(applied);
    mutate(forged.find(r => r.attribution === explicitNowrapAttribution));
    assert.equal(validateExplicitNowrap(forged, originalRows, cases, inventory, normalize).length, 1);
  }
});

test('native nowrap ancestry is retained for 500 omitted local candidate observations', () => {
  const targets = {
    'tab-overview': ['tabs', 70], 'tab-activity': ['tabs', 70],
    'toolbar-action': ['toolbar', 52], 'toolbar-primary': ['toolbar', 52],
    'badge-count': ['badge', 52], 'button-toggle-one': ['button-toggle', 68],
    'button-toggle-two': ['button-toggle', 68], 'button-toggle-primary': ['button-toggle', 68],
  };
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), families = new Set(Object.values(targets).map(t => t[0]));
  const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => families.has(e.family));
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: 'ef6da409ae1162433b0419814fe7e7e33b7659805d8e672f407d8b4c84878145',
    indexSha256: 'a25ffe1f2d083f23fafe6e615566544a9aedf7b9559e2084309551568982cca9' };
  const rows = [...families].flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot));
  const ancestry = (tree, node) => {
    const result = [], seen = new Set();
    while (node) {
      assert.ok(!seen.has(node.key)); seen.add(node.key); result.push(node);
      if (node.parent === null) return result;
      node = one(tree.nodes.filter(n => n.key === node.parent));
    }
    assert.fail('incomplete ancestry');
  };
  let total = 0, paintedNormal = 0;
  for (const [element, [family, count]] of Object.entries(targets)) {
    const row = one(rows.filter(r => r.evidence.section === 'discrepancies' &&
      r.element === element && r.property === 'whiteSpace' && r.attribution === 'unresolved'));
    const keys = [];
    for (const entry of cases.filter(e => e.family === family)) {
      const input = one(entry.styleInputs.filter(i => i.id === element));
      const [r, a] = modalInventoryTrees(inventory, keyOf(entry));
      const ast = one(a.nodes.filter(n => n.authored?.id === element));
      let native;
      if (element === 'badge-count') {
        const identity = resolveOriginAliasPair(entry, r, a, input);
        assert.equal(identity.status, 'mapped');
        assert.deepEqual(identity.missingRules, []); assert.deepEqual(identity.extraRules, []);
        assert.equal(identity.candidateNode, ast.key);
        native = one(r.nodes.filter(n => n.key === identity.referenceNode));
      } else native = one(r.nodes.filter(n => n.attributes?.id === element));
      assert.equal(native.type, input.referenceStructure.type);
      assert.equal(ast.authored.type, input.astylarStructure.type);
      assert.equal(input.reference.whiteSpace, 'nowrap');
      assert.equal(r.styles[native.style].whiteSpace, 'nowrap');
      const requests = ancestry(r, native).flatMap(n => n.rules.map(i => r.rules[i])).filter(rule => rule.active);
      assert.ok(requests.some(rule => rule.declarations['white-space-collapse']?.value === 'collapse' &&
        rule.declarations['text-wrap-mode']?.value === 'nowrap'));
      for (const [stage, scalar] of [
        ['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
        ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'],
      ]) {
        assert.deepEqual(ast[stage], input[scalar]);
        // The synthetic root carries no style evidence. Never interpret its
        // omission as proof of an external/default/inherited computed value.
        for (const node of ancestry(a, ast).filter(n => n.key !== 'root')) {
          assert.ok(node[stage]); assert.equal(node[stage].whiteSpace, undefined);
        }
      }
      if (['tab-overview', 'tab-activity', 'toolbar-action'].includes(element)) {
        assert.equal(ast.paintedControlText?.source, 'core-control-texture');
        assert.equal(ast.paintedControlText.text, ast.authored.value);
        // modalInventoryTrees expands local declarations, but the separate
        // paint record still refers to the inventory-global style index.
        const paint = inventory.styles[ast.paintedControlText.style];
        assert.equal(paint.side, 'astylar'); assert.equal(paint.value.whiteSpace, 'normal');
        paintedNormal++;
      } else {
        assert.equal(ast.paintedControlText, undefined);
        // Badge retained text is a distinct stage, not a control paint value.
        if (element === 'badge-count') {
          assert.equal(ast.retainedText?.source, 'core-text-registry');
          assert.equal(inventory.styles[ast.retainedText.style].value.whiteSpace, undefined);
        }
      }
      keys.push(keyOf(entry));
    }
    assert.equal(keys.length, count); assert.equal(new Set(keys).size, count);
    assert.equal(row.occurrences, count); assert.deepEqual(row.cases, keys.slice(0, 12));
    total += count;
  }
  assert.equal(total, 500);
  assert.equal(paintedNormal, 192);
  const originalRows = rows.filter(r => r.evidence.section === 'discrepancies')
    .map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyOmittedNowrap(originalRows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === omittedNowrapAttribution);
  assert.equal(changed.length, 8);
  assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 500);
  assert.deepEqual(validateOmittedNowrap(applied, originalRows, cases, inventory, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const rawRow = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(rawRow), originalRows.map(rawRow));
  for (let i = 0; i < applied.length; i++) if (applied[i].attribution !== omittedNowrapAttribution)
    assert.deepEqual(applied[i], originalRows[i]);
  for (const mutate of [r => r.reviewedCases.pop(), r => { r.reviewEvidence.inputEquivalent = true; },
    r => { r.reviewEvidence.observations[0].requests = []; }]) {
    const forged = structuredClone(applied);
    mutate(forged.find(r => r.attribution === omittedNowrapAttribution));
    assert.equal(validateOmittedNowrap(forged, originalRows, cases, inventory, normalize).length, 1);
  }
  const entry = cases.find(e => e.family === 'tabs');
  const input = one(entry.styleInputs.filter(i => i.id === 'tab-overview'));
  const [reference, candidate] = modalInventoryTrees(inventory, keyOf(entry));
  for (const property of ['whiteSpace', 'text-wrap-mode', 'all']) {
    const altered = structuredClone(candidate);
    altered.rules.push({ selector: '#tab-overview', [property]: 'nowrap' });
    assert.throws(() => proveOmittedNowrap(entry, input, reference, altered, inventory));
  }
});

test('chip host normal values do not conceal nested native nowrap labels in 152 observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes);
  const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))].filter(e => e.family === 'chips');
  assert.equal(cases.length, 76);
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  let labels = 0;
  for (const entry of cases) {
    const [r, a] = modalInventoryTrees(inventory, keyOf(entry));
    for (const id of ['chip-0', 'chip-1']) {
      const input = one(entry.styleInputs.filter(i => i.id === id));
      const native = one(r.nodes.filter(n => n.attributes?.id === id));
      const ast = one(a.nodes.filter(n => n.authored?.id === id));
      assert.equal(input.reference.whiteSpace, 'normal');
      assert.equal(r.styles[native.style].whiteSpace, 'normal');
      assert.equal(input.astylar.whiteSpace, undefined);
      const leaf = one(r.nodes.filter(n => n.key.startsWith(native.key + '/') &&
        String(n.attributes?.class).split(/\s+/).includes('mdc-evolution-chip__text-label')));
      const label = one(a.nodes.filter(n => n.parent === ast.key && n.authored.id === `${id}-label`));
      assert.equal(leaf.type, 'span'); assert.equal(label.authored.type, 'span');
      assert.equal(leaf.ownText.trim(), label.authored.textContent);
      assert.equal(r.styles[leaf.style].whiteSpace, 'nowrap');
      assert.ok(leaf.rules.map(i => r.rules[i]).some(rule => rule.active &&
        rule.selector === '.mdc-evolution-chip__text-label' &&
        rule.declarations['white-space-collapse']?.value === 'collapse' &&
        rule.declarations['text-wrap-mode']?.value === 'nowrap'));
      for (const [stage, scalar] of [
        ['resolvedStyle', 'astylar'], ['normalResolvedStyle', 'astylarNormalResolvedStyle'],
        ['interactionResolvedStyle', 'astylarInteractionResolvedStyle'],
      ]) {
        assert.deepEqual(ast[stage], input[scalar]);
        assert.equal(label[stage].whiteSpace, undefined);
      }
      assert.equal(label.retainedText?.source, 'core-text-registry');
      assert.equal(inventory.styles[label.retainedText.style].value.whiteSpace, undefined);
      assert.equal(label.paintedControlText, undefined);
      labels++;
    }
  }
  assert.equal(labels, 152);
});

test('360 overlay host observations preserve rule gaps and nested bottom-sheet nowrap text', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes);
  const expected = { 'bottom-sheet-overlay': 25, 'bottom-sheet-panel': 25,
    'bottom-sheet-dismiss': 25, 'bottom-sheet-copy': 25, 'dialog-title': 32,
    'dialog-copy': 32, 'dialog-cancel': 32, 'dialog-save': 32, 'dialog-panel': 32,
    'dialog-actions': 32, 'snack-bar-overlay': 34, 'snack-bar-surface': 34 };
  const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => ['bottom-sheet', 'dialog', 'snack-bar'].includes(e.family));
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const counts = {}, path = (tree, node) => {
    const keys = [];
    while (node) {
      assert.ok(!keys.includes(node.key)); keys.push(node.key);
      if (node.parent === null) return keys;
      node = one(tree.nodes.filter(n => n.key === node.parent));
    }
    assert.fail('incomplete overlay ancestry');
  };
  let nestedLabels = 0, ruleGaps = 0;
  for (const entry of cases) {
    const [r, a] = modalInventoryTrees(inventory, keyOf(entry));
    for (const input of entry.styleInputs.filter(i => Object.hasOwn(expected, i.id))) {
      assert.equal(input.reference.whiteSpace, 'normal'); assert.equal(input.astylar.whiteSpace, undefined);
      const ast = one(a.nodes.filter(n => n.authored?.id === input.id));
      let identity;
      if (r.nodes.some(n => n.attributes?.id === input.id)) {
        const native = one(r.nodes.filter(n => n.attributes?.id === input.id));
        assert.equal(native.type, input.referenceStructure.type);
        assert.equal(ast.authored.type, input.astylarStructure.type);
        assert.equal(r.styles[native.style].whiteSpace, input.reference.whiteSpace);
        for (const [stage, scalar] of [['resolvedStyle', 'astylar'],
          ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']])
          assert.deepEqual(ast[stage], input[scalar]);
        identity = { status: 'mapped', inputEquivalent: false, referenceNode: native.key,
          candidateNode: ast.key, referencePath: path(r, native), candidatePath: path(a, ast),
          missingRules: [], extraRules: [] };
      } else identity = resolveOriginAliasPair(entry, r, a, input);
      const gap = ['bottom-sheet-overlay', 'snack-bar-overlay'].includes(input.id);
      assert.equal(identity.status, gap ? 'mapped-with-scalar-rule-gap' : 'mapped');
      assert.deepEqual(identity.extraRules, []);
      assert.deepEqual(identity.missingRules, gap ? [{ selector: '.cdk-global-overlay-wrapper',
        declarations: { 'z-index': { value: '1000', important: false } } }] : []);
      if (gap) ruleGaps++;
      const trace = inspectOverlayOwnerDeclarations('whiteSpace', identity, r, a);
      assert.equal(trace.hasRelevantRequest, false);
      assert.ok(trace.referencePath.every(n => n.computed === 'normal'));
      assert.ok(trace.candidatePath.filter(n => n.node !== 'root')
        .every(n => Object.values(n.localValues).every(v => v === '<omitted>')));
      assert.equal(trace.inputEquivalent, false); assert.equal(trace.candidateComputedVerified, false);
      if (['bottom-sheet-dismiss', 'bottom-sheet-copy'].includes(input.id)) {
        const native = one(r.nodes.filter(n => n.key === identity.referenceNode));
        assert.equal(native.type, 'a'); assert.equal(ast.authored.type, 'button');
        const leaf = one(r.nodes.filter(n => n.key.startsWith(native.key + '/') &&
          String(n.attributes?.class).split(/\s+/).includes('mdc-list-item__primary-text')));
        assert.equal(r.styles[leaf.style].whiteSpace, 'nowrap');
        assert.equal(leaf.ownText.trim(), ast.authored.value);
        nestedLabels++;
      }
      counts[input.id] = (counts[input.id] ?? 0) + 1;
    }
  }
  assert.deepEqual(counts, expected);
  assert.equal(ruleGaps, 59); assert.equal(nestedLabels, 50);
});

test('table normal requests and private tab-panel text remain distinct in 122 host observations', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes);
  const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })),
    ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))]
    .filter(e => ['table', 'tabs'].includes(e.family));
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const counts = { table: 0, tabs: 0 };
  for (const entry of cases) {
    const id = entry.family === 'table' ? 'table-primary' : 'tab-panel';
    const input = one(entry.styleInputs.filter(i => i.id === id));
    const [r, a] = modalInventoryTrees(inventory, keyOf(entry));
    const ast = one(a.nodes.filter(n => n.authored?.id === id));
    const native = entry.family === 'table' ? one(r.nodes.filter(n => n.attributes?.id === id))
      : one(r.nodes.filter(n => n.key === resolveOriginAliasPair(entry, r, a, input).referenceNode));
    assert.equal(input.reference.whiteSpace, 'normal'); assert.equal(r.styles[native.style].whiteSpace, 'normal');
    for (const [stage, scalar] of [['resolvedStyle', 'astylar'],
      ['normalResolvedStyle', 'astylarNormalResolvedStyle'], ['interactionResolvedStyle', 'astylarInteractionResolvedStyle']]) {
      assert.deepEqual(ast[stage], input[scalar]); assert.equal(ast[stage].whiteSpace, undefined);
    }
    if (entry.family === 'table') {
      assert.equal(native.type, 'table'); assert.equal(ast.authored.type, 'table');
      assert.ok(native.rules.map(i => r.rules[i]).some(rule => rule.active && rule.selector === '.mat-mdc-table' &&
        rule.declarations['white-space-collapse']?.value === 'collapse' &&
        rule.declarations['text-wrap-mode']?.value === 'wrap'));
      assert.deepEqual(a.nodes.filter(n => n.parent === ast.key).map(n => n.authored.type), ['thead', 'tbody']);
    } else {
      assert.equal(ast.authored.type, 'showcase.material:tab-panel');
      assert.equal(ast.authored.ariaLabel, input.referenceStructure.text);
      assert.equal(a.nodes.filter(n => n.parent === ast.key).length, 0);
      assert.equal(ast.retainedText, undefined); assert.equal(ast.paintedControlText, undefined);
      // This host cannot inherit the ordinary-text paint proof. Its private
      // rendering behavior is covered by the existing public plugin reduction.
    }
    counts[entry.family]++;
  }
  assert.deepEqual(counts, { table: 52, tabs: 70 });
});
