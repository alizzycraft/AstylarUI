import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createTriggerPaintReviewReader } from './join-material-trigger-paint-inputs.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
export const filledFocusParent = 'c02a245f4c2c17eaa73be940d736ae09f2d20f06e9f20809ae6e9fd2bcd330b1';
const key = 'retainedFilledPrimaryFocusLayer';
const families = ['core', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip'];

const inventoryPaths = "    'scripts/join-material-filled-focus-inputs.mjs',\n    'tests/material-parity/tooltip-focus-layer-inputs.spec.mjs',\n";
const proofNames = [
  '56 retained filled-button focus owners omit the native programmatic focus layer',
  'filled focus join preserves every parent case and rejects altered tree receipts',
  'filled focus successor passes the existing complete receipt loader',
  'filled focus staged inventory preserves the complete predecessor source',
];
const inventoryProofs = proofNames.map(name =>
  `    proof(root, 'tests/material-parity/tooltip-focus-layer-inputs.spec.mjs', /test\\('${name.replaceAll('-', '\\-')}'/,\n` +
  `      '${name}', 'Bounded retained focus inputs and conservative receipt/inventory integration;not current rendering,canonical publication or whole-case closure.'),\n`).join('');

export function prepareFilledFocusInventory(source) {
  const original = source.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(original), 'cfed52bc5d431d49709955afc990b69cfcc04a11e26d0ddc8d3748d9a28a4c51', 'Exact inventory predecessor required');
  const next = original.replace('function sourceFingerprints(root) {\n  const files = [\n',
    'function sourceFingerprints(root) {\n  const files = [\n' + inventoryPaths)
    .replace('function focusedProofInventory(root) {\n  return [\n',
      'function focusedProofInventory(root) {\n  return [\n' + inventoryProofs);
  assert.equal(restoreFilledFocusInventory(next), original);
  return next;
}

export function restoreFilledFocusInventory(source) {
  const original = source.toString().replaceAll('\r\n', '\n');
  assert.equal(original.split(inventoryPaths).length, 2);
  assert.equal(original.split(inventoryProofs).length, 2);
  const restored = original.replace(inventoryPaths, '').replace(inventoryProofs, '');
  assert.equal(hash(restored), 'cfed52bc5d431d49709955afc990b69cfcc04a11e26d0ddc8d3748d9a28a4c51', 'Inventory restoration drift');
  return restored;
}

export function createFilledFocusReviewReader({ root = process.cwd(), read = fs.readFileSync } = {}) {
  const indexBytes = read(path.resolve(root, 'artifacts/material-parity/working-audit/' +
    '0d7ff3c47321cb30b8188724f53b12f7341799aab55cd1703137732e301d4445/index.json'));
  assert.equal(hash(indexBytes), 'e5aac04c4db56ba0d365f9a5ccb107bcba6d02455033c18515a6cf1dafd8ab0d');
  const inspection = JSON.parse(indexBytes).metadata.coverage.inspectionEvidence;
  const producerFile = path.resolve(root, 'tests/material-parity/input-equivalence-audit.mjs');
  const historicalRead = (name, options) => {
    if (path.resolve(root, name) !== producerFile) return read(name, options);
    const source = read(name).toString().replaceAll('\r\n', '\n');
    const restored = hash(source) === 'cfed52bc5d431d49709955afc990b69cfcc04a11e26d0ddc8d3748d9a28a4c51'
      ? source : restoreFilledFocusInventory(source);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? restored : Buffer.from(restored);
  };
  const prior = createTriggerPaintReviewReader({ root, read: historicalRead, reviewSha256: inspection.reviewSha256 });
  const joined = joinFilledFocusInputs(inspection.cases, file => read(path.resolve(root, file)));
  const review = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
    ...(inspection.schemaVersion === 2 ? { inspectionSchemaVersion: 2 } : {}),
    scope: inspection.scope, groups: joined.cases };
  const sha256 = hash(JSON.stringify(review));
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256, review }));
  const expected = new Map(inspection.evidenceFingerprints.map(r => [path.resolve(root, r.file), r.sha256]));
  for (const row of joined.cases) for (const receipt of row.obligations.localPaint[key]?.evidence ?? []) {
    const absolute = path.resolve(root, receipt.file);
    if (expected.has(absolute)) assert.equal(expected.get(absolute), receipt.sha256, 'Never replace predecessor evidence');
    expected.set(absolute, receipt.sha256);
  }
  return { file, sha256, changed: joined.changed, read(name, options) {
    const absolute = path.resolve(root, name), encoding = typeof options === 'string' ? options : options?.encoding;
    let selected;
    if (absolute === file) selected = bytes;
    else {
      const sha = expected.get(absolute), current = sha ? read(absolute) : undefined;
      selected = sha && hash(current) === sha ? current : prior.read(absolute);
      if (sha) assert.equal(hash(selected), sha, `Unreconciled filled-focus dependency: ${name}`);
    }
    return encoding ? selected.toString(encoding) : Buffer.from(selected);
  }, sourceApplicability: { mode: 'staged-filled-focus-input-join', predecessorReview: inspection.reviewSha256,
    predecessorApplicability: prior.sourceApplicability,
    boundary: 'Bounded focus inputs with exact historical dependencies;not current rendering,canonical publication or case closure.' } };
}

