import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
const themeFile = 'examples/material-showcase/src/app/theme.ts';
const hoverRule = "{ selector: '.material-button:hover', background: mixHex(theme.primary, theme.onPrimary, .08) }";
const one = values => { assert.equal(values.length, 1, 'owner must be unique'); return values[0]; };
const hex = value => {
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(value);
  assert.ok(match, 'expected captured opaque RGB, not a synthesized color');
  return '#' + match.slice(1).map(v => { assert.ok(+v >= 0 && +v <= 255); return (+v).toString(16).padStart(2, '0'); }).join('');
};

// A structural/paint-input observation, not a cascade engine or raster proof.
export function inspectButtonHoverComposition(reference, candidate, mixHex, state = 'hover') {
  assert.ok(['hover', 'activate', 'held'].includes(state), 'unreviewed interaction boundary');
  const pressed = state === 'held', pseudoState = pressed ? 'active' : 'hover';
  const opacityToken = pressed ? 'pressed' : 'hover';
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  const host = one(reference.nodes.filter(n => n.attributes?.id === 'button-primary'));
  const target = one(candidate.nodes.filter(n => n.authored?.id === 'button-primary'));
  assert.equal(host.type, 'button'); assert.equal(target.authored.type, 'button');
  assert.ok(target.authored.class.split(/\s+/).includes('material-button'));
  assert.equal(candidate.nodes.filter(n => n.parent === target.key).length, 0, 'candidate paint structure changed');
  const layer = one(reference.nodes.filter(n => n.parent === host.key &&
    n.attributes?.class?.split(/\s+/).includes('mat-mdc-button-persistent-ripple')));
  const pseudo = one(layer.pseudoElements.filter(p => p.pseudo === '::before' && p.generated));
  const baseStyle = reference.styles[host.style], layerStyle = reference.styles[pseudo.style];
  const layerRules = pseudo.rules.map(i => reference.rules[i]);
  assert.ok(layerRules.some(r => r.active === true && r.selector ===
    `.mat-mdc-unelevated-button:${pseudoState} > .mat-mdc-button-persistent-ripple::before` &&
    r.declarations.opacity?.value === `var(--mat-button-filled-${opacityToken}-state-layer-opacity, var(--mat-sys-${opacityToken}-state-layer-opacity))`));
  assert.ok(layerRules.some(r => r.active === true && r.declarations['background-color']?.value ===
    'var(--mat-button-filled-state-layer-color, var(--mat-sys-on-primary))'));
  assert.equal(layerStyle.opacity, pressed ? '0.12' : '0.08'); assert.equal(layerStyle.position, 'absolute');
  assert.equal(layerStyle.pointerEvents, 'none');
  const base = hex(baseStyle.backgroundColor), foreground = hex(layerStyle.backgroundColor);
  assert.equal(target.normalResolvedStyle.background, base);
  const flattened = mixHex(base, foreground, Number(layerStyle.opacity));
  assert.equal(target.interactionResolvedStyle.background, flattened);
  assert.equal(target.resolvedStyle.background, flattened);
  const candidateRule = one(candidate.rules.filter(r => r.selector === `.material-button:${pseudoState}`));
  assert.equal(candidateRule.background, flattened, 'captured hover declaration must explain the changed host background');
  const hostRules = host.rules.map(i => reference.rules[i]);
  assert.ok(hostRules.some(r => r.active === true && r.selector === '.mat-mdc-unelevated-button:not(:disabled)' &&
    r.declarations['background-color']?.value === 'var(--mat-button-filled-container-color, var(--mat-sys-primary))'));
  assert.notEqual(base, flattened);
  return { state, referenceHost: host.key, referenceLayer: layer.key, candidateHost: target.key,
    referenceBackground: baseStyle.backgroundColor, referenceLayerBackground: layerStyle.backgroundColor,
    referenceLayerOpacity: layerStyle.opacity, candidateNormalBackground: target.normalResolvedStyle.background,
    candidateEffectiveBackground: target.interactionResolvedStyle.background,
    candidateChildCount: 0, flattenedColor: flattened, hostRules, layerRules, candidateRule,
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    renderedCompositeVerified: false, rendererCauseProven: false,
    limitation: 'A captured generated alpha state layer is replaced by a changed opaque host background. Arithmetic correspondence is not equal paint inputs, raster proof, or a diagnosis of core alpha support.' };
}

