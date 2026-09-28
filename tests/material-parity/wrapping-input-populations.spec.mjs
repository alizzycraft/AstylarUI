import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import ts from 'typescript';
import { collectFullTreeInventory } from './input-equivalence-audit.mjs';
import { modalInventoryTrees } from './modal-position-inspection.mjs';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';
import { inspectOverlayOwnerDeclarations } from './overlay-owner-declaration-review.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { inheritedWordOwners, proveInheritedWordBoundary, applyInheritedWordReviews } from './wrapping-input-review.mjs';
import { explicitNowrapTargets as targets, proveExplicitNowrap, applyExplicitNowrap,
  validateExplicitNowrap, explicitNowrapAttribution, applyOmittedNowrap,
  validateOmittedNowrap, omittedNowrapAttribution, proveOmittedNowrap,
  applyOverlayNormal, validateOverlayNormal, overlayNormalAttribution, proveOverlayNormal,
  proveChipLabelWrapping, proveTableWrapping, applyTableWrapping, validateTableWrapping,
  tableWrappingAttribution, applyTabPanelWrapping, validateTabPanelWrapping,
  tabPanelWrappingAttribution, proveTabPanelWrapping, proveChipHostWrapping,
  applyChipHostWrapping, validateChipHostWrapping, chipHostWrappingAttribution,
  applyWrappingReviews, validateWrappingReviews, wrappingAttributions } from './wrapping-input-review.mjs';

const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

test('public word-property support boundary rejects wordBreak without inventing a fixture workaround', () => {
  const filename = path.resolve('examples/material-showcase/src/app/__word_support_probe__.ts');
  const members = source => {
    const node = ts.createSourceFile('probe.ts', source, ts.ScriptTarget.ES2022, true).statements.find(n => ts.isInterfaceDeclaration(n) && n.name.text === 'StyleRule');
    assert.ok(node); return new Set(node.members.map(m => m.name?.getText()));
  };
  const current = members(readFileSync('src/app/types/style-rule.ts', 'utf8'));
  for (const property of ['wordWrap', 'wordBreak', 'overflowWrap']) {
    const options = { noEmit: true, skipLibCheck: true, strict: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.Preserve, moduleResolution: ts.ModuleResolutionKind.Bundler, types: [] };
    const host = ts.createCompilerHost(options), original = host.getSourceFile.bind(host);
    host.getSourceFile = (file, language, ...rest) => path.resolve(file) === filename
      ? ts.createSourceFile(file, `import type { SiteData } from 'astylarui'; const site: SiteData = { root: { children: [] }, styles: [{ selector: '#probe', ${property}: 'normal' }] };`, language, true)
      : original(file, language, ...rest);
    const program = ts.createProgram([filename], options, host);
    const declaration = program.getSourceFiles().filter(f => f.fileName.replaceAll('\\', '/').includes('/node_modules/astylarui/') && f.fileName.endsWith('/style-rule.d.ts'));
    assert.equal(declaration.length, 1); const installed = members(declaration[0].text);
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(installed.has(property), current.has(property), 'Installed/current public support differs');
    if (property === 'wordWrap') { assert.equal(diagnostics.length, 0); assert.ok(current.has(property)); }
    else {
      assert.equal(current.has(property), false); assert.equal(diagnostics.length, 1);
      assert.equal(diagnostics[0].code, property === 'wordBreak' ? 2353 : 2561);
      assert.ok(ts.flattenDiagnosticMessageText(diagnostics[0].messageText, ' ').includes(`'${property}' does not exist in type 'StyleRule'`));
    }
  }
  // Typed admission only: wordWrap may express overflow-wrap semantics, but
  // neither successful compilation nor absence of a field proves runtime paint.
});

