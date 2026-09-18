import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const one = rows => { assert.equal(rows.length, 1, 'unique node required'); return rows[0]; };
const rid = n => n.attributes?.['data-parity-id'] ?? n.attributes?.id;
const affectsSize = value => Object.keys(value ?? {}).some(k => ['font', 'fontsize', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];

export function inspectTabPanelInput(input, reference, candidate) {
  assert.equal(input.id, 'tab-panel');
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  for (const tree of [reference, candidate]) assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  const r = one(reference.nodes.filter(n => rid(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'span'); assert.equal(a.authored.type, 'showcase.material:tab-panel');
  assert.equal(a.authored.class, 'tab-panel'); assert.equal(a.authored.role, 'tabpanel');
  assert.ok(['Overview content', 'Activity content'].includes(r.ownText));
  assert.equal(input.referenceStructure.text, r.ownText); assert.equal(input.referenceStructure.type, r.type);
  assert.equal(input.astylarStructure.type, a.authored.type); assert.equal(input.astylarStructure.ownText, '');
  assert.equal(a.authored.textContent, undefined); assert.equal(a.retainedText, undefined); assert.equal(a.paintedControlText, undefined);
  assert.equal(a.authored.ariaLabel, r.ownText);
  assert.deepEqual(reference.nodes.filter(n => n.parent === r.key), []);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
  const ancestry = (tree, start, stop) => {
    const nodes = [], seen = new Set();
    for (let n = start; ; n = one(tree.nodes.filter(x => x.key === n.parent))) {
      assert.ok(!seen.has(n.key), 'cyclic ancestry'); seen.add(n.key); nodes.push(n);
      if (stop(n)) return nodes;
    }
  };
  const rp = ancestry(reference, r, n => n.key === 'frame');
  const ap = ancestry(candidate, a, n => n.authored?.id === 'page');
  assert.deepEqual(rp.map(n => n.type), ['span', 'div', 'mat-tab-body', 'div', 'mat-tab-group', 'section', 'main']);
  assert.equal(rp[2].attributes['aria-hidden'], 'false');
  assert.equal(rid(rp[4]), 'tabs-primary'); assert.equal(rid(rp[5]), 'tabs-root');
  assert.deepEqual(ap.map(n => n.authored.id), ['tab-panel', 'tabs-primary', 'tabs-root', 'page']);
  const scale = rp.at(-1).inline['--scale']?.value;
  assert.ok(['1', '0.9', '1.15'].includes(scale));
  const size = 16 * Number(scale), fontSize = `${size}px`;
  const referencePath = rp.map((n, index) => {
    assert.equal(affectsSize(n.inline), false);
    const requests = n.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affectsSize(rule.declarations));
    if (index === 6) {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].declarations['font-size']?.value, 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false); assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
    } else assert.equal(requests.length, 0);
    assert.equal(reference.styles[n.style].fontSize, fontSize);
    return { key: n.key, parent: n.parent, type: n.type, computedFontSize: fontSize, requests };
  });
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const candidatePath = ap.map((n, index) => {
    assert.equal(Object.hasOwn(n.authored, 'style'), false); assert.equal(Object.hasOwn(n.authored.attributes ?? {}, 'style'), false);
    const requests = candidate.rules.filter(rule => affectsSize(rule) || Object.keys(rule).some(k => /^(animation|transition)/i.test(k))).filter(rule => {
      if (['.material-table th', '.material-table td'].includes(rule.selector)) return false;
      return selectorCanApply(rule.selector, n.authored);
    });
    if (index === 3) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, '#page'); assert.equal(requests[0].fontSize, fontSize);
      assert.ok(Object.keys(requests[0]).every(k => !/^(font|all|animation.*|transition.*|media.*)$/i.test(k)));
    } else assert.equal(requests.length, 0);
    const local = {};
    for (const stage of stages) {
      assert.equal(n[stage].fontSize, index === 3 ? fontSize : undefined);
      assert.equal(Object.hasOwn(n[stage], 'font'), false); assert.equal(Object.hasOwn(n[stage], 'all'), false);
      local[stage] = n[stage].fontSize ?? '<omitted>';
    }
    return { key: n.key, parent: n.parent, authored: n.authored, localFontSize: local, requests };
  });
  const data = a.authored.data;
  assert.equal(typeof data.selected, 'boolean'); assert.equal(data.selected, r.ownText === 'Overview content');
  assert.equal(data.phase, 1); assert.equal(data['font-size'], size);
  assert.equal(data['baseline-offset'], scale === '1.15' ? -0.2 : 0);
  assert.ok(/^#[0-9a-f]{6}$/i.test(data['text-color']));
  assert.equal(input.reference.fontSize, fontSize);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].fontSize, undefined);
  return { referencePath, candidatePath, referenceText: r.ownText, referenceComputedFontSize: fontSize,
    candidateLocalFontSize: '<omitted>', privateData: data, numericDataSizeMatches: true,
    classification: 'application-plugin-authoring-defect', attribution: 'tab-panel-private-typography-inputs',
    owner: 'Material tab panel plugin versus core text rendering',
    inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false, perCasePaintVerified: false,
    limitation: 'Reference owns inherited styled text; candidate owns a childless plugin with private text/font/ink/baseline inputs. Equal private size numbers are not CSS text-input equivalence or proof of per-case paint. Existing independent runtime characterization identifies the private consumer; this source replay does not invent retained core text or new glyph measurements.' };
}

