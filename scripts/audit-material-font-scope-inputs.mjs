import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const one = nodes => { assert.equal(nodes.length, 1, 'unique owner required'); return nodes[0]; };
const rid = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];
const affectsSize = value => Object.keys(value ?? {}).some(k => ['font', 'fontsize', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const targets = {
  toolbar: { size: '22px', descendant: 'toolbar-title', type: 'span', token: 'var(--mat-toolbar-title-text-size, var(--mat-sys-title-large-size))' },
  paginator: { size: '12px', descendant: 'paginator-container', type: 'div', token: 'var(--mat-paginator-container-text-size, var(--mat-sys-body-small-size))' },
};

export function inspectFontScopeInputs(family, input, reference, candidate) {
  const target = targets[family]; assert.ok(target); assert.equal(input.id, family + '-primary');
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  for (const tree of [reference, candidate]) assert.equal(new Set(tree.nodes.map(n => n.key)).size, tree.nodes.length);
  const r = one(reference.nodes.filter(n => rid(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'mat-' + family); assert.equal(r.ownText, '');
  assert.equal(a.authored.type, 'div'); assert.equal(a.authored.class, family);
  assert.equal(a.authored.textContent, undefined); assert.equal(a.retainedText, undefined);
  assert.equal(a.paintedControlText, undefined);
  const rp = one(reference.nodes.filter(n => n.key === r.parent));
  const rf = one(reference.nodes.filter(n => n.key === rp.parent));
  const ap = one(candidate.nodes.filter(n => n.key === a.parent));
  const af = one(candidate.nodes.filter(n => n.key === ap.parent));
  assert.equal(rid(rp), family + '-root'); assert.equal(rp.type, 'section');
  assert.equal(rf.key, 'frame'); assert.equal(rf.type, 'main');
  assert.equal(ap.authored.id, family + '-root'); assert.equal(ap.authored.type, 'section');
  assert.equal(af.authored.id, 'page'); assert.equal(af.authored.type, 'main');
  const scale = rf.inline['--scale']?.value; assert.ok(['1', '0.9', '1.15'].includes(scale));
  const pageSize = `${16 * Number(scale)}px`;
  const referencePath = [r, rp, rf].map(node => {
    assert.equal(affectsSize(node.inline), false);
    const requests = node.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affectsSize(rule.declarations));
    if (node === rp) assert.equal(requests.length, 0);
    else {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].declarations['font-size']?.value, node === r ? target.token : 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false);
      assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
    }
    const size = node === r ? target.size : pageSize;
    assert.equal(reference.styles[node.style].fontSize, size);
    return { key: node.key, parent: node.parent, type: node.type, id: rid(node) ?? null, computedFontSize: size, requests };
  });
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')),
    'nested rules require separate review');
  const sizeRules = candidate.rules.filter(affectsSize);
  const possibleRequests = node => sizeRules.filter(rule => {
    if (['.material-table th', '.material-table td'].includes(rule.selector) && !['th', 'td'].includes(node.authored.type)) return false;
    return selectorCanApply(rule.selector, node.authored);
  });
  const inspectCandidate = (node, expected, selector) => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false);
    assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const requests = possibleRequests(node);
    if (selector) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, selector);
      assert.equal(requests[0].fontSize, expected);
      assert.equal(Object.hasOwn(requests[0], 'font'), false); assert.equal(Object.hasOwn(requests[0], 'all'), false);
    } else assert.equal(requests.length, 0, 'unexpected ancestor font-size request');
    const values = {};
    for (const stage of stages) {
      assert.equal(Object.hasOwn(node[stage], 'font'), false); assert.equal(Object.hasOwn(node[stage], 'all'), false);
      assert.equal(node[stage].fontSize, expected);
      values[stage] = node[stage].fontSize ?? '<omitted>';
    }
    return { key: node.key, parent: node.parent, authored: node.authored, fontSize: values, requests };
  };
  const candidatePath = [inspectCandidate(a), inspectCandidate(ap), inspectCandidate(af, pageSize, '#page')];
  const child = one(candidate.nodes.filter(n => n.authored?.id === target.descendant));
  assert.equal(child.parent, a.key); assert.equal(child.authored.type, target.type);
  const candidateDescendant = inspectCandidate(child, target.size, '.' + target.descendant);
  const referenceDescendant = family === 'toolbar'
    ? one(reference.nodes.filter(n => rid(n) === 'toolbar-title'))
    : one(reference.nodes.filter(n => (n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-paginator-container')));
  const descendantPath = []; let current = referenceDescendant;
  while (current !== r) {
    assert.ok(!descendantPath.some(n => n.key === current.key), 'cyclic descendant ancestry');
    assert.equal(affectsSize(current.inline), false);
    const requests = current.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affectsSize(rule.declarations));
    assert.equal(requests.length, 0, 'descendant must inherit reference component font size');
    assert.equal(reference.styles[current.style].fontSize, target.size);
    descendantPath.push({ key: current.key, parent: current.parent, type: current.type, ownText: current.ownText,
      computedFontSize: target.size, requests });
    current = one(reference.nodes.filter(n => n.key === current.parent));
  }
  assert.equal(descendantPath.length, family === 'toolbar' ? 1 : 2);
  if (family === 'toolbar') {
    assert.equal(referenceDescendant.ownText, 'Material workspace'); assert.equal(child.authored.textContent, 'Material workspace');
  } else { assert.equal(referenceDescendant.ownText, ''); assert.equal(child.authored.textContent, undefined); }
  assert.equal(input.reference.fontSize, target.size);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle'])
    assert.equal(Object.hasOwn(input[stage], 'fontSize'), false);
  return { referencePath, candidatePath, referenceDescendantPath: descendantPath, candidateDescendant,
    candidateSizeRules: sizeRules.map(rule => ({ selector: rule.selector, sha256: hash(JSON.stringify(rule)) })),
    property: 'fontSize', referenceComputedFontSize: target.size, candidateLocalFontSize: '<omitted>',
    referencePageFontSize: pageSize, candidateDescendantLocalFontSize: target.size,
    classification: 'application-plugin-authoring-defect', attribution: 'component-font-size-declaration-moved-to-descendant',
    owner: 'Material comparison component typography authoring',
    sameInheritanceScope: false, candidateComputedHostSizeVerified: false, wholeElementInputEquivalent: false,
    rendererCauseProven: false, renderingEquivalent: false, descendantRasterVerified: false,
    limitation: 'The component-level Material token is absent from candidate ancestry and replaced by a descendant declaration. The descendant numerical size matches but inheritance scope does not. No candidate computed host size, visible consequence, raster equivalence, or core inheritance failure is inferred. Other typography, structure and control states remain separately owned.' };
}

function sourceHistory() {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const selectors = ['.toolbar', '.toolbar-title', '.paginator', '.paginator-container'];
  const excerpt = source => source.split(/\r?\n/).flatMap((line, index) =>
    selectors.some(selector => line.includes(`selector: '${selector}'`)) ? [{ line: index + 1, text: line.trim() }] : []);
  const read = revision => execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' });
  const revisions = ['2f44011', '92067a1', '7843582'].map(revision => {
    const full = execFileSync('git', ['rev-parse', revision], { encoding: 'utf8' }).trim();
    const initial = revision === '2f44011';
    if (initial) assert.equal(execFileSync('git', ['ls-tree', full + '^', '--', file], { encoding: 'utf8' }), '');
    const before = initial ? null : read(full + '^'), after = read(full);
    return { revision: full, beforeFileAbsent: initial, beforeSourceSha256: before === null ? null : hash(before),
      afterSourceSha256: hash(after), before: before === null ? [] : excerpt(before), after: excerpt(after) };
  });
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const currentRules = excerpt(current), onlyRule = (rows, selector) => one(rows.filter(r => r.text.includes(`selector: '${selector}',`) && !r.text.includes('mediaMaxWidth')));
  const initial = revisions[0].after;
  assert.match(onlyRule(initial, '.toolbar-title').text, /fontSize: '20px'/);
  assert.match(onlyRule(initial, '.paginator').text, /fontSize: '12px'/);
  assert.doesNotMatch(onlyRule(currentRules, '.toolbar').text, /fontSize:/);
  assert.match(onlyRule(currentRules, '.toolbar-title').text, /fontSize: '22px'/);
  assert.doesNotMatch(onlyRule(currentRules, '.paginator').text, /fontSize:/);
  assert.match(onlyRule(currentRules, '.paginator-container').text, /fontSize: '12px'/);
  const conversion = revisions[2];
  assert.match(onlyRule(conversion.before, '.paginator').text, /fontSize: '13px'/);
  assert.doesNotMatch(onlyRule(conversion.after, '.paginator').text, /fontSize:/);
  assert.match(onlyRule(conversion.after, '.paginator-container').text, /fontSize: '12px'/);
  return { file, currentSourceSha256: hash(current), currentRules, revisions,
    limitation: 'Source changes establish what moved, not developer intent or whether all changes in a mixed core/example commit were compensations. Existing toolbar measured-width and line-height findings remain separate.' };
}

export function collectFontScopeInputs() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [];
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const target = realpathSync(descriptor.file); assert.ok(target.startsWith(boundary));
    const data = readFileSync(target); assert.equal(hash(data), descriptor.sha256); return JSON.parse(data);
  };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key);
    if (!Object.hasOwn(targets, entry.family)) continue;
    const input = one(entry.styleInputs.filter(i => i.id === entry.family + '-primary'));
    findings.push({ case: key, family: entry.family, element: input.id, profile: entry.profile, viewport: entry.viewport,
      state: entry.state ?? 'static', originalInputSha256: hash(JSON.stringify(input)), inputTrees: entry.inputTrees,
      proof: inspectFontScopeInputs(entry.family, input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 104);
  const counts = Object.fromEntries(Object.keys(targets).map(f => [f, findings.filter(x => x.family === f).length]));
  assert.deepEqual(counts, { toolbar: 52, paginator: 52 });
  return { schemaVersion: 1, kind: 'original-component-font-declaration-scope-inputs', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, observations: findings.length, counts, findings, history: sourceHistory(),
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectFontScopeInputs(), file = 'docs/material-font-scope-inputs.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
