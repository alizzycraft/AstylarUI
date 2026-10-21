import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const hash = value => createHash('sha256').update(value).digest('hex');
export function cardTitlePredecessor(current) {
  if (current.length !== 176) return current;
  assert.equal(hash(JSON.stringify(current)), '0196bd3ca3cba45bc0aae347cec98930d5fa2ebeb4a8966ce091993bb2001c86');
  assert.equal(current.at(-1).id, 'fixture-card-title-promoted-to-heading');
  const prior = current.slice(0, -1);
  assert.equal(hash(JSON.stringify(prior)), '1d87ea04c45cbd796bb6dc627f77e7349253ef0d8d1e25a40ca0c87ed633b474');
  return prior;
}
export function restoreCardTitlePolicy(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes('fixture-card-title-promoted-to-heading')) {
    assert.ok(!text.includes('scripts/check-card-static-ax.mjs'), 'Partial card title registration');
    return text;
  }
  assert.equal(hash(text), '3c1509e55dc67ea2aa3f5d52bb0a0babd9e36ef46c742a3ed96936e973b2513d');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 176);
  assert.equal(entries[175].arguments[0].properties.find(p => p.name?.text === 'id').initializer.text,
    'fixture-card-title-promoted-to-heading');
  const prior = text.slice(0, entries[175].getFullStart()) + text.slice(entries[175].end + 1);
  assert.equal(hash(prior), '7c42affa92ea9baae611d024f9bc6cb395f92cbf8ecbd71b4786b11e6ca784ac');
  return prior;
}
