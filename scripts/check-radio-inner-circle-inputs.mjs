import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const mappingFile = 'artifacts/material-parity/radio-descendant-inputs-20261021.log';
const bytes = readFileSync(mappingFile);
assert.equal(hash(bytes), 'aa8c59ff5c9e751bb0ff0b2f391e43d57409ef6bf0d32bd7f2daa4fcd3e0b355');
const mapping = JSON.parse(bytes), cache = new Map(), rows = [];
const px = value => { assert.match(value, /^\d+(?:\.\d+)?px$/); return Number(value.slice(0, -2)); };
function tree(r) {
  if (!cache.has(r.file)) {
    const b = readFileSync(r.file); assert.equal(hash(b), r.sha256);
    cache.set(r.file, JSON.parse(b));
  }
  return cache.get(r.file);
}
// CSS-local geometry only. Neither formula consults Babylon or observed mesh
// positions. This does not establish actual renderer paint/layout equivalence.
function scaledBounds(size, scale, origin) {
  return [origin * (1 - scale), origin * (1 - scale),
    origin * (1 - scale) + size * scale, origin * (1 - scale) + size * scale];
}
function centeredBounds(size, border, dot) {
  const start = border + (size - 2 * border - dot) / 2;
  return [start, start, start + dot, start + dot];
}
for (const c of mapping.cases) {
  const native = tree(c.inputTrees.reference), candidate = tree(c.inputTrees.astylar);
  for (const owner of c.owners) {
    const n = native.nodes.find(n => n.key === owner.native.innerCircle.key), s = native.styles[n.style];
    assert.equal(s.width, '20px'); assert.equal(s.height, '20px'); assert.equal(s.boxSizing, 'border-box');
    assert.equal(s.top, '0px'); assert.equal(s.left, '0px');
    assert.equal(s.transformOrigin, '10px 10px');
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      assert.equal(s[`border${side}Width`], '10px'); assert.equal(s[`border${side}Style`], 'solid');
      assert.equal(s[`padding${side}`], '0px');
    }
    for (const corner of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) assert.equal(s[`border${corner}Radius`], '50%');
    const selected = owner.candidate.option.authored.ariaChecked;
    assert.equal(s.transform, selected ? 'matrix(0.5, 0, 0, 0.5, 0, 0)' : 'matrix(0, 0, 0, 0, 0, 0)');
    const rules = n.rules.map(i => native.rules[i]).filter(r => r.active && /transform/.test(r.cssText));
    assert.ok(rules.some(r => /transform: scale\(0, 0\)/.test(r.cssText)));
    if (selected) assert.ok(rules.some(r => /transform: scale\(0\.5\)/.test(r.cssText)));
    const a = candidate.nodes.find(n => n.key === owner.candidate.ring.key).resolvedStyle;
    assert.equal(a.width, '20px'); assert.equal(a.height, '20px'); assert.equal(a.borderWidth, '2px');
    assert.equal(a.boxSizing, 'border-box'); assert.equal(a.display, 'flex');
    assert.equal(a.alignItems, 'center'); assert.equal(a.justifyContent, 'center');
    assert.equal(a.padding, '0');
    let candidateBounds = null;
    const nativeBounds = scaledBounds(px(s.width), selected ? .5 : 0, 10);
    if (selected) {
      assert.equal(owner.candidate.dots.length, 1);
      const d = candidate.nodes.find(n => n.key === owner.candidate.dots[0].key).resolvedStyle;
      assert.equal(d.width, '10px'); assert.equal(d.height, '10px'); assert.equal(d.borderRadius, '5px');
      assert.equal(d.borderWidth, '0'); assert.equal(d.margin, '0'); assert.equal(d.padding, '0');
      assert.equal(d.flexShrink, '0');
      candidateBounds = centeredBounds(px(a.width), px(a.borderWidth), px(d.width));
      assert.deepEqual(candidateBounds, nativeBounds);
    } else {
      assert.equal(owner.candidate.dots.length, 0);
      assert.equal(nativeBounds[2] - nativeBounds[0], 0);
    }
    rows.push({ case: c.case, value: owner.value, selected, inputTrees: c.inputTrees,
      native: { key: n.key, transform: s.transform, origin: s.transformOrigin, bounds: nativeBounds, rules },
      candidate: { key: owner.candidate.dots[0]?.key ?? null, bounds: candidateBounds } });
  }
}
assert.equal(rows.length, 136); assert.equal(rows.filter(r => r.selected).length, 68);
assert.notDeepEqual(scaledBounds(20, .5, 9), centeredBounds(20, 2, 10), 'Origin drift must remain observable');
assert.notDeepEqual(scaledBounds(20, .5, 10), centeredBounds(20, 2, 11), 'Dot-size drift must remain observable');
console.log(JSON.stringify({ kind: 'radio-inner-circle-css-local-geometry-review',
  producer: receipt('scripts/check-radio-inner-circle-inputs.mjs'), mapping: receipt(mappingFile), rows,
  counts: { owners: 136, selectedBoundsEqual: 68, zeroScaleVersusAbsent: 68, rejectionControls: 2 },
  conclusion: 'Settled CSS-local selected shape extents agree;unselected zero-scale paint is represented by no dot. This does not certify equal input structure,animation,hit ownership,colors,opacity,ancestor transforms,actual renderer layout or pixels. Restore original input contracts before renderer acceptance.' }));
