import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const value = (object, key) => Object.hasOwn(object ?? {}, key) ? object[key] : '<omitted>';
const relevant = key => ['verticalalign', 'all'].includes(key.replaceAll('-', '').toLowerCase());
const pick = declarations => Object.fromEntries(Object.entries(declarations ?? {}).filter(([key]) => relevant(key)));
const safeStyleAttribute = text => text === undefined || typeof text === 'string' &&
  !/[\\]|\/\*/.test(text) && !/(?:^|;)\s*(?:vertical-align|all)\s*:/i.test(text);
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const scalars = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
const caseId = (kind, e) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
const targetFile = 'docs/material-vertical-align-population.json';

export function inspectVerticalAlignPopulationInput(input, reference, candidate) {
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1);
    assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const refs = reference.nodes.filter(n => n.attributes?.id === input.id || n.attributes?.['data-parity-id'] === input.id);
  const asts = candidate.nodes.filter(n => n.authored?.id === input.id);
  const evidence = { reference: value(input.reference, 'verticalAlign'), candidate: value(input.astylar, 'verticalAlign'),
    mapping: { referenceKeys: refs.map(n => n.key), candidateKeys: asts.map(n => n.key) },
    status: 'unresolved-mapping', classification: 'unresolved',
    owner: 'comparison measurement identity mapping',
    wholeElementInputEquivalent: false, usedAlignmentVerified: false, renderingEquivalent: false,
    rendererCauseProven: false, canonicalAttributionChanged: false };
  if (refs.length !== 1 || asts.length !== 1) return evidence;
  const r = refs[0], a = asts[0];
  assert.equal(input.referenceStructure.schemaVersion, 2);
  assert.equal(input.astylarStructure.schemaVersion, 2);
  assert.equal(Object.keys(input.reference).length, 89);
  assert.equal(r.type, input.referenceStructure.type);
  assert.equal(a.authored.type, input.astylarStructure.type);
  for (const [key, scalar] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], scalar, `reference scalar ${key}`);
  stages.forEach((stage, index) => assert.deepEqual(a[stage], input[scalars[index]], stage));
  const referenceRules = r.rules.map(index => reference.rules[index]);
  assert.ok(referenceRules.every(rule => rule && typeof rule.active === 'boolean' && Array.isArray(rule.conditions)));
  const capturedReferenceRules = referenceRules.filter(rule => rule.active).map(({ selector, declarations }) => ({ selector, declarations }));
  if (Object.keys(r.inline).length) capturedReferenceRules.push({ selector: '<inline>', declarations: r.inline });
  assert.deepEqual(capturedReferenceRules,
    input.referenceAuthored.map(({ selector, declarations }) => ({ selector, declarations })));
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const candidateRules = candidate.rules.filter(rule => rootInitialSelectorCanApply(rule.selector, a.authored) && Object.keys(pick(rule)).length);
  const requestsR = referenceRules.filter(rule => Object.keys(pick(rule.declarations)).length).map(rule => ({
    source: rule.source, selector: rule.selector, active: rule.active, conditions: rule.conditions, declarations: pick(rule.declarations) }));
  const requestsA = candidateRules.map(rule => ({ selector: rule.selector, declarations: pick(rule),
    mediaMinWidth: value(rule, 'mediaMinWidth'), mediaMaxWidth: value(rule, 'mediaMaxWidth') }));
  const scalarRequestsA = input.astylarAuthored.filter(rule => Object.keys(pick(rule.declarations)).length)
    .map(rule => ({ selector: rule.selector, declarations: pick(rule.declarations) }));
  const parentR = reference.nodes.find(n => n.key === r.parent), parentA = candidate.nodes.find(n => n.key === a.parent);
  const context = (node, side) => node ? { key: node.key, parent: node.parent,
    type: side === 'reference' ? node.type : node.authored.type,
    display: value(side === 'reference' ? reference.styles[node.style] : node.resolvedStyle, 'display'),
    position: value(side === 'reference' ? reference.styles[node.style] : node.resolvedStyle, 'position') } : null;
  Object.assign(evidence, {
    mapping: { ...evidence.mapping, referenceIdentity: r.attributes.id === input.id ? 'id' : 'data-parity-id',
      sameElementType: r.type === a.authored.type },
    referenceOwner: { ...context(r, 'reference'), ownText: r.ownText, parentContext: context(parentR, 'reference') },
    candidateOwner: { ...context(a, 'candidate'), ownText: value(a.authored, 'textContent'), parentContext: context(parentA, 'candidate'),
      privatePluginType: String(a.authored.type).includes(':') },
    referenceRequests: requestsR, candidatePossibleRequests: requestsA, candidateScalarRequests: scalarRequestsA,
    referenceInline: pick(r.inline), candidateInline: pick(a.authored.style),
    referenceStyleAttribute: value(r.attributes, 'style'), candidateStyleAttribute: value(a.authored.attributes, 'style'),
    candidateStages: Object.fromEntries(stages.map(stage => [stage, value(a[stage], 'verticalAlign')])),
    retainedText: a.retainedText ? { source: a.retainedText.source, verticalAlign: value(a.retainedText.style, 'verticalAlign') } : null,
    paintedControlTextPresent: a.paintedControlText !== undefined,
    status: 'unresolved-request-semantics', classification: 'unresolved',
    owner: 'Material authoring and CSS alignment applicability review',
  });
  // This is an exclusion test, not a second CSS cascade engine. Unknown selector
  // syntax stays possibly applicable. Inline attributes and resets remain visible.
  const inlineClear = !Object.keys(pick(r.inline)).length && !Object.keys(pick(a.authored.style)).length &&
    safeStyleAttribute(r.attributes.style) && safeStyleAttribute(a.authored.attributes?.style) &&
    !Object.keys(pick(a.authored)).length;
  const stableCandidate = stages.every(stage => value(a[stage], 'verticalAlign') === evidence.candidate && a[stage].all === undefined);
  if (inlineClear && stableCandidate && !requestsR.length && !requestsA.length && !scalarRequestsA.length &&
      evidence.reference === 'baseline' && evidence.candidate === '<omitted>') {
    evidence.status = 'computed-initial-versus-omitted-local-declaration';
    evidence.classification = 'parity-harness-defect';
    evidence.owner = 'input audit computed-default versus local-declaration observation stages';
  } else if (inlineClear && stableCandidate && !requestsR.length && requestsA.length === 1 &&
      evidence.reference === 'baseline' && evidence.candidate === 'middle' &&
      isDeepStrictEqual(requestsA[0].declarations, { verticalAlign: 'middle' }) &&
      requestsA[0].mediaMinWidth === '<omitted>' && requestsA[0].mediaMaxWidth === '<omitted>' &&
      /^(?:\.[\w-]+|#[\w-]+)$/.test(requestsA[0].selector)) {
    assert.deepEqual(scalarRequestsA,
      [{ selector: requestsA[0].selector, declarations: requestsA[0].declarations }]);
    evidence.status = 'candidate-explicit-middle-versus-reference-baseline';
    evidence.classification = 'application-plugin-authoring-defect';
  } else if (inlineClear && stableCandidate && !requestsA.length && !scalarRequestsA.length && requestsR.length &&
      evidence.reference === 'middle' && evidence.candidate === '<omitted>' &&
      requestsR.every(rule => rule.active && !rule.conditions.length &&
        isDeepStrictEqual(rule.declarations, { 'vertical-align': { value: 'middle', important: false } }))) {
    evidence.status = 'reference-explicit-middle-versus-candidate-omission';
    evidence.classification = 'application-plugin-authoring-defect';
  }
  return evidence;
}

