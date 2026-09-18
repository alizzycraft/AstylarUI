import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = nodes => { assert.equal(nodes.length, 1, 'owner must be unique'); return nodes[0]; };
const referenceId = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
const sizeRequest = declarations => ['font', 'font-size', 'all'].some(key => Object.hasOwn(declarations, key));

export function inspectContainerFontInputs(family, input, reference, candidate) {
  assert.ok(['list', 'table'].includes(family)); assert.equal(input.id, family + '-primary');
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2);
  const r = one(reference.nodes.filter(n => referenceId(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, family === 'list' ? 'mat-list' : 'table');
  assert.equal(a.authored.type, family === 'list' ? 'div' : 'table');
  assert.equal(a.authored.class, 'material-' + family);
  const rp = one(reference.nodes.filter(n => n.key === r.parent));
  const rf = one(reference.nodes.filter(n => n.key === rp.parent));
  assert.equal(referenceId(rp), family + '-root'); assert.equal(rp.type, 'section');
  assert.equal(rf.type, 'main'); assert.equal(rf.key, 'frame');
  const ap = one(candidate.nodes.filter(n => n.key === a.parent));
  const af = one(candidate.nodes.filter(n => n.key === ap.parent));
  assert.equal(ap.authored.id, family + '-root'); assert.equal(ap.authored.type, 'section');
  assert.equal(af.authored.id, 'page'); assert.equal(af.authored.type, 'main');
  const referencePath = [r, rp, rf].map(node => {
    const rules = node.rules.map(index => reference.rules[index]);
    assert.equal(sizeRequest(node.inline ?? {}), false, 'inline font request needs separate review');
    const requests = rules.filter(rule => rule.active === true && sizeRequest(rule.declarations));
    if (node !== rf) assert.equal(requests.length, 0, 'reference inheritance interrupted');
    else {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].declarations['font-size']?.value, 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false);
      assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
    }
    return { node: node.key, type: node.type, fontSize: reference.styles[node.style].fontSize,
      inline: node.inline, rules };
  });
  const scale = rf.inline['--scale'].value;
  assert.ok(['1', '0.9', '1.15'].includes(scale));
  const referenceSize = `${16 * Number(scale)}px`;
  assert.ok(referencePath.every(p => p.fontSize === referenceSize));
  const candidateRule = one(candidate.rules.filter(rule => rule.selector === '.material-' + family));
  assert.equal(candidateRule.fontSize, '16px');
  assert.equal(Object.hasOwn(candidateRule, 'font'), false); assert.equal(Object.hasOwn(candidateRule, 'all'), false);
  const pageRule = one(candidate.rules.filter(rule => rule.selector === '#page'));
  assert.equal(pageRule.fontSize, referenceSize);
  const candidatePath = [a, ap, af].map(node => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false);
    assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const stages = Object.fromEntries(['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']
      .map(stage => [stage, node[stage].fontSize ?? '<omitted>']));
    const expected = node === a ? '16px' : node === af ? referenceSize : '<omitted>';
    assert.ok(Object.values(stages).every(value => value === expected));
    return { node: node.key, authored: node.authored, fontSize: stages };
  });
  assert.equal(input.reference.fontSize, referenceSize);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(input[stage].fontSize, '16px');
  return { referencePath, candidatePath, referenceScale: scale, referenceFontSize: referenceSize,
    candidateRule, pageRule, candidateFontSize: '16px', scalarMatches: referenceSize === '16px',
    classification: 'application-plugin-authoring-defect',
    owner: 'Material list/table container fixed-font authoring replaces inherited scale',
    inputEquivalent: false, wholeContainerInputEquivalent: false, rendererCauseProven: false,
    descendantTextVerified: false, renderingEquivalent: false,
    limitation: 'Reference host/section retain frame-scale font inheritance; the candidate host adds an explicit constant 16px declaration despite a correctly scaled page request. The same authoring difference remains at scale 1. This is not proof about descendant glyphs, native/Material defaults generally, or core inheritance failure.' };
}

export function collectContainerFontInputs() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  const sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), observations = [];
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const target = realpathSync(descriptor.file); assert.ok(target.startsWith(boundary));
    const data = readFileSync(target); assert.equal(hash(data), descriptor.sha256); return JSON.parse(data);
  };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key);
    if (!['list', 'table'].includes(entry.family)) continue;
    const input = one(entry.styleInputs.filter(i => i.id === entry.family + '-primary'));
    observations.push({ case: key, family: entry.family, profile: entry.profile, viewport: entry.viewport,
      state: entry.state ?? 'static', originalInputSha256: digest(input), inputTrees: entry.inputTrees,
      proof: inspectContainerFontInputs(entry.family, input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
  }
  assert.equal(seen.size, 2311); assert.equal(observations.length, 104);
  const counts = Object.fromEntries(['list', 'table'].map(family => [family, {
    cases: observations.filter(o => o.family === family).length,
    unequalScalars: observations.filter(o => o.family === family && !o.proof.scalarMatches).length,
    matchingScalars: observations.filter(o => o.family === family && o.proof.scalarMatches).length,
  }]));
  for (const count of Object.values(counts)) assert.deepEqual(count, { cases: 52, unequalScalars: 26, matchingScalars: 26 });
  const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
  const source = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  const historical = execFileSync('git', ['show', `2f44011:${sourceFile}`], { encoding: 'utf8' });
  const tableRevision = 'f980edc6826f4cd140c7af18f8afe5963d2447da';
  const beforeTable = execFileSync('git', ['show', `${tableRevision}^:${sourceFile}`], { encoding: 'utf8' });
  const afterTable = execFileSync('git', ['show', `${tableRevision}:${sourceFile}`], { encoding: 'utf8' });
  const ruleAt = (text, family, size) => {
    const pattern = new RegExp("\\{ selector: '\\.material-" + family + "', [^\\r\\n]*fontSize: '" + size + "px'[^\\r\\n]*");
    const match = text.match(pattern); assert.ok(match, `${family} ${size}px rule missing`); return match[0];
  };
  const rules = ['list', 'table'].map(family => {
    return { family, current: ruleAt(source, family, 16), initial: ruleAt(historical, family, family === 'table' ? 14 : 16) };
  });
  return { schemaVersion: 1, kind: 'original-list-table-container-font-authoring',
    originalCapture: { file, sha256 }, originalCasesScanned: seen.size, observations: observations.length,
    counts, findings: observations, currentSource: { file: sourceFile, sha256: hash(source) },
    history: { revision: '2f44011', sourceSha256: hash(historical), rules,
      tableChange: { revision: tableRevision, beforeSourceSha256: hash(beforeTable), afterSourceSha256: hash(afterTable),
        before: ruleAt(beforeTable, 'table', 14), after: ruleAt(afterTable, 'table', 16) },
      limitation: 'The initial list fixes 16px and table fixes 14px. The table later changes to 16px in a commit that also changes core row sizing and text behavior. This records the fixture substitution, not its motivating intent, a claim that the whole commit is a workaround, or a diagnosis of core inheritance.' },
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectContainerFontInputs(), file = 'docs/material-container-font-inputs.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    canonicalAttributionChanged: false, reportSha256: hash(output) }));
}
