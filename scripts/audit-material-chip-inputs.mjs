import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';

// Read unchanged, checkpoint-bound input trees. Never map a host border to a
// descendant pseudo border merely because their screen outlines look alike.
const args = process.argv.slice(2);
assert.equal(args.length, 2, 'Usage: node scripts/audit-material-chip-inputs.mjs <checkpoint-directory> <new-output-file>');
const directory = path.resolve(args[0]);
const manifestBytes = readFileSync(path.join(directory, 'manifest.json'));
const manifest = JSON.parse(manifestBytes);
const digest = value => createHash('sha256').update(value).digest('hex');
const expected = [...manifest.provenance.cases.map(c => ['static', c]),
  ...manifest.provenance.interactionCases.map(c => ['interaction', c]),
  ...manifest.provenance.mobileFlowCases.map(c => ['interaction', c])]
  .filter(([, c]) => c.family === 'chips').map(([kind, c]) => materialCaseKey(kind, c)).sort();
assert.ok(expected.length > 0);
const records = readdirSync(directory).filter(n => /^[a-f0-9]{64}\.json$/.test(n))
  .map(n => ({ name: n, record: JSON.parse(readFileSync(path.join(directory, n))) }))
  .filter(({ record }) => JSON.parse(record.key).family === 'chips');
assert.deepEqual(records.map(({ record }) => record.key).sort(), expected, 'Every configured chip case is required.');
const properties = ['position', 'boxSizing', 'width', 'height', 'padding', 'margin', 'content', 'pointerEvents',
  ...['Top', 'Right', 'Bottom', 'Left'].flatMap(side => [`border${side}Width`, `border${side}Style`, `border${side}Color`])];
const pick = style => Object.fromEntries(properties.filter(p => p in style).map(p => [p, style[p]]));
const results = [];
for (const { name, record } of records) {
  assert.equal(name, `${digest(record.key)}.json`);
  assert.equal(digest(JSON.stringify(record.result)), record.sha256);
  const trees = {};
  for (const side of ['reference', 'astylar']) {
    const source = record.result.inputTrees[side], file = path.resolve(source.file);
    const artifactRoot = path.dirname(directory);
    assert.ok(file.startsWith(artifactRoot + path.sep), 'Tree must belong to the selected artifact run.');
    const bytes = readFileSync(file);
    assert.equal(digest(bytes), source.sha256);
    const checkpointFile = record.files.find(entry => path.resolve(artifactRoot, entry.file) === file);
    assert.equal(checkpointFile?.sha256, source.sha256);
    trees[side] = JSON.parse(bytes);
    assert.deepEqual(trees[side].errors, []);
  }
  const reference = trees.reference, candidate = trees.astylar;
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision));
  for (const id of ['chip-0', 'chip-1']) {
    const hosts = reference.nodes.filter(n => n.attributes?.id === id);
    const candidates = candidate.nodes.filter(n => n.authored?.id === id);
    assert.equal(hosts.length, 1); assert.equal(candidates.length, 1);
    const host = hosts[0], ast = candidates[0];
    assert.equal(host.type, 'mat-chip-option'); assert.equal(ast.authored.type, 'div');
    const actions = reference.nodes.filter(n => n.key.startsWith(host.key + '/') &&
      n.type === 'button' && n.attributes?.class?.split(/\s+/).includes('mdc-evolution-chip__action--primary'));
    assert.equal(actions.length, 1);
    const action = actions[0], pseudos = action.pseudoElements.filter(p => p.pseudo === '::before' && p.generated);
    assert.equal(pseudos.length, 1);
    const pseudo = pseudos[0], pseudoRules = pseudo.rules.map(i => reference.rules[i]);
    assert.ok(pseudoRules.every(rule => typeof rule.active === 'boolean' && typeof rule.cssText === 'string'));
    assert.ok(pseudoRules.some(rule => rule.active && rule.selector === '.mat-mdc-standard-chip .mdc-evolution-chip__action--primary::before' &&
      rule.cssText.includes('position: absolute;') && rule.cssText.includes('box-sizing: border-box;')));
    const authoredRules = candidate.rules.filter(rule => /^\.chip(?:[.:]|$)/.test(rule.selector));
    assert.equal(authoredRules.filter(rule => rule.selector === '.chip').length, 1);
    const base = authoredRules.find(rule => rule.selector === '.chip');
    assert.equal(base.borderWidth, '1px'); assert.equal(base.borderStyle, 'solid'); assert.equal(base.borderColor, '#79747e');
    assert.ok(['Top', 'Right', 'Bottom', 'Left'].every(side => reference.styles[host.style][`border${side}Width`] === '0px'));
    assert.ok([ast.normalResolvedStyle, ast.resolvedStyle, ast.interactionResolvedStyle].every(style => style && typeof style === 'object'));
    results.push({ case: record.key, element: id, sources: record.result.inputTrees, resultSha256: record.sha256,
      referenceHost: { key: host.key, type: host.type, attributes: host.attributes, style: pick(reference.styles[host.style]) },
      referenceAction: { key: action.key, attributes: action.attributes, style: pick(reference.styles[action.style]) },
      referenceOutline: { owner: action.key, pseudo: pseudo.pseudo, generated: pseudo.generated,
        style: pick(reference.styles[pseudo.style]), rules: pseudoRules },
      candidate: { key: ast.key, authored: ast.authored, rules: authoredRules,
        revision: candidate.resolvedStyleRevision, normal: ast.normalResolvedStyle,
        effective: ast.resolvedStyle, interaction: ast.interactionResolvedStyle },
      inputEquivalent: false, finalRasterVerified: false,
      classification: 'application-plugin-authoring-defect',
      scope: 'Authored outline ownership differs: reference descendant-button pseudo versus candidate host border. Captured token, state, box model and geometry remain separate fields; no host/pseudo color alias or core-failure attribution is inferred.' });
  }
}
const report = { schemaVersion: 1, checkpoint: directory, manifestSha256: digest(manifestBytes),
  producerSha256: digest(readFileSync(new URL(import.meta.url))), configuredCases: expected.length,
  observations: results.length, results };
writeFileSync(path.resolve(args[1]), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({ configuredCases: expected.length, observations: results.length, output: path.resolve(args[1]) }));
