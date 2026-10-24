import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createDividerOwnerFrameReviewReader, dividerOwnerFrameReview } from './divider-owner-frame-review-source.mjs';
import { joinMenuCompositeEvidence } from '../../scripts/join-material-menu-composite-evidence.mjs';
import { joinMenuAXEvidence } from '../../scripts/join-material-menu-ax-evidence.mjs';
import { joinMenuSemanticBoundaries } from '../../scripts/join-material-menu-semantic-boundaries.mjs';
import { joinSelectReadonlyEvidence, restoreSelectReadonlyEvidence, selectReadonlyPredecessor } from '../../scripts/join-material-select-readonly-evidence.mjs';
import { gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { materialInteractionCases } from './benchmark.config.mjs';

test('six retained disabled contexts preserve values while exposing native Select focusability difference', () => {
  const file = 'artifacts/material-parity/disabled-control-boundaries-20261025/latest-report.json';
  const hash = b => createHash('sha256').update(b).digest('hex');
  const bytes = readFileSync(file); assert.equal(hash(bytes), '654ef78a448876e3ac4ad84673017e49ed0ea1eff527d4c5230f3c515dc2d6bc');
  const report = JSON.parse(bytes);
  assert.deepEqual(report.results.map(r => r.family), ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker']);
  for (const row of report.results) {
    assert.equal(row.state, 'disabled'); assert.equal(row.profile, 'light'); assert.equal(row.viewport.id, 'desktop-dpr1');
    for (const side of ['reference', 'astylar']) {
      const result = row[side]; assert.deepEqual(result.runtime.errors, []);
      for (const key of ['inputTree', 'screenshot']) assert.equal(hash(readFileSync(result[key].file)), result[key].sha256);
      assert.deepEqual(result.observations.map(o => o.boundary), ['before', 'after-focus-attempt', 'after-pointer-attempt', 'after-key-attempt', 'settled']);
      for (const o of result.observations) {
        assert.equal(o.target.disabledState, true);
        assert.equal(o.activeEqualsTarget, row.family === 'select' && side === 'reference' && o.boundary === 'after-focus-attempt');
        assert.equal(o.target.value, result.observations[0].target.value);
        assert.equal(o.events.some(e => e.type === 'input' || e.type === 'change'), false);
        assert.equal(o.appEvents.some(e => e.type === 'input' || e.type === 'change'), false);
      }
    }
  }
  assert.equal(report.inputEquivalent, false); assert.equal(report.renderingEquivalent, false);
});

test('disabled editing cohorts have no configured focus or activation attempt in original and current action recipes', async () => {
  const hash = b => createHash('sha256').update(b).digest('hex');
  const original = gunzipSync(Buffer.from(readFileSync('docs/evidence/material-original-runner-e01.mjs.gz.b64', 'utf8').trim(), 'base64'));
  assert.equal(hash(original), 'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const families = ['form-field', 'input', 'autocomplete', 'select', 'datepicker', 'timepicker'];
  const cases = materialInteractionCases.filter(c => families.includes(c.family) && c.state === 'disabled');
  assert.equal(cases.length, 48);
  const receipts = {};
  for (const [revision, bytes] of Object.entries({ original, current: readFileSync('tests/material-parity/run-material-parity.mjs') })) {
    const ast = ts.createSourceFile('runner.mjs', bytes.toString(), 99, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    const methods = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'performInteraction');
    assert.equal(methods.length, 1);
    const method = methods[0].getText(ast);
    const perform = new Function(`return (${method});`)();
    let calls = 0;
    const page = new Proxy({}, { get() { calls++; throw new Error('Disabled action unexpectedly accesses browser'); } });
    for (const c of cases) for (const side of ['reference', 'astylar']) assert.equal(await perform(page, side, c), undefined);
    assert.equal(calls, 0);
    receipts[revision] = { sourceSha256: hash(bytes), actionMethodSha256: hash(method), sideInvocations: 96, browserAccesses: calls };
  }
  console.log(JSON.stringify({ disabledCases: cases.length, receipts, conclusion: 'Configured disabled endpoints are passive,no focus/activation rejection experiment. Does not establish surrounding setup or supplementary observer behavior.' }));
});

test('exact Select supplementary readonly evidence preserves all parent obligations and rejects forged receipts', () => {
  const reader = createDividerOwnerFrameReviewReader({ root: process.cwd(), read: readFileSync, reviewSha256: dividerOwnerFrameReview });
  const original = JSON.parse(reader.read(`artifacts/material-parity/working-audit/proposals/${dividerOwnerFrameReview}.json`)).review;
  const predecessor = joinMenuSemanticBoundaries(joinMenuAXEvidence(joinMenuCompositeEvidence(original).review).review).review;
  const hash = r => createHash('sha256').update(JSON.stringify(r)).digest('hex');
  assert.equal(hash(predecessor), selectReadonlyPredecessor);
  const joined = joinSelectReadonlyEvidence(predecessor);
  assert.equal(joined.cases, 1); assert.equal(joined.review.groups.length, 2311);
  assert.equal(hash(predecessor), selectReadonlyPredecessor);
  assert.equal(hash(restoreSelectReadonlyEvidence(joined.review)), selectReadonlyPredecessor);
  let changed = 0;
  joined.review.groups.forEach((group, index) => {
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    if (group === predecessor.groups[index]) return;
    changed++;
    assert.equal(group.case, 'interaction:select@light/desktop-dpr1/focus');
    const after = { ...group.obligations.authoredEditing }; delete after.supplementarySelectReadonlyHost;
    assert.deepEqual(after, predecessor.groups[index].obligations.authoredEditing);
    assert.match(group.obligations.authoredEditing.supplementarySelectReadonlyHost.boundary, /not original editing replay/);
  });
  assert.equal(changed, 1);
  assert.throws(() => joinSelectReadonlyEvidence(predecessor, file => file.endsWith('latest-report.json') ? Buffer.from('forged') : readFileSync(file)));
  assert.throws(() => joinSelectReadonlyEvidence(joined.review));
  console.log(JSON.stringify({ cases: joined.cases, reviewSha256: joined.sha256, predecessor: selectReadonlyPredecessor, boundary: 'Pending virtual join only; no canonical publication or case closure.' }));
});
