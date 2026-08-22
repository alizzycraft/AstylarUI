import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';
import { ssim } from 'ssim.js';

const ROOT = process.cwd();
const BASE_URL = process.env['ASTYLAR_PARITY_BASE_URL'] ?? 'http://127.0.0.1:4300';
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'parity');
const enforceThresholds = process.argv.includes('--enforce');
const shouldStartServer = !process.env['ASTYLAR_PARITY_BASE_URL'];
const viewportProfiles = {
  desktop: { id: 'desktop', width: 800, height: 600, deviceScaleFactor: 1 },
  tablet: { id: 'tablet', width: 640, height: 720, deviceScaleFactor: 1 },
  mobile: { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 1 }
};

const thresholds = {
  edgeTolerancePx: 2,
  maximumEdgeErrorPx: 5,
  minimumEdgesWithinTolerance: 0.95,
  minimumFixtureSsim: 0.95,
  minimumMedianSsim: 0.98
};
const freshGeometryTolerancePx = 0.5;

let server;
let browser;

try {
  if (shouldStartServer) {
    server = startDevelopmentServer();
  }
  await waitForServer(`${BASE_URL}/parity/fixtures.json`);

  const manifestResponse = await fetch(`${BASE_URL}/parity/fixtures.json`);
  if (!manifestResponse.ok) {
    throw new Error(`Unable to load fixture manifest: ${manifestResponse.status}`);
  }
  const manifestFixtures = await manifestResponse.json();
  const requestedFixtureId = process.env['ASTYLAR_PARITY_FIXTURE'];
  const fixtures = requestedFixtureId
    ? manifestFixtures.filter((fixture) => fixture.id === requestedFixtureId)
    : manifestFixtures;
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error(requestedFixtureId
      ? `Parity fixture "${requestedFixtureId}" was not found in the manifest`
      : 'Parity fixture manifest is empty');
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  browser = await chromium.launch({
    channel: process.env['ASTYLAR_PARITY_BROWSER_CHANNEL'] ?? 'chrome',
    headless: true
  });

  const contexts = new Map();
  const results = [];

  for (const fixture of fixtures) {
    const viewportIds = fixture.viewportIds ?? ['desktop'];
    for (const viewportId of viewportIds) {
      const viewport = viewportProfiles[viewportId];
      if (!viewport) {
        throw new Error(`Unknown viewport profile "${viewportId}" for fixture "${fixture.id}"`);
      }
      let context = contexts.get(viewportId);
      if (!context) {
        context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: viewport.deviceScaleFactor,
          colorScheme: 'light',
          reducedMotion: 'reduce'
        });
        contexts.set(viewportId, context);
      }
      results.push(await measureFixture(context, fixture, viewport));
    }
    if (fixture.responsiveSequence) {
      const desktopContext = contexts.get('desktop');
      if (!desktopContext) {
        throw new Error(`Responsive sequence for "${fixture.id}" requires a desktop context`);
      }
      results.push(...await measureResponsiveFixture(desktopContext, fixture, results));
    }
    if (fixture.dynamicStepCount) {
      const desktopContext = contexts.get('desktop');
      if (!desktopContext) {
        throw new Error(`Dynamic sequence for "${fixture.id}" requires a desktop context`);
      }
      results.push(...await measureDynamicFixture(contexts, fixture));
    }
    if (fixture.interactionStepCount) {
      const desktopContext = contexts.get('desktop');
      if (!desktopContext) {
        throw new Error(`Interaction sequence for "${fixture.id}" requires a desktop context`);
      }
      results.push(...await measureInteractionFixture(desktopContext, fixture));
    }
  }

  const summary = summarize(results);
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    thresholds,
    summary,
    fixtures: results
  };

  await writeFile(
    path.join(ARTIFACTS_DIR, 'latest-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8'
  );

  printSummary(report);

  if (results.some((result) => result.runtimeErrors.length > 0)) {
    process.exitCode = 1;
  } else if (enforceThresholds && !summary.meetsCompletionThresholds) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  server?.kill();
}

function startDevelopmentServer() {
  const child = spawn(
    process.execPath,
    [
      path.join(ROOT, 'node_modules', '@angular', 'cli', 'bin', 'ng.js'),
      'serve',
      '--host',
      '127.0.0.1',
      '--port',
      '4300'
    ],
    {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    }
  );

  let recentOutput = '';
  const capture = (chunk) => {
    recentOutput = `${recentOutput}${chunk.toString()}`.slice(-8000);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('exit', (code) => {
    if (code && !process.exitCode) {
      console.error(`Angular development server exited with code ${code}:\n${recentOutput}`);
      process.exitCode = 1;
    }
  });
  return child;
}

async function waitForServer(url) {
  const deadline = Date.now() + 120_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}: ${String(lastError)}`);
}

async function measureFixture(context, fixture, viewport) {
  const fixtureDir = viewport.id === 'desktop'
    ? path.join(ARTIFACTS_DIR, fixture.id)
    : path.join(ARTIFACTS_DIR, fixture.id, viewport.id);
  await mkdir(fixtureDir, { recursive: true });
  const viewportQuery = `?viewport=${encodeURIComponent(viewport.id)}`;

  const reference = await captureMode(
    context,
    `${BASE_URL}/parity/reference/${encodeURIComponent(fixture.id)}${viewportQuery}`,
    '#parity-reference-viewport',
    path.join(fixtureDir, 'reference.png'),
    fixture.semanticIds,
  );
  let astylar = await captureMode(
    context,
    `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}${viewportQuery}`,
    '#parity-astylar-canvas',
    path.join(fixtureDir, 'astylar.png'),
    fixture.semanticIds,
  );

  let screenshotSimilarity = comparePng(reference.screenshot, astylar.screenshot);
  if (screenshotSimilarity < 0.5 && astylar.pageErrors.length === 0 &&
      astylar.report.errors.length === 0) {
    console.warn(
      `Retrying catastrophic Astylar capture for ${fixture.id}@${viewport.id} ` +
      `(SSIM=${screenshotSimilarity.toFixed(4)})`,
    );
    astylar = await captureMode(
      context,
      `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}${viewportQuery}`,
      '#parity-astylar-canvas',
      path.join(fixtureDir, 'astylar.png'),
      fixture.semanticIds,
    );
    screenshotSimilarity = comparePng(reference.screenshot, astylar.screenshot);
  }
  const geometry = compareGeometry(reference.report, astylar.report);
  const visibility = compareVisibility(reference.report, astylar.report);
  const scrolling = compareScrolling(reference.report, astylar.report);
  const text = compareText(reference.report, astylar.report);
  const styles = compareStyles(reference.report, astylar.report, fixture.enforcedStyleProperties);
  const semanticErrors = compareSemantics(reference.semantics, astylar.semantics);
  const runtimeErrors = [
    ...reference.pageErrors.map((error) => `reference: ${error}`),
    ...astylar.pageErrors.map((error) => `astylar: ${error}`),
    ...reference.report.errors.map((error) => `reference: ${error}`),
    ...astylar.report.errors.map((error) => `astylar: ${error}`),
    ...semanticErrors,
    ...styles.errors.map((error) => `style: ${error}`),
  ];

  return {
    id: fixture.id,
    viewport,
    title: fixture.title,
    category: fixture.category,
    expectedBehavior: fixture.expectedBehavior,
    screenshotSimilarity,
    geometry,
    visibility,
    scrolling,
    text,
    styles,
    semantics: {
      reference: reference.semantics,
      astylar: astylar.semantics,
    },
    runtimeErrors,
    reference: reference.report,
    astylar: astylar.report
  };
}

async function captureMode(context, url, selector, screenshotPath, semanticIds = []) {
  const page = await context.newPage();
  await installDeterministicAssetDelay(page);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__ASTYLAR_PARITY_REPORT__?.ready === true,
    undefined,
    { timeout: 30_000 }
  );
  const report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
  const semantics = await captureSemanticSnapshots(
    page,
    url.includes('/parity/astylar/') ? 'astylar' : 'reference',
    semanticIds,
  );
  const screenshot = await page.locator(selector).screenshot({
    path: screenshotPath,
    animations: 'disabled'
  });
  await page.close();

  if (!report) {
    throw new Error(`Parity report was not published for ${url}`);
  }
  return { report, screenshot, pageErrors, semantics };
}

function escapeSelectorValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"');
}

async function captureSemanticSnapshots(page, mode, semanticIds = []) {
  const semantics = {};
  if (!semanticIds?.length) return semantics;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('Accessibility.enable');
  const documentNode = await cdp.send('DOM.getDocument', { depth: 0 });
  for (const id of semanticIds ?? []) {
    const semanticSelector = mode === 'astylar'
      ? `[data-astylar-id="${escapeSelectorValue(id)}"]`
      : `#${escapeSelectorValue(id)}`;
    const semanticNode = page.locator(semanticSelector);
    if (await semanticNode.count() !== 1) {
      semantics[id] = undefined;
      continue;
    }
    const domNode = await cdp.send('DOM.querySelector', {
      nodeId: documentNode.root.nodeId,
      selector: semanticSelector,
    });
    const partialTree = domNode.nodeId
      ? await cdp.send('Accessibility.getPartialAXTree', {
          nodeId: domNode.nodeId,
          fetchRelatives: false,
        })
      : { nodes: [] };
    semantics[id] = {
      tree: await semanticNode.ariaSnapshot(),
      node: normalizeAccessibilityNode(partialTree.nodes[0]),
    };
  }
  await cdp.detach();
  return semantics;
}

