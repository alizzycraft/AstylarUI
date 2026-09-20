import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectButtonPaintAllStates } from './audit-material-button-paint-all-states.mjs';
import { bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = (values, message) => { assert.equal(values.length, 1, message); return values[0]; };
const sourceFile = 'docs/material-button-paint-all-states.json';
const sourceSha256 = 'd73d512b70e0e4924c09d0c27ffce9469e087feb4a21314c19be26b235e6d5b9';

export function inspectDisabledButtonInk(proof, reference) {
  assert.equal(proof.element, 'button-disabled');
  assert.equal(proof.classification, 'inactive-control-retained-for-review');
  assert.equal(proof.candidate.authored.disabled, true);
  assert.equal(proof.candidate.authored.id, proof.element);
  assert.equal(proof.candidate.authored.style, undefined);
  assert.equal(proof.candidate.descendantCount, 0);
  const owner = one(reference.nodes.filter(node => node.attributes?.id === proof.element), 'unique disabled host');
  assert.equal(owner.key, proof.reference.key);
  assert.equal(owner.type, 'button');
  assert.equal(owner.attributes.disabled, 'true');
  assert.equal(Object.keys(owner.inline).length, 0);
  const activeRules = owner.rules.map(index => reference.rules[index]).filter(rule => rule.active);
  assert.ok(activeRules.every(rule => !rule.declarations.all), 'all reset requires separate review');
  const motionRules = activeRules.filter(rule => Object.keys(rule.declarations).some(key => /^(animation|transition)/.test(key)));
  for (const motion of motionRules) {
    assert.deepEqual(motion.conditions, []);
    if (Object.keys(motion.declarations).some(key => key.startsWith('transition')))
      assert.ok(['none', 'box-shadow'].includes(motion.declarations['transition-property']?.value), 'motion may target foreground');
    if (Object.keys(motion.declarations).some(key => key.startsWith('animation')))
      assert.equal(motion.declarations['animation-name']?.value, 'none', 'named animation requires review');
  }
  const rule = one(activeRules.filter(rule => rule.declarations.color || rule.declarations.all), 'unique disabled ink declaration');
  assert.equal(rule.selector, '.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled');
  assert.deepEqual(rule.conditions, []);
  assert.equal(rule.declarations.color.important, false);
  assert.equal(rule.declarations.color.value,
    'var(--mat-button-filled-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))');
  const style = reference.styles[owner.style];
  assert.equal(style.opacity, '1');
  assert.match(style.color, /^color\(srgb [\d.]+ [\d.]+ [\d.]+ \/ 0\.38\)$/);
  const candidateRules = proof.candidate.authoredRules.filter(rule =>
    Object.keys(rule.declarations).some(key => /^(color$|all$|animation|transition)/.test(key)));
  assert.deepEqual(candidateRules.map(rule => rule.selector), ['.material-button', '#button-disabled']);
  assert.ok(candidateRules.every(rule => Object.keys(rule.declarations).every(key => !/^(all$|animation|transition)/.test(key))),
    'candidate reset or motion requires separate review');
  const candidateRule = candidateRules[1], color = candidateRule.declarations.color;
  assert.match(color, /^#[0-9a-f]{6}$/i);
  for (const stage of ['normal', 'interaction', 'effective']) {
    assert.equal(proof.candidate[stage].color, color);
    assert.equal(proof.candidate[stage].opacity, '1');
  }
  return { element: proof.element, property: 'color', referenceColor: style.color,
    candidateColor: color, referenceRule: rule, referenceMotionRules: motionRules, candidateRules,
    originalPaintProofSha256: digest(proof), classification: 'application-plugin-authoring-defect',
    attribution: 'disabled-button-ink-alpha-replaced-by-opaque-color',
    owner: 'showcase disabled button foreground authoring',
    inputEquivalent: false, rendererCauseProven: false, rasterDifferenceProven: false };
}

export function collectDisabledButtonInk() {
  const bytes = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), sourceSha256);
  const source = collectButtonPaintAllStates();
  assert.ok(isDeepStrictEqual(source, JSON.parse(bytes)), 'original source census must replay');
  const selected = source.findings.filter(finding => finding.element === 'button-disabled');
  assert.equal(selected.length, 60);
  const normalize = bindPreciseAuditNormalization(), findings = [], groups = new Map();
  for (const observation of selected) {
    const descriptor = observation.inputTrees.reference, treeBytes = readFileSync(descriptor.file);
    assert.equal(hash(treeBytes), descriptor.sha256);
    const pattern = source.patterns[observation.pattern]; assert.equal(pattern.sha256, digest(pattern.proof));
    const proof = inspectDisabledButtonInk(pattern.proof, JSON.parse(treeBytes));
    const reference = normalize({ color: proof.referenceColor }).color;
    const candidate = normalize({ color: proof.candidateColor }).color;
    assert.notEqual(reference, candidate);
    findings.push({ ...observation, reference, candidate, proof });
    const key = JSON.stringify([observation.profile, reference, candidate]);
    if (!groups.has(key)) groups.set(key, { profile: observation.profile, reference, candidate, cases: [] });
    groups.get(key).cases.push(observation.case);
  }
  assert.equal(groups.size, 4);
  for (const group of groups.values()) assert.equal(group.cases.length, 15);
  return { schemaVersion: 1, kind: 'disabled-button-ink-authoring-review',
    source: { file: sourceFile, sha256: sourceSha256 }, sourceFreshlyReplayed: true,
    groups: [...groups.values()], observations: findings.length, findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false,
    limitation: 'Host foreground authoring only. Token fallback origin, text descendants, compositing and raster equivalence remain separate obligations. No core alpha defect is inferred.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectDisabledButtonInk(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-disabled-button-ink.json';
  if (process.argv[2] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ groups: report.groups.length, observations: report.observations, sha256: hash(output) }));
}
