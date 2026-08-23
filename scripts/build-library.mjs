import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
rmSync(path.join(root, 'dist', 'lib'), { recursive: true, force: true });

const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(executable, ['ngc', '-p', 'tsconfig.lib.json'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
