import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json', sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const fields = ['position', 'display', 'width', 'height', 'boxSizing', 'top', 'left', 'borderWidth', 'borderStyle', 'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor', 'background', 'color'];
const pick = style => Object.fromEntries(fields.filter(key => Object.hasOwn(style, key)).map(key => [key, style[key]]));

export function inspectSortTrees(reference, candidate) {
  const owners = reference.nodes.filter(n => (n.attributes?.class ?? '').split(' ').includes('mat-sort-header-container'));
  assert.equal(owners.length, 1, 'reference focus owner must be unique');
  const owner = owners[0], style = reference.styles[owner.style];
  const host = candidate.nodes.find(n => n.authored?.id === 'sort-primary');
  const trigger = candidate.nodes.find(n => n.authored?.id === 'sort-trigger');
  const lines = candidate.nodes.filter(n => n.authored?.id === 'sort-focus-line');
  assert.ok(host && trigger, 'candidate owners missing');
  assert.ok(lines.length <= 1, 'duplicate focus line');
  const line = lines[0];
  if (line) {
    assert.equal(line.parent, host.key, 'focus line must belong to inspected host');
    assert.equal(line.resolvedStyle.position, 'absolute');
    assert.equal(line.resolvedStyle.height, '1px');
    assert.equal(host.resolvedStyle.position, 'relative');
  }
  return {
    reference: { key: owner.key, parent: owner.parent, style: pick(style), rules: owner.rules.map(i => reference.rules[i]) },
    candidate: { host: pick(host.resolvedStyle), trigger: pick(trigger.resolvedStyle), line: line ? pick(line.resolvedStyle) : null },
    referenceBorderPresent: style.borderBottomWidth !== '0px' && style.borderBottomStyle !== 'none',
    candidateSeparateLinePresent: !!line,
  };
}

export function collectSortFocusStructure() {
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const original = JSON.parse(bytes), observations = [];
  for (const [kind, cases] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of cases.filter(e => e.family === 'sort')) {
      const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
        const receipt = entry.inputTrees[side], data = readFileSync(receipt.file);
        assert.equal(hash(data), receipt.sha256, `tree receipt mismatch: ${receipt.file}`);
        return [side, JSON.parse(data)];
      }));
      observations.push({ case: `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`,
        inputTrees: entry.inputTrees, ...inspectSortTrees(trees.reference, trees.astylar) });
    }
  }
  assert.equal(observations.length, 60);
  assert.equal(new Set(observations.map(o => o.case)).size, 60);
  return { schemaVersion: 1, capture, observations,
    counts: { observations: observations.length, referenceBorder: observations.filter(o => o.referenceBorderPresent).length,
      candidateSeparateLine: observations.filter(o => o.candidateSeparateLinePresent).length },
    classification: 'Application authoring difference: border replaced by out-of-flow paint child; equivalence not established.',
    firstDivergence: 'Authored structure and paint/layout requests, before projection.',
    rendererDefectProven: false, historicalIntentProven: false, canonicalAttributionChanged: false,
    nextProof: 'Exercise the original focus-owner bottom border through public core APIs, including natural height and state updates. Do not remove relative positioning without removing its dependent paint child.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const report = collectSortFocusStructure();
  writeFileSync('docs/material-sort-focus-structure.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
