import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const source = 'examples/material-showcase/src/app/astylar.component.ts';
const endpoint = '9f713c0930ea5c3692e96f5f62a05d38863abcb8';
const target = 'docs/material-field-host-layout-history.json';
const properties = ['position', 'display', 'flexDirection', 'width', 'height', 'minWidth',
  'boxSizing', 'padding', 'borderWidth', 'alignSelf'];
const hash = value => createHash('sha256').update(value).digest('hex');
const expected = { position: "'relative'", display: '<omitted>', flexDirection: '<omitted>',
  width: "'100%'", height: '`${theme.density === 0 ? 78 : theme.density <= -5 ? 62 : 70}px`',
  minWidth: '<omitted>', boxSizing: "'border-box'", padding: '<omitted>',
  borderWidth: '<omitted>', alignSelf: "'flex-start'" };

export function extractFieldHostLayoutRequests(text) {
  const file = ts.createSourceFile(source, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  assert.equal(file.parseDiagnostics.length, 0, 'historical source must parse');
  const found = [];
  const name = n => ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : undefined;
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const selectors = node.properties.filter(p => ts.isPropertyAssignment(p) && name(p.name) === 'selector');
      if (selectors.some(p => ts.isStringLiteral(p.initializer) && p.initializer.text === '.field-shell')) {
        assert.equal(selectors.length, 1, 'ambiguous selector declaration');
        assert.ok(node.properties.every(p => ts.isPropertyAssignment(p) && name(p.name)),
          'spread/computed/method authoring requires separate review');
        const names = node.properties.map(p => name(p.name));
        assert.equal(new Set(names).size, names.length, 'duplicate property requires separate review');
        found.push({ line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
          expressions: Object.fromEntries(properties.map(key => [key,
            node.properties.find(p => name(p.name) === key)?.initializer.getText(file) ?? '<omitted>'])) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file); assert.equal(found.length, 1, 'exactly one literal field-shell rule required');
  return found[0];
}

export function collectFieldHostLayoutHistory() {
  const historyCommand = ['git', 'log', '--follow', '--format=%H', endpoint, '--', source];
  const revisions = execFileSync(historyCommand[0], historyCommand.slice(1)).toString().trim().split('\n').reverse();
  assert.equal(revisions[0], '2f440115740ff76fa9e55b3f4a11568207b2af5a');
  assert.equal(revisions.at(-1), endpoint);
  const snapshots = revisions.map(commit => {
    const bytes = execFileSync('git', ['show', `${commit}:${source}`], { maxBuffer: 4 * 1024 * 1024 });
    const extracted = extractFieldHostLayoutRequests(bytes.toString());
    assert.deepEqual(extracted.expressions, expected, `field host layout requests changed at ${commit}`);
    return { commit, sourceSha256: hash(bytes), line: extracted.line,
      expressionSha256: hash(JSON.stringify(extracted.expressions)) };
  });
  const current = extractFieldHostLayoutRequests(readFileSync(source, 'utf8'));
  assert.deepEqual(current.expressions, expected, 'working authoring differs from pinned history');
  return { schemaVersion: 1, kind: 'field-host-layout-authoring-history', source, endpoint,
    selector: '.field-shell', properties, expressions: expected, historyCommand,
    introducedBy: revisions[0], revisionCount: revisions.length, snapshots,
    currentSource: { file: source, line: current.line,
      sha256: hash(readFileSync(source, 'utf8').replaceAll('\r\n', '\n')) },
    finding: 'All ten reviewed shared field-shell layout request expressions, including fixed density-dependent height and explicit border-box, are unchanged in every returned revision from introduction through the pinned endpoint and match working authoring.',
    limits: ['Only this selector and these ten request expressions are reviewed; surrounding rules, referenced theme values, renderer behavior and other branches are not declared unchanged.',
      'Omitted properties describe this authored rule only, not the cascade or candidate computed values.',
      'This establishes historical origin, not why the initial requests were chosen, input equivalence, or a causal renderer diagnosis.',
      'Captured field owners and all reference declarations still require separate original-source binding before canonical attribution.',
      'No runtime bisect or equal-input reproduction is claimed.'],
    initialDerivationProven: false, computedCandidateVerified: false,
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(a => a === '--check'), 'only --check is accepted');
  const report = collectFieldHostLayoutHistory(), text = JSON.stringify(report, null, 2) + '\n';
  if (process.argv.includes('--check')) assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), text);
  else writeFileSync(target, text);
  console.log(JSON.stringify({ target, endpoint, revisions: report.revisionCount,
    properties: properties.length, unchanged: true, initialDerivationProven: false, canonicalAttributionChanged: false }));
}
