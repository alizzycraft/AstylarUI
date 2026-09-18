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
const affects = value => Object.keys(value ?? {}).some(k => /^(font|font-?size|all|animation.*|transition.*)$/i.test(k));
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];

export function inspectExpansionTitleInput(input, reference, candidate) {
  assert.equal(input.id, 'expansion-title');
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  for (const tree of [reference, candidate]) assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  const r = one(reference.nodes.filter(n => rid(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'mat-panel-title'); assert.equal(a.authored.type, 'span'); assert.equal(a.authored.class, 'expansion-title');
  assert.equal(r.ownText, 'Advanced settings'); assert.equal(a.authored.textContent, r.ownText);
  assert.deepEqual(reference.nodes.filter(n => n.parent === r.key), []);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === a.key), []);
  const pathTo = (tree, node, stop) => {
    const nodes = [], seen = new Set();
    for (;;) {
      assert.ok(!seen.has(node.key), 'cyclic ancestry'); seen.add(node.key); nodes.push(node);
      if (stop(node)) return nodes;
      node = one(tree.nodes.filter(n => n.key === node.parent));
    }
  };
  const rp = pathTo(reference, r, n => n.key === 'frame'), ap = pathTo(candidate, a, n => n.authored?.id === 'page');
  assert.deepEqual(rp.map(n => n.type), ['mat-panel-title', 'span', 'mat-expansion-panel-header', 'mat-expansion-panel', 'section', 'main']);
  assert.deepEqual(ap.map(n => n.authored.id), ['expansion-title', 'expansion-primary', 'expansion-shell', 'expansion-root', 'page']);
  assert.equal(rid(rp[3]), 'expansion-primary'); assert.equal(rid(rp[4]), 'expansion-root');
  assert.deepEqual(ap.map(n => n.authored.type), ['span', 'div', 'article', 'section', 'main']);
  const scale = rp.at(-1).inline['--scale']?.value; assert.ok(['1', '0.9', '1.15'].includes(scale));
  const pageSize = `${16 * Number(scale)}px`, compact = scale === '0.9';
  const referencePath = rp.map((node, index) => {
    assert.equal(affects(node.inline), false);
    const requests = node.rules.map(i => reference.rules[i]).filter(rule => rule.active === true &&
      Object.keys(rule.declarations).some(k => ['font', 'font-size', 'all'].includes(k)));
    if (index === 2 || index === 5) {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].declarations['font-size']?.value, index === 2
        ? 'var(--mat-expansion-header-text-size, var(--mat-sys-title-medium-size))' : 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false); assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
      if (index === 2) { assert.equal(requests[0].selector, '.mat-expansion-panel-header'); assert.deepEqual(requests[0].conditions, []); }
    } else assert.equal(requests.length, 0);
    const size = index <= 2 ? '16px' : pageSize;
    assert.equal(reference.styles[node.style].fontSize, size);
    return { key: node.key, parent: node.parent, type: node.type, fontSize: size, requests };
  });
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const sizeRules = candidate.rules.filter(affects);
  const candidatePath = ap.map((node, index) => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false); assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const requests = sizeRules.filter(rule => {
      if (['.material-table th', '.material-table td'].includes(rule.selector)) return false; // every selected node is non-cell
      return selectorCanApply(rule.selector, node.authored);
    });
    const size = index === 4 ? pageSize : compact && index === 0 ? '16px' : undefined;
    if (size) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, index === 4 ? '#page' : '.expansion-title');
      assert.equal(requests[0].fontSize, size);
      assert.ok(Object.keys(requests[0]).every(k => !/^(font|all|animation.*|transition.*|media.*)$/i.test(k)));
    } else assert.equal(requests.length, 0);
    const values = {};
    for (const stage of stages) {
      assert.equal(node[stage].fontSize, size); assert.equal(Object.hasOwn(node[stage], 'font'), false); assert.equal(Object.hasOwn(node[stage], 'all'), false);
      values[stage] = node[stage].fontSize ?? '<omitted>';
    }
    return { key: node.key, parent: node.parent, authored: node.authored, fontSize: values, requests };
  });
  assert.equal(input.reference.fontSize, '16px');
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(input[stage].fontSize, compact ? '16px' : undefined);
  assert.equal(a.retainedText?.source, 'core-text-registry');
  const retainedSize = compact ? '16px' : pageSize;
  assert.equal(a.retainedText.style.fontSize, retainedSize);
  return { referencePath, candidatePath, referencePageScale: scale, referenceComputedFontSize: '16px',
    candidateLocalFontSize: compact ? '16px' : '<omitted>', retainedText: a.retainedText,
    retainedFontSizeMatches: retainedSize === '16px',
    classification: 'application-plugin-authoring-defect',
    attribution: compact ? 'compact-title-override-replaces-component-inheritance' : 'component-header-font-token-omitted',
    owner: 'Material expansion header font token and inheritance scope',
    sameInheritanceScope: false, inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false,
    limitation: 'Component header font-size input is absent from the replacement header. Compact adds the size only on the title. Matching retained title sizes in default or compact profiles do not establish the same inheritance scope, wrapper layout, font-relative geometry or raster. Custom retains the page 18.4px instead of the component 16px. This is not a core failure under equal inputs.' };
}

