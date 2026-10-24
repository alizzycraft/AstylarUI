import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import path from 'node:path';
import { restoreMenuSelection, menuSelectionPriorHashes } from './menu-select-disabled-selection.mjs';
import { menuPopupSemanticInputFindings } from './menu-popup-semantic-input-findings.mjs';
import { publicProgrammaticFocusFinding } from './public-programmatic-focus-finding.mjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const prior = '9e936a24c2fdef6d5c95a8e9773cfd804c8227a8b9331fab91dfb6f1fbbcf766';
export const menuPendingSources = Object.freeze([
  'scripts/audit-material-menu-ax-contexts.mjs',
  'scripts/audit-material-menu-ax.mjs',
  'scripts/audit-material-menu-dismissal-ax.mjs',
  'scripts/audit-material-menu-mobile-ax.mjs',
  'scripts/audit-public-menu-negative-tabindex.mjs',
  'scripts/audit-public-programmatic-focus-controls.mjs',
  'scripts/check-material-menu-mobile-ax.mjs',
  'scripts/check-recovered-original-endpoint-proofs.mjs',
  'scripts/join-material-menu-ax-evidence.mjs',
  'scripts/join-material-menu-composite-evidence.mjs',
  'scripts/join-material-menu-semantic-boundaries.mjs',
  'tests/material-parity/menu-composite-evidence.spec.mjs',
  'tests/material-parity/menu-popup-ax.spec.mjs',
  'tests/material-parity/menu-popup-semantic-input-findings.mjs',
  'tests/material-parity/public-programmatic-focus-finding.mjs',
  'scripts/audit-material-select-readonly-context.mjs',
  'scripts/audit-material-select-readonly-host.mjs',
  'scripts/audit-material-disabled-control-boundaries.mjs',
  'scripts/join-material-select-readonly-evidence.mjs',
  'scripts/join-material-disabled-control-evidence.mjs',
  'tests/material-parity/select-readonly-evidence.spec.mjs',
  'tests/material-parity/menu-select-disabled-review-source.mjs',
  'tests/material-parity/menu-select-disabled-selection.mjs',
  'tests/material-parity/menu-select-disabled-selection.spec.mjs',
  'tests/material-parity/menu-select-disabled-registration.mjs',
  'tests/material-parity/menu-select-disabled-registration.spec.mjs',
]);
export function menuPendingProofRows(read) {
  const rows = [];
  for (const file of menuPendingSources.filter(f => f.endsWith('.spec.mjs'))) {
    const ast = ts.createSourceFile(file, read(file).toString(), 99, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    for (const node of ast.statements) {
      if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression) || node.expression.expression.getText(ast) !== 'test') continue;
      const name = node.expression.arguments[0]; assert.ok(ts.isStringLiteral(name));
      const title = name.text, escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      rows.push({ file, title, pattern: "test\\('" + escaped + "'",
        scope: 'Bounded pending audit evidence only;declared observation/recipe/reader scopes remain. Not current rendering,equal inputs or whole-case acceptance.' });
    }
  }
  assert.equal(rows.length, 27);
  assert.equal(new Set(rows.map(r => r.file + ':' + r.title)).size, 27);
  return rows;
}
const sourceAnchor = 'function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor = 'function focusedProofInventory(root) {\n  return [\n';
const once = (s, before, after) => { assert.equal(s.split(before).length, 2, 'Exact inventory boundary required'); return s.replace(before, after); };
function prefixes(read) {
  assert.equal(menuPendingSources.length, 26); assert.equal(new Set(menuPendingSources).size, 26);
  return { sources: menuPendingSources.map(f => '    ' + JSON.stringify(f) + ',\n').join(''),
    proofs: menuPendingProofRows(read).map(r => '    proof(root, ' + JSON.stringify(r.file) + ', new RegExp(' + JSON.stringify(r.pattern) + '),\n      ' + JSON.stringify(r.title) + ', ' + JSON.stringify(r.scope) + '),\n').join('') };
}
export function prepareMenuProducerRegistration(source, read) {
  let s = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(s), prior, 'Complete frozen1002/326 producer must authenticate');
  for (const file of menuPendingSources) assert.equal(s.includes(JSON.stringify(file)), false, 'No duplicate source registration');
  const p = prefixes(read);
  s = once(s, sourceAnchor, sourceAnchor + p.sources);
  return once(s, proofAnchor, proofAnchor + p.proofs);
}
export function restoreMenuProducerRegistration(source, read) {
  let s = source.toString().replaceAll('\r\n', '\n');
  const p = prefixes(read);
  s = once(s, sourceAnchor + p.sources, sourceAnchor);
  s = once(s, proofAnchor + p.proofs, proofAnchor);
  assert.equal(hash(s), prior, 'Complete frozen producer must recover');
  return s;
}

const policyPrior = '1e7cb51d39ba3e93899143dddb081769b7569fe7b9ece610dc4b2da3543c38f4';
const policyAnchor = 'export const sourceAuditDefinitions = Object.freeze([\n';
export const menuPendingFindingDefinitions = Object.freeze([
  { ...menuPopupSemanticInputFindings[0], pattern: "id: 'menu-popup', role: 'menu'" },
  { ...menuPopupSemanticInputFindings[1], pattern: "ariaControls: 'menu-popup'" },
  { ...publicProgrammaticFocusFinding,
    pattern: 'focus\\(elementId: string, options: AstylarFocusOptions \\| undefined, scene: Scene\\): boolean',
    evidence: [publicProgrammaticFocusFinding.publicReproduction, publicProgrammaticFocusFinding.controls,
      publicProgrammaticFocusFinding.causalSource.evidence, publicProgrammaticFocusFinding.history.evidence]
      .map(({file, sha256}) => ({file, sha256})),
  },
]);
const policyPrefix = menuPendingFindingDefinitions.map(f => '  Object.freeze(' + JSON.stringify(f, null, 2) + '),\n').join('');
export function prepareMenuPolicyRegistration(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(text), policyPrior, 'Complete frozen193-definition policy must authenticate');
  for (const finding of menuPendingFindingDefinitions) assert.equal(text.includes(finding.id), false);
  return once(text, policyAnchor, policyAnchor + policyPrefix);
}
export function restoreMenuPolicyRegistration(source) {
  const text = once(source.toString().replaceAll('\r\n', '\n'), policyAnchor + policyPrefix, policyAnchor);
  assert.equal(hash(text), policyPrior, 'Complete prior policy must recover');
  return text;
}

// Exact prior-source applicability only;never normalize an unrelated read.
export function createMenuHistoricalRead({ root, read }) {
  const local = file => read(path.resolve(root, file));
  const transitions = new Map([
    ['tests/material-parity/input-equivalence-audit.mjs', { prior, restore: b => restoreMenuProducerRegistration(b, local) }],
    ['tests/material-parity/input-equivalence-policy.mjs', { prior: policyPrior, restore: restoreMenuPolicyRegistration }],
    ['scripts/export-material-input-audit-current-ancestry.mjs', { prior: menuSelectionPriorHashes.launcher, restore: b => restoreMenuSelection(b, 'launcher') }],
    ['scripts/run-material-input-audit.mjs', { prior: menuSelectionPriorHashes.runner, restore: b => restoreMenuSelection(b, 'runner') }],
  ].map(([file, value]) => [path.resolve(root, file), value]));
  return (file, options) => {
    const target = transitions.get(path.resolve(root, file));
    if (!target) return read(file, options);
    const bytes = read(path.resolve(root, file));
    const text = bytes.toString().replaceAll('\r\n', '\n');
    if (hash(text) === target.prior) return read(file, options);
    const restored = Buffer.from(target.restore(bytes));
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? restored.toString(encoding) : restored;
  };
}
