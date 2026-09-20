import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectButtonPaintAllStates } from './audit-material-button-paint-all-states.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const sourceFile = 'docs/material-button-paint-all-states.json';
const sourceSha256 = 'd73d512b70e0e4924c09d0c27ffce9469e087feb4a21314c19be26b235e6d5b9';
const outputFile = 'docs/material-button-base-alpha.json';
const only = (xs, message) => { assert.equal(xs.length, 1, message); return xs[0]; };

// Inspect inactive base paint separately from active hover/pressed composition.
// This proves unequal paint requests, not a core alpha-compositing failure.
export function inspectButtonBaseAlpha(proof, reference) {
  const id = proof.element;
  assert.ok(['button-secondary', 'button-disabled'].includes(id));
  assert.equal(proof.classification, 'inactive-control-retained-for-review');
  for (const flag of ['inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) assert.equal(proof[flag], false);
  assert.equal(proof.reference.pseudo.opacity, '0');
  assert.equal(proof.reference.hostOpacity, '1');
  assert.equal(proof.candidate.descendantCount, 0);
  assert.equal(proof.candidate.authored.id, id);
  const owner = only(reference.nodes.filter(n => n.attributes?.id === id), 'unique reference owner');
  assert.equal(owner.key, proof.reference.key);
  assert.equal(reference.styles[owner.style].backgroundColor, proof.reference.hostBackground);
  assert.equal(reference.styles[owner.style].opacity, proof.reference.hostOpacity);
  const rules = owner.rules.map(i => reference.rules[i]).filter(r => r.active && r.declarations?.['background-color']);
  const outlined = id === 'button-secondary';
  const selector = outlined ? '.outlined' : '#button-disabled';
  const candidateRule = only(proof.candidate.authoredRules.filter(r => r.selector === selector), 'unique candidate base author');
  const background = candidateRule.declarations.background;
  assert.match(background, /^#[0-9a-f]{6}$/i);
  for (const stage of ['normal', 'interaction', 'effective']) {
    assert.equal(proof.candidate[stage].background, background, 'base author survives each captured resolution stage');
    assert.equal(Number(proof.candidate[stage].opacity), 1);
  }
  const referenceRule = only(rules.filter(r => outlined ? r.selector === '.mdc-button' :
    r.selector === '.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled'), 'unique reference base rule');
  if (outlined) {
    assert.equal(proof.reference.hostBackground, 'rgba(0, 0, 0, 0)');
    assert.equal(referenceRule.declarations['background-color'].value, 'rgba(0, 0, 0, 0)');
  } else {
    assert.equal(proof.candidate.authored.disabled, true);
    assert.match(proof.reference.hostBackground, /^color\(srgb [\d.]+ [\d.]+ [\d.]+ \/ 0\.12\)$/);
    assert.equal(referenceRule.declarations['background-color'].value,
      'var(--mat-button-filled-disabled-container-color, color-mix(in srgb, var(--mat-sys-on-surface) 12%, transparent))');
  }
  return { element: id, referenceBackground: proof.reference.hostBackground,
    referenceAlpha: outlined ? 0 : .12, candidateBackground: background, candidateAlpha: 1,
    referenceRule, candidateRule, originalProofSha256: digest(proof),
    classification: 'application-plugin-authoring-defect',
    attribution: outlined ? 'outlined-base-transparency-replaced-by-opaque-fill' : 'disabled-base-alpha-replaced-by-opaque-fill',
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
}

export function collectButtonBaseAlpha() {
  const bytes = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(bytes), sourceSha256);
  const source = collectButtonPaintAllStates();
  assert.ok(isDeepStrictEqual(source, JSON.parse(bytes)), 'complete source census must freshly replay');
  const selected = source.findings.filter(f => ['button-secondary', 'button-disabled'].includes(f.element));
  assert.equal(selected.length, 120);
  const cache = new Map(), findings = [];
  for (const f of selected) {
    assert.equal(f.family, 'button');
    const descriptor = f.inputTrees.reference;
    if (!cache.has(descriptor.file)) {
      const bytes = readFileSync(descriptor.file);
      cache.set(descriptor.file, { sha256: hash(bytes), tree: JSON.parse(bytes) });
    }
    const loaded = cache.get(descriptor.file); assert.equal(loaded.sha256, descriptor.sha256);
    const pattern = source.patterns[f.pattern]; assert.equal(pattern.sha256, digest(pattern.proof));
    findings.push({ ...f, proof: inspectButtonBaseAlpha(pattern.proof, loaded.tree) });
  }
  const groups = new Map();
  for (const f of findings) {
    const key = JSON.stringify([f.element, f.profile]);
    if (!groups.has(key)) groups.set(key, { element: f.element, profile: f.profile, cases: [] });
    groups.get(key).cases.push(f.case);
  }
  assert.equal(groups.size, 8);
  for (const g of groups.values()) assert.equal(g.cases.length, 15);
  return { schemaVersion: 1, kind: 'inactive-button-base-alpha-authoring-review',
    source: { file: sourceFile, sha256: sourceSha256 }, sourceFreshlyReplayed: true,
    sourceObservations: 600, observations: findings.length, remainingSourceObservations: 480,
    groups: [...groups.values()], findings, canonicalAttributionChanged: false,
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false,
    limitation: 'Source authoring review only. No canonical promotion, raster equivalence, cascade replacement, core alpha correctness or modal-state diagnosis is inferred.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectButtonBaseAlpha(), output = JSON.stringify(report, null, 2) + '\n';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(outputFile, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(outputFile, output);
  console.log(JSON.stringify({ groups: report.groups.length, observations: report.observations, sha256: hash(output) }));
}
