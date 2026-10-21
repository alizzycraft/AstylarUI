import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

// Reuse the maintained public package-root page. Diagnostic overlays only;
// canonical fixtures,reference inputs and renderer sources are never changed.
const root = process.cwd(), arg = process.argv[2];
assert.ok(process.argv.length === 3 && arg.startsWith('--output='));
const output = path.resolve(root, arg.slice(9));
assert.ok(output.startsWith(path.resolve(root, 'artifacts/material-parity') + path.sep));
assert.equal(existsSync(output), false, 'Use a fresh diagnostic output directory');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = 'examples/material-showcase/audit/cursor-defaults.mjs';
const input = 'examples/material-showcase/audit/cursor-default-input.mjs';
const entryOriginal = readFileSync(entry, 'utf8'), inputOriginal = readFileSync(input, 'utf8');
const append = "node.textContent = description.textContent ?? description.value ?? ''; parent.append(node);";
assert.equal(entryOriginal.split(append).length, 2);
const entryOverlay = entryOriginal.replace(append, `
    if (description.type === 'input') {
      node.type = description.inputType;
      if (Object.hasOwn(description,'value')) node.value = description.value;
      if (Object.hasOwn(description,'name')) node.name = description.name;
      node.checked = description.checked ?? false;
      node.disabled = description.disabled ?? false;
      if(description.ariaLabel) node.setAttribute('aria-label',description.ariaLabel);
    } else node.textContent = description.textContent ?? description.value ?? '';
    parent.append(node);`).replace('  snapshot(point) {', `
  controlDetails() {
    const native = mode === 'reference' ? document.getElementById('target') : null;
    const managed = surface?.host?.inputElementService?.getInputElement('target');
    return {native:native?{tag:native.tagName,type:native.type,value:native.value,
      valueAttribute:native.getAttribute('value'),checked:native.checked,disabled:native.disabled,
      textContent:native.textContent}:null,
      manager:managed?{type:managed.type,value:managed.value,checked:managed.checked,
        labelMesh:managed.labelMesh?{name:managed.labelMesh.name,visible:managed.labelMesh.isVisible}:null}:null};
  },
  snapshot(point) {`);
