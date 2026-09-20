import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const normalization = {
  module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e',
};
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };

export function bindFractionalColorBaseline() {
  return bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
}

// Diagnostic only: preserve the original serialization and expose the exact
// operation performed by the current auditor. This is not a replacement color
// parser, a cascade resolver, a raster comparison, or a new equality tolerance.
export function inspectFractionalColorLoss(input, property, normalize) {
  const raw = input.reference?.[property];
  if (typeof raw !== 'string') return;
  const match = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/.exec(raw);
  if (!match) return;
  const channels = match.slice(1, 4).map(Number);
  if (!channels.every(Number.isFinite)) return;
  const scaledChannels = channels.map(value => value * 255);
  if (scaledChannels.every(Number.isInteger)) return;
  const roundedChannels = scaledChannels.map(Math.round);
  const referenceNormalized = normalize({ [property]: raw })[property];
  const candidateNormalized = normalize(input.astylar ?? {})[property];
  return {
    referenceRaw: raw, referenceSrgbChannels: match.slice(1, 4),
    scaledChannels, roundedChannels,
    channelChange: roundedChannels.map((value, index) => value - scaledChannels[index]),
    referenceNormalized, candidateNormalized: candidateNormalized ?? null,
    disposition: referenceNormalized === candidateNormalized ? 'difference-suppressed-by-rounding'
      : candidateNormalized === undefined ? 'reference-value-altered-candidate-omitted'
      : 'reference-value-altered-difference-retained',
  };
}

function rootMixWitnesses(report, normalize) {
  const themeFile = 'examples/material-showcase/src/app/theme.ts';
  const themeSource = readFileSync(themeFile, 'utf8').replaceAll('\r\n', '\n');
  const parsed = ts.createSourceFile(themeFile, themeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(parsed.parseDiagnostics.length, 0);
  const functions = parsed.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'mixHex');
  assert.equal(functions.length, 1);
  const source = functions[0].getText(parsed);
  const compiled = ts.transpileModule(source.replace(/^export /, ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mixHex = new Function(compiled + '\nreturn mixHex;')();
  assert.ok(themeSource.includes('surfaceContainer: mixHex(normalized.surface, normalized.primary, .06)'));
  const witnesses = [];
  for (const profile of ['light', 'dark', 'contrast', 'custom']) {
    const matches = report.results.filter(entry => entry.family === 'card' && entry.profile === profile && entry.viewport.id === 'desktop');
    assert.equal(matches.length, 1); const entry = matches[0];
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const descriptor = entry.inputTrees[side], target = path.resolve(descriptor.file);
      assert.ok(target.startsWith(path.resolve('artifacts/material-parity/current-ancestry-audit') + path.sep));
      const bytes = readFileSync(target); assert.equal(hash(bytes), descriptor.sha256);
      return [side, JSON.parse(bytes)];
    }));
    const root = trees.reference.nodes.find(node => node.attributes?.id === 'card-root');
    const frame = trees.reference.nodes.find(node => node.key === root.parent);
    const rules = root.rules.map(index => trees.reference.rules[index]);
    const mixRule = rules.filter(rule => rule.active && rule.cssText.includes('background: color-mix(in srgb,var(--surface) 94%,var(--primary));'));
    assert.equal(mixRule.length, 1);
    const surface = frame.inline['--surface'].value, primary = frame.inline['--primary'].value;
    assert.match(surface, /^#[0-9a-f]{6}$/); assert.match(primary, /^#[0-9a-f]{6}$/);
    const numerator = [1, 3, 5].map(index => parseInt(surface.slice(index, index + 2), 16) * 94 + parseInt(primary.slice(index, index + 2), 16) * 6);
    const exactMixedChannels = numerator.map(value => value / 100);
    const candidate = trees.astylar.nodes.find(node => node.authored?.id === 'card-root');
    const requested = mixHex(surface, primary, .06);
    for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.equal(candidate[stage].background, requested);
    const input = entry.styleInputs.find(input => input.id === 'card-root');
    assert.equal(input.astylar.background, requested);
    assert.equal(trees.reference.styles[root.style].backgroundColor, input.reference.backgroundColor);
    const loss = inspectFractionalColorLoss(input, 'backgroundColor', normalize);
    assert.equal(loss.disposition, 'difference-suppressed-by-rounding');
    assert.deepEqual(loss.roundedChannels, exactMixedChannels.map(Math.round));
    // Record browser decimal serialization error separately. Never use this
    // arithmetic as an equality tolerance or a canonical classification.
    witnesses.push({ profile, inputTrees: entry.inputTrees, inputSha256: hash(JSON.stringify(input)),
      surface, primary, referenceRule: mixRule[0], exactMix: { numerator, denominator: 100 },
      exactMixedChannels, candidateRequested: requested,
      exactCandidateChannelChange: loss.roundedChannels.map((value, index) => value - exactMixedChannels[index]),
      serializedReferenceChannelError: loss.scaledChannels.map((value, index) => value - exactMixedChannels[index]),
      classification: 'application-plugin-authoring-defect', rendererDefectProven: false });
  }
  return { scope: 'Four authenticated card/root desktop theme witnesses, not complete cascade or raster verification for all owners.',
    source: { file: themeFile, sha256: hash(themeSource), mixHexFunctionSha256: hash(source) }, witnesses };
}

