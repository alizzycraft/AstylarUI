import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceApp = path.join(root, 'examples', 'ai-tts-demo');
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'astylarui-tts-check-'));
const temporaryApp = path.join(temporaryRoot, 'ai-tts-demo');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = 4417;
const baseUrl = `http://localhost:${port}`;
let server;
let browser;
let recentServerOutput = '';

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: capture ? 'utf8' : undefined,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = capture ? `\n${result.stdout}\n${result.stderr}` : '';
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.${detail}`);
  }
  return capture ? result.stdout : '';
}

function collectTypeScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTypeScriptFiles(absolute);
    return entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

function validateImports() {
  const forbidden = [];
  for (const file of collectTypeScriptFiles(path.join(sourceApp, 'src'))) {
    const contents = readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*(?:src\/|src\\|dist\/|dist\\|parity|app\/services|app\\services)/.test(contents)) {
      forbidden.push(path.relative(root, file));
    }
    const imports = [...contents.matchAll(/from\s+['"](astylarui[^'"]*)['"]/g)];
    if (imports.some((match) => match[1] !== 'astylarui')) {
      forbidden.push(path.relative(root, file));
    }
  }
  assert.deepEqual(forbidden, [], `TTS demo uses forbidden imports: ${forbidden.join(', ')}`);
}

function copySourceApp() {
  const excluded = new Set(['.angular', 'astylarui.tgz', 'coverage', 'dist', 'node_modules', 'package-lock.json']);
  cpSync(sourceApp, temporaryApp, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(sourceApp, source);
      if (!relative) return true;
      return !excluded.has(relative.split(path.sep)[0]);
    },
  });
}

async function waitFor(check, description, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      if (await check()) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}.${lastError ? ` ${String(lastError)}` : ''}`);
}

