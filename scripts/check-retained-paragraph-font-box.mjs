import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// Mechanism check alongside,not instead of,the package-root public reproduction.
// Serve its retained bytes unchanged and execute the authenticated parser owner.
const hash = value => createHash('sha256').update(value).digest('hex');
assert.ok(process.argv.slice(2).every(arg => arg === '--compare-current-browser') && process.argv.length <= 3,
  'Only the explicit current-browser comparison option is supported');
const compareCurrentBrowser = process.argv.includes('--compare-current-browser');
const directory = 'artifacts/material-parity/public-paragraph-linebox-20261015';
const bytes = fs.readFileSync(`${directory}/latest-report.json`);
assert.equal(hash(bytes), 'dd72dd2efc9c6838f6bce46b23b1ea0f56bcbab45de0414497ebcbb592aa5bf7');
const report = JSON.parse(bytes), bundle = fs.readFileSync(`${directory}/audit.js`), html = fs.readFileSync(`${directory}/index.html`);
assert.equal(hash(bundle), report.runtime.bundleSha256); assert.equal(hash(html), report.runtime.htmlSha256);
const sourceFile = 'src/app/services/text/text-style-parser.service.ts';
const installedFile = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/text/text-style-parser.service.js';
const source = fs.readFileSync(sourceFile, 'utf8'), installed = fs.readFileSync(installedFile, 'utf8');
assert.equal(hash(Buffer.from(installed)), report.inputs.find(row => row.file === installedFile).sha256);
const sourceAST = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const original = sourceAST.statements.find(ts.isClassDeclaration);
const emitted = ts.transpileModule(`class Owner {${original.members.map(node => node.getText(sourceAST)).join('\n')}}`,
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const emittedAST = ts.createSourceFile('owner.js', emitted, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const installedAST = ts.createSourceFile(installedFile, installed, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const emittedOwner = emittedAST.statements.find(ts.isClassDeclaration), installedOwner = installedAST.statements.find(ts.isClassDeclaration);
const members = owner => owner.members.filter(node => !node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.StaticKeyword));
const currentMembers = members(emittedOwner), capturedMembers = members(installedOwner);
const printer = ts.createPrinter({ removeComments: true });
const print = (node, ast) => printer.printNode(ts.EmitHint.Unspecified, node, ast);
assert.deepEqual(capturedMembers.map(node => print(node, installedAST)), currentMembers.map(node => print(node, emittedAST)));
const ownerSource = capturedMembers.map(node => node.getText(installedAST)).join('\n');
const server = createServer((request, response) => {
  const script = request.url === '/audit.js'; response.setHeader('content-type', script ? 'text/javascript' : 'text/html');
  response.end(script ? bundle : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const observations = [], errors = [];
let observedRuntime;
try {
  const launch = materialBrowserLaunchOptions();
  browser = await chromium.launch(launch);
  if (!compareCurrentBrowser) assert.equal(browser.version(), report.runtime.browser);
  observedRuntime = { browser: browser.version(), launch: await inspectMaterialBrowserLaunch(browser, launch) };
  for (const prior of report.results) {
    const page = await browser.newPage({ viewport: { width: 400, height: 260 }, deviceScaleFactor: prior.dpr });
    page.on('pageerror', error => errors.push(String(error)));
    try {
      const query = new URLSearchParams({ mode: 'reference', font: String(prior.font), context: 'block', unit: prior.unit });
      await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`);
      await page.waitForFunction(() => !!window.marginAudit);
      const observation = await page.evaluate(ownerSource => {
        const owner = new (Function(`return class Owner {${ownerSource}}`)())();
        const leaf = document.getElementById('leaf'), parent = document.getElementById('child');
        const computed = getComputedStyle(leaf);
        const parsed = owner.parseTextProperties({ fontFamily: computed.fontFamily, fontSize: computed.fontSize,
          fontWeight: computed.fontWeight, fontStyle: computed.fontStyle, lineHeight: computed.lineHeight });
        const context = document.createElement('canvas').getContext('2d');
        context.font = `${parsed.fontStyle} ${parsed.fontWeight} ${parsed.fontSize}px ${parsed.fontFamily}`;
        const metrics = context.measureText('Mg');
        const range = document.createRange(); range.selectNodeContents(leaf);
        return { dpr: devicePixelRatio, fontSize: parsed.fontSize, lineHeightRequest: computed.lineHeight,
          fontBoxHeight: metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent,
          ownerLineHeight: parsed.fontSize * parsed.lineHeight,
          nativeParagraphHeight: parent.getBoundingClientRect().height, nativeRangeHeight: range.getBoundingClientRect().height };
      }, ownerSource);
      assert.equal(observation.dpr, prior.dpr); assert.equal(observation.fontSize, prior.font);
      assert.equal(observation.nativeParagraphHeight, prior.reference.bounds.child.height);
      assert.equal(observation.nativeRangeHeight, prior.reference.nativeRange.height);
      assert.equal(observation.ownerLineHeight, prior.astylar.retainedLeaf.retainedLayout.height);
      assert.equal(observation.ownerLineHeight, prior.astylar.bounds.child.height);
      if (prior.unit === 'normal') {
        assert.equal(observation.ownerLineHeight, observation.fontBoxHeight);
        assert.equal(observation.nativeParagraphHeight - observation.ownerLineHeight, 1);
      } else assert.equal(observation.nativeParagraphHeight, observation.ownerLineHeight);
      observations.push({ unit: prior.unit, ...observation });
      await page.evaluate(() => window.marginAudit.dispose());
    } finally { await page.close(); }
  }
  assert.deepEqual(errors, []); assert.equal(observations.length, 8);
  console.log(JSON.stringify({ phase: 'normal-paragraph-font-box-owner-boundary',
    scriptSha256: hash(fs.readFileSync(import.meta.filename)), publicReportSha256: hash(bytes),
    sourceSha256: hash(Buffer.from(source)), installedSha256: hash(Buffer.from(installed)),
    completeOwnerMembersMatch: capturedMembers.length, observations,
    comparison: { mode: compareCurrentBrowser ? 'fresh-current-browser-versus-retained-measurements' : 'same-browser-owner-check',
      recordedBrowser: report.runtime.browser, observedRuntime, observationsCompared: observations.length,
      allNumericComparisonsUnchanged: true, currentRenderingAccepted: false },
    boundary: 'Bounded CSS normal strut versus canvas font-box mismatch before projection. Not a complete browser normal-line-height algorithm,other fonts,Material wrapper attribution,updates or raster acceptance.' }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
