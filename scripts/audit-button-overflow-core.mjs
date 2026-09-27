import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import '@angular/compiler';

// Run the exact existing NullEngine spec without rebundling Babylon or compiling
// the entire Angular application. This proves neither Angular DI nor browser paint.
const require = createRequire(import.meta.url);
const core = require('jasmine-core');
const jasmine = core.core(core), env = jasmine.getEnv();
Object.assign(globalThis, core.interface(jasmine, env));
const built = await build({
  entryPoints: ['src/app/services/dom/input/button.manager.spec.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm', sourcemap: false,
  tsconfigRaw: { compilerOptions: { experimentalDecorators: true } },
  plugins: [{ name: 'installed-packages', setup(builder) {
    builder.onResolve({ filter: /^[^./]/ }, args => ({
      path: pathToFileURL(require.resolve(args.path)).href, external: true,
    }));
  } }],
});
await import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].contents).toString('base64'));
const name = 'ButtonManager does not introduce an own clipping boundary for omitted or visible overflow';
env.configure({ random: false, specFilter: spec => spec.getFullName() === name });
const results = [];
env.addReporter({
  specDone: result => {
    if (result.status !== 'excluded') results.push({ name: result.fullName, status: result.status,
      failures: result.failedExpectations.map(e => e.message) });
  },
  jasmineDone: result => {
    console.log(JSON.stringify({ scope: 'NullEngine control clipping only', status: result.overallStatus, results }));
    process.exitCode = result.overallStatus === 'passed' && results.length === 1 && results[0].status === 'passed' ? 0 : 1;
  },
});
assert.ok(built.outputFiles[0].contents.length > 0);
await env.execute();
