import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const showcase = path.join(root, 'examples', 'material-showcase');
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'astylarui-material-prepare-'));
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

try {
  run(npm, ['run', 'build:lib'], root);
  const [packResult] = JSON.parse(run(npm, ['pack', '--json', '--pack-destination', temporaryRoot], root, true));
  cpSync(path.join(temporaryRoot, packResult.filename), path.join(showcase, 'astylarui.tgz'));

  const installedPackage = path.join(showcase, 'node_modules', 'astylarui');
  if (existsSync(installedPackage)) rmSync(installedPackage, { recursive: true, force: true });
  run(npm, ['install', '--package-lock=false', '--no-audit', '--no-fund', '--legacy-peer-deps'], showcase);

  const angularCache = path.join(showcase, '.angular', 'cache');
  if (existsSync(angularCache)) rmSync(angularCache, { recursive: true, force: true });
  console.log('Prepared examples/material-showcase with a fresh packed AstylarUI dependency and cleared dev cache.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
