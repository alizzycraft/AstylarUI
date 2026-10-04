import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('caret classification metadata has no executable collector dependencies', () => {
  const source = readFileSync(new URL('./component-caret-attributions.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\s|\b(?:require|readFileSync|execFileSync)\s*\(/);
});
for (const first of ['range-caret-inputs', 'caret-motion-context', 'overlay-caret-context']) {
  test(`caret collectors initialize with ${first} as the entry point`, () => {
    const code = `
      import assert from 'node:assert/strict';
      await import('./scripts/audit-material-${first}.mjs');
      const range = await import('./scripts/audit-material-range-caret-inputs.mjs');
      const motion = await import('./scripts/audit-material-caret-motion-context.mjs');
      const overlay = await import('./scripts/audit-material-overlay-caret-context.mjs');
      const vocabulary = await import('./tests/material-parity/component-caret-attributions.mjs');
      assert.equal(range.rangeCaretAttribution, 'reviewed-range-caret-observation-stage');
      assert.equal(motion.motionCaretAttribution, 'reviewed-motion-caret-request-omission');
      assert.equal(range.rangeCaretAttribution, vocabulary.rangeCaretAttribution);
      assert.equal(motion.motionCaretAttribution, vocabulary.motionCaretAttribution);
      for (const attribution of [range.rangeCaretAttribution, motion.motionCaretAttribution]) {
        assert.equal(overlay.isComponentCaretReviewRow({property:'caretColor', attribution}), true);
        assert.equal(overlay.isComponentCaretReviewRow({property:'color', attribution}), false);
      }
      assert.equal(overlay.isComponentCaretReviewRow({property:'caretColor', attribution:'unknown'}), false);
    `;
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    execFileSync(process.execPath, ['--input-type=module', '-e', code], { cwd: root, env });
  });
}
