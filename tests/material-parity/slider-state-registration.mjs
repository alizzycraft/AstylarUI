import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const hash = source => createHash('sha256').update(source).digest('hex');
const successor = {
  runner: '15654c97560e355b825b330116514e4e64a8d61769998e9eb7dca5e47e936928',
  launcher: '13a8ae61f8d0fb5f93d230a7a77da1ccd08d90c03cfa193d3d63d34c9e920f54',
  shared: '94a609398283ec790e66b236da2e5bdf6ac20a0c16951c70faa5c0c4f842fea2',
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