async function installAnnouncementCapture(page, mode, announcementIds = []) {
  if (!announcementIds?.length) return;
  await page.evaluate(({ captureMode, ids }) => {
    const selectorFor = (id) => captureMode === 'astylar'
      ? `[data-astylar-id="${CSS.escape(id)}"]`
      : `#${CSS.escape(id)}`;
    window.__ASTYLAR_PARITY_ANNOUNCEMENTS__ = [];
    window.__ASTYLAR_PARITY_ANNOUNCEMENT_OBSERVERS__ = ids.flatMap((id) => {
      const region = document.querySelector(selectorFor(id));
      if (!region) return [];
      const observer = new MutationObserver(() => {
        const text = (region.textContent ?? '').trim();
        if (text) window.__ASTYLAR_PARITY_ANNOUNCEMENTS__.push({ id, text });
      });
      observer.observe(region, { childList: true, characterData: true, subtree: true });
      return [observer];
    });
  }, { captureMode: mode, ids: announcementIds });
}

async function captureAnnouncements(page) {
  return page.evaluate(() => [...(window.__ASTYLAR_PARITY_ANNOUNCEMENTS__ ?? [])]);
}

function compareAnnouncements(reference, astylar) {
  return JSON.stringify(reference ?? []) === JSON.stringify(astylar ?? [])
    ? []
    : [`announcement log differs (${JSON.stringify(reference ?? [])} vs ${JSON.stringify(astylar ?? [])})`];
}

function normalizeAccessibilityNode(node) {
  if (!node) return undefined;
  const supportedProperties = new Set([
    'checked', 'disabled', 'expanded', 'focused', 'invalid', 'level', 'modal',
    'multiselectable', 'readonly', 'required', 'selected', 'url',
  ]);
  return {
    role: node.role?.value,
    name: node.name?.value,
    description: node.description?.value,
    value: node.value?.value,
    properties: Object.fromEntries(
      (node.properties ?? [])
        .filter((property) => supportedProperties.has(property.name))
        .map((property) => [property.name, property.value?.value]),
    ),
  };
}

