import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const families = ['button-toggle', 'checkbox', 'radio', 'slide-toggle'];
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const scalarStages = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
const relevant = key => ['alignself', 'placeself', 'all', 'display', 'flexdirection', 'alignitems', 'width']
  .includes(key.replaceAll('-', '').toLowerCase());
const select = d => Object.fromEntries(Object.entries(d ?? {}).filter(([key]) => relevant(key)));
const one = list => { assert.equal(list.length, 1); return list[0]; };

export function inspectControlSelfAlignment(family, input, reference, candidate) {
  assert.ok(families.includes(family)); assert.equal(input.id, family + '-primary');
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const ids = reference.nodes.filter(n => n.attributes.id === input.id);
  const r = one(ids.length ? ids : reference.nodes.filter(n => n.attributes['data-parity-id'] === input.id));
  const a = one(candidate.nodes.filter(n => n.authored.id === input.id));
  assert.equal(input.referenceStructure.schemaVersion, 2); assert.equal(input.astylarStructure.schemaVersion, 2);
  assert.equal(input.referenceStructure.type, r.type); assert.equal(input.astylarStructure.type, a.authored.type);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.deepEqual(reference.styles[r.style][key], value, key);
  for (const [i, stage] of stages.entries()) assert.deepEqual(a[stage], input[scalarStages[i]], stage);
  const rp = one(reference.nodes.filter(n => n.key === r.parent));
  const ap = one(candidate.nodes.filter(n => n.key === a.parent));
  assert.equal(rp.type, 'section'); assert.equal(ap.authored.type, 'section');
  assert.equal(rp.attributes['data-parity-id'] ?? rp.attributes.id, family + '-root');
  assert.equal(ap.authored.id, family + '-root');
  assert.equal(reference.styles[r.style].alignSelf, 'auto');
  assert.equal(reference.styles[rp.style].display, 'block');
  for (const stage of stages) {
    assert.equal(a[stage].alignSelf, 'flex-start');
    assert.equal(ap[stage].display, 'flex'); assert.equal(ap[stage].flexDirection, 'column');
  }
  const ownRequest = input.astylarAuthored.filter(rule => rule.declarations.alignSelf !== undefined);
  assert.equal(ownRequest.length, 1); assert.equal(ownRequest[0].selector, '#' + input.id);
  assert.equal(ownRequest[0].declarations.alignSelf, 'flex-start');
  const requestRows = (tree, node) => node.rules.map(index => {
    const rule = tree.rules[index]; assert.ok(rule && typeof rule.active === 'boolean');
    return { index, ...rule };
  });
  const referenceNodes = [r, rp].map(n => ({ key: n.key, parent: n.parent, type: n.type,
    attributes: n.attributes, computed: select(reference.styles[n.style]), inline: n.inline,
    requests: requestRows(reference, n).filter(rule => Object.keys(select(rule.declarations)).length) }));
  const candidateNodes = [a, ap].map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
    localStages: Object.fromEntries(stages.map(stage => [stage, select(n[stage])])) }));
  return { referenceNodes, candidateNodes, explicitOwnerRequest: ownRequest[0],
    classification: 'application-plugin-authoring-defect', attribution: 'control-self-alignment-in-replacement-flex-context',
    owner: 'showcase demo-container and control-host authoring',
    justification: 'The candidate explicitly requests flex-start on a child of a column-flex demo container. The reference host computes auto under a block demo container. This is a demonstrably different authored layout context, not evidence of a core align-self failure. Numeric placement, the necessity of the extra request, and the effect of removing it are not established here.',
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false,
    compensationNecessityProven: false, canonicalAttributionChanged: false };
}

export function collectControlSelfAlignment() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const raw = JSON.parse(bytes), findings = [], patterns = [], indexes = new Map();
  const boundary = realpathSync('artifacts/material-parity');
  const load = descriptor => {
    const absolute = realpathSync(descriptor.file), relative = path.relative(boundary, absolute);
    assert.ok(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative));
    const data = readFileSync(absolute); assert.equal(hash(data), descriptor.sha256); return JSON.parse(data);
  };
  let casesScanned = 0;
  for (const [kind, list] of [['static', raw.results], ['interaction', raw.interactions]]) for (const e of list) {
    casesScanned++;
    if (!families.includes(e.family)) continue;
    const input = one(e.styleInputs.filter(i => i.id === e.family + '-primary'));
    const proof = inspectControlSelfAlignment(e.family, input, load(e.inputTrees.reference), load(e.inputTrees.astylar));
    const sha256 = digest(proof);
    if (!indexes.has(sha256)) { indexes.set(sha256, patterns.length); patterns.push({ sha256, proof }); }
    findings.push({ case: `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`,
      family: e.family, element: input.id, property: 'alignSelf', reference: input.reference.alignSelf,
      astylar: input.astylar.alignSelf, inputTrees: e.inputTrees, originalInputSha256: digest(input), pattern: indexes.get(sha256) });
  }
  assert.equal(casesScanned, 2311); assert.equal(findings.length, 272);
  assert.equal(new Set(findings.map(f => f.case)).size, findings.length);
  for (const family of families) assert.equal(findings.filter(f => f.family === family).length, 68);
  const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
  const revision = execFileSync('git', ['rev-parse', '2f440115'], { encoding: 'utf8' }).trim();
  const historical = execFileSync('git', ['show', `${revision}:${sourceFile}`], { encoding: 'utf8', maxBuffer: 1024 * 1024 }).replaceAll('\r\n', '\n');
  const current = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  const witnesses = text => families.map(family => {
    const lines = text.split('\n').flatMap((text, i) => text.includes(`selector: '#${family}-primary',`)
      ? [{ line: i + 1, text }] : []);
    const found = one(lines); assert.ok(found.text.includes("alignSelf: 'flex-start'")); return { family, ...found };
  });
  return { schemaVersion: 1, kind: 'control-host-self-alignment-input-audit',
    originalCapture: { file, sha256: hash(bytes) }, casesScanned, observations: findings.length,
    groups: families.map(family => ({ family, element: family + '-primary', property: 'alignSelf',
      reference: 'auto', astylar: 'flex-start', observations: 68 })), patterns, findings,
    history: { revision, file: sourceFile, historicalSha256: hash(historical), currentSha256: hash(current),
      historicalWitnesses: witnesses(historical), currentWitnesses: witnesses(current),
      claim: 'All four requests already exist in the initial Material-showcase commit. This is not evidence that a later parity fix introduced them or proof of author intent.' },
    source: { file: 'scripts/audit-material-control-self-alignment.mjs',
      sha256: hash(readFileSync(new URL(import.meta.url), 'utf8').replaceAll('\r\n', '\n')) },
    canonicalAttributionChanged: false, inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false,
    limits: ['No canonical row join or promotion is performed by this source survey.',
      'Local captured stages remain distinct from candidate used geometry and paint.',
      'Changing align-self alone cannot restore the missing block/inline formatting context.',
      'Existing intrinsic-width and layout proofs must be composed with equivalent control content before attributing renderer symptoms.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = collectControlSelfAlignment(), output = JSON.stringify(report, null, 2) + '\n';
  const target = 'docs/material-control-self-alignment.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(target, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(target, output);
  console.log(JSON.stringify({ groups: report.groups.length, observations: report.observations,
    patterns: report.patterns.length, sha256: hash(output), canonicalAttributionChanged: false }));
}
