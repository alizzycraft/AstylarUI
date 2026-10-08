import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';

const hash = text => createHash('sha256').update(text).digest('hex');
// Historical replay only. Never use this reader for current capture or rendering acceptance.
export function readRetainedSortFocusSource(current = readFileSync('tests/material-parity/sort-focus-structure.spec.mjs')) {
  assert.equal(hash(current), '4a386f107cee16cb120910717a42b6ee9b40c724f02860b68a60ce29d4784f30', 'exact reviewed paint-proof snapshot');
  const original = execFileSync('git', ['show', '72b28c0e:tests/material-parity/sort-focus-structure.spec.mjs'], { maxBuffer: 4_000_000 });
  assert.equal(hash(original), '65d7256f859a0839cdf6364d8f3d4e2b81bdb32978c42e0afeaa27f2622e14ce');
  const statements = bytes => {
    const ast = ts.createSourceFile('sorter.mjs', bytes.toString().replaceAll('\r\n', '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    return new Map(ast.statements.map(node => [ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)
      && node.expression.expression.getText(ast) === 'test' ? node.expression.arguments[0].text : node.getText(ast).slice(0, 90), { node, ast }]));
  };
  const before = statements(original), after = statements(current);
  assert.equal(before.size, 49); assert.equal(after.size, 53);
  for (const [name, entry] of before) {
    assert.ok(after.has(name), `missing predecessor statement ${name}`);
    if (name !== 'dark mobile timepicker wheel separates scroll state from scrollbar paint')
      assert.equal(after.get(name).node.getText(after.get(name).ast), entry.node.getText(entry.ast));
    else {
      const assertions = ({ node, ast }) => {
        const calls = [];
        const visit = n => { if (ts.isCallExpression(n) && n.expression.getText(ast).startsWith('assert.')) calls.push(n.getText(ast)); ts.forEachChild(n, visit); };
        visit(node); return calls;
      };
      const currentAssertions = assertions(after.get(name));
      for (const call of assertions(entry)) assert.ok(currentAssertions.includes(call), `missing original scrollbar assertion ${call}`);
    }
  }
  return original;
}
const extendedKeyboardProof = "    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained extended keyboard cohorts replay original runtime tails and source preambles'/,\n" +
  "      'retained extended configured keyboard assertion boundary', 'Replays original runtime assertion blocks and source preambles for128 exact family/focus contexts across eight retained batches. Pins logs,original callbacks,served build,report/checkpoint and bounded current source dependencies. Preserves observed activation,navigation,range and modality failures. Not collection-time error callbacks,current paint,lifecycle or complete-case acceptance.'),\n";
const fieldPopupProof = "    proof(root, 'tests/material-parity/benchmark-config.spec.mjs', /test\\('remaining configured field popup bounds preserve exact actions and all eighty endpoints'/,\n      'configured field popup bounds and input applicability boundary', 'Authenticates eighty exact remaining autocomplete/select open endpoints, original runner actions, served assets,160 PNG/tree pairs and finite CSS anchor/popup/option bounds. Anchors and bounded popup layout inputs join to the original cases; native shorthand omissions remain explicit with matching recorded longhands. Preserves contrast/custom unequal anchor and size inputs. Not retrospective original pixel registration,current renderer equivalence,full paint,ancestor/lifetime or whole-case closure.'),\n";
const fieldPopupSource = "    'scripts/audit-material-configured-field-popup-bounds.mjs',\n";
// Historical source conservation only: authenticate the complete additive batch
// and its predecessor before the older registration reversals inspect the prefix.
export function restoreStandaloneProofBatch(source) {
  let current = source.toString().replaceAll('\r\n', '\n');
  if (!current.includes('public antialias option core constructor boundary')) return current;
  assert.equal(hash(current), 'f6614004ec5a22921aff26da51a9e0504208004c58270827005b3aaaeb9e8724',
    'exact complete standalone registration snapshot');
  const ast = ts.createSourceFile('producer.mjs', current, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const inventory = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'focusedProofInventory');
  const entries = inventory.body.statements[0].expression.elements;
  assert.equal(entries.length, 160);
  const names = ['public antialias option core constructor boundary', 'selected caret core visibility owner boundary',
    'actual Material selected caret temporal failure boundary', 'configured progress focus paint failure evidence boundary',
    'retained modal close versus removal attribution boundary'];
  names.forEach((name, i) => assert.equal(entries[i].arguments[3].text, name));
  current = current.slice(0, entries[0].getFullStart()) + current.slice(entries[5].getFullStart());
  for (const file of ['scripts/audit-modal-reentrant-close.mjs', 'scripts/audit-material-selection-pixels.mjs',
    'src/app/services/dom/input/text-cursor.renderer.ts']) {
    const line = `    '${file}',\n`;
    assert.equal(current.split(line).length, 2); current = current.replace(line, '');
  }
  assert.equal(hash(current), '61313972459b55cee6f966d936c45931874582fd7287b48893ce42ba191458bd',
    'complete accepted predecessor conserved after exact standalone additions');
  return current;
}
// Reverse only this exact registration; never substitute evidence for current rendering.
export function restoreFieldPopupProofRegistration(source) {
  let current = restoreStandaloneProofBatch(source);
  if (!current.includes("/test\\('remaining configured field popup bounds")) return current;
  assert.equal(current.split(fieldPopupProof).length, 2, 'exact field-popup observation proof registration');
  assert.equal(current.split(fieldPopupSource).length, 2, 'exact field-popup capture source registration');
  return current.replace(fieldPopupProof, '').replace(fieldPopupSource, '');
}
export function restoreExtendedKeyboardRegistration(source) {
  let current = restoreFieldPopupProofRegistration(source);
  if (current.includes('configured Menu anchor and input-owner evidence boundary')) {
    const header = 'function focusedProofInventory(root) {\n  return [\n';
    assert.equal(current.split(header).length, 2);
    const start = current.indexOf(header) + header.length;
    const end = current.indexOf("    proof(root, 'tests/material-parity/benchmark-config.spec.mjs', /test\\('configured input focus", start);
    assert.ok(end > start);
    assert.equal(hash(current.slice(start, end)), '32d3f01f1b8b9a643cb33e26ec3cb4ea492dd118169a5b43f41701e2cbaa4733',
      'exact four-entry Menu evidence registration; no altered acceptance');
    const files = "    'scripts/audit-material-configured-menu-bounds.mjs',\n    'scripts/audit-material-menu-actions.mjs',\n    'scripts/audit-material-menu-actions-reset.mjs',\n    'scripts/audit-material-menu-actions-remaining.mjs',\n    'scripts/audit-material-menu-keyboard-remainder.mjs',\n    'scripts/audit-material-menu-item-keys.mjs',\n    'tests/material-parity/benchmark-config.spec.mjs',\n";
    assert.equal(current.split(files).length, 2, 'exact seven Menu source dependencies');
    current = (current.slice(0, start) + current.slice(end)).replace(files, '');
  }
  if (current.includes('/test\\(\'configured input focus evidence')) {
    const header = 'function focusedProofInventory(root) {\n  return [\n';
    assert.equal(current.split(header).length, 2);
    const start = current.indexOf(header)+header.length;
    const end = current.indexOf("    proof(root, 'tests/material-parity/sort-focus-structure.spec.mjs'", start);
    assert.ok(end > start);
    assert.equal(hash(current.slice(start,end)), '16b54740814c8d03a8a02eabf48fd0886ba1928b5852a1374e3a7bea04579160',
      'exact configured focus and local selection two-proof registration');
    current = current.slice(0,start)+current.slice(end);
  }
  if (current.includes("/test\\('retained five-family caret edges")) {
    const header = 'function focusedProofInventory(root) {\n  return [\n';
    assert.equal(current.split(header).length, 2);
    const start = current.indexOf(header) + header.length;
    const end = current.indexOf("    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test", start);
    assert.ok(end > start);
    assert.equal(hash(current.slice(start, end)), 'd2216914e84eeb6ddcee63b9333b2e729fc3c0b19919aa2b6ae8ee98b88e0c6a',
      'exact two-entry retained caret and scrollbar paint batch');
    current = current.slice(0, start) + current.slice(end);
  }
  if (current.includes("/test\\('retained divider texel trace preserves")) {
    const header = 'function focusedProofInventory(root) {\n  return [\n';
    assert.equal(current.split(header).length, 2);
    const start = current.indexOf(header) + header.length;
    const end = current.indexOf(extendedKeyboardProof, start);
    assert.ok(end > start);
    assert.equal(hash(current.slice(start, end)), 'df99e9ee72a72cb9628c2b584d6e905808fdd41b6d6cb3991e235a57f20c935a',
      'exact four-entry retained evidence batch');
    current = current.slice(0, start) + current.slice(end);
  }
  if (!current.includes("/test\\('retained extended keyboard cohorts")) return current;
  assert.equal(current.split(extendedKeyboardProof).length, 2, 'exact extended keyboard registration');
  return current.replace(extendedKeyboardProof, '');
}
const configuredKeyboardProof = "    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('configured enabled keyboard evidence joins forty exact focus contexts without changing original assertions'/,\n" +
  "      'retained configured enabled keyboard routing authoring boundary', 'Joins40 exact configured focus contexts for checkbox,radio,chips,slide-toggle and expansion across four desktop profiles at DPR1/2. Replays original assertion callbacks over retained real Tab/Space/Arrow/Enter observations; candidate keydowns arrive but native activation/navigation transitions are omitted. Authenticates complete frozen build,report,helper and current mapped application source. Extends fixture-composite-keyboard-handler-omits-activation-and-navigation evidence without replacing its original receipts. Not focus paint,all keys,disabled states,lifetime or complete-case acceptance.'),\n";
const disabledRadioProof = "    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained disabled composite focus binds exact current authoring and radio-only Tab divergence'/,\n" +
  "      'retained disabled radio focus authoring boundary', 'Authenticates six checkbox/radio/switch contexts at light desktop DPR1 and dark mobile DPR2 with exact full current/frozen authored sources. Native disabled inputs skip Tab; candidate selected radio authors tabindex0 and receives focus,while checkbox/switch disabled-aware negative controls skip. State remains disabled/selected under Tab/Space/ArrowLeft. This is unequal authored focus intent,not blanket core aria-disabled suppression,all profiles,paint or full case acceptance.'),\n";
const progressCohortProof = "    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('retained progress focus caps and update disposal preserve complete configured cohort evidence'/,\n" +
  "      'configured progress focus cap and lifecycle evidence boundary', 'Authenticates40 configured cases joined to32 physical cohorts. All native hosts have tabindex=-1 and programmatic focus; candidate omits it and leaves BODY active despite supported core tabindex projection. Native spinner caps are butt; installed tubes have flat segmented caps,not spherical extensions. Three equivalent updates retain one unused owned root material per cohort without growth; sampled disposal clears resources. Preserves input/focus failure and redundant allocation,not fresh browser acceptance,equal cap paint,remount,isolation or complete-case closure.'),\n";
const svgProof = "    proof(root, 'tests/material-parity/icon-asset-input.spec.mjs', /test\\('retained original SVG upload failure binds public runtime and matched alpha controls'/,\n" +
  "      'original SVG GPU upload adaptation boundary', 'Matched public external SVG at24/48CSSpx DPR1/2 fails actual image texImage2D with1281 while ready and diagnostics remain misleading. Dimensioned SVG/PNG controls preserve alpha; decoded native image dimensions isolate upload adaptation without changing SVG bytes. Complete bounded loading/alpha owners match current source; not inline SVG support,currentColor inheritance,all-SVG or full Icon acceptance.'),\n";
