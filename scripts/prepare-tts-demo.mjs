import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'examples', 'ai-tts-demo');
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'astylarui-tts-prepare-'));
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
  const packOutput = run(npm, ['pack', '--json', '--pack-destination', temporaryRoot], root, true);
  const [packResult] = JSON.parse(packOutput);
  cpSync(
    path.join(temporaryRoot, packResult.filename),
    path.join(demo, 'astylarui.tgz'),
  );

  const installedPackage = path.join(demo, 'node_modules', 'astylarui');
  if (existsSync(installedPackage)) {
    rmSync(installedPackage, { recursive: true, force: true });
  }
  run(npm, ['install', '--package-lock=false', '--no-audit', '--no-fund'], demo);
  console.log('Prepared examples/ai-tts-demo with a fresh packed AstylarUI dependency.');
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
