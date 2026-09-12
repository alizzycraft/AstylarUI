import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const helperFile = 'tests/material-parity/supplemental-capture-evidence.mjs';
const collectorFile = 'tests/material-parity/input-tree-evidence.mjs';
const runtimeTypes = ['document', 'script', 'stylesheet', 'font'];
function runtimeAssetMap(files) {
  assert.ok(Array.isArray(files) && files.length > 0, 'Missing checkpoint assets.');
  for (const item of files) {
    assert.ok(typeof item.file === 'string' && item.file.length > 0, 'Missing checkpoint asset path.');
    assert.match(item.sha256 ?? '', /^[a-f0-9]{64}$/, 'Missing checkpoint asset digest.');
  }
  const result = new Map(files.map(item => [item.file, item.sha256]));
  assert.equal(result.size, files.length, 'Duplicate checkpoint assets.');
  return result;
}
const relative = (root, file) => path.relative(root, file).replaceAll('\\', '/');
const inside = (boundary, file) => {
  const name = path.relative(boundary, file);
  return name !== '' && !name.startsWith(`..${path.sep}`) && name !== '..' && !path.isAbsolute(name);
};

export function parseSupplementalCaptureArguments(args, root = process.cwd()) {
  const values = {};
  for (const arg of args) {
    const match = /^--(base-url|checkpoint|output)=(.*)$/.exec(arg);
    assert.ok(match, `Unknown supplemental capture option: ${arg}`);
    assert.ok(match[2].trim(), `Empty supplemental capture option: ${match[1]}`);
    assert.ok(values[match[1]] === undefined, `Repeated supplemental capture option: ${match[1]}`);
    values[match[1]] = match[2];
  }
  assert.ok(values['base-url'] && values.checkpoint && values.output, 'Supply --base-url, --checkpoint and a new --output directory.');
  const url = new URL(values['base-url']);
  assert.ok(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname) &&
    url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password, 'Use the local frozen showcase server origin.');
  const boundary = path.resolve(root, 'artifacts/material-parity');
  for (const key of ['checkpoint', 'output']) {
    values[key] = path.resolve(root, values[key]);
    assert.ok(inside(boundary, values[key]), `${key} must be inside artifacts/material-parity.`);
  }
  assert.notEqual(values.checkpoint, values.output, 'Output cannot replace checkpoint evidence.');
  return { baseUrl: url.origin, checkpoint: values.checkpoint, output: values.output };
}

// Producer observes runtime bytes; it never derives or changes fixture inputs.
export function openSupplementalCapture({ options, browser, script, styleProperties, root = process.cwd() }) {
  const boundary = realpathSync(path.resolve(root, 'artifacts/material-parity'));
  assert.ok(inside(boundary, realpathSync(options.checkpoint)), 'Checkpoint symlink escapes artifacts.');
  assert.ok(!existsSync(options.output), 'Use a new output directory; preserve earlier supplemental evidence.');
  let ancestor = path.dirname(options.output);
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realAncestor = realpathSync(ancestor);
  assert.ok(realAncestor === boundary || inside(boundary, realAncestor), 'Output symlink escapes artifacts.');
  const manifestFile = path.join(options.checkpoint, 'manifest.json'), bytes = readFileSync(manifestFile);
  const manifest = JSON.parse(bytes);
  assert.equal(manifest.schemaVersion, 1, 'Unsupported checkpoint schema.');
  assert.equal(browser.version(), manifest.provenance?.browser, 'Browser differs from selected checkpoint.');
  const expected = runtimeAssetMap(manifest.provenance.browserFiles);
  const capture = { schemaVersion: 1,
    checkpointManifest: { file: relative(root, manifestFile), sha256: digest(bytes) },
    sources: [script, helperFile, collectorFile].map(file => ({ file, sha256: digest(readFileSync(path.resolve(root, file))) })),
    styleProperties: [...styleProperties],
  };
  mkdirSync(options.output, { recursive: true });
  return {
    capture, directory: relative(root, options.output),
    observe(page) {
      const assets = [], errors = [], pending = [];
      const onError = error => errors.push(String(error));
      const onConsole = message => { if (message.type() === 'error') errors.push(message.text()); };
      const onResponse = response => {
        const type = response.request().resourceType();
        if (!runtimeTypes.includes(type)) return;
        pending.push((async () => {
          const url = new URL(response.url());
          assert.equal(url.origin, options.baseUrl, 'Unexpected external runtime asset.');
          const file = type === 'document' ? 'index.csr.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
          const sha256 = digest(await response.body());
          assert.equal(response.status(), 200, `Failed runtime asset: ${file}`);
          assert.equal(sha256, expected.get(file), `Served asset differs from checkpoint: ${file}`);
          assets.push({ file, sha256, type });
        })().catch(onError));
      };
      page.on('response', onResponse);
      page.on('pageerror', onError);
      page.on('console', onConsole);
      return async () => {
        await page.evaluate(() => document.fonts.ready);
        // Asset callbacks may append work while a previous response body is read.
        let completed = 0;
        while (completed < pending.length) {
          const batch = pending.slice(completed);
          completed = pending.length;
          await Promise.all(batch);
        }
        page.off('response', onResponse);
        page.off('pageerror', onError);
        page.off('console', onConsole);
        assert.deepEqual(errors, [], 'Supplemental runtime validation failed.');
        for (const type of runtimeTypes) assert.ok(assets.some(asset => asset.type === type), `Missing ${type} runtime evidence.`);
        return { assets: assets.sort((a, b) => a.file.localeCompare(b.file)), errors };
      };
    },
  };
}

