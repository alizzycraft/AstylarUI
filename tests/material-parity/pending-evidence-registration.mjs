import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

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
  "tests/material-parity/pending-evidence-registration.spec.mjs"
]);
export const pendingEvidenceProofRows = Object.freeze([
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
  let text = source.toString().replaceAll('\r\n', '\n');
  if (hash(text) === frozen) return text;
  text = replaceOnce(text, sourceAnchor + sourceAddition, sourceAnchor);
  text = replaceOnce(text, proofAnchor + proofAddition, proofAnchor);
  assert.equal(hash(text), frozen, 'Every complete frozen producer byte must recover');
  return text;
}