export function collectExpansionTitleInputs() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => { const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key); if (entry.family !== 'expansion') continue;
    const input = one(entry.styleInputs.filter(i => i.id === 'expansion-title'));
    findings.push({ case: key, family: entry.family, element: input.id, state: entry.state ?? 'static', profile: entry.profile,
      viewport: entry.viewport, inputTrees: entry.inputTrees, originalInputSha256: hash(JSON.stringify(input)),
      proof: inspectExpansionTitleInput(input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 68);
  const counts = { localOmission: findings.filter(f => f.proof.candidateLocalFontSize === '<omitted>').length,
    compactLocalOverride: findings.filter(f => f.proof.candidateLocalFontSize === '16px').length,
    retainedSizeMatches: findings.filter(f => f.proof.retainedFontSizeMatches).length,
    retainedSizeDiffers: findings.filter(f => !f.proof.retainedFontSizeMatches).length };
  assert.deepEqual(counts, { localOmission: 51, compactLocalOverride: 17, retainedSizeMatches: 51, retainedSizeDiffers: 17 });
  const sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
  const source = readFileSync(sourceFile, 'utf8').replaceAll('\r\n', '\n');
  const revision = execFileSync('git', ['rev-parse', '25e1893'], { encoding: 'utf8' }).trim();
  const before = execFileSync('git', ['show', `${revision}^:${sourceFile}`], { encoding: 'utf8' });
  const after = execFileSync('git', ['show', `${revision}:${sourceFile}`], { encoding: 'utf8' });
  const excerpt = source => source.split(/\r?\n/).flatMap((text, index) => text.includes("selector: '.expansion-title'") ? [{ line: index + 1, text: text.trim() }] : []);
  assert.ok(excerpt(before).every(r => !r.text.includes('fontSize')));
  const added = one(excerpt(after).filter(r => r.text.includes('fontSize')));
  assert.match(added.text, /theme.density <= -5/); assert.match(added.text, /fontSize: '16px'/);
  assert.match(added.text, /transform: 'translate\(0, -0\.5px\)'/);
  const currentOverride = one(excerpt(source).filter(r => r.text.includes('fontSize')));
  assert.match(currentOverride.text, /family === 'expansion' && theme.density <= -5/);
  assert.match(currentOverride.text, /fontSize: '16px'/);
  assert.match(currentOverride.text, /padding: '0'/); assert.doesNotMatch(currentOverride.text, /transform:/);
  return { schemaVersion: 1, kind: 'original-expansion-title-component-font-inputs', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, observations: findings.length, counts, findings,
    history: { sourceFile, currentSourceSha256: hash(source), current: excerpt(source), revision,
      beforeSourceSha256: hash(before), afterSourceSha256: hash(after), before: excerpt(before), after: excerpt(after),
      limitation: 'Records the compact-only title override introduction, not developer intent, the whole commit quality, or a new renderer diagnosis. Existing expansion source findings and retained-typography evidence remain independent.' },
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectExpansionTitleInputs(), file = 'docs/material-expansion-title-inputs.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
