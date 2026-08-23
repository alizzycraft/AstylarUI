import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('the local packed demo cannot reuse a same-version optimized renderer bundle', () => {
  const demoPackage = JSON.parse(readFileSync(
    path.join(root, 'examples', 'ai-tts-demo', 'package.json'),
    'utf8',
  ));
  const preparation = readFileSync(path.join(root, 'scripts', 'prepare-tts-demo.mjs'), 'utf8');

  assert.match(demoPackage.scripts.start, /--prebundle=false/);
  assert.match(preparation, /path\.join\(demo, '\.angular', 'cache'\)/);
  assert.ok(
    preparation.indexOf("run(npm, ['install'") < preparation.indexOf("path.join(demo, '.angular', 'cache')"),
    'The optimized dependency cache must be cleared after installing the replacement tarball.',
  );
});
