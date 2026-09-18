import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectedButtonInputs } from '../tests/material-parity/button-pill-radius-evidence.mjs';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';
import { collectRangeFontReset } from './audit-material-range-font-reset.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const relevant = d => Object.keys(d ?? {}).some(k => ['font', 'fontstyle', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const selected = e => [...selectedButtonInputs(e), ...e.styleInputs.filter(i =>
  e.family === 'slider' && ['slider-start', 'slider-primary'].includes(i.id))];
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const scalars = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];

export function inspectControlFontStyleReset(input, reference, candidate) {
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const r = one(reference.nodes.filter(n => (n.attributes?.['data-parity-id'] ?? n.attributes?.id) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.ok(['button', 'input'].includes(r.type)); assert.equal(a.authored.type, r.type);
  assert.equal(input.referenceStructure.schemaVersion, 2); assert.equal(input.astylarStructure.schemaVersion, 2);
  assert.equal(input.referenceStructure.type, r.type); assert.equal(input.astylarStructure.type, a.authored.type);
  const range = r.type === 'input';
  if (range) {
    assert.equal(r.attributes.type, 'range'); assert.equal(a.authored.inputType, 'range');
    assert.equal(a.authored.class, 'range-layer');
  } else assert.ok(a.authored.class.split(/\s+/).includes('material-button'));
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [k, v] of Object.entries(input.reference)) assert.equal(reference.styles[r.style][k], v);
  stages.forEach((s, i) => assert.deepEqual(a[s], input[scalars[i]]));
  assert.equal(input.reference.fontStyle, 'normal');
  scalars.forEach(s => assert.equal(input[s].fontStyle, undefined));
  assert.equal(relevant(r.inline), false);
  assert.equal(/(?:^|;)\s*(?:font|font-style|all)\s*:/i.test(r.attributes?.style ?? ''), false);
  const requests = r.rules.map(i => reference.rules[i]).filter(rule => rule.active && relevant(rule.declarations));
  const reset = one(requests);
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
  const candidateRelevantRules = candidate.rules.filter(relevant);
  const candidatePath = [], seen = new Set();
  for (let n = a; ; n = one(candidate.nodes.filter(v => v.key === n.parent))) {
    assert.ok(!seen.has(n.key)); seen.add(n.key);
    assert.equal(Object.hasOwn(n.authored, 'style'), false);
    assert.equal(Object.hasOwn(n.authored.attributes ?? {}, 'style'), false);
    assert.equal(Object.hasOwn(n.authored, 'fontStyle'), false);
    assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
    const possible = candidateRelevantRules.filter(rule => rootInitialSelectorCanApply(rule.selector, n.authored));
    assert.deepEqual(possible, [], 'candidate reset or inherited font-style request requires separate review');
    for (const s of stages) assert.equal(relevant(n[s]), false);
    candidatePath.push({ key: n.key, parent: n.parent, authored: n.authored,
      localFontStyle: Object.fromEntries(stages.map(s => [s, n[s].fontStyle ?? '<omitted>'])), possibleRequests: possible });
    if (n.authored.id === 'page') { assert.equal(n.authored.type, 'main'); break; }
  }
  assert.equal(input.astylarAuthored.filter(rule => relevant(rule.declarations)).length, 0);
  let observedTextStage;
  if (range) {
    assert.equal(a.retainedText, undefined); assert.equal(a.paintedControlText, undefined);
    observedTextStage = { kind: 'range-input-without-captured-text-owner', glyphComparisonApplicable: false };
  } else {
    assert.equal(a.retainedText, undefined);
    assert.equal(a.paintedControlText?.source, 'core-control-texture');
    assert.equal(a.paintedControlText.style.fontStyle, 'normal');
    assert.equal(a.paintedControlText.text, input.referenceStructure.text);
    assert.equal(a.paintedControlText.text, input.astylarStructure.ownText);
    observedTextStage = { kind: 'core-control-texture', text: a.paintedControlText.text,
      fontStyle: a.paintedControlText.style.fontStyle, matchesCapturedReferenceScalar: true };
  }
  return { property: 'fontStyle', referenceOwner: { key: r.key, parent: r.parent, type: r.type },
    candidateOwner: { key: a.key, parent: a.parent, authored: a.authored }, referenceReset: reset,
    referenceParent: { key: parent.key, type: parent.type, fontStyle: reference.styles[parent.style].fontStyle },
    translatedReset, candidatePath, candidateRelevantRules, referenceComputed: 'normal',
    candidateLocalDeclaration: '<omitted>', observedTextStage,
    classification: 'application-plugin-authoring-defect', attribution: 'control-font-style-inheritance-reset-omission',
    owner: 'Material shared control font reset translation',
    firstDivergence: 'reference font-style:inherit request is omitted by the family-only candidate reset',
    inputEquivalent: false, wholeElementInputEquivalent: false, rendererCauseProven: false,
    candidateComputedVerified: false, renderingEquivalent: false, nonNormalAncestorBehaviorVerified: false,
    limitation: 'This proves an omitted authored inheritance request, not a visible normal-versus-italic mismatch or a core inheritance defect. Captured button textures already report normal; range inputs have no captured text owner. Behavior under italic/oblique ancestors and all other shorthand-reset properties remain separate obligations.' };
}

export function collectControlFontStyleReset() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), findings = [], seen = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = d => { const p = realpathSync(d.file); assert.ok(p.startsWith(boundary));
    const b = readFileSync(p); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const id = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(id)); seen.add(id);
    const inputs = selected(e); if (!inputs.length) continue;
    assert.equal(new Set(inputs.map(i => i.id)).size, inputs.length);
    const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    for (const input of inputs) findings.push({ case: id, family: e.family, element: input.id,
      profile: e.profile, state: e.state ?? 'static', viewport: e.viewport, inputTrees: e.inputTrees,
      originalInputSha256: digest(input), proof: inspectControlFontStyleReset(input, r, a) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 756);
  const counts = { buttonTexture: findings.filter(f => f.proof.observedTextStage.kind === 'core-control-texture').length,
    rangeWithoutTextOwner: findings.filter(f => f.proof.observedTextStage.kind === 'range-input-without-captured-text-owner').length };
  assert.deepEqual(counts, { buttonTexture: 600, rangeWithoutTextOwner: 156 });
  // Reuse the independently replayed historical reset provenance, not a new
  // speculative explanation of why the author changed the shared reset.
  const history = collectRangeFontReset().history;
  return { schemaVersion: 1, kind: 'original-control-font-style-inheritance-reset-omission',
    originalCapture: { file, sha256: hash(bytes) }, originalCasesScanned: seen.size,
    observations: findings.length, counts, history, findings, canonicalAttributionChanged: false,
    rendererChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectControlFontStyleReset(), file = 'docs/material-control-font-style-reset.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