async function captureCanvasContinuity(page, action, frameCount = 30) {
  return await page.evaluate(async ({ action, frameCount }) => {
    const canvas = document.querySelector('astylar-surface canvas');
    const target = document.querySelector(`[data-astylar-id="${action.targetId}"]`);
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('AstylarUI canvas is missing.');
    if (!(target instanceof HTMLElement)) throw new Error(`Semantic target ${action.targetId} is missing.`);

    const probe = document.createElement('canvas');
    probe.width = 96;
    probe.height = 60;
    const context = probe.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas continuity probe could not create a 2D context.');

    const frames = [];
    await new Promise((resolve) => {
      const sample = () => {
        context.clearRect(0, 0, probe.width, probe.height);
        context.drawImage(canvas, 0, 0, probe.width, probe.height);
        const { data } = context.getImageData(0, 0, probe.width, probe.height);
        let edgeEnergy = 0;
        let comparisons = 0;
        for (let y = 0; y < probe.height; y += 1) {
          for (let x = 0; x < probe.width; x += 1) {
            const offset = (y * probe.width + x) * 4;
            if (x + 1 < probe.width) {
              const right = offset + 4;
              edgeEnergy += Math.abs(data[offset] - data[right]) +
                Math.abs(data[offset + 1] - data[right + 1]) +
                Math.abs(data[offset + 2] - data[right + 2]);
              comparisons += 3;
            }
            if (y + 1 < probe.height) {
              const below = offset + probe.width * 4;
              edgeEnergy += Math.abs(data[offset] - data[below]) +
                Math.abs(data[offset + 1] - data[below + 1]) +
                Math.abs(data[offset + 2] - data[below + 2]);
              comparisons += 3;
            }
          }
        }
        frames.push(edgeEnergy / comparisons);
        if (frames.length === 3) {
          if (action.type === 'input' &&
              (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
            target.value = action.value;
            target.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (action.type === 'click') {
            target.click();
          } else {
            throw new Error(`Unsupported continuity action for ${action.targetId}.`);
          }
        }
        if (frames.length < frameCount) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    return frames;
  }, { action, frameCount });
}

function assertCanvasContinuity(frames, label) {
  const baselineEnergy = frames.slice(0, 2)
    .reduce((total, value) => total + value, 0) / 2;
  const minimumUpdateEnergy = Math.min(...frames.slice(4));
  assert.ok(
    minimumUpdateEnergy >= baselineEnergy * 0.5,
    `${label} presented a cleared canvas frame (${JSON.stringify({
      baselineEnergy,
      minimumUpdateEnergy,
      frames,
    })}).`,
  );
}

async function runBrowserSmoke() {
  browser = await chromium.launch({
    channel: process.env['ASTYLAR_TTS_BROWSER_CHANNEL'] ?? 'chrome',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const clickSemanticControl = async (locator) => {
    await locator.dispatchEvent('pointerdown');
    await locator.dispatchEvent('pointerup');
    await locator.dispatchEvent('click');
  };

  await page.goto(`${baseUrl}/?parityState=interactive`, { waitUntil: 'networkidle' });
  await waitFor(
    async () => await page.getByTestId('renderer-status').textContent() === 'AstylarUI renderer ready.',
    'the AstylarUI surface to mount',
  );
  assert.equal(await page.locator('astylar-surface').count(), 1);
  assert.equal(await page.locator('canvas').count(), 1);

  const aria = await page.locator('body').ariaSnapshot();
  for (const expected of [
    'AI-TTS-MP3',
    'textbox "Text to speak"',
    'combobox "Voice"',
    'button "Generate speech"',
    'Storage',
  ]) {
    assert.ok(aria.includes(expected), `Semantic snapshot is missing ${expected}.`);
  }

  const speech = page.getByRole('textbox', { name: 'Text to speak' });
  const continuityFrames = await captureCanvasContinuity(
    page,
    { type: 'input', targetId: 'speech-text', value: 'Frame continuity probe' },
  );
  assertCanvasContinuity(continuityFrames, 'Interactive input reflow');
  await speech.focus();
  await page.keyboard.press('Control+A');
  const generatedText = 'AstylarUI brings familiar web application patterns into a Babylon-rendered space.';
  await page.keyboard.type(generatedText, { delay: 20 });
  await waitFor(async () => await speech.inputValue() === generatedText, 'controlled text entry');

  const voice = page.getByRole('combobox', { name: 'Voice', exact: true });
  await voice.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await waitFor(async () => await voice.inputValue() === 'coral', 'voice selection');

  const generate = page.getByRole('button', { name: 'Generate speech' });
  await generate.focus();
  const generationContinuityFrames = await captureCanvasContinuity(
    page,
    { type: 'click', targetId: 'generate-speech' },
    60,
  );
  assertCanvasContinuity(generationContinuityFrames, 'Mock speech generation');
  await waitFor(
    async () => (await page.getByRole('status').textContent())?.includes('Speech generated successfully!') ?? false,
    'mock speech generation',
  );
  assert.equal(await page.getByRole('button', { name: 'Select Speech preview 1' }).count(), 1);
  const historyLayout = await page.evaluate(() => window.__ASTYLAR_TTS_BENCHMARK__?.measure([
    'history-speech-1', 'history-speech-1-text', 'history-speech-1-actions',
  ]));
  const historyElements = historyLayout?.elements;
  assert.ok(historyElements?.['history-speech-1']?.borderBox, 'History card geometry is missing.');
  for (const id of ['history-speech-1-text', 'history-speech-1-actions']) {
    const child = historyElements[id]?.borderBox;
    const card = historyElements['history-speech-1'].borderBox;
    assert.ok(child, `${id} geometry is missing.`);
    assert.ok(child.top >= card.top - 0.5 && child.bottom <= card.bottom + 0.5,
      `${id} escapes the history card (${JSON.stringify({ child, card })}).`);
  }

  for (const [name, viewport] of Object.entries({
    desktop: { width: 1280, height: 800 },
    tablet: { width: 760, height: 900 },
    mobile: { width: 390, height: 844 },
  })) {
    await page.setViewportSize(viewport);
    await waitFor(
      async () => await page.getByTestId('renderer-status').textContent() === 'AstylarUI renderer ready.',
      `${name} responsive render`,
    );
    const capture = path.join(temporaryRoot, `tts-${name}.png`);
    await page.screenshot({ path: capture });
    assert.ok(statSync(capture).size > 1_000, `${name} visual capture was unexpectedly empty.`);
  }
  for (const width of [767, 768, 769]) {
    await page.setViewportSize({ width, height: 900 });
    await waitFor(
      async () => await page.getByTestId('renderer-status').textContent() === 'AstylarUI renderer ready.',
      `responsive boundary ${width}px`,
    );
    assert.equal(await page.locator('canvas').count(), 1);
  }
  await page.setViewportSize({ width: 1280, height: 800 });

  const play = page.getByRole('button', { name: 'Play', exact: true }).first();
  await play.focus();
  await page.keyboard.press('Enter');
  await waitFor(async () => await page.getByRole('button', { name: 'Pause', exact: true }).count() > 0, 'audio playback');
  const focusedTransport = await page.evaluate(() =>
    window.__ASTYLAR_TTS_BENCHMARK__?.measure([]));
  assert.deepEqual(focusedTransport?.visibleFocusIndicators, [],
    'Authored play-button focus color should replace the fallback focus box.');
  await waitFor(async () => await page.getByRole('button', { name: 'Play', exact: true }).count() > 0, 'audio completion');

  const downloadButton = page.locator('[data-astylar-id="selected-download"]');
  await downloadButton.focus();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.keyboard.press('Enter'),
  ]);
  assert.match(download.suggestedFilename(), /^speech-preview-1\.wav$/);
  await download.cancel();

  await clickSemanticControl(generate);
  await waitFor(async () => await page.getByRole('button', { name: 'Select Speech preview 2' }).count() === 1, 'second history item');
  await clickSemanticControl(page.getByRole('button', { name: 'Select Speech preview 1' }));
  await waitFor(async () => await page.getByRole('article', { name: 'Audio player for Speech preview 1' }).count() === 1, 'history selection');

  const search = page.getByRole('textbox', { name: 'Search history' });
  await search.focus();
  await page.keyboard.type('no-match', { delay: 40 });
  await waitFor(async () => await page.getByRole('heading', { name: 'No items match your search' }).count() === 1, 'history filtering');
  await search.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await waitFor(async () => await page.getByRole('button', { name: 'Delete Speech preview 1' }).count() === 1, 'history search reset');

  await page.getByRole('button', { name: 'Delete Speech preview 1' }).focus();
  await page.keyboard.press('Enter');
  await waitFor(async () => await page.getByRole('button', { name: 'Delete Speech preview 1' }).count() === 0, 'history deletion');
  await page.getByRole('button', { name: 'Clear all history' }).focus();
  await page.keyboard.press('Enter');
  await waitFor(async () => await page.getByRole('heading', { name: 'No TTS history yet' }).count() === 1, 'history clearing');

  await speech.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await generate.focus();
  await page.keyboard.press('Enter');
  await waitFor(
    async () => (await page.getByRole('alert').textContent())?.includes('Enter some text before generating speech.') ?? false,
    'validation error semantics',
  );

  for (let index = 0; index < 3; index += 1) {
    await page.reload({ waitUntil: 'networkidle' });
    await waitFor(
      async () => await page.getByTestId('renderer-status').textContent() === 'AstylarUI renderer ready.',
      `surface remount ${index + 1}`,
    );
    assert.equal(await page.locator('astylar-surface').count(), 1);
    assert.equal(await page.locator('canvas').count(), 1);
  }

  assert.deepEqual(pageErrors, [], `Browser page errors: ${pageErrors.join(' | ')}`);
  assert.deepEqual(consoleErrors, [], `Browser console errors: ${consoleErrors.join(' | ')}`);
  await context.close();
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise((resolve) => server.once('exit', resolve));
  server.kill();
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

try {
  validateImports();
  copySourceApp();
  run(npm, ['run', 'build:lib'], root);

  const packOutput = run(npm, ['pack', '--json', '--pack-destination', temporaryRoot], root, true);
  const [packResult] = JSON.parse(packOutput);
  cpSync(path.join(temporaryRoot, packResult.filename), path.join(temporaryApp, 'astylarui.tgz'));
  run(npm, ['install', '--package-lock=false', '--no-audit', '--no-fund'], temporaryApp);

  const installedPackage = path.join(temporaryApp, 'node_modules', 'astylarui');
  assert.ok(existsSync(installedPackage), 'The packed AstylarUI dependency was not installed.');
  assert.equal(lstatSync(installedPackage).isSymbolicLink(), false, 'The demo must not use a workspace link.');

  run(npm, ['test', '--', '--watch=false', '--browsers=ChromeHeadless'], temporaryApp);
  run(npm, ['run', 'build'], temporaryApp);
  const serverOutput = path.join(temporaryApp, 'dist', 'ai-tts-demo', 'server', 'server.mjs');
  const browserOutput = path.join(temporaryApp, 'dist', 'ai-tts-demo', 'browser', 'index.html');
  assert.ok(existsSync(serverOutput), 'The TTS demo did not produce an SSR server bundle.');
  assert.ok(existsSync(browserOutput), 'The TTS demo did not produce a browser bundle.');

  const serverEnvironment = { ...process.env, PORT: String(port) };
  delete serverEnvironment['ASTYLAR_TTS_LIVE'];
  delete serverEnvironment['OPENAI_API_KEY'];
  server = spawn(process.execPath, [serverOutput], {
    cwd: temporaryApp,
    env: serverEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const captureServerOutput = (chunk) => {
    recentServerOutput = `${recentServerOutput}${chunk.toString()}`.slice(-8_000);
  };
  server.stdout.on('data', captureServerOutput);
  server.stderr.on('data', captureServerOutput);
  await waitFor(async () => {
    const response = await fetch(baseUrl);
    return response.ok;
  }, 'the production SSR server', 30_000);

  const disabledResponse = await fetch(`${baseUrl}/api/speech`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      instructions: '',
      input: 'No live request should be made.',
    }),
  });
  assert.equal(disabledResponse.status, 403, 'The live endpoint must be disabled by default.');

  await runBrowserSmoke();
  console.log(`TTS demo check passed with ${packResult.files.length} packed files and 0 live API calls.`);
} catch (error) {
  if (recentServerOutput) console.error(`Recent TTS demo server output:\n${recentServerOutput}`);
  throw error;
} finally {
  await browser?.close();
  await stopServer();
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
