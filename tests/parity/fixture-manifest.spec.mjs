import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { build } from 'esbuild';

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
