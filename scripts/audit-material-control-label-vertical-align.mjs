import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = xs => { assert.equal(xs.length, 1, 'unique label evidence required'); return xs[0]; };
export const controlLabelAlignmentTargets = {
  'checkbox-label': { family: 'checkbox', class: 'checkbox-label', text: 'Include archived' },
  'radio-solo-label': { family: 'radio', class: 'radio-label', text: 'Solo' },
  'radio-team-label': { family: 'radio', class: 'radio-label', text: 'Team' },
  'slide-toggle-label': { family: 'slide-toggle', class: 'switch-label', text: 'Automatic updates' },
};
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const scalars = ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'];
const relevant = d => Object.keys(d ?? {}).some(k => ['verticalalign', 'all'].includes(k.replaceAll('-', '').toLowerCase()));

export function inspectControlLabelAlignment(family, input, reference, candidate) {
  const target = controlLabelAlignmentTargets[input.id]; assert.ok(target); assert.equal(family, target.family);
  for (const tree of [reference, candidate]) {
    assert.equal(tree.schemaVersion, 1); assert.deepEqual(tree.errors, []);
    assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  }
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const r = one(reference.nodes.filter(n => n.attributes?.id === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'span'); assert.equal(a.authored.type, 'span'); assert.equal(a.authored.class, target.class);
  assert.equal(r.ownText, target.text); assert.equal(a.authored.textContent, target.text);
  assert.equal(reference.nodes.filter(n => n.parent === r.key).length, 0);
  assert.equal(candidate.nodes.filter(n => n.parent === a.key).length, 0);
  for (const s of [input.referenceStructure, input.astylarStructure]) {
    assert.equal(s.schemaVersion, 2); assert.equal(s.type, 'span'); assert.equal(s.text, target.text);
    assert.deepEqual(s.descendantIds, []);
  }
  assert.equal(input.astylarStructure.ownText, target.text);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [key, value] of Object.entries(input.reference)) assert.equal(reference.styles[r.style][key], value);
  assert.equal(input.reference.verticalAlign, 'baseline');
  assert.deepEqual(r.inline, {}); assert.equal(r.attributes.style, undefined);
  assert.deepEqual(r.rules, []); assert.deepEqual(input.referenceAuthored, []);
  assert.equal(a.authored.style, undefined); assert.equal(a.authored.attributes?.style, undefined);
  assert.equal(a.authored.verticalAlign, undefined);
  stages.forEach((stage, i) => {
    assert.deepEqual(a[stage], input[scalars[i]]); assert.equal(a[stage].verticalAlign, 'middle');
    assert.equal(a[stage].all, undefined);
  });
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const rule = one(candidate.rules.filter(rule => relevant(rule) && rootInitialSelectorCanApply(rule.selector, a.authored)));
  assert.equal(rule.selector, '.' + target.class); assert.equal(rule.verticalAlign, 'middle');
  assert.equal(rule.all, undefined); assert.equal(rule.mediaMinWidth, undefined); assert.equal(rule.mediaMaxWidth, undefined);
  const authored = one(input.astylarAuthored.filter(rule => relevant(rule.declarations)));
  assert.equal(authored.selector, rule.selector);
  const { selector, ...declarations } = rule; assert.deepEqual(authored.declarations, declarations);
  assert.equal(a.retainedText?.source, 'core-text-registry');
  assert.equal(a.retainedText.style.verticalAlign, 'middle');
  assert.equal(a.paintedControlText, undefined);
  const parentR = one(reference.nodes.filter(n => n.key === r.parent));
  const parentA = one(candidate.nodes.filter(n => n.key === a.parent));
  return { property: 'verticalAlign', referenceOwner: { key: r.key, parent: r.parent, type: r.type,
    text: r.ownText, computed: 'baseline', localRules: [], inline: {} },
    candidateOwner: { key: a.key, parent: a.parent, authored: a.authored }, request: rule,
    candidateStages: Object.fromEntries(stages.map(stage => [stage, 'middle'])), retainedText: 'middle',
    referenceParent: { key: parentR.key, type: parentR.type, display: reference.styles[parentR.style].display },
    candidateParent: { key: parentA.key, authored: parentA.authored, display: parentA.resolvedStyle.display },
    classification: 'application-plugin-authoring-defect', attribution: 'control-label-vertical-align-substitution',
    owner: 'Material control label authoring and core inline/text-layout contract',
    firstDivergence: 'explicit candidate middle request versus reference baseline without a local declaration',
    inputEquivalent: false, wholeElementInputEquivalent: false, rendererCauseProven: false,
    renderingEquivalent: false, usedAlignmentVerified: false, currentGlyphPaintVerified: false };
}

export function collectControlLabelAlignmentHistory() {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const revision = '354084ea1f1a6abb3e010222062e3cea9f945b61';
  const get = rev => execFileSync('git', ['show', `${rev}:${file}`], { encoding: 'utf8', maxBuffer: 1024 * 1024 }).replaceAll('\r\n', '\n');
  const before = get(revision + '^'), after = get(revision);
  const subject = execFileSync('git', ['show', '-s', '--format=%s', revision], { encoding: 'utf8' }).trim();
  assert.equal(subject, 'fix(example): center Material control labels');
  const changes = [...new Set(Object.values(controlLabelAlignmentTargets).map(t => '.' + t.class))].map(selector => {
    const find = source => one(source.split('\n').filter(line => line.includes(`selector: '${selector}',`))).trim();
    const prior = find(before), next = find(after);
    assert.equal(prior.includes('verticalAlign'), false);
    assert.equal(next, prior.replace(' },', ", verticalAlign: 'middle' },"));
    return { selector, before: prior, after: next };
  });
  return { revision, file, subject, beforeSha256: hash(before), afterSha256: hash(after), changes,
    historicalRenderingReplayed: false, concealedCoreCauseProven: false };
}

export function collectControlLabelAlignment() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), findings = [], seen = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = d => { const p = realpathSync(d.file); assert.ok(p.startsWith(boundary));
    const b = readFileSync(p); assert.equal(hash(b), d.sha256); return JSON.parse(b); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId);
    const inputs = e.styleInputs.filter(i => Object.hasOwn(controlLabelAlignmentTargets, i.id));
    if (!inputs.length) continue;
    assert.equal(new Set(inputs.map(i => i.id)).size, inputs.length);
    const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    for (const input of inputs) findings.push({ case: caseId, family: e.family, element: input.id,
      profile: e.profile, state: e.state ?? 'static', viewport: e.viewport, inputTrees: e.inputTrees,
      originalInputSha256: digest(input), proof: inspectControlLabelAlignment(e.family, input, r, a) });
  }
  const counts = Object.fromEntries(Object.keys(controlLabelAlignmentTargets).map(id => [id, findings.filter(f => f.element === id).length]));
  assert.equal(seen.size, 2311); assert.equal(findings.length, 272);
  assert.deepEqual(Object.values(counts), [68, 68, 68, 68]);
  return { schemaVersion: 1, kind: 'original-control-label-vertical-align-substitution',
    originalCapture: { file, sha256: hash(bytes) }, originalCasesScanned: seen.size, observations: findings.length,
    counts, history: collectControlLabelAlignmentHistory(), findings,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'This proves unequal local authoring and its historical introduction, not the used alignment, current glyph placement or a concealed renderer cause. The reference and candidate have different parent composition; equivalent-input core reduction remains required.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectControlLabelAlignment(), file = 'docs/material-control-label-vertical-align.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