async function measureDynamicFixture(contexts, fixture) {
  const context = contexts.get('desktop');
  if (!context) throw new Error('Missing desktop dynamic viewport context');
  const sequenceDir = path.join(ARTIFACTS_DIR, fixture.id, 'updates');
  await mkdir(sequenceDir, { recursive: true });
  const freshStates = [];
  for (let index = 0; index < fixture.dynamicStepCount; index += 1) {
    const viewportId = fixture.lifecycleViewports?.[index] ?? 'desktop';
    const freshContext = contexts.get(viewportId);
    if (!freshContext) throw new Error(`Missing dynamic viewport context: ${viewportId}`);
    const query = `?viewport=${viewportId}&dynamic-state=${index}`;
    freshStates.push({
      reference: await captureMode(
        freshContext,
        `${BASE_URL}/parity/reference/${encodeURIComponent(fixture.id)}${query}`,
        '#parity-reference-viewport',
        path.join(sequenceDir, `${index + 1}-fresh-reference.png`),
        fixture.semanticIds,
      ),
      astylar: await captureMode(
        freshContext,
        `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}${query}`,
        '#parity-astylar-canvas',
        path.join(sequenceDir, `${index + 1}-fresh-astylar.png`),
        fixture.semanticIds,
      ),
    });
  }
  const referenceStates = await captureDynamicMode(
    context,
    `${BASE_URL}/parity/reference/${encodeURIComponent(fixture.id)}?viewport=desktop&dynamic=true`,
    '#parity-reference-viewport',
    'reference',
    sequenceDir,
    fixture.dynamicStepCount,
    fixture.lifecycleViewports,
    false,
    fixture.semanticIds,
    fixture.announcementIds,
  );
  let astylarStates = await captureDynamicMode(
    context,
    `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}?viewport=desktop&dynamic=true`,
    '#parity-astylar-canvas',
    'astylar',
    sequenceDir,
    fixture.dynamicStepCount,
    fixture.lifecycleViewports,
    true,
    fixture.semanticIds,
    fixture.announcementIds,
  );
  const catastrophicDynamicIndex = findCatastrophicCapture(referenceStates, astylarStates);
  if (catastrophicDynamicIndex >= 0) {
    console.warn(
      `Retrying catastrophic Astylar dynamic sequence for ${fixture.id} ` +
      `(step ${catastrophicDynamicIndex + 1})`,
    );
    astylarStates = await captureDynamicMode(
      context,
      `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}?viewport=desktop&dynamic=true`,
      '#parity-astylar-canvas',
      'astylar',
      sequenceDir,
      fixture.dynamicStepCount,
      fixture.lifecycleViewports,
      true,
      fixture.semanticIds,
      fixture.announcementIds,
    );
  }

  return referenceStates.map((reference, index) => {
    const astylar = astylarStates[index];
    const fresh = freshStates[index];
    const styles = compareStyles(
      reference.report,
      astylar.report,
      fixture.enforcedStyleProperties,
    );
    const runtimeErrors = [
      ...reference.pageErrors.map((error) => `reference: ${error}`),
      ...astylar.pageErrors.map((error) => `astylar: ${error}`),
      ...fresh.reference.pageErrors.map((error) => `fresh reference: ${error}`),
      ...fresh.astylar.pageErrors.map((error) => `fresh astylar: ${error}`),
      ...reference.report.errors.map((error) => `reference: ${error}`),
      ...astylar.report.errors.map((error) => `astylar: ${error}`),
      ...compareSemantics(reference.semantics, astylar.semantics),
      ...compareAnnouncements(reference.announcements, astylar.announcements)
        .map((error) => `announcement: ${error}`),
      ...compareSemantics(fresh.reference.semantics, reference.semantics)
        .map((error) => `reference update: ${error}`),
      ...compareSemantics(fresh.astylar.semantics, astylar.semantics)
        .map((error) => `astylar update: ${error}`),
      ...styles.errors.map((error) => `style: ${error}`),
    ];
    const comparisons = [
      ['reference', fresh.reference.report, reference.report],
      ['astylar', fresh.astylar.report, astylar.report],
    ];
    for (const [label, expected, actual] of comparisons) {
      const geometry = compareGeometry(expected, actual);
      const text = compareText(expected, actual);
      if ((geometry.maximumEdgeError ?? Infinity) > freshGeometryTolerancePx) {
        runtimeErrors.push(`${label}: in-place update ${index + 1} differs from fresh geometry`);
      }
      if (!text.allContentMatches || !text.allLineCountsMatch) {
        runtimeErrors.push(`${label}: in-place update ${index + 1} differs from fresh text`);
      }
    }
    const freshResources = fresh.astylar.report.resources;
    const currentResources = astylar.report.resources;
    if (
      freshResources && currentResources &&
      (currentResources.meshes !== freshResources.meshes ||
        currentResources.materials > freshResources.materials ||
        currentResources.textures > freshResources.textures)
    ) {
      runtimeErrors.push(
        `astylar: in-place update ${index + 1} resource counts exceed fresh render ` +
        `(${JSON.stringify(currentResources)} vs ${JSON.stringify(freshResources)})`,
      );
    }
    const freshRegistries = fresh.astylar.report.registries;
    const currentRegistries = astylar.report.registries;
    if (
      freshRegistries && currentRegistries &&
      (freshRegistries.elements !== currentRegistries.elements ||
        freshRegistries.inputs !== currentRegistries.inputs)
    ) {
      runtimeErrors.push(
        `astylar: in-place update ${index + 1} registry counts differ from fresh render ` +
        `(${JSON.stringify(currentRegistries)} vs ${JSON.stringify(freshRegistries)})`,
      );
    }
    if (fixture.visualReuseStepIndexes?.includes(index)) {
      const reconciliation = astylar.report.visualReconciliation;
      if (reconciliation?.strategy !== 'reuse' || reconciliation.last.reflowed !== 0 ||
          reconciliation.last.reused < 1) {
        runtimeErrors.push(
          `astylar: update ${index + 1} did not use visual-owner reuse ` +
          `${JSON.stringify(reconciliation)}`,
        );
      }
      if (index > 0) {
        const previousOwners = astylarStates[index - 1].report.visualOwners ?? {};
        const currentOwners = astylar.report.visualOwners ?? {};
        for (const [elementId, token] of Object.entries(previousOwners)) {
          if (currentOwners[elementId] !== token) {
            runtimeErrors.push(
              `astylar: update ${index + 1} replaced visual owner ${elementId} ` +
              `(${token} -> ${currentOwners[elementId]})`,
            );
          }
        }
      }
    }
    if (fixture.visualOwnerReuseStepIndexes?.includes(index)) {
      const reconciliation = astylar.report.visualReconciliation;
      if (!reconciliation || reconciliation.last.reused < 1) {
        runtimeErrors.push(
          `astylar: update ${index + 1} did not retain any visual owners ` +
          `${JSON.stringify(reconciliation)}`,
        );
      }
      if (index > 0) {
        const previousOwners = astylarStates[index - 1].report.visualOwners ?? {};
        const currentOwners = astylar.report.visualOwners ?? {};
        for (const [elementId, token] of Object.entries(previousOwners)) {
          if (currentOwners[elementId] !== undefined && currentOwners[elementId] !== token) {
            runtimeErrors.push(
              `astylar: visual update ${index + 1} replaced compatible owner ${elementId} ` +
              `(${token} -> ${currentOwners[elementId]})`,
            );
          }
        }
      }
    }
    if (index === astylarStates.length - 1 && astylar.disposal) {
      const before = astylar.disposal.before;
      const after = astylar.disposal.after;
      const resources = after.resources;
      if (
        (fixture.lifecycleViewports && before.inputs < 1) ||
        before.cleanupRegistrations < 1 ||
        after.sessionStatus !== 'disposed' ||
        !after.engineDisposed ||
        !after.sceneDisposed ||
        after.cleanupRegistrations !== 0 ||
        after.semanticNodes !== 0 ||
        after.semanticEventRegistrations !== 0 ||
        after.semanticObserverRegistrations !== 0 ||
        after.elements !== 0 ||
        after.inputs !== 0 ||
        !resources || resources.meshes !== 0 || resources.materials !== 0 || resources.textures !== 0
      ) {
        runtimeErrors.push(`astylar: disposal did not clean lifecycle state ${JSON.stringify(astylar.disposal)}`);
      }
    }
    return {
      id: fixture.id,
      scenario: `update-${index + 1}`,
      viewport: viewportProfiles[fixture.lifecycleViewports?.[index] ?? 'desktop'],
      title: fixture.title,
      category: fixture.category,
      expectedBehavior: fixture.expectedBehavior,
      screenshotSimilarity: comparePng(reference.screenshot, astylar.screenshot),
      geometry: compareGeometry(reference.report, astylar.report),
      text: compareText(reference.report, astylar.report),
      styles,
      semantics: { reference: reference.semantics, astylar: astylar.semantics },
      announcements: {
        reference: reference.announcements,
        astylar: astylar.announcements,
      },
      runtimeErrors,
      reference: reference.report,
      astylar: astylar.report,
    };
  });
}

async function captureDynamicMode(
  context,
  url,
  selector,
  mode,
  sequenceDir,
  stepCount,
  lifecycleViewports = [],
  disposeAfter = false,
  semanticIds = [],
  announcementIds = [],
) {
  const page = await context.newPage();
  await installDeterministicAssetDelay(page);
  const pageErrors = [];
  const states = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(
    () => typeof window.__ASTYLAR_PARITY_APPLY_STEP__ === 'function',
    undefined,
    { timeout: 30_000 },
  );
  await installAnnouncementCapture(page, mode, announcementIds);

  let previousRevision = 0;
  for (let index = 0; index < stepCount; index += 1) {
    const viewportId = lifecycleViewports[index];
    if (viewportId) {
      const viewport = viewportProfiles[viewportId];
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    }
    await page.evaluate(
      ({ stepIndex, targetViewport }) => window.__ASTYLAR_PARITY_APPLY_STEP__?.(
        stepIndex,
        targetViewport,
      ),
      { stepIndex: index, targetViewport: viewportId },
    );
    await page.waitForFunction(
      (afterRevision) => {
        const report = window.__ASTYLAR_PARITY_REPORT__;
        return report?.ready === true && (report.revision ?? 0) > afterRevision;
      },
      previousRevision,
      { timeout: 30_000 },
    );
    await page.waitForLoadState('networkidle');
    const report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
    if (!report) throw new Error(`${mode} dynamic step ${index + 1} did not publish a report`);
    previousRevision = report.revision ?? previousRevision + 1;
    const screenshot = await page.locator(selector).screenshot({
      path: path.join(sequenceDir, `${index + 1}-live-${mode}.png`),
      animations: 'disabled',
    });
    const semantics = await captureSemanticSnapshots(page, mode, semanticIds);
    const announcements = await captureAnnouncements(page);
    states.push({ report, screenshot, pageErrors: [...pageErrors], semantics, announcements });
  }
  const disposal = disposeAfter
    ? await page.evaluate(() => window.__ASTYLAR_PARITY_DISPOSE__?.())
    : undefined;
  await page.close();
  if (disposal && states.length) states.at(-1).disposal = disposal;
  return states;
}

