import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// Reuse the existing package-root runner/lifecycle, not the compensated showcase.
const baseFile = 'scripts/audit-public-relative-margins.mjs';
const base = readFileSync(baseFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseSha256 = '58c335b85f8405bd807a4a7b023c8a889e52e817d5924d549121c6e6e5cb5474';
assert.equal(hash(base), baseSha256);
let source = base.toString().replaceAll('\r\n', '\n');
const replace = (before, after) => {
  assert.equal(source.split(before).length, 2, `Ambiguous paragraph recipe: ${before}`);
  source = source.replace(before, after);
};
replace("{type:'div',id:'child'}", "{type:'p',id:'child',children:[{type:'span',id:'leaf',textContent:'Agpy'}]}");
replace("background:'#eeeeee'},", "background:'#eeeeee',fontSize:font+'px',fontFamily:'Arial, sans-serif',lineHeight:unit==='normal'?'normal':(font*1.25)+'px'},");
replace("height:'24px',fontSize:font+'px',fontFamily:'Arial, sans-serif',margin:unit==='em'?'1em 0':font+'px 0',", "height:'auto',margin:'0',");
replace("const parent=document.createElement('div'),child=document.createElement('div');parent.id='parent';child.id='child';parent.append(child);host.append(parent);",
  "const parent=document.createElement('div'),child=document.createElement('p'),leaf=document.createElement('span');parent.id='parent';child.id='child';leaf.id='leaf';leaf.textContent='Agpy';child.append(leaf);parent.append(child);host.append(parent);");
replace("computed:native?{marginTop:native.marginTop,fontSize:native.fontSize}:null,",
  "runtime:{dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],fontAvailable:document.fonts.check(font+'px Arial','Agpy')},nativeRange:mode==='reference'?(()=>{const range=document.createRange();range.selectNodeContents(document.getElementById('leaf'));const r=range.getBoundingClientRect(),h=host.getBoundingClientRect();return {left:r.left-h.left,top:r.top-h.top,width:r.width,height:r.height};})():null,retainedLeaf:surface?.inspectResolvedStyles().elements.find(element=>element.id==='leaf')??null,computed:native?{marginTop:native.marginTop,fontSize:native.fontSize,fontFamily:native.fontFamily,lineHeight:native.lineHeight}:null,");
replace("for (const context of ['block', 'flex']) for (const unit of ['em', 'px'])", "for (const context of ['block']) for (const unit of ['normal', 'px'])");
replace("row[mode] = await page.evaluate(() => window.marginAudit.snapshot());", "row[mode] = await page.evaluate(() => window.marginAudit.snapshot());\n        if(mode==='reference'){const cdp=await page.context().newCDPSession(page);try{await cdp.send('DOM.enable');await cdp.send('CSS.enable');const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#leaf'});row[mode].platformFonts=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});}finally{await cdp.detach();}}");
replace("unequal.results[0].astylar.site.styles[2].margin = '0';", "unequal.results[0].astylar.site.styles[2].height = '999px';");
replace('inputs, runtime, errors, results };', 'inputs, runtime, errors, results, sourceRecipe: recipe };');
replace('const runtime = { browser: browser.version(),', 'const runtime = { node: process.version, browser: browser.version(),');
assert.equal(source.split('public-relative-margin-diagnostic').length, 3);
source = source.replaceAll('public-relative-margin-diagnostic', 'public-paragraph-linebox-diagnostic');
assert.equal(source.split('import.meta.filename').length, 3);
source = source.replaceAll('import.meta.filename', 'runnerFile');
const ast = ts.createSourceFile('paragraph-runner.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const omitted = ast.statements.filter(node => ts.isImportDeclaration(node) || ts.isFunctionDeclaration(node) && node.name?.text === 'verify');
assert.equal(omitted.length, 9);
for (const node of omitted.toReversed()) source = source.slice(0, node.getFullStart()) + source.slice(node.end);
const recipe = { base: { file: baseFile, sha256: baseSha256 }, logicalRunnerSha256: hash(source),
  producerGraph: fingerprintModuleGraph(process.cwd(), import.meta.filename),
  scope: 'Zero-margin p/span auto-height under inherited Arial16/24px and normal versus explicit1.25x-pixel line height,DPR1/2. No empty separator,Material or painted-font equivalence claim.' };
const output = path.resolve(process.argv[process.argv[2] === '--verify' ? 3 : 2] ?? '');
function verify(report) {
  assert.equal(report.kind, 'public-paragraph-linebox-diagnostic');
  assert.equal(report.scriptSha256, hash(readFileSync(import.meta.filename)));
  assert.deepEqual(report.sourceRecipe, recipe);
  assert.equal(report.runtime.node, process.version);
  assert.deepEqual(report.errors, []);
  assert.equal(report.results.length, 8);
  const keys = new Set(), observations = [];
  for (const row of report.results) {
    const key = `${row.dpr}/${row.font}/${row.unit}`;
    assert.ok(!keys.has(key)); keys.add(key);
    assert.ok([1, 2].includes(row.dpr) && [16, 24].includes(row.font));
    assert.ok(['normal', 'px'].includes(row.unit)); assert.equal(row.context, 'block');
    assert.deepEqual(row.reference.site, row.astylar.site);
    for (const side of ['reference', 'astylar']) {
      const o = row[side];
      assert.equal(o.inputUnchanged, true); assert.deepEqual(o.errors, []);
      assert.equal(o.site.styles[2].height, 'auto'); assert.equal(o.site.styles[2].margin, '0');
      assert.equal(o.site.styles[1].fontSize, `${row.font}px`);
      assert.equal(o.site.styles[1].lineHeight, row.unit === 'normal' ? 'normal' : `${row.font * 1.25}px`);
      assert.equal(o.runtime.dpr, row.dpr); assert.deepEqual(o.runtime.viewport, [400, 260]);
      assert.equal(o.runtime.fontAvailable, true);
      assert.equal(path.basename(o.screenshot.file), o.screenshot.file);
      assert.equal(hash(readFileSync(path.join(output, o.screenshot.file))), o.screenshot.sha256);
      for (const owner of ['parent', 'child']) for (const value of Object.values(o.bounds[owner])) assert.ok(Number.isFinite(value));
    }
    assert.equal(row.reference.computed.marginTop, '0px');
    assert.equal(row.reference.computed.fontSize, `${row.font}px`);
    assert.ok(row.reference.platformFonts.fonts.some(font => font.glyphCount > 0));
    assert.ok(row.astylar.retainedLeaf?.retainedText, 'Missing observed retained text owner');
    const error = row.astylar.bounds.child.height - row.reference.bounds.child.height;
    observations.push({ dpr: row.dpr, font: row.font, lineHeight: row.unit, errorCSSpx: error,
      reference: row.reference.bounds.child, candidate: row.astylar.bounds.child,
      nativeFonts: row.reference.platformFonts.fonts, retainedLeaf: row.astylar.retainedLeaf.retainedText });
  }
  assert.equal(keys.size, 8);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  return { observations, boundary: 'Input/runtime/evidence completeness; measured differences remain failures,not whole-case parity or a painted candidate-font identification' };
}
const run = new (Object.getPrototypeOf(async function () {}).constructor)(
  'assert', 'createHash', 'existsSync', 'mkdirSync', 'readFileSync', 'writeFileSync', 'createRequire',
  'createServer', 'path', 'chromium', 'materialBrowserLaunchOptions', 'inspectMaterialBrowserLaunch', 'runnerFile', 'recipe', 'verify', source);
if (process.argv[2] === '--preflight') {
  const browserTemplate = ast.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations])
    .find(node => node.name.getText(ast) === 'contents')?.initializer;
  assert.ok(browserTemplate && ts.isNoSubstitutionTemplateLiteral(browserTemplate));
  const browserAST = ts.createSourceFile('paragraph-browser.mjs', browserTemplate.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(browserAST.parseDiagnostics.length, 0);
  console.log(JSON.stringify({ phase: 'paragraph-linebox-recipe-preflight', recipe,
    nodeAndBrowserSyntaxValid: true, browserExecuted: false }));
} else await run(assert, createHash, existsSync, mkdirSync, readFileSync, writeFileSync, createRequire,
  createServer, path, chromium, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, import.meta.filename, recipe, verify);