// Reader independently checks the manifest, source bytes and each side's assets
// and tree digest. A self-reported matching browser/version is not sufficient.
export function validateSupplementalCapture(raw, { root = process.cwd(), reportFile, expectedProvenance,
  script, styleProperties, readBytes }) {
  if (!raw.capture && !expectedProvenance) return { status: 'legacy-unbound', errors: [] };
  const errors = [];
  try {
    assert.ok(expectedProvenance?.browser, 'Missing selected-run provenance.');
    const boundary = path.resolve(root, 'artifacts/material-parity');
    const read = (file, source = false) => {
      assert.equal(typeof file, 'string', 'Missing evidence path.');
      const absolute = path.resolve(root, file), base = source ? path.resolve(root) : boundary;
      assert.ok(inside(base, absolute), 'Evidence path escapes its allowed directory.');
      if (!readBytes) assert.ok(inside(realpathSync(base), realpathSync(absolute)), 'Evidence symlink escapes its allowed directory.');
      return (readBytes ?? readFileSync)(absolute);
    };
    const readHashed = (item, source = false) => {
      assert.match(item?.sha256 ?? '', /^[a-f0-9]{64}$/, 'Missing evidence digest.');
      const bytes = read(item.file, source);
      assert.equal(digest(bytes), item.sha256, `Changed evidence: ${item.file}`);
      return bytes;
    };
    assert.equal(raw.capture?.schemaVersion, 1, 'Missing or unsupported supplemental capture provenance.');
    const manifest = JSON.parse(readHashed(raw.capture.checkpointManifest));
    assert.equal(manifest.schemaVersion, 1, 'Unsupported checkpoint manifest schema.');
    assert.deepEqual(manifest.provenance, expectedProvenance, 'Supplement belongs to a different capture run.');
    assert.equal(raw.browser, expectedProvenance.browser, 'Supplement browser differs from selected run.');
    assert.deepEqual(raw.capture.styleProperties, styleProperties, 'Captured style-property set changed.');
    assert.deepEqual(raw.capture.sources.map(item => item.file).sort(), [script, helperFile, collectorFile].sort(), 'Missing or duplicated capture source.');
    for (const item of raw.capture.sources) readHashed(item, true);
    const expected = runtimeAssetMap(expectedProvenance.browserFiles);
    assert.ok(Array.isArray(raw.results) && raw.results.length > 0, 'Missing supplemental cases.');
    const treeFiles = new Set();
    for (const entry of raw.results) for (const side of ['reference', 'astylar']) {
      const evidence = entry[side];
      assert.deepEqual(evidence?.runtime?.errors, [], 'Missing runtime record or captured runtime errors.');
      const assets = evidence.runtime.assets;
      assert.ok(Array.isArray(assets), 'Missing captured runtime assets.');
      for (const type of runtimeTypes) assert.ok(assets.some(asset => asset.type === type), `Missing captured ${type} evidence.`);
      for (const asset of assets) {
        assert.ok(runtimeTypes.includes(asset.type), 'Unknown runtime asset type.');
        assert.ok(expected.has(asset.file), `Unknown checkpoint asset: ${asset.file}`);
        assert.match(asset.sha256 ?? '', /^[a-f0-9]{64}$/, 'Missing captured asset digest.');
        assert.equal(asset.sha256, expected.get(asset.file), `Runtime asset differs from selected checkpoint: ${asset.file}`);
      }
      const treeFile = evidence.inputTree?.file;
      assert.equal(path.dirname(path.resolve(root, treeFile ?? '')), path.dirname(path.resolve(root, reportFile)), 'Input tree belongs to a different supplemental directory.');
      assert.ok(!treeFiles.has(treeFile), 'Duplicate supplemental input tree.');
      treeFiles.add(treeFile);
      const tree = JSON.parse(readHashed(evidence.inputTree));
      assert.ok(Array.isArray(tree.nodes) && tree.nodes.length > 0, 'Missing supplemental tree nodes.');
      assert.deepEqual(tree.errors, [], 'Supplemental tree has collection errors.');
    }
  } catch (error) { errors.push({ error: String(error.message) }); }
  return { status: errors.length ? 'invalid' : 'checkpoint-bound', errors };
}