export function collectTabPanelInputs() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => { const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key); if (entry.family !== 'tabs') continue;
    const input = one(entry.styleInputs.filter(i => i.id === 'tab-panel'));
    findings.push({ case: key, family: entry.family, element: input.id, state: entry.state ?? 'static', profile: entry.profile,
      viewport: entry.viewport, inputTrees: entry.inputTrees, originalInputSha256: hash(JSON.stringify(input)),
      proof: inspectTabPanelInput(input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 70);
  const counts = { overview: findings.filter(f => f.proof.privateData.selected).length,
    activity: findings.filter(f => !f.proof.privateData.selected).length,
    numericDataSizeMatches: findings.filter(f => f.proof.numericDataSizeMatches).length,
    customBaselineOffsets: findings.filter(f => f.proof.privateData['baseline-offset'] !== 0).length };
  assert.deepEqual(counts, { overview: 52, activity: 18, numericDataSizeMatches: 70, customBaselineOffsets: 17 });
  const sourceFiles = ['examples/material-showcase/src/app/astylar.component.ts',
    'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts'];
  const sources = sourceFiles.map(file => { const source = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    return { file, sha256: hash(source), source }; });
  const plugin = sources[1].source;
  assert.ok(plugin.includes("const authoredFontSize = Number(context.element.data?.['font-size'] ?? 16)"));
  assert.ok(plugin.includes('canvas.font = `${textureFontSize}px Roboto, Arial, sans-serif`'));
  assert.ok(plugin.includes('height / 2 + textureFontSize * .328125 + baselineOffset'));
  const history = ['4e58f58a', '593f81b0'].map(short => {
    const revision = execFileSync('git', ['rev-parse', short], { encoding: 'utf8' }).trim(), file = sourceFiles[1];
    const excerpts = value => value.split(/\r?\n/).flatMap((text, i) => /authoredFontSize|fontSize =|textureFontSize|canvas.font|baselineOffset|authoredBaselineOffset|const baseline =/.test(text)
      ? [{ line: i + 1, text: text.trim() }] : []);
    const before = execFileSync('git', ['show', `${revision}^:${file}`], { encoding: 'utf8' });
    const after = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
    return { revision, file, beforeSha256: hash(before), afterSha256: hash(after), before: excerpts(before), after: excerpts(after) };
  });
  return { schemaVersion: 1, kind: 'original-tab-panel-private-typography-inputs', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, observations: findings.length, counts, findings,
    sources: sources.map(({ source, ...identity }) => identity), history,
    existingRuntimeEvidence: { test: sourceFiles[2], report: 'docs/material-input-audit-investigation.md',
      section: 'Private tab text paint observed independently of CSS (2026-09-12)', rerunByThisCollector: false },
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectTabPanelInputs(), file = 'docs/material-tab-panel-inputs.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