export function collectFractionalColorLoss() {
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const report = JSON.parse(bytes), normalize = bindFractionalColorBaseline();
  const groups = new Map(), cases = new Set();
  let owners = 0, srgbProperties = 0, affected = 0;
  for (const [kind, entries] of [['static', report.results], ['interaction', report.interactions]]) {
    for (const entry of entries) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      assert.ok(!cases.has(caseId)); cases.add(caseId);
      const ids = new Set();
      for (const input of entry.styleInputs ?? []) {
        assert.ok(!ids.has(input.id)); ids.add(input.id); owners++;
        for (const [property, raw] of Object.entries(input.reference ?? {})) {
          if (typeof raw !== 'string' || !raw.startsWith('color(srgb')) continue;
          srgbProperties++;
          const proof = inspectFractionalColorLoss(input, property, normalize);
          if (!proof) continue;
          affected++;
          const identity = { family: entry.family, element: input.id, property, ...proof };
          const key = JSON.stringify(identity);
          if (!groups.has(key)) groups.set(key, { ...identity, observations: [] });
          groups.get(key).observations.push({ case: caseId, inputSha256: hash(JSON.stringify(input)) });
        }
      }
    }
  }
  const findings = [...groups.values()].map(group => ({ ...group, occurrences: group.observations.length }));
  const dispositions = {};
  for (const group of findings) {
    const count = dispositions[group.disposition] ??= { groups: 0, observations: 0 };
    count.groups++; count.observations += group.occurrences;
  }
  return {
    schemaVersion: 1, kind: 'material-fractional-color-normalization-loss', capture, normalization,
    classification: 'parity-harness-defect', owner: 'input audit color normalization',
    scope: 'All captured reference color(srgb ...) scalar properties in the original 2311-case report; not unrecorded properties, full stylesheet resolution or rendered pixels.',
    counts: { cases: cases.size, owners, srgbProperties, affected, groups: findings.length, dispositions },
    findings, rootMixWitnesses: rootMixWitnesses(report, normalize),
    canonicalReportChanged: false, rendererChanged: false, rasterDifferenceProven: false,
    limitation: 'Integer rounding is a lossy comparison step. A suppressed scalar difference does not by itself prove a visible raster defect, its authoring cause, or a renderer defect. Browser serialization may itself round decimal channels; do not equate every numerical difference with unequal authored intent. The four root witnesses corroborate unequal prequantized authoring separately. The original serialized channels are retained; floating-point diagnostic arithmetic is not a substitute for color-space-aware comparison.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectFractionalColorLoss(), file = 'docs/material-fractional-color-loss.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ ...report.counts, reportSha256: hash(output), canonicalReportChanged: false }));
}