async function measureInteractionFixture(context, fixture) {
  const sequenceDir = path.join(ARTIFACTS_DIR, fixture.id, 'interaction');
  await mkdir(sequenceDir, { recursive: true });
  const referenceStates = await captureInteractionMode(
    context,
    `${BASE_URL}/parity/reference/${encodeURIComponent(fixture.id)}?viewport=desktop&interaction=true`,
    '#parity-reference-viewport',
    'reference',
    sequenceDir,
    fixture.interactionStepCount,
    false,
    fixture.semanticIds,
    fixture.announcementIds,
  );
  let astylarStates = await captureInteractionMode(
    context,
    `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}?viewport=desktop&interaction=true`,
    '#parity-astylar-canvas',
    'astylar',
    sequenceDir,
    fixture.interactionStepCount,
    !!fixture.interactionCycleLength,
    fixture.semanticIds,
    fixture.announcementIds,
  );
  const catastrophicInteractionIndex = findCatastrophicCapture(referenceStates, astylarStates);
  if (catastrophicInteractionIndex >= 0) {
    console.warn(
      `Retrying catastrophic Astylar interaction sequence for ${fixture.id} ` +
      `(step ${catastrophicInteractionIndex + 1})`,
    );
    astylarStates = await captureInteractionMode(
      context,
      `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}?viewport=desktop&interaction=true`,
      '#parity-astylar-canvas',
      'astylar',
      sequenceDir,
      fixture.interactionStepCount,
      !!fixture.interactionCycleLength,
      fixture.semanticIds,
      fixture.announcementIds,
    );
  }

  return referenceStates.map((reference, index) => {
    const astylar = astylarStates[index];
    const interactionErrors = compareInteraction(reference.report, astylar.report, fixture);
    const lifecycleErrors = compareInteractionLifecycle(fixture, astylarStates, index);
    const styles = compareStyles(
      reference.report,
      astylar.report,
      fixture.enforcedStyleProperties,
    );
    return {
      id: fixture.id,
      scenario: `interaction-${index + 1}`,
      viewport: viewportProfiles.desktop,
      title: fixture.title,
      category: fixture.category,
      expectedBehavior: fixture.expectedBehavior,
      screenshotSimilarity: comparePng(reference.screenshot, astylar.screenshot),
      geometry: compareGeometry(reference.report, astylar.report),
      text: compareText(reference.report, astylar.report),
      styles,
      semantics: { reference: reference.semantics, astylar: astylar.semantics },
      announcements: {
        reference: reference.announcements,
        astylar: astylar.announcements,
      },
      runtimeErrors: [
        ...reference.pageErrors.map((error) => `reference: ${error}`),
        ...astylar.pageErrors.map((error) => `astylar: ${error}`),
        ...reference.report.errors.map((error) => `reference: ${error}`),
        ...astylar.report.errors.map((error) => `astylar: ${error}`),
        ...compareSemantics(reference.semantics, astylar.semantics),
        ...compareAnnouncements(reference.announcements, astylar.announcements)
          .map((error) => `announcement: ${error}`),
        ...interactionErrors.map((error) => `interaction: ${error}`),
        ...styles.errors.map((error) => `style: ${error}`),
        ...lifecycleErrors,
      ],
      reference: reference.report,
      astylar: astylar.report,
    };
  });
}

async function captureInteractionMode(
  context,
  url,
  selector,
  mode,
  sequenceDir,
  stepCount,
  disposeAfter = false,
  semanticIds = [],
  announcementIds = [],
) {
  const page = await context.newPage();
  const pageErrors = [];
  const states = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__ASTYLAR_PARITY_REPORT__?.ready === true &&
      typeof window.__ASTYLAR_PARITY_CAPTURE_INTERACTION__ === 'function' &&
      Array.isArray(window.__ASTYLAR_PARITY_INTERACTION_STEPS__),
    undefined,
    { timeout: 30_000 },
  );
  const steps = await page.evaluate(() => window.__ASTYLAR_PARITY_INTERACTION_STEPS__);
  if (!steps || steps.length !== stepCount) {
    throw new Error(`${mode} interaction steps differ from manifest for ${url}`);
  }
  await installAnnouncementCapture(page, mode, announcementIds);
  let report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
  let previousRevision = report?.revision ?? 0;

  for (let index = 0; index < stepCount; index += 1) {
    for (const action of steps[index].actions) {
      await performInteractionAction(page, mode, action, report);
    }
    // The measured-pointer helper may scroll the outer harness document to
    // expose a target. That scroll is not fixture state, so restore it before
    // measuring the browser against the canvas.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => window.__ASTYLAR_PARITY_CAPTURE_INTERACTION__?.());
    await page.waitForFunction(
      (afterRevision) => (window.__ASTYLAR_PARITY_REPORT__?.revision ?? 0) > afterRevision,
      previousRevision,
      { timeout: 30_000 },
    );
    report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
    if (!report) throw new Error(`${mode} interaction step ${index + 1} did not publish a report`);
    previousRevision = report.revision ?? previousRevision + 1;
    const screenshot = await page.locator(selector).screenshot({
      path: path.join(sequenceDir, `${index + 1}-${mode}.png`),
      animations: 'disabled',
    });
    const semantics = await captureSemanticSnapshots(page, mode, semanticIds);
    const announcements = await captureAnnouncements(page);
    states.push({ report, screenshot, pageErrors: [...pageErrors], semantics, announcements });
  }
  const disposal = disposeAfter
    ? await page.evaluate(() => window.__ASTYLAR_PARITY_DISPOSE__?.())
    : undefined;
  await page.close();
  if (disposal && states.length) states.at(-1).disposal = disposal;
  return states;
}

