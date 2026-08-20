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

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await waitFor(
    async () => await page.getByTestId('renderer-status').textContent() === 'AstylarUI renderer ready.',
    'the AstylarUI surface to mount',
  );
  assert.equal(await page.locator('astylar-surface').count(), 1);
  assert.equal(await page.locator('canvas').count(), 1);

  const aria = await page.locator('body').ariaSnapshot();
  for (const expected of [
    'heading "AI Speech Studio"',
    'textbox "Text to speak"',
    'combobox "Voice"',
    'button "Generate speech"',
    'status: Ready to generate a mock preview.',
    'AI-generated voice and session storage',
  ]) {
    assert.ok(aria.includes(expected), `Semantic snapshot is missing ${expected}.`);
  }

  const speech = page.getByRole('textbox', { name: 'Text to speak' });
  await speech.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('hi', { delay: 80 });
  await waitFor(async () => await speech.inputValue() === 'hi', 'controlled text entry');

  const voice = page.getByRole('combobox', { name: 'Voice' });
  await voice.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await waitFor(async () => await voice.inputValue() === 'coral', 'voice selection');

  const generate = page.getByRole('button', { name: 'Generate speech' });
  await generate.focus();
  await page.keyboard.press('Enter');
  await waitFor(
    async () => (await page.getByRole('status').textContent())?.includes('Generated WAV preview in mock mode.') ?? false,
    'mock speech generation',
  );
  assert.equal(await page.getByRole('button', { name: 'Select Speech preview 1' }).count(), 1);

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
  for (const width of [519, 520, 521, 759, 760, 761, 1049, 1050, 1051]) {
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
  await waitFor(async () => await page.getByRole('button', { name: 'Play', exact: true }).count() > 0, 'audio completion');

  const downloadPromise = page.waitForEvent('download');
  const downloadButton = page.getByRole('button', { name: 'Download Speech preview 1' });
  await downloadButton.focus();
  await page.keyboard.press('Enter');
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^speech-preview-1\.wav$/);
  await download.cancel();

  await clickSemanticControl(generate);
  await waitFor(async () => await page.getByRole('button', { name: 'Select Speech preview 2' }).count() === 1, 'second history item');
  await page.getByRole('button', { name: 'Select Speech preview 1' }).focus();
  await page.keyboard.press('Enter');
  await waitFor(async () => await page.getByRole('article', { name: 'Audio player for Speech preview 1' }).count() === 1, 'history selection');

  const search = page.getByRole('textbox', { name: 'Search history' });
  await search.focus();
  await page.keyboard.type('no-match', { delay: 40 });
  await waitFor(async () => await page.getByRole('heading', { name: 'No matching generations' }).count() === 1, 'history filtering');
  await search.focus();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await waitFor(async () => await page.getByRole('button', { name: 'Delete Speech preview 1' }).count() === 1, 'history search reset');

  await page.getByRole('button', { name: 'Delete Speech preview 1' }).focus();
  await page.keyboard.press('Enter');
  await waitFor(async () => await page.getByRole('button', { name: 'Delete Speech preview 1' }).count() === 0, 'history deletion');
  await page.getByRole('button', { name: 'Clear all history' }).focus();
  await page.keyboard.press('Enter');
  await waitFor(async () => await page.getByRole('heading', { name: 'No speech generated yet' }).count() === 1, 'history clearing');

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
