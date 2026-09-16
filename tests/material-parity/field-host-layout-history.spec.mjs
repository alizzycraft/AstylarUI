import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { collectFieldHostLayoutHistory, extractFieldHostLayoutRequests } from '../../scripts/audit-material-field-host-layout-history.mjs';

test('field host layout history replays every pinned revision without equating authored requests to rendering', () => {
  const saved = JSON.parse(readFileSync('docs/material-field-host-layout-history.json'));
  assert.deepEqual(collectFieldHostLayoutHistory(), saved);
  assert.equal(saved.revisionCount, 102);
  assert.equal(new Set(saved.snapshots.map(s => s.commit)).size, 102);
  assert.equal(new Set(saved.snapshots.map(s => s.expressionSha256)).size, 1);
  assert.equal(saved.properties.length, 10);
  for (const flag of ['initialDerivationProven', 'computedCandidateVerified', 'canonicalAttributionChanged', 'rendererChanged', 'inputEquivalent'])
    assert.equal(saved[flag], false);
});

test('field host history extraction rejects missing ambiguous and opaque rules and preserves changed requests', () => {
  const source = "const styles = [{ selector: '.field-shell', width: '100%', boxSizing: 'border-box' }];";
  const expected = extractFieldHostLayoutRequests(source);
  assert.equal(expected.expressions.width, "'100%'");
  assert.equal(expected.expressions.height, '<omitted>');
  assert.notDeepEqual(extractFieldHostLayoutRequests(source.replace('border-box', 'content-box')).expressions, expected.expressions);
  assert.notDeepEqual(extractFieldHostLayoutRequests(source.replace("width: '100%'", "height: '50px'")).expressions, expected.expressions);
  assert.deepEqual(extractFieldHostLayoutRequests(source.replace('width:', "'width':")).expressions, expected.expressions);
  assert.deepEqual(extractFieldHostLayoutRequests(source + "\nconst unrelated = { selector: '.other', width: '2px' };").expressions, expected.expressions);
  for (const bad of [source.replace('.field-shell', '.other'), source + source.replace('styles', 'duplicate'),
    source.replace("width: '100%'", "width: '100%', width: '90%'"),
    source.replace("width: '100%'", "['width']: '100%'"),
    source.replace("width: '100%'", '...extra'),
    source.replace("width: '100%'", 'width() {}'), 'const broken = {'])
    assert.throws(() => extractFieldHostLayoutRequests(bad));
});
