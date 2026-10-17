import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright-core';
import ts from 'typescript';
import { PNG } from 'pngjs';
import { materialBrowserLaunchOptions, inspectMaterialBrowserLaunch } from '../tests/material-parity/run-checkpoint.mjs';

// One missing control:equal border/contact inputs with and without a shadow.
// Keep the established public mount,capture,receipt and verification machinery.
const baseFile = 'scripts/audit-public-relative-margins.mjs';
const base = readFileSync(baseFile);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const baseSha256 = '58c335b85f8405bd807a4a7b023c8a889e52e817d5924d549121c6e6e5cb5474';
assert.equal(hash(base), baseSha256);
let source = base.toString().replaceAll('\r\n', '\n');
function replace(before, after) {
  assert.equal(source.split(before).length, 2, `Ambiguous border/contact recipe:${before}`);
  source = source.replace(before, after);
}
replace('  assert.equal(report.results.length, 16);', '  assert.deepEqual(report.sourceRecipe, recipe); assert.equal(report.results.length, 8);');
replace('    const key = JSON.stringify([row.dpr, row.font, row.context, row.unit]);',
  '    const key = JSON.stringify([row.dpr, row.phase, row.shadow]); assert.ok([0,.546875].includes(row.phase)); assert.ok([false,true].includes(row.shadow));');
replace("    assert.ok(['block', 'flex'].includes(row.context) && ['em', 'px'].includes(row.unit));",
  "    assert.equal(row.context,'block'); assert.equal(row.unit,'px'); assert.equal(row.font,16);");
replace('  const summary = { blockEm: [], flexEm: [], pixelControls: 0 };',
  '  const summary = { blockEm: [], flexEm: [], pixelControls: 0, contactPixels: [] };');
replace("      assert.equal(observation.site.styles[2].margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);",
  "      const style=observation.site.styles[2]; assert.equal(style.margin,'0'); assert.equal(style.top,(60+row.phase)+'px'); assert.equal(style.height,'86px'); assert.equal(style.borderWidth,'1px'); assert.equal(style.borderStyle,'solid'); assert.equal(style.borderColor,'#cac4d0'); assert.equal(style.boxShadow,row.shadow?'0 2px 8px rgba(0,0,0,0.13333333333333333)':'none');");
replace('    assert.equal(row.reference.computed.marginTop, `${row.font}px`);', "    assert.equal(row.reference.computed.marginTop,'0px'); assert.equal(row.reference.computed.borderBottomWidth,'1px'); assert.equal(row.reference.computed.borderBottomColor,'rgb(202, 196, 208)');");
replace("    assert.equal(row.astylar.declared.margin, row.unit === 'em' ? '1em 0' : `${row.font}px 0`);", "    assert.equal(row.astylar.declared.margin,'0');");
replace("    assert.ok(Math.abs(offset('reference') - (20 + row.font)) < .01);", "    assert.ok(Math.abs(offset('reference')-(60+row.phase))<.01);");
replace('< .5, `Pixel control', '< .01, `Pixel control');
replace('  assert.equal(keys.size, 16); assert.equal(summary.pixelControls, 8);', `  assert.equal(keys.size,8); assert.equal(summary.pixelControls,8);
  assert.equal(hash(readFileSync(path.join(output,'audit.js'))),report.runtime.bundleSha256);
  assert.equal(hash(readFileSync(path.join(output,'index.html'))),report.runtime.htmlSha256);
  for(const row of report.results) {
    const samples={};
    for(const side of ['reference','astylar']) {
      const image=PNG.sync.read(readFileSync(path.join(output,row[side].screenshot.file)));
      assert.equal(image.width,400*row.dpr); assert.equal(image.height,260*row.dpr);
      const box=row[side].bounds.child,x=Math.round((box.left+box.width/2)*row.dpr),edge=Math.round((box.top+box.height)*row.dpr);
      samples[side]=Array.from({length:13*row.dpr},(_,i)=>{const y=edge-4*row.dpr+i,index=(y*image.width+x)*4;return {y,rgba:[...image.data.subarray(index,index+4)]};});
    }
    const maximumChannelError=Math.max(...samples.reference.flatMap((sample,i)=>sample.rgba.slice(0,3).map((value,c)=>Math.abs(value-samples.astylar[i].rgba[c]))));
    summary.contactPixels.push({dpr:row.dpr,phase:row.phase,shadow:row.shadow,samples,maximumChannelError});
  }`);
