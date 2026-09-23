import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';

export function withAuditScratch(prefix, run, { root = 'artifacts/material-parity', retainSuccess = false, log = console.error } = {}) {
  assert.match(prefix, /^[a-z0-9][a-z0-9-]+-$/);
  fs.mkdirSync(root, { recursive: true });
  const boundary = fs.realpathSync(root), directory = fs.mkdtempSync(path.join(path.resolve(root), prefix));
  let result;
  try {
    result = run(directory);
    assert.ok(!result?.then, 'Use synchronous audit scratch callbacks');
  } catch (error) {
    log(`Audit failure evidence retained: ${directory}`);
    throw error;
  }
  if (retainSuccess) { log(`Audit scratch explicitly retained: ${directory}`); return result; }
  const resolved = fs.realpathSync(directory);
  assert.equal(resolved, path.join(boundary, path.basename(directory)));
  assert.equal(path.dirname(resolved), boundary);
  const inspect = dir => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      assert.ok(!item.isSymbolicLink(), 'Refusing to remove scratch containing a link');
      if (item.isDirectory()) inspect(path.join(dir, item.name));
    }
  };
  inspect(directory);
  fs.rmSync(directory, { recursive: true });
  return result;
}
