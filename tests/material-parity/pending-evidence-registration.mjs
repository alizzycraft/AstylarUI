import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { createMenuHistoricalRead } from './menu-select-disabled-registration.mjs';
import { restoreDividerOwnerFrameProducer } from './divider-owner-frame-registration.mjs';

export const pendingEvidenceSourceFiles = Object.freeze([
  "docs/evidence/material-original-runner-e01.mjs.gz.b64",
  "docs/evidence/material-original-runner-launch-patches.json",
  "scripts/audit-material-snackbar-ax.mjs",
  "scripts/capture-dialog-owner-ax.mjs",
  "scripts/capture-public-caret-frames.mjs",
  "scripts/inspect-public-caret-fonts.mjs",
  "scripts/join-material-original-runner-source.mjs",
  "tests/material-parity/caret-retained-frames.spec.mjs",
  "tests/material-parity/dialog-owner-semantic-inputs.spec.mjs",
  "tests/material-parity/focus-action-scope.spec.mjs",
  "tests/material-parity/original-material-runner-join.spec.mjs",
  "tests/material-parity/original-material-runner-source.spec.mjs",
  "tests/material-parity/snackbar-live-policy.spec.mjs",
  "tests/material-parity/pending-evidence-registration.mjs",
  "tests/material-parity/pending-evidence-registration.spec.mjs",
  "tests/material-parity/original-material-runner-review-source.mjs",
  "scripts/audit-material-divider-paint-context.mjs",
  "scripts/audit-material-divider-paint-context-remaining.mjs",
  "scripts/join-material-divider-computed-paint.mjs",
  "tests/material-parity/retained-paint-property-coverage.spec.mjs",
  "tests/material-parity/divider-computed-paint-join.spec.mjs",
  "tests/material-parity/divider-computed-paint-review-source.mjs"
]);
export const pendingEvidenceProofRows = Object.freeze([
  ...[
    ['tests/material-parity/retained-paint-property-coverage.spec.mjs', 'remaining retained Divider computed paint covers every configured physical viewport cohort'],
    ['tests/material-parity/retained-paint-property-coverage.spec.mjs', 'retained served Divider computed paint excludes image filters and blending through actual HTML hosts'],
    ['tests/material-parity/retained-paint-property-coverage.spec.mjs', 'all retained Divider chains preserve variable background shorthand but no explicit filter or blend requests'],
    ['tests/material-parity/retained-paint-property-coverage.spec.mjs', 'authenticated retained computed paint projection omits image and compositing properties without losing raw declarations'],
    ['tests/material-parity/divider-computed-paint-join.spec.mjs', 'Divider computed paint adds only bounded evidence and preserves complete predecessor and all case statuses'],
  ].map(([file, title]) => ({ file, title, pattern: "test\\('" + title + "'",
    scope: 'Bounded retained paint evidence only;all case dispositions,remaining tasks and final acceptance gates preserve. Not current rendering or whole-case acceptance.' })),
  {
    "file": "tests/material-parity/caret-retained-frames.spec.mjs",
    "title": "public caret frames preserve the complete original reproduction after bounded evidence edits",
    "pattern": "test\\('public caret frames preserve the complete original reproduction after bounded evidence edits'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/caret-retained-frames.spec.mjs",
    "title": "whole focused blink-frame delta includes blended caret edges without inventing a native height law",
    "pattern": "test\\('whole focused blink-frame delta includes blended caret edges without inventing a native height law'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/caret-retained-frames.spec.mjs",
    "title": "retained-bundle native font identity is ArialMT versus Consolas, distinct from logical caret metrics",
    "pattern": "test\\('retained-bundle native font identity is ArialMT versus Consolas, distinct from logical caret metrics'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/dialog-owner-semantic-inputs.spec.mjs",
    "title": "all retained open dialogs preserve real owner label/modal differences omitted by inner-surface comparator",
    "pattern": "test\\('all retained open dialogs preserve real owner label/modal differences omitted by inner-surface comparator'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/dialog-owner-semantic-inputs.spec.mjs",
    "title": "all eight retained-build activate contexts expose unequal actual dialog AX names and modal properties",
    "pattern": "test\\('all eight retained-build activate contexts expose unequal actual dialog AX names and modal properties'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/dialog-owner-semantic-inputs.spec.mjs",
    "title": "dialog retained owner projection follows authored name while modality and aria-modal are coupled",
    "pattern": "test\\('dialog retained owner projection follows authored name while modality and aria-modal are coupled'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/dialog-owner-semantic-inputs.spec.mjs",
    "title": "installed package-root DOMElement accepts modal but rejects independent ariaModal declaration",
    "pattern": "test\\('installed package-root DOMElement accepts modal but rejects independent ariaModal declaration'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/focus-action-scope.spec.mjs",
    "title": "configured focus action scope is 248 programmatic requests and eight pointer clicks, never Tab",
    "pattern": "test\\('configured focus action scope is 248 programmatic requests and eight pointer clicks, never Tab'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/focus-action-scope.spec.mjs",
    "title": "configured focus labels preserve forty already-inspected noninteractive exclusions",
    "pattern": "test\\('configured focus labels preserve forty already-inspected noninteractive exclusions'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/original-material-runner-join.spec.mjs",
    "title": "original runner recovery reconciles only 9016 source conditions and conserves complete predecessor",
    "pattern": "test\\('original runner recovery reconciles only 9016 source conditions and conserves complete predecessor'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/original-material-runner-join.spec.mjs",
    "title": "corrupt encoded original source cannot reconcile a valid predecessor or mutate its statuses",
    "pattern": "test\\('corrupt encoded original source cannot reconcile a valid predecessor or mutate its statuses'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/original-material-runner-join.spec.mjs",
    "title": "original source successor validates through the existing complete case/dependency reader without a duplicate proposal",
    "pattern": "test\\('original source successor validates through the existing complete case/dependency reader without a duplicate proposal'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/original-material-runner-source.spec.mjs",
    "title": "portable original Material runner bytes match the complete immutable full-capture receipt",
    "pattern": "test\\('portable original Material runner bytes match the complete immutable full-capture receipt'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/original-material-runner-source.spec.mjs",
    "title": "recorded runner patches preserve exact payload hashes and chronological source anchors",
    "pattern": "test\\('recorded runner patches preserve exact payload hashes and chronological source anchors'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/original-material-runner-source.spec.mjs",
    "title": "recovered original action/theme methods preserve maintained procedures without claiming whole-runner identity",
    "pattern": "test\\('recovered original action/theme methods preserve maintained procedures without claiming whole-runner identity'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/snackbar-live-policy.spec.mjs",
    "title": "snackbar post-delay action AX is positive while live atomic policies remain unequal",
    "pattern": "test\\('snackbar post-delay action AX is positive while live atomic policies remain unequal'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/snackbar-live-policy.spec.mjs",
    "title": "snackbar retained post-announcement keyboard UNDO dismisses with trusted Enter on both sides",
    "pattern": "test\\('snackbar retained post-announcement keyboard UNDO dismisses with trusted Enter on both sides'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/snackbar-live-policy.spec.mjs",
    "title": "snackbar retained status atomic policy is authored and conditionally copied by core",
    "pattern": "test\\('snackbar retained status atomic policy is authored and conditionally copied by core'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/snackbar-live-policy.spec.mjs",
    "title": "snackbar retained keyboard route dispatches logical click instead of relying on native DOM click",
    "pattern": "test\\('snackbar retained keyboard route dispatches logical click instead of relying on native DOM click'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/pending-evidence-registration.spec.mjs",
    "title": "pending evidence inventory addition preserves every frozen source and proof entry",
    "pattern": "test\\('pending evidence inventory addition preserves every frozen source and proof entry'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  },
  {
    "file": "tests/material-parity/pending-evidence-registration.spec.mjs",
    "title": "pending evidence inventory restoration rejects changed old content and altered additions",
    "pattern": "test\\('pending evidence inventory restoration rejects changed old content and altered additions'",
    "scope": "Bounded verified evidence only; remaining obligations and original acceptance gates preserve. Not whole-case or current-rendering acceptance."
  }
]);
const hash = value => createHash('sha256').update(value).digest('hex');
const frozen = '0aba1870b5ee9f0231cfb2528d6d89a581ae8558a0c9859e116a145febcbe3e1';
const sourceAnchor = 'function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor = 'function focusedProofInventory(root) {\n  return [\n';
const sourceAddition = pendingEvidenceSourceFiles.map(file => '    ' + JSON.stringify(file) + ',\n').join('');
const proofAddition = pendingEvidenceProofRows.map(row => '    proof(root, ' + JSON.stringify(row.file) +
  ', new RegExp(' + JSON.stringify(row.pattern) + '),\n      ' + JSON.stringify(row.title) + ', ' +
  JSON.stringify(row.scope) + '),\n').join('');
function replaceOnce(text, before, after) {
  assert.equal(text.split(before).length, 2, 'Bounded inventory stage must match exactly once');
  return text.replace(before, after);
}
export function registerPendingEvidenceProducer(source) {
  let text = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(text), frozen, 'Only the frozen complete producer may be extended');
  text = replaceOnce(text, sourceAnchor, sourceAnchor + sourceAddition);
  return replaceOnce(text, proofAnchor, proofAnchor + proofAddition);
}
export function restorePendingEvidenceProducer(source) {
  if (source.toString().includes('"scripts/audit-material-menu-ax-contexts.mjs"')) {
    const file = path.resolve('tests/material-parity/input-equivalence-audit.mjs');
    const read = (name, options) => path.resolve(name) === file
      ? (typeof options === 'string' ? source.toString(options) : Buffer.from(source))
      : readFileSync(name, options);
    source = createMenuHistoricalRead({ root: process.cwd(), read })(file);
  }
  let text = restoreDividerOwnerFrameProducer(source);
  if (hash(text) === frozen) return text;
  text = replaceOnce(text, sourceAnchor + sourceAddition, sourceAnchor);
  text = replaceOnce(text, proofAnchor + proofAddition, proofAnchor);
  assert.equal(hash(text), frozen, 'Every complete frozen producer byte must recover');
  return text;
}

export const pendingEvidencePreviousSourceHashes = Object.freeze({
  'scripts/run-material-input-audit.mjs': '15654c97560e355b825b330116514e4e64a8d61769998e9eb7dca5e47e936928',
  'scripts/export-material-input-audit-current-ancestry.mjs': '13a8ae61f8d0fb5f93d230a7a77da1ccd08d90c03cfa193d3d63d34c9e920f54',
  'tests/material-parity/input-equivalence-audit.mjs': frozen,
  'tests/material-parity/static-semantic-registration.mjs': '683270d89cbce258a3372d89129f3f8094a29330b9bb36c6f0fb2dfbf7ab3286',
  'tests/material-parity/slider-state-registration.mjs': '98166d83d2ad2dc89ddf1c39e376474d727877c8bcf88163c4f214cff736cc18',
  'tests/material-parity/slider-state-input-review-source.mjs': '10a800adc3e5d6d85d07aa2123bd8c2fa30e263368d7a4a363e79ff5b5284a08',
  'tests/material-parity/slider-state-input-review-source.spec.mjs': 'b5bb6f3e815aa02e60f19d23d9a6788bc8431b7cca7fac9649c0c24427c0b34f',
});
const compatibilityEdits = {
  'tests/material-parity/static-semantic-registration.mjs': [
    ["import { restorePendingEvidenceProducer, restoreOriginalRunnerExportSource } from './pending-evidence-registration.mjs';\n", ''],
    ["  if(kind!=='case'&&source.toString().includes('originalRunner'))source=restoreOriginalRunnerExportSource(source,kind);\n", ''],
    ["  if(text.includes('\"docs/evidence/material-original-runner-e01.mjs.gz.b64\"'))text=restorePendingEvidenceProducer(text);\n", ''],
  ],
  'tests/material-parity/slider-state-registration.mjs': [
    ["import { restorePendingEvidenceProducer, restorePendingEvidenceRegisteredSource, restoreOriginalRunnerExportSource } from './pending-evidence-registration.mjs';\n", ''],
    ['  source = restoreOriginalRunnerExportSource(source, kind);\n', ''],
    ["  source = restorePendingEvidenceRegisteredSource(source, 'tests/material-parity/static-semantic-registration.mjs');\n", ''],
    ['  text = restorePendingEvidenceProducer(text);\n', ''],
  ],
  'tests/material-parity/slider-state-input-review-source.mjs': [
    ["import { pendingEvidenceHistoricalRead } from './pending-evidence-registration.mjs';\n", ''],
    ['  read = pendingEvidenceHistoricalRead({ root, read });\n', ''],
  ],
  'tests/material-parity/slider-state-input-review-source.spec.mjs': [
    ["import { restorePendingEvidenceProducer } from './pending-evidence-registration.mjs';\n", ''],
    ["source = restorePendingEvidenceProducer(readFileSync(file, 'utf8'));", "source = readFileSync(file, 'utf8');"],
  ],
};
export function restorePendingEvidenceRegisteredSource(source, file) {
  assert.ok(Object.hasOwn(pendingEvidencePreviousSourceHashes, file), 'Unknown pending-evidence source boundary');
  if (file === 'scripts/run-material-input-audit.mjs') return restoreOriginalRunnerExportSource(source, 'runner');
  if (file === 'scripts/export-material-input-audit-current-ancestry.mjs') return restoreOriginalRunnerExportSource(source, 'launcher');
  if (file === 'tests/material-parity/input-equivalence-audit.mjs') return restorePendingEvidenceProducer(source);
  let text = source.toString().replaceAll('\r\n', '\n');
  if (hash(text) === pendingEvidencePreviousSourceHashes[file]) return text;
  for (const [before, after] of compatibilityEdits[file]) text = replaceOnce(text, before, after);
  assert.equal(hash(text), pendingEvidencePreviousSourceHashes[file], 'Whole historical source must recover');
  return text;
}
export function restoreOriginalRunnerExportSource(source, kind) {
  assert.ok(['runner', 'launcher'].includes(kind));
  let text = restoreDividerPaintExportSource(source, kind);
  const file = kind === 'runner' ? 'scripts/run-material-input-audit.mjs' : 'scripts/export-material-input-audit-current-ancestry.mjs';
  if (hash(text) === pendingEvidencePreviousSourceHashes[file]) return text;
  if (kind === 'runner') {
    text = replaceOnce(text, "import { originalRunnerReview, createOriginalRunnerReviewReader } from '../tests/material-parity/original-material-runner-review-source.mjs';\n", '');
    text = replaceOnce(text, '    const recoveredReaderFactory = options.caseObligationReviewSha256===originalRunnerReview ? createOriginalRunnerReviewReader : currentReaderFactory;\n', '');
    text = replaceOnce(text, 'const applicability=recoveredReaderFactory?.', 'const applicability=currentReaderFactory?.');
  } else {
    text = replaceOnce(text, "const originalRunnerRecovery = rawRequested.includes('--original-runner-recovery');\nassert.ok(!originalRunnerRecovery || rawRequested.every(argument => ['--original-runner-recovery', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n", '');
    text = replaceOnce(text, ".filter(argument => argument !== '--original-runner-recovery')", '');
    text = replaceOnce(text, '|--original-runner-recovery', '');
    text = replaceOnce(text, "if (originalRunnerRecovery) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/7dfee06dc72de1cc4a7d94f1d10594ec0b7d703a7a151e35ae803eadadc51385.json';\n", '');
    text = replaceOnce(text, "  const retained = originalRunnerRecovery && name === 'case-obligation-review' ? 'artifacts/material-parity/working-audit/proposals/c394338eb185b3f410e7e18825cd370391b8daeb827f9b60f4d7355b46862823.json' : relative;\n  const stat = statSync(path.join(root, retained));", '  const stat = statSync(path.join(root, relative));');
    text = replaceOnce(text, "if (originalRunnerRecovery) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=7dfee06dc72de1cc4a7d94f1d10594ec0b7d703a7a151e35ae803eadadc51385';\n", '');
  }
  assert.equal(hash(text), pendingEvidencePreviousSourceHashes[file], 'Complete pre-recovery export source must recover');
  return text;
}
export function restoreDividerPaintExportSource(source, kind) {
  assert.ok(['runner', 'launcher'].includes(kind));
  let text = restoreDividerOwnerFrameExportSource(source, kind);
  const expected = kind === 'runner' ? 'a7bbde2e2764a00d0b22ddafc401092987b71163543a7873fa42e5fb3a873809' : 'd9b081a5b5ae0b0e5253cf17c368b201f47f8c4f75a97f247014b190231e3642';
  if (hash(text) === expected || !text.includes(kind === 'runner' ? 'dividerComputedPaintReview' : 'const dividerComputedPaint =')) return text;
  if (kind === 'runner') {
    text = replaceOnce(text, "import { dividerComputedPaintReview, createDividerComputedPaintReviewReader } from '../tests/material-parity/divider-computed-paint-review-source.mjs';\n", '');
    text = replaceOnce(text, '    const paintReaderFactory = options.caseObligationReviewSha256===dividerComputedPaintReview ? createDividerComputedPaintReviewReader : recoveredReaderFactory;\n', '');
    text = replaceOnce(text, 'const applicability=paintReaderFactory?.', 'const applicability=recoveredReaderFactory?.');
  } else {
    text = replaceOnce(text, "const dividerComputedPaint = rawRequested.includes('--divider-computed-paint');\nassert.ok(!dividerComputedPaint || rawRequested.every(argument => ['--divider-computed-paint', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n", '');
    text = replaceOnce(text, ".filter(argument => argument !== '--divider-computed-paint')", '');
    text = replaceOnce(text, '|--divider-computed-paint', '');
    text = replaceOnce(text, "if (dividerComputedPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/abdd4f47d8681dbdbedd24a5e954b7ad3063261150a9758dffcdce460155898a.json';\n", '');
    text = replaceOnce(text, '(originalRunnerRecovery || dividerComputedPaint)', 'originalRunnerRecovery');
    text = replaceOnce(text, "if (dividerComputedPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=abdd4f47d8681dbdbedd24a5e954b7ad3063261150a9758dffcdce460155898a';\n", '');
  }
  assert.equal(hash(text), expected, 'Complete pre-Divider export source must recover');
  return text;
}
export function restoreDividerOwnerFrameExportSource(source, kind) {
  assert.ok(['runner', 'launcher'].includes(kind));
  let text = source.toString().replaceAll('\r\n', '\n');
  const expected = kind === 'runner' ? 'fb65d915d60172eabeebf0af7e578fa21c166a0e1c2384fdc8d1e28212d76378' : '6586a5a6232887702e3ee644f0e4ce51de4d02aa760bbfef1f316bd6adfca4f8';
  if (hash(text) === expected || !text.includes(kind === 'runner' ? 'dividerOwnerFrameReview' : 'const dividerOwnerFrame =')) return text;
  if (kind === 'runner') {
    text = replaceOnce(text, "import { dividerOwnerFrameReview, createDividerOwnerFrameReviewReader } from '../tests/material-parity/divider-owner-frame-review-source.mjs';\n", '');
    text = replaceOnce(text, '    const ownerFrameReaderFactory = options.caseObligationReviewSha256===dividerOwnerFrameReview ? createDividerOwnerFrameReviewReader : paintReaderFactory;\n', '');
    text = replaceOnce(text, 'const applicability=ownerFrameReaderFactory?.', 'const applicability=paintReaderFactory?.');
  } else {
    text = replaceOnce(text, "const dividerOwnerFrame = rawRequested.includes('--divider-owner-frame');\nassert.ok(!dividerOwnerFrame || rawRequested.every(argument => ['--divider-owner-frame', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\n", '');
    text = replaceOnce(text, ".filter(argument => argument !== '--divider-owner-frame')", '');
    text = replaceOnce(text, '|--divider-owner-frame', '');
    text = replaceOnce(text, "if (dividerOwnerFrame) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/94f1a93d5881bafd8f79fad0ccd52e20d0325bed06eb64dc1e1adbd315241cc4.json';\n", '');
    text = replaceOnce(text, '(originalRunnerRecovery || dividerComputedPaint || dividerOwnerFrame)', '(originalRunnerRecovery || dividerComputedPaint)');
    text = replaceOnce(text, "if (dividerOwnerFrame) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=94f1a93d5881bafd8f79fad0ccd52e20d0325bed06eb64dc1e1adbd315241cc4';\n", '');
  }
  assert.equal(hash(text), expected, 'Complete pre-owner/frame export source must recover');
  return text;
}
export function pendingEvidenceHistoricalRead({ root, read }) {
  return (file, options) => {
    const absolute = path.resolve(root, file), relative = path.relative(root, absolute).replaceAll('\\', '/');
    if (!Object.hasOwn(pendingEvidencePreviousSourceHashes, relative)) return read(file, options);
    const bytes = Buffer.from(restorePendingEvidenceRegisteredSource(read(absolute), relative));
    return options ? bytes.toString(typeof options === 'string' ? options : options.encoding ?? 'utf8') : bytes;
  };
}
