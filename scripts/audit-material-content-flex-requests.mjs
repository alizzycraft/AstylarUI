import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = rows => { assert.equal(rows.length, 1); return rows[0]; };
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const scalars = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
const definitions = {
  expansion: { id: 'expansion-title', type: 'mat-panel-title', candidateType: 'span', text: 'Advanced settings',
    referenceSelector: '.mat-expansion-panel-header-title, .mat-expansion-panel-header-description',
    candidateSelector: '.expansion-title', parent: 'expansion-primary', direction: 'row', count: 68,
    properties: { flexGrow: ['flex-grow', '1', '0'], flexBasis: ['flex-basis', '0px', 'auto'] } },
  dialog: { id: 'dialog-copy', type: 'mat-dialog-content', candidateType: 'p', text: 'Save Project Atlas?',
    referenceSelector: '.mat-mdc-dialog-content', candidateSelector: '.dialog-copy',
    parent: 'dialog-panel', direction: 'column', count: 32, properties: { flexGrow: ['flex-grow', '1', '0'] } },
};
const select = style => Object.fromEntries(Object.entries(style).filter(([key]) =>
  /^(display|flex.*|align.*|justify.*|width|height|min.*|max.*|margin.*|padding.*|overflow.*|boxSizing)$/.test(key)));

export function inspectContentFlexRequests(family, input, reference, candidate) {
  const d = definitions[family]; assert.ok(d); assert.equal(input.id, d.id);
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const r = one(reference.nodes.filter(n => (n.attributes.id ?? n.attributes['data-parity-id']) === d.id));
  const a = one(candidate.nodes.filter(n => n.authored.id === d.id));
  assert.equal(r.type, d.type); assert.equal(a.authored.type, d.candidateType);
  assert.equal(r.ownText, d.text); assert.equal(a.authored.textContent, d.text);
  assert.deepEqual(reference.nodes.filter(n => n.parent === r.key), []);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
  assert.equal(input.referenceStructure.type, r.type); assert.equal(input.astylarStructure.type, a.authored.type);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value, key);
  for (const [i, stage] of stages.entries()) assert.deepEqual(a[stage], input[scalars[i]], stage);
  const rp = one(reference.nodes.filter(n => n.key === r.parent));
  const ap = one(candidate.nodes.filter(n => n.key === a.parent));
  assert.equal(ap.authored.id, d.parent);
  assert.equal(reference.styles[rp.style].display, 'flex');
  assert.equal(reference.styles[rp.style].flexDirection, d.direction);
  for (const stage of stages) {
    assert.equal(ap[stage].display, 'flex'); assert.equal(ap[stage].flexDirection, d.direction);
  }
  assert.deepEqual(r.inline, {});
  assert.equal(Object.hasOwn(a.authored, 'style'), false);
  assert.equal(Object.hasOwn(a.authored.attributes ?? {}, 'style'), false);
  const requests = r.rules.map(i => reference.rules[i]);
  const request = one(requests.filter(rule => rule.selector === d.referenceSelector));
  assert.equal(request.active, true); assert.deepEqual(request.conditions, []);
  const ownRequests = input.astylarAuthored;
  assert.ok(ownRequests.some(rule => rule.selector === d.candidateSelector));
  for (const rule of ownRequests) {
    const { selector, ...declarations } = candidate.rules[rule.index];
    assert.equal(selector, rule.selector); assert.deepEqual(declarations, rule.declarations);
    assert.ok(Object.keys(declarations).every(key => !/^(flex|flexGrow|flexBasis|all)$/.test(key)), 'captured candidate flex request changed');
  }
  const properties = Object.entries(d.properties).map(([property, [css, expected, actual]]) => {
    assert.equal(request.declarations[css].value, expected);
    assert.equal(request.declarations[css].important, false);
    assert.equal(input.reference[property], expected);
    for (const stage of stages) assert.equal(a[stage][property], actual);
    return { property, referenceRequest: expected, referenceComputed: expected, candidateLocal: actual,
      classification: 'application-plugin-authoring-defect', attribution: 'component-content-flex-request-omitted' };
  });
  return { properties, referenceOwner: { ...r, style: select(reference.styles[r.style]), requests },
    referenceParent: { ...rp, style: select(reference.styles[rp.style]), requests: rp.rules.map(i => reference.rules[i]) },
    candidateOwner: { authored: a.authored, parent: a.parent, key: a.key, requests: ownRequests,
      stages: Object.fromEntries(stages.map(stage => [stage, select(a[stage])])) },
    candidateParent: { authored: ap.authored, key: ap.key, parent: ap.parent,
      stages: Object.fromEntries(stages.map(stage => [stage, select(ap[stage])])) },
    owner: 'Material comparison content structure and component flex declarations',
    inputEquivalent: false, rendererCauseProven: false, geometryEffectProven: false,
    limitation: 'Captured component flex requests are not reproduced in candidate authoring/local stages. This is not proof of a core flex failure or an explanation of observed dialog height or expansion text positioning. Parent structures and content constraints also differ; matching flex directions alone does not establish equivalent layout.' };
}

export function collectContentFlexRequests() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), findings = [], patterns = [], patternIndexes = new Map();
  const boundary = realpathSync('artifacts/material-parity');
  const load = descriptor => {
    const target = realpathSync(descriptor.file), relative = path.relative(boundary, target);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    const bytes = readFileSync(target); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  let casesScanned = 0;
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    casesScanned++; const d = definitions[e.family]; if (!d) continue;
    const inputs = e.styleInputs.filter(i => i.id === d.id); if (!inputs.length) continue;
    const input = one(inputs), proof = inspectContentFlexRequests(e.family, input, load(e.inputTrees.reference), load(e.inputTrees.astylar));
    const sha256 = digest(proof);
    if (!patternIndexes.has(sha256)) { patternIndexes.set(sha256, patterns.length); patterns.push({ sha256, proof }); }
    findings.push({ case: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
      family: e.family, element: input.id, inputTrees: e.inputTrees, originalInputSha256: digest(input), pattern: patternIndexes.get(sha256) });
  }
  assert.equal(casesScanned, 2311); assert.equal(findings.length, 100);
  assert.equal(new Set(findings.map(f => f.case)).size, findings.length);
  for (const [family, d] of Object.entries(definitions)) assert.equal(findings.filter(f => f.family === family).length, d.count);
  const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
  const source = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  return { schemaVersion: 1, kind: 'component-content-flex-request-audit', originalCapture: { file, sha256: hash(bytes) },
    casesScanned, observations: 100, propertyObservations: 168, patterns, findings,
    groups: Object.entries(definitions).flatMap(([family, d]) => Object.keys(d.properties).map(property =>
      ({ family, element: d.id, property, observations: d.count }))),
    source: { file: sourceFile, sha256: hash(source), witnesses: source.split('\n').flatMap((text, i) =>
      Object.values(definitions).some(d => text.includes(`selector: '${d.candidateSelector}'`)) ? [{ line: i + 1, text }] : []) },
    collector: { file: 'scripts/audit-material-content-flex-requests.mjs', sha256: hash(readFileSync(new URL(import.meta.url), 'utf8').replaceAll('\r\n', '\n')) },
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false,
    limits: ['No canonical row promotion is performed.', 'This review does not establish historical introduction or developer intent.',
      'Closed dialog cases without a content owner are not observations of content flex layout. All original cases are scanned.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectContentFlexRequests(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-content-flex-requests.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(file, output);
  console.log(JSON.stringify({ groups: report.groups.length, observations: report.observations,
    propertyObservations: report.propertyObservations, patterns: report.patterns.length, sha256: hash(output) }));
}