function compareInteractionLifecycle(fixture, astylarStates, index) {
  const cycleLength = fixture.interactionCycleLength;
  if (!cycleLength) return [];
  if (cycleLength < 1 || fixture.interactionStepCount < cycleLength * 3 ||
      fixture.interactionStepCount % cycleLength !== 0) {
    return index === 0
      ? [`astylar: invalid interaction lifecycle cycle configuration (${JSON.stringify({
          interactionStepCount: fixture.interactionStepCount,
          interactionCycleLength: cycleLength,
        })})`]
      : [];
  }

  const errors = [];
  const cycleIndex = Math.floor(index / cycleLength);
  if (cycleIndex >= 2) {
    const phase = index % cycleLength;
    const baseline = astylarStates[cycleLength + phase]?.report;
    const current = astylarStates[index]?.report;
    const baselineResources = baseline?.resources;
    const currentResources = current?.resources;
    if (!baselineResources || !currentResources ||
        currentResources.meshes > baselineResources.meshes ||
        currentResources.materials > baselineResources.materials ||
        currentResources.textures > baselineResources.textures) {
      errors.push(
        `astylar: interaction lifecycle resources grew at cycle ${cycleIndex + 1}, ` +
        `phase ${phase + 1} (${JSON.stringify(currentResources)} vs ` +
        `${JSON.stringify(baselineResources)})`,
      );
    }

    const baselineRegistries = baseline?.registries;
    const currentRegistries = current?.registries;
    if (!baselineRegistries || !currentRegistries ||
        JSON.stringify(currentRegistries) !== JSON.stringify(baselineRegistries)) {
      errors.push(
        `astylar: interaction lifecycle registries changed at cycle ${cycleIndex + 1}, ` +
        `phase ${phase + 1} (${JSON.stringify(currentRegistries)} vs ` +
        `${JSON.stringify(baselineRegistries)})`,
      );
    }

    const baselineRegistrations = baseline?.interaction?.registrations;
    const currentRegistrations = current?.interaction?.registrations;
    for (const key of [
      'pointerObservers', 'wheelHandlers', 'keyboardListeners', 'handlers',
      'openPopups', 'popupObservers', 'popupMeshes', 'popupMaterials', 'popupTextures',
    ]) {
      if (currentRegistrations?.[key] !== baselineRegistrations?.[key]) {
        errors.push(
          `astylar: interaction lifecycle ${key} changed at cycle ${cycleIndex + 1}, ` +
          `phase ${phase + 1} (${currentRegistrations?.[key]} vs ` +
          `${baselineRegistrations?.[key]})`,
        );
      }
    }

    const baselineSemantics = baseline?.semantics;
    const currentSemantics = current?.semantics;
    if (!baselineSemantics || !currentSemantics ||
        JSON.stringify(currentSemantics) !== JSON.stringify(baselineSemantics)) {
      errors.push(
        `astylar: interaction lifecycle semantic ownership changed at cycle ${cycleIndex + 1}, ` +
        `phase ${phase + 1} (${JSON.stringify(currentSemantics)} vs ` +
        `${JSON.stringify(baselineSemantics)})`,
      );
    }
  }

  if (index === astylarStates.length - 1) {
    const disposal = astylarStates[index]?.disposal;
    const before = disposal?.before;
    const after = disposal?.after;
    const resources = after?.resources;
    if (!before || before.inputs < 1 || before.cleanupRegistrations < 1 ||
        after?.sessionStatus !== 'disposed' || !after.engineDisposed || !after.sceneDisposed ||
        after.cleanupRegistrations !== 0 || after.semanticNodes !== 0 ||
        after.semanticEventRegistrations !== 0 || after.semanticObserverRegistrations !== 0 ||
        after.elements !== 0 || after.inputs !== 0 ||
        !resources || resources.meshes !== 0 || resources.materials !== 0 || resources.textures !== 0) {
      errors.push(`astylar: interaction lifecycle disposal was not clean ${JSON.stringify(disposal)}`);
    }
  }
  return errors;
}

async function performInteractionAction(page, mode, action, report) {
  switch (action.type) {
    case 'select-option': {
      if (mode === 'reference') {
        await page.locator(`[id="${action.elementId}"]`).selectOption(action.value);
        // Playwright changes the native control but leaves an already-open
        // platform popup visible. Escape dismisses that popup without another
        // mutation; fixtures that model pointer choice intentionally omit
        // keyboard events from their observed public boundary.
        await page.keyboard.press('Escape');
      } else {
        const { x, y } = await getInteractionPoint(
          page, mode, action.elementId, report, action.offsetX, action.offsetY,
        );
        await page.mouse.click(x, y);
      }
      return;
    }
    case 'click':
    case 'hover': {
      const { x, y } = await getInteractionPoint(
        page, mode, action.elementId, report, action.offsetX, action.offsetY,
      );
      if (action.type === 'click') await page.mouse.click(x, y);
      else await page.mouse.move(x, y);
      return;
    }
    case 'pointer-down': {
      const { x, y } = await getInteractionPoint(
        page, mode, action.elementId, report, action.offsetX, action.offsetY,
      );
      await page.mouse.move(x, y);
      await page.mouse.down();
      return;
    }
    case 'pointer-up':
      await page.mouse.up();
      return;
    case 'pause':
      await page.waitForTimeout(action.durationMs);
      return;
    case 'press-key':
      await page.keyboard.press(action.key);
      return;
    case 'type-text':
      await page.keyboard.type(action.text);
      return;
    case 'semantic-focus': {
      const selector = mode === 'astylar'
        ? `[data-astylar-id="${escapeSelectorValue(action.elementId)}"]`
        : `[id="${escapeSelectorValue(action.elementId)}"]`;
      await page.locator(selector).focus();
      return;
    }
    case 'semantic-activate': {
      const selector = mode === 'astylar'
        ? `[data-astylar-id="${escapeSelectorValue(action.elementId)}"]`
        : `[id="${escapeSelectorValue(action.elementId)}"]`;
      await page.locator(selector).evaluate((element) => {
        if (!(element instanceof HTMLElement)) throw new Error('Semantic target is not an element');
        element.click();
      });
      return;
    }
    case 'wheel': {
      const { x, y } = await getInteractionPoint(page, mode, action.elementId, report);
      await page.mouse.move(x, y);
      await page.mouse.wheel(action.deltaX ?? 0, action.deltaY ?? 0);
      return;
    }
    case 'apply-update':
      if (action.viewportId) {
        const viewport = viewportProfiles[action.viewportId];
        if (!viewport) throw new Error(`Unknown interaction viewport: ${action.viewportId}`);
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
      }
      await page.evaluate(
        ({ stepIndex, viewportId }) => window.__ASTYLAR_PARITY_APPLY_STEP__?.(
          stepIndex,
          viewportId,
        ),
        action,
      );
      return;
    default:
      throw new Error(`Unsupported interaction action: ${JSON.stringify(action)}`);
  }
}

async function getInteractionPoint(page, mode, elementId, report, offsetX, offsetY) {
  const rect = report?.elements?.[elementId]?.borderBox;
  if (!rect) throw new Error(`Missing ${mode} interaction target geometry: ${elementId}`);
  const surfaceSelector = mode === 'reference'
    ? '#parity-reference-viewport'
    : '#parity-astylar-canvas';
  let surface = await page.locator(surfaceSelector).boundingBox();
  if (!surface) throw new Error(`Missing ${mode} comparison surface bounds`);

  let x = surface.x + rect.left + (offsetX ?? rect.width / 2);
  let y = surface.y + rect.top + (offsetY ?? rect.height / 2);
  const viewport = page.viewportSize();
  if (viewport && (x < 0 || x >= viewport.width || y < 0 || y >= viewport.height)) {
    await page.evaluate(({ targetX, targetY }) => {
      window.scrollBy(
        targetX - window.innerWidth / 2,
        targetY - window.innerHeight / 2,
      );
    }, { targetX: x, targetY: y });
    surface = await page.locator(surfaceSelector).boundingBox();
    if (!surface) throw new Error(`Missing ${mode} comparison surface bounds after scroll`);
    x = surface.x + rect.left + (offsetX ?? rect.width / 2);
    y = surface.y + rect.top + (offsetY ?? rect.height / 2);
  }
  return { x, y };
}

