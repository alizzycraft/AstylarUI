import test from 'node:test';
import assert from 'node:assert/strict';
import { compareBottomShadowProfiles } from './shadow-profile-metrics.mjs';

function image(rows) {
  const data = Buffer.alloc(rows.length * 4);
  rows.forEach((value, index) => data.set([value, value, value, 255], index * 4));
  return { width: 1, height: rows.length, data };
}

test('rejects a soft shadow whose contact edge and reach differ from the reference', () => {
  const box = { left: 0, width: 1, bottom: 1 };
  const reference = image([240, 150, 215, 235, 240, 240, 240, 240, 240, 240]);
  const soft = image([240, 220, 222, 226, 231, 236, 240, 240, 240, 240]);
  assert.equal(compareBottomShadowProfiles(reference, soft, box, box, 1, 18).matches, false);
});

test('accepts a shadow with the same edge strength and falloff within tolerance', () => {
  const box = { left: 0, width: 1, bottom: 1 };
  const reference = image([240, 150, 215, 235, 240, 240, 240, 240, 240, 240]);
  const close = image([240, 160, 220, 237, 240, 240, 240, 240, 240, 240]);
  assert.equal(compareBottomShadowProfiles(reference, close, box, box, 1, 18).matches, true);
});
