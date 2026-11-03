import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const generation = '8f94a1075751d28052fab3f5b4e3f3e9da3b45057d0bdb9875362fdfb32ed727';
const indexSha256 = 'e043b3feaa8d780828df6c5486c83914e773598643e6eb798b91f60e67323878';

function inspect(reference, candidate, focused) {
  const hosts = reference.nodes.filter(n => n.attributes?.id === 'toolbar-action');
  assert.equal(hosts.length, 1);
  const host = hosts[0];
  assert.equal(host.attributes.class.includes('cdk-program-focused'), focused);
  const layers = reference.nodes.filter(n => n.parent === host.key &&
    n.attributes?.class?.split(/\s+/).includes('mat-mdc-button-persistent-ripple'));
  assert.equal(layers.length, 1);
  const pseudo = layers[0].pseudoElements.find(p => p.pseudo === '::before');
  assert.equal(pseudo.generated, true);
  const style = reference.styles[pseudo.style];
  assert.equal(style.opacity, focused ? '0.12' : '0');
  if (focused) assert.ok(pseudo.rules.map(i => reference.rules[i]).some(r =>
    r.active && r.selector.includes('cdk-program-focused') && r.declarations.opacity));
  const buttons = candidate.nodes.filter(n => n.authored?.id === 'toolbar-action');
  assert.equal(buttons.length, 1);
  const button = buttons[0];
  assert.equal(button.normalResolvedStyle.background, 'transparent');
  assert.equal(button.resolvedStyle.background, 'transparent');
  assert.equal(candidate.nodes.filter(n => n.key.startsWith(button.key + '/')).length, 0);
  assert.ok(!candidate.rules.some(r => /(?:\.toolbar-action|#toolbar-action):focus/.test(r.selector)));
  return { referenceLayer: { color: style.backgroundColor, opacity: style.opacity },
    candidateBackground: button.resolvedStyle.background };
}

test('toolbar text-button focus omits the native layer independently of filled-button scope', t => {
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  const rows = cases.filter(r => r.family === 'toolbar' && r.case.endsWith('/focus'));
  assert.deepEqual(rows.map(r => r.case).sort(), ['light', 'dark', 'contrast', 'custom']
    .flatMap(p => [1, 2].map(d => `interaction:toolbar@${p}/desktop-dpr${d}/focus`)).sort());
  const observations = [];
  for (const row of rows) {
    const load = item => Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = item.evidence.pairedTrees[side], bytes = fs.readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      const tree = JSON.parse(bytes); assert.deepEqual(tree.errors, []);
      return [side, tree];
    }));
    const trees = load(row);
    observations.push({ case: row.case, ...inspect(trees.reference, trees.astylar, true),
      evidence: row.evidence.pairedTrees });
    const control = cases.find(r => r.case === row.case.replace(/\/focus$/, '/activate-leave'));
    assert.ok(control);
    const inactive = load(control);
    inspect(inactive.reference, inactive.astylar, false);
    const changed = structuredClone(trees.astylar);
    changed.nodes.find(n => n.authored?.id === 'toolbar-action').resolvedStyle.background = '#ffffff';
    assert.throws(() => inspect(trees.reference, changed, true));
  }
  const source = fs.readFileSync('examples/material-showcase/src/app/astylar.component.ts', 'utf8').replaceAll('\r\n', '\n');
  assert.equal(hash(source), 'b493a355679903f988e29f0dafbb95d2d6cce41275302fce5c978ae55f423b9f');
  assert.ok(source.includes("selector: '.toolbar-action:hover'"));
  assert.ok(!/(?:\.toolbar-action|#toolbar-action):focus/.test(source));
  t.diagnostic(JSON.stringify({ generation, indexSha256, observations, inactiveControls: 8,
    boundary: 'Retained unfilled toolbar action focus input omission, not physical paint, equal-input core failure, current runtime or whole-case acceptance. Pending coherent inventory/coverage integration.' }));
});

test('retained toolbar leave pixels change despite identical recorded candidate action nodes', t => {
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const cases = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  const observations = [];
  // Decoded hashes bind the retained pixels now; they are not asserted to be
  // original capture-time PNG receipts or evidence of current runtime behavior.
  const expected = {
    contrast: ['d92d051a206d13c6c271aa7687794e28b72b9f7125b8a3660c986921b2bbc674',
      'f9896fcf571545583cdde2b6fbf1e5f4eb4c884007fea64196793e5cfa05568f',
      '3fa01f0a4ded2cc404ab43b90abf17fe782b58834b5e250f2209f2ca6cb499a3'],
    custom: ['e8fe0c41ac81b7f28ecc7c0d8410a82feebe3336096a529d38c59f51c5989a06',
      'd96c98f74c3bc79056561c711c5b97b8d70eac2a8d12f3d1781c35bab1d5cad5',
      'eb940f0404f89c1399608b06133ce9b7ed75b975e3f1fbdd9750e5a5f43eb6df'],
  };
  for (const profile of ['contrast', 'custom']) {
    const ids = [`static:toolbar@${profile}/desktop`,
      `interaction:toolbar@${profile}/desktop-dpr1/activate-leave`];
    const nodes = [], pixels = [];
    for (const id of ids) {
      const row = cases.find(r => r.case === id); assert.ok(row);
      const receipt = row.evidence.pairedTrees.astylar, treeBytes = fs.readFileSync(receipt.file);
      assert.equal(hash(treeBytes), receipt.sha256);
      const nodesForId = JSON.parse(treeBytes).nodes.filter(n => n.authored?.id === 'toolbar-action');
      assert.equal(nodesForId.length, 1); nodes.push(nodesForId[0]);
      pixels.push(Object.fromEntries(['reference', 'astylar'].map(side => {
        const file = row.evidence.pairedTrees[side].file.replace(`${side}-input-tree.json`,
          `toolbar-action-alignment-${side}.png`);
        const image = PNG.sync.read(fs.readFileSync(file));
        return [side, { width: image.width, height: image.height, rgbaSha256: hash(image.data) }];
      })));
    }
    assert.deepEqual(nodes[0], nodes[1]);
    assert.deepEqual(pixels[0].reference, pixels[1].reference);
    assert.equal(pixels[0].reference.rgbaSha256, expected[profile][0]);
    assert.equal(pixels[0].astylar.rgbaSha256, expected[profile][1]);
    assert.equal(pixels[1].astylar.rgbaSha256, expected[profile][2]);
    assert.notEqual(pixels[0].astylar.rgbaSha256, pixels[1].astylar.rgbaSha256);
    observations.push({ profile, cases: ids, pixels });
  }
  t.diagnostic(JSON.stringify({ observations,
    boundary: 'Recorded node identity does not prove complete equal runtime inputs. Core cause, original timing/material/focus ownership, current rendering and whole-case acceptance remain unproved.' }));
});

test('all retained toolbar leave crops preserve hover pixels after reported hover clears', t => {
  const reportBytes = fs.readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const report = JSON.parse(reportBytes);
  const observations = [];
  for (const profile of ['light', 'dark', 'contrast', 'custom']) for (const dpr of [1, 2]) {
    const entries = ['hover', 'activate-leave'].map(state => report.interactions.find(e =>
      e.family === 'toolbar' && e.profile === profile && e.viewport.id === `desktop-dpr${dpr}` && e.state === state));
    assert.ok(entries.every(Boolean));
    const nodes = entries.map(e => {
      const receipt = e.inputTrees.astylar, bytes = fs.readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      return JSON.parse(bytes).nodes.find(n => n.authored?.id === 'toolbar-action');
    });
    assert.notEqual(nodes[0].resolvedStyle.background, 'transparent');
    assert.equal(nodes[1].resolvedStyle.background, 'transparent');
    assert.equal(entries[1].statePaint.matches, true);
    assert.equal(entries[1].statePaint.astylar, 'transparent');
    assert.ok(entries[1].resourceSnapshots.every(s => s.surface.interaction.hoveredElementId === 'page'));
    const pixels = entries.map(e => {
      const file = e.inputTrees.astylar.file.replace('astylar-input-tree.json', 'toolbar-action-alignment-astylar.png');
      const png = PNG.sync.read(fs.readFileSync(file));
      return { width: png.width, height: png.height, rgbaSha256: hash(png.data) };
    });
    assert.deepEqual(pixels[0], pixels[1]);
    observations.push({ profile, dpr, hoverBackground: nodes[0].resolvedStyle.background,
      leaveBackground: nodes[1].resolvedStyle.background, pixels: pixels[0] });
  }
  t.diagnostic(JSON.stringify({ observations,
    boundary: 'All8 retained leave crops equal their hover peers despite scalar/hover-state reset. This extends the observation beyond2 threshold outliers;not proof of capture timing,material caching,focus ownership,current reproduction or a core cause.' }));
});

test('authenticated served toolbar retains opaque hover material after settled transparent leave', () => {
  const file = 'artifacts/material-parity/toolbar-leave-material-accessor-corrected-20261103/latest-report.json';
  const bytes = fs.readFileSync(file);
  assert.equal(hash(bytes), '70b1975262dcef39545e3e2df22eedf2574eb5ebde84565162db4d1b0d161600');
  const report = JSON.parse(bytes);
  assert.deepEqual(report.errors, []);
  assert.equal(report.observations.length, 8);
  const expectedAssets = new Map(report.browserFiles.map(x => [x.file, x.sha256]));
  assert.ok(report.assets.some(x => x.file.endsWith('.js')));
  for (const asset of report.assets) assert.equal(asset.sha256, expectedAssets.get(asset.file));
  for (const observation of report.observations)
    assert.equal(hash(fs.readFileSync(observation.screenshot.file)), observation.screenshot.sha256);
  const candidate = report.observations.filter(x => x.side === 'astylar');
  const material = x => {
    assert.equal(x.data.meshes.length, 1);
    assert.equal(x.data.meshes[0].text, false);
    return x.data.meshes[0].material;
  };
  assert.equal(material(candidate[0]).alpha, 0);
  const hover = material(candidate[1]);
  assert.equal(hover.alpha, 1);
  assert.deepEqual(hover.diffuse, [235 / 255, 235 / 255, 235 / 255]);
  for (const x of candidate.slice(2)) {
    assert.equal(x.data.nodes[0].resolvedStyle.background, 'transparent');
    assert.equal(x.data.diagnostics.interaction.hoveredElementId, 'page');
    assert.equal(x.data.diagnostics.interaction.focusVisible, false);
    assert.equal(material(x).alpha, 1);
    assert.deepEqual(material(x).diffuse, hover.diffuse);
  }
  assert.ok(candidate[3].data.frameId > candidate[2].data.frameId);
  assert.equal(material(candidate[3]).id, material(candidate[2]).id);
  for (const x of report.observations.filter(x => x.side === 'reference' && x.state.startsWith('leave')))
    assert.equal(x.data.layer.opacity, '0');
});

test('public equal-input hover leave fails only for transparent keyword at DPR1 and DPR2', () => {
  const root = 'artifacts/material-parity/public-transparent-hover-20261103';
  const bytes = fs.readFileSync(`${root}/latest-report.json`);
  assert.equal(hash(bytes), '3a7b5c323aec32eecc31f36bc6a2a8304c32d935de60b3485742547b4ff3b587');
  const report = JSON.parse(bytes);
  assert.deepEqual(report.errors, []); assert.equal(report.results.length, 6);
  for (const pair of report.results) {
    assert.equal(pair.stages.length, 8);
    for (const stage of pair.stages) {
      assert.deepEqual(stage.snapshot.site, pair.stages[0].snapshot.site);
      const pngBytes = fs.readFileSync(`${root}/${stage.screenshot.file}`);
      assert.equal(hash(pngBytes), stage.screenshot.sha256);
      const png = PNG.sync.read(pngBytes);
      const base = pair.name === 'opaque' ? 255 : 238;
      const expected = stage.state === 'hover' ||
        stage.mode === 'astylar' && pair.name === 'transparent' && stage.state.startsWith('leave') ? 235 : base;
      // Blank interior patch, away from text/borders; every physical pixel.
      for (let y = 56 * pair.dpr; y < 64 * pair.dpr; y++)
        for (let x = 50 * pair.dpr; x < 58 * pair.dpr; x++)
          assert.deepEqual([...png.data.subarray((y * png.width + x) * 4, (y * png.width + x) * 4 + 4)],
            [expected, expected, expected, 255]);
    }
    for (const side of ['reference', 'astylar'])
      assert.ok(pair[side + 'Assets'].some(x => x.type === 'script' && x.sha256 === report.bundleSha256));
  }
});

test('complete transparent-material methods bind current emit, installed code and served capture', async () => {
  const { default: ts } = await import('typescript');
  const { createRequire } = await import('node:module');
  const esbuild = createRequire(process.cwd() + '/examples/material-showcase/package.json')('esbuild');
  const reportBytes = fs.readFileSync('artifacts/material-parity/toolbar-leave-material-accessor-corrected-20261103/latest-report.json');
  assert.equal(hash(reportBytes), '70b1975262dcef39545e3e2df22eedf2574eb5ebde84565162db4d1b0d161600');
  const report = JSON.parse(reportBytes), mapFile = 'chunk-XOU37TRR.js.map';
  const mapBytes = fs.readFileSync(`examples/material-showcase/dist/material-showcase/browser/${mapFile}`);
  assert.equal(hash(mapBytes), report.browserFiles.find(x => x.file === mapFile).sha256);
  const map = JSON.parse(mapBytes);
  const method = (source, name, member) => {
    const ast = ts.createSourceFile('source.ts', source, 99, true);
    let owner;
    const visit = n => { if (ts.isClassDeclaration(n) && n.name?.text === name) owner = n; ts.forEachChild(n, visit); };
    visit(ast); assert.ok(owner);
    const members = owner.members.filter(n => ts.isMethodDeclaration(n) && n.name.getText(ast) === member);
    assert.equal(members.length, 1);
    const emitted = ts.transpileModule(`class Owner {${members[0].getText(ast)}}`,
      { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
    // Angular's served source wraps object literals across lines. Remove only
    // formatting through the same parser/printer; retain the complete method.
    return esbuild.transformSync(emitted, { loader: 'js', target: 'es2022', legalComments: 'none',
      minifyWhitespace: true }).code;
  };
  for (const [relative, name, members] of [
    ['app/services/dom/style.service', 'StyleService', ['parseBackgroundColor']],
    ['app/services/dom/elements/element-interaction.service', 'ElementInteractionService', ['setupMouseEvents', 'applyElementMaterial']],
    ['app/services/dom/elements/element-material.service', 'ElementMaterialService', ['applyElementMaterial']],
  ]) {
    const current = fs.readFileSync(`src/${relative}.ts`, 'utf8');
    const installed = fs.readFileSync(`examples/material-showcase/node_modules/astylarui/dist/lib/${relative}.js`, 'utf8');
    const ix = map.sources.indexOf(`node_modules/astylarui/dist/lib/${relative}.js`); assert.ok(ix >= 0);
    const captured = map.sourcesContent[ix];
    for (const member of members) {
      const body = method(current, name, member);
      assert.equal(body, method(installed, name, member), `current/installed ${name}.${member}`);
      assert.equal(body, method(captured, name, member), `installed/captured ${name}.${member}`);
      if (member === 'parseBackgroundColor')
        assert.notEqual(body, method(current.replace("colorLower === 'transparent'", "colorLower === 'opaque'"), name, member));
    }
  }
});

test('button toolbar paint join preserves complete accepted coverage and rejects corrupt evidence', async () => {
  const { joinButtonToolbarPaint, restoreButtonToolbarPaint } =
    await import('../../scripts/join-material-button-toolbar-paint.mjs');
  const bytes = fs.readFileSync(`artifacts/material-parity/working-audit/${generation}/index.json`);
  assert.equal(hash(bytes), indexSha256);
  const parent = JSON.parse(bytes).metadata.coverage.inspectionEvidence.cases;
  const joined = joinButtonToolbarPaint(parent);
  assert.equal(joined.changed, 104);
  assert.deepEqual(joined.counts, { button: 52, toolbar: 52 });
  assert.deepEqual(restoreButtonToolbarPaint(joined.cases), parent);
  assert.equal(joined.cases.filter((r, i) => r === parent[i]).length, 2207);
  assert.deepEqual(joined.cases.map(r => [r.case, r.inspection, r.currentRendering]),
    parent.map(r => [r.case, r.inspection, r.currentRendering]));
  assert.throws(() => joinButtonToolbarPaint(parent.slice(1)));
  for (const suffix of ['toolbar-retained-raster-coverage-20261103.log', 'toolbar-action-alignment-astylar.png'])
    assert.throws(() => joinButtonToolbarPaint(parent, (file, ...args) =>
      file.endsWith(suffix) ? Buffer.from('corrupt') : fs.readFileSync(file, ...args)));
});

test('button toolbar staged finding registration preserves complete policy and rejects drift', async () => {
  const { prepareButtonToolbarPolicy, restoreButtonToolbarPolicy, buttonToolbarSourceDefinitions,
    stripButtonToolbarRegistrationIfPresent } =
    await import('../../scripts/join-material-button-toolbar-paint.mjs');
  const { default: ts } = await import('typescript');
  const prior = stripButtonToolbarRegistrationIfPresent(fs.readFileSync('tests/material-parity/input-equivalence-policy.mjs'), 'policy').toString().replaceAll('\r\n', '\n');
  const next = prepareButtonToolbarPolicy(prior);
  assert.equal(restoreButtonToolbarPolicy(next), prior);
  const ast = ts.createSourceFile('policy.mjs', next, 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const statement = ast.statements.find(s => ts.isVariableStatement(s) &&
    s.declarationList.declarations.some(d => d.name.getText(ast) === 'sourceAuditDefinitions'));
  const definitions = statement.declarationList.declarations[0].initializer.arguments[0];
  assert.equal(definitions.elements.length, 210);
  assert.equal(buttonToolbarSourceDefinitions.length, 2);
  for (const definition of buttonToolbarSourceDefinitions) {
    assert.ok(new RegExp(definition.pattern).test(fs.readFileSync(definition.file, 'utf8')));
    for (const receipt of definition.evidence) assert.equal(hash(fs.readFileSync(receipt.file)), receipt.sha256);
  }
  assert.throws(() => prepareButtonToolbarPolicy(prior + ' '));
  assert.throws(() => restoreButtonToolbarPolicy(next + ' '));
});

test('button toolbar staged inventory preserves complete producer and plans', async () => {
  const { prepareButtonToolbarInventory, restoreButtonToolbarInventory, stripButtonToolbarRegistrationIfPresent } =
    await import('../../scripts/join-material-button-toolbar-paint.mjs');
  const { default: ts } = await import('typescript');
  const source = stripButtonToolbarRegistrationIfPresent(fs.readFileSync('tests/material-parity/input-equivalence-audit.mjs'), 'producer').toString().replaceAll('\r\n', '\n');
  const staged = prepareButtonToolbarInventory(source);
  assert.equal(restoreButtonToolbarInventory(staged), source);
  const ast = ts.createSourceFile('producer.mjs', staged, 99, true, ts.ScriptKind.JS);
  assert.equal(ast.parseDiagnostics.length, 0);
  const fn = name => ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  const files = fn('sourceFingerprints').body.statements.find(n => ts.isVariableStatement(n) &&
    n.declarationList.declarations.some(d => d.name.getText(ast) === 'files'))
    .declarationList.declarations.find(d => d.name.getText(ast) === 'files').initializer;
  assert.equal(files.elements.length, 1158);
  assert.equal(new Set(files.elements.map(n => n.text)).size, 1158);
  for (const [name, count] of [['focusedProofInventory', 499], ['implementationPlan', 77]]) {
    let expression = fn(name).body.statements.find(ts.isReturnStatement).expression;
    while (ts.isCallExpression(expression) || ts.isPropertyAccessExpression(expression)) expression = expression.expression;
    assert.ok(ts.isArrayLiteralExpression(expression));
    assert.equal(expression.elements.length, count);
  }
  assert.throws(() => prepareButtonToolbarInventory(source + ' '));
  assert.throws(() => restoreButtonToolbarInventory(staged + ' '));
  const registration = await import('../../scripts/join-material-button-toolbar-paint.mjs');
  const vm = await import('node:vm');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const review = '1'.repeat(64), stagedFiles = new Map();
  stagedFiles.set(path.resolve('tests/material-parity/input-equivalence-audit.mjs'), Buffer.from(staged));
  const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
  stagedFiles.set(path.resolve(policyFile), Buffer.from(registration.prepareButtonToolbarPolicy(
    stripButtonToolbarRegistrationIfPresent(fs.readFileSync(policyFile), 'policy'))));
  const shared = 'tests/material-parity/capture-availability-registration.mjs';
  const sharedBytes = registration.createButtonToolbarHistoricalRead()(shared);
  const stagedShared = registration.prepareButtonToolbarShared(sharedBytes);
  assert.equal(registration.restoreButtonToolbarShared(stagedShared), sharedBytes.toString());
  stagedFiles.set(path.resolve(shared), Buffer.from(stagedShared));
  for (const [kind, file] of Object.entries({ runner: 'scripts/run-material-input-audit.mjs',
    launcher: 'scripts/export-material-input-audit-current-ancestry.mjs' })) {
    const original = stripButtonToolbarRegistrationIfPresent(fs.readFileSync(file), kind).toString().replaceAll('\r\n', '\n');
    const selected = registration.prepareButtonToolbarSelection(original, kind, review);
    assert.equal(ts.createSourceFile(file, selected, 99, true, ts.ScriptKind.JS).parseDiagnostics.length, 0);
    assert.equal(registration.restoreButtonToolbarSelection(selected, kind, review), original);
    assert.throws(() => registration.restoreButtonToolbarSelection(selected + '// drift', kind, review));
    stagedFiles.set(path.resolve(file), Buffer.from(selected));
    if (kind !== 'launcher') continue;
    const execute = (code, flags) => {
      const output = [];
      vm.runInNewContext(code.replace(/^import .*;\n/gm, '').replaceAll('import.meta.url', 'moduleUrl'), {
        assert, path, fileURLToPath, moduleUrl: pathToFileURL(path.resolve(file)).href,
        statSync: () => ({ isFile: () => true, isDirectory: () => true }),
        process: { argv: ['node', file, ...flags], execPath: 'node', env: {} },
        spawnSync: (_exe, args) => { output.push({ args }); return { status: 0, signal: null }; },
        console: { log: text => output.push(JSON.parse(text)) },
      });
      assert.equal(output.length, 1); return JSON.parse(JSON.stringify(output[0]));
    };
    const older = [...original.matchAll(/rawRequested\.includes\('(.*?)'\)/g)].map(m => m[1]);
    for (const flags of [[], ...older.map(flag => [flag])])
      assert.deepEqual(execute(selected, [...flags, '--dry-run']), execute(original, [...flags, '--dry-run']));
    for (const suffix of [[], ['--check'], ['--dry-run']])
      assert.ok(execute(selected, ['--button-toolbar-paint', ...suffix]).args.includes(`--case-obligation-review-sha256=${review}`));
    for (const flag of [...older, '--unknown'])
      assert.throws(() => execute(selected, ['--button-toolbar-paint', flag, '--dry-run']));
  }
  const historical = registration.createButtonToolbarHistoricalRead({ read: (name, ...args) =>
    stagedFiles.get(path.resolve(name)) ?? fs.readFileSync(name, ...args) });
  const priorRead = registration.createButtonToolbarHistoricalRead();
  for (const [file] of stagedFiles) assert.deepEqual(historical(file), priorRead(file));
});

test('button toolbar successor passes the existing complete receipt loader', async t => {
  const { createButtonToolbarReviewReader } = await import('../../scripts/join-material-button-toolbar-paint.mjs');
  const { loadCaseObligationReview } = await import('../../scripts/audit-findings-store.mjs');
  const reader = createButtonToolbarReviewReader();
  const envelope = JSON.parse(reader.read(reader.file));
  const configured = envelope.review.groups.map(r => r.case);
  const evidence = loadCaseObligationReview(path.relative(process.cwd(), reader.file), reader.sha256,
    configured, { root: process.cwd(), read: reader.read });
  assert.equal(evidence.cases.length, 2311);
  assert.equal(evidence.inspectionComplete, false);
  assert.equal(evidence.currentRenderingAccepted, false);
  t.diagnostic(JSON.stringify({ review: reader.sha256, cases: evidence.cases.length,
    dependencies: evidence.evidenceFingerprints.length, changed: reader.changed }));
});