export function restoreSvgProofRegistration(source) {
  let current = restoreExtendedKeyboardRegistration(source);
  if (current.includes("/test\\('configured enabled keyboard evidence joins")) {
    assert.equal(current.split(configuredKeyboardProof).length, 2, 'configured keyboard proof must be an exact one-entry addition');
    current = current.replace(configuredKeyboardProof, '');
  }
  if (current.includes("/test\\('retained disabled composite focus binds")) {
    assert.equal(current.split(disabledRadioProof).length, 2, 'disabled radio proof must be an exact one-entry addition');
    current = current.replace(disabledRadioProof, '');
  }
  if (current.includes("/test\\('retained progress focus caps and update disposal")) {
    assert.equal(current.split(progressCohortProof).length, 2, 'progress cohort proof must be an exact one-entry addition');
    current = current.replace(progressCohortProof, '');
  }
  if (!current.includes("/test\\('retained original SVG upload failure")) return current;
  assert.equal(current.split(svgProof).length, 2, 'SVG registration changed beyond the exact one-entry addition');
  const receipt = "    'tests/material-parity/icon-asset-input.spec.mjs',\n";
  assert.equal(current.split(receipt).length, 2, 'SVG source receipt must occur exactly once');
  return current.replace(svgProof, '').replace(receipt, '');
}
const dividerPaintProof = "    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('public divider typography reduction observes equal paragraph span inputs and opaque backing control'/,\n" +
  "      'equal-input divider typography paint boundary', 'Public14.4px normal paragraph/span reduction retains a paint counterexample at DPR1/2. Six bounded owners match current source; actual texture RGBA and baselines agree with controls. Backing and sampling models isolate post-canvas uncertainty,not full divider flow,confirmed GPU cause or case acceptance.'),\n";
const dividerRuntimeProof = "    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('retained divider responsive accessibility and replacement ownership preserve exact bounded observations'/,\n" +
  "      'retained divider responsive AX and desktop replacement ownership boundary', 'Authenticates16 tablet/mobile DPR1 separator AX observations and8 desktop profile/DPR1/2 replacement/disposal cohorts. Orientation agrees; three updates retain live=tracked resources and disposal clears sampled ownership. Retained checkpoint replay,not current rendering,late async,remount or complete-case acceptance.'),\n";
export function restoreDividerProofRegistration(source) {
  let current = restoreSvgProofRegistration(source);
  if (current.includes("/test\\('public divider typography reduction")) {
    assert.equal(current.split(dividerPaintProof).length, 2,
      'divider paint registration changed beyond the exact one-entry addition');
    current = current.replace(dividerPaintProof, '');
  }
  if (!current.includes("/test\\('retained divider responsive accessibility")) return current;
  assert.equal(current.split(dividerRuntimeProof).length, 2,
    'divider registration changed beyond the exact one-entry addition');
  return current.replace(dividerRuntimeProof, '');
}
const currentCaretTrackProofs = "    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('desktop five-family empty caret preserves native visibility and candidate blink evidence'/,\n" +
  "      'current light desktop five-family empty-caret visibility and ink boundary', 'Authenticates ten current-checkpoint populations at DPR1/2, sixty real Tab/delete timed boundaries and240 initial/hide rasters. Localized candidate blink strokes and native visible carets are present; captured authoring/normal/interaction/effective stages preserve omitted candidate caretColor versus native primary ink. This is bounded visibility/input attribution, not equal stroke geometry, sharpness, other themes/states or whole-case closure.'),\n" +
  "    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('public equal-input overflow isolates scrollbar gutter before projection'/,\n" +
  "      'public equal-input scrollbar track interaction diagnostic counterexample', 'Identical overflow auto/scroll boxes at DPR1/2 expose positive native held track scrolling versus zero candidate offsets. Complete installed/current scrollbar creation agrees; the core paints non-pickable indicators. The paired Material track observation independently targets underlying options. This is a missing core interaction capability, not a plugin offset or world-coordinate cause; local raster, other platforms and all-profile acceptance remain open.'),\n";
const tooltipOwnershipProof = "    proof(root, 'tests/material-parity/sort-focus-structure.spec.mjs', /test\\('ordinary tooltip repeated hover and leave exposes live ownership separately from tracked counts'/,\n" +
  "      'ordinary dark mobile tooltip live-material retention diagnostic counterexample', 'Current-full checkpoint-bound dark/mobile390x844 DPR2 actual hover/leave cycles open one paired tooltip and remove it each time. Tracked materials remain13/13/13 while live materials grow14/15/16 with accumulating unbound hover identities; final disposal clears sampled resources. The independently reduced public pointer-state proof supplies the core allocation cause. This retains a failed live plateau, not lifecycle acceptance, all-profile cleanup, GPU retention or user-visible lag attribution.'),\n";
const standaloneCoverageProof = "    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained standalone visibility disabled and selection cohorts preserve exact receipts and failures'/,\n" +
  "      'retained standalone visibility, disabled activation and popup selection evidence', 'Authenticates all 73 dependency/screenshot receipts across six snackbar desktop/mobile profiles, four tablet themes, five disabled fields and three popup-input selections. Exact visibility/action boundaries, unequal disabled suffix state and both original picker geometry failures remain asserted. Historical replay only; not current rendering acceptance, all-state paint, complete ownership or case inspection closure.'),\n";
// Reverse only the exact extraction of the unchanged production scalar stages.
// Whole-module equality remains mandatory before any older transition runs.
export function restorePassiveProofRegistration(source) {
  let current = restoreDividerProofRegistration(source);
  if (!current.includes("/test\\('current list wrapper inputs retain clipping and row-height divergence for all configured cases'/")) return current;
  const header = 'function focusedProofInventory(root) {\n  return [\n';
  assert.equal(current.split(header).length, 2, 'passive registration requires unique existing inventory');
  const start = current.indexOf(header) + header.length;
  const end = current.indexOf("    proof(root, 'tests/material-parity/sort-focus-structure.spec.mjs', /test\\('popup token ancestry", start);
  assert.ok(end > start, 'passive proofs must precede unchanged popup registration');
  assert.equal(hash(current.slice(start, end)),
    '1501bf00ae18fbc613480e741055025374d1fc5280b30e160d777de6d09fd7d6',
    'passive registration changed beyond the exact four-entry addition');
  return current.slice(0, start) + current.slice(end);
}

