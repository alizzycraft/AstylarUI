import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const one = (values, message) => { assert.equal(values.length, 1, message); return values[0]; };
const affects = key => /^(?:background(?:-|$)|all$|animation|transition|--surface$|--primary$)/.test(key);
const hexChannels = value => {
  assert.match(value, /^#[a-f0-9]{6}$/);
  return [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16));
};

// This checks one captured declaration path. It does not synthesize a general
// cascade or assume a renderer defect from the unequal authoring it observes.
export function inspectRootBackgroundInputs(input, reference, candidate, mixHex) {
  const element = input.id;
  assert.match(element, /-root$/);
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  const root = one(reference.nodes.filter(node => node.attributes?.id === element), 'reference root');
  const frame = one(reference.nodes.filter(node => node.key === root.parent), 'reference parent');
  const target = one(candidate.nodes.filter(node => node.authored?.id === element), 'candidate root');
  assert.equal(root.type, 'section'); assert.equal(target.authored.type, 'section');
  assert.equal(frame.key, 'frame'); assert.equal(frame.parent, null);
  assert.ok(!Object.keys(root.inline).some(affects), 'root inline override or motion');
  const rules = root.rules.map(index => reference.rules[index]);
  const paintRules = rules.filter(rule => Object.keys(rule.declarations).some(affects));
  const rule = one(paintRules, 'unique reference background owner');
  assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []);
  assert.match(rule.selector, /^\.demo(?:\[_ngcontent-[\w-]+\])?$/);
  assert.ok(rule.cssText.includes('background: color-mix(in srgb,var(--surface) 94%,var(--primary));'));
  assert.ok(!Object.keys(rule.declarations).some(key => affects(key) && !key.startsWith('background-')),
    'root variable, all or motion override');
  for (const key of ['--surface', '--primary']) {
    assert.equal(frame.inline[key].important, false);
    // A captured stylesheet custom-property declaration could affect the
    // expression and needs separate review instead of assumed precedence.
    assert.ok(frame.rules.every(index => !reference.rules[index].declarations[key]), 'competing frame variable');
  }
  const surface = frame.inline['--surface'].value, primary = frame.inline['--primary'].value;
  const background = hexChannels(surface), foreground = hexChannels(primary);
  const numerators = background.map((value, index) => value * 94 + foreground[index] * 6);
  const requested = mixHex(surface, primary, .06), actualChannels = hexChannels(requested);
  assert.deepEqual(actualChannels, numerators.map(value => Math.round(value / 100)));
  assert.ok(numerators.some((value, index) => value !== actualChannels[index] * 100), 'authoring must actually differ');
  assert.ok(target.authored.style === undefined, 'candidate inline style needs review');
  const authoredRule = one(input.astylarAuthored.filter(rule =>
    Object.keys(rule.declarations).some(key => /^(background|all$|animation|transition)/.test(key))), 'candidate background rule');
  assert.equal(authoredRule.selector, '#' + element);
  assert.equal(authoredRule.declarations.background, requested);
  assert.ok(Object.keys(authoredRule.declarations).every(key => key === 'background' || !/^(background|all$|animation|transition)/.test(key)));
  for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) assert.equal(target[stage].background, requested);
  for (const stage of ['astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle', 'astylar']) assert.equal(input[stage].background, requested);
  const computed = reference.styles[root.style].backgroundColor;
  assert.equal(computed, input.reference.backgroundColor);
  assert.match(computed, /^color\(srgb [\d.]+ [\d.]+ [\d.]+\)$/);
  return { element, property: 'backgroundColor', referenceComputed: computed, candidateRequested: requested,
    surface, primary, referenceRule: rule, candidateRule: authoredRule,
    referenceMix: { numerators, denominator: 100 }, candidateChannelNumerators: actualChannels.map(value => value * 100),
    classification: 'application-plugin-authoring-defect', owner: 'showcase theme color prequantization',
    inputEquivalent: false, rendererDefectProven: false, rasterDifferenceProven: false };
}

