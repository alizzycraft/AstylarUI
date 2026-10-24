import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { PNG } from 'pngjs';

const hash = b => createHash('sha256').update(b).digest('hex');
const captures = [
  ['Arial', 'public-caret-frames-arial-receipted-20261024', '508da18107728877c325cc480fb6f3cd43ba18ab8cb75927df60434717a9dd97'],
  ['monospace', 'public-caret-frames-monospace-20261024', '6fa0cb7a747a1f308e2cc6bbbbbc991782c590884da4957f31e3cbfc4192eaa9'],
];
const read = (file, sha) => { const b = readFileSync(file); assert.equal(hash(b), sha, file); return b; };
test('public caret frames preserve the complete original reproduction after bounded evidence edits', () => {
  for (const [font, name, sha] of captures) {
    const root = `artifacts/material-parity/${name}`, report = JSON.parse(read(`${root}/latest-report.json`, sha));
    assert.equal(report.font, font); assert.equal(report.inputs.length, 2515); assert.equal(report.frames.length, 28);
    for (const r of report.inputs) read(r.file, r.sha256);
    const original = read(report.provenance.base.file, report.provenance.base.sha256).toString();
    read(report.provenance.producer.file, report.provenance.producer.sha256);
    read(`${root}/audit.js`, report.bundleSha256);
    const derivation = JSON.parse(readFileSync(`${root}/provenance.json`));
    const generated = read(`${root}/producer.mjs`, derivation.generatedSha256).toString();
    const selected = source => {
      const ast = ts.createSourceFile('capture.mjs', source, 99, true, ts.ScriptKind.JS);
      const nodes = ast.statements.filter(n => ts.isExpressionStatement(n) && ts.isCallExpression(n.expression) &&
        n.expression.expression.getText(ast) === 'test' && n.expression.arguments[0]?.text === 'public equal-input empty caret has paired WebGL raster evidence');
      assert.equal(nodes.length, 1); return nodes[0].getText(ast);
    };
    let restored = selected(generated);
    for (const edit of [...report.provenance.edits].reverse()) {
      assert.equal(restored.split(edit.after).length, 2); restored = restored.replace(edit.after, edit.before);
    }
    assert.equal(restored, selected(original)); assert.equal(hash(restored), report.provenance.originalTestSha256);
    assert.deepEqual(report.results.map(r => [r.variant, r.dpr]), [['placeholder-keyboard', 1], ['placeholder-keyboard', 2]]);
    for (const frame of report.frames) { assert.equal(path.dirname(frame.file), path.resolve(root)); read(frame.file, frame.sha256); }
  }
});

test('whole focused blink-frame delta includes blended caret edges without inventing a native height law', () => {
  for (const [font, name, sha] of captures) {
    const report = JSON.parse(read(`artifacts/material-parity/${name}/latest-report.json`, sha));
    for (const dpr of [1, 2]) for (const side of ['reference', 'astylar']) {
      const frames = report.frames.filter(f => f.file.includes(`-${dpr}-${side}-sample-`)).map(f => {
        const png = PNG.sync.read(read(f.file, f.sha256)); assert.equal(png.width, 390 * dpr); assert.equal(png.height, 140 * dpr);
        let exact = 0; for (let i = 0; i < png.data.length; i += 4) if (png.data[i] === 208 && png.data[i + 1] === 188 && png.data[i + 2] === 255) exact++;
        return { png, exact };
      }).sort((a, b) => b.exact - a.exact);
      assert.equal(frames.length, 6); assert.ok(frames[0].exact > 0); assert.equal(frames.at(-1).exact, 0);
      const on = frames[0].png, off = frames.at(-1).png, xs = [], ys = [], colors = new Set();
      for (let y = 0; y < on.height; y++) for (let x = 0; x < on.width; x++) {
        const i = (y * on.width + x) * 4;
        if ([0, 1, 2, 3].some(c => on.data[i + c] !== off.data[i + c])) {
          xs.push(x); ys.push(y); colors.add([...on.data.subarray(i, i + 4)].join(','));
        }
      }
      assert.ok(xs.length);
      const height = (Math.max(...ys) - Math.min(...ys) + 1) / dpr;
      assert.equal(height, side === 'astylar' ? 20 : font === 'Arial' ? 17 : 19);
      assert.equal((Math.max(...xs) - Math.min(...xs) + 1) / dpr, side === 'astylar' ? 2 : 1);
      assert.ok(colors.has('208,188,255,255'));
      assert.deepEqual([...colors].sort(), side === 'reference' ? ['208,188,255,255']
        : ['208,188,255,255', dpr === 1 ? '220,206,245,255' : '226,215,240,255']);
      assert.equal(xs.length, side === 'reference' ? (font === 'Arial' ? 17 : 19) * dpr * dpr : 40 * dpr * dpr);
    }
  }
  // New exact retained pixels only: not historical recovery, chosen-font proof, logical metrics, or a replacement algorithm.
});

test('retained-bundle native font identity is ArialMT versus Consolas, distinct from logical caret metrics', () => {
  const file = 'artifacts/material-parity/public-caret-font-identity-20261024/latest-report.json';
  const report = JSON.parse(read(file, '8d66e629f06330ab8ddf3874830a0c20060719ae1d349ada2b38da3fb8413388'));
  read(report.producer.file, report.producer.sha256);
  assert.equal(hash(readFileSync('artifacts/material-parity/public-caret-font-identity-20261024/producer.mjs')), report.producer.sha256);
  for (const source of report.sources) { read(source.file, source.sha256); read(source.bundleFile, source.bundleSha256); }
  assert.deepEqual(report.observations.map(r => [r.font, r.dpr]), [['Arial', 1], ['Arial', 2], ['monospace', 1], ['monospace', 2]]);
  for (const row of report.observations) {
    assert.equal(row.snapshot.focused, true); assert.equal(row.snapshot.value, '');
    assert.equal(row.computed.fontsReady, 'loaded'); assert.equal(row.computed.fontCheck, true);
    assert.equal(row.computed.fontSize, '16px'); assert.equal(row.computed.lineHeight, '24px');
    assert.equal(row.snapshot.site.styles[0].fontFamily, row.font);
    assert.equal(row.fonts.length, 3);
    const text = row.fonts.filter(r => r.nodeName === '#text' && r.nodeValue === 'Project name'); assert.equal(text.length, 1);
    for (const node of row.fonts) {
      assert.equal(node.fonts.length, 1);
      assert.equal(node.fonts[0].familyName, row.font === 'Arial' ? 'Arial' : 'Consolas');
      assert.equal(node.fonts[0].postScriptName, row.font === 'Arial' ? 'ArialMT' : 'Consolas');
      assert.equal(node.fonts[0].glyphCount, 12); assert.equal(node.fonts[0].isCustomFont, false);
    }
    assert.equal(row.computed.textMetrics.fontBoundingBoxAscent + row.computed.textMetrics.fontBoundingBoxDescent,
      row.font === 'Arial' ? 17 : 19);
  }
  // Native input/placeholder font observations; candidate canvas-font identity and a universal caret law are not proved.
});
