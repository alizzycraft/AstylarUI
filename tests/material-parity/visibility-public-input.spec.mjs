import assert from 'node:assert/strict';
import test from 'node:test';
import { visibilityCases, visibilityInput } from '../../examples/material-showcase/audit/visibility-input.mjs';

test('visibility reduction varies only the declared visibility or display input', () => {
  assert.deepEqual(visibilityCases, ['omitted', 'visible', 'hidden', 'parent-hidden', 'child-visible', 'display-none']);
  const base = visibilityInput('omitted');
  for (const name of visibilityCases) {
    const expected = structuredClone(base);
    if (name === 'visible') expected.styles[1].visibility = 'visible';
    if (name === 'hidden') expected.styles[1].visibility = 'hidden';
    if (['parent-hidden', 'child-visible'].includes(name)) expected.styles[0].visibility = 'hidden';
    if (name === 'child-visible') expected.styles[1].visibility = 'visible';
    if (name === 'display-none') expected.styles[0].display = 'none';
    assert.deepEqual(visibilityInput(name), expected);
  }
  assert.throws(() => visibilityInput('missing'), /Unknown visibility case/);
  const changed = visibilityInput('hidden'); changed.root.children.length = 0;
  assert.deepEqual(visibilityInput('omitted'), base, 'inputs are fresh and independent');
});