// Component-token mismatch, distinct from the root's fractional color mix.
// Caller authenticates original capture/tree bytes; this checks owner identity,
// complete scalar snapshots and the single captured declaration path.
export function inspectSidenavBackgroundInputs(input, reference, candidate) {
  assert.equal(input.id, 'sidenav-primary');
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.ok(Number.isInteger(candidate.resolvedStyleRevision));
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const ref = one(reference.nodes.filter(n => n.attributes?.id === input.id), 'unique sidenav reference');
  const ast = one(candidate.nodes.filter(n => n.authored?.id === input.id), 'unique sidenav candidate');
  assert.equal(ref.type, 'mat-sidenav-container'); assert.equal(ast.authored.type, 'div');
  assert.equal(ast.authored.class, 'sidenav-container');
  const changesPaint = key => /^(?:background|all$|animation|transition)/.test(key);
  assert.ok(!Object.keys(ref.inline).some(changesPaint), 'sidenav inline paint override');
  assert.equal(ast.authored.style, undefined, 'candidate inline override');
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[ref.style][key], value);
  for (const [scalar, stage] of [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
    ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']]) {
    assert.ok(input[scalar]); assert.deepEqual(input[scalar], ast[stage]);
  }
  const rule = one(ref.rules.map(i => reference.rules[i]).filter(r =>
    Object.keys(r.declarations).some(changesPaint)), 'single sidenav reference paint rule');
  assert.equal(rule.selector, '.mat-drawer-container');
  assert.equal(rule.active, true); assert.deepEqual(rule.conditions, []);
  assert.deepEqual(Object.keys(rule.declarations).filter(changesPaint), ['background-color']);
  const token = 'var(--mat-sidenav-content-background-color, var(--mat-sys-background))';
  assert.deepEqual(rule.declarations['background-color'], { value: token, important: false });
  const authored = one(input.astylarAuthored, 'single sidenav authored rule');
  assert.equal(authored.selector, '.sidenav-container');
  assert.deepEqual(candidate.rules[authored.index], { selector: authored.selector, ...authored.declarations });
  assert.deepEqual(Object.keys(authored.declarations).filter(changesPaint), ['background']);
  const requested = authored.declarations.background;
  const channels = hexChannels(requested);
  for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'])
    assert.equal(ast[stage].background, requested);
  const computed = input.reference.backgroundColor;
  const rgb = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(computed);
  assert.ok(rgb, 'unreviewed reference color representation');
  assert.notDeepEqual(rgb.slice(1).map(Number), channels, 'sidenav authoring must actually differ');
  return { element: input.id, referenceNode: ref.key, candidateNode: ast.key,
    referenceToken: token, referenceComputed: computed, candidateRequested: requested,
    referenceRule: rule, candidateRule: authored,
    classification: 'application-plugin-authoring-defect', owner: 'showcase sidenav background token translation',
    inputEquivalent: false, rendererDefectProven: false, renderingEquivalent: false };
}

export function collectRootBackgroundInputs() {
  const themeFile = 'examples/material-showcase/src/app/theme.ts';
  const source = readFileSync(themeFile, 'utf8').replaceAll('\r\n', '\n');
  const parsed = ts.createSourceFile(themeFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const fn = one(parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'mixHex'), 'mixHex source').getText(parsed);
  const compiled = ts.transpileModule(fn.replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const mixHex = new Function(compiled + '\nreturn mixHex;')();
  assert.ok(source.includes('surfaceContainer: mixHex(normalized.surface, normalized.primary, .06)'));
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const original = JSON.parse(bytes), cases = new Set(), groups = new Map();
  const boundary = realpathSync('artifacts/material-parity/current-ancestry-audit');
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of entries) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!cases.has(caseId)); cases.add(caseId);
      const input = one(entry.styleInputs.filter(input => input.id === entry.family + '-root'), 'complete root mapping');
      const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
        const descriptor = entry.inputTrees[side], target = realpathSync(descriptor.file);
        assert.ok(target.startsWith(boundary + path.sep));
        const treeBytes = readFileSync(target); assert.equal(hash(treeBytes), descriptor.sha256);
        return [side, JSON.parse(treeBytes)];
      }));
      const proof = inspectRootBackgroundInputs(input, trees.reference, trees.astylar, mixHex);
      const key = JSON.stringify([entry.family, entry.profile, proof.referenceComputed, proof.candidateRequested]);
      if (!groups.has(key)) groups.set(key, { family: entry.family, profile: entry.profile,
        element: input.id, property: 'backgroundColor', reference: proof.referenceComputed,
        candidate: proof.candidateRequested, classification: proof.classification, owner: proof.owner,
        referenceMix: proof.referenceMix, candidateChannelNumerators: proof.candidateChannelNumerators,
        observations: [] });
      const group = groups.get(key);
      assert.deepEqual(group.referenceMix, proof.referenceMix);
      group.observations.push({ case: caseId, inputSha256: digest(input), inputTrees: entry.inputTrees, proofSha256: digest(proof) });
    }
  }
  const findings = [...groups.values()].map(group => ({ ...group, occurrences: group.observations.length }));
  return { schemaVersion: 1, kind: 'material-root-background-authoring-inputs', capture,
    source: { file: themeFile, sha256: hash(source), mixHexFunctionSha256: hash(fn) },
    counts: { cases: cases.size, groups: findings.length, families: new Set(findings.map(row => row.family)).size },
    findings, canonicalReportChanged: false, rendererChanged: false, inputEquivalent: false,
    limitation: 'Source-bound root background authoring only. This proves neither a raster defect nor a core color-mix support gap. No legacy color normalizer is used to classify input equivalence.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectRootBackgroundInputs(), file = 'docs/material-root-background-inputs.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ ...report.counts, reportSha256: hash(output), canonicalReportChanged: false }));
}
