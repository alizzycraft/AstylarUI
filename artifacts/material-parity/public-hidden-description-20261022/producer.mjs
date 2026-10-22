process.argv.splice(1,0,"derived-hidden-description");
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';

// Reuse the maintained public-package page; overlays never modify its sources.
assert.equal(process.argv.length, 3);
const output = path.resolve(process.argv[2]);
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.equal(existsSync(output), false, 'Use a fresh diagnostic directory');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const entry = 'examples/material-showcase/audit/cursor-defaults.mjs';
const input = 'examples/material-showcase/audit/cursor-default-input.mjs';
const entryOriginal = readFileSync(entry, 'utf8'), inputOriginal = readFileSync(input, 'utf8');
assert.equal(entryOriginal.split('function append(parent, description) {').length, 2);
assert.equal(inputOriginal.split('export function cursorInput(name)').length, 2);
const overlays = new Map([
  [path.resolve(entry), entryOriginal.replace('const node = document.createElement(description.type); node.id = description.id;',
    'const node = document.createElement(description.type); node.id = description.id; node.hidden = !!description.hidden; if (description.ariaDescribedby) node.setAttribute("aria-describedby", description.ariaDescribedby);')],
  [path.resolve(input), inputOriginal.replace('export function cursorInput(name)', 'function baseCursorInput(name)') + `
export function cursorInput(name) {
  if(!['visible','hidden-child','hidden-root','hidden-parent'].includes(name)) throw new Error('Unknown case');
  const site=baseCursorInput('button-omitted');
  const target={type:'button',id:'target',value:'Target',ariaDescribedby:'description'};
  const description={type:'span',id:'description',textContent:'Help info',
    ...(['hidden-child','hidden-root'].includes(name)?{hidden:true}:{})};
  site.root.children=[{type:'div',id:'parent',children:[target,
    ...(name==='hidden-root'?[]:name==='hidden-parent'
      ?[{type:'div',id:'hidden-parent',hidden:true,children:[description]}]:[description])]},
    ...(name==='hidden-root'?[description]:[])];
  return site;
}
`],
]);
const consumer = createRequire(`${process.cwd()}/examples/material-showcase/package.json`);
const built = await consumer('esbuild').build({ absWorkingDir: process.cwd(), entryPoints: [entry],
  bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true,
  plugins: [{ name: 'hidden-description-proof', setup(build) {
    build.onLoad({ filter: /cursor-default(s|-input)\.mjs$/ }, args => {
      assert.ok(overlays.has(args.path));
      return { contents: overlays.get(args.path), loader: 'js', resolveDir: path.dirname(args.path) };
    });
  } }],
});
const bundle = built.outputFiles[0].contents;
const html = Buffer.from('<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>');
mkdirSync(output, { recursive: true });
const producer = 'scripts/audit-public-hidden-description.mjs';
writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);
writeFileSync(path.join(output, 'audit.js'), bundle);
const provenance = { producer: { file: producer, sha256: hash(readFileSync(producer)) },
  baseProducer: { file: 'scripts/audit-public-semantic-css-hidden.mjs', sha256: hash(readFileSync('scripts/audit-public-semantic-css-hidden.mjs')) },
  generatedProducer: { file: path.relative(process.cwd(),path.join(output,'producer.mjs')).split(path.sep).join('/'), sha256: hash(readFileSync(path.join(output,'producer.mjs'))) },
  bundleSha256: hash(bundle), htmlSha256: hash(html),
  overlays: [...overlays].map(([file, source]) => ({ file: path.relative(process.cwd(), file).replaceAll('\\', '/'),
    originalSha256: hash(readFileSync(file)), compiledSource: source, compiledSha256: hash(source) })),
  bundleInputs: Object.keys(built.metafile.inputs).sort().map(file => ({ file, sha256: hash(readFileSync(file)) })),
};
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance));
const server = createServer((request, response) => {
  response.setHeader('content-type', request.url === '/audit.js' ? 'text/javascript' : 'text/html');
  response.end(request.url === '/audit.js' ? bundle : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const captures = [], failures = [], errors = [];
try {
  for (const dpr of [1, 2]) for (const variant of ['visible', 'hidden-child', 'hidden-root', 'hidden-parent']) {
    let referenceSite;
    for (const mode of ['reference', 'astylar']) {
      const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: dpr });
      page.on('pageerror', error => errors.push({ mode, dpr, variant, error: error.message }));
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&case=${variant}&translated=false`);
        await page.waitForFunction(() => !!window.cursorDefaultAudit);
        await page.evaluate(() => window.cursorDefaultAudit.settle());
        const snapshot = await page.evaluate(() => window.cursorDefaultAudit.snapshot({ x: 220, y: 130 }));
        if (mode === 'reference') referenceSite = snapshot.site;
        else assert.deepEqual(snapshot.site, referenceSite, 'Equal public authored inputs');
        const cdp = await page.context().newCDPSession(page);
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const exposedText = nodes.filter(n => !n.ignored && n.role?.value === 'StaticText' && n.name?.value === 'Help info');
        const expected = variant === 'visible' ? 1 : 0;
        if (exposedText.length !== expected) failures.push({ check:'text-exposure', mode, variant, dpr, expected, actual:exposedText.length });
        const buttons=nodes.filter(n=>!n.ignored&&n.role?.value==='button'&&n.name?.value==='Target');
        assert.equal(buttons.length,1);
        const description=buttons[0].description?.value??null,expectedDescription='Help info';
        const semanticDom=await page.evaluate(mode=>{
          const button=mode==='reference'?document.getElementById('target'):document.querySelector('[data-astylar-id="target"]');
          const referenceId=button?.getAttribute('aria-describedby')??null;
          const described=referenceId?document.getElementById(referenceId):null;
          return {buttonExists:!!button,buttonTag:button?.tagName??null,
            buttonAttributes:button?[...button.attributes].map(a=>[a.name,a.value]):[],referenceId,
            targetExists:!!described,targetTag:described?.tagName??null,targetText:described?.textContent??null,
            targetHidden:described?.hidden??null,targetParentHidden:described?.parentElement?.hidden??null};
        },mode);
        if(description!==expectedDescription)failures.push({check:'description',mode,variant,dpr,expected:expectedDescription,actual:description});
        const disposed = await page.evaluate(() => window.cursorDefaultAudit.dispose());
        assert.equal(disposed.disposed, true);
        const observation = { mode, variant, dpr, snapshot, nodes, semanticDom, description, expectedDescription, exposedText: exposedText.length, expected, disposed };
        const file = `${variant}-${mode}-dpr${dpr}.json`, bytes = JSON.stringify(observation);
        writeFileSync(path.join(output, file), bytes);
        captures.push({ mode, variant, dpr, file, sha256: hash(bytes), exposedText: exposedText.length, expected, description, expectedDescription });
        await cdp.detach();
      } finally { await page.close(); }
    }
  }
  assert.equal(captures.length, 16); assert.deepEqual(errors, []);
  for (const receipt of provenance.bundleInputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  for (const overlay of provenance.overlays) assert.equal(hash(readFileSync(overlay.file)), overlay.originalSha256);
  const report = { provenance, browser: browser.version(), captures, failures, errors, accepted: failures.length === 0,
    scope: 'Equal public-package button/described-text inputs;visible,nested hidden target,root hidden target and hidden ancestor atDPR1/2. Reference creates native hidden DOM nodes rather than eliding them. Actual AX description/exposure and DOM target presence only;not Material cause attribution,AT navigation,updates,paint or full rendering acceptance.' };
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify(report));
  console.log(JSON.stringify({ output, captures: captures.length, failures, errors }));
  assert.deepEqual(failures, [], 'Referenced hidden descriptions are lost in actual AX');
} catch (error) {
  writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), stack: error.stack, captures, failures, errors }));
  throw error;
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
