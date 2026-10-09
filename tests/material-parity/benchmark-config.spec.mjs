import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { transformSync } from 'esbuild';
import { PNG } from 'pngjs';
import { materialCaseKey, fingerprintDirectory } from './run-checkpoint.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { restoreDescriptionProofRegistration, restoreDescriptionPolicyRegistration, restoreStandaloneProofBatch, restoreExtendedKeyboardRegistration } from './position-composition-producer-transition.mjs';
import { propertyGroups, sourceAuditDefinitions } from './input-equivalence-policy.mjs';
import { materialAbsoluteTextAlignmentTargets, materialAdditionalMeasurementTargets, materialComparisonViewport, materialFamilies, materialFocusedRasterTargets, materialGeometryExcludedTargets, materialInteractionCases, materialInteractionFocusedRasterTargets, materialInteractionTextAlignmentTargets, materialInteractionViewports, materialLeftAlignedTextTargets, materialMobileFlowCases, materialMobileFlowFamilies, materialProfiles, materialSemanticExcludedTargets, materialStaticCases, materialSupplementalStaticCases, materialTextAlignmentTargets, materialTextAlignmentToleranceOverrides, materialTextAuditTargets, materialTextlessFamilies, materialTextOnlyTargets, materialThresholds, materialUniformBackgroundTargets, materialViewports } from './benchmark.config.mjs';

