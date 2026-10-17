import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, fingerprintModuleGraph } from '../tests/material-parity/run-checkpoint.mjs';

// One missing public reduction,using the existing capture/settlement runner.
const baseFile = 'scripts/audit-public-relative-margins.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const base = readFileSync(baseFile), baseSha256 = '58c335b85f8405bd807a4a7b023c8a889e52e817d5924d549121c6e6e5cb5474';
assert.equal(hash(base), baseSha256);
const png = new PNG({ width: 24, height: 24 });
for (let i = 0; i < png.data.length; i += 4) png.data.set([18, 52, 86, 255], i);
const asset = 'data:image/png;base64,' + PNG.sync.write(png).toString('base64');
let source = base.toString().replaceAll('\r\n', '\n');
function replace(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous inline-image recipe: ${before}`);
  source = source.replace(before, after);
}
replace("{type:'div',id:'child'}", `{type:'div',id:'child',children:[{type:'img',id:'leaf',src:${JSON.stringify(asset)}}]}`);
replace("display:context,flexDirection", "display:'block',flexDirection");
replace("display:'block',width:'80px',height:'24px',fontSize:font+'px',fontFamily:'Arial, sans-serif',margin:unit==='em'?'1em 0':font+'px 0',background:'#123456'}]",
  "display:'block',width:'80px',height:'auto',fontSize:font+'px',fontFamily:'Arial, sans-serif',lineHeight:unit==='normal'?'normal':(font*1.25)+'px',margin:'0',background:'#ffffff'},\n{selector:'#leaf',display:context,width:'24px',height:'24px',verticalAlign:'baseline'}]");
replace("const parent=document.createElement('div'),child=document.createElement('div');parent.id='parent';child.id='child';parent.append(child);host.append(parent);",
  "const parent=document.createElement('div'),child=document.createElement('div'),leaf=document.createElement('img');parent.id='parent';child.id='child';leaf.id='leaf';leaf.src=site.root.children[0].children[0].children[0].src;child.append(leaf);parent.append(child);host.append(parent);");
replace('await document.fonts.ready;', 'await Promise.all([...document.images].map(image=>image.decode()));await document.fonts.ready;');
replace("for(const id of ['parent','child'])", "for(const id of ['parent','child','leaf'])");
replace('computed:native?{marginTop:native.marginTop,fontSize:native.fontSize}:null,',
  "nativeImage:mode==='reference'?{complete:document.getElementById('leaf').complete,naturalWidth:document.getElementById('leaf').naturalWidth,naturalHeight:document.getElementById('leaf').naturalHeight}:null,computed:native?{marginTop:native.marginTop,fontSize:native.fontSize,fontFamily:native.fontFamily,lineHeight:native.lineHeight,height:native.height}:null,");
replace("for (const context of ['block', 'flex']) for (const unit of ['em', 'px'])", "for (const context of ['inline-block', 'block']) for (const unit of ['normal', 'px'])");
replace("unequal.results[0].astylar.site.styles[2].margin = '0';", "unequal.results[0].astylar.site.styles[2].height = '999px';");
replace('inputs, runtime, errors, results };', 'inputs, runtime, errors, results, sourceRecipe: recipe };');
assert.equal(source.split('public-relative-margin-diagnostic').length, 3);
source = source.replaceAll('public-relative-margin-diagnostic', 'public-inline-image-linebox-diagnostic');
assert.equal(source.split('import.meta.filename').length, 3);
source = source.replaceAll('import.meta.filename', 'runnerFile');
const ast = ts.createSourceFile('inline-image-runner.mjs', source, ts.ScriptTarget.Latest, true);
assert.equal(ast.parseDiagnostics.length, 0);
const removed = ast.statements.filter(node => ts.isImportDeclaration(node) || ts.isFunctionDeclaration(node) && node.name?.text === 'verify');
assert.equal(removed.length, 9);
for (const node of removed.toReversed()) source = source.slice(0, node.getFullStart()) + source.slice(node.end);
const recipe = { base: { file: baseFile, sha256: baseSha256 }, logicalRunnerSha256: hash(source),
  producerGraph: fingerprintModuleGraph(process.cwd(), import.meta.filename),
  scope: 'Equal auto-height block with one24px PNG,inline-block versus block image;Arial16/24,normal versus explicit1.25x line height,DPR1/2. No Material/SVG compensation or aggregate acceptance.' };
const output = path.resolve(process.argv[process.argv[2] === '--verify' ? 3 : 2] ?? '');
function verify(report) {
  assert.equal(report.kind, 'public-inline-image-linebox-diagnostic');
  assert.equal(report.scriptSha256, hash(readFileSync(import.meta.filename)));
  assert.deepEqual(report.sourceRecipe, recipe); assert.deepEqual(report.errors, []);
  assert.equal(report.results.length, 16);
  for (const receipt of report.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const keys = new Set(), observations = [];
  for (const row of report.results) {
    const key = `${row.dpr}/${row.font}/${row.context}/${row.unit}`;
    assert.ok(!keys.has(key)); keys.add(key);
    assert.ok([1, 2].includes(row.dpr) && [16, 24].includes(row.font));
    assert.ok(['inline-block', 'block'].includes(row.context) && ['normal', 'px'].includes(row.unit));
    assert.deepEqual(row.reference.site, row.astylar.site);
    for (const side of ['reference', 'astylar']) {
      const o = row[side]; assert.equal(o.inputUnchanged, true); assert.deepEqual(o.errors, []);
      assert.equal(o.site.styles[2].height, 'auto'); assert.equal(o.site.styles[2].margin, '0');
      assert.equal(o.site.styles[2].lineHeight, row.unit === 'normal' ? 'normal' : `${row.font * 1.25}px`);
      assert.equal(o.site.styles[3].display, row.context);
      assert.equal(o.site.root.children[0].children[0].children[0].src, asset);
      for (const owner of ['parent', 'child', 'leaf']) for (const v of Object.values(o.bounds[owner])) assert.ok(Number.isFinite(v));
      assert.equal(path.basename(o.screenshot.file), o.screenshot.file);
      assert.equal(hash(readFileSync(path.join(output, o.screenshot.file))), o.screenshot.sha256);
    }
    assert.deepEqual(row.reference.nativeImage, { complete: true, naturalWidth: 24, naturalHeight: 24 });
    observations.push({ dpr: row.dpr, font: row.font, display: row.context, lineHeight: row.unit,
      nativeHeight: row.reference.bounds.child.height, candidateHeight: row.astylar.bounds.child.height,
      errorCSSpx: row.astylar.bounds.child.height - row.reference.bounds.child.height,
      nativeImageTop: row.reference.bounds.leaf.top - row.reference.bounds.child.top,
      candidateImageTop: row.astylar.bounds.leaf.top - row.astylar.bounds.child.top });
  }
  assert.equal(keys.size, 16);
  return { observations, boundary: 'Authenticated equal input and measured geometry,not assumed control parity,physical font selection,Material causality or raster acceptance.' };
}
const run = new (Object.getPrototypeOf(async function() {}).constructor)('assert', 'createHash', 'existsSync', 'mkdirSync', 'readFileSync', 'writeFileSync', 'createRequire', 'createServer', 'path', 'chromium', 'materialBrowserLaunchOptions', 'inspectMaterialBrowserLaunch', 'runnerFile', 'recipe', 'verify', source);
if (process.argv[2] === '--preflight') {
  const template = ast.statements.filter(ts.isVariableStatement).flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(ast) === 'contents').initializer;
  assert.ok(ts.isNoSubstitutionTemplateLiteral(template));
  assert.equal(ts.createSourceFile('inline-image-browser.mjs', template.text, ts.ScriptTarget.Latest, true).parseDiagnostics.length, 0);
  console.log(JSON.stringify({ recipe, browserAndNodeSyntaxValid: true, browserExecuted: false }));
} else await run(assert, createHash, existsSync, mkdirSync, readFileSync, writeFileSync, createRequire, createServer, path, chromium, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, import.meta.filename, recipe, verify);
