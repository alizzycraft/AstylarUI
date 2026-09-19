import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inspectKeywordReference } from '../../scripts/capture-text-align-keyword-reference.mjs';
import { inspectCapturedLtrAlignment } from '../../scripts/audit-material-ltr-alignment.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const report = JSON.parse(readFileSync('docs/material-ltr-alignment-review.json'));
const browserBytes = readFileSync(report.browserControl.file), browser = JSON.parse(browserBytes);
test('LTR review replays every original owner and source history without writes or canonical changes', () => {
  const files = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'];
  const before = files.map(f => hash(readFileSync(f)));
  const guard = `import fs from 'node:fs';import{syncBuiltinESMExports}from'node:module';
    fs.writeFileSync=()=>{throw Error('CHECK_MODE_ATTEMPTED_WRITE')};syncBuiltinESMExports();`;
  const output = execFileSync(process.execPath, ['--max-old-space-size=1536', '--import',
    'data:text/javascript;base64,' + Buffer.from(guard).toString('base64'), 'scripts/audit-material-ltr-alignment.mjs', '--check'],
  { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  const result = JSON.parse(output);
  assert.equal(result.groups, 4); assert.equal(result.observations, 178);
  assert.equal(result.reportSha256, hash(readFileSync('docs/material-ltr-alignment-review.json', 'utf8').replaceAll('\r\n', '\n')));
  assert.equal(result.canonicalAttributionChanged, false);
  assert.deepEqual(files.map(f => hash(readFileSync(f))), before);
});

test('browser keyword controls bind source and prove LTR correspondence plus RTL counterexamples', () => {
  assert.equal(hash(browserBytes), report.browserControl.sha256);
  assert.equal(hash(readFileSync(browser.source.file)), browser.source.sha256);
  assert.deepEqual(inspectKeywordReference(browser), browser.controls);
  assert.equal(browser.results.length, 32); assert.equal(browser.controls.length, 16);
  assert.equal(browser.controls.filter(c => c.direction === 'ltr' && c.alignment === 'start' && c.expectedPhysical === 'left').length, 4);
  assert.equal(browser.controls.filter(c => c.direction === 'rtl' && c.alignment === 'start' && c.expectedPhysical === 'right').length, 4);
  const changes = [
    r => { r.results.pop(); },
    r => { r.results[1] = r.results[0]; },
    r => { r.results[0].computed.direction = 'rtl'; },
    r => { r.results[0].computed.writingMode = 'vertical-rl'; },
    r => { r.results[0].text.x++; },
    r => { r.results[0].fontAvailable = false; },
    r => { r.results[0].viewport.width++; },
    r => { r.errors.push('runtime error'); },
    r => { r.astylarRenderingVerified = true; },
  ];
  for (const [index, mutate] of changes.entries()) {
    const changed = structuredClone(browser); mutate(changed);
    assert.throws(() => inspectKeywordReference(changed), `browser control ${index}`);
  }
});

test('scoped review rejects changed writing direction, mode, last-line behavior and missing candidate stages', () => {
  const survey = JSON.parse(readFileSync(report.sourceProof.file));
  const o = report.groups[0].observations[0], f = survey.findings.find(f => f.case === o.case && f.element === report.groups[0].element);
  const proof = survey.patterns[f.pattern].proof, tree = JSON.parse(readFileSync(o.inputTrees.reference.file));
  const style = t => t.styles[t.nodes.find(n => n.key === proof.referencePath[0].node).style];
  assert.equal(inspectCapturedLtrAlignment(proof, tree).capturedRequestedEdgeCorrespondence, true);
  const changes = [
    (p, t) => { style(t).direction = 'rtl'; },
    (p, t) => { style(t).writingMode = 'vertical-rl'; },
    (p, t) => { style(t).textAlignLast = 'justify'; },
    (p, t) => { style(t).textAlign = 'center'; },
    (p, t) => { p.candidatePath[0].localValues.resolvedStyle = 'center'; },
    (p, t) => { delete p.candidatePath[0].localValues.resolvedStyle; },
    (p, t) => { p.referenceRequestNodes.push('unexpected'); },
    (p, t) => { p.referencePath[0].node = 'missing'; },
    (p, t) => { p.referencePath = []; },
  ];
  for (const [index, mutate] of changes.entries()) {
    const p = structuredClone(proof), t = structuredClone(tree); mutate(p, t);
    assert.throws(() => inspectCapturedLtrAlignment(p, t), `scope control ${index}`);
  }
});

test('review preserves limited classification scope, original members and all six reserved groups', () => {
  assert.deepEqual(report.groups.map(g => [g.element, g.occurrences]), [
    ['sort-primary', 60], ['stepper-content', 68], ['bottom-sheet-dismiss', 25], ['bottom-sheet-copy', 25]]);
  for (const g of report.groups) {
    assert.equal(g.proposedClassification, 'equivalent-representation'); assert.equal(g.previousAttribution, 'unresolved');
    assert.equal(g.occurrences, g.observations.length); assert.equal(new Set(g.observations.map(o => o.case)).size, g.occurrences);
    assert.equal(g.inputEquivalent, false); assert.equal(g.renderingEquivalent, false); assert.equal(g.rendererCauseProven, false);
    for (const o of g.observations) {
      assert.equal(o.capturedRequestedEdgeCorrespondence, true);
      for (const flag of ['wholeElementInputEquivalent', 'candidateComputedVerified', 'actualPlacementVerified', 'renderingEquivalent', 'rendererCauseProven'])
        assert.equal(o[flag], false);
    }
  }
  assert.equal(report.otherRetainedGroups.length, 6); assert.equal(report.otherRetainedGroups.reduce((n, g) => n + g.occurrences, 0), 235);
  assert.ok(report.otherRetainedGroups.some(g => g.element === 'expansion-primary'));
  assert.equal(report.history.length, 3); assert.equal(report.canonicalAttributionChanged, false);
});
