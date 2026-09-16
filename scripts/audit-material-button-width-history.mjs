import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const source = 'examples/material-showcase/src/app/astylar.component.ts';
const endpoint = '9f713c0930ea5c3692e96f5f62a05d38863abcb8';
const target = 'docs/material-button-width-history.json';
const hash = value => createHash('sha256').update(value).digest('hex');

export function extractButtonWidthExpressions(text, selectors) {
  const file = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), found = [];
  assert.equal(file.parseDiagnostics.length, 0, 'historical source must parse');
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const property = name => node.properties.find(p => ts.isPropertyAssignment(p) && p.name.getText(file) === name)?.initializer;
      const selector = property('selector'), width = property('width');
      if (selector && width && selectors.includes(selector.getText(file)))
        found.push({ selector: selector.getText(file), widthExpression: width.getText(file) });
    }
    ts.forEachChild(node, visit);
  }
  visit(file); return found;
}

export function collectButtonWidthHistory() {
  const authoring = JSON.parse(readFileSync('docs/material-button-fixed-width-audit.json'));
  const expected = authoring.history.initialAndCurrentWidthExpressions;
  const selectors = expected.map(e => e.selector);
  assert.equal(selectors.length, 9); assert.equal(new Set(selectors).size, 9);
  const revisions = execFileSync('git', ['log', '--follow', '--format=%H', endpoint, '--', source])
    .toString().trim().split('\n').reverse();
  assert.equal(revisions[0], authoring.history.introducedBy);
  assert.equal(revisions.at(-1), endpoint);
  const snapshots = revisions.map(commit => {
    const bytes = execFileSync('git', ['show', `${commit}:${source}`], { maxBuffer: 4 * 1024 * 1024 });
    const expressions = extractButtonWidthExpressions(bytes.toString(), selectors);
    assert.deepEqual(expressions, expected, `width request differs at ${commit}`);
    return { commit, sourceSha256: hash(bytes), expressionSha256: hash(JSON.stringify(expressions)) };
  });
  return { schemaVersion: 1, kind: 'historical-button-width-authoring-review', source, endpoint,
    introducedBy: revisions[0], historyCommand: ['git', 'log', '--follow', '--format=%H', endpoint, '--', source],
    revisionCount: snapshots.length, expressions: expected, snapshots,
    finding: 'All nine selected width expressions are identical in every returned source revision from introduction through the pinned endpoint.',
    limits: ['This reviews the followed file history reachable from the pinned endpoint, not unrelated branches or uncommitted historical edits.',
      'Only these nine selector/width expressions are compared; other properties and dynamic state logic are not declared unchanged.',
      'The origin or measurement-based derivation of the initial constants remains unproven.',
      'Unchanged authoring does not establish input equivalence or correct candidate used dimensions.'],
    rendererChanged: false, canonicalAttributionChanged: false, inputEquivalent: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = collectButtonWidthHistory(), text = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), text);
  else writeFileSync(target, text);
  console.log(JSON.stringify({ target, revisions: report.revisionCount, expressions: report.expressions.length,
    endpoint, unchanged: true, initialDerivationProven: false }));
}
