import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

// This is a retained-data boundary check, not a fresh browser observation or
// a replacement for paired, action-timed DOM/renderer focus measurements.
const capture = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const captureSha = 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62';
const families = ['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker'];
const profiles = ['light', 'dark', 'contrast', 'custom'];
const viewports = ['desktop-dpr1', 'desktop-dpr2'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('configured focus dependency transition preserves semantic owner and maintained action bytes', t => {
  const load = (file, sha) => {
    const bytes = readFileSync(file); assert.equal(hash(bytes), sha, file);
    return JSON.parse(bytes);
  };
  const current = load('artifacts/material-parity/configured-input-focus-boundaries-20261024/latest-report.json',
    '8e176417defd6d8bbd2f9276adc8d37828867fce006cf80b4a74e4034aa9d118');
  const inputs = [
    ['text-input-focus-events-bound-20261019', '21387e63992d907e6a5675a0c3bad150c5face9073d9f1d39d42c146279f6cd0', 24],
    ['picker-focus-mutations-bound-20261019', 'b649d152f7bed697890045bac86f03b59d6aa67f99a6acc9c88a50b3936cb123', 16],
  ];
  const manifest = report => load(report.capture.checkpointManifest.file, report.capture.checkpointManifest.sha256);
  const next = manifest(current);
  const oldRoot = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser/';
  const newRoot = 'examples/material-showcase/dist/material-showcase/browser/';
  let previous;
  for (const [name, sha, count] of inputs) {
    const report = load(`artifacts/material-parity/${name}/latest-report.json`, sha);
    const prior = manifest(report); previous ??= prior;
    assert.deepEqual(prior.provenance.browserFiles, previous.provenance.browserFiles);
    assert.equal(report.results.length, count);
    for (const row of report.results) {
      assert.ok(current.results.some(candidate => candidate.caseId === row.caseId));
      const losses = row.astylar.observations.at(-1).events.filter(event => event.type === 'blur' && event.target.tag === 'INPUT');
      assert.equal(losses.length, 1);
      assert.equal(losses[0].mutation.method, 'replaceChildren');
      assert.equal(losses[0].mutation.target.logicalId, row.family + '-primary');
      assert.match(losses[0].mutation.stack, /\.reconcileElement \(/);
    }
    // Text capture includes measureAstylarInputs after the action observations;
    // it does not use a different action runner or focus implementation.
    assert.equal(report.actionSource.sha256, current.actionSource.sha256);
  }
  const oldFiles = new Map(previous.provenance.browserFiles.map(row => [row.file, row.sha256]));
  const newFiles = new Map(next.provenance.browserFiles.map(row => [row.file, row.sha256]));
  assert.equal(oldFiles.size, 1887); assert.equal(newFiles.size, 1887);
  assert.deepEqual([...oldFiles.keys()].filter(file => !newFiles.has(file)).sort(),
    ['chunk-3JXWRYJY.js', 'chunk-3JXWRYJY.js.map', 'chunk-JPEJK334.js', 'chunk-JPEJK334.js.map']);
  assert.deepEqual([...newFiles.keys()].filter(file => oldFiles.get(file) !== newFiles.get(file)).sort(),
    ['chunk-PCHQTLJM.js', 'chunk-PCHQTLJM.js.map', 'chunk-XOU37TRR.js', 'chunk-XOU37TRR.js.map', 'compare/index.html', 'index.csr.html', 'main.js']);
  for (const file of ['main.js', 'index.csr.html', 'compare/index.html']) {
    const a = readFileSync(oldRoot + file), b = readFileSync(newRoot + file);
    assert.equal(hash(a), oldFiles.get(file)); assert.equal(hash(b), newFiles.get(file));
    assert.equal(b.toString().replaceAll('chunk-XOU37TRR', 'chunk-3JXWRYJY')
      .replaceAll('chunk-PCHQTLJM', 'chunk-JPEJK334'), a.toString());
  }
  const runner = Buffer.from(current.sourceRecipe.actionRunnerSnapshot.base64, 'base64');
  assert.equal(hash(runner), current.actionSource.sha256);
  const ast = ts.createSourceFile('runner.mjs', runner.toString(), 99, true, ts.ScriptKind.JS);
  const names = ['performInteraction', 'interactionTargetBox', 'settleInteraction', 'profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied'];
  const methods = list => list.map(name => {
    const nodes = ast.statements.filter(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
    assert.equal(nodes.length, 1); return nodes[0].getText(ast);
  }).join('\n');
  assert.equal(hash(methods(names)), current.actionSource.methodsSha256);
  assert.equal(hash(methods([...names, 'measureAstylarInputs'])),
    'a1680f600c223e2d6c538a170954573f14a35a23ada78c35d0c9fbedacde7d88');
  const mapped = [];
  for (const [oldName, newName, expectedChanged] of [
    ['chunk-3JXWRYJY.js.map', 'chunk-XOU37TRR.js.map', 'node_modules/astylarui/dist/lib/lib/astylar.js'],
    ['chunk-JPEJK334.js.map', 'chunk-PCHQTLJM.js.map', 'src/app/material-input-evidence.ts'],
  ]) {
    const a = load(oldRoot + oldName, previous.provenance.browserFiles.find(row => row.file === oldName).sha256);
    const b = load(newRoot + newName, next.provenance.browserFiles.find(row => row.file === newName).sha256);
    assert.deepEqual(a.sources, b.sources);
    const changed = a.sources.filter((source, index) => a.sourcesContent[index] !== b.sourcesContent[index]);
    assert.deepEqual(changed, [expectedChanged]);
    const index = a.sources.indexOf(expectedChanged);
    mapped.push({ source: expectedChanged, before: hash(a.sourcesContent[index]), after: hash(b.sourcesContent[index]) });
    let restored = b.sourcesContent[index];
    const additions = oldName === 'chunk-3JXWRYJY.js.map' ? [
      '      const layoutMesh = element.id && authoredById.get(element.id) === element ? this.elementManager.elementsMap.get(element.id) : undefined;\n      const retainedDimensions = layoutMesh ? this.elementManager.getElementDimensions(layoutMesh.name) : undefined;\n',
      "        ...(retainedDimensions ? {\n          retainedLayout: {\n            source: 'core-dimension-registry',\n            ...structuredClone(retainedDimensions)\n          }\n        } : {}),\n",
    ] : [
      "  retainedLayout?: AstylarResolvedStyleSnapshot['elements'][number]['retainedLayout'];\n",
      '      ...(entry.retainedLayout ? { retainedLayout: structuredClone(entry.retainedLayout) } : {}),\n',
      '      // Registry observations remain numeric and distinct from authored styles\n      // and projected geometry. Missing observations must stay missing.\n      ...(inspected?.retainedLayout ? { retainedLayout: structuredClone(inspected.retainedLayout) } : {}),\n',
    ];
    for (const addition of additions) {
      assert.equal(restored.split(addition).length, 2, 'Only the reviewed diagnostic addition may be removed');
      restored = restored.replace(addition, '');
    }
    assert.equal(restored, a.sourcesContent[index], 'Complete predecessor module must recover');
    if (oldName === 'chunk-3JXWRYJY.js.map') {
      const bridge = a.sources.findIndex(source => source.endsWith('/lib/astylar-semantic-bridge.js'));
      assert.ok(bridge >= 0); assert.equal(hash(a.sourcesContent[bridge]),
        '590d49a2a4d5e205c10cf18a1e2e45a3f768079afad86f5ea330f7c6136088e8');
      assert.equal(a.sourcesContent[bridge], b.sourcesContent[bridge]);
      const manager = b.sourcesContent[b.sources.findIndex(source => source.endsWith('/element-manager.service.js'))];
      const parsed = ts.createSourceFile('manager.js', manager, 99, true, ts.ScriptKind.JS);
      const getters = [];
      const visit = node => {
        if (ts.isMethodDeclaration(node) && node.name.getText(parsed) === 'getElementDimensions') getters.push(node.getText(parsed));
        ts.forEachChild(node, visit);
      };
      visit(parsed);
      assert.deepEqual(getters, ['getElementDimensions(id) {\n    return this.elementDimensions.get(id);\n  }']);
    }
  }
  t.diagnostic(JSON.stringify({ cases: 40, mapped,
    conclusion: 'Complete semantic module and six action methods preserve; text hash difference is the seventh measurement helper. Two mapped modules recover completely by removing five read-only retained-layout diagnostic additions; dimension getter is a Map read. Not a fresh first-loss stack or whole-pipeline acceptance claim.' }));
});
const trees = new Map();
let retained;

function loadCapture() {
  if (retained) return retained;
  const bytes = readFileSync(capture);
  assert.equal(hash(bytes), captureSha);
  retained = JSON.parse(bytes);
  // Pin the recorded producer identity. This does not recover its missing
  // original bytes or assert that today's runner implements that procedure.
  assert.equal(retained.captureProvenance.harnessFiles.find(row =>
    row.file === 'tests/material-parity/run-material-parity.mjs').sha256,
  'e01ef9dc44386d93885ca06428da0b8b42ccb8bad37f9de99bdd61a5c95c6eb0');
  return retained;
}

function tree(receipt) {
  const key = `${receipt.file}:${receipt.sha256}`;
  if (!trees.has(key)) {
    const bytes = readFileSync(receipt.file);
    assert.equal(hash(bytes), receipt.sha256, receipt.file);
    trees.set(key, JSON.parse(bytes));
  }
  return trees.get(key);
}

function inspectSnapshot(row) {
  const primary = `${row.family}-primary`;
  assert.deepEqual(row.focus, { reference: primary, astylar: primary, matches: true });
  const referenceEvents = row.eventComparison.reference.map(event => event.type);
  const candidateEvents = row.eventComparison.astylar.map(event => event.type);
  const reportedPointerFocus = referenceEvents.includes('pointerdown');
  const relevant = events => events.filter(type =>
    ['pointerdown', 'focus', 'pointerup', 'click'].includes(type));
  assert.deepEqual(referenceEvents, reportedPointerFocus
    ? ['pointerdown', 'focus', 'pointerup', 'click'] : ['focus']);
  assert.deepEqual(relevant(candidateEvents), referenceEvents,
    'Reported pointer/focus modality must not be substituted');
  assert.equal(row.resourceSnapshots.length, 1, 'Only one retained snapshot is claimed');
  const snapshot = row.resourceSnapshots[0];
  for (const field of ['phase', 'label', 'timestamp']) {
    assert.equal(Object.hasOwn(snapshot, field), false, 'Do not invent a timed endpoint');
  }
  const logicalId = snapshot.surface.interaction.focusedElementId;
  assert.equal(logicalId, `${row.family}-control`, 'Wrong recorded logical focus owner');
  assert.equal(typeof snapshot.surface.interaction.focusVisible, 'boolean');
  const candidate = tree(row.inputTrees.astylar);
  const owner = candidate.nodes.find(node => node.authored?.id === logicalId);
  assert.equal(owner?.authored.type, 'input', 'Logical owner must be the declared input');
  const byKey = new Map(candidate.nodes.map(node => [node.key, node]));
  const seen = new Set(), ancestors = [];
  for (let node = owner; node; node = byKey.get(node.parent)) {
    assert.equal(seen.has(node.key), false, 'Cyclic input-owner ancestry');
    seen.add(node.key); ancestors.push(node.authored?.id);
  }
  assert.ok(ancestors.includes(primary), 'Input must belong to the expected component');
  const reference = tree(row.inputTrees.reference);
  const host = reference.nodes.find(node => node.attributes?.id === primary);
  assert.ok(host);
  const inputs = reference.nodes.filter(node => node.type === 'input' &&
    (node.key === host.key || node.key.startsWith(`${host.key}/`)));
  assert.equal(inputs.length, 1, 'Declared native input correspondence only');
  return { focusVisible: snapshot.surface.interaction.focusVisible, reportedPointerFocus };
}

test('retained input focus snapshots bind declared logical owners without proving paired DOM focus', t => {
  const rows = loadCapture().interactions.filter(row =>
    families.includes(row.family) && row.state === 'focus');
  const key = row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/focus`;
  const expected = families.flatMap(family => profiles.flatMap(profile =>
    viewports.map(viewport => `interaction:${family}@${profile}/${viewport}/focus`)));
  assert.equal(rows.length, 40);
  assert.deepEqual(rows.map(key).sort(), expected.sort());
  const visibilityFalse = [];
  for (const row of rows) {
    const result = inspectSnapshot(row);
    assert.equal(result.reportedPointerFocus, row.family === 'timepicker');
    if (!result.focusVisible) visibilityFalse.push(key(row));
  }
  // Preserve the observed eight false flags; this is not expected-correct UI
  // behavior or a painted-focus measurement. All normalized matches are true.
  assert.deepEqual(visibilityFalse.sort(), profiles.flatMap(profile => viewports.map(viewport =>
    `interaction:timepicker@${profile}/${viewport}/focus`)).sort());
  t.diagnostic('40 exact historical cases; 80 authenticated trees; renderer logical input owners map inside the expected components. The32 focus-callback-only rows have focusVisible=true;all8 Timepicker rows report pointer/focus callbacks and focusVisible=false. Full raw pointerenter/move records remain preserved. Matching component IDs and unlabelled snapshots do not prove event trust, paired DOM owners, action ordering, focus paint, current rendering or case closure.');
});

test('matching normalized IDs cannot conceal wrong owners, missing modality or fabricated timing', () => {
  const row = loadCapture().interactions.find(row => row.family === 'autocomplete' &&
    row.profile === 'light' && row.viewport.id === 'desktop-dpr1' && row.state === 'focus');
  const wrongOwner = structuredClone(row);
  wrongOwner.resourceSnapshots[0].surface.interaction.focusedElementId = 'autocomplete-primary';
  assert.equal(wrongOwner.focus.matches, true);
  assert.throws(() => inspectSnapshot(wrongOwner), /Wrong recorded logical focus owner/);
  const inventedPhase = structuredClone(row);
  inventedPhase.resourceSnapshots[0].phase = 'after-action';
  assert.throws(() => inspectSnapshot(inventedPhase), /Do not invent a timed endpoint/);
  const missingVisibility = structuredClone(row);
  delete missingVisibility.resourceSnapshots[0].surface.interaction.focusVisible;
  assert.throws(() => inspectSnapshot(missingVisibility));
  const pointerCase = structuredClone(loadCapture().interactions.find(row =>
    row.family === 'timepicker' && row.profile === 'light' &&
    row.viewport.id === 'desktop-dpr1' && row.state === 'focus'));
  pointerCase.eventComparison.reference = pointerCase.eventComparison.reference.filter(event =>
    event.type === 'focus');
  assert.throws(() => inspectSnapshot(pointerCase), /modality must not be substituted/);
});
