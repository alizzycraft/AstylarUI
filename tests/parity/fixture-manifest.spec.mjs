import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

const readinessFailureInstrumentation = `  try {
    await page.waitForFunction(
      () => window.__ASTYLAR_PARITY_REPORT__?.ready === true,
      undefined,
      { timeout: 30_000 }
    );
  } catch (error) {
    let diagnosticTimer;
    const failure = { url, selector, pageErrors, error: String(error), readiness: null };
    try {
      failure.readiness = await Promise.race([
        page.evaluate(() => ({ report: window.__ASTYLAR_PARITY_REPORT__ ?? null,
          documentReadyState: document.readyState, href: window.location.href })),
        new Promise((_, reject) => { diagnosticTimer = setTimeout(() => reject(new Error('readiness diagnostic timed out')), 1_000); }),
      ]);
    } catch (diagnosticError) {
      failure.diagnosticError = String(diagnosticError);
    } finally {
      clearTimeout(diagnosticTimer);
    }
    try {
      await writeFile(\`\${screenshotPath}.readiness-failure.json\`, JSON.stringify(failure, null, 2));
    } catch (writeError) {
      console.error('Unable to retain readiness failure evidence:', String(writeError));
    }
    throw error;
  }
`;

test('isolated general parity artifacts preserve the complete original capture and acceptance code', async () => {
  const source = (await readFile('tests/parity/run-parity.mjs', 'utf8')).replaceAll('\r\n', '\n');
  const current = "const ARTIFACTS_DIR = path.resolve(ROOT, process.env['ASTYLAR_PARITY_ARTIFACTS'] ?? 'artifacts/parity');";
  assert.equal(source.split(current).length, 2);
  assert.equal(source.split(readinessFailureInstrumentation).length, 2);
  const restored = source.replace(current, "const ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'parity');")
    .replace(readinessFailureInstrumentation, `  await page.waitForFunction(
    () => window.__ASTYLAR_PARITY_REPORT__?.ready === true,
    undefined,
    { timeout: 30_000 }
  );
`);
  assert.equal(createHash('sha256').update(restored).digest('hex'),
    'ed32cc811ca7a7e3b3190c7d1950ee2ea0106a1face9d37530b83854f1188aa1');
  for (const requested of [undefined, 'artifacts/parity-fresh-test', path.resolve('artifacts/parity-absolute-test')]) {
    const actual = runInNewContext(current + '\nARTIFACTS_DIR',
      { ROOT: process.cwd(), path, process: { env: { ASTYLAR_PARITY_ARTIFACTS: requested } } });
    assert.equal(actual, path.resolve(process.cwd(), requested ?? 'artifacts/parity'));
  }
});

test('readiness failure evidence retains page errors without changing timeout or masking failure', async () => {
  const source = await readFile('tests/parity/run-parity.mjs', 'utf8');
  const capture = source.slice(source.indexOf('async function captureMode('), source.indexOf('\nfunction escapeSelectorValue('));
  for (const mode of ['published', 'evaluate-rejection', 'evaluate-timeout', 'write-rejection']) {
    const original = new Error('original readiness timeout'), written = [], logged = [];
    const page = {
      on: (_event, listener) => listener(new Error('runtime before readiness')),
      goto: async () => {},
      waitForFunction: async (_fn, argument, options) => {
        assert.equal(argument, undefined); assert.equal(options.timeout, 30_000); throw original;
      },
      evaluate: async () => {
        if (mode === 'evaluate-rejection') throw new Error('page closed');
        if (mode === 'evaluate-timeout') return new Promise(() => {});
        return { report: { ready: false }, documentReadyState: 'complete', href: 'test-url' };
      },
    };
    const run = runInNewContext(capture + '\ncaptureMode', {
      installDeterministicAssetDelay: async () => {}, setTimeout, clearTimeout,
      console: { error: (...values) => logged.push(values) },
      writeFile: async (file, content) => {
        if (mode === 'write-rejection') throw new Error('disk failure');
        written.push({ file, content: JSON.parse(content) });
      },
    });
    await assert.rejects(run({ newPage: async () => page }, 'test-url', '#fixture', 'capture.png'), error => error === original);
    if (mode === 'write-rejection') assert.equal(logged.length, 1);
    else {
      assert.equal(written.length, 1);
      assert.equal(written[0].file, 'capture.png.readiness-failure.json');
      assert.deepEqual(written[0].content.pageErrors, ['runtime before readiness']);
      if (mode === 'published') assert.equal(written[0].content.readiness.report.ready, false);
      else assert.match(written[0].content.diagnosticError, mode === 'evaluate-rejection' ? /page closed/ : /timed out/);
    }
  }
});

const RUNNER_FIELDS = [
  'viewportIds',
  'responsiveSequence',
  'lifecycleViewports',
  'interactionCycleLength',
  'enforcedStyleProperties',
  'sharpnessIds',
  'semanticIds',
  'announcementIds',
  'visualReuseStepIndexes',
  'visualOwnerReuseStepIndexes',
  'scrollStateTolerancePx',
  'enforcePointerCursor',
  'controlVisualStateIds',
  'textSelectionIds',
];

test('the public fixture manifest preserves every runner-owned fixture contract', async () => {
  const fixtures = await loadFixtureRegistry();
  const manifest = JSON.parse(await readFile('public/parity/fixtures.json', 'utf8'));

  assert.deepEqual(
    manifest.map((entry) => entry.id).sort(),
    fixtures.map((fixture) => fixture.id).sort(),
    'the public manifest and TypeScript registry must contain the same fixture IDs',
  );

  const fixturesById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  for (const entry of manifest) {
    const fixture = fixturesById.get(entry.id);
    assert.ok(fixture, `missing TypeScript fixture ${entry.id}`);
    assert.deepEqual(
      runnerContract(entry),
      runnerContract(fixture),
      `public parity metadata drifted from ${entry.id}`,
    );
  }
});

async function loadFixtureRegistry() {
  const result = await build({
    entryPoints: ['src/parity/fixtures/index.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
    logLevel: 'silent',
  });
  const bundledSource = Buffer.from(result.outputFiles[0].contents).toString('base64');
  const registry = await import(`data:text/javascript;base64,${bundledSource}`);
  return registry.getParityFixtures();
}

function runnerContract(fixture) {
  const contract = {
    id: fixture.id,
    title: fixture.title,
    category: fixture.category,
    expectedBehavior: fixture.expectedBehavior,
  };
  const dynamicStepCount = fixture.dynamicSteps?.length ?? fixture.dynamicStepCount;
  const interactionStepCount = fixture.interactionSteps?.length ?? fixture.interactionStepCount;
  if (dynamicStepCount) contract.dynamicStepCount = dynamicStepCount;
  if (interactionStepCount) contract.interactionStepCount = interactionStepCount;
  for (const field of RUNNER_FIELDS) {
    if (fixture[field] !== undefined) contract[field] = fixture[field];
  }
  return contract;
}
