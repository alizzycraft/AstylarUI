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

const thresholds = {
  edgeTolerancePx: 2,
  maximumEdgeErrorPx: 5,
  minimumEdgesWithinTolerance: 0.95,
  minimumFixtureSsim: 0.95,
  minimumMedianSsim: 0.98
};

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
  const fixtures = await manifestResponse.json();
  if (!Array.isArray(fixtures) || fixtures.length === 0) {
    throw new Error('Parity fixture manifest is empty');
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });
  browser = await chromium.launch({
    channel: process.env['ASTYLAR_PARITY_BROWSER_CHANNEL'] ?? 'chrome',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    reducedMotion: 'reduce'
  });
  const results = [];

  for (const fixture of fixtures) {
    results.push(await measureFixture(context, fixture));
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

async function measureFixture(context, fixture) {
  const fixtureDir = path.join(ARTIFACTS_DIR, fixture.id);
  await mkdir(fixtureDir, { recursive: true });

  const reference = await captureMode(
    context,
    `${BASE_URL}/parity/reference/${encodeURIComponent(fixture.id)}`,
    '#parity-reference-viewport',
    path.join(fixtureDir, 'reference.png')
  );
  const astylar = await captureMode(
    context,
    `${BASE_URL}/parity/astylar/${encodeURIComponent(fixture.id)}`,
    '#parity-astylar-canvas',
    path.join(fixtureDir, 'astylar.png')
  );

  const screenshotSimilarity = comparePng(reference.screenshot, astylar.screenshot);
  const geometry = compareGeometry(reference.report, astylar.report);
  const text = compareText(reference.report, astylar.report);
  const styles = compareStyles(reference.report, astylar.report);
  const runtimeErrors = [
    ...reference.pageErrors.map((error) => `reference: ${error}`),
    ...astylar.pageErrors.map((error) => `astylar: ${error}`),
    ...reference.report.errors.map((error) => `reference: ${error}`),
    ...astylar.report.errors.map((error) => `astylar: ${error}`)
  ];

  return {
    id: fixture.id,
    title: fixture.title,
    category: fixture.category,
    expectedBehavior: fixture.expectedBehavior,
    screenshotSimilarity,
    geometry,
    text,
    styles,
    runtimeErrors,
    reference: reference.report,
    astylar: astylar.report
  };
}

async function captureMode(context, url, selector, screenshotPath) {
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForFunction(
    () => window.__ASTYLAR_PARITY_REPORT__?.ready === true,
    undefined,
    { timeout: 30_000 }
  );
  const report = await page.evaluate(() => window.__ASTYLAR_PARITY_REPORT__);
  const screenshot = await page.locator(selector).screenshot({
    path: screenshotPath,
    animations: 'disabled'
  });
  await page.close();

  if (!report) {
    throw new Error(`Parity report was not published for ${url}`);
  }
  return { report, screenshot, pageErrors };
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

function compareStyles(reference, astylar) {
  const properties = [
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

  for (const [id, referenceElement] of Object.entries(reference.elements)) {
    const astylarElement = astylar.elements[id];
    if (!astylarElement) {
      continue;
    }
    const measured = properties.map((property) => ({
      property,
      reference: referenceElement.styles[property],
      astylar: astylarElement.styles[property]
    }));
    elements.push({ id, properties: measured });
  }
  return { elements };
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
    fixtureCount: results.length,
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
      `${fixture.id}: SSIM=${fixture.screenshotSimilarity.toFixed(4)}, maxEdge=${fixture.geometry.maximumEdgeError ?? 'n/a'}px, errors=${fixture.runtimeErrors.length}`
    );
  }
}
