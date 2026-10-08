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
        if (row.state === 'third-open') {
          const receipt = row[side].inputTree, bytes = readFileSync(receipt.file);
          assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt.sha256);
          const tree = JSON.parse(bytes);
          assert.deepEqual(tree.errors, []);
          const nodes = tree.nodes.filter(n => side === 'reference'
            ? n.attributes?.class?.includes('mat-mdc-snack-bar-container')
            : n.authored?.id === 'snack-bar-surface');
          assert.equal(nodes.length, 1);
          const node = nodes[0];
          if (side === 'reference') {
            const style = tree.styles[node.style];
            assert.ok(Number(style.opacity) > 0 && Number(style.opacity) < 1);
            assert.match(style.transform, /^matrix\(/);
            const enter = node.rules.map(i => tree.rules[i]).filter(r =>
              r.declarations?.['animation-name']?.value === '_mat-snack-bar-enter');
            assert.equal(enter.length, 1);
            assert.equal(enter[0].declarations['animation-duration'].value, '150ms');
            assert.equal(enter[0].declarations['animation-fill-mode'].value, 'forwards');
          } else {
            assert.equal(Number(node.resolvedStyle.opacity), 1);
            assert.equal(node.resolvedStyle.transform, undefined);
            assert.ok(Object.keys(node.resolvedStyle).every(k => !k.toLowerCase().startsWith('animation')));
            assert.ok(tree.rules.filter(r => JSON.stringify(r).includes('snack')).every(r =>
              !JSON.stringify(r).includes('animation')));
          }
          // Unequal opening inputs and sampled phase, not an equivalent-input animation defect.
        }
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

