import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectVerticalAlignPopulationInput } from './audit-material-vertical-align-population.mjs';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const value = (object, key) => Object.hasOwn(object ?? {}, key) ? object[key] : '<omitted>';
const relevant = key => ['textalign', 'textalignlast', 'direction', 'unicodebidi', 'all']
  .includes(key.replaceAll('-', '').toLowerCase());
const pick = declarations => Object.fromEntries(Object.entries(declarations ?? {}).filter(([key]) =>
  relevant(key) || /^(animation|transition)/.test(key.replaceAll('-', '').toLowerCase())));
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const target = 'docs/material-text-align-ancestry.json';

function ownerPath(tree, key) {
  const byKey = new Map(tree.nodes.map(node => [node.key, node]));
  assert.equal(byKey.size, tree.nodes.length);
  const result = [], seen = new Set();
  while (key !== null) {
    assert.ok(!seen.has(key), 'cyclic owner ancestry'); seen.add(key);
    const node = byKey.get(key); assert.ok(node, 'missing owner ancestor');
    result.push(node); key = node.parent;
  }
  return result;
}

// Reuse the reviewed all-scalar identity check, not its vertical-alignment
// classification. Text alignment inherits, so owner-local omission is never
// promoted to a browser initial value by this collector.
export function inspectTextAlignAncestry(input, reference, candidate, family) {
  const identity = inspectVerticalAlignPopulationInput(input, reference, candidate, family);
  const result = { reference: value(input.reference, 'textAlign'), candidate: value(input.astylar, 'textAlign'),
    identity: { mapping: identity.mapping, generatedIdentity: identity.generatedIdentity },
    status: 'unresolved-owner-mapping', candidateComputedVerified: false,
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false };
  if (identity.status === 'unresolved-alias-scalar-rule-gap') {
    result.status = identity.status; return result;
  }
  if (!identity.referenceOwner || !identity.candidateOwner) return result;
  const rp = ownerPath(reference, identity.referenceOwner.key);
  const cp = ownerPath(candidate, identity.candidateOwner.key);
  const referencePath = rp.map(node => ({ node: node.key, parent: node.parent, type: node.type,
    attributes: node.attributes, computed: Object.fromEntries(['textAlign', 'direction', 'display', 'position']
      .map(key => [key, value(reference.styles[node.style], key)])),
    inline: pick(node.inline), requests: node.rules.map(index => {
      const rule = reference.rules[index]; assert.ok(rule && typeof rule.active === 'boolean');
      return { index, selector: rule.selector, active: rule.active, conditions: rule.conditions,
        declarations: pick(rule.declarations) };
    }).filter(rule => Object.keys(rule.declarations).length) }));
  const candidatePath = cp.map(node => ({ node: node.key, parent: node.parent, authored: node.authored,
    localValues: Object.fromEntries(stages.map(stage => [stage, value(node[stage], 'textAlign')])),
    declarations: Object.fromEntries(stages.map(stage => [stage, pick(node[stage])])),
    inline: pick(node.authored.style), possibleRules: candidate.rules.flatMap((rule, index) => {
      if (!node.authored.type || !rootInitialSelectorCanApply(rule.selector, node.authored)) return [];
      const declarations = pick(rule);
      return Object.keys(declarations).length ? [{ index, selector: rule.selector, declarations,
        mediaMinWidth: value(rule, 'mediaMinWidth'), mediaMaxWidth: value(rule, 'mediaMaxWidth') }] : [];
    }), retainedText: node.retainedText ? { source: node.retainedText.source,
      textAlign: value(node.retainedText.style, 'textAlign') } : null,
    paintedControlTextPresent: node.paintedControlText !== undefined }));
  const hasAlign = declarations => Object.keys(declarations).some(relevant);
  const referenceRequestNodes = referencePath.filter(node => hasAlign(node.inline) ||
    node.requests.some(rule => hasAlign(rule.declarations))).map(node => node.node);
  const candidateRequestNodes = candidatePath.filter(node => hasAlign(node.inline) ||
    Object.values(node.declarations).some(hasAlign) || node.possibleRules.some(rule => hasAlign(rule.declarations)))
    .map(node => node.node);
  return { ...result, status: result.candidate === '<omitted>'
    ? candidateRequestNodes.some(key => key !== cp[0].key)
      ? 'omitted-owner-local-with-ancestor-request' : 'omitted-owner-local-without-captured-ancestor-request'
    : 'explicit-owner-local-versus-browser-computed',
  referencePath, candidatePath, referenceRequestNodes, candidateRequestNodes,
  referenceExternalAncestryCaptured: false, candidateInheritanceResolved: false,
  applicabilityVerified: false, motionActivityVerified: false };
}