export function collectVerticalAlignPopulationHistory(selectors) {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const git = args => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1024 * 1024 }).replaceAll('\r\n', '\n');
  const revisions = git(['log', '--reverse', '--format=%H', '--', file]).trim().split('\n');
  const records = Object.fromEntries(selectors.map(selector => [selector, { selector, transitions: [], currentLines: [] }]));
  const previous = new Map(selectors.map(selector => [selector, { present: false, lines: [] }]));
  for (const revision of revisions) {
    const source = git(['show', `${revision}:${file}`]);
    for (const selector of selectors) {
      const lines = source.split('\n').filter(line => line.includes(`selector: '${selector}',`)).map(line => line.trim());
      const present = lines.some(line => /verticalAlign:\s*'middle'/.test(line));
      const prior = previous.get(selector);
      if (present !== prior.present) records[selector].transitions.push({ revision,
        subject: git(['show', '-s', '--format=%s', revision]).trim(),
        middleBefore: prior.present, middleAfter: present, beforeLines: prior.lines, afterLines: lines });
      previous.set(selector, { present, lines });
    }
  }
  const endpointRevision = revisions.at(-1), endpoint = git(['show', `${endpointRevision}:${file}`]);
  assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), endpoint, 'authoring changed since history endpoint');
  for (const selector of selectors) {
    assert.equal(previous.get(selector).present, true, `current middle request missing: ${selector}`);
    records[selector].currentLines = previous.get(selector).lines;
  }
  return { file, endpointRevision, endpointSourceSha256: hash(endpoint), revisionsScanned: revisions.length,
    requests: Object.values(records), historicalRenderingReplayed: false, concealedCoreCauseProven: false };
}

