import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import { restorePassiveMainCaseSelection, restorePassiveMainRunnerSelection, restorePassiveMainLauncherSelection } from './passive-main-registration.mjs';
import { nativeCheckablePredecessor, restoreNativeCheckablePolicy, restoreNativeCheckableSuite, restoreNativeCheckableProducer } from './native-checkable-registration.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const normalized = value => value.toString().replaceAll('\r\n', '\n');
const id = 'fixture-shared-button-touch-descendant-omission';
const files = [
  'scripts/audit-material-case-index-conservation.mjs',
  'tests/material-parity/case-index-historical-conservation.spec.mjs',
  'tests/material-parity/button-touch-inputs.spec.mjs',
  'tests/material-parity/button-touch-registration.mjs',
  'scripts/audit-material-button-touch-inputs.mjs',
  'scripts/audit-public-button-touch-target.mjs',
  'scripts/join-material-button-touch-inputs.mjs',
  'scripts/join-material-current-divider-and-focus-evidence.mjs',
  'artifacts/material-parity/working-audit/proposals/a79bdf4496b89608128fcd7ca223508ce576a1728ba856c030ca15e0a32e5266.json',
  'artifacts/material-parity/button-touch-retained-inputs-20261020.log',
  'artifacts/material-parity/button-touch-authoring-history-20261020.log',
  'artifacts/material-parity/button-touch-newer-capture-reconciliation-20261020.log',
  'artifacts/material-parity/button-touch-scope-independent-20261020.log',
  'artifacts/material-parity/public-button-touch-target-complete-20261020/latest-report.json',
  'artifacts/material-parity/public-button-touch-target-complete-20261020/provenance.json',
  'artifacts/material-parity/public-button-touch-target-complete-20261020/producer.mjs',
  'artifacts/material-parity/button-paired-touch-target-20261020.log',
  'artifacts/material-parity/button-touch-target-independent-20261020.log',
  'artifacts/material-parity/button-touch-transform-parser-binding-20261020.log',
  'artifacts/material-parity/button-focus-indicator-applicability-20261020.log',
  'artifacts/material-parity/divider-current-browser-20261020/latest-report.json',
  'artifacts/material-parity/divider-current-browser-verification-20261020.log',
  'artifacts/material-parity/button-touch-owning-regressions-recovered-20261020.log',
];

// Exact additive source boundary;never rewrite a captured receipt on disk.
export function restoreSharedButtonTouchPolicy(source) {
  const text = restoreNativeCheckablePolicy(source);
  if (!text.includes(id)) return text;
  assert.equal(hash(text), '9734869f4dcc4777c4c18bacb5fed030c7cf01fd3c85757200624ecb72974ae3');
  const tree = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = tree.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations])
    .find(n => n.name.getText(tree) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 171);
  assert.equal(entries[170].arguments[0].properties.find(p => p.name?.text === 'id').initializer.text, id);
  const prior = text.slice(0, entries[170].getFullStart()) + text.slice(entries[170].end + 1);
  assert.equal(hash(prior), '6a330a84e3b43c7ebecebcbb12640fc10ed04b9363dbf74815f74e53efab96b0');
  return prior;
}
export function restoreSharedButtonTouchProducer(source) {
  let text = restoreNativeCheckableProducer(source);
  const launcher = "    'scripts/export-material-input-audit-current-ancestry.mjs',\n";
  if (text.includes(launcher)) {
    assert.equal(hash(text), 'cca481561332a3ae872d49318014f5c4faa0e37cf6f03503e4a7c85024e5c284');
    assert.equal(text.split(launcher).length, 2); text = text.replace(launcher, '');
  }
  const marker = 'shared button touch additive registration preserves prior definitions';
  if (!text.includes(marker)) {
    assert.ok(!text.includes("'tests/material-parity/button-touch-inputs.spec.mjs'"), 'Unrecognized touch proof registration');
    return text;
  }
  assert.equal(hash(text), '5780012c4b9d4e6f0d7ab08cdeae966ea5387462eab7b0b926f2e43bf5157b39');
  const tree = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const sources = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 229);
  assert.deepEqual(proofs.slice(0, 3).map(n => n.arguments[3].text), [marker,
    'shared button touch retained owner inputs and suppression', 'shared button touch percentage hit failure and literal controls']);
  assert.deepEqual(sources.slice(0, files.length).map(n => n.text), files);
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[2].end + 1],
    [sources[0].getFullStart(), sources[files.length - 1].end + 1]].sort((a, b) => b[0] - a[0])) prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), 'd97e15b446f6fe5c53688f3ff504fed86dd1793d0912cb39f374a77abe9c6ea7');
  return prior;
}
export function sharedButtonTouchDefinitions(current) {
  current = nativeCheckablePredecessor(current);
  if (current.length !== 171) return current;
  // Exact proposal group and predecessor digests avoid a new untracked I/O read.
  assert.equal(hash(JSON.stringify(current)), '30614a9632c7a2e4f08220fe3fa8bc52773eaef4a92b352231631410341fa9b7');
  assert.equal(current.at(-1).id, id);
  const prior = current.slice(0, -1);
  assert.equal(hash(JSON.stringify(prior)), '7df65cfffad6916f661ea477c056cbaffacf2feac88faf22756b951c1036b89e');
  return prior;
}
export function restoreSharedButtonSemanticHelper(source) {
  let text = normalized(source);
  const line = "import { restoreSharedButtonTouchPolicy, restoreSharedButtonTouchProducer, sharedButtonTouchDefinitions } from './button-touch-registration.mjs';\n";
  if (!text.includes(line)) return text;
  assert.equal(hash(text), '56922108ba561304f35058a32b8f5f9d7119d03ffa9307d521711f31bb425fd5');
  for (const [current, prior] of [[line, ''],
    ['const current=restoreSharedButtonTouchPolicy(source);', 'const current=normalized(source);'],
    ['const current=restoreSharedButtonTouchProducer(source),marker=', 'const current=normalized(source),marker='],
    ['  current=sharedButtonTouchDefinitions(current);\n', ''],
    ["new Function(restoreSharedButtonTouchPolicy(source).replace(/^export const /gm,'const ')", "new Function(source.replace(/^export const /gm,'const ')"]]) {
    assert.equal(text.split(current).length, 2); text = text.replace(current, prior);
  }
  assert.equal(hash(text), '8eba578d04c9b2a96ef8a5a7615aa5c81dcb315617789aef0a293e5b688d0200');
  return text;
}

