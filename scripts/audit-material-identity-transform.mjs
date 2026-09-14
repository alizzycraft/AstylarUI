import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright-core';

// Read-only browser sensitivity and raw-population evidence. This does not
// modify the comparison or claim candidate layout/paint has been reproduced.
const capture = readFileSync('artifacts/material-parity/current-ancestry-audit/latest-report.json');
const captureSha256 = createHash('sha256').update(capture).digest('hex');
assert.equal(captureSha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
const raw = JSON.parse(capture), grouped = new Map();
let identityMatrixObservations = 0, candidateOmitted = 0;
for (const [kind, entries] of [['static', raw.results], ['interaction', raw.interactions]]) {
  for (const entry of entries) for (const input of entry.styleInputs ?? []) {
    if (input.reference?.transform?.replace(/\s/g, '') !== 'matrix(1,0,0,1,0,0)') continue;
    identityMatrixObservations++;
    if (input.astylar?.transform !== undefined) continue;
    candidateOmitted++;
    const key = JSON.stringify([entry.family, input.id]);
    let group = grouped.get(key);
    if (!group) grouped.set(key, group = { family: entry.family, element: input.id, occurrences: 0, cases: [] });
    group.occurrences++;
    group.cases.push(`${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`);
  }
}
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const runs = [];
try {
  for (const deviceScaleFactor of [1, 2]) {
    const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor });
    const observations = await page.evaluate(() => {
      document.body.style.margin = '0';
      const host = document.createElement('div'), fixed = document.createElement('div');
      host.style.cssText = 'margin:60px 0 0 80px;width:100px;height:100px';
      fixed.style.cssText = 'position:fixed;left:5px;top:7px;width:10px;height:10px';
      host.append(fixed); document.body.append(host);
      const rect = (element) => {
        const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height };
      };
      const fixedStates = [];
      for (const transform of ['', 'none', 'matrix(1,0,0,1,0,0)', 'translate(0px)', 'scale(1)', 'none', '']) {
        host.style.transform = transform;
        fixedStates.push({ requested: transform || '<omitted>', computed: getComputedStyle(host).transform,
          host: rect(host), child: rect(fixed) });
      }
      host.remove();
      const parent = document.createElement('div'), child = document.createElement('div'), sibling = document.createElement('div');
      parent.style.cssText = 'position:absolute;left:80px;top:60px;width:100px;height:100px';
      child.id = 'nested-high-z'; child.style.cssText = 'position:absolute;inset:0;z-index:100;background:red';
      sibling.id = 'sibling-low-z'; sibling.style.cssText = 'position:absolute;left:80px;top:60px;width:100px;height:100px;z-index:1;background:blue';
      parent.append(child); document.body.append(parent, sibling);
      const stackingStates = [];
      for (const transform of ['', 'none', 'matrix(1,0,0,1,0,0)', 'translate(0px)', 'scale(1)', 'none', '']) {
        parent.style.transform = transform;
        stackingStates.push({ requested: transform || '<omitted>', computed: getComputedStyle(parent).transform,
          topmostAtSharedPoint: document.elementFromPoint(100, 80)?.id });
      }
      parent.remove(); sibling.remove();
      return { fixedStates, stackingStates };
    });
    for (const state of observations.fixedStates) {
      const identity = !['<omitted>', 'none'].includes(state.requested);
      assert.deepEqual(state.host, { x: 80, y: 60, width: 100, height: 100 });
      assert.deepEqual(state.child, { x: identity ? 85 : 5, y: identity ? 67 : 7, width: 10, height: 10 });
    }
    for (const state of observations.stackingStates) {
      const identity = !['<omitted>', 'none'].includes(state.requested);
      assert.equal(state.topmostAtSharedPoint, identity ? 'sibling-low-z' : 'nested-high-z');
    }
    runs.push({ deviceScaleFactor, observations });
    await page.close();
  }
  console.log(JSON.stringify({ browserVersion: browser.version(), captureSha256,
    scope: 'Browser semantic sensitivity plus unchanged raw capture population; not a candidate renderer reproduction or proof that all affected fixtures visibly diverge',
    identityMatrixObservations, candidateOmitted, groups: [...grouped.values()], runs }));
} finally { await browser.close(); }