test('configured overlay placement census distinguishes measured boxes from comparator defaults', t => {
  const bytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(bytes);
  for (const file of ['tests/material-parity/run-material-parity.mjs', 'tests/material-parity/benchmark.config.mjs']) {
    assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), report.captureProvenance.harnessFiles.find(r => r.file === file).sha256);
  }
  const runner = readFileSync('tests/material-parity/run-material-parity.mjs', 'utf8');
  const ast = ts.createSourceFile('runner.mjs', runner, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const comparator = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'compareOverlayPlacement');
  assert.ok(comparator);
  const declarations = comparator.body.statements.filter(ts.isVariableStatement).flatMap(s => [...s.declarationList.declarations]);
  const predicate = declarations.find(n => n.name.getText(ast) === 'expectedVisible');
  assert.ok(predicate?.initializer);
  const expectsMeasurement = new Function('family', 'state', `return (${predicate.initializer.getText(ast)});`);
  const expected = { autocomplete: [98, 0], select: [82, 0], datepicker: [99, 33], timepicker: [98, 32],
    menu: [82, 0], 'bottom-sheet': [51, 25], dialog: [66, 32], 'snack-bar': [59, 34], tooltip: [50, 18] };
  const configured = [...materialInteractionCases, ...materialMobileFlowCases].filter(r => Object.hasOwn(expected, r.family));
  const rows = report.interactions.filter(r => Object.hasOwn(expected, r.family));
  assert.equal(rows.length, 685);
  assert.deepEqual(rows.map(r => materialCaseKey('interaction', r)).sort(), configured.map(r => materialCaseKey('interaction', r)).sort());
  let measured = 0;
  for (const [family, [total, count]] of Object.entries(expected)) {
    const cohort = rows.filter(r => r.family === family);
    assert.equal(cohort.length, total);
    const measuredRows = cohort.filter(r => expectsMeasurement(family, r.state));
    assert.equal(measuredRows.length, count); measured += count;
    if (['autocomplete', 'select', 'menu'].includes(family)) {
      assert.ok(cohort.every(r => r.geometry.elements.every(e => [`${family}-root`, `${family}-primary`].includes(e.id))));
    }
    for (const row of cohort) {
      const p = row.overlayPlacement;
      if (!expectsMeasurement(family, row.state)) assert.deepEqual(p, { matches: true });
      else for (const side of ['reference', 'astylar']) {
        assert.ok(p.targetId);
        assert.ok(['x', 'y', 'width', 'height'].every(k => Number.isFinite(p[side]?.[k])));
      }
    }
    t.diagnostic(JSON.stringify({ family, configured: total, pairedPopupBoxes: count, defaultOnly: total - count,
      measuredCaseIds: measuredRows.map(r => materialCaseKey('interaction', r)),
      scope: 'Historical comparator observation coverage; defaults are not placement acceptance or missing-evidence counts' }));
  }
  assert.equal(measured, 174);
  const menuRows = rows.filter(r => r.family === 'menu');
  const menuStates = { focus: 8, hover: 8, held: 8, activate: 8, 'activate-leave': 8,
    'open-hover-content': 8, 'open-dismiss-outside': 8, 'open-dismiss-canvas': 8,
    disabled: 8, open: 8, 'open-dismiss': 2 };
  assert.deepEqual(Object.fromEntries(Object.keys(menuStates).map(state => [state, menuRows.filter(r => r.state === state).length])), menuStates);
  const stateObservations = menuRows.filter(r => ['open-dismiss-outside', 'open-dismiss-canvas'].includes(r.state));
  assert.equal(stateObservations.length, 16);
  for (const row of stateObservations) assert.deepEqual(row.interactionState, { reference: false, astylar: false, matches: true });
  for (const row of menuRows.filter(r => !stateObservations.includes(r))) assert.deepEqual(row.interactionState, { matches: true });
  const cursorObservations = menuRows.filter(r => r.cursor.reference !== undefined && r.cursor.astylar !== undefined);
  assert.equal(cursorObservations.length, 8);
  assert.ok(cursorObservations.every(r => r.state === 'hover' && r.cursor.reference === 'pointer' && r.cursor.astylar === 'pointer'));
  const focusObservations = menuRows.filter(r => r.focus.reference !== undefined && r.focus.astylar !== undefined);
  assert.equal(focusObservations.length, 10);
  assert.ok(focusObservations.every(r => ['focus', 'open-dismiss'].includes(r.state)));
  assert.ok(menuRows.every(r => r.focusedRasters.length === 1 && r.focusedRasters[0].id === 'menu-primary'));
  assert.ok(menuRows.every(r => r.runtimeErrors.length === 0));
  t.diagnostic(JSON.stringify({ configuredMenuStateCounts: menuStates,
    observedDismissalCaseIds: stateObservations.map(r => materialCaseKey('interaction', r)),
    cursorCaseIds: cursorObservations.map(r => materialCaseKey('interaction', r)),
    focusCaseIds: focusObservations.map(r => materialCaseKey('interaction', r)),
    localRasterTarget: 'menu-primary only; not popup items',
    defaultStateComparators: 66,
    scope: 'Exact historical observation accounting, not full input equivalence, held-boundary fidelity or current whole-case closure' }));
  const retainedBytes = readFileSync('artifacts/material-parity/popup-matched-bounds-20261007.log');
  assert.equal(createHash('sha256').update(retainedBytes).digest('hex'), 'd50667c3937889fac51c7758a3ceb1059b0b90a0dcba7d1b9c2bfa006306ee3a');
  const retained = retainedBytes.toString().trim().split(/\r?\n/).map(line => JSON.parse(line));
  const metadata = retained.pop();
  assert.equal(metadata.reportSha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(metadata.runnerSha256, createHash('sha256').update(runner).digest('hex'));
  assert.equal(metadata.acceptance, false); assert.equal(metadata.observations, 16);
  assert.equal(retained.length, 16);
  const joined = new Set();
  for (const observation of retained) {
    const key = materialCaseKey('interaction', { ...observation, state: 'open-hover-content' });
    const matches = rows.filter(r => materialCaseKey('interaction', r) === key);
    assert.equal(matches.length, 1); assert.ok(!joined.has(key)); joined.add(key);
    assert.ok(['autocomplete', 'select'].includes(observation.family));
    for (const side of ['reference', 'astylar']) {
      assert.deepEqual(observation.receipts[side], matches[0].inputTrees[side]);
      const receipt = observation.receipts[side];
      assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
      assert.ok(['x', 'y', 'width', 'height'].every(k => Number.isFinite(observation[side].popup[k])));
    }
  }
  assert.equal(joined.size, 16);
  // Separate absent endpoint panels from open panels with unmeasured bounds.
  // Input trees record structure/styles, not used popup geometry.
  const endpointCounts = {};
  for (const family of ['autocomplete', 'select']) {
    const cohort = rows.filter(row => row.family === family);
    const openStates = family === 'autocomplete'
      ? ['focus', 'held', 'activate', 'activate-leave', 'open-commit-reopen', 'open-hover-content', 'open']
      : ['activate', 'activate-leave', 'open-commit-reopen', 'open-hover-content', 'open'];
    let open = 0, closed = 0;
    for (const row of cohort) {
      const expectedOpen = openStates.includes(row.state);
      for (const side of ['reference', 'astylar']) {
        const receipt = row.inputTrees[side], treeBytes = readFileSync(receipt.file);
        assert.equal(createHash('sha256').update(treeBytes).digest('hex'), receipt.sha256);
        const tree = JSON.parse(treeBytes);
        assert.deepEqual(tree.errors, []);
        const panels = tree.nodes.filter(node => side === 'reference'
          ? node.attributes?.class?.split(/\s+/).includes(family === 'select' ? 'mat-mdc-select-panel' : 'mat-mdc-autocomplete-panel')
          : node.authored?.id === (family === 'select' ? 'select-options' : 'field-options'));
        assert.equal(panels.length, expectedOpen ? 1 : 0, `${family}/${row.state}/${side} endpoint panel`);
      }
      assert.equal(row.astylarState.open, expectedOpen);
      if (expectedOpen) open++; else closed++;
    }
    endpointCounts[family] = { open, closed, supplementalBounds: 8, remainingOpenBounds: open - 8 };
  }
  assert.deepEqual(endpointCounts, {
    autocomplete: { open: 56, closed: 42, supplementalBounds: 8, remainingOpenBounds: 48 },
    select: { open: 40, closed: 42, supplementalBounds: 8, remainingOpenBounds: 32 },
  });
  t.diagnostic(JSON.stringify({ endpointCounts,
    scope: 'Exact retained endpoint structure only; 84 closed endpoints do not require popup boxes at that endpoint. Mobile intermediate opens and 80 unjoined open bounds remain; no used-geometry or current-code acceptance.' }));
  t.diagnostic(JSON.stringify({ retainedPopupContexts: 16, configuredBoundary: 'open-hover-content',
    families: ['autocomplete', 'select'], profiles: ['light', 'dark', 'contrast', 'custom'],
    viewports: ['desktop-dpr1', 'desktop-dpr2'],
    scope: 'Exact context and input-receipt join to bounds-only supplemental observation; not original screenshot registration, complete current-code applicability or other action boundaries' }));
  const breakpointBytes = readFileSync('artifacts/material-parity/overlay-breakpoint-audit/latest-report.json');
  assert.equal(createHash('sha256').update(breakpointBytes).digest('hex'), '5d086be9ab7b6622e06cb80c0b87d5f671e564347770f50fcb1406ca58be6de7');
  const breakpoint = JSON.parse(breakpointBytes);
  assert.equal(breakpoint.results.length, 3);
  assert.ok(breakpoint.results.every(r => r.family === 'bottom-sheet'));
  const keyboardBytes = readFileSync('artifacts/material-parity/overlay-keyboard-4d782df-settled/result.json');
  assert.equal(createHash('sha256').update(keyboardBytes).digest('hex'), '2d46a54a48316404db90f1227e5d3901c43e6aa230180719697d25958914bb90');
  const keyboard = JSON.parse(keyboardBytes), menu = keyboard.cases.filter(r => r.family === 'menu');
  assert.equal(menu.length, 8);
  assert.deepEqual([...new Set(menu.map(r => r.sequence))].sort(), ['arrow-escape', 'tab-cycle']);
  for (const row of menu) {
    assert.deepEqual(row.trace.filter(e => e.event === 'keydown').map(e => e.key),
      row.sequence === 'arrow-escape' ? ['ArrowDown', 'Escape'] : ['Tab', 'Tab', 'Tab', 'Shift', 'Tab', 'Escape']);
    const boundary = label => row.trace.find(e => e.event === 'boundary' && e.label === label);
    assert.equal(boundary('settled').overlayPresent, true);
    if (row.sequence === 'tab-cycle') {
      assert.equal(boundary('key-0-Tab').overlayPresent, row.mode === 'astylar');
      assert.equal(boundary('key-4-Escape').overlayPresent, false);
    } else {
      assert.equal(boundary('key-0-ArrowDown').active.text, row.mode === 'reference' ? 'Delete' : 'Open menu');
      assert.equal(boundary('key-1-Escape').overlayPresent, false);
    }
  }
  assert.deepEqual(keyboard.viewport, { width: 900, height: 700, dpr: 1 });
  assert.ok(rows.filter(r => r.family === 'menu').every(r => r.viewport.width !== keyboard.viewport.width ||
    r.viewport.height !== keyboard.viewport.height || r.viewport.deviceScaleFactor !== keyboard.viewport.dpr));
  assert.ok(keyboard.limitations.includes('Overlay presence is semantic DOM membership, not a visual/raster visibility assertion.'));
  assert.ok(menu.every(r => ['family,instrumented,mode,sequence,trace', 'family,instrumented,mode,sequence,state,trace']
    .includes(Object.keys(r).sort().join(','))));
  t.diagnostic(JSON.stringify({ menuRetainedKeyboardRows: 8, exactConfiguredViewportMatches: 0,
    breakpointMenuRows: 0, scope: 'These two historical sources do not close configured menu popup geometry; not a search proving all other evidence absent' }));
});

