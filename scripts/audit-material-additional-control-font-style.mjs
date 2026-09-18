import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';
import { collectRangeFontReset } from './audit-material-range-font-reset.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = xs => { assert.equal(xs.length, 1, 'unique original owner required'); return xs[0]; };
export const additionalControlFontStyleTargets = {
  'card-open': { family: 'card', class: 'text-button' },
  'toolbar-action': { family: 'toolbar', class: 'toolbar-action' },
  'dialog-cancel': { family: 'dialog', class: 'dialog-action' },
  'dialog-save': { family: 'dialog', class: 'dialog-action primary' },
};
const relevant = d => Object.keys(d ?? {}).some(k => ['font', 'fontstyle', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const scalars = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];

// These are the four non-.material-button controls excluded by the existing
// 756-observation proof. Inspect their real classes/owners; never rename inputs
// to make them pass the earlier proof's intentionally narrower boundary.
export function inspectAdditionalControlFontStyle(family, input, reference, candidate) {
  const target = additionalControlFontStyleTargets[input.id]; assert.ok(target);
  assert.equal(family, target.family);
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const r = one(reference.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'button'); assert.equal(a.authored.type, 'button'); assert.equal(a.authored.class, target.class);
  for (const s of [input.referenceStructure, input.astylarStructure]) {
    assert.equal(s.schemaVersion, 2); assert.equal(s.type, 'button');
  }
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [k, v] of Object.entries(input.reference)) assert.equal(reference.styles[r.style][k], v);
  assert.equal(input.reference.fontStyle, 'normal');
  stages.forEach((s, i) => { assert.deepEqual(a[s], input[scalars[i]]); assert.equal(a[s].fontStyle, undefined); });
  assert.equal(relevant(r.inline), false);
  assert.equal(/(?:^|;)\s*(?:font|font-style|all)\s*:/i.test(r.attributes?.style ?? ''), false);
  const reset = one(r.rules.map(i => reference.rules[i]).filter(rule => rule.active && relevant(rule.declarations)));
  assert.equal(reset.selector, 'button, input, select'); assert.equal(reset.cssText, 'font: inherit;');
  assert.deepEqual(reset.conditions, []);
  assert.deepEqual(reset.declarations['font-style'], { value: 'inherit', important: false });
  assert.equal(Object.hasOwn(reset.declarations, 'font'), false); assert.equal(Object.hasOwn(reset.declarations, 'all'), false);
  const scalarReset = one(input.referenceAuthored.filter(rule => relevant(rule.declarations)));
  assert.equal(scalarReset.selector, reset.selector); assert.deepEqual(scalarReset.declarations, reset.declarations);
  const parent = one(reference.nodes.filter(n => n.key === r.parent));
  assert.equal(reference.styles[parent.style].fontStyle, 'normal');
  const translatedReset = one(candidate.rules.filter(rule => rule.selector === 'button, input, select'));
  assert.deepEqual(translatedReset, { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' });
  const relevantRules = candidate.rules.filter(relevant), ancestry = [], seen = new Set();
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  for (let n = a; ; n = one(candidate.nodes.filter(v => v.key === n.parent))) {
    assert.ok(!seen.has(n.key)); seen.add(n.key);
    assert.equal(Object.hasOwn(n.authored, 'style'), false);
    assert.equal(Object.hasOwn(n.authored.attributes ?? {}, 'style'), false);
    assert.equal(Object.hasOwn(n.authored, 'fontStyle'), false);
    const requests = relevantRules.filter(rule => rootInitialSelectorCanApply(rule.selector, n.authored));
    assert.deepEqual(requests, [], 'candidate inheritance/reset request needs independent review');
    for (const s of stages) assert.equal(relevant(n[s]), false);
    ancestry.push({ key: n.key, parent: n.parent, authored: n.authored,
      localFontStyle: Object.fromEntries(stages.map(s => [s, '<omitted>'])), possibleRequests: requests });
    if (n.authored.id === 'page') { assert.equal(n.authored.type, 'main'); break; }
  }
  assert.equal(input.astylarAuthored.filter(rule => relevant(rule.declarations)).length, 0);
  assert.equal(a.retainedText, undefined); assert.equal(a.paintedControlText?.source, 'core-control-texture');
  assert.equal(a.paintedControlText.style.fontStyle, 'normal');
  assert.equal(a.paintedControlText.text, input.referenceStructure.text);
  assert.equal(a.paintedControlText.text, input.astylarStructure.ownText);
  return { property: 'fontStyle', referenceOwner: { key: r.key, parent: r.parent, type: r.type },
    candidateOwner: { key: a.key, parent: a.parent, authored: a.authored }, referenceReset: reset,
    referenceParent: { key: parent.key, type: parent.type, fontStyle: reference.styles[parent.style].fontStyle },
    translatedReset, candidatePath: ancestry, referenceComputed: 'normal', candidateLocalDeclaration: '<omitted>',
    observedTextStage: { kind: 'core-control-texture', text: a.paintedControlText.text, fontStyle: 'normal' },
    classification: 'application-plugin-authoring-defect', attribution: 'additional-control-font-style-reset-omission',
    owner: 'Material shared control font reset translation',
    firstDivergence: 'reference font-style:inherit request is absent from candidate family-only reset',
    inputEquivalent: false, wholeElementInputEquivalent: false, rendererCauseProven: false,
    candidateComputedVerified: false, renderingEquivalent: false, nonNormalAncestorBehaviorVerified: false };
}

export function collectAdditionalControlFontStyle() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), findings = [], seen = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = d => { const p = realpathSync(d.file); assert.ok(p.startsWith(boundary));
    const b = readFileSync(p); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    const inputs = e.styleInputs.filter(i => Object.hasOwn(additionalControlFontStyleTargets, i.id));
    if (!inputs.length) continue;
    assert.equal(new Set(inputs.map(i => i.id)).size, inputs.length);
    const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    for (const input of inputs) findings.push({ case: caseId, family: e.family, element: input.id,
      profile: e.profile, state: e.state ?? 'static', viewport: e.viewport, inputTrees: e.inputTrees,
      originalInputSha256: digest(input), proof: inspectAdditionalControlFontStyle(e.family, input, r, a) });
  }
  const counts = Object.fromEntries(Object.keys(additionalControlFontStyleTargets).map(id =>
    [id, findings.filter(f => f.element === id).length]));
  assert.equal(seen.size, 2311); assert.equal(findings.length, 168);
  assert.deepEqual(counts, { 'card-open': 52, 'toolbar-action': 52, 'dialog-cancel': 32, 'dialog-save': 32 });
  return { schemaVersion: 1, kind: 'additional-original-control-font-style-reset-omission',
    originalCapture: { file, sha256: hash(bytes) }, originalCasesScanned: seen.size,
    observations: findings.length, counts, history: collectRangeFontReset().history, findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Four original non-material-button controls have omitted authored inheritance, while their captured textures already report normal. This is not a visible glyph mismatch, proof of core inheritance failure, or a result under italic/oblique ancestors. It does not extend the separately bound 756-observation proposal or change canonical classification.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectAdditionalControlFontStyle(), file = 'docs/material-additional-control-font-style.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
