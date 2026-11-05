import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const hash = value => createHash('sha256').update(value).digest('hex');
export const snackbarOpenerParent = '9e3330c7b56a2001d89728726033f518da598ee8cbdfb7443b02c9b2d10fafad';
const key = 'retainedSnackbarClosedOpenerPaint';
const base = 'artifacts/material-parity/';
const receipts = [
  ['snackbar-pending-opener-raster-20261105.log', 'f32469ebb79ecfd6f354cff680edf59990e5fea763af618401372f8b3f687e2b'],
  ['snackbar-opener-crop-provenance-20261105.log', '8dd321c85481421e5fbd2a4f6335c42144ddccf72634cb947883bfe0839a5286'],
  ['snackbar-closed-opener-visibility-20261105.log', '4c78ec9f2806d657aef4f8325d7aadca78ddcd8d1b35bd612429b87e4652377c'],
].map(([name, sha256]) => ({ file: base + name, sha256 }));

export function restoreSnackbarOpenerPaint(cases) {
  return cases.map(row => {
    const owner = row.obligations.localPaint, child = owner[key];
    if (!child) return row;
    const restored = { ...owner, disposition: child.parentDisposition };
    delete restored[key];
    return { ...row, obligations: { ...row.obligations, localPaint: restored } };
  });
}

// Staged evidence-only join. No production registration, reader waiver, export,
// new finding, rendering acceptance or case closure is implied.
export function joinSnackbarOpenerPaint(cases, read = fs.readFileSync) {
  assert.equal(hash(JSON.stringify(cases)), snackbarOpenerParent);
  const reports = receipts.map(receipt => {
    const bytes = read(receipt.file);
    assert.equal(hash(bytes), receipt.sha256, `Changed evidence: ${receipt.file}`);
    return JSON.parse((bytes[0] === 255 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/, ''));
  });
  const [metrics, provenance, visibility] = reports;
  assert.equal(metrics.cases, 26);
  assert.equal(provenance.exactDecodedCropReconstructions, 52);
  assert.equal(visibility.cases, 26);
  const rows = new Map(metrics.rows.map(row => [row.case, row]));
  assert.equal(rows.size, 26);
  assert.deepEqual(new Set(visibility.observations.map(row => row.case)), new Set(rows.keys()));
  let changed = 0;
  const joined = cases.map(row => {
    const metric = rows.get(row.case);
    if (!metric) return row;
    assert.equal(row.family, 'snack-bar');
    const owner = row.obligations.localPaint;
    assert.equal(owner.disposition, 'evidence-join-pending');
    assert.equal(owner[key], undefined);
    const observed = visibility.observations.find(item => item.case === row.case);
    const images = provenance.observations.filter(item => item.case === row.case);
    assert.equal(images.length, 2);
    for (const side of ['reference', 'astylar']) {
      assert.deepEqual(observed.sides[side].tree, row.evidence.pairedTrees[side]);
      assert.equal(observed.sides[side].popupNodes, 0);
      const image = images.find(item => item.side === side);
      assert.deepEqual(image.crop, metric.images[side]);
      for (const receipt of [image.crop, image.full, row.evidence.pairedTrees[side]])
        assert.equal(hash(read(receipt.file)), receipt.sha256);
    }
    changed++;
    return { ...row, obligations: { ...row.obligations, localPaint: {
      ...owner, disposition: 'partial', [key]: {
        disposition: 'inspected-retained-closed-opener-raster-diagnostics',
        parentDisposition: owner.disposition, owner: metric.id,
        metric: metric.metric, alignment: metric.alignment,
        evidence: [...receipts, ...images.flatMap(image => [image.crop, image.full])],
        configuredGateChanged: false, originalRuntimeCauseProven: false,
        remaining: ['Complete opener composition, source/runtime applicability and independent open-popup paint obligations'],
        boundary: 'Retained closed-opener diagnostics only;not equal inputs,current rendering,popup acceptance or whole-case closure.',
      },
    } } };
  });
  assert.equal(changed, 26);
  assert.equal(hash(JSON.stringify(restoreSnackbarOpenerPaint(joined))), snackbarOpenerParent);
  return { cases: joined, changed, sha256: hash(JSON.stringify(joined)), canonicalPublished: false };
}
