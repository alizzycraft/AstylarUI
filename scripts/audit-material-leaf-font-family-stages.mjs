import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectLeafFontStages } from './audit-material-leaf-font-stages.mjs';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = xs => { assert.equal(xs.length, 1, 'unique owner required'); return xs[0]; };
const stack = 'Roboto, Arial, sans-serif';
// Stepper content inherits a Material component font token on the reference
// side, not this shared page stack. It requires a separate authoring finding.
export const leafFontFamilyTargets = { 'badge-label': 'badge', 'card-copy': 'card',
  'divider-above': 'divider', 'divider-below': 'divider' };
const affects = value => Object.keys(value ?? {}).some(k =>
  ['font', 'fontfamily', 'all'].includes(k.replaceAll('-', '').toLowerCase()) || /^(transition|animation)/i.test(k));

export function inspectLeafFontFamily(family, input, reference, candidate) {
  assert.ok(Object.hasOwn(leafFontFamilyTargets, input.id));
  assert.equal(leafFontFamilyTargets[input.id], family);
  // Reuse authenticated identity, text, ancestry and retained owner checks, not
  // the font-size result as evidence about a different property.
  const identity = inspectLeafFontStages(family, input, reference, candidate);
  const rp = identity.referencePath.map(n => one(reference.nodes.filter(x => x.key === n.key)));
  const ap = identity.candidatePath.map(n => one(candidate.nodes.filter(x => x.key === n.key)));
  const referencePath = rp.map((node, index) => {
    assert.equal(affects(node.inline), false);
    assert.equal(/(?:^|;)\s*(?:font|font-family|all|animation[^:]*|transition[^:]*)\s*:/i.test(node.attributes?.style ?? ''), false);
    const requests = node.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affects(rule.declarations));
    if (index === rp.length - 1) {
      assert.equal(requests.length, 1); assert.match(requests[0].selector, /^\.frame(?:\[_ngcontent-[\w-]+\])?$/);
      assert.deepEqual(requests[0].declarations['font-family'], { value: stack, important: false });
      assert.deepEqual(Object.keys(requests[0].declarations).filter(k => affects({ [k]: true })), ['font-family']);
    } else assert.equal(requests.length, 0, 'reference family inheritance interrupted or unreviewed motion');
    assert.equal(reference.styles[node.style].fontFamily, stack);
    return { key: node.key, parent: node.parent, type: node.type, computedFontFamily: stack, requests };
  });
  const rules = candidate.rules.filter(affects);
  const candidatePath = ap.map((node, index) => {
    const requests = rules.filter(rule => {
      if (['.material-table th', '.material-table td'].includes(rule.selector) && !['th', 'td'].includes(node.authored.type)) return false;
      return selectorCanApply(rule.selector, node.authored);
    });
    const page = index === ap.length - 1;
    if (page) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, '#page'); assert.equal(requests[0].fontFamily, stack);
      assert.deepEqual(Object.keys(requests[0]).filter(k => affects({ [k]: true })), ['fontFamily']);
    } else assert.equal(requests.length, 0, 'candidate family request or unreviewed selector/motion');
    const values = {};
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      assert.equal(node[stage].fontFamily, page ? stack : undefined);
      assert.deepEqual(Object.keys(node[stage]).filter(k => affects({ [k]: true })), page ? ['fontFamily'] : []);
      values[stage] = node[stage].fontFamily ?? '<omitted>';
    }
    return { key: node.key, parent: node.parent, authored: node.authored, values, requests };
  });
  assert.equal(input.reference.fontFamily, stack);
  assert.deepEqual(input.referenceAuthored.filter(r => affects(r.declarations)).map(r => ({ selector: r.selector, declarations: r.declarations })),
    referencePath[0].requests.map(r => ({ selector: r.selector, declarations: r.declarations })));
  assert.equal(input.astylarAuthored.filter(r => affects(r.declarations)).length, 0);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].fontFamily, undefined);
  assert.equal(ap[0].retainedText.source, 'core-text-registry');
  assert.equal(ap[0].retainedText.style.fontFamily, stack);
  return { property: 'fontFamily', referencePath, candidatePath, text: identity.text,
    referenceComputedFontFamily: stack, candidateLocalFontFamily: '<omitted>', retainedText: ap[0].retainedText,
    candidateRelevantRules: rules.map(rule => ({ selector: rule.selector, sha256: digest(rule) })),
    classification: 'parity-harness-defect', attribution: 'plain-text-local-declaration-versus-retained-inherited-font-family',
    owner: 'Material input audit local declaration versus inherited retained text measurement boundary',
    authoredFamilyInheritanceMatches: true, retainedFontFamilyMatches: true,
    physicalFontSelectionVerified: false, wholeElementInputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false,
    limitation: 'Only the font-family stage discrepancy on these own-text leaves is explained. Both authored page stacks and the candidate retained core-text family match the reference computed stack. No physical font selection, fallback/load status, glyph raster, layout, or other-property equivalence is established; the original local omission remains unchanged.' };
}

export function collectLeafFontFamily() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = d => { const file = realpathSync(d.file); assert.ok(file.startsWith(boundary)); const bytes = readFileSync(file); assert.equal(hash(bytes), d.sha256); return JSON.parse(bytes); };
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${mode}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    const inputs = e.styleInputs.filter(i => Object.hasOwn(leafFontFamilyTargets, i.id)); if (!inputs.length) continue;
    const reference = tree(e.inputTrees.reference), candidate = tree(e.inputTrees.astylar);
    for (const input of inputs) findings.push({ case: caseId, family: e.family, element: input.id, profile: e.profile,
      viewport: e.viewport, state: e.state ?? 'static', originalInputSha256: digest(input), inputTrees: e.inputTrees,
      proof: inspectLeafFontFamily(e.family, input, reference, candidate) });
  }
  const counts = Object.fromEntries(Object.keys(leafFontFamilyTargets).map(id => [id, findings.filter(f => f.element === id).length]));
  assert.equal(seen.size, 2311); assert.equal(findings.length, 152);
  assert.deepEqual(counts, { 'badge-label': 52, 'card-copy': 52, 'divider-above': 24, 'divider-below': 24 });
  return { schemaVersion: 1, kind: 'original-plain-text-font-family-stage-evidence', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, observations: findings.length, counts, findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectLeafFontFamily(), file = 'docs/material-leaf-font-family-stages.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
