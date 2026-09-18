import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectLeafFontFamily, leafFontFamilyTargets } from './audit-material-leaf-font-family-stages.mjs';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = xs => { assert.equal(xs.length, 1); return xs[0]; };
const fields = { fontWeight: { css: 'font-weight', computed: '400', retained: 'normal' },
  letterSpacing: { css: 'letter-spacing', computed: 'normal', retained: '0px' } };
const normalization = { module: 'tests/material-parity/input-equivalence-audit.mjs',
  functions: ['canonicalStyle', 'expandQuad', 'expandPair', 'splitCssTerms', 'normalizeValue', 'normalizeColor', 'formatNumber'],
  sha256: '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e' };
const affects = (declarations, property) => Object.keys(declarations ?? {}).some(k =>
  ['font', property.toLowerCase(), 'all'].includes(k.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(k));

export function inspectLeafWeightTracking(family, input, reference, candidate, property, normalize) {
  const config = fields[property]; assert.ok(config, 'unreviewed property');
  // Reuse exact own-text identity, structural paths and retained-text provenance.
  // The existing family result is not taken as proof of weight or tracking.
  const identity = inspectLeafFontFamily(family, input, reference, candidate);
  const rp = identity.referencePath.map(p => one(reference.nodes.filter(n => n.key === p.key)));
  const ap = identity.candidatePath.map(p => one(candidate.nodes.filter(n => n.key === p.key)));
  const referencePath = rp.map(node => {
    assert.equal(affects(node.inline, property), false);
    assert.equal(new RegExp(`(?:^|;)\\s*(?:font|${config.css}|all|animation[^:]*|transition[^:]*)\\s*:`, 'i')
      .test(node.attributes?.style ?? ''), false, 'unreviewed reference inline attribute');
    const requests = node.rules.map(i => reference.rules[i]).filter(r => r.active && affects(r.declarations, property));
    assert.deepEqual(requests, [], 'reference weight/tracking request or motion needs separate attribution');
    assert.equal(reference.styles[node.style][property], config.computed);
    return { key: node.key, parent: node.parent, type: node.type,
      computed: reference.styles[node.style][property], requests };
  });
  const relevant = candidate.rules.filter(r => affects(r, property));
  const candidatePath = ap.map(node => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false);
    assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const requests = relevant.filter(r => {
      if (['.material-table th', '.material-table td'].includes(r.selector) && !['th', 'td'].includes(node.authored.type)) return false;
      return selectorCanApply(r.selector, node.authored);
    });
    assert.deepEqual(requests, [], 'candidate weight/tracking request or unknown selector');
    const stages = {};
    for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
      assert.equal(affects(node[stage], property), false, 'candidate local request present');
      stages[stage] = node[stage][property] ?? '<omitted>';
    }
    return { key: node.key, parent: node.parent, authored: node.authored, stages, requests };
  });
  assert.equal(input.reference[property], config.computed);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(input[stage][property], undefined);
  assert.equal(input.referenceAuthored.filter(r => affects(r.declarations, property)).length, 0);
  assert.equal(input.astylarAuthored.filter(r => affects(r.declarations, property)).length, 0);
  const retained = ap[0].retainedText;
  assert.equal(retained.source, 'core-text-registry'); assert.equal(retained.style[property], config.retained);
  const referenceValue = normalize({ [property]: input.reference[property] })[property];
  const retainedValue = normalize({ [property]: retained.style[property] })[property];
  assert.equal(referenceValue, retainedValue);
  return { property, text: identity.text, referencePath, candidatePath,
    referenceRaw: input.reference[property], candidateLocalRaw: '<omitted>', retainedRaw: retained.style[property],
    normalizedReference: referenceValue, normalizedRetained: retainedValue,
    retainedText: retained, candidateRelevantRules: relevant.map(r => ({ selector: r.selector, sha256: digest(r) })),
    classification: 'parity-harness-defect', attribution: 'own-text-local-versus-retained-weight-tracking-stage',
    owner: 'Material typography scalar observation boundary', retainedScalarMatches: true,
    inputEquivalent: false, wholeElementInputEquivalent: false, rendererCauseProven: false,
    renderingEquivalent: false, physicalFontSelectionVerified: false,
    limitation: 'The candidate local omission is not absence of a text input: retained core-text weight/tracking matches the reference scalar under unchanged production normalization. No authored dependency equivalence beyond the checked path, physical font, glyph spacing/raster, geometry, other property or entire component equivalence follows.' };
}

export function collectLeafWeightTracking() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const normalize = bindOwnerCaretNormalization(readFileSync(normalization.module, 'utf8'), normalization);
  const tree = d => { const file = realpathSync(d.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), d.sha256); return JSON.parse(bytes); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    const inputs = e.styleInputs.filter(i => Object.hasOwn(leafFontFamilyTargets, i.id)); if (!inputs.length) continue;
    const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    for (const input of inputs) for (const property of Object.keys(fields)) findings.push({ case: caseId,
      family: e.family, element: input.id, property, profile: e.profile, state: e.state ?? 'static', viewport: e.viewport,
      inputTrees: e.inputTrees, originalInputSha256: digest(input),
      proof: inspectLeafWeightTracking(e.family, input, r, a, property, normalize) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 304);
  return { schemaVersion: 1, kind: 'original-own-text-weight-tracking-stage-proof', originalCapture: { file, sha256: hash(bytes) },
    originalCasesScanned: seen.size, observations: findings.length,
    counts: Object.fromEntries(Object.keys(leafFontFamilyTargets).map(id => [id, findings.filter(f => f.element === id).length])),
    productionNormalization: normalization, findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectLeafWeightTracking(), file = 'docs/material-leaf-weight-tracking-stages.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