export function readSharedButtonPredecessorSource(file, ...args) {
  const actual = readFileSync(file, ...args), resolved = path.resolve(String(file));
  let restored;
  if (resolved === path.resolve('tests/material-parity/input-equivalence-policy.mjs')) restored = restoreSharedButtonTouchPolicy(actual);
  else if (resolved === path.resolve('tests/material-parity/input-equivalence-audit.mjs')) restored = restoreSharedButtonTouchProducer(actual);
  else return actual;
  return typeof actual === 'string' ? restored : Buffer.from(restored);
}
export function restoreSharedButtonSuitePrelude(source) {
  let text = restoreNativeCheckableSuite(source);
  const current = "import { sourceAuditDefinitions as registeredSourceAuditDefinitions } from './input-equivalence-policy.mjs';\n"
    + "import { sharedButtonTouchDefinitions } from './button-touch-registration.mjs';\n"
    + '// Explicit pre-touch population;original historical assertions below are unchanged.\n'
    + 'assert.equal(registeredSourceAuditDefinitions.length, 171);\n'
    + 'const currentSourceAuditDefinitions = sharedButtonTouchDefinitions(registeredSourceAuditDefinitions);';
  if (!text.includes(current)) {
    assert.ok(!text.includes('registeredSourceAuditDefinitions'), 'Unreviewed historical suite prelude'); return text;
  }
  const expected = new Map([
    ['8168916c3062a7d4be36bec3bad8883661a305126b1e016c93e8aa46cfe9ee10', '97ce5c4862de1335a2da17ae4d96d07f9e0fad5f2f5df89dd5b614a2e1ca9bc7'],
    ['56d9e771893b8c4e7448554c3c5d2cad608caaae2621b0a0ca526fc44dde8e80', '1039d8995e8411cb78f951353408a3ed18cdca3bab64dc7de21df7e9be4984c0'],
  ]).get(hash(text));
  assert.ok(expected, 'Unreviewed historical suite source'); assert.equal(text.split(current).length, 2);
  text = text.replace(current, "import { sourceAuditDefinitions as currentSourceAuditDefinitions } from './input-equivalence-policy.mjs';");
  assert.equal(hash(text), expected); return text;
}
export function restoreSharedButtonCaseHelper(source) {
  let text = restorePassiveMainCaseSelection(source);
  const selection = "export const sharedButtonTouchReview='50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a';\n";
  if (text.includes(selection)) {
    assert.equal(hash(text), '2fa149f3ea25b46e9e5ffeaa3bbce6508aebe7ec1f1b5679e489ed223498c0c6');
    assert.equal(text.split(selection).length, 2);
    text = text.replace(selection, '');
    assert.equal(text.split(',sharedButtonTouchReview').length, 3);
    text = text.replaceAll(',sharedButtonTouchReview', '');
    const currentSelection = 'if([dividerPropertyContextReview].includes(reviewSha256)){';
    assert.equal(text.split(currentSelection).length, 2);
    text = text.replace(currentSelection, 'if(reviewSha256===dividerPropertyContextReview){');
    assert.equal(hash(text), '7c53915686cf4b05903b521785c3447a3230b551264897dc637cdb9c62daead0');
  }
  const line = "import { restoreSharedButtonSemanticHelper } from './button-touch-registration.mjs';\n";
  if (!text.includes(line)) return text;
  assert.equal(hash(text), '7c53915686cf4b05903b521785c3447a3230b551264897dc637cdb9c62daead0');
  assert.equal(text.split(line).length, 2); text = text.replace(line, '');
  const current = 'let text=restoreSharedButtonSemanticHelper(source);';
  assert.equal(text.split(current).length, 2);
  text = text.replace(current, "let text=source.toString().replaceAll('\\r\\n','\\n');");
  assert.equal(hash(text), '36f828cd27ec32129d21fa492c736d46587e7c31360ceb505fc9e37c8a396590'); return text;
}
export function restoreSharedButtonRunnerSelection(source) {
  let text = restorePassiveMainRunnerSelection(source);
  assert.equal(hash(text), '9ae9203fc2b87eda8fb3f7ad97061988a77f8dbe53bdd6d9a1774821401010d2');
  for (const addition of [', sharedButtonTouchReview', ',sharedButtonTouchReview']) {
    assert.equal(text.split(addition).length, 2);
    text = text.replace(addition, '');
  }
  assert.equal(hash(text), '37235faee8d356b7780c6497d56cc9a92b3f95ec791e3c0794c632e07606a85e');
  return text;
}
export function restoreSharedButtonLauncherSelection(source) {
  let text = restorePassiveMainLauncherSelection(source);
  assert.equal(hash(text), '727fcd139de7bb68501bb77c7a98aaaabbe170414ddb3c71c8d8b95f0b268e54');
  const current = '50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a';
  assert.equal(text.split(current).length, 3);
  text = text.replaceAll(current, '433b794f0a1d51b7592fb9932fab3fe6c6376c1412958f7aafca089e509799b2');
  assert.equal(hash(text), 'ca48c2ba1c9f109be297231d03f1eba61e62fc643fd53e8a529f8fcc7d01c0ea');
  return text;
}
export function restoreSharedButtonLauncherInvocation(invocation) {
  const current = '50315381bf02df83158d2743488dddd5aee827d4695f7047d49802c2637de44a';
  const prior = '433b794f0a1d51b7592fb9932fab3fe6c6376c1412958f7aafca089e509799b2';
  const expected = [
    `--case-obligation-review=artifacts/material-parity/working-audit/proposals/${current}.json`,
    `--case-obligation-review-sha256=${current}`,
  ];
  for (const arg of expected) assert.equal(invocation.args.filter(value => value === arg).length, 1);
  assert.equal(invocation.args.filter(value => value.includes(current)).length, 2);
  return { ...invocation, args: invocation.args.map(value => expected.includes(value) ? value.replace(current, prior) : value) };
}
export function restoreSharedButtonStoreSuiteSource(source) {
  let text = normalized(source);
  if (text.includes('restoreSharedButtonLauncherInvocation')) {
    assert.equal(hash(text), 'abce0065aaa6753f3235a14ff29edea0e788b0f50e0cfe3734f65ca91faf0d7a');
    const selectionChanges = [
      [', restoreSharedButtonRunnerSelection, restoreSharedButtonLauncherSelection, restoreSharedButtonLauncherInvocation }', ' }'],
      ["restoreSharedButtonRunnerSelection(fs.readFileSync(runner, 'utf8'))", "fs.readFileSync(runner, 'utf8').replaceAll('\\r\\n', '\\n')"],
      ["restoreSharedButtonLauncherSelection(fs.readFileSync(launcher, 'utf8'))", "fs.readFileSync(launcher, 'utf8').replaceAll('\\r\\n', '\\n')"],
      ['const invocation = restoreSharedButtonLauncherInvocation(JSON.parse(execFileSync(process.execPath,\n    [launcher, \'--dry-run\'], { encoding: \'utf8\' })));',
       'const invocation = JSON.parse(execFileSync(process.execPath,\n    [launcher, \'--dry-run\'], { encoding: \'utf8\' }));'],
    ];
    for (const [current, prior] of selectionChanges) {
      assert.equal(text.split(current).length, 2); text = text.replace(current, prior);
    }
  }
  assert.equal(hash(text), 'd65da56bc12841a33589d9fa143c584c70e61bacd8f38b5c3b64fd6a1090cee0');
  const changes = [
    ["  const { sourceAuditDefinitions: registeredDefinitions } = await import('./input-equivalence-policy.mjs');\n"
      + "  const { sharedButtonTouchDefinitions } = await import('./button-touch-registration.mjs');\n"
      + '  const sourceAuditDefinitions = sharedButtonTouchDefinitions(registeredDefinitions);',
    "  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');"],
    ["    const { restoreSharedButtonSuitePrelude } = await import('./button-touch-registration.mjs');\n"
      + '    restored = restoreSharedButtonSuitePrelude(restored);\n', ''],
    ["  const { restoreSharedButtonCaseHelper, restoreSharedButtonStoreSuiteSource } = await import('./button-touch-registration.mjs');\n"
      + '  helper = restoreSharedButtonCaseHelper(helper);\n', ''],
    ["  const current = restoreSharedButtonStoreSuiteSource(fs.readFileSync(suite, 'utf8'));",
      "  const current = fs.readFileSync(suite, 'utf8').replaceAll('\\r\\n', '\\n');"],
  ];
  for (const [current, prior] of changes) { assert.equal(text.split(current).length, 2); text = text.replace(current, prior); }
  assert.equal(hash(text), 'cc5e6ba9a9dfd9abd7cdc61eec71e1241faf0ea978524ca26b49822f1ebe1bbb'); return text;
}