function compareInteraction(reference, astylar, fixture) {
  const referenceInteraction = reference.interaction;
  const astylarInteraction = astylar.interaction;
  if (!referenceInteraction || !astylarInteraction) {
    return ['missing interaction report'];
  }
  const errors = [];
  const referenceEvents = normalizeModalCloseScheduling(referenceInteraction.events);
  const astylarEvents = normalizeModalCloseScheduling(astylarInteraction.events);
  if (JSON.stringify(referenceEvents) !== JSON.stringify(astylarEvents)) {
    errors.push(
      `event logs differ (${JSON.stringify(referenceEvents)} vs ${JSON.stringify(astylarEvents)})`,
    );
  }
  if (referenceInteraction.focusedElementId !== astylarInteraction.focusedElementId) {
    errors.push(
      `focused element differs (${referenceInteraction.focusedElementId ?? 'none'} vs ` +
      `${astylarInteraction.focusedElementId ?? 'none'})`,
    );
  }
  if (referenceInteraction.modalDialogId !== astylarInteraction.modalDialogId) {
    errors.push(
      `modal dialog differs (${referenceInteraction.modalDialogId ?? 'none'} vs ` +
      `${astylarInteraction.modalDialogId ?? 'none'})`,
    );
  }
  if (fixture.enforcePointerCursor &&
      (referenceInteraction.pointerCursor ?? 'default') !==
      (astylarInteraction.pointerCursor ?? 'default')) {
    errors.push(
      `pointer cursor differs (${referenceInteraction.pointerCursor ?? 'default'} vs ` +
      `${astylarInteraction.pointerCursor ?? 'default'})`,
    );
  }
  if (JSON.stringify(referenceInteraction.textSelection) !==
      JSON.stringify(astylarInteraction.textSelection)) {
    errors.push(
      `text selection differs (${JSON.stringify(referenceInteraction.textSelection)} vs ` +
      `${JSON.stringify(astylarInteraction.textSelection)})`,
    );
  }
  if (JSON.stringify(referenceInteraction.navigationOutcomes ?? []) !==
      JSON.stringify(astylarInteraction.navigationOutcomes ?? [])) {
    errors.push(
      `navigation outcomes differ (${JSON.stringify(referenceInteraction.navigationOutcomes ?? [])} vs ` +
      `${JSON.stringify(astylarInteraction.navigationOutcomes ?? [])})`,
    );
  }
  const controlIds = new Set([
    ...Object.keys(referenceInteraction.controls),
    ...Object.keys(astylarInteraction.controls),
  ]);
  for (const id of controlIds) {
    const enforceVisualState = fixture.controlVisualStateIds?.includes(id) === true;
    const expected = normalizeComparableControl(referenceInteraction.controls[id], enforceVisualState);
    const actual = normalizeComparableControl(astylarInteraction.controls[id], enforceVisualState);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      errors.push(`control state differs for ${id} (${JSON.stringify(expected)} vs ${JSON.stringify(actual)})`);
    }
  }
  const scrollIds = new Set([
    ...Object.keys(referenceInteraction.scrollContainers ?? {}),
    ...Object.keys(astylarInteraction.scrollContainers ?? {}),
  ]);
  for (const id of scrollIds) {
    const expected = referenceInteraction.scrollContainers?.[id];
    const actual = astylarInteraction.scrollContainers?.[id];
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      errors.push(`scroll state differs for ${id} (${JSON.stringify(expected)} vs ${JSON.stringify(actual)})`);
    }
  }
  const registrations = astylarInteraction.registrations;
  const expandedCount = Object.values(astylarInteraction.controls)
    .filter((control) => control.expanded === true).length;
  if (registrations?.openPopups !== expandedCount) {
    errors.push(`popup registry count differs (${registrations?.openPopups} vs ${expandedCount})`);
  }
  if (registrations?.popupObservers !== expandedCount) {
    errors.push(`popup observer count differs (${registrations?.popupObservers} vs ${expandedCount})`);
  }
  for (const key of ['popupMeshes', 'popupMaterials', 'popupTextures']) {
    const count = registrations?.[key];
    if (expandedCount === 0 ? count !== 0 : !(count > 0)) {
      errors.push(`${key} do not match expanded popup state (${count} vs ${expandedCount})`);
    }
  }
  return errors;
}

/**
 * Native dialog `close` is queued as a task. Depending on browser/OS input-task
 * timing, that task can run immediately before or after the physical Escape
 * keyup. Canonicalize only that adjacent pair; cancel, blur, restored focus,
 * every other event, and all other ordering remain exact.
 */
function normalizeModalCloseScheduling(events = []) {
  const normalized = [...events];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    if (normalized[index]?.type === 'close' &&
        normalized[index + 1]?.type === 'keyup' &&
        normalized[index + 1]?.key === 'Escape') {
      [normalized[index], normalized[index + 1]] = [normalized[index + 1], normalized[index]];
      index += 1;
    }
  }
  return normalized;
}

function normalizeComparableControl(control, enforceVisualState) {
  if (!control) return undefined;
  const collapsedSelection = typeof control.selectionStart === 'number' &&
    control.selectionStart === control.selectionEnd;
  return Object.fromEntries(Object.entries({
    type: control.type,
    value: control.value,
    checked: control.checked,
    selectedIndex: control.selectedIndex,
    selectedValue: control.selectedValue,
    expanded: control.expanded,
    disabled: control.disabled,
    focused: control.focused,
    selectionStart: control.selectionStart,
    selectionEnd: control.selectionEnd,
    // Browsers expose "forward" for a collapsed native selection while the
    // direction has no observable meaning. Preserve strict direction checks
    // only for a non-collapsed range.
    selectionDirection: enforceVisualState
      ? (collapsedSelection ? 'none' : control.selectionDirection)
      : undefined,
    cursorPosition: control.cursorPosition,
    caretRendered: enforceVisualState ? control.caretRendered : undefined,
    selectionRendered: enforceVisualState ? control.selectionRendered : undefined,
    scrollLeft: control.scrollLeft,
    scrollTop: control.scrollTop,
  }).filter(([, value]) => value !== undefined));
}

