import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { captureNormalLineBox } from '../tests/material-parity/normal-line-box-evidence.mjs';
import { fingerprintDirectory } from '../tests/material-parity/run-checkpoint.mjs';

// Reference-only diagnostic;never relax the maintained button-label probe.
const hash = value => createHash('sha256').update(value).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const helperFile = 'tests/material-parity/sort-focus-structure.spec.mjs';
const tree = ts.createSourceFile(helperFile, readFileSync(helperFile, 'utf8'), 99, true);
const helper = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'withFrozenShowcase').getText(tree);
assert.equal(hash(helper), '603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
const withFrozen = new Function('assert','path','readFileSync','existsSync','createServer','chromium','fingerprintDirectory',
  helper + ';return withFrozenShowcase;')(assert,path,readFileSync,existsSync,createServer,chromium,fingerprintDirectory);
const original = captureNormalLineBox.toString().replaceAll('\r\n','\n');
const beforeIdentity = "label.tagName !== 'SPAN' || !label.classList.contains('mdc-button__label') ||\n      label.parentElement?.tagName !== 'BUTTON' || label.children.length !== 0";
const afterIdentity = "label.tagName !== 'SPAN' || !['divider-above','divider-below'].includes(label.id) ||\n      label.parentElement?.tagName !== 'P' || label.parentElement.children.length !== 1 || label.children.length !== 0";
assert.equal(original.split(beforeIdentity).length, 2);
const diagnostic = original.replace(beforeIdentity, afterIdentity);
const measure = new Function('return (' + diagnostic + ');')();
const checkpointFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/checkpoint/manifest.json';
const checkpoint = JSON.parse(readFileSync(checkpointFile));
const reportFile = 'artifacts/material-parity/current-full-20261005/latest-report.json', bytes = readFileSync(reportFile);
assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--all');
const all = process.argv[2] === '--all';
const entries = JSON.parse(bytes).results.filter(r => r.family === 'divider');
assert.equal(entries.length,16);
const selected = all ? entries : entries.filter(r => r.profile === 'light' && r.viewport.id === 'desktop');
assert.equal(selected.length,all ? 16 : 1);
const captures = [];
const themes = {
  light:{mode:'light',primary:'#6750a4',tertiary:'#7d5260',surface:'#fffbfe',error:'#b3261e',density:0,cornerScale:1,typographyScale:1},
  dark:{mode:'dark',primary:'#d0bcff',tertiary:'#efb8c8',surface:'#1c1b1f',error:'#f2b8b5',density:0,cornerScale:1,typographyScale:1},
  contrast:{mode:'light',primary:'#000000',tertiary:'#203864',surface:'#ffffff',error:'#8b0000',density:-5,cornerScale:.75,typographyScale:.9},
  custom:{mode:'light',primary:'#006a6a',tertiary:'#a43c42',surface:'#f4fbfa',error:'#ba1a1a',density:-2,cornerScale:1.5,typographyScale:1.15},
};
let actualBrowser;
await withFrozen(async (browser, baseUrl) => {
  // Fresh supplementary observation,NOT a historical-browser replay. Preserve
  // both versions explicitly;the initial strict replay failure remains retained.
  actualBrowser = browser.version();
  assert.equal(actualBrowser, '155.0.8059.80');
  for(const entry of selected) {
  const input = readFileSync(entry.inputTrees.reference.file);
  assert.equal(hash(input),entry.inputTrees.reference.sha256);
  const reference = JSON.parse(input), observations = [];
  const context = await browser.newContext({ viewport: { width: entry.viewport.width, height: entry.viewport.height }, deviceScaleFactor: entry.viewport.deviceScaleFactor });
  try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if(message.type() === 'error') errors.push(message.text()); });
    await page.goto(baseUrl + '/reference/divider?benchmark=1&profile=' + entry.profile);
    await page.waitForFunction(() => typeof window.__MATERIAL_SHOWCASE_COMMAND__ === 'function');
    if(all) {
      assert.equal(await page.evaluate(theme=>window.__MATERIAL_SHOWCASE_COMMAND__({type:'showcase:theme',theme}),themes[entry.profile]),true);
      await page.waitForFunction(surface=>{
        const frame=document.querySelector('app-reference .frame'),probe=document.createElement('span');
        probe.style.color=surface;document.body.append(probe);const expected=getComputedStyle(probe).color;probe.remove();
        return frame && getComputedStyle(frame).backgroundColor===expected;
      },themes[entry.profile].surface);
    }
    await page.evaluate(async () => { await document.fonts.ready;await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
    for(const id of ['divider-above','divider-below']) {
      const node = reference.nodes.find(n => n.attributes?.id === id);assert.ok(node);
      const argument = { referenceNode: node.key, expectedText: node.ownText, expectedStyle: reference.styles[node.style] };
      const before = await page.locator('#' + id).evaluate(label => {
        const parent=label.parentElement,p=getComputedStyle(parent),s=getComputedStyle(label);
        const keys=['fontFamily','fontSize','fontWeight','fontStyle','lineHeight','letterSpacing','wordSpacing','textTransform'];
        return { parentType:parent.tagName,parentBox:parent.getBoundingClientRect().toJSON(),labelBox:label.getBoundingClientRect().toJSON(),
          paragraph:Object.fromEntries(keys.map(k=>[k,p[k]])),label:Object.fromEntries(keys.map(k=>[k,s[k]])),
          insets:[p.paddingTop,p.paddingBottom,p.borderTopWidth,p.borderBottomWidth],
          childTypes:[...parent.children].map(n=>n.tagName),ownText:[...parent.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('') };
      });
      assert.equal(before.parentType,'P');assert.deepEqual(before.paragraph,before.label);
      assert.deepEqual(before.insets,['0px','0px','0px','0px']);assert.deepEqual(before.childTypes,['SPAN']);assert.equal(before.ownText.trim(),'');
      await assert.rejects(page.evaluate(captureNormalLineBox,argument),/reference label identity changed/);
      const measured = await page.evaluate(measure,argument);
      await assert.rejects(page.evaluate(measure,{...argument,expectedText:'changed-text'}),/reference text changed/);
      await assert.rejects(page.evaluate(measure,{...argument,expectedStyle:{...argument.expectedStyle,fontSize:'999px'}}),/checkpoint typography changed: fontSize/);
      const after = await page.locator('#' + id).evaluate(label=>({parentBox:label.parentElement.getBoundingClientRect().toJSON(),
        labelBox:label.getBoundingClientRect().toJSON(),observers:document.querySelectorAll('material-audit-line-box').length}));
      assert.deepEqual(after.parentBox,before.parentBox);assert.deepEqual(after.labelBox,before.labelBox);assert.equal(after.observers,0);
      assert.equal(measured.naturalHeight,before.parentBox.height);
      observations.push({id,before,measured,after,rejectedControls:3});
    }
    assert.deepEqual(errors,[]);
    captures.push({case:'static:divider@'+entry.profile+'/'+entry.viewport.id,profile:entry.profile,viewport:entry.viewport,
      inputTree:entry.inputTrees.reference,observations});
  } finally { await context.close(); }
  }
}, {}, {checkpointFile});
assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')),checkpoint.provenance.browserFiles);
const result = {kind:all ? 'divider-natural-line-box-contexts-diagnostic' : 'divider-natural-line-box-diagnostic',producer:receipt('scripts/audit-material-divider-line-boxes.mjs'),
  checkpoint:receipt(checkpointFile),originalReport:{file:reportFile,sha256:hash(bytes)},
  runtime:{actualBrowser,checkpointBrowser:checkpoint.provenance.browser,historicalBrowserReplay:false},
  recipe:{source:receipt('tests/material-parity/normal-line-box-evidence.mjs'),originalFunction:hash(original),beforeIdentity,afterIdentity,
    diagnosticFunction:hash(diagnostic),frozenHelper:{file:helperFile,sha256:hash(helper)}},
  ...(all ? {captures,cases:16,targets:32,rejectedControls:96} : {inputTree:captures[0].inputTree,case:captures[0].case,observations:captures[0].observations,rejectedControls:6}),
  scope:all
    ? 'Sixteen fresh Chrome155.0.8059.80 reference contexts at retained viewport/DPR/theme inputs and frozen build. Natural paragraph/span heights only;checkpoint Chrome155.0.8059.40 is NOT replayed. Not historical pixels,candidate layout,baseline,glyph raster,multi-run anonymous layout,current renderer or case closure.'
    : 'One fresh Chrome155.0.8059.80 reference light/desktop supplement with frozen served build/typography;checkpoint Chrome155.0.8059.40 is NOT replayed. Natural unwrapped paragraph/span height and actual box equality only;original probe remains strict. Not historical layout/pixels,candidate layout,baseline,glyph raster,other contexts,multi-run anonymous layout,current renderer or case closure.'};
if(all) {
  const priorFile='artifacts/material-parity/divider-natural-line-box-20261020.log',prior=JSON.parse(readFileSync(priorFile));
  const revision='eec3554d',logicalFile='scripts/audit-material-divider-line-boxes.mjs';
  assert.equal(prior.producer.sha256,'23b2279076c11a48e740a3f65b8c7eea8569be0ba3a2adb79e09d1ebfc66fd03');
  assert.equal(hash(execFileSync('git',['show',revision+':'+logicalFile],{maxBuffer:1_000_000})),prior.producer.sha256);
  assert.deepEqual(result.runtime,prior.runtime);assert.deepEqual(result.recipe,prior.recipe);
  const same=captures.find(c=>c.case===prior.case);assert.ok(same);
  assert.deepEqual(same.inputTree,prior.inputTree);assert.deepEqual(same.observations,prior.observations);
  result.predecessor={record:receipt(priorFile),historicalProducer:{revision,logicalFile,sha256:prior.producer.sha256},
    completeTwoObservationsConserved:true};
}
console.log(JSON.stringify(result));
