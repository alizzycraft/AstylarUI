import assert from 'node:assert/strict';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { createRetainedFocusReviewReader } from '../../scripts/join-material-retained-pointer-focus.mjs';
import { sliderHoverHeldPredecessor, sliderHoverHeldCapture } from '../../scripts/join-material-slider-hover-held.mjs';
import { restoreSliderStateInputProducer } from './slider-state-registration.mjs';

export const sliderHoverHeldReview = 'c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

export function restoreSliderHoverHeldRetainedTest(source) {
  assert.equal(hash(source), '629426b43c9c9b022c89e1e161ef2cd24bc50ad698a28caf2c1365d1bfde70a4');
  const edits = [
    ["import { restoreSliderHoverHeldProducer } from './slider-hover-held-case-review-source.mjs';\n", ''],
    ['const current=collect(restoreSliderHoverHeldProducer(source)),previous=collect(prior);', 'const current=collect(source),previous=collect(prior);'],
  ];
  for (const [before, after] of edits) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  assert.equal(hash(source), '69186088c5f756679132657b9e89c39556076f666446c030fa749de044cfdd5b');
  return source;
}

export function restoreSliderHoverHeldSharedRegistration(source) {
  assert.equal(hash(source), '68db8454d18727ef1aeee13a39d1f96a619ae4389713b7d5c961d349f5d36654');
  for (const [begin, end] of [
    ['  // Newest export-selection boundary is shared by every historical caller.', "  if(kind==='case'||!text.includes('retainedFocus'))"],
    ['  // All historical provenance callers enter here.', "  if(!text.includes('retained focus producer inventory conservation'))"],
  ]) {
    const start = source.indexOf(begin), finish = source.indexOf(end, start);
    assert.ok(start >= 0 && finish > start); source = source.slice(0, start) + source.slice(finish);
  }
  const before = "export function restoreRetainedFocusProducer(source) {\n  let text=source.toString().replaceAll('\\r\\n','\\n');";
  const after = "export function restoreRetainedFocusProducer(source) {\n  const text=source.toString().replaceAll('\\r\\n','\\n');";
  assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  assert.equal(hash(source), '0c5e1521276c8721d245b7dfd8fbf12a11aa109162059897df298d2108ee033b');
  return source;
}

export function restoreSliderHoverHeldProducer(source) {
  const text = source.toString().replaceAll('\r\n', '\n');
  if (text.includes('Slider state input producer inventory conservation'))
    return restoreSliderHoverHeldProducer(restoreSliderStateInputProducer(text));
  assert.equal(hash(text), '4d6fe33dde4efeb07359040ab7c1ab6407f0825f804cd8df97efbc1a11a2b60f');
  const ast = ts.createSourceFile('producer.mjs', text, 99, true);
  const owner = name => ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  const proofs = owner('focusedProofInventory').body.statements[0].expression.elements;
  const files = owner('sourceFingerprints').body.statements[0].declarationList.declarations[0].initializer.elements;
  assert.equal(proofs.length, 285); assert.equal(files.length, 962);
  assert.equal(proofs[0].arguments[3].text, 'configured input focus dependency transition');
  assert.equal(proofs[6].arguments[3].text, 'Slider hover held producer inventory conservation');
  assert.equal(files[0].text, 'scripts/audit-material-configured-input-focus.mjs');
  assert.equal(files[6].text, 'tests/material-parity/slider-hover-held-case-review-source.spec.mjs');
  let prior = text;
  for (const [start, end] of [[proofs[0].getFullStart(), proofs[6].end + 1], [files[0].getFullStart(), files[6].end + 1]].sort((a, b) => b[0] - a[0]))
    prior = prior.slice(0, start) + prior.slice(end);
  assert.equal(hash(prior), '3aa377997071b510e233e95e7ad084c0413223fdc57ec833c5788f1c70a50ee7');
  return prior;
}

export function restoreSliderHoverHeldExportSource(source, kind) {
  const current = kind === 'runner' ? '69565e8cd8b0d0e5c464f5ba51a5244f4cb95575d51a34f9d82a06668ca8645d' : '652bdd20b22c306229b4f88e4dcaf014b431139d77d6ac11663b2ff225936876';
  const prior = kind === 'runner' ? '834e43c9f191e205b263bea230384211a058e80886d75e1188e076c5ec65a092' : 'a0e5c567becc970c55b86d32cbf4809b4330ee52023a1cb0c25135770489c06f';
  assert.ok(['runner', 'launcher'].includes(kind));
  assert.equal(hash(source), current);
  const replace = (before, after = '') => {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  };
  if (kind === 'runner') {
    replace("import { sliderHoverHeldReview, createSliderHoverHeldReviewReader } from '../tests/material-parity/slider-hover-held-case-review-source.mjs';\n");
    replace('    const effectiveReaderFactory = options.caseObligationReviewSha256===sliderHoverHeldReview ? createSliderHoverHeldReviewReader : finalReaderFactory;\n');
    replace('const applicability=effectiveReaderFactory?.', 'const applicability=finalReaderFactory?.');
  } else {
    replace("const sliderHoverHeld = rawRequested.includes('--slider-hover-held');\nassert.ok(!sliderHoverHeld || rawRequested.every(argument => ['--slider-hover-held', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n");
    replace("'--retained-focus', '--slider-hover-held'", "'--retained-focus'");
    replace('--retained-focus|--slider-hover-held]', '--retained-focus]');
    replace("if (sliderHoverHeld) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea.json';\n");
    replace("if (sliderHoverHeld) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=c0e397e0a5912d3f492c0d55a3d2b5421d6892f5403ba355c90560da6dbf2cea';\n");
  }
  assert.equal(hash(source), prior);
  return source;
}

