import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { PNG } from 'pngjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const load = receipt => {
  const bytes = readFileSync(receipt.file);
  assert.equal(hash(bytes), receipt.sha256, receipt.file);
  return JSON.parse(bytes);
};
const compile = source => ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;
const find = (ast, predicate) => {
  const matches = [];
  const visit = node => { if (predicate(node)) matches.push(node); ts.forEachChild(node, visit); };
  visit(ast); assert.equal(matches.length, 1); return matches[0];
};

test('retained Slider state layers diverge in application inputs before plugin paint', t => {
  const report = load({ file: 'artifacts/material-parity/slider-hover-held-20261024/latest-report.json',
    sha256: 'de4228f971a0b0b341a21c9d71a20d9f351701ec634257732c6ed6d929a8ec98' });
  const manifest = load(report.capture.checkpointManifest);
  const servedModules = [];
  const moduleSource = (mapFile, source, expected) => {
    const receipt = manifest.provenance.browserFiles.find(row => row.file === mapFile);
    assert.ok(receipt);
    const map = load({ ...receipt, file: 'examples/material-showcase/dist/material-showcase/browser/' + mapFile });
    const script = manifest.provenance.browserFiles.find(row => row.file === mapFile.slice(0, -4));
    assert.ok(script);
    const bytes = readFileSync('examples/material-showcase/dist/material-showcase/browser/' + script.file);
    assert.equal(hash(bytes), script.sha256);
    assert.ok(bytes.toString().includes('sourceMappingURL=' + mapFile));
    servedModules.push(script);
    const index = map.sources.indexOf(source); assert.ok(index >= 0);
    const text = map.sourcesContent[index]; assert.equal(hash(text), expected);
    assert.equal(readFileSync('examples/material-showcase/' + source, 'utf8'), text);
    return ts.createSourceFile(source, text, 99, true, ts.ScriptKind.TS);
  };
  const app = moduleSource('chunk-PCHQTLJM.js.map', 'src/app/astylar.component.ts',
    '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd');
  const plugin = moduleSource('main.js.map', 'src/app/material-plugin/material-showcase.plugin.ts',
    'dee2c10af7f3116bc6a476d63182ac182e5717b90f5333a327b77213e0b9107e');
  const options = find(app, node => ts.isPropertyDeclaration(node) && node.name.getText(app) === 'options');
  const handle = find(app, node => ts.isFunctionDeclaration(node) && node.name?.text === 'sliderHandleName');
  const handleName = new Function(compile(handle.getText(app)) + ';return sliderHandleName;')();
  const update = find(plugin, node => ts.isVariableDeclaration(node) && node.name.getText(plugin) === 'updateStateLayer');
  const updateStatement = update.parent.parent.getText(plugin);
  const servedCandidate = row => {
    for (const script of servedModules) {
      assert.equal(row.astylar.runtime.assets.find(asset => asset.file === script.file)?.sha256, script.sha256);
    }
  };
  class Material { alpha = 0; }
  const signal = () => { let value; const read = () => value; read.set = next => { value = next; }; return read; };
  let hover = 0, held = 0, nativeLayers = 0;
  assert.equal(report.results.length, 16);
  for (const row of report.results) {
    const reference = load(row.reference.inputTree), candidate = load(row.astylar.inputTree);
    servedCandidate(row);
    for (const side of ['reference', 'astylar']) {
      assert.equal(hash(readFileSync(row[side].screenshot.file)), row[side].screenshot.sha256);
    }
    const visual = candidate.nodes.find(node => node.authored?.id === 'slider-visual');
    assert.match(visual.authored.data['state-color'], /^#[0-9a-f]{6}$/i);
    const layers = reference.nodes.filter(node => /mat-ripple-element/.test(node.attributes?.class ?? ''));
    assert.equal(layers.length, row.state === 'hover' ? 1 : 2);
    nativeLayers += layers.length;
    for (const layer of layers) {
      const style = reference.styles[layer.style];
      assert.deepEqual([style.width, style.height, style.opacity], ['48px', '48px', '1']);
      const color = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)$/.exec(style.backgroundColor);
      assert.ok(color); assert.equal(Number(color[4]), row.state === 'hover' ? .05 : .2);
      const hex = visual.authored.data['state-color'];
      for (let channel = 0; channel < 3; channel++) {
        assert.ok(Math.abs(Number(color[channel + 1]) - parseInt(hex.slice(1 + channel * 2, 3 + channel * 2), 16) / 255) < .000001);
      }
    }
    const stateLayers = { start: { material: new Material() }, end: { material: new Material() } };
    const updateLayer = new Function('stateLayers', 'StandardMaterial',
      compile(updateStatement) + ';return updateStateLayer;')(stateLayers, Material);
    const owner = { benchmarkMode: true, zone: { run: fn => fn() }, recordEvent() {},
      canonicalFocusTarget: id => id, pressedSliderId: signal(), hoveredSliderId: signal(),
      updateSliderStateLayer: updateLayer };
    const configured = new Function('Color4', 'sliderHandleName',
      compile('const options = ' + options.initializer.getText(app)) + ';return options;')
      .call(owner, { FromHexString: value => value }, handleName);
    const handlers = configured.events.handlers['slider-primary'];
    handlers.pointerenter({ targetId: 'slider-primary' });
    assert.equal(stateLayers.end.material.alpha, .08);
    if (row.state === 'held') { handlers.pointerdown({ targetId: 'slider-primary' }); held++; } else hover++;
    assert.equal(stateLayers.start.material.alpha, 0);
    assert.equal(stateLayers.end.material.alpha, row.state === 'hover' ? .08 : .12);
    // Replay the original material update,not a proposed replacement alpha.
    updateLayer('', 0);
    assert.deepEqual([stateLayers.start.material.alpha, stateLayers.end.material.alpha], [0, 0]);
    assert.ok(layers.some(layer => /hover-ripple|active-ripple/.test(layer.attributes.class)));
    if (row.state === 'held') assert.ok(layers.some(layer => /focus-ripple/.test(layer.attributes.class)));
  }
  assert.deepEqual({ hover, held, nativeLayers }, { hover: 8, held: 8, nativeLayers: 24 });
  const missing = structuredClone(report.results[0]);
  missing.astylar.runtime.assets = missing.astylar.runtime.assets.filter(asset => asset.file !== 'chunk-PCHQTLJM.js');
  assert.throws(() => servedCandidate(missing));
  t.diagnostic('16 retained contexts: native hover .05 versus plugin .08; native held active+focus .2/.2 versus one plugin .12 disc. Whole captured/current application and plugin modules agree. Application state-layer composition differs before paint;not equal-input alpha/projection causality,historical black-circle causality,local raster parity or whole-case acceptance.');
});

