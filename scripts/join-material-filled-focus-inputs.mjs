import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
export const filledFocusParent = 'c02a245f4c2c17eaa73be940d736ae09f2d20f06e9f20809ae6e9fd2bcd330b1';
const key = 'retainedFilledPrimaryFocusLayer';
const families = ['core', 'button', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip'];

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
