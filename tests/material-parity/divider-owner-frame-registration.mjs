import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const dividerOwnerFrameSources = Object.freeze([
  "scripts/check-divider-inline-alignment-reads.mjs",
  "scripts/audit-material-divider-alignment-inputs.mjs",
  "scripts/check-divider-alignment-inputs.mjs",
  "scripts/check-divider-owner-coverage.mjs",
  "scripts/audit-material-divider-frame-sizes.mjs",
  "scripts/check-divider-frame-sizes.mjs",
  "scripts/join-material-divider-owner-frame-evidence.mjs",
  "tests/material-parity/divider-owner-frame-review-source.mjs",
  "tests/material-parity/divider-owner-frame-join.spec.mjs",
  "tests/material-parity/divider-owner-frame-selection.spec.mjs",
  "tests/material-parity/divider-owner-frame-registration.mjs",
  "tests/material-parity/divider-owner-frame-registration.spec.mjs"
]);
export const dividerOwnerFrameProofs = Object.freeze([
  {
    "file": "tests/material-parity/divider-owner-frame-join.spec.mjs",
    "title": "owner/frame retained checks replay without browser or canonical rebuild",
    "pattern": "test\\('owner/frame retained checks replay without browser or canonical rebuild'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  },
  {
    "file": "tests/material-parity/divider-owner-frame-join.spec.mjs",
    "title": "Divider owner/frame evidence conserves complete predecessor and exact physical applicability",
    "pattern": "test\\('Divider owner/frame evidence conserves complete predecessor and exact physical applicability'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  },
  {
    "file": "tests/material-parity/divider-owner-frame-selection.spec.mjs",
    "title": "owner/frame export selection is explicit and rejects every older supplement combination",
    "pattern": "test\\('owner/frame export selection is explicit and rejects every older supplement combination'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  },
  {
    "file": "tests/material-parity/divider-owner-frame-selection.spec.mjs",
    "title": "owner/frame wiring conserves complete preceding runner launcher and historical helper",
    "pattern": "test\\('owner/frame wiring conserves complete preceding runner launcher and historical helper'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  },
  {
    "file": "tests/material-parity/divider-owner-frame-selection.spec.mjs",
    "title": "actual final exporter reader routes only the exact owner/frame review",
    "pattern": "test\\('actual final exporter reader routes only the exact owner/frame review'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  },
  {
    "file": "tests/material-parity/divider-owner-frame-registration.spec.mjs",
    "title": "owner/frame registration restores exact previous producer and preserves entire inventories",
    "pattern": "test\\('owner/frame registration restores exact previous producer and preserves entire inventories'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  },
  {
    "file": "tests/material-parity/divider-owner-frame-registration.spec.mjs",
    "title": "owner/frame registration rejects changed old producer and malformed additions",
    "pattern": "test\\('owner/frame registration rejects changed old producer and malformed additions'",
    "scope": "Bounded Divider owner/frame evidence only;all original case dispositions,remaining work and acceptance gates preserve. Not whole-case inspection or current rendering."
  }
]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prior = '6e7f0d6dd5c0b248f4fd5c227dda80e6d573d04f565b503871f7d5dfbe259167';
const sourceAnchor = 'function sourceFingerprints(root) {\n  const files = [\n';
const proofAnchor = 'function focusedProofInventory(root) {\n  return [\n';
const sourcePrefix = dividerOwnerFrameSources.map(file => '    ' + JSON.stringify(file) + ',\n').join('');
const proofPrefix = dividerOwnerFrameProofs.map(row => '    proof(root, ' + JSON.stringify(row.file) +
  ', new RegExp(' + JSON.stringify(row.pattern) + '),\n      ' + JSON.stringify(row.title) + ', ' +
  JSON.stringify(row.scope) + '),\n').join('');
function once(source, before, after) {
  assert.equal(source.split(before).length, 2, 'Exact owner/frame inventory boundary required');
  return source.replace(before, after);
}
export function registerDividerOwnerFrameProducer(source) {
  let text = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(text), prior, 'Complete preceding990/319 producer must authenticate');
  text = once(text, sourceAnchor, sourceAnchor + sourcePrefix);
  return once(text, proofAnchor, proofAnchor + proofPrefix);
}
export function restoreDividerOwnerFrameProducer(source) {
  let text = source.toString().replaceAll('\r\n', '\n');
  if (!text.includes(JSON.stringify(dividerOwnerFrameSources[0]))) return text;
  text = once(text, sourceAnchor + sourcePrefix, sourceAnchor);
  text = once(text, proofAnchor + proofPrefix, proofAnchor);
  assert.equal(hash(text), prior, 'Complete990/319 producer must recover');
  return text;
}
export function restoreDividerOwnerFrameRegistrationHelper(source) {
  let text = source.toString().replaceAll('\r\n', '\n');
  const expected = '6147f36dd446f7140b38837b1e4c38aad6bbed08a4c4aeec2d90550fb0bad7ea';
  if (hash(text) === expected) return text;
  text = once(text, "import { restoreDividerOwnerFrameProducer } from './divider-owner-frame-registration.mjs';\n", '');
  text = once(text, 'let text = restoreDividerOwnerFrameProducer(source);',
    "let text = source.toString().replaceAll('\\r\\n', '\\n');");
  assert.equal(hash(text), expected, 'Complete pre-registration helper must recover');
  return text;
}
