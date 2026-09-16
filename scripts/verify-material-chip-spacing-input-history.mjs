import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

// Read-only audit: compare committed authoring history and every original chip
// case. Do not rewrite fixtures, resolve a replacement cascade, or infer pixels.
const root = process.cwd();
assert.equal(process.argv.length, 2, 'this read-only proof accepts no filters or overrides');
const file = 'examples/material-showcase/src/app/astylar.component.ts';
const introduction = '7159b1d5266ed4bc03b56581b8034526abae892b';
const adjustment = '00de46ceffc78850115fca006a9680f8044efe75';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const source = revision => git('show', `${revision}:${file}`);
const gapRule = text => text.split('\n').filter(line => line.includes("selector: '#chips-primary'") && line.includes('gap:'));
assert.equal(gapRule(source(`${introduction}^`)).length, 0);
assert.deepEqual(gapRule(source(introduction)).map(s => s.trim()), ["{ selector: '#chips-primary', gap: '10px' },"]);
assert.deepEqual(gapRule(source(`${adjustment}^`)).map(s => s.trim()), ["{ selector: '#chips-primary', gap: '10px' },"]);
assert.deepEqual(gapRule(source(adjustment)).map(s => s.trim()), ["{ selector: '#chips-primary', gap: '8px' },"]);
assert.deepEqual(git('diff-tree', '--no-commit-id', '--name-only', '-r', adjustment).split('\n'), [file]);
assert.ok(source(`${adjustment}^`).includes("{ selector: '.chip-label', position: 'relative', top: '-2px', verticalAlign: 'middle' }"));
assert.ok(source(adjustment).includes("{ selector: '.chip-label', verticalAlign: 'middle' }"));
const current = readFileSync(path.join(root, file), 'utf8');
assert.deepEqual(gapRule(current).map(s => s.trim()), gapRule(source(adjustment)).map(s => s.trim()));

const survey = JSON.parse(readFileSync(path.join(root, 'docs/material-owner-gap-input-survey.json'), 'utf8'));
const groups = survey.groups.filter(g => g.element === 'chips-primary');
assert.equal(groups.length, 2);
assert.deepEqual(groups.map(g => g.property).sort(), ['columnGap', 'rowGap']);
assert.deepEqual(groups[0].originalCases, groups[1].originalCases);
assert.equal(groups[0].originalCases.length, 76);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const artifactRoot = realpathSync(path.join(root, 'artifacts/material-parity/current-ancestry-audit'));
function tree(descriptor) {
  const location = realpathSync(path.resolve(root, descriptor.file));
  const relative = path.relative(artifactRoot, location);
  assert.ok(relative && !relative.startsWith('..') && !path.isAbsolute(relative));
  const bytes = readFileSync(location);
  assert.equal(sha(bytes), descriptor.sha256);
  const value = JSON.parse(bytes);
  assert.deepEqual(value.errors, []);
  return value;
}
function one(nodes, label) { assert.equal(nodes.length, 1, label); return nodes[0]; }
const records = [];
for (const caseId of groups[0].originalCases) {
  const entry = one(survey.cases.filter(c => c.case === caseId), caseId);
  const r = tree(entry.inputTrees.reference), a = tree(entry.inputTrees.astylar);
  assert.equal(a.resolvedStyleSource, 'core-style-inspection');
  assert.equal(a.resolvedStyleEvidenceVersion, 2);
  const host = one(r.nodes.filter(n => n.attributes?.id === 'chips-primary'), caseId);
  const wrapper = one(r.nodes.filter(n => n.parent === host.key && n.attributes?.class?.split(/\s+/).includes('mdc-evolution-chip-set__chips')), caseId);
  const candidate = one(a.nodes.filter(n => n.authored?.id === 'chips-primary'), caseId);
  assert.equal(r.styles[host.style].flexWrap, 'nowrap', caseId);
  assert.equal(r.styles[wrapper.style].flexWrap, 'wrap', caseId);
  assert.equal(r.styles[wrapper.style].marginLeft, '-8px', caseId);
  assert.equal(r.styles[wrapper.style].minWidth, '100%', caseId);
  for (const property of ['columnGap', 'rowGap']) {
    assert.equal(r.styles[host.style][property], 'normal', caseId);
    assert.equal(r.styles[wrapper.style][property], 'normal', caseId);
  }
  const refChildren = r.nodes.filter(n => n.parent === wrapper.key && n.type === 'mat-chip-option');
  const candidateChildren = a.nodes.filter(n => n.parent === candidate.key);
  assert.deepEqual(refChildren.map(n => n.attributes.id), ['chip-0', 'chip-1'], caseId);
  assert.deepEqual(candidateChildren.map(n => n.authored.id), ['chip-0', 'chip-1'], caseId);
  for (const child of refChildren) {
    assert.equal(r.styles[child.style].marginLeft, '8px', caseId);
    assert.equal(r.styles[child.style].marginTop, '4px', caseId);
    assert.equal(r.styles[child.style].marginBottom, '4px', caseId);
  }
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) {
    assert.equal(candidate[stage].gap, '8px', caseId);
    assert.equal(candidate[stage].flexWrap, 'wrap', caseId);
    for (const child of candidateChildren) assert.equal(child[stage].margin, '0', caseId);
  }
  records.push({ case: caseId, inputTrees: entry.inputTrees,
    referenceHost: host.key, referenceWrapper: wrapper.key, candidateHost: candidate.key,
    candidateHeight: candidate.resolvedStyle.height,
    candidateWidths: candidateChildren.map(n => n.resolvedStyle.width) });
}
console.log(JSON.stringify({ kind: 'chip-spacing-history-and-original-structure',
  sourceFile: file, introduction, adjustment, cases: records.length,
  staticCases: records.filter(r => r.case.startsWith('static:')).length,
  interactionCases: records.filter(r => r.case.startsWith('interaction:')).length,
  propertyObservations: records.length * groups.length,
  originalCaseProjectionSha256: sha(JSON.stringify(records)),
  findings: ['reference negative-margin wrapper and chip margins replaced by direct candidate gap',
    'chip-set gap introduced at 10px then changed to 8px in showcase-only adjustment',
    'adjustment removes earlier label offset; this is not evidence that removal was wrong'],
  inputEquivalent: false, rendererCauseConfirmed: false,
  limitation: 'Structure and local request evidence only; no used-gap, wrapping-output, or historical causal proof.' }, null, 2));
