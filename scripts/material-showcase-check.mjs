import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceApp = path.join(root, 'examples', 'material-showcase');
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'astylarui-material-showcase-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args, cwd, capture = false) {
  const result = spawnSync(command, args, { cwd, encoding: capture ? 'utf8' : undefined, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed.${capture ? `\n${result.stdout}\n${result.stderr}` : ''}`);
  return capture ? result.stdout : '';
}

function collect(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? collect(absolute) : entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

try {
  const forbidden = collect(path.join(sourceApp, 'src')).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return /from\s+['"][^'"]*(?:src\/|src\\|dist\/|dist\\|app\/services|app\\services)/.test(source) ||
      [...source.matchAll(/from\s+['"](astylarui[^'"]*)['"]/g)].some((match) => match[1] !== 'astylarui');
  });
  assert.deepEqual(forbidden, [], `Showcase has forbidden source/deep imports: ${forbidden.join(', ')}`);
  run(npm, ['run', 'build:lib'], root);
  const [packResult] = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', temporaryRoot], root, true));
  const appTarget = path.join(temporaryRoot, 'examples', 'material-showcase');
  cpSync(sourceApp, appTarget, { recursive: true });
  cpSync(path.join(root, 'angular.json'), path.join(temporaryRoot, 'angular.json'));
  cpSync(path.join(root, 'tsconfig.json'), path.join(temporaryRoot, 'tsconfig.json'));
  cpSync(path.join(temporaryRoot, packResult.filename), path.join(temporaryRoot, 'astylarui.tgz'));
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  manifest.name = 'astylarui-material-showcase-check';
  manifest.private = true;
  manifest.dependencies = { ...manifest.dependencies, astylarui: 'file:./astylarui.tgz' };
  manifest.scripts = { 'build:showcase': 'ng build material-showcase', 'test:showcase': 'ng test material-showcase --watch=false --browsers=ChromeHeadless' };
  writeFileSync(path.join(temporaryRoot, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  run(npm, ['install', '--package-lock=false', '--no-audit', '--no-fund', '--legacy-peer-deps'], temporaryRoot);
  const installed = path.join(temporaryRoot, 'node_modules', 'astylarui');
  assert.ok(existsSync(installed) && !lstatSync(installed).isSymbolicLink(), 'Showcase must install the packed library, not a workspace link.');
  run(npm, ['run', 'test:showcase'], temporaryRoot);
  run(npm, ['run', 'build:showcase'], temporaryRoot);
  assert.ok(existsSync(path.join(temporaryRoot, 'dist', 'material-showcase', 'browser', 'index.csr.html')), 'Browser output is missing.');
  assert.ok(existsSync(path.join(temporaryRoot, 'dist', 'material-showcase', 'server', 'server.mjs')), 'SSR output is missing.');
  console.log(`Material showcase packed-app check passed with ${packResult.files.length} package files.`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
