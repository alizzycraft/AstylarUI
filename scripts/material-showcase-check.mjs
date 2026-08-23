import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceApp = path.join(root, 'examples', 'material-showcase');
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'astylarui-material-showcase-'));
const temporaryApp = path.join(temporaryRoot, 'material-showcase');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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
    return entry.isDirectory() ? collectTypeScriptFiles(absolute) : entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

function validateImports() {
  const forbidden = collectTypeScriptFiles(path.join(sourceApp, 'src')).filter((file) => {
    const source = readFileSync(file, 'utf8');
    return /from\s+['"][^'"]*(?:src\/|src\\|dist\/|dist\\|app\/services|app\\services)/.test(source) ||
      [...source.matchAll(/from\s+['"](astylarui[^'"]*)['"]/g)].some((match) => match[1] !== 'astylarui');
  });
  assert.deepEqual(forbidden, [], `Showcase has forbidden source/deep imports: ${forbidden.join(', ')}`);
}

function copySourceApp() {
  const excluded = new Set(['.angular', 'astylarui.tgz', 'coverage', 'dist', 'node_modules', 'package-lock.json']);
  cpSync(sourceApp, temporaryApp, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(sourceApp, source);
      return !relative || !excluded.has(relative.split(path.sep)[0]);
    },
  });
}

try {
  validateImports();
  copySourceApp();
  run(npm, ['run', 'build:lib'], root);
  const [packResult] = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', temporaryRoot], root, true));
  cpSync(path.join(temporaryRoot, packResult.filename), path.join(temporaryApp, 'astylarui.tgz'));
  run(npm, ['install', '--package-lock=false', '--no-audit', '--no-fund', '--legacy-peer-deps'], temporaryApp);
  const installed = path.join(temporaryApp, 'node_modules', 'astylarui');
  assert.ok(existsSync(installed) && !lstatSync(installed).isSymbolicLink(),
    'Showcase must install the packed library, not a workspace link.');
  run(npm, ['test', '--', '--watch=false', '--browsers=ChromeHeadless'], temporaryApp);
  run(npm, ['run', 'build'], temporaryApp);
  assert.ok(existsSync(path.join(temporaryApp, 'dist', 'material-showcase', 'browser', 'index.csr.html')),
    'Browser output is missing.');
  assert.ok(existsSync(path.join(temporaryApp, 'dist', 'material-showcase', 'server', 'server.mjs')),
    'SSR output is missing.');
  console.log(`Material showcase standalone packed-app check passed with ${packResult.files.length} package files.`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