test('inherited word properties separate 46 observation boundaries from the tooltip explicit request', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes), cases = [...capture.results.map(e => ({ ...e, kind: 'static' })), ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: '4880964fc1018a1fd6409f7c7af2ddaa5fc21a82e45dab3a0cc5fce5a6019156', indexSha256: '5e86f89a05cd88843d7dd6130ed13c88cdb6371efb389d73a934c8d9f953511b' };
  const rows = Object.keys(inheritedWordOwners).flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot)).filter(r => r.evidence.section === 'discrepancies');
  const reviewed = applyInheritedWordReviews(rows, cases, inventory, bindPreciseAuditNormalization()), changed = reviewed.filter((r, i) => r !== rows[i]);
  assert.equal(changed.length, 46); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 1764);
  const explicit = rows.find(r => r.element === 'tooltip-popup' && r.property === 'wordBreak');
  assert.ok(explicit); assert.equal(explicit.occurrences, 18);
  assert.equal(reviewed[rows.indexOf(explicit)], explicit); assert.equal(explicit.attribution, 'unresolved');
  assert.equal(changed.filter(r => r.classification === 'parity-harness-defect').length, 46);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  reviewed.forEach((r, i) => {
    assert.deepEqual(raw(r), raw(rows[i]));
    if (r !== rows[i]) {
      assert.equal(rows[i].attribution, 'unresolved'); assert.equal(r.reviewEvidence.renderingEquivalent, false);
      assert.equal(r.reviewEvidence.observations.length, r.occurrences);
      for (const proof of r.reviewEvidence.observations) { assert.equal(proof.candidateComputedVerified, false); assert.equal(proof.descendantConsumptionVerified, false); }
    }
  });
  for (const row of [...changed, explicit]) {
    const { family, element, property } = row;
    const entry = cases.find(e => e.family === family && e.styleInputs.some(i => i.id === element && i.reference));
    const [r, a] = modalInventoryTrees(inventory, keyOf(entry)), proof = proveInheritedWordBoundary(entry, r, a, element, property);
    assert.equal(proof.publicSupportCheckRequired, row === explicit);
    const css = property.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    const ancestor = structuredClone(r), owner = ancestor.nodes.find(n => n.key === proof.referenceNode);
    ancestor.nodes.find(n => n.key === owner.parent).inline[css] = { value: 'inherit', important: false };
    assert.throws(() => proveInheritedWordBoundary(entry, ancestor, a, element, property));
    const reset = structuredClone(a); reset.rules.push({ selector: '*', all: 'initial' });
    assert.throws(() => proveInheritedWordBoundary(entry, r, reset, element, property));
    const inherited = structuredClone(a), child = inherited.nodes.find(n => n.key === proof.astylarNode);
    inherited.nodes.find(n => n.key === child.parent).resolvedStyle[property] = 'normal';
    assert.throws(() => proveInheritedWordBoundary(entry, r, inherited, element, property));
    const incomplete = structuredClone(a); incomplete.nodes = incomplete.nodes.filter(n => n.key !== child.parent);
    assert.throws(() => proveInheritedWordBoundary(entry, r, incomplete, element, property));
    const serialized = structuredClone(r), n = serialized.nodes.find(n => n.key === proof.referenceNode);
    const index = n.rules.find(i => serialized.rules[i].active);
    if (index === undefined) { n.rules.push(serialized.rules.length); serialized.rules.push({ active: true, selector: '#injected', conditions: [], declarations: {}, cssText: `${css}: inherit;` }); }
    else serialized.rules[index].cssText += ` ${css}: inherit;`;
    assert.throws(() => proveInheritedWordBoundary(entry, serialized, a, element, property));
    if (property === 'overflowWrap') {
      const alias = structuredClone(a); alias.rules.push({ selector: '#' + element, wordWrap: 'break-word' });
      assert.throws(() => proveInheritedWordBoundary(entry, r, alias, element, property));
    }
  }
});

