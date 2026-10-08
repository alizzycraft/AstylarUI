import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { createHash } from 'node:crypto';
import ts from 'typescript';
import { transformSync } from 'esbuild';
import { PNG } from 'pngjs';
import { materialCaseKey } from './run-checkpoint.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { propertyGroups } from './input-equivalence-policy.mjs';
import { materialAbsoluteTextAlignmentTargets, materialAdditionalMeasurementTargets, materialComparisonViewport, materialFamilies, materialFocusedRasterTargets, materialGeometryExcludedTargets, materialInteractionCases, materialInteractionFocusedRasterTargets, materialInteractionTextAlignmentTargets, materialInteractionViewports, materialLeftAlignedTextTargets, materialMobileFlowCases, materialMobileFlowFamilies, materialProfiles, materialSemanticExcludedTargets, materialStaticCases, materialSupplementalStaticCases, materialTextAlignmentTargets, materialTextAlignmentToleranceOverrides, materialTextAuditTargets, materialTextlessFamilies, materialTextOnlyTargets, materialThresholds, materialUniformBackgroundTargets, materialViewports } from './benchmark.config.mjs';

test('snackbar lifetime replacement binds real actions and all seven boundaries to served assets', () => {
  const file = 'artifacts/material-parity/snackbar-lifetime-bound-current-20261008/latest-report.json';
  const raw = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(raw.capture.checkpointManifest.file));
  const options = { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-snackbar-lifetime.mjs', styleProperties: Object.values(propertyGroups).flat() };
  assert.deepEqual(validateSupplementalCapture(raw, options), { status: 'checkpoint-bound', errors: [] });
  const build = 'examples/material-showcase/dist/material-showcase/browser';
  for (const [name, mapName] of [['astylar.component.ts', 'chunk-JPEJK334.js.map'],
    ['reference.component.ts', 'chunk-7SL66K3U.js.map'], ['showcase.store.ts', 'chunk-YSOHGT2J.js.map']]) {
    const bytes = readFileSync(`${build}/${mapName}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.provenance.browserFiles.find(f => f.file === mapName).sha256);
    const map = JSON.parse(bytes);
    const sources = map.sources.flatMap((p, i) => p === `src/app/${name}` ? [map.sourcesContent[i]] : []);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].replace(/\r\n/g, '\n'), readFileSync(`examples/material-showcase/src/app/${name}`, 'utf8').replace(/\r\n/g, '\n'));
  }
  const changed = structuredClone(raw);
  changed.results[0].reference.runtime.assets[0].sha256 = '0'.repeat(64);
  assert.equal(validateSupplementalCapture(changed, options).status, 'invalid');
  assert.equal(raw.results.length, 14);
  const states = ['closed', 'first-open', 'reopened', 'after-original-expiry', 'new-expired', 'third-open', 'action-dismissed'];
  const files = new Set();
  for (const profile of ['light', 'dark']) {
    const rows = raw.results.filter(r => r.profile === profile);
    assert.deepEqual(rows.map(r => r.state), states);
    assert.ok(rows.every(r => r.family === 'snack-bar'));
    const viewport = profile === 'light' ? { width: 1440, height: 900, deviceScaleFactor: 1 } : { width: 390, height: 844, deviceScaleFactor: 2 };
    assert.ok(rows.every(r => JSON.stringify(r.viewport) === JSON.stringify(viewport)));
    for (const side of ['reference', 'astylar']) {
      const observations = rows.map(r => r[side].observation);
      assert.deepEqual(observations.map(o => o.popupCount), side === 'reference' ? [0, 1, 2, 1, 0, 1, 0] : [0, 1, 1, 1, 0, 1, 0]);
      assert.deepEqual(observations.map(o => o.clicks.length), [0, 1, 2, 2, 2, 3, 4]);
      const clicks = observations.at(-1).clicks;
      assert.ok(clicks.every(c => c.trusted));
      assert.ok(observations[3].now - clicks[0].now > 5000);
      assert.ok(observations[3].now - clicks[1].now < 5000);
      assert.ok(observations[4].now - clicks[1].now > 5000);
      if (side === 'reference') assert.deepEqual(clicks.slice(0, 3).map(c => c.id), Array(3).fill('snack-bar-primary'));
      else assert.deepEqual(observations.at(-1).events.filter(e => e.type === 'click').map(e => e.targetId),
        ['snack-bar-primary', 'snack-bar-primary', 'snack-bar-primary', 'snack-bar-dismiss']);
      for (const row of rows) {
        const screenshot = row[side].screenshot;
        assert.ok(!files.has(screenshot.file)); files.add(screenshot.file);
        assert.equal(path.dirname(screenshot.file), path.dirname(file));
        const bytes = readFileSync(screenshot.file), pixels = PNG.sync.read(bytes);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), screenshot.sha256);
        assert.equal(pixels.width, viewport.width * viewport.deviceScaleFactor);
        assert.equal(pixels.height, viewport.height * viewport.deviceScaleFactor);
        if (row.state === 'after-original-expiry') {
          // Bottom-band exact solid-color bounds: visibility, not glyph/fade equivalence.
          const color = side === 'reference' ? [50, 48, 51] : [50, 47, 53];
          const dpr = viewport.deviceScaleFactor;
          let left = pixels.width, top = pixels.height, right = -1, bottom = -1, count = 0;
          for (let y = pixels.height - 160 * dpr; y < pixels.height; y++) for (let x = 0; x < pixels.width; x++) {
            const i = (y * pixels.width + x) * 4;
            if (color.every((v, j) => pixels.data[i + j] === v)) {
              left = Math.min(left, x); top = Math.min(top, y);
              right = Math.max(right, x); bottom = Math.max(bottom, y); count++;
            }
          }
          const width = profile === 'dark' && side === 'reference' ? 374 : 344;
          assert.ok(count > width * 40 * dpr * dpr);
          assert.deepEqual({ left: left / dpr, top: top / dpr, width: (right - left + 1) / dpr,
            height: (bottom - top + 1) / dpr, bottomGap: (pixels.height - bottom - 1) / dpr },
          { left: (viewport.width - width) / 2, top: viewport.height - 56, width, height: 48, bottomGap: 8 });
        }
      }
    }
  }
  assert.equal(files.size, 28);
  // This is lifetime/provenance evidence, not equal input, fade or glyph-paint acceptance.
  assert.equal(raw.inputEquivalent, false); assert.equal(raw.renderingEquivalent, false);
});

test('configured snackbar lifetime census preserves timed and intentionally persistent boundaries', () => {
  const rows = materialInteractionCases.filter(r => r.family === 'snack-bar');
  assert.equal(rows.length, 59);
  const timed = rows.filter(r => r.state === 'auto-dismiss');
  assert.deepEqual(timed, [{ family: 'snack-bar', profile: 'light', viewport: {
    id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 }, state: 'auto-dismiss' }]);
  assert.equal(rows.filter(r => r.state !== 'auto-dismiss').length, 58);
  const reference = readFileSync('examples/material-showcase/src/app/reference.component.ts', 'utf8');
  const candidate = readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8');
  assert.ok(reference.includes("const shouldMeasureLifetime = !this.benchmarkMode || this.benchmarkInteraction === 'auto-dismiss';"));
  assert.ok(candidate.includes("if (this.benchmarkMode && this.benchmarkInteraction !== 'auto-dismiss') return;"));
  const replacement = JSON.parse(readFileSync('artifacts/material-parity/snackbar-lifetime-bound-current-20261008/latest-report.json'));
  assert.ok(replacement.results.every(r => !timed.some(c => c.profile === r.profile &&
    c.viewport.width === r.viewport.width && c.viewport.height === r.viewport.height &&
    c.viewport.deviceScaleFactor === r.viewport.deviceScaleFactor)));
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(bytes);
  const observed = report.interactions.filter(r => r.family === 'snack-bar' && r.state === 'auto-dismiss');
  assert.equal(observed.length, 1);
  const row = observed[0];
  assert.equal(materialCaseKey('interaction', row), materialCaseKey('interaction', timed[0]));
  assert.equal(row.meetsAcceptance, true); assert.equal(row.astylarState.open, false);
  assert.deepEqual(row.runtimeErrors, []);
  const absent = row.geometry.elements.filter(e => ['snack-bar-overlay', 'snack-bar-surface'].includes(e.id));
  assert.equal(absent.length, 2);
  assert.ok(absent.every(e => e.missing));
  for (const side of ['reference', 'astylar']) {
    const receipt = row.inputTrees[side], treeBytes = readFileSync(receipt.file);
    assert.equal(createHash('sha256').update(treeBytes).digest('hex'), receipt.sha256);
    assert.deepEqual(JSON.parse(treeBytes).errors, []);
  }
  // Closed final state is not an open-state timing/paint or whole-case equivalence proof.
});

test('configured input focus evidence records exact controls without replacing reference actions', t => {
  const file = 'artifacts/material-parity/configured-input-focus-20261008/latest-report.json';
  const capture = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(capture.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(capture, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-configured-input-focus.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  const hash = b => createHash('sha256').update(b).digest('hex');
  const ownerSourceFile = 'src/app/services/text/text-selection.service.ts';
  const ownerInstalledFile = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/text/text-selection.service.js';
  const mapFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js.map';
  const ownerSource = readFileSync(ownerSourceFile), ownerInstalled = readFileSync(ownerInstalledFile);
  const compiled = ts.transpileModule(ownerSource.toString(), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const mapBytes = readFileSync(mapFile), map = JSON.parse(mapBytes);
  assert.equal(hash(mapBytes), manifest.provenance.browserFiles.find(item => item.file === path.basename(mapFile)).sha256);
  const captured = map.sources.flatMap((file, index) => file.endsWith('/app/services/text/text-selection.service.js') ? [map.sourcesContent[index]] : []);
  assert.equal(captured.length, 1);
  const method = (code, name) => {
    const parsed = ts.createSourceFile('caret-owner.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert.deepEqual(parsed.parseDiagnostics, []);
    const matches = [];
    const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(parsed) === name) matches.push(node.getText(parsed)); ts.forEachChild(node, visit); };
    visit(parsed); assert.equal(matches.length, 1);
    return transformSync(`class Owner {${matches[0]}}`, { loader: 'js', target: 'es2022', legalComments: 'none', minifyWhitespace: true }).code;
  };
  const ownerMethods = ['createTextCursor', 'updateTextCursorColor', 'projectCursorX', 'calculateCursorPosition'];
  for (const name of ownerMethods) {
    assert.equal(method(compiled, name), method(ownerInstalled.toString(), name), `${name}: current/installed divergence`);
    assert.equal(method(captured[0], name), method(ownerInstalled.toString(), name), `${name}: captured/installed divergence`);
  }
  t.diagnostic(JSON.stringify({ caretOwnerApplicability: { ownerSourceFile, sourceSha256: hash(ownerSource),
    ownerInstalledFile, installedSha256: hash(ownerInstalled), mapFile, mapSha256: hash(mapBytes), methods: ownerMethods,
    scope: 'Four complete methods only; formatting normalization, not full module/pipeline or rendering acceptance' } }));
  const selectionOwners = [];
  for (const [relative, names] of [
    ['app/services/dom/input/text-input.manager', ['setupSelectionSync', 'applyControllerState', 'parseTextStyle']],
    ['app/services/dom/interaction/text-highlight-mesh.factory', ['applySelection', 'computeSegments', 'resolveCaretPosition', 'syncHighlightMeshes', 'createHighlightRecord', 'createHighlightMaterial', 'createForegroundMaterial']]
  ]) {
    const sourceFile = `src/${relative}.ts`, installedFile = `examples/material-showcase/node_modules/astylarui/dist/lib/${relative}.js`;
    const source = readFileSync(sourceFile), installed = readFileSync(installedFile);
    const emitted = ts.transpileModule(source.toString(), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    const matches = map.sources.flatMap((file, index) => file.endsWith(`/${relative}.js`) ? [map.sourcesContent[index]] : []);
    assert.equal(matches.length, 1);
    for (const name of names) {
      assert.equal(method(emitted, name), method(installed.toString(), name), `${relative}/${name}: current/installed divergence`);
      assert.equal(method(matches[0], name), method(installed.toString(), name), `${relative}/${name}: captured/installed divergence`);
    }
    if (relative.endsWith('text-input.manager')) {
      const Parser = new Function(`return ${method(matches[0], 'parseTextStyle')}`)();
      const parser = new Parser();
      // These retained inputs use pixel lengths only. Stub only the size parser,
      // not the complete owning style-to-text conversion under investigation.
      parser.parseSize = value => value === undefined ? undefined : parseFloat(value);
      const candidate = parser.parseTextStyle({ fontSize: '16px', fontFamily: 'Roboto, Arial, sans-serif' });
      const explicit = parser.parseTextStyle({ fontSize: '16px', lineHeight: '24px', letterSpacing: '0.496px', fontFamily: 'Roboto' });
      assert.equal(candidate.fontSize*candidate.lineHeight,19.2); assert.equal(candidate.letterSpacing,0);
      assert.equal(explicit.fontSize*explicit.lineHeight,24); assert.equal(explicit.letterSpacing,0.496);
      t.diagnostic(JSON.stringify({ inputSelectionMetricIntent:{candidate:{lineHeightCss:19.2,trackingCss:0},explicit:{lineHeightCss:24,trackingCss:0.496}},
        scope:'Complete captured parseTextStyle with pixel-size parser boundary; not actual live metrics, full pipeline or final raster causality' }));
    }
    selectionOwners.push({ sourceFile, sourceSha256: hash(source), installedFile, installedSha256: hash(installed), methods: names });
  }
  t.diagnostic(JSON.stringify({ selectionOwnerApplicability: selectionOwners,
    scope: 'Ten complete style/controller-sync/highlight methods; not all selection actions, palette functions, caller or full rendering acceptance' }));
  const runner = readFileSync(capture.actionSource.file);
  assert.equal(hash(runner), capture.actionSource.sha256);
  assert.equal(hash(runner), manifest.provenance.harnessFiles.find(r => r.file === capture.actionSource.file).sha256);
  const configFile = 'tests/material-parity/benchmark.config.mjs';
  assert.equal(hash(readFileSync(configFile)), manifest.provenance.harnessFiles.find(r => r.file === configFile).sha256);
  const ast = ts.createSourceFile('runner.mjs', runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const fn = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const block = fn('performInteraction').body.statements.find(n => ts.isIfStatement(n) && n.expression.getText(ast) === "state === 'focus'");
  assert.equal(hash(block.thenStatement.getText(ast).slice(1, -1)), capture.actionSource.focusBodySha256);
  assert.equal(hash(fn('profileTheme').body.getText(ast)), capture.actionSource.themeBodySha256);
  const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
  const cases = materialInteractionCases.filter(c => families.includes(c.family) && c.state === 'focus');
  assert.equal(cases.length, 40); assert.equal(capture.results.length, 240);
  assert.deepEqual([...new Set(capture.results.map(r => r.caseId))].sort(), cases.map(c => materialCaseKey('interaction', c)).sort());
  const paintObservations = [];
  for (const c of cases) {
    const rows = capture.results.filter(r => r.caseId === materialCaseKey('interaction', c));
    assert.deepEqual(rows.map(r => r.sample), [0, 1, 2, 3, 4, 5]);
    for (const row of rows) {
      assert.equal(row.family, c.family); assert.equal(row.profile, c.profile); assert.deepEqual(row.viewport, c.viewport);
      assert.equal(row.action, row.sample ? 'wait 125ms' : 'original configured focus action');
      for (const side of ['reference', 'astylar']) {
        const observation = row[side].observation, control = observation.control;
        const tree = JSON.parse(readFileSync(row[side].inputTree.file));
        const id = `${c.family}-control`;
        const input = tree.nodes.find(node => side === 'reference' ? node.attributes?.id === id : node.authored?.id === id);
        assert.ok(input, 'Exact observed input must own the retained style evidence');
        if (side === 'reference') {
          const colors = { light: 'rgb(103, 80, 164)', dark: 'rgb(208, 188, 255)', contrast: 'rgb(0, 0, 0)', custom: 'rgb(0, 106, 106)' };
          assert.equal(tree.styles[input.style].caretColor, colors[c.profile]);
          assert.ok(input.rules.map(index => tree.rules[index]).some(rule =>
            rule.declarations?.['caret-color']?.value === 'var(--mat-form-field-filled-caret-color, var(--mat-sys-primary))'));
        } else {
          assert.equal(input.resolvedStyle.caretColor, undefined, 'Preserve omitted candidate caret intent, not an assumed equivalent default');
          assert.equal(input.resolvedStyle.color, '#1d1b20');
        }
        assert.equal(control.type, c.family === 'input' ? 'email' : 'text');
        assert.equal(control.value, c.family === 'form-field' ? 'Atlas' : c.family === 'input' ? 'team@example.com' : '');
        assert.equal(typeof control.focused, 'boolean');
        if (side === 'reference') assert.equal(control.id, `${c.family}-control`);
        else assert.equal(control.astylarId, `${c.family}-control`);
        if (c.family === 'input') {
          assert.equal(control.selectionStart, null); assert.equal(control.selectionEnd, null); assert.equal(control.selectionDirection, null);
        }
        assert.equal(row[side].screenshot.caret, 'initial'); assert.equal(row[side].hiddenCaretControl.caret, 'hide');
        for (const image of [row[side].screenshot, row[side].hiddenCaretControl]) {
          const bytes = readFileSync(image.file); assert.equal(hash(bytes), image.sha256);
          const png = PNG.sync.read(bytes);
          assert.equal(png.width, Math.round(image.clip.width * c.viewport.deviceScaleFactor));
          assert.equal(png.height, Math.round(image.clip.height * c.viewport.deviceScaleFactor));
        }
      }
    }
    const paint = { caseId: materialCaseKey('interaction', c) };
    for (const side of ['reference', 'astylar']) {
      // Browser caret:hide does not freeze the Babylon canvas blink. Use all
      // retained temporal pairs, not a zero same-sample delta as absence proof.
      const images = rows.flatMap(row => [row[side].screenshot, row[side].hiddenCaretControl])
        .map(image => PNG.sync.read(readFileSync(image.file)));
      const dpr = c.viewport.deviceScaleFactor, columns = [];
      for (let x = 12*dpr; x < 20*dpr; x++) {
        let longest = 0;
        for (const a of images) for (const b of images) {
          let run = 0;
          for (let y = 0; y < a.height; y++) {
            const i = (y*a.width+x)*4;
            run = [0,1,2,3].some(k => a.data[i+k] !== b.data[i+k]) ? run+1 : 0;
            longest = Math.max(longest, run);
          }
        }
        if (longest >= 10*dpr) columns.push({ x, longest });
      }
      const start = (side === 'reference' ? 16 : 15)*dpr;
      const width = (side === 'reference' ? 1 : 2)*dpr;
      assert.deepEqual(columns.map(column => column.x), Array.from({ length: width }, (_, i) => start+i));
      paint[side] = { columns, cssWidth: width/dpr,
        leftRelativeToInput: rows[0][side].screenshot.clip.x+start/dpr-rows[0][side].observation.box.x };
      assert.equal(paint[side].leftRelativeToInput, side === 'reference' ? 0 : -1);
    }
    paintObservations.push(paint);
  }
  t.diagnostic(JSON.stringify({ configuredFocusTemporalPaint: paintObservations, acceptance: false,
    scope: '40 configured contexts; temporal edge observations, not equal caret intent, vertical fringe causality or current pipeline acceptance' }));
  // This authenticates observation coverage, not focus equality or paint acceptance.
  assert.equal(capture.inputEquivalent, false); assert.equal(capture.renderingEquivalent, false);
});

test('selection local pixels retain exact native key boundaries and paint receipts', t => {
  const file = 'artifacts/material-parity/selection-local-pixels-20261008-receipt-corrected/latest-report.json';
  const report = JSON.parse(readFileSync(file)), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-selection-pixels.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  const hash = b => createHash('sha256').update(b).digest('hex');
  assert.equal(hash(readFileSync(report.actionSource.file)),report.actionSource.sha256);
  const expected = [[5,5,'forward'],[0,3,'forward'],[5,5,'forward'],[2,5,'backward']];
  const solidPaint = [];
  assert.equal(report.results.length, 16);
  for (const profile of ['light','dark','contrast','custom']) {
    const rows = report.results.filter(r => r.profile === profile);
    assert.deepEqual(rows.map(r => r.state), ['typed','forward','end-collapsed','backward']);
    for (const [index, row] of rows.entries()) {
      assert.equal(row.family, 'form-field'); assert.deepEqual(row.viewport, { width:390,height:844,deviceScaleFactor:2 });
      for (const side of ['reference','astylar']) {
        const control = row[side].observation.control;
        assert.equal(control.value,'Atlas'); assert.equal(control.focused,true);
        assert.deepEqual([control.selectionStart,control.selectionEnd,control.selectionDirection],expected[index]);
        const receipt = row[side].screenshot, bytes = readFileSync(receipt.file);
        assert.equal(hash(bytes),receipt.sha256); const png = PNG.sync.read(bytes);
        assert.equal(png.width,Math.round(receipt.clip.width*2)); assert.equal(png.height,Math.round(receipt.clip.height*2));
        const tree = JSON.parse(readFileSync(row[side].inputTree.file));
        const node = tree.nodes.find(n => side === 'reference' ? n.attributes?.id === 'form-field-control' : n.authored?.id === 'form-field-control');
        assert.ok(node);
        const style = side === 'reference' ? tree.styles[node.style] : node.resolvedStyle;
        assert.equal(style.fontSize,'16px');
        if (side === 'reference') { assert.equal(style.lineHeight,'24px'); assert.equal(style.letterSpacing,'0.496px'); }
        else { assert.equal(style.lineHeight,undefined); assert.equal(style.letterSpacing,undefined); }
        if (index === 1 || index === 3) {
          const hex = side === 'reference' ? '#2e61cd' : row.astylar.observation.highlights.find(h => h.visible && h.material).material;
          const rgb = [1,3,5].map(k => parseInt(hex.slice(k,k+2),16));
          let count=0,left=Infinity,top=Infinity,right=-1,bottom=-1;
          for(let y=0;y<png.height;y++)for(let x=0;x<png.width;x++) {
            const i=(y*png.width+x)*4;
            if(rgb.every((color,k)=>png.data[i+k]===color)) { count++; left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y); }
          }
          assert.ok(count>0);
          const expectedX = side === 'reference' ? (index===1?[16,57]:[50,93]) : (index===1?[16,53]:[47,87]);
          assert.deepEqual([left,right],expectedX);
          assert.equal((bottom-top+1)/2,side==='reference'?24:['light','dark'].includes(profile)?18.5:19);
          solidPaint.push({ profile,state:row.state,side,hex,count,deviceBounds:[left,top,right,bottom],
            cssRelativeToInput:[receipt.clip.x+left/2-row[side].observation.box.x,receipt.clip.y+top/2-row[side].observation.box.y,(right-left+1)/2,(bottom-top+1)/2] });
        }
      }
      const visible = row.astylar.observation.highlights.filter(h => h.visible);
      assert.equal(visible.length > 0, index === 1 || index === 3);
    }
  }
  assert.equal(report.inputEquivalent,false); assert.equal(report.renderingEquivalent,false);
  t.diagnostic('32 local PNGs and paired control/tree/runtime receipts authenticated; raw rendered world bounds are diagnostic only, not CSS layout inputs or geometry acceptance');
  t.diagnostic(JSON.stringify({ selectionSolidPaint:solidPaint,acceptance:false,
    scope:'Exact-color pixel masks with unequal line-height/tracking inputs; not full AA bounds, glyph sharpness, isolated geometry causality or parity acceptance' }));
});

test('covers every installed Angular Material component entry point', () => {
  const packageJson = JSON.parse(readFileSync(path.resolve('node_modules/@angular/material/package.json'), 'utf8'));
  const installed = Object.keys(packageJson.exports)
    .filter((entry) => /^\.\/[a-z][a-z-]*$/.test(entry) && !entry.includes('theming'))
    .map((entry) => entry.slice(2)).sort();
  assert.deepEqual([...materialFamilies].sort(), installed);
  assert.equal(materialFamilies.length, 36);
});

test('keeps the app catalog and enforced static matrix complete', () => {
  const catalogSource = readFileSync(path.resolve('examples/material-showcase/src/app/catalog.ts'), 'utf8');
  for (const family of materialFamilies) assert.match(catalogSource, new RegExp(`['"]${family}['"]`));
  assert.equal(materialStaticCases.length,
    materialFamilies.length * materialProfiles.length * materialViewports.length + materialSupplementalStaticCases.length);
  assert.equal(materialSupplementalStaticCases.length, materialProfiles.length);
  assert.ok(materialSupplementalStaticCases.every(({ family, viewport }) =>
    family === 'divider' && viewport === materialComparisonViewport));
  assert.deepEqual(materialThresholds, {
    edgeTolerancePx: 2,
    maximumEdgeErrorPx: 5,
    minimumEdgesWithinTolerance: .95,
    resultSsim: .95,
    aggregateMedianSsim: .98,
    maximumTextCenterOffsetErrorPx: .75,
  });
  assert.deepEqual(materialTextAlignmentTargets.button,
    ['button-primary', 'button-secondary', 'button-disabled']);
  assert.ok(Object.keys(materialTextAlignmentTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialFamilies.filter((family) => !(family in materialTextAuditTargets)), materialTextlessFamilies);
  const enforcedTextTargets = new Set([
    ...Object.values(materialTextAlignmentTargets).flat(),
    ...Object.values(materialInteractionTextAlignmentTargets).flat(),
  ]);
  assert.ok(materialAbsoluteTextAlignmentTargets.every((target) => enforcedTextTargets.has(target)));
  assert.ok(materialLeftAlignedTextTargets.includes('expansion-title'));
  assert.deepEqual(materialTextAlignmentToleranceOverrides,
    { 'tab-overview': 1.25, 'tab-activity': 1.25, 'button-toggle-one': 1 });
  assert.ok(Object.keys(materialTextAlignmentToleranceOverrides).every((target) => enforcedTextTargets.has(target)));
  assert.ok(materialTextOnlyTargets.every((target) => enforcedTextTargets.has(target)));
  assert.deepEqual(materialGeometryExcludedTargets, ['slider-start', 'slider-primary']);
  assert.deepEqual(materialAdditionalMeasurementTargets.slider, ['slider-start', 'slider-visual']);
  assert.ok(materialSemanticExcludedTargets.includes('slider-visual'));
  assert.ok(Object.keys(materialUniformBackgroundTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialFocusedRasterTargets.sort,
    { element: 'sort-primary', padding: 8, minimumSsim: .80 });
  assert.deepEqual(Object.keys(materialFocusedRasterTargets).sort(),
    ['button-toggle', 'checkbox', 'chips', 'form-field', 'icon', 'paginator', 'sort', 'stepper', 'table', 'tabs']);
  assert.ok(Object.keys(materialFocusedRasterTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialInteractionFocusedRasterTargets.expansion,
    { element: 'expansion-root', padding: 8, minimumSsim: .90 });
  assert.deepEqual(materialInteractionFocusedRasterTargets.datepicker,
    { element: 'datepicker-primary', padding: 8, paddingBottom: 370, minimumSsim: .86 });
  assert.deepEqual(materialInteractionFocusedRasterTargets.chips,
    { element: 'chips-primary', padding: 8, minimumSsim: .70, states: ['activate', 'activate-alternate', 'activate-leave'] });
  assert.deepEqual(Object.keys(materialInteractionFocusedRasterTargets).sort(),
    ['autocomplete', 'bottom-sheet', 'button-toggle', 'chips', 'datepicker', 'dialog', 'expansion', 'form-field', 'input', 'menu', 'select', 'slide-toggle', 'slider', 'sort', 'stepper', 'tabs', 'timepicker', 'tooltip']);
  assert.deepEqual(materialInteractionFocusedRasterTargets['bottom-sheet'],
    { element: 'bottom-sheet-panel', padding: 0, minimumSsim: .975,
      states: ['activate', 'activate-leave', 'open'], viewports: ['comparison-pane-dpr1'] });
  assert.deepEqual(materialInteractionFocusedRasterTargets.dialog,
    { element: 'dialog-panel', padding: 8, minimumSsim: .85, states: ['open', 'open-hover-content'] });
  assert.deepEqual(materialInteractionFocusedRasterTargets.tooltip,
    { element: 'tooltip-popup', padding: 4, minimumSsim: .70, states: ['hover', 'held'] });
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'chips' && state === 'activate-alternate'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'autocomplete' && state === 'open-commit-reopen'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'select' && state === 'open-commit-reopen'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'form-field' && state === 'edit-empty-blur'));
  assert.ok(materialInteractionCases.some(({ family, state }) => family === 'input' && state === 'edit-empty-blur'));
  assert.ok(materialInteractionCases.some(({ family, profile, viewport, state }) =>
    family === 'bottom-sheet' && profile === 'light' && viewport.id === 'comparison-pane-dpr1' &&
    viewport.width === 900 && state === 'activate'));
  for (const state of ['drag-start', 'drag-end']) {
    assert.ok(materialInteractionCases.some((candidate) =>
      candidate.family === 'slider' && candidate.profile === 'light' &&
      candidate.viewport.id === 'comparison' && candidate.viewport.width === 609 &&
      candidate.state === state));
  }
  for (const [family, states] of [['snack-bar', ['activate', 'activate-twice']], ['tooltip', ['hover', 'held']]]) {
    for (const state of states) {
      assert.ok(materialInteractionCases.some((candidate) =>
        candidate.family === family && candidate.profile === 'light' &&
        candidate.viewport.id === 'comparison' && candidate.viewport.width === 609 &&
        candidate.state === state));
    }
  }
  for (const family of ['autocomplete', 'datepicker', 'timepicker', 'menu', 'dialog']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === family && candidate.state === 'open-dismiss-outside'));
  }
  for (const family of ['autocomplete', 'datepicker', 'timepicker', 'menu']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === family && candidate.state === 'open-dismiss-canvas'));
  }
  for (const family of ['autocomplete', 'select', 'datepicker', 'timepicker', 'menu', 'dialog']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === family && candidate.state === 'open-hover-content'));
  }
  assert.ok(materialInteractionCases.some((candidate) => candidate.family === 'datepicker' && candidate.state === 'open-secondary'));
  assert.ok(materialInteractionCases.some((candidate) => candidate.family === 'snack-bar' && candidate.state === 'auto-dismiss'));
  for (const state of ['drag-start', 'drag-end']) {
    assert.ok(materialInteractionCases.some((candidate) => candidate.family === 'slider' && candidate.state === state));
  }
  assert.deepEqual(materialInteractionFocusedRasterTargets.slider.states, ['hover', 'held']);
  assert.ok(Object.keys(materialInteractionFocusedRasterTargets).every((family) => materialFamilies.includes(family)));
  assert.deepEqual(materialInteractionTextAlignmentTargets.chips, ['chip-0', 'chip-1']);
  assert.deepEqual(materialInteractionTextAlignmentTargets.dialog,
    ['dialog-title', 'dialog-copy', 'dialog-cancel', 'dialog-save']);
  assert.deepEqual(materialInteractionTextAlignmentTargets.expansion, ['expansion-content']);
  assert.equal(materialInteractionViewports.length, 2);
  for (const family of materialFamilies) {
    for (const profile of materialProfiles) {
      for (const viewport of materialInteractionViewports) {
        assert.ok(materialInteractionCases.some((entry) => entry.family === family && entry.profile === profile && entry.viewport.id === viewport.id));
        if (!['divider', 'icon', 'progress-bar', 'progress-spinner'].includes(family)) {
          assert.ok(materialInteractionCases.some((entry) => entry.family === family && entry.profile === profile &&
            entry.viewport.id === viewport.id && entry.state === 'activate-leave'));
        }
      }
    }
  }
  assert.equal(materialMobileFlowCases.length, materialMobileFlowFamilies.length * 2);
});