// Only two reviewed test edits are reversed. Whole prior source authentication
// is mandatory;the adapter does not normalize arbitrary new changes away.
export function restoreSliderHoverHeldBenchmark(bytes) {
  assert.equal(hash(bytes), 'd4102f705bf61418286a18932697a5ab95a2e4bb507d237fe3b61bc6914c62ce');
  let source = bytes.toString();
  const start = source.indexOf("test('configured slider hover and held retain raw pointer boundaries without accepting paint'");
  const end = source.indexOf("test('retained public unchanged-root updates preserve semantic focus failure at both DPRs'");
  assert.ok(start >= 0 && end > start);
  source = source.slice(0, start) + source.slice(end);
  const additions = [
    '  // The new direct-owner probe supersedes this producer, not its historical\n  // captured bytes. Resolve only this exact source from the retained snapshot;\n  // the validator still authenticates it against the original capture receipt.\n',
    "  const originalProducer = Buffer.from(readFileSync('docs/evidence/material-configured-input-focus-runner-20261008.mjs.b64', 'utf8').trim(), 'base64');\n",
    "  assert.equal(createHash('sha256').update(originalProducer).digest('hex'), '307719402d9a19d5e9204ab0f7609e2d43bb52c14de9979c833e9ce5a644f089');\n",
  ];
  for (const addition of additions) {
    assert.equal(source.split(addition).length, 2); source = source.replace(addition, '');
  }
  const before = "    script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: Object.values(propertyGroups).flat(),\n    readBytes: absolute => absolute === path.resolve('scripts/audit-material-configured-input-focus.mjs') ? originalProducer : readFileSync(absolute) }),";
  const after = "    script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: Object.values(propertyGroups).flat() }),";
  assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  const restored = Buffer.from(source);
  assert.equal(hash(restored), '31f2cb8ec0aa6299e4854d07b70f8031e0e646a2a39812841e984e5a7098ab57');
  return restored;
}

export function createSliderHoverHeldReviewReader({ root, read, reviewSha256 }) {
  assert.equal(reviewSha256, sliderHoverHeldReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${reviewSha256}.json`);
  const envelope = JSON.parse(read(file));
  assert.equal(envelope.sha256, reviewSha256); assert.equal(hash(JSON.stringify(envelope.review)), reviewSha256);
  const captureBytes = read(path.resolve(root, sliderHoverHeldCapture.file));
  assert.equal(hash(captureBytes), sliderHoverHeldCapture.sha256);
  const capture = JSON.parse(captureBytes);
  let removed = 0;
  for (const group of envelope.review.groups) {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const activation = group.obligations.authoredActivation, child = activation.configuredSliderHoverHeld;
    if (!child) continue;
    const row = capture.results.find(row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}` === group.case);
    assert.ok(row); assert.equal(child.case, group.case); assert.equal(child.state, row.state);
    assert.equal(activation.disposition, 'partial');
    for (const side of ['reference', 'astylar']) assert.deepEqual(child.observations[side], row[side].observations);
    assert.deepEqual(child.evidence.report, sliderHoverHeldCapture);
    delete activation.configuredSliderHoverHeld; activation.disposition = 'evidence-join-pending'; removed++;
  }
  assert.equal(removed, 16);
  assert.equal(hash(JSON.stringify(envelope.review)), sliderHoverHeldPredecessor);
  const priorRead = (absolute, options) => {
    if (absolute === path.resolve(root, 'tests/material-parity/static-semantic-registration.mjs')) {
      const bytes = Buffer.from(restoreSliderHoverHeldSharedRegistration(read(absolute).toString()));
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    if (absolute === path.resolve(root, 'tests/material-parity/retained-pointer-focus-reuse.spec.mjs')) {
      const bytes = Buffer.from(restoreSliderHoverHeldRetainedTest(read(absolute).toString()));
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    if (absolute === path.resolve(root, 'tests/material-parity/input-equivalence-audit.mjs')) {
      const bytes = Buffer.from(restoreSliderHoverHeldProducer(read(absolute)));
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    for (const [file, kind] of [['scripts/run-material-input-audit.mjs', 'runner'], ['scripts/export-material-input-audit-current-ancestry.mjs', 'launcher']]) {
      if (absolute !== path.resolve(root, file)) continue;
      const bytes = Buffer.from(restoreSliderHoverHeldExportSource(read(absolute).toString(), kind));
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    if (absolute === path.resolve(root, 'tests/material-parity/benchmark-config.spec.mjs')) {
      const bytes = restoreSliderHoverHeldBenchmark(read(absolute));
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    if (absolute === path.resolve(root, 'scripts/audit-material-configured-input-focus.mjs')) {
      const bytes = Buffer.from(read(path.resolve(root, 'docs/evidence/material-configured-input-focus-runner-20261008.mjs.b64')).toString().trim(), 'base64');
      assert.equal(hash(bytes), '307719402d9a19d5e9204ab0f7609e2d43bb52c14de9979c833e9ce5a644f089');
      return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
    }
    return read(absolute, options);
  };
  const prior = createRetainedFocusReviewReader({ root, read: priorRead, reviewSha256: sliderHoverHeldPredecessor });
  return { read: prior.read, sourceApplicability: {
    mode: 'exact-slider-hover-held-successor', reviewSha256, children: removed,
    completePredecessorRecovered: true, predecessorApplicability: prior.sourceApplicability,
    boundary: 'Only16 raw-action children and pending-to-partial dispositions. Bounded prior-source restoration;no renderer,paint,current rendering or whole-case acceptance.',
  } };
}