export function collectTextAlignAncestry() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), observations = [], missing = [], patterns = [], indexes = new Map();
  const groups = new Map(), seen = new Set(), statuses = {};
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const load = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  let equal = 0;
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
    const id = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(id)); seen.add(id);
    assert.equal(new Set(entry.styleInputs.map(input => input.id)).size, entry.styleInputs.length);
    const inputs = entry.styleInputs.filter(input => {
      if (!input.reference || !input.astylar) { missing.push({ case: id, element: input.id, originalInputSha256: digest(input) }); return false; }
      if (input.reference.textAlign === input.astylar.textAlign) { equal++; return false; }
      return true;
    });
    if (!inputs.length) continue;
    const reference = load(entry.inputTrees.reference), candidate = load(entry.inputTrees.astylar);
    for (const input of inputs) {
      const proof = inspectTextAlignAncestry(input, reference, candidate, entry.family), sha256 = digest(proof);
      if (!indexes.has(sha256)) { indexes.set(sha256, patterns.length); patterns.push({ sha256, proof }); }
      const pattern = indexes.get(sha256);
      observations.push({ case: id, family: entry.family, element: input.id, property: 'textAlign',
        originalInputSha256: digest(input), inputTrees: entry.inputTrees, pattern });
      statuses[proof.status] = (statuses[proof.status] ?? 0) + 1;
      const key = JSON.stringify([entry.family, input.id, proof.reference, proof.candidate]);
      if (!groups.has(key)) groups.set(key, { family: entry.family, element: input.id, property: 'textAlign',
        reference: proof.reference, candidate: proof.candidate, cases: [], statuses: {} });
      const group = groups.get(key); group.cases.push(id); group.statuses[proof.status] = (group.statuses[proof.status] ?? 0) + 1;
    }
  }
  assert.equal(seen.size, 2311); assert.equal(missing.length, 8);
  const sourceFiles = ['scripts/audit-material-text-align-ancestry.mjs', 'scripts/audit-material-vertical-align-population.mjs',
    'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/generated-node-mapping-evidence.mjs',
    'tests/material-parity/input-equivalence-audit.mjs'];
  return { schemaVersion: 1, kind: 'original-text-alignment-owner-ancestry-survey', originalCapture: { file, sha256: hash(bytes) },
    sourceFingerprints: sourceFiles.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    casesScanned: seen.size, observations: observations.length, groupCount: groups.size, equalScalarObservations: equal,
    missingScalarObservations: missing, statusCounts: statuses, groups: [...groups.values()], patterns, findings: observations,
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limits: ['Full original scalar population, including previously reviewed groups; this is not a new canonical classification count.',
      'Inherited text alignment is not inferred from omitted owner-local declarations or ancestor rule presence.',
      'Possible candidate rules over-approximate selectors and retain conditions; no new cascade evaluator or winner is introduced.',
      'Reference captured paths end at the surface or overlay root. External body/html context is not silently inferred.',
      'Motion requests, raw attributes, synthetic roots, retained text and private controls stay distinct from computed/used/raster proof.',
      'Known alias scalar-rule gaps and one-sided tooltip scalar observations remain unresolved.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectTextAlignAncestry(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(target, output);
  console.log(JSON.stringify({ file: target, sha256: hash(output), groups: report.groupCount, observations: report.observations,
    patterns: report.patterns.length, statusCounts: report.statusCounts, canonicalAttributionChanged: false }));
}
