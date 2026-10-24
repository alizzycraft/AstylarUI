import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const hash = source => createHash('sha256').update(source).digest('hex');
const successor = {
  runner: '15654c97560e355b825b330116514e4e64a8d61769998e9eb7dca5e47e936928',
  launcher: '13a8ae61f8d0fb5f93d230a7a77da1ccd08d90c03cfa193d3d63d34c9e920f54',
  shared: '15893a03ee951b30da515610ac71a08fe30f0f68cef12a804034b43f3ad1d976',
  previousTest: '2fae33c53e46de9ac3839c561461ff00ed5348dea0191b99586a1796a8f0d9df',
};
const predecessor = {
  runner: '69565e8cd8b0d0e5c464f5ba51a5244f4cb95575d51a34f9d82a06668ca8645d',
  launcher: '652bdd20b22c306229b4f88e4dcaf014b431139d77d6ac11663b2ff225936876',
  shared: '68db8454d18727ef1aeee13a39d1f96a619ae4389713b7d5c961d349f5d36654',
  previousTest: '30e3cd3f3c40e5455787a1bd4b5c576f025639bf6b8f29591cfa4a85dc27b999',
};
const edit = (source, before, after = '') => {
  assert.equal(source.split(before).length, 2, before); return source.replace(before, after);
};

export function restoreSliderStateInputExportSource(source, kind) {
  assert.ok(['runner', 'launcher'].includes(kind));
  let text = source.toString().replaceAll('\r\n', '\n'); assert.equal(hash(text), successor[kind]);
  if (kind === 'runner') {
    text = edit(text, "import { sliderStateInputReview, createSliderStateInputReviewReader } from '../tests/material-parity/slider-state-input-review-source.mjs';\n");
    text = edit(text, '    const currentReaderFactory = options.caseObligationReviewSha256===sliderStateInputReview ? createSliderStateInputReviewReader : effectiveReaderFactory;\n');
    text = edit(text, 'const applicability=currentReaderFactory?.', 'const applicability=effectiveReaderFactory?.');
  } else {
    text = edit(text, "const sliderStateInputs = rawRequested.includes('--slider-state-inputs');\nassert.ok(!sliderStateInputs || rawRequested.every(argument => ['--slider-state-inputs', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n");
    text = edit(text, ".filter(argument => argument !== '--slider-state-inputs')");
    text = edit(text, '|--slider-state-inputs');
    text = edit(text, "if (sliderStateInputs) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json';\n");
    text = edit(text, "if (sliderStateInputs) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823';\n");
  }
  assert.equal(hash(text), predecessor[kind]); return text;
}

export function restoreSliderStateInputSharedRegistration(source) {
  let text = source.toString().replaceAll('\r\n', '\n'); assert.equal(hash(text), successor.shared);
  text = edit(text, '// Explicit historical population only. Production continues to use all193.', '// Explicit historical population only. Production continues to use all192.');
  const population = text.indexOf('  // Historical cohorts retain the complete accepted192-finding population.');
  const populationEnd = text.indexOf('  if (current.length <= 191)', population);
  assert.ok(population >= 0 && populationEnd > population); text = text.slice(0, population) + text.slice(populationEnd);
  const policy = text.indexOf('  // Remove only the exact newer Slider input finding before older policy stages.');
  const policyEnd = text.indexOf("  if (!text.includes('core-root-paint-depth-crosses-viewport-camera'))", policy);
  assert.ok(policy >= 0 && policyEnd > policy); text = text.slice(0, policy) + text.slice(policyEnd);
  text = edit(text, "export function restoreRootDepthPolicy(source) {\n  let text =", "export function restoreRootDepthPolicy(source) {\n  const text =");
  const begin = text.indexOf('  // Strip the newest selector at the shared owner,not at individual callers.');
  const end = text.indexOf('  // Newest export-selection boundary is shared by every historical caller.', begin);
  assert.ok(begin >= 0 && end > begin); text = text.slice(0, begin) + text.slice(end);
  assert.equal(hash(text), predecessor.shared); return text;
}

export function restoreSliderStateInputPreviousTest(source) {
  let text = source.toString().replaceAll('\r\n', '\n'); assert.equal(hash(text), successor.previousTest);
  text = edit(text, "import { restoreSliderStateInputExportSource, restoreSliderStateInputSharedRegistration } from './slider-state-registration.mjs';\n");
  text = edit(text, "  const shared = restoreSliderStateInputSharedRegistration(readFileSync('tests/material-parity/static-semantic-registration.mjs', 'utf8'));", "  const shared = readFileSync('tests/material-parity/static-semantic-registration.mjs', 'utf8');");
  text = edit(text, 'restoreSliderHoverHeldExportSource(restoreSliderStateInputExportSource(source, kind), kind)', 'restoreSliderHoverHeldExportSource(source, kind)');
  assert.equal(hash(text), predecessor.previousTest); return text;
}

export function restoreSliderStateInputPolicy(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(text), '1e7cb51d39ba3e93899143dddb081769b7569fe7b9ece610dc4b2da3543c38f4');
  const ast = ts.createSourceFile('policy.mjs', text, 99, true);
  const entries = ast.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .find(node => node.name.getText(ast) === 'sourceAuditDefinitions').initializer.arguments[0].elements;
  assert.equal(entries.length, 193);
  assert.equal(entries[192].arguments[0].properties.find(node => node.name?.getText(ast) === 'id').initializer.text,
    'fixture-slider-state-layer-composition');
  const prior = text.slice(0, entries[192].getFullStart()) + text.slice(entries[192].end + 1);
  assert.equal(hash(prior), 'bcd145e1efc0d45a4285420a8e8b0166ec102aaa8a921a532be30fba6a65c0f9');
  return prior;
}

export function restoreSliderStateInputPreviousTableTest(source) {
  let text = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(text), 'bafea9d957994b05a521da0a6110491ef9d35e2d0ae8388f1f606eb8668973f2');
  text = edit(text, "import { restoreSliderStateInputSharedRegistration } from './slider-state-registration.mjs';\n");
  text = edit(text, '  let source = restoreSliderStateInputSharedRegistration(normalize(fs.readFileSync(helper)));',
    '  let source = normalize(fs.readFileSync(helper));');
  assert.equal(hash(text), '99d0fe415834800b1ebdefbb076a2618ec2d1b79045e8e34910b0d73c9e1daa5');
  return text;
}