test('retained light Slider state-layer interiors differ at both DPRs', t => {
  const report = load({ file: 'artifacts/material-parity/slider-hover-held-20261024/latest-report.json',
    sha256: 'de4228f971a0b0b341a21c9d71a20d9f351701ec634257732c6ed6d929a8ec98' });
  const rows = report.results.filter(row => row.profile === 'light'); assert.equal(rows.length, 4);
  const observed = { reference: { hover: [238, 233, 244, 255], held: [195, 183, 219, 255] },
    astylar: { hover: [235, 228, 242, 255], held: [229, 221, 239, 255] } };
  for (const row of rows) for (const side of ['reference', 'astylar']) {
    const receipt = row[side].screenshot, bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256);
    const image = PNG.sync.read(bytes), dpr = row.viewport.deviceScaleFactor;
    assert.equal(image.width, row.viewport.width * dpr);
    assert.equal(image.height, row.viewport.height * dpr);
    let minY = image.height, maxY = -1, maxX = -1, count = 0;
    for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
      const i = (y * image.width + x) * 4;
      if ([103, 80, 164, 255].every((value, channel) => image.data[i + channel] === value)) {
        minY = Math.min(minY, y); maxY = Math.max(maxY, y); maxX = Math.max(maxX, x); count++;
      }
    }
    assert.ok(count > 100 * dpr * dpr);
    assert.ok(maxY - minY >= 18 * dpr && maxY - minY <= 20 * dpr);
    // Locate each retained image independently from its solid primary knob/track.
    // Inspect only a flat interior patch 18CSSpx above the right knob center:
    // outside its10px radius and inside the24px state-layer radius. This is
    // output sampling,not a fixture offset or claimed cross-image registration.
    const x = Math.round(maxX - (maxY - minY) / 2);
    const y = Math.round((minY + maxY) / 2 - 18 * dpr);
    assert.ok(x >= 2 * dpr && y >= 2 * dpr && x + 2 * dpr < image.width);
    for (let dy = -2 * dpr; dy <= 2 * dpr; dy++) for (let dx = -2 * dpr; dx <= 2 * dpr; dx++) {
      const i = ((y + dy) * image.width + x + dx) * 4;
      assert.deepEqual([...image.data.subarray(i, i + 4)], observed[side][row.state]);
    }
  }
  assert.notDeepEqual(observed.reference.hover, observed.astylar.hover);
  assert.notDeepEqual(observed.reference.held, observed.astylar.held);
  t.diagnostic('8 authenticated light DPR1/2 PNG interiors retain different hover/held colors. No opaque black patch in these sampled interiors. Unequal inputs are established separately;not historical black-circle causality,exact effective-alpha inversion,edge/track/glyph sharpness,other themes or whole-case acceptance.');
});
