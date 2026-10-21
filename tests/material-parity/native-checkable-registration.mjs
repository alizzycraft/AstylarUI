import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { passiveMainPredecessor, restorePassiveMainPolicy, restorePassiveMainProducer } from './passive-main-registration.mjs';
const hash = value => createHash('sha256').update(value).digest('hex');
const normalized = value => value.toString().replaceAll('\r\n', '\n');
const ids = ['core-native-checkable-form-value-synthesizes-visible-label', 'fixture-radio-ring-state-paint-token-substitution'];

// One exact additive registration boundary. Historical assertions still see
// their complete171-definition source,not a filtered arbitrary population.
export function nativeCheckablePredecessor(current) {
  current = passiveMainPredecessor(current);
  if (current.length !== 173) return current;
  assert.equal(hash(JSON.stringify(current)), 'fd942c4c5cc68504b8511e308960c5e8b3223f0bc0656e35721df5942f207796');
  assert.deepEqual(current.slice(-2).map(row => row.id), ids);
  const prior = current.slice(0, -2);
  assert.equal(hash(JSON.stringify(prior)), '30614a9632c7a2e4f08220fe3fa8bc52773eaef4a92b352231631410341fa9b7');
  return prior;
}
export function restoreNativeCheckablePolicy(source) {
  const text = restorePassiveMainPolicy(source);
  if (!text.includes(ids[0])) {
    assert.ok(!text.includes(ids[1]), 'Unrecognized partial native registration');
    return text;
  }
  assert.equal(hash(text), '13b2a2a13a44ab6cd9f40fa5e8ee63156d816c78ca93246b33b8a2c5e6cc94ee');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 173);
  assert.deepEqual(entries.slice(-2).map(n => n.arguments[0].properties.find(p => p.name?.text === 'id').initializer.text), ids);
  const prior = text.slice(0, entries[171].getFullStart()) + text.slice(entries[172].end + 1);
  assert.equal(hash(prior), '9734869f4dcc4777c4c18bacb5fed030c7cf01fd3c85757200624ecb72974ae3');
  return prior;
}
export function restoreNativeCheckableSuite(source) {
  let text = normalized(source);
  if (!text.includes('nativeRegisteredSourceAuditDefinitions')) return text;
  const expected = new Map([
    ['1f6406afa3bc66f94e84c9d681674aa9e0f179fe6078c4b308b4e05db6c51230', '8168916c3062a7d4be36bec3bad8883661a305126b1e016c93e8aa46cfe9ee10'],
    ['0dfbe703a7b249797f322b6446b46f7906448341242b2ae6b3fbea5a440253d1', '56d9e771893b8c4e7448554c3c5d2cad608caaae2621b0a0ca526fc44dde8e80'],
  ]).get(hash(text));
  assert.ok(expected, 'Unreviewed historical suite source');
  const current = "import { sourceAuditDefinitions as nativeRegisteredSourceAuditDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { nativeCheckablePredecessor } from './native-checkable-registration.mjs';\n"
    + 'const registeredSourceAuditDefinitions = nativeCheckablePredecessor(nativeRegisteredSourceAuditDefinitions);';
  assert.equal(text.split(current).length, 2);
  text = text.replace(current, "import { sourceAuditDefinitions as registeredSourceAuditDefinitions } from './input-equivalence-policy.mjs';");
  assert.equal(hash(text), expected); return text;
}
export function restoreNativeCheckableProducer(source) {
  const text = restorePassiveMainProducer(source);
  if (!text.includes('native checkable additive registration and predecessor conservation')) {
    assert.ok(!text.includes("'tests/material-parity/native-checkable-inputs.spec.mjs'"), 'Unrecognized native proof registration');
    return text;
  }
  assert.equal(hash(text), '74c966fc3c3a178b0b64436026fa658e052bdaf021f2951c15558ceba0fbba9b');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 232);
  assert.deepEqual(proofs.slice(0, 3).map(n => n.arguments[3].text), [
    'native checkable additive registration and predecessor conservation',
    'public native checkable form-value label failure and full method binding',
    'radio ring state paint requests before rendering']);
  assert.equal(files[0].text, 'tests/material-parity/native-checkable-inputs.spec.mjs');
  assert.equal(files[9].text, 'artifacts/material-parity/radio-ring-inputs-20261021.log');
  assert.equal(files[10].text, 'scripts/export-material-input-audit-current-ancestry.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[2].end + 1],
    [files[0].getFullStart(), files[9].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), 'cca481561332a3ae872d49318014f5c4faa0e37cf6f03503e4a7c85024e5c284');
  return prior;
}