export function collectButtonHoverComposition() {
  const source = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  const historical = execFileSync('git', ['show', `2f44011:${sourceFile}`], { encoding: 'utf8' });
  assert.ok(source.includes(hoverRule)); assert.ok(historical.includes(hoverRule));
  const themeSource = readFileSync(themeFile, 'utf8').replaceAll('\r\n', '\n');
  const parsed = ts.createSourceFile(themeFile, themeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const fn = one(parsed.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'mixHex')).getText(parsed);
  const compiled = ts.transpileModule(fn.replace(/^export /, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const mixHex = new Function(compiled + '\nreturn mixHex;')();
  const directory = 'artifacts/material-parity/current-ancestry-audit', observations = [];
  const originalFile = `${directory}/latest-report.json`, originalBytes = readFileSync(originalFile);
  const originalSha256 = hash(originalBytes);
  assert.equal(originalSha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(originalBytes), selected = [], seen = new Set();
  let primaryCases = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = materialCaseKey(kind, entry); assert.ok(!seen.has(key)); seen.add(key);
    if (entry.family !== 'button') continue;
    const input = one(entry.styleInputs.filter(i => i.id === 'button-primary')); primaryCases++;
    if (hex(input.reference.backgroundColor) === input.astylar.background) continue;
    assert.equal(kind, 'interaction');
    assert.ok(['hover', 'held', 'activate'].includes(entry.state), 'additional unequal background requires review');
    selected.push({ key, entry, input });
  }
  assert.equal(seen.size, 2311); assert.equal(primaryCases, 60); assert.equal(selected.length, 24);
  for (const { key, entry, input } of selected) {
    const { profile, viewport, state } = entry;
    const file = `${directory}/checkpoint/${hash(key)}.json`, bytes = readFileSync(file);
    const record = JSON.parse(bytes);
    assert.equal(record.key, key); assert.equal(record.sha256, hash(JSON.stringify(record.result)));
    assert.equal(record.result.family, 'button'); assert.equal(record.result.profile, profile);
    assert.deepEqual(record.result.viewport, viewport); assert.equal(record.result.state, state);
    assert.deepEqual(record.result, entry, 'original report and checkpoint must describe the same complete result');
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const descriptor = record.result.inputTrees[side], target = path.resolve(descriptor.file);
      assert.ok(target.startsWith(path.resolve(directory) + path.sep));
      const data = readFileSync(target); assert.equal(hash(data), descriptor.sha256);
      const captured = one(record.files.filter(f => path.resolve(directory, f.file) === target));
      assert.equal(captured.sha256, descriptor.sha256); trees[side] = JSON.parse(data);
    }
    const proof = inspectButtonHoverComposition(trees.reference, trees.astylar, mixHex, state);
    assert.equal(input.reference.backgroundColor, proof.referenceBackground);
    for (const stage of ['astylar', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].background, proof.candidateEffectiveBackground);
    assert.equal(input.astylarNormalResolvedStyle.background, proof.candidateNormalBackground);
    observations.push({ profile, viewport, state, checkpoint: { file, sha256: hash(bytes) },
      originalInputSha256: hash(JSON.stringify(input)), inputTrees: record.result.inputTrees, proof });
  }
  return { schemaVersion: 1, kind: 'button-hover-paint-composition-audit',
    scope: 'Every unequal primary-button background in the original report: hover, held and activate. Not other button owners, transitions between boundaries, or full rendering equivalence.',
    originalCapture: { file: originalFile, sha256: originalSha256 },
    originalCasesScanned: seen.size, primaryCases, equalBackgroundCasesRetained: primaryCases - selected.length,
    sources: [{ file: sourceFile, sha256: hash(source) }, { file: themeFile, sha256: hash(themeSource) }],
    history: { revision: '2f44011', sourceSha256: hash(historical), hoverRule,
      conclusion: 'The preblended hover rule already exists in the initial Material showcase commit; author intent and a motivating renderer defect are not inferred.' },
    mixHexFunctionSha256: hash(fn), cases: observations.length, observations,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectButtonHoverComposition(), file = 'docs/material-button-hover-composition.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ cases: report.cases, classification: report.observations[0].proof.classification,
    canonicalAttributionChanged: false, inputEquivalent: false, reportSha256: hash(output) }));
}
