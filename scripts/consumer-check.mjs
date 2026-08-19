import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceApp = path.join(root, 'examples', 'angular-consumer');
const temporaryRoot = mkdtempSync(path.join(tmpdir(), 'astylarui-consumer-'));
const temporaryApp = path.join(temporaryRoot, 'angular-consumer');
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
    if (entry.isDirectory()) return collectTypeScriptFiles(absolute);
    return entry.name.endsWith('.ts') ? [absolute] : [];
  });
}

function validateConsumerImports() {
  const forbidden = [];
  for (const file of collectTypeScriptFiles(path.join(sourceApp, 'src'))) {
    const contents = readFileSync(file, 'utf8');
    if (/from\s+['"][^'"]*(?:src\/|src\\|dist\/|dist\\|parity|app\/services|app\\services)/.test(contents)) {
      forbidden.push(path.relative(root, file));
    }
    const astylarImports = [...contents.matchAll(/from\s+['"](astylarui[^'"]*)['"]/g)];
    if (astylarImports.some((match) => match[1] !== 'astylarui')) {
      forbidden.push(path.relative(root, file));
    }
  }
  if (forbidden.length > 0) {
    throw new Error(`Consumer uses forbidden imports: ${forbidden.join(', ')}`);
  }
}

try {
  validateConsumerImports();
  run(npm, ['run', 'build:lib'], root);

  const packOutput = run(npm, ['pack', '--json', '--pack-destination', temporaryRoot], root, true);
  const [packResult] = JSON.parse(packOutput);
  const paths = new Set(packResult.files.map((file) => file.path.replaceAll('\\', '/')));
  const required = ['package.json', 'README.md', 'dist/lib/lib/index.js', 'dist/lib/lib/index.d.ts'];
  for (const requiredPath of required) {
    if (!paths.has(requiredPath)) throw new Error(`Packed package is missing ${requiredPath}.`);
  }
  const forbiddenRoots = ['src/', 'tests/', 'examples/', 'artifacts/', 'node_modules/'];
  const leaked = [...paths].filter((file) => forbiddenRoots.some((prefix) => file.startsWith(prefix)));
  if (leaked.length > 0) throw new Error(`Packed package leaks repository files: ${leaked.join(', ')}`);

  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  if (Object.keys(manifest.exports ?? {}).join(',') !== '.') {
    throw new Error('The package must expose only its documented root entry point.');
  }

  cpSync(sourceApp, temporaryApp, { recursive: true });
  cpSync(path.join(temporaryRoot, packResult.filename), path.join(temporaryApp, 'astylarui.tgz'));
  run(npm, ['install', '--no-audit', '--no-fund'], temporaryApp);
  run(npm, ['run', 'build'], temporaryApp);
  run(npm, ['test', '--', '--watch=false'], temporaryApp);

  const browserOutput = path.join(temporaryApp, 'dist', 'angular-consumer', 'browser', 'index.html');
  const serverOutput = path.join(temporaryApp, 'dist', 'angular-consumer', 'server', 'server.mjs');
  if (!existsSync(browserOutput) || !existsSync(serverOutput)) {
    throw new Error('Consumer build did not produce both browser and SSR outputs.');
  }
  console.log(`Consumer check passed with ${packResult.files.length} packed files.`);
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