export function collectVerticalAlignPopulation() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), findings = [], missing = [], groups = new Map(), seen = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const resolved = realpathSync(descriptor.file); assert.ok(resolved.startsWith(boundary));
    const b = readFileSync(resolved); assert.equal(hash(b), descriptor.sha256, descriptor.file); return JSON.parse(b);
  };
  let equal = 0;
  for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) for (const entry of entries) {
    const id = caseId(kind, entry); assert.ok(!seen.has(id)); seen.add(id);
    assert.equal(new Set(entry.styleInputs.map(i => i.id)).size, entry.styleInputs.length);
    const inputs = entry.styleInputs.filter(input => {
      if (!input.reference || !input.astylar) { missing.push({ case: id, element: input.id, originalInput: input }); return false; }
      if (input.reference.verticalAlign === input.astylar.verticalAlign) { equal++; return false; }
      return true;
    });
    if (!inputs.length) continue;
    const reference = tree(entry.inputTrees.reference), candidate = tree(entry.inputTrees.astylar);
    for (const input of inputs) {
      const proof = inspectVerticalAlignPopulationInput(input, reference, candidate);
      const finding = { case: id, family: entry.family, element: input.id, property: 'verticalAlign',
        profile: entry.profile, state: entry.state ?? 'static', viewport: entry.viewport,
        inputTrees: entry.inputTrees, originalInputSha256: digest(input), proof };
      findings.push(finding);
      const key = JSON.stringify([entry.family, input.id, proof.reference, proof.candidate]);
      if (!groups.has(key)) groups.set(key, { family: entry.family, element: input.id, property: 'verticalAlign',
        reference: proof.reference, candidate: proof.candidate, cases: [], statuses: {} });
      const group = groups.get(key); group.cases.push(id); group.statuses[proof.status] = (group.statuses[proof.status] ?? 0) + 1;
    }
  }
  assert.equal(seen.size, 2311); assert.equal(groups.size, 116); assert.equal(findings.length, 6886); assert.equal(missing.length, 8);
  const statusCounts = {};
  for (const { proof } of findings) statusCounts[proof.status] = (statusCounts[proof.status] ?? 0) + 1;
  const selectors = [...new Set(findings.filter(f => f.proof.status === 'candidate-explicit-middle-versus-reference-baseline')
    .map(f => f.proof.candidatePossibleRequests[0].selector))].sort();
  assert.equal(selectors.length, 8);
  return { schemaVersion: 1, kind: 'complete-original-scalar-vertical-align-population',
    originalCapture: { file, sha256: hash(bytes) }, casesScanned: seen.size, groupCount: groups.size,
    sourceFingerprints: ['scripts/audit-material-vertical-align-population.mjs',
      'tests/material-parity/root-initial-style-evidence.mjs', 'tests/material-parity/border-initial-input-evidence.mjs']
      .map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    observations: findings.length, equalScalarObservations: equal, missingScalarObservations: missing,
    explicitCandidateRequestHistory: collectVerticalAlignPopulationHistory(selectors),
    statusCounts, groups: [...groups.values()].sort((a, b) => JSON.stringify([a.family, a.element]).localeCompare(JSON.stringify([b.family, b.element])))
      .map(g => ({ ...g, occurrences: g.cases.length })), findings,
    canonicalAttributionChanged: false, rendererChanged: false, comparisonInputsChanged: false,
    limits: ['This is the full original scalar difference population, including previously reviewed groups; it is not 116 new canonical findings.',
      'Identity mapping is source-bound, but equal IDs or parity IDs do not establish equal layout ownership or whole-element input equivalence.',
      'Computed browser baseline versus omitted candidate local declaration is an observation-stage mismatch, not proof of candidate computed or used alignment.',
      'An explicit middle declaration present on only one side proves unequal local authoring, not whether CSS applies it in the respective formatting contexts.',
      'Candidate rules use conservative possible applicability; no cascade winner is synthesized for ambiguous rules, conditions or inline attributes.',
      'Retained text values and private plugin types are recorded, not accepted as glyph, control paint or plugin-consumer proof.',
      'Missing and ambiguous owners and missing scalar evidence remain explicit; no fallback by visual resemblance is used.',
      'No rendering, fixture, normalizer or canonical classification change is made by this survey.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectVerticalAlignPopulation(), output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(targetFile, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(targetFile, output);
  console.log(JSON.stringify({ file: targetFile, sha256: hash(output), groups: report.groupCount,
    observations: report.observations, statusCounts: report.statusCounts, canonicalAttributionChanged: false }));
}