replace("unequal.results[0].astylar.site.styles[2].margin = '0';", "unequal.results[0].astylar.site.styles[2].borderWidth = '2px';");
replace("unit=query.get('unit');", "unit=query.get('unit'),phase=Number(query.get('phase')),shadow=query.get('shadow')==='true';");
replace("height:'24px',fontSize:", "height:'86px',position:'absolute',left:'20px',top:(60+phase)+'px',borderWidth:'1px',borderStyle:'solid',borderColor:'#cac4d0',borderRadius:'18px',boxShadow:shadow?'0 2px 8px rgba(0,0,0,0.13333333333333333)':'none',fontSize:");
replace("margin:unit==='em'?'1em 0':font+'px 0',background:'#123456'", "margin:'0',background:'#f0f0f0'");
replace('marginTop:native.marginTop,fontSize:native.fontSize', 'marginTop:native.marginTop,fontSize:native.fontSize,borderBottomWidth:native.borderBottomWidth,borderBottomColor:native.borderBottomColor,boxShadow:native.boxShadow');
replace("for (const font of [16, 24]) for (const context of ['block', 'flex']) for (const unit of ['em', 'px'])",
  "for (const phase of [0,.546875]) for (const shadow of [false,true]) for (const font of [16]) for (const context of ['block']) for (const unit of ['px'])");
replace('    const row = { dpr, font, context, unit };', '    const row = { dpr, font, context, unit, phase, shadow };');
replace('&context=${context}&unit=${unit}`);', '&context=${context}&unit=${unit}&phase=${phase}&shadow=${shadow}`);');
replace('`${dpr}-${font}-${context}-${unit}-${mode}.png`', '`${dpr}-${phase}-${shadow}-${mode}.png`');
assert.equal(source.split('public-relative-margin-diagnostic').length, 3);
source = source.replaceAll('public-relative-margin-diagnostic', 'public-border-contact-diagnostic');
assert.equal(source.split('import.meta.filename').length, 3);
source = source.replaceAll('import.meta.filename', 'runnerFile');
replace('inputs, runtime, errors, results };', 'inputs, runtime, errors, results, sourceRecipe: recipe };');
const ast = ts.createSourceFile('border-contact-runner.mjs', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
assert.equal(ast.parseDiagnostics.length, 0);
const imports = ast.statements.filter(ts.isImportDeclaration); assert.equal(imports.length, 8);
for (const node of imports.toReversed()) source = source.slice(0,node.getFullStart())+source.slice(node.end);
const recipe = { base: { file: baseFile, sha256: baseSha256 }, logicalRunnerSha256: hash(source),
  scope: 'Equal1px border and fill at integer/.546875 phases,DPR1/2,shadow off/on with equal alpha. Raw contact pixels,not Material/full-render acceptance.' };
const run = new (Object.getPrototypeOf(async function(){}).constructor)('assert','createHash','existsSync','mkdirSync','readFileSync','writeFileSync','createRequire','createServer','path','chromium','materialBrowserLaunchOptions','inspectMaterialBrowserLaunch','runnerFile','recipe','PNG',source);
await run(assert,createHash,existsSync,mkdirSync,readFileSync,writeFileSync,createRequire,createServer,path,chromium,materialBrowserLaunchOptions,inspectMaterialBrowserLaunch,import.meta.filename,recipe,PNG);
