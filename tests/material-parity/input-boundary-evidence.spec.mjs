import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { fingerprintDirectory, fingerprintModuleGraph, materialCaseKey, openMaterialCheckpoint } from './run-checkpoint.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups, sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { readGapSurveySource } from './gap-survey-source-replay.mjs';
import { verifyRetainedMaterialBrowserFiles } from './historical-audit-module-source.mjs';
import { restoreCursorInspectorCaptureSource } from './public-cursor-defaults-evidence.mjs';
import { materialStaticCases, materialInteractionCases, materialMobileFlowCases,
  materialFocusedRasterTargets, materialInteractionFocusedRasterTargets,
  materialUniformBackgroundTargets, materialShadowProfileTargets } from './benchmark.config.mjs';
import { cursorInput } from '../../examples/material-showcase/audit/cursor-default-input.mjs';
import { queryFindings, saveReviewProposal, verifyFindings } from '../../scripts/audit-findings-store.mjs';
import { evaluateFocusedRaster } from './focused-raster-metrics.mjs';
import { compareBottomShadowProfiles } from './shadow-profile-metrics.mjs';

const file = 'artifacts/material-parity/input-boundaries-keypress-559f95c/latest-report.json';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
test('equal explicit line height isolates text backing allocation from authored geometry', () => {
  const evidenceFile='artifacts/material-parity/public-explicit-line-backing-20261019.log';
  const bytes=readFileSync(evidenceFile);
  assert.equal(hash(bytes),'6a480999fe86e2d1ae7b19b79b7949ad79f13d83cf2a2b1a5a3fbe55d2463d74');
  const report=JSON.parse(bytes);
  assert.equal(hash(readFileSync('scripts/audit-public-explicit-line-backing.mjs')),report.producerSha256);
  const ownerFile='artifacts/material-parity/divider-backing-owners-bound-20261019.log',ownerBytes=readFileSync(ownerFile);
  assert.equal(hash(ownerBytes),'3089be882519251bfda7c660ad1c050edbce7421f3cda67de0c84dd8e26bf13a');
  const owner=JSON.parse(ownerBytes);
  assert.equal(hash(readFileSync('scripts/check-divider-backing-owners.mjs')),owner.producerSha256);
  assert.equal(hash(readFileSync(owner.mapFile)),owner.mapSha256);
  assert.equal(owner.observations.length,5);
  for(const source of owner.observations)assert.equal(hash(readFileSync(source.installedFile)),source.installedSha256);
  const inspect=rows=>{
    assert.equal(rows.length,4);
    for(const font of [16,18.4]){
      const sides=rows.filter(row=>row.font===font);assert.equal(sides.length,2);
      const reference=sides.find(row=>row.mode==='reference'),candidate=sides.find(row=>row.mode==='astylar');
      assert.ok(reference&&candidate);
      for(const row of sides){
        assert.equal(row.unit,'px');assert.equal(row.snapshot.inputUnchanged,true);
        assert.deepEqual(row.snapshot.errors,[]);
        assert.equal(row.snapshot.site.styles.find(s=>s.selector==='#parent').lineHeight,'22px');
        assert.deepEqual(row.snapshot.bounds.child,{left:40,top:40,width:80,height:22});
      }
      assert.deepEqual(reference.snapshot.site,candidate.snapshot.site);
      assert.equal(reference.nativeBaseline.markerDidNotChangeParagraph,true);
      assert.equal(reference.nativeBaseline.markerDidNotMoveText,true);
      const [texture]=candidate.snapshot.liveTextures;assert.equal(candidate.snapshot.liveTextures.length,1);
      assert.equal(texture.logical.height,22);assert.equal(texture.dimensions.height,22);
      assert.equal(texture.size.height,font===16?22:23);
      assert.deepEqual(texture.uvs,[0,0,1,0,1,1,0,1]);
      assert.equal(candidate.draws.length,1);
      assert.equal(candidate.draws[0].y,reference.nativeBaseline.offset);
      assert.equal(candidate.draws[0].height,texture.size.height);
    }
  };
  inspect(report.results);
  for(const mutate of [
    rows=>{rows[3].snapshot.site.styles.find(s=>s.selector==='#parent').lineHeight='23px';},
    rows=>{rows[3].snapshot.liveTextures[0].size.height=22;},
    rows=>{rows[3].snapshot.liveTextures[0].logical.height=23;},
    rows=>{rows[3].snapshot.liveTextures[0].uvs[3]=0.9;},
    rows=>{rows[3].snapshot.bounds.child.height=23;},
    rows=>{rows[3].draws[0].y+=1;},
  ]){const altered=structuredClone(report.results);mutate(altered);assert.throws(()=>inspect(altered));}
});
const retainedRawControlLogs = [
  ['raw-control-events-20261012.log', 'd14e9e6965f8a4e9f9419d494545a867c3e1b48f4ba2475ccb11a1ef3097a5ea', 50, '6b0486f0'],
  ['raw-control-keyboard-events-20261012.log', '8e202f4cc8eaa800d58acd54c8253ce0d947cee82e96651787571c0ebd086bc1', 16, '7b825141'],
  ['raw-disabled-control-keyboard-events-20261012.log', 'abe6ea4404c4698d65da0de64e7b63fe18995d73005cb13830922c6320c0c728', 15, '76025f76'],
  ['raw-disabled-control-pointer-events-20261012.log', 'b227aa5e5bc38d6e0e6ff5c469bab82f4212858432b3dfe67f001771785fd69f', 16, 'e007a50c'],
  ['disabled-slider-held-centers-20261012.log', '24ddecb803434473e85ba76df0ea6700b608d94c010d363a1ef48a40f08e34d3', 8, '69371bd9'],
];

test('divider reduction receipts preserve observed DPR and unchanged failing geometry', () => {
  const runnerFile='scripts/audit-overlay-layout-stage.mjs';
  const encoded=readFileSync('docs/evidence/material-overlay-context-runner.mjs.b64','utf8').trim();
  assert.match(encoded,/^[A-Za-z0-9+/]+={0,2}$/);
  const capturedRunner=Buffer.from(encoded,'base64');
  assert.equal(hash(capturedRunner),'8437ab812e876265a7ff8289aa778678dec64edf2276109489931374ba8c072e');
  assert.equal(readFileSync(runnerFile,'utf8').replaceAll('\r\n','\n'),
    capturedRunner.toString().replaceAll('\r\n','\n'),'Current runner conserves the exact context-only transition');
  const prior=execFileSync('git',['show',`b640ef3e:${runnerFile}`],{encoding:'utf8'}).replaceAll('\r\n','\n');
  const addedContext=`  const requestedContext = { viewport: { width: 900, height: 800 }, deviceScaleFactor: dpr };
  const page = await browser.newPage(requestedContext);
  const measureContext = () => page.evaluate(() => ({ width: innerWidth, height: innerHeight, devicePixelRatio }));
  const initialContext = await measureContext();
  assert.deepEqual(initialContext, { width: 900, height: 800, devicePixelRatio: dpr },
    'Observed browser context must match the requested reduction context');
  provenance.runtimeContext = { requested: requestedContext, initial: initialContext, browser: browser.version() };
  writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance, null, 2));`;
  const addedResult=`  const runtimeContext = { ...provenance.runtimeContext, final: await measureContext() };
  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browser: browser.version(), runtimeContext, result, observations, screenshots, errors }, null, 2));`;
  const conserve=source=>{
    let restored=source.replaceAll('\r\n','\n');
    for(const [before,after]of [[addedContext,'  const page = await browser.newPage({ viewport: { width: 900, height: 800 }, deviceScaleFactor: dpr });'],
      [addedResult,"  writeFileSync(path.join(output, 'result.json'), JSON.stringify({ browser: browser.version(), result, observations, screenshots, errors }, null, 2));"]]){
      assert.equal(restored.split(before).length,2);restored=restored.replace(before,after);
    }
    assert.equal(restored,prior);
  };
  conserve(capturedRunner.toString());
  assert.throws(()=>conserve(capturedRunner.toString().replace('devicePixelRatio: dpr','devicePixelRatio: 1')));
  assert.throws(()=>conserve(capturedRunner.toString().replace('assert.equal(paneMaskDifferences, 0','assert.equal(paneMaskDifferences, 1')));
  const failures=['divider-demo.bottom: Astylar=464, browser=163: Expected 301 to be less than 0.5.',
    'separator.bottom: Astylar=383, browser=82: Expected 301 to be less than 0.5.',
    'below.top: Astylar=399, browser=98: Expected 301 to be less than 0.5.',
    'below.bottom: Astylar=419, browser=118: Expected 301 to be less than 0.5.'];
  const receipts=[
    ['16149d2bb8620888a2e48a80c905c8227adafc3ff11269287119f5efda9f4577','8a82dc61c5ca4ab78cc3ca705a4e26ea66fea535df058bde66f611371c5529cd'],
    ['3a56c17d045a31afdd5eb4d5aa5c390acf9517c0523cf1e0b902513b9fe9c487','92ccccabed50a16e842a937c7bd7592e2cb78ab6465c564d22c9ec99e92f1917'],
  ];
  for(const dpr of [1,2]){
    const dir=`artifacts/material-parity/divider-context-verified-angular-20261013-dpr${dpr}`;
    const bytes=readFileSync(`${dir}/result.json`),provenanceBytes=readFileSync(`${dir}/provenance.json`);
    assert.equal(hash(bytes),receipts[dpr-1][0]);assert.equal(hash(provenanceBytes),receipts[dpr-1][1]);
    const result=JSON.parse(bytes),provenance=JSON.parse(provenanceBytes);
    assert.equal(provenance.runnerSha256,hash(capturedRunner));
    const expected={requested:{viewport:{width:900,height:800},deviceScaleFactor:dpr},
      initial:{width:900,height:800,devicePixelRatio:dpr},browser:'155.0.8059.40'};
    assert.deepEqual(provenance.runtimeContext,expected);
    assert.deepEqual(result.runtimeContext,{...expected,final:expected.initial});
    assert.equal(result.browser,expected.browser);assert.deepEqual(result.errors,[]);
    assert.equal(result.result.status,'failed');
    const executed=result.result.results.filter(row=>row.status!=='excluded');assert.equal(executed.length,1);
    assert.ok(executed[0].description.endsWith('paragraph flow places a divider without absolute text or separator offsets'));
    assert.equal(executed[0].status,'failed');assert.deepEqual(executed[0].failures,failures);
    assert.equal(provenance.compiledReceipts.length,104);assert.equal(provenance.inputs.length,2517);
    for(const receipt of provenance.compiledReceipts){
      assert.equal(hash(readFileSync(receipt.source)),receipt.sourceSha256);
      for(const root of ['artifacts/material-parity/divider-context-angular-source-build-20261013',
        'dist/lib','examples/material-showcase/node_modules/astylarui/dist/lib'])
        assert.equal(hash(readFileSync(path.join(root,receipt.file))),receipt.emittedSha256);
    }
    for(const receipt of provenance.inputs)assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
    assert.equal(hash(readFileSync(`${dir}/audit.js`)),provenance.bundleSha256);
  }
  // Validator success authenticates an honestly failing public reduction,not parity.
});

test('retained raw checkbox slider boundaries preserve missing events disabled focus and sampled inertia', () => {
  const logs = retainedRawControlLogs;
  const configured = new Set([...materialInteractionCases, ...materialMobileFlowCases].map(row => materialCaseKey('interaction', row)));
  const anchors = new Set(); let records = 0, inertSamples = 0;
  const tails = side => side.events.filter(event => ['input', 'change'].includes(event.type)).map(event => event.type);
  for (const [file, sha256, count] of logs) {
    const bytes = readFileSync(`artifacts/material-parity/${file}`); assert.equal(hash(bytes), sha256);
    const [receipt, ...rows] = bytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line));
    const terminal = rows.pop();
    assert.equal(receipt.cases, count); assert.equal(terminal.captured, count); assert.equal(rows.length, count);
    assert.equal(receipt.acceptance, false); assert.equal(terminal.acceptance, false); assert.equal(terminal.result, 'PASS');
    const local = new Set();
    for (const row of rows) {
      const key = materialCaseKey('interaction', row.case);
      assert.ok(configured.has(key)); assert.ok(!local.has(key)); local.add(key); anchors.add(key); records++;
      assert.equal(row.acceptance, false); assert.deepEqual(row.errors, []);
      if (row.case.state === 'disabled') {
        for (const side of ['reference', 'astylar']) {
          assert.deepEqual(row.after[side].state, row.before[side].state); assert.deepEqual(tails(row.after[side]), []);
        }
        for (const boundary of row.keyboardBoundaries ?? []) for (const side of ['reference', 'astylar']) {
          assert.equal(boundary[side].focusedOwner, 'BODY'); assert.deepEqual(boundary[side].state, row.before[side].state);
        }
        for (const boundary of row.pointerBoundaries ?? []) {
          assert.equal(boundary.reference.focusedOwner, 'BODY');
          assert.equal(boundary.astylar.focusedOwner, row.case.family === 'checkbox' ? 'checkbox-primary' : 'CANVAS');
          if (boundary.dragTraces) for (const side of ['reference', 'astylar']) {
            assert.equal(boundary.dragTraces[side].length, 9);
            const centers = boundary.dragTraces[side][0].thumbCenters;
            for (const sample of boundary.dragTraces[side]) {
              inertSamples++; assert.equal(sample.sliderStart, 30); assert.equal(sample.sliderValue, 65);
              assert.deepEqual(sample.thumbCenters, centers);
            }
            assert.deepEqual(boundary.releasedCenters[side], centers);
          }
        }
      } else if (row.case.family === 'checkbox') {
        assert.deepEqual(tails(row.after.reference), ['input', 'change']); assert.deepEqual(tails(row.after.astylar), []);
        assert.equal(row.after.reference.state.selected, false);
        assert.equal(row.after.astylar.state.selected, row.keyboardOnly === true);
        assert.equal(row.after.reference.controls[0].tag, 'INPUT'); assert.equal(row.after.astylar.controls[0].tag, 'DIV');
      } else if (row.keyboardOnly) {
        assert.equal(tails(row.after.reference).length, 12); assert.equal(tails(row.after.astylar).length, 12);
        assert.ok(row.after.reference.controls.every(control => control.step === '5'));
        assert.ok(row.after.astylar.controls.every(control => control.step === '1'));
      } else if (['drag-start', 'drag-end'].includes(row.case.state)) {
        assert.deepEqual(tails(row.after.reference), ['input', 'input', 'change']);
        assert.deepEqual(tails(row.after.astylar), [...Array(8).fill('input'), 'change']);
      }
      // Filtered compared.matches never establishes raw-event parity.
    }
  }
  assert.equal(records, 105); assert.equal(anchors.size, 82); assert.equal(inertSamples, 288);
});

test('retained timepicker option text owners distinguish wrapper line boxes from centering requests', () => {
  const original = execFileSync('git', ['show', '2f440115:examples/material-showcase/src/app/astylar.component.ts'], { encoding: 'utf8' });
  assert.match(original, /id: `timepicker-option-\$\{index\}`[^\n]*textContent: label/);
  const centeringChange = execFileSync('git', ['show', 'f3c8254c', '--', 'examples/material-showcase/src/app/astylar.component.ts'], { encoding: 'utf8' });
  assert.match(centeringChange, /\+[^\n]*selector: '\.timepicker-shell \.picker-option'[^\n]*height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center'/);
  // Direct option text predates the later centering adjustment; neither history nor
  // unequal wrapper inputs establish that this adjustment caused the glyph offset.
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const rows = JSON.parse(bytes).interactions.filter(row => row.family === 'timepicker' && row.state === 'open-scroll');
  assert.equal(rows.length, 8);
  assert.deepEqual(rows.map(row => `${row.profile}/${row.viewport.id}`).sort(),
    ['contrast', 'custom', 'dark', 'light'].flatMap(profile => [1, 2].map(dpr => `${profile}/desktop-dpr${dpr}`)).sort());
  let owners = 0;
  for (const row of rows) {
    assert.deepEqual(row.textAlignment, []);
    assert.deepEqual(row.controlPaintGeometry, []);
    assert.deepEqual(row.focusedRasters.map(raster => raster.id), ['timepicker-primary']);
    const pair = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.inputTrees[side], data = readFileSync(receipt.file);
      assert.equal(hash(data), receipt.sha256); return [side, JSON.parse(data)];
    }));
    const options = pair.reference.nodes.filter(node => node.attributes?.role === 'option');
    assert.equal(options.length, 48);
    for (const option of options) {
      const labels = pair.reference.nodes.filter(node => node.parent === option.key && node.attributes?.class === 'mdc-list-item__primary-text');
      assert.equal(labels.length, 1);
      const candidates = pair.astylar.nodes.filter(node => node.authored?.role === 'option' && node.authored.textContent === labels[0].ownText);
      assert.equal(candidates.length, 1);
      assert.equal(pair.astylar.nodes.filter(node => node.parent === candidates[0].key).length, 0);
      assert.equal(pair.reference.styles[option.style].alignItems, 'center');
      assert.equal(pair.reference.styles[labels[0].style].display, 'block');
      assert.equal(pair.reference.styles[labels[0].style].lineHeight, '20px');
      assert.equal(candidates[0].resolvedStyle.alignItems, 'center');
      assert.equal(Object.hasOwn(candidates[0].resolvedStyle, 'lineHeight'), false);
      assert.equal(candidates[0].retainedText.source, 'core-text-registry');
      assert.equal(candidates[0].retainedText.style.lineHeight, 'normal');
      owners++;
    }
  }
  assert.equal(owners, 384); // Unequal text ownership/requests, not measured glyph placement or current paint.
  const canonical = JSON.parse(readFileSync('docs/material-input-equivalence-audit.json'));
  const pointer = JSON.parse(readFileSync('artifacts/material-parity/working-audit/current.json'));
  assert.equal(pointer.generation, canonical.compressedSha256);
  const metrics = queryFindings('artifacts/material-parity/working-audit', 'timepicker')
    .filter(row => row.property === 'lineHeight' && /^timepicker-option-/.test(row.element));
  assert.equal(metrics.length, 2304);
  for (const row of metrics) {
    assert.equal(row.classification, 'application-plugin-authoring-defect');
    assert.equal(row.attribution, 'reviewed-omitted-component-text-metric');
    assert.equal(row.evidence.sourceSha256, canonical.uncompressedSha256);
  }
  // Published historical attribution is not current glyph-position acceptance.
});
test('semantic descendant replacement focus evidence retains exact current case and source applicability', async () => {
  const { sourceAuditDefinitions } = await import('./input-equivalence-policy.mjs');
  const predecessor = execFileSync('git', ['show', '137f874f:tests/material-parity/input-equivalence-policy.mjs']);
  const prior = await import('data:text/javascript;base64,' + predecessor.toString('base64'));
  assert.deepEqual(sourceAuditDefinitions.slice(0, -1), prior.sourceAuditDefinitions);
  const finding = sourceAuditDefinitions.at(-1);
  assert.equal(finding.id, 'core-semantic-descendant-replacement-loses-retained-focus');
  assert.match(readFileSync(finding.file, 'utf8'), new RegExp(finding.pattern));
  const receipt = finding.evidence[0], bytes = readFileSync(receipt.file);
  assert.equal(hash(bytes), receipt.sha256);
  const diagnostics = bytes.toString().split(/\r?\n/).filter(line => line.startsWith('# {'))
    .map(line => JSON.parse(line.slice(2).replaceAll(String.fromCharCode(92) + '#', '#')));
  const receipts = diagnostics.filter(row => row.currentLightLifecycleReceipts).map(row => row.currentLightLifecycleReceipts);
  assert.equal(receipts.length, 2);
  for (const receipt of receipts) {
    assert.equal(hash(readFileSync(receipt.checkpointFile)), receipt.checkpointSha256);
    assert.deepEqual(receipt.viewport, [390, 844, 2]);
    assert.equal(receipt.acceptance, false);
  }
  assert.equal(materialMobileFlowCases.filter(row => materialCaseKey('interaction', row) === materialCaseKey('interaction', finding.observation.case)).length, 1);
  const observations = diagnostics.find(row => row.family === 'timepicker').observations;
  let previous = [];
  for (const cycle of observations.astylar.cycles) for (const state of ['opened', 'closed']) {
    const all = cycle[state].focusProvenance;
    assert.deepEqual(all.slice(0, previous.length), previous);
    const delta = all.slice(previous.length); previous = all;
    const index = delta.findIndex(row => row.kind === 'replace-before' && row.focused);
    assert.ok(index >= 0); assert.match(delta[index].stack, /AstylarSemanticBridge.reconcileElement/);
    assert.deepEqual(delta[index + 1], { kind: 'focusout', operation: 'replaceChildren' });
    assert.equal(delta[index + 2].focused, false); assert.equal(delta[index + 2].connected, true);
    assert.ok(delta.slice(index + 3).some(row => row.kind === 'focus-call' && /AstylarSemanticBridge.syncFocus/.test(row.stack)));
    assert.equal(cycle[state].inputFocused, true);
  }
  assert.equal(previous.length, 58);
  assert.deepEqual(observations.reference.cycles.at(-1).closed.focusProvenance, []);
  const mapBytes = readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-XOU37TRR.js.map');
  assert.equal(hash(mapBytes), '8692027f86a8d2d5571de110d92ad3fdda97ea35da86adc10f1522a5134a686d');
  const map = JSON.parse(mapBytes), module = 'node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js';
  const mapped = map.sourcesContent[map.sources.indexOf(module)];
  const installed = readFileSync('examples/material-showcase/' + module, 'utf8');
  assert.equal(installed, mapped + '//# sourceMappingURL=astylar-semantic-bridge.js.map');
  const compiled = ts.transpileModule(readFileSync(finding.file, 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const method = (code, name) => {
    const ast = ts.createSourceFile('semantic.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
    assert.equal(ast.parseDiagnostics.length, 0);
    const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === name)
      matches.push(node.getText(ast).replace(/\s+/g, ' ').trim()); ts.forEachChild(node, visit); };
    visit(ast); assert.equal(matches.length, 1); return matches[0];
  };
  for (const name of ['reconcile', 'reconcileElement', 'syncFocus']) {
    assert.equal(method(mapped, name), method(installed, name));
    assert.equal(method(installed, name), method(compiled, name));
  }
  assert.equal(finding.evidence.length, 2);
  const publicReceipt = finding.evidence[1], publicBytes = readFileSync(publicReceipt.file);
  assert.equal(hash(publicBytes), publicReceipt.sha256);
  const publicRows = publicBytes.toString().split(/\r?\n/).filter(line => line.startsWith('# {'))
    .map(line => JSON.parse(line.slice(2).replaceAll(String.fromCharCode(92) + '#', '#')));
  assert.equal(publicRows.length, 1);
  const reduction = publicRows[0].publicSemanticFocus;
  assert.equal(reduction.parityAccepted, false);
  assert.deepEqual(reduction.viewport, { width: 390, height: 844, dpr: 2 });
  assert.equal(reduction.sourceSha256, hash(readFileSync(finding.file)));
  assert.equal(reduction.installedSha256, hash(Buffer.from(installed)));
  assert.equal(reduction.dependencyCount, 2515);
  assert.deepEqual(reduction.errors, []);
  for (const entry of reduction.methods) assert.equal(entry.sha256, hash(Buffer.from(method(installed, entry.name))));
  assert.equal(reduction.samples.length, 8);
  assert.equal(reduction.keyboardSamples.length, 2);
  for (const sample of [...reduction.samples, ...reduction.keyboardSamples]) {
    assert.equal(sample.sameNode, true); assert.equal(sample.value, 'Atlas');
    if (sample.side === 'reference') assert.deepEqual(sample.events, []);
    else {
      const first = sample.operations[0];
      assert.equal(first.owner, 'focus-parent'); assert.equal(first.before, true);
      assert.equal(first.after, false); assert.equal(first.connected, true);
      assert.match(first.stack, /AstylarSemanticBridge.reconcileElement/);
      assert.equal(sample.events[0].type, 'focusout');
    }
  }
  for (const sample of reduction.keyboardSamples) {
    assert.equal(sample.prepared, true); assert.deepEqual(sample.beforeSelection, [1, 3]);
    assert.deepEqual(sample.selection, [1, 3]);
    assert.equal(sample.focused, sample.side === 'reference');
    assert.equal(sample.activeTag, sample.side === 'reference' ? 'INPUT' : 'CANVAS');
  }
  const producer = readFileSync('tests/material-parity/input-equivalence-audit.mjs', 'utf8');
  assert.match(producer, /proof\(root, 'tests\/material-parity\/input-boundary-evidence.spec.mjs', \/test\\\('public semantic sibling updates isolate retained focus loss without Material plugins'/);
  const darkBytes = readFileSync('artifacts/material-parity/timepicker-dark-mobile-lifecycle-current-20261012.log');
  assert.equal(hash(darkBytes), 'e71f33560f2c7248b0e7c6ededfae8da5df0894784567ecf63ef7b8aab25c930');
  const darkRows = darkBytes.toString().split(/\r?\n/).filter(line => line.startsWith('# {'))
    .map(line => JSON.parse(line.slice(2).replaceAll(String.fromCharCode(92) + '#', '#')));
  const darkReceipts = darkRows.filter(row => row.currentDarkLifecycleReceipts).map(row => row.currentDarkLifecycleReceipts);
  assert.equal(darkReceipts.length, 2);
  const capturedSorter = execFileSync('git', ['show', 'd3f27b3a:tests/material-parity/sort-focus-structure.spec.mjs'], { maxBuffer: 4_000_000 });
  const { readRetainedSortFocusSource } = await import('./position-composition-producer-transition.mjs');
  assert.deepEqual(readRetainedSortFocusSource(capturedSorter), readRetainedSortFocusSource());
  for (const receipt of darkReceipts) {
    assert.equal(hash(readFileSync(receipt.checkpointFile)), receipt.checkpointSha256);
    assert.equal(hash(capturedSorter), receipt.sourceSha256);
    assert.deepEqual(receipt.viewport, [390, 844, 2]);
    assert.equal(receipt.acceptance, false);
  }
  const dark = darkRows.find(row => row.family === 'timepicker').observations;
  for (const side of ['reference', 'astylar']) {
    assert.deepEqual(dark[side].errors, []);
    for (const cycle of dark[side].cycles) {
      const nodes = cycle.opened.actualAx;
      const input = nodes.filter(node => node.role.value === 'combobox');
      assert.equal(input.length, 1); assert.equal(input[0].name.value, 'Meeting time');
      const property = name => input[0].properties.find(row => row.name === name)?.value;
      assert.equal(property('hasPopup').value, side === 'reference' ? 'listbox' : 'dialog');
      for (const [name, role] of [['controls', 'listbox'], ['activedescendant', 'option']]) {
        const related = property(name).relatedNodes;
        assert.equal(related.length, 1);
        const target = nodes.filter(node => node.backendDOMNodeId === related[0].backendDOMNodeId);
        assert.equal(target.length, 1); assert.equal(target[0].role.value, role);
        if (name === 'activedescendant') assert.equal(target[0].name.value, '12:00 AM');
      }
      assert.equal(cycle.closed.actualAx.filter(node => ['option', 'listbox'].includes(node.role.value)).length, 0);
      const closedInput = cycle.closed.actualAx.filter(node => node.role.value === 'combobox');
      assert.equal(closedInput.length, 1);
      assert.equal(closedInput[0].properties.find(row => row.name === 'expanded').value.value, false);
      assert.deepEqual(closedInput[0].properties.filter(row => ['controls', 'activedescendant'].includes(row.name)), []);
      // AX absence is not proof that the DOM attribute is absent: authored
      // ariaControls persists while its conditionally rendered target is gone.
    }
    const events = dark[side].cycles.at(-1).closed.events;
    assert.equal(events.length, side === 'reference' ? 29 : 47);
    assert.deepEqual(events.filter(row => ['keydown', 'keyup'].includes(row.type)).map(row => [row.type, row.key, row.id]),
      Array.from({ length: 3 }, () => [['keydown', 'Escape', 'timepicker-control'], ['keyup', 'Escape', 'timepicker-control']]).flat());
    assert.equal(events.filter(row => ['input', 'change'].includes(row.type)).length, 0);
  }
  // Canvas pointer targets and semantic focus delivery remain distinct; final
  // focus equality cannot erase the measured replacement blur or prove events equal.
  assert.notDeepEqual(dark.reference.cycles.at(-1).closed.events, dark.astylar.cycles.at(-1).closed.events);
  const scrollBytes = readFileSync('artifacts/material-parity/timepicker-light-mobile-scroll-current-20261012.log');
  assert.equal(hash(scrollBytes), '3a106e53497490a1cbabd5b8c9f08bfdbd4c53fe2b5d1ba3d04ad281aa131eef');
  const scrollRows = scrollBytes.toString().split(/\r?\n/).filter(line => line.startsWith('# {'))
    .map(line => JSON.parse(line.slice(2).replaceAll(String.fromCharCode(92) + '#', '#')));
  assert.equal(scrollRows.filter(row => row.mobileScrollbarTheme).length, 2);
  for (const row of scrollRows.filter(row => row.mobileScrollbarTheme)) {
    assert.deepEqual(row.mobileScrollbarTheme.actualTheme, { dark: false, background: 'rgb(255, 251, 254)' });
    assert.deepEqual(row.mobileScrollbarTheme.viewport, [390, 844, 2]);
  }
  const drag = scrollRows.find(row => row.scrollbarDragFinding).scrollbarDragFinding;
  assert.equal(drag.profile, 'light'); assert.equal(drag.acceptance, false);
  assert.deepEqual(drag.nativeDragScrollTop, [211, 421, 632]);
  assert.deepEqual(drag.candidateDragScrollTop, [0, 0, 0]);
});
const bytes = readFileSync(file);
assert.equal(hash(bytes), '39df94e0eb87480d3824927a41a9950d1d275f7c97ab97a571c449efdc6da7d7');
const report = JSON.parse(bytes);

test('Icon pending image Angular remount preserves sampled owners but fails runtime disposal validation', () => {
  const raw = readFileSync('artifacts/material-parity/icon-pending-remount-failure-bound-20261010/failure-observations.json');
  assert.equal(hash(raw), '2dbbcbf1baafc2ace9104fdac481be7e4ace436b4ddbdda8c8acd821b1f5c2db');
  const record = JSON.parse(raw);
  for (const receipt of [record.capture.checkpointManifest, ...record.capture.sources]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const manifest = JSON.parse(readFileSync(record.capture.checkpointManifest.file));
  assert.deepEqual(verifyRetainedMaterialBrowserFiles(manifest.provenance.browserFiles),
    { authenticatedFiles: 1887, currentRenderingAccepted: false });
  const sourceMap = JSON.parse(readFileSync('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map'));
  const index = sourceMap.sources.indexOf('node_modules/astylarui/dist/lib/lib/astylar.js');
  assert(index >= 0);
  const initialFailure = /void session\.invalidate\('initial'\)\.catch\(\(?error\)? => \{\s*this\.reportRenderFailure\('Initial render failed\.', error\);\s*\}\);/;
  assert(initialFailure.test(sourceMap.sourcesContent[index]));
  assert(initialFailure.test(readFileSync('src/lib/astylar.ts', 'utf8').replace('(error)', 'error')));
  function inspect(row) {
    assert.equal(row.initial.theme, 'light'); assert.equal(row.initial.session.status, 'rendering');
    assert.equal(row.observation.intercepted, 1);
    assert.deepEqual(row.observation.completions, [{ width: 24, height: 24 }]);
    for (const snapshot of [row.beforeRelease, row.afterRelease]) {
      assert.equal(snapshot.token, row.initial.token);
      assert(snapshot.distinctSurface && snapshot.distinctScene);
      assert.equal(snapshot.retired.disposed, true);
      assert.equal(snapshot.retired.session.status, 'disposed');
      assert.equal(snapshot.retired.session.cleanupRegistrations, 0);
      assert.deepEqual(snapshot.retired.session.pendingReasons, []);
      assert.deepEqual(snapshot.retired.live, { meshes: 0, materials: 0, textures: 0 });
      assert.deepEqual(snapshot.retired.tracked, snapshot.retired.live);
      assert.deepEqual(snapshot.retired.textureIds, []);
      assert.equal(snapshot.current.disposed, false); assert.equal(snapshot.current.session.status, 'idle');
      assert.deepEqual(snapshot.current.session.pendingReasons, []);
      assert.deepEqual(snapshot.current.live, { meshes: 12, materials: 11, textures: 4 });
      assert.deepEqual(snapshot.current.tracked, snapshot.current.live);
    }
    assert.deepEqual(row.afterRelease.current, row.beforeRelease.current);
    assert.equal(row.afterRelease.source, row.beforeRelease.source);
    assert.equal(row.runtimeValidation.status, 'failed');
    assert.equal(row.runtimeValidation.errors.length, 1);
    assert.match(row.runtimeValidation.errors[0], /\[Astylar:render-failed\] Initial render failed.*disposed before settling/);
    assert.match(row.runtimeValidation.message, /Supplemental runtime validation failed/);
  }
  inspect(record);
  for (const mutate of [row => { row.afterRelease.token = 'different-document'; },
    row => { row.afterRelease.retired.live.textures = 1; }, row => { row.afterRelease.current.textureIds.push(999); },
    row => { row.runtimeValidation.status = 'passed'; }, row => { row.observation.completions = []; }]) {
    const changed = structuredClone(record); mutate(changed); assert.throws(() => inspect(changed));
  }
});

test('minimal public mount cancellation reports failure without Material or image dependencies', () => {
  const directory = 'artifacts/material-parity/public-initial-cancellation-20261010';
  const raw = readFileSync(`${directory}/failure-observations.json`);
  assert.equal(hash(raw), '887682d6ac5b4e9291186d5b8d97407872b4173364d72fa7a9f206999005323d');
  const record = JSON.parse(raw), provenance = record.provenance;
  for (const receipt of [provenance.script, ...provenance.bundleInputs]) {
    const current = readFileSync(receipt.file);
    if (receipt.file === 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar.js'
      && hash(current) === 'a18630bdc31067ac75907e41f9031865fa192edc164ebf93edacb8b836b09abd') {
      // Exact existing inspector-only transition;captured bundle remains original.
      assert.equal(hash(restoreCursorInspectorCaptureSource(current.toString())), receipt.sha256);
    } else assert.equal(hash(current), receipt.sha256);
  }
  assert.equal(hash(readFileSync(`${directory}/audit.js`)), provenance.bundleSha256);
  assert.equal(hash(readFileSync(`${directory}/index.html`)), provenance.htmlSha256);
  function inspect(row) {
    assert.deepEqual(row.results.map(result => result.mode), ['immediate', 'settled']);
    for (const result of row.results) {
      assert.equal(result.before.status, 'scheduled'); assert.equal(result.before.revision, 0);
      assert.deepEqual(result.before.pendingReasons, ['initial']);
      assert.equal(result.disposed, true); assert.equal(result.session.status, 'disposed');
      assert.equal(result.session.cleanupRegistrations, 0); assert.deepEqual(result.session.pendingReasons, []);
      assert.deepEqual(result.resources, { meshes: 0, materials: 0, textures: 0 });
      assert.deepEqual(result.live, result.resources); assert.deepEqual(result.pageErrors, []);
      assert(result.assets.some(asset => asset.type === 'script' && asset.sha256 === provenance.bundleSha256));
      assert(result.assets.some(asset => asset.type === 'document' && asset.sha256 === provenance.htmlSha256));
      if (result.mode === 'immediate') {
        assert.equal(result.session.revision, 0); assert.equal(result.settlement.status, 'rejected');
        assert.match(result.settlement.message, /disposed before settling/);
        assert.equal(result.errors.length, 1); assert.match(result.errors[0], /Initial render failed.*disposed before settling/);
      } else { assert.equal(result.session.revision, 1); assert.equal(result.settlement.status, 'resolved'); assert.deepEqual(result.errors, []); }
    }
  }
  inspect(record);
  for (const mutate of [row => { row.results[0].errors = []; }, row => { row.results[0].session.revision = 1; },
    row => { row.results[1].settlement.status = 'rejected'; }, row => { row.results[0].live.textures = 1; }]) {
    const changed = structuredClone(record); mutate(changed); assert.throws(() => inspect(changed));
  }
});

test('current initial-render reporter classifies expected session cancellation like a genuine reflow failure', async () => {
  const compiled = ts.transpileModule(readFileSync('src/lib/astylar-render-session.ts', 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const sessionExports = {};
  new Function('exports', compiled)(sessionExports);
  const source = readFileSync('src/lib/astylar.ts', 'utf8');
  const ast = ts.createSourceFile('astylar.ts', source, ts.ScriptTarget.Latest, true);
  const renderer = ast.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'AstylarRenderer');
  const reporting = renderer.members.find(node => node.name?.getText(ast) === 'reportRenderFailure');
  const initial = [];
  function visit(node) {
    if (ts.isExpressionStatement(node) && node.getText(ast).startsWith("void session.invalidate('initial').catch")) initial.push(node);
    ts.forEachChild(node, visit);
  }
  visit(renderer); assert.equal(initial.length, 1);
  const probeSource = ts.transpileModule(`class Probe { ${reporting.getText(ast).replace(/^private\s+/, '')} start(session) { ${initial[0].getText(ast)} } } export { Probe };`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const probeExports = {};
  new Function('exports', 'AstylarDiagnosticError', probeSource)(probeExports, class extends Error {});
  for (const mode of ['dispose-pending', 'reflow-failure']) {
    let frame, cancelled = 0, reflows = 0;
    const events = [], probe = new probeExports.Probe();
    probe.diagnostics = { report: event => events.push(event) };
    const session = new sessionExports.AstylarRenderSession({}, { root: { children: [] }, styles: [] }, () => {
      reflows++; throw new Error('controlled actual reflow failure');
    }, { requestFrame: callback => { frame = callback; return 1; }, cancelFrame: () => { cancelled++; } });
    probe.start(session);
    if (mode === 'dispose-pending') session.dispose(); else frame();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { code: 'render-failed', severity: 'error', message: 'Initial render failed.',
      value: mode === 'dispose-pending' ? 'Astylar render session was disposed before settling.' : 'controlled actual reflow failure' });
    assert.equal(reflows, mode === 'dispose-pending' ? 0 : 1);
    assert.equal(cancelled, mode === 'dispose-pending' ? 1 : 0);
    assert.equal(session.snapshot.status, mode === 'dispose-pending' ? 'disposed' : 'idle');
    session.dispose();
  }
});

test('Icon live theme replacement queues behind pending native texture rather than retiring it first', () => {
  const raw = readFileSync('artifacts/material-parity/icon-live-replacement-queued-20261010/latest-report.json');
  assert.equal(hash(raw), '8041e452348889e80c8819365d9135fe265f9962c788374c2f8c0a0582d25048');
  const record = JSON.parse(raw);
  for (const receipt of [record.capture.checkpointManifest, ...record.capture.sources]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const manifest = JSON.parse(readFileSync(record.capture.checkpointManifest.file));
  assert.deepEqual(verifyRetainedMaterialBrowserFiles(manifest.provenance.browserFiles),
    { authenticatedFiles: 1887, currentRenderingAccepted: false });
  const assets = new Map(manifest.provenance.browserFiles.map(receipt => [receipt.file, receipt.sha256]));
  assert(record.runtime.assets.length > 0);
  for (const asset of record.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
  function inspect(row) {
    assert.equal(row.before.held, 1);
    assert.equal(row.queued.sameSurface, true); assert.equal(row.queued.disposed, false);
    assert.equal(row.queued.source, row.before.source);
    assert.equal(row.queued.session.status, 'rendering'); assert(row.queued.session.pendingReasons.includes('update'));
    assert(row.queued.textures.some(texture => texture.name === row.before.source && !texture.ready));
    assert.deepEqual(row.observations.completions, [{ width: 24, height: 24 }]);
    assert.equal(row.after.sameSurface, true); assert.equal(row.after.disposed, false);
    assert.equal(row.after.session.status, 'idle'); assert.deepEqual(row.after.session.pendingReasons, []);
    assert.notEqual(row.after.source, row.before.source);
    assert(!row.after.textures.some(texture => texture.name === row.before.source));
    const current = row.after.textures.filter(texture => texture.name === row.after.source);
    assert.equal(current.length, 2); assert(current.every(texture => texture.ready));
    assert.deepEqual(row.runtime.errors, []);
  }
  inspect(record);
  for (const mutate of [row => { row.queued.source = row.after.source; }, row => { row.after.sameSurface = false; },
    row => { row.after.textures.push({ name: row.before.source, ready: true }); }, row => { row.observations.completions = []; }]) {
    const changed = structuredClone(record); mutate(changed); assert.throws(() => inspect(changed));
  }
});

test('configured Icon relationships are direct names and hiding with no authored IDREF obligations', t => {
  const raw = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(raw), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const capture = JSON.parse(raw), identity = row => [row.kind, row.family, row.profile, row.viewport.id, row.state ?? 'static'].join('/');
  const rows = [...capture.results.map(row => ({ ...row, kind: 'static' })), ...capture.interactions.map(row => ({ ...row, kind: 'interaction' }))].filter(row => row.family === 'icon');
  const configured = [...materialStaticCases.map(row => ({ ...row, kind: 'static' })), ...materialInteractionCases.map(row => ({ ...row, kind: 'interaction' }))].filter(row => row.family === 'icon');
  assert.equal(rows.length, 20); assert.deepEqual(rows.map(identity).sort(), configured.map(identity).sort());
  const forbidden = new Set(['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'aria-activedescendant', 'aria-flowto', 'aria-details', 'aria-errormessage', 'headers', 'for', 'list', 'form',
    'ariaLabelledby', 'ariaDescribedby', 'ariaControls', 'ariaOwns', 'ariaActivedescendant', 'ariaFlowto', 'ariaDetails', 'ariaErrormessage', 'htmlFor']);
  function inspectTree(tree, side) {
    assert.deepEqual(tree.errors, []);
    assert.equal(tree.nodes.length, side === 'reference' ? 7 : 6);
    const attrs = node => side === 'reference' ? node.attributes : node.authored ?? {};
    for (const node of tree.nodes) {
      assert.ok(!Object.keys(attrs(node)).some(key => forbidden.has(key)), 'new relationship must be inspected rather than silently excluded');
      assert.ok(!['label', 'input', 'button', 'select', 'textarea', 'dialog'].includes(node.type ?? node.authored?.type));
    }
    const owners = tree.nodes.filter(node => attrs(node).id === 'icon-primary'); assert.equal(owners.length, 1);
    const owner = attrs(owners[0]);
    if (side === 'reference') { assert.equal(owner['aria-label'], 'Favorite'); assert.equal(owner['aria-hidden'], 'true'); assert.equal(owner.role, 'img'); }
    else { assert.equal(owner.alt, 'Favorite'); assert.equal(owner.ariaHidden, undefined); assert.equal(owner.type, 'img'); }
    const roots = tree.nodes.filter(node => attrs(node).id === 'icon-root'); assert.equal(roots.length, 1);
    assert.equal(attrs(roots[0])[side === 'reference' ? 'aria-label' : 'ariaLabel'], 'icon showcase');
  }
  let trees = 0;
  for (const row of rows) for (const side of ['reference', 'astylar']) {
    const receipt = row.inputTrees[side], raw = readFileSync(receipt.file); assert.equal(hash(raw), receipt.sha256);
    const tree = JSON.parse(raw); inspectTree(tree, side); trees++;
    const changed = structuredClone(tree);
    if (side === 'reference') changed.nodes[0].attributes['aria-describedby'] = 'new-help';
    else changed.nodes[0].authored = { ...changed.nodes[0].authored, ariaDescribedby: 'new-help' };
    assert.throws(() => inspectTree(changed, side));
  }
  const observations = [];
  for (const [file, expected] of [
    ['passive-badge-icon-ax-verified-20261006.log', 'be9aab6af9e9033e6d81efaee354bdb1aa5b4b237d4074edacda499f241a2516'],
    ['icon-remaining-ax-20261007.log', '3613ac867242858953e2d4a31342b319e0d2c504ce15590682718354979d8612'],
  ]) {
    const raw = readFileSync(`artifacts/material-parity/${file}`); assert.equal(hash(raw), expected);
    for (const line of raw.toString().split(/\r?\n/).filter(line => line.startsWith('# {'))) {
      const value = JSON.parse(line.slice(2).replace(/\\#/g, '#'));
      for (const observation of value.observations ?? [value]) if (observation.family === 'icon')
        observations.push({ ...observation, profile: observation.profile ?? 'light', viewport: observation.viewport ?? { width: 1440, height: 1000, deviceScaleFactor: 1 } });
    }
  }
  assert.equal(observations.length, 32);
  const cohort = row => [row.profile, row.viewport.width, row.viewport.height, row.viewport.deviceScaleFactor].join('/');
  assert.deepEqual([...new Set(observations.map(cohort))].sort(), [...new Set(rows.map(cohort))].sort());
  for (const key of new Set(observations.map(cohort))) {
    const pair = observations.filter(row => cohort(row) === key); assert.equal(pair.length, 2);
    const reference = pair.find(row => row.mode === 'reference').nodes[0];
    const astylar = pair.find(row => row.mode === 'astylar').nodes[0];
    assert.equal(reference.ignored, true);
    assert.ok(reference.ignoredReasons.some(reason => reason.name === 'ariaHiddenElement' && reason.value.value === true));
    assert.equal(astylar.ignored, false); assert.equal(astylar.role.value, 'image'); assert.equal(astylar.name.value, 'Favorite');
  }
  t.diagnostic(JSON.stringify({ cases: 20, authenticatedTrees: trees, axCohorts: 16, axObservations: 32, authoredIdRefs: 0, classification: 'existing accessibility-only hiding support gap; direct-name intent differs from hidden graphic', scope: 'retained exact Icon names/hiding and IDREF applicability only; not current full AX,assistive technology,paint or case closure' }));
});

test('public host scroll isolates stale hover without Material handlers or unequal inputs', () => {
  const root = 'artifacts/material-parity/public-host-scroll-hover-20261010';
  const raw = readFileSync(`${root}/latest-report.json`);
  assert.equal(hash(raw), '298097b2f44505a5d998fbb9b18832dd86a7c93dc08a47b910f33bdfa439b58c');
  const captured = JSON.parse(raw);
  for (const item of [captured.provenance.script, ...captured.provenance.bundleInputs])
    assert.equal(hash(readFileSync(item.file)), item.sha256, `changed dependency: ${item.file}`);
  assert.equal(captured.provenance.bundleInputs.length, 2517);
  assert.equal(hash(readFileSync(`${root}/audit.js`)), captured.provenance.bundleSha256);
  assert.equal(hash(readFileSync(`${root}/index.html`)), captured.provenance.htmlSha256);
  assert.ok(readFileSync('examples/material-showcase/audit/cursor-defaults.mjs', 'utf8').includes("import { Astylar } from 'astylarui'"));
  assert.equal(captured.provenance.browser, '154.0.8037.99');
  assert.equal(captured.provenance.launch.effective.nativeScrollbarsHidden, false);
  for (const entry of captured.results) for (const stage of entry.stages) for (const side of ['reference', 'astylar'])
    assert.equal(hash(readFileSync(`${root}/${stage[side].screenshot.file}`)), stage[side].screenshot.sha256);

  function inspect(value) {
    assert.deepEqual(value.errors, []);
    assert.equal(value.results.length, 4);
    assert.deepEqual(value.results.map(e => `${e.dpr}/${e.translated}`).sort(), ['1/false', '1/true', '2/false', '2/true']);
    for (const entry of value.results) {
      assert.deepEqual(entry.stages.map(s => s.name), ['hover', 'host-scroll', 'pointer-recheck']);
      assert.deepEqual(entry.stages.map(s => s.reference.target.cursor), ['pointer', 'default', 'default']);
      assert.deepEqual(entry.stages.map(s => s.astylar.canvasCursor), ['pointer', 'pointer', 'default']);
      assert.deepEqual(entry.stages.map(s => s.astylar.diagnostics.interaction.hoveredElementId ?? null), ['target', 'target', null]);
      for (const stage of entry.stages) {
        assert.deepEqual(stage.reference.site, stage.astylar.site);
        assert.deepEqual(stage.reference.site, cursorInput('button-hover'));
        for (const side of ['reference', 'astylar']) {
          const sample = stage[side];
          assert.equal(sample.name, 'button-hover');
          assert.equal(sample.scrollHeight, 601);
          assert.equal(sample.scrollY, stage.name === 'hover' ? 0 : 40);
        }
      }
      for (const side of ['reference', 'astylar'])
        assert.equal(entry.stages[0][side].surfaceBox.y - entry.stages[1][side].surfaceBox.y, 40);
      const after = entry.stages[1], point = after.astylar.point;
      assert.ok(point.y > after.reference.target.box.y + after.reference.target.box.height);
      assert.ok(point.y > after.astylar.surfaceBox.y && point.y < after.astylar.surfaceBox.y + after.astylar.surfaceBox.height);
      assert.equal(after.astylar.publicEvents.filter(e => e.type === 'pointerleave' && e.targetId === 'target').length, 0);
      assert.ok(entry.stages[2].astylar.publicEvents.some(e => e.type === 'pointerleave' && e.targetId === 'target'));
    }
  }
  inspect(captured);
  for (const mutate of [
    r => r.results.pop(),
    r => { r.results[0].stages[1].astylar.scrollY = 0; },
    r => { r.results[0].stages[1].astylar.site.styles[0].top = '33px'; },
    r => { for (const side of ['reference', 'astylar']) r.results[0].stages[1][side].site.styles[0].top = '33px'; },
    r => { r.results[0].stages[1].astylar.canvasCursor = 'default'; },
    r => { r.results[0].stages[2].astylar.publicEvents = []; },
    r => { r.results[0].stages[1].astylar.surfaceBox.y += 1; },
  ]) { const changed = structuredClone(captured); mutate(changed); assert.throws(() => inspect(changed)); }

  // Application-scale controls are separate diagnostics, not extra configured IDs.
  for (const [stem, expected] of [
    ['tooltip-host-scroll-20261010', 'aaee6c2078f1f41b1392022973166a821d35a6313357eb853c5afb75c470f110'],
    ['tooltip-host-scroll-repeat-20261010', '37191e21ec3345f8628582d7214a04bdff64b3813c9a787701ae125580027f38'],
  ]) {
    const file = `artifacts/material-parity/${stem}/latest-report.json`, raw = readFileSync(file);
    assert.equal(hash(raw), expected);
    const supplement = JSON.parse(raw), manifest = JSON.parse(readFileSync(supplement.capture.checkpointManifest.file));
    assert.deepEqual(validateSupplementalCapture(supplement, { reportFile: file, expectedProvenance: manifest.provenance,
      script: 'scripts/audit-material-tooltip-host-scroll.mjs', styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
    assert.equal(supplement.results.length, 6);
    for (const dpr of [1, 2]) {
      const states = supplement.results.filter(e => e.deviceScaleFactor === dpr);
      assert.deepEqual(states.map(e => [e.reference.shown, e.astylar.shown]), [[true, true], [false, true], [false, false]]);
      for (const side of ['reference', 'astylar']) {
        assert.equal(states[1][side].scrollHeight, 1401); assert.equal(states[1][side].scrollY, 100);
        assert.ok(Math.abs(states[0][side].triggerBox.y - states[1][side].triggerBox.y - 100) < .01);
        for (const state of states) assert.equal(hash(readFileSync(state[side].screenshot.file)), state[side].screenshot.sha256);
      }
    }
  }
});

test('fresh divider layout observations join all exact cases and bound single-word wrapping', () => {
  // Fresh-divider historical probe boundary: preserve every original assertion below.
  const actualRead = createRequire(import.meta.url)('node:fs').readFileSync;
  const probeFile = 'scripts/audit-material-field-description.mjs';
  const capturedProbe = execFileSync('git', ['show', `ad7133cd:${probeFile}`]);
  const currentProbe = actualRead(probeFile);
  const verifyProbeBoundary = (captured, current) => {
    assert.equal(hash(captured), 'e46d62d9b90911288c9a3a0fd1b8cc1583bb77db1728bfecbbd352c17852d1bd');
    assert.equal(hash(current), 'b522882efa8d580d9501a16dd9f7c026f40e8f65f639f9d53724068a7595e876');
    const executedPath = bytes => {
      const source = ts.createSourceFile(probeFile, bytes.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
      const functions = source.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === 'inspectFreshDividerLayout');
      const guards = source.statements.filter(node => ts.isIfStatement(node) && node.expression.getText(source) === "process.argv.includes('--divider-layout')");
      assert.equal(functions.length, 1); assert.equal(guards.length, 1);
      return [...functions, ...guards].map(node => node.getText(source).replaceAll('\r\n', '\n'));
    };
    assert.deepEqual(executedPath(current), executedPath(captured), 'Complete layout function and early mode guard must remain unchanged');
  };
  verifyProbeBoundary(capturedProbe, currentProbe);
  assert.throws(() => verifyProbeBoundary(Buffer.concat([capturedProbe, Buffer.from('\n// forged')]), currentProbe));
  assert.throws(() => verifyProbeBoundary(capturedProbe, Buffer.concat([currentProbe, Buffer.from('\n// forged')])));
  // Only this captured probe read is historical; every other dependency read stays actual.
  const readFileSync = (file, ...options) => file === probeFile
    ? options[0] === 'utf8' ? capturedProbe.toString('utf8') : capturedProbe
    : actualRead(file, ...options);
  // End fresh-divider historical probe boundary; original callback statements follow.
  const raw = readFileSync('artifacts/material-parity/divider-fresh-retained-layout-20261009.jsonl');
  assert.equal(hash(raw), '3d71c0c9e2e6b825baa7f9c671977b2ab37845c2c99a37775fc51e11b889387e');
  const observations = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
  const terminal = observations.pop();
  assert.equal(terminal.terminal, 'verified');
  assert.equal(terminal.contexts, 20); assert.equal(observations.length, 20);
  assert.equal(terminal.browser, '154.0.8037.58');
  assert.equal(terminal.scriptSha256, hash(readFileSync('scripts/audit-material-field-description.mjs')));
  for (const receipt of terminal.sourceReceipts) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.ok(!terminal.sourceReceipts.some(row => /^src[\\/]/.test(row.file)));
  assert.ok(terminal.sourceReceipts.some(row => row.file.replaceAll('\\', '/') === 'examples/material-showcase/src/app/astylar.component.ts'));
  const retainedBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(retainedBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const retained = JSON.parse(retainedBytes);
  const cases = [...retained.results, ...retained.interactions].filter(row => row.family === 'divider');
  assert.equal(cases.length, 24);
  const ids = ['divider-above', 'divider-below'];
  for (const observation of observations) {
    assert.ok([400, 500, 700].every(weight => observation.fonts.some(face => face.family === 'Roboto' && face.weight === String(weight) && face.status === 'loaded')));
    assert.ok(observation.runtime.some(row => row.path === '/fresh.js' && row.sha256 === terminal.bundleSha256));
    assert.ok(observation.runtime.some(row => row.path === '/' && row.sha256 === terminal.htmlSha256));
    assert.deepEqual(observation.owners.map(row => row.authored.id), ids);
    for (const owner of observation.owners) {
      assert.equal(owner.retainedLayout.source, 'core-dimension-registry');
      assert.ok(owner.retainedLayout.width > 0 && owner.retainedLayout.height > 0);
      assert.deepEqual(owner.retainedLayout.padding, { top: 0, right: 0, bottom: 0, left: 0 });
    }
  }
  let joined = 0;
  for (const row of cases) {
    const matched = observations.filter(o => o.context.profile === row.profile &&
      o.context.viewport.width === row.viewport.width && o.context.viewport.height === row.viewport.height &&
      o.context.viewport.deviceScaleFactor === row.viewport.deviceScaleFactor);
    assert.equal(matched.length, 1);
    const treeBytes = readFileSync(row.inputTrees.astylar.file);
    assert.equal(hash(treeBytes), row.inputTrees.astylar.sha256);
    const tree = JSON.parse(treeBytes);
    for (const fresh of matched[0].owners) {
      const old = tree.nodes.find(node => node.authored?.id === fresh.authored.id);
      const { retainedLayout, ...withoutNewDiagnostic } = fresh;
      assert.deepEqual(withoutNewDiagnostic, old, `${row.id}/${fresh.authored.id}: current owner inputs changed`);
      joined++;
    }
  }
  assert.equal(joined, 48);
  const document = { createElement: () => ({ getContext: () => ({ measureText: text => ({ width: text.length * 8 }) }) }) };
  const load = file => {
    const exports = {};
    const compiled = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
    } }).outputText;
    new Function('require', 'exports', 'document', 'window', compiled)(name => {
      assert.equal(name, '@angular/core'); return { Injectable: () => target => target };
    }, exports, document, { devicePixelRatio: 1 });
    return exports;
  };
  const parser = new (load('src/app/services/text/text-style-parser.service.ts').TextStyleParserService)();
  const wrapping = new (load('src/app/services/text/multi-line-text-renderer.service.ts').MultiLineTextRendererService)();
  for (const observation of observations) for (const owner of observation.owners) {
    const style = parser.parseTextProperties({ selector: 'span', ...owner.retainedText.style });
    assert.equal(style.whiteSpace, 'normal'); assert.equal(style.wordWrap, 'normal');
    assert.equal(style.textOverflow, 'clip');
    for (const width of [1, owner.retainedLayout.width, 1000])
      assert.deepEqual(wrapping.wrapText(owner.authored.textContent, width, style).map(line => line.text), [owner.authored.textContent]);
    // Source limitation: first segment never enters the overflow branch.
    // Preserve that observation; it is not authored in these divider owners.
    assert.equal(wrapping.wrapText(owner.authored.textContent, 1, { ...style, wordWrap: 'break-word' }).length, 1);
    assert.ok(wrapping.wrapText('Above Below', 1, { ...style, wordWrap: 'break-word' }).length > 2);
    assert.equal(wrapping.wrapText('Above Below', 1, style).length, 2);
  }
  // Real owner widths and inputs are observed; the synthetic measure control
  // only tests the owning line-break algorithm,not raster or browser metrics.
});

test('packed layout inspection browser proofs authenticate the complete current consumer suite', () => {
  // Authenticate the actual historical runner,not today's added context metadata.
  // The separately registered observed-context proof conserves its entire source
  // transition; this check still rejects any current runner drift independently.
  const retainedRunner=execFileSync('git',['show','b640ef3e:scripts/audit-overlay-layout-stage.mjs']);
  assert.equal(hash(retainedRunner),'dfcd2c165005552ac980deb663c69d7680333c238b6f04a11f814f3276271a5a');
  const contextRunner=Buffer.from(readFileSync('docs/evidence/material-overlay-context-runner.mjs.b64','utf8').trim(),'base64');
  assert.equal(hash(contextRunner),'8437ab812e876265a7ff8289aa778678dec64edf2276109489931374ba8c072e');
  assert.equal(readFileSync('scripts/audit-overlay-layout-stage.mjs','utf8').replaceAll('\r\n','\n'),
    contextRunner.toString().replaceAll('\r\n','\n'));
  const packageRoot = 'artifacts/material-parity/layout-inspection-package-TKjpCE/package';
  assert.equal(hash(readFileSync(`${packageRoot}/../astylarui-0.2.0.tgz`)),
    '38a3c6fc2bf56641459d76a376ccb6bffbe7cce4dd5fefae22c8ea776d885227');
  const resultHash = '58fbdf2c406ce871e135ac43c53719096eec7fd2d470ca608b8eca8b38656d92';
  const provenanceHashes = [
    '44fd95ae6b54309453ac88c2f0b9b5b6a1c17ef19adca5ce997a66f00373a8aa',
    'f83444ecbb998487a2e5ac2e2a9ee1197f224005a1a5b50287c240fa3cab743e',
  ];
  for (const dpr of [1, 2]) {
    const dir = `artifacts/material-parity/layout-inspection-package-zoned-20261009-dpr${dpr}`;
    const raw = readFileSync(`${dir}/result.json`), proof = JSON.parse(raw);
    assert.equal(hash(raw), resultHash);
    assert.equal(proof.browser, '154.0.8037.58');
    assert.equal(proof.result.status, 'passed');
    assert.equal(proof.result.results.length, 2);
    assert.ok(proof.result.results.every(row => row.status === 'passed' && row.failures.length === 0));
    assert.deepEqual(proof.errors, []);
    const provenanceRaw = readFileSync(`${dir}/provenance.json`);
    assert.equal(hash(provenanceRaw), provenanceHashes[dpr - 1]);
    const provenance = JSON.parse(provenanceRaw);
    assert.equal(provenance.specFilter, '');
    assert.equal(provenance.runnerSha256, hash(retainedRunner));
    assert.equal(provenance.bundleSha256, hash(readFileSync(`${dir}/audit.js`)));
    assert.equal(provenance.compiledReceipts.length, 104);
    for (const receipt of provenance.compiledReceipts) {
      assert.equal(hash(readFileSync(receipt.source)), receipt.sourceSha256);
      for (const root of ['dist/lib', `${packageRoot}/dist/lib`])
        assert.equal(hash(readFileSync(path.join(root, receipt.file))), receipt.emittedSha256);
    }
    assert.equal(provenance.inputs.length, 2742);
    assert.ok(!provenance.inputs.some(row => /^src[\\/]/.test(row.file)), 'Consumer must not bundle renderer source imports');
    for (const receipt of provenance.inputs) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  }
  const config = ts.readConfigFile('examples/angular-consumer/tsconfig.spec.json', ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, path.resolve('examples/angular-consumer'));
  assert.deepEqual(parsed.errors, []);
  const program = ts.createProgram(['examples/angular-consumer/src/app/style-inspection.browser.spec.ts'], {
    ...parsed.options, noEmit: true, baseUrl: process.cwd(),
    paths: { astylarui: [path.resolve(packageRoot, 'dist/lib/lib/index.d.ts')] },
  });
  assert.deepEqual(ts.getPreEmitDiagnostics(program), []);
});

test('retained datepicker clock applicability distinguishes calendar content from closed final states', () => {
  const raw = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(raw), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const retained = JSON.parse(raw);
  const cases = [...retained.results.map(row => ({ ...row, kind: 'static' })),
    ...retained.interactions.map(row => ({ ...row, kind: 'interaction' }))]
    .filter(row => row.family === 'datepicker');
  assert.equal(cases.length, 111);
  const identities = new Set(), groups = {}, views = { month: 0, years: 0, closed: 0 };
  for (const row of cases) {
    const identity = JSON.stringify([row.kind, row.family, row.profile, row.viewport, row.state ?? null]);
    assert.equal(identities.has(identity), false);
    identities.add(identity);
    const trees = {};
    for (const side of ['reference', 'astylar']) {
      const receipt = row.inputTrees[side], bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      trees[side] = JSON.parse(bytes);
    }
    const nativeOpen = trees.reference.nodes.some(node => node.type === 'mat-calendar');
    const candidateOpen = trees.astylar.nodes.some(node => node.authored?.id === 'datepicker-month');
    assert.equal(nativeOpen, candidateOpen, identity);
    const month = trees.astylar.nodes.some(node => node.authored?.id === 'datepicker-grid');
    const years = trees.astylar.nodes.some(node => node.authored?.id === 'datepicker-year-grid');
    assert.equal(Number(month) + Number(years), Number(candidateOpen), identity);
    views[month ? 'month' : years ? 'years' : 'closed']++;
    const group = `${row.kind}/${row.state ?? 'initial'}/${candidateOpen}`;
    groups[group] = (groups[group] ?? 0) + 1;
  }
  assert.deepEqual(views, { month: 33, years: 8, closed: 70 });
  assert.deepEqual(groups, {
    'static/initial/false': 12, 'interaction/focus/false': 8,
    'interaction/hover/false': 8, 'interaction/held/false': 8,
    'interaction/activate/true': 9, 'interaction/activate-leave/true': 8,
    'interaction/open-secondary/true': 8, 'interaction/open-hover-content/true': 8,
    'interaction/open-dismiss-outside/false': 8, 'interaction/open-dismiss-canvas/false': 8,
    'interaction/disabled/false': 8, 'interaction/error/false': 8,
    'interaction/open/true': 8, 'interaction/open-dismiss/false': 2,
  });
  // Final closed trees do not prove intermediate dismissal/action states are
  // clock independent, nor certify current output or absence of other timers.
});

test('checkpoint application source census confines drift to the documented serializer diagnostic', () => {
  const raw = readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
  assert.equal(hash(raw), '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
  const manifest = JSON.parse(raw);
  const captured = new Map();
  const contributingMaps = [];
  // Read this checkpoint's retained bytes, not whichever build is in dist now.
  // Each original receipt below remains authoritative; no fallback or recapture.
  const retainedBrowserRoot = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser';
  for (const receipt of manifest.provenance.browserFiles.filter(row => row.file.endsWith('.js.map'))) {
    assert.ok(!path.isAbsolute(receipt.file) && !receipt.file.split(/[\\/]/).includes('..'));
    const bytes = readFileSync(path.join(retainedBrowserRoot, receipt.file));
    assert.equal(hash(bytes), receipt.sha256, receipt.file);
    const map = JSON.parse(bytes);
    let contributes = false;
    for (const [index, file] of map.sources.entries()) {
      if (!file.startsWith('src/')) continue;
      contributes = true;
      const content = map.sourcesContent[index];
      assert.equal(typeof content, 'string');
      if (captured.has(file)) assert.equal(hash(captured.get(file)), hash(content), file);
      captured.set(file, content);
    }
    if (contributes) contributingMaps.push(receipt.file);
  }
  assert.deepEqual(contributingMaps, ['chunk-625ZTKCG.js.map', 'chunk-7SL66K3U.js.map',
    'chunk-DV4XS33V.js.map', 'chunk-JPEJK334.js.map', 'chunk-YSOHGT2J.js.map', 'main.js.map']);
  assert.deepEqual([...captured.keys()].sort(), ['src/app/app.config.ts', 'src/app/app.html',
    'src/app/app.routes.ts', 'src/app/app.ts', 'src/app/astylar.component.ts',
    'src/app/catalog.ts', 'src/app/comparison.component.ts', 'src/app/frame-protocol.ts',
    'src/app/frame-sync.ts', 'src/app/material-assets.ts', 'src/app/material-input-evidence.ts',
    'src/app/material-plugin/material-ripple.controller.ts',
    'src/app/material-plugin/material-showcase.plugin.ts', 'src/app/reference.component.ts',
    'src/app/showcase.store.ts', 'src/app/theme.ts', 'src/main.ts'].sort());
  const lf = text => text.replace(/\r\n/g, '\n');
  let equal = 0;
  for (const [file, content] of captured) {
    const current = readFileSync(path.join('examples/material-showcase', file), 'utf8');
    if (file === 'src/app/material-input-evidence.ts') {
      assert.equal(hash(content), 'de0efefd73f69cbd62d2fc902c43c0fb48db59a07ee718b6baa92936fe56d357');
      assert.equal(hash(lf(current)), '521940b6dd4f97776bf17b2315bc4e726dc152c3cdb4aceb759603408db3e614');
    } else {
      assert.equal(hash(lf(current)), hash(lf(content)), file);
      equal++;
    }
  }
  assert.equal(equal, 16);
  // JS source-map scope only; not external CSS/assets or current browser acceptance.
});

test('current Material serializer preserves detached layout observations without filling missing owners', () => {
  const file = 'examples/material-showcase/src/app/material-input-evidence.ts';
  const source = readFileSync(file, 'utf8');
  const rawMap = readFileSync('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-JPEJK334.js.map');
  assert.equal(hash(rawMap), '47654b641610e1d56e02948b17fab41aff25e9c6aedc6f83b70a26b6f349ce9e');
  const map = JSON.parse(rawMap);
  const capturedIndex = map.sources.indexOf('src/app/material-input-evidence.ts');
  assert.ok(capturedIndex >= 0);
  const captured = map.sourcesContent[capturedIndex];
  assert.equal(hash(captured), 'de0efefd73f69cbd62d2fc902c43c0fb48db59a07ee718b6baa92936fe56d357');
  const lf = text => text.replace(/\r\n/g, '\n');
  assert.equal(captured, lf(execFileSync('git', ['show', `aabeb128^:${file}`], { encoding: 'utf8' })));
  assert.equal(hash(lf(source)), '521940b6dd4f97776bf17b2315bc4e726dc152c3cdb4aceb759603408db3e614');
  assert.equal(lf(source), lf(execFileSync('git', ['show', `aabeb128:${file}`], { encoding: 'utf8' })));
  // Whole-source transition is authenticated, not historical source substitution.
  // Execute the actual current serializer and retain all omission/cloning assertions.
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  } }).outputText;
  const exports = {};
  new Function('exports', compiled)(exports);
  const layout = { source: 'core-dimension-registry', width: 40.1062, height: 18,
    padding: { top: 0, right: 0, bottom: 0, left: 0 } };
  const snapshot = { revision: 7, elements: [
    { path: 'root/0', id: 'observed', type: 'span', normal: {}, effective: {}, retainedLayout: layout },
    { path: 'root/1', id: 'missing', type: 'span', normal: {}, effective: {} },
  ] };
  const styles = exports.collectMaterialCoreResolvedStyles(snapshot);
  const root = { children: [{ id: 'observed', type: 'span' }, { id: 'missing', type: 'span' }] };
  const tree = exports.collectAuthoredInputTree(root, [], styles.effective, styles);
  assert.deepEqual(tree.nodes[1].retainedLayout, layout);
  assert.equal(typeof tree.nodes[1].retainedLayout.width, 'number');
  assert.equal(tree.nodes[1].resolvedStyle.width, undefined);
  assert.equal(Object.hasOwn(tree.nodes[2], 'retainedLayout'), false);
  layout.padding.left = 99;
  assert.equal(tree.nodes[1].retainedLayout.padding.left, 0);
  tree.nodes[1].retainedLayout.padding.left = 88;
  assert.equal(exports.collectAuthoredInputTree(root, [], styles.effective, styles).nodes[1].retainedLayout.padding.left, 0);
  const legacy = exports.collectMaterialResolvedStyles([]);
  assert.ok(exports.collectAuthoredInputTree(root, [], legacy.effective, legacy).nodes.every(n => !Object.hasOwn(n, 'retainedLayout')));
});

test('current inspection method detaches registry dimensions and omits ambiguous owners', () => {
  const source = readFileSync('src/lib/astylar.ts', 'utf8');
  const ast = ts.createSourceFile('astylar.ts', source, ts.ScriptTarget.Latest, true);
  const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarRenderer');
  const method = owner.members.find(n => n.name?.getText(ast) === 'inspectCurrentDocumentStyles');
  assert.ok(method);
  const compiled = ts.transpileModule(`class Probe { ${method.getText(ast).replace(/^private\s+/, '')} }\nexport { Probe };`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  // Other inspection stages are inert controls; this executes the actual
  // current method body, not an independently rewritten dimension algorithm.
  new Function('exports', 'StandardMaterial', 'Texture', 'mergeInteractionStyles', compiled)(
    exports, class {}, class {}, styles => styles.normal);
  const probe = new exports.Probe();
  const dimensions = { width: 200, height: 50, padding: { top: 3, right: 5, bottom: 3, left: 5 } };
  let reads = 0;
  const mesh = { name: 'registry-owner', getBoundingInfo() { throw new Error('Projection is not a layout input'); } };
  probe.elementManager = { elementsMap: new Map([['observed', mesh], ['duplicate', mesh]]),
    getElementDimensions(id) { reads++; assert.equal(id, mesh.name); return dimensions; } };
  probe.getElementInteractionStyles = () => ({ normal: {} });
  probe.textInteractionRegistry = { getByElementId: () => undefined };
  probe.inputElementService = { getInputElement: () => undefined };
  const session = { snapshot: { revision: 7 }, siteData: { root: { children: [
    { id: 'observed', type: 'span' }, { id: 'hidden', type: 'span' },
    { id: 'duplicate', type: 'span' }, { id: 'duplicate', type: 'span' },
  ] } } };
  const result = probe.inspectCurrentDocumentStyles(session);
  assert.equal(reads, 1);
  assert.deepEqual(result.elements[0].retainedLayout, { source: 'core-dimension-registry', ...dimensions });
  assert.ok(result.elements.slice(1).every(n => !Object.hasOwn(n, 'retainedLayout')));
  result.elements[0].retainedLayout.padding.left = 999;
  assert.equal(dimensions.padding.left, 5);
  assert.equal(probe.inspectCurrentDocumentStyles(session).elements[0].retainedLayout.padding.left, 5);
  dimensions.width = 175;
  assert.equal(probe.inspectCurrentDocumentStyles(session).elements[0].retainedLayout.width, 175);
  assert.equal(result.elements[0].retainedLayout.width, 200);
});

test('focused style inspection config preserves compiler options and the complete owning suite', async () => {
  const parse = file => {
    const config = ts.readConfigFile(file, ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
    assert.deepEqual(parsed.errors, []);
    return parsed;
  };
  const broad = parse('tsconfig.spec.json');
  const focused = parse('tsconfig.style-inspection-audit.json');
  assert.deepEqual(focused.options, broad.options);
  const owner = path.resolve('src/lib/astylar-style-inspection.spec.ts');
  assert.deepEqual(focused.fileNames.map(f => path.resolve(f)), [owner]);
  assert.ok(broad.fileNames.length > focused.fileNames.length);
  const require = createRequire(import.meta.url);
  const { findTests } = require('../../node_modules/@angular/build/src/builders/karma/find-tests.js');
  const entries = await findTests(['src/lib/astylar-style-inspection.spec.ts'], [], process.cwd(), path.resolve('src'));
  assert.deepEqual(entries.map(f => path.resolve(f)), [owner]);
  // The runner executes the entire existing suite. This config is not the
  // final full-unit gate and does not filter individual assertions.
});

test('divider retained wrapping ancestry distinguishes requests from missing layout dimensions', () => {
  const raw = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(raw), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const retained = JSON.parse(raw);
  const cases = [...retained.results, ...retained.interactions].filter(r => r.family === 'divider');
  assert.equal(cases.length, 24);
  const visits = { reference: 0, astylar: 0 };
  const retainedWidthErrors = [];
  for (const row of cases) for (const side of ['reference', 'astylar']) {
    const receipt = row.inputTrees[side];
    const rawTree = readFileSync(receipt.file);
    assert.equal(hash(rawTree), receipt.sha256);
    const tree = JSON.parse(rawTree);
    // This passive fixture has no media/control/plugin-rendered leaf to which
    // an image/media load or Material renderer-animation race could belong.
    const types = tree.nodes.map(node => side === 'reference' ? node.type : node.authored?.type);
    assert.deepEqual(types, side === 'reference'
      ? ['main', 'p', 'h1', 'section', 'p', 'span', 'mat-divider', 'p', 'span']
      : [undefined, 'main', 'p', 'h1', 'section', 'p', 'span', 'div', 'p', 'span']);
    for (const node of tree.nodes) {
      const input = side === 'reference' ? node.attributes : node.authored;
      for (const key of ['src', 'srcset', 'href', 'poster', 'autoplay', 'controls'])
        assert.equal(input?.[key], undefined);
    }
    // Expand the captured shorthand through actual longhands, not guessed
    // defaults. Different container/position authoring remains a separate issue.
    for (const id of ['divider-above', 'divider-below', 'divider-primary', 'divider-root']) {
      const node = tree.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
      assert.ok(node, id);
      const style = side === 'reference' ? tree.styles[node.style] : node.normalResolvedStyle;
      assert.equal(style.flex, side === 'reference' ? '0 1 auto' : undefined);
      for (const [property, value] of [['flexGrow', '0'], ['flexShrink', '1'], ['flexBasis', 'auto']])
        assert.equal(style[property], value);
      if (side === 'reference' && ['divider-root', 'divider-primary'].includes(id)) {
        const measured = row.geometry.elements.find(element => element.id === id);
        assert.ok(measured && !measured.missing);
        const extras = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
          .reduce((sum, property) => sum + parseFloat(style[property]), 0);
        assert.equal(measured.expected.width,
          parseFloat(style.width) + (style.boxSizing === 'content-box' ? extras : 0));
        retainedWidthErrors.push(Math.abs(measured.expected.width - measured.actual.width));
      }
      if (id === 'divider-root') {
        assert.equal(style.display, side === 'reference' ? 'block' : 'flex');
        if (side === 'astylar') {
          const children = tree.nodes.filter(n => n.parent === node.key);
          assert.equal(children.length, 3);
          assert.ok(children.every(n => n.normalResolvedStyle.position === 'absolute'));
        }
      } else assert.ok(!['flex', 'inline-flex', 'grid', 'inline-grid'].includes(style.display));
    }
    for (const id of ['divider-above', 'divider-below']) {
      let node = tree.nodes.find(n => (n.authored?.id ?? n.attributes?.id) === id);
      assert.ok(node, id);
      if (side === 'astylar') assert.deepEqual(Object.keys(node).filter(k => /dimension|bounds|geometry/i.test(k)), []);
      while (node) {
        visits[side]++;
        const style = side === 'reference' ? tree.styles[node.style] : (node.interactionResolvedStyle ?? {});
        for (const key of ['whiteSpace', 'overflowWrap', 'wordBreak', 'textOverflow', 'wordWrap']) {
          const expected = side === 'reference' && key !== 'wordWrap'
            ? (key === 'textOverflow' ? 'clip' : 'normal') : undefined;
          assert.equal(style[key], expected);
        }
        node = tree.nodes.find(n => n.key === node.parent);
      }
    }
  }
  assert.deepEqual(visits, { reference: 192, astylar: 240 });
  assert.equal(retainedWidthErrors.length, 48);
  // Preserve the exact recorded numerical residue, not a new parity threshold.
  assert.equal(Math.max(...retainedWidthErrors), 1.1823431123048067e-11);
});

test('divider actual-theme AX cohorts preserve exact contexts and runtime receipts', () => {
  const raw = readFileSync('artifacts/material-parity/divider-theme-verified-ax-20261009.log');
  assert.equal(hash(raw), '32c55ffb2c1bede46dfefa45e24fa96dcdcab52ee9ac251d0d06bb0333f76347');
  const records = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
  const terminal = records.pop();
  assert.equal(terminal.terminal, 'verified');
  assert.equal(terminal.contexts, 16);
  assert.equal(terminal.family, 'divider');
  assert.deepEqual(terminal.states, ['inspect']);
  for (const receipt of [...terminal.capture.sources, ...terminal.sourceReceipts,
    terminal.capture.checkpointManifest]) {
    const source = receipt.file === 'scripts/audit-material-field-description.mjs'
      ? execFileSync('git', ['show', `c990a806:${receipt.file}`]) : readFileSync(receipt.file);
    assert.equal(hash(source), receipt.sha256);
  }
  const manifest = JSON.parse(readFileSync(terminal.capture.checkpointManifest.file));
  assert.equal(terminal.browser, manifest.provenance.browser);
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile =>
    ['desktop', 'tablet', 'mobile', 'desktop-dpr2'].flatMap(viewport =>
      ['reference', 'astylar'].map(side => `${profile}:${viewport}:${side}`)));
  assert.deepEqual(records.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`).sort(), expected.sort());
  const comparisonBytes = readFileSync('artifacts/material-parity/divider-comparison-theme-ax-20261009.log');
  assert.equal(hash(comparisonBytes), 'b461888f7be8f49c0eb7b337f5bc32a20a0604d7369add569f14fcc6036e78b8');
  const comparison = comparisonBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
  const comparisonTerminal = comparison.pop();
  assert.equal(comparisonTerminal.terminal, 'verified');
  assert.equal(comparisonTerminal.contexts, 4);
  assert.equal(comparisonTerminal.family, 'divider');
  assert.deepEqual(comparisonTerminal.states, ['inspect']);
  assert.equal(comparisonTerminal.browser, terminal.browser);
  assert.deepEqual(comparisonTerminal.capture.checkpointManifest, terminal.capture.checkpointManifest);
  for (const receipt of [...comparisonTerminal.capture.sources, ...comparisonTerminal.sourceReceipts]) {
    const source = receipt.file === 'scripts/audit-material-field-description.mjs'
      ? execFileSync('git', ['show', `a73933c9:${receipt.file}`]) : readFileSync(receipt.file);
    assert.equal(hash(source), receipt.sha256);
  }
  assert.deepEqual(comparison.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`).sort(),
    ['light', 'dark', 'contrast', 'custom'].flatMap(profile => ['reference', 'astylar'].map(side => `${profile}:comparison:${side}`)).sort());
  records.push(...comparison);
  const configured = [...materialStaticCases, ...materialInteractionCases].filter(r => r.family === 'divider');
  assert.equal(configured.length, 24);
  const covered = configured.filter(r => records.some(observed => observed.side === 'reference' &&
    observed.context.profile === r.profile && observed.context.viewport.width === r.viewport.width &&
    observed.context.viewport.height === r.viewport.height && observed.context.deviceScaleFactor === r.viewport.deviceScaleFactor));
  assert.equal(covered.length, 24);
  assert.deepEqual(configured.filter(r => !covered.includes(r)).map(r => `${r.profile}:${r.viewport.id}`).sort(),
    []);
  const rgb = { light: 'rgb(255, 251, 254)', dark: 'rgb(28, 27, 31)',
    contrast: 'rgb(255, 255, 255)', custom: 'rgb(244, 251, 250)' };
  for (const row of records) {
    const dimensions = { desktop: [1440, 1000, 1], tablet: [768, 1024, 1],
      mobile: [390, 844, 2], 'desktop-dpr2': [1440, 1000, 2], comparison: [609, 844, 1] };
    assert.deepEqual([row.context.viewport.width, row.context.viewport.height, row.context.deviceScaleFactor], dimensions[row.context.viewportId]);
    assert.equal(row.state, 'inspect');
    const url = new URL(row.url);
    assert.equal(url.pathname, `/${row.side}/divider`);
    assert.equal(url.searchParams.get('benchmark'), '1');
    assert.equal(url.searchParams.get('profile'), row.context.profile);
    assert.deepEqual(row.theme, { dark: row.context.profile === 'dark', background: rgb[row.context.profile] });
    assert.equal(row.observation.role, 'separator');
    assert.equal(row.observation.name, '');
    assert.equal(row.observation.orientation, 'horizontal');
    assert.deepEqual(row.observation.childIds, []);
    assert.equal(row.observation.description, null);
    assert.deepEqual(row.observation.dom, { describedBy: null, descriptions: [] });
    assert.equal(row.observation.describedByProperty, null);
    assert.deepEqual(row.runtime.errors, []);
    for (const asset of row.runtime.assets) {
      const expectedAsset = manifest.provenance.browserFiles.find(file => file.path === asset.file || file.file === asset.file);
      assert.ok(expectedAsset, asset.file);
      assert.equal(asset.sha256, expectedAsset.sha256);
    }
  }
  // Separate historical relative-tree observation: this receipt does not supply
  // the missing capture caller, actual-theme proof, or current-runtime validity.
  const relativeBytes = readFileSync('artifacts/material-parity/divider-actual-ax-20261006.log');
  assert.equal(hash(relativeBytes), 'b5e5b2778f8dc7fc2ade31463312af46e2043a8d45d73bded90923b6e922fc7c');
  const relatives = JSON.parse(relativeBytes);
  assert.equal(relatives.browser, '154.0.8037.58');
  assert.equal(relatives.checkpoint, 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
  assert.deepEqual(relatives.rows.map(row => row.mode), ['reference', 'astylar']);
  for (const row of relatives.rows) {
    const nodes = row.nodes, index = new Map(nodes.map(node => [node.nodeId, node]));
    assert.equal(index.size, nodes.length);
    assert.equal(nodes[0].role.value, 'separator');
    for (const node of nodes.filter(node => node.parentId)) {
      const parent = index.get(node.parentId);
      assert.ok(parent);
      assert.ok(parent.childIds.includes(node.nodeId));
    }
    assert.deepEqual(nodes.slice(0, 3).map(node => [node.role.value, node.name?.value, node.ignored]),
      [['separator', '', false], ['region', 'divider showcase', false], ['main', '', false]]);
    assert.equal(nodes.filter(node => !node.ignored && node.role.value === 'main').length,
      row.mode === 'reference' ? 1 : 2);
    const url = new URL(nodes.at(-1).properties.find(property => property.name === 'url').value.value);
    assert.equal(url.pathname, `/${row.mode}/divider`);
    assert.equal(url.searchParams.get('profile'), 'light');
    assert.equal(url.searchParams.get('benchmark'), '1');
  }
  // Current source ownership, separate from historical runtime applicability.
  const application = ts.createSourceFile('astylar.component.ts',
    readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const component = application.statements.find(node => ts.isClassDeclaration(node) &&
    node.name?.text === 'AstylarShowcaseComponent');
  const property = (object, name) => object.properties.find(node => ts.isPropertyAssignment(node) &&
    node.name.getText(application).replace(/['"]/g, '') === name)?.initializer;
  const metadata = ts.getDecorators(component).find(node => node.expression.expression?.getText(application) === 'Component')
    .expression.arguments[0];
  assert.match(property(metadata, 'template').text,
    /<main\s[^>]*class="frame"[^>]*>\s*<astylar-surface\b[^>]*\/>\s*<\/main>/);
  const build = component.members.find(node => node.name?.getText(application) === 'buildSiteData');
  const returns = build.body.statements.filter(ts.isReturnStatement);
  assert.equal(returns.length, 1, 'unconditional document root return');
  const children = property(property(returns[0].expression, 'root'), 'children');
  assert.ok(ts.isArrayLiteralExpression(children));
  assert.equal(children.elements.length, 1);
  assert.equal(property(children.elements[0], 'type').text, 'main');
  assert.equal(property(children.elements[0], 'id').text, 'page');
  const bridge = ts.createSourceFile('bridge.ts', readFileSync('src/lib/astylar-semantic-bridge.ts', 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const bridgeClass = bridge.statements.find(node => ts.isClassDeclaration(node) && node.name?.text === 'AstylarSemanticBridge');
  const tagMethod = bridgeClass.members.find(node => node.name?.getText(bridge) === 'semanticTagName');
  const compiled = ts.transpileModule(`class TagOwner { ${tagMethod.getText(bridge)} }`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const owner = new Function(`${compiled}; return new TagOwner();`)();
  for (const tag of ['main', 'section', 'div']) assert.equal(owner.semanticTagName(tag), tag);
  // Current ancestor observations extend,not replace,the historical target and
  // light-only relative-tree evidence above. Duplicate main is authored here.
  const current = [];
  for (const [file, digest, contexts] of [
    ['divider-ancestor-ax-current-20261011.log', 'c5e5138afd3061697cccde34a2467739786d93705638ba0f5e5725c40e4b3c5a', 16],
    ['divider-ancestor-ax-comparison-current-20261011.log', '9ebbd9981229138817a4603ff16ecd2bd805b5a7440f1aff483a673f20d433b7', 4],
  ]) {
    const raw = readFileSync(`artifacts/material-parity/${file}`); assert.equal(hash(raw), digest);
    const rows = raw.toString().trim().split(/\r?\n/).map(JSON.parse), end = rows.pop();
    assert.equal(end.terminal, 'verified'); assert.equal(end.contexts, contexts);
    assert.equal(end.axRelativesRecorded, true); assert.equal(rows.length, contexts * 2);
    for (const receipt of [...end.capture.sources, ...end.sourceReceipts, end.capture.checkpointManifest]) {
      // Preserve the original pre-cursor probe bytes, not a changed receipt.
      const bytes = receipt.file === 'scripts/audit-material-field-description.mjs'
        ? execFileSync('git', ['show', `61f3ea32:${receipt.file}`]) : readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
    }
    assert.equal(end.capture.checkpointManifest.file,
      'artifacts/material-parity/selection-pointer-directions-20261011/checkpoint/manifest.json');
    const checkpoint = JSON.parse(readFileSync(end.capture.checkpointManifest.file));
    assert.equal(end.browser, checkpoint.provenance.browser);
    assert.deepEqual(fingerprintDirectory('examples/material-showcase/dist/material-showcase/browser'), checkpoint.provenance.browserFiles);
    for (const row of rows) {
      assert.deepEqual(row.runtime.errors, []);
      assert.deepEqual(row.theme, { dark: row.context.profile === 'dark', background: rgb[row.context.profile] });
      for (const asset of row.runtime.assets) assert.equal(asset.sha256,
        checkpoint.provenance.browserFiles.find(file => (file.path ?? file.file) === asset.file)?.sha256);
      const nodes = row.axRelatives, index = new Map(nodes.map(node => [node.nodeId, node]));
      assert.equal(index.size, nodes.length);
      assert.deepEqual(nodes.slice(0, 3).map(node => [node.role.value, node.name?.value, node.ignored]),
        [['separator', '', false], ['region', 'divider showcase', false], ['main', '', false]]);
      for (const node of nodes.filter(node => node.parentId)) {
        const parent = index.get(node.parentId); assert.ok(parent);
        assert.ok(parent.childIds.includes(node.nodeId));
      }
      assert.equal(nodes.filter(node => !node.ignored && node.role.value === 'main').length,
        row.side === 'reference' ? 1 : 2);
      assert.equal(nodes.at(-1).role.value, 'RootWebArea');
      const url = new URL(nodes.at(-1).properties.find(property => property.name === 'url').value.value);
      assert.equal(url.pathname, `/${row.side}/divider`);
      assert.equal(url.searchParams.get('profile'), row.context.profile);
      assert.equal(url.searchParams.get('benchmark'), '1');
    }
    current.push(...rows);
  }
  assert.equal(new Set(current.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`)).size, 40);
  for (const entry of configured) for (const side of ['reference', 'astylar'])
    assert.ok(current.some(row => row.side === side && row.context.profile === entry.profile &&
      row.context.viewport.width === entry.viewport.width && row.context.viewport.height === entry.viewport.height &&
      row.context.deviceScaleFactor === entry.viewport.deviceScaleFactor));
  const cursorRows = [];
  for (const [file, digest, contexts] of [
    ['divider-effective-cursor-20261011.log', '87e9166432c3083ac2984867be8d5c8383e1686909bf4c2397194fe7a1849ffb', 16],
    ['divider-effective-cursor-comparison-20261011.log', '023512d6248ef3b974e5c10f4e2e72d6e2955e3f9812f457d62e1f0546cf2781', 4],
  ]) {
    const bytes = readFileSync(`artifacts/material-parity/${file}`); assert.equal(hash(bytes), digest);
    const rows = bytes.toString().trim().split(/\r?\n/).map(JSON.parse), end = rows.pop();
    assert.equal(end.terminal, 'verified'); assert.equal(end.contexts, contexts);
    assert.equal(end.cursorPointsRecorded, true); assert.equal(rows.length, contexts * 2);
    for (const receipt of [...end.capture.sources, ...end.sourceReceipts, end.capture.checkpointManifest,
      end.cursorMetricReceipt]) {
      const source = receipt.file === 'scripts/audit-material-field-description.mjs'
        ? execFileSync('git', ['show', `77788b53:${receipt.file}`]) : readFileSync(receipt.file);
      assert.equal(hash(source), receipt.sha256);
    }
    const checkpoint = JSON.parse(readFileSync(end.capture.checkpointManifest.file));
    assert.equal(end.browser, checkpoint.provenance.browser);
    assert.deepEqual(fingerprintDirectory('examples/material-showcase/dist/material-showcase/browser'), checkpoint.provenance.browserFiles);
    for (const row of rows) {
      assert.deepEqual(row.runtime.errors, []);
      assert.deepEqual(row.theme, { dark: row.context.profile === 'dark', background: rgb[row.context.profile] });
      for (const asset of row.runtime.assets) assert.equal(asset.sha256,
        checkpoint.provenance.browserFiles.find(file => (file.path ?? file.file) === asset.file)?.sha256);
      assert.deepEqual(row.cursorPoints.map(point => point.id),
        ['divider-root', 'divider-above', 'divider-primary', 'divider-below']);
      for (const point of row.cursorPoints) {
        const text = ['divider-above', 'divider-below'].includes(point.id);
        assert.ok(Number.isFinite(point.point.x) && Number.isFinite(point.point.y));
        assert.equal(point.effectiveCursor, text ? 'text' : 'default');
        assert.equal(point.authoredCursor, row.side === 'reference' ? 'auto' : text ? 'text' : 'default');
        assert.equal(point.hasSelectableTextAtPoint, row.side === 'reference' && text);
        if (row.side === 'astylar') assert.equal(point.hitType, 'canvas');
        else assert.equal(point.hitId, point.id);
      }
    }
    cursorRows.push(...rows);
  }
  assert.deepEqual(cursorRows.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`).sort(),
    current.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`).sort());
  // Same-point effective CSS cursors only, not OS pixels, held/click behavior,
  // source-equivalent paint or retroactive measurement of original inspect rows.
  // Divider companion AX closure: opt-in capture fills the partial-tree siblings.
  const probeFile = 'scripts/audit-material-field-description.mjs';
  const probe = readFileSync(probeFile, 'utf8');
  assert.equal(hash(Buffer.from(probe)), 'b522882efa8d580d9501a16dd9f7c026f40e8f65f639f9d53724068a7595e876');
  const priorProbe = execFileSync('git', ['show', `77788b53:${probeFile}`], { encoding: 'utf8' });
  assert.equal(hash(Buffer.from(priorProbe)), 'd5bc55a8aaeb29edcd422531f859361a450b1a926e24ed276e3cdaa98eb2e549');
  let restoredProbe = probe;
  const optIn = "const dividerCompanions = process.argv.includes('--divider-companions');\nassert.ok(!dividerCompanions || divider, 'Companion subtrees are a separate opt-in divider observation.');\n";
  assert.equal(restoredProbe.split(optIn).length, 2); restoredProbe = restoredProbe.replace(optIn, '');
  restoredProbe = restoredProbe.replace("'--divider-companions', ", '');
  const start = restoredProbe.indexOf('      // Opt-in only: the partial separator tree omits both paragraph siblings.');
  const end = restoredProbe.indexOf('      const ax = nodes.find', start);
  assert.ok(start > 0 && end > start); restoredProbe = restoredProbe.slice(0, start) + restoredProbe.slice(end);
  restoredProbe = restoredProbe.replace('        ...(dividerCompanions ? { companionAX } : {}),\n', '')
    .replace('    ...(dividerCompanions ? { companionSubtreesRecorded: true } : {}),\n', '');
  assert.equal(restoredProbe, priorProbe, 'Every default capture statement conserved; companion query is opt-in only');
  const companionRows = [];
  const validateCompanion = (value, side, label) => {
    assert.equal(value.owner.type, 'p'); assert.equal(value.owner.text, label);
    if (side === 'reference') assert.equal(value.owner.id, '');
    else assert.ok(value.owner.id.endsWith(`-${value.id}-row`));
    assert.equal(value.nodes.length, 4);
    assert.equal(value.nodes[0].backendDOMNodeId, value.backendDOMNodeId);
    assert.deepEqual(value.nodes.map(node => [node.role.value, node.name?.value, node.ignored]),
      [['paragraph', '', false], ['generic', '', false], ['StaticText', label, false], ['InlineTextBox', label, false]]);
    for (let i = 0; i < value.nodes.length; i++) {
      const node = value.nodes[i], child = value.nodes[i + 1];
      assert.deepEqual(node.childIds, child ? [child.nodeId] : []);
      if (child) assert.equal(child.parentId, node.nodeId);
    }
  };
  for (const [name, digest, contexts] of [
    ['divider-companion-ax-standard-20261014.log', 'f01e63a7285143b7f0f1f73de3979cca321575b5f32840f7e861d2fae8701901', 16],
    ['divider-companion-ax-comparison-20261014.log', 'ffa9a7fc91f2ed11c57c63f249759b47d61dfbf7acf06d42951bc3e61f921505', 4],
  ]) {
    const bytes = readFileSync(`artifacts/material-parity/${name}`); assert.equal(hash(bytes), digest);
    const rows = bytes.toString().trim().split(/\r?\n/).map(JSON.parse), terminal = rows.pop();
    assert.equal(terminal.terminal, 'verified'); assert.equal(terminal.contexts, contexts);
    assert.equal(terminal.companionSubtreesRecorded, true); assert.equal(rows.length, contexts * 2);
    for (const receipt of [...terminal.capture.sources, ...terminal.sourceReceipts, terminal.capture.checkpointManifest])
      assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    const checkpoint = JSON.parse(readFileSync(terminal.capture.checkpointManifest.file));
    assert.equal(checkpoint.provenance.kind, 'divider-companion-ax-diagnostic');
    assert.equal(terminal.browser, checkpoint.provenance.browser);
    assert.deepEqual(fingerprintDirectory('examples/material-showcase/dist/material-showcase/browser'), checkpoint.provenance.browserFiles);
    for (const receipt of checkpoint.provenance.harness) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    for (const row of rows) {
      assert.deepEqual(row.runtime.errors, []);
      assert.deepEqual(row.theme, { dark: row.context.profile === 'dark', background: rgb[row.context.profile] });
      for (const asset of row.runtime.assets) assert.equal(asset.sha256,
        checkpoint.provenance.browserFiles.find(file => file.file === asset.file)?.sha256);
      assert.deepEqual(row.companionAX.map(value => value.id), ['divider-above', 'divider-below']);
      validateCompanion(row.companionAX[0], row.side, 'Above'); validateCompanion(row.companionAX[1], row.side, 'Below');
    }
    companionRows.push(...rows);
  }
  assert.deepEqual(companionRows.map(row => `${row.context.profile}:${row.context.viewportId}:${row.side}`).sort(),
    current.map(row => `${row.context.profile}:${row.context.viewportId}:${row.side}`).sort());
  const forged = structuredClone(companionRows[0].companionAX[0]); forged.nodes[2].name.value = 'Wrong';
  assert.throws(() => validateCompanion(forged, companionRows[0].side, 'Above'));
  const detached = structuredClone(companionRows[0].companionAX[0]); detached.nodes[1].parentId = 'missing';
  assert.throws(() => validateCompanion(detached, companionRows[0].side, 'Above'));
  // End divider companion AX closure; no live AT or whole-case acceptance inferred.
});

test('divider host clipping observations preserve bounded DOM ancestry', () => {
  const raw = readFileSync('artifacts/material-parity/divider-host-context-20261009.log');
  assert.equal(hash(raw), 'd48d4be9e49da9b044beac91d02d50c7cf98edcfee6f16a87cf0a4d1586d6af2');
  const rows = raw.toString().trim().split(/\r?\n/).map(JSON.parse), terminal = rows.pop();
  assert.equal(terminal.terminal, 'verified');
  assert.equal(terminal.contexts, 16);
  assert.equal(rows.length, 32);
  assert.equal(new Set(rows.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`)).size, 32);
  for (const receipt of [...terminal.capture.sources, ...terminal.sourceReceipts, terminal.capture.checkpointManifest]) {
    const source = receipt.file === 'scripts/audit-material-field-description.mjs'
      ? execFileSync('git', ['show', `ed6a0083:${receipt.file}`]) : readFileSync(receipt.file);
    assert.equal(hash(source), receipt.sha256);
  }
  const manifest = JSON.parse(readFileSync(terminal.capture.checkpointManifest.file));
  assert.equal(terminal.browser, manifest.provenance.browser);
  const receipted = [];
  for (const [file, digest, contexts] of [
    ['divider-host-context-receipted-20261009.log', '5becf18d24ace0bcffcf61dd0a8cc01c504c91a7bdf6e45dccc4c8fbec8bd53a', 16],
    ['divider-host-comparison-receipted-20261009.log', 'b2b8329a2c4ee27d55959c3a01498b5d338aa2980aaa80648901049372b9d9cf', 4],
  ]) {
    const raw = readFileSync(`artifacts/material-parity/${file}`);
    assert.equal(hash(raw), digest);
    const observations = raw.toString().trim().split(/\r?\n/).map(JSON.parse), end = observations.pop();
    assert.equal(end.terminal, 'verified');
    assert.equal(end.contexts, contexts);
    assert.equal(observations.length, contexts * 2);
    assert.ok(end.capture.sources.some(r => r.file === 'tests/material-parity/reference-root-ancestor-context.mjs'));
    for (const receipt of [...end.capture.sources, ...end.sourceReceipts, end.capture.checkpointManifest]) {
      // Authenticate the capture-time probe, not today's extended diagnostic.
      const source = receipt.file === 'scripts/audit-material-field-description.mjs'
        ? execFileSync('git', ['show', `3cbae5d1:${receipt.file}`]) : readFileSync(receipt.file);
      assert.equal(hash(source), receipt.sha256);
    }
    assert.deepEqual(end.capture.checkpointManifest, terminal.capture.checkpointManifest);
    assert.equal(end.browser, terminal.browser);
    receipted.push(...observations);
  }
  assert.equal(new Set(receipted.map(r => `${r.context.profile}:${r.context.viewportId}:${r.side}`)).size, 40);
  const fullBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(fullBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const full = JSON.parse(fullBytes), capturedCases = [...full.results, ...full.interactions].filter(r => r.family === 'divider');
  assert.equal(capturedCases.length, 24);
  for (const entry of capturedCases) {
    const host = receipted.find(r => r.side === 'astylar' && r.context.profile === entry.profile &&
      r.context.viewport.width === entry.viewport.width && r.context.viewport.height === entry.viewport.height &&
      r.context.deviceScaleFactor === entry.viewport.deviceScaleFactor);
    assert.ok(host);
    const canvas = host.hostContext.nodes[0].viewportRect;
    assert.equal(canvas.x, 0); assert.equal(canvas.y, 0);
    const element = entry.geometry.elements.find(r => r.id === 'divider-primary');
    assert.equal(element.missing, false);
    const box = element.actual;
    assert.ok(box.left >= 65 && box.top > 224);
    assert.ok(canvas.width - box.right >= 65 && canvas.height - box.bottom > 575);
  }
  for (const configured of [...materialStaticCases, ...materialInteractionCases].filter(r => r.family === 'divider'))
    for (const side of ['reference', 'astylar']) assert.ok(receipted.some(r => r.side === side &&
      r.context.profile === configured.profile && r.context.viewport.width === configured.viewport.width &&
      r.context.viewport.height === configured.viewport.height && r.context.deviceScaleFactor === configured.viewport.deviceScaleFactor));
  rows.push(...receipted);
  for (const row of rows) {
    assert.deepEqual(row.runtime.errors, []);
    for (const asset of row.runtime.assets)
      assert.equal(asset.sha256, manifest.provenance.browserFiles.find(f => (f.path ?? f.file) === asset.file)?.sha256);
    const chain = row.hostContext.nodes;
    assert.equal(chain.at(-1).type, 'html');
    assert.equal(chain[0].type, row.side === 'reference' ? 'main' : 'canvas');
    for (const node of chain) {
      const overflow = row.side === 'astylar' && node.type === 'canvas' ? 'clip' : 'visible';
      assert.equal(node.computed['overflow-x'], overflow);
      assert.equal(node.computed['overflow-y'], overflow);
      assert.equal(node.computed['clip-path'], 'none');
      assert.equal(node.computed.contain, 'none');
    }
  }
  // Captured DOM observations,not internal scene clipping or reference collector
  // capture-time dependency authentication (not included in this original receipt).
});

test('divider retained update disposal observations join all configured physical contexts', () => {
  const read = (file, sha) => { const raw = readFileSync(`artifacts/material-parity/${file}`);
    assert.equal(hash(raw), sha); return raw.toString(); };
  const desktop = JSON.parse(read('divider-update-disposal-20261006.log',
    '5260c2abddc5b4d3d0a3ee87bcaca765b8e969841e31df5e9ee1851367c26b51'));
  const remaining = read('divider-remaining-update-disposal-20261007.log',
    '518513e37a67de7f5651672a7deaf764afcc415da3cf4898c2537a0137885c0a').trim().split(/\r?\n/).map(JSON.parse);
  const head = remaining.shift(), tail = remaining.pop();
  assert.equal(head.configuredCases, 24);
  assert.equal(head.physicalCohorts, 20);
  assert.equal(tail.completedCohorts, 12);
  assert.equal(hash(readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json')), head.checkpointSha256);
  const configurations = [...materialStaticCases, ...materialInteractionCases].filter(r => r.family === 'divider');
  const key = (profile, width, height, dpr) => `${profile}:${width}:${height}:${dpr}`;
  const observed = [ ...desktop.rows.map(r => key(r.profile, 1440, 1000, r.dpr)),
    ...remaining.map(r => key(r.profile, r.viewport.width, r.viewport.height, r.viewport.deviceScaleFactor)) ];
  const expected = [...new Set(configurations.map(r => key(r.profile, r.viewport.width, r.viewport.height, r.viewport.deviceScaleFactor)))];
  assert.equal(observed.length, 20);
  assert.deepEqual(observed.sort(), expected.sort());
  for (const row of desktop.rows) {
    const samples = [row.before, ...row.updates];
    assert.deepEqual(samples.map(sample => sample.session.revision), [2, 3, 4, 5]);
    const keys = row.before.cache.entries.map(entry => entry.key).sort();
    assert.equal(keys.length, 4);
    for (const sample of samples) {
      assert.deepEqual(sample.cache.entries.map(entry => entry.key).sort(), keys);
      assert.ok(sample.cache.entries.every(entry => entry.referenceCount === 1));
    }
  }
  for (const row of remaining) {
    assert.deepEqual(row.errors, []);
    assert.equal(row.snapshots.length, 4);
    for (const sample of row.snapshots) {
      assert.deepEqual(sample.live, { meshes: 17, materials: 16, textures: 4 });
      assert.deepEqual(sample.tracked, sample.live);
      assert.equal(sample.cache, 4); assert.equal(sample.loaded, 4);
      assert.deepEqual(sample.unbound, []); assert.equal(sample.status, 'idle');
      assert.equal(sample.plugins.pending, 0);
    }
    assert.deepEqual(row.disposal, { surface: true, scene: true, engine: true,
      live: { meshes: 0, materials: 0, textures: 0 }, cache: 0, loaded: 0,
      plugins: { owners: 0, resources: 0, cleanups: 0, pending: 0 } });
  }
  // Original desktop sample assertions remain owned by the separate retained
  // divider runtime test. This join does not upgrade theme/caller provenance,
  // late completion, remount, peer isolation or current lifetime acceptance.
});

test('ordinary text parser preserves omitted wrapping defaults without assuming word-break support', () => {
  const source = readFileSync('src/app/services/text/text-style-parser.service.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true,
  } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(name => {
    assert.equal(name, '@angular/core');
    return { Injectable: () => target => target };
  }, exports);
  const parser = new exports.TextStyleParserService();
  const omitted = parser.parseTextProperties({ selector: '#ordinary-span', fontSize: '16px', lineHeight: '20px' });
  assert.equal(omitted.whiteSpace, 'normal');
  assert.equal(omitted.wordWrap, 'normal');
  assert.equal(omitted.textOverflow, 'clip');
  const explicit = parser.parseTextProperties({ selector: '#ordinary-span', fontSize: '16px', lineHeight: '20px',
    whiteSpace: 'normal', wordWrap: 'normal', textOverflow: 'clip' });
  assert.deepEqual(omitted, explicit);
  const changed = parser.parseTextProperties({ selector: '#ordinary-span', fontSize: '16px', lineHeight: '20px',
    whiteSpace: 'pre', wordWrap: 'break-word', textOverflow: 'ellipsis' });
  assert.equal(changed.whiteSpace, 'pre');
  assert.equal(changed.wordWrap, 'break-word');
  assert.equal(changed.textOverflow, 'ellipsis');
  assert.equal(Object.hasOwn(omitted, 'wordBreak'), false);
  // Current parser execution only,not installed-runtime or inherited-style proof.
});

test('public divider typography reduction observes equal paragraph span inputs and opaque backing control', async t => {
  const consumer = path.resolve('examples/material-showcase');
  // Bind the paint/baseline owner, not the entire installed rendering pipeline.
  const canvasPath = path.join(consumer, 'node_modules/astylarui/dist/lib/app/services/text/text-canvas-renderer.service.js');
  const installedCanvas = readFileSync(canvasPath, 'utf8');
  const canvasSource = readFileSync('src/app/services/text/text-canvas-renderer.service.ts', 'utf8');
  const compiledCanvas = ts.transpileModule(canvasSource,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const ownerBindings = [];
  for (const [start, end, minimum] of [
    ['createStyledCanvas', 'calculateLayoutMetrics', 1000],
    ['calculateCssLineBoxAlphabeticBaseline', 'applyTextTransform', 300]
  ]) {
    const extract = source => {
      const from = source.indexOf(`    ${start}(`), to = source.indexOf(`    ${end}(`);
      assert.ok(from >= 0 && to > from, `missing complete ${start} method boundary`);
      return source.slice(from, to).replace(/\s+/g, ' ').trim();
    };
    const method = extract(installedCanvas);
    assert.ok(method.length > minimum);
    assert.equal(method, extract(compiledCanvas), `${start} installed/current source drift`);
    ownerBindings.push({ method: start, normalizedSha256: hash(method) });
  }
  const downstreamSources = [];
  for (const [relative, start, end] of [
    ['text/multi-line-text-renderer.service', 'calculateLinePositions', 'handleWhiteSpace'],
    ['text/text-rendering.service', 'renderTextToTexture', 'updateTextTexture'],
    ['dom/renderer.service', 'createTextMesh', 'resolveAnonymousFlexTextAlignment'],
    ['babylon-mesh.service', 'createTextMesh', 'createMaterial']
  ]) {
    const sourcePath = `src/app/services/${relative}.ts`;
    const installedPath = path.join(consumer, `node_modules/astylarui/dist/lib/app/services/${relative}.js`);
    const source = readFileSync(sourcePath, 'utf8'), installed = readFileSync(installedPath, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
    const extract = text => {
      const from = text.indexOf(`    ${start}(`), to = text.indexOf(`    ${end}(`);
      assert.ok(from >= 0 && to > from, `missing ${relative} complete method boundaries`);
      return text.slice(from, to).replace(/\s+/g, ' ').trim();
    };
    const methods = extract(installed);
    assert.ok(methods.length > 300);
    assert.equal(methods, extract(compiled), `${relative} downstream installed/current drift`);
    ownerBindings.push({ owner: relative, from: start, until: end, normalizedSha256: hash(methods) });
    downstreamSources.push({ sourcePath, installedPath, source, installed });
  }
  const font = readFileSync(path.join(consumer, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'));
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    stdin: { resolveDir: consumer, sourcefile: 'divider-text-reduction.mjs', contents: `
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      import {Vector3,Matrix} from '@babylonjs/core/Maths/math.vector';
      const mode=new URLSearchParams(location.search).get('mode');
      const disableMsaa=new URLSearchParams(location.search).has('disable-msaa');
      // Diagnostic context intervention only; never change the public fixture
      // or treat this intercepted context as the ordinary renderer result.
      const originalGetContext=HTMLCanvasElement.prototype.getContext;
      if(disableMsaa)HTMLCanvasElement.prototype.getContext=function(kind,options,...rest){
        return originalGetContext.call(this,kind,/webgl/.test(kind)?{...options,antialias:false}:options,...rest);
      };
      const font=new FontFace('AuditRoboto','url(/font.woff2)',{weight:'400'});
      await font.load();document.fonts.add(font);
      const paintCalls=[];
      const originalFillText=CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
        paintCalls.push({text,x,y,font:this.font,canvasWidth:this.canvas.width,canvasHeight:this.canvas.height,
          cssWidth:this.canvas.style.width,cssHeight:this.canvas.style.height,transform:Array.from([this.getTransform().a,this.getTransform().d,this.getTransform().e,this.getTransform().f])});
        return originalFillText.call(this,text,x,y,...rest);
      };
      const origins=[20,20.25,20.5,20.75];
      const site={root:{children:[{type:'div',id:'proof-root',children:origins.map((left,i)=>({type:'p',id:'row-'+i,children:[{type:'span',id:'text-'+i,textContent:i%2?'Below':'Above'}]}))}]},
        styles:[{selector:'#proof-root',width:'200px',height:'180px',padding:'0',margin:'0',borderWidth:'0',background:'#f0f0f0'},
        {selector:'*',fontFamily:'AuditRoboto',fontSize:'14.4px',fontWeight:'400',fontStyle:'normal',lineHeight:'normal',letterSpacing:'normal',color:'#1d1b20'},
        ...origins.map((left,i)=>({selector:'#row-'+i,position:'absolute',left:left+'px',top:(20+i*32+left-20)+'px',width:'120px',height:'24px',padding:'0',margin:'0',borderWidth:'0'}))]};
      document.body.style.cssText='margin:0;background:#f0f0f0';
      const host=document.createElement(mode==='reference'?'div':'canvas');host.style.cssText='position:relative;display:block;width:200px;height:180px;background:#f0f0f0';document.body.append(host);
      let app,surface;
      if(mode==='reference'){
        host.id='proof-root';
        const css=document.createElement('style');css.textContent=site.styles.map(({selector,...v})=>selector+'{'+Object.entries(v).map(([k,x])=>k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+x).join(';')+'}').join('');document.head.append(css);
        for(const row of site.root.children[0].children){const p=document.createElement('p');p.id=row.id;const span=document.createElement('span');span.id=row.children[0].id;span.textContent=row.children[0].textContent;p.append(span);host.append(p);}
      }else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});}
      await surface?.whenSettled();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      CanvasRenderingContext2D.prototype.fillText=originalFillText;
      const runtimeText=surface?await Promise.all(surface.scene.meshes.filter(m=>m.metadata?.isTextMesh).map(async mesh=>{
        const scene=surface.scene,engine=scene.getEngine(),texture=mesh.material?.diffuseTexture;
        mesh.computeWorldMatrix(true);
        const viewport=scene.activeCamera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
        const corners=mesh.getBoundingInfo().boundingBox.vectorsWorld.map(v=>Vector3.Project(v,Matrix.Identity(),scene.getTransformMatrix(),viewport));
        const positions=mesh.getVerticesData('position'),uvs=mesh.getVerticesData('uv');
        const projectedVertices=[];
        for(let i=0;i<positions.length;i+=3){
          const point=Vector3.Project(new Vector3(positions[i],positions[i+1],positions[i+2]),
            mesh.getWorldMatrix(),scene.getTransformMatrix(),viewport);
          projectedVertices.push({x:point.x/devicePixelRatio,y:point.y/devicePixelRatio,
            u:uvs[i/3*2],v:uvs[i/3*2+1]});
        }
        return {id:mesh.metadata.elementId,logicalSize:texture?.metadata?.astylarLogicalTextSize,
          backingSize:texture?.getSize(),samplingMode:texture?.samplingMode,
          samplingInputs:{projectedVertices,indices:Array.from(mesh.getIndices()),
            textureMatrix:Array.from(texture.getTextureMatrix().m),invertY:texture.invertY,
            wrapU:texture.wrapU,wrapV:texture.wrapV},
          transfer:{textureGammaSpace:texture.gammaSpace,textureHasAlpha:texture.hasAlpha,textureLevel:texture.level,
            materialAlpha:mesh.material.alpha,alphaMode:mesh.material.alphaMode,transparencyMode:mesh.material.transparencyMode,
            useAlphaFromDiffuseTexture:mesh.material.useAlphaFromDiffuseTexture,
            useEmissiveAsIllumination:mesh.material.useEmissiveAsIllumination,disableLighting:mesh.material.disableLighting,
            emissiveIsDiffuse:mesh.material.emissiveTexture===texture,
            imageProcessing:{enabled:scene.imageProcessingConfiguration.isEnabled,exposure:scene.imageProcessingConfiguration.exposure,
              contrast:scene.imageProcessingConfiguration.contrast,toneMappingEnabled:scene.imageProcessingConfiguration.toneMappingEnabled},
            framebuffer:engine._gl?.getContextAttributes(),
            samples:engine._gl?.getParameter(engine._gl.SAMPLES)},
          pixels:Array.from(texture.getContext().getImageData(0,0,texture.getSize().width,texture.getSize().height).data),
          gpuPixels:Array.from(await texture.readPixels()),
          bounds:{left:Math.min(...corners.map(v=>v.x))/devicePixelRatio,top:Math.min(...corners.map(v=>v.y))/devicePixelRatio,
            right:Math.max(...corners.map(v=>v.x))/devicePixelRatio,bottom:Math.max(...corners.map(v=>v.y))/devicePixelRatio}};
      })):[];
      const control=document.createElement('canvas');control.width=200*devicePixelRatio;control.height=180*devicePixelRatio;
      const ctx=control.getContext('2d',{alpha:false});ctx.fillStyle='#f0f0f0';ctx.fillRect(0,0,control.width,control.height);ctx.scale(devicePixelRatio,devicePixelRatio);ctx.font='normal 400 14.4px AuditRoboto';ctx.fillStyle='#1d1b20';
      const baselines=origins.map((left,i)=>{const p=document.createElement('p');p.style.cssText='position:absolute;visibility:hidden;font:normal 400 14.4px AuditRoboto;line-height:normal;letter-spacing:normal;padding:0;margin:0;border:0';p.style.left=left+'px';p.style.top=(20+i*32+left-20)+'px';p.textContent=i%2?'Below':'Above';const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';p.append(marker);document.body.append(p);const y=marker.getBoundingClientRect().top;p.remove();ctx.fillText(i%2?'Below':'Above',left,y);return y;});
      window.dividerTextReduction={site,baselines,paintCalls,runtimeText,control:Array.from(ctx.getImageData(0,0,control.width,control.height).data),errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[],
        async encodeUvFloors(kind='floor'){
          // Separate post-capture shader diagnostic. Preserve original vertex
          // code, geometry and UV interpolation; bypass final color transfer.
          for(const mesh of surface.scene.meshes)if(!mesh.metadata?.isTextMesh)mesh.isVisible=false;
          if(kind==='sampler'){
            const gl=surface.scene.getEngine()._gl,previous=gl.getParameter(gl.TEXTURE_BINDING_2D);
            const flip=gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
            for(const texture of new Set(surface.scene.meshes.filter(m=>m.metadata?.isTextMesh)
              .map(m=>m.material.diffuseTexture))){
              const {width,height}=texture.getSize(),bytes=new Uint8Array(width*height*4);
              for(let y=0;y<height;y++)for(let x=0;x<width;x++)bytes.set([x+1,y+1,127,255],(y*width+x)*4);
              gl.bindTexture(gl.TEXTURE_2D,texture.getInternalTexture()._hardwareTexture.underlyingResource);
              gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,width,height,gl.RGBA,gl.UNSIGNED_BYTE,bytes);
              const readback=await texture.readPixels();
              if(readback.length!==bytes.length||bytes.some((value,i)=>value!==readback[i]))
                throw new Error('encoded texture addresses disagree with GPU readback');
            }
            gl.bindTexture(gl.TEXTURE_2D,previous);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,flip);
            if(gl.getError()!==gl.NO_ERROR)throw new Error('encoded address texture upload failed');
          }
          const effects=[...new Set(surface.scene.meshes.filter(m=>m.metadata?.isTextMesh)
            .flatMap(m=>m.subMeshes.map(s=>s.effect)))];
          const receipts=[];
          for(const effect of effects){
            const gl=surface.scene.getEngine()._gl;
            const attached=gl.getAttachedShaders(effect._pipelineContext.program);
            const vertex=gl.getShaderSource(attached.find(s=>gl.getShaderParameter(s,gl.SHADER_TYPE)===gl.VERTEX_SHADER));
            const fragment=gl.getShaderSource(attached.find(s=>gl.getShaderParameter(s,gl.SHADER_TYPE)===gl.FRAGMENT_SHADER));
            const assignment=/(gl_FragColor|glFragColor)\\s*=\\s*color\\s*;/g;
            const matches=[...fragment.matchAll(assignment)];
            if(matches.length!==1)throw new Error('expected one final color assignment,got '+matches.length);
            const sample=fragment.match(/baseColor\\s*=\\s*(texture(?:2D)?\\(diffuseSampler,\\s*vDiffuseUV\\s*\\+\\s*uvOffset\\));/);
            if(!sample)throw new Error('missing original diffuse sample expression');
            const diagnostic=fragment.replace(assignment,(_,output)=>output+'='+
              (kind==='sampler'?sample[1]:'vec4((floor(vDiffuseUV*vec2(textureSize(diffuseSampler,0)))+vec2(1.0))/255.0,127.0/255.0,1.0)')+';');
            await new Promise((resolve,reject)=>effect._rebuildProgram(vertex,diagnostic,resolve,reject));
            receipts.push({vertex,fragment,diagnostic});
          }
          surface.scene.render();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          return receipts;
        },dispose(){surface?.dispose();app?.destroy();return surface?.disposed??true;}};
    ` }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(f => !f.endsWith('divider-text-reduction.mjs'))
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  assert.ok(inputs.some(i => i.file.includes('node_modules/astylarui/')));
  const server = createServer((req, res) => {
    const script = req.url.startsWith('/audit.js'), isFont = req.url.startsWith('/font.woff2');
    res.setHeader('content-type', script ? 'text/javascript' : isFont ? 'font/woff2' : 'text/html');
    res.end(script ? built.outputFiles[0].contents : isFont ? font : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const results = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const pair = {};
      for (const mode of ['reference', 'astylar', 'astylar-no-msaa']) {
        const page = await browser.newPage({ viewport: { width: 200, height: 180 }, deviceScaleFactor: dpr });
        const errors = []; page.on('pageerror', e => errors.push(String(e)));
        try {
          const query=mode==='astylar-no-msaa'?'mode=astylar&disable-msaa=1':`mode=${mode}`;
          await page.goto(`http://127.0.0.1:${server.address().port}/?${query}`);
          await page.waitForFunction(() => !!window.dividerTextReduction);
          const data = await page.evaluate(() => { const {site,baselines,control,errors,paintCalls,runtimeText}=window.dividerTextReduction;return {site,baselines,control,errors,paintCalls,runtimeText}; });
          // Diagnostic backing intervention only: preserve the same global CSS
          // origins/baselines, then composite transparent ink onto the same gray.
          const transparentControl = await page.evaluate(() => {
            const { baselines } = window.dividerTextReduction;
            const ink = document.createElement('canvas');
            ink.width = 200 * devicePixelRatio; ink.height = 180 * devicePixelRatio;
            const pen = ink.getContext('2d', { alpha: true });
            pen.scale(devicePixelRatio, devicePixelRatio);
            pen.font = 'normal 400 14.4px AuditRoboto'; pen.fillStyle = '#1d1b20';
            baselines.forEach((y, i) => pen.fillText(i % 2 ? 'Below' : 'Above', 20 + i * .25, y));
            const result = document.createElement('canvas');
            result.width = ink.width; result.height = ink.height;
            const ctx = result.getContext('2d', { alpha: false });
            ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, result.width, result.height);
            ctx.drawImage(ink, 0, 0);
            return Array.from(ctx.getImageData(0, 0, result.width, result.height).data);
          });
          const image = PNG.sync.read(await page.screenshot());
          const localControl = await page.evaluate(() => {
            const { baselines } = window.dividerTextReduction;
            const result = document.createElement('canvas');
            result.width = 200 * devicePixelRatio; result.height = 180 * devicePixelRatio;
            const composite = result.getContext('2d', { alpha: false });
            composite.fillStyle = '#f0f0f0'; composite.fillRect(0, 0, result.width, result.height);
            composite.imageSmoothingEnabled = false;
            const rows = baselines.map((baseline, i) => {
              const left = 20 + i * .25, top = 20 + i * 32 + i * .25;
              const ink = document.createElement('canvas');
              ink.width = 120 * devicePixelRatio; ink.height = 24 * devicePixelRatio;
              const pen = ink.getContext('2d', { alpha: true });
              pen.scale(devicePixelRatio, devicePixelRatio);
              pen.font = 'normal 400 14.4px AuditRoboto'; pen.fillStyle = '#1d1b20';
              pen.fillText(i % 2 ? 'Below' : 'Above', 0, baseline - top);
              composite.drawImage(ink, left * devicePixelRatio, top * devicePixelRatio);
              return { left, top, baseline, localBaseline: baseline - top };
            });
            return { rows, pixels: Array.from(composite.getImageData(0, 0, result.width, result.height).data) };
          });
          const mappedControl = await page.evaluate(() => {
            const { baselines } = window.dividerTextReduction;
            const result = document.createElement('canvas');
            result.width = 200 * devicePixelRatio; result.height = 180 * devicePixelRatio;
            const composite = result.getContext('2d', { alpha: false });
            composite.fillStyle = '#f0f0f0'; composite.fillRect(0, 0, result.width, result.height);
            composite.imageSmoothingEnabled = false;
            const rows = baselines.map((baseline, i) => {
              // Measured runtime dimensions from the preceding observation;
              // assert applicability against this run below, never author them.
              const width = i % 2 ? 39.1429 : 40.1062, height = 18;
              const left = 20 + i * .25, top = 20 + i * 32 + i * .25;
              const ink = document.createElement('canvas');
              ink.width = Math.ceil(width * devicePixelRatio); ink.height = height * devicePixelRatio;
              const pen = ink.getContext('2d', { alpha: true });
              pen.scale(devicePixelRatio, devicePixelRatio);
              pen.font = 'normal 400 14.4px AuditRoboto'; pen.fillStyle = '#1d1b20';
              pen.fillText(i % 2 ? 'Below' : 'Above', 0, baseline - top);
              const actual = window.dividerTextReduction.runtimeText.find(row => row.id === 'text-' + i);
              const modeled = pen.getImageData(0, 0, ink.width, ink.height).data;
              let actualTextureDifferences = actual ? 0 : null;
              if (actual) {
                if (actual.pixels.length !== modeled.length) throw new Error('actual/model texture size drift');
                for (let p = 0; p < modeled.length; p += 4)
                  if ([0,1,2,3].some(c => actual.pixels[p+c] !== modeled[p+c])) actualTextureDifferences++;
              }
              composite.drawImage(ink, 0, 0, ink.width, ink.height,
                left * devicePixelRatio, top * devicePixelRatio, width * devicePixelRatio, height * devicePixelRatio);
              return { width, height, backingWidth: ink.width, backingHeight: ink.height, actualTextureDifferences };
            });
            return { rows, pixels: Array.from(composite.getImageData(0, 0, result.width, result.height).data) };
          });
          assert.deepEqual([...image.data.subarray(0, 4)], [240, 240, 240, 255], 'untouched root background must match the control');
          let different = 0;
          for (let i = 0; i < image.data.length; i += 4)
            if ([0,1,2,3].some(c => image.data[i+c] !== data.control[i+c])) different++;
          pair[mode] = { site: data.site, baselines: data.baselines, opaqueControlSha256: hash(Buffer.from(data.control)), differingPixels: different };
          pair[mode].paintCalls = data.paintCalls;
          pair[mode].runtimeText = data.runtimeText.map(({pixels,gpuPixels,...row}) => {
            assert.equal(gpuPixels.length,pixels.length,'GPU RGBA readback dimensions must match the canvas');
            const flipped=new Uint8Array(pixels.length), stride=row.backingSize.width*4;
            for(let y=0;y<row.backingSize.height;y++)flipped.set(pixels.slice(y*stride,(y+1)*stride),
              (row.backingSize.height-1-y)*stride);
            let directDifferences=0,flippedDifferences=0,maximumRawChannelDifference=0,
              alphaDifferences=0,maximumAlphaDifference=0,maximumCompositedDifference=0;
            for(let p=0;p<pixels.length;p+=4) {
              if([0,1,2,3].some(c=>gpuPixels[p+c]!==pixels[p+c]))directDifferences++;
              if([0,1,2,3].some(c=>gpuPixels[p+c]!==flipped[p+c]))flippedDifferences++;
              maximumRawChannelDifference=Math.max(maximumRawChannelDifference,
                ...[0,1,2,3].map(c=>Math.abs(gpuPixels[p+c]-flipped[p+c])));
              const alphaDelta=Math.abs(gpuPixels[p+3]-flipped[p+3]);
              if(alphaDelta)alphaDifferences++;
              maximumAlphaDifference=Math.max(maximumAlphaDifference,alphaDelta);
              for(let c=0;c<3;c++) {
                const composite=(bytes)=>Math.round(bytes[p+c]*bytes[p+3]/255+240*(1-bytes[p+3]/255));
                maximumCompositedDifference=Math.max(maximumCompositedDifference,
                  Math.abs(composite(gpuPixels)-composite(flipped)));
              }
            }
            return {...row,pixelsSha256:hash(Buffer.from(pixels)),gpuPixelsSha256:hash(Buffer.from(gpuPixels)),
              gpuReadback:{directDifferences,flippedDifferences,maximumRawChannelDifference,
                alphaDifferences,maximumAlphaDifference,maximumCompositedDifference}};
          });
          let transparentDifference = 0, backingDifference = 0;
          for (let i = 0; i < image.data.length; i += 4) {
            if ([0,1,2,3].some(c => image.data[i+c] !== transparentControl[i+c])) transparentDifference++;
            if ([0,1,2,3].some(c => data.control[i+c] !== transparentControl[i+c])) backingDifference++;
          }
          pair[mode].transparentControlSha256 = hash(Buffer.from(transparentControl));
          pair[mode].transparentControlDifferences = transparentDifference;
          pair[mode].opaqueVersusTransparentDifferences = backingDifference;
          let localDifference = 0, originDifference = 0;
          for (let i = 0; i < image.data.length; i += 4) {
            if ([0,1,2,3].some(c => image.data[i+c] !== localControl.pixels[i+c])) localDifference++;
            if ([0,1,2,3].some(c => transparentControl[i+c] !== localControl.pixels[i+c])) originDifference++;
          }
          pair[mode].localControl = { rows: localControl.rows, sha256: hash(Buffer.from(localControl.pixels)),
            screenshotDifferences: localDifference, globalTransparentDifferences: originDifference };
          let mappedDifference = 0, mappingDifference = 0;
          const mappedDifferenceSamples = [];
          const residualHistogram = {}, signedChannelHistogram = {};
          const originResiduals = localControl.rows.map(row => ({ left: row.left, top: row.top,
            differingPixels: 0, greaterThanTwo: 0, maximumChannelDifference: 0 }));
          let maximumChannelDifference = 0, alphaDifferences = 0;
          for (let i = 0; i < image.data.length; i += 4) {
            const deltas = [0,1,2,3].map(c => image.data[i+c] - mappedControl.pixels[i+c]);
            const magnitude = Math.max(...deltas.map(Math.abs));
            maximumChannelDifference = Math.max(maximumChannelDifference, magnitude);
            if (deltas[3]) alphaDifferences++;
            if (magnitude) {
              const cssY = Math.floor(i / 4 / image.width) / dpr;
              const owner = originResiduals.find(row => cssY >= row.top - 1 && cssY < row.top + 25);
              assert.ok(owner, 'residual must belong to a declared text row');
              owner.differingPixels++;
              if (magnitude > 2) owner.greaterThanTwo++;
              owner.maximumChannelDifference = Math.max(owner.maximumChannelDifference, magnitude);
              residualHistogram[magnitude] = (residualHistogram[magnitude] ?? 0) + 1;
              for (const delta of deltas.slice(0, 3))
                signedChannelHistogram[delta] = (signedChannelHistogram[delta] ?? 0) + 1;
            }
            if ([0,1,2,3].some(c => image.data[i+c] !== mappedControl.pixels[i+c])) {
              mappedDifference++;
              if (mappedDifferenceSamples.length < 12) mappedDifferenceSamples.push({
                x: (i / 4) % image.width, y: Math.floor(i / 4 / image.width),
                actual: Array.from(image.data.subarray(i, i + 4)), control: mappedControl.pixels.slice(i, i + 4) });
            }
            if ([0,1,2,3].some(c => localControl.pixels[i+c] !== mappedControl.pixels[i+c])) mappingDifference++;
          }
          pair[mode].mappedControl = { rows: mappedControl.rows, sha256: hash(Buffer.from(mappedControl.pixels)),
            screenshotDifferences: mappedDifference, unmappedLocalDifferences: mappingDifference, samples: mappedDifferenceSamples,
            residualHistogram, signedChannelHistogram, maximumChannelDifference, alphaDifferences, originResiduals };
          assert.equal(Object.values(residualHistogram).reduce((sum, count) => sum + count, 0), mappedDifference);
          assert.equal(originResiduals.reduce((sum, row) => sum + row.differingPixels, 0), mappedDifference);
          if (mode !== 'reference') {
            assert.equal(data.runtimeText.length, 4);
            const samplingModels = [], gpuSamplingModels = [], gpuUvModels = [];
            for (const pixelSource of ['canvas','gpu-readback','gpu-uv']) for (const origin of ['measured', 'authored']) {
              const prediction = new Uint8Array(image.data.length);
              for (let p = 0; p < prediction.length; p += 4) prediction.set([240,240,240,255], p);
              for (const texture of data.runtimeText) {
                const index = Number(texture.id.split('-').at(-1));
                const left = origin === 'measured' ? texture.bounds.left : 20 + index * .25;
                const top = origin === 'measured' ? texture.bounds.top : 20 + index * 32 + index * .25;
                const { width, height } = texture.logicalSize;
                for (let y = 0; y < image.height; y++) for (let x = 0; x < image.width; x++) {
                  const u = ((x + .5) / dpr - left) / width, v = ((y + .5) / dpr - top) / height;
                  if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
                  const texel = (Math.floor(v * texture.backingSize.height) * texture.backingSize.width +
                    Math.floor(u * texture.backingSize.width)) * 4;
                  // readPixels rows are bottom-up; normalize only this diagnostic model.
                  const sourceTexel=pixelSource==='canvas'?texel:pixelSource==='gpu-uv'?
                    (Math.min(texture.backingSize.height-1,Math.floor((1-v)*texture.backingSize.height))*texture.backingSize.width+
                      Math.floor(u*texture.backingSize.width))*4:
                    ((texture.backingSize.height-1-Math.floor(v*texture.backingSize.height))*texture.backingSize.width+
                      Math.floor(u*texture.backingSize.width))*4;
                  const bytes=pixelSource==='canvas'?texture.pixels:texture.gpuPixels;
                  const alpha = bytes[sourceTexel + 3] / 255, pixel = (y * image.width + x) * 4;
                  for (let c = 0; c < 3; c++) prediction[pixel + c] = Math.round(bytes[sourceTexel + c] * alpha + 240 * (1 - alpha));
                }
              }
              let different = 0, greaterThanTwo = 0, maximum = 0;
              for (let p = 0; p < prediction.length; p += 4) {
                const magnitude = Math.max(...[0,1,2,3].map(c => Math.abs(prediction[p+c] - image.data[p+c])));
                if (magnitude) different++;
                if (magnitude > 2) greaterThanTwo++;
                maximum = Math.max(maximum, magnitude);
              }
              (pixelSource==='canvas'?samplingModels:pixelSource==='gpu-readback'?gpuSamplingModels:gpuUvModels).push({ origin, differingPixels: different, greaterThanTwo, maximumChannelDifference: maximum,
                predictionSha256: hash(prediction) });
            }
            pair[mode].samplingModels = samplingModels;
            pair[mode].gpuSamplingModels = gpuSamplingModels;
            pair[mode].gpuUvModels = gpuUvModels;
            for (let i = 0; i < 4; i++) {
              const observed = data.runtimeText.find(row => row.id === `text-${i}`), expected = mappedControl.rows[i];
              assert.deepEqual(observed.logicalSize, { width: expected.width, height: expected.height });
              assert.deepEqual(observed.backingSize, { width: expected.backingWidth, height: expected.backingHeight });
              assert.equal(observed.samplingMode, 1);
              assert.equal(expected.actualTextureDifferences, 0, 'actual texture RGBA agrees with the modeled canvas before composition');
            }
          }
          assert.deepEqual(errors, []); assert.deepEqual(data.errors, []);
          if(mode==='astylar-no-msaa') {
            const shaders=await page.evaluate(()=>window.dividerTextReduction.encodeUvFloors('sampler'));
            const encoded=PNG.sync.read(await page.screenshot());
            const prediction=new Uint8Array(image.data.length);
            for(let p=0;p<prediction.length;p+=4)prediction.set([240,240,240,255],p);
            let observedPixels=0,outsideProjectedBounds=0,outOfRangeFloors=0;
            for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
              const pixel=(y*image.width+x)*4;
              if(encoded.data[pixel+2]!==127)continue;
              // The isolated planes have disjoint vertical bands. Match owner
              // without treating CPU projected edge rounding as raster truth;
              // count all edge disagreements explicitly below.
              const candidates=data.runtimeText.filter(t=>(y+.5)/dpr>=t.bounds.top-1&&
                (y+.5)/dpr<t.bounds.bottom+1);
              assert.equal(candidates.length,1);
              const texture=candidates[0];
              if((x+.5)/dpr<texture.bounds.left||(x+.5)/dpr>=texture.bounds.right||
                (y+.5)/dpr<texture.bounds.top||(y+.5)/dpr>=texture.bounds.bottom)outsideProjectedBounds++;
              assert.ok(texture,'encoded UV pixel must belong to a recorded plane: '+JSON.stringify({x,y,
                rgba:Array.from(encoded.data.slice(pixel,pixel+4)),bounds:data.runtimeText.map(t=>t.bounds)}));
              let column=encoded.data[pixel]-1,row=encoded.data[pixel+1]-1;
              if(column<0||column>=texture.backingSize.width||row<0||row>=texture.backingSize.height){
                outOfRangeFloors++;
                assert.equal(texture.samplingInputs.wrapU,0);assert.equal(texture.samplingInputs.wrapV,0);
                column=Math.max(0,Math.min(texture.backingSize.width-1,column));
                row=Math.max(0,Math.min(texture.backingSize.height-1,row));
              }
              const texel=(row*texture.backingSize.width+column)*4,alpha=texture.gpuPixels[texel+3]/255;
              for(let c=0;c<3;c++)prediction[pixel+c]=Math.round(texture.gpuPixels[texel+c]*alpha+240*(1-alpha));
              observedPixels++;
            }
            let different=0,greaterThanTwo=0,maximum=0;
            for(let p=0;p<prediction.length;p+=4){
              const delta=Math.max(...[0,1,2,3].map(c=>Math.abs(prediction[p+c]-image.data[p+c])));
              if(delta)different++;if(delta>2)greaterThanTwo++;maximum=Math.max(maximum,delta);
            }
            assert.ok(observedPixels>0);
            assert.equal(different,0,'GPU-validated sampler addresses reconstruct the untouched no-MSAA capture');
            pair[mode].shaderSamplerDiagnostic={observedPixels,outsideProjectedBounds,outOfRangeFloors,
              differingPixels:different,greaterThanTwo,
              maximumChannelDifference:maximum,encodedSha256:hash(encoded.data),predictionSha256:hash(prediction),
              shaders:shaders.map(s=>({vertexSha256:hash(s.vertex),fragmentSha256:hash(s.fragment),
                diagnosticSha256:hash(s.diagnostic)}))};
            assert.deepEqual(errors,[]);
          }
          assert.equal(await page.evaluate(() => window.dividerTextReduction.dispose()), true);
        } finally { await page.close(); }
      }
      assert.deepEqual(pair.reference.site, pair.astylar.site);
      assert.deepEqual(pair.reference.baselines, pair.astylar.baselines);
      assert.equal(pair.reference.opaqueControlSha256, pair.astylar.opaqueControlSha256);
      assert.equal(pair.reference.transparentControlSha256, pair.astylar.transparentControlSha256);
      assert.deepEqual(pair.reference.localControl.rows, pair.astylar.localControl.rows);
      assert.equal(pair.reference.localControl.sha256, pair.astylar.localControl.sha256);
      assert.equal(pair.reference.mappedControl.sha256, pair.astylar.mappedControl.sha256);
      assert.equal(pair.reference.opaqueVersusTransparentDifferences, pair.astylar.opaqueVersusTransparentDifferences);
      assert.deepEqual(pair.astylar.site,pair['astylar-no-msaa'].site);
      assert.deepEqual(pair.astylar.baselines,pair['astylar-no-msaa'].baselines);
      const withoutContext=rows=>rows.map(row=>{
        const {framebuffer,samples,...transfer}=row.transfer;
        return {...row,transfer};
      });
      assert.deepEqual(withoutContext(pair.astylar.runtimeText),withoutContext(pair['astylar-no-msaa'].runtimeText),
        'context intervention must preserve texture bytes,logical/backing dimensions,geometry and material transfer');
      for(const row of pair.astylar.runtimeText) {
        assert.equal(row.transfer.framebuffer.antialias,true);assert.ok(row.transfer.samples>0);
      }
      for(const row of pair['astylar-no-msaa'].runtimeText) {
        assert.equal(row.transfer.framebuffer.antialias,false);assert.equal(row.transfer.samples,0);
      }
      if (dpr === 1) {
        assert.equal(pair.reference.differingPixels, 0, 'opaque baseline control matches native DPR1 paragraph/span paint');
        assert.ok(pair.astylar.differingPixels > 0, 'retain the equal-input candidate paint counterexample');
        assert.ok(pair.reference.opaqueVersusTransparentDifferences > 0, 'backing alone changes paint at identical origins');
        assert.ok(pair.astylar.transparentControlDifferences > 0, 'transparent global backing alone does not reproduce candidate paint');
      }
      results.push({ dpr, ...pair });
    }
    for (const input of inputs) assert.equal(hash(readFileSync(input.file)), input.sha256);
    assert.equal(readFileSync(canvasPath, 'utf8'), installedCanvas);
    assert.equal(readFileSync('src/app/services/text/text-canvas-renderer.service.ts', 'utf8'), canvasSource);
    for (const receipt of downstreamSources) {
      assert.equal(readFileSync(receipt.sourcePath, 'utf8'), receipt.source);
      assert.equal(readFileSync(receipt.installedPath, 'utf8'), receipt.installed);
    }
    t.diagnostic(JSON.stringify({ browser: browser.version(), results, inputs, ownerBindings, fontSha256: hash(font), acceptance: false,
      scope: 'Equal14.4px normal paragraph/span typography at four fractional origins,DPR1/2; separate no-MSAA context intervention preserves texture,geometry and material inputs. Not full divider flow,production no-MSAA acceptance or causal intervention on renderer backing.' }));
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
});

test('retained divider responsive accessibility and replacement ownership preserve exact bounded observations', () => {
  const load = (name, receipt) => {
    const bytes = readFileSync(`artifacts/material-parity/${name}`);
    assert.equal(hash(bytes), receipt);
    const evidence = JSON.parse(bytes);
    assert.equal(evidence.helperSourceSha256,
      hash(readFileSync('tests/material-parity/sort-focus-structure.spec.mjs')));
    assert.equal(evidence.checkpoint, 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
    assert.equal(evidence.browser, '154.0.8037.58');
    return evidence;
  };
  const ax = load('divider-responsive-ax-20261006.log',
    '0504ec4a2381b9c67a1b931fce33bbb98cba7c6fc43fd2807a87e22cd104f1eb');
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile =>
    ['tablet', 'mobile'].flatMap(viewport => ['reference', 'astylar'].map(mode => `${profile}:${viewport}:${mode}`)));
  assert.deepEqual(ax.rows.map(r => `${r.profile}:${r.viewport}:${r.mode}`).sort(), expected.sort());
  for (const row of ax.rows) {
    assert.equal(row.dpr, 1);
    assert.deepEqual([row.width, row.height], row.viewport === 'tablet' ? [768, 1024] : [390, 844]);
    assert.deepEqual(row.errors, []);
    assert.equal(row.target.ignored, false);
    assert.equal(row.target.role.value, 'separator');
    assert.equal(row.target.name.value, '');
    assert.equal(row.target.properties.find(p => p.name === 'orientation').value.value, 'horizontal');
    assert.deepEqual(row.target.childIds, []);
  }
  const ownership = load('divider-update-disposal-20261006.log',
    '5260c2abddc5b4d3d0a3ee87bcaca765b8e969841e31df5e9ee1851367c26b51');
  assert.deepEqual(ownership.rows.map(r => `${r.profile}:${r.dpr}`).sort(),
    ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].map(dpr => `${profile}:${dpr}`)).sort());
  for (const row of ownership.rows) {
    assert.deepEqual(row.errors, []);
    assert.equal(row.updates.length, 3);
    for (const sample of [row.before, ...row.updates]) {
      assert.deepEqual(sample.live, { meshes: 17, materials: 16, textures: 4 });
      assert.deepEqual(sample.tracked, sample.live);
      assert.equal(sample.cache.size, 4);
      assert.equal(sample.loadedTextures, 4);
      assert.deepEqual(sample.unboundMaterials, []);
      assert.equal(sample.session.status, 'idle');
      assert.deepEqual(sample.session.pendingReasons, []);
    }
    for (const key of ['surfaceDisposed', 'sceneDisposed', 'engineDisposed']) assert.equal(row.after[key], true);
    for (const key of ['meshes', 'materials', 'textures', 'cacheSize', 'loadedTextures']) assert.equal(row.after[key], 0);
    assert.deepEqual(row.after.tracked, { meshes: 0, materials: 0, textures: 0 });
    assert.deepEqual(row.after.plugins, { owners: 0, resources: 0, cleanups: 0, pending: 0 });
  }
  // Receipt replay conserves these observed cohorts; it is not a new browser run,
  // mobile lifecycle, late-async/remount proof or complete accessibility acceptance.
});

test('retained progress focus caps and update disposal preserve complete configured cohort evidence', async () => {
  const load = (name, receipt) => {
    const raw = readFileSync(`artifacts/material-parity/${name}`);
    assert.equal(hash(raw), receipt, name);
    return raw.toString().trim().split(/\r?\n/).filter(line => line.startsWith('{')).map(JSON.parse);
  };
  const {readRetainedSortFocusSource}=await import('./position-composition-producer-transition.mjs');
  // Authenticate complete current drift and preserve every original assertion;
  // this existing reader is historical conservation,not current capture reuse.
  assert.equal(hash(readRetainedSortFocusSource()),
    '65d7256f859a0839cdf6364d8f3d4e2b81bdb32978c42e0afeaa27f2622e14ce');
  assert.equal(hash(readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json')),
    '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
  assert.equal(hash(readFileSync('examples/material-showcase/src/app/astylar.component.ts')),
    '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd');
  assert.equal(hash(readFileSync('src/lib/astylar-semantic-bridge.ts')),
    '1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725');
  assert.match(readFileSync('src/lib/astylar-semantic-bridge.ts', 'utf8'),
    /if \(element\.tabindex !== undefined\) node\.tabIndex = element\.tabindex;/);
  const membership = load('progress-configured-input-membership-20261006.log',
    'd64d73bea9a8e7d6ad2640bea3bc6a59c072ae9465f1aa3ca8577c5111fb6684').filter(r => r.family);
  assert.equal(membership.length, 40);
  const key = r => `${r.family}:${r.profile}:${r.viewport.width}:${r.viewport.height}:${r.viewport.deviceScaleFactor}`;
  const expected = [...new Set(membership.map(key))].sort();
  assert.equal(expected.length, 32);
  const ax = load('progress-actual-ax-cohorts-20261007.log',
    '88c9b67f0d0dc8267bf7b51d77839e15df74e5a118d3414b6db868813f323d31').filter(r => r.family);
  const focus = load('progress-programmatic-focus-20261007.log',
    'f896402a1d31e9e14fb6e4382854a140c51f146f1323835e48669fe1ca5176f9').filter(r => r.family);
  for (const rows of [ax, focus]) {
    assert.equal(rows.length, 64);
    for (const mode of ['reference', 'astylar']) assert.deepEqual(rows.filter(r => r.mode === mode).map(key).sort(), expected);
    for (const row of rows) assert.deepEqual(row.errors, []);
  }
  for (const row of ax) {
    assert.equal(row.target.ignored, false);
    assert.equal(row.target.role.value, 'progressbar');
    assert.equal(row.target.name.value, '');
    assert.equal(row.target.value.value, 64);
    assert.deepEqual(row.target.childIds, []);
    const properties = Object.fromEntries(row.target.properties.map(p => [p.name, p.value.value]));
    assert.deepEqual(properties, row.mode === 'reference'
      ? { focusable: true, valuemin: 0, valuemax: 100, valuetext: '' }
      : { valuemin: 0, valuemax: 100, valuetext: '' });
    assert.equal(row.dom.tabindex, row.mode === 'reference' ? '-1' : null);
  }
  for (const row of focus) {
    assert.deepEqual(row.actual.before, { focused: false, tag: 'BODY' });
    assert.deepEqual(row.actual.after, row.mode === 'astylar' ? { focused: false, tag: 'BODY' }
      : { focused: true, tag: row.family === 'progress-bar' ? 'MAT-PROGRESS-BAR' : 'MAT-PROGRESS-SPINNER' });
    assert.equal(row.actual.tabindex, row.mode === 'reference' ? '-1' : null);
  }
  const caps = load('spinner-native-cap-inputs-20261007.log',
    'd0a61b4207f1497fb6fdfebc0ea7f6cdac2c56a80c462158b71a1112fcb0edee').filter(r => r.profile);
  assert.deepEqual(caps.map(r => key({ ...r, family: 'progress-spinner' })).sort(), expected.filter(k => k.startsWith('progress-spinner:')));
  for (const row of caps) {
    assert.deepEqual(row.errors, []);
    assert.equal(row.actual.attributes.r, '45');
    assert.equal(row.actual.styles.strokeLinecap, 'butt');
    assert.equal(row.actual.styles.strokeLinejoin, 'miter');
    assert.equal(row.actual.styles.strokeMiterlimit, '4');
  }
  const geometry = load('spinner-cap-geometry-control-20261007.log',
    'abbf5fa495bfdecb4cde00f965cbdb99aa36ff97c3c73601d7fdec2d4ca07c1d')[0];
  assert.equal(hash(readFileSync('examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts')),
    geometry.sourceSha);
  assert.equal(geometry.pointCount, 41);
  assert.equal(geometry.capShape, 'flat endpoint disk,not spherical extension');
  assert.equal(geometry.chordVersusCircleTangentDegrees, 2.88);
  for (const cap of geometry.capPlanes) {
    assert.equal(cap.ringVertices, 12); assert.equal(cap.maxCollapsedDistance, 0);
    assert.ok(cap.maxPlaneError < 1e-7);
  }
  const ownership = [...load('progress-update-disposal-20261007-retry.log',
    'e6a3ca134633265655100f3c214812343a47ceaa459d2e96d38e222fbf66143d'),
  ...load('progress-remaining-update-disposal-20261007.log',
    '9c5751074266de90a09050dd8b313c925b98bbdf94874e3cb99c01a901cbc8ff')]
    .filter(r => r.diagnostic?.viewport);
  assert.equal(ownership.length, 32);
  assert.deepEqual(ownership.map(r => key({ family: r.family, ...r.diagnostic })).sort(), expected);
  for (const { family, diagnostic: d } of ownership) {
    assert.deepEqual(d.errors, []); assert.equal(d.snapshots.length, 4);
    const initial = d.snapshots[0];
    for (const sample of d.snapshots) {
      assert.deepEqual(sample.live, initial.live); assert.deepEqual(sample.tracked, sample.live);
      assert.deepEqual(sample.unbound, initial.unbound); assert.equal(sample.unbound.length, 1);
      assert.equal(sample.unbound[0].name, `${family}-primary-transparent`);
      assert.equal(sample.session.status, 'idle'); assert.deepEqual(sample.session.pendingReasons, []);
    }
    assert.deepEqual(d.disposal, { surface: true, scene: true, engine: true,
      live: { meshes: 0, materials: 0, textures: 0 }, cache: 0, loaded: 0,
      plugins: { owners: 0, resources: 0, cleanups: 0, pending: 0 } });
  }
  // Preserve the focus/input failure and redundant owned allocation. Receipt
  // replay is not a fresh browser run, equal cap paint, remount or final parity.
});

test('current list wrapper inputs retain clipping and row-height divergence for all configured cases', () => {
  const fullBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(fullBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const full = JSON.parse(fullBytes);
  const cases = [...full.results, ...full.interactions].filter(row => row.family === 'list');
  assert.equal(cases.length, 52);
  const heights = {};
  for (const row of cases) {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.inputTrees[side], raw = readFileSync(receipt.file);
      assert.equal(hash(raw), receipt.sha256);
      return [side, JSON.parse(raw)];
    }));
    for (const id of ['list-inbox-label', 'list-archive-label']) {
      const chains = {};
      for (const side of ['reference', 'astylar']) {
        const tree = trees[side], byKey = new Map(tree.nodes.map(node => [node.key, node]));
        let node = tree.nodes.find(node => (node.attributes?.id ?? node.authored?.id) === id);
        assert.ok(node, id);
        chains[side] = [];
        while (node && (node.attributes?.id ?? node.authored?.id) !== 'list-root') {
          chains[side].push(node);
          node = byKey.get(node.parent);
        }
        assert.ok(node, 'Complete root ancestry is required');
      }
      const content = chains.reference.find(node => node.attributes?.class?.split(' ').includes('mdc-list-item__content'));
      assert.ok(content, 'Native content wrapper is not optional evidence');
      const style = trees.reference.styles[content.style];
      assert.equal(style.flexGrow, '1');
      assert.equal(style.whiteSpace, 'nowrap');
      assert.equal(style.textOverflow, 'ellipsis');
      assert.equal(style.overflowX, 'hidden');
      assert.equal(chains.astylar.length, 3, 'Candidate flattened label/item/list ancestry');
      const nativeItem = chains.reference.find(node => node.type === 'mat-list-item');
      const candidateItem = chains.astylar.find(node => node.authored?.class === 'list-item');
      assert.ok(nativeItem && candidateItem);
      const pair = `${trees.reference.styles[nativeItem.style].height}/${candidateItem.resolvedStyle.height}`;
      heights[pair] = (heights[pair] ?? 0) + 1;
    }
  }
  assert.deepEqual(heights, { '48px/56px': 52, '24px/40px': 26, '40px/48px': 26 });
});

test('configured progress inputs preserve determinate state and original SVG attributes across forty cases', () => {
  const raw = readFileSync('artifacts/material-parity/progress-configured-input-membership-20261006.log');
  assert.equal(hash(raw), 'd64d73bea9a8e7d6ad2640bea3bc6a59c072ae9465f1aa3ca8577c5111fb6684');
  const rows = raw.toString().trim().split(/\r?\n/).map(JSON.parse).filter(row => row.family);
  assert.equal(rows.length, 40);
  const counts = {};
  for (const row of rows) {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.receipts[side].receipt, bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      return [side, JSON.parse(bytes)];
    }));
    const native = trees.reference.nodes.find(node => node.attributes?.id === `${row.family}-primary`);
    const candidate = trees.astylar.nodes.find(node => node.authored?.id === `${row.family}-primary`);
    assert.equal(native.attributes.value, '64');
    assert.equal(native.attributes.mode, 'determinate');
    assert.equal(candidate.authored.data.progress, .64);
    assert.equal(candidate.authored.data.mode, 'determinate');
    if (row.family === 'progress-spinner') {
      const circle = trees.reference.nodes.find(node => node.attributes?.class === 'mdc-circular-progress__determinate-circle');
      assert.equal(circle.attributes.r, '45');
      assert.equal(circle.attributes.style, row.detail.circle.style);
      assert.equal(candidate.authored.data['stroke-width'], 10);
    } else {
      assert.equal(row.family, 'progress-bar');
      const indicator = trees.reference.nodes.find(node => node.attributes?.class?.split(' ').includes('mdc-linear-progress__primary-bar'));
      assert.equal(indicator.attributes.style, 'transform: scaleX(0.64);');
    }
    counts[row.family] = (counts[row.family] ?? 0) + 1;
  }
  assert.deepEqual(counts, { 'progress-bar': 20, 'progress-spinner': 20 });
});

test('passive state applicability joins exact cases without discarding progress focusability', async t => {
  const families = new Map([['sidenav',62],['grid-list',52],['divider',24],['badge',52],
    ['icon',20],['list',52],['table',52],['progress-bar',20],['progress-spinner',20]]);
  const raw = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(raw),'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const captured = JSON.parse(raw);
  const identity = (row,kind) => [kind,row.family,row.profile,row.viewport.id,row.state??'static'].join('/');
  const allConfigured = [...materialStaticCases.map(row=>({...row,kind:'static'})),
    ...[...materialInteractionCases,...materialMobileFlowCases].map(row=>({...row,kind:'interaction'}))];
  const allCases = [...captured.results.map(row=>({...row,kind:'static'})),
    ...captured.interactions.map(row=>({...row,kind:'interaction'}))];
  assert.equal(allConfigured.length,2311);assert.equal(new Set(allCases.map(row=>identity(row,row.kind))).size,2311);
  assert.deepEqual(allCases.map(row=>identity(row,row.kind)).sort(),allConfigured.map(row=>identity(row,row.kind)).sort());
  const configured=allConfigured.filter(row=>families.has(row.family)),cases=allCases.filter(row=>families.has(row.family));
  const expected=configured.map(row=>identity(row,row.kind)).sort();
  assert.equal(new Set(expected).size,354);
  assert.deepEqual(cases.map(row=>identity(row,row.kind)).sort(),expected);
  const working='artifacts/material-parity/working-audit';
  // Review the same authenticated predecessor after publication; the mutable
  // current index must not rewrite unchanged finding IDs/dependencies on replay.
  const pointer={generation:'c9cd6957c82177931072b374d438f3ad4b67038446d3755cd1e6fb5528805b51',
    indexSha256:'01a77bb042201d00ef0e0bba0d7b5477b5524b9e9299225817a44e6cdca630ad'};
  const generation=`${working}/${pointer.generation}`;
  const index=verifyFindings(generation,pointer.indexSha256);
  const canonical=index.manifest;assert.equal(canonical.compressedSha256,pointer.generation);
  const allFamilies=[...new Set(allCases.map(row=>row.family))];assert.equal(allFamilies.length,36);
  const scalarInputs=new Map(allFamilies.map(family=>[family,
    queryFindings(working,family,pointer).filter(row=>row.evidence.section==='discrepancies')]));
  assert.equal([...families.keys()].reduce((count,family)=>count+scalarInputs.get(family).length,0),1697);
  assert.equal([...scalarInputs.values()].reduce((count,rows)=>count+rows.length,0),8483);
  const scalarCaseKey=entry=>`${entry.kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? `/${entry.state}` : ''}`;
  const joinScalarInputs=(entry,override)=>{
    const caseId=scalarCaseKey(entry);
    const rows=(override??scalarInputs.get(entry.family)).filter(row=>(row.reviewedCases??row.cases??[]).includes(caseId));
    assert.ok(rows.length>0,'Exact case requires explicit scalar membership');
    assert.equal(new Set(rows.map(row=>row.id)).size,rows.length);
    const classifications={};
    for(const row of rows){
      assert.equal(row.family,entry.family);assert.equal(row.evidence.sourceSha256,canonical.uncompressedSha256);
      assert.ok(row.classification && row.justification && row.recommendedOwner);
      assert.notEqual(row.attribution,'unresolved');
      classifications[row.classification]=(classifications[row.classification]??0)+1;
    }
    const shard=index.shards.find(row=>row.file===`discrepancies-${entry.family}.jsonl`);assert.ok(shard);
    return {applicability:'applicable',disposition:'partial',
      reportedScalarInputs:{disposition:'inspected',findings:rows.map(row=>row.id),classifications,
        evidence:{index:{file:`${generation}/index.json`,sha256:pointer.indexSha256},
          shard:{file:`${generation}/${shard.file}`,sha256:shard.sha256},
          sourcePackage:{file:`${generation}/${canonical.payload}`,sha256:canonical.compressedSha256}}},
      remaining:['complete element/anonymous descendant and structural input mapping','first-stage and paint applicability of remaining owners'],
      boundary:'Only explicit reviewedCases or recorded sample membership; occurrences never expand sampled cases. Classified scalar inputs do not certify complete structure,used values,equal inputs or current rendering.'};
  };
  assert.throws(()=>joinScalarInputs({...cases[0],profile:'invented'}));
  const firstScalar=scalarInputs.get(cases[0].family).find(row=>(row.reviewedCases??row.cases??[])
    .includes(scalarCaseKey(cases[0])));
  assert.throws(()=>joinScalarInputs(cases[0],[{...firstScalar,classification:undefined}]));
  // This is a captured-authoring applicability classifier,not a live event probe.
  const inspect = (type,attrs) => {
    assert.ok(!['button','input','select','textarea','summary','dialog'].includes(type));
    assert.ok(!(type==='a' && (attrs.href!==undefined || attrs.tabIndex!==undefined || attrs.tabindex!==undefined)));
    assert.ok(!Object.keys(attrs).some(key=>/^on[a-z]/i.test(key)));
    assert.ok(![attrs.contenteditable,attrs.contentEditable].some(value=>value!==undefined && value!==false && value!=='false'));
    const tab=attrs.tabindex??attrs.tabIndex;
    if(tab!==undefined)assert.equal(String(tab),'-1');
    return tab!==undefined;
  };
  const counts={}, focusable=[];
  const runnerAst = ts.createSourceFile('runner.mjs', readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const cursorFunctions = runnerAst.statements.filter(node => ts.isFunctionDeclaration(node)
    && node.name?.text === 'compareInteractionCursor');
  assert.equal(cursorFunctions.length, 1);
  const compareCursor = new Function(`return ${cursorFunctions[0].getText(runnerAst)};`)();
  for(const row of cases) {
    const caseId=identity(row,row.kind);
    counts[row.family]=(counts[row.family]??0)+1;
    if (row.family === 'divider' && row.kind === 'interaction') {
      assert.equal(row.state, 'inspect');
      assert.deepEqual(row.cursor, { matches: true });
      // Deliberately absent pages prove this is the unmeasured early return,
      // not effective cursor evidence or a browser observation.
      assert.deepEqual(await compareCursor(undefined, undefined, 'divider', 'inspect'), { matches: true });
    }
    for(const side of ['reference','astylar']) {
      const receipt=row.inputTrees[side], bytes=readFileSync(receipt.file);
      assert.equal(hash(bytes),receipt.sha256,caseId+'/'+side);
      const tree=JSON.parse(bytes);
      for(const node of tree.nodes) {
        const attrs=side==='reference'?node.attributes:node.authored??{};
        const type=side==='reference'?node.type:attrs.type;
        if(inspect(type,attrs)) {
          assert.equal(side,'reference');
          assert.ok(['progress-bar','progress-spinner'].includes(row.family));
          assert.equal(attrs.id,row.family+'-primary');
          assert.equal(attrs.mode,'determinate');assert.equal(attrs.value,'64');
          focusable.push({case:caseId,side,type,tabindex:attrs.tabindex});
        }
      }
    }
  }
  assert.deepEqual(counts,Object.fromEntries(families));
  assert.equal(focusable.length,40);
  assert.throws(()=>inspect('button',{}));
  assert.throws(()=>inspect('div',{tabindex:'0'}));
  assert.throws(()=>inspect('div',{contenteditable:'true'}));
  assert.throws(()=>inspect('div',{onclick:'activate()'}));
  // Proposed extension of existing coverage, not canonical closure or new capture.
  // All authored nodes were authenticated and inspected above; exclusions apply
  // only to that authoring, never to unrecorded callbacks or runtime behavior.
  const progressFocus = new Set(focusable.map(row => row.case));
  const reportSha256 = hash(raw);
  const semanticFile='artifacts/material-parity/passive-descendant-semantics-20261006.log';
  const semanticBytes=readFileSync(semanticFile),semanticSha256=hash(semanticBytes);
  assert.equal(semanticSha256,'aa5932cda3140e3f15fa661316c9da38a7e8b274fe6dce24eccb63602233147d');
  const semanticRecords=semanticBytes.toString().trim().split(/\r?\n/).map(JSON.parse);
  const semanticSummary=semanticRecords.pop();
  for(const receipt of semanticSummary.sources)assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
  const semanticKey=row=>`${row.family}/${row.profile}/${row.viewport.id}/${row.state??'static'}`;
  assert.deepEqual(semanticRecords.map(semanticKey).sort(),cases.map(semanticKey).sort());
  const joinSemantics=entry=>{
    const matches=semanticRecords.filter(row=>semanticKey(row)===semanticKey(entry));assert.equal(matches.length,1);
    const observation=matches[0];
    for(const side of ['reference','astylar']){
      const tree=JSON.parse(readFileSync(entry.inputTrees[side].file));
      const byKey=new Map(tree.nodes.map(node=>[node.key,node]));
      for(const node of observation.sides[side]){
        const original=byKey.get(node.key);assert.ok(original);
        const attrs=side==='reference'?original.attributes:original.authored;
        assert.equal(node.type,side==='reference'?original.type:attrs.type);
        for(const [name,value]of Object.entries(node.attrs))assert.deepEqual(attrs[name],value);
      }
    }
    const referenceHidden=observation.sides.reference.filter(node=>node.attrs['aria-hidden']==='true').length;
    return {applicability:'applicable',disposition:'partial',
      authoredAttributeObservation:{disposition:'inspected',referenceHidden,
        candidateHidingRequests:observation.sides.astylar.filter(node=>node.attrs.ariaHidden!==undefined).length,
        evidence:{file:semanticFile,sha256:semanticSha256,case:semanticKey(entry),sources:semanticSummary.sources}},
      ...(progressFocus.has(identity(entry,entry.kind))?{actualHostAX:joinProgressAX(entry)}:{}),
      ...(entry.family==='divider'?{actualHostAX:joinDividerAX(entry)}:{}),
      ...(['table','list'].includes(entry.family)?{actualSubtreeAX:joinCollectionAX(entry)}:{}),
      remaining:['actual generated bridge and AX relationships','assistive-technology behavior','complete semantic input mapping','current rendering applicability'],
      boundary:'Recorded authored subtree attributes only; absent recorded attributes are not invented defaults.'};
  };
  assert.throws(()=>joinSemantics({...cases[0],profile:'invented'}));
  const focusFile = 'artifacts/material-parity/progress-programmatic-focus-20261007.log';
  const focusBytes = readFileSync(focusFile), focusSha256 = hash(focusBytes);
  assert.equal(focusSha256,'f896402a1d31e9e14fb6e4382854a140c51f146f1323835e48669fe1ca5176f9');
  const focusRows = focusBytes.toString().trim().split(/\r?\n/).map(JSON.parse).filter(row=>row.family);
  const cohortKey = row => [row.family,row.profile,row.viewport.width,row.viewport.height,row.viewport.deviceScaleFactor].join('/');
  const collectionAX=new Map();
  const historicalManifestBytes=readFileSync('artifacts/material-parity/current-full-20261005/checkpoint/manifest.json');
  assert.equal(hash(historicalManifestBytes),'7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
  const historicalManifest=JSON.parse(historicalManifestBytes);
  assert.deepEqual(verifyRetainedMaterialBrowserFiles(historicalManifest.provenance.browserFiles),
    {authenticatedFiles:1887,currentRenderingAccepted:false});
  for(const [family,name,expectedHash]of [
    ['table','table-child-ax-cohorts-20261007.log','a53981184b33cbd4b55119623d6502121f14d0586b02d9005fcd9eeccc81c949'],
    ['list','list-ax-cohorts-20261007.log','98b2c152497cb4bae46833d0d46a61b7a16fa5f24177cf96652280c805034f04'],
  ]){
    const file=`artifacts/material-parity/${name}`,bytes=readFileSync(file);assert.equal(hash(bytes),expectedHash);
    const records=bytes.toString().trim().split(/\r?\n/).map(JSON.parse);
    assert.equal(records[0].reportSha256,reportSha256);assert.equal(records.at(-1).acceptance,false);
    assert.equal(records.at(-1).complete,true);assert.equal(records.at(-1).cohorts,16);
    const rows=records.filter(row=>row.viewport).map(row=>({...row,family}));assert.equal(rows.length,32);
    const expected=[...new Set(cases.filter(row=>row.family===family).map(cohortKey))].sort();assert.equal(expected.length,16);
    for(const mode of ['reference','astylar'])assert.deepEqual(rows.filter(row=>row.mode===mode).map(cohortKey).sort(),expected);
    collectionAX.set(family,{file,sha256:expectedHash,rows});
  }
  const joinCollectionAX=(entry,override)=>{
    const source=collectionAX.get(entry.family);assert.ok(source);
    const pair=['reference','astylar'].map(mode=>{
      const matches=(override??source.rows).filter(row=>row.mode===mode && cohortKey(row)===cohortKey(entry));assert.equal(matches.length,1);
      return matches[0];
    });
    let observations;
    if(entry.family==='table'){
      observations=pair.map(row=>{
        assert.equal(row.observations.length,9);const ids=row.observations.map(item=>item.ax.nodeId);
        return row.observations.map(item=>({tag:item.domTag,role:item.ax.role.value,name:item.ax.name.value,
          ignored:item.ax.ignored,parent:ids.indexOf(item.ax.parentId),
          children:(item.ax.childIds??[]).filter(id=>ids.includes(id)).map(id=>ids.indexOf(id))}));
      });
      assert.deepEqual(observations[0],observations[1]);
      assert.deepEqual(observations[0].map(row=>row.role),['table','rowgroup','row','columnheader','rowgroup','row','cell','row','cell']);
      assert.ok(observations[0].every(row=>row.ignored===false));
    }else{
      observations=pair.map((row,index)=>{
        const text=row.subtree.filter(n=>!n.ignored && n.role.value==='StaticText').map(n=>n.name.value);
        assert.deepEqual(text,['Inbox','Archive']);
        assert.ok(!row.subtree.some(n=>!n.ignored && ['list','listitem','listbox','option'].includes(n.role.value)));
        const generic=row.subtree.filter(n=>!n.ignored && n.role.value==='generic').length;
        const ignored=row.subtree.filter(n=>n.ignored).length;
        assert.equal(generic,index===0?7:5);assert.equal(ignored,index===0?2:0);return {text,generic,ignored};
      });
    }
    return {disposition:'inspected',outcome:entry.family==='table'?'bounded-role-name-hierarchy-agreement':
      'bounded-text-role-agreement-with-wrapper-differences',
      evidence:{file:source.file,sha256:source.sha256,cohort:cohortKey(entry),
        observations:Object.fromEntries(['reference','astylar'].map((mode,index)=>[mode,observations[index]]))},
      boundary:'Retained supplementary physical-cohort AX,not original action endpoints; header associations,wrapper equivalence,AT behavior and current rendering unverified.'};
  };
  const firstTable=cases.find(row=>row.family==='table'),firstList=cases.find(row=>row.family==='list');
  assert.throws(()=>joinCollectionAX({...firstTable,profile:'invented'}));
  const forgedTable=structuredClone(collectionAX.get('table').rows);
  forgedTable.find(row=>cohortKey(row)===cohortKey(firstTable)).observations[0].ax.role.value='generic';
  assert.throws(()=>joinCollectionAX(firstTable,forgedTable));
  const forgedList=structuredClone(collectionAX.get('list').rows);
  forgedList.find(row=>cohortKey(row)===cohortKey(firstList)).subtree.find(n=>n.role.value==='StaticText').name.value='forged';
  assert.throws(()=>joinCollectionAX(firstList,forgedList));
  const focusCohorts = [...new Set(cases.filter(row=>progressFocus.has(identity(row,row.kind))).map(cohortKey))].sort();
  assert.equal(focusCohorts.length,32);
  const axFile='artifacts/material-parity/progress-actual-ax-cohorts-20261007.log';
  const axBytes=readFileSync(axFile),axSha256=hash(axBytes);
  assert.equal(axSha256,'88c9b67f0d0dc8267bf7b51d77839e15df74e5a118d3414b6db868813f323d31');
  const axRows=axBytes.toString().trim().split(/\r?\n/).map(JSON.parse).filter(row=>row.family);
  assert.equal(axRows.length,64);
  for(const mode of ['reference','astylar'])
    assert.deepEqual(axRows.filter(row=>row.mode===mode).map(cohortKey).sort(),focusCohorts);
  const joinProgressAX=(entry,rows=axRows)=>{
    const observations=Object.fromEntries(['reference','astylar'].map(mode=>{
      const matches=rows.filter(row=>row.mode===mode && cohortKey(row)===cohortKey(entry));assert.equal(matches.length,1);
      const row=matches[0];assert.deepEqual(row.errors,[]);
      assert.equal(row.target.ignored,false);assert.equal(row.target.role.value,'progressbar');
      assert.equal(row.target.name.value,'');assert.equal(row.target.value.value,64);assert.deepEqual(row.target.childIds,[]);
      const properties=Object.fromEntries(row.target.properties.map(p=>[p.name,p.value.value]));
      assert.deepEqual(properties,mode==='reference'?{focusable:true,valuemin:0,valuemax:100,valuetext:''}:
        {valuemin:0,valuemax:100,valuetext:''});
      assert.equal(row.dom.tabindex,mode==='reference'?'-1':null);
      return [mode,{role:row.target.role.value,name:row.target.name.value,value:row.target.value.value,
        ignored:row.target.ignored,childIds:row.target.childIds,properties,tabindex:row.dom.tabindex}];
    }));
    return {disposition:'inspected',outcome:'bounded-role-value-agreement-with-focusability-difference',
      evidence:{file:axFile,sha256:axSha256,cohort:cohortKey(entry),observations},
      boundary:'Historical host AX observations only; complete AX relationships,AT behavior and current rendering remain unverified.'};
  };
  const forgedAX=structuredClone(axRows);forgedAX[0].target.role.value='generic';
  assert.throws(()=>joinProgressAX(cases.find(row=>cohortKey(row)===cohortKey(forgedAX[0])),forgedAX));
  assert.equal(focusRows.length,64);
  for(const mode of ['reference','astylar'])
    assert.deepEqual(focusRows.filter(row=>row.mode===mode).map(cohortKey).sort(),focusCohorts);
  const sourceApplicability = [
    ['examples/material-showcase/src/app/astylar.component.ts','71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd'],
    ['src/lib/astylar-semantic-bridge.ts','1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725'],
  ].map(([file,sha256])=>{assert.equal(hash(readFileSync(file)),sha256);return {file,sha256};});
  const joinFocus = (entry, rows=focusRows) => {
    const pair = Object.fromEntries(['reference','astylar'].map(mode=>{
      const matches=rows.filter(row=>row.mode===mode && cohortKey(row)===cohortKey(entry));
      assert.equal(matches.length,1);const row=matches[0];assert.deepEqual(row.errors,[]);
      assert.deepEqual(row.actual.before,{focused:false,tag:'BODY'});
      assert.deepEqual(row.actual.after,mode==='astylar'?{focused:false,tag:'BODY'}:
        {focused:true,tag:entry.family==='progress-bar'?'MAT-PROGRESS-BAR':'MAT-PROGRESS-SPINNER'});
      assert.equal(row.actual.tabindex,mode==='reference'?'-1':null);
      return [mode,row.actual];
    }));
    return {applicability:'applicable',disposition:'inspected-failure',
      classification:'application-plugin-authoring-defect',
      evidence:{file:focusFile,sha256:focusSha256,cohort:cohortKey(entry),observations:pair,sourceApplicability},
      boundary:'Historical focus failure and unchanged owning input/bridge sources; broader runtime and current rendering unverified.'};
  };
  const firstProgress=cases.find(row=>progressFocus.has(identity(row,row.kind)));
  assert.throws(()=>joinFocus({...firstProgress,profile:'invented'}));
  const forgedFocus=structuredClone(focusRows);
  forgedFocus.find(row=>row.mode==='astylar' && cohortKey(row)===cohortKey(firstProgress)).actual.after.focused=true;
  assert.throws(()=>joinFocus(firstProgress,forgedFocus));
  const dividerCases=cases.filter(row=>row.family==='divider');
  const physicalDividerKey=(profile,viewport,dpr)=>[profile,viewport.width,viewport.height,dpr].join('/');
  const dividerKey=entry=>physicalDividerKey(entry.profile,entry.viewport,entry.viewport.deviceScaleFactor);
  const dividerAXRows=[],dividerAXReceipts=[];
  for(const [name,sha256]of [
    ['divider-theme-verified-ax-20261009.log','32c55ffb2c1bede46dfefa45e24fa96dcdcab52ee9ac251d0d06bb0333f76347'],
    ['divider-comparison-theme-ax-20261009.log','b461888f7be8f49c0eb7b337f5bc32a20a0604d7369add569f14fcc6036e78b8'],
  ]){
    const file=`artifacts/material-parity/${name}`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const rows=bytes.toString().trim().split(/\r?\n/).map(JSON.parse);assert.equal(rows.pop().terminal,'verified');
    dividerAXRows.push(...rows);dividerAXReceipts.push({file,sha256});
  }
  const dividerCohorts=[...new Set(dividerCases.map(dividerKey))].sort();assert.equal(dividerCohorts.length,20);
  for(const side of ['reference','astylar'])assert.deepEqual(dividerAXRows.filter(row=>row.side===side)
    .map(row=>physicalDividerKey(row.context.profile,row.context.viewport,row.context.deviceScaleFactor)).sort(),dividerCohorts);
  const joinDividerAX=(entry,rows=dividerAXRows)=>{
    const observations=Object.fromEntries(['reference','astylar'].map(side=>{
      const matches=rows.filter(row=>row.side===side && physicalDividerKey(row.context.profile,row.context.viewport,row.context.deviceScaleFactor)===dividerKey(entry));
      assert.equal(matches.length,1);const row=matches[0];assert.deepEqual(row.runtime.errors,[]);
      assert.equal(row.theme.dark,entry.profile==='dark');assert.equal(row.observation.role,'separator');
      assert.equal(row.observation.name,'');assert.equal(row.observation.orientation,'horizontal');
      assert.deepEqual(row.observation.childIds,[]);return [side,row.observation];
    }));
    return {disposition:'inspected',outcome:'bounded-actual-theme-leaf-role-name-orientation-agreement',
      evidence:{logs:dividerAXReceipts,cohort:dividerKey(entry),observations},
      boundary:'Retained supplementary actual-theme target AX,not original action endpoints or current whole-subtree/bridge acceptance.'};
  };
  const badDividerAX=structuredClone(dividerAXRows);badDividerAX[0].observation.role='generic';
  assert.throws(()=>joinDividerAX(dividerCases.find(row=>dividerKey(row)===physicalDividerKey(badDividerAX[0].context.profile,badDividerAX[0].context.viewport,badDividerAX[0].context.deviceScaleFactor)),badDividerAX));
  const dividerLifetimeReceipts=[],dividerLifetimeRows=[];
  for(const [name,sha256]of [
    ['divider-update-disposal-20261006.log','5260c2abddc5b4d3d0a3ee87bcaca765b8e969841e31df5e9ee1851367c26b51'],
    ['divider-remaining-update-disposal-20261007.log','518513e37a67de7f5651672a7deaf764afcc415da3cf4898c2537a0137885c0a'],
  ]){
    const file=`artifacts/material-parity/${name}`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    dividerLifetimeReceipts.push({file,sha256});
    if(name==='divider-update-disposal-20261006.log')for(const row of JSON.parse(bytes).rows)
      dividerLifetimeRows.push({...row,viewport:{width:1440,height:1000,deviceScaleFactor:row.dpr},desktop:true});
    else dividerLifetimeRows.push(...bytes.toString().trim().split(/\r?\n/).map(JSON.parse).slice(1,-1));
  }
  assert.deepEqual(dividerLifetimeRows.map(dividerKey).sort(),dividerCohorts);
  const joinDividerLifetime=(entry,rows=dividerLifetimeRows)=>{
    const matches=rows.filter(row=>dividerKey(row)===dividerKey(entry));assert.equal(matches.length,1);
    const row=matches[0];assert.deepEqual(row.errors,[]);
    const samples=row.desktop?[row.before,...row.updates]:row.snapshots;assert.equal(samples.length,4);
    for(const sample of samples){
      assert.deepEqual(sample.live,{meshes:17,materials:16,textures:4});assert.deepEqual(sample.tracked,sample.live);
      assert.equal(row.desktop?sample.cache.size:sample.cache,4);
      assert.equal(row.desktop?sample.loadedTextures:sample.loaded,4);
      assert.deepEqual(row.desktop?sample.unboundMaterials:sample.unbound,[]);
      assert.equal(row.desktop?sample.session.status:sample.status,'idle');assert.equal(sample.plugins.pending,0);
    }
    const disposal=row.desktop?row.after:row.disposal;
    for(const name of row.desktop?['surfaceDisposed','sceneDisposed','engineDisposed']:['surface','scene','engine'])assert.equal(disposal[name],true);
    for(const name of ['meshes','materials','textures'])assert.equal(row.desktop?disposal[name]:disposal.live[name],0);
    assert.equal(row.desktop?disposal.cacheSize:disposal.cache,0);
    assert.deepEqual(disposal.plugins,{owners:0,resources:0,cleanups:0,pending:0});
    return {applicability:'applicable',disposition:'partial',
      updateDisposal:{disposition:'inspected',outcome:'bounded-three-update-plateau-and-disposal',
        evidence:{logs:dividerLifetimeReceipts,cohort:dividerKey(entry),snapshots:samples.length,
          live:samples[0].live,tracked:samples[0].tracked,disposal}},
      remaining:['historical compensation disposition','late completion/remount/peer isolation applicability','current rendering and lifetime validity'],
      boundary:'Retained candidate update/disposal at20 physical contexts joined to24 cases; no retroactive actual-theme/caller provenance or whole-lifetime acceptance.'};
  };
  assert.throws(()=>joinDividerLifetime({...dividerCases[0],profile:'invented'}));
  const badDividerLifetime=structuredClone(dividerLifetimeRows);badDividerLifetime[0].updates[0].live.materials++;
  assert.throws(()=>joinDividerLifetime(dividerCases.find(row=>dividerKey(row)===dividerKey(badDividerLifetime[0])),badDividerLifetime));
  const dividerRasterFile='artifacts/material-parity/divider-retained-text-raster-diagnostic-20261006.log';
  const dividerRasterBytes=readFileSync(dividerRasterFile),dividerRasterSha256=hash(dividerRasterBytes);
  assert.equal(dividerRasterSha256,'2fe6c3409840861b93d552ee1fa1acffaa3b7ff1d827fb609224dc2108b21852');
  const dividerRaster=JSON.parse(dividerRasterBytes);assert.equal(dividerRaster.reportSha256,reportSha256);
  const metricFile='tests/material-parity/focused-raster-metrics.mjs';
  assert.equal(hash(readFileSync(metricFile)),dividerRaster.metricSourceSha256);
  const rasterKey=row=>scalarCaseKey({kind:row.kind,family:'divider',profile:row.profile,
    viewport:{id:row.viewport},state:row.state??undefined});
  assert.equal(dividerRaster.rows.length,48);
  assert.deepEqual([...new Set(dividerRaster.rows.map(rasterKey))].sort(),dividerCases.map(scalarCaseKey).sort());
  const joinDividerPaint=(entry,rows=dividerRaster.rows)=>{
    const matching=rows.filter(row=>rasterKey(row)===scalarCaseKey(entry));
    assert.deepEqual(matching.map(row=>row.id).sort(),['divider-above','divider-below']);
    for(const row of matching){
      assert.equal(row.receipts.length,2);
      const images=row.receipts.map((receipt,index)=>{
        const bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
        const image=PNG.sync.read(bytes);assert.deepEqual({width:image.width,height:image.height},row.dimensions[index]);return image;
      });
      assert.deepEqual(evaluateFocusedRaster(images[0],images[1],{minimumSsim:.8}),row.metric);
    }
    return {applicability:'applicable',disposition:'partial',
      storedTextRasters:{disposition:'inspected',outcome:matching.every(row=>row.metric.matches)?'bounded-diagnostic-pass':'bounded-diagnostic-failure',
        evidence:{log:{file:dividerRasterFile,sha256:dividerRasterSha256},
          metric:{file:metricFile,sha256:dividerRaster.metricSourceSha256},
          observations:matching,
          cropProducer:{originalLogicalFile:'tests/material-parity/run-material-parity.mjs',
            recordedSha256:dividerRaster.cropProducerSha256,wholeSourceReceiptReconciled:false}}},
      remaining:['separator/clipping/antialiasing and complete owner paint attribution','original crop-producer and current rendering applicability'],
      boundary:'Exact stored crop/metric replay at existing diagnostic threshold,not configured acceptance,equal typography,page placement or full rendering causality. Original crop-producer receipt remains unresolved.'};
  };
  const firstDivider=dividerCases[0],firstRasterRows=dividerRaster.rows.filter(row=>rasterKey(row)===scalarCaseKey(firstDivider));
  assert.throws(()=>joinDividerPaint(firstDivider,firstRasterRows.slice(1)));
  const badDividerRaster=structuredClone(firstRasterRows);badDividerRaster[0].metric.similarity+=.01;
  assert.throws(()=>joinDividerPaint(firstDivider,badDividerRaster));
  assert.equal(dividerRaster.rows.filter(row=>row.metric.matches).length,40);
  assert.equal(dividerRaster.rows.filter(row=>!row.metric.matches).length,8);
  assert.equal(dividerRaster.rows.filter(row=>row.metric.sharpness.meetsTarget).length,48);
  const sourcePolicyFile='tests/material-parity/input-equivalence-policy.mjs';
  const globalSourceRows=queryFindings(working,'global',pointer).filter(row=>row.evidence.section==='sourceFindings');
  const globalSourceShard=index.shards.find(row=>row.file==='sourceFindings-global.jsonl');assert.ok(globalSourceShard);
  const dividerSourceDefinitions=['fixture-divider-replaces-paragraph-flow-with-coordinates','core-empty-block-retains-parent-content-height'].map(id=>{
    const definition=sourceAuditDefinitions.find(row=>row.id===id);assert.ok(definition);
    const matches=globalSourceRows.filter(row=>row.classification===definition.classification && row.justification===definition.justification);
    assert.equal(matches.length,1);const source=readFileSync(definition.file);assert.match(source.toString(),new RegExp(definition.pattern));
    return {definitionId:id,findingId:matches[0].id,classification:definition.classification,owner:definition.owner,
      source:{file:definition.file,sha256:hash(source)}};
  });
  const dividerHistoryRevision='fcde1b7dd2f5622599283ea80f8f920bd45243d2';
  const dividerHistory=execFileSync('git',['diff',`${dividerHistoryRevision}^`,dividerHistoryRevision,'--',dividerSourceDefinitions[0].source.file],{encoding:'utf8'});
  assert.match(dividerHistory,/^\+[^\n]*selector: '\.divider-copy', position: 'absolute'/m);
  assert.match(dividerHistory,/^-[^\n]*selector: '\.divider', position: 'absolute'/m);
  const reductionReceipts=[
    ['16149d2bb8620888a2e48a80c905c8227adafc3ff11269287119f5efda9f4577','8a82dc61c5ca4ab78cc3ca705a4e26ea66fea535df058bde66f611371c5529cd'],
    ['3a56c17d045a31afdd5eb4d5aa5c390acf9517c0523cf1e0b902513b9fe9c487','92ccccabed50a16e842a937c7bd7592e2cb78ab6465c564d22c9ec99e92f1917'],
  ];
  const dividerCoreReductions=[1,2].map(dpr=>{
    const dir=`artifacts/material-parity/divider-context-verified-angular-20261013-dpr${dpr}`;
    const resultBytes=readFileSync(`${dir}/result.json`),provenanceBytes=readFileSync(`${dir}/provenance.json`);
    assert.equal(hash(resultBytes),reductionReceipts[dpr-1][0]);assert.equal(hash(provenanceBytes),reductionReceipts[dpr-1][1]);
    const result=JSON.parse(resultBytes),provenance=JSON.parse(provenanceBytes);
    assert.equal(result.runtimeContext.initial.devicePixelRatio,dpr);
    assert.equal(result.runtimeContext.final.devicePixelRatio,dpr);assert.deepEqual(result.errors,[]);
    const executed=result.result.results.filter(row=>row.status!=='excluded');assert.equal(executed.length,1);
    assert.equal(executed[0].status,'failed');assert.equal(executed[0].failures.length,4);
    assert.ok(executed[0].failures.every(message=>message.endsWith('Expected 301 to be less than 0.5.')));
    const core=provenance.compiledReceipts.find(row=>row.source===dividerSourceDefinitions[1].source.file);assert.ok(core);
    assert.equal(core.sourceSha256,dividerSourceDefinitions[1].source.sha256);
    return {result:{file:`${dir}/result.json`,sha256:hash(resultBytes)},
      provenance:{file:`${dir}/provenance.json`,sha256:hash(provenanceBytes)},runtimeContext:result.runtimeContext,
      outcome:'inspected-failure',failures:executed[0].failures};
  });
  const joinDividerHistory=entry=>{
    const paragraphs=[],separators={};
    for(const side of ['reference','astylar']){
      const tree=JSON.parse(readFileSync(entry.inputTrees[side].file));
      const id=node=>side==='reference'?node.attributes?.id:node.authored?.id;
      for(const name of ['divider-above','divider-below']){
        const label=tree.nodes.find(node=>id(node)===name);assert.ok(label);
        const parent=tree.nodes.find(node=>node.key===label.parent);assert.ok(parent);
        assert.equal(side==='reference'?parent.type:parent.authored.type,'p');
        const style=side==='reference'?tree.styles[parent.style]:parent.resolvedStyle;
        assert.equal(style.position,side==='reference'?'static':'absolute');
        paragraphs.push({side,id:name,stage:side==='reference'?'browser-computed':'candidate-resolved',
          position:style.position,marginTop:style.marginTop,marginBottom:style.marginBottom,height:style.height});
      }
      const separator=tree.nodes.find(node=>id(node)==='divider-primary');assert.ok(separator);
      const style=side==='reference'?tree.styles[separator.style]:separator.resolvedStyle;
      assert.equal(style.position,side==='reference'?'static':'absolute');
      if(side==='reference')assert.equal(style.borderTopWidth,'1px');
      separators[side]={position:style.position,borderTopWidth:style.borderTopWidth,height:style.height,background:style.background};
    }
    return {...joinDividerLifetime(entry),documentedCoordinateCompensation:{disposition:'inspected',
      classification:'application-plugin-authoring-defect',
      evidence:{policy:{file:sourcePolicyFile,sha256:hash(readFileSync(sourcePolicyFile))},
        sourceFindings:{file:`${generation}/${globalSourceShard.file}`,sha256:globalSourceShard.sha256},
        definitions:dividerSourceDefinitions,history:{revision:dividerHistoryRevision,patchSha256:hash(dividerHistory),
          boundary:'This revision positions paragraph wrappers; separator was already absolute before it.'},
        caseInputs:{case:scalarCaseKey(entry),paragraphs,separators},publicCoreReductions:dividerCoreReductions,
        capturedRunner:{file:'docs/evidence/material-overlay-context-runner.mjs.b64',
          sha256:hash(readFileSync('docs/evidence/material-overlay-context-runner.mjs.b64'))}},
      implementationOrder:'Fix general empty non-replaced auto-height/block-flow rule before replacing divider coordinate tables with reference paragraph flow; do not retune offsets.',
      boundary:'Exact case input mismatch and documented history plus separate observed-DPR public core failure. The reduction is not each compensated fixture or complete paint/currentness acceptance.'}};
  };
  assert.throws(()=>joinDividerHistory({...firstDivider,inputTrees:cases.find(row=>row.family==='table').inputTrees}));
  const caseObligations = cases.map(row => ({
    case: `${row.kind}:${row.family}@${row.profile}/${row.viewport.id}${row.state ? `/${row.state}` : ''}`,
    family: row.family,
    inspection: 'partial', currentRendering: 'unverified',
    evidence: { report: 'artifacts/material-parity/current-full-20261005/latest-report.json',
      reportSha256, pairedTrees: row.inputTrees },
    obligations: {
      authoredActivation: { applicability: 'not-applicable', disposition: 'inspected-authored-exclusion' },
      authoredEditing: { applicability: 'not-applicable', disposition: 'inspected-authored-exclusion' },
      programmaticFocus: progressFocus.has(identity(row,row.kind)) ? joinFocus(row) :
        { applicability:'not-applicable',disposition:'inspected-authored-exclusion' },
      inputStyleStructure: joinScalarInputs(row),
      localPaint: row.family==='divider'?joinDividerPaint(row):{ applicability: 'applicable', disposition: 'evidence-join-pending' },
      semantics: joinSemantics(row),
      historyOwnership: row.family==='divider'?joinDividerHistory(row):{ applicability: 'applicable', disposition: 'evidence-join-pending' },
      sourceCurrentness: { applicability: 'applicable', disposition: 'evidence-join-pending' },
    },
  }));
  assert.equal(new Set(caseObligations.map(row => row.case)).size,354);
  assert.equal(caseObligations.filter(row => row.obligations.programmaticFocus.applicability === 'applicable').length,40);
  assert.ok(caseObligations.every(row => row.inspection === 'partial' && row.currentRendering === 'unverified'));
  assert.equal(caseObligations.filter(row=>row.obligations.inputStyleStructure.reportedScalarInputs.disposition==='inspected').length,354);
  const configuredByKey=new Map(allConfigured.map(row=>[scalarCaseKey(row),row]));
  const remainingCases=allCases.filter(row=>!families.has(row.family));assert.equal(remainingCases.length,1957);
  const {readRetainedSortFocusSource}=await import('./position-composition-producer-transition.mjs');
  const keyboardSource=readRetainedSortFocusSource();assert.equal(hash(keyboardSource),'65d7256f859a0839cdf6364d8f3d4e2b81bdb32978c42e0afeaa27f2622e14ce');
  const keyboardAst=ts.createSourceFile('retained-keyboard.mjs',keyboardSource.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const keyboardDefinition=sourceAuditDefinitions.find(row=>row.id==='fixture-composite-keyboard-handler-omits-activation-and-navigation');assert.ok(keyboardDefinition);
  assert.match(readFileSync(keyboardDefinition.file,'utf8'),new RegExp(keyboardDefinition.pattern));
  const keyboardFinding=globalSourceRows.filter(row=>row.justification===keyboardDefinition.justification&&row.classification===keyboardDefinition.classification);
  assert.equal(keyboardFinding.length,1);
  const keyboardCases=new Map();
  for(const [name,sha256,prefix,callbackSha256]of [
    ['checkbox','9fb29baf50ee27759c826afa7c96f0361b0cc799f678e10823fe400c53dc2f68','checkbox real Tab','d42698938cc724c6449af00221a0800f3cf9533726ce093f0e1b4cf567649dcb'],
    ['radio','b37926dfdb29d300f4f41c2f9e131abbc02915e764c280124a061e63e04c00a2','radio real Tab','98d666dd21a54fd82b348af9d125822c96ea0232257b4c0bfadba518b78605af'],
    ['composite','882520cd1db88aa6638a08ae2d2d7e3c2e3f95cd9b71492ba4ae33241f243d91','composite controls expose','8140788192c3cbee5f9f642b49cbeaebc965ea61229bb8c5044400b4c2b1bcc0'],
  ]){
    const file=`artifacts/material-parity/${name}-configured-keyboard-cohorts-20261007.log`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const rows=bytes.toString().trim().split(/\r?\n/).map(JSON.parse);assert.equal(rows.length,10);
    const header=rows.shift(),terminal=rows.pop();assert.equal(header.helperSha256,hash(keyboardSource));
    assert.equal(header.reportSha256,reportSha256);assert.equal(header.checkpointSha256,hash(historicalManifestBytes));
    assert.equal(terminal.complete,true);assert.equal(terminal.acceptance,false);
    if(name!=='checkbox')assert.equal(header.originalCallbackSha256,callbackSha256);
    const calls=keyboardAst.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
      &&node.expression.arguments[0]?.text?.startsWith(prefix));assert.equal(calls.length,1);
    const callback=calls[0].expression.arguments[1];assert.equal(hash(callback.getText(keyboardAst)),callbackSha256);
    const body=callback.body.statements[0].expression.expression.arguments[0].body;
    const start=body.statements.findIndex(node=>node.getText(keyboardAst).startsWith('assert.equal(browser.version()'));assert.ok(start>=0);
    const replay=Function('assert','observations','browser',body.statements.slice(start).map(node=>node.getText(keyboardAst)).join('\n'));
    const replayRecord=record=>{
      const observed=name==='checkbox'?record.observed:record.observations;let projected=observed;
      if(name==='checkbox')projected=Object.fromEntries(['reference','astylar'].map(side=>{
        assert.equal(observed[side].steps.length,2);assert.equal(observed[side].steps[0].focused,true);
        assert.equal(observed[side].steps[0].selected,true);
        return [side,{...observed[side].steps[1],appEvents:observed[side].events,errors:observed[side].errors}];
      }));
      replay(assert,projected,{version:()=> '154.0.8037.58'});return observed;
    };
    for(const row of rows){
      const observations=replayRecord(row);
      for(const family of name==='composite'?['chips','slide-toggle','expansion']:[name]){
        const caseId=scalarCaseKey({kind:'interaction',family,profile:row.profile,viewport:row.viewport,state:'focus'});
        assert.ok(configuredByKey.has(caseId));assert.ok(!keyboardCases.has(caseId));
        keyboardCases.set(caseId,{applicability:'applicable',disposition:'partial',
          supplementaryKeyboard:{disposition:'inspected-failure',classification:'application-plugin-authoring-defect',
            evidence:{log:{file,sha256},cohort:{profile:row.profile,viewport:row.viewport},callbackSha256,
              helper:{originalLogicalFile:'tests/material-parity/sort-focus-structure.spec.mjs',restoredSha256:hash(keyboardSource)},
              currentHelper:{file:'tests/material-parity/sort-focus-structure.spec.mjs',sha256:hash(readFileSync('tests/material-parity/sort-focus-structure.spec.mjs'))},
              sourceFinding:{definitionId:keyboardDefinition.id,findingId:keyboardFinding[0].id,
                policy:{file:sourcePolicyFile,sha256:hash(readFileSync(sourcePolicyFile))},
                shard:{file:`${generation}/${globalSourceShard.file}`,sha256:globalSourceShard.sha256}},
              currentInputSource:sourceApplicability[0],observations:name==='composite'?observations[family]:observations},
            boundary:'Original assertion replay and supplementary real-key cohort,not the original configured focus action,paint,event completeness or current rendering.'},
          remaining:['other keys and pointer activation boundaries','complete input/state mapping and current rendering applicability']});
      }
    }
    const applicable=name==='composite'?['chips','slide-toggle','expansion']:[name];
    assert.deepEqual([...keyboardCases.keys()].filter(key=>applicable.some(f=>key.startsWith(`interaction:${f}@`))).sort(),
      allConfigured.filter(row=>applicable.includes(row.family)&&row.state==='focus').map(scalarCaseKey).sort());
    if(name==='checkbox'){
      const altered=structuredClone(rows[0]);altered.observed.astylar.steps[1].selected=false;
      assert.throws(()=>replayRecord(altered));
    }
  }
  assert.equal(keyboardCases.size,40);
  const extendedKeyboardCases=new Map();
  for(const [name,sha256,coveredFamilies]of [
    ['tree-button','92ebadea90cf4edd9859f18b10a6e5cd1fcedd3ed605cc493f31259c2401d295',['tree','core','toolbar','card']],
    ['sort','bf65224f4943984f8eb566ee0394884d468390a3f0eb02e5849c132d5605d48c',['sort']],
    ['selection','b847251ebb28ef35b917e63b6872fd5fdfb4db83d7e9234e237280f73d58c383',['button-toggle','tabs','stepper']],
    ['editable-popup','c4ef715b176983c9ac70f4429174b2261f025ce9b00d8910bfff97de9e9e887b',['autocomplete','timepicker','datepicker']],
    ['select','c928475b1e311c3740c78d18f8f5d8b3d3b1f0783810c842e5bb974e47c8e9d9',['select']],
    ['slider','018ef179645fceaca584d2e79ca6e99d5698f7eff1a1c53e571bc96922092a0c',['slider']],
    ['paginator','86d2b373c65f15df920e212563ea3c3799fc3851c5c42a114edc818ef641622d',['paginator']],
    ['modal','b2e0b89df181a5189fda3140a79c779586b93a4f5cc641dec4d6944094b2d984',['dialog','bottom-sheet']],
  ]){
    const file=`artifacts/material-parity/${name}-configured-keyboard-cohorts-20261007.log`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const rows=bytes.toString().trim().split(/\r?\n/).map(JSON.parse);assert.equal(rows.length,10);
    const header=rows.shift(),terminal=rows.pop();assert.equal(header.helperSha256,hash(keyboardSource));
    assert.equal(header.reportSha256,reportSha256);assert.equal(header.checkpointSha256,hash(historicalManifestBytes));
    assert.equal(terminal.complete,true);assert.equal(terminal.acceptance,false);
    const calls=keyboardAst.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
      &&node.expression.arguments[1]&&hash(node.expression.arguments[1].getText(keyboardAst))===header.originalCallbackSha256);
    assert.equal(calls.length,1);const callback=calls[0].expression.arguments[1],outer=callback.body.statements;
    const invocation=outer.findIndex(node=>node.getText(keyboardAst).startsWith('await withFrozenShowcase'));assert.ok(invocation>=0);
    const extraSources=[];
    for(const [source,expectedHash]of name==='paginator'?[[ 'node_modules/@angular/material/fesm2022/paginator.mjs',header.materialSourceSha256 ]]:
      name==='modal'?[[ 'src/lib/astylar-interaction-runtime.ts',header.currentRuntimeSourceSha256 ]]:[]){
      assert.equal(hash(readFileSync(source)),expectedHash);extraSources.push({file:source,sha256:expectedHash});
    }
    Function('assert','readFileSync',outer.slice(0,invocation).map(node=>node.getText(keyboardAst)).join('\n'))(assert,readFileSync);
    const body=outer[invocation].expression.expression.arguments[0].body;
    const marker=name==='modal'?'t.diagnostic(JSON.stringify(observations))':'assert.equal(browser.version()';
    const start=body.statements.findIndex(node=>node.getText(keyboardAst).startsWith(marker));assert.ok(start>=0);
    const replay=Function('assert','observations','browser',body.statements.slice(start+(name==='modal'?1:0))
      .map(node=>node.getText(keyboardAst)).join('\n'));
    for(const row of rows){
      replay(assert,row.observations,{version:()=> '154.0.8037.58'});
      for(const family of coveredFamilies){
        const caseId=scalarCaseKey({kind:'interaction',family,profile:row.profile,viewport:row.viewport,state:'focus'});
        assert.ok(configuredByKey.has(caseId));assert.ok(!extendedKeyboardCases.has(caseId));
        extendedKeyboardCases.set(caseId,{applicability:'applicable',disposition:'partial',
          supplementaryKeyboard:{disposition:'inspected',outcome:'original-asserted-boundaries-with-agreements-and-failures',
            evidence:{log:{file,sha256},callbackSha256:header.originalCallbackSha256,cohort:{profile:row.profile,viewport:row.viewport},
              currentInputSource:sourceApplicability[0],extraSources,
              currentHelper:{file:'tests/material-parity/sort-focus-structure.spec.mjs',sha256:hash(readFileSync('tests/material-parity/sort-focus-structure.spec.mjs'))},
              helper:{originalLogicalFile:'tests/material-parity/sort-focus-structure.spec.mjs',restoredSha256:hash(keyboardSource)},
              observations:row.observations[family]??row.observations},
            boundary:'Supplementary real-key physical cohort with every original source preamble/runtime assertion preserved. Agreements and failures stay in their own observations; not original focus-action equivalence or current rendering.'},
          remaining:['other applicable keys/action boundaries and local paint','complete input/state/semantic mapping and current rendering applicability']});
      }
    }
    assert.deepEqual([...extendedKeyboardCases.keys()].filter(key=>coveredFamilies.some(f=>key.startsWith(`interaction:${f}@`))).sort(),
      allConfigured.filter(row=>coveredFamilies.includes(row.family)&&row.state==='focus').map(scalarCaseKey).sort());
  }
  assert.equal(extendedKeyboardCases.size,128);
  const textInputTypes=new Set(['text','search','tel','url','email','password','number','date','datetime-local','month','week','time']);
  const nonTextInputTypes=new Set(['checkbox','radio','range','color','file','hidden','button','submit','reset','image']);
  const editingTargets=(tree,side)=>tree.nodes.flatMap(node=>{
    const authored=side==='reference'?node.attributes??{}:node.authored??{};
    const type=side==='reference'?node.type:authored.type;
    for(const alias of ['readOnly','contentEditable'])assert.equal(Object.hasOwn(authored,alias),false,'Use exact public attribute names');
    if(side==='astylar')for(const flag of ['disabled','readonly','contenteditable'])
      if(Object.hasOwn(authored,flag))assert.equal(typeof authored[flag],'boolean');
    const inputType=type==='input'?(side==='reference'?authored.type:authored.inputType)??'text':undefined;
    if(inputType!==undefined)assert.ok(textInputTypes.has(inputType)||nonTextInputTypes.has(inputType),'Unreviewed input type');
    const editable=authored.contenteditable;
    if(side==='reference'&&editable!==undefined)assert.ok(['','true','false','plaintext-only'].includes(editable),'Inherited/unknown editing needs a separate disposition');
    const explicitEditable=side==='reference'?['','true','plaintext-only'].includes(editable):editable===true;
    if(type!=='textarea'&&!textInputTypes.has(inputType)&&!explicitEditable)return [];
    return [{key:node.key,id:authored.id,type,inputType:inputType??null,
      disabled:side==='reference'?Object.hasOwn(authored,'disabled'):authored.disabled===true,
      readonly:side==='reference'?Object.hasOwn(authored,'readonly'):authored.readonly===true}];
  });
  const joinEditingTargets=(row,trees)=>{
    const targets=Object.fromEntries(['reference','astylar'].map(side=>[side,editingTargets(trees[side],side)]));
    const writable=side=>targets[side].some(target=>!target.disabled&&!target.readonly);
    assert.equal(writable('reference'),writable('astylar'),'One-sided editing applicability needs explicit review');
    const applicable=writable('reference');
    return {applicability:applicable?'applicable':'not-applicable',disposition:'partial',
      retainedTargetApplicability:{disposition:'inspected',case:scalarCaseKey(row),
        classification:applicable?'both-writable-targets':'neither-writable-targets',targets,
        evidence:row.inputTrees},
      remaining:applicable?['editing/caret/selection behavior and paint','source/currentness applicability']:
        ['source-wide and uncaptured-state applicability','disabled/readonly behavior where applicable'],
      boundary:'Explicit retained state/target attributes only. No editing behavior,current rendering or whole-case closure. Readonly selection/copy,keyboard control navigation,value changes and focus remain separate obligations.'};
  };
  const editingCounts={writable:0,notWritable:0,disabledText:0,readonlySelect:0};
  let additionalTreeReceipts=0;
  const pending=()=>({applicability:'unverified',disposition:'evidence-join-pending'});
  const configuredInputFocusCases=new Map();
  {
  const focusFile='artifacts/material-parity/configured-input-focus-20261008/latest-report.json';
  const focusBytes=readFileSync(focusFile);
  assert.equal(hash(focusBytes),'423b25877eef3b17418a9849a0059dd101015704462a3097ed6f8761e65db584');
  const focusCapture=JSON.parse(focusBytes);
  const focusManifestBytes=readFileSync(focusCapture.capture.checkpointManifest.file);
  assert.equal(hash(focusManifestBytes),focusCapture.capture.checkpointManifest.sha256);
  assert.equal(focusCapture.actionSource.sha256,'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  const focusFamilies=['form-field','input','autocomplete','datepicker','timepicker'];
  for(const c of allConfigured.filter(c=>c.kind==='interaction'&&c.state==='focus'&&focusFamilies.includes(c.family))){
    const samples=focusCapture.results.filter(row=>row.caseId===materialCaseKey('interaction',c));
    assert.deepEqual(samples.map(row=>row.sample),[0,1,2,3,4,5]);
    const observations=samples.map(row=>{
      assert.equal(row.family,c.family);assert.equal(row.profile,c.profile);assert.deepEqual(row.viewport,c.viewport);
      assert.equal(row.action,row.sample?'wait 125ms':'original configured focus action');
      for(const side of ['reference','astylar'])assert.equal(hash(readFileSync(row[side].inputTree.file)),row[side].inputTree.sha256);
      return {sample:row.sample,action:row.action,reference:row.reference.observation.control,
        astylar:row.astylar.observation.control,pairedTrees:{reference:row.reference.inputTree,astylar:row.astylar.inputTree}};
    });
    configuredInputFocusCases.set(scalarCaseKey(c),{applicability:'applicable',disposition:'partial',
      retainedObservation:{disposition:'recorded-provenance-incomplete',evidence:{file:focusFile,sha256:hash(focusBytes),
        checkpointManifest:focusCapture.capture.checkpointManifest,
        unavailableActionSource:{originalLogicalFile:focusCapture.actionSource.file,capturedSha256:focusCapture.actionSource.sha256,
          focusBodySha256:focusCapture.actionSource.focusBodySha256,themeBodySha256:focusCapture.actionSource.themeBodySha256,
          disposition:'missing-original-bytes-not-a-readable-receipt'}},observations},
      sourceCurrentness:{disposition:'unverified',missing:'Exact captured e01ef9dc whole runner bytes; bounded recovery already exhausted.',
        currentRunner:{file:focusCapture.actionSource.file,sha256:hash(readFileSync(focusCapture.actionSource.file))}},
      remaining:['Original owning source/behavior/paint assertions with complete runner provenance','Current rendering applicability and other action boundaries'],
      boundary:'Exact configured identity and recorded control/tree chronology only. Does not replay the original owning proof,validate complete capture provenance,accept pixels or close focus/editing behavior.'});
  }
  assert.equal(configuredInputFocusCases.size,40);assert.equal(focusCapture.results.length,240);
  assert.deepEqual([...new Set(focusCapture.results.map(row=>row.caseId))].sort(),
    allConfigured.filter(c=>c.kind==='interaction'&&c.state==='focus'&&focusFamilies.includes(c.family)).map(c=>materialCaseKey('interaction',c)).sort());
  }
  const additionalObligations=remainingCases.map(row=>{
    const caseId=scalarCaseKey(row),configured=configuredByKey.get(caseId);assert.ok(configured);
    assert.deepEqual(row.viewport,configured.viewport);
    const nodeCounts={},trees={};
    for(const side of ['reference','astylar']){
      const receipt=row.inputTrees[side],bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
      const tree=JSON.parse(bytes);assert.deepEqual(tree.errors,[]);assert.ok(Array.isArray(tree.nodes)&&tree.nodes.length>0);
      assert.equal(new Set(tree.nodes.map(node=>node.key)).size,tree.nodes.length);
      trees[side]=tree;
      nodeCounts[side]=tree.nodes.length;additionalTreeReceipts++;
    }
    const editing=joinEditingTargets(row,trees);
    if(editing.applicability==='applicable')editingCounts.writable++;else editingCounts.notWritable++;
    const targets=editing.retainedTargetApplicability.targets;
    if(row.family==='select'){
      assert.equal(targets.reference.length,0);assert.equal(targets.astylar.length,1);
      assert.equal(targets.astylar[0].readonly,true);editingCounts.readonlySelect++;
      if(row.kind==='static'&&row.profile==='light'&&row.viewport.id==='desktop'){
        const forged=structuredClone(trees);forged.astylar.nodes.find(node=>node.authored?.id==='select-control').authored.readonly=false;
        assert.throws(()=>joinEditingTargets(row,forged));
        const misspelled=structuredClone(trees);const control=misspelled.astylar.nodes.find(node=>node.authored?.id==='select-control');
        control.authored.readOnly=true;assert.throws(()=>joinEditingTargets(row,misspelled));
      }
    }else if(targets.reference.length&&editing.applicability==='not-applicable'){
      assert.equal(row.state,'disabled');assert.ok(targets.reference.every(target=>target.disabled));
      assert.ok(targets.astylar.every(target=>target.disabled));editingCounts.disabledText++;
      if(row.family==='input'&&row.profile==='light'&&row.viewport.id==='desktop-dpr1'){
        const forged=structuredClone(trees);forged.astylar.nodes.find(node=>node.authored?.id==='input-control').authored.disabled=false;
        assert.throws(()=>joinEditingTargets(row,forged));
      }
    }
    return {case:caseId,family:row.family,inspection:'partial',currentRendering:'unverified',
      evidence:{report:'artifacts/material-parity/current-full-20261005/latest-report.json',reportSha256,pairedTrees:row.inputTrees},
      pairedTreeAuthentication:{disposition:'authenticated',nodeCounts,
        boundary:'Exact capture receipts and node identity only; not structure,input equality,control applicability or current rendering.'},
      obligations:{authoredActivation:keyboardCases.get(caseId)??pending(),authoredEditing:editing,programmaticFocus:configuredInputFocusCases.get(caseId)??pending(),
        inputStyleStructure:joinScalarInputs(row),localPaint:pending(),semantics:pending(),historyOwnership:pending(),sourceCurrentness:pending(),
        ...(extendedKeyboardCases.has(caseId)?{keyboardInteraction:extendedKeyboardCases.get(caseId)}:{})}};
  });
  assert.equal(additionalTreeReceipts,3914);
  assert.deepEqual(editingCounts,{writable:443,notWritable:1514,disabledText:40,readonlySelect:94});
  const defaultInput={nodes:[{key:'default',type:'input',attributes:{},authored:{type:'input'}}]};
  for(const side of ['reference','astylar'])assert.equal(editingTargets(defaultInput,side)[0].inputType,'text');
  const booleanReadonly={nodes:[{key:'readonly',type:'input',attributes:{readonly:'false'}}]};
  assert.equal(editingTargets(booleanReadonly,'reference')[0].readonly,true,'HTML boolean attribute presence is authoritative');
  const allObligations=[...caseObligations,...additionalObligations];
  // Reuse the exact supplementary action receipts above, without equating real
  // keyboard navigation with the original configured programmatic-focus action.
  const supplementaryFocusCounts={joined:0,previouslyPending:0,existingPartial:0};
  const focusFields=['focused','focus','focusIndex','focusText','kind','inside'];
  const projectSupplementaryFocus=observations=>Object.fromEntries(['reference','astylar'].map(side=>{
    const steps=Array.isArray(observations[side])?observations[side]:observations[side]?.steps;
    assert.ok(Array.isArray(steps)&&steps.length>0,'Missing paired supplementary action sequence');
    return [side,steps.map((step,index)=>{
      const focus=Object.fromEntries(focusFields.filter(field=>Object.hasOwn(step,field)).map(field=>[field,step[field]]));
      assert.ok(['focused','focus','focusIndex'].some(field=>Object.hasOwn(focus,field)),
        'Kind/text alone must not become a named-control focus observation');
      return {index,...(Object.hasOwn(step,'key')?{key:step.key}:{}),
        ...(Object.hasOwn(step,'action')?{action:step.action}:{}),
        ...(Object.hasOwn(step,'boundary')?{boundary:step.boundary}:{}),focus};
    })];
  }));
  const focusModes=family=>family==='sort'?'reference-trigger-containment-versus-candidate-logical-id':
    ['button-toggle','tabs','stepper'].includes(family)?'ordered-role-option-active-element-index':
    family==='slider'?'declared-two-input-active-element-index':
    ['checkbox','select','autocomplete','datepicker','timepicker'].includes(family)?'direct-target-active-element-equality':
    family==='radio'?'reference-input-value-versus-candidate-logical-choice-id':
    'active-element-identity-with-source-specific-fallbacks';
  for(const record of allObligations){
    const source=extendedKeyboardCases.get(record.case)??
      (['checkbox','radio'].includes(record.family)?keyboardCases.get(record.case):undefined);
    if(!source)continue;
    const supplementary=source.supplementaryKeyboard;
    assert.ok(supplementary?.evidence?.observations);
    const observations=projectSupplementaryFocus(supplementary.evidence.observations);
    const previous=record.obligations.programmaticFocus;
    assert.ok(['evidence-join-pending','partial'].includes(previous.disposition));
    supplementaryFocusCounts[previous.disposition==='evidence-join-pending'?'previouslyPending':'existingPartial']++;
    supplementaryFocusCounts.joined++;
    record.obligations.programmaticFocus={...previous,applicability:'applicable',disposition:'partial',
      supplementaryKeyboardFocus:{disposition:'inspected',observationMode:focusModes(record.family),
        originalOutcome:supplementary.outcome??supplementary.disposition,
        evidence:supplementary.evidence,observations,
        boundary:'Exact supplementary keyboard cohort and original assertion replay only. Focus field meanings differ by source; IDs,text fallbacks,indices,containment and equality are not normalized into agreement. Not equivalence to the configured focus action,all focus owners,paint,current rendering or whole-case closure.'},
      remaining:[...(previous.remaining??[]),'Original configured focus action and other applicable focus/restoration boundaries',
        'Focus paint and complete source/runtime currentness']};
  }
  assert.deepEqual(supplementaryFocusCounts,{joined:144,previouslyPending:120,existingPartial:24});
  const checkboxFocus=allObligations.find(row=>row.family==='checkbox'&&row.obligations.programmaticFocus.supplementaryKeyboardFocus)
    .obligations.programmaticFocus.supplementaryKeyboardFocus;
  const missingFocus=structuredClone(checkboxFocus.evidence.observations);
  delete missingFocus.astylar.steps[0].focused;
  assert.throws(()=>projectSupplementaryFocus(missingFocus),'Kind alone cannot stand in for target equality');
  assert.ok(allObligations.filter(row=>['chips','slide-toggle','expansion'].includes(row.family))
    .every(row=>!row.obligations.programmaticFocus.supplementaryKeyboardFocus),'Do not promote tag/role-only composite observations');
  const paintCensusFile='artifacts/material-parity/configured-paint-observability-20261008.log';
  const paintCensusBytes=readFileSync(paintCensusFile);
  assert.equal(hash(paintCensusBytes),'457aa9e78a62ef95cb2ada20dab942c66cfcba66aa7d9109a15a0acf1bbd45ca');
  const paintCensus=JSON.parse(paintCensusBytes);
  const paintIdentities=new Set(paintCensus.families.flatMap(row=>row.measuredRasterCases));
  assert.equal(paintIdentities.size,1000);
  const paintConfigFile='tests/material-parity/benchmark.config.mjs',paintMetricFile='tests/material-parity/focused-raster-metrics.mjs';
  const paintConfigSha=hash(readFileSync(paintConfigFile)),paintMetricSha=hash(readFileSync(paintMetricFile));
  assert.equal(paintConfigSha,'a55e95abe098be26d6a99e3faab22a951ae140143fece8701726a23624b98535');
  assert.equal(paintMetricSha,'c84839968d5ba77534a0af4d56f31f187cd941e607a8418959a1b0771f92e1e0');
  const paintCaseRows=new Map(allCases.map(row=>[scalarCaseKey(row),row]));
  const paintCounts={static:0,interaction:0,ssimPassSharpnessDiagnosticFail:0};
  const paintCheckpoint=openMaterialCheckpoint({directory:'artifacts/material-parity/current-full-20261005',provenance:captured.captureProvenance,resume:true});
  const paintMetricGraph=fingerprintModuleGraph(process.cwd(),paintMetricFile);
  const paintPixelCounts={cases:0,pngs:0,ssimFailures:0,sharpnessFailures:0};
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);assert.ok(row);
    const measured=(row.focusedRasters??[]).filter(raster=>Number.isFinite(raster.similarity));
    assert.equal(measured.length>0,paintIdentities.has(materialCaseKey(row.kind,row)));
    if(!measured.length)continue;
    assert.equal(measured.length,1);
    const raster=measured[0];
    const target=row.kind==='static'?materialFocusedRasterTargets[row.family]:materialInteractionFocusedRasterTargets[row.family];
    assert.ok(target);assert.equal(raster.id,target.element);
    assert.equal(raster.minimumSsim,target.minimumSsim??.80);
    if(row.kind==='interaction'){
      assert.ok(!target.states||target.states.includes(row.state));
      assert.ok(!target.viewports||target.viewports.includes(row.viewport.id));
    }
    assert.equal(raster.matches,raster.similarity>=raster.minimumSsim);
    assert.equal(typeof raster.sharpness.meetsTarget,'boolean');
    if(raster.matches&&!raster.sharpness.meetsTarget)paintCounts.ssimPassSharpnessDiagnosticFail++;
    paintCounts[row.kind]++;
    const {kind,...originalRow}=row;
    assert.deepEqual(paintCheckpoint.load(materialCaseKey(kind,row)),originalRow);
    const cropReceipts={},crops={};
    for(const side of ['reference','astylar']){
      const file=row.inputTrees[side].file.replace(`${side}-input-tree.json`,`${target.element}-raster-${side}.png`);
      const bytes=readFileSync(file);cropReceipts[side]={file,sha256:hash(bytes)};crops[side]=PNG.sync.read(bytes);paintPixelCounts.pngs++;
    }
    const recomputed={id:target.element,...evaluateFocusedRaster(crops.reference,crops.astylar,target)};
    assert.deepEqual(recomputed,raster,'Every original target-local metric must reproduce from its authenticated saved crops');
    if(paintPixelCounts.cases===0){
      const blank={...crops.astylar,data:Buffer.alloc(crops.astylar.data.length,255)};
      assert.notDeepEqual({id:target.element,...evaluateFocusedRaster(crops.reference,blank,target)},raster);
      const forged=structuredClone(raster);forged.sharpness.meetsTarget=!forged.sharpness.meetsTarget;
      assert.throws(()=>assert.deepEqual(recomputed,forged));
    }
    paintPixelCounts.cases++;paintPixelCounts.ssimFailures+=raster.matches?0:1;
    paintPixelCounts.sharpnessFailures+=raster.sharpness.meetsTarget?0:1;
    const previous=record.obligations.localPaint;
    record.obligations.localPaint={...previous,applicability:'applicable',disposition:'partial',
      retainedTargetRaster:{disposition:'recorded-provenance-incomplete',case:record.case,targetId:raster.id,metrics:raster,
        evidence:{census:{file:paintCensusFile,sha256:hash(paintCensusBytes)},
          report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
          targetConfiguration:{file:paintConfigFile,sha256:paintConfigSha},metricOwner:{file:paintMetricFile,sha256:paintMetricSha}},
        unavailableActionSource:{originalLogicalFile:'tests/material-parity/run-material-parity.mjs',
          capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
        boundary:'Original finite target-local metric records and configured predicates only; no raster recomputation,complete runner provenance,equal input,blur diagnosis,current rendering or whole-case acceptance.'},
      retainedActualTargetRaster:{disposition:'inspected',case:record.case,targetId:target.element,
        metricsEvidence:'localPaint.retainedTargetRaster.metrics',exactMetricReplay:true,
        evidence:{rasters:cropReceipts,metricOwner:{file:paintMetricFile,sha256:paintMetricSha},
          targetConfiguration:{file:paintConfigFile,sha256:paintConfigSha},metricModuleGraph:paintMetricGraph},
        boundary:'Exact recomputation from original checkpoint-authenticated target crops only;original SSIM failures and sharpness diagnostics preserved. Does not recover original runner,prove correct crop-owner/layout provenance,equal inputs,blur cause,current rendering or whole-case closure.'},
      remaining:[...(previous.remaining??[]),'Complete local paint/input/state/currentness disposition beyond recorded metric boundary']};
  }
  assert.deepEqual(paintCounts,{static:120,interaction:880,ssimPassSharpnessDiagnosticFail:343});
  assert.deepEqual(paintPixelCounts,{cases:1000,pngs:2000,ssimFailures:4,sharpnessFailures:347});
  const resourceRunnerFile='tests/material-parity/run-material-parity.mjs';
  const resourceRunnerBytes=readFileSync(resourceRunnerFile);
  const resourcePrior=execFileSync('git',['show',`8aa0e2e5:${resourceRunnerFile}`],{encoding:'utf8',maxBuffer:4_000_000});
  const resourceFunctions=(source,names=['performInteraction','profileTheme','resourceCounts'])=>{
    const ast=ts.createSourceFile('runner.mjs',source.toString().replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    assert.deepEqual(ast.parseDiagnostics,[]);
    return Object.fromEntries(names.map(name=>{
      const functions=ast.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
      assert.equal(functions.length,1);return [name,functions[0].getText(ast)];
    }));
  };
  const resourceMethods=resourceFunctions(resourceRunnerBytes);
  assert.deepEqual(resourceMethods,resourceFunctions(resourcePrior));
  // Reuse the original sampled-pixel predicates, not whole-component paint claims.
  const uniformNames=['compareUniformBackgrounds','sampleFlatColor','colorChannelError'];
  const uniformMethods=resourceFunctions(resourceRunnerBytes,uniformNames);
  assert.deepEqual(uniformMethods,resourceFunctions(resourcePrior,uniformNames));
  assert.deepEqual(uniformNames.map(name=>hash(uniformMethods[name])),[
    'f4e85b0db4eaa684b9aa73adc69078af269028b96fb7241332db4b2b1da89e6d',
    '33ec55ada5c62cbd408483595e50ae6943cf2c7fa70202df8f6181c86c7fd00c',
    'f9a84d5e4ea9ccefa89816193f033d45343421f87fd655c6b097c438c6c272f7']);
  const compareUniform=new Function(`${Object.values(uniformMethods).join('\n')}\nreturn compareUniformBackgrounds;`)();
  const shadowFile='tests/material-parity/shadow-profile-metrics.mjs',shadowBytes=readFileSync(shadowFile);
  assert.equal(hash(shadowBytes),'67393705f380fc19ce76e8eed49e43959ecae116e27b5fb70f6dc276411a8ea6');
  assert.equal(shadowBytes.toString().replaceAll('\r\n','\n'),execFileSync('git',['show',`8aa0e2e5:${shadowFile}`],
    {encoding:'utf8'}).replaceAll('\r\n','\n'));
  const sampledRoot='artifacts/material-parity/current-full-20261005';
  const sampledCheckpoint=openMaterialCheckpoint({directory:sampledRoot,provenance:captured.captureProvenance,resume:true});
  const sampledManifest=`${sampledRoot}/checkpoint/manifest.json`;
  const sampledPaintCounts={cases:0,uniformSamples:0,shadowProfiles:0,originalPNGs:0,negativeControls:0};
  for(const original of captured.results.filter(row=>['grid-list','card'].includes(row.family))){
    const caseId=scalarCaseKey({...original,kind:'static'});
    const record=allObligations.find(row=>row.case===caseId);assert.ok(record);
    const previous=record.obligations.localPaint;
    assert.equal(previous.disposition,'evidence-join-pending');
    const key=materialCaseKey('static',original);
    assert.deepEqual(sampledCheckpoint.load(key),original);
    const directory=`${sampledRoot}/${original.family}/${original.profile}/${original.viewport.id}`;
    const images=['reference','astylar'].map(side=>{
      const file=`${directory}/${side}.png`,bytes=readFileSync(file);
      return {receipt:{file,sha256:hash(bytes)},image:PNG.sync.read(bytes)};
    });
    const boxes=side=>Object.fromEntries(original.geometry.elements.map(row=>[row.id,{borderBox:row[side]}]));
    const referenceBoxes=boxes('expected'),candidateBoxes=boxes('actual');
    const scale=original.viewport.deviceScaleFactor??1;
    let observations,configuration,boundary;
    if(original.family==='grid-list'){
      configuration=materialUniformBackgroundTargets[original.family];assert.ok(configuration);
      observations=compareUniform(images[0].image,images[1].image,referenceBoxes,candidateBoxes,configuration,scale);
      assert.deepEqual(observations,original.uniformBackgrounds);assert.equal(observations.length,2);
      assert.equal(compareUniform(images[0].image,images[1].image,{},candidateBoxes,configuration,scale)[0].matches,false);
      sampledPaintCounts.uniformSamples+=observations.length;
      boundary='One rounded/clamped RGBA sample per container/surface,using each side own boxes;maximum of four pairwise channel errors <=1. Not a uniform region,edge,clipping,equal geometry or whole-component paint proof.';
    }else{
      configuration=materialShadowProfileTargets[original.family];assert.ok(configuration);
      observations=[{id:configuration.element,...compareBottomShadowProfiles(images[0].image,images[1].image,
        referenceBoxes[configuration.element]?.borderBox,candidateBoxes[configuration.element]?.borderBox,
        scale,configuration.maximumRowError)}];
      assert.deepEqual(observations,original.shadowProfiles);assert.equal(observations.length,1);
      assert.equal(compareBottomShadowProfiles(images[0].image,images[1].image,undefined,
        candidateBoxes[configuration.element]?.borderBox,scale,configuration.maximumRowError).matches,false);
      sampledPaintCounts.shadowProfiles+=observations.length;
      boundary='Five bottom-center luminance samples at DPR spacing,contact search within +/-1CSSpx,background8CSSpx below nominal bottom,threshold22;each side own boxes and pixel clamping. Not whole shadow shape,color,elevation layers,equal geometry or whole-component paint proof.';
    }
    const checkpointFile=`${sampledRoot}/checkpoint/${hash(key)}.json`;
    record.obligations.localPaint={...previous,applicability:'applicable',disposition:'partial',
      retainedSampledPixels:{disposition:'recorded-provenance-incomplete',case:caseId,configuration,observations,
        geometry:original.geometry.elements,evidence:{
          report:{file:`${sampledRoot}/latest-report.json`,sha256:reportSha256},
          manifest:{file:sampledManifest,sha256:hash(readFileSync(sampledManifest))},
          checkpoint:{file:checkpointFile,sha256:hash(readFileSync(checkpointFile))},images:images.map(row=>row.receipt),
          targetConfiguration:{file:paintConfigFile,sha256:paintConfigSha},
          currentSamplerSource:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},
          conservedUniformMethodHashes:Object.fromEntries(uniformNames.map(name=>[name,hash(uniformMethods[name])])),
          shadowSampler:{file:shadowFile,sha256:hash(shadowBytes)}},
        unavailableActionSource:{originalLogicalFile:resourceRunnerFile,
          capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
        boundary:`Original PNG measurements reproduce exactly under conserved sampler methods. ${boundary} Not complete runner provenance,current runtime,equal inputs or whole-case acceptance.`},
      remaining:[...(previous.remaining??[]),'Unsampled local paint and complete input/state/source/runtime applicability']};
    sampledPaintCounts.cases++;sampledPaintCounts.originalPNGs+=2;sampledPaintCounts.negativeControls++;
  }
  assert.deepEqual(sampledPaintCounts,{cases:24,uniformSamples:24,shadowProfiles:12,originalPNGs:48,negativeControls:24});
  const resourceCounts=snapshot=>({owners:snapshot.surface?.pluginResources?.owners,
    resources:snapshot.surface?.pluginResources?.resources,cleanups:snapshot.surface?.pluginResources?.cleanups,
    meshes:snapshot.surface?.resources?.meshes,materials:snapshot.surface?.resources?.materials,textures:snapshot.surface?.resources?.textures});
  const joinResourceSamples=row=>{
    assert.equal(row.kind,'interaction');assert.equal(row.resourceSnapshots.length,row.state==='open-dismiss'?3:1);
    const samples=row.resourceSnapshots.map(snapshot=>{
      const counts=resourceCounts(snapshot);
      assert.ok(Object.values(counts).every(value=>Number.isInteger(value)&&value>=0));
      return {counts,sessionStatus:snapshot.surface.session.status,pluginPending:snapshot.surface.pluginResources.pending};
    });
    const stable=samples.every(sample=>sample.sessionStatus==='idle'&&sample.pluginPending===0)&&
      (samples.length<2||JSON.stringify(samples[0].counts)===JSON.stringify(samples.at(-1).counts));
    assert.equal(row.resourcesStable,stable,'Preserve exact recorded tracked-counter gate');
    return {disposition:'recorded-provenance-incomplete',case:scalarCaseKey(row),side:'astylar',samples,
      recordedResourcesStable:row.resourcesStable,
      comparisonBoundary:samples.length===1?'Single snapshot; no repeated-count comparison':'Three snapshots; original gate compares first and last tracked counts only',
      evidence:{report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
        currentRunner:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},
        methodConservation:{revision:'8aa0e2e5',functions:Object.fromEntries(Object.entries(resourceMethods).map(([name,source])=>[name,hash(source)]))}},
      unavailableActionSource:{originalLogicalFile:resourceRunnerFile,capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
      boundary:'Candidate tracked resources/session/plugin observations only; no live scene census,paired lifetime,final disposal,remount,race,whole-runner conservation,current lifetime or whole-case acceptance.'};
  };
  const forgedResourceRow=structuredClone(allCases.find(row=>row.kind==='interaction'));
  forgedResourceRow.resourceSnapshots[0].surface.session.status='pending';
  assert.throws(()=>joinResourceSamples(forgedResourceRow));
  const forgedRepeatedRow=structuredClone(allCases.find(row=>row.kind==='interaction'&&row.state==='open-dismiss'));
  forgedRepeatedRow.resourceSnapshots.at(-1).surface.resources.meshes++;
  assert.throws(()=>joinResourceSamples(forgedRepeatedRow));
  const resourceSampleCounts={single:0,three:0};
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.kind!=='interaction')continue;
    const observation=joinResourceSamples(row);
    resourceSampleCounts[observation.samples.length===1?'single':'three']++;
    const previous=record.obligations.historyOwnership;
    record.obligations.historyOwnership={...previous,applicability:'applicable',disposition:'partial',
      retainedResourceSampling:observation,
      remaining:[...(previous.remaining??[]),'History/compensation ownership plus live resource and disposal/currentness obligations beyond tracked samples']};
  }
  assert.deepEqual(resourceSampleCounts,{single:1857,three:18});
  const semanticMethod=resourceFunctions(resourceRunnerBytes,['compareSemantics']);
  assert.deepEqual(semanticMethod,resourceFunctions(resourcePrior,['compareSemantics']));
  const replaySemanticComparator=new Function(`return (${semanticMethod.compareSemantics});`)();
  const semanticCounts={cases:0,targets:0,recordedFailures:0,absentReferenceTargets:0,choiceValueExclusions:0,activeDescendantPresenceComparisons:0};
  const joinTargetSemantics=row=>{
    assert.ok(Array.isArray(row.semantics)&&row.semantics.length>0);
    assert.equal(new Set(row.semantics.map(target=>target.id)).size,row.semantics.length);
    const reference=Object.fromEntries(row.semantics.map(target=>[target.id,target.expected]));
    const candidate=Object.fromEntries(row.semantics.map(target=>[target.id,target.actual]));
    assert.deepEqual(JSON.parse(JSON.stringify(replaySemanticComparator(reference,candidate))),row.semantics,
      'Replay original serialized DOM attribute comparator without strengthening or weakening its gate');
    return {disposition:'recorded-provenance-incomplete',case:scalarCaseKey(row),targets:row.semantics,
      evidence:{report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
        currentComparator:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},
        methodConservation:{revision:'8aa0e2e5',function:'compareSemantics',bodySha256:hash(semanticMethod.compareSemantics)}},
      unavailableActionSource:{originalLogicalFile:resourceRunnerFile,capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
      boundary:'Derived DOM role/name/state comparisons only. Checkbox/radio submission value is excluded and activeDescendant compares presence,not exact identity/association. Missing targets stay missing. Not actual AX,computed accessible-name fidelity,assistive technology,complete runner provenance,current rendering or whole-case acceptance.'};
  };
  const forgedSemanticRow=structuredClone(allCases[0]);
  forgedSemanticRow.semantics.find(target=>target.expected.exists).actual.name='forged semantic name';
  assert.throws(()=>joinTargetSemantics(forgedSemanticRow));
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case),observation=joinTargetSemantics(row);
    semanticCounts.cases++;semanticCounts.targets+=observation.targets.length;
    for(const target of observation.targets){
      semanticCounts.recordedFailures+=target.matches===false?1:0;
      semanticCounts.absentReferenceTargets+=!target.expected.exists?1:0;
      semanticCounts.choiceValueExclusions+=['checkbox','radio'].includes(target.expected.role)?1:0;
      semanticCounts.activeDescendantPresenceComparisons+=target.expected.activeDescendant||target.actual?.activeDescendant?1:0;
    }
    const previous=record.obligations.semantics;
    record.obligations.semantics={...previous,applicability:'applicable',disposition:'partial',
      retainedTargetDOMComparison:observation,
      remaining:[...(previous.remaining??[]),'Actual AX/description/target associations and full semantic/currentness disposition beyond DOM comparator']};
  }
  assert.deepEqual(semanticCounts,{cases:2311,targets:5930,recordedFailures:0,absentReferenceTargets:502,choiceValueExclusions:68,activeDescendantPresenceComparisons:88});
  const compositeStateTargets={
    chips:{attribute:'aria-selected',property:'ariaSelected',role:'option',owners:[['chip-0','Angular'],['chip-1','Astylar']]},
    'button-toggle':{attribute:'aria-checked',property:'ariaChecked',role:'radio',owners:[['button-toggle-one','List'],['button-toggle-two','Grid']]},
    tabs:{attribute:'aria-selected',property:'ariaSelected',role:'tab',owners:[['tab-overview','Overview'],['tab-activity','Activity']]},
    stepper:{attribute:'aria-selected',property:'ariaSelected',role:'tab',owners:[['step-details','Details'],['step-review','Review']]},
    sort:{attribute:'aria-sort',property:'ariaSort',owners:[['sort-trigger','Sort by name']]},
  };
  const mapCompositeState=(row,referenceTree,candidateTree)=>{
    const target=compositeStateTargets[row.family];assert.ok(target);
    const nativeRoots=referenceTree.nodes.filter(node=>node.attributes?.id===`${row.family}-primary`);
    const candidateRoots=candidateTree.nodes.filter(node=>node.authored?.id===`${row.family}-primary`);
    assert.equal(nativeRoots.length,1);assert.equal(candidateRoots.length,1);
    const within=(node,root)=>node.key===root.key||node.key.startsWith(`${root.key}/`);
    const native=referenceTree.nodes.filter(node=>within(node,nativeRoots[0]));
    const candidate=candidateTree.nodes.filter(node=>within(node,candidateRoots[0]));
    const nativeOwners=native.filter(node=>Object.hasOwn(node.attributes,target.attribute));
    assert.equal(nativeOwners.length,target.owners.length,'Every actual state owner must map exactly once');
    const nativeHasLabel=(owner,label)=>native.some(node=>within(node,owner)&&node.ownText?.replace(/\s+/g,' ').trim()===label);
    const requestedHasLabel=(owner,label)=>candidate.some(node=>within(node,owner)&&
      [node.authored.textContent,node.authored.ariaLabel,node.authored.value].includes(label));
    return target.owners.map(([id,label])=>{
      const expected=nativeOwners.filter(node=>nativeHasLabel(node,label));assert.equal(expected.length,1);
      const actual=candidate.filter(node=>node.authored.id===id);assert.equal(actual.length,1);
      assert.ok(requestedHasLabel(actual[0],label),'Candidate identity must also preserve the corresponding label');
      if(target.role){assert.equal(expected[0].attributes.role,target.role);assert.equal(actual[0].authored.role,target.role);}
      const referenceValue=expected[0].attributes[target.attribute],candidateValue=actual[0].authored[target.property];
      const candidatePropertyPresent=Object.hasOwn(actual[0].authored,target.property);
      if(row.family==='sort'){
        assert.ok(['none','ascending','descending'].includes(referenceValue));
        if(candidatePropertyPresent)assert.ok(['none','ascending','descending'].includes(candidateValue));
      }else{
        assert.ok(['true','false'].includes(referenceValue));assert.equal(typeof candidateValue,'boolean');
      }
      return {label,reference:{key:expected[0].key,type:expected[0].type,id:expected[0].attributes.id,
        role:expected[0].attributes.role,attribute:target.attribute,value:referenceValue},
      candidateRequested:{key:actual[0].key,type:actual[0].authored.type,id,role:actual[0].authored.role,
        property:target.property,propertyPresent:candidatePropertyPresent,value:candidateValue},
      sameObservedAndRequestedState:candidatePropertyPresent&&referenceValue===String(candidateValue)};
    });
  };
  const compositeStateCounts={cases:0,owners:0,unequalObservedAndRequestedStates:0,byFamily:{}};
  for(const record of allObligations){
    if(!compositeStateTargets[record.family])continue;
    const row=paintCaseRows.get(record.case),trees={};
    for(const side of ['reference','astylar']){
      const receipt=row.inputTrees[side],bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
      trees[side]=JSON.parse(bytes);
    }
    const owners=mapCompositeState(row,trees.reference,trees.astylar);
    compositeStateCounts.cases++;compositeStateCounts.owners+=owners.length;
    compositeStateCounts.unequalObservedAndRequestedStates+=owners.filter(owner=>!owner.sameObservedAndRequestedState).length;
    compositeStateCounts.byFamily[row.family]=(compositeStateCounts.byFamily[row.family]??0)+1;
    const previous=record.obligations.semantics;
    record.obligations.semantics={...previous,retainedCompositeStateOwners:{disposition:'recorded-provenance-incomplete',
      case:record.case,owners,evidence:{report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
        trees:row.inputTrees},
      boundary:'Native descendant DOM ARIA attributes versus candidate requested SiteData fields at a retained endpoint. Exact primary ancestry,logical ID,label and role where shared;boolean serialization is explicit. Missing candidate sort fields remain missing,not assumed none. Not candidate generated semantic DOM/actual selection,AX,callback sequencing,intermediate states,paint,equal inputs,current runtime or whole-case acceptance. Radio live checked state is unavailable in these original trees.'},
      remaining:[...(previous.remaining??[]),'Candidate actual descendant control-state transport and complete action/current-runtime applicability']};
  }
  assert.deepEqual({...compositeStateCounts,unequalObservedAndRequestedStates:undefined},
    {cases:342,owners:624,unequalObservedAndRequestedStates:undefined,byFamily:{chips:76,sort:60,'button-toggle':68,tabs:70,stepper:68}});
  const compositeControlRow=allCases.find(row=>row.family==='chips'&&row.kind==='interaction'&&row.state==='activate');
  const compositeNative=JSON.parse(readFileSync(compositeControlRow.inputTrees.reference.file));
  const compositeCandidate=JSON.parse(readFileSync(compositeControlRow.inputTrees.astylar.file));
  const missingNativeState=structuredClone(compositeNative);
  delete missingNativeState.nodes.find(node=>node.attributes['aria-selected']!==undefined).attributes['aria-selected'];
  assert.throws(()=>mapCompositeState(compositeControlRow,missingNativeState,compositeCandidate));
  const wrongCandidateId=structuredClone(compositeCandidate);
  wrongCandidateId.nodes.find(node=>node.authored.id==='chip-0').authored.id='foreign-chip';
  assert.throws(()=>mapCompositeState(compositeControlRow,compositeNative,wrongCandidateId));
  const missingRequestedState=structuredClone(compositeCandidate);
  delete missingRequestedState.nodes.find(node=>node.authored.id==='chip-0').authored.ariaSelected;
  assert.throws(()=>mapCompositeState(compositeControlRow,compositeNative,missingRequestedState));
  const changedRequestedState=structuredClone(compositeCandidate),changedChoice=changedRequestedState.nodes.find(node=>node.authored.id==='chip-0');
  changedChoice.authored.ariaSelected=!changedChoice.authored.ariaSelected;
  assert.ok(mapCompositeState(compositeControlRow,compositeNative,changedRequestedState).some(owner=>!owner.sameObservedAndRequestedState),
    'A valid unequal state must remain an observation,not be normalized or rejected as unusable evidence');
  const eventMethods=resourceFunctions(resourceRunnerBytes,['compareEvents','compareInteractionState']);
  assert.deepEqual(eventMethods,resourceFunctions(resourcePrior,['compareEvents','compareInteractionState']));
  const comparedEventStates=['activate','activate-twice','activate-alternate','activate-leave','auto-dismiss','open','open-dismiss'];
  const eventCounts={cases:0,normalized:0,uncompared:0,tailExclusions:0,explicitState:0,defaultState:0};
  const explicitPredicateCounts={cases:0,previouslyPending:0,existingPartial:0,recordedFailures:0,byMode:{}};
  const inspectExplicitPredicate=row=>{
    const observed=row.interactionState;assert.ok(observed);assert.equal(typeof observed.matches,'boolean');
    let mode,predicateMatches,boundary;
    if(['open-dismiss-outside','open-dismiss-canvas'].includes(row.state)){
      assert.equal(typeof observed.reference,'boolean');assert.equal(typeof observed.astylar,'boolean');
      mode='native-overlay-presence-versus-candidate-open-store';
      predicateMatches=observed.reference===false&&observed.astylar===false;
      boundary='Final native role/listbox/dialog/menu presence versus candidate store.open only;no intermediate-open proof,option cleanup,focus restoration or pointer event equivalence.';
    }else if(row.family==='datepicker'&&row.state==='open-secondary'||row.family==='timepicker'&&row.state==='focus'){
      assert.equal(typeof observed.reference,'boolean');assert.equal(typeof observed.astylar,'boolean');
      mode=row.family==='datepicker'?'native-year-view-versus-candidate-measured-grid':'native-time-panel-versus-candidate-measured-options';
      predicateMatches=observed.reference===observed.astylar&&observed.reference===true;
      boundary='Final native element presence versus candidate measured owner presence;not paint,reachability,focus ownership or complete opening sequence. Timepicker focus uses a click;datepicker behavior is separate.';
    }else if(row.family==='timepicker'&&row.state==='open-scroll'){
      assert.equal(typeof observed.reference,'number');assert.equal(typeof observed.astylar,'number');
      assert.ok(Number.isFinite(observed.reference)&&Number.isFinite(observed.astylar));
      mode='native-scrollTop-versus-candidate-scroll-diagnostic';
      const difference=Math.abs(observed.reference-observed.astylar);assert.equal(observed.difference,difference);
      predicateMatches=observed.reference>0&&observed.astylar>0&&difference<=.5;
      boundary='Final scroll offsets after recorded144px wheel request;not scrollbar/thumb paint,dragging,track interaction,option reachability or the entire scroll trajectory.';
    }else{
      assert.equal(row.family,'slider');assert.ok(['drag-start','drag-end'].includes(row.state));
      mode='native-range-values-versus-candidate-store-and-input-trace';
      const moved=row.state==='drag-start'?'sliderStart':'sliderValue',fixed=row.state==='drag-start'?'sliderValue':'sliderStart';
      const traceContract=samples=>{
        assert.ok(Array.isArray(samples));
        if(samples.length!==9)return false;
        const values=samples.map(sample=>Number(sample[moved])),peers=samples.map(sample=>Number(sample[fixed]));
        return values.every(Number.isFinite)&&peers.every(Number.isFinite)&&peers.every(value=>value===peers[0])&&
          values.every((value,index)=>index===0||value>=values[index-1])&&new Set(values).size>=3&&values.at(-1)>values[0];
      };
      const endpoint=side=>({sliderStart:observed[side].sliderStart,sliderValue:observed[side].sliderValue});
      predicateMatches=JSON.stringify(endpoint('reference'))===JSON.stringify(endpoint('astylar'))&&
        traceContract(observed.reference.trace)&&traceContract(observed.astylar.trace);
      boundary='Final native input values versus candidate store values and nine native/input-event-fallback samples. Predicate requires fixed peer,monotonic movement and>=3 unique samples,not equal per-step traces,smooth travel,full range domains or core hit-testing attribution.';
    }
    assert.equal(observed.matches,predicateMatches,'Retained flag must follow the actual nondefault predicate');
    return {disposition:'recorded-provenance-incomplete',mode,observations:observed,predicateMatches,
      boundary:`${boundary} Original action runner bytes remain unavailable;conserved current methods do not establish original whole-runner or current-runtime acceptance.`};
  };
  const joinEventBoundary=row=>{
    const normalized=comparedEventStates.includes(row.state);
    const explicitState=row.family==='slider'&&['drag-start','drag-end'].includes(row.state)||
      row.family==='datepicker'&&row.state==='open-secondary'||
      row.family==='timepicker'&&['focus','open-scroll'].includes(row.state)||
      ['open-dismiss-outside','open-dismiss-canvas'].includes(row.state);
    assert.ok(Array.isArray(row.eventComparison.reference)&&Array.isArray(row.eventComparison.astylar));
    if(normalized){
      for(const events of [row.eventComparison.reference,row.eventComparison.astylar]){
        assert.ok(events.every(type=>['pointerdown','pointerup','click','input','change'].includes(type)));
        if(['checkbox','slider'].includes(row.family))assert.ok(events.every(type=>!['input','change'].includes(type)));
      }
      assert.equal(row.eventComparison.matches,JSON.stringify(row.eventComparison.reference)===JSON.stringify(row.eventComparison.astylar));
    }else assert.equal(row.eventComparison.matches,true,'Uncompared flag is not a behavioral pass');
    if(!explicitState)assert.deepEqual(row.interactionState,{matches:true});
    return {disposition:'recorded-provenance-incomplete',case:scalarCaseKey(row),
      eventMode:normalized?'normalized-primary-host-types':'uncompared-retained-arrays',
      inputChangeTailExcluded:normalized&&['checkbox','slider'].includes(row.family),
      events:row.eventComparison,stateMode:explicitState?'explicit-recorded-endpoint-or-trace':'uncompared-default',
      interactionState:row.interactionState,
      evidence:{report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
        currentComparator:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},
        methodConservation:{revision:'8aa0e2e5',functions:Object.fromEntries(Object.entries(eventMethods).map(([name,source])=>[name,hash(source)]))}},
      unavailableActionSource:{originalLogicalFile:resourceRunnerFile,capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
      boundary:'Preserved comparator observations only. Normalized event arrays cannot recover raw targets,values,discarded types or duplicates. Uncompared/default flags do not prove behavior. Explicit endpoint records are not replayed browser actions. Not complete event ordering,focus,commit,equal input,current rendering or whole-case acceptance.'};
  };
  const forgedEventRow=structuredClone(allCases.find(row=>row.kind==='interaction'&&comparedEventStates.includes(row.state)));
  forgedEventRow.eventComparison.astylar.push('click');
  assert.throws(()=>joinEventBoundary(forgedEventRow));
  const forgedDefaultRow=structuredClone(allCases.find(row=>row.kind==='interaction'&&row.state==='hover'));
  forgedDefaultRow.interactionState.value='invented endpoint';
  assert.throws(()=>joinEventBoundary(forgedDefaultRow));
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.kind!=='interaction')continue;
    const observation=joinEventBoundary(row);eventCounts.cases++;
    eventCounts[observation.eventMode==='normalized-primary-host-types'?'normalized':'uncompared']++;
    eventCounts.tailExclusions+=observation.inputChangeTailExcluded?1:0;
    eventCounts[observation.stateMode==='uncompared-default'?'defaultState':'explicitState']++;
    // Keep existing authoring applicability, exclusions and proven failures unchanged.
    record.obligations.authoredActivation={...record.obligations.authoredActivation,retainedEventBoundary:observation};
  }
  assert.deepEqual(eventCounts,{cases:1875,normalized:647,uncompared:1228,tailExclusions:32,explicitState:114,defaultState:1761});
  const focusMethod=resourceFunctions(resourceRunnerBytes,['focusedIdentity']);
  assert.deepEqual(focusMethod,resourceFunctions(resourcePrior,['focusedIdentity']));
  const focusGate=source=>{
    const ast=ts.createSourceFile('runner.mjs',source.toString().replaceAll('\r\n','\n'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const declarations=[];
    const visit=node=>{
      if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='focusMatches')declarations.push(node.initializer.getText(ast));
      ts.forEachChild(node,visit);
    };
    visit(ast);assert.equal(declarations.length,1);return declarations[0];
  };
  const focusGateSource=focusGate(resourceRunnerBytes);
  assert.equal(focusGateSource,focusGate(resourcePrior));
  assert.equal(focusGateSource,"state !== 'focus' || referenceFocus === astylarFocus");
  const retainedFocusCounts={cases:0,compared:0,uncompared:0,comparedPrimaryHosts:0,comparedUnidentified:0,uncomparedDifferentIdentities:0};
  const joinRetainedFocus=row=>{
    assert.equal(row.kind,'interaction');assert.equal(typeof row.focus?.matches,'boolean');
    for(const side of ['reference','astylar'])if(Object.hasOwn(row.focus,side))assert.equal(typeof row.focus[side],'string');
    const compared=row.state==='focus';
    assert.equal(row.focus.matches,!compared||row.focus.reference===row.focus.astylar,
      'Preserve the actual original focus gate,not a presumed all-state focus comparison');
    const identityMode=compared&&row.focus.reference===`${row.family}-primary`&&row.focus.astylar===`${row.family}-primary`?
      'both-normalized-primary-hosts':!Object.hasOwn(row.focus,'reference')&&!Object.hasOwn(row.focus,'astylar')?
      'both-unidentified':'source-specific-native-id-versus-candidate-logical-id';
    return {disposition:'recorded-provenance-incomplete',case:scalarCaseKey(row),
      comparisonMode:compared?'identity-equality':'uncompared-default',identityMode,observation:row.focus,
      evidence:{report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
        currentRunner:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},
        methodConservation:{revision:'8aa0e2e5',function:'focusedIdentity',bodySha256:hash(focusMethod.focusedIdentity),gateSha256:hash(focusGateSource)}},
      unavailableActionSource:{originalLogicalFile:resourceRunnerFile,capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
      boundary:'Original serialized identity fields only. Primary hosts collapse active descendants; omitted owners remain unidentified. Non-focus match flags are unconditional,not focus passes. Different identity namespaces are not automatic defects. Not actual descendant association,whole-runner provenance,focus paint,current rendering or whole-case closure.'};
  };
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.kind!=='interaction')continue;
    const observation=joinRetainedFocus(row);retainedFocusCounts.cases++;
    const compared=observation.comparisonMode==='identity-equality';
    retainedFocusCounts[compared?'compared':'uncompared']++;
    if(compared&&observation.identityMode==='both-normalized-primary-hosts')retainedFocusCounts.comparedPrimaryHosts++;
    if(compared&&observation.identityMode==='both-unidentified')retainedFocusCounts.comparedUnidentified++;
    if(!compared&&row.focus.reference!==row.focus.astylar)retainedFocusCounts.uncomparedDifferentIdentities++;
    // Preserve existing pending status,authoring exclusions and demonstrated failures.
    record.obligations.programmaticFocus={...record.obligations.programmaticFocus,retainedIdentityComparison:observation};
  }
  assert.deepEqual(retainedFocusCounts,{cases:1875,compared:256,uncompared:1619,comparedPrimaryHosts:216,comparedUnidentified:40,uncomparedDifferentIdentities:204});
  const forgedFocusRow=structuredClone(allCases.find(row=>row.kind==='interaction'&&row.state==='focus'&&row.focus.reference));
  forgedFocusRow.focus.astylar='forged-owner';assert.throws(()=>joinRetainedFocus(forgedFocusRow));
  const forgedUncomparedFocus=structuredClone(allCases.find(row=>row.kind==='interaction'&&row.state!=='focus'));
  forgedUncomparedFocus.focus.matches=false;assert.throws(()=>joinRetainedFocus(forgedUncomparedFocus));
  const menuActionSources=[
    ['menu-actions-reset-20261008','6b93af93ca14dedca2e1b64c37d2b1ffac6e203ea37d8265c681b6ffc0acd828','scripts/audit-material-menu-actions-reset.mjs'],
    ['menu-actions-remaining-20261008','f41bcce117e913caaf956b43848b8b2eedeafd3d4c6792a1da23b0bbb8e33811','scripts/audit-material-menu-actions-remaining.mjs'],
  ];
  const menuContexts=new Map();
  const menuContextKey=row=>JSON.stringify([row.profile,row.viewport.width,row.viewport.height,row.viewport.deviceScaleFactor]);
  const menuStates=['opened','item-held','item-clicked','reset-outside','reopened','arrow-down','escape'];
  for(const [run,sha256,script]of menuActionSources){
    const file=`artifacts/material-parity/${run}/latest-report.json`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const capture=JSON.parse(bytes),manifestBytes=readFileSync(capture.capture.checkpointManifest.file);
    const manifest=JSON.parse(manifestBytes),pairs=[];
    for(const native of capture.results.filter(row=>row.mode==='reference')){
      const candidate=capture.results.filter(row=>row.mode==='astylar'&&menuContextKey(row)===menuContextKey(native));
      assert.equal(candidate.length,1);const rows={reference:native,astylar:candidate[0]};
      const observations={};
      for(const [side,row]of Object.entries(rows)){
        assert.equal(row.family,'menu');assert.deepEqual(row.boundaries.map(boundary=>boundary.state),menuStates);
        observations[side]=row.boundaries.map(boundary=>{
          for(const receipt of [boundary.inputTree,boundary.screenshot])assert.equal(hash(readFileSync(receipt.file)),receipt.sha256);
          return {state:boundary.state,observation:boundary.observation,inputTree:boundary.inputTree,screenshot:boundary.screenshot};
        });
        const states=Object.fromEntries(row.boundaries.map(boundary=>[boundary.state,boundary.observation]));
        assert.equal(states.opened.open,true);assert.equal(states['reset-outside'].open,false);
        assert.equal(states.reopened.open,true);assert.equal(states['arrow-down'].open,true);assert.equal(states.escape.open,false);
        assert.equal(states['item-clicked'].open,side==='astylar');
        if(side==='reference'){assert.equal(states.reopened.active.text,'Rename');assert.equal(states['arrow-down'].active.text,'Delete');}
        else{assert.equal(states.reopened.active.astylarId,'menu-primary');assert.equal(states['arrow-down'].active.astylarId,'menu-primary');}
      }
      for(let i=0;i<menuStates.length;i++)pairs.push({reference:{runtime:native.runtime,inputTree:native.boundaries[i].inputTree},
        astylar:{runtime:candidate[0].runtime,inputTree:candidate[0].boundaries[i].inputTree}});
      const context=menuContextKey(native);assert.equal(menuContexts.has(context),false);
      menuContexts.set(context,{disposition:'supplementary-action-failure',physicalContext:context,observations,
        evidence:{report:{file,sha256},manifest:{file:capture.capture.checkpointManifest.file,sha256:hash(manifestBytes)}},
        boundary:'Paired supplementary item press/release,explicit outside reset,reopen,ArrowDown and Escape. Same physical context,not configured open-hover-content actions. Item dismissal/navigation differ; not complete event/keyboard/paint,current rendering or whole-case acceptance.'});
    }
    assert.deepEqual(validateSupplementalCapture({...capture,results:pairs},{reportFile:file,expectedProvenance:manifest.provenance,
      script,styleProperties:Object.values(propertyGroups).flat()}),{status:'checkpoint-bound',errors:[]});
  }
  assert.equal(menuContexts.size,8);
  let menuActionJoins=0;
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.family!=='menu'||row.state!=='open-hover-content')continue;
    const observation=menuContexts.get(menuContextKey(row));assert.ok(observation);menuActionJoins++;
    const previous=record.obligations.authoredActivation;
    record.obligations.authoredActivation={...previous,disposition:'partial',supplementaryMenuActions:observation,
      remaining:[...(previous.remaining??[]),'Configured standard action and complete activation/currentness beyond supplementary menu sequence']};
  }
  assert.equal(menuActionJoins,8);
  const joinCommitEndpoint=row=>{
    assert.equal(row.state,'open-commit-reopen');assert.ok(['autocomplete','select'].includes(row.family));
    const targets=row.semantics.filter(target=>target.id===`${row.family}-primary`);assert.equal(targets.length,1);
    const target=targets[0],value=row.family==='autocomplete'?'Cape Town':'Solo';
    for(const side of ['expected','actual']){
      assert.equal(target[side].exists,true);assert.equal(target[side].role,'combobox');
      assert.equal(target[side].value,value);assert.equal(target[side].expanded,true);
    }
    assert.deepEqual(row.interactionState,{matches:true});
    assert.equal(row.focus.reference,`${row.family}-primary`);assert.equal(row.focus.astylar,`${row.family}-primary`);
    return {disposition:'recorded-provenance-incomplete',case:scalarCaseKey(row),finalTargetDOM:target,
      finalHostFocus:row.focus,observedValue:value,reopened:true,
      evidence:{report:{file:'artifacts/material-parity/current-full-20261005/latest-report.json',sha256:reportSha256},
        currentRunner:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},
        actionMethodConservation:{revision:'8aa0e2e5',function:'performInteraction',bodySha256:hash(resourceMethods.performInteraction)}},
      unavailableActionSource:{originalLogicalFile:resourceRunnerFile,capturedSha256:'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0',disposition:'missing-original-bytes-not-a-readable-receipt'},
      boundary:'Final derived-DOM value/expanded and host-focus records only. The configured action clicks an option then reopens; no pre-reopen closed-state snapshot,actual focused descendant,complete events/selection/paint,current capture or whole-case acceptance is inferred. Default interactionState remains uncompared.'};
  };
  const forgedCommitRow=structuredClone(allCases.find(row=>row.state==='open-commit-reopen'));
  forgedCommitRow.semantics.find(target=>target.id===`${forgedCommitRow.family}-primary`).actual.value='forged commit';
  assert.throws(()=>joinCommitEndpoint(forgedCommitRow));
  const commitEndpointCounts={autocomplete:0,select:0};
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.state!=='open-commit-reopen')continue;
    const observation=joinCommitEndpoint(row);commitEndpointCounts[row.family]++;
    const previous=record.obligations.authoredActivation;
    record.obligations.authoredActivation={...previous,disposition:'partial',retainedCommitReopenEndpoint:observation,
      remaining:[...(previous.remaining??[]),'Intermediate commit/dismiss/reopen boundaries and full action/currentness beyond final endpoint']};
  }
  assert.deepEqual(commitEndpointCounts,{autocomplete:8,select:8});
  const rawControlActions=new Map(),rawScriptFile='scripts/audit-material-raw-control-events.mjs';
  const sorterFile='tests/material-parity/sort-focus-structure.spec.mjs',sorterBytes=readFileSync(sorterFile);
  const frozenHelper=resourceFunctions(sorterBytes,['withFrozenShowcase']).withFrozenShowcase;
  assert.equal(hash(frozenHelper),'603ac9ca88b9bf2e3443f8be65f125d39002e1ca4e5157487d9ac86ed7d2527f');
  const rawActionNames=['profileTheme','sendShowcaseCommand','waitForThemeApplied','waitForAstylarBenchmark',
    'settleInteraction','setBenchmarkPhase','openInteractionPage','performInteraction','interactionTargetBox',
    'sliderDragCoordinates','readSliderValues','compareEvents'];
  // These receipts hash exact captured function bytes, including line endings.
  const rawRunnerAST=ts.createSourceFile('runner.mjs',resourceRunnerBytes.toString(),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  assert.deepEqual(rawRunnerAST.parseDiagnostics,[]);
  const rawActionBodies=Object.fromEntries(rawActionNames.map(name=>{
    const matches=rawRunnerAST.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
    assert.equal(matches.length,1);return [name,matches[0].getText(rawRunnerAST)];
  }));
  assert.equal(hash(rawActionNames.map(name=>rawActionBodies[name]).join('\n')),'9f00eceef7051e65a426cf316086528281a2717a6a71da619d18c08ce04604e1');
  let rawActionRecords=0;
  for(const [name,sha256,count,revision]of retainedRawControlLogs){
    const file=`artifacts/material-parity/${name}`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const [receipt,...rows]=bytes.toString().trim().split(/\r?\n/).map(JSON.parse),terminal=rows.pop();
    assert.equal(receipt.cases,count);assert.equal(rows.length,count);assert.equal(terminal.captured,count);
    assert.equal(terminal.result,'PASS');assert.equal(receipt.acceptance,false);assert.equal(terminal.acceptance,false);
    const capturedScript=execFileSync('git',['show',`${revision}:${rawScriptFile}`]);assert.equal(hash(capturedScript),receipt.scriptSha256);
    assert.equal(hash(resourceRunnerBytes),receipt.runnerSha256);assert.equal(hash(frozenHelper),receipt.helperSha256);
    assert.equal(hash(readFileSync(receipt.checkpointFile)),receipt.checkpointSha256);
    const originalSorter=execFileSync('git',['show',`6b0486f0:${sorterFile}`]);assert.equal(hash(originalSorter),receipt.sorterSha256);
    for(const row of rows){
      const key=scalarCaseKey({...row.case,kind:'interaction'});assert.ok(paintCaseRows.has(key));
      assert.deepEqual(row.errors,[]);assert.equal(row.acceptance,false);rawActionRecords++;
      const observations=rawControlActions.get(key)??[];
      observations.push({observation:row,evidence:{log:{file,sha256},checkpoint:{file:receipt.checkpointFile,sha256:receipt.checkpointSha256},
        currentRunner:{file:resourceRunnerFile,sha256:hash(resourceRunnerBytes)},currentSorter:{file:sorterFile,sha256:hash(sorterBytes)}},
        sourceConservation:{capturedScript:{revision,originalLogicalFile:rawScriptFile,capturedSha256:receipt.scriptSha256},
          capturedSorter:{revision:'6b0486f0',originalLogicalFile:sorterFile,capturedSha256:receipt.sorterSha256},
          frozenHelperSha256:receipt.helperSha256,actionBodiesSha256:receipt.actionBodiesSha256},
        boundary:'Exact configured physical anchor with retained raw before/after and optional key/pointer/held samples. Keyboard/disabled probes add supplementary actions; not the original matrix action in every mode. Historical Git/source receipts and current helper/action bodies authenticate; no current browser,all-frame paint,complete lifetime or whole-case acceptance.'});
      rawControlActions.set(key,observations);
    }
  }
  assert.equal(rawActionRecords,105);assert.equal(rawControlActions.size,82);
  let rawControlJoins=0;
  for(const record of allObligations){
    const observations=rawControlActions.get(record.case);if(!observations)continue;rawControlJoins++;
    const previous=record.obligations.authoredActivation;
    record.obligations.authoredActivation={...previous,disposition:'partial',retainedRawControlActions:observations,
      remaining:[...(previous.remaining??[]),'Complete action/input/focus/currentness disposition beyond retained raw control samples']};
  }
  assert.equal(rawControlJoins,82);
  const keyboardActivationModes=new Map([
    ['core','button-enter-space'],['toolbar','child-button-enter-space'],['card','child-button-enter-space'],
    ['sort','sort-direction-enter-space'],['paginator','page-navigation-enter-space'],
    ['autocomplete','popup-arrow-enter-escape'],['timepicker','popup-arrow-enter-escape'],
    ['select','popup-open-navigate-commit-reopen'],['slider','two-input-keyboard-value-steps'],
    ['button-toggle','option-arrow-enter'],['tabs','tab-arrow-enter'],['stepper','step-arrow-enter'],
    ['bottom-sheet','pointer-trigger-open-then-tab-focus-scope'],['dialog','pointer-trigger-open-then-tab-focus-scope'],
  ]);
  const keyboardActivationCounts={joined:0,previouslyPending:0,existingPartial:0};
  for(const record of allObligations){
    if(!keyboardActivationModes.has(record.family))continue;
    const source=extendedKeyboardCases.get(record.case);if(!source)continue;
    const previous=record.obligations.authoredActivation;
    assert.ok(['evidence-join-pending','partial'].includes(previous.disposition));
    keyboardActivationCounts[previous.disposition==='evidence-join-pending'?'previouslyPending':'existingPartial']++;
    keyboardActivationCounts.joined++;
    record.obligations.authoredActivation={...previous,applicability:'applicable',disposition:'partial',
      supplementaryKeyboardActivation:{...source.supplementaryKeyboard,actionScope:keyboardActivationModes.get(record.family),
        boundary:'Reuse exact supplementary callback/assertion observations,including failures. Toolbar/card target child buttons;slider records input and store values separately;tabs/stepper retain actual option state rather than assuming store state is the selection owner. Modal sequence activates the trigger by pointer then tests Tab scope,not modal action activation. Tree navigation and datepicker Tab-only sequences are excluded. Not original configured-action equivalence,all keyboard/pointer boundaries,paint,current rendering or whole-case closure.'},
      remaining:[...(previous.remaining??[]),'Other applicable activation targets,keys,pointer and disabled boundaries',
        'Complete input/paint/event and source/runtime applicability']};
  }
  assert.deepEqual(keyboardActivationCounts,{joined:112,previouslyPending:104,existingPartial:8});
  assert.ok(allObligations.filter(row=>['tree','datepicker'].includes(row.family))
    .every(row=>!row.obligations.authoredActivation.supplementaryKeyboardActivation),
    'Navigation or Tab-only actions cannot supply activation evidence');
  const rangeDefinition=sourceAuditDefinitions.find(row=>row.id==='fixture-slider-fixed-half-domains');assert.ok(rangeDefinition);
  const rangeFinding=globalSourceRows.filter(row=>row.classification===rangeDefinition.classification&&row.justification===rangeDefinition.justification);
  assert.equal(rangeFinding.length,1);
  const rangeSourceFile=rangeDefinition.file,rangeSourceBytes=readFileSync(rangeSourceFile);
  const rangeLines=source=>source.toString().split(/\r?\n/).filter(line=>/type: 'input'.*id: 'slider-(start|primary)'/.test(line));
  const rangeHistory=[];
  for(const [revision,beforeStep,afterStep,beforeDomains]of [
    ['7159b1d5','5','5',[[0,100],[0,100]]],['f3c8254c','5','1',[[0,50],[50,100]]],
  ]){
    const before=execFileSync('git',['show',`${revision}^:${rangeSourceFile}`],{maxBuffer:4_000_000});
    const after=execFileSync('git',['show',`${revision}:${rangeSourceFile}`],{maxBuffer:4_000_000});
    const extract=source=>rangeLines(source).map(line=>{
      const fields=[...line.matchAll(/\b(min|max|step): '([^']+)'/g)];
      const values=Object.fromEntries(fields.map(([,name,value])=>[name,value]));
      return [Number(values.min),Number(values.max),values.step];
    });
    assert.deepEqual(extract(before),beforeDomains.map(([min,max])=>[min,max,beforeStep]));
    assert.deepEqual(extract(after),[[0,50,afterStep],[50,100,afterStep]]);
    assert.ok(rangeLines(after).every(line=>line.includes('Math.min(50,')||line.includes('Math.max(50,')));
    rangeHistory.push({revision,sourceFile:rangeSourceFile,beforeSha256:hash(before),afterSha256:hash(after),
      beforeInputs:rangeLines(before),afterInputs:rangeLines(after)});
  }
  assert.deepEqual(rangeLines(rangeSourceBytes),rangeHistory[1].afterInputs);
  const rangeReferenceFile='examples/material-showcase/src/app/reference.component.ts',rangeReferenceBytes=readFileSync(rangeReferenceFile);
  const referenceRangeLine=rangeReferenceBytes.toString().split(/\r?\n/).find(line=>line.includes("@case ('slider')"));
  assert.ok(referenceRangeLine.includes('min="0" max="100" step="5"'));
  const rangeInputs=(tree,side)=>['slider-start','slider-primary'].map(id=>{
    const nodes=tree.nodes.filter(node=>(side==='reference'?node.attributes:node.authored)?.id===id);assert.equal(nodes.length,1);
    const node=nodes[0],attrs=side==='reference'?node.attributes:node.authored;
    assert.equal(side==='reference'?node.type:attrs.type,'input');assert.equal(side==='reference'?attrs.type:attrs.inputType,'range');
    return {key:node.key,id,min:attrs.min,max:attrs.max,step:attrs.step,value:side==='reference'?attrs['aria-valuetext']:attrs.value};
  });
  let staticRangeHistoryJoins=0;
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.family!=='slider'||row.kind!=='static')continue;
    const inputs={};
    for(const side of ['reference','astylar']){
      const receipt=row.inputTrees[side],bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
      inputs[side]=rangeInputs(JSON.parse(bytes),side);
    }
    assert.deepEqual(inputs.reference.map(x=>[x.min,x.max,x.step,x.value]),[['0','65','5','30'],['30','100','5','65']]);
    assert.deepEqual(inputs.astylar.map(x=>[x.min,x.max,x.step,x.value]),[['0','50','1','30'],['50','100','1','65']]);
    const previous=record.obligations.historyOwnership;assert.equal(previous.disposition,'evidence-join-pending');
    record.obligations.historyOwnership={...previous,applicability:'applicable',disposition:'partial',
      documentedRangeInputSubstitution:{disposition:'inspected',classification:rangeDefinition.classification,
        definitionId:rangeDefinition.id,findingId:rangeFinding[0].id,inputs,
        evidence:{pairedTrees:row.inputTrees,policy:{file:sourcePolicyFile,sha256:hash(readFileSync(sourcePolicyFile))},
          sourceFinding:{file:`${generation}/${globalSourceShard.file}`,sha256:globalSourceShard.sha256},
          currentCandidate:{file:rangeSourceFile,sha256:hash(rangeSourceBytes)},
          currentReference:{file:rangeReferenceFile,sha256:hash(rangeReferenceBytes)},history:rangeHistory},
        boundary:'Exact retained static inputs and Git source transitions only. Native per-thumb bounds depend on the peer value;reference authoring remains0..100/step5. Half-domain/clamp and later step1 substitution are separate changes. This is application input inequality,not a demonstrated core hit-test/projection cause,current rendering,complete history or ownership acceptance.'},
      remaining:['Other style/structure compensation history and live resource ownership/currentness']};
    staticRangeHistoryJoins++;
  }
  assert.equal(staticRangeHistoryJoins,12);
  assert.throws(()=>rangeInputs({nodes:[]},'reference'),'Missing exact input cannot inherit a family finding');
  const rootHeightIndexFile='docs/material-root-height-audit.json',rootHeightIndexBytes=readFileSync(rootHeightIndexFile);
  const rootHeightIndex=JSON.parse(rootHeightIndexBytes),rootHeightMembership=new Map();
  for(const group of rootHeightIndex.groups)for(const key of group.reviewedCases){
    assert.ok(!rootHeightMembership.has(key));rootHeightMembership.set(key,group);
  }
  assert.equal(rootHeightMembership.size,2311);
  const fixedHeightDefinition=sourceAuditDefinitions.find(row=>row.id==='fixture-fixed-reference-heights');assert.ok(fixedHeightDefinition);
  const fixedHeightFinding=globalSourceRows.filter(row=>row.classification===fixedHeightDefinition.classification&&row.justification===fixedHeightDefinition.justification);
  assert.equal(fixedHeightFinding.length,1);
  const initialHeightSource=execFileSync('git',['show',`2f44011:${rangeSourceFile}`],{maxBuffer:4_000_000});
  assert.equal(hash(initialHeightSource),'6838d7fef8895e21dffff9f61673f6e55212f45472159c4b06ed09f3996d7a24');
  for(const name of ['MATERIAL_REFERENCE_HEIGHTS','MATERIAL_COMPACT_REFERENCE_HEIGHTS','MATERIAL_CONTRAST_REFERENCE_HEIGHTS'])
    assert.ok(initialHeightSource.toString().includes(`const ${name}`));
  assert.ok(initialHeightSource.toString().split(/\r?\n/).some(line=>line.includes('selector: `#${rootId}`')&&line.includes('height: `${referenceHeight}px`')));
  assert.match(rangeSourceBytes.toString(),new RegExp(fixedHeightDefinition.pattern));
  const affectsRootHeight=declarations=>Object.keys(declarations??{}).some(key=>
    ['height','minheight','maxheight','blocksize','minblocksize','maxblocksize','aspectratio','all'].includes(key.replaceAll('-','').toLowerCase())||
    /^(animation|transition|containintrinsic)/i.test(key.replaceAll('-','')));
  const inspectRootHeightDeclarations=(tree,side,id)=>{
    const matches=tree.nodes.filter(node=>(side==='reference'?node.attributes?.id:node.authored?.id)===id);assert.equal(matches.length,1);
    const node=matches[0];assert.equal(side==='reference'?node.type:node.authored.type,'section');
    if(side==='reference'){
      assert.equal(affectsRootHeight(node.inline),false);
      assert.ok(!/(?:^|;)\s*(?:(?:min-|max-)?(?:height|block-size)|aspect-ratio|all|animation[^:]*|transition[^:]*|contain-intrinsic[^:]*)\s*:/i.test(node.attributes.style??''));
      const rules=node.rules.map(index=>tree.rules[index]);assert.ok(rules.every(rule=>!affectsRootHeight(rule.declarations)));
      const computed=tree.styles[node.style];assert.equal(computed.boxSizing,'content-box');
      return {key:node.key,type:node.type,inline:node.inline,rules,usedHeight:computed.height,boxSizing:computed.boxSizing,heightDeclaration:'<omitted>'};
    }
    assert.equal(affectsRootHeight(node.authored.style),false);
    const height=node.normalResolvedStyle.height;assert.match(height,/^\d+(?:\.\d+)?px$/);assert.ok(Number.parseFloat(height)>0);
    const rules=tree.rules.filter(rule=>rule.selector===`#${id}`&&rule.height===height);assert.ok(rules.length>0);
    for(const stage of ['normalResolvedStyle','resolvedStyle','interactionResolvedStyle']){
      assert.equal(node[stage].height,height);assert.equal(node[stage].boxSizing,'border-box');
    }
    return {key:node.key,type:node.authored.type,inline:node.authored.style??null,rules,heightDeclaration:height,boxSizing:'border-box'};
  };
  const staticHeightHistoryCounts={joined:0,previouslyPending:0,existingPartial:0};
  for(const record of allObligations){
    const row=paintCaseRows.get(record.case);if(row.kind!=='static')continue;
    const group=rootHeightMembership.get(record.case);assert.ok(group);assert.equal(group.family,row.family);
    assert.equal(group.classification,'application-plugin-authoring-defect');assert.equal(group.element,`${row.family}-root`);
    const declarations={};
    for(const side of ['reference','astylar']){
      const receipt=row.inputTrees[side],bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
      declarations[side]=inspectRootHeightDeclarations(JSON.parse(bytes),side,group.element);
    }
    const scalarRows=scalarInputs.get(row.family).filter(item=>item.attribution==='reviewed-root-fixed-height-authoring'&&
      item.element===group.element&&item.property==='height'&&item.reviewedCases?.includes(record.case));
    assert.equal(scalarRows.length,1);
    const previous=record.obligations.historyOwnership;assert.ok(['evidence-join-pending','partial'].includes(previous.disposition));
    staticHeightHistoryCounts[previous.disposition==='evidence-join-pending'?'previouslyPending':'existingPartial']++;staticHeightHistoryCounts.joined++;
    record.obligations.historyOwnership={...previous,applicability:'applicable',disposition:'partial',
      documentedFixedRootHeightHistory:{disposition:'inspected',classification:fixedHeightDefinition.classification,
        definitionId:fixedHeightDefinition.id,findingId:fixedHeightFinding[0].id,scalarFindingId:scalarRows[0].id,declarations,
        evidence:{pairedTrees:row.inputTrees,index:{file:rootHeightIndexFile,sha256:hash(rootHeightIndexBytes)},
          policy:{file:sourcePolicyFile,sha256:hash(readFileSync(sourcePolicyFile))},
          sourceFinding:{file:`${generation}/${globalSourceShard.file}`,sha256:globalSourceShard.sha256},
          currentCandidate:{file:rangeSourceFile,sha256:hash(rangeSourceBytes)},
          initialHistory:{revision:'2f44011',sourceFile:rangeSourceFile,sourceSha256:hash(initialHeightSource)}},
        boundary:'Exact root/property membership and retained declarations plus initial source history only. Omitted native height and explicit candidate fixed border-box height are unequal authoring,even when outer boxes coincide. Existing index is historical;no responsive winner,used-size equivalence,descendant layout,current rendering,complete compensation history or live ownership acceptance.'},
      remaining:[...(previous.remaining??[]),'Other compensation/history branches and live resource ownership/currentness']};
  }
  assert.deepEqual(staticHeightHistoryCounts,{joined:436,previouslyPending:408,existingPartial:28});
  assert.throws(()=>inspectRootHeightDeclarations({nodes:[]},'reference','core-root'));
  const servedRoot='examples/material-showcase/dist/material-showcase/browser';
  const currentServed=fingerprintDirectory(servedRoot),currentModules=fingerprintModuleGraph(process.cwd(),resourceRunnerFile);
  const assertDependencyOwner=source=>{
    const ast=ts.createSourceFile('runner.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    assert.deepEqual(ast.parseDiagnostics,[]);
    const roots=ast.statements.filter(ts.isVariableStatement).flatMap(node=>[...node.declarationList.declarations])
      .filter(node=>node.name.getText(ast)==='root');
    assert.equal(roots.length,1);assert.equal(roots[0].initializer.getText(ast),'process.cwd()');
    const fields=[];const visit=node=>{
      if(ts.isPropertyAssignment(node)&&node.name.getText(ast)==='installedDependencies')fields.push(node.initializer.getText(ast));
      ts.forEachChild(node,visit);
    };visit(ast);
    assert.deepEqual(fields,["createHash('sha256').update(readFileSync(path.join(root, 'node_modules/.package-lock.json'))).digest('hex')"]);
  };
  assertDependencyOwner(resourceRunnerBytes.toString());
  assertDependencyOwner(resourcePrior);
  assert.throws(()=>assertDependencyOwner(resourceRunnerBytes.toString().replace(
    "path.join(root, 'node_modules/.package-lock.json')","path.join(showcaseRoot, 'node_modules/.package-lock.json')")));
  const installedLockFile='node_modules/.package-lock.json',installedLockSha=hash(readFileSync(installedLockFile));
  const oldServed=new Map(captured.captureProvenance.browserFiles.map(receipt=>[receipt.file,receipt.sha256]));
  const newServed=new Map(currentServed.map(receipt=>[receipt.file,receipt.sha256]));
  const servedDifference={equal:currentServed.filter(receipt=>oldServed.get(receipt.file)===receipt.sha256).length,
    changed:currentServed.filter(receipt=>oldServed.has(receipt.file)&&oldServed.get(receipt.file)!==receipt.sha256).map(receipt=>receipt.file),
    added:currentServed.filter(receipt=>!oldServed.has(receipt.file)).map(receipt=>receipt.file),
    removed:[...oldServed.keys()].filter(file=>!newServed.has(file))};
  assert.equal(currentServed.length,1887);assert.equal(servedDifference.equal,1880);
  assert.deepEqual(servedDifference.changed,['compare/index.html','index.csr.html','main.js']);
  assert.equal(servedDifference.added.length,4);assert.equal(servedDifference.removed.length,4);
  const buildCaptureSources=[
    ['overlay-used-dimensions-current-20261011','931bc5fbec43ae47a6fc14533c906cce87cd0d083f2911e5d8bdb6d12d582d67','standard-overlay-subset',59,1],
    ['bottom-sheet-settlement-trace-20261011','84668a6b572916136d0a1d31a52d1eeeebce88f803de2a3c5f43d56da0ea59fa','instrumented-settlement',1,1],
    ['selection-pointer-directions-20261011','f1497dbd6bb360d25ae62466c4ef1b5d95631f7265af8da3b2969774e0b690a0','selection-replay-diagnostic',32,0],
  ];
  // Extend after keyboard/raw-control joins so their prior evidence is conserved.
  for(const record of allObligations){
    const previous=record.obligations.authoredActivation;
    if(previous.retainedEventBoundary?.stateMode!=='explicit-recorded-endpoint-or-trace')continue;
    const predicate=inspectExplicitPredicate(paintCaseRows.get(record.case));
    assert.ok(['evidence-join-pending','partial'].includes(previous.disposition));
    explicitPredicateCounts.cases++;
    explicitPredicateCounts[previous.disposition==='evidence-join-pending'?'previouslyPending':'existingPartial']++;
    explicitPredicateCounts.recordedFailures+=predicate.predicateMatches?0:1;
    explicitPredicateCounts.byMode[predicate.mode]=(explicitPredicateCounts.byMode[predicate.mode]??0)+1;
    record.obligations.authoredActivation={...previous,disposition:'partial',retainedExplicitStatePredicate:predicate,
      remaining:[...(previous.remaining??[]),'Complete actual action/target/intermediate-state and current-runtime disposition beyond original endpoint predicate']};
  }
  assert.equal(explicitPredicateCounts.cases,114);assert.equal(explicitPredicateCounts.previouslyPending,88);
  assert.equal(explicitPredicateCounts.existingPartial,26);
  for(const [family,state,mutate]of [
    ['autocomplete','open-dismiss-outside',row=>{delete row.interactionState.reference;}],
    ['datepicker','open-secondary',row=>{row.interactionState.matches=!row.interactionState.matches;}],
    ['timepicker','open-scroll',row=>{row.interactionState.difference=999;}],
    ['slider','drag-start',row=>{row.interactionState.reference.trace.pop();}],
  ]){
    const altered=structuredClone(allCases.find(row=>row.kind==='interaction'&&row.family===family&&row.state===state));
    mutate(altered);assert.throws(()=>inspectExplicitPredicate(altered));
  }
  const currentBuildCases=new Map(),buildCaptureCounts={records:0,unique:0,withoutCapture:0,installedLockMatches:0,installedLockDiffers:0};
  const selectionReplayCounts={cases:0,stages:0,previouslyPending:0,existingPartial:0,stateMismatches:0,diagnosticFailures:0,eventFailures:0};
  const selectionProbe=resourceFunctions(resourceRunnerBytes,['captureSelectionTransitions']);
  const selectionOwners={radio:['radio-solo','radio-team'],'button-toggle':['button-toggle-one','button-toggle-two'],
    tabs:['tab-overview','tab-activity'],stepper:['step-details','step-review']};
  const inspectSelectionReplay=row=>{
    assert.equal(row.state,'activate');assert.ok(selectionOwners[row.family]);
    assert.equal(row.diagnosticAction,'opposite-item-and-return');
    const result=row.selectionTransitions;assert.equal(result.diagnosticOnly,true);
    assert.deepEqual(result.stages.map(stage=>stage.stage),['after-default-activation','opposite-item','return-item']);
    for(const stage of result.stages){
      for(const side of ['reference','astylar']){
        assert.equal(stage[side].values.length,2);assert.ok(stage[side].values.every(value=>typeof value==='boolean'));
        assert.ok(Number.isFinite(stage[side].time));
      }
      assert.equal(stage.matches,JSON.stringify(stage.reference.values)===JSON.stringify(stage.astylar.values));
      for(const side of ['reference','astylar']){
        const receipt=stage.inputTrees[side],bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);
      }
    }
    assert.equal(row.eventComparison.matches,JSON.stringify(row.eventComparison.reference)===JSON.stringify(row.eventComparison.astylar));
    assert.equal(typeof row.meetsAcceptance,'boolean');
    return {disposition:'recorded-provenance-incomplete',candidateIds:selectionOwners[row.family],
      nativeStateMode:row.family==='radio'?'actual-native-input-checked-properties':'actual-native-descendant-ARIA-attributes',
      candidateStateMode:'actual-generated-semantic-DOM-ARIA-attributes',stages:result.stages,
      cumulativeHostEventComparison:row.eventComparison,recordedDiagnosticAcceptance:row.meetsAcceptance,
      boundary:'Separate diagnostic capture extends configured activate with opposite-item and return clicks. Native document-order owners and fixed candidate IDs are guarded by the authenticated complete probe. Stage state agrees independently of cumulative host events;events across all three actions are not the original baseline event sequence. Per-page times are not synchronized clocks. Main raster/resource samples precede extra actions;no stage local-paint,resource-plateau,equal input,current rendering or whole-case acceptance follows.'};
  };
  for(const [run,sha256,mode,count,driftCount]of buildCaptureSources){
    const file=`artifacts/material-parity/${run}/latest-report.json`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const capture=JSON.parse(bytes);assert.deepEqual(capture.captureProvenance.browserFiles,currentServed);
    const installedLockMatches=capture.captureProvenance.installedDependencies===installedLockSha;
    buildCaptureCounts[installedLockMatches?'installedLockMatches':'installedLockDiffers']++;
    const moduleDrift=currentModules.filter(receipt=>!capture.captureProvenance.harnessFiles.some(old=>old.file===receipt.file&&old.sha256===receipt.sha256));
    assert.equal(moduleDrift.length,driftCount);
    if(driftCount)assert.deepEqual(moduleDrift.map(receipt=>receipt.file),[resourceRunnerFile]);
    const checkpoint=openMaterialCheckpoint({directory:`artifacts/material-parity/${run}`,provenance:capture.captureProvenance,resume:true});
    assert.equal(capture.interactions.length,count);
    const manifestFile=`artifacts/material-parity/${run}/checkpoint/manifest.json`;
    for(const row of capture.interactions){
      assert.deepEqual(checkpoint.load(materialCaseKey('interaction',row)),row);
      const key=scalarCaseKey({...row,kind:'interaction'});assert.ok(paintCaseRows.has(key));buildCaptureCounts.records++;
      if(mode==='selection-replay-diagnostic'){
        assert.equal(capture.captureProvenance.selectionReplay,true);assert.equal(capture.captureProvenance.enforce,false);
        const actionSource=capture.captureProvenance.harnessFiles.find(receipt=>receipt.file===resourceRunnerFile);
        assert.ok(actionSource);assert.equal(actionSource.sha256,hash(resourceRunnerBytes));
        const record=allObligations.find(record=>record.case===key);assert.ok(record);
        const observation=inspectSelectionReplay(row),previous=record.obligations.authoredActivation;
        assert.ok(['partial','evidence-join-pending'].includes(previous.disposition));
        selectionReplayCounts.cases++;selectionReplayCounts.stages+=observation.stages.length;
        selectionReplayCounts[previous.disposition==='evidence-join-pending'?'previouslyPending':'existingPartial']++;
        selectionReplayCounts.stateMismatches+=observation.stages.filter(stage=>!stage.matches).length;
        selectionReplayCounts.diagnosticFailures+=row.meetsAcceptance?0:1;
        selectionReplayCounts.eventFailures+=row.eventComparison.matches?0:1;
        record.obligations.authoredActivation={...previous,disposition:'partial',retainedPointerSelection:{...observation,
          evidence:{report:{file,sha256},manifest:{file:manifestFile,sha256:hash(readFileSync(manifestFile))},
            currentCompleteActionSource:actionSource,completeSelectionProbeHash:hash(selectionProbe.captureSelectionTransitions)}},
          remaining:[...(previous.remaining??[]),'Complete configured action and diagnostic/baseline scope reconciliation,local paint and resource/current-runtime applicability']};
        record.obligations.semantics={...record.obligations.semantics,retainedActualChoiceState:{disposition:'partial',
          evidenceCase:key,evidenceObligation:'authoredActivation.retainedPointerSelection',
          nativeStateMode:observation.nativeStateMode,candidateStateMode:observation.candidateStateMode,
          boundary:'Actual live control-state observations in a separate three-stage pointer diagnostic;not complete DOM/AX relationships,original radio checked fields,current rendering or whole-case closure.'}};
      }
      const observations=currentBuildCases.get(key)??[];
      observations.push({mode,recordedMeetsAcceptance:row.meetsAcceptance,browser:capture.browser,
        installedDependencies:{logicalFile:installedLockFile,capturedSha256:capture.captureProvenance.installedDependencies,currentSha256:installedLockSha,matches:installedLockMatches},
        harnessDifferences:moduleDrift.map(receipt=>({logicalFile:receipt.file,currentSha256:receipt.sha256,
          capturedSha256:capture.captureProvenance.harnessFiles.find(old=>old.file===receipt.file)?.sha256})),
        evidence:{report:{file,sha256},manifest:{file:manifestFile,sha256:hash(readFileSync(manifestFile))}}});
      currentBuildCases.set(key,observations);
    }
  }
  assert.equal(currentBuildCases.size,91);assert.equal(buildCaptureCounts.records,92);
  assert.deepEqual(selectionReplayCounts,{cases:32,stages:96,previouslyPending:32,existingPartial:0,stateMismatches:0,diagnosticFailures:8,eventFailures:8});
  const inspectRadioKeyboardState=evidence=>{
    const observations=evidence.observations;
    assert.equal(observations.reference.steps.length,3);assert.equal(observations.astylar.steps.length,3);
    const stages=['Tab','ArrowLeft','ArrowRight'].map((action,index)=>{
      const reference=observations.reference.steps[index],candidate=observations.astylar.steps[index];
      assert.equal(reference.kind,'input:radio');assert.equal(candidate.kind,'div:radio');
      for(const step of [reference,candidate])for(const owner of ['solo','team'])assert.equal(typeof step[owner],'boolean');
      return {action,reference:[reference.solo,reference.team],candidate:[candidate.solo,candidate.team],
        matches:reference.solo===candidate.solo&&reference.team===candidate.team};
    });
    assert.deepEqual(stages.map(stage=>stage.reference),[[false,true],[true,false],[false,true]]);
    assert.deepEqual(stages.map(stage=>stage.candidate),[[false,true],[false,true],[false,true]]);
    assert.deepEqual(stages.map(stage=>stage.matches),[true,false,true]);
    return stages;
  };
  const radioKeyboardRecords=allObligations.filter(record=>record.family==='radio'
    &&record.obligations.programmaticFocus.supplementaryKeyboardFocus);
  assert.equal(radioKeyboardRecords.length,8);
  for(const record of radioKeyboardRecords){
    const focus=record.obligations.programmaticFocus.supplementaryKeyboardFocus;
    assert.equal(focus.originalOutcome,'inspected-failure');
    record.obligations.semantics={...record.obligations.semantics,retainedActualRadioKeyboardState:{
      disposition:'partial',evidenceCase:record.case,evidenceObligation:'programmaticFocus.supplementaryKeyboardFocus.evidence',
      stages:inspectRadioKeyboardState(focus.evidence),
      nativeStateMode:'actual-native-input-checked-properties',candidateStateMode:'actual-semantic-DOM-aria-checked-equals-true',
      boundary:'Original authenticated Tab/ArrowLeft/ArrowRight observations only. Candidate false combines absent and non-true ARIA values;attribute presence and AX associations are not proved. Store selected is not used. Original keyboard failure remains;not baseline radio trees,current rendering or whole-case closure.'}};
  }
  for(const mutate of [
    evidence=>{delete evidence.observations.reference.steps[0].solo;},
    evidence=>{evidence.observations.astylar.steps[1].solo=true;},
    evidence=>{evidence.observations.reference.steps[0].kind='div:radio';},
    evidence=>{evidence.observations.astylar.steps.pop();},
  ]){const altered=structuredClone(radioKeyboardRecords[0].obligations.programmaticFocus.supplementaryKeyboardFocus.evidence);
    mutate(altered);assert.throws(()=>inspectRadioKeyboardState(altered));}
  const selectionControl=JSON.parse(readFileSync('artifacts/material-parity/selection-pointer-directions-20261011/latest-report.json')).interactions
    .find(row=>row.family==='radio');
  for(const mutate of [
    row=>{row.selectionTransitions.stages[1].astylar.values[0]=!row.selectionTransitions.stages[1].astylar.values[0];},
    row=>{row.selectionTransitions.stages.pop();},
    row=>{row.selectionTransitions.stages[0].reference.values.pop();},
    row=>{row.eventComparison.matches=true;},
  ]){const altered=structuredClone(selectionControl);mutate(altered);assert.throws(()=>inspectSelectionReplay(altered));}
  const buildEvidenceCase=allObligations[0].case;
  for(const record of allObligations){
    const captures=currentBuildCases.get(record.case)??[];
    buildCaptureCounts[captures.length?'unique':'withoutCapture']++;
    const previous=record.obligations.sourceCurrentness;
    record.obligations.sourceCurrentness={...previous,applicability:'applicable',disposition:'partial',
      baselineOutput:'historical-served-build-differs',currentServedBuildCapture:captures.length?'retained-capture-matches-served-build':'no-retained-capture-matching-served-build',
      captures,sharedBuildEvidenceCase:buildEvidenceCase,
      ...(record.case===buildEvidenceCase?{sharedBuildEvidence:{servedDifference,baselineBrowser:captured.browser,
        currentServedFiles:currentServed.map(receipt=>({file:`${servedRoot}/${receipt.file}`,sha256:receipt.sha256})),
        currentHarnessFiles:currentModules,installedLock:{file:installedLockFile,sha256:installedLockSha}}}:{}),
      boundary:'Filesystem/build/harness and exact checkpoint applicability only. Dependency-lock field covers the workspace root,not showcase-installed package equivalence. Report modes are not combined acceptance; captured browser version,launch,clock,fonts,execution and full equal-input obligations still need scope-specific validity. No current-browser run or whole-case acceptance.',
      remaining:[...(previous.remaining??[]),'Full runtime/environment/input applicability and complete enforced current rendering evidence']};
  }
  assert.deepEqual(buildCaptureCounts,{records:92,unique:91,withoutCapture:2220,installedLockMatches:3,installedLockDiffers:0});
  const snackbarPaintFile='tests/material-parity/modal-position-inspection.spec.mjs';
  const snackbarPaintSource=readFileSync(snackbarPaintFile,'utf8');
  const snackbarPaintCallback=source=>{
    const ast=ts.createSourceFile(snackbarPaintFile,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const calls=ast.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
      &&node.expression.arguments[0]?.text==='all 34 retained snackbar rasters contain the surface inside the viewport');
    assert.equal(calls.length,1);let pixelPredicate;
    const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='paintedFraction')pixelPredicate=node.initializer.getText(ast);ts.forEachChild(node,visit);};
    visit(calls[0]);assert.ok(pixelPredicate);
    return {callback:calls[0].expression.arguments[1].getText(ast),pixelPredicate};
  };
  const snackbarPaintBody=snackbarPaintCallback(snackbarPaintSource);
  assert.deepEqual(snackbarPaintBody,snackbarPaintCallback(execFileSync('git',['show',`8aa0e2e5:${snackbarPaintFile}`],{encoding:'utf8',maxBuffer:4_000_000})));
  assert.equal(hash(snackbarPaintBody.callback),'5c42ec7a36cb92860b65ac6e1af9a7d0750df7afe84ab6485bc442048099a5dc');
  const inspectSnackbarSurface=(row,png)=>{
    const box=row.overlayPlacement.astylar,dpr=row.viewport.deviceScaleFactor;
    assert.equal(png.width,row.viewport.width*dpr);assert.equal(png.height,row.viewport.height*dpr);
    const left=Math.ceil((box.x+8)*dpr),right=Math.floor((box.x+box.width-8)*dpr),
      top=Math.ceil((box.y+box.height-8)*dpr),bottom=Math.floor((box.y+box.height-4)*dpr);
    assert.ok(left>=0&&right<=png.width&&top>=0&&bottom<=png.height&&right>left&&bottom>top);
    const sample=Function('top','bottom','left','right','png',`return (${snackbarPaintBody.pixelPredicate})`)(top,bottom,left,right,png);
    const paintedFraction=sample(png.data);assert.ok(paintedFraction>.98);
    assert.equal(sample(Buffer.alloc(png.data.length,255)),0);
    return {paintedFraction,strip:{left,right,top,bottom},rgba:[50,47,53,255],threshold:.98};
  };
  const snackbarPaintCases=new Map();let snackbarRasterReceipts=0;
  for(const [run,sha256]of [
    ['current-ancestry-audit','b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a'],
    ['overlay-used-dimensions-current-20261011','931bc5fbec43ae47a6fc14533c906cce87cd0d083f2911e5d8bdb6d12d582d67'],
  ]){
    const file=`artifacts/material-parity/${run}/latest-report.json`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);
    const report=JSON.parse(bytes),rows=report.interactions.filter(row=>row.family==='snack-bar'&&row.overlayPlacement?.targetId);
    assert.equal(rows.length,34);const receipts=[];
    const checkpoint=run==='current-ancestry-audit'?undefined:openMaterialCheckpoint({directory:`artifacts/material-parity/${run}`,provenance:report.captureProvenance,resume:true});
    for(const row of rows){
      if(checkpoint)assert.deepEqual(checkpoint.load(materialCaseKey('interaction',row)),row);
      const key=scalarCaseKey({...row,kind:'interaction'});assert.ok(paintCaseRows.has(key));
      const pngFile=row.inputTrees.astylar.file.replace('astylar-input-tree.json','astylar.png'),pngBytes=readFileSync(pngFile),png=PNG.sync.read(pngBytes);
      const receipt={file:pngFile,sha256:hash(pngBytes)};receipts.push(receipt);snackbarRasterReceipts++;
      const observations=snackbarPaintCases.get(key)??[];
      observations.push({run,observation:inspectSnackbarSurface(row,png),evidence:{report:{file,sha256},raster:receipt}});
      snackbarPaintCases.set(key,observations);
      const blank={...png,data:Buffer.alloc(png.data.length,255)};assert.throws(()=>inspectSnackbarSurface(row,blank));
    }
    if(run==='current-ancestry-audit')assert.equal(hash(JSON.stringify(receipts)),'52f3cf2cd4c63a1e352cb8445f2654b66a99d633072c9e3700492264179574f5');
  }
  assert.equal(snackbarPaintCases.size,34);assert.equal(snackbarRasterReceipts,68);
  for(const [key,captures]of snackbarPaintCases){
    assert.equal(captures.length,2);const record=allObligations.find(row=>row.case===key),previous=record.obligations.localPaint;
    assert.equal(previous.disposition,'evidence-join-pending');
    record.obligations.localPaint={...previous,disposition:'partial',retainedSnackbarSurface:{captures,
      source:{file:snackbarPaintFile,sha256:hash(readFileSync(snackbarPaintFile))},completeCallbackSha256:hash(snackbarPaintBody.callback),
      boundary:'Candidate surface visibility in text-free interior strips of two separate retained captures only. Not reference paint,text/edge/sharpness,current rendering,ordinary short-surface behavior,37 closed-state trigger paints or whole-case closure.'}};
  }
  const sheetCornerTitle='retained sheet corner pixels distinguish observable Share from transparent Copy link';
  const sheetCornerCallback=source=>{
    const ast=ts.createSourceFile(snackbarPaintFile,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    const calls=ast.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
      &&node.expression.arguments[0]?.text===sheetCornerTitle);assert.equal(calls.length,1);
    const callback=calls[0].expression.arguments[1];
    return {callback:callback.getText(ast),statements:callback.body.statements.map(node=>node.getText(ast)).join('\n')};
  };
  const sheetCornerBody=sheetCornerCallback(snackbarPaintSource);
  assert.deepEqual(sheetCornerBody,sheetCornerCallback(execFileSync('git',['show',`8aa0e2e5:${snackbarPaintFile}`],{encoding:'utf8',maxBuffer:4_000_000})));
  assert.equal(hash(sheetCornerBody.callback),'ff1f63683d1485c4dfdabf3a3586dec0228d33a70f06edfec7867540826b1627');
  // Execute every original statement/assertion; return already computed data only.
  const replaySheetCorners=Function('readFileSync','createHash','assert','PNG',sheetCornerBody.statements+'\nreturn {cases,receipts,differences};');
  const sheetCornerReplay=replaySheetCorners(readFileSync,createHash,assert,PNG);
  assert.throws(()=>replaySheetCorners(readFileSync,createHash,assert,{sync:{read:bytes=>{
    const png=PNG.sync.read(bytes);return {...png,data:Buffer.alloc(png.data.length,255)};
  }}}),'Blank actual pixels must not become an observable corner pass');
  const sheetCornerOffsets={contrast:0,other:0};let sheetCornerCases=0,sheetCornerFailures=0;
  for(const [index,row]of sheetCornerReplay.cases.entries()){
    const key=scalarCaseKey({...row,kind:'interaction'}),record=allObligations.find(record=>record.case===key);assert.ok(record);
    const category=row.profile==='contrast'?'contrast':'other',offset=sheetCornerOffsets[category];
    const deltas=sheetCornerReplay.differences[category].slice(offset,offset+4);sheetCornerOffsets[category]+=4;
    assert.equal(deltas.length,4);assert.ok(deltas.every(corner=>corner.length===6));
    const cornersMatch=deltas.every(corner=>corner.every(delta=>delta<=1));
    assert.equal(cornersMatch,category==='other');sheetCornerCases++;sheetCornerFailures+=cornersMatch?0:1;
    const receipts=sheetCornerReplay.receipts.slice(index*2,index*2+2).map(([file,sha256])=>({file,sha256}));
    assert.equal(receipts.length,2);const previous=record.obligations.localPaint;
    record.obligations.localPaint={...previous,disposition:'partial',retainedSheetCorners:{
      disposition:'inspected',cornersMatch,shareCornerDeltas:deltas,copyLinkEdge:'unobservable-zero-probe-energy',
      evidence:{report:{file:'artifacts/material-parity/current-ancestry-audit/latest-report.json',sha256:'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a'},
        rasters:receipts,source:{file:snackbarPaintFile,sha256:hash(readFileSync(snackbarPaintFile))}},
      completeCallbackSha256:hash(sheetCornerBody.callback),
      boundary:'Original six samples per Share corner;all original assertions preserved. Six contrast cases retain discrepancies;transparent Copy-link probes cannot prove its shape. Not full-row/text/color/current rendering or whole-case closure.'}};
  }
  assert.equal(sheetCornerCases,25);assert.equal(sheetCornerFailures,6);
  assert.deepEqual(sheetCornerOffsets,{contrast:24,other:76});
  // Progress exact-case paint join: reuse every assertion in the existing proof.
  const progressPaintFile='tests/material-parity/benchmark-config.spec.mjs';
  const progressPaintAST=ts.createSourceFile(progressPaintFile,readFileSync(progressPaintFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const progressPaintCalls=progressPaintAST.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
    &&node.expression.arguments[0]?.text==='progress focus paint preserves forty configured cases and paired raster failure evidence');
  assert.equal(progressPaintCalls.length,1);
  const progressPaintCallback=progressPaintCalls[0].expression.arguments[1];
  const progressPaintStatements=progressPaintCallback.body.statements.map(node=>node.getText(progressPaintAST)).join('\n');
  const progressPaintReplay=Function('readFileSync','createHash','assert','PNG','ts',
    progressPaintStatements+'\nreturn {candidate,native,membership};')(readFileSync,createHash,assert,PNG,ts);
  const progressPaintKey=row=>[row.family,row.profile,row.viewport.width,row.viewport.height,row.viewport.deviceScaleFactor].join('/');
  const progressPaintReceipts=[
    {file:'artifacts/material-parity/progress-candidate-focus-paint-20261008.log',sha256:'5b498a2d6489924785a02968fd627acfa1ed5704b4b6437d3bca0172c1afc2af'},
    {file:'artifacts/material-parity/progress-reference-focus-paint-20261007.log',sha256:'d2a134f8e6134d9a99f1d7f25bec67c63f2ba9baed1ea1f85adc3c81f677f94f'},
    {file:'artifacts/material-parity/progress-configured-input-membership-20261006.log',sha256:'d64d73bea9a8e7d6ad2640bea3bc6a59c072ae9465f1aa3ca8577c5111fb6684'},
  ];
  const joinProgressPaint=entry=>{
    const cohort=progressPaintKey(entry);
    const observations=Object.fromEntries([['reference',progressPaintReplay.native],['astylar',progressPaintReplay.candidate]].map(([side,rows])=>{
      const matching=rows.slice(1,-1).filter(row=>progressPaintKey(row)===cohort);assert.equal(matching.length,1);
      const row=matching[0];
      return [side,{before:row.before,after:row.after,changedPixels:row.changedPixels,clip:row.clip,
        rasters:Object.fromEntries(['before','after'].map(state=>[state,{sha256:row.rasters[state].sha256}]))}];
    }));
    return {disposition:'inspected',outcome:'bounded-focus-paint-and-unfocusable-candidate-failure',
      evidence:{logs:progressPaintReceipts,cohort,observations,
        proof:{file:progressPaintFile,sha256:hash(readFileSync(progressPaintFile))},completeCallbackSha256:hash(progressPaintCallback.getText(progressPaintAST))},
      boundary:'Every original membership/source/PNG assertion replayed. Focus-input mismatch preserved; not equal-input track/cap/edge paint,full current runtime or whole-case acceptance.'};
  };
  assert.throws(()=>joinProgressPaint({...progressPaintReplay.membership[0],profile:'invented'}));
  const progressPaintIDs=progressPaintReplay.membership.map(row=>scalarCaseKey({...row,kind:row.state==='static'?'static':'interaction',state:row.state==='static'?undefined:row.state}));
  assert.equal(new Set(progressPaintIDs).size,40);
  assert.deepEqual(progressPaintIDs.slice().sort(),allObligations.filter(row=>['progress-bar','progress-spinner'].includes(row.family)).map(row=>row.case).sort());
  for(const id of progressPaintIDs){
    const record=allObligations.find(row=>row.case===id),entry=configuredByKey.get(id);assert.ok(entry);
    const previous=record.obligations.localPaint;assert.ok(['partial','evidence-join-pending'].includes(previous.disposition));
    record.obligations.localPaint={...previous,disposition:'partial',retainedProgressFocusPaint:joinProgressPaint(entry)};
  }
  // End progress exact-case paint join; other obligation data is preserved.
  // Progress exact-case ownership join: replay the unchanged owning assertions.
  const progressLifetimeFile='tests/material-parity/input-boundary-evidence.spec.mjs';
  const progressLifetimeAST=ts.createSourceFile(progressLifetimeFile,readFileSync(progressLifetimeFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const progressLifetimeCalls=progressLifetimeAST.statements.filter(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
    &&node.expression.arguments[0]?.text==='retained progress focus caps and update disposal preserve complete configured cohort evidence');
  assert.equal(progressLifetimeCalls.length,1);
  const progressLifetimeCallback=progressLifetimeCalls[0].expression.arguments[1];
  assert.equal(hash(progressLifetimeCallback.getText(progressLifetimeAST)),'c1775f98f759846d3e71a4e844766a0bbcd21cfb79b4767ead8cc9c86fc12212');
  const progressLifetimeStatements=progressLifetimeCallback.body.statements.map(node=>node.getText(progressLifetimeAST)).join('\n');
  const progressLifetimeImport="import('./position-composition-producer-transition.mjs')";
  assert.equal(progressLifetimeStatements.split(progressLifetimeImport).length,2);
  // Only resolve the original relative import for this in-memory function launch.
  const progressLifetimeLaunch=progressLifetimeStatements.replace(progressLifetimeImport,'import(proofModuleURL)');
  assert.equal(progressLifetimeLaunch.replace('import(proofModuleURL)',progressLifetimeImport),progressLifetimeStatements);
  const progressLifetimeReplay=await Object.getPrototypeOf(async function(){}).constructor('readFileSync','assert','hash','proofModuleURL',
    progressLifetimeLaunch+'\nreturn {ownership,membership};')(readFileSync,assert,hash,new URL('./position-composition-producer-transition.mjs',import.meta.url).href);
  const progressLifetimeReceipts=[
    {file:'artifacts/material-parity/progress-update-disposal-20261007-retry.log',sha256:'e6a3ca134633265655100f3c214812343a47ceaa459d2e96d38e222fbf66143d'},
    {file:'artifacts/material-parity/progress-remaining-update-disposal-20261007.log',sha256:'9c5751074266de90a09050dd8b313c925b98bbdf94874e3cb99c01a901cbc8ff'},
  ];
  const joinProgressLifetime=(entry,rows=progressLifetimeReplay.ownership)=>{
    const cohort=progressPaintKey(entry);
    const matches=rows.filter(row=>progressPaintKey({family:row.family,...row.diagnostic})===cohort);assert.equal(matches.length,1);
    const d=matches[0].diagnostic;assert.deepEqual(d.errors,[]);assert.equal(d.snapshots.length,4);
    for(const sample of d.snapshots){assert.deepEqual(sample.live,d.snapshots[0].live);assert.deepEqual(sample.tracked,sample.live);}
    assert.deepEqual(d.disposal.live,{meshes:0,materials:0,textures:0});
    return {disposition:'inspected',outcome:'bounded-three-equal-value-update-plateau-and-disposal',
      evidence:{logs:progressLifetimeReceipts,cohort,snapshots:d.snapshots,disposal:d.disposal,
        proof:{file:progressLifetimeFile,sha256:hash(readFileSync(progressLifetimeFile))},completeCallbackSha256:hash(progressLifetimeCallback.getText(progressLifetimeAST))},
      boundary:'Original focus/AX/cap/update/disposal assertions replayed with only import launch resolution. Redundant owned transparent material remains. Not changed-value replacement,remount/peer/cache safety,full lifetime or current rendering acceptance.'};
  };
  assert.throws(()=>joinProgressLifetime({...progressLifetimeReplay.membership[0],profile:'invented'}));
  const alteredProgressLifetime=structuredClone(progressLifetimeReplay.ownership);
  alteredProgressLifetime[0].diagnostic.snapshots[1].live.materials++;
  assert.throws(()=>joinProgressLifetime({family:alteredProgressLifetime[0].family,...alteredProgressLifetime[0].diagnostic},alteredProgressLifetime));
  for(const id of progressPaintIDs){
    const record=allObligations.find(row=>row.case===id),entry=configuredByKey.get(id),previous=record.obligations.historyOwnership;
    assert.equal(previous.disposition,'partial');
    record.obligations.historyOwnership={...previous,retainedProgressUpdateDisposal:joinProgressLifetime(entry)};
  }
  // End progress exact-case ownership join; remaining history/lifetime work stays.
  // Divider exact-case semantic join: preserve separate target/ancestor/companion captures.
  const dividerSemanticFile='tests/material-parity/input-boundary-evidence.spec.mjs';
  const dividerSemanticAST=ts.createSourceFile(dividerSemanticFile,readFileSync(dividerSemanticFile,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const dividerSemanticCallback=dividerSemanticAST.statements.find(node=>ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)
    &&node.expression.arguments[0]?.text==='divider actual-theme AX cohorts preserve exact contexts and runtime receipts').expression.arguments[1];
  assert.equal(hash(dividerSemanticCallback.getText(dividerSemanticAST)),'a0c5e039b2e92db68febff91b127d23f0fa9de7782409c7a79bc5ea83a1cf911');
  const dividerSemanticStatements=dividerSemanticCallback.body.statements.map(node=>node.getText(dividerSemanticAST)).join('\n');
  const dividerSemanticReplay=Function('readFileSync','hash','assert','execFileSync','ts','fingerprintDirectory','materialStaticCases','materialInteractionCases',
    dividerSemanticStatements+'\nreturn {companionRows,current};')(readFileSync,hash,assert,execFileSync,ts,fingerprintDirectory,materialStaticCases,materialInteractionCases);
  const dividerSemanticReceipts=[
    ['divider-ancestor-ax-current-20261011.log','c5e5138afd3061697cccde34a2467739786d93705638ba0f5e5725c40e4b3c5a'],
    ['divider-ancestor-ax-comparison-current-20261011.log','9ebbd9981229138817a4603ff16ecd2bd805b5a7440f1aff483a673f20d433b7'],
    ['divider-companion-ax-standard-20261014.log','f01e63a7285143b7f0f1f73de3979cca321575b5f32840f7e861d2fae8701901'],
    ['divider-companion-ax-comparison-20261014.log','ffa9a7fc91f2ed11c57c63f249759b47d61dfbf7acf06d42951bc3e61f921505'],
  ].map(([name,sha256])=>({file:`artifacts/material-parity/${name}`,sha256}));
  const joinDividerSemanticScope=(entry,companions=dividerSemanticReplay.companionRows)=>{
    const cohort=dividerKey(entry),observations={};
    for(const side of ['reference','astylar']){
      const select=rows=>rows.filter(row=>row.side===side&&physicalDividerKey(row.context.profile,row.context.viewport,row.context.deviceScaleFactor)===cohort);
      const local=select(companions),ancestors=select(dividerSemanticReplay.current);
      assert.equal(local.length,1);assert.equal(ancestors.length,1);
      assert.deepEqual(local[0].companionAX.map(value=>value.id),['divider-above','divider-below']);
      for(const [index,label]of ['Above','Below'].entries())assert.equal(local[0].companionAX[index].nodes[2].name.value,label);
      const mains=ancestors[0].axRelatives.filter(node=>!node.ignored&&node.role.value==='main');
      assert.equal(mains.length,side==='reference'?1:2);
      observations[side]={companionCapture:{context:local[0].context,subtrees:local[0].companionAX},
        ancestorCapture:{context:ancestors[0].context,nodes:ancestors[0].axRelatives}};
    }
    return {disposition:'inspected',outcome:'local-paragraph-text-agreement-with-authored-extra-main',
      evidence:{logs:dividerSemanticReceipts,cohort,observations,
        proof:{file:dividerSemanticFile,sha256:hash(readFileSync(dividerSemanticFile))},completeCallbackSha256:hash(dividerSemanticCallback.getText(dividerSemanticAST))},
      findings:[{id:'fixture-divider-extra-main-landmark',classification:'application-plugin-authoring-defect',
        owner:'showcase outer main.frame and authored SiteData main#page',firstDivergence:'application document structure before semantic bridge',
        conclusion:'The bridge preserves the two authored main owners; reference has one. Local paragraph/text agreement does not waive this ancestor difference.'}],
      boundary:'Exact physical-context correspondence only; October11 ancestors and October14 companions are separate observations,not one AX tree or cross-capture node-ID mapping. No live AT or whole-case acceptance.'};
  };
  assert.throws(()=>joinDividerSemanticScope({...dividerCases[0],profile:'invented'}));
  const forgedDividerCompanions=structuredClone(dividerSemanticReplay.companionRows);
  forgedDividerCompanions[0].companionAX[0].nodes[2].name.value='Wrong';
  assert.throws(()=>joinDividerSemanticScope(dividerCases.find(entry=>dividerKey(entry)===physicalDividerKey(forgedDividerCompanions[0].context.profile,
    forgedDividerCompanions[0].context.viewport,forgedDividerCompanions[0].context.deviceScaleFactor)),forgedDividerCompanions));
  for(const record of allObligations.filter(row=>row.family==='divider')){
    const previous=record.obligations.semantics;
    assert.deepEqual(previous.remaining,['actual generated bridge and AX relationships','assistive-technology behavior','complete semantic input mapping',
      'current rendering applicability','Actual AX/description/target associations and full semantic/currentness disposition beyond DOM comparator']);
    record.obligations.semantics={...previous,observedComponentAX:joinDividerSemanticScope(configuredByKey.get(record.case)),
      remaining:['Semantic input correspondence for page-frame siblings outside the observed divider region/ancestor chain',
        'Applicability beyond recorded served-build checkpoints and complete final current-code gates'],
      limitations:['Live assistive-technology experience is unmeasured; CDP observations do not certify it']};
  }
  assert.equal(allObligations.filter(row=>row.obligations.semantics.observedComponentAX).length,24);
  // End divider exact-case semantic join; other obligations and whole-case status stay.
  // No-editor authored exclusion join: close only the reviewed source/target obligation.
  const noEditorCases=allObligations.filter(row=>{
    const targets=row.obligations.authoredEditing.retainedTargetApplicability?.targets;
    return targets&&targets.reference.length===0&&targets.astylar.length===0;
  });
  const noEditorFamilies=[...new Set(noEditorCases.map(row=>row.family))].sort();
  assert.equal(noEditorCases.length,1380);assert.equal(noEditorFamilies.length,21);
  const noEditorSources=[
    ['examples/material-showcase/src/app/reference.component.ts','debe55bc492d0fa1e48a9c7f09e1b668d435a2260588710207ab878b23c1d4aa'],
    ['examples/material-showcase/src/app/astylar.component.ts','71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd'],
    ['examples/material-showcase/src/index.html','1a1f2c8ae04e66027dd4af59ca1d170913c0664b78a2017f62dc6cbbeac0a698'],
    ['examples/material-showcase/node_modules/@angular/material/fesm2022/slider.mjs','b64564b1fc362e1e9b238fc322d2cea6517ebcf3139e58b775484a2218faba48'],
  ].map(([file,sha256])=>{assert.equal(hash(readFileSync(file)),sha256);return {file,sha256};});
  const {parseTemplate}=await import('@angular/compiler');
  const noEditorName=(node,source)=>typeof node.text==='string'?node.text:node.getText(source);
  const noEditorProp=(object,key,source)=>object.properties.find(node=>ts.isPropertyAssignment(node)&&noEditorName(node.name,source)===key)?.initializer;
  const referenceSource=ts.createSourceFile(noEditorSources[0].file,readFileSync(noEditorSources[0].file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const referenceClass=referenceSource.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='ReferenceComponent');
  const referenceMetadata=ts.getDecorators(referenceClass).find(node=>ts.isCallExpression(node.expression)&&node.expression.expression.getText(referenceSource)==='Component').expression.arguments[0];
  const referenceTemplate=parseTemplate(noEditorProp(referenceMetadata,'template',referenceSource).text,noEditorSources[0].file,{preserveWhitespaces:true});
  assert.equal(referenceTemplate.errors,null);
  const walkTemplate=(node,visit,skip)=>{if(node===skip)return;visit(node);for(const key of ['children','branches','cases'])for(const child of node[key]??[])walkTemplate(child,visit,skip);if(node.empty)walkTemplate(node.empty,visit,skip);};
  let familySwitch;
  for(const root of referenceTemplate.nodes)walkTemplate(root,node=>{
    if(node.constructor.name==='SwitchBlock'&&node.expression.source==='family()'){assert.equal(familySwitch,undefined);familySwitch=node;}
  });
  assert.ok(familySwitch);
  let nativeRangeInputs=0;
  const inspectNativeNoEditor=node=>{
    assert.notEqual(node.name,'textarea');
    for(const attribute of [...node.attributes??[],...node.inputs??[]])assert.ok(!/contenteditable|innerhtml|outerhtml|ngcomponentoutlet/i.test(attribute.name));
    if(node.name==='input'){
      const attributes=new Set(node.attributes.map(attribute=>attribute.name));
      assert.ok(attributes.has('matSliderStartThumb')||attributes.has('matSliderEndThumb'));nativeRangeInputs++;
    }
  };
  for(const root of referenceTemplate.nodes)walkTemplate(root,inspectNativeNoEditor,familySwitch);
  for(const family of noEditorFamilies){
    const branch=familySwitch.cases.find(node=>node.expression?.source===`'${family}'`)??familySwitch.cases.find(node=>!node.expression);
    assert.ok(branch);walkTemplate(branch,inspectNativeNoEditor);
  }
  assert.equal(nativeRangeInputs,2);
  const sliderSource=ts.createSourceFile(noEditorSources[3].file,readFileSync(noEditorSources[3].file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const thumbClass=sliderSource.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='MatSliderThumb');
  const rangeClass=sliderSource.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='MatSliderRangeThumb');
  assert.equal(rangeClass.heritageClauses[0].types[0].expression.getText(sliderSource),'MatSliderThumb');
  const directive=thumbClass.members.find(node=>node.name?.getText(sliderSource)==='ɵdir').initializer.arguments[0];
  assert.equal(noEditorProp(noEditorProp(noEditorProp(directive,'host',sliderSource),'attributes',sliderSource),'type',sliderSource).text,'range');
  const candidateSource=ts.createSourceFile(noEditorSources[1].file,readFileSync(noEditorSources[1].file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  const candidateClass=candidateSource.statements.find(node=>ts.isClassDeclaration(node)&&node.name?.text==='AstylarShowcaseComponent');
  const familyMethod=candidateClass.members.find(node=>node.name?.getText(candidateSource)==='familyElements');
  const unwrapNode=node=>ts.isAsExpression(node)||ts.isParenthesizedExpression(node)?unwrapNode(node.expression):node;
  const inspectCandidateNoEditor=node=>{
    if(ts.isObjectLiteralExpression(node)){
      for(const property of node.properties)if(property.name)assert.notEqual(noEditorName(property.name,candidateSource).toLowerCase(),'contenteditable');
      const authoredType=noEditorProp(node,'type',candidateSource);
      if(authoredType){
        const type=unwrapNode(authoredType);assert.ok(ts.isStringLiteral(type),'Dynamic node type requires separate review');assert.notEqual(type.text,'textarea');
        if(type.text==='input'){
          const inputType=unwrapNode(noEditorProp(node,'inputType',candidateSource));
          assert.ok(ts.isStringLiteral(inputType)&&nonTextInputTypes.has(inputType.text),'Writable input requires separate review');
        }
      }
    }
    ts.forEachChild(node,inspectCandidateNoEditor);
  };
  for(const family of noEditorFamilies){
    const branches=familyMethod.body.statements.filter(ts.isIfStatement).filter(node=>Function('family',`return (${node.expression.getText(candidateSource)});`)(family));
    assert.ok(branches.length===1||family==='button'&&branches.length===0);
    inspectCandidateNoEditor(branches[0]?.thenStatement??familyMethod.body.statements.find(ts.isReturnStatement));
  }
  for(const method of ['selectionMark','buildSiteData'])inspectCandidateNoEditor(candidateClass.members.find(node=>node.name?.getText(candidateSource)===method).body);
  for(const receipt of noEditorSources.slice(0,3))assert.ok(!/contenteditable|contentEditable|designMode|innerHTML|outerHTML|insertAdjacentHTML/.test(readFileSync(receipt.file,'utf8')));
  for(const snippet of ['<textarea></textarea>','<div contenteditable="true"></div>','<input>']){
    const parsed=parseTemplate(snippet,'control.html');assert.equal(parsed.errors,null);assert.throws(()=>inspectNativeNoEditor(parsed.nodes[0]));
  }
  for(const snippet of ['const x={type:"input",inputType:"text"};','const x={type:"textarea"};','const x={type:"div",contenteditable:true};'])
    assert.throws(()=>inspectCandidateNoEditor(ts.createSourceFile('control.ts',snippet,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)));
  for(const record of noEditorCases){
    const previous=record.obligations.authoredEditing;assert.equal(previous.applicability,'not-applicable');
    assert.deepEqual(previous.remaining,['source-wide and uncaptured-state applicability','disabled/readonly behavior where applicable']);
    record.obligations.authoredEditing={...previous,disposition:'inspected-authored-exclusion',remaining:[],
      conclusion:'No writable text target is authored in either corresponding family branch,shared frame/dialog/sheet template,selection mark or common SiteData construction; retained exact-case targets are empty on both sides.',
      evidence:{pairedTrees:previous.retainedTargetApplicability.evidence,sources:noEditorSources},
      boundary:'Authored text editing exclusion only. Range/non-text value changes,keyboard navigation,focus,plugin-generated internals,paint,lifetime and current rendering remain separate obligations; no whole-case closure.'};
  }
  assert.equal(allObligations.filter(row=>row.obligations.authoredEditing.disposition==='inspected-authored-exclusion'
    &&row.obligations.authoredEditing.retainedTargetApplicability).length,1380);
  // End no-editor authored exclusion join; unrelated behavior and whole-case status stay.
  // Divider retained paint and owner joins: preserve failures and exact remaining boundaries.
  const dividerPaintLogs=[
    ['divider-separator-span-visibility-20261014.log','ff30ee436eac2ee89dc069b6a21100146f6468a68ec5048ddfe3d00bea68ae42'],
    ['divider-separator-recorded-ink-midpoint-20261014.log','601e8407a3fdfd8ccbd1201cfefd7ef7b37406a4a9d44910e1b8cd06f7acecdd'],
    ['divider-separator-mixed-ink-coverage-model-20261014.log','18495e20e4bbc597bb0d1afebdd714ceb1b7749d4fbe6237873d579f3d294a69'],
  ].map(([name,sha256])=>{const file=`artifacts/material-parity/${name}`,bytes=readFileSync(file);assert.equal(hash(bytes),sha256);return {file,sha256,data:JSON.parse(bytes)};});
  const [dividerSpans,dividerInk,dividerMix]=dividerPaintLogs.map(row=>row.data);
  assert.equal(dividerSpans.observations.length,48);assert.equal(dividerInk.observations.length,48);
  assert.equal(dividerMix.recordedPixelLogSha256,dividerPaintLogs[1].sha256);
  assert.equal(dividerMix.mixedCases,8);assert.equal(dividerMix.pixels,16);
  const paragraphFinding=sourceAuditDefinitions.find(row=>row.id==='fixture-divider-replaces-paragraph-flow-with-coordinates');
  assert.equal(paragraphFinding.classification,'application-plugin-authoring-defect');
  const inspectDividerOwners=trees=>{
    const paragraphs=[],frame=[];
    for(const id of ['divider-above','divider-below']){
      const reference=trees.reference.nodes.find(node=>node.attributes?.id===id),candidate=trees.astylar.nodes.find(node=>node.authored?.id===id);
      assert.equal(reference.type,'span');assert.equal(candidate.authored.type,'span');
      const nativeOwner=trees.reference.nodes.find(node=>node.key===reference.parent),owner=trees.astylar.nodes.find(node=>node.key===candidate.parent);
      assert.equal(nativeOwner.type,'p');assert.equal(owner.authored.type,'p');
      assert.deepEqual(trees.reference.nodes.filter(node=>node.parent===nativeOwner.key).map(node=>node.attributes?.id),[id]);
      assert.deepEqual(trees.astylar.nodes.filter(node=>node.parent===owner.key).map(node=>node.authored?.id),[id]);
      assert.equal(trees.reference.styles[nativeOwner.style].position,'static');assert.equal(owner.resolvedStyle.position,'absolute');
      paragraphs.push({target:id,reference:{key:nativeOwner.key,position:trees.reference.styles[nativeOwner.style].position,usedHeight:trees.reference.styles[nativeOwner.style].height},
        astylar:{key:owner.key,position:owner.resolvedStyle.position,declaredHeight:owner.resolvedStyle.height,declaredTop:owner.resolvedStyle.top}});
    }
    for(const [id,type,text]of [['eyebrow','p','Angular Material 20 reference'],['title','h1','divider']]){
      const candidate=trees.astylar.nodes.find(node=>node.authored?.id===id);
      const native=trees.reference.nodes.filter(node=>node.type===type&&node.ownText===text);
      assert.equal(native.length,1);assert.equal(candidate.authored.type,type);assert.equal(candidate.authored.textContent,text);
      for(const key of Object.keys(native[0].attributes))assert.ok(!/^(role|aria-|tabindex|contenteditable|hidden|lang|dir$)/.test(key));
      for(const key of Object.keys(candidate.authored))assert.ok(!/^(role|aria|tabindex|contenteditable|hidden|lang|dir$)/.test(key));
      frame.push({referenceKey:native[0].key,astylarKey:candidate.key,type,text});
    }
    return {paragraphs,frame};
  };
  let dividerPaintOwnerJoins=0;
  for(const record of allObligations.filter(row=>row.family==='divider')){
    const trees={};
    for(const side of ['reference','astylar']){const receipt=record.evidence.pairedTrees[side],bytes=readFileSync(receipt.file);assert.equal(hash(bytes),receipt.sha256);trees[side]=JSON.parse(bytes);}
    const owners=inspectDividerOwners(trees);
    const separator={};
    for(const side of ['reference','astylar']){
      const rows=dividerSpans.observations.filter(row=>scalarCaseKey(JSON.parse(row.case))===record.case&&row.side===side);
      assert.equal(rows.length,1);const span=rows[0];assert.equal(span.visibleColumns,span.totalColumns);assert.deepEqual(span.missingColumns,[]);
      const ink=dividerInk.observations.filter(row=>row.side===side&&row.file===span.file);assert.equal(ink.length,1);assert.equal(ink[0].sha256,span.sha256);
      const bytes=readFileSync(span.file);assert.equal(hash(bytes),span.sha256);
      assert.equal(span.file.replaceAll('\\','/'),record.evidence.pairedTrees[side].file.replaceAll('\\','/').replace(/-input-tree\.json$/,'.png'));
      const image=PNG.sync.read(bytes),band=span.band;
      assert.ok(band.left>=0&&band.right<=image.width&&band.top>=0&&band.bottom<=image.height&&band.baseline>=0&&band.baseline<image.height);
      let visible=0;
      for(let x=band.left;x<band.right;x++){
        const baseline=(band.baseline*image.width+x)*4;let changed=false;
        for(let y=band.top;y<band.bottom&&!changed;y++){
          const pixel=(y*image.width+x)*4;changed=[0,1,2,3].some(channel=>image.data[pixel+channel]!==image.data[baseline+channel]);
        }
        if(changed)visible++;
      }
      assert.equal(visible,span.visibleColumns,'Original separator-band visibility must replay unchanged');
      separator[side]={span,midpoint:ink[0]};
    }
    if(dividerPaintOwnerJoins===0){
      const forged=structuredClone(trees);forged.astylar.nodes.find(node=>node.authored?.id==='divider-above').authored.type='div';assert.throws(()=>inspectDividerOwners(forged));
      const wrongFrame=structuredClone(trees);wrongFrame.astylar.nodes.find(node=>node.authored?.id==='eyebrow').authored.textContent='Wrong';assert.throws(()=>inspectDividerOwners(wrongFrame));
    }
    const receipts=dividerPaintLogs.map(({data,...receipt})=>receipt);
    const mixed=dividerMix.observations.filter(row=>row.profile===dividerInk.observations.find(ink=>ink.file===separator.astylar.span.file).profile
      &&row.viewport.id===dividerInk.observations.find(ink=>ink.file===separator.astylar.span.file).viewport.id
      &&row.state===dividerInk.observations.find(ink=>ink.file===separator.astylar.span.file).state);
    record.obligations.localPaint={...record.obligations.localPaint,retainedSeparatorPaint:{disposition:'inspected',
      outcome:'full-recorded-span-visible-with-unequal-border-fill-ink-inputs',evidence:{logs:receipts,observations:separator,mixedCoverageModel:mixed},
      boundary:'Recorded full-span visibility replay and authenticated midpoint/model observations only. Model fit is not actual GPU coverage/compositing causality,equal-input border paint or current rendering.'},
      remaining:['Exact endpoint and full antialiased footprint; actual coverage/compositing mechanism where attribution remains uncertain',
        'Complete equal-input owner paint attribution,original crop-producer applicability and final current-code gates']};
    record.obligations.inputStyleStructure={...record.obligations.inputStyleStructure,explicitParagraphOwners:{disposition:'inspected',
      findings:[{id:paragraphFinding.id,classification:paragraphFinding.classification,owner:'showcase paragraph wrapper authoring',firstDivergence:'static flow versus absolute positioned paragraph requests'}],
      evidence:{pairedTrees:record.evidence.pairedTrees,policy:{file:'tests/material-parity/input-equivalence-policy.mjs',sha256:hash(readFileSync('tests/material-parity/input-equivalence-policy.mjs'))},observations:owners.paragraphs},
      boundary:'Exact paragraph/span identity and existing classified position request difference. Native used heights and candidate declarations remain different stages; no anonymous line-box or full-property equivalence.'},
      remaining:['Complete material property/anonymous line-box correspondence beyond the identified explicit paragraph/span owners',
        'First-stage and paint applicability of remaining owners']};
    record.obligations.semantics={...record.obligations.semantics,authoredFrameSiblings:{disposition:'inspected',
      evidence:{pairedTrees:record.evidence.pairedTrees,observations:owners.frame},
      conclusion:'Both exact frame sibling owners agree in authored type/text and omit semantic attribute requests;the separately classified extra main remains a failure.',
      boundary:'Authored frame inputs only;not actual heading AX,live assistive-technology experience or current rendering.'},
      remaining:['Runtime applicability beyond recorded served-build checkpoints and complete final current-code gates'],
      limitations:[...record.obligations.semantics.limitations,'Actual frame heading AX is unmeasured;authored correspondence does not certify it']};
    dividerPaintOwnerJoins++;
  }
  assert.equal(dividerPaintOwnerJoins,24);
  // End divider retained paint and owner joins; whole-case/current-rendering status stays.
  assert.equal(new Set(allObligations.map(row=>row.case)).size,2311);
  assert.deepEqual(allObligations.map(row=>row.case).sort(),allConfigured.map(scalarCaseKey).sort());
  assert.ok(allObligations.every(row=>row.inspection==='partial'&&row.currentRendering==='unverified'));
  const proposal = saveReviewProposal('artifacts/material-parity/working-audit', {
    kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
    scope: 'Exact configured scalar-input membership plus bounded passive obligations; no runtime or whole-case acceptance.',
    groups: allObligations,
  });
  t.diagnostic(JSON.stringify({caseObligationProposal:proposal, cases:2311,passiveCases:354,additionalCases:1957,additionalTreeReceipts,
    authoredActivationExclusions:354,authoredEditingExclusions:354,programmaticFocusApplicable:40,
    reportedScalarInputCases:2311,reportedScalarGroups:8483,dividerActualAXCases:24,dividerUpdateDisposalCases:24,dividerLocalTextRasterCases:24,dividerCoordinateHistoryCases:24,supplementaryKeyboardCases:40,extendedKeyboardCases:128,
    editingTargetApplicabilityCases:1957,editingCounts,configuredFocusRecordedProvenanceIncomplete:40,supplementaryFocusCounts,retainedFocusCounts,keyboardActivationCounts,staticRangeHistoryJoins,staticHeightHistoryCounts,
    retainedTargetRasterCases:1000,paintCounts,sampledPaintCounts,retainedResourceSamplingCases:1875,resourceSampleCounts,
    retainedTargetDOMComparisonCases:2311,semanticCounts,compositeStateCounts,retainedEventBoundaryCases:1875,eventCounts,explicitPredicateCounts,supplementaryMenuActionContexts:menuActionJoins,commitEndpointCounts,rawControlJoins,rawActionRecords,buildCaptureCounts,selectionReplayCounts,completeCaseClosures:0,currentRenderingAccepted:0}));
  t.diagnostic(JSON.stringify({cases:354,pairedTreeReceipts:708,counts,programmaticFocusObservations:focusable,
    scope:'Exact configured retained authoring: no activation/editing descendants. Forty native negative-tabindex progress owners keep a programmatic-focus obligation; no live focus, unrecorded callback, paint, lifecycle, source-currentness or full-case closure is inferred.'}));
});

test('passive descendant semantics retain accessibility hiding omissions independently of visible target gates', () => {
  const raw = readFileSync('artifacts/material-parity/passive-descendant-semantics-20261006.log');
  assert.equal(hash(raw), 'aa5932cda3140e3f15fa661316c9da38a7e8b274fe6dce24eccb63602233147d');
  const records = raw.toString().trim().split(/\r?\n/).map(JSON.parse);
  const summary = records.at(-1);
  assert.equal(summary.summary.cases, 354);
  assert.equal(summary.summary.idReferences, 0);
  assert.deepEqual(summary.summary.hiddenByFamily, {
    'sidenav/reference': 124, 'badge/reference': 52, 'icon/reference': 20,
    'progress-bar/reference': 60, 'progress-spinner/reference': 40,
  });
  for (const receipt of summary.sources) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const type = readFileSync('src/app/types/dom-element.ts', 'utf8');
  const bridge = readFileSync('src/lib/astylar-semantic-bridge.ts', 'utf8');
  assert.equal(/ariaHidden\s*\??\s*:/.test(type), false);
  assert.equal(/element\.ariaHidden/.test(bridge), false);
  assert.ok(bridge.includes('if (child.hidden) continue;'), 'Visual hidden is not accessibility-only hiding');
  const icon = records.find(row => row.family === 'icon');
  const native = icon.sides.reference.find(node => node.type === 'mat-icon');
  assert.equal(native.attrs['aria-label'], 'Favorite');
  assert.equal(native.attrs['aria-hidden'], 'true');
  assert.equal(icon.sides.astylar.some(node => node.attrs.ariaHidden !== undefined), false);
});

test('current runtime member drift is confined to the retained layout diagnostic owner', async () => {
  const { transformSync } = await import('esbuild');
  const { restoreCursorInspectorCaptureSource } = await import('./public-cursor-defaults-evidence.mjs');
  const { pathToFileURL } = await import('node:url');
  // Use the consumer toolchain: the root workspace compiler is a different version.
  const consumerRequire = createRequire(path.resolve('examples/material-showcase/package.json'));
  const { transformAsync } = consumerRequire('@babel/core');
  const { default: linker } = await import(pathToFileURL(consumerRequire.resolve('@angular/compiler-cli/linker/babel')));
  assert.equal(consumerRequire('@angular/compiler-cli/package.json').version, '20.3.31');
  assert.equal(consumerRequire('@babel/core/package.json').version, '7.29.7');
  const wholeModule = code => transformSync(code, {
    loader: 'js', legalComments: 'none', minifyWhitespace: true,
  }).code;
  assert.notEqual(wholeModule('class Guard { static metadata = { value: 1 }; }'),
    wholeModule('class Guard { static metadata = { value: 2 }; }'));
  const rawMap = readFileSync('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map');
  assert.equal(hash(rawMap), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
  const map = JSON.parse(rawMap), modules = map.sources.filter(file => file.startsWith('node_modules/astylarui/'));
  assert.equal(modules.length, 88);
  const generated = new Set(['ɵfac', 'ɵprov', 'ɵcmp', 'ɵdir', 'ɵmod', 'ɵinj']);
  const project = code => {
    const ast = ts.createSourceFile('member.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    const result = new Map();
    const visit = node => {
      if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name) {
        const heritage = (node.heritageClauses ?? []).map(clause => clause.getText(ast)).join(' ');
        for (const member of node.members) {
          const name = member.name?.getText(ast) ?? 'constructor';
          if (generated.has(name)) continue;
          const key = `${node.name.text}:${ts.SyntaxKind[member.kind]}:${name}`;
          assert.equal(result.has(key), false);
          result.set(key, transformSync(`class Proof ${heritage} {${member.getText(ast)}}`,
            { loader: 'js', legalComments: 'none', minifyWhitespace: true }).code);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast); return result;
  };
  assert.equal(project('class Guard { get value(){return 1;} set value(v){} }').size, 2);
  assert.notDeepEqual(project('class Guard { value(){return 1;} }'), project('class Guard { value(){return 2;} }'));
  let equalMembers = 0;
  let linkedModules = 0;
  const differences = [];
  for (const module of modules) {
    const file = `src/${module.slice('node_modules/astylarui/dist/lib/'.length).replace(/\.js$/, '.ts')}`;
    const liveInstalledSource = readFileSync(`examples/material-showcase/${module}`, 'utf8');
    if (module === 'node_modules/astylarui/dist/lib/lib/astylar.js') {
      assert.throws(() => restoreCursorInspectorCaptureSource(liveInstalledSource + '\n// unrelated'));
      assert.throws(() => restoreCursorInspectorCaptureSource(
        liveInstalledSource.replace('inspectCurrentDocumentStyles(', 'alteredInspection(')));
    }
    const installedSource = module === 'node_modules/astylarui/dist/lib/lib/astylar.js'
      ? restoreCursorInspectorCaptureSource(liveInstalledSource) : liveInstalledSource;
    const linked = installedSource.includes('ɵɵngDeclare')
      ? (await transformAsync(installedSource, {
        filename: path.resolve('examples/material-showcase', module),
        configFile: false, babelrc: false, browserslistConfigFile: false,
        inputSourceMap: false, sourceMaps: false,
        plugins: [[linker, { linkerJitMode: false, sourceMapping: false }]],
      })).code : installedSource;
    assert.equal(wholeModule(map.sourcesContent[map.sources.indexOf(module)]),
      wholeModule(linked), `${module}: complete linked capture/installed drift`);
    linkedModules++;
    const installed = project(installedSource);
    assert.deepEqual(project(map.sourcesContent[map.sources.indexOf(module)]), installed, `${module}: capture/installed member drift`);
    const current = project(ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true,
    } }).outputText);
    assert.deepEqual([...current.keys()].sort(), [...installed.keys()].sort(), `${file}: member inventory drift`);
    for (const [key, value] of current) {
      if (value === installed.get(key)) equalMembers++;
      else differences.push({ file, key, current: hash(value), installed: hash(installed.get(key)) });
    }
  }
  assert.equal(equalMembers, 1583);
  assert.equal(linkedModules, 88);
  assert.deepEqual(differences, [{ file: 'src/lib/astylar.ts',
    key: 'AstylarRenderer:MethodDeclaration:inspectCurrentDocumentStyles',
    current: '2949e37e0ec074e81855e4835170c5165ba0b497cec902f70ad406f0cff95160',
    installed: 'effd5c129a1c70cb9343a8d5c863b92169b6c7316f25e8c0120df575a8cb3147' }]);
  // Explicit discrepancy, not normalization or whole-module/runtime acceptance.
  // Complete captured/installed linking is checked above; current-source wiring
  // and metadata remain separately owned by the original callback diagnostic.
});

test('captured runtime class bodies match current repository compilation without Angular metadata', async () => {
  const { transform } = await import('esbuild');
  const consumer = 'examples/material-showcase';
  const mapBytes = readFileSync('artifacts/material-parity/retained-evidence/component-map-recovery-20261011/chunk-3JXWRYJY.js.map');
  assert.equal(hash(mapBytes), 'dba484044ca0dea965d8ef4b12635673f0f055d7711099d2f6476ca490988ec4');
  const map = JSON.parse(mapBytes);
  const modules = map.sources.filter(file => file.startsWith('node_modules/astylarui/'));
  assert.equal(modules.length, 88, 'Mapped runtime scope changed; reconcile coverage explicitly.');
  const generated = new Set(['ɵfac', 'ɵprov', 'ɵcmp', 'ɵdir', 'ɵmod', 'ɵinj']);
  const extract = async code => {
    const ast = ts.createSourceFile('proof.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(ast.parseDiagnostics.length, 0);
    const classes = [];
    const visit = node => {
      if ((ts.isClassDeclaration(node) || ts.isClassExpression(node)) && node.name) classes.push(node);
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const result = new Map();
    const imports = new Set();
    const exports = [];
    for (const node of classes) {
      assert.equal(result.has(`class:${node.name.text}`), false, 'Duplicate class identity.');
      const members = node.members.filter(member => !generated.has(member.name?.getText(ast)));
      const heritage = (node.heritageClauses ?? []).map(clause => clause.getText(ast)).join(' ');
      const text = `class Proof ${heritage} {${members.map(member => member.getText(ast)).join('\n')}}`;
      result.set(`class:${node.name.text}`, (await transform(text, {
        loader: 'js', legalComments: 'none', minifyWhitespace: true,
      })).code);
    }
    for (const statement of ast.statements) {
      if (ts.isExportDeclaration(statement)) {
        if (statement.exportClause && ts.isNamedExports(statement.exportClause))
          for (const element of statement.exportClause.elements)
            exports.push(`${statement.moduleSpecifier?.text ?? 'local'}|${element.propertyName?.text ?? element.name.text}|${element.name.text}`);
        else exports.push(`star|${statement.moduleSpecifier?.text}`);
      }
      if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
        if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
          const name = declaration.name.getText(ast);
          exports.push(`local|${name}|${name}`);
        }
        else if (statement.name) exports.push(`local|${statement.name.text}|${statement.name.text}`);
      }
      if (ts.isImportDeclaration(statement)) {
        const module = statement.moduleSpecifier.text;
        const clause = statement.importClause;
        if (!clause) imports.add(`${module}|side-effect`);
        if (clause?.name) imports.add(`${module}|default|${clause.name.text}`);
        const bindings = clause?.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) imports.add(`${module}|namespace|${bindings.name.text}`);
        if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements)
          imports.add(`${module}|${element.propertyName?.text ?? element.name.text}|${element.name.text}`);
      }
      if (ts.isExpressionStatement(statement)) {
        const expression = statement.expression;
        const decorator = ts.isBinaryExpression(expression) && ts.isCallExpression(expression.right)
          && expression.right.expression.getText(ast) === '__decorate';
        const metadata = ts.isCallExpression(expression) && ts.isPropertyAccessExpression(expression.expression)
          && expression.expression.name.text === 'ɵɵngDeclareClassMetadata';
        if (!decorator && !metadata) result.set(`effect:${[...result.keys()].filter(key => key.startsWith('effect:')).length}`,
          (await transform(statement.getText(ast), {
            loader: 'js', legalComments: 'none', minifyWhitespace: true,
          })).code);
      }
      if (ts.isFunctionDeclaration(statement) && statement.name) {
        result.set(`function:${statement.name.text}`, (await transform(statement.getText(ast), {
          loader: 'js', legalComments: 'none', minifyWhitespace: true,
        })).code);
      }
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) {
        const name = declaration.name.getText(ast);
        if (['__decorate', '__metadata', '__param'].includes(name)) continue;
        if (declaration.initializer && ts.isClassExpression(declaration.initializer)) continue;
        const kind = statement.declarationList.flags & ts.NodeFlags.Const ? 'const'
          : statement.declarationList.flags & ts.NodeFlags.Let ? 'let' : 'var';
        result.set(`variable:${name}`, (await transform(`${kind} ${declaration.getText(ast)};`, {
          loader: 'js', legalComments: 'none', minifyWhitespace: true,
        })).code);
      }
    }
    return { declarations: result, imports, exports: exports.sort() };
  };
  let classCount = 0;
  let functionCount = 0;
  let variableCount = 0;
  let importCount = 0;
  let effectCount = 0;
  let authoredExtraCount = 0;
  let namespaceExtraCount = 0;
  let metadataUseCount = 0;
  let exportCount = 0;
  let decoratorCount = 0;
  let dependencyCount = 0;
  let componentCount = 0;
  for (const module of modules) {
    const sourceFile = path.join('src', module.slice('node_modules/astylarui/dist/lib/'.length)
      .replace(/\.js$/, '.ts'));
    const source = readFileSync(sourceFile, 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
        experimentalDecorators: true },
    }).outputText;
    const sourceProjection = await extract(compiled);
    const installedProjection = await extract(readFileSync(path.join(consumer, module), 'utf8'));
    const sourceClasses = sourceProjection.declarations;
    assert.deepEqual(installedProjection.declarations, sourceClasses, sourceFile);
    assert.deepEqual(installedProjection.exports, sourceProjection.exports, `${sourceFile}: export wiring`);
    exportCount += sourceProjection.exports.length;
    for (const binding of sourceProjection.imports)
      assert.ok(installedProjection.imports.has(binding), `${sourceFile}: missing runtime import ${binding}`);
    const authored = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const authoredBindings = new Set();
    const authoredModules = new Set();
    for (const statement of authored.statements) if (ts.isImportDeclaration(statement)) {
      const from = statement.moduleSpecifier.text;
      authoredModules.add(from);
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const element of bindings.elements)
        authoredBindings.add(`${from}|${element.propertyName?.text ?? element.name.text}|${element.name.text}`);
    }
    const namespaceNames = new Set();
    for (const binding of installedProjection.imports) if (!sourceProjection.imports.has(binding)) {
      const [from, imported, local] = binding.split('|');
      if (authoredBindings.has(binding)) authoredExtraCount++;
      else {
        assert.ok(imported === 'namespace' && /^i\d+$/.test(local)
          && (from === '@angular/core' || authoredModules.has(from)), `${sourceFile}: unexplained extra import ${binding}`);
        namespaceNames.add(local);
        namespaceExtraCount++;
      }
    }
    const installedAst = ts.createSourceFile('installed.js', readFileSync(path.join(consumer, module), 'utf8'),
      ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const installedDecorators = new Map();
    for (const statement of installedAst.statements) if (ts.isExpressionStatement(statement)
      && ts.isCallExpression(statement.expression) && ts.isPropertyAccessExpression(statement.expression.expression)
      && statement.expression.expression.name.text === 'ɵɵngDeclareClassMetadata') {
      const properties = new Map(statement.expression.arguments[0].properties
        .map(property => [property.name.getText(installedAst), property.initializer]));
      installedDecorators.set(properties.get('type').getText(installedAst), properties.get('decorators').getText(installedAst));
    }
    const canonicalDecorator = async expression => (await transform(ts.transpileModule(`const proof=${expression};`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
    }).outputText, { loader: 'js', legalComments: 'none', minifyWhitespace: true, minifySyntax: true })).code;
    let authoredDecoratorCount = 0;
    for (const node of authored.statements.filter(ts.isClassDeclaration)) {
      const decorators = ts.getDecorators(node);
      if (!decorators?.length) continue;
      authoredDecoratorCount++;
      decoratorCount++;
      const expected = `[${decorators.map(decorator => {
        const expression = decorator.expression;
        return ts.isCallExpression(expression)
          ? `{type:${expression.expression.getText(authored)}${expression.arguments.length
            ? `,args:[${expression.arguments.map(argument => argument.getText(authored)).join(',')}]` : ''}}`
          : `{type:${expression.getText(authored)}}`;
      }).join(',')}]`;
      assert.ok(installedDecorators.has(node.name.text), `${sourceFile}: missing authored decorator metadata`);
      assert.equal(await canonicalDecorator(installedDecorators.get(node.name.text)),
        await canonicalDecorator(expected), `${sourceFile}: authored decorator requests`);
      for (const member of node.members)
        assert.equal(ts.getDecorators(member)?.length ?? 0, 0, `${sourceFile}: new property decorator requires coverage`);
      const installedClass = installedAst.statements.find(statement => ts.isClassDeclaration(statement)
        && statement.name?.text === node.name.text);
      const factory = installedClass.members.find(member => member.name?.getText(installedAst) === 'ɵfac');
      const component = installedClass.members.find(member => member.name?.getText(installedAst) === 'ɵcmp');
      if (component) {
        componentCount++;
        const literal = expression => {
          if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
          if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
          if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
          if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
          if (ts.isArrayLiteralExpression(expression)) return expression.elements.map(literal);
          if (ts.isObjectLiteralExpression(expression)) return Object.fromEntries(expression.properties
            .map(property => [property.name.text, literal(property.initializer)]));
          assert.fail(`${sourceFile}: nonliteral component metadata requires coverage`);
        };
        const componentProperties = new Map(component.initializer.arguments[0].properties
          .map(property => [property.name.getText(installedAst), property.initializer]));
        const expectedInputs = {};
        const expectedOutputs = {};
        const expectedQueries = [];
        for (const member of node.members) if (ts.isPropertyDeclaration(member)
          && member.initializer && ts.isCallExpression(member.initializer)) {
          const call = member.initializer;
          const name = member.name.getText(authored);
          const callee = call.expression.getText(authored);
          if (callee === 'input' || callee === 'input.required') expectedInputs[name] = {
            classPropertyName: name, publicName: name, isSignal: true,
            isRequired: callee === 'input.required', transformFunction: null,
          };
          else if (callee === 'output') expectedOutputs[name] = name;
          else if (callee === 'viewChild.required') expectedQueries.push({
            propertyName: name, first: true, predicate: [literal(call.arguments[0])],
            descendants: true, isSignal: true,
          });
        }
        assert.deepEqual(literal(componentProperties.get('inputs')), expectedInputs, `${sourceFile}: signal inputs`);
        assert.deepEqual(literal(componentProperties.get('outputs')), expectedOutputs, `${sourceFile}: signal outputs`);
        assert.deepEqual(literal(componentProperties.get('viewQueries')), expectedQueries, `${sourceFile}: signal queries`);
        const decorator = decorators.find(value => ts.isCallExpression(value.expression)
          && value.expression.expression.getText(authored) === 'Component');
        const request = literal(decorator.expression.arguments[0]);
        assert.equal(literal(componentProperties.get('selector')), request.selector);
        assert.equal(literal(componentProperties.get('isStandalone')), request.standalone);
        assert.equal(literal(componentProperties.get('template')), request.template);
        assert.deepEqual(literal(componentProperties.get('styles')), request.styles);
        assert.equal(literal(componentProperties.get('isInline')), true);
      }
      const factoryProperties = new Map(factory.initializer.arguments[0].properties
        .map(property => [property.name.getText(installedAst), property.initializer]));
      const dependencies = factoryProperties.get('deps');
      assert.ok(ts.isArrayLiteralExpression(dependencies), `${sourceFile}: unsupported dependency representation`);
      const parameters = node.members.find(ts.isConstructorDeclaration)?.parameters ?? [];
      assert.equal(dependencies.elements.length, parameters.length, `${sourceFile}: constructor dependency count`);
      for (const [index, parameter] of parameters.entries()) {
        const requested = { token: parameter.type?.getText(authored) };
        for (const decorator of ts.getDecorators(parameter) ?? []) {
          assert.ok(ts.isCallExpression(decorator.expression), `${sourceFile}: dependency decorator representation`);
          const name = decorator.expression.expression.getText(authored);
          if (name === 'Inject') requested.token = decorator.expression.arguments[0].getText(authored);
          else if (name === 'Optional') requested.optional = true;
          else assert.fail(`${sourceFile}: uncovered dependency decorator ${name}`);
        }
        const actual = {};
        for (const property of dependencies.elements[index].properties) {
          const key = property.name.getText(installedAst);
          if (key === 'token') {
            const token = property.initializer;
            if (ts.isPropertyAccessExpression(token)) {
              const namespace = token.expression.getText(installedAst);
              const binding = [...installedProjection.imports].find(value => value.endsWith(`|namespace|${namespace}`));
              assert.ok(binding, `${sourceFile}: unresolved DI namespace`);
              const from = binding.split('|')[0];
              assert.ok(authoredBindings.has(`${from}|${token.name.text}|${requested.token}`), `${sourceFile}: DI module identity`);
              actual.token = token.name.text;
            } else actual.token = token.getText(installedAst);
          } else {
            assert.equal(property.initializer.kind, ts.SyntaxKind.TrueKeyword, `${sourceFile}: dependency flag representation`);
            actual[key] = true;
          }
        }
        assert.deepEqual(actual, requested, `${sourceFile}: dependency ${index}`);
        dependencyCount++;
      }
    }
    assert.equal(installedDecorators.size, authoredDecoratorCount, `${sourceFile}: extra decorator metadata`);
    const inspectNamespaceUse = node => {
      if (ts.isIdentifier(node) && namespaceNames.has(node.text)) {
        let owner = node;
        let allowed = false;
        while (owner) {
          if (ts.isImportDeclaration(owner)) { allowed = true; break; }
          if (ts.isPropertyDeclaration(owner) && generated.has(owner.name.getText(installedAst))) {
            allowed = true; metadataUseCount++; break;
          }
          if (ts.isExpressionStatement(owner) && ts.isCallExpression(owner.expression)
            && ts.isPropertyAccessExpression(owner.expression.expression)
            && owner.expression.expression.name.text === 'ɵɵngDeclareClassMetadata') {
            allowed = true; metadataUseCount++; break;
          }
          owner = owner.parent;
        }
        assert.ok(allowed, `${sourceFile}: compiler namespace escapes metadata: ${node.text}`);
      }
      ts.forEachChild(node, inspectNamespaceUse);
    };
    inspectNamespaceUse(installedAst);
    importCount += sourceProjection.imports.size;
    effectCount += [...sourceClasses.keys()].filter(key => key.startsWith('effect:')).length;
    classCount += [...sourceClasses.keys()].filter(key => key.startsWith('class:')).length;
    functionCount += [...sourceClasses.keys()].filter(key => key.startsWith('function:')).length;
    variableCount += [...sourceClasses.keys()].filter(key => key.startsWith('variable:')).length;
  }
  assert.equal(classCount, 80, 'Class scope changed; do not infer whole-module provenance.');
  assert.equal(functionCount, 98, 'Function scope changed; reconcile coverage.');
  assert.equal(variableCount, 53, 'Variable scope changed; reconcile coverage.');
  assert.equal(importCount, 373, 'Runtime import scope changed; reconcile coverage.');
  assert.equal(effectCount, 4, 'Module effect scope changed; reconcile coverage.');
  assert.equal(authoredExtraCount, 110, 'Authored DI import scope changed.');
  assert.equal(namespaceExtraCount, 171, 'Generated namespace scope changed.');
  assert.equal(metadataUseCount, 644, 'Generated namespace metadata use scope changed.');
  assert.equal(exportCount, 130, 'Mapped export scope changed; reconcile coverage.');
  assert.equal(decoratorCount, 60, 'Authored decorator scope changed; reconcile coverage.');
  assert.equal(dependencyCount, 113, 'Constructor dependency scope changed; reconcile coverage.');
  assert.equal(componentCount, 1, 'Generated component scope changed; reconcile coverage.');
});

test('runtime wiring and metadata retain original assertions beyond authenticated diagnostic drift', async () => {
  const { transformSync } = await import('esbuild');
  // Historical diagnostic drift is not required to persist after installation.
  // Current equality is checked independently by the original test above.
  // Execute its actual callback, not a copied or reduced metadata assertion body.
  const sourceFile = 'tests/material-parity/input-boundary-evidence.spec.mjs';
  const source = readFileSync(sourceFile, 'utf8');
  const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const name = 'captured runtime class bodies match current repository compilation without Angular metadata';
  const calls = ast.statements.filter(node => ts.isExpressionStatement(node)
    && ts.isCallExpression(node.expression) && node.expression.arguments[0]?.text === name);
  assert.equal(calls.length, 1);
  const members = code => {
    const parsed = ts.createSourceFile('proof.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.equal(parsed.parseDiagnostics.length, 0);
    const declaration = parsed.statements.find(ts.isClassDeclaration);
    assert.ok(declaration);
    const heritage = (declaration.heritageClauses ?? []).map(node => node.getText(parsed)).join(' ');
    const result = new Map();
    for (const member of declaration.members) {
      const key = `${ts.SyntaxKind[member.kind]}:${member.name?.getText(parsed) ?? 'constructor'}`;
      assert.equal(result.has(key), false);
      result.set(key, transformSync(`class Proof ${heritage} {${member.getText(parsed)}}`, {
        loader: 'js', legalComments: 'none', minifyWhitespace: true,
      }).code);
    }
    return result;
  };
  let diagnosticDifferences = 0;
  let diagnosticOwners = 0;
  const compare = (actual, expected, message) => {
    if (message !== path.join('src', 'lib', 'astylar.ts'))
      return assert.deepEqual(actual, expected, message);
    assert.ok(actual instanceof Map && expected instanceof Map);
    assert.deepEqual([...actual.keys()], [...expected.keys()]);
    for (const [key, value] of actual) {
      if (key !== 'class:AstylarRenderer') {
        assert.equal(value, expected.get(key), key);
        continue;
      }
      const installed = members(value);
      const current = members(expected.get(key));
      assert.deepEqual([...installed.keys()], [...current.keys()]);
      for (const [member, body] of installed) {
        if (member !== 'MethodDeclaration:inspectCurrentDocumentStyles')
          assert.equal(body, current.get(member), member);
        else {
          diagnosticOwners++;
          assert.equal(hash(current.get(member)), '2949e37e0ec074e81855e4835170c5165ba0b497cec902f70ad406f0cff95160');
          if (body === current.get(member)) assert.equal(hash(body), '2949e37e0ec074e81855e4835170c5165ba0b497cec902f70ad406f0cff95160');
          else {
            assert.equal(hash(body), 'effd5c129a1c70cb9343a8d5c863b92169b6c7316f25e8c0120df575a8cb3147');
            diagnosticDifferences++;
          }
        }
      }
    }
  };
  // Unexpected declarations and unrelated wiring must not be exempted.
  assert.throws(() => compare(new Map([['function:unexpected', 'a']]),
    new Map([['function:unexpected', 'b']]), path.join('src', 'lib', 'astylar.ts')));
  assert.throws(() => compare(['changed'], ['original'], 'runtime export wiring'));
  const callback = calls[0].expression.arguments[1].getText(ast);
  const execute = new Function('assert', 'readFileSync', 'path', 'ts', 'hash', `return (${callback})();`);
  await execute({ ...assert, deepEqual: compare }, readFileSync, path, ts, hash);
  assert.equal(diagnosticOwners, 1);
  assert.equal(diagnosticDifferences, 0, 'current installation must not be reported as historical drift');
});

test('public semantic sibling updates isolate retained focus loss without Material plugins', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const sourceFile = 'src/lib/astylar-semantic-bridge.ts';
  const installedFile = path.join(consumer, 'node_modules/astylarui/dist/lib/lib/astylar-semantic-bridge.js');
  const source = readFileSync(sourceFile, 'utf8'), installed = readFileSync(installedFile, 'utf8');
  const compiled = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
  const methods = ['reconcile', 'reconcileElement', 'syncFocus'].map(name => {
    const extract = code => {
      const ast = ts.createSourceFile('semantic.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
      assert.equal(ast.parseDiagnostics.length, 0);
      const visit = node => {if (ts.isMethodDeclaration(node) && node.name.getText(ast) === name)
        matches.push(node.getText(ast).replace(/\s+/g, ' ').trim()); ts.forEachChild(node, visit);};
      visit(ast); assert.equal(matches.length, 1); return matches[0];
    };
    assert.equal(extract(installed), extract(compiled), name);
    return {name, sha256:hash(Buffer.from(extract(compiled)))};
  });
  const requireConsumer = createRequire(path.join(consumer, 'package.json'));
  const built = await requireConsumer('esbuild').build({absWorkingDir:process.cwd(),
    stdin:{resolveDir:consumer,sourcefile:'public-semantic-focus.mjs',contents:`
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      document.body.style.cssText='margin:0;padding:0';
      const canvas=document.createElement('canvas');canvas.style.cssText='width:390px;height:140px';document.body.append(canvas);
      const app=await createApplication({providers:[provideZonelessChangeDetection()]});
      const site=extra=>({root:{children:[{type:'div',id:'focus-parent',children:[
        {type:'input',inputType:'text',id:'focus-input',value:'Atlas',ariaLabel:'focus input'},
        ...(extra?[{type:'span',id:'focus-sibling',textContent:'Other'}]:[])]}]},styles:[
        {selector:'#focus-parent',position:'absolute',left:'20px',top:'40px',width:'300px',height:'60px'},
        {selector:'#focus-input',width:'228px',height:'24px',fontFamily:'Arial',fontSize:'16px'}]});
      const surface=app.injector.get(Astylar).mount(canvas,site(false),{diagnostics:{logLevel:'silent'}});
      const settle=async()=>{await document.fonts.ready;await surface.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();
      const input=document.querySelector('[data-astylar-id="focus-input"]');
      const referenceParent=document.createElement('div'),reference=document.createElement('input');
      reference.id='reference-focus-input';reference.value='Atlas';referenceParent.append(reference);document.body.append(referenceParent);
      const events=[],operations=[];
      for(const node of [input,reference]) for(const type of ['focusin','focusout'])
        node.addEventListener(type,()=>events.push({side:node===input?'candidate':'reference',type}));
      const original=Element.prototype.replaceChildren;
      Element.prototype.replaceChildren=function(...children){
        if(!this.contains(input)) return original.apply(this,children);
        const before=document.activeElement===input;
        const result=original.apply(this,children);
        operations.push({owner:this.dataset.astylarId??null,before,after:document.activeElement===input,
          connected:input.isConnected,stack:new Error().stack});
        return result;
      };
      window.focusAudit={settle,async update(side,extra,prepared=false){
        const target=side==='candidate'?input:reference;
        if(!prepared){target.focus();target.setSelectionRange(1,3);}
        const beforeSelection=[target.selectionStart,target.selectionEnd];
        events.length=0;operations.length=0;
        if(side==='candidate') await surface.update(site(extra));
        else if(extra){const sibling=document.createElement('span');sibling.textContent='Other';referenceParent.append(sibling);}
        else referenceParent.lastElementChild!==reference&&referenceParent.lastElementChild.remove();
        await settle();return {side,extra,prepared,beforeSelection,events:[...events],operations:[...operations],
          sameNode:side!=='candidate'||document.querySelector('[data-astylar-id="focus-input"]')===input,
          focused:document.activeElement===target,activeTag:document.activeElement?.tagName,
          value:target.value,selection:[target.selectionStart,target.selectionEnd],
          diagnostics:surface.diagnostics.messages};},dispose(){Element.prototype.replaceChildren=original;surface.dispose();app.destroy();}};
    `},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
  const inputs = Object.keys(built.metafile.inputs).filter(file => path.basename(file) !== 'public-semantic-focus.mjs')
    .map(file => ({file,sha256:hash(readFileSync(file))}));
  assert.ok(!inputs.some(({file}) => file.includes('material-showcase/src') || file.includes('astylarui/dist/lib/plugins/material')));
  const server = createServer((request,response) => {
    const script = new URL(request.url,'http://localhost').pathname === '/audit.js';
    response.setHeader('content-type',script?'text/javascript':'text/html');
    response.end(script?built.outputFiles[0].contents:'<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser; const samples = [], errors = [];
  try {
    browser = await chromium.launch({channel:'chrome',headless:true});
    const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    page.on('pageerror',error => errors.push(String(error)));
    await page.goto('http://127.0.0.1:'+server.address().port+'/');
    await page.waitForFunction(() => !!window.focusAudit);
    for (const side of ['reference','candidate']) for (const extra of [true,false,true,false])
      samples.push(await page.evaluate(({side,extra}) => window.focusAudit.update(side,extra),{side,extra}));
    const keyboardSamples=[];
    for(const side of ['reference','candidate']) {
      await page.locator(side==='candidate'?'[data-astylar-id="focus-input"]':'#reference-focus-input').focus();
      await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');await page.keyboard.press('Shift+ArrowRight');
      await page.evaluate(()=>window.focusAudit.settle());
      keyboardSamples.push(await page.evaluate(side=>window.focusAudit.update(side,true,true),side));
    }
    t.diagnostic(JSON.stringify({publicSemanticFocus:{browser:browser.version(),viewport:{width:390,height:844,dpr:2},
      sourceSha256:hash(Buffer.from(source)),installedSha256:hash(Buffer.from(installed)),methods,
      bundleSha256:hash(built.outputFiles[0].contents),dependencyCount:inputs.length,
      dependencyReceipt:hash(Buffer.from(JSON.stringify(inputs))),samples,keyboardSamples,errors,parityAccepted:false}}));
    assert.deepEqual(errors,[]);
    for (const sample of samples) {
      assert.equal(sample.sameNode,true);assert.equal(sample.focused,true);assert.equal(sample.value,'Atlas');
      assert.deepEqual(sample.diagnostics,[]);
      if(sample.side==='reference') {
        assert.deepEqual(sample.selection,[1,3]);assert.deepEqual(sample.events,[]);assert.deepEqual(sample.operations,[]);
      }
      else {
        // Preserve the observed failure, not a selection-parity acceptance claim.
        // Direct native setSelectionRange does not prove core selection-state synchronization.
        assert.deepEqual(sample.selection,[0,0]);
        assert.throws(()=>assert.deepEqual(sample.selection,[1,3]),{code:'ERR_ASSERTION'});
        const firstLoss=sample.operations.find(operation=>operation.before&&!operation.after);
        assert.ok(firstLoss);assert.equal(firstLoss.owner,'focus-parent');assert.equal(firstLoss.connected,true);
        assert.deepEqual(sample.events.map(event=>event.type),['focusout','focusin']);
      }
    }
    for(const sample of keyboardSamples) {
      assert.deepEqual(sample.beforeSelection,[1,3]);
      assert.equal(sample.sameNode,true);assert.equal(sample.focused,sample.side==='reference');assert.equal(sample.value,'Atlas');
      assert.deepEqual(sample.selection,[1,3]);
      assert.deepEqual(sample.events.map(event=>event.type),sample.side==='reference'?[]:['focusout']);
      if(sample.side==='candidate') assert.equal(sample.activeTag,'CANVAS');
    }
    await page.evaluate(() => window.focusAudit.dispose());
    for(const input of inputs) assert.equal(hash(readFileSync(input.file)),input.sha256);
    assert.equal(hash(readFileSync(sourceFile)),hash(Buffer.from(source)));
    assert.equal(hash(readFileSync(installedFile)),hash(Buffer.from(installed)));
  } finally {await browser?.close();await new Promise(resolve => server.close(resolve));}
});

test('public input lifecycle isolates caret material retention without Material plugins', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const methods = [
    ['text/text-selection.service','createTextCursor'],
    ['dom/input/text-cursor.renderer','disposeCursor'],
    ['dom/input/text-input.manager','disposeTextInput'],
    ['dom/input/text-input.manager','handleFocus'],
    ['dom/input/input-element.service','releaseInputMesh'],
    ['dom/input/input-element.service','cleanup'],
    ['dom/renderer.service','createSiteFromData'],
    ['../../lib/astylar-scene-resources','replace'],
    ['../../lib/astylar-scene-resources','clearMaterials'],
    ['../../lib/astylar-visual-resource-reconciler','stage'],
    ['../../lib/astylar','createScene'],
  ].map(([module,name])=>{
    const sourceFile=path.normalize('src/app/services/'+module+'.ts');
    const installedFile=path.join(consumer,'node_modules/astylarui/dist/lib/app/services',module+'.js');
    const source=readFileSync(sourceFile,'utf8'), installed=readFileSync(installedFile,'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
    const extract=code=>{
      const ast=ts.createSourceFile('method.js',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
      assert.equal(ast.parseDiagnostics.length,0);
      const matches=[];
      const visit=node=>{if(ts.isMethodDeclaration(node)&&node.name.getText(ast)===name) matches.push(node.getText(ast).replace(/\s+/g,' ').trim());ts.forEachChild(node,visit);};
      visit(ast);assert.equal(matches.length,1,name);return matches[0];
    };
    assert.equal(extract(installed),extract(compiled),name+' installed method differs from current source');
    return {sourceFile,sourceSha256:hash(Buffer.from(source)),installedFile,installedSha256:hash(Buffer.from(installed)),method:name};
  });
  const requireConsumer = createRequire(path.join(consumer, 'package.json'));
  const built = await requireConsumer('esbuild').build({absWorkingDir:process.cwd(),
    stdin:{resolveDir:consumer,sourcefile:'public-caret-lifetime.mjs',contents:`
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      document.body.style.cssText='margin:0;padding:0';
      const canvas=document.createElement('canvas');
      canvas.style.cssText='display:block;width:390px;height:140px';document.body.append(canvas);
      const app=await createApplication({providers:[provideZonelessChangeDetection()]});
      const documentFor=(present=true,revision=0)=>({root:{children:present?[{
        type:'input',inputType:'text',id:'lifetime-input',value:'Atlas',ariaLabel:'lifetime input'}]:[]},
        styles:[{selector:'#lifetime-input',position:'absolute',left:'20px',top:'40px',width:'228px',height:'24px',
          boxSizing:'border-box',padding:'0',borderWidth:'0',fontFamily:'Arial',fontSize:'16px',lineHeight:'24px',
          color:'#222222',background:revision%2?'#dddddd':'#eeeeee'}]});
      const surface=app.injector.get(Astylar).mount(canvas,documentFor(),{diagnostics:{logLevel:'silent'}});
      const scene=surface.scene;
      const settle=async()=>{await document.fonts.ready;await surface.whenSettled();
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      const snapshot=()=>{
        const input=document.querySelector('[data-astylar-id="lifetime-input"]');
        const cursors=scene.meshes.filter(m=>m.name.startsWith('cursor_'));
        const materials=scene.materials.filter(m=>m.name.startsWith('cursorMaterial_'));
        return {focused:input===document.activeElement,value:input?.value??null,
          meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length,
          cursors:cursors.map(m=>({id:m.uniqueId,name:m.name,material:m.material?.uniqueId})),
          cursorMaterials:materials.map(m=>({id:m.uniqueId,name:m.name,
            bound:scene.meshes.some(mesh=>mesh.material===m)})),
          tracked:surface.diagnostics.resources,diagnostics:surface.diagnostics.messages};};
      await settle();
      window.lifetimeAudit={settle,snapshot,async update(present,revision){
        await surface.update(documentFor(present,revision));await settle();return snapshot();},
        dispose(){surface.dispose();app.destroy();return {disposed:surface.disposed,
          sceneDisposed:scene.isDisposed,meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length};}};
    `},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true});
  const inputs=Object.keys(built.metafile.inputs).filter(file=>path.basename(file)!=='public-caret-lifetime.mjs')
    .map(file=>({file,sha256:hash(readFileSync(file))}));
  assert.ok(!inputs.some(({file})=>file.includes('material-showcase/src') || file.includes('astylarui/dist/lib/plugins/material')));
  const server=createServer((request,response)=>{
    const script=new URL(request.url,'http://localhost').pathname==='/audit.js';
    response.setHeader('content-type',script?'text/javascript':'text/html');
    response.end(script?built.outputFiles[0].contents:'<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  const samples=[],errors=[];
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
    page.on('pageerror',error=>errors.push(String(error)));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(()=>!!window.lifetimeAudit);
    const sample=async label=>{await page.evaluate(()=>window.lifetimeAudit.settle());
      const state=await page.evaluate(()=>window.lifetimeAudit.snapshot());samples.push({label,...state});
      assert.deepEqual(state.diagnostics,[]);return state;};
    await sample('mounted');
    for(let cycle=0;cycle<3;cycle++) {
      await page.locator('[data-astylar-id="lifetime-input"]').focus();await sample('focus-'+cycle);
      await page.mouse.click(10,10);await sample('blur-'+cycle);
    }
    await page.locator('[data-astylar-id="lifetime-input"]').focus();
    for(let revision=1;revision<=3;revision++) {
      await page.evaluate(revision=>window.lifetimeAudit.update(true,revision),revision);await sample('update-'+revision);
    }
    for(let cycle=0;cycle<3;cycle++) {
      await page.evaluate(()=>window.lifetimeAudit.update(false,0));await sample('removed-'+cycle);
      await page.evaluate(()=>window.lifetimeAudit.update(true,0));
      await page.locator('[data-astylar-id="lifetime-input"]').focus();await sample('recreated-'+cycle);
    }
    const disposed=await page.evaluate(()=>window.lifetimeAudit.dispose());
    t.diagnostic(JSON.stringify({browser:browser.version(),viewport:{width:390,height:844,dpr:2},
      bundleSha256:hash(built.outputFiles[0].contents),dependencyCount:inputs.length,
      packages:Object.fromEntries(['@angular/core','@babylonjs/core','astylarui'].map(name=>
        [name,JSON.parse(readFileSync(path.join(consumer,'node_modules',name,'package.json'))).version])),
      dependencyReceipt:hash(Buffer.from(JSON.stringify(inputs))),methods,samples,disposed,errors,
      ownershipAttribution:{firstDivergence:'post-render focus allocates resources outside synchronous transaction ownership',
        cleanupGap:'cursor mesh disposal does not dispose its separate material',
        updateDistinction:'focus restoration inside replacement transaction adopts replacement material',
        classification:'confirmed-core-lifecycle-defect',scope:'one public input, Chrome154 DPR2; not GPU or performance attribution'},
      resourcePlateauAccepted:false}));
    assert.deepEqual(errors,[]);
    const first=samples.find(sample=>sample.label==='focus-0');
    const mounted=samples.find(sample=>sample.label==='mounted');
    assert.deepEqual(mounted.tracked,{meshes:mounted.meshes,materials:mounted.materials,textures:mounted.textures});
    assert.equal(first.focused,true);assert.equal(first.cursorMaterials.length,1);assert.equal(first.cursors.length,1);
    for(const sample of samples.filter(sample=>/^(focus|blur)-/.test(sample.label))) {
      assert.equal(sample.value,'Atlas');assert.equal(sample.focused,sample.label.startsWith('focus-'));
      assert.deepEqual(sample.cursorMaterials,first.cursorMaterials,'blur/refocus negative control retains one bound material');
      assert.deepEqual(sample.cursors,first.cursors);
      assert.deepEqual(sample.tracked,mounted.tracked,'post-render focus allocations are outside synchronous transaction ownership');
      assert.ok(sample.meshes>sample.tracked.meshes);assert.ok(sample.materials>sample.tracked.materials);
    }
    for(const sample of samples.filter(sample=>sample.label.startsWith('update-'))) {
      assert.equal(sample.focused,true);assert.equal(sample.value,'Atlas');
      assert.equal(sample.cursorMaterials.length,2);assert.equal(sample.cursors.length,1);
      assert.deepEqual(sample.cursorMaterials.filter(material=>!material.bound),[
        {...first.cursorMaterials[0],bound:false}],'same-ID updates retain the first orphan, not three accumulating orphans');
    }
    for(let cycle=0;cycle<3;cycle++) {
      const removed=samples.find(sample=>sample.label==='removed-'+cycle);
      const recreated=samples.find(sample=>sample.label==='recreated-'+cycle);
      assert.equal(removed.value,null);assert.equal(removed.focused,false);assert.deepEqual(removed.cursors,[]);
      assert.equal(removed.cursorMaterials.length,cycle+1);assert.ok(removed.cursorMaterials.every(material=>!material.bound));
      assert.equal(removed.materials-removed.tracked.materials,removed.cursorMaterials.length,
        'every material outside transaction ownership after removal is a retained caret material');
      assert.equal(recreated.value,'Atlas');assert.equal(recreated.focused,true);assert.equal(recreated.cursors.length,1);
      assert.equal(recreated.cursorMaterials.length,cycle+2);
      assert.deepEqual(recreated.cursorMaterials.filter(material=>!material.bound),removed.cursorMaterials);
      assert.equal(recreated.cursorMaterials.filter(material=>material.bound).length,1);
    }
    // Audit counterexample, not cleanup acceptance: preserve the failing invariant.
    assert.throws(()=>assert.equal(samples.find(sample=>sample.label==='removed-2').cursorMaterials.length,0),
      {code:'ERR_ASSERTION'});
    assert.deepEqual(disposed,{disposed:true,sceneDisposed:true,meshes:0,materials:0,textures:0});
    for(const input of inputs) assert.equal(hash(readFileSync(input.file)),input.sha256,input.file+' changed during proof');
    for(const method of methods) {
      assert.equal(hash(readFileSync(method.sourceFile)),method.sourceSha256);
      assert.equal(hash(readFileSync(method.installedFile)),method.installedSha256);
    }
  } finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
});

test('served core isolates Home and End selection collapse from Material popup behavior', async () => {
  const source = readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js');
  assert.equal(hash(source), 'f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab');
  const ast = ts.createSourceFile('served.js', source.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const methods = [];
  const visit = node => {
    if (ts.isMethodDeclaration(node) && node.name.getText(ast) === 'moveCursor') methods.push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast); assert.equal(methods.length, 1);
  // Execute the complete shipped arithmetic method. No mesh/controller is
  // needed for these horizontal cases; public Material evidence above supplies
  // the composed application proof. This is not a replacement renderer.
  const directions = Object.fromEntries(['Left', 'Right', 'Up', 'Down', 'Home', 'End'].map(k => [k, k.toLowerCase()]));
  const move = new Function('CursorDirection', `return ({${methods[0].getText(ast)}}).moveCursor;`)(directions);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    assert.equal(browser.version(), report.browser);
    const page = await browser.newPage();
    await page.setContent('<input value="Atlas" aria-label="isolated text input">');
    for (const c of [
      { key: 'End', range: [0, 3], native: 5, shipped: 3 },
      { key: 'Home', range: [2, 5], native: 0, shipped: 2 },
      { key: 'End', range: [2, 2], native: 5, shipped: 5 },
      { key: 'Home', range: [2, 2], native: 0, shipped: 0 },
      { key: 'ArrowRight', range: [0, 3], native: 3, shipped: 3 },
      { key: 'ArrowLeft', range: [2, 5], native: 2, shipped: 2 },
    ]) {
      await page.locator('input').focus();
      await page.locator('input').evaluate((input, range) => input.setSelectionRange(...range), c.range);
      await page.keyboard.press(c.key);
      const native = await page.locator('input').evaluate(input => [input.selectionStart, input.selectionEnd]);
      const input = { textContent: 'Atlas', selectionStart: c.range[0], selectionEnd: c.range[1], cursorPosition: c.range[1],
        cursorState: { position: c.range[1], selectionStart: c.range[0], selectionEnd: c.range[1], selectionActive: c.range[0] !== c.range[1] } };
      move.call({}, input, directions[c.key.replace('Arrow', '')], false);
      assert.deepEqual(native, [c.native, c.native], c.key);
      assert.deepEqual([input.selectionStart, input.selectionEnd], [c.shipped, c.shipped], c.key);
    }
  } finally { await browser.close(); }
});

test('native Tab selection is collapsed by the served semantic-state synchronization', async () => {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  assert.deepEqual(fingerprintDirectory(browserRoot), manifest.provenance.browserFiles,
    'served showcase differs from the retained input-boundary build');
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    const contentType = extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html';
    response.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const referencePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    await referencePage.goto(`http://127.0.0.1:${server.address().port}/reference/form-field?benchmark=1&profile=light&interaction=audit-tab-focus`);
    await referencePage.locator('.frame').waitFor();
    await referencePage.keyboard.press('Tab');
    const currentReference = await referencePage.locator('#form-field-control').evaluate(input =>
      [document.activeElement === input, input.value, input.selectionStart, input.selectionEnd]);
    assert.deepEqual(currentReference, [true, 'Atlas', 0, 5],
      'current browser no longer selects the HTML reference value on Tab');
    await referencePage.close();
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      window.__tabSelectionEvidence = { focus: [], writes: [] };
      const original = HTMLInputElement.prototype.setSelectionRange;
      HTMLInputElement.prototype.setSelectionRange = function(start, end, direction) {
        if (this.dataset.astylarId === 'form-field-control') {
          window.__tabSelectionEvidence.writes.push({
            before: [this.selectionStart, this.selectionEnd], after: [start, end],
            stack: new Error().stack,
          });
        }
        return original.call(this, start, end, direction);
      };
      document.addEventListener('focusin', event => {
        if (event.target instanceof HTMLInputElement &&
            event.target.dataset.astylarId === 'form-field-control') {
          window.__tabSelectionEvidence.focus.push([
            event.target.selectionStart, event.target.selectionEnd,
          ]);
        }
      }, true);
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/astylar/form-field?benchmark=1&profile=light&interaction=audit-tab-focus`);
    await page.locator('.frame').waitFor();
    await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
    await page.keyboard.press('Tab');
    await page.evaluate(async () => {
      await window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled();
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const observed = await page.evaluate(() => {
      const semantic = document.querySelector('[data-astylar-id="form-field-control"]');
      const input = window.ng.getComponent(document.querySelector('app-astylar-showcase'))
        .surface.host.inputElementService.getInputElement('form-field-control');
      return {
        evidence: window.__tabSelectionEvidence,
        active: document.activeElement === semantic,
        semantic: [semantic.selectionStart, semantic.selectionEnd],
        scene: [input.selectionStart, input.selectionEnd],
      };
    });
    const retained = report.results.find(row => row.family === 'form-field' &&
      row.viewport.deviceScaleFactor === 1 && row.state === 'keyboard-focus');
    assert.ok(retained);
    assert.deepEqual([retained.reference.observation.control.selectionStart,
      retained.reference.observation.control.selectionEnd], [0, 5]);
    assert.deepEqual([retained.astylar.observation.control.selectionStart,
      retained.astylar.observation.control.selectionEnd], [0, 0]);
    assert.deepEqual(observed.evidence.focus[0], [0, 5],
      'native Tab focus did not initially select the semantic value');
    assert.ok(observed.evidence.writes.some(write =>
      write.before[0] === 0 && write.before[1] === 5 &&
      write.after[0] === 0 && write.after[1] === 0 &&
      write.stack.includes('AstylarSemanticBridge.applyControlState') &&
      write.stack.includes('AstylarSemanticBridge.syncControlStates')),
    'served semantic-state sync did not overwrite the native selection');
    assert.equal(observed.active, true);
    assert.deepEqual(observed.semantic, [0, 0]);
    assert.deepEqual(observed.scene, [0, 0]);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('retained reference screenshots suppress the native caret by Playwright default', async () => {
  const producer = 'scripts/audit-material-input-boundaries.mjs';
  const source = readFileSync(producer);
  assert.equal(hash(source), report.capture.sources.find(item => item.file === producer)?.sha256);
  assert.match(source.toString(), /page\.screenshot\(\{ clip \}\)/,
    'retained capture did not use the default screenshot caret setting');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 300, height: 100 } });
    await page.setContent('<input id="probe">');
    await page.locator('#probe').evaluate(input => {
      input.style.font = '20px Arial';
      input.style.caretColor = 'black';
      input.style.width = '200px';
      input.style.height = '40px';
    });
    await page.locator('#probe').focus();
    assert.equal(await page.locator('#probe').evaluate(input => document.activeElement === input), true);
    const clip = { x: 0, y: 0, width: 240, height: 60 };
    const hidden = PNG.sync.read(await page.screenshot({ clip, caret: 'hide' }));
    let observedNativeCaret = false;
    for (let sample = 0; sample < 8; sample++) {
      const initial = PNG.sync.read(await page.screenshot({ clip, caret: 'initial' }));
      let pixels = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let y = 0; y < initial.height; y++) for (let x = 0; x < initial.width; x++) {
        const i = (y * initial.width + x) * 4;
        if (initial.data[i] === hidden.data[i] &&
            initial.data[i + 1] === hidden.data[i + 1] &&
            initial.data[i + 2] === hidden.data[i + 2]) continue;
        pixels++; minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
      if (pixels > 0) {
        assert.ok(maxX - minX <= 3 && maxY - minY >= 10,
          `Screenshot option changed more than the native caret: ${JSON.stringify({ pixels, minX, maxX, minY, maxY })}`);
        observedNativeCaret = true;
        break;
      }
      await page.waitForTimeout(100);
    }
    assert.equal(observedNativeCaret, true,
      'Explicit initial caret option did not reveal a native caret in timed screenshots');
    await page.close();
  } finally { await browser.close(); }
});

test('current paired caret-visible capture binds its pixels to unequal caret authoring', () => {
  const currentFile = 'artifacts/material-parity/caret-visible-form-field-154/latest-report.json';
  const currentBytes = readFileSync(currentFile);
  assert.equal(hash(currentBytes), '8111da2cef29dd5a79af5e2723f4cdb73f98a56328860178a14d7301628992c3');
  const current = JSON.parse(currentBytes);
  const manifest = JSON.parse(readFileSync(current.capture.checkpointManifest.file));
  const historicalManifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.equal(current.browser, '154.0.8037.58');
  assert.deepEqual(manifest.provenance.browserFiles, historicalManifest.provenance.browserFiles);
  assert.equal(manifest.provenance.installedDependencies, historicalManifest.provenance.installedDependencies);
  assert.equal(manifest.provenance.browserFiles.length, 1887);
  const producer = current.capture.sources.find(item => item.file === 'scripts/audit-material-visible-caret.mjs');
  assert.ok(producer);
  assert.throws(() => readGapSurveySource(producer, {
    current: file => readFileSync(file, 'utf8').replace("await page.keyboard.press('Tab')", "await page.keyboard.press('Enter')"),
  }), /Unreviewed visible-caret producer drift/);
  assert.deepEqual(validateSupplementalCapture(current, { reportFile: currentFile,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-visible-caret.mjs',
    styleProperties: Object.values(propertyGroups).flat(),
    readBytes: file => path.resolve(file) === path.resolve(producer.file)
      ? Buffer.from(readGapSurveySource(producer)) : readFileSync(file),
  }), { status: 'checkpoint-bound', errors: [] });
  assert.deepEqual(current.results.map(row => row.state), Array.from({ length: 6 }, (_, i) => `focused-empty-${i}`));
  for (const row of current.results) for (const mode of ['reference', 'astylar']) {
    const side = row[mode];
    assert.equal(side.observation.control.value, '');
    assert.equal(side.observation.control.focused, true);
    for (const item of [side.screenshot, side.hiddenCaretControl]) {
      assert.equal(hash(readFileSync(item.file)), item.sha256, `${row.state}/${mode}/${item.caret}`);
      assert.deepEqual(item.clip, side.screenshot.clip);
    }
    assert.equal(side.screenshot.caret, 'initial');
    assert.equal(side.hiddenCaretControl.caret, 'hide');
    assert.equal(side.nativeCaretPixelDelta.changedPixels,
      rasterDifference(readFileSync(side.screenshot.file), readFileSync(side.hiddenCaretControl.file)).count);
  }
  const first = current.results[0], off = current.results[2];
  assert.deepEqual(first.reference.nativeCaretPixelDelta,
    { changedPixels: 19, bounds: { minX: 16, minY: 19, maxX: 16, maxY: 37 } });
  assert.equal(first.astylar.nativeCaretPixelDelta.changedPixels, 0);
  assert.deepEqual(off.reference.nativeCaretPixelDelta, { changedPixels: 0, bounds: null });
  const referenceOnOff = rasterDifference(readFileSync(first.reference.screenshot.file),
    readFileSync(off.reference.screenshot.file));
  const astylarOnOff = rasterDifference(readFileSync(first.astylar.screenshot.file),
    readFileSync(off.astylar.screenshot.file));
  assert.deepEqual(referenceOnOff, { count: 19, bounds: { minX: 16, minY: 19, maxX: 16, maxY: 37 },
    colors: ['103,80,164'] });
  assert.deepEqual(astylarOnOff.bounds, { minX: 15, minY: 18, maxX: 16, maxY: 37 });
  assert.ok(astylarOnOff.colors.includes('29,27,32'));
  const referenceTree = JSON.parse(readFileSync(first.reference.inputTree.file));
  const candidateTree = JSON.parse(readFileSync(first.astylar.inputTree.file));
  const referenceInput = referenceTree.nodes.find(node => node.attributes?.id === 'form-field-control');
  const candidateInput = candidateTree.nodes.find(node => node.authored?.id === 'form-field-control');
  assert.equal(referenceTree.styles[referenceInput.style].caretColor, 'rgb(103, 80, 164)');
  assert.ok(referenceInput.rules.map(index => referenceTree.rules[index]).some(rule =>
    rule.declarations?.['caret-color']?.value.includes('--mat-form-field-filled-caret-color')));
  assert.equal(candidateInput.resolvedStyle.caretColor, undefined);
  assert.equal(candidateInput.resolvedStyle.color, '#1d1b20');
});

test('desktop five-family empty caret preserves native visibility and candidate blink evidence', () => {
  for (const family of ['form-field','input','autocomplete','datepicker','timepicker']) for (const dpr of [1,2]) {
  const file = `artifacts/material-parity/visible-caret-${family}-desktop-dpr${dpr}-20261006/latest-report.json`;
  const capture = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(capture.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(capture, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-visible-caret.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(capture.results.length, 6);
  const images = [];
  for (const row of capture.results) {
    assert.equal(row.family, family); assert.equal(row.profile, 'light');
    assert.deepEqual(row.viewport, { width: 1440, height: 900, deviceScaleFactor: dpr });
    for (const mode of ['reference', 'astylar']) {
      assert.equal(row[mode].observation.control.value, '');
      assert.equal(row[mode].observation.control.focused, true);
      assert.equal(row[mode].observation.control.type, family === 'input' ? 'email' : 'text');
      for (const image of [row[mode].screenshot, row[mode].hiddenCaretControl])
        assert.equal(hash(readFileSync(image.file)), image.sha256);
      assert.equal(row[mode].screenshot.caret, 'initial');
      assert.equal(row[mode].hiddenCaretControl.caret, 'hide');
    }
    const referenceTree = JSON.parse(readFileSync(row.reference.inputTree.file));
    const candidateTree = JSON.parse(readFileSync(row.astylar.inputTree.file));
    const id = `${family}-control`;
    const referenceInput = referenceTree.nodes.find(node => node.attributes?.id === id);
    const candidateInput = candidateTree.nodes.find(node => node.authored?.id === id);
    assert.equal(referenceTree.styles[referenceInput.style].caretColor, 'rgb(103, 80, 164)');
    for (const stage of ['resolvedStyle','normalResolvedStyle','interactionResolvedStyle']) {
      assert.equal(candidateInput[stage].caretColor, undefined);
      assert.equal(candidateInput[stage].color, '#1d1b20');
    }
    for (const selector of ['.field-control','.field-control:focus']) {
      const rule = candidateTree.rules.find(rule => rule.selector === selector);
      assert.ok(rule); assert.equal(rule.caretColor, undefined);
      assert.equal(rule.color, '#1d1b20');
    }
    const byKey = new Map(candidateTree.nodes.map(node => [node.key,node]));
    for (let node = candidateInput; node; node = byKey.get(node.parent))
      assert.equal(node.resolvedStyle?.caretColor, undefined, 'no inherited caret color in captured ancestry');
    images.push(PNG.sync.read(readFileSync(row.astylar.screenshot.file)));
  }
  assert.ok(capture.results.some(row => row.reference.nativeCaretPixelDelta.changedPixels > 0));
  let stroke = false;
  let widestColumns = [];
  for (const on of images) for (const off of images) {
  const columns = [];
  for (let x = 0; x < 24*dpr; x++) {
    let run = 0;
    let longest = 0;
    for (let y = 0; y < on.height; y++) {
      const i = (y * on.width + x) * 4;
      const foreground = on.data[i] === 29 && on.data[i+1] === 27 && on.data[i+2] === 32;
      const changed = on.data[i] !== off.data[i] || on.data[i+1] !== off.data[i+1] || on.data[i+2] !== off.data[i+2];
      run = foreground && changed ? run + 1 : 0;
      longest = Math.max(longest, run);
      if (run >= 10*dpr) stroke = true;
    }
    if (longest >= 10*dpr) columns.push({x, longest});
  }
  if (columns.length > widestColumns.length) widestColumns = columns;
  }
  assert.equal(stroke, true, 'candidate has a localized contiguous blinking caret, not just label animation');
  const nativeOn = capture.results.find(row => row.reference.nativeCaretPixelDelta.changedPixels > 0).reference.nativeCaretPixelDelta;
  assert.equal(nativeOn.bounds.maxX-nativeOn.bounds.minX+1, dpr);
  assert.deepEqual(widestColumns.map(column => column.x), Array.from({length:2*dpr},(_,i)=>15*dpr+i));
  assert.ok(widestColumns.every(column => column.longest === (dpr === 1 ? 18 : 38)));
  }
});

test('dark mobile empty inputs expose caret pixels without changing retained producers', async t => {
  const browserRoot = path.resolve('examples/material-showcase/dist/material-showcase/browser');
  const checkpoint = JSON.parse(readFileSync('artifacts/material-parity/caret-visible-checkpoint-154/checkpoint/manifest.json'));
  assert.deepEqual(fingerprintDirectory(browserRoot), checkpoint.provenance.browserFiles);
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const candidate = path.resolve(browserRoot, pathname.replace(/^\/+/, ''));
    const target = candidate.startsWith(browserRoot + path.sep) && path.extname(candidate) && existsSync(candidate)
      ? candidate : path.join(browserRoot, 'index.csr.html');
    const extension = path.extname(target);
    response.writeHead(200, { 'content-type': extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' :
      extension === '.woff2' ? 'font/woff2' : extension === '.svg' ? 'image/svg+xml' : 'text/html', 'cache-control': 'no-store' });
    response.end(readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    assert.equal(browser.version(), '154.0.8037.58');
    const observations = {};
    for (const family of ['form-field', 'input']) {
      observations[family] = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
        const errors = [], samples = [];
        page.on('pageerror', error => errors.push(String(error)));
        await page.goto(`http://127.0.0.1:${server.address().port}/${mode}/${family}?benchmark=1&profile=dark`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
        await page.keyboard.press('Tab');
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        for (let index = 0; index < 6; index++) {
          if (index) await page.waitForTimeout(125);
          if (mode === 'astylar') await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
          await page.evaluate(async () => { await document.fonts.ready;
            await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
          const control = await page.evaluate(({ mode, family }) => {
            const id = `${family}-control`;
            const node = mode === 'reference' ? document.querySelector(`#${id}`) : document.querySelector(`[data-astylar-id="${id}"]`);
            let box = node.getBoundingClientRect().toJSON();
            if (mode === 'astylar') {
              const measured = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id], false).elements[id].borderBox;
              const canvas = document.querySelector('canvas').getBoundingClientRect();
              box = { x: canvas.x + measured.left, y: canvas.y + measured.top, width: measured.width, height: measured.height };
            }
            return { value: node.value, focused: document.activeElement === node, type: node.type,
              selection: [node.selectionStart, node.selectionEnd], caretColor: getComputedStyle(node).caretColor, box };
          }, { mode, family });
          const { box } = control;
          const clip = { x: Math.max(0, box.x - 8), y: Math.max(0, box.y - 8),
            width: Math.min(390, box.x + box.width + 8) - Math.max(0, box.x - 8),
            height: Math.min(844, box.y + box.height + 8) - Math.max(0, box.y - 8) };
          const visible = await page.screenshot({ clip, caret: 'initial' });
          const hidden = await page.screenshot({ clip, caret: 'hide' });
          samples.push({ control, visible, delta: rasterDifference(visible, hidden) });
        }
        const pairs = samples.flatMap((sample, index) => samples.slice(index + 1).flatMap(other => [
          rasterDifference(sample.visible, other.visible), rasterDifference(other.visible, sample.visible),
        ]));
        const authoring = mode === 'reference' ? await page.evaluate(({ family }) => {
          const node = document.querySelector(`#${family}-control`);
          return { color: getComputedStyle(node).color, caretColor: getComputedStyle(node).caretColor };
        }, { family }) : await page.evaluate(family => {
          const id = `${family}-control`;
          const measurement = window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([id]);
          const node = measurement.inputTree.nodes.find(node => node.authored?.id === id);
          return { color: node.resolvedStyle.color, caretColor: node.resolvedStyle.caretColor ?? null };
        }, family);
        observations[family][mode] = { controls: samples.map(sample => sample.control),
          authoring, deltas: samples.map(sample => sample.delta), blink: pairs.sort((a, b) => b.count - a.count)[0],
          // Both directions retain the caret-on palette even when the first
          // sampled image has an off-phase background at these pixels.
          blinkColors: [...new Set(pairs.flatMap(pair => pair.colors))].sort(), errors };
        await page.close();
      }
    }
    for (const family of ['form-field', 'input']) {
      for (const mode of ['reference', 'astylar']) {
        const side = observations[family][mode];
        assert.deepEqual(side.errors, []);
        assert.equal(side.controls.length, 6);
        for (const control of side.controls) {
          assert.equal(control.value, '');
          assert.equal(control.focused, true);
          assert.equal(control.type, family === 'input' ? 'email' : 'text');
          assert.deepEqual(control.selection, family === 'input' ? [null, null] : [0, 0]);
        }
      }
      const reference = observations[family].reference, candidate = observations[family].astylar;
      const nativeOn = reference.deltas.find(delta => delta.count > 0);
      assert.ok(nativeOn, 'six samples never exposed the native caret');
      assert.deepEqual(nativeOn, { count: 76, bounds: { minX: 16, minY: 22, maxX: 17, maxY: 59 }, colors: ['208,188,255'] });
      assert.deepEqual(reference.authoring, { color: 'rgb(230, 225, 229)', caretColor: 'rgb(208, 188, 255)' });
      assert.deepEqual(candidate.authoring, { color: '#1d1b20', caretColor: null });
      assert.equal(candidate.blink.count, 156);
      assert.deepEqual(candidate.blink.bounds, { minX: 14, minY: 21, maxX: 17, maxY: 59 });
      assert.ok(candidate.blinkColors.includes('29,27,32'), 'canvas caret color never appeared in sampled pixels');
      for (const key of ['x', 'y', 'width', 'height']) {
        assert.ok(Math.abs(reference.controls[0].box[key] - candidate.controls[0].box[key]) < .01, `control ${key} differs`);
      }
      t.diagnostic(JSON.stringify({ family, referenceCaret: nativeOn, candidateBlink: candidate.blink,
        candidateBlinkColors: candidate.blinkColors, referenceAuthoring: reference.authoring, candidateAuthoring: candidate.authoring }));
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
});

test('shipped caret geometry fixes width before projection independently of caret color', async t => {
  const source = readFileSync('examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js');
  assert.equal(hash(source), 'f366533bd9f80b7f85379db5031c0dea8c9c1840c14fb6ec35f57f1b65ad9eab');
  const ast = ts.createSourceFile('served.js', source.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const names = ['createTextCursor', 'updateTextCursorColor', 'projectCursorX', 'calculateCursorPosition'];
  const methods = new Map(names.map(name => [name, []]));
  const visit = node => {
    if (ts.isMethodDeclaration(node) && methods.has(node.name.getText(ast))) methods.get(node.name.getText(ast)).push(node);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  for (const matches of methods.values()) assert.equal(matches.length, 1);
  const { NullEngine, Scene, MeshBuilder, StandardMaterial, Color3 } = await import('@babylonjs/core');
  // Execute the complete shipped methods with actual Babylon meshes, not copied
  // caret arithmetic. NullEngine proves pre-projection geometry, not pixels.
  const service = new Function('MeshBuilder', 'StandardMaterial', 'Color3',
    `return ({${[...methods.values()].map(matches => matches[0].getText(ast)).join(',')}});`)(MeshBuilder, StandardMaterial, Color3);
  service.CURSOR_WIDTH_SCALE = 1;
  service.styleService = { parseBackgroundColor: value => ({ type: 'color', color: Color3.FromHexString(value), alpha: 1 }) };
  const engine = new NullEngine(), scene = new Scene(engine);
  const parent = MeshBuilder.CreatePlane('equal-input-caret', { width: 228, height: 24 }, scene);
  const sizes = [], points = [];
  const projection = {
    projectCssSize: size => { sizes.push({ ...size }); return size; },
    projectCssLocalPoint: point => { points.push({ ...point }); return { ...point, z: 0 }; },
  };
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    assert.equal(browser.version(), '154.0.8037.58');
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
      try {
        const page = await context.newPage();
        await page.setContent('<input aria-label="isolated empty input" style="position:absolute;left:20px;top:40px;width:228px;height:24px;padding:0;border:0;outline:0;background:#e8e0eb;color:#e6e1e5;caret-color:#d0bcff;font:16px/24px Arial">');
        await page.keyboard.press('Tab');
        const input = page.locator('input'), box = await input.boundingBox();
        const style = await input.evaluate(node => { const s = getComputedStyle(node); return { color: s.color, caretColor: s.caretColor, fontSize: s.fontSize, value: node.value, focused: document.activeElement === node }; });
        assert.deepEqual(style, { color: 'rgb(230, 225, 229)', caretColor: 'rgb(208, 188, 255)', fontSize: '16px', value: '', focused: true });
        let native = { count: 0 };
        for (let sample = 0; sample < 6; sample++) {
          const visible = await page.screenshot({ clip: box, caret: 'initial' });
          const hidden = await page.screenshot({ clip: box, caret: 'hide' });
          const delta = rasterDifference(visible, hidden);
          if (delta.count > native.count) native = delta;
          await page.waitForTimeout(125);
        }
        assert.ok(native.count > 0, 'native empty caret must have visible pixels');
        assert.deepEqual(native.colors, ['208,188,255']);
        assert.equal(native.bounds.maxX - native.bounds.minX + 1, dpr);
        assert.equal(native.bounds.minX, 0);
        sizes.length = 0; points.length = 0;
        const cursor = service.createTextCursor(0, { characters: [] }, parent, scene, projection,
          { fontSize: 16, color: '#e6e1e5', caretColor: '#d0bcff' }, { width: 228, height: 24 }, 0, 1, 0, -114);
        try {
          assert.deepEqual(sizes, [{ width: 2, height: 19.2 }]);
          assert.deepEqual(points, [{ x: -114, y: 0 }]);
          assert.equal(cursor.position.x, -114);
          assert.equal(cursor.material.emissiveColor.toHexString().toLowerCase(), '#d0bcff');
          const bounds = cursor.getBoundingInfo().boundingBox;
          assert.equal(bounds.minimum.x, -1);
          assert.equal(bounds.maximum.x, 1);
          t.diagnostic(JSON.stringify({ dpr, native, shippedCssWidth: sizes[0].width, shippedCenterAtInsertionEdge: cursor.position.x,
            classification: 'core-caret-geometry-policy', limitation: 'NullEngine geometry is not a full paired WebGL raster' }));
        } finally { cursor.dispose(false, true); }
      } finally { await context.close(); }
    }
  } finally { await browser?.close(); parent.dispose(false, true); scene.dispose(); engine.dispose(); }
});

test('public equal-input empty caret has paired WebGL raster evidence', async t => {
  const calibration = new PNG({width:2,height:1});
  calibration.data.set([208,188,255,255,136,136,136,255]);
  const removed = new PNG({width:2,height:1});
  removed.data.set([232,224,235,255,232,224,235,255]);
  assert.deepEqual(rasterDifference(PNG.sync.write(calibration),PNG.sync.write(removed),[208,188,255]),
    {count:1,bounds:{minX:0,minY:0,maxX:0,maxY:0},colors:['208,188,255']},
    'caret-color isolation preserves the requested foreground and rejects unrelated glyph changes');
  // Compile a public consumer in memory: no canonical fixture, Material plugin,
  // renderer replacement, retained mesh mutation or capture directory.
  const consumer = path.resolve('examples/material-showcase');
  const requireConsumer = createRequire(path.join(consumer, 'package.json'));
  const built = await requireConsumer('esbuild').build({ absWorkingDir: process.cwd(),
    stdin: { resolveDir: consumer, sourcefile: 'equal-input-caret.mjs', contents: `
      import '@angular/compiler';
      import { provideZonelessChangeDetection } from '@angular/core';
      import { createApplication } from '@angular/platform-browser';
      import { Astylar } from 'astylarui';
      const mode = new URLSearchParams(location.search).get('mode');
      const variant = new URLSearchParams(location.search).get('variant');
      const child = {type:variant.endsWith('textarea')?'textarea':'input',inputType:'text',id:'audit-empty',
        value:variant.startsWith('selection')?'Atlas':'',ariaLabel:'empty input',
        ...(variant.startsWith('placeholder')?{placeholder:'Project name'}:{})};
      const site = { root: { children: [child] },
        styles: [{selector:'#audit-empty',position:'absolute',left:'20px',top:'40px',width:'228px',height:'24px',
          boxSizing:'border-box',display:'block',margin:'0',padding:'0',paddingLeft:'8px',paddingRight:'8px',borderWidth:'0',borderRadius:'0',
          background:'#e8e0eb',color:'#e6e1e5',caretColor:'#d0bcff',
          fontFamily:'Arial',fontSize:'16px',fontWeight:'400',lineHeight:'24px',textAlign:'left'}] };
      document.body.style.cssText='margin:0;padding:0';
      const stage=document.createElement(mode==='reference'?'div':'canvas');
      stage.style.cssText='position:relative;display:block;width:390px;height:140px;margin:0;padding:0';
      document.body.append(stage);
      let application, surface;
      if(mode==='reference') {
        const css=document.createElement('style');
        css.textContent=site.styles.map(({selector,...values})=>selector+'{'+Object.entries(values)
          .map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');
        document.head.append(css);
        const input=document.createElement(child.type); input.id='audit-empty';
        if(child.type==='input') input.type='text';
        input.value=child.value;
        if(child.placeholder) input.placeholder=child.placeholder;
        input.setAttribute('aria-label','empty input'); stage.append(input);
      } else {
        application=await createApplication({providers:[provideZonelessChangeDetection()]});
        surface=application.injector.get(Astylar).mount(stage,site,{diagnostics:{logLevel:'silent'}});
      }
      const settle=async()=>{await document.fonts.ready; await surface?.whenSettled();
        await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();
      window.caretAudit={settle,snapshot(){
        const input=mode==='reference'?document.getElementById('audit-empty'):
          document.querySelector('[data-astylar-id="audit-empty"]');
        if(!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) throw Error('Missing public control');
        const computed=mode==='reference'?getComputedStyle(input):null;
        return {site,focused:input===document.activeElement,value:input.value,selection:[input.selectionStart,input.selectionEnd],direction:input.selectionDirection,
          nativeFocusPaint:computed?{outlineStyle:computed.outlineStyle,outlineWidth:computed.outlineWidth,
            outlineColor:computed.outlineColor,borderWidth:computed.borderWidth,lineHeight:computed.lineHeight}:null,
          resolved:surface?.inspectResolvedStyles()??null,diagnostics:surface?.diagnostics??null,
          highlights:surface?.scene.meshes.filter(m=>m.metadata?.highlight?.ownerElementId==='audit-empty').map(m=>({
            visible:m.isVisible&&m.isEnabled(),color:m.material?.emissiveColor?.toHexString(),alpha:m.material?.alpha}))??[],
          cursorMeshes:surface?.scene.meshes.filter(m=>/cursor/i.test(m.name)).map(m=>({name:m.name,enabled:m.isEnabled(),visible:m.isVisible}))??[],
          coreControl:surface?.scene.meshes.filter(m=>m.metadata?.textInput).map(m=>{
            const c=m.metadata.textInput; return {value:c.value,textContent:c.textContent,cursorPosition:c.cursorPosition,
              selection:[c.selectionStart,c.selectionEnd],origin:c.visualTextLeftEdgeCss,
              cssSize:c.cssSize,scrollTop:c.scrollTop??0,
              lines:c.textLayoutMetrics?.lines.map(line=>({index:line.index,startIndex:line.startIndex,endIndex:line.endIndex,
                top:line.top,bottom:line.bottom,baseline:line.baseline}))??[]};})??[]};
      },dispose(){surface?.dispose();application?.destroy();return surface?.disposed??true;}};
    ` }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(file => path.basename(file) !== 'equal-input-caret.mjs')
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const packages = Object.fromEntries(['@angular/core', '@babylonjs/core', 'astylarui'].map(name =>
    [name, JSON.parse(readFileSync(path.join(consumer, 'node_modules', name, 'package.json'))).version]));
  const bundle = built.outputFiles[0].contents;
  const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script type="module" src="/audit.js"></script></body></html>';
  const server = createServer((request, response) => {
    const script = new URL(request.url, 'http://localhost').pathname === '/audit.js';
    response.setHeader('content-type', script ? 'text/javascript' : 'text/html');
    response.end(script ? bundle : html);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [], errors = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const allCases = ['plain', 'placeholder', 'placeholder-keyboard', 'textarea', 'selection-input', 'selection-textarea'];
    const cases = process.env.ASTYLAR_AUDIT_TEXT_CASE?.split(',') ?? allCases;
    assert.ok(cases.length && cases.every(value => allCases.includes(value)));
    for (const variant of cases) for (const dpr of [1, 2]) {
      const pair = {};
      for (const mode of ['reference', 'astylar']) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
        try {
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(String(error)));
          await page.goto(`http://127.0.0.1:${server.address().port}/?mode=${mode}&variant=${variant}`);
          await page.waitForFunction(() => !!window.caretAudit);
          if (variant.startsWith('selection')) {
            await page.mouse.click(50, 52);
            await page.keyboard.press('Home');
            await page.evaluate(() => window.caretAudit.settle());
            const clip = {x:20,y:40,width:228,height:24};
            const baseline = await page.screenshot({clip,caret:'hide'});
            const samples = [];
            const sample = async label => {
              await page.evaluate(() => window.caretAudit.settle());
              const state = await page.evaluate(() => window.caretAudit.snapshot());
              const pixels = await page.screenshot({clip,caret:'hide'});
              const before = PNG.sync.read(baseline), after = PNG.sync.read(pixels), palette = new Map();
              for (let i=0;i<after.data.length;i+=4) {
                if (after.data[i]===before.data[i]&&after.data[i+1]===before.data[i+1]&&after.data[i+2]===before.data[i+2]) continue;
                const color=[...after.data.subarray(i,i+3)].join(','); palette.set(color,(palette.get(color)??0)+1);
              }
              samples.push({label,value:state.value,selection:state.selection,direction:state.direction,focused:state.focused,
                core:state.coreControl,highlights:state.highlights,commonChangedColors:[...palette].sort((a,b)=>b[1]-a[1]).slice(0,6),
                nativeFocusPaint:state.nativeFocusPaint,
                whiteForegroundPixels:palette.get('255,255,255')??0,
                highlightRaster:rasterDifference(pixels,baseline,mode==='reference'?[46,97,205]:[23,63,107])});
              assert.equal(state.value,'Atlas'); assert.equal(state.focused,true);
              if(mode==='astylar') assert.deepEqual(state.diagnostics.messages,[]);
            };
            for(let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowRight');
            await sample('forward');
            // Collapse first; keep the previously isolated End-on-selection
            // defect separate from this selection-paint investigation.
            await page.keyboard.press('ArrowRight'); await page.keyboard.press('End');
            await sample('collapsed');
            for(let i=0;i<3;i++) await page.keyboard.press('Shift+ArrowLeft');
            await sample('backward');
            pair[mode]={site:(await page.evaluate(()=>window.caretAudit.snapshot())).site,samples};
            t.diagnostic(JSON.stringify({variant,dpr,mode,samples}));
            assert.equal(await page.evaluate(()=>window.caretAudit.dispose()),true);
            continue;
          }
          const initial = await page.evaluate(() => window.caretAudit.snapshot());
          assert.equal(initial.focused, false); assert.equal(initial.value, '');
          // Interior crop excludes native platform focus outline. Baseline subtraction
          // leaves visible caret pixels, not a native-only screenshot caret override.
          const clip = { x: 24, y: 44, width: 220, height: 16 };
          const baseline = await page.screenshot({ clip, caret: 'initial' });
          const stageBaseline = await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' });
          if (variant === 'placeholder-keyboard') await page.keyboard.press('Tab');
          else await page.mouse.click(50, 52);
          await page.evaluate(() => window.caretAudit.settle());
          const focused = await page.evaluate(() => window.caretAudit.snapshot());
          assert.equal(focused.focused, true); assert.equal(focused.value, '');
          assert.deepEqual(focused.selection, [0, 0]);
          let paint = { count: 0 }, stageDelta = { count: 0 };
          for (let sample = 0; sample < 6; sample++) {
            const delta = rasterDifference(await page.screenshot({ clip, caret: 'initial' }), baseline,
              variant === 'plain' ? undefined : [208, 188, 255]);
            if (delta.count > paint.count) paint = delta;
            const fullDelta = rasterDifference(await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 140 }, caret: 'initial' }), stageBaseline,
              variant === 'plain' ? undefined : [208, 188, 255]);
            if (fullDelta.count > stageDelta.count) stageDelta = fullDelta;
            await page.waitForTimeout(125);
          }
          pair[mode] = { site: focused.site, paint, stageDelta, resolved: focused.resolved,
            initialCore:focused.coreControl,cursorMeshes: focused.cursorMeshes };
          if (mode === 'reference') assert.ok(paint.count > 0, 'native empty caret must paint');
          if (mode === 'astylar') {
            assert.deepEqual(focused.diagnostics.messages, [], 'minimal public input must have no unsupported declarations');
            assert.ok(stageDelta.count > 0, 'candidate caret must be located across the whole surface, not assumed absent from interior');
          }
          {
            // Same empty value reached through editing exercises the normal text
            // display path. No cursor/mesh state is set by the diagnostic.
            await page.keyboard.type('A');
            await page.evaluate(() => window.caretAudit.settle());
            const typed = await page.evaluate(() => window.caretAudit.snapshot());
            assert.equal(typed.value, 'A');
            if (mode === 'astylar') {
              assert.equal(focused.coreControl[0].cursorPosition, variant === 'placeholder' ? 3 : 0);
              assert.equal(typed.coreControl[0].cursorPosition, variant === 'placeholder' ? 4 : 1);
            }
            await page.keyboard.press('Backspace');
            await page.evaluate(() => window.caretAudit.settle());
            const edited = await page.evaluate(() => window.caretAudit.snapshot());
            t.diagnostic(JSON.stringify({ variant, dpr, mode, typed: {value:typed.value,selection:typed.selection},
              deleted: {value:edited.value,selection:edited.selection,focused:edited.focused}, typedCore:typed.coreControl,deletedCore:edited.coreControl }));
            const placeholderDeletionDefect = mode === 'astylar' && variant === 'placeholder';
            assert.equal(edited.value, placeholderDeletionDefect ? 'A' : '', `${variant}/${mode}/DPR${dpr} Backspace after settled typing`);
            assert.equal(edited.focused, true);
            assert.deepEqual(edited.selection, placeholderDeletionDefect ? [1, 1] : [0, 0]);
            pair[mode].deletion = {value:edited.value,selection:edited.selection,core:edited.coreControl,
              classification:placeholderDeletionDefect?'exposed-placeholder-deletion-defect':'empty-state-reached'};
            let editedEmpty = { count: 0 };
            for (let sample = 0; !placeholderDeletionDefect && sample < 6; sample++) {
              const delta = rasterDifference(await page.screenshot({ clip: mode === 'astylar'
                ? { x: 0, y: 0, width: 390, height: 140 } : clip, caret: 'initial' }),
                mode === 'astylar' ? stageBaseline : baseline, variant === 'plain' ? undefined : [208, 188, 255]);
              if (delta.count > editedEmpty.count) editedEmpty = delta;
              await page.waitForTimeout(125);
            }
            if (!placeholderDeletionDefect) assert.ok(editedEmpty.count > 0);
            pair[mode].editedEmpty = placeholderDeletionDefect ? null : editedEmpty;
          }
          assert.equal(await page.evaluate(() => window.caretAudit.dispose()), true);
        } finally { await context.close(); }
      }
      assert.deepEqual(pair.reference.site, pair.astylar.site);
      if (variant.startsWith('selection')) {
        for(const mode of ['reference','astylar']) {
          const samples=pair[mode].samples;
          assert.deepEqual(samples.map(s=>s.selection),[[0,3],[5,5],[2,5]]);
          assert.equal(samples[0].direction,'forward');assert.equal(samples[2].direction,'backward');
          for(const i of [0,2]) {
            assert.equal(samples[i].commonChangedColors[0][0],mode==='reference'?'46,97,205':'23,63,107');
            assert.ok(samples[i].highlightRaster.count>0,'selected background must be visible');
            assert.ok(samples[i].whiteForegroundPixels>0,'selected white foreground must be visible');
            if(mode==='astylar') assert.deepEqual(samples[i].highlights,[{visible:true,color:'#173F6B',alpha:1}]);
          }
          assert.equal(samples[1].highlightRaster.count,0,'collapse removes the observed highlight pixels');
        }
        assert.deepEqual(pair.astylar.samples[1].highlights,[],'collapse releases candidate highlight owners');
        results.push({variant,dpr,selections:{reference:pair.reference.samples,astylar:pair.astylar.samples},
          classification:'equal-authored-input; selection-state-agrees; documented-contrast-palette-differs; highlight-bounds-confounded-by-native-outline-and-clipping'});
        continue;
      }
      assert.equal(pair.reference.paint.bounds.maxX - pair.reference.paint.bounds.minX + 1, dpr);
      assert.deepEqual(pair.reference.paint.colors, ['208,188,255']);
      assert.deepEqual(pair.reference.editedEmpty, pair.reference.paint, 'native insertion stays at the same padded origin after equal editing');
      const center = paint => (paint.bounds.minX + paint.bounds.maxX + 1) / (2 * dpr);
      if (variant === 'plain') {
        assert.equal(pair.astylar.paint.count, 0, 'record the initial caret outside the padded interior, not parity');
        assert.equal(center(pair.astylar.stageDelta), 21.5, 'initial empty caret takes the core insertion-edge fallback');
        assert.equal(center(pair.astylar.editedEmpty), 28, 'editing establishes the authored padded insertion edge');
      } else if (variant === 'textarea') {
        assert.equal(center(pair.astylar.stageDelta), 21.5, 'textarea shares initial insertion-edge fallback');
        assert.equal(center(pair.astylar.editedEmpty), 28, 'textarea editing initializes the padded origin');
        const initial = pair.astylar.initialCore[0], edited = pair.astylar.deletion.core[0];
        assert.deepEqual(initial.lines, edited.lines, 'editing did not change the empty CSS line metrics');
        assert.deepEqual(initial.lines, [{index:0,startIndex:0,endIndex:0,top:16,bottom:16,baseline:16}]);
        assert.deepEqual(initial.cssSize, {width:228,height:24});
        assert.equal(initial.scrollTop, 0); assert.equal(edited.scrollTop, 0);
        const updateCssY = -edited.cssSize.height / 2 + (edited.lines[0].top + edited.lines[0].bottom) / 2 - edited.scrollTop;
        assert.equal(updateCssY, 4, 'core update treats empty glyph bounds as the line center, unlike initial creation');
        assert.equal((pair.astylar.editedEmpty.bounds.minY - pair.astylar.stageDelta.bounds.minY) / dpr, 4,
          'CSS update placement matches the observed four-pixel shift, independently of DPR');
      } else {
        assert.equal(center(pair.astylar.stageDelta), 28, 'placeholder paint initializes the padded origin');
        if (variant === 'placeholder-keyboard') assert.deepEqual(pair.astylar.editedEmpty, pair.astylar.stageDelta);
      }
      t.diagnostic(JSON.stringify({ variant, dpr, reference: pair.reference.paint, astylar: pair.astylar.stageDelta, editedEmpty: pair.astylar.editedEmpty }));
      results.push({ variant, dpr, reference: pair.reference.paint, astylar: pair.astylar.paint,
        referenceEditedEmpty: pair.reference.editedEmpty, stageDelta: pair.astylar.stageDelta,
        editedEmpty: pair.astylar.editedEmpty, deletion:pair.astylar.deletion,cursorMeshes: pair.astylar.cursorMeshes,
        initialCore:pair.astylar.initialCore,
        effective: pair.astylar.resolved.elements.find(e => e.id === 'audit-empty').effective });
    }
    assert.deepEqual(errors, []);
    for (const input of inputs) assert.equal(hash(readFileSync(input.file)), input.sha256, input.file);
    const coreSources = inputs.filter(input => /(?:text-input\.manager|text-selection\.service)\.js$/.test(input.file));
    assert.equal(coreSources.length, 2);
    t.diagnostic(JSON.stringify({ browser: browser.version(), packages, bundleSha256: hash(bundle),
      dependencyCount: inputs.length, dependencyReceiptSha256: hash(JSON.stringify(inputs)), coreSources, results,
      cases, focused:!!process.env.ASTYLAR_AUDIT_TEXT_CASE,
      classification: 'core-caret-initialization-and-placeholder-pointer-defects; equal-input-selection-palette-documented-difference',
      limitation: 'installed packed public consumer, not frozen Material bundle; selection background bounds can be occluded by native focus outline or crop; native-only caret hide is not caret parity evidence; all Material states and full selection raster remain unproven' }));
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

test('public equal-input overflow isolates scrollbar gutter before projection', async t => {
  const installedPath = 'examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-scroll-runtime.js';
  const installed = readFileSync(installedPath, 'utf8');
  const compiled = ts.transpileModule(readFileSync('src/lib/astylar-scroll-runtime.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const method = source => {
    const start = source.indexOf('    createContainer('), end = source.indexOf('    findDirectChildMesh(', start);
    assert.ok(start > 0 && end > start);
    return source.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(method(installed), method(compiled), 'installed client-area calculation matches current source');
  const paintAdapterPath = path.join('examples/material-showcase/node_modules/astylarui/dist/lib/app/services', 'babylon-scroll-paint-adapter.js');
  const installedPaintAdapter = readFileSync(paintAdapterPath, 'utf8');
  const compiledPaintAdapter = ts.transpileModule(readFileSync('src/app/services/babylon-scroll-paint-adapter.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const scrollbarCreation = source => {
    const start = source.indexOf('    createScrollbar('), end = source.indexOf('    positionScrollbarThumb(', start);
    assert.ok(start > 0 && end > start);
    return source.slice(start, end).replace(/\s+/g, ' ').trim();
  };
  assert.equal(scrollbarCreation(installedPaintAdapter), scrollbarCreation(compiledPaintAdapter));
  const consumer = path.resolve('examples/material-showcase');
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    stdin: { resolveDir: consumer, sourcefile: 'equal-input-scroll-gutter.mjs', contents: `
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      const query=new URLSearchParams(location.search), mode=query.get('mode'), overflow=query.get('overflow');
      const site={root:{children:[{type:'div',id:'box',children:[{type:'div',id:'content'}]}]},styles:[
        {selector:'#box',display:'block',position:'absolute',left:'20px',top:'20px',width:'260px',height:'128px',
          boxSizing:'border-box',padding:'0',margin:'0',borderWidth:'0',background:'#eeeeee',overflow},
        {selector:'#content',display:'block',width:'100%',height:'400px',boxSizing:'border-box',padding:'0',margin:'0',borderWidth:'0',background:'#8844aa'}]};
      document.body.style.cssText='margin:0;padding:0';
      const host=document.createElement(mode==='reference'?'div':'canvas');
      host.style.cssText='position:relative;display:block;width:320px;height:200px;margin:0;padding:0';document.body.append(host);
      let app,surface;
      if(mode==='reference'){
        const css=document.createElement('style');css.textContent=site.styles.map(({selector,...values})=>selector+'{'+
          Object.entries(values).map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');document.head.append(css);
        const box=document.createElement('div'),content=document.createElement('div');box.id='box';content.id='content';box.append(content);host.append(box);
      }else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});}
      const settle=async()=>{await surface?.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();window.gutterAudit={settle,snapshot(){const box=document.getElementById('box');
        return {site,scroll:surface?surface.diagnostics.scrolling.containers.box:{clientWidth:box.clientWidth,clientHeight:box.clientHeight,scrollTop:box.scrollTop,scrollHeight:box.scrollHeight},
          native:mode==='reference'?{width:box.getBoundingClientRect().width,childWidth:document.getElementById('content').getBoundingClientRect().width,overflow:getComputedStyle(box).overflow}:null,
          resolved:surface?.inspectResolvedStyles()??null,errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[]};},
        dispose(){surface?.dispose();app?.destroy();return surface?.disposed??true;}};
    ` }, bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',metafile:true });
  const inputs = Object.keys(built.metafile.inputs).filter(file => !file.endsWith('equal-input-scroll-gutter.mjs'))
    .map(file => ({file,sha256:hash(readFileSync(file))}));
  const packages=Object.fromEntries(['@angular/core','@babylonjs/core','astylarui'].map(name=>
    [name,JSON.parse(readFileSync(path.join(consumer,'node_modules',name,'package.json'))).version]));
  assert.ok(inputs.some(input => input.file.includes('node_modules/astylarui/')));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file)), 'public root package only');
  const server=createServer((req,res)=>{const script=req.url.startsWith('/audit.js');
    res.setHeader('content-type',script?'text/javascript':'text/html');
    res.end(script?built.outputFiles[0].contents:'<!doctype html><script type="module" src="/audit.js"></script>');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {materialBrowserLaunchOptions,inspectMaterialBrowserLaunch}=await import('./run-checkpoint.mjs');
  let browser;const results=[];
  try{
    const launch=materialBrowserLaunchOptions();browser=await chromium.launch(launch);
    const launchEvidence=await inspectMaterialBrowserLaunch(browser,launch);
    for(const overflow of ['hidden','auto','scroll'])for(const dpr of [1,2]){
      const pair={};
      for(const mode of ['reference','astylar']){
        const page=await browser.newPage({viewport:{width:320,height:200},deviceScaleFactor:dpr});
        const errors=[];page.on('pageerror',error=>errors.push(String(error)));
        try{
          await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode+'&overflow='+overflow);
          await page.waitForFunction(()=>!!window.gutterAudit);await page.evaluate(()=>window.gutterAudit.settle());
          pair[mode]=await page.evaluate(()=>window.gutterAudit.snapshot());
          if (overflow !== 'hidden') {
            // Identical CSS outer box; use its below-thumb right-edge track.
            await page.mouse.move(274, 115);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.evaluate(()=>window.gutterAudit.settle());
            pair[mode].trackHeld=await page.evaluate(()=>window.gutterAudit.snapshot().scroll);
            await page.mouse.up();
          }
          assert.deepEqual(errors,[]);assert.deepEqual(pair[mode].errors,[]);
          assert.equal(await page.evaluate(()=>window.gutterAudit.dispose()),true);
        }finally{await page.close();}
      }
      assert.deepEqual(pair.reference.site,pair.astylar.site);
      const effective=pair.astylar.resolved.elements.find(e=>e.id==='box').effective;
      assert.equal(effective.overflow,overflow);assert.equal(effective.width,'260px');assert.equal(effective.height,'128px');
      assert.equal(pair.reference.native.width,260);assert.equal(pair.reference.native.overflow,overflow);
      assert.equal(pair.reference.scroll.clientWidth,overflow==='hidden'?260:245);
      assert.equal(pair.reference.native.childWidth,pair.reference.scroll.clientWidth);
      assert.equal(pair.reference.scroll.clientHeight,overflow==='scroll'?113:128);
      if(overflow==='hidden'){
        assert.equal(pair.astylar.scroll,undefined,'clipping-only box has no public scroll-container state');
      }else{
        assert.equal(pair.astylar.scroll.clientWidth,260);
        assert.equal(pair.astylar.scroll.clientHeight,128);
        assert.ok(pair.reference.trackHeld.scrollTop > 0, 'public native track press scrolls');
        assert.equal(pair.astylar.trackHeld.scrollTop,0, 'public candidate track press does not scroll');
      }
      results.push({overflow,dpr,native:pair.reference.scroll,candidate:pair.astylar.scroll,
        trackHeld:overflow==='hidden'?null:{native:pair.reference.trackHeld.scrollTop,candidate:pair.astylar.trackHeld.scrollTop},
        candidateScrollContainerPresent:pair.astylar.scroll!==undefined});
    }
    for(const input of inputs)assert.equal(hash(readFileSync(input.file)),input.sha256);
    t.diagnostic(JSON.stringify({browser:browser.version(),packages,launchEvidence,results,
      installedScrollRuntimeSha256:hash(installed),bundleSha256:hash(built.outputFiles[0].contents),
      installedScrollPaintAdapterSha256:hash(installedPaintAdapter),
      dependencyReceiptSha256:hash(JSON.stringify(inputs)),dependencyCount:inputs.length,
      classification:'equal-input core scrollbar client-area divergence',acceptance:false,
      limitation:'geometry diagnostic only; scrollbar raster, wheel and cross-platform gutter metrics are not accepted by this proof'}));
  }finally{await browser?.close();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});

test('public equal-input text separates fractional origins from texture raster phase', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const font = readFileSync(path.join(consumer, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2'));
  const canvasPath = path.join(consumer, 'node_modules/astylarui/dist/lib/app/services/text/text-canvas-renderer.service.js');
  const installed = readFileSync(canvasPath, 'utf8');
  const compiled = ts.transpileModule(readFileSync('src/app/services/text/text-canvas-renderer.service.ts', 'utf8'),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const paintMethods = source => source.slice(source.indexOf('    createStyledCanvas('), source.indexOf('    calculateLayoutMetrics(')).replace(/\s+/g, ' ').trim();
  assert.ok(paintMethods(installed).length > 1000);
  assert.equal(paintMethods(installed), paintMethods(compiled));
  const baselineMethod = source => source.slice(source.indexOf('    calculateCssLineBoxAlphabeticBaseline('),
    source.indexOf('    applyTextTransform(')).replace(/\s+/g, ' ').trim();
  assert.ok(baselineMethod(installed).length > 300);
  assert.equal(baselineMethod(installed), baselineMethod(compiled));
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    stdin: { resolveDir: consumer, sourcefile: 'equal-input-text-phase.mjs', contents: `
      import '@angular/compiler';
      import {provideZonelessChangeDetection} from '@angular/core';
      import {createApplication} from '@angular/platform-browser';
      import {Astylar} from 'astylarui';
      const mode=new URLSearchParams(location.search).get('mode');
      const loaded=new FontFace('AuditRoboto','url(/font.woff2)',{weight:'400'});await loaded.load();document.fonts.add(loaded);
      const origins=[80,80.25,80.5,80.75];
      const site={root:{children:origins.map((left,i)=>({type:'div',id:'text-'+i,textContent:'Create a project'}))},
        styles:origins.map((left,i)=>({selector:'#text-'+i,display:'block',position:'absolute',left:left+'px',top:(20+i*32)+'px',
          width:'120px',height:'24px',boxSizing:'border-box',padding:'4px 8px',margin:'0',borderWidth:'0',
          fontFamily:'AuditRoboto',fontSize:'12px',fontWeight:'400',fontStyle:'normal',lineHeight:'16px',letterSpacing:'.4px',
          textAlign:'left',whiteSpace:'nowrap',color:'#f5eff4',background:'#323033'}))};
      document.body.style.cssText='margin:0;padding:0';
      const host=document.createElement(mode==='reference'?'div':'canvas');
      host.style.cssText='position:relative;display:block;width:320px;height:180px;margin:0;padding:0';document.body.append(host);
      let app,surface;
      if(mode==='reference'){
        const css=document.createElement('style');css.textContent=site.styles.map(({selector,...values})=>selector+'{'+
          Object.entries(values).map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';')+'}').join('');document.head.append(css);
        for(const element of site.root.children){const node=document.createElement('div');node.id=element.id;node.textContent=element.textContent;host.append(node);}
      }else{app=await createApplication({providers:[provideZonelessChangeDetection()]});surface=app.injector.get(Astylar).mount(host,site,{diagnostics:{logLevel:'silent'}});}
      const settle=async()=>{await surface?.whenSettled();await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
      await settle();window.textPhaseAudit={settle,snapshot(){return {site,resolved:surface?.inspectResolvedStyles()??null,
        errors:surface?.diagnostics.messages.filter(m=>m.severity==='error')??[],rows:origins.map((left,i)=>{
          const id='text-'+i;
          // A hidden diagnostic DOM copy measures the alphabetic baseline;
          // neither the visible reference nor the Astylar document is changed.
          const probe=document.createElement('div');
          for(const [key,value] of Object.entries(site.styles[i]))if(key!=='selector')probe.style[key]=value;
          probe.style.visibility='hidden';probe.textContent='Create a project';
          const marker=document.createElement('span');marker.style.cssText='display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline';
          probe.append(marker);document.body.append(probe);
          const nativeBaseline=marker.getBoundingClientRect().top,probeRange=document.createRange();probeRange.selectNodeContents(probe.firstChild);
          const diagnosticRange=probeRange.getBoundingClientRect().toJSON();probe.remove();
          const directCanvas=document.createElement('canvas');directCanvas.width=320*devicePixelRatio;directCanvas.height=180*devicePixelRatio;
          const direct=directCanvas.getContext('2d');direct.scale(devicePixelRatio,devicePixelRatio);
          direct.font='normal 400 12px AuditRoboto';direct.letterSpacing='.4px';direct.fillStyle='#f5eff4';
          const metrics=direct.measureText('Mg');
          direct.fillText('Create a project',left+8,nativeBaseline);
          const directPixels=direct.getImageData(0,0,directCanvas.width,directCanvas.height).data;
          let directMinX=Infinity,directMaxX=-Infinity,directMinY=Infinity,directMaxY=-Infinity,directCount=0;
          for(let y=0;y<directCanvas.height;y++)for(let x=0;x<directCanvas.width;x++)if(directPixels[(y*directCanvas.width+x)*4+3]===255){
            directCount++;directMinX=Math.min(directMinX,x);directMaxX=Math.max(directMaxX,x);directMinY=Math.min(directMinY,y);directMaxY=Math.max(directMaxY,y);}
          const solidCanvas=document.createElement('canvas');solidCanvas.width=directCanvas.width;solidCanvas.height=directCanvas.height;
          const solid=solidCanvas.getContext('2d',{alpha:false});solid.fillStyle='#323033';solid.fillRect(0,0,solidCanvas.width,solidCanvas.height);
          solid.scale(devicePixelRatio,devicePixelRatio);solid.font=direct.font;solid.letterSpacing=direct.letterSpacing;solid.fillStyle='#f5eff4';
          solid.fillText('Create a project',left+8,nativeBaseline);
          const solidPixels=solid.getImageData(0,0,solidCanvas.width,solidCanvas.height).data;
          let solidCount=0,solidMinX=Infinity,solidMaxX=-Infinity;
          for(let y=0;y<solidCanvas.height;y++)for(let x=0;x<solidCanvas.width;x++){
            const p=(y*solidCanvas.width+x)*4;
            if(solidPixels[p]===245&&solidPixels[p+1]===239&&solidPixels[p+2]===244){solidCount++;solidMinX=Math.min(solidMinX,x);solidMaxX=Math.max(solidMaxX,x);}}
          const crop={left:Math.ceil((left+8)*devicePixelRatio),top:(24+i*32)*devicePixelRatio,
            width:Math.floor((left+112)*devicePixelRatio)-Math.ceil((left+8)*devicePixelRatio),height:16*devicePixelRatio};
          const cropBytes=solid.getImageData(crop.left,crop.top,crop.width,crop.height).data;
          const directEvidence={nativeBaseline,diagnosticRange,fontAscent:metrics.fontBoundingBoxAscent,fontDescent:metrics.fontBoundingBoxDescent,
            opaque:{minX:directCount?directMinX:null,maxX:directCount?directMaxX:null,minY:directCount?directMinY:null,maxY:directCount?directMaxY:null,count:directCount},
            solidBacking:{minX:solidCount?solidMinX:null,maxX:solidCount?solidMaxX:null,count:solidCount,crop:{...crop,rgba:Array.from(cropBytes)}}};
          if(mode==='reference'){const node=document.getElementById(id),range=document.createRange();range.selectNodeContents(node);
            return {id,left,directEvidence,box:node.getBoundingClientRect().toJSON(),textRange:range.getBoundingClientRect().toJSON(),
              style:Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','textAlign'].map(k=>[k,getComputedStyle(node)[k]]))};}
          const scene=surface.scene,engine=scene.getEngine(),camera=scene.activeCamera;
          const mesh=scene.meshes.find(m=>m.metadata?.isTextMesh&&m.metadata?.elementId===id),texture=mesh.material.diffuseTexture;
          const viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());
          const points=mesh.getBoundingInfo().boundingBox.vectorsWorld.map(p=>p.constructor.Project(p,scene.getTransformMatrix().constructor.Identity(),scene.getTransformMatrix(),viewport));
          const size=texture.getSize(),pixels=texture.getContext().getImageData(0,0,size.width,size.height).data;
          let directGlobalAlphaDifferentPixels=0;
          const globalLeft=Math.floor((left+8)*devicePixelRatio),globalTop=(24+i*32)*devicePixelRatio;
          for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
            if(pixels[(y*size.width+x)*4+3]!==directPixels[((globalTop+y)*directCanvas.width+globalLeft+x)*4+3])directGlobalAlphaDifferentPixels++;}
          let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,count=0,inkMinX=Infinity,inkMaxX=-Infinity,inkCount=0;
          for(let y=0;y<size.height;y++)for(let x=0;x<size.width;x++){
            const alpha=pixels[(y*size.width+x)*4+3];
            if(alpha===255){count++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
            if(alpha>=128){inkCount++;inkMinX=Math.min(inkMinX,x);inkMaxX=Math.max(inkMaxX,x);}
          }
          return {id,left,directEvidence,directGlobalAlphaDifferentPixels,texture:{size,logicalSize:texture.metadata.astylarLogicalTextSize,samplingMode:texture.samplingMode,
            opaque:{minX:count?minX:null,maxX:count?maxX:null,minY:count?minY:null,maxY:count?maxY:null,count},ink:{minX:inkMinX,maxX:inkMaxX,count:inkCount}},
            projected:{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y))}};
        })};},dispose(){surface?.dispose();app?.destroy();return surface?.disposed??true;}};
    ` }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022', metafile: true });
  const inputs = Object.keys(built.metafile.inputs).filter(file => !file.endsWith('equal-input-text-phase.mjs'))
    .map(file => ({ file, sha256: hash(readFileSync(file)) }));
  const packages = Object.fromEntries(['@angular/core', '@babylonjs/core', 'astylarui'].map(name =>
    [name, JSON.parse(readFileSync(path.join(consumer, 'node_modules', name, 'package.json'))).version]));
  assert.ok(inputs.some(input => input.file.includes('node_modules/astylarui/')));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file)));
  const server = createServer((req, res) => {
    const script = req.url.startsWith('/audit.js'), isFont = req.url.startsWith('/font.woff2');
    res.setHeader('content-type', script ? 'text/javascript' : isFont ? 'font/woff2' : 'text/html');
    res.end(script ? built.outputFiles[0].contents : isFont ? font : '<!doctype html><script type="module" src="/audit.js"></script>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const results = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const pair = {};
      for (const mode of ['reference', 'astylar']) {
        const page = await browser.newPage({ viewport: { width: 320, height: 180 }, deviceScaleFactor: dpr });
        const errors = []; page.on('pageerror', error => errors.push(String(error)));
        try {
          await page.goto('http://127.0.0.1:' + server.address().port + '/?mode=' + mode);
          await page.waitForFunction(() => !!window.textPhaseAudit); await page.evaluate(() => window.textPhaseAudit.settle());
          pair[mode] = await page.evaluate(() => window.textPhaseAudit.snapshot());
          const image = PNG.sync.read(await page.screenshot({ caret: 'hide' }));
          for (const [i, row] of pair[mode].rows.entries()) {
            const solidCrop = row.directEvidence.solidBacking.crop;
            let differingPixels = 0;
            for (let y = 0; y < solidCrop.height; y++) for (let x = 0; x < solidCrop.width; x++) {
              const full = ((solidCrop.top + y) * image.width + solidCrop.left + x) * 4;
              const local = (y * solidCrop.width + x) * 4;
              if ([0, 1, 2, 3].some(channel => image.data[full + channel] !== solidCrop.rgba[local + channel])) differingPixels++;
            }
            solidCrop.sha256 = hash(Buffer.from(solidCrop.rgba)); delete solidCrop.rgba;
            solidCrop.fullFrameDifferingPixels = differingPixels;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, count = 0, inkMinX = Infinity, inkMaxX = -Infinity, inkCount = 0;
            for (let y = (20 + i * 32) * dpr; y < (44 + i * 32) * dpr; y++) for (let x = 70 * dpr; x < 210 * dpr; x++) {
              const p = (y * image.width + x) * 4;
              if (image.data[p] === 245 && image.data[p + 1] === 239 && image.data[p + 2] === 244) {
                count++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              }
              if (x >= Math.ceil((row.left + 8) * dpr) && x < Math.floor((row.left + 112) * dpr) &&
                  image.data[p] >= 148 && image.data[p + 1] >= 144 && image.data[p + 2] >= 148) {
                inkCount++; inkMinX = Math.min(inkMinX, x); inkMaxX = Math.max(inkMaxX, x);
              }
            }
            assert.ok(inkCount > 0, JSON.stringify({mode,dpr,row,errors,diagnostics:pair[mode].errors}));
            row.fullFrameOpaque = { minX: count ? minX : null, maxX: count ? maxX : null, minY: count ? minY : null, maxY: count ? maxY : null, count };
            row.fullFrameInk = { minX: inkMinX, maxX: inkMaxX, count: inkCount };
          }
          assert.deepEqual(errors, []); assert.deepEqual(pair[mode].errors, []);
          assert.equal(await page.evaluate(() => window.textPhaseAudit.dispose()), true);
        } finally { await page.close(); }
      }
      assert.deepEqual(pair.reference.site, pair.astylar.site);
      results.push({ dpr, reference: pair.reference.rows, candidate: pair.astylar.rows });
      assert.deepEqual(pair.reference.rows.map(row => row.box.x), [80, 80.25, 80.5, 80.75]);
      assert.deepEqual(pair.reference.rows.map(row => row.textRange.x), [88, 88.25, 88.5, 88.75]);
      for (let i = 0; i < 4; i++) {
        const reference = pair.reference.rows[i], candidate = pair.astylar.rows[i];
        assert.deepEqual(reference.directEvidence.diagnosticRange, reference.textRange);
        assert.equal(reference.directEvidence.nativeBaseline, 36 + i * 32);
        assert.ok(Math.abs(candidate.projected.top - (24 + i * 32) * dpr) < .001);
        assert.equal(reference.directEvidence.solidBacking.crop.fullFrameDifferingPixels, 0,
          'opaque canvas at the measured native baseline exactly reproduces the native text content crop');
        assert.ok(candidate.directEvidence.solidBacking.crop.fullFrameDifferingPixels > 0);
        assert.equal(candidate.directEvidence.solidBacking.crop.sha256, reference.directEvidence.solidBacking.crop.sha256);
      }
      for (const row of pair.astylar.rows) {
        const effective = pair.astylar.resolved.elements.find(e => e.id === row.id).effective;
        assert.equal(effective.fontFamily, 'AuditRoboto'); assert.equal(effective.fontSize, '12px');
        assert.equal(effective.fontWeight, '400'); assert.equal(effective.lineHeight, '16px');
        assert.equal(effective.letterSpacing, '.4px'); assert.equal(effective.textAlign, 'left');
        assert.equal(effective.left, row.left + 'px');
        assert.ok(Math.abs(row.projected.left - (row.left + 8) * dpr) < .001);
        assert.equal(row.texture.samplingMode, 1);
      }
      // Record known unequal output rather than turning this diagnostic into an
      // acceptance pass. Raw local raster is unchanged across fractional origins.
      assert.equal(browser.version(), '154.0.8037.58');
      assert.deepEqual(pair.astylar.rows.map(row => row.texture), Array(4).fill(pair.astylar.rows[0].texture));
      assert.deepEqual(pair.astylar.rows.map(row => row.directGlobalAlphaDifferentPixels),
        dpr === 1 ? [0, 497, 507, 548] : [0, 1364, 0, 1364]);
      assert.deepEqual(pair.astylar.rows.map(row => row.fullFrameOpaque.count), Array(4).fill(dpr === 1 ? 0 : 249));
      assert.deepEqual(pair.reference.rows.map(row => row.fullFrameOpaque.count), dpr === 1 ? [7, 9, 9, 11] : [335, 346, 335, 346]);
      if (dpr === 2) {
        assert.deepEqual(pair.reference.rows.map(row => row.fullFrameOpaque.minX), [178, 179, 179, 180]);
        assert.deepEqual(pair.astylar.rows.map(row => row.fullFrameOpaque.minX), [178, 178, 179, 179]);
      }
    }
    for (const input of inputs) assert.equal(hash(readFileSync(input.file)), input.sha256);
    t.diagnostic(JSON.stringify({ browser: browser.version(), packages, results, fontSha256: hash(font),
      installedCanvasPaintSha256: hash(installed), bundleSha256: hash(built.outputFiles[0].contents),
      dependencyCount: inputs.length, dependencyReceiptSha256: hash(JSON.stringify(inputs)), acceptance: false,
      classification: 'equal-input core text paint difference with unchanged local texture across fractional origins',
      limitation: 'opaque canvas exactly matches eight native content crops; renderer still differs, with backing and phase effects separate; not general sharpness or full audit acceptance' }));
  } finally { await browser?.close(); await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

function rasterDifference(firstBytes, secondBytes, exactForeground) {
  const first = PNG.sync.read(firstBytes), second = PNG.sync.read(secondBytes);
  assert.equal(first.width, second.width);
  assert.equal(first.height, second.height);
  let count = 0, minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const colors = new Set();
  for (let y = 0; y < first.height; y++) for (let x = 0; x < first.width; x++) {
    const i = (y * first.width + x) * 4;
    // Opt-in caret-color isolation excludes removed placeholder glyphs and the
    // native focus outline. Other evidence retains the original full delta.
    if (exactForeground && exactForeground.some((value, channel) => first.data[i + channel] !== value)) continue;
    if (first.data[i] === second.data[i] && first.data[i + 1] === second.data[i + 1] &&
        first.data[i + 2] === second.data[i + 2]) continue;
    count++; minX = Math.min(minX, x); minY = Math.min(minY, y);
    maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    colors.add([first.data[i], first.data[i + 1], first.data[i + 2]].join(','));
  }
  return { count, bounds: count ? { minX, minY, maxX, maxY } : null, colors: [...colors].sort() };
}

test('retained input boundaries authenticate all runtime assets, trees, actions and local rasters', () => {
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance, script: 'scripts/audit-material-input-boundaries.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  const expected = ['initial', 'keyboard-focus', 'pointer-focus', 'focused-empty-0', 'focused-empty-1',
    'focused-empty-2', 'focused-empty-3', 'typed', 'selection-forward', 'selection-backward', 'blur'];
  assert.equal(report.results.length, 110);
  for (const family of ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker']) for (const dpr of [1, 2]) {
    const rows = report.results.filter(r => r.family === family && r.viewport.deviceScaleFactor === dpr);
    assert.deepEqual(rows.map(r => r.state), expected);
    for (const row of rows) {
      assert.equal(row.profile, 'light');
      assert.deepEqual(row.viewport, { width: 1440, height: 900, deviceScaleFactor: dpr });
      for (const side of ['reference', 'astylar']) {
        const sample = row[side];
        assert.equal(hash(readFileSync(sample.screenshot.file)), sample.screenshot.sha256);
        assert.ok(sample.screenshot.clip.width > 0 && sample.screenshot.clip.height > 0);
        assert.ok(sample.observation.events.every(e => e.trusted));
        if (row.state.startsWith('focused-empty')) {
          assert.equal(sample.observation.control.value, '');
          assert.equal(sample.observation.control.focused, true);
        }
      }
      if (row.state === 'typed') assert.equal(row.reference.observation.control.value, row.astylar.observation.control.value);
    }
  }
  assert.equal(report.inputEquivalent, false);
  assert.equal(report.renderingEquivalent, false);
});

test('historical keyboard evidence retains selection mismatch and native email observability limits', () => {
  for (const dpr of [1, 2]) {
    const get = (family, state) => report.results.find(r => r.family === family && r.state === state && r.viewport.deviceScaleFactor === dpr);
    for (const family of ['form-field', 'autocomplete', 'datepicker']) {
      const forward = get(family, 'selection-forward'), backward = get(family, 'selection-backward');
      const pair = c => [c.selectionStart, c.selectionEnd];
      assert.deepEqual(pair(forward.reference.observation.control), [0, 3]);
      assert.deepEqual(pair(forward.astylar.observation.control), [0, 3]);
      const native = backward.reference.observation.control;
      assert.deepEqual(pair(native), [native.value.length - 3, native.value.length]);
      assert.deepEqual(pair(backward.astylar.observation.control), [0, 3]);
      assert.equal(backward.astylar.observation.control.cursorPosition, 0);
      for (const side of ['reference', 'astylar']) assert.ok(backward[side].observation.events.some(e => e.type === 'keydown' && e.key === 'End'));
    }
    const tab = get('form-field', 'keyboard-focus');
    assert.deepEqual([tab.reference.observation.control.selectionStart, tab.reference.observation.control.selectionEnd], [0, 5]);
    assert.deepEqual([tab.astylar.observation.control.selectionStart, tab.astylar.observation.control.selectionEnd], [0, 0]);
    for (const state of ['selection-forward', 'selection-backward']) {
      const native = get('input', state).reference.observation.control;
      assert.equal(native.type, 'email');
      assert.equal(native.selectionStart, null); assert.equal(native.selectionEnd, null);
      assert.equal(native.selectionDirection, null);
    }
  }
});

test('public button pointer states diagnose materials outside render ownership', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const methods = [['src/lib/astylar.ts','lib/astylar.js','applyElementPseudoState'],
    ['src/lib/astylar.ts','lib/astylar.js','setButtonLabelPseudoMaterial'],
    ['src/lib/astylar-scene-resources.ts','lib/astylar-scene-resources.js','replace'],
    ['src/app/services/dom/elements/element-interaction.service.ts','app/services/dom/elements/element-interaction.service.js','setupMouseEvents'],
    ['src/app/services/dom/elements/element-interaction.service.ts','app/services/dom/elements/element-interaction.service.js','applyElementMaterial'],
    ['src/app/services/babylon-mesh.service.ts','app/services/babylon-mesh.service.js','createMaterial']].map(([sourceFile, relative, method]) => {
    const installedFile = path.join(consumer, 'node_modules/astylarui/dist/lib', relative);
    const source = readFileSync(sourceFile, 'utf8'), installed = readFileSync(installedFile, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const extract = code => {
      const ast = ts.createSourceFile('method.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
      assert.equal(ast.parseDiagnostics.length, 0);
      const visit = n => { if (ts.isMethodDeclaration(n) && n.name.getText(ast) === method) matches.push(n.getText(ast).replace(/\s+/g, ' ').trim()); ts.forEachChild(n, visit); };
      visit(ast); assert.equal(matches.length, 1); return matches[0];
    };
    assert.equal(extract(installed), extract(compiled));
    return { method, sourceFile, sourceSha256: hash(source), installedFile, installedSha256: hash(installed) };
  });
  const applicationSource = `import '@angular/compiler';
  import {provideZonelessChangeDetection} from '@angular/core';
  import {createApplication} from '@angular/platform-browser';
  import {Astylar} from 'astylarui';
  document.body.style.cssText='margin:0';
  const outside=document.createElement('button');outside.id='outside';outside.textContent='Outside';document.body.append(outside);
  const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:390px;height:160px';document.body.append(canvas);
  const app=await createApplication({providers:[provideZonelessChangeDetection()]});
  const site=present=>({root:{children:present?[{type:'button',id:'probe',value:'Probe',ariaLabel:'Probe'}]:[]},styles:[
  {selector:'#probe',position:'absolute',left:'20px',top:'20px',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#dddddd',color:'#222222',fontFamily:'Arial',fontSize:'14px'},
  {selector:'#probe:hover',background:'#cccccc'},{selector:'#probe:focus',background:'#bbbbbb'},{selector:'#probe:active',background:'#aaaaaa'}]});
  const clicks=[];const surface=app.injector.get(Astylar).mount(canvas,site(true),{diagnostics:{logLevel:'silent'},events:{handlers:{probe:{click:e=>clicks.push(e.targetId)}}}});
  const scene=surface.scene;const settle=async()=>{await document.fonts.ready;await surface.whenSettled();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
  const snapshot=()=>({tracked:surface.diagnostics.resources,live:{meshes:scene.meshes.length,materials:scene.materials.length,textures:scene.textures.length},materials:scene.materials.map(m=>({id:m.uniqueId,name:m.name,bound:scene.meshes.some(mesh=>mesh.material===m)})),focus:document.activeElement?.getAttribute('data-astylar-id')??document.activeElement?.id,clicks:[...clicks],diagnostics:surface.diagnostics.messages});
  await settle();window.pseudoAudit={settle,snapshot,point(){const c=canvas.getBoundingClientRect();return{x:c.x+80,y:c.y+40};},async update(present){await surface.update(site(present));await settle();return snapshot();},dispose(){surface.dispose();app.destroy();return snapshot();}};`;
  const esbuild = createRequire(path.join(consumer, 'package.json'))('esbuild');
  const built = await esbuild.build({ absWorkingDir: process.cwd(), stdin: { resolveDir: consumer, sourcefile: 'public-pseudo-ownership.mjs', contents: applicationSource }, bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022' });
  const diskFiles = Object.keys(built.metafile.inputs).filter(file => existsSync(path.resolve(file))).sort();
  const virtualFiles = Object.keys(built.metafile.inputs).filter(file => !existsSync(path.resolve(file)));
  assert.equal(virtualFiles.length, 1); assert.ok(virtualFiles[0].endsWith('public-pseudo-ownership.mjs'));
  const inputs = diskFiles.map(file => ({ file, sha256: hash(readFileSync(path.resolve(file))) }));
  assert.ok(!inputs.some(i => i.file.includes('material-showcase/src') || /^src[\\/]/.test(i.file)));
  const server = createServer((req, res) => { const script = req.url === '/audit.js'; res.setHeader('content-type', script ? 'text/javascript' : 'text/html'); res.end(script ? built.outputFiles[0].contents : '<!doctype html><script type="module" src="/audit.js"></script>'); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const start = performance.now(), results = []; let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 390, height: 400 }, deviceScaleFactor: dpr }), errors = [];
      page.on('pageerror', e => errors.push(String(e)));
      try {
        await page.goto('http://127.0.0.1:' + server.address().port); await page.waitForFunction(() => !!window.pseudoAudit);
        const samples = [], sample = async label => { await page.evaluate(() => window.pseudoAudit.settle()); const s = await page.evaluate(() => window.pseudoAudit.snapshot()); samples.push({ label, ...s }); return s; };
        await sample('mount');
        for (let i = 0; i < 3; i++) { await page.evaluate(() => window.pseudoAudit.update(false)); await sample('no-interaction-removed-' + i); await page.evaluate(() => window.pseudoAudit.update(true)); }
        for (let i = 0; i < 3; i++) {
          const p = await page.evaluate(() => window.pseudoAudit.point()); await page.mouse.move(p.x, p.y); await sample('hover-' + i);
          await page.mouse.down(); await sample('held-' + i); await page.mouse.up(); await sample('clicked-' + i);
          await page.locator('#outside').click(); await sample('blur-' + i);
          await page.evaluate(() => window.pseudoAudit.update(false)); await sample('removed-' + i); await page.evaluate(() => window.pseudoAudit.update(true));
        }
        const disposed = await page.evaluate(() => window.pseudoAudit.dispose());
        t.diagnostic(JSON.stringify({ dpr, samples, disposed, errors }));
        assert.deepEqual(errors, []);
        for (const s of samples.filter(s => s.label.startsWith('no-interaction-removed'))) assert.deepEqual(s.live, s.tracked);
        const removed = samples.filter(s => s.label.startsWith('removed'));
        assert.deepEqual(removed.map(s => s.live.materials - s.tracked.materials), [5, 10, 15]);
        for (const [cycle, s] of removed.entries()) {
          assert.equal(s.live.meshes, s.tracked.meshes);
          assert.equal(s.live.textures, s.tracked.textures);
          assert.equal(s.materials.filter(m => !m.bound).length, 5 * (cycle + 1));
          assert.deepEqual(s.clicks, Array(cycle + 1).fill('probe'));
          assert.deepEqual(s.diagnostics, []);
        }
        assert.deepEqual(disposed.live, { meshes: 0, materials: 0, textures: 0 });
        assert.deepEqual(disposed.tracked, disposed.live);
        results.push({ dpr, samples, disposed, errors });
      } finally { await page.close(); }
    }
    for (const i of inputs) assert.equal(hash(readFileSync(path.resolve(i.file))), i.sha256);
    t.diagnostic(JSON.stringify({ browser: browser.version(), applicationSource, applicationSha256: hash(applicationSource), methods,
      bundleSha256: hash(built.outputFiles[0].contents), dependencyCount: inputs.length, dependencyReceipt: hash(JSON.stringify(inputs)), results,
      elapsedMs: performance.now() - start, scope: 'Plugin-free public button pointer pseudo-state lifecycle at DPR1/2; owning methods match current source. Diagnostic counterexample, not lifecycle or equal-rendering acceptance.', acceptance: false }));
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }

});

test('public delayed font load settles initial render and invalidates only live owners', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const fontFile = path.join(consumer, 'node_modules/@fontsource/roboto/files/roboto-latin-400-normal.woff2');
  const fontBytes = readFileSync(fontFile);
  const applicationSource = `
import '@angular/compiler';
import {provideZonelessChangeDetection} from '@angular/core';
import {createApplication} from '@angular/platform-browser';
import {Astylar} from 'astylarui';
const app=await createApplication({providers:[provideZonelessChangeDetection()]});
let surface, peer, fontPromise, initialSettled=false, beforeTextures=[];
const retired=[];
const events=[];
document.fonts.addEventListener('loadingdone',()=>events.push('loadingdone'));
const ownerSnapshot=s=>({revision:s.diagnostics.session?.revision,status:s.diagnostics.session?.status,
 disposed:s.disposed,resources:s.diagnostics.resources,messages:s.diagnostics.messages,
 textureIds:s.scene.textures.map(t=>t.uniqueId),
 liveResources:{meshes:s.scene.meshes.length,materials:s.scene.materials.length,textures:s.scene.textures.length}});
const snapshot=()=>({revision:surface?.diagnostics.session?.revision,status:surface?.diagnostics.session?.status,
 disposed:surface?.disposed,resources:surface?.diagnostics.resources,messages:surface?.diagnostics.messages,
 initialSettled,fontStatus:document.fonts.status,events:[...events],
 textureIds:surface?.scene.textures.map(t=>t.uniqueId),
 liveResources:surface?{meshes:surface.scene.meshes.length,materials:surface.scene.materials.length,textures:surface.scene.textures.length}:null,
 oldTexturesRemaining:beforeTextures.filter(t=>surface.scene.textures.includes(t)).length,
 peer:peer?ownerSnapshot(peer):null,retired:retired.map(ownerSnapshot),
 separateScenes:peer?peer.scene!==surface.scene:null});
const startFont=()=>{const face=new FontFace('AuditDelayed','url(/delayed.woff2)');document.fonts.add(face);
 fontPromise=document.fonts.load('16px AuditDelayed','Above');return snapshot();};
const mountSurface=()=>{
 const canvas=document.createElement('canvas');canvas.style.cssText='width:390px;height:180px';document.body.append(canvas);
 return app.injector.get(Astylar).mount(canvas,{root:{children:[{type:'p',id:'text',textContent:'Above'}]},
 styles:[{selector:'#text',fontFamily:'AuditDelayed,Arial',fontSize:'16px',margin:'0',padding:'0'}]},
 {diagnostics:{logLevel:'silent'}});};
window.fontAudit={snapshot,startFont,async mount(initial){
 if(initial)startFont();surface=mountSurface();
 surface.whenSettled().then(()=>initialSettled=true);return snapshot();},
 async addPeer(){peer=mountSurface();await peer.whenSettled();return snapshot();},
 remount(){surface.dispose();retired.push(surface);initialSettled=false;surface=mountSurface();
 surface.whenSettled().then(()=>initialSettled=true);return snapshot();},
 async settle(){await fontPromise;await document.fonts.ready;if(!surface.disposed)await surface.whenSettled();
 if(peer&&!peer.disposed)await peer.whenSettled();
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));if(!surface.disposed)await surface.whenSettled();return snapshot();},
 remember(){beforeTextures=[...surface.scene.textures];return snapshot();},
 dispose(){surface.dispose();return snapshot();},destroy(){surface.dispose();peer?.dispose();app.destroy();return snapshot();}};
`;
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    absWorkingDir: process.cwd(), stdin: {resolveDir: consumer, sourcefile: 'public-font-lifetime.mjs', contents: applicationSource},
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022'});
  const inputs = Object.keys(built.metafile.inputs).filter(file => existsSync(path.resolve(file)))
    .sort().map(file => ({file, sha256: hash(readFileSync(path.resolve(file)))}));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file)));
  const server = createServer((req,res) => { const script=req.url==='/audit.js';
    res.setHeader('content-type',script?'text/javascript':'text/html');
    res.end(script?built.outputFiles[0].contents:'<!doctype html><script type="module" src="/audit.js"></script>'); });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  let browser;
  const results=[];
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const cohort of ['initial','later','disposed-later','remount-peer']) {
      const page=await browser.newPage({viewport:{width:800,height:600}});
      let release;
      const held=new Promise(resolve=>release=resolve), errors=[];
      page.on('pageerror',error=>errors.push(String(error)));
      await page.route('**/delayed.woff2',async route=>{await held;await route.fulfill({body:fontBytes,contentType:'font/woff2'});});
      try {
        await page.goto('http://127.0.0.1:'+server.address().port);
        await page.waitForFunction(()=>!!window.fontAudit);
        await page.evaluate(initial=>window.fontAudit.mount(initial),cohort==='initial');
        if(cohort!=='initial') {
          await page.evaluate(()=>window.fontAudit.settle());
          if(cohort==='remount-peer')await page.evaluate(()=>window.fontAudit.addPeer());
          await page.evaluate(()=>window.fontAudit.remember());
          await page.evaluate(()=>window.fontAudit.startFont());
        }
        await page.waitForFunction(()=>document.fonts.status==='loading');
        const heldState=await page.evaluate(()=>window.fontAudit.snapshot());
        assert.equal(heldState.revision,cohort==='initial'?0:1);
        if(cohort==='initial') assert.equal(heldState.initialSettled,false);
        const disposed=cohort==='disposed-later'?await page.evaluate(()=>window.fontAudit.dispose()):null;
        const remounted=cohort==='remount-peer'?await page.evaluate(()=>window.fontAudit.remount()):null;
        if(remounted) {
          assert.equal(remounted.revision,0);
          assert.equal(remounted.initialSettled,false);
          assert.equal(remounted.separateScenes,true);
          assert.deepEqual(remounted.peer,heldState.peer,'disposing/remounting must leave the live peer unchanged while loading');
          assert.equal(remounted.retired[0].disposed,true);
          assert.deepEqual(remounted.retired[0].resources,{meshes:0,materials:0,textures:0});
        }
        release();
        const settled=await page.evaluate(()=>window.fontAudit.settle());
        assert.ok(settled.events.includes('loadingdone'));
        assert.deepEqual(settled.messages,[]);
        if(disposed) {
          assert.equal(settled.disposed,true);
          assert.equal(settled.revision,disposed.revision);
          assert.deepEqual(settled.resources,{meshes:0,materials:0,textures:0});
          assert.deepEqual(settled.textureIds,[]);
        } else {
          assert.equal(settled.revision,cohort==='initial'||remounted?1:2);
          assert.equal(settled.initialSettled,true);
          if(cohort==='later') {assert.ok(heldState.textureIds.length>0);assert.equal(settled.oldTexturesRemaining,0);}
        }
        if(remounted) {
          assert.equal(settled.peer.revision,2,'global font completion must invalidate the live peer too');
          assert.equal(settled.peer.disposed,false);
          assert.deepEqual(settled.retired,remounted.retired,'late completion must not rebuild the retired owner');
          assert.deepEqual(settled.peer.messages,[]);
          assert.notDeepEqual(settled.peer.textureIds,heldState.peer.textureIds);
        }
        assert.deepEqual(errors,[]);
        const cleanup=await page.evaluate(()=>window.fontAudit.destroy());
        for(const owner of [cleanup,...cleanup.retired,...(cleanup.peer?[cleanup.peer]:[])]) {
          assert.equal(owner.disposed,true);
          assert.deepEqual(owner.resources,{meshes:0,materials:0,textures:0});
          assert.deepEqual(owner.liveResources,{meshes:0,materials:0,textures:0});
          assert.deepEqual(owner.textureIds,[]);
        }
        results.push({cohort,heldState,disposed,remounted,settled,cleanup});
      } finally {release();await page.close();}
    }
    for(const input of inputs) assert.equal(hash(readFileSync(path.resolve(input.file))),input.sha256);
    assert.equal(hash(readFileSync(fontFile)),hash(fontBytes));
    t.diagnostic(JSON.stringify({browser:browser.version(),applicationSource,fontFile,fontSha256:hash(fontBytes),
      bundleSha256:hash(built.outputFiles[0].contents),dependencyCount:inputs.length,dependencyReceipt:hash(JSON.stringify(inputs)),results,
      scope:'Installed public real-browser font lifecycle including pending remount and live peer, DPR1; current owner source applicability requires the existing library census. Not historical font timing, repeated-remount plateau, all Material cases, raster parity or current Angular unit-suite acceptance.'}));
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
});

test('public same-document surfaces isolate modal focus and independent disposal', async t => {
  const consumer = path.resolve('examples/material-showcase');
  const methods = [
    ['astylar-semantic-bridge', 'applyModalInertnessFor'],
    ['astylar-semantic-bridge', 'semanticEventElementId'],
    ['astylar-interaction-runtime', 'moveFocus'],
    ['astylar-interaction-runtime', 'isAllowedByModal'],
  ].map(([module, method]) => {
    const sourceFile = 'src/lib/' + module + '.ts';
    const installedFile = path.join(consumer, 'node_modules/astylarui/dist/lib/lib', module + '.js');
    const source = readFileSync(sourceFile, 'utf8'), installed = readFileSync(installedFile, 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const extract = code => {
      const ast = ts.createSourceFile('method.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), matches = [];
      assert.equal(ast.parseDiagnostics.length, 0);
      const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(ast) === method) matches.push(node.getText(ast).replace(/\s+/g, ' ').trim()); ts.forEachChild(node, visit); };
      visit(ast); assert.equal(matches.length, 1); return matches[0];
    };
    assert.equal(extract(installed), extract(compiled));
    return { sourceFile, sourceSha256: hash(source), installedFile, installedSha256: hash(installed), method };
  });
  const applicationSource = "\nimport '@angular/compiler';\nimport {provideZonelessChangeDetection} from '@angular/core';\nimport {createApplication} from '@angular/platform-browser';\nimport {Astylar} from 'astylarui';\ndocument.body.style.cssText='margin:0';\nconst select=document.createElement('select');select.id='outside';select.innerHTML='<option>One</option><option>Two</option>';document.body.append(select);\nconst app=await createApplication({providers:[provideZonelessChangeDetection()]});\nconst handles=[],hosts=[];\nconst site=(modal,peer=false)=>({root:{children:[{type:'button',id:'background',value:peer?'Peer':'Trigger'},...(!peer?[{type:'dialog',id:'modal',open:modal,modal:true,children:[{type:'button',id:'action',value:'Continue',autofocus:true},{type:'button',id:'cancel',value:'Cancel'}]}]:[])]},styles:[\n{selector:'#background',position:'absolute',left:'20px',top:'20px',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#eeeeee',fontFamily:'Arial',fontSize:'14px'},\n{selector:'#modal',position:'absolute',left:'10px',top:'70px',width:'280px',height:'90px',padding:'0',borderWidth:'0',background:'#ffffff',display:'flex'},\n{selector:'#action,#cancel',width:'120px',height:'40px',padding:'0',borderWidth:'0',background:'#eeeeee',fontFamily:'Arial',fontSize:'14px'}]});\nfor(let i=0;i<2;i++){const host=document.createElement('section');host.id='surface-'+i;document.body.append(host);hosts.push(host);const canvas=document.createElement('canvas');canvas.style.cssText='display:block;width:390px;height:180px';host.append(canvas);handles.push(app.injector.get(Astylar).mount(canvas,site(false,i===1),{diagnostics:{logLevel:'silent'}}));}\nconst settle=async()=>{await document.fonts.ready;await Promise.all(handles.filter(s=>!s.disposed).map(s=>s.whenSettled()));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};\nconst snapshot=()=>({active:document.activeElement?.getAttribute('data-astylar-id')??document.activeElement?.id,activeHost:document.activeElement?.closest('section')?.id??null,\noutsideInert:select.inert,surfaces:handles.map((s,i)=>({disposed:s.disposed,modalOpen:hosts[i].querySelector('[data-astylar-id=\"modal\"]')?.open??false,backgroundInert:hosts[i].querySelector('[data-astylar-id=\"background\"]')?.inert??null,\nsemanticRoots:hosts[i].querySelectorAll('[data-astylar-semantic-root]').length,resources:s.diagnostics.resources,messages:s.diagnostics.messages})),nativeIds:[...document.querySelectorAll('[data-astylar-id=\"background\"]')].map(n=>n.id)});\nawait settle();window.isolationAudit={settle,snapshot,async open(){await handles[0].update(site(true));await settle();},disposeFirst(){handles[0].dispose();},dispose(){handles.filter(s=>!s.disposed).forEach(s=>s.dispose());app.destroy();return snapshot();}};\n";
  const built = await createRequire(path.join(consumer, 'package.json'))('esbuild').build({
    absWorkingDir: process.cwd(), stdin: { resolveDir: consumer, sourcefile: 'public-modal-isolation.mjs', contents: applicationSource },
    bundle: true, write: false, metafile: true, format: 'esm', platform: 'browser', target: 'es2022' });
  const diskFiles = Object.keys(built.metafile.inputs).filter(file => existsSync(path.resolve(file))).sort();
  const virtualFiles = Object.keys(built.metafile.inputs).filter(file => !existsSync(path.resolve(file)));
  assert.deepEqual(virtualFiles, [path.relative(process.cwd(), path.join(consumer, 'public-modal-isolation.mjs')).replaceAll('\\', '/')]);
  const inputs = diskFiles.map(file => ({ file, sha256: hash(readFileSync(path.resolve(file))) }));
  assert.ok(!inputs.some(input => /^src[\\/]/.test(input.file) || input.file.includes('material-showcase/src')));
  const server = createServer((req, res) => { const script = req.url === '/audit.js';
    res.setHeader('content-type', script ? 'text/javascript' : 'text/html');
    res.end(script ? built.outputFiles[0].contents : '<!doctype html><script type="module" src="/audit.js"></script>'); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser; const results = [], started = performance.now();
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: dpr });
      const errors = []; page.on('pageerror', error => errors.push(String(error)));
      try {
        await page.goto('http://127.0.0.1:' + server.address().port);
        await page.waitForFunction(() => !!window.isolationAudit);
        const samples = [], sample = async label => { await page.evaluate(() => window.isolationAudit.settle());
          const state = await page.evaluate(() => window.isolationAudit.snapshot()); samples.push({ label, ...state });
          assert.equal(state.outsideInert, false);
          for (const surface of state.surfaces) assert.deepEqual(surface.messages, []);
          return state; };
        const mounted = await sample('mounted');
        assert.equal(new Set(mounted.nativeIds).size, 2, 'equal authored IDs must have isolated native IDs');
        await page.evaluate(() => window.isolationAudit.open()); const opened = await sample('modal-open');
        assert.equal(opened.active, 'action'); assert.equal(opened.activeHost, 'surface-0');
        assert.equal(opened.surfaces[0].backgroundInert, true); assert.equal(opened.surfaces[1].backgroundInert, false);
        await page.keyboard.press('Tab'); assert.equal((await sample('modal-tab')).active, 'cancel');
        const peerPoint = await page.locator('#surface-1 canvas').evaluate(canvas => { const box = canvas.getBoundingClientRect(); return { x: box.x + 80, y: box.y + 40 }; });
        await page.mouse.click(peerPoint.x, peerPoint.y); const peer = await sample('peer-pointer');
        assert.equal(peer.activeHost, 'surface-1'); assert.equal(peer.active, 'background');
        await page.keyboard.press('Escape'); const escaped = await sample('peer-escape');
        assert.equal(escaped.surfaces[0].modalOpen, true, 'peer Escape must not dismiss another surface modal');
        await page.locator('#outside').selectOption({ index: 1 }); await page.locator('#outside').focus();
        assert.equal((await sample('outside-selector')).active, 'outside');
        await page.evaluate(() => window.isolationAudit.disposeFirst()); const removed = await sample('first-disposed');
        assert.equal(removed.surfaces[0].semanticRoots, 0);
        assert.deepEqual(removed.surfaces[0].resources, { meshes: 0, materials: 0, textures: 0 });
        assert.deepEqual(removed.surfaces[1], mounted.surfaces[1]);
        await page.mouse.click(peerPoint.x, peerPoint.y); const survived = await sample('surviving-peer');
        assert.equal(survived.activeHost, 'surface-1'); assert.equal(survived.active, 'background');
        const disposed = await page.evaluate(() => window.isolationAudit.dispose());
        assert.deepEqual(disposed.nativeIds, []);
        for (const surface of disposed.surfaces) { assert.equal(surface.disposed, true); assert.equal(surface.semanticRoots, 0);
          assert.deepEqual(surface.resources, { meshes: 0, materials: 0, textures: 0 }); assert.deepEqual(surface.messages, []); }
        assert.deepEqual(errors, []); results.push({ dpr, samples, disposed, errors });
      } finally { await page.close(); }
    }
    for (const input of inputs) assert.equal(hash(readFileSync(path.resolve(input.file))), input.sha256);
    t.diagnostic(JSON.stringify({ browser: browser.version(), applicationSource, methods,
      bundleSha256: hash(built.outputFiles[0].contents), dependencyCount: inputs.length, dependencyReceipt: hash(JSON.stringify(inputs)),
      results, elapsedMs: performance.now() - started,
      scope: 'Public same-document modal isolation DPR1/2; not Material input equivalence, equal-rendering acceptance, focus restoration, late async work or all profiles.' }));
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
});

test('public role focus refresh separates attribute-first and root-first failures with unchanged input', t => {
  const proposal = '3ccb3f7bd6ff9075976037b8408e4a03adfc03113c27a3ed049a4bd0740af2fe';
  const queued = JSON.parse(readFileSync(`artifacts/material-parity/working-audit/proposals/${proposal}.json`));
  assert.equal(queued.sha256, proposal); assert.equal(hash(JSON.stringify(queued.review)), proposal);
  const id = 'core-semantic-attribute-refresh-removes-focusability';
  const finding = queued.review.groups.at(-1);
  assert.equal(finding.id, id); assert.equal(finding.classification, 'confirmed-core-renderer-defect');
  assert.deepEqual(sourceAuditDefinitions.filter(row => row.id !== id), queued.review.groups.slice(0, -1));
  const registered = sourceAuditDefinitions.find(row => row.id === id);
  if (registered) {
    const { focusedProof, ...definition } = registered;
    assert.deepEqual(definition, finding);
    assert.equal(focusedProof, 'tests/material-parity/input-boundary-evidence.spec.mjs: public role focus refresh separates attribute-first and root-first failures with unchanged input');
  }
  assert.equal([...readFileSync(finding.file, 'utf8').matchAll(new RegExp(finding.pattern, 'g'))].length, 1);
  for (const receipt of finding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  const directory = 'artifacts/material-parity/public-role-focus-refresh-20261017';
  const verification = JSON.parse(execFileSync(process.execPath,
    ['scripts/audit-public-role-focus-refresh.mjs', '--verify', directory], { encoding: 'utf8' }));
  assert.deepEqual(verification, { pairs: 8, nativeNoopControls: 16,
    candidateAttributeFirstFailures: 8, candidateRootFirstFailures: 8,
    currentRenderingAccepted: false, negativeControlsRejected: 3 });
  const owner = JSON.parse(readFileSync('artifacts/material-parity/public-role-focus-refresh-owner-20261017.log'));
  assert.deepEqual(owner.methods.map(row => row.name), ['applyAttributes', 'reconcile', 'reconcileElement', 'syncFocus']);
  for (const receipt of [...owner.sources, ...owner.versions]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(owner.attributeStacks, 8); assert.equal(owner.rootStacks, 8);
  const report = JSON.parse(readFileSync(`${directory}/latest-report.json`));
  assert.equal(hash(readFileSync(owner.report.file)), owner.report.sha256);
  let attributeFirst = 0, rootFirst = 0;
  for (const row of report.results) for (const update of row.astylar.updates) {
    const first = update.operations.find(operation => operation.before && !operation.after);
    assert.ok(first); assert.equal(first.connected, true);
    assert.equal(update.sameNode, true); assert.equal(update.focused, true);
    if (['div', 'span'].includes(row.controlKind)) {
      assert.equal(first.operation, 'removeAttribute'); assert.equal(first.attribute, 'tabindex');
      assert.match(first.stack, /applyAttributes/); attributeFirst++;
    } else {
      assert.equal(first.operation, 'replaceChildren'); assert.match(first.stack, /reconcile/); rootFirst++;
    }
  }
  assert.equal(attributeFirst, 8); assert.equal(rootFirst, 8);
  const authoredSource = readFileSync(report.inputSource.file, 'utf8');
  assert.match(authoredSource, /from 'astylarui'/);
  assert.doesNotMatch(authoredSource, /astylarui\/dist|material-showcase\/src/);
  t.diagnostic(JSON.stringify({ ...verification, currentOwnerFiles: owner.sources.length,
    registered: !!registered, wholeCaseAccepted: false,
    boundary: 'Public no-op focus continuity and exact first-loss owner only; not every Material trace,selection,AT or paint.' }));
});

test('public readonly keyboard mutation preserves equal inputs and binds current default owners', t => {
  const directory = 'artifacts/material-parity/public-readonly-editing-recovered-20261020';
  const reportBytes = readFileSync(`${directory}/latest-report.json`);
  assert.equal(hash(reportBytes), '8a54156092f7f25fd64c546175ce5e7682636966c794f893209d1b10c5baedb0');
  const result = JSON.parse(execFileSync(process.execPath,
    ['scripts/audit-public-readonly-editing.mjs', '--verify', directory], { encoding: 'utf8' }));
  assert.deepEqual(result, { pairs: 6, readonlyFailingPairs: 2, writableControls: 4,
    disabledControls: 4, currentRenderingAccepted: false, negativeControlsRejected: 6 });
  const report = JSON.parse(reportBytes);
  assert.match(readFileSync(report.source.file, 'utf8'), /from 'astylarui'/);
  assert.ok(!report.inputs.some(r => /material-showcase\/src|astylarui\/dist\/lib\/plugins\/material/.test(r.file)));
  for (const row of report.results) {
    assert.equal(row.inputUnchanged, true);
    assert.deepEqual(row.diagnostics, []);
    assert.deepEqual(row.samples.map(s => s.boundary), ['focused-home', 'typed-x', 'delete', 'backspace']);
    if (row.kind === 'readonly') {
      for (const sample of row.samples) { assert.equal(sample.readonly, true); assert.equal(sample.focused, true); }
      assert.deepEqual(row.samples.map(s => s.value), row.mode === 'reference'
        ? ['Atlas', 'Atlas', 'Atlas', 'Atlas'] : ['Atlas', 'xAtlas', 'xtlas', 'tlas']);
    }
  }
  const ownerBytes = readFileSync('artifacts/material-parity/public-readonly-owning-methods-20261020.log');
  assert.equal(hash(ownerBytes), '4d4dd8440ab6c2a3c9c357b24fa6f6d00110f67b288284a86466b8d73500b81a');
  const owner = JSON.parse(ownerBytes);
  assert.equal(owner.report.sha256, hash(reportBytes));
  assert.deepEqual(owner.methods.map(r => r.method), ['handleKeyboardEvent', 'handleTextInput',
    'handleFocusedKeyDown', 'handleKeyboardInput', 'insertTextAtCursor', 'deleteCharacter']);
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  const body = (source, name) => {
    const tree = ts.createSourceFile('owner.js', source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    const found = [];
    const visit = node => {
      if (ts.isMethodDeclaration(node) && node.name.getText(tree) === name) found.push(node);
      ts.forEachChild(node, visit);
    };
    visit(tree); assert.equal(found.length, 1);
    return printer.printNode(ts.EmitHint.Unspecified, found[0].body, tree);
  };
  for (const row of owner.methods) {
    for (const receipt of [row.source, row.installed]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
    const compiled = ts.transpileModule(readFileSync(row.source.file, 'utf8'), { compilerOptions: {
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, experimentalDecorators: true,
    } }).outputText;
    const actual = body(compiled, row.method), installed = body(readFileSync(row.installed.file, 'utf8'), row.method);
    assert.equal(actual, installed, `Complete owner body differs: ${row.method}`);
    assert.equal(row.completeBodyEqual, true);
  }
  t.diagnostic(JSON.stringify({ ...result, completeCurrentOwnerBodies: 6,
    boundary: 'Readonly typing/Delete/Backspace only. Clipboard,other keys,selection paint,dynamic attributes and all Material readonly cases remain unproved.' }));
});
