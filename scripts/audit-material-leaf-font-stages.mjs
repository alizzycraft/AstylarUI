import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = nodes => { assert.equal(nodes.length, 1, 'owner must be unique'); return nodes[0]; };
const rid = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
const fontRequest = declarations => ['font', 'font-size', 'all'].some(key => Object.hasOwn(declarations, key));
const targets = { 'badge-label': 'badge', 'card-copy': 'card', 'divider-above': 'divider',
  'divider-below': 'divider', 'stepper-content': 'stepper' };
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];

function ancestry(tree, owner, stop) {
  const result = [], visited = new Set();
  let node = owner;
  while (true) {
    assert.ok(!visited.has(node.key), 'cyclic ancestry'); visited.add(node.key); result.push(node);
    if (stop(node)) return result;
    node = one(tree.nodes.filter(n => n.key === node.parent));
  }
}

export function inspectLeafFontStages(family, input, reference, candidate) {
  assert.equal(targets[input.id], family); assert.ok(family);
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const candidates = reference.nodes.filter(n => rid(n) === input.id);
  // Material retains both step bodies; the capture selects the visible parity
  // target. Preserve the hidden sibling instead of silently accepting duplicate IDs.
  if (family === 'stepper') {
    assert.equal(candidates.length, 2);
    assert.deepEqual(candidates.map(n => reference.styles[n.style].visibility).sort(), ['hidden', 'visible']);
    assert.deepEqual(candidates.map(n => n.ownText).sort(), ['Project details', 'Review changes']);
  } else assert.equal(candidates.length, 1);
  const r = one(candidates.filter(n => reference.styles[n.style].visibility !== 'hidden'));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, family === 'card' ? 'mat-card-content' : 'span');
  assert.equal(a.authored.type, family === 'card' ? 'p' : 'span');
  assert.deepEqual(reference.nodes.filter(n => n.parent === r.key), []);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
  assert.ok(typeof r.ownText === 'string' && r.ownText.length > 0);
  assert.equal(r.ownText, a.authored.textContent);
  assert.equal(input.referenceStructure.text, r.ownText);
  assert.equal(input.astylarStructure.ownText, r.ownText);
  assert.deepEqual(input.referenceStructure.descendantIds, []);
  assert.deepEqual(input.astylarStructure.descendantIds, []);
  const rp = ancestry(reference, r, n => n.key === 'frame');
  const ap = ancestry(candidate, a, n => n.authored?.id === 'page');
  assert.ok(rp.some(n => rid(n) === family + '-root'));
  assert.ok(ap.some(n => n.authored?.id === family + '-root'));
  const rf = rp.at(-1), af = ap.at(-1);
  assert.equal(rf.type, 'main'); assert.equal(af.authored.type, 'main');
  const scale = rf.inline['--scale'].value;
  assert.ok(['1', '0.9', '1.15'].includes(scale));
  const size = `${16 * Number(scale)}px`;
  const referencePath = rp.map(node => {
    assert.equal(fontRequest(node.inline ?? {}), false, 'inline font override');
    const requests = node.rules.map(i => reference.rules[i])
      .filter(rule => rule.active === true && fontRequest(rule.declarations));
    if (node !== rf) assert.equal(requests.length, 0, 'reference inheritance interrupted');
    else {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].declarations['font-size']?.value, 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false);
      assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
    }
    assert.equal(reference.styles[node.style].fontSize, size);
    return { key: node.key, type: node.type, id: rid(node) ?? null, fontSize: size, requests };
  });
  const candidatePath = ap.map(node => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false);
    assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const values = {};
    for (const stage of stages) {
      assert.equal(Object.hasOwn(node[stage], 'font'), false);
      assert.equal(Object.hasOwn(node[stage], 'all'), false);
      if (node === af) assert.equal(node[stage].fontSize, size);
      else assert.equal(Object.hasOwn(node[stage], 'fontSize'), false, 'local font request present');
      values[stage] = node[stage].fontSize ?? '<omitted>';
    }
    return { key: node.key, authored: node.authored, fontSize: values };
  });
  assert.equal(input.reference.fontSize, size);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(Object.hasOwn(input[stage], 'fontSize'), false);
  assert.equal(a.retainedText?.source, 'core-text-registry');
  assert.equal(a.retainedText.style.fontSize, size, 'retained font differs from browser computed font');
  return { referenceCandidates: candidates.map(n => ({ key: n.key, parent: n.parent, text: n.ownText,
      visibility: reference.styles[n.style].visibility })),
    referencePath, candidatePath, text: r.ownText, referenceScale: scale,
    referenceComputedFontSize: size, candidateLocalFontSize: '<omitted>', retainedText: a.retainedText,
    retainedFontSizeMatches: true, classification: 'parity-harness-defect',
    attribution: 'plain-text-local-declaration-versus-retained-inherited-font-size',
    owner: 'Material input audit style measurement stage', wholeElementInputEquivalent: false,
    renderingEquivalent: false, rendererCauseProven: false,
    limitation: 'Only this own-text font-size observation is explained. The original local omission is retained; it is not synthesized into a computed declaration. Different structure, other properties, text raster, layout, and ancestor paint are not cleared.' };
}

export function collectLeafFontStages() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [];
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const target = realpathSync(descriptor.file); assert.ok(target.startsWith(boundary));
    const bytes = readFileSync(target); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key);
    for (const input of entry.styleInputs) {
      if (!Object.hasOwn(targets, input.id)) continue;
      findings.push({ case: key, family: entry.family, element: input.id, profile: entry.profile,
        viewport: entry.viewport, state: entry.state ?? 'static', originalInputSha256: digest(input),
        inputTrees: entry.inputTrees,
        proof: inspectLeafFontStages(entry.family, input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
    }
  }
  const counts = Object.fromEntries(Object.keys(targets).map(id => [id, findings.filter(o => o.element === id).length]));
  assert.equal(seen.size, 2311); assert.equal(findings.length, 220);
  assert.deepEqual(counts, { 'badge-label': 52, 'card-copy': 52, 'divider-above': 24,
    'divider-below': 24, 'stepper-content': 68 });
  return { schemaVersion: 1, kind: 'original-plain-text-font-size-stage-evidence',
    originalCapture: { file, sha256 }, originalCasesScanned: seen.size, observations: findings.length,
    counts, findings, canonicalAttributionChanged: false, rendererChanged: false,
    inputEquivalent: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectLeafFontStages(), file = 'docs/material-leaf-font-stages.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
