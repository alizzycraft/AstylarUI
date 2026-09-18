import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
const referenceId = n => n.attributes?.['data-parity-id'] ?? n.attributes?.id;
const fontRequest = d => Object.keys(d).some(k => ['font', 'fontsize', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];

export function inspectRangeFontReset(input, reference, candidate) {
  assert.ok(['slider-start', 'slider-primary'].includes(input.id));
  assert.deepEqual(reference.errors, []); assert.deepEqual(candidate.errors, []);
  assert.equal(reference.schemaVersion, 1); assert.equal(candidate.schemaVersion, 1);
  assert.equal(candidate.resolvedStyleSource, 'core-style-inspection');
  assert.equal(candidate.resolvedStyleEvidenceVersion, 2); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const r = one(reference.nodes.filter(n => referenceId(n) === input.id));
  const a = one(candidate.nodes.filter(n => n.authored?.id === input.id));
  assert.equal(r.type, 'input'); assert.equal(r.attributes.type, 'range');
  assert.equal(a.authored.type, 'input'); assert.equal(a.authored.inputType, 'range');
  assert.equal(a.authored.class, 'range-layer');
  const chain = (tree, node, end) => {
    const seen = new Set(), result = [];
    while (true) {
      assert.ok(!seen.has(node.key)); seen.add(node.key); result.push(node);
      if (end(node)) return result;
      node = one(tree.nodes.filter(n => n.key === node.parent));
    }
  };
  const rp = chain(reference, r, n => n.key === 'frame');
  const ap = chain(candidate, a, n => n.authored?.id === 'page');
  assert.deepEqual(rp.map(n => n.type), ['input', 'mat-slider', 'section', 'main']);
  assert.deepEqual(ap.map(n => n.authored.type), ['input', 'div', 'section', 'main']);
  assert.deepEqual(ap.map(n => n.authored.id), [input.id, 'slider-pair', 'slider-root', 'page']);
  const scale = rp.at(-1).inline['--scale'].value;
  assert.ok(['1', '0.9', '1.15'].includes(scale)); const size = `${16 * Number(scale)}px`;
  const referencePath = rp.map(node => {
    assert.equal(fontRequest(node.inline), false);
    const requests = node.rules.map(i => reference.rules[i]).filter(r => r.active && fontRequest(r.declarations));
    if (node === r) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, 'button, input, select');
      assert.equal(requests[0].declarations['font-size']?.value, 'inherit');
      assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false);
    } else if (node === rp.at(-1)) {
      assert.equal(requests.length, 1);
      assert.equal(requests[0].declarations['font-size']?.value, 'calc(16px * var(--scale))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false);
    } else assert.equal(requests.length, 0);
    assert.equal(reference.styles[node.style].fontSize, size);
    return { key: node.key, type: node.type, fontSize: size, requests };
  });
  const candidateReset = one(candidate.rules.filter(r => r.selector === 'button, input, select'));
  assert.deepEqual(candidateReset, { selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' });
  const fontRules = candidate.rules.filter(fontRequest);
  const excludedRules = fontRules.map(rule => {
    assert.ok(Object.values(rule).every(value => value === null || typeof value !== 'object'));
    // These two captured descendant selectors have terminal table-cell types.
    // They cannot match this input. All other exclusions use the existing
    // conservative helper; unknown possibly applicable syntax is rejected.
    const tableCell = ['.material-table th', '.material-table td'].includes(rule.selector);
    assert.ok(tableCell || !selectorCanApply(rule.selector, a.authored), 'possibly applicable font-size/reset rule');
    return { rule, exclusion: tableCell ? 'terminal-table-cell-type-is-not-input' : 'conservative-type-id-class-mismatch' };
  });
  const candidatePath = ap.map((node, index) => {
    assert.equal(Object.hasOwn(node.authored, 'style'), false);
    assert.equal(Object.hasOwn(node.authored.attributes ?? {}, 'style'), false);
    const expected = index === 0 ? '16px' : node === ap.at(-1) ? size : undefined;
    for (const stage of stages) {
      assert.equal(node[stage].fontSize, expected);
      assert.equal(Object.hasOwn(node[stage], 'font'), false); assert.equal(Object.hasOwn(node[stage], 'all'), false);
    }
    return { key: node.key, authored: node.authored, fontSize: expected ?? '<omitted>' };
  });
  assert.equal(input.reference.fontSize, size);
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].fontSize, '16px');
  assert.equal(a.retainedText, undefined); assert.equal(a.paintedControlText, undefined);
  return { referencePath, candidatePath, referenceFontSize: size, candidateFontSize: '16px',
    candidateReset, excludedRules, scalarMatches: size === '16px',
    classification: 'application-plugin-authoring-defect', owner: 'Material control font reset translation',
    justification: 'The reference input explicitly inherits font size, whereas the candidate translates only the family and retains local 16px control defaults. Matching default-theme numbers do not restore the omitted inheritance request.',
    inputEquivalent: false, rendererCauseProven: false, renderingEquivalent: false, visibleTextVerified: false };
}

export function collectRangeFontReset() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json';
  const bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [];
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key); if (entry.family !== 'slider') continue;
    for (const id of ['slider-start', 'slider-primary']) {
      const input = one(entry.styleInputs.filter(i => i.id === id));
      findings.push({ case: key, element: id, viewport: entry.viewport, state: entry.state ?? 'static',
        originalInputSha256: digest(input), inputTrees: entry.inputTrees,
        proof: inspectRangeFontReset(input, tree(entry.inputTrees.reference), tree(entry.inputTrees.astylar)) });
    }
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 156);
  const counts = { unequal: findings.filter(f => !f.proof.scalarMatches).length,
    matching: findings.filter(f => f.proof.scalarMatches).length };
  assert.deepEqual(counts, { unequal: 76, matching: 80 });
  const revision = 'af04845d01e8e65ee2e88a67e41dac9ede4c7f3e', sourceFile = 'examples/material-showcase/src/app/astylar.component.ts';
  const after = execFileSync('git', ['show', `${revision}:${sourceFile}`], { encoding: 'utf8' });
  const before = execFileSync('git', ['show', `${revision}^:${sourceFile}`], { encoding: 'utf8' });
  const fragment = "{ selector: 'button, input, select', fontFamily: 'Roboto, Arial, sans-serif' }";
  assert.ok(after.includes(fragment)); assert.equal(before.includes(fragment), false);
  const stylesheetFile = 'examples/material-showcase/src/styles.scss', stylesheet = readFileSync(stylesheetFile, 'utf8').replaceAll('\r\n', '\n');
  assert.ok(stylesheet.includes('button, input, select { font: inherit; }'));
  return { schemaVersion: 1, kind: 'original-range-font-inheritance-reset-omission',
    originalCapture: { file, sha256 }, originalCasesScanned: seen.size, observations: findings.length, counts, findings,
    history: { revision, sourceFile, beforeSha256: hash(before), afterSha256: hash(after), fragment,
      stylesheetFile, stylesheetSha256: hash(stylesheet), authorIntentProven: false },
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectRangeFontReset(), file = 'docs/material-range-font-reset.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output);
  else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts,
    reportSha256: hash(output), canonicalAttributionChanged: false }));
}
