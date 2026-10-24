import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { fingerprintDirectory, fingerprintModuleGraph, materialBrowserLaunchOptions, inspectMaterialBrowserLaunch, openMaterialCheckpoint } from '../tests/material-parity/run-checkpoint.mjs';
import { propertyGroups } from '../tests/material-parity/input-equivalence-policy.mjs';
import { validateSupplementalCapture } from '../tests/material-parity/supplemental-capture-evidence.mjs';

const script = 'scripts/audit-material-menu-mobile-ax.mjs';
const base = 'scripts/audit-material-menu-mobile-boundaries.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const bytes = readFileSync(base);
assert.equal(hash(bytes), '470ea048ee10980b422987c096ab4b479bfe2f25697eaf3657cc6c96cf5b4022');
if (process.argv[2] === '--verify') {
  const file = process.argv[3], report = JSON.parse(readFileSync(file));
  const manifest = JSON.parse(readFileSync(report.capture.checkpointManifest.file));
  assert.deepEqual(validateSupplementalCapture(report, { reportFile: file, expectedProvenance: manifest.provenance,
    script, styleProperties: Object.values(propertyGroups).flat() }), { status: 'checkpoint-bound', errors: [] });
  for (const receipt of [...manifest.provenance.harnessFiles, ...manifest.provenance.diagnosticFiles]) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
  assert.equal(report.results.length, 4);
  for (const row of report.results) {
    assert.deepEqual(row.boundaries.map(b => b.state), ['initial-closed', 'open-1', 'closed-1', 'open-2', 'closed-2', 'open-3', 'closed-3']);
    for (const b of row.boundaries) { assert.ok(b.observation.actualAX.nodes.length); assert.ok(b.observation.actualAX.dom.trigger); }
  }
  console.log(JSON.stringify({ reportSha256: hash(readFileSync(file)), physicalContexts: 2, sides: 4, AXBoundaries: 28 }));
} else {
  const output = path.resolve(process.argv[2] ?? '');
  assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
  const root = 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser';
  const launch = materialBrowserLaunchOptions(), browser = await chromium.launch(launch);
  let provenance;
  try { provenance = { browser: browser.version(), browserLaunch: await inspectMaterialBrowserLaunch(browser, launch),
    browserFiles: fingerprintDirectory(root), harnessFiles: fingerprintModuleGraph(process.cwd(), 'tests/material-parity/run-material-parity.mjs'),
    diagnosticFiles: [...fingerprintModuleGraph(process.cwd(), script), { file: base, sha256: hash(bytes) }] }; }
  finally { await browser.close(); }
  const checkpoint = output + '-provenance'; openMaterialCheckpoint({ directory: checkpoint, provenance });
  process.argv.splice(2, Infinity, '--output=' + output, '--checkpoint=' + checkpoint + '/checkpoint');
  let source = bytes.toString();
  const replace = (before, after) => { assert.equal(source.split(before).length, 2, before); source = source.replace(before, after); };
  replace("path.resolve('examples/material-showcase/dist/material-showcase/browser')", `path.resolve(${JSON.stringify(root)})`);
  replace("script: 'scripts/audit-material-menu-mobile-boundaries.mjs'", `script: ${JSON.stringify(script)}`);
  replace("'waitForThemeApplied', 'settleInteraction'];", "'waitForThemeApplied', 'settleInteraction', 'measureAstylarInputs'];");
  replace("await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.measure([]).inputTree)", '(await helpers.measureAstylarInputs(page, [])).inputTree');
  replace("const tree = mode === 'reference'", `const cdp = await context.newCDPSession(page);
        const { root: documentRoot } = await cdp.send('DOM.getDocument');
        const dom = {};
        for (const [key, selector] of Object.entries(mode === 'reference'
          ? { trigger: '#menu-primary', popup: '.mat-mdc-menu-panel', rename: '.mat-mdc-menu-panel button:nth-child(1)', delete: '.mat-mdc-menu-panel button:nth-child(2)' }
          : { trigger: '[data-astylar-id="menu-primary"]', popup: '[data-astylar-id="menu-popup"]', rename: '[data-astylar-id="menu-rename"]', delete: '[data-astylar-id="menu-delete"]' })) {
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: documentRoot.nodeId, selector });
          if (!nodeId) { dom[key] = null; continue; }
          const { node } = await cdp.send('DOM.describeNode', { nodeId });
          dom[key] = { backendNodeId: node.backendNodeId, ...await page.locator(selector).evaluate(n => ({ id: n.id, role: n.getAttribute('role'), controls: n.getAttribute('aria-controls'), expanded: n.getAttribute('aria-expanded'), tabindex: n.getAttribute('tabindex'), focused: n === document.activeElement })) };
        }
        observation.actualAX = { dom, ...await cdp.send('Accessibility.getFullAXTree') };
        await cdp.detach();
        const tree = mode === 'reference'`);
  replace('not current full paint or ownership cause acceptance', 'actual DOM/AX at each boundary on retained build;not current renderer,AT speech,paint or ownership cause acceptance');
  const ast = ts.createSourceFile(base, source, 99, true, ts.ScriptKind.JS); assert.equal(ast.parseDiagnostics.length, 0);
  for (const node of ast.statements.filter(ts.isImportDeclaration).toReversed()) {
    const name = node.moduleSpecifier.text; if (name.startsWith('node:')) continue;
    const url = name.startsWith('.') ? pathToFileURL(path.resolve(path.dirname(base), name)).href : import.meta.resolve(name);
    source = source.slice(0, node.moduleSpecifier.getStart(ast)) + JSON.stringify(url) + source.slice(node.moduleSpecifier.end);
  }
  await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}