async function measureResponsiveFixture(context, fixture, staticResults) {
  const sequenceDir = path.join(ARTIFACTS_DIR, fixture.id, 'in-place');
  await mkdir(sequenceDir, { recursive: true });
  const sequence = fixture.responsiveSequence.map((id) => {
    const viewport = viewportProfiles[id];
    if (!viewport) throw new Error(`Unknown responsive viewport "${id}"`);
    return viewport;
  });
  const referenceStates = await captureResponsiveMode(
    context,
    `${BASE_URL}/parity/reference/${encodeURIComponent(fixture.id)}?viewport=desktop&responsive=true`,
    '#parity-reference-viewport',
    'reference',
    sequenceDir,
    sequence
  );
  let astylarStates = await captureResponsiveMode(
    context,
    `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}?viewport=desktop&responsive=true`,
    '#parity-astylar-canvas',
    'astylar',
    sequenceDir,
    sequence
  );
  const catastrophicResponsiveIndex = findCatastrophicCapture(referenceStates, astylarStates);
  if (catastrophicResponsiveIndex >= 0) {
    console.warn(
      `Retrying catastrophic Astylar responsive sequence for ${fixture.id} ` +
      `(step ${catastrophicResponsiveIndex + 1})`,
    );
    astylarStates = await captureResponsiveMode(
      context,
      `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}?viewport=desktop&responsive=true`,
      '#parity-astylar-canvas',
      'astylar',
      sequenceDir,
      sequence,
    );
  }

  return sequence.map((viewport, index) => {
    const reference = referenceStates[index];
    const astylar = astylarStates[index];
    const fresh = staticResults.find(
      (result) => result.id === fixture.id && result.viewport.id === viewport.id && !result.scenario
    );
    const styles = compareStyles(
      reference.report,
      astylar.report,
      fixture.enforcedStyleProperties,
    );
    const runtimeErrors = [
      ...reference.pageErrors.map((error) => `reference: ${error}`),
      ...astylar.pageErrors.map((error) => `astylar: ${error}`),
      ...reference.report.errors.map((error) => `reference: ${error}`),
      ...astylar.report.errors.map((error) => `astylar: ${error}`),
      ...styles.errors.map((error) => `style: ${error}`),
    ];
    if (!fresh) {
      runtimeErrors.push(`No fresh-render comparison found for ${viewport.id}`);
    } else {
      const referenceFreshGeometry = compareGeometry(fresh.reference, reference.report);
      const astylarFreshGeometry = compareGeometry(fresh.astylar, astylar.report);
      const referenceFreshText = compareText(fresh.reference, reference.report);
      const astylarFreshText = compareText(fresh.astylar, astylar.report);
      if ((referenceFreshGeometry.maximumEdgeError ?? Infinity) > freshGeometryTolerancePx) {
        runtimeErrors.push(`reference: in-place ${viewport.id} differs from fresh geometry`);
      }
      if ((astylarFreshGeometry.maximumEdgeError ?? Infinity) > freshGeometryTolerancePx) {
        runtimeErrors.push(`astylar: in-place ${viewport.id} differs from fresh geometry`);
      }
      if (!referenceFreshText.allContentMatches || !referenceFreshText.allLineCountsMatch) {
        runtimeErrors.push(`reference: in-place ${viewport.id} differs from fresh text`);
      }
      if (!astylarFreshText.allContentMatches || !astylarFreshText.allLineCountsMatch) {
        runtimeErrors.push(`astylar: in-place ${viewport.id} differs from fresh text`);
      }
      const freshResources = fresh.astylar.resources;
      const currentResources = astylar.report.resources;
      if (
        freshResources && currentResources &&
        (currentResources.meshes !== freshResources.meshes ||
          currentResources.materials > freshResources.materials ||
          currentResources.textures > freshResources.textures)
      ) {
        runtimeErrors.push(
          `astylar: in-place ${viewport.id} resource counts exceed fresh render ` +
          `(${JSON.stringify(currentResources)} vs ${JSON.stringify(freshResources)})`
        );
      }
    }
    return {
      id: fixture.id,
      scenario: `in-place-${index + 1}`,
      viewport,
      title: fixture.title,
      category: fixture.category,
      expectedBehavior: fixture.expectedBehavior,
      screenshotSimilarity: comparePng(reference.screenshot, astylar.screenshot),
      geometry: compareGeometry(reference.report, astylar.report),
      text: compareText(reference.report, astylar.report),
      styles,
      runtimeErrors,
      reference: reference.report,
      astylar: astylar.report
    };
  });
}

async function captureResponsiveMode(
  context,
  url,
  selector,
  mode,
  sequenceDir,
  sequence
) {
  const page = await context.newPage();
  await installDeterministicAssetDelay(page);
  const pageErrors = [];
  const states = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  let previousRevision = 0;
  for (let index = 0; index < sequence.length; index += 1) {
    const viewport = sequence[index];
    if (index > 0) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      // Chromium can deliver separate width/height resize notifications while
      // Playwright applies both dimensions. Dispatch once after the final box
      // is visible so the harness selects the intended named profile.
      await page.evaluate((targetId) => {
        window.dispatchEvent(new Event('resize'));
        window.__ASTYLAR_PARITY_SET_VIEWPORT__?.(targetId);
      }, viewport.id);
    }
    try {
      await page.waitForFunction(
        ({ targetId, afterRevision }) => {
          const report = window.__ASTYLAR_PARITY_REPORT__;
          return report?.ready === true && report.viewport.id === targetId &&
            (report.revision ?? 0) > afterRevision;
        },
        { targetId: viewport.id, afterRevision: previousRevision },
        { timeout: 30_000 }
      );
    } catch (error) {
      const report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
      throw new Error(
        `${mode} responsive step ${index + 1} (${viewport.id}) did not settle after revision ` +
        `${previousRevision}; latest=${JSON.stringify(report)}; pageErrors=${JSON.stringify(pageErrors)}`,
        { cause: error }
      );
    }
    const report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
    if (!report) throw new Error(`Responsive report was not published for ${url}`);
    previousRevision = report.revision ?? previousRevision + 1;
    const screenshot = await page.locator(selector).screenshot({
      path: path.join(sequenceDir, `${index + 1}-${viewport.id}-${mode}.png`),
      animations: 'disabled'
    });
    states.push({ report, screenshot, pageErrors: [...pageErrors] });
  }
  await page.close();
  return states;
}