export function restoreFilledFocusInputs(cases) {
  return cases.map(row => {
    const paint = row.obligations.localPaint, child = paint[key];
    if (!child) return row;
    const restored = { ...paint, disposition: child.parentDisposition };
    delete restored[key];
    return { ...row, obligations: { ...row.obligations, localPaint: restored } };
  });
}

export function joinFilledFocusInputs(cases, read = fs.readFileSync) {
  assert.equal(hash(JSON.stringify(cases)), filledFocusParent, 'Exact accepted parent required');
  const currentSource = { file: 'examples/material-showcase/src/app/astylar.component.ts',
    sha256: '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd' };
  const currentBytes = read(currentSource.file);
  assert.equal(hash(currentBytes), currentSource.sha256, 'Current authored focus source changed');
  const focusDeclarations = [...currentBytes.toString().matchAll(/\{ selector: '\.material-button:focus', ([^\r\n]+) \}/g)]
    .map(match => match[1]);
  assert.deepEqual(focusDeclarations, ["boxShadow: '0 0 0 1px rgba(0,0,0,0)'",
    "borderWidth: '0', boxShadow: '0 0 0 1px rgba(0,0,0,0)'"]);
  const ownEvidence = ['scripts/join-material-filled-focus-inputs.mjs',
    'tests/material-parity/tooltip-focus-layer-inputs.spec.mjs'].map(file => ({ file, sha256: hash(read(file)) }));
  let changed = 0;
  const joined = cases.map(row => {
    if (!families.includes(row.family) || !row.case.endsWith('/focus')) return row;
    assert.equal(row.inspection, 'partial');
    assert.equal(row.currentRendering, 'unverified');
    const pair = row.evidence.pairedTrees;
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const bytes = read(pair[side].file); assert.equal(hash(bytes), pair[side].sha256);
      return [side, JSON.parse(bytes)];
    }));
    const id = `${row.family}-primary`;
    const native = trees.reference.nodes.find(n => n.attributes?.id === id);
    assert.ok(native?.attributes.class.includes('mat-mdc-unelevated-button'));
    assert.ok(native.attributes.class.includes('cdk-program-focused'));
    const ripple = trees.reference.nodes.find(n => n.parent === native.key &&
      n.attributes?.class === 'mat-mdc-button-persistent-ripple mdc-button__ripple');
    const pseudo = ripple.pseudoElements.find(n => n.pseudo === '::before');
    assert.equal(pseudo.generated, true);
    const style = trees.reference.styles[pseudo.style]; assert.equal(style.opacity, '0.12');
    const button = trees.astylar.nodes.find(n => n.authored?.id === id); assert.ok(button);
    assert.equal(button.interactionResolvedStyle.background, button.normalResolvedStyle.background);
    assert.equal(trees.astylar.nodes.filter(n => n.parent === button.key).length, 0);
    const paint = row.obligations.localPaint; assert.equal(paint[key], undefined); changed++;
    return { ...row, obligations: { ...row.obligations, localPaint: { ...paint, disposition: 'partial', [key]: {
      disposition: 'inspected-retained-focus-input-mismatch', parentDisposition: paint.disposition,
      sourceFindingIds: ['fixture-filled-button-programmatic-focus-layer-omitted'],
      owner: id, referenceLayer: { color: style.backgroundColor, opacity: style.opacity },
      candidateFill: button.interactionResolvedStyle.background,
      evidence: [...Object.values(pair), currentSource, ...ownEvidence],
      sourceApplicability: 'Current exact authored source retains both transparent-shadow-only focus declarations;not served-build or runtime equivalence.',
      remaining: ['Complete focus glyph/edge/composition paint and current-source/runtime applicability'],
      boundary: 'Exact retained named primary focus input only;not popup paint,all focus origins,current rendering or whole-case closure.',
    } } } };
  });
  assert.equal(changed, 56);
  assert.equal(hash(JSON.stringify(restoreFilledFocusInputs(joined))), filledFocusParent);
  return { cases: joined, changed, sha256: hash(JSON.stringify(joined)), canonicalPublished: false };
}
