import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const source = 'artifacts/material-parity/radio-descendant-inputs-20261021.log';
const bytes = readFileSync(source);
assert.equal(hash(bytes), 'aa8c59ff5c9e751bb0ff0b2f391e43d57409ef6bf0d32bd7f2daa4fcd3e0b355');
const mapped = JSON.parse(bytes), rows = [], cache = new Map();
const app = 'examples/material-showcase/src/app/astylar.component.ts';
assert.equal(hash(readFileSync(app)), '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd');
const applicability = 'artifacts/material-parity/radio-authoring-applicability-20261021.log';
assert.equal(hash(readFileSync(applicability)), 'a88213f0b0b55320e75b092d2eed3596fdfae36148b16a2fb3c9b3f0385ac2eb');
function tree(r) {
  if (!cache.has(r.file)) {
    const b = readFileSync(r.file); assert.equal(hash(b), r.sha256);
    cache.set(r.file, JSON.parse(b));
  }
  return cache.get(r.file);
}
function color(value) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  const match = /^rgb\((\d+), (\d+), (\d+)\)$/.exec(value);
  assert.ok(match, `Unreviewed color syntax:${value}`);
  return '#' + match.slice(1).map(v => Number(v).toString(16).padStart(2, '0')).join('');
}
for (const c of mapped.cases) {
  const native = tree(c.inputTrees.reference), candidate = tree(c.inputTrees.astylar);
  for (const owner of c.owners) {
    const ring = native.nodes.find(n => n.key === owner.native.outerCircle.key);
    const style = native.styles[ring.style];
    const colors = ['Top', 'Right', 'Bottom', 'Left'].map(side => color(style[`border${side}Color`]));
    assert.equal(new Set(colors).size, 1);
    const a = candidate.nodes.find(n => n.key === owner.candidate.ring.key);
    assert.deepEqual(a.resolvedStyle, owner.candidate.ring.effective);
    const rules = ring.rules.map(i => native.rules[i]).filter(r => r.active && /border-color:/.test(r.cssText));
    assert.ok(rules.length > 0);
    assert.ok(rules.every(r => /var\(--mat-radio-/.test(r.cssText)));
    rows.push({ case: c.case, value: owner.value, checked: owner.candidate.option.authored.ariaChecked,
      disabled: owner.candidate.option.authored.ariaDisabled, inputTrees: c.inputTrees,
      native: { key: ring.key, color: colors[0], opacity: Number(style.opacity), rules },
      candidate: { key: a.key, color: color(a.resolvedStyle.borderColor), opacity: Number(a.resolvedStyle.opacity) },
      colorDiffers: colors[0] !== color(a.resolvedStyle.borderColor),
      opacityDiffers: Number(style.opacity) !== Number(a.resolvedStyle.opacity) });
  }
}
assert.equal(rows.length, 136);
const counts = { owners: rows.length, colorDifferences: rows.filter(r => r.colorDiffers).length,
  opacityDifferences: rows.filter(r => r.opacityDiffers).length,
  enabledUnselectedColorDifferences: rows.filter(r => !r.disabled && !r.checked && r.colorDiffers).length,
  disabledSelectedColorDifferences: rows.filter(r => r.disabled && r.checked && r.colorDiffers).length };
assert.deepEqual(counts, { owners: 136, colorDifferences: 60, opacityDifferences: 16,
  enabledUnselectedColorDifferences: 52, disabledSelectedColorDifferences: 8 });
assert.ok(rows.filter(r => r.disabled).every(r => r.native.opacity === .38 && r.candidate.opacity === 1));
assert.ok(rows.filter(r => !r.disabled && r.checked).every(r => !r.colorDiffers));
console.log(JSON.stringify({ kind: 'retained-radio-ring-request-comparison', producer: receipt('scripts/check-radio-ring-inputs.mjs'),
  population: receipt(source), authoringApplicability: [receipt(app), receipt(applicability)], counts, rows,
  boundary: 'Captured four-side color and own-opacity inputs only. Native token rules are retained,not assumed equivalent to candidate theme tokens. Ancestor opacity,composited pixels,animation,current runtime and complete radio inspection remain unproven.' }));