test('production wrapping batch conserves all 8483 raw rows and changes only 30 reviewed groups', () => {
  const bytes = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(bytes);
  const cases = [...capture.results.map(e => ({ ...e, kind: 'static' })),
    ...capture.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const inventory = collectFullTreeInventory(cases); assert.deepEqual(inventory.errors, []);
  const snapshot = { generation: 'baf0ccb8d7f5adad44efff3a8e165448e550b7455999a182ce138975b2bfff3b',
    indexSha256: '00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0' };
  const rows = [...new Set(cases.map(e => e.family))].flatMap(family =>
    queryFindings('artifacts/material-parity/working-audit', family, snapshot))
    .filter(r => r.evidence.section === 'discrepancies').sort((a, b) => a.evidence.ordinal - b.evidence.ordinal)
    .map(({ id, evidence, ...row }) => row);
  assert.equal(rows.length, 8483);
  const source = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8').replaceAll('\r\n', '\n');
  const start = source.indexOf("  const wrappingDiscrepancies = ownerInitialStyleBinding.status === 'bound'");
  const end = source.indexOf('  const beforeRetainedFontScalars =', start);
  assert.ok(start > 0 && end > start);
  const run = new Function('ownerInitialStyleBinding', 'beforeNormalLineBoxScalars', 'cases', 'elementInventory',
    'canonicalStyle', 'applyWrappingReviews', source.slice(start, end) + '\nreturn wrappingDiscrepancies;');
  const normalize = bindPreciseAuditNormalization();
  const applied = run({ status: 'bound' }, rows, cases, inventory, normalize, applyWrappingReviews);
  assert.equal(run({ status: 'unbound' }, rows, cases, inventory, normalize, applyWrappingReviews), rows);
  const batch = applied.filter(r => wrappingAttributions.includes(r.attribution));
  assert.equal(batch.length, 30); assert.equal(batch.reduce((sum, r) => sum + r.occurrences, 0), 1478);
  assert.equal(applied.filter(r => r.attribution === 'unresolved').length, 1030);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const raw = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(raw), rows.map(raw));
  for (let i = 0; i < rows.length; i++) if (!batch.includes(applied[i])) assert.deepEqual(applied[i], rows[i]);
  assert.deepEqual(validateWrappingReviews(applied, rows, cases, inventory, normalize), []);
  const validation = '      errors.push(...validateWrappingReviews(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));';
  assert.equal(source.split(validation).length, 2);
  const errors = [];
  new Function('errors', 'validateWrappingReviews', 'report', 'replayedRows', 'cases', 'canonicalStyle', validation)(
    errors, validateWrappingReviews, { discrepancies: applied, elementInventory: inventory }, rows, cases, normalize);
  assert.deepEqual(errors, []);
  const guard = "  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => wrappingAttributions.includes(d.attribution)))\n    errors.push('wrapping attribution lacks bound original cases');";
  assert.equal(source.split(guard).length, 2);
  new Function('report', 'wrappingAttributions', 'errors', guard)({ discrepancies: applied }, wrappingAttributions, errors);
  assert.deepEqual(errors, ['wrapping attribution lacks bound original cases']);
});

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
      const proof = proveChipLabelWrapping(entry, input, r, a, inventory);
      assert.equal(proof.classification, 'application-plugin-authoring-defect');
      assert.equal(proof.hostMotionReviewed, false);
      labels++;
    }
  }
  assert.equal(labels, 152);
  const entry = cases[0], input = one(entry.styleInputs.filter(i => i.id === 'chip-0'));
  const [reference, candidate] = modalInventoryTrees(inventory, keyOf(entry));
  for (const property of ['whiteSpace', 'text-wrap-mode', 'all']) {
    const altered = structuredClone(candidate);
    altered.rules.push({ selector: '.chip-label', [property]: 'nowrap' });
    assert.throws(() => proveChipLabelWrapping(entry, input, reference, altered, inventory));
  }
  const altered = structuredClone(reference);
  const rule = altered.rules.find(r => r.selector === '.mdc-evolution-chip__text-label');
  rule.declarations['text-wrap-mode'].value = 'wrap';
  assert.throws(() => proveChipLabelWrapping(entry, input, altered, candidate, inventory));
  const rows = queryFindings('artifacts/material-parity/working-audit', 'chips', {
    generation: 'baf0ccb8d7f5adad44efff3a8e165448e550b7455999a182ce138975b2bfff3b',
    indexSha256: '00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyChipHostWrapping(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === chipHostWrappingAttribution);
  assert.equal(changed.length, 2); assert.equal(changed.reduce((sum, r) => sum + r.occurrences, 0), 152);
  assert.deepEqual(validateChipHostWrapping(applied, rows, cases, inventory, normalize), []);
  for (let index = 0; index < rows.length; index++) if (!changed.includes(applied[index])) assert.deepEqual(applied[index], rows[index]);
  for (const mutation of ['duration', 'target', 'inactive']) {
    const alteredMotion = structuredClone(reference);
    const motion = alteredMotion.rules.find(r => r.selector.startsWith('.mat-mdc-standard-chip._mat-animation-noopable,'));
    if (mutation === 'duration') motion.declarations['transition-duration'].value = '200ms';
    if (mutation === 'target') motion.declarations['transition-property'] = { value: 'all', important: false };
    if (mutation === 'inactive') motion.active = false;
    assert.throws(() => proveChipHostWrapping(entry, input, alteredMotion, candidate, inventory));
  }
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === chipHostWrappingAttribution).reviewEvidence.observations[0].animationSettlementVerified = true;
  assert.equal(validateChipHostWrapping(forged, rows, cases, inventory, normalize).length, 1);
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
  const snapshot = { generation: 'ef6da409ae1162433b0419814fe7e7e33b7659805d8e672f407d8b4c84878145',
    indexSha256: 'a25ffe1f2d083f23fafe6e615566544a9aedf7b9559e2084309551568982cca9' };
  const rows = ['bottom-sheet', 'dialog', 'snack-bar'].flatMap(f =>
    queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyOverlayNormal(rows, cases, inventory, normalize);
  const changed = applied.filter(r => r.attribution === overlayNormalAttribution);
  assert.equal(changed.length, 12); assert.equal(changed.reduce((n, r) => n + r.occurrences, 0), 360);
  assert.deepEqual(validateOverlayNormal(applied, rows, cases, inventory, normalize), []);
  const metadata = new Set(['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases']);
  const rawRow = r => Object.fromEntries(Object.entries(r).filter(([key]) => !metadata.has(key)));
  assert.deepEqual(applied.map(rawRow), rows.map(rawRow));
  for (let i = 0; i < applied.length; i++) if (applied[i].attribution !== overlayNormalAttribution)
    assert.deepEqual(applied[i], rows[i]);
  const entry = cases.find(e => e.styleInputs.some(i => i.id === 'bottom-sheet-panel'));
  const input = one(entry.styleInputs.filter(i => i.id === 'bottom-sheet-panel'));
  const [reference, candidate] = modalInventoryTrees(inventory, keyOf(entry));
  for (const property of ['whiteSpace', 'transition', 'all']) {
    const altered = structuredClone(candidate);
    altered.rules.push({ selector: '#bottom-sheet-panel', [property]: 'initial' });
    assert.throws(() => proveOverlayNormal(entry, input, reference, altered));
  }
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === overlayNormalAttribution).reviewEvidence.observations[0].candidateComputedVerified = true;
  assert.equal(validateOverlayNormal(forged, rows, cases, inventory, normalize).length, 1);
  const dialog = cases.find(e => e.styleInputs.some(i => i.id === 'dialog-save'));
  const dialogInput = one(dialog.styleInputs.filter(i => i.id === 'dialog-save'));
  const [dr, da] = modalInventoryTrees(inventory, keyOf(dialog));
  for (const mutate of [
    r => { r.rules.find(x => x.selector === '._mat-animation-noopable .mat-mdc-dialog-surface').active = false; },
    r => { r.rules.find(x => x.selector === '._mat-animation-noopable .mat-mdc-dialog-surface').declarations['transition-property'].value = 'all'; },
    r => { r.rules.find(x => x.selector === '.mat-mdc-dialog-surface').cssText = 'transition: white-space 1s;'; },
    r => { r.rules.find(x => x.selector === '._mat-animation-noopable .mat-mdc-dialog-surface').source = 'sheet:999/0'; },
    r => { r.rules.find(x => x.declarations['animation-name']).declarations['animation-name'].value = 'wrap-change'; },
  ]) {
    const altered = structuredClone(dr); mutate(altered);
    assert.throws(() => proveOverlayNormal(dialog, dialogInput, altered, da));
  }
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
  const rows = queryFindings('artifacts/material-parity/working-audit', 'table', {
    generation: 'baf0ccb8d7f5adad44efff3a8e165448e550b7455999a182ce138975b2bfff3b',
    indexSha256: '00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const normalize = bindPreciseAuditNormalization();
  const applied = applyTableWrapping(rows, cases, inventory, normalize);
  const changed = one(applied.filter(r => r.attribution === tableWrappingAttribution));
  assert.equal(changed.occurrences, 52);
  assert.deepEqual(validateTableWrapping(applied, rows, cases, inventory, normalize), []);
  for (let index = 0; index < rows.length; index++) if (applied[index] !== changed) assert.deepEqual(applied[index], rows[index]);
  for (const key of ['family', 'element', 'property', 'reference', 'astylar', 'states', 'cases', 'occurrences'])
    assert.deepEqual(changed[key], rows.find(r => r.element === 'table-primary' && r.property === 'whiteSpace')[key]);
  const entry = cases.find(e => e.family === 'table');
  const input = one(entry.styleInputs.filter(i => i.id === 'table-primary'));
  const [reference, candidate] = modalInventoryTrees(inventory, keyOf(entry));
  for (const property of ['whiteSpace', 'all', 'transition']) {
    const altered = structuredClone(candidate); altered.rules.push({ selector: '#table-primary', [property]: 'initial' });
    assert.throws(() => proveTableWrapping(entry, input, reference, altered));
  }
  const altered = structuredClone(reference);
  altered.rules.find(r => r.selector === '.mat-mdc-table').declarations['text-wrap-mode'].value = 'nowrap';
  assert.throws(() => proveTableWrapping(entry, input, altered, candidate));
  const forged = structuredClone(applied);
  forged.find(r => r.attribution === tableWrappingAttribution).reviewEvidence.observations[0].descendantConsumptionVerified = true;
  assert.equal(validateTableWrapping(forged, rows, cases, inventory, normalize).length, 1);
  const tabRows = queryFindings('artifacts/material-parity/working-audit', 'tabs', {
    generation: 'baf0ccb8d7f5adad44efff3a8e165448e550b7455999a182ce138975b2bfff3b',
    indexSha256: '00e5b5296d3d4af5ee27086fc41db3fbc21238bb6ee8b6a36315be68d25d60e0',
  }).filter(r => r.evidence.section === 'discrepancies').map(({ id, evidence, ...row }) => row);
  const tabApplied = applyTabPanelWrapping(tabRows, cases, inventory, normalize);
  const tabChanged = one(tabApplied.filter(r => r.attribution === tabPanelWrappingAttribution));
  assert.equal(tabChanged.occurrences, 70);
  assert.deepEqual(validateTabPanelWrapping(tabApplied, tabRows, cases, inventory, normalize), []);
  for (let index = 0; index < tabRows.length; index++) if (tabApplied[index] !== tabChanged) assert.deepEqual(tabApplied[index], tabRows[index]);
  const tabEntry = cases.find(e => e.family === 'tabs');
  const tabInput = one(tabEntry.styleInputs.filter(i => i.id === 'tab-panel'));
  const [tr, ta] = modalInventoryTrees(inventory, keyOf(tabEntry));
  const alteredTab = structuredClone(ta);
  alteredTab.nodes.find(n => n.authored?.id === 'tab-panel').authored.type = 'div';
  assert.throws(() => proveTabPanelWrapping(tabEntry, tabInput, tr, alteredTab));
  const tabForged = structuredClone(tabApplied);
  tabForged.find(r => r.attribution === tabPanelWrappingAttribution).reviewEvidence.observations[0].coreRendererCauseProven = true;
  assert.equal(validateTabPanelWrapping(tabForged, tabRows, cases, inventory, normalize).length, 1);
});