export function restoreScalarReviewExtraction(source) {
  let current = restorePassiveProofRegistration(source);
  if (current.includes("/test\\('popup token ancestry separates global fallback from frame theme overrides'/")) {
    const header = 'function focusedProofInventory(root) {\n  return [\n';
    assert.equal(current.split(header).length, 2, 'popup registration requires unique existing inventory');
    const start = current.indexOf(header) + header.length;
    const end = current.indexOf(currentCaretTrackProofs, start);
    assert.ok(end > start, 'popup registrations must precede the unchanged caret/track block');
    assert.equal(hash(current.slice(start, end)),
      '322af3e50175e2339d3ab0ff18b120b3078107ab892f6bad61f9c003b07e5c4b',
      'popup registration changed beyond the exact four-entry addition');
    current = current.slice(0, start) + current.slice(end);
  }
  if (current.includes(currentCaretTrackProofs)) {
    assert.equal(current.split(currentCaretTrackProofs).length, 2, 'repeated current caret/track registration');
    current = current.replace(currentCaretTrackProofs, '');
  }
  if (current.includes(tooltipOwnershipProof)) {
    assert.equal(current.split(tooltipOwnershipProof).length, 2, 'repeated tooltip ownership registration');
    current = current.replace(tooltipOwnershipProof, '');
  }
  if (current.includes(standaloneCoverageProof)) {
    assert.equal(current.split(standaloneCoverageProof).length, 2, 'repeated standalone coverage registration');
    current = current.replace(standaloneCoverageProof, '');
  }
  if (!current.includes('export function replayMaterialScalarReviewStages(')) return current;
  const header = 'export function replayMaterialScalarReviewStages(overlaySurfaceDiscrepancies, cases,\n  elementInventory, retainedTypography, controlTypography, ownerInitialStyleBinding) {\n';
  const end = '  return discrepancies;\n}\n\n';
  assert.equal(current.split(header).length, 2);
  const start = current.indexOf(header), finish = current.indexOf(end, start);
  assert.ok(finish > start);
  const body = current.slice(start + header.length, finish);
  const call = '  const discrepancies = replayMaterialScalarReviewStages(overlaySurfaceDiscrepancies, cases,\n    elementInventory, retainedTypography, controlTypography, ownerInitialStyleBinding);\n';
  let restored = current.slice(0, start) + current.slice(finish + end.length);
  assert.equal(restored.split(call).length, 2);
  restored = restored.replace(call, body);
  assert.equal(hash(restored), 'd6b8c67483d7e49eb9f6d6bedc765f58de0326b606b04a9dbd72b414c7e2a708',
    'scalar extraction changed production source beyond the exact function move');
  return restored;
}
export const borderEvidenceBaseline = '2cec29224f374d8d2e379d4f8486f3a8a8e078aa';
// These complete snapshots contain the reviewed heading, toggle-side and mapped
// border additions. This is not permission to ignore arbitrary module changes.
// Gap/caret/alignment consumers use the unchanged standalone selector helper.
export function verifyBorderEvidenceSourceTransition(previous, current) {
  const before = previous.toString().replaceAll('\r\n', '\n');
  const after = current.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(before), '3dbcf33ff70244a8179f438962a2549fb7e354948f084d35d433bcf82e76f9f4');
  let reviewed = after;
  if (hash(after) === 'd227f234f19e19e4f2ee3705d5fe6d239738fe5a33c49bdf44dae3822033f099') {
    const addition = /\/\/ The reset is explicit reference authoring, never an omitted initial value\.[\s\S]*?export function inspectMappedButtonBorderReset\([\s\S]*?\n\}\n\n/g;
    assert.equal([...after.matchAll(addition)].length, 1);
    reviewed = after.replace(addition, '');
  }
  // The second complete snapshot adds the tested mapped-reset membership path;
  // it does not alter the shared selector consumed by historical readers.
  assert.ok(['1acfdc0cccbf85ef396fac52a5a0fcf751eb1444a7676b53c1b861ff6af764cd',
    '0a999d524abedb0ed3c6a8665630905e3b9ed3650244a84960103e0cd4ee1f41',
    '7d8641713a314b41daf4447cc391755078ce4766732fb69fab13717de26a99c1',
    'bee460c11f87b7a319057bfa5e84b6521636d7f54af3aaf3eea2ca837eeb51fd',
    '444231b27424f96024d2fc1b63198fb5446205ce34b03e71663b22a60c6b97fc',
    'a809c257d8edcd07b1261cad6f7a0a15b5245fa0832922e4bebf287e21b6eff2'].includes(hash(reviewed)),
    'border evidence changed beyond the reviewed complete source snapshot');
  const selector = source => {
    const matches = [...source.matchAll(/export function selectorCanApply\(selector, authored\) \{[\s\S]*?\n\}/g)];
    assert.equal(matches.length, 1); return matches[0][0];
  };
  assert.equal(selector(before), selector(after), 'shared selector implementation changed');
  return { historicalSha256: hash(before), currentSha256: hash(after),
    completeSnapshotsAuthenticated: true, selectorSourceConserved: true };
}
export function restoreApplicabilityRegistration(source) {
  let restored = source.toString().replaceAll('\r\n', '\n');
  // This later append-only registration is already reversed by the mapped
  // border transition. Direct earlier-stage callers need the same exact
  // reversal before their unchanged complete predecessor digest is checked.
  const applicabilityRegistration = "    'scripts/diagnose-material-root-initial-receipt.mjs',\n" +
    "    'tests/material-parity/case-index-assertion-migration.mjs',\n";
  if (restored.includes("    'scripts/diagnose-material-root-initial-receipt.mjs',")) {
    assert.equal(restored.split(applicabilityRegistration).length, 2, 'exact applicability registration changed');
    restored = restored.replace(applicabilityRegistration, '');
  }
  return restored;
}
export function restoreStackingProducer(source) {
  const current = restoreScalarReviewExtraction(source);
  let restored = restoreApplicabilityRegistration(current);
  if (restored.includes(standaloneCoverageProof)) {
    assert.equal(restored.split(standaloneCoverageProof).length, 2, 'repeated standalone coverage registration');
    restored = restored.replace(standaloneCoverageProof, '');
  }
  // Seven registered standalone proofs add discovery only. Authenticate their
  // entire exact block before reversal; the complete historical hash below
  // still owns all prior logic, classifications and inventory entries.
  const standaloneProofStart = "    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\\('retained progress paint binds";
  if (restored.includes(standaloneProofStart)) {
    assert.equal(restored.split(standaloneProofStart).length, 2, 'repeated standalone proof batch');
    const from = restored.indexOf(standaloneProofStart);
    const to = restored.indexOf('  ];\n}\n', from);
    assert.ok(to > from, 'missing standalone proof inventory end');
    assert.equal(hash(restored.slice(from, to)),
      'f02f2bdb2fc17da8dcf452da8e855c55d6cb4b0f0d665cfdb45702252ad18232',
      'registered standalone proof batch changed');
    restored = restored.slice(0, from) + restored.slice(to);
  }
  const pointerProofStart = "    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('public button pointer states";
  if (restored.includes(pointerProofStart)) {
    assert.equal(restored.split(pointerProofStart).length, 2);
    const from = restored.indexOf(pointerProofStart);
    const to = restored.indexOf("    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('public equal-input overflow", from);
    assert.ok(to > from);
    assert.equal(hash(restored.slice(from, to)), '988e8e22172c945977ee52e0727c4249110f81941525eddefbf1bb55262f1af9', 'pointer lifecycle proof integration changed');
    restored = restored.slice(0, from) + restored.slice(to);
  }
  // Recent diagnostics add discovery and receipt validation, not historical
  // scalar classification. Authenticate each complete addition before reversal;
  // the unchanged full-predecessor hash below still rejects all other changes.
  const diagnosticInventory = "    'tests/material-parity/input-boundary-evidence.spec.mjs',\n    'tests/material-parity/sort-focus-structure.spec.mjs',\n";
  if (restored.includes(diagnosticInventory)) {
    assert.equal(restored.split(diagnosticInventory).length, 2);
    restored = restored.replace(diagnosticInventory, '');
  }
  for (const [start, end, expected] of [
    ['  // Source-backed diagnostic receipts are immutable evidence, not test-presence claims.\n',
      '  if (report.coverage.missingElements.length',
      '8e240baf9f8073815a08e06794582a0d047468bb86c7fc7049e8a2dc3c2bca6b'],
    ["    proof(root, 'tests/material-parity/input-boundary-evidence.spec.mjs', /test\\('public equal-input overflow",
      "    proof(root, 'src/parity/rounded-radius.audit.spec.ts',",
      'fb71f1027b9c03310778705c8f5b54ea85133717e3177947fb846ae43cb0964e'],
  ]) {
    if (!restored.includes(start)) continue;
    assert.equal(restored.split(start).length, 2, 'repeated diagnostic integration boundary');
    const from = restored.indexOf(start), to = restored.indexOf(end, from);
    assert.ok(to > from, 'missing diagnostic integration end');
    assert.equal(hash(restored.slice(from, to)), expected, 'reviewed diagnostic addition changed');
    restored = restored.slice(0, from) + restored.slice(to);
  }
  // Launch-module registration adds dependencies to the live inventory, not
  // classification logic. Reverse only the exact pair before authenticating
  // the complete historical producer; fresh capture policy is not conserved.
  const checkpointInventory = "    'tests/material-parity/run-checkpoint.mjs',\n    'tests/material-parity/run-checkpoint.spec.mjs',\n";
  if (restored.includes(checkpointInventory)) {
    assert.equal(restored.split(checkpointInventory).length, 2);
    restored = restored.replace(checkpointInventory, '');
  }
  // The import-order repair registers shared collector data; it changes no
  // producer calculations. Remove only that exact inventory addition before
  // authenticating the entire historical producer below.
  const sharedFontInventory = "    'scripts/material-container-font-targets.mjs',\n";
  if (restored.includes(sharedFontInventory)) {
    assert.equal(restored.split(sharedFontInventory).length, 2);
    restored = restored.replace(sharedFontInventory, '');
  }
  // Reverse only the reviewed reporting clarification; authenticate the full
  // historical producer below, including all calculations and classifications.
  for (const [before, after] of [
    ["The three captured Material identity-omission groups remain separately unresolved; this proof does not automatically attribute their output.",
      "The three captured Material identity-omission groups require separate final row evidence; this public core proof does not automatically attribute their output."],
  [
    "other motion/explicit-origin cases remain unresolved.",
    "other motion/explicit-origin cases are outside this bounded proof; consult their final row attributions."
  ],
  [
    "observations remain pending. Raw omissions",
    "observations were outside this bounded collector, not necessarily pending in the final audit. Raw omissions"
  ],
  [
    "motion observations remain unresolved. Independent source and classification coverage",
    "motion observations were outside this bounded review; their final attributions include the separate dialog-panel motion review. Independent source and classification coverage"
  ],
  [
    "`Visual parity is ${report.coverage.visualParityGreen ? 'green' : 'not green'}, but input equivalence",
    "`Retained capture visual parity is ${report.coverage.visualParityGreen ? 'green' : 'not green'}; this is not a fresh final-gate result. Input equivalence"
  ],
  [
    "Other contexts remain unresolved; equal line containers",
    "Other contexts require their own final row evidence; equal line containers"
  ],
  [
    "and other unreviewed typography differences remain unresolved.",
    "and this close-state proof does not classify other typography differences."
  ],
  [
    "    '## Focused evidence',\n    '',",
    "    '## Focused evidence',\n    '',\n    'These descriptions record the scope and limitations of individual proofs, including historical pending populations. They are not the aggregate current backlog: consult final row attributions and the summary counts. Classification does not establish rendering equivalence or remove a documented defect.',\n    '',"
  ]
]) {
    if (restored.includes(after)) {
      assert.equal(restored.split(after).length, 2, 'repeated reporting clarification');
      restored = restored.replace(after, before);
    }
  }
  if (restored.includes('import { applyFinalOwnerStyleReviews,')) {
    for (const [from, to] of [
      ["import { applyFinalOwnerStyleReviews, validateFinalOwnerStyleReviews } from './custom-owner-border-review.mjs';\n", ''],
      ['applyRemainingBorderReviews, applyFinalOwnerStyleReviews]', 'applyRemainingBorderReviews]'],
      ['      errors.push(...validateFinalOwnerStyleReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-final-owner-style-boundary'))\n    errors.push('final owner style attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated final owner style integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyRemainingBorderReviews,')) {
    for (const [from, to] of [
      ["import { applyRemainingBorderReviews, validateRemainingBorderReviews } from './custom-owner-border-review.mjs';\n", ''],
      ['applyExpansionTreeFormattingReviews, applyRemainingBorderReviews]', 'applyExpansionTreeFormattingReviews]'],
      ['      errors.push(...validateRemainingBorderReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-remaining-border-request-substitution'))\n    errors.push('remaining border attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated remaining border integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyExpansionTreeFormattingReviews,')) {
    for (const [from, to] of [
      ["import { applyExpansionTreeFormattingReviews, validateExpansionTreeFormattingReviews } from './display-request-review.mjs';\n", ''],
      ['applyTooltipShrinkReviews, applyExpansionTreeFormattingReviews]', 'applyTooltipShrinkReviews]'],
      ['      errors.push(...validateExpansionTreeFormattingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-expansion-tree-formatting-substitution', 'reviewed-expansion-text-alignment-observation-stage'].includes(row.attribution)))\n    errors.push('expansion/tree formatting attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated expansion/tree integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyTooltipShrinkReviews,')) {
    for (const [from, to] of [
      ["import { applyTooltipShrinkReviews, validateTooltipShrinkReviews } from './display-request-review.mjs';\n", ''],
      ['applyPanelVisibilityOwnership, applyTooltipShrinkReviews]', 'applyPanelVisibilityOwnership]'],
      ['      errors.push(...validateTooltipShrinkReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-tooltip-shrink-composition-substitution'))\n    errors.push('tooltip shrink attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated tooltip shrink integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyPanelVisibilityOwnership,')) {
    for (const [from, to] of [
      ["import { applyPanelVisibilityOwnership, validatePanelVisibilityOwnership } from '../../scripts/audit-material-panel-state-ownership.mjs';\n", ''],
      ['applyOverlayFlowReviews, applyPanelVisibilityOwnership]', 'applyOverlayFlowReviews]'],
      ['      errors.push(...validatePanelVisibilityOwnership(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-panel-visibility-state-owner-substitution'))\n    errors.push('panel visibility attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated panel visibility integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyOverlayFlowReviews,')) {
    for (const [from, to] of [
      ["import { applyOverlayFlowReviews, validateOverlayFlowReviews } from './overlay-position-request-review.mjs';\n", ''],
      ['applyDialogPanelGapReview, applyOverlayFlowReviews]', 'applyDialogPanelGapReview]'],
      ['      errors.push(...validateOverlayFlowReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-overlay-flow-composition-substitution', 'reviewed-overlay-alignment-observation-stage'].includes(row.attribution)))\n    errors.push('overlay flow attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated overlay flow integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyDialogPanelGapReview,')) {
    for (const [from, to] of [
      ["import { applyDialogPanelGapReview, validateDialogPanelGapReview } from './display-request-review.mjs';\n", ''],
      ['applyDialogActionSpacingReviews, applyDialogPanelGapReview]', 'applyDialogActionSpacingReviews]'],
      ['      errors.push(...validateDialogPanelGapReview(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-dialog-panel-gap-observation-stage'))\n    errors.push('dialog panel gap attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated dialog panel gap integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyDialogActionSpacingReviews,')) {
    for (const [from, to] of [
      ["import { applyDialogActionSpacingReviews, validateDialogActionSpacingReviews } from './display-request-review.mjs';\n", ''],
      ['applyToolbarSpacingReviews, applyDialogActionSpacingReviews]', 'applyToolbarSpacingReviews]'],
      ['      errors.push(...validateDialogActionSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-dialog-action-spacing-request-omission'))\n    errors.push('dialog action spacing attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated dialog action spacing integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyToolbarSpacingReviews,')) {
    for (const [from, to] of [
      ["import { applyToolbarSpacingReviews, validateToolbarSpacingReviews } from './display-request-review.mjs';\n", ''],
      ['applyChoiceSpacingReviews, applyToolbarSpacingReviews]', 'applyChoiceSpacingReviews]'],
      ['      errors.push(...validateToolbarSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-toolbar-spacing-composition-substitution'))\n    errors.push('toolbar spacing attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated toolbar spacing integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyChoiceSpacingReviews,')) {
    for (const [from, to] of [
      ["import { applyChoiceSpacingReviews, validateChoiceSpacingReviews } from './display-request-review.mjs';\n", ''],
      ['applyChipSpacingReviews, applyChoiceSpacingReviews]', 'applyChipSpacingReviews]'],
      ['      errors.push(...validateChoiceSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-choice-spacing-authoring-substitution'))\n    errors.push('choice spacing attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated choice spacing integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyChipSpacingReviews,')) {
    for (const [from, to] of [
      ["import { applyChipSpacingReviews, validateChipSpacingReviews } from './display-request-review.mjs';\n", ''],
      ['applyStepperSpacingReviews, applyChipSpacingReviews]', 'applyStepperSpacingReviews]'],
      ['      errors.push(...validateChipSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-chip-spacing-composition-substitution'))\n    errors.push('chip spacing attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated chip spacing integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyStepperSpacingReviews,')) {
    for (const [from, to] of [
      ["import { applyStepperSpacingReviews, validateStepperSpacingReviews } from './display-request-review.mjs';\n", ''],
      ['applyTooltipWordBreakReview, applyStepperSpacingReviews]', 'applyTooltipWordBreakReview]'],
      ['      errors.push(...validateStepperSpacingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-stepper-spacing-composition-substitution'))\n    errors.push('stepper spacing attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated stepper spacing integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyTooltipWordBreakReview,')) {
    for (const [from, to] of [
      ["import { applyTooltipWordBreakReview, validateTooltipWordBreakReview } from './wrapping-input-review.mjs';\n", ''],
      ['applySheetActionAppearance, applyTooltipWordBreakReview]', 'applySheetActionAppearance]'],
      ['      errors.push(...validateTooltipWordBreakReview(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-tooltip-word-break-public-support-gap'))\n    errors.push('tooltip word-break attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated tooltip word-break integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applySheetActionAppearance,')) {
    for (const [from, to] of [
      ["import { applySheetActionAppearance, validateSheetActionAppearance } from './control-state-paint-review.mjs';\n", ''],
      ['applyAppearanceOwnerBoundaries, applySheetActionAppearance]', 'applyAppearanceOwnerBoundaries]'],
      ['      errors.push(...validateSheetActionAppearance(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-sheet-action-appearance-substitution'))\n    errors.push('sheet appearance attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated sheet appearance integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyAppearanceOwnerBoundaries,')) {
    for (const [from, to] of [
      ["import { applyAppearanceOwnerBoundaries, validateAppearanceOwnerBoundaries } from './control-state-paint-review.mjs';\n", ''],
      ['applyRangeAppearanceInitial, applyAppearanceOwnerBoundaries]', 'applyRangeAppearanceInitial]'],
      ['      errors.push(...validateAppearanceOwnerBoundaries(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-appearance-owner-boundary'))\n    errors.push('appearance owner attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated appearance owner integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyRangeAppearanceInitial,')) {
    for (const [from, to] of [
      ["import { applyRangeAppearanceInitial, validateRangeAppearanceInitial } from './control-state-paint-review.mjs';\n", ''],
      ['applyMappedNonwidgetAppearance, applyRangeAppearanceInitial]', 'applyMappedNonwidgetAppearance]'],
      ['      errors.push(...validateRangeAppearanceInitial(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-range-appearance-initial-request'))\n    errors.push('range appearance attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated range appearance integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyMappedNonwidgetAppearance,')) {
    for (const [from, to] of [
      ["import { applyMappedNonwidgetAppearance, validateMappedNonwidgetAppearance } from './control-state-paint-review.mjs';\n", ''],
      ['applyCardShadowSyntax, applyMappedNonwidgetAppearance]', 'applyCardShadowSyntax]'],
      ['      errors.push(...validateMappedNonwidgetAppearance(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-mapped-nonwidget-appearance-initial-request'))\n    errors.push('mapped non-widget appearance attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated mapped appearance integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyFocusShadowSubstitutions,')) {
    for (const [from, to] of [
      ["import { applyFocusShadowSubstitutions, validateFocusShadowSubstitutions, applyCardShadowSyntax, validateCardShadowSyntax } from './control-state-paint-review.mjs';\n", ''],
      ['applyRangeVisibleOverflow, applyFocusShadowSubstitutions, applyCardShadowSyntax]', 'applyRangeVisibleOverflow]'],
      ...['validateFocusShadowSubstitutions', 'validateCardShadowSyntax'].map(name => [`      errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n`, '']),
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-focus-outline-shadow-substitution', 'reviewed-card-shadow-layer-serialization'].includes(row.attribution)))\n    errors.push('shadow attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated shadow integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyTableVisibleOverflow,')) {
    for (const [from, to] of [
      ["import { applyTableVisibleOverflow, validateTableVisibleOverflow, applyControlOverflowOwnerBoundaries, validateControlOverflowOwnerBoundaries, applyRangeVisibleOverflow, validateRangeVisibleOverflow } from './control-overflow-observation.mjs';\n", ''],
      ['applyTabPanelOverflowBoundary, applyTableVisibleOverflow, applyControlOverflowOwnerBoundaries, applyRangeVisibleOverflow]', 'applyTabPanelOverflowBoundary]'],
      ...['validateTableVisibleOverflow', 'validateControlOverflowOwnerBoundaries', 'validateRangeVisibleOverflow'].map(name => [`      errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n`, '']),
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-table-visible-overflow-initial-value', 'reviewed-control-overflow-owner-boundary', 'reviewed-range-visible-overflow-initial-value'].includes(row.attribution)))\n    errors.push('table and control overflow attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated table/control overflow integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyHeadingVisibleOverflow,')) {
    for (const [from, to] of [
      ["import { applyHeadingVisibleOverflow, validateHeadingVisibleOverflow, applyTabPanelOverflowBoundary, validateTabPanelOverflowBoundary } from './control-overflow-observation.mjs';\n", ''],
      ['applyListSpacingReviews, applyHeadingVisibleOverflow, applyTabPanelOverflowBoundary]', 'applyListSpacingReviews]'],
      ...['validateHeadingVisibleOverflow', 'validateTabPanelOverflowBoundary'].map(name => [`      errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n`, '']),
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-heading-visible-overflow-initial-value', 'reviewed-tab-panel-overflow-owner-boundary'].includes(row.attribution)))\n    errors.push('heading and tab overflow attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated overflow integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('import { applyBadgeMarginReviews,')) {
    for (const [from, to] of [
      ["import { applyBadgeMarginReviews, validateBadgeMarginReviews } from './authored-anchor-review.mjs';\n", ''],
      ["import { applySliderMarginReviews, validateSliderMarginReviews } from './slider-position-request-review.mjs';\n", ''],
      ["import { applyListSpacingReviews, validateListSpacingReviews } from './display-request-review.mjs';\n", ''],
      ["    ? [applyOwnerMaximumWidths, applyOmittedOwnerPaintRequests, applyBadgeMarginReviews, applySliderMarginReviews, applyListSpacingReviews]\n      .reduce((rows, apply) => apply(rows, cases, elementInventory, canonicalStyle), beforeOwnerOmissionReviews)", "    ? applyOmittedOwnerPaintRequests(applyOwnerMaximumWidths(beforeOwnerOmissionReviews, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)"],
      ...['validateBadgeMarginReviews', 'validateSliderMarginReviews', 'validateListSpacingReviews'].map(name => [`      errors.push(...${name}(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n`, '']),
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-badge-anchor-margin-substitution', 'reviewed-slider-margin-owner-boundary', 'reviewed-list-spacing-composition-substitution'].includes(row.attribution)))\n    errors.push('spacing composition review attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated spacing composition integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('const beforeOwnerOmissionReviews =')) {
    for (const [from, to] of [
      ["import { applyOmittedOwnerPaintRequests, validateOmittedOwnerPaintRequests } from './control-state-paint-review.mjs';\n", ''],
      ["import { applyOwnerMaximumWidths, validateOwnerMaximumWidths } from './control-width-observation.mjs';\n", ''],
      ["  const beforeOwnerOmissionReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
      ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyOmittedOwnerPaintRequests(applyOwnerMaximumWidths(beforeOwnerOmissionReviews, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : beforeOwnerOmissionReviews;\n", ''],
      ["      errors.push(...validateOwnerMaximumWidths(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
      ["      errors.push(...validateOmittedOwnerPaintRequests(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => ['reviewed-owner-maximum-width-omission', 'reviewed-owner-paint-request-omission'].includes(row.attribution)))\n    errors.push('owner omission review attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated owner omission integration fragment');
      restored = restored.replace(from, to);
    }
  }
  if (restored.includes('const beforeFullRadiusReviews =')) {
    for (const [from, to] of [
      ["import { applyFullRadiusActionReview, validateFullRadiusActionReview } from './authored-anchor-review.mjs';\n", ''],
      ["  const beforeFullRadiusReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
      ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyFullRadiusActionReview(beforeFullRadiusReviews, cases, elementInventory, canonicalStyle)\n    : beforeFullRadiusReviews;\n", ''],
      ["      errors.push(...validateFullRadiusActionReview(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(row => row.attribution === 'reviewed-full-radius-action-request-coverage-gap'))\n    errors.push('full-radius action review attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated full-radius integration fragment');
      restored = restored.replace(from, to);
    }
  }
  for (const [from, to] of [
    ["import { applyStackingReviews, validateStackingReviews, isStackingReviewRow } from './stacking-input-review.mjs';\n", ''],
    ["  const beforeStackingReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyStackingReviews(beforeStackingReviews, cases, elementInventory, canonicalStyle)\n    : beforeStackingReviews;\n", ''],
    ["      errors.push(...validateStackingReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isStackingReviewRow))\n    errors.push('stacking owner review attribution lacks bound original cases');\n", ''],
    ["    'src/parity/overlay-layout-stage.audit.spec.ts',\n    'scripts/audit-material-tooltip-keyboard.mjs',\n    'scripts/audit-material-tooltip-boundary.mjs',\n    'scripts/audit-material-snackbar-boundary.mjs',\n    'tests/material-parity/tooltip-position-composition.spec.mjs',\n    'tests/material-parity/stacking-input-review.mjs',\n    'tests/material-parity/stacking-input-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated stacking integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'a986934f89531f5553277617b4d9e03146bf5067e4de1a0a587661348f830393',
    'producer changed beyond reviewed stacking integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restorePreparedInputFollowupProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeStackingReviews =') ? restoreStackingProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyPreparedInputFollowups, validatePreparedInputFollowups, isPreparedInputFollowupRow } from './authored-anchor-review.mjs';\n", ''],
    ["  const beforePreparedInputFollowups = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyPreparedInputFollowups(beforePreparedInputFollowups, cases, elementInventory, canonicalStyle)\n    : beforePreparedInputFollowups;\n", ''],
    ["      errors.push(...validatePreparedInputFollowups(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isPreparedInputFollowupRow))\n    errors.push('prepared input followup attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/display-request-review.mjs',\n    'tests/material-parity/display-request-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated prepared input followup integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'aaf27f96aa92742f29a736e8f0dd5d658379c3cab0ad758ce71528d676cfd234',
    'producer changed beyond reviewed prepared input followup integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restorePreparedInputProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforePreparedInputFollowups =') ? restorePreparedInputFollowupProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyPreparedInputReviews, validatePreparedInputReviews, isPreparedInputReviewRow } from './authored-anchor-review.mjs';\n", ''],
    ["  const beforePreparedInputReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyPreparedInputReviews(beforePreparedInputReviews, cases, elementInventory, canonicalStyle)\n    : beforePreparedInputReviews;\n", ''],
    ["      errors.push(...validatePreparedInputReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isPreparedInputReviewRow))\n    errors.push('prepared input review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/authored-anchor-review.mjs',\n    'tests/material-parity/authored-anchor-review.spec.mjs',\n    'tests/material-parity/minimum-size-request-review.mjs',\n    'tests/material-parity/minimum-size-request-review.spec.mjs',\n    'tests/material-parity/text-transform-boundary-review.mjs',\n    'tests/material-parity/text-transform-boundary-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated prepared input integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '887cc07d4c7ddb92f5b548c5df90e8168045ff4f23a1d254ee40958959c180d0',
    'producer changed beyond reviewed prepared input integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreOwnerBoundaryProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforePreparedInputReviews =') ? restorePreparedInputProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyOwnerBoundaryReviews, validateOwnerBoundaryReviews, isOwnerBoundaryReviewRow } from './custom-owner-border-review.mjs';\n", ''],
    ["  const beforeOwnerBoundaryReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyOwnerBoundaryReviews(beforeOwnerBoundaryReviews, cases, elementInventory, canonicalStyle)\n    : beforeOwnerBoundaryReviews;\n", ''],
    ["      errors.push(...validateOwnerBoundaryReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isOwnerBoundaryReviewRow))\n    errors.push('owner boundary review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/custom-owner-border-review.mjs',\n    'tests/material-parity/custom-owner-border-review.spec.mjs',\n    'tests/material-parity/overlay-origin-request-review.mjs',\n    'tests/material-parity/overlay-origin-request-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated owner boundary integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'f8554c3fe36008b31acdb01afc03df2395a20b658436622ffed4104ff76b4b43',
    'producer changed beyond reviewed owner boundary integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreCaretPositionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeOwnerBoundaryReviews =') ? restoreOwnerBoundaryProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyCaretPositionReviews, validateCaretPositionReviews, isCaretPositionReviewRow } from './overlay-position-request-review.mjs';\n", ''],
    ["  const beforeCaretPositionReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyCaretPositionReviews(beforeCaretPositionReviews, cases, elementInventory, canonicalStyle)\n    : beforeCaretPositionReviews;\n", ''],
    ["      errors.push(...validateCaretPositionReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isCaretPositionReviewRow))\n    errors.push('caret/position review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/overlay-position-request-review.mjs',\n    'tests/material-parity/overlay-position-request-review.spec.mjs',\n    'tests/material-parity/grid-position-request-review.mjs',\n    'tests/material-parity/grid-position-request-review.spec.mjs',\n    'tests/material-parity/slider-position-request-review.mjs',\n    'tests/material-parity/slider-position-request-review.spec.mjs',\n    'tests/material-parity/component-motion-caret-review.spec.mjs',\n    'scripts/audit-material-range-caret-inputs.mjs',\n    'scripts/check-material-range-caret-inputs.mjs',\n    'scripts/audit-material-caret-motion-context.mjs',\n    'scripts/audit-material-overlay-caret-context.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated caret/position integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'c9c9d40b11944c40393c092fab2d85abf65fa8e847144a534334db2dc4b31c6c',
    'producer changed beyond reviewed caret/position integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreComponentInteractionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeCaretPositionReviews =') ? restoreCaretPositionProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyExplicitComponentCursors, validateComponentCursorReviews, isComponentCursorReviewRow } from './component-cursor-request-review.mjs';\n", ''],
    ["import { applyComponentPointerReviews, validateComponentPointerReviews, isComponentPointerReviewRow } from './component-pointer-events-review.mjs';\n", ''],
    ["  const beforeComponentInteractionReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyComponentPointerReviews(applyExplicitComponentCursors(beforeComponentInteractionReviews, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : beforeComponentInteractionReviews;\n", ''],
    ["      errors.push(...validateComponentCursorReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n      errors.push(...validateComponentPointerReviews(report.discrepancies, replayedRows, cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isComponentCursorReviewRow))\n    errors.push('component cursor review attribution lacks bound original cases');\n  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isComponentPointerReviewRow))\n    errors.push('component pointer review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/component-cursor-request-review.mjs',\n    'tests/material-parity/component-cursor-request-review.spec.mjs',\n    'tests/material-parity/component-pointer-events-review.mjs',\n    'tests/material-parity/component-pointer-events-review.spec.mjs',\n    'tests/material-parity/public-cursor-defaults-evidence.mjs',\n    'tests/material-parity/public-cursor-defaults.spec.mjs',\n    'scripts/audit-public-cursor-defaults.mjs',\n    'scripts/audit-material-slider-peer-pointer.mjs',\n    'tests/material-parity/slider-peer-pointer-survey.spec.mjs',\n    'docs/material-slider-peer-pointer-survey.json',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated cursor/pointer integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'ab0fc9df52cd03fba85791508828c8014d18a91952960186f13fa40d8e1b5365',
    'producer changed beyond reviewed cursor/pointer integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreComponentColorProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeComponentInteractionReviews =') ? restoreComponentInteractionProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyComponentColorReviews, validateComponentColorReviews, isComponentColorReviewRow } from './component-color-request-review.mjs';\n", ''],
    ["  const beforeComponentColorReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyComponentColorReviews(beforeComponentColorReviews, cases, elementInventory, retainedTypography, canonicalStyle)\n    : beforeComponentColorReviews;\n", ''],
    ["      errors.push(...validateComponentColorReviews(report.discrepancies, replayedRows, cases, report.elementInventory,\n        collectRetainedTypographyEvidence(cases.filter(e => ['sort', 'sidenav'].includes(e.family)), report.elementInventory), canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isComponentColorReviewRow))\n    errors.push('component color review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/component-color-request-review.mjs',\n    'tests/material-parity/component-color-request-review.spec.mjs',\n    'examples/material-showcase/src/app/range-color-default-audit.spec.ts',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated component color integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '3c45893048e7cebdcc34985eb9767b109f076048f1c33345c85cdef5ee457507',
    'producer changed beyond reviewed component color integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restorePaintReviewProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeComponentColorReviews =') ? restoreComponentColorProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyPaintReviews, validatePaintReviews, collectPaintReviewSources, isPaintReviewRow } from './control-state-paint-review.mjs';\n", ''],
    ["  const beforePaintReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyPaintReviews(beforePaintReviews, cases, elementInventory, retainedTypography, canonicalStyle, collectPaintReviewSources())\n    : beforePaintReviews;\n", ''],
    ["      errors.push(...validatePaintReviews(report.discrepancies, replayedRows, cases, report.elementInventory,\n        collectRetainedTypographyEvidence(cases.filter(e => e.family === 'stepper'), report.elementInventory),\n        canonicalStyle, collectPaintReviewSources()));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(isPaintReviewRow))\n    errors.push('paint review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/control-state-paint-review.mjs',\n    'tests/material-parity/control-state-paint-review.spec.mjs',\n    'tests/material-parity/overlay-trigger-paint-review.mjs',\n    'tests/material-parity/overlay-trigger-paint-review.spec.mjs',\n    'examples/material-showcase/src/app/range-background-default-audit.spec.ts',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated paint review integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '44c927d92f6033e3f5e9fe658e89be717d950235c56d4607f84573910ea0762c',
    'producer changed beyond reviewed paint integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreGridHeightReviewProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforePaintReviews =') ? restorePaintReviewProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyGridHeightReviews, validateGridHeightReviews, replayGridHeightPredecessors, isGridHeightReviewAttribution } from './mapped-grid-template-review.mjs';\n", ''],
    ["  const beforeGridHeightReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyGridHeightReviews(beforeGridHeightReviews, cases, elementInventory, canonicalStyle)\n    : beforeGridHeightReviews;\n", ''],
    ["      errors.push(...validateGridHeightReviews(report.discrepancies.filter(r => ['gridTemplateColumns', 'gridTemplateRows', 'height'].includes(r.property)),\n        replayGridHeightPredecessors(replayedRows, cases, report.elementInventory, canonicalStyle),\n        cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => isGridHeightReviewAttribution(d.attribution)))\n    errors.push('grid/height review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/mapped-grid-template-review.mjs',\n    'tests/material-parity/mapped-grid-template-review.spec.mjs',\n    'tests/material-parity/control-height-request-review.mjs',\n    'tests/material-parity/control-height-request-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated grid/height review integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'da1d8d901dbf5ab07bcaddfe3dffb38e8753fb9e50286be10a25d53e05ac862f',
    'producer changed beyond reviewed grid/height integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreBoxSizingReviewProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeGridHeightReviews =') ? restoreGridHeightReviewProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyBoxSizingReviews, validateBoxSizingReviews, replayBoxSizingPredecessors, boxSizingReviewAttributions } from './box-sizing-authoring-review.mjs';\n", ''],
    ["  const beforeBoxSizingReviews = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyBoxSizingReviews(beforeBoxSizingReviews, cases, elementInventory, canonicalStyle)\n    : beforeBoxSizingReviews;\n", ''],
    ["      errors.push(...validateBoxSizingReviews(report.discrepancies.filter(r => r.property === 'boxSizing'),\n        replayBoxSizingPredecessors(replayedRows, cases, report.elementInventory, canonicalStyle),\n        cases, report.elementInventory, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => boxSizingReviewAttributions.includes(d.attribution)))\n    errors.push('box-sizing review attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/box-sizing-authoring-review.mjs',\n    'tests/material-parity/box-sizing-authoring-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated box-sizing review integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '8e47117aace4e449d5da889eff7815fcc15ed5c6e9d98ebd5632f658379c4070',
    'producer changed beyond reviewed box-sizing integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreTypographyReviewProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeBoxSizingReviews =') ? restoreBoxSizingReviewProducer(current).restoredSource : current;
  for (const [from, to] of [
  [
    "import { applyTypographyReviews, validateTypographyReviews, replayTypographyPredecessors, typographyReviewAttributions } from './tracking-input-review.mjs';\n",
    ""
  ],
  [
    "  const beforeTypographyReviews = ownerInitialStyleBinding.status === 'bound'",
    "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"
  ],
  [
    "  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyTypographyReviews(beforeTypographyReviews, cases, elementInventory, retainedTypography, canonicalStyle)\n    : beforeTypographyReviews;\n",
    ""
  ],
  [
    "      errors.push(...validateTypographyReviews(report.discrepancies,\n        replayTypographyPredecessors(replayedRows, cases, report.elementInventory, report.retainedTypography, report.controlTypography, canonicalStyle),\n        cases, report.elementInventory, report.retainedTypography, canonicalStyle));\n",
    ""
  ],
  [
    "  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => typographyReviewAttributions.includes(d.attribution)))\n    errors.push('typography review attribution lacks bound original cases');\n",
    ""
  ],
  [
    "    'tests/material-parity/tracking-input-review.mjs',\n    'tests/material-parity/tracking-input-populations.spec.mjs',\n",
    ""
  ]
]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated typography review integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'c295dd6b865d549dac69d26482f6887fb2837a3b3b37cb5f83a70a8bd36909ea',
    'producer changed beyond reviewed typography integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreWrappingProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const beforeTypographyReviews =') ? restoreTypographyReviewProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyWrappingReviews, validateWrappingReviews, wrappingAttributions } from './wrapping-input-review.mjs';\n", ''],
    ["  const wrappingDiscrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyWrappingReviews(beforeNormalLineBoxScalars, cases, elementInventory, canonicalStyle)\n    : beforeNormalLineBoxScalars;\n", ''],
    ['applyNormalLineBoxScalar(wrappingDiscrepancies, cases', 'applyNormalLineBoxScalar(beforeNormalLineBoxScalars, cases'],
    ['    : wrappingDiscrepancies;\n', '    : beforeNormalLineBoxScalars;\n'],
    ['      errors.push(...validateWrappingReviews(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => wrappingAttributions.includes(d.attribution)))\n    errors.push('wrapping attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/wrapping-input-review.mjs',\n    'tests/material-parity/wrapping-input-populations.spec.mjs',\n    'examples/material-showcase/src/app/material-plugin/tab-panel-wrapping-audit.spec.ts',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated wrapping integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'bc16b5e694461acdc18580fa5fcd1169abc752dd78c80d841fb170a9587fe3cc',
    'producer changed beyond reviewed wrapping integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreAuthoredTypographyProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const wrappingDiscrepancies =') ? restoreWrappingProducer(current).restoredSource : current;
  if (restored.includes('visibleButtonOverflowAttribution')) {
    for (const [from, to] of [
      ["import { applyVisibleButtonOverflow, validateVisibleButtonOverflow, visibleButtonOverflowAttribution } from './control-overflow-observation.mjs';\n", ''],
      ['applyVisibleButtonOverflow(applyButtonAuthoredTypography(applyTabScalarTypography(modalDiscrepancies, cases, elementInventory, controlTypography, canonicalStyle), cases, elementInventory, controlTypography, canonicalStyle), cases, elementInventory, canonicalStyle)', 'applyButtonAuthoredTypography(applyTabScalarTypography(modalDiscrepancies, cases, elementInventory, controlTypography, canonicalStyle), cases, elementInventory, controlTypography, canonicalStyle)'],
      ['      errors.push(...validateVisibleButtonOverflow(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
      ['[tabScalarTypographyAttribution, buttonAuthoredTypographyAttribution, visibleButtonOverflowAttribution]', '[tabScalarTypographyAttribution, buttonAuthoredTypographyAttribution]'],
      ["    'tests/material-parity/button-overflow-initial.spec.mjs',\n    'scripts/audit-button-overflow-core.mjs',\n    'src/app/services/dom/input/button.manager.spec.ts',\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated button initial overflow integration fragment');
      restored = restored.replace(from, to);
    }
  }
  for (const [from, to] of [
    ["import { applyTabScalarTypography, validateTabScalarTypography, tabScalarTypographyAttribution } from './tab-scalar-typography.mjs';\n", ''],
    ["import { applyButtonAuthoredTypography, validateButtonAuthoredTypography, buttonAuthoredTypographyAttribution } from './normal-line-box-scalar.mjs';\n", ''],
    ["  const authoredTypographyDiscrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyButtonAuthoredTypography(applyTabScalarTypography(modalDiscrepancies, cases, elementInventory, controlTypography, canonicalStyle), cases, elementInventory, controlTypography, canonicalStyle)\n    : modalDiscrepancies;\n", ''],
    ['applyDialogTextFlow(authoredTypographyDiscrepancies, cases', 'applyDialogTextFlow(modalDiscrepancies, cases'],
    ['    : authoredTypographyDiscrepancies;\n', '    : modalDiscrepancies;\n'],
    ["      const authoredControlReplay = collectControlTypographyEvidence(cases.filter(c => ['tabs', 'toolbar', 'button'].includes(c.family)), report.elementInventory);\n      const authoredControlRows = control => control.differences.filter(d => ['reviewed-tab-label-typography-input', 'reviewed-toolbar-button-line-height-input', 'reviewed-disabled-button-ink'].includes(d.attribution));\n      if (JSON.stringify(authoredControlRows(report.controlTypography)) !== JSON.stringify(authoredControlRows(authoredControlReplay)))\n        errors.push('authored typography controls differ from original inventory replay');\n      errors.push(...validateTabScalarTypography(report.discrepancies, replayedRows, cases,\n        report.elementInventory, authoredControlReplay, canonicalStyle));\n      errors.push(...validateButtonAuthoredTypography(report.discrepancies, replayedRows, cases,\n        report.elementInventory, authoredControlReplay, canonicalStyle));\n", ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d =>\n      [tabScalarTypographyAttribution, buttonAuthoredTypographyAttribution].includes(d.attribution)))\n    errors.push('authored typography scalar attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/tab-scalar-typography.mjs',\n    'tests/material-parity/tab-scalar-typography-reuse.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated authored typography integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'dd0aac918933ee9aa60c9e0bae371d4f42aabe123791e95d6c4b17be49cf9ffa',
    'producer changed beyond reviewed authored typography integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restoreSnackbarOverflowProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('const authoredTypographyDiscrepancies =') ? restoreAuthoredTypographyProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applySnackbarPositionRequests, validateSnackbarPositionRequests } from './snackbar-position-observation.mjs';\n", ''],
    ["import { applyControlClippingRequests, validateControlClippingRequests, applyMappedVisibleOverflow, validateMappedVisibleOverflow } from './control-overflow-observation.mjs';\n", ''],
    ["    'tests/material-parity/snackbar-position-observation.mjs',\n    'tests/material-parity/snackbar-position-observation.spec.mjs',\n    'tests/material-parity/control-overflow-observation.mjs',\n    'tests/material-parity/control-overflow-observation.spec.mjs',\n", ''],
    ["  const beforeSnackbarOverflowRequests = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyMappedVisibleOverflow(applyControlClippingRequests(applySnackbarPositionRequests(beforeSnackbarOverflowRequests, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : beforeSnackbarOverflowRequests;\n", ''],
    ['      errors.push(...validateSnackbarPositionRequests(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateControlClippingRequests(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateMappedVisibleOverflow(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d =>\n      ['reviewed-snackbar-overlay-position-substitution', 'reviewed-snackbar-computed-offset-stage',\n        'reviewed-control-clipping-request-omission', 'reviewed-progress-overflow-computed-axis',\n        'reviewed-mapped-visible-overflow-initial-value'].includes(d.attribution)))\n    errors.push('snackbar and overflow attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated snackbar/overflow integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'd5d87c9a649b725f685bffe95f2c6d74bda6a2c4bf5bc8e0b22ba8a4c463a8fc',
    'producer changed beyond reviewed snackbar/overflow integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restoreWidthOverflowProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('beforeSnackbarOverflowRequests') ? restoreSnackbarOverflowProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyControlWidthRequests, validateControlWidthRequests, applyOmittedWidthObservations, validateOmittedWidthObservations, applyExplicitWidthCompositions, validateExplicitWidthCompositions } from './control-width-observation.mjs';\n", ''],
    ["import { applyOverlayOverflowRequests, validateOverlayOverflowRequests } from './overlay-overflow-observation.mjs';\n", ''],
    ["    'tests/material-parity/control-width-observation.mjs',\n    'tests/material-parity/control-width-observation.spec.mjs',\n    'tests/material-parity/overlay-overflow-observation.mjs',\n    'tests/material-parity/overlay-overflow-observation.spec.mjs',\n", ''],
    ["  const beforeWidthOverflowRequests = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyOverlayOverflowRequests(applyExplicitWidthCompositions(applyOmittedWidthObservations(applyControlWidthRequests(beforeWidthOverflowRequests, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : beforeWidthOverflowRequests;\n", ''],
    ['      errors.push(...validateControlWidthRequests(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateOmittedWidthObservations(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateExplicitWidthCompositions(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateOverlayOverflowRequests(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d =>\n      ['reviewed-control-fixed-width-authoring', 'reviewed-omitted-width-observation-stage',\n        'reviewed-explicit-width-composition-substitution', 'reviewed-dialog-overflow-computed-axis',\n        'reviewed-overlay-overflow-request-omission'].includes(d.attribution)))\n    errors.push('width and overflow attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated width/overflow integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'cdffcae2fdac88767983cc7f26cdb0428ca358f5fa8ab54521b590cc74b96771',
    'producer changed beyond reviewed width/overflow integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restoreControlPositionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('beforeWidthOverflowRequests') ? restoreWidthOverflowProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyChipPositionRequests, validateChipPositionRequests } from './control-position-observation.mjs';\n", ''],
    ["import { applyButtonOffsetObservations, validateButtonOffsetObservations } from './control-position-observation.mjs';\n", ''],
    ["    'tests/material-parity/control-position-observation.mjs',\n", ''],
    ["  const beforeControlPositionRequests = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyButtonOffsetObservations(applyChipPositionRequests(beforeControlPositionRequests, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : beforeControlPositionRequests;\n", ''],
    ['      errors.push(...validateChipPositionRequests(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateButtonOffsetObservations(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d =>\n      ['reviewed-chip-position-request-omission', 'reviewed-chip-computed-offset-stage',\n        'reviewed-button-computed-offset-stage'].includes(d.attribution)))\n    errors.push('control position attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated control position integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '56532a01e43cb1ec9428515e58aa761d609f635cbbee15387de62b4d6a832c2a',
    'producer changed beyond reviewed control position integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restoreModalPositionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('beforeControlPositionRequests') ? restoreControlPositionProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyDialogPositionRequests, validateDialogPositionRequests, applyBottomSheetPositionRequests, validateBottomSheetPositionRequests } from './modal-position-inspection.mjs';\n", ''],
    ["  const beforeModalPositionRequests = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyBottomSheetPositionRequests(applyDialogPositionRequests(beforeModalPositionRequests, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : beforeModalPositionRequests;\n", ''],
    ['      errors.push(...validateDialogPositionRequests(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateBottomSheetPositionRequests(report.discrepancies,\n        applyBottomSheetActionLayout(replayedRows, cases, report.elementInventory, canonicalStyle), cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d =>\n      ['reviewed-dialog-position-request-omission', 'reviewed-dialog-computed-offset-stage',\n        'reviewed-bottom-sheet-position-request-omission', 'reviewed-bottom-sheet-computed-offset-stage'].includes(d.attribution)))\n    errors.push('modal position attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated modal position integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'f78d198a7d5830283ffd3ac50efae1b5d3de7ba31e48f70e9de74bcebda172ed',
    'producer changed beyond reviewed modal position integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restoreInteractiveWeightProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('beforeModalPositionRequests') ? restoreModalPositionProducer(current).restoredSource : current;
  // The generic weight fallback must follow existing source-reviewed claims.
  // Restore only its two exact routing predicates; the full hash below still
  // rejects any other production change.
  if (restored.includes("['appearance', 'color', 'fontWeight'].includes(property)")) {
    assert.equal(restored.split("['appearance', 'color', 'fontWeight'].includes(property)").length, 3);
    restored = restored.replaceAll("['appearance', 'color', 'fontWeight'].includes(property)",
      "['appearance', 'color'].includes(property)");
  }
  restored = restored.replace("glyph paint.' +\n      (interactiveWeight ? ' Interactive weight evidence is grouped separately from static observations; current pseudo-state paint remains unverified.' : ''),", "glyph paint.',");
  for (const [from, to] of [
    ["  const interactiveWeight = !!benchmarkCase.state && property === 'fontWeight' && reference === '400' &&\n    ['checkbox', 'radio', 'slide-toggle'].includes(benchmarkCase.family) &&\n    evidence?.case === caseKey(benchmarkCase) && evidence.family === benchmarkCase.family &&\n    evidence.state === benchmarkCase.state && evidence.source === 'core-text-registry' &&\n    Number.isInteger(evidence.revision) && evidence.revision >= 0 && evidence.currentPseudoStatePaintVerified === false;\n", ''],
    ['  if ((benchmarkCase.state && !interactiveWeight) || astylar !== undefined', '  if (benchmarkCase.state || astylar !== undefined'],
    ['      source: evidence.source, revision: evidence.revision, property, values,\n      ...(interactiveWeight ? { currentPseudoStatePaintVerified: false, inputEquivalent: false, renderingEquivalent: false } : {}) },',
      '      source: evidence.source, revision: evidence.revision, property, values },'],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated interactive weight fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'ca9c7a97970356ef3a67f1cac30726180318e24e023b80a17e3d1c323a9de445',
    'producer changed beyond reviewed interactive weight stage comparison');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreMappedButtonResetProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('  const interactiveWeight =') ? restoreInteractiveWeightProducer(current).restoredSource : current;
  if (restored.includes('  const beforeCardBorderTokens =')) {
    for (const [from, to] of [
      ['  applyCardBorderToken, validateCardBorderToken, cardBorderTokenAttribution,\n', ''],
      ["  const beforeCardBorderTokens = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
      ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyCardBorderToken(beforeCardBorderTokens, cases, elementInventory, canonicalStyle)\n    : beforeCardBorderTokens;\n", ''],
      ['      errors.push(...validateCardBorderToken(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
      ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === cardBorderTokenAttribution))\n    errors.push('card border token attribution lacks bound original cases');\n", ''],
    ]) {
      assert.equal(restored.split(from).length, 2, 'missing or repeated card border integration fragment');
      restored = restored.replace(from, to);
    }
    assert.equal(hash(restored), 'dba5d048f6a59991de52c79c39b20703c49e49c4cb25c25071f444bea59e8277',
      'producer changed beyond reviewed card border integration');
  }
  for (const [from, to] of [
    ['  applyMappedButtonBorderReset, validateMappedButtonBorderReset, mappedButtonBorderResetAttribution,\n', ''],
    ["  const beforeMappedButtonResets = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyMappedButtonBorderReset(beforeMappedButtonResets, cases, elementInventory, canonicalStyle)\n    : beforeMappedButtonResets;\n", ''],
    ['      errors.push(...validateMappedButtonBorderReset(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === mappedButtonBorderResetAttribution))\n    errors.push('mapped button reset attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated mapped reset integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '9be3c2759e00aeda6ce6ece68423598b0a74401f2576e21d00f09aee4c85d10a',
    'producer changed beyond reviewed mapped reset integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}

export function restoreMappedBorderInitialProducer(source) {
  const current = restoreScalarReviewExtraction(source);
  const applicabilityRegistration = "    'scripts/diagnose-material-root-initial-receipt.mjs',\n" +
    "    'tests/material-parity/case-index-assertion-migration.mjs',\n";
  const hasApplicabilityRegistration = current.includes(applicabilityRegistration);
  if (hasApplicabilityRegistration) assert.equal(current.split(applicabilityRegistration).length, 2);
  const predecessor = hasApplicabilityRegistration ? current.replace(applicabilityRegistration, '') : current;
  // The existing complete restored digest below authenticates this exact
  // append-only inventory change as well as all earlier producer transitions.
  let restored = predecessor.includes('  const beforeMappedButtonResets =') ? restoreMappedButtonResetProducer(predecessor).restoredSource : predecessor;
  for (const [from, to] of [
    ['  applyMappedBorderInitial, validateMappedBorderInitial, mappedBorderInitialAttribution,\n', ''],
    ["  const beforeMappedBorderInitials = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyMappedBorderInitial(beforeMappedBorderInitials, cases, elementInventory, canonicalStyle)\n    : beforeMappedBorderInitials;\n", ''],
    ['      errors.push(...validateMappedBorderInitial(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === mappedBorderInitialAttribution))\n    errors.push('mapped border initial attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated mapped border integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'f2ef21859fbacba4894bdb5efdd45438f41ff05860a6206df73d9bfd325197cb',
    'producer changed beyond reviewed mapped border integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreToggleSideColorProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('  const beforeMappedBorderInitials =') ? restoreMappedBorderInitialProducer(current).restoredSource : current;
  for (const [from, to] of [
    ['entry.reference !== (proof.referenceColors?.[entry.property] ?? proof.referenceColor)', 'entry.reference !== proof.referenceColor'],
    ['(item.referenceColors?.[entry.property] ?? item.referenceColor) === entry.reference', 'item.referenceColor === entry.reference'],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated toggle side-color validation fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), 'a9f8e8861c582687024475d8b63a0cd5fc30a69ec4667a97cdb6b3baae25ab20',
    'producer changed beyond reviewed toggle side-color validation');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreSidenavBackgroundScalarProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('proof.referenceColors?.[entry.property]') ? restoreToggleSideColorProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["  classifyRootBackgroundInput, validateRootBackgroundClassifications, rootBackgroundAttribution,\n  applySidenavBackgroundScalar, validateSidenavBackgroundScalar, sidenavBackgroundAttribution } from './root-background-classification-preparation.mjs';",
      "  classifyRootBackgroundInput, validateRootBackgroundClassifications, rootBackgroundAttribution } from './root-background-classification-preparation.mjs';"],
    ["  const beforeSidenavBackgroundScalars = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applySidenavBackgroundScalar(beforeSidenavBackgroundScalars, cases, elementInventory, canonicalStyle)\n    : beforeSidenavBackgroundScalars;\n", ''],
    ['      errors.push(...validateSidenavBackgroundScalar(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === sidenavBackgroundAttribution))\n    errors.push('sidenav background scalar attribution lacks bound original cases');\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated sidenav background integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '52b9416a468d4bfb601ab682e598c289ae0c4e97a4b483090b9fe867985c61ff',
    'producer changed beyond reviewed sidenav background integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreRetainedFontScalarProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes('  const beforeSidenavBackgroundScalars =') ? restoreSidenavBackgroundScalarProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyRetainedFontScalar, validateRetainedFontScalar, retainedFontScalarAttribution } from './retained-font-scalar.mjs';\n", ''],
    ["  const beforeRetainedFontScalars = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyRetainedFontScalar(beforeRetainedFontScalars, cases, elementInventory, retainedTypography, canonicalStyle)\n    : beforeRetainedFontScalars;\n", ''],
    ['      errors.push(...validateRetainedFontScalar(report.discrepancies, replayedRows, cases,\n        report.elementInventory, report.retainedTypography, canonicalStyle));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === retainedFontScalarAttribution))\n    errors.push('component font scalar attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/retained-font-scalar.mjs',\n    'tests/material-parity/retained-font-scalar.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated retained-font scalar integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '14095dd051f70abbf93b83571d62d781d5c5f33e173c809e498ced4e93ac716b',
    'producer changed beyond reviewed retained-font scalar integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export function restoreNormalLineBoxScalarProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes("from './retained-font-scalar.mjs'") ? restoreRetainedFontScalarProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["import { applyNormalLineBoxScalar, validateNormalLineBoxScalar, normalLineBoxScalarAttribution } from './normal-line-box-scalar.mjs';\n", ''],
    ["  const beforeNormalLineBoxScalars = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'"],
    ["  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyNormalLineBoxScalar(beforeNormalLineBoxScalars, cases, elementInventory, controlTypography)\n    : beforeNormalLineBoxScalars;\n", ''],
    ['      errors.push(...validateNormalLineBoxScalar(report.discrepancies, replayedRows, cases,\n        report.elementInventory, report.controlTypography));\n', ''],
    ["  if (report.ownerInitialStyleBinding?.status !== 'bound' && report.discrepancies?.some(d => d.attribution === normalLineBoxScalarAttribution))\n    errors.push('button-host line-height attribution lacks bound original cases');\n", ''],
    ["    'tests/material-parity/normal-line-box-scalar.mjs',\n    'tests/material-parity/normal-line-box-scalar.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated normal-line-box scalar integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '383e243a07218768ffddc7f1801da7c001f66e802c693ebd59effce4d1999f6c',
    'producer changed beyond reviewed scalar line-box integration');
  return {restoredSource:restored,previousModuleSha256:hash(restored),currentModuleSha256:hash(current)};
}
// Authenticate the complete predecessor, not just the lines we expect to change.
export function restoreOriginMotionProducer(source) {
  const current = source.toString().replaceAll('\r\n', '\n');
  let restored = current.includes("from './normal-line-box-scalar.mjs'") ? restoreNormalLineBoxScalarProducer(current).restoredSource : current;
  for (const [from, to] of [
    ["collectOriginStageEvidence(originStageBinding.status === 'bound' ? cases : [], elementInventory, canonicalStyle, { reviewedDisjointMotion: true })", "collectOriginStageEvidence(originStageBinding.status === 'bound' ? cases : [], elementInventory, canonicalStyle)"],
    ['validateOriginStageEvidence(report.originStageEvidence, report.elementInventory, report.discrepancies, canonicalStyle, { reviewedDisjointMotion: true })', 'validateOriginStageEvidence(report.originStageEvidence, report.elementInventory, report.discrepancies, canonicalStyle)'],
    ['validateOriginStageSource(report.originStageBinding, report.originStageEvidence, { root, canonicalStyle, reviewedDisjointMotion: true })', 'validateOriginStageSource(report.originStageBinding, report.originStageEvidence, { root, canonicalStyle })'],
    ['Explicit disjoint motion targets receive guarded stage review; other motion/explicit-origin cases remain unresolved. No candidate used origin', 'Motion/explicit-origin cases remain unresolved; no candidate used origin'],
    ["    'tests/material-parity/origin-motion-stage-review.spec.mjs',\n", ''],
  ]) {
    assert.equal(restored.split(from).length, 2, 'missing or repeated origin motion integration fragment');
    restored = restored.replace(from, to);
  }
  assert.equal(hash(restored), '16de9bd146280fbbc29d81fdb4c88bf0376672aae9121667e138339b21fe0a8a',
    'producer changed beyond reviewed origin motion integration');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(current) };
}
export const positionFollowupProducerFiles = [
  'tests/material-parity/position-followup-audit-source-binding.mjs',
  'tests/material-parity/position-followup-audit-source-binding.spec.mjs',
  'tests/material-parity/position-followup-review.mjs',
  'tests/material-parity/position-followup-review.spec.mjs',
  'tests/material-parity/position-followup-review-integration.spec.mjs',
  'tests/material-parity/tooltip-position-composition.mjs',
  'scripts/audit-material-tab-position-substitution.mjs',
  'scripts/audit-material-stepper-position-substitution.mjs',
  'tests/material-parity/radio-position-substitution.mjs',
  'tests/material-parity/static-position-observation.mjs',
  'tests/material-parity/choice-label-stacking-substitution.mjs',
  'docs/material-tooltip-position-composition.json',
  'docs/material-tab-position-substitution.json',
  'docs/material-stepper-position-substitution.json',
  'docs/material-radio-position-substitution.json',
  'docs/material-static-position-observation.json',
  'docs/material-choice-label-stacking-substitution.json',
];
export const positionProducerFiles = [
  "tests/material-parity/position-composition-audit-source-binding.mjs",
  "tests/material-parity/position-composition-audit-source-binding.spec.mjs",
  "tests/material-parity/position-composition-review.mjs",
  "tests/material-parity/position-composition-review.spec.mjs",
  "tests/material-parity/position-composition-producer-transition.mjs",
  "tests/material-parity/position-composition-producer-transition.spec.mjs",
  "scripts/audit-material-grid-position-substitution.mjs",
  "scripts/audit-material-flow-position-substitutions.mjs",
  "scripts/audit-material-position-population.mjs",
  "tests/material-parity/grid-position-substitution.spec.mjs",
  "tests/material-parity/flow-position-substitutions.spec.mjs",
  "tests/material-parity/position-input-population.spec.mjs",
  "docs/material-grid-position-substitution.json",
  "docs/material-flow-position-substitutions.json",
  "docs/material-position-input-population.json"
];
// Remove only the reviewed appearance fallback relocation. The complete
// predecessor hash rejects any accompanying unreviewed producer change.
export function restoreAppearancePrecedence(source) {
  const actual = source.toString().replaceAll('\r\n', '\n');
  let current = actual.includes('reviewedDisjointMotion: true') ? restoreOriginMotionProducer(actual).restoredSource : actual;
  if (current.includes("!['appearance', 'color'].includes(property)")) {
    for (const [from, to] of [
      ["!['appearance', 'color'].includes(property)", "property !== 'appearance'"],
      ["['appearance', 'color'].includes(property)", "property === 'appearance'"],
      ["    'tests/material-parity/root-color-descendant-evidence.mjs',\n    'tests/material-parity/root-color-descendant-evidence.spec.mjs',\n", ''],
    ]) {
      assert.equal(current.split(from).length, 2, 'missing or repeated descendant color integration fragment');
      current = current.replace(from, to);
    }
    assert.equal(hash(current), 'cc05565c29174a385ee16c14a507d351b06d14730da88f0ba4e454af68c2746e',
      'producer changed beyond descendant color fallback and source inventory');
  }
  const early = "        if (property !== 'appearance' && classification.attribution === 'unresolved') classification = classifyOwnerInitialStyleInput(";
  const late = "        // Appearance is newly admitted generic observation-stage evidence.\n        // Preserve specific source-reviewed findings (including mismatched\n        // measurement owners) before considering that fallback. Keep the\n        // historical eight-property precedence unchanged.\n        if (property === 'appearance' && classification.attribution === 'unresolved') classification = classifyOwnerInitialStyleInput(\n          input, property, referenceValue, astylarValue,\n          ownerInitialByCaseIdProperty.get(JSON.stringify([key, input.id, property]))) ?? classification;\n";
  assert.equal(current.split(early).length, 2);
  assert.equal(current.split(late).length, 2);
  const restored = current.replace(early, "        if (classification.attribution === 'unresolved') classification = classifyOwnerInitialStyleInput(").replace(late, '');
  assert.equal(hash(restored), '1a88cf50442a5833624978871bcce34e475f150acb9bad5fa134cd8356b4db91',
    'producer changed beyond appearance fallback precedence');
  return { restoredSource: restored, previousModuleSha256: hash(restored), currentModuleSha256: hash(actual) };
}

export function restorePositionProducer(source, { followupOnly = false } = {}) {
  const current = restoreScalarReviewExtraction(source);
  let restored = (current.includes("if (property !== 'appearance' && classification.attribution === 'unresolved')") ||
    current.includes("!['appearance', 'color'].includes(property)") ||
    current.includes("!['appearance', 'color', 'fontWeight'].includes(property)"))
    ? restoreAppearancePrecedence(current).restoredSource : current;
  const replaceOnce = (from, to = '') => {
    assert.equal(restored.split(from).length, 2, 'missing or repeated position integration fragment');
    restored = restored.replace(from, to);
  };
  // Reuse the existing original-case replay for the nine dialog owner joins.
  if (restored.includes('applyDialogTextFlow')) {
    replaceOnce('validateBottomSheetContrastCorners, applyDialogTextFlow, validateDialogTextFlow, applyTabControlStage, validateTabControlStage }', 'validateBottomSheetContrastCorners }');
    replaceOnce("  const modalDiscrepancies = ownerInitialStyleBinding.status === 'bound'", "  const discrepancies = ownerInitialStyleBinding.status === 'bound'");
    replaceOnce("  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyTabControlStage(applyDialogTextFlow(modalDiscrepancies, cases, elementInventory, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : modalDiscrepancies;\n");
    replaceOnce('      errors.push(...validateDialogTextFlow(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n      errors.push(...validateTabControlStage(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
    replaceOnce("'reviewed-bottom-sheet-contrast-corner-substitution', 'reviewed-dialog-text-flow-inputs', 'reviewed-tab-control-stage'", "'reviewed-bottom-sheet-contrast-corner-substitution'");
  }
  if (restored.includes("from './modal-position-inspection.mjs'")) {
    if (restored.includes("    'src/parity/rounded-radius.audit.spec.ts',")) {
      replaceOnce("    'src/parity/rounded-radius.audit.spec.ts',\n    'scripts/audit-overlay-layout-stage.mjs',\n");
      replaceOnce("    proof(root, 'src/parity/rounded-radius.audit.spec.ts', /describe\\('public rounded radius audit'/,\n      'public equal-input oversized corner radius rendering', 'Current installed-package div and button surfaces preserve 9999px radius inputs but render four-vertex rectangles; native capsules and 24px/36px candidate controls distinguish the shape defect at DPR1/2. Source-extracted kernel proof traces sampling density to the unnormalized radius. Retained failures are diagnostic evidence, not historical-bundle attribution or complete antialiasing parity.'),\n");
    }
    if (restored.includes('applyBottomSheetContrastCorners')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, applyBottomSheetActionLayout, validateBottomSheetActionLayout, applyBottomSheetContrastCorners, validateBottomSheetContrastCorners } from './modal-position-inspection.mjs';", "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, applyBottomSheetActionLayout, validateBottomSheetActionLayout } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetContrastCorners(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetContrastCorners(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-action-layout-substitution', 'reviewed-bottom-sheet-contrast-corner-substitution'", "'reviewed-bottom-sheet-action-layout-substitution'");
    }
    if (restored.includes('applyBottomSheetActionLayout')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint, applyBottomSheetActionLayout, validateBottomSheetActionLayout } from './modal-position-inspection.mjs';", "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetActionLayout(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetActionLayout(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-panel-paint-inputs', 'reviewed-bottom-sheet-action-layout-substitution'", "'reviewed-bottom-sheet-panel-paint-inputs'");
    }
    if (restored.includes('applyBottomSheetPanelPaint')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow, applyBottomSheetPanelPaint, validateBottomSheetPanelPaint } from './modal-position-inspection.mjs';", "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetPanelPaint(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetPanelPaint(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-panel-flow-substitution', 'reviewed-bottom-sheet-panel-paint-inputs'", "'reviewed-bottom-sheet-panel-flow-substitution'");
    }
    if (restored.includes('applyBottomSheetPanelFlow')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints, applyBottomSheetPanelFlow, validateBottomSheetPanelFlow } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetPanelFlow(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetPanelFlow(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-panel-constraint-omission', 'reviewed-bottom-sheet-panel-flow-substitution'", "'reviewed-bottom-sheet-panel-constraint-omission'");
    }
    if (restored.includes('applyBottomSheetPanelConstraints')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints, applyBottomSheetPanelConstraints, validateBottomSheetPanelConstraints } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints } from './modal-position-inspection.mjs';");
      replaceOnce('applyBottomSheetPanelConstraints(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateBottomSheetPanelConstraints(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-dialog-panel-constraint-omission', 'reviewed-bottom-sheet-panel-constraint-omission'", "'reviewed-dialog-panel-constraint-omission'");
    }
    if (restored.includes('applyDialogPanelConstraints')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox, applyDialogPanelConstraints, validateDialogPanelConstraints } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox } from './modal-position-inspection.mjs';");
      replaceOnce('applyDialogPanelConstraints(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateDialogPanelConstraints(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-dialog-action-box-substitution', 'reviewed-dialog-panel-constraint-omission'", "'reviewed-dialog-action-box-substitution'");
    }
    if (restored.includes('applyDialogActionBox')) {
      replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography, applyDialogActionBox, validateDialogActionBox } from './modal-position-inspection.mjs';",
        "import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography } from './modal-position-inspection.mjs';");
      replaceOnce('applyDialogActionBox(overlaySurfaceDiscrepancies, cases, elementInventory, canonicalStyle)', 'overlaySurfaceDiscrepancies');
      replaceOnce('      errors.push(...validateDialogActionBox(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
      replaceOnce("'reviewed-bottom-sheet-scalar-typography-owner', 'reviewed-dialog-action-box-substitution'", "'reviewed-bottom-sheet-scalar-typography-owner'");
    }
    replaceOnce("import { applyDialogScalarTypography, validateDialogScalarTypography, applyBottomSheetScalarTypography, validateBottomSheetScalarTypography } from './modal-position-inspection.mjs';\n");
    replaceOnce("  const overlaySurfaceDiscrepancies = applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs);\n  const discrepancies = ownerInitialStyleBinding.status === 'bound'\n    ? applyBottomSheetScalarTypography(applyDialogScalarTypography(overlaySurfaceDiscrepancies, cases, elementInventory, retainedTypography, controlTypography, canonicalStyle), cases, elementInventory, canonicalStyle)\n    : overlaySurfaceDiscrepancies;",
      '  const discrepancies = applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs);');
    replaceOnce('      errors.push(...validateDialogScalarTypography(report.discrepancies, replayedRows, cases,\n        report.elementInventory, report.retainedTypography, report.controlTypography, canonicalStyle));\n      errors.push(...validateBottomSheetScalarTypography(report.discrepancies, replayedRows, cases,\n        report.elementInventory, canonicalStyle));\n');
    replaceOnce("      report.discrepancies?.some(d => [ownerInitialStyleAttribution, 'reviewed-dialog-scalar-typography-owner', 'reviewed-bottom-sheet-scalar-typography-owner'].includes(d.attribution))) {",
      '      report.discrepancies?.some(d => d.attribution === ownerInitialStyleAttribution)) {');
    for (const file of ['tests/material-parity/modal-position-inspection.mjs', 'tests/material-parity/modal-position-inspection.spec.mjs'])
      replaceOnce(`    '${file}',\n`);
  }
  // Admit only the exact thirteen-group overlay metadata integration.
  if (restored.includes("from './overlay-surface-audit-source-binding.mjs'")) {
    replaceOnce("import { collectOverlaySurfaceAuditInputs, applyOverlaySurfaceAuditRows, validateOverlaySurfaceAuditInputs,\n  validateOverlaySurfaceAuditClassifications, overlaySurfaceAttributions } from './overlay-surface-audit-source-binding.mjs';\n");
    replaceOnce('  const chipPaintDiscrepancies = applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs);\n  const overlaySurfaceAuditInputs = collectOverlaySurfaceAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyOverlaySurfaceAuditRows(chipPaintDiscrepancies, overlaySurfaceAuditInputs);',
      '  const discrepancies = applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs);');
    replaceOnce('    overlaySurfaceAuditInputs,\n');
    replaceOnce("    ['overlaySurfaceAuditInputs', overlaySurfaceAttributions, validateOverlaySurfaceAuditInputs, validateOverlaySurfaceAuditClassifications],\n");
    for (const file of ['tests/material-parity/overlay-surface-audit-source-binding.mjs',
      'tests/material-parity/overlay-surface-review.mjs', 'docs/material-overlay-surface-review.json']) replaceOnce(`    '${file}',\n`);
  }
  // Preserve the pinned pre-position producer while admitting only the exact
  // subsequent ten-row chip integration, not arbitrary producer edits.
  if (restored.includes("from './chip-paint-audit-source-binding.mjs'")) {
    replaceOnce("import { collectChipPaintAuditInputs, applyChipPaintAuditRows, validateChipPaintAuditInputs,\n  validateChipPaintAuditClassifications, chipPaintAttribution } from './chip-paint-audit-source-binding.mjs';\n");
    replaceOnce('  const positionFollowupDiscrepancies = applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs);\n  const chipPaintAuditInputs = collectChipPaintAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyChipPaintAuditRows(positionFollowupDiscrepancies, chipPaintAuditInputs);',
      '  const discrepancies = applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs);');
    replaceOnce('    chipPaintAuditInputs,\n');
    replaceOnce("    ['chipPaintAuditInputs', [chipPaintAttribution], validateChipPaintAuditInputs, validateChipPaintAuditClassifications],\n");
    for (const file of ['tests/material-parity/chip-paint-audit-source-binding.mjs', 'tests/material-parity/chip-position-inspection.mjs',
      'tests/material-parity/chip-position-inspection.spec.mjs', 'scripts/audit-findings-store.mjs', 'docs/material-chip-paint-review.json']) replaceOnce(`    '${file}',\n`);
  }
  // The focused/integration split moved this test without changing its claim.
  const movedSliderProof = "    proof(root, 'tests/material-parity/slider-input-box-integration.spec.mjs',";
  if (restored.includes(movedSliderProof)) {
    replaceOnce(movedSliderProof, "    proof(root, 'tests/material-parity/slider-input-box-source-binding.spec.mjs',");
    replaceOnce("    'tests/material-parity/slider-input-box-integration.spec.mjs',\n");
  }
  // Also accept the subsequent, exact fourteen-group integration. The final
  // pinned predecessor still rejects any unrelated producer modification.
  const hasFollowup = restored.includes("from './position-followup-audit-source-binding.mjs'");
  assert.ok(!followupOnly || hasFollowup, 'followup transition requires its production integration');
  if (hasFollowup) {
    replaceOnce("import { collectPositionFollowupAuditInputs, applyPositionFollowupAuditRows, validatePositionFollowupAuditInputs,\n  validatePositionFollowupAuditClassifications, positionFollowupAttribution } from './position-followup-audit-source-binding.mjs';\n");
    replaceOnce('  const positionReviewedDiscrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);\n  const positionFollowupAuditInputs = collectPositionFollowupAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyPositionFollowupAuditRows(positionReviewedDiscrepancies, positionFollowupAuditInputs);',
      '  const discrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);');
    replaceOnce('    positionFollowupAuditInputs,\n');
    replaceOnce("    ['positionFollowupAuditInputs', [positionFollowupAttribution], validatePositionFollowupAuditInputs, validatePositionFollowupAuditClassifications],\n");
    for (const file of positionFollowupProducerFiles) replaceOnce(`    '${file}',\n`);
  }
  const beforeFollowup = restored;
  replaceOnce("import { collectPositionAuditInputs, applyPositionAuditRows, validatePositionAuditInputs,\n  validatePositionAuditClassifications, positionCompositionAttribution } from './position-composition-audit-source-binding.mjs';\n");
  replaceOnce('  const visibilityReviewedDiscrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs);\n  const positionAuditInputs = collectPositionAuditInputs(parityReport, { root, parityPath: options.parityPath });\n  const discrepancies = applyPositionAuditRows(visibilityReviewedDiscrepancies, positionAuditInputs);',
    '  const discrepancies = applyVisibilityAuditRows(unreviewedDiscrepancies, visibilityAuditInputs);');
  replaceOnce('    positionAuditInputs,\n');
  replaceOnce("    ['positionAuditInputs', [positionCompositionAttribution], validatePositionAuditInputs, validatePositionAuditClassifications],\n");
  for (const file of positionProducerFiles) replaceOnce(`    '${file}',\n`);
  assert.equal(hash(restored), '4ac2017e9b2d546de80dfb7cc209cee27b623a1f30f7cb73a024839b096b6213',
    'producer changed beyond exact position integration');
  if (followupOnly) restored = beforeFollowup;
  return { restoredSource: restored, previousModuleSha256: hash(restored),
    currentModuleSha256: hash(current), wholeModuleConserved: true };
}