assert.equal(inputOriginal.split('export function cursorInput(name)').length, 2);
const inputOverlay = inputOriginal.replace('export function cursorInput(name)', 'function baseCursorInput(name)') + `
export function cursorInput(name) {
  const [kind,variant] = name.split(':');
  if(!['radio','checkbox'].includes(kind)||!['omitted','value'].includes(variant)) throw new Error('Unknown control');
  const site=baseCursorInput('button-omitted');
  site.root.children[0].children=[{type:'input',inputType:kind,id:'target',name:'choice',
    checked:false,disabled:false,ariaLabel:'Choice',...(variant==='value'?{value:'VALUEONLY'}:{})}];
  Object.assign(site.styles[1],{width:'20px',height:'20px',appearance:'none',borderWidth:'2px',
    borderStyle:'solid',borderColor:'#111111',borderRadius:kind==='radio'?'50%':'0'});
  return site;
}
`;
const overlays = new Map([[path.resolve(entry), entryOverlay], [path.resolve(input), inputOverlay]]);
const consumer = createRequire(path.join(root, 'examples/material-showcase/package.json'));
const built = await consumer('esbuild').build({ absWorkingDir: root, entryPoints: [entry], bundle: true, write: false,
  format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  plugins: [{ name: 'native-value-diagnostic', setup(build) {
    build.onLoad({ filter: /cursor-default(s|-input)\.mjs$/ }, args => {
      assert.ok(overlays.has(args.path));
      return { contents: overlays.get(args.path), loader: 'js', resolveDir: path.dirname(args.path) };
    });
  } }],
});
const bundle = built.outputFiles[0].contents;
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>');
mkdirSync(output, { recursive: true });
const ownFile = 'scripts/audit-public-native-checkable-value.mjs';
writeFileSync(path.join(output, 'producer.mjs'), readFileSync(ownFile));
writeFileSync(path.join(output, 'audit.js'), bundle);
const provenance = { producer: { file: ownFile, sha256: hash(readFileSync(ownFile)) },
  bundleSha256: hash(bundle), htmlSha256: hash(html),
  overlays: [...overlays].map(([file, source]) => ({ file: path.relative(root, file).replaceAll('\\', '/'),
    originalSha256: hash(readFileSync(file)), compiledSource: source, compiledSha256: hash(source) })),
  bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })),
  packages: Object.fromEntries(['@angular/core', '@angular/platform-browser', '@babylonjs/core', 'astylarui', 'esbuild']
    .map(name => [name, JSON.parse(readFileSync(`examples/material-showcase/node_modules/${name}/package.json`)).version])),
};
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance));
const server = createServer((request, response) => {
  response.setHeader('content-type', request.url === '/audit.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/audit.js' ? bundle : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const captures = [], comparisons = [], errors = [], failures = [];
try {
  for (const dpr of [1, 2]) for (const kind of ['radio', 'checkbox']) {
    const paired = new Map(), images = new Map();
    for (const mode of ['reference', 'astylar']) for (const variant of ['omitted', 'value']) {
      const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: dpr });
      page.on('pageerror', error => errors.push({ mode, dpr, kind, variant, error: error.message }));
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=${kind}:${variant}&translated=false`);
        await page.waitForFunction(() => !!window.cursorDefaultAudit);
        await page.evaluate(() => window.cursorDefaultAudit.settle());
        await page.mouse.move(300, 160); await page.evaluate(() => window.cursorDefaultAudit.settle());
        const snapshot = await page.evaluate(() => ({ snapshot: window.cursorDefaultAudit.snapshot({ x: 46, y: 58 }),
          control: window.cursorDefaultAudit.controlDetails() }));
        const png = await page.screenshot({ animations: 'disabled' });
        const file = `${kind}-${variant}-${mode}-dpr${dpr}.png`;
        writeFileSync(path.join(output, file), png);
        images.set(`${mode}:${variant}`, PNG.sync.read(png));
        if (mode === 'reference') {
          assert.equal(snapshot.control.native.type, kind);
          assert.equal(snapshot.control.native.value, variant === 'value' ? 'VALUEONLY' : 'on');
          assert.equal(snapshot.control.native.textContent, '');
          paired.set(variant, snapshot.snapshot.site);
        } else assert.deepEqual(snapshot.snapshot.site, paired.get(variant), 'Equal authored inputs');
        const disposed = await page.evaluate(() => window.cursorDefaultAudit.dispose());
        assert.equal(disposed.disposed, true);
        captures.push({ mode, dpr, kind, variant, ...snapshot, screenshot: { file, sha256: hash(png) }, disposed });
      } finally { await page.close(); }
    }
    for (const mode of ['reference', 'astylar']) {
      const a = images.get(`${mode}:omitted`), b = images.get(`${mode}:value`);
      assert.equal(a.width, b.width); assert.equal(a.height, b.height);
      let changedPixels = 0; const bounds = { left: a.width, top: a.height, right: -1, bottom: -1 };
      for (let i = 0; i < a.data.length; i += 4) {
        if (a.data.subarray(i, i + 4).equals(b.data.subarray(i, i + 4))) continue;
        changedPixels++; const x = i / 4 % a.width, y = Math.floor(i / 4 / a.width);
        bounds.left = Math.min(bounds.left, x); bounds.top = Math.min(bounds.top, y);
        bounds.right = Math.max(bounds.right, x); bounds.bottom = Math.max(bounds.bottom, y);
      }
      const comparison = { mode, dpr, kind, changedPixels, bounds: changedPixels ? bounds : null };
      comparisons.push(comparison);
      if (changedPixels !== 0) failures.push({ ...comparison, assertion: 'Form value alone must not change input pixels' });
    }
  }
  assert.equal(captures.length, 16); assert.deepEqual(errors, []);
  for (const receipt of provenance.bundleInputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  for (const overlay of provenance.overlays) assert.equal(hash(readFileSync(overlay.file)), overlay.originalSha256);
  const report = { provenance, browser: browser.version(), captures, comparisons, errors, failures, accepted: failures.length === 0,
    scope: 'Equal package-root unchecked native radio/checkbox inputs;value omitted versus form value atDPR1/2. Same-engine pixel invariance only,not full paired control paint,Material reproduction,activation,event order,AX or whole-audit acceptance.' };
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report));
  console.log(JSON.stringify({ output: path.relative(root, output), captures: captures.length, comparisons, failures, runtimeErrors: errors }));
  assert.deepEqual(failures, [], 'Native form-value rendering differs;retain complete failures');
} catch (error) {
  writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), stack: error.stack, captures, comparisons, errors, failures }));
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