async function installDeterministicAssetDelay(page) {
  await page.route('**/*parity-delay=*', async (route) => {
    const delay = Number.parseInt(
      new URL(route.request().url()).searchParams.get('parity-delay') ?? '0',
      10
    );
    if (Number.isFinite(delay) && delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await route.continue();
  });
}

function comparePng(referenceBuffer, astylarBuffer) {
  const reference = PNG.sync.read(referenceBuffer);
  const astylar = PNG.sync.read(astylarBuffer);
  if (reference.width !== astylar.width || reference.height !== astylar.height) {
    throw new Error(
      `Screenshot dimensions differ: ${reference.width}x${reference.height} vs ${astylar.width}x${astylar.height}`
    );
  }

  return ssim(reference, astylar, { ssim: 'fast' }).mssim;
}

function findCatastrophicCapture(referenceStates, astylarStates) {
  return referenceStates.findIndex((reference, index) => {
    const astylar = astylarStates[index];
    return astylar && astylar.pageErrors.length === 0 &&
      astylar.report.errors.length === 0 &&
      comparePng(reference.screenshot, astylar.screenshot) < 0.5;
  });
}

function compareSemantics(reference = {}, astylar = {}) {
  const errors = [];
  for (const id of new Set([...Object.keys(reference), ...Object.keys(astylar)])) {
    if (JSON.stringify(reference[id]) !== JSON.stringify(astylar[id])) {
      errors.push(
        `semantic: accessibility snapshot differs for ${id}; ` +
        `reference=${JSON.stringify(reference[id])}, astylar=${JSON.stringify(astylar[id])}`,
      );
    }
  }
  return errors;
}

function compareGeometry(reference, astylar) {
  const elementResults = [];
  const allEdgeErrors = [];

  for (const [id, referenceElement] of Object.entries(reference.elements)) {
    const astylarElement = astylar.elements[id];
    if (!astylarElement) {
      elementResults.push({ id, missing: true });
      continue;
    }

    const edgeErrors = Object.fromEntries(
      ['left', 'top', 'right', 'bottom'].map((edge) => {
        const error = Math.abs(
          referenceElement.borderBox[edge] - astylarElement.borderBox[edge]
        );
        allEdgeErrors.push(error);
        return [edge, error];
      })
    );
    elementResults.push({ id, missing: false, edgeErrors });
  }

  const withinTolerance = allEdgeErrors.filter(
    (error) => error <= thresholds.edgeTolerancePx
  ).length;
  return {
    measuredEdgeCount: allEdgeErrors.length,
    edgesWithinTolerance: allEdgeErrors.length
      ? withinTolerance / allEdgeErrors.length
      : 0,
    maximumEdgeError: allEdgeErrors.length ? Math.max(...allEdgeErrors) : null,
    elements: elementResults
  };
}

function compareText(reference, astylar) {
  const elements = [];
  for (const [id, referenceElement] of Object.entries(reference.elements)) {
    if (!referenceElement.text) {
      continue;
    }
    const astylarText = astylar.elements[id]?.text;
    elements.push({
      id,
      contentMatches: referenceElement.text.content === astylarText?.content,
      lineCountMatches: referenceElement.text.lineCount === astylarText?.lineCount,
      referenceLineCount: referenceElement.text.lineCount,
      astylarLineCount: astylarText?.lineCount ?? null
    });
  }
  return {
    allContentMatches: elements.every((element) => element.contentMatches),
    allLineCountsMatch: elements.every((element) => element.lineCountMatches),
    elements
  };
}

function compareVisibility(reference, astylar) {
  const elements = [];
  for (const [id, referenceElement] of Object.entries(reference.elements)) {
    const expected = referenceElement.visibility;
    const actual = astylar.elements[id]?.visibility;
    elements.push({
      id,
      reference: expected,
      astylar: actual,
      matches: !!expected && !!actual &&
        expected.intersectsViewport === actual.intersectsViewport &&
        expected.fullyVisible === actual.fullyVisible &&
        expected.clipped === actual.clipped,
    });
  }
  return { allMatch: elements.every((element) => element.matches), elements };
}

function compareScrolling(reference, astylar) {
  const expected = reference.interaction?.scrollContainers ?? {};
  const actual = astylar.interaction?.scrollContainers ?? {};
  const ids = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
  const owners = ids.map((id) => ({
    id,
    reference: expected[id],
    astylar: actual[id],
    ownershipMatches: !!expected[id] === !!actual[id],
    reachabilityMatches: !!expected[id] && !!actual[id]
      ? expected[id].canReachBottom === actual[id].canReachBottom &&
        expected[id].canReachRight === actual[id].canReachRight
      : !!expected[id] === !!actual[id],
  }));
  return {
    allOwnershipMatches: owners.every((owner) => owner.ownershipMatches),
    allReachabilityMatches: owners.every((owner) => owner.reachabilityMatches),
    owners,
  };
}

function compareStyles(reference, astylar, enforcedByElement = {}) {
  const defaultProperties = [
    'backgroundColor',
    'color',
    'borderTopWidth',
    'borderTopColor',
    'borderRadius',
    'fontSize',
    'fontWeight',
    'fontStyle',
    'lineHeight',
    'textAlign',
    'opacity'
  ];
  const elements = [];
  const errors = [];

  for (const [id, referenceElement] of Object.entries(reference.elements)) {
    const astylarElement = astylar.elements[id];
    if (!astylarElement) {
      continue;
    }
    const properties = [...new Set([
      ...defaultProperties,
      ...(enforcedByElement[id] ?? []),
    ])];
    const measured = properties.map((property) => ({
      property,
      reference: referenceElement.styles[property],
      astylar: astylarElement.styles[property]
    }));
    elements.push({ id, properties: measured });
    for (const property of enforcedByElement[id] ?? []) {
      const expected = normalizeStyleValue(property, referenceElement.styles[property]);
      const actual = normalizeStyleValue(property, astylarElement.styles[property]);
      if (expected !== actual) {
        errors.push(`${id}.${property} differs (${expected ?? 'missing'} vs ${actual ?? 'missing'})`);
      }
    }
  }
  return { elements, errors };
}

function normalizeStyleValue(property, value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (property.toLowerCase().includes('color')) return normalizeColor(value);
  if (property === 'opacity') {
    const numeric = Number.parseFloat(String(value));
    return Number.isFinite(numeric) ? String(numeric) : String(value).trim().toLowerCase();
  }
  if (property === 'cursor') {
    const cursor = String(value).trim().toLowerCase();
    return cursor === 'auto' ? 'default' : cursor;
  }
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeColor(value) {
  const source = String(value).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(source)) return source;
  if (/^#[0-9a-f]{3}$/.test(source)) {
    return `#${source[1]}${source[1]}${source[2]}${source[2]}${source[3]}${source[3]}`;
  }
  const match = source.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!match) return source;
  return `#${[match[1], match[2], match[3]]
    .map((component) => Number(component).toString(16).padStart(2, '0'))
    .join('')}`;
}

function summarize(results) {
  const similarities = results
    .map((result) => result.screenshotSimilarity)
    .sort((left, right) => left - right);
  const medianSsim = similarities.length
    ? similarities[Math.floor(similarities.length / 2)]
    : 0;
  const edgeErrors = results.flatMap((result) =>
    result.geometry.elements.flatMap((element) =>
      element.edgeErrors ? Object.values(element.edgeErrors) : []
    )
  );
  const edgesWithinTolerance = edgeErrors.length
    ? edgeErrors.filter((error) => error <= thresholds.edgeTolerancePx).length /
      edgeErrors.length
    : 0;
  const maximumEdgeError = edgeErrors.length ? Math.max(...edgeErrors) : null;
  const allTextMatches = results.every(
    (result) => result.text.allContentMatches && result.text.allLineCountsMatch
  );
  const noRuntimeErrors = results.every((result) => result.runtimeErrors.length === 0);
  const everyFixtureSsimPasses = results.every(
    (result) => result.screenshotSimilarity >= thresholds.minimumFixtureSsim
  );

  return {
    fixtureCount: new Set(results.map((result) => result.id)).size,
    renderCount: results.length,
    viewportCount: new Set(results.map((result) => result.viewport.id)).size,
    medianSsim,
    minimumSsim: similarities[0] ?? 0,
    edgesWithinTolerance,
    maximumEdgeError,
    allTextMatches,
    noRuntimeErrors,
    meetsCompletionThresholds:
      results.length >= 40 &&
      medianSsim >= thresholds.minimumMedianSsim &&
      everyFixtureSsimPasses &&
      edgesWithinTolerance >= thresholds.minimumEdgesWithinTolerance &&
      maximumEdgeError !== null &&
      maximumEdgeError <= thresholds.maximumEdgeErrorPx &&
      allTextMatches &&
      noRuntimeErrors
  };
}

function printSummary(report) {
  console.log(`Parity fixtures: ${report.summary.fixtureCount}`);
  console.log(`Parity renders: ${report.summary.renderCount}`);
  console.log(`Viewport profiles exercised: ${report.summary.viewportCount}`);
  console.log(`Median SSIM: ${report.summary.medianSsim.toFixed(4)}`);
  console.log(`Minimum SSIM: ${report.summary.minimumSsim.toFixed(4)}`);
  console.log(
    `Edges within ${thresholds.edgeTolerancePx}px: ${(report.summary.edgesWithinTolerance * 100).toFixed(1)}%`
  );
  console.log(`Maximum edge error: ${report.summary.maximumEdgeError ?? 'n/a'}px`);
  console.log(`Text matches: ${report.summary.allTextMatches}`);
  console.log(`Runtime clean: ${report.summary.noRuntimeErrors}`);
  console.log(`Completion thresholds: ${report.summary.meetsCompletionThresholds}`);

  for (const fixture of report.fixtures) {
    console.log(
      `${fixture.id}@${fixture.viewport.id}: SSIM=${fixture.screenshotSimilarity.toFixed(4)}, maxEdge=${fixture.geometry.maximumEdgeError ?? 'n/a'}px, errors=${fixture.runtimeErrors.length}`
    );
  }
}