test('description registration conserves complete producer and source-definition predecessors', () => {
  const prior = file => execFileSync('git', ['show', `5b3dfd70:${file}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replaceAll('\r\n', '\n');
  const producerFile = 'tests/material-parity/input-equivalence-audit.mjs';
  const producer = readFileSync(producerFile, 'utf8');
  assert.ok(producer.includes('ordinary default-light mobile tooltip live-material retention diagnostic counterexample (requested dark)'));
  assert.ok(producer.includes('default-light mobile tooltip keyboard-authoring and local texture-phase diagnostic (requested dark)'));
  assert.ok(producer.includes('not actual dark-theme coverage, lifecycle acceptance'));
  assert.ok(producer.includes('diagnostic registration is not acceptance or actual dark-theme coverage.'));
  assert.equal(restoreDescriptionProofRegistration(producer), prior(producerFile));
  const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
  const policy = readFileSync(policyFile, 'utf8');
  assert.equal(restoreDescriptionPolicyRegistration(policy), prior(policyFile));
  const before = new Function(prior(policyFile).replace(/^export const /gm, 'const ') + '; return sourceAuditDefinitions;')();
  assert.equal(before.length, 153); assert.equal(sourceAuditDefinitions.length, 155);
  assert.deepEqual(sourceAuditDefinitions.slice(0, -2), before);
  for (const changed of [producer.replace('sourceFindings,', 'sourceFindings: [],'),
    producer.replace('configured field hint-description input boundary', 'unreviewed description acceptance'),
    producer.replace('scripts/audit-material-tooltip-description.mjs', 'scripts/other.mjs'),
    producer.replace('not actual dark-theme coverage, lifecycle acceptance', 'dark lifecycle acceptance'),
    producer.replace('diagnostic registration is not acceptance or actual dark-theme coverage.', 'diagnostic registration proves dark-theme acceptance.')])
    assert.throws(() => restoreDescriptionProofRegistration(changed));
  for (const changed of [policy.replace('fixture-form-field-hint-description-association-omitted', 'unknown-hint-finding'),
    policy.replace('Original', 'Rewritten')]) assert.throws(() => restoreDescriptionPolicyRegistration(changed));
});

function descriptionEvidenceBytes(file, sha256) {
  const bytes = readFileSync(file);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sha256, file);
  return bytes;
}

// Reuse the actual AX logs without treating them as input-tree captures or
// retroactively upgrading the original requested-dark/default-light evidence.
function verifiedDescriptionCohorts(file, sha256, contexts, states, family) {
  const log = descriptionEvidenceBytes(file, sha256).toString().trim().split('\n').map(JSON.parse);
  const terminal = log.pop();
  assert.equal(terminal.terminal, 'verified');
  assert.equal(terminal.browser, '154.0.8037.58');
  assert.equal(terminal.contexts, contexts.length); assert.deepEqual(terminal.states, states);
  const manifest = JSON.parse(descriptionEvidenceBytes(terminal.capture.checkpointManifest.file,
    terminal.capture.checkpointManifest.sha256));
  assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')),
    manifest.provenance.browserFiles);
  for (const receipt of [...terminal.capture.sources, ...terminal.sourceReceipts]) {
    if (receipt.file === 'scripts/audit-material-field-description.mjs') {
      // Field capture predates tooltip mode; themed tooltip capture predates
      // divider mode. Authenticate each actual producer, not today's probe.
      // This preserves historical AX observations, not current-mode acceptance.
      const commit = family === 'form-field' ? '58678793' : '8b095913';
      const original = execFileSync('git', ['show', `${commit}:${receipt.file}`]);
      assert.equal(createHash('sha256').update(original).digest('hex'), receipt.sha256);
    } else descriptionEvidenceBytes(receipt.file, receipt.sha256);
  }
  descriptionEvidenceBytes('tests/material-parity/benchmark.config.mjs',
    'a55e95abe098be26d6a99e3faab22a951ae140143fece8701726a23624b98535');
  descriptionEvidenceBytes('examples/material-showcase/src/app/theme.ts',
    '60a0737e357b6cf03f19256212f26f27d6a54d6153e9ee3a433246a37a39c609');
  const key = (context, state, side) => JSON.stringify([context.profile, context.viewport.width,
    context.viewport.height, context.deviceScaleFactor, state, side]);
  const expected = contexts.flatMap(context => states.flatMap(state => ['reference', 'astylar']
    .map(side => key(context, state, side))));
  assert.equal(new Set(expected).size, expected.length);
  assert.deepEqual(log.map(row => key(row.context, row.state, row.side)).sort(), expected.sort());
  const backgrounds = { light: 'rgb(255, 251, 254)', dark: 'rgb(28, 27, 31)',
    contrast: 'rgb(255, 255, 255)', custom: 'rgb(244, 251, 250)' };
  const assets = new Map(manifest.provenance.browserFiles.map(row => [row.file, row.sha256]));
  for (const row of log) {
    assert.deepEqual(row.theme, { dark: row.context.profile === 'dark', background: backgrounds[row.context.profile] });
    assert.deepEqual(row.runtime.errors, []);
    assert.equal(new Set(row.runtime.assets.map(asset => asset.file)).size, row.runtime.assets.length);
    assert.ok(row.runtime.assets.length > 0);
    for (const asset of row.runtime.assets) assert.equal(asset.sha256, assets.get(asset.file));
    for (const type of ['document', 'script', 'stylesheet', 'font'])
      assert.ok(row.runtime.assets.some(asset => asset.type === type));
    const observation = row.observation;
    assert.equal(observation.role, family === 'tooltip' ? 'button' : 'textbox');
    assert.equal(observation.name, family === 'tooltip' ? 'Hover for help' : 'Project name');
    const described = row.side === 'reference' || (family === 'tooltip' && row.state === 'hover');
    const text = family === 'tooltip' ? 'Create a project' :
      row.state === 'error' ? 'Project name is required' : 'Public label';
    assert.equal(observation.description, described ? text : null);
    if (described) {
      assert.ok(observation.dom.describedBy);
      assert.deepEqual(observation.dom.descriptions, [{ id: observation.dom.describedBy, text }]);
      assert.equal(observation.describedByProperty.value.value, observation.dom.describedBy);
    } else {
      assert.equal(observation.dom.describedBy, null); assert.deepEqual(observation.dom.descriptions, []);
      assert.equal(observation.describedByProperty, null);
    }
  }
}

function descriptionConfiguredTrees(family) {
  const report = JSON.parse(descriptionEvidenceBytes('artifacts/material-parity/current-full-20261005/latest-report.json',
    'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62'));
  const expected = [...materialStaticCases.filter(row => row.family === family).map(row => materialCaseKey('static', row)),
    ...materialInteractionCases.filter(row => row.family === family).map(row => materialCaseKey('interaction', row)),
    ...materialMobileFlowCases.filter(row => row.family === family).map(row => materialCaseKey('interaction', row))];
  const rows = [...report.results.filter(row => row.family === family).map(row => ({ kind: 'static', row })),
    ...report.interactions.filter(row => row.family === family).map(row => ({ kind: 'interaction', row }))];
  assert.equal(new Set(expected).size, expected.length);
  assert.deepEqual(rows.map(({ kind, row }) => materialCaseKey(kind, row)).sort(), expected.sort());
  return rows.map(({ kind, row }) => {
    const trees = Object.fromEntries(['reference', 'astylar'].map(side => {
      const receipt = row.inputTrees[side];
      const tree = JSON.parse(descriptionEvidenceBytes(receipt.file, receipt.sha256));
      assert.deepEqual(tree.errors, []);
      assert.equal(new Set(tree.nodes.map(node => node.key)).size, tree.nodes.length);
      return [side, tree];
    }));
    return { kind, row, ...trees };
  });
}

function descriptionAuthoringSource() {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const source = descriptionEvidenceBytes(file, '71e2d41f2589d1c8c17019eebb70b455a2363a4136c74eb42777a1328b2730cd').toString();
  const map = JSON.parse(descriptionEvidenceBytes('examples/material-showcase/dist/material-showcase/browser/chunk-JPEJK334.js.map',
    '47654b641610e1d56e02948b17fab41aff25e9c6aedc6f83b70a26b6f349ce9e'));
  assert.deepEqual(map.sources.flatMap((name, i) => name.endsWith('/astylar.component.ts')
    && map.sourcesContent[i]?.includes('import {') ? [map.sourcesContent[i]] : []), [source]);
  return source;
}

test('configured field hint descriptions preserve sixty-eight omissions and eight error controls', () => {
  const finding = sourceAuditDefinitions.find(row => row.id === 'fixture-form-field-hint-description-association-omitted');
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  assert.equal(finding.actualAx, undefined); // AX scope belongs to the observation, not a new finding.
  assert.equal(finding.observation.actualAx.observations, 64);
  assert.equal(finding.observation.actualAx.contexts, 16);
  assert.deepEqual(finding.observation.actualAx.states, ['hint', 'error']);
  assert.equal(finding.evidence[1].file, 'artifacts/material-parity/field-description-cohorts-20261009.log');
  assert.equal(finding.evidence[1].sha256, '51def316df13aae88491126e9003f3d3f934ca2fe971572353ad7cbe26ceee93');
  const source = descriptionAuthoringSource(); assert.match(source, new RegExp(finding.pattern));
  const census = JSON.parse(descriptionEvidenceBytes(finding.evidence[0].file, finding.evidence[0].sha256));
  const rows = descriptionConfiguredTrees('form-field'); assert.equal(rows.length, 76);
  const unique = (tree, predicate) => { const nodes = tree.nodes.filter(predicate); assert.equal(nodes.length, 1); return nodes[0]; };
  const groups = {};
  for (const { kind, row, reference, astylar } of rows) {
    const state = kind === 'static' ? 'static' : row.state;
    const native = unique(reference, node => node.attributes?.id === 'form-field-control');
    const candidate = unique(astylar, node => node.authored?.id === 'form-field-control');
    const ids = native.attributes['aria-describedby'].split(/\s+/).filter(Boolean); assert.equal(ids.length, 1);
    const error = state === 'error';
    const expectedText = error ? 'Project name is required' : 'Public label';
    const target = unique(reference, node => node.attributes?.id === ids[0]); assert.equal(target.ownText, expectedText);
    const candidateTarget = unique(astylar, node => node.authored?.id === (error ? 'form-field-error' : 'form-field-hint'));
    assert.equal(candidateTarget.authored.textContent, expectedText);
    assert.equal(candidate.authored.ariaDescribedby, undefined);
    const group = groups[state] ??= { cases: 0, nativeDescribed: 0, candidateDescribed: 0, descriptions: [expectedText] };
    group.cases++; group.nativeDescribed++;
  }
  assert.deepEqual({ family: 'form-field', cases: 76, verifiedTreeReceipts: 152, groups }, census);
  assert.equal(rows.filter(({ kind, row }) => kind === 'static' || row.state !== 'error').length, finding.observation.configuredCases);
  assert.equal(rows.filter(({ row }) => row.state === 'error').length, 8);
  assert.ok(sourceAuditDefinitions.some(row => row.id === 'fixture-field-error-subscript-substitution'));
  verifiedDescriptionCohorts('artifacts/material-parity/field-description-cohorts-20261009.log',
    '51def316df13aae88491126e9003f3d3f934ca2fe971572353ad7cbe26ceee93',
    materialProfiles.flatMap(profile => [...materialViewports,
      { width: 1440, height: 1000, deviceScaleFactor: 2 }].map(viewport => ({ profile,
      viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: viewport.deviceScaleFactor }))),
    ['hint', 'error'], 'form-field');
  // AX scope is these initial hint/error cohorts, not editing/live announcements.
});

test('configured tooltip descriptions preserve closed input omissions and actual AX open controls', () => {
  const finding = sourceAuditDefinitions.find(row => row.id === 'fixture-tooltip-persistent-description-association-conditioned-on-popup');
  assert.equal(finding.classification, 'application-plugin-authoring-defect');
  assert.deepEqual(finding.observation.themeVerifiedAx.contexts, ['light desktop DPR1', 'dark mobile DPR2']);
  assert.equal(finding.observation.themeVerifiedAx.observations, 12);
  assert.equal(finding.evidence[1].file, 'artifacts/material-parity/tooltip-description-theme-verified-20261009.log');
  assert.equal(finding.evidence[1].sha256, 'ca977ea5a951fdd8300f65c733464b20915de8b9275bc3ed9289300b96e02626');
  // The original ordinary-mode URL requested dark but did not activate it.
  // Preserve those observations without treating requested labels as theme proof.
  assert.deepEqual(finding.observation.physicalContexts,
    ['light desktop DPR1', 'default-light mobile DPR2 (requested dark)']);
  const captureSource = readFileSync('scripts/audit-material-tooltip-description.mjs', 'utf8');
  assert.ok(captureSource.includes('/tooltip?profile='));
  assert.ok(!captureSource.includes('/tooltip?benchmark=1'));
  const storeSource = readFileSync('examples/material-showcase/src/app/showcase.store.ts', 'utf8');
  assert.match(storeSource, /readonly theme = signal<MaterialThemeConfig>\(MATERIAL_THEME_PROFILES.light\)/);
  assert.match(storeSource, /parameters.get\('benchmark'\) === '1' && profile/);
  const source = descriptionAuthoringSource(); assert.match(source, new RegExp(finding.pattern));
  const rows = descriptionConfiguredTrees('tooltip'); assert.equal(rows.length, 62);
  let closed = 0, open = 0;
  for (const { reference, astylar } of rows) {
    const native = reference.nodes.filter(node => node.attributes?.id === 'tooltip-primary');
    const candidate = astylar.nodes.filter(node => node.authored?.id === 'tooltip-primary');
    assert.equal(native.length, 1); assert.equal(candidate.length, 1);
    assert.ok(native[0].attributes['aria-describedby']);
    const popups = astylar.nodes.filter(node => node.authored?.id === 'tooltip-popup');
    if (popups.length) {
      assert.equal(popups.length, 1); assert.equal(popups[0].authored.textContent, 'Create a project');
      assert.equal(candidate[0].authored.ariaDescribedby, 'tooltip-popup'); open++;
    } else { assert.equal(candidate[0].authored.ariaDescribedby, undefined); closed++; }
  }
  assert.deepEqual([closed, open], [finding.observation.closedInputOmissions, finding.observation.openInputControls]);
  const log = descriptionEvidenceBytes(finding.evidence[0].file, finding.evidence[0].sha256).toString().trim().split('\n').map(JSON.parse);
  assert.equal(log.length, 5); const terminal = log.at(-1);
  assert.equal(terminal.terminal, 'verified'); assert.equal(terminal.browser, '154.0.8037.58');
  const manifest = JSON.parse(descriptionEvidenceBytes(terminal.capture.checkpointManifest.file, terminal.capture.checkpointManifest.sha256));
  assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')), manifest.provenance.browserFiles);
  assert.deepEqual(terminal.capture.styleProperties, Object.values(propertyGroups).flat());
  assert.deepEqual(terminal.capture.sources.map(r => r.file).sort(), ['scripts/audit-material-tooltip-description.mjs',
    'tests/material-parity/supplemental-capture-evidence.mjs', 'tests/material-parity/input-tree-evidence.mjs'].sort());
  for (const receipt of [...terminal.capture.sources, ...terminal.sourceReceipts]) descriptionEvidenceBytes(receipt.file, receipt.sha256);
  const assets = new Map(manifest.provenance.browserFiles.map(r => [r.file, r.sha256]));
  const contexts = [];
  for (const row of log.slice(0, -1)) {
    contexts.push(`${row.context.profile}/${row.context.viewport.width}x${row.context.viewport.height}/${row.context.deviceScaleFactor}/${row.side}`);
    assert.deepEqual(row.runtime.errors, []);
    assert.equal(row.runtime.assets.length, row.side === 'reference' ? 519 : 520);
    assert.equal(new Set(row.runtime.assets.map(r => r.file)).size, row.runtime.assets.length);
    for (const receipt of row.runtime.assets) assert.equal(receipt.sha256, assets.get(receipt.file));
    for (const type of ['document', 'script', 'stylesheet', 'font']) assert.ok(row.runtime.assets.some(r => r.type === type));
    assert.deepEqual(row.observations.map(r => r.state), ['closed', 'hover', 'leave']);
    for (const observation of row.observations) {
      assert.equal(observation.name, 'Hover for help'); assert.equal(observation.role, 'button');
      const described = row.side === 'reference' || observation.state === 'hover';
      assert.equal(observation.description, described ? 'Create a project' : null);
      if (described) {
        assert.ok(observation.dom.describedBy);
        assert.deepEqual(observation.dom.descriptions, [{ id: observation.dom.describedBy, text: 'Create a project' }]);
        assert.equal(observation.describedByProperty.value.value, observation.dom.describedBy);
      } else {
        assert.equal(observation.dom.describedBy, null); assert.deepEqual(observation.dom.descriptions, []);
        assert.equal(observation.describedByProperty, null);
      }
    }
  }
  assert.deepEqual(contexts.sort(), ['light/1440x1000/1/reference', 'light/1440x1000/1/astylar',
    'dark/390x844/2/reference', 'dark/390x844/2/astylar'].sort());
  verifiedDescriptionCohorts('artifacts/material-parity/tooltip-description-theme-verified-20261009.log',
    'ca977ea5a951fdd8300f65c733464b20915de8b9275bc3ed9289300b96e02626',
    [{ profile: 'light', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 },
      { profile: 'dark', viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }],
    ['closed', 'hover', 'leave'], 'tooltip');
  const bridge = descriptionEvidenceBytes('src/lib/astylar-semantic-bridge.ts',
    '1a0011d3530701d9a74dc37b9f5a14d0fed0742dfd8793c39f8628e06b6a5725').toString();
  assert.match(bridge, /if \(element\.ariaDescribedby\) \{\s*node\.setAttribute\('aria-describedby', this\.nativeIdRefs\(element\.ariaDescribedby\)\)/);
  // The log is actual AX evidence, not a supplemental tree-report schema. Do not
  // fabricate inputTree receipts or claim validateSupplementalCapture accepted it.
});

test('standalone proof batch conserves complete accepted predecessor producer and policy', () => {
  const prior = file => execFileSync('git', ['show', `874d48d7:${file}`],
    { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }).replace(/\r\n/g, '\n');
  const file = 'tests/material-parity/input-equivalence-audit.mjs';
  const current = restoreDescriptionProofRegistration(readFileSync(file, 'utf8'));
  const tree = ts.createSourceFile(file, current, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const inventory = tree.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'focusedProofInventory');
  const elements = inventory.body.statements[0].expression.elements;
  assert.equal(elements.length, 160);
  const names = ['public antialias option core constructor boundary', 'selected caret core visibility owner boundary',
    'actual Material selected caret temporal failure boundary', 'configured progress focus paint failure evidence boundary',
    'retained modal close versus removal attribution boundary'];
  names.forEach((name, index) => assert.equal(elements[index].arguments[3].text, name));
  let restored = current.slice(0, elements[0].getFullStart()) + current.slice(elements[5].getFullStart());
  for (const added of ['scripts/audit-modal-reentrant-close.mjs', 'scripts/audit-material-selection-pixels.mjs',
    'src/app/services/dom/input/text-cursor.renderer.ts']) {
    const line = `    '${added}',\n`; assert.equal(restored.split(line).length, 2); restored = restored.replace(line, '');
  }
  assert.equal(restored, prior(file)); // All collectors/classifiers/coverage and155 predecessor proofs preserved.
  assert.equal(restoreStandaloneProofBatch(current), restored);
  assert.doesNotThrow(() => restoreExtendedKeyboardRegistration(current));
  for (const changed of [current.replace('sourceFindings,', 'sourceFindings: [],'),
    current.replace('Authenticates six retained', 'Authenticates seven retained'),
    current.replace('scripts/audit-modal-reentrant-close.mjs', 'scripts/other.mjs')])
    assert.throws(() => restoreStandaloneProofBatch(changed));
  const policyFile = 'tests/material-parity/input-equivalence-policy.mjs';
  const policy = restoreDescriptionPolicyRegistration(readFileSync(policyFile, 'utf8'));
  const policyTree = ts.createSourceFile(policyFile, policy, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const declaration = policyTree.statements.filter(ts.isVariableStatement)
    .flatMap(n => [...n.declarationList.declarations]).find(n => n.name.getText(policyTree) === 'sourceAuditDefinitions');
  const findings = declaration.initializer.arguments[0].elements;
  const ids = ['core-engine-antialias-option-overridden-by-hardcoded-argument', 'core-selected-caret-blink-ignores-noncollapsed-selection'];
  const first = findings.findIndex(n => n.arguments[0].properties.find(p => p.name.getText(policyTree) === 'id')?.initializer.text === ids[0]);
  assert.ok(first >= 0);
  assert.equal(findings[first + 1].arguments[0].properties.find(p => p.name.getText(policyTree) === 'id').initializer.text, ids[1]);
  assert.equal(policy.slice(0, findings[first].getFullStart()) + policy.slice(findings[first + 2].getFullStart()), prior(policyFile));
  assert.equal(sourceAuditDefinitions.length - 2, 153);
});

test('public antialias option evidence binds original core arguments and Babylon override', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync('artifacts/material-parity/selection-public-context-antialias-20261008.log');
  assert.equal(hash(bytes), '2e4e9b530e172f2664b2434e9058976f4c077304face727980825facd7b68b35');
  const report = JSON.parse(bytes);
  assert.equal(report.status, 'pass'); assert.equal(report.results.length, 6);
  const ownerBytes = readFileSync('artifacts/material-parity/selection-antialias-option-owner-20261008.log');
  assert.equal(hash(ownerBytes), '197a51ba808542baa7a5417094cd1c784669e2332773d5d86b6602836b6e39b3');
  const owner = JSON.parse(ownerBytes);
  for (const receipt of owner.sources) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(hash(readFileSync(report.sourceFile)), report.sourceSha256);
  assert.equal(hash(readFileSync(report.installedFile)), report.installedSha256);
  const find = (text, kind, predicate) => {
    const tree = ts.createSourceFile('owner', text, ts.ScriptTarget.Latest, true, kind), matches = [];
    const visit = node => { if (predicate(node, tree)) matches.push(node); ts.forEachChild(node, visit); };
    visit(tree); assert.equal(matches.length, 1); return { tree, node: matches[0] };
  };
  const method = text => find(text, ts.ScriptKind.TS, node => ts.isMethodDeclaration(node) && node.name.getText() === 'createScene');
  const current = method(readFileSync(report.sourceFile, 'utf8'));
  const installed = method(readFileSync(report.installedFile, 'utf8'));
  const emit = value => transformSync(`class Owner {${value.node.getText(value.tree)}}`, { loader: 'ts', target: 'es2022' }).code.replace(/\s+/g, '');
  assert.equal(emit(current), emit(installed));
  const engine = find(current.node.getText(current.tree), ts.ScriptKind.TS,
    node => ts.isNewExpression(node) && node.expression.getText() === 'Engine');
  const assignment = find(readFileSync(owner.sources[2].file, 'utf8'), ts.ScriptKind.JS,
    node => ts.isBinaryExpression(node) && node.getText().replace(/\s+/g, '') === 'options.antialias=antialias??options.antialias');
  const keys = new Set();
  for (const row of report.results) {
    keys.add(`${row.dpr}/${row.requestedAntialias}`);
    const options = row.requestedAntialias === 'omitted' ? undefined : { antialias: row.requestedAntialias };
    const args = new Function('Engine', 'canvas', 'options', `return ${engine.node.getText(engine.tree)};`)(
      function (...args) { return args; }, {}, options);
    assert.equal(args[1], true); assert.equal(args[2].antialias, options?.antialias ?? false);
    new Function('options', 'antialias', assignment.node.getText(assignment.tree))(args[2], args[1]);
    assert.equal(args[2].antialias, true);
    assert.equal(row.rasterization.attributes.antialias, true);
    assert.equal(row.rasterization.samples, 4); assert.equal(row.rasterization.sampleBuffers, 1);
    assert.equal(row.rasterization.renderWidth, 390 * row.dpr);
    assert.equal(row.rasterization.renderHeight, 140 * row.dpr);
  }
  for (const dpr of [1, 2]) for (const option of ['omitted', false, true]) assert.ok(keys.has(`${dpr}/${option}`));
  // Option-policy defect only; not attribution of all text-edge pixels or performance.
});

test('selected caret blink owner conserves shipped methods and exposes selection-blind visibility', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const sourceFile = 'src/app/services/dom/input/text-cursor.renderer.ts';
  const installedFile = 'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/text-cursor.renderer.js';
  const source = readFileSync(sourceFile), installed = readFileSync(installedFile);
  const finding = sourceAuditDefinitions.filter(entry => entry.id === 'core-selected-caret-blink-ignores-noncollapsed-selection');
  assert.equal(finding.length, 1); assert.equal(finding[0].classification, 'confirmed-core-renderer-defect');
  assert.equal(finding[0].file, sourceFile); assert.match(source.toString(), new RegExp(finding[0].pattern));
  for (const receipt of finding[0].evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(hash(source), 'a38f6c7bd0bd0f5ced73e62d929ab8eb3159833d2e39e61d1fee7373e8d77ca3');
  assert.equal(hash(installed), 'e2b66c82a3e7b2373272576729f22c066836cdaaa446b3f513799af32de4b45d');
  const methods = ['startBlinking', 'stopBlinking', 'updateCursorVisibility'];
  const extract = (text, kind) => {
    const tree = ts.createSourceFile('owner', text, ts.ScriptTarget.Latest, true, kind);
    const owners = tree.statements.filter(statement => ts.isClassDeclaration(statement) && statement.name?.text === 'TextCursorRenderer');
    assert.equal(owners.length, 1);
    return { tree, owner: owners[0], method: name => {
      const found = owners[0].members.filter(member => ts.isMethodDeclaration(member) && member.name.getText(tree) === name);
      assert.equal(found.length, 1); return found[0].getText(tree);
    } };
  };
  const current = extract(source.toString(), ts.ScriptKind.TS);
  const shipped = extract(installed.toString(), ts.ScriptKind.JS);
  for (const name of methods) {
    const emitted = transformSync(`class Owner {${current.method(name)}}`, { loader: 'ts', target: 'es2022' }).code;
    const installedEmitted = transformSync(`class Owner {${shipped.method(name)}}`, { loader: 'js', target: 'es2022' }).code;
    assert.equal(emitted.replace(/\s+/g, ''), installedEmitted.replace(/\s+/g, ''));
  }
  const fields = ['blinkIntervals', 'BLINK_INTERVAL_MS'].map(name => {
    const found = current.owner.members.filter(member => ts.isPropertyDeclaration(member) && member.name.getText(current.tree) === name);
    assert.equal(found.length, 1); return found[0].getText(current.tree);
  });
  const code = transformSync(`class Owner {${[...fields, ...methods.map(current.method)].join('\n')}}`,
    { loader: 'ts', target: 'es2022' }).code;
  let callback, intervalMs; const cleared = [];
  const Owner = new Function('window', `${code}; return Owner;`)({
    setInterval(fn, ms) { callback = fn; intervalMs = ms; return 7; },
    clearInterval(id) { cleared.push(id); }
  });
  for (const [start, end] of [[0, 3], [2, 5], [5, 5]]) {
    const owner = new Owner();
    const input = { element: { id: 'input' }, focused: true, selectionStart: start, selectionEnd: end,
      selectionActive: start !== end, cursorMesh: { isVisible: false }, cursorState: { visible: false } };
    owner.startBlinking(input);
    assert.equal(intervalMs, 530); assert.equal(input.cursorMesh.isVisible, true);
    callback(); assert.equal(input.cursorMesh.isVisible, false);
    callback(); assert.equal(input.cursorMesh.isVisible, true);
    owner.updateCursorVisibility(input, true); assert.equal(input.cursorMesh.isVisible, true);
    input.focused = false; owner.updateCursorVisibility(input, true); assert.equal(input.cursorMesh.isVisible, false);
    owner.stopBlinking(input); assert.equal(input.cursorMesh.isVisible, false);
    assert.equal(owner.blinkIntervals.size, 0);
  }
  assert.deepEqual(cleared, [7, 7, 7]);
  // Records the existing defect; actual public/Material raster evidence is separate.
});

test('actual Material selected caret epochs preserve actions and temporal paint failure', () => {
  const file = 'artifacts/material-parity/selection-material-actual-caret-20261008/latest-report.json';
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b5d48440a777884b18c9f410ecc7956173642e916bd5f27c8af4e3f95b9117ce');
  const report = JSON.parse(bytes);
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-selection-pixels.mjs', styleProperties: Object.values(propertyGroups).flat() }),
  { status: 'checkpoint-bound', errors: [] });
  assert.equal(hash(readFileSync(report.actionSource.file)), report.actionSource.sha256);
  assert.equal(report.inputEquivalent, false); assert.equal(report.renderingEquivalent, false);
  assert.equal(report.results.length, 16);
  const keys = new Set(); let epochs = 0;
  const selection = { typed: [5, 5, 'forward'], forward: [0, 3, 'forward'],
    'end-collapsed': [5, 5, 'forward'], backward: [2, 5, 'backward'] };
  for (const row of report.results) {
    assert.equal(row.family, 'form-field');
    assert.deepEqual(row.viewport, { width: 390, height: 844, deviceScaleFactor: 2 });
    const key = `${row.profile}/${row.state}`; assert.ok(!keys.has(key)); keys.add(key);
    for (const side of ['reference', 'astylar']) {
      const samples = row[side].caretEpochs;
      assert.equal(samples.length, 6);
      const pictures = [];
      for (const [index, sample] of samples.entries()) {
        assert.equal(sample.epoch, index); assert.equal(sample.waitMs, 125);
        assert.deepEqual(sample.observation.control, { value: 'Atlas', focused: true,
          selectionStart: selection[row.state][0], selectionEnd: selection[row.state][1], selectionDirection: selection[row.state][2] });
        assert.equal(sample.screenshot.caret, 'initial');
        const pngBytes = readFileSync(sample.screenshot.file);
        assert.equal(hash(pngBytes), sample.screenshot.sha256);
        pictures.push(PNG.sync.read(pngBytes)); epochs++;
      }
      const unique = new Set(samples.map(sample => sample.screenshot.sha256));
      if (['forward', 'backward'].includes(row.state)) {
        assert.equal(unique.size, side === 'reference' ? 1 : 2);
        if (side === 'astylar') {
          assert.equal(samples.filter(sample => sample.observation.caretMesh.visible).length, 3);
          const visible = pictures[samples.findIndex(sample => sample.observation.caretMesh.visible)];
          const hidden = pictures[samples.findIndex(sample => !sample.observation.caretMesh.visible)];
          let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
          for (let i = 0; i < visible.data.length; i += 4) if ([0, 1, 2, 3].some(c => visible.data[i + c] !== hidden.data[i + c])) {
            const x = (i / 4) % visible.width, y = Math.floor(i / 4 / visible.width);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          }
          assert.equal((maxY - minY + 1) / 2, 19.5);
          assert.equal((maxX - minX + 1) / 2, row.state === 'forward' ? 2.5 : 2);
        }
      } else assert.equal(unique.size, 2); // Collapsed positive/negative blink controls on both sides.
    }
  }
  for (const profile of ['light', 'dark', 'contrast', 'custom']) for (const state of Object.keys(selection))
    assert.ok(keys.has(`${profile}/${state}`));
  assert.equal(epochs, 192);
  // Bounded temporal observation, not equal Material typography or all-input/core closure.
});

test('progress focus paint preserves forty configured cases and paired raster failure evidence', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const read = (name, sha) => {
    const bytes = readFileSync(`artifacts/material-parity/${name}`);
    assert.equal(hash(bytes), sha);
    return bytes.toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
  };
  const candidate = read('progress-candidate-focus-paint-20261008.log',
    '5b498a2d6489924785a02968fd627acfa1ed5704b4b6437d3bca0172c1afc2af');
  const native = read('progress-reference-focus-paint-20261007.log',
    'd2a134f8e6134d9a99f1d7f25bec67c63f2ba9baed1ea1f85adc3c81f677f94f');
  const membership = read('progress-configured-input-membership-20261006.log',
    'd64d73bea9a8e7d6ad2640bea3bc6a59c072ae9465f1aa3ca8577c5111fb6684').slice(0, -1);
  const key = row => [row.family, row.profile, row.viewport.width, row.viewport.height, row.viewport.deviceScaleFactor].join('/');
  const expected = new Set(membership.map(key));
  assert.equal(membership.length, 40); assert.equal(expected.size, 32);
  for (const row of membership) for (const side of ['reference', 'astylar']) {
    const receipt = row.receipts[side].receipt;
    assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  }
  const helperSource = ts.createSourceFile('helper.mjs', readFileSync(candidate[0].helperSource, 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const helpers = helperSource.statements.filter(statement => ts.isFunctionDeclaration(statement) &&
    statement.name?.text === 'withFrozenShowcase');
  assert.equal(helpers.length, 1);
  assert.equal(hash(helpers[0].getText(helperSource)), candidate[0].helperMethodSha256);
  const checkpoint = readFileSync(candidate[0].checkpointFile);
  assert.equal(hash(checkpoint), candidate[0].checkpointSha256);
  assert.equal(candidate[0].checkpointSha256, native[0].checkpointSha256);
  assert.equal(candidate.at(-1).status, 'pass');
  for (const records of [candidate, native]) {
    assert.equal(records[0].configuredCases, 40); assert.equal(records[0].physicalCohorts, 32);
    const seen = new Set();
    for (const row of records.slice(1, -1)) {
      assert.ok(expected.has(key(row))); assert.ok(!seen.has(key(row))); seen.add(key(row));
      assert.deepEqual(row.errors, []);
      const images = ['before', 'after'].map(state => {
        const receipt = row.rasters[state];
        const bytes = Buffer.from(receipt.sameBytesAsBefore ? row.rasters.before.base64 : receipt.base64, 'base64');
        assert.equal(hash(bytes), receipt.sha256);
        const png = PNG.sync.read(bytes);
        assert.equal(png.width, Math.round(row.clip.width * row.viewport.deviceScaleFactor));
        assert.equal(png.height, Math.round(row.clip.height * row.viewport.deviceScaleFactor));
        return png;
      });
      let changed = 0;
      for (let i = 0; i < images[0].data.length; i += 4)
        if ([0, 1, 2, 3].some(channel => images[0].data[i + channel] !== images[1].data[i + channel])) changed++;
      assert.equal(changed, row.changedPixels);
      if (records === candidate) {
        assert.equal(row.before.tabindex, null); assert.equal(row.after.tabindex, null);
        assert.equal(row.after.activeTag, 'BODY'); assert.equal(row.after.focused, false);
        assert.equal(changed, 0); assert.ok(row.runtimeAssetsAuthenticated > 0);
      } else {
        assert.equal(row.before.attributes.tabindex, '-1'); assert.equal(row.after.focused, true);
        assert.equal(row.after.focusVisible, true);
        assert.equal(changed > 0, row.family === 'progress-spinner');
      }
    }
    assert.deepEqual([...seen].sort(), [...expected].sort());
  }
  // Unequal host focusability is retained; no tabindex injection or equal-input paint claim.
});

test('modal restoration attribution preserves matched removal and unequal close controls', () => {
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const read = (name, sha) => {
    const bytes = readFileSync(`artifacts/material-parity/${name}`);
    assert.equal(hash(bytes), sha);
    return bytes.toString('utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
  };
  const paired = read('modal-public-native-close-order-paired-20261008.log',
    'd5c508bdd631371cffc779f82201e33da763dd46eff51c3dbf27d977188e2cca');
  const removal = read('modal-native-node-removal-control-20261008.log',
    '58f6ab88c674e2318372c71a3fd1e247ffc8643b11fbd44c132b00dd287be6eb');
  const source = ts.createSourceFile('repro.mjs', readFileSync('scripts/audit-modal-reentrant-close.mjs', 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const literal = name => {
    const declarations = source.statements.filter(ts.isVariableStatement)
      .flatMap(statement => [...statement.declarationList.declarations])
      .filter(declaration => declaration.name.getText(source) === name);
    assert.equal(declarations.length, 1);
    assert.ok(ts.isNoSubstitutionTemplateLiteral(declarations[0].initializer));
    return declarations[0].initializer.text;
  };
  for (const records of [paired, removal]) {
    const receipt = records.at(-1);
    assert.equal(receipt.status, 'complete');
    assert.equal(receipt.observations, records.length - 1);
    assert.equal(receipt.applicationSource.replace(/\r\n/g, '\n'), literal('applicationSource'));
    assert.equal(receipt.dependencyCount, 2515);
    assert.equal(receipt.dependencyReceipt, '0d7db9c3ef706c49a949336f149623bf4a6f7c16ea9b834a5da3ff3a1ad5440e');
    assert.equal(receipt.bundleSha256, '81b89cb31e3b4c17fcb3a455c8dcdbf21ed9aa327733fe4e58a02aa5ad6ee544');
    assert.equal(receipt.browser, '154.0.8037.58');
  }
  assert.equal(removal.at(-1).nativeSource.replace(/\r\n/g, '\n'), literal('nativeSource'));
  assert.match(paired.at(-1).nativeSource, /modal\.close\(\)/);
  assert.match(removal.at(-1).nativeSource, /if\(removeNode\) modal\.remove\(\);else modal\.close\(\)/);
  const rows = [...paired.slice(0, -1), ...removal.slice(0, -1)];
  assert.equal(rows.length, 18);
  const keys = new Set();
  for (const row of rows) {
    const key = `${row.side}/${row.dpr}/${row.policy}`;
    assert.ok(!keys.has(key)); keys.add(key);
    assert.deepEqual(row.errors, []);
    assert.deepEqual(row.opened.diagnostics, []); assert.deepEqual(row.closed.diagnostics, []);
    assert.equal(row.opened.modal, true); assert.equal(row.opened.focus, 'action');
    assert.equal(row.closed.modal, false);
    assert.equal(row.closed.focus, row.side !== 'native' && row.policy === 'request-before-update' ? 'BODY' : 'trigger');
    if (row.policy !== 'default') assert.equal(row.closed.calls.find(call => typeof call === 'object').restorationAccepted,
      row.policy === 'update');
  }
  for (const side of ['astylar', 'native', 'native-remove']) for (const dpr of [1, 2])
    for (const policy of ['default', 'update', 'request-before-update']) assert.ok(keys.has(`${side}/${dpr}/${policy}`));
  // Original terminal dependency receipts, not a fresh whole-runtime applicability claim.
  // Native close retains its node; removal is the matched candidate lifecycle control.
});

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

test('remaining configured field popup bounds preserve exact actions and all eighty endpoints', () => {
  const file = 'artifacts/material-parity/field-popup-bounds-recovered-20261008/latest-report.json';
  const reportBytes = readFileSync(file);
  assert.equal(createHash('sha256').update(reportBytes).digest('hex'), '4e4582308f9f76be4f663992e0e94ecf6c5bd6d7a1be1523bcb3c25a6d4b754d');
  const report = JSON.parse(reportBytes);
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file,
    expectedProvenance: manifest.provenance,
    script: 'scripts/audit-material-configured-field-popup-bounds.mjs',
    styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  const action = report.actionSource, runner = readFileSync(action.file);
  assert.equal(hash(runner), action.sha256);
  assert.equal(action.sha256, manifest.provenance.harnessFiles.find(r => r.file === action.file).sha256);
  const ast = ts.createSourceFile(action.file, runner.toString(), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  assert.deepEqual(action.functionNames, ['profileTheme', 'sendShowcaseCommand', 'waitForThemeApplied',
    'settleInteraction', 'popupHoverBox', 'popupOptionBox', 'interactionTargetBox', 'performInteraction']);
  assert.equal(hash(action.functionNames.map(name => {
    const matches = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
    assert.equal(matches.length, 1); return matches[0].getText(ast);
  }).join('\n')), action.functionBodiesSha256);
  assert.equal(hash(readFileSync(action.cursorDependency.file)), action.cursorDependency.sha256);
  const states = { autocomplete: ['focus', 'held', 'activate', 'activate-leave', 'open-commit-reopen', 'open'],
    select: ['activate', 'activate-leave', 'open-commit-reopen', 'open'] };
  const expected = materialInteractionCases.filter(c => states[c.family]?.includes(c.state));
  assert.equal(expected.length, 80);
  assert.equal(report.results.length, 80);
  assert.deepEqual(report.results.map(r => r.caseId).sort(), expected.map(c => materialCaseKey('interaction', c)).sort());
  const screenshots = new Set();
  const originalBytes = readFileSync('artifacts/material-parity/current-full-20261005/latest-report.json');
  assert.equal(hash(originalBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
  const originals = new Map(JSON.parse(originalBytes).interactions.map(row => [materialCaseKey('interaction', row), row]));
  const layoutProperties = ['position', 'top', 'left', 'right', 'width', 'height', 'padding', 'margin', 'boxSizing', 'borderRadius'];
  for (const row of report.results) {
    assert.equal(row.caseId, materialCaseKey('interaction', row));
    const original = originals.get(row.caseId); assert.ok(original);
    const anchor = original.geometry.elements.find(e => e.id === `${row.family}-primary`);
    assert.ok(anchor && !anchor.missing);
    for (const side of ['reference', 'astylar']) {
      const evidence = row[side], receipt = evidence.screenshot;
      assert.ok(!screenshots.has(receipt.file)); screenshots.add(receipt.file);
      const bytes = readFileSync(receipt.file);
      assert.equal(hash(bytes), receipt.sha256);
      const image = PNG.sync.read(bytes);
      assert.deepEqual([image.width, image.height],
        [row.viewport.width * row.viewport.deviceScaleFactor, row.viewport.height * row.viewport.deviceScaleFactor]);
      for (const box of [evidence.observation.primary, evidence.observation.popup,
        ...evidence.observation.options.map(option => option.box)]) {
        assert.ok(['x', 'y', 'width', 'height'].every(k => Number.isFinite(box?.[k])));
        assert.ok(box.width > 0 && box.height > 0);
      }
      const capturedAnchor = evidence.observation.primary;
      const retainedAnchor = side === 'reference' ? anchor.expected : anchor.actual;
      for (const [captured, retained] of [['x', 'left'], ['y', 'top'], ['width', 'width'], ['height', 'height']]) {
        assert.ok(Math.abs(capturedAnchor[captured] - retainedAnchor[retained]) < .05);
      }
      const oldReceipt = original.inputTrees[side], oldBytes = readFileSync(oldReceipt.file);
      assert.equal(hash(oldBytes), oldReceipt.sha256);
      const trees = [JSON.parse(oldBytes), JSON.parse(readFileSync(evidence.inputTree.file))];
      const styles = trees.map(tree => {
        const panel = tree.nodes.find(node => side === 'reference'
          ? node.attributes?.class?.split(/\s+/).includes(row.family === 'select' ? 'mat-mdc-select-panel' : 'mat-mdc-autocomplete-panel')
          : node.authored?.id === (row.family === 'select' ? 'select-options' : 'field-options'));
        assert.ok(panel);
        return side === 'reference' ? tree.styles[panel.style] : panel.resolvedStyle;
      });
      for (const property of layoutProperties) {
        if (side === 'reference' && ['padding', 'margin'].includes(property)) {
          // Supplemental declared properties omit these shorthands, but retain
          // all four computed longhands. Preserve the omission, do not invent it.
          assert.equal(Object.hasOwn(styles[0], property), true);
          assert.equal(Object.hasOwn(styles[1], property), false);
          assert.equal(report.capture.styleProperties.includes(property), false);
          for (const edge of ['Top', 'Right', 'Bottom', 'Left']) {
            assert.equal(Object.hasOwn(styles[0], property + edge), true);
            assert.equal(Object.hasOwn(styles[1], property + edge), true);
            assert.equal(styles[0][property + edge], styles[1][property + edge]);
          }
          continue;
        }
        assert.equal(Object.hasOwn(styles[0], property), Object.hasOwn(styles[1], property));
        assert.equal(styles[0][property], styles[1][property]);
      }
    }
  }
  assert.equal(screenshots.size, 160);
  assert.equal(report.inputEquivalent, false);
  assert.equal(report.renderingEquivalent, false);
  // Receipt and observation completeness, not acceptance of measured differences.
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
  let layoutRequestJoins = 0;
  const popupLayoutProperties = ['position', 'top', 'left', 'right', 'width', 'height',
    'padding', 'margin', 'boxSizing', 'borderRadius'];
  assert.equal(report.captureProvenance.harnessFiles.length, 10);
  for (const receipt of report.captureProvenance.harnessFiles) {
    assert.equal(createHash('sha256').update(readFileSync(receipt.file)).digest('hex'), receipt.sha256,
      `Retained endpoint capture harness changed: ${receipt.file}`);
  }
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
        if (expectedOpen && row.state !== 'open-hover-content') {
          const baseline = cohort.find(other => other.state === 'open-hover-content' &&
            other.profile === row.profile && other.viewport.id === row.viewport.id);
          assert.ok(baseline);
          const baselineReceipt = baseline.inputTrees[side], baselineBytes = readFileSync(baselineReceipt.file);
          assert.equal(createHash('sha256').update(baselineBytes).digest('hex'), baselineReceipt.sha256);
          const baselineTree = JSON.parse(baselineBytes);
          const baselinePanel = baselineTree.nodes.find(node => node.key === panels[0].key);
          assert.ok(baselinePanel);
          const style = side === 'reference' ? tree.styles[panels[0].style] : panels[0].resolvedStyle;
          const baselineStyle = side === 'reference' ? baselineTree.styles[baselinePanel.style] : baselinePanel.resolvedStyle;
          for (const property of popupLayoutProperties) {
            assert.equal(Object.hasOwn(style, property), Object.hasOwn(baselineStyle, property));
            assert.equal(style[property], baselineStyle[property], `${family}/${row.state}/${side}/${property}`);
          }
          layoutRequestJoins++;
        }
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
  assert.equal(layoutRequestJoins, 160);
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