test('snackbar captured timer methods reject late settlement and queued expiry after destruction', async t => {
  const capture = JSON.parse(readFileSync('artifacts/material-parity/snackbar-lifetime-bound-current-20261008/latest-report.json'));
  const manifest = JSON.parse(readFileSync(capture.capture.checkpointManifest.file));
  const mapName = 'chunk-JPEJK334.js.map', mapBytes = readFileSync(`examples/material-showcase/dist/material-showcase/browser/${mapName}`);
  assert.equal(createHash('sha256').update(mapBytes).digest('hex'), manifest.provenance.browserFiles.find(f => f.file === mapName).sha256);
  const map = JSON.parse(mapBytes), index = map.sources.indexOf('src/app/astylar.component.ts');
  assert.ok(index >= 0);
  const source = map.sourcesContent[index];
  assert.equal(source.replace(/\r\n/g, '\n'), readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8').replace(/\r\n/g, '\n'));
  const ast = ts.createSourceFile('component.ts', source, ts.ScriptTarget.Latest, true);
  const declarations = ast.statements.filter(ts.isClassDeclaration).filter(c => c.name?.text === 'AstylarShowcaseComponent');
  assert.equal(declarations.length, 1);
  const names = ['restartSnackbarDismissTimer', 'startSnackbarDismissTimerAfterSettled', 'startSnackbarDismissTimer', 'clearSnackbarDismissTimer'];
  const selected = declarations[0].members.filter(m => ts.isConstructorDeclaration(m) || names.includes(m.name?.getText(ast)));
  assert.equal(selected.length, 5);
  const emitted = ts.transpileModule(`class TimerOwner { destroyRef = destroyRef; ${selected.map(m => m.getText(ast)).join('\n')} }`,
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const pending = new Map(); let next = 0, destroyed, patches = 0;
  const Owner = new Function('destroyRef', 'setTimeout', 'clearTimeout', 'window', `${emitted};return TimerOwner;`)(
    { onDestroy(fn) { destroyed = fn; } }, (fn, delay) => { const id = ++next; pending.set(id, { fn, delay }); return id; },
    id => pending.delete(id), undefined);
  const owner = new Owner();
  Object.assign(owner, { snackbarDismissGeneration: 0, benchmarkMode: false,
    store: { state: () => ({ open: true }), patchState() { patches++; } }, zone: { run: fn => fn() } });
  let resolveSettlement;
  const surface = { whenSettled: () => new Promise(resolve => { resolveSettlement = resolve; }) };
  const late = owner.startSnackbarDismissTimerAfterSettled(surface, owner.snackbarDismissGeneration);
  const deferred = [...pending.entries()]; assert.equal(deferred.length, 1); assert.equal(deferred[0][1].delay, 0);
  pending.delete(deferred[0][0]); deferred[0][1].fn(); await Promise.resolve();
  assert.equal(typeof resolveSettlement, 'function');
  destroyed(); resolveSettlement(); await late;
  assert.equal(pending.size, 0); assert.equal(patches, 0);
  // Also execute an already-queued callback after clearTimeout, not just cancel its handle.
  const scheduledOwner = new Owner();
  Object.assign(scheduledOwner, { snackbarDismissGeneration: 0, benchmarkMode: false,
    store: owner.store, zone: owner.zone });
  scheduledOwner.restartSnackbarDismissTimer();
  const expiry = [...pending.values()]; assert.equal(expiry.length, 1); assert.equal(expiry[0].delay, 5000);
  destroyed(); expiry[0].fn();
  assert.equal(pending.size, 0); assert.equal(patches, 0);
  const sessionMapName = 'chunk-3JXWRYJY.js.map';
  const sessionMapBytes = readFileSync(`examples/material-showcase/dist/material-showcase/browser/${sessionMapName}`);
  assert.equal(createHash('sha256').update(sessionMapBytes).digest('hex'), manifest.provenance.browserFiles.find(f => f.file === sessionMapName).sha256);
  const sessionMap = JSON.parse(sessionMapBytes);
  const sessionIndex = sessionMap.sources.indexOf('node_modules/astylarui/dist/lib/lib/astylar-render-session.js');
  assert.ok(sessionIndex >= 0);
  const sessionClass = code => {
    const parsed = ts.createSourceFile('session.ts', code, ts.ScriptTarget.Latest, true);
    const classes = parsed.statements.filter(ts.isClassDeclaration).filter(c => c.name?.text === 'AstylarRenderSession');
    assert.equal(classes.length, 1); return classes[0].getText(parsed).replace(/^export /, '');
  };
  const capturedClass = sessionClass(sessionMap.sourcesContent[sessionIndex]);
  const currentClass = ts.transpileModule(sessionClass(readFileSync('src/lib/astylar-render-session.ts', 'utf8')),
    { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const formatted = code => transformSync(code, { target: 'es2022', minifyWhitespace: true, legalComments: 'none' }).code;
  assert.equal(formatted(currentClass), formatted(capturedClass));
  assert.equal(formatted(sessionClass(readFileSync('examples/material-showcase/node_modules/astylarui/dist/lib/lib/astylar-render-session.js', 'utf8'))), formatted(capturedClass));
  const Session = new Function(`${capturedClass};return AstylarRenderSession;`)();
  const session = new Session({}, {}, () => undefined, { requestFrame: () => 1, cancelFrame: () => undefined });
  const invalidation = session.invalidate('initial');
  const invalidationRejected = assert.rejects(invalidation, /disposed before settling/);
  const rejectingOwner = new Owner();
  Object.assign(rejectingOwner, { snackbarDismissGeneration: 0, benchmarkMode: false, store: owner.store, zone: owner.zone });
  const rejectedStart = rejectingOwner.startSnackbarDismissTimerAfterSettled(session, 0);
  const zero = [...pending.entries()]; assert.equal(zero.length, 1); assert.equal(zero[0][1].delay, 0);
  pending.delete(zero[0][0]); zero[0][1].fn(); await Promise.resolve();
  const startRejected = assert.rejects(rejectedStart, /disposed before settling/);
  destroyed(); session.dispose(); await Promise.all([invalidationRejected, startRejected]);
  assert.equal(pending.size, 0); assert.equal(patches, 0);
  for (const [mapName, sourceName] of [['chunk-625ZTKCG.js.map', 'comparison.component.ts'], ['main.js.map', 'app.routes.ts']]) {
    const bytes = readFileSync(`examples/material-showcase/dist/material-showcase/browser/${mapName}`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.provenance.browserFiles.find(f => f.file === mapName).sha256);
    const parsed = JSON.parse(bytes), sourceIndex = parsed.sources.indexOf(`src/app/${sourceName}`);
    assert.ok(sourceIndex >= 0);
    const captured = parsed.sourcesContent[sourceIndex];
    assert.equal(captured.replace(/\r\n/g, '\n'), readFileSync(`examples/material-showcase/src/app/${sourceName}`, 'utf8').replace(/\r\n/g, '\n'));
    if (sourceName === 'comparison.component.ts') {
      assert.ok(captured.includes('<iframe #frame title="AstylarUI implementation" [src]="astylarUrl()"'));
      assert.ok(captured.includes('bypassSecurityTrustResourceUrl(`/astylar/${this.store.family()}?v=${this.nonce()}`)'));
    } else {
      assert.ok(captured.includes("path: 'compare', loadComponent:"));
      assert.ok(captured.includes("path: 'astylar/:family', loadComponent:"));
    }
  }
  t.diagnostic(JSON.stringify({ methods: names, lateSettlementSchedulesExpiry: false, queuedExpiryPatchesAfterDestroy: false,
    disposedSettlementRejectsStart: true,
    ordinaryFamilySwitch: 'iframe document replacement; not same-document route teardown',
    scope: 'Exact captured/current application methods and complete current/installed/captured render-session class with controlled scheduler; disposal rejection propagates from uncaught async start, not observed Angular/browser unhandled rejection or all lifecycle acceptance' }));
});

test('menu action capture preserves item-click discrepancy and rejected navigation precondition', () => {
  const file = 'artifacts/material-parity/menu-actions-current-final-20261008/latest-report.json';
  const report = JSON.parse(readFileSync(file)), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const runtimePair = { ...report, results: report.results[0].boundaries.map((_, index) => ({
    reference: { runtime: report.results[0].runtime, inputTree: report.results[0].boundaries[index].inputTree },
    astylar: { runtime: report.results[1].runtime, inputTree: report.results[1].boundaries[index].inputTree },
  })) };
  assert.deepEqual(validateSupplementalCapture(runtimePair, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-menu-actions.mjs', styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.deepEqual(report.results.map(r => r.mode), ['reference', 'astylar']);
  for (const row of report.results) {
    assert.deepEqual(row.viewport, { width: 1440, height: 1000, deviceScaleFactor: 1 });
    assert.deepEqual(row.boundaries.map(b => b.state), ['opened', 'item-held', 'item-clicked', 'reopened', 'arrow-down', 'escape']);
    for (const boundary of row.boundaries) for (const receipt of [boundary.inputTree, boundary.screenshot]) {
      assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
    }
  }
  const [native, candidate] = report.results.map(r => Object.fromEntries(r.boundaries.map(b => [b.state, b.observation])));
  assert.equal(native['item-clicked'].open, false); assert.equal(candidate['item-clicked'].open, true);
  assert.equal(candidate['item-clicked'].active.astylarId, 'menu-rename');
  assert.equal(native.reopened.open, true); assert.equal(candidate.reopened.open, false);
  assert.equal(candidate['arrow-down'].open, false); // Navigation precondition failed; not an open-menu keyboard proof.
  const resetFile = 'artifacts/material-parity/menu-actions-reset-20261008/latest-report.json';
  const reset = JSON.parse(readFileSync(resetFile));
  assert.deepEqual(reset.results.map(r => r.mode), ['reference', 'astylar']);
  const resetPair = { ...reset, results: reset.results[0].boundaries.map((_, index) => ({
    reference: { runtime: reset.results[0].runtime, inputTree: reset.results[0].boundaries[index].inputTree },
    astylar: { runtime: reset.results[1].runtime, inputTree: reset.results[1].boundaries[index].inputTree },
  })) };
  assert.deepEqual(validateSupplementalCapture(resetPair, { reportFile: resetFile, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-menu-actions-reset.mjs', styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  for (const row of reset.results) {
    assert.deepEqual(row.viewport, { width: 1440, height: 1000, deviceScaleFactor: 1 });
    assert.deepEqual(row.boundaries.map(b => b.state), ['opened', 'item-held', 'item-clicked', 'reset-outside', 'reopened', 'arrow-down', 'escape']);
    for (const boundary of row.boundaries) for (const receipt of [boundary.inputTree, boundary.screenshot]) {
      assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
    }
    const states = Object.fromEntries(row.boundaries.map(b => [b.state, b.observation]));
    assert.equal(states['reset-outside'].open, false); assert.equal(states.reopened.open, true);
    assert.equal(states['arrow-down'].open, true); assert.equal(states.escape.open, false);
    if (row.mode === 'reference') {
      assert.equal(states.reopened.active.text, 'Rename'); assert.equal(states['arrow-down'].active.text, 'Delete');
      assert.equal(states['item-clicked'].open, false);
    } else {
      assert.equal(states.reopened.active.astylarId, 'menu-primary');
      assert.equal(states['arrow-down'].active.astylarId, 'menu-primary');
      assert.equal(states['item-clicked'].open, true);
      assert.ok(states['arrow-down'].events.some(e => e.type === 'keydown' && e.targetId === 'menu-primary'));
    }
    const held = row.boundaries.find(b => b.state === 'item-held');
    const heldTree = JSON.parse(readFileSync(held.inputTree.file));
    if (row.mode === 'reference') {
      const ripple = heldTree.nodes.filter(n => (n.attributes?.class || '').split(' ').includes('mat-ripple-element'));
      assert.equal(ripple.length, 1);
      assert.equal(heldTree.styles[ripple[0].style].backgroundColor, 'color(srgb 0.113725 0.105882 0.117647 / 0.1)');
      assert.equal(heldTree.styles[ripple[0].style].opacity, '1');
      const item = heldTree.nodes.find(n => n.key === 'overlay:0/1/0/0/0/0');
      assert.equal(heldTree.styles[item.style].backgroundColor, 'color(srgb 0.113725 0.105882 0.117647 / 0.08)');
    } else {
      const item = heldTree.nodes.find(n => n.authored?.id === 'menu-rename');
      assert.equal(item.interactionResolvedStyle.background, '#d8d3d8');
      assert.equal(heldTree.nodes.filter(n => n.parent === item.key).length, 1); // Label only; no authored ripple layer.
    }
    const png = PNG.sync.read(readFileSync(held.screenshot.file));
    const point = { x: 167, y: row.mode === 'reference' ? 253 : 254 };
    const expectedColor = row.mode === 'reference' ? [205, 200, 204, 255] : [216, 211, 216, 255];
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const offset = ((point.y + dy) * png.width + point.x + dx) * 4;
      assert.deepEqual([...png.data.subarray(offset, offset + 4)], expectedColor);
    }
  }
});

test('remaining menu action cohorts retain matched context coverage without repeating light DPR1', t => {
  const file = 'artifacts/material-parity/menu-actions-remaining-20261008/latest-report.json';
  const report = JSON.parse(readFileSync(file)), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.equal(report.results.length, 14);
  const cohorts = materialInteractionCases.filter(c => c.family === 'menu' && c.state === 'open-hover-content' && !(c.profile === 'light' && c.viewport.deviceScaleFactor === 1));
  const key = c => JSON.stringify([c.profile, c.viewport]);
  assert.equal(cohorts.length, 7);
  const pairs = [];
  const files = new Set();
  for (const cohort of cohorts) {
    const rows = report.results.filter(r => key(r) === key(cohort));
    assert.deepEqual(rows.map(r => r.mode), ['reference', 'astylar']);
    for (const row of rows) {
      assert.deepEqual(row.boundaries.map(b => b.state), ['opened', 'item-held', 'item-clicked', 'reset-outside', 'reopened', 'arrow-down', 'escape']);
      const states = Object.fromEntries(row.boundaries.map(b => [b.state, b.observation]));
      assert.equal(states.opened.open, true); assert.equal(states['reset-outside'].open, false);
      assert.equal(states.reopened.open, true); assert.equal(states['arrow-down'].open, true); assert.equal(states.escape.open, false);
      assert.equal(states['item-clicked'].open, row.mode === 'astylar');
      if (row.mode === 'reference') {
        assert.equal(states.reopened.active.text, 'Rename'); assert.equal(states['arrow-down'].active.text, 'Delete');
      } else {
        assert.equal(states.reopened.active.astylarId, 'menu-primary'); assert.equal(states['arrow-down'].active.astylarId, 'menu-primary');
      }
      for (const boundary of row.boundaries) for (const receipt of [boundary.inputTree, boundary.screenshot]) {
        assert.ok(!files.has(receipt.file)); files.add(receipt.file);
        assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
      }
    }
    for (let index = 0; index < 7; index++) pairs.push({
      reference: { runtime: rows[0].runtime, inputTree: rows[0].boundaries[index].inputTree },
      astylar: { runtime: rows[1].runtime, inputTree: rows[1].boundaries[index].inputTree },
    });
  }
  assert.equal(files.size, 196);
  assert.deepEqual(validateSupplementalCapture({ ...report, results: pairs }, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-menu-actions-remaining.mjs', styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.inputEquivalent, false);
  t.diagnostic(JSON.stringify({ remainingPhysicalContexts: cohorts.map(key), boundariesPerSide: 7,
    scope: 'Seven supplemental physical context joins plus separately retained light DPR1; not the same action as configured open-hover-content or complete Menu closure' }));
});

test('menu keyboard remainder authenticates eight contexts without promoting unequal focus activation', t => {
  const file = 'artifacts/material-parity/menu-keyboard-remainder-20261008/latest-report.json';
  const report = JSON.parse(readFileSync(file)), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const cohorts = materialInteractionCases.filter(c => c.family === 'menu' && c.state === 'open-hover-content');
  assert.equal(cohorts.length, 8); assert.equal(report.results.length, 16);
  const key = c => JSON.stringify([c.profile, c.viewport]);
  const expectedStates = ['navigation-open', 'navigation-ArrowUp', 'navigation-Home', 'navigation-End', 'navigation-r',
    'tab-open', 'tab', 'enter-open', 'enter', 'space-open', 'space'];
  const pairs = [], files = new Set();
  for (const cohort of cohorts) {
    const rows = report.results.filter(r => key(r) === key(cohort));
    assert.deepEqual(rows.map(r => r.mode), ['reference', 'astylar']);
    for (const row of rows) {
      assert.deepEqual(row.boundaries.map(b => b.state), expectedStates);
      const states = Object.fromEntries(row.boundaries.map(b => [b.state, b.observation]));
      for (const state of ['navigation-open', 'tab-open', 'enter-open', 'space-open']) {
        assert.equal(states[state].open, true);
        if (row.mode === 'reference') assert.equal(states[state].active.text, 'Rename');
        else assert.equal(states[state].active.astylarId, 'menu-primary');
      }
      for (const [state, nativeText] of [['navigation-ArrowUp', 'Delete'], ['navigation-Home', 'Rename'], ['navigation-End', 'Delete']]) {
        assert.equal(states[state].open, true);
        if (row.mode === 'reference') assert.equal(states[state].active.text, nativeText);
        else assert.equal(states[state].active.astylarId, 'menu-primary');
      }
      assert.equal(states.tab.open, row.mode === 'astylar');
      if (row.mode === 'astylar') assert.equal(states.tab.active.astylarId, 'menu-rename');
      assert.equal(states.enter.open, false); assert.equal(states.space.open, false);
      // Enter/Space start on different controls; equal dismissal is not equal item activation.
      // The r snapshot is immediate after generic settlement, not a timed typeahead acceptance.
      for (const boundary of row.boundaries) for (const receipt of [boundary.inputTree, boundary.screenshot]) {
        assert.ok(!files.has(receipt.file)); files.add(receipt.file);
        assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
      }
    }
    for (let index = 0; index < expectedStates.length; index++) pairs.push({
      reference: { runtime: rows[0].runtime, inputTree: rows[0].boundaries[index].inputTree },
      astylar: { runtime: rows[1].runtime, inputTree: rows[1].boundaries[index].inputTree },
    });
  }
  assert.equal(files.size, 352);
  assert.deepEqual(validateSupplementalCapture({ ...report, results: pairs }, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-menu-keyboard-remainder.mjs', styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.inputEquivalent, false);
  t.diagnostic('Eight desktop contexts: ArrowUp/Home/End and Tab observed; item activation/typeahead timing/mobile/full paint remain unclosed');
});

test('matched menu item keys bind real focus activation and delayed typeahead across eight contexts', t => {
  const file = 'artifacts/material-parity/menu-item-keys-20261008/latest-report.json';
  const report = JSON.parse(readFileSync(file)), manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  const mapName = 'chunk-I6KBSG37.js.map', mapBytes = readFileSync(`examples/material-showcase/dist/material-showcase/browser/${mapName}`);
  assert.equal(createHash('sha256').update(mapBytes).digest('hex'), manifest.provenance.browserFiles.find(f => f.file === mapName).sha256);
  const map = JSON.parse(mapBytes), manager = map.sourcesContent[map.sources.indexOf('node_modules/@angular/cdk/fesm2022/list-key-manager-C7tp3RbG.mjs')];
  assert.ok(manager.includes('withTypeAhead(debounceInterval = 200)'));
  const cohorts = materialInteractionCases.filter(c => c.family === 'menu' && c.state === 'open-hover-content');
  assert.equal(cohorts.length, 8); assert.equal(report.results.length, 16);
  const key = c => JSON.stringify([c.profile, c.viewport]);
  const expectedStates = ['enter-item-ready', 'enter-item', 'space-item-ready', 'space-item', 'typeahead-ready', 'typeahead-immediate', 'typeahead-delayed'];
  const pairs = [], files = new Set();
  for (const cohort of cohorts) {
    const rows = report.results.filter(r => key(r) === key(cohort));
    assert.deepEqual(rows.map(r => r.mode), ['reference', 'astylar']);
    for (const row of rows) {
      assert.deepEqual(row.boundaries.map(b => b.state), expectedStates);
      const states = Object.fromEntries(row.boundaries.map(b => [b.state, b.observation]));
      for (const state of ['enter-item-ready', 'space-item-ready']) {
        assert.equal(states[state].open, true); assert.equal(states[state].active.text, 'Rename');
      }
      assert.equal(states['typeahead-ready'].open, true); assert.equal(states['typeahead-ready'].active.text, 'Delete');
      for (const [state, keyName] of [['enter-item', 'Enter'], ['space-item', ' ']]) {
        const event = states[state].keyEvents.at(-1);
        assert.equal(event.key, keyName); assert.equal(event.trusted, true); assert.equal(event.text, 'Rename');
        assert.equal(states[state].open, row.mode === 'astylar');
        if (row.mode === 'reference') assert.equal(states[state].active.id, 'menu-primary');
        else assert.equal(states[state].active.astylarId, 'menu-rename');
      }
      const typed = states['typeahead-immediate'].keyEvents.at(-1);
      assert.equal(typed.key, 'r'); assert.equal(typed.trusted, true); assert.equal(typed.text, 'Delete');
      assert.ok(row.boundaries.at(-1).elapsedAfterImmediateMs >= 500);
      assert.equal(states['typeahead-immediate'].open, true);
      assert.equal(states['typeahead-immediate'].active.text, 'Delete');
      assert.equal(states['typeahead-delayed'].open, true);
      assert.equal(states['typeahead-delayed'].active.text, row.mode === 'reference' ? 'Rename' : 'Delete');
      for (const boundary of row.boundaries) for (const receipt of [boundary.inputTree, boundary.screenshot]) {
        assert.ok(!files.has(receipt.file)); files.add(receipt.file);
        assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256);
      }
    }
    for (let index = 0; index < expectedStates.length; index++) pairs.push({
      reference: { runtime: rows[0].runtime, inputTree: rows[0].boundaries[index].inputTree },
      astylar: { runtime: rows[1].runtime, inputTree: rows[1].boundaries[index].inputTree },
    });
  }
  assert.equal(files.size, 224);
  assert.deepEqual(validateSupplementalCapture({ ...report, results: pairs }, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-menu-item-keys.mjs', styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  assert.equal(report.inputEquivalent, false);
});

test('configured menu bounds authenticate exact runner actions and eight context receipts', t => {
  const file = 'artifacts/material-parity/configured-menu-bounds-final-20261008/latest-report.json';
  const report = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-configured-menu-bounds.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const action = report.actionSource, runner = readFileSync(action.file);
  assert.equal(hash(runner), action.sha256);
  assert.equal(action.sha256, manifest.provenance.harnessFiles.find(f => f.file === action.file).sha256);
  const names = ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied', 'settleInteraction', 'popupHoverBox', 'interactionTargetBox', 'performInteraction'];
  assert.deepEqual(action.functionNames, names);
  const ast = ts.createSourceFile(action.file, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const bodies = names.map(name => {
    const nodes = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(ast);
  });
  assert.equal(hash(bodies.join('\n')), action.functionBodiesSha256);
  const dependency = action.cursorDependency;
  assert.equal(hash(readFileSync(dependency.file)), dependency.sha256);
  assert.equal(dependency.sha256, manifest.provenance.harnessFiles.find(f => f.file === dependency.file).sha256);
  const expected = materialInteractionCases.filter(c => c.family === 'menu' && c.state === 'open-hover-content').map(c => materialCaseKey('interaction', c));
  assert.equal(expected.length, 8);
  assert.deepEqual(report.results.map(r => r.caseId).sort(), expected.sort());
  const receipts = new Set(), observations = [];
  for (const row of report.results) {
    assert.equal(row.caseId, materialCaseKey('interaction', row));
    for (const side of ['reference', 'astylar']) {
      const result = row[side];
      for (const receipt of [result.screenshot, result.inputTree]) {
        assert.ok(!receipts.has(receipt.file)); receipts.add(receipt.file);
        assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
      }
      assert.deepEqual(JSON.parse(readFileSync(result.inputTree.file)).errors, []);
      assert.equal(result.observation.options.length, 2);
      for (const box of [result.observation.primary, result.observation.popup, ...result.observation.options.map(o => o.box)]) {
        for (const key of ['x', 'y', 'width', 'height']) assert.ok(Number.isFinite(box[key]));
        assert.ok(box.width > 0 && box.height > 0);
      }
    }
    assert.deepEqual(row.reference.observation.options.map(o => o.text), ['Rename', 'Delete']);
    assert.deepEqual(row.reference.observation.options.map(o => o.hover), [true, false]);
    const candidateTree = JSON.parse(readFileSync(row.astylar.inputTree.file));
    const hovered = candidateTree.nodes.find(n => n.authored?.id === 'menu-rename');
    const inactive = candidateTree.nodes.find(n => n.authored?.id === 'menu-delete');
    assert.equal(hovered.normalResolvedStyle.background, 'transparent');
    assert.equal(hovered.interactionResolvedStyle.background, '#e1dbe0');
    assert.equal(inactive.interactionResolvedStyle.background, 'transparent');
    for (const side of ['reference', 'astylar']) {
      const png = PNG.sync.read(readFileSync(row[side].screenshot.file));
      const scale = row.viewport.deviceScaleFactor;
      assert.equal(png.width, row.viewport.width * scale);
      const expectedColors = [[225, 219, 224, 255], [242, 236, 241, 255]];
      row[side].observation.options.forEach((option, index) => {
        // Five CSS-pixel square away from text, borders and corners; not a glyph/edge acceptance metric.
        const x = Math.round((option.box.x + option.box.width - 10) * scale);
        const y = Math.round((option.box.y + 24) * scale);
        for (let dy = -2 * scale; dy <= 2 * scale; dy++) for (let dx = -2 * scale; dx <= 2 * scale; dx++) {
          const offset = ((y + dy) * png.width + x + dx) * 4;
          assert.deepEqual([...png.data.subarray(offset, offset + 4)], expectedColors[index]);
        }
      });
    }
    const referenceTree = JSON.parse(readFileSync(row.reference.inputTree.file));
    const nativeLabel = referenceTree.nodes.find(n => n.type === 'span' && n.ownText === 'Rename');
    const candidateLabel = candidateTree.nodes.find(n => n.authored?.id === 'menu-rename-label');
    assert.equal(referenceTree.styles[nativeLabel.style].letterSpacing, '0.096px');
    assert.equal(candidateLabel.resolvedStyle.letterSpacing, undefined);
    observations.push({ caseId: row.caseId, reference: row.reference.observation, astylar: row.astylar.observation });
  }
  assert.equal(receipts.size, 32);
  const mapFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-JPEJK334.js.map';
  const mapBytes = readFileSync(mapFile), map = JSON.parse(mapBytes);
  assert.equal(hash(mapBytes), manifest.provenance.browserFiles.find(f => f.file === path.basename(mapFile)).sha256);
  const captured = map.sources.flatMap((name, i) => name === 'src/app/astylar.component.ts' ? [map.sourcesContent[i]] : []);
  assert.equal(captured.length, 1);
  assert.equal(captured[0].replace(/\r\n/g, '\n'), readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8').replace(/\r\n/g, '\n'));
  const anchorInputs = [];
  for (const row of report.results) {
    const native = JSON.parse(readFileSync(row.reference.inputTree.file));
    const candidate = JSON.parse(readFileSync(row.astylar.inputTree.file));
    const popup = candidate.nodes.find(n => n.authored?.id === 'menu-popup');
    const rule = candidate.rules.filter(r => r.selector === '#menu-popup');
    assert.equal(rule.length, 1);
    const top = row.profile === 'contrast' ? 54 : row.profile === 'custom' ? 58 : 69;
    const height = row.profile === 'contrast' ? 111 : row.profile === 'custom' ? 110 : 112;
    assert.equal(rule[0].top, `${top}px`); assert.equal(rule[0].height, `${height}px`);
    assert.equal(popup.resolvedStyle.top, rule[0].top); assert.equal(popup.resolvedStyle.height, rule[0].height);
    const panel = native.nodes.find(n => (n.attributes?.class || '').split(' ').includes('mat-mdc-menu-panel'));
    assert.equal(native.styles[panel.style].height, '112px');
    const gaps = {};
    for (const side of ['reference', 'astylar']) {
      const { primary, popup: box } = row[side].observation;
      gaps[side] = box.y - primary.y - primary.height;
    }
    assert.ok(Math.abs(gaps.reference) < 1e-7);
    assert.ok(Math.abs(gaps.astylar - (row.profile === 'contrast' || row.profile === 'custom' ? 2 : 1)) < 1e-7);
    assert.ok(Math.abs(row.astylar.observation.popup.height - height) < 1e-7);
    anchorInputs.push({ caseId: row.caseId, gaps, candidateAuthoredTop: rule[0].top,
      candidateAuthoredHeight: rule[0].height, referenceUsedHeight: native.styles[panel.style].height });
  }
  t.diagnostic(JSON.stringify({ anchorInputs, classification: 'Unequal fixed candidate placement/height inputs; not an isolated equal-input renderer defect',
    sourceApplicability: 'Complete current application source equals authenticated served source; core pipeline applicability remains separate' }));
  const referenceMapFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-7SL66K3U.js.map';
  const referenceMapBytes = readFileSync(referenceMapFile), referenceMap = JSON.parse(referenceMapBytes);
  assert.equal(hash(referenceMapBytes), manifest.provenance.browserFiles.find(f => f.file === path.basename(referenceMapFile)).sha256);
  const materialSource = referenceMap.sources.flatMap((name, i) => name === 'node_modules/@angular/material/fesm2022/menu.mjs' ? [referenceMap.sourcesContent[i]] : []);
  assert.equal(materialSource.length, 1);
  const parsedMaterial = ts.createSourceFile('menu.js', materialSource[0], ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const methods = [];
  const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(parsedMaterial) === '_setPosition') methods.push(node.getText(parsedMaterial)); ts.forEachChild(node, visit); };
  visit(parsedMaterial); assert.equal(methods.length, 1);
  const Owner = new Function(`return class Owner {${methods[0]}}`)();
  const owner = new Owner(); owner.triggersSubmenu = () => false;
  let positions;
  const factories = parsedMaterial.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'MAT_MENU_DEFAULT_OPTIONS_FACTORY');
  assert.equal(factories.length, 1);
  const defaults = new Function(`${factories[0].getText(parsedMaterial)};return MAT_MENU_DEFAULT_OPTIONS_FACTORY();`)();
  assert.deepEqual(defaults, { overlapTrigger: false, xPosition: 'after', yPosition: 'below', backdropClass: 'cdk-overlay-transparent-backdrop' });
  owner._setPosition(defaults, { withPositions: value => { positions = value; } });
  assert.equal(positions.length, 4);
  assert.deepEqual(positions[0], { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 0 });
  const referenceSources = referenceMap.sources.flatMap((name, i) => name === 'src/app/reference.component.ts' ? [referenceMap.sourcesContent[i]] : []);
  assert.equal(referenceSources.length, 1);
  assert.equal(referenceSources[0].replace(/\r\n/g, '\n'), readFileSync('examples/material-showcase/src/app/reference.component.ts', 'utf8').replace(/\r\n/g, '\n'));
  assert.ok(referenceSources[0].includes('[matMenuTriggerFor]="menu"'));
  assert.ok(captured[0].includes("if (family === 'menu') return [{ type: 'button', id: 'menu-primary'"));
  const candidateTrigger = JSON.parse(readFileSync(report.results[0].astylar.inputTree.file)).nodes.find(n => n.authored?.id === 'menu-primary');
  assert.equal(candidateTrigger.authored.ariaControls, 'menu-popup');
  t.diagnostic(JSON.stringify({ referenceAnchorPositions: positions,
    ownership: 'Captured Material trigger strategy relates trigger bottom to overlay top with zero offset and fallbacks; candidate uses sibling div fixed CSS top. ariaControls records semantics, not proof of layout anchoring.',
    limitation: 'Non-submenu default branch only; no fallback collision runtime or proposed new API acceptance' }));
  const coreMapFile = 'examples/material-showcase/dist/material-showcase/browser/chunk-3JXWRYJY.js.map';
  const coreMapBytes = readFileSync(coreMapFile), coreMap = JSON.parse(coreMapBytes);
  assert.equal(hash(coreMapBytes), manifest.provenance.browserFiles.find(f => f.file === path.basename(coreMapFile)).sha256);
  const relative = 'app/services/dom/elements/element-dimension.service';
  const current = readFileSync(`src/${relative}.ts`, 'utf8');
  const emitted = ts.transpileModule(current, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  const installed = readFileSync(`examples/material-showcase/node_modules/astylarui/dist/lib/${relative}.js`, 'utf8');
  const served = coreMap.sources.flatMap((name, i) => name.endsWith(`/${relative}.js`) ? [coreMap.sourcesContent[i]] : []);
  assert.equal(served.length, 1);
  const coreMethod = (code, name) => {
    const parsed = ts.createSourceFile('owner.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS), found = [];
    const visit = node => { if (ts.isMethodDeclaration(node) && node.name.getText(parsed) === name) found.push(node.getText(parsed)); ts.forEachChild(node, visit); };
    visit(parsed); assert.equal(found.length, 1);
    return transformSync(`class Owner {${found[0]}}`, { loader: 'js', target: 'es2022', legalComments: 'none', minifyWhitespace: true }).code;
  };
  const boundMethods = ['resolveLayoutParent', 'calculateDimensions', 'parsePositionLength'];
  for (const name of boundMethods) {
    assert.equal(coreMethod(emitted, name), coreMethod(installed, name));
    assert.equal(coreMethod(served[0], name), coreMethod(installed, name));
  }
  const LayoutOwner = new Function(`${coreMethod(served[0], 'resolveLayoutParent')};return Owner;`)();
  const parent = { name: 'menu-root' }, root = { name: 'root-body' };
  assert.equal(new LayoutOwner().resolveLayoutParent({ context: { elements: new Map([['root-body', root]]) } }, { position: 'absolute' }, parent), parent);
  t.diagnostic(JSON.stringify({ layoutOwner: relative, methods: boundMethods,
    conclusion: 'Absolute popup retains supplied parent; complete bound dimension method calculates offsets from parent border inset, not ariaControls trigger lookup',
    limitation: 'Owning method applicability and parent routing only; not execution of complete layout/projection or global connected-overlay API absence' }));
  const applicationAst = ts.createSourceFile('application.ts', captured[0], ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const applicationClass = applicationAst.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'AstylarShowcaseComponent');
  assert.ok(applicationClass);
  const handlers = ['handleClick', 'handleKeydown', 'dismissPopupForOutsideTarget'].map(name => {
    const nodes = applicationClass.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(applicationAst) === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(applicationAst);
  });
  const handlerCode = ts.transpileModule(`class HandlerOwner {${handlers.join('\n')}}`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const HandlerOwner = new Function(`${handlerCode};return HandlerOwner;`)();
  let state = { open: true, disabled: false }, focusCalls = [], patches = [];
  const handlerOwner = new HandlerOwner();
  Object.assign(handlerOwner, { benchmarkMode: false, family: () => 'menu',
    store: { state: () => state, patchState: patch => { patches.push(patch); state = { ...state, ...patch }; } },
    surface: { focus: (...args) => focusCalls.push(args) }, status: { set: () => {} } });
  for (const key of ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Tab', 'Enter', ' ']) handlerOwner.handleKeydown('menu-rename', { key });
  assert.deepEqual(patches, []); assert.deepEqual(focusCalls, []);
  for (const id of ['menu-rename', 'menu-delete']) handlerOwner.handleClick(id, { targetId: id });
  assert.equal(state.open, true); assert.deepEqual(patches, []);
  handlerOwner.handleKeydown('menu-rename', { key: 'Escape' });
  assert.deepEqual(patches, [{ open: false }]);
  assert.deepEqual(focusCalls, [['menu-primary', { focusVisible: true }]]);
  t.diagnostic(JSON.stringify({ applicationHandlers: ['handleClick', 'handleKeydown', 'dismissPopupForOutsideTarget'],
    menuItemClickCloses: false, navigationKeysHandledByApplication: false, escapeClosesAndRestores: true,
    scope: 'Complete authenticated current/served application handlers with controlled store/surface; not browser/core keyboard delivery or historical trace current applicability' }));
  assert.equal(report.inputEquivalent, false); assert.equal(report.renderingEquivalent, false);
  t.diagnostic(JSON.stringify({ observations, acceptance: false,
    scope: 'Eight configured menu open-hover-content bounds observations only; not equal input, current whole-pipeline validity or remaining menu actions' }));
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
