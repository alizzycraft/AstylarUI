process.argv.splice(1, 0, "derived-remaining-static-ax");
// Bounded extension of the existing list AX capture: same pinned server and CDP procedure.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import path from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright-core';
import { fingerprintDirectory } from './tests/material-parity/run-checkpoint.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
assert.ok([3, 4].includes(process.argv.length));
const output = path.resolve(process.argv[2]);
assert.ok(output.startsWith(path.resolve('artifacts/material-parity') + path.sep));
assert.equal(existsSync(output), false);
const reportFile = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const reportBytes = readFileSync(reportFile);
assert.equal(hash(reportBytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const rows = JSON.parse(reportBytes).results.filter(row => !["card","expansion","grid-list","list","sidenav","stepper","table","tabs"].includes(row.family));
assert.equal(rows.length, 340);
if (process.argv[3]) assert.ok(process.argv[3].startsWith('--checkpoint='));
const checkpointFile = process.argv[3]?.slice('--checkpoint='.length)
  ?? 'artifacts/material-parity/divider-current-browser-20261020/checkpoint/manifest.json';
assert.ok(path.resolve(checkpointFile).startsWith(path.resolve('artifacts/material-parity') + path.sep));
const helperFile = 'tests/material-parity/sort-focus-structure.spec.mjs';
const helperSource = readFileSync(helperFile, 'utf8');
const ast = ts.createSourceFile(helperFile, helperSource, 99, true);
const helpers = ast.statements.filter(n => ts.isFunctionDeclaration(n) && n.name?.text === 'withFrozenShowcase');
assert.equal(helpers.length, 1);
const helper = helpers[0].getText(ast);
const withFrozenShowcase = new Function('assert', 'path', 'readFileSync', 'existsSync', 'fingerprintDirectory',
  'createServer', 'chromium', helper + ';return withFrozenShowcase;')
  (assert, path, readFileSync, existsSync, fingerprintDirectory, createServer, chromium);
mkdirSync(output, { recursive: true });
writeFileSync(path.join(output, 'producer.mjs'), process.execArgv[2]);
const provenance = { derivedCapture: receipt('scripts/capture-list-static-ax.mjs'), producer: receipt(path.join(output, 'producer.mjs')), baseProducer: receipt('scripts/capture-passive-static-ax.mjs'), remainingStaticDerivation: receipt('scripts/capture-remaining-static-ax.mjs'), reusedStaticAxReports: [{"file":"artifacts/material-parity/passive-static-ax-20261021/latest-report.json","sha256":"f4c570cd0db7742a1da8b3a49d45fdf3cfc00b99d5695adc5554ce2ad1717912"},{"file":"artifacts/material-parity/list-static-ax-current-checkpoint-20261021/latest-report.json","sha256":"bedbf72390784c5731fc594c0076507746581e466e0dd7701fb996ae3a6c5f32"},{"file":"artifacts/material-parity/card-static-ax-20261021/latest-report.json","sha256":"1cef2e23c59a7d472bf949b68ff229e36c1a44b26e7018cd0723cfef5e87e3aa"},{"file":"artifacts/material-parity/expansion-static-ax-20261021/latest-report.json","sha256":"c1ababf7c391ba769c5a25f41da09d5ed72d46445b95ee6caf73dd4687d6e597"},{"file":"artifacts/material-parity/stepper-static-ax-20261022/latest-report.json","sha256":"8db8555f87894a01ede3f71efd37209e9d651bdc92fdd0ec7aaed06f1cc925cf"},{"file":"artifacts/material-parity/tabs-static-ax-20261022/latest-report.json","sha256":"78c59cedbd0200b86abbdc0d78ab573ef9e1431b619ad0ea6f1a99c3cb40a434"}], report: receipt(reportFile),
  checkpoint: receipt(checkpointFile), serverHelper: receipt(helperFile), helperSource: helper,
  helperSha256: hash(helper), checkpointHelper: receipt('tests/material-parity/run-checkpoint.mjs') };
writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(provenance));
const observations = [];
try {
  await withFrozenShowcase(async (browser, baseUrl) => {
    for (const row of rows) for (const mode of ['reference', 'astylar']) {
      const { width, height, deviceScaleFactor } = row.viewport;
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      try {
        await page.goto(`${baseUrl}/${mode}/${row.family}?benchmark=1&profile=${row.profile}`);
        await page.locator('.frame').waitFor();
        if (mode === 'astylar') {
          await page.waitForFunction(() => !!window.__ASTYLAR_MATERIAL_BENCHMARK__);
          await page.evaluate(() => window.__ASTYLAR_MATERIAL_BENCHMARK__.waitForSettled());
        }
        await page.evaluate(async () => { await document.fonts.ready;
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); });
        const cdp = await page.context().newCDPSession(page);
        const { nodes } = await cdp.send('Accessibility.getFullAXTree');
        const dom = [];
        for (const backendNodeId of new Set(nodes.map(n => n.backendDOMNodeId).filter(Boolean))) {
          const { node } = await cdp.send('DOM.describeNode', { backendNodeId, depth: 0 });
          dom.push({ backendNodeId, nodeName: node.nodeName, nodeValue: node.nodeValue,
            attributes: node.attributes ?? [] });
        }
        const selector = mode === 'reference' ? `#${row.family}-primary` : `[data-astylar-id="${row.family}-primary"]`;
        const target = await page.locator(selector).evaluate(node => ({ tag: node.tagName,
          id: node.id, astylarId: node.getAttribute('data-astylar-id'), role: node.getAttribute('role'), text: node.textContent }));
        assert.deepEqual(errors, []);
        const file = `${row.family}-${row.profile}-${width}x${height}-dpr${deviceScaleFactor}-${mode}.json`;
        const observation = { family: row.family, profile: row.profile, viewport: row.viewport, mode, browser: browser.version(),
          target, nodes, dom, runtimeErrors: errors };
        const bytes = JSON.stringify(observation);
        writeFileSync(path.join(output, file), bytes);
        observations.push({ family: row.family, profile: row.profile, viewport: row.viewport, mode, file, sha256: hash(bytes),
          axNodes: nodes.length, describedBackendNodes: dom.length });
        await cdp.detach();
        console.log(JSON.stringify(observations.at(-1)));
      } finally { await page.close(); }
    }
  }, {}, { checkpointFile });
  assert.equal(observations.length, 680);
  for (const r of [provenance.producer, provenance.baseProducer, provenance.remainingStaticDerivation, ...provenance.reusedStaticAxReports, provenance.report, provenance.checkpoint, provenance.serverHelper, provenance.checkpointHelper])
    assert.equal(hash(readFileSync(r.file)), r.sha256);
  assert.deepEqual(fingerprintDirectory(path.resolve('examples/material-showcase/dist/material-showcase/browser')),
    JSON.parse(readFileSync(checkpointFile)).provenance.browserFiles);
  writeFileSync(path.join(output, 'latest-report.json'), JSON.stringify({ provenance, observations,
    boundary: 'Full actual AX trees and referenced backend DOM nodes for340 remaining pinned static contexts across28 families;96 prior pairs reused separately. No interaction-state replay,AT behavior,current source/build equivalence,pixel parity or complete case closure.' }));
} catch (error) {
  writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), stack: error.stack, observations }));
  throw error;
}
