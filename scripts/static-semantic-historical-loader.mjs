// Historical replay only; exact reviewer-scoped source transitions are authenticated.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const hash = b => createHash('sha256').update(b).digest('hex');
const allowed = new Map([
  ['scripts/review-bottom-sheet-name-inputs.mjs', 'ce978558e4bc12e78f7138f226779fce63c811412ba3516153ca2faa0aaf5e65'],
  ['scripts/review-chip-orientation-inputs.mjs', '1a629dd1955d941afd861cb14de297363ea9d41269413eeedf6799b24ed145c5'],
  ['scripts/review-group-semantic-inputs.mjs', '9acd2968bb052b99435bb08f49d3765015a98331b90e59d54dbc481af5af4d3e'],
  ['scripts/review-picker-semantic-inputs.mjs', '88e54b231993d7544c318f31d7f462c6dfe3716e8d90a7e7f9da26efe984197a'],
  ['scripts/review-checkable-semantic-inputs.mjs', '01affdc05a387f4818c784237bc92d3874430e902e812163d8c6c2d9d092446c'],
  ['scripts/review-hidden-description-inputs.mjs', 'b2eb7a445f30d658704908941503da5eeb5a50bb623b091abd5937c2a48dc358'],
  ['scripts/review-sort-description-inputs.mjs', '2691ee4d6acef910b78dd70b3e05c6a142f5f7bad5c6ca16d6668edf344f1d1a'],
  ['scripts/review-toggle-group-inputs.mjs', '598808ad09a9190a64a4bd513446b7f8ccff3027ca9eb27d0451044e1fbe1d6f'],
  ['scripts/check-static-widget-state-ax.mjs', '41b60b756c719e0065e89ce31f92b7c3c8ae9b25e74fd05656592685d1b8dbdf'],
].map(([file, sha256]) => [pathToFileURL(path.resolve(file)).href, { file, sha256 }]));
const policyFile = 'tests/material-parity/input-equivalence-policy.mjs', policyUrl = pathToFileURL(path.resolve(policyFile)).href;
// Only the exact retained chip reviewer may replay these two historical file
// receipts. Production, other reviewers and arbitrary imports stay untouched.
const chipReviewer = path.resolve('scripts/review-chip-orientation-inputs.mjs');
if (process.argv[1] && path.resolve(process.argv[1]) === chipReviewer) {
  const read = fs.readFileSync.bind(fs);
  assert.equal(hash(read(chipReviewer)), allowed.get(pathToFileURL(chipReviewer).href).sha256);
  const transitions = new Map([
    [path.resolve('scripts/capture-passive-static-ax.mjs'), ['afa38baaaacb06b69fcbdfc66185ae2f44cd314bb278064af6f0b12bf512ea8a', '8cbbb5d1b64a879bd0e47bb123c23d8979bc10bbfeecee7158c008b363a2e1b0', () => read('artifacts/material-parity/passive-static-ax-20261021/producer.mjs')]],
    [path.resolve('tests/material-parity/sort-focus-structure.spec.mjs'), ['1e07ad431df8cc0c76bb8821a1f3d0c26841d57a353278bffa1d19a5000d3386', '9fafec85d890122fa1ad2bb2ac712975b7982c603c28f036d534f875aab0effa', () => execFileSync('git', ['show', '35807a5a8dc51ccefa3e38026daae397a7af6dc7:tests/material-parity/sort-focus-structure.spec.mjs'])]],
  ]);
  fs.readFileSync = (file, options) => {
    const transition = typeof file === 'string' ? transitions.get(path.resolve(file)) : undefined;
    if (!transition) return read(file, options);
    const live = read(file);
    assert.equal(hash(live.toString().replaceAll('\r\n', '\n')), transition[0], `Unrecognized historical source: ${file}`);
    const original = transition[2]();
    assert.equal(hash(original), transition[1], `Changed retained source: ${file}`);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? original.toString(encoding) : original;
  };
  syncBuiltinESMExports();
}
registerHooks({
  resolve(specifier, context, next) {
    const result = next(specifier, context);
    if (result.url === policyUrl) {
      const owner = allowed.get(context.parentURL); assert.ok(owner, 'Historical policy only for exact retained reviewers;not production,capture or arbitrary imports');
      assert.equal(hash(fs.readFileSync(owner.file)), owner.sha256, 'Historical reviewer changed');
    }
    return result;
  },
  load(url, context, next) {
    const result = next(url, context); if (url !== policyUrl) return result;
    const live = result.source.toString().replaceAll('\r\n', '\n');
    const accepted = new Set([
      '7381e8fba08553caec77947e88ce5246e1c3fc01a6da18b81f3c07ea945a336f',
      'a38dc20ab17b392fcd1eeac4e8ff693859c3dbfaf4395ae0e0a782326bd72a6c',
      'b85f901b0b19ce6422ba4194aef63f558b6ca476f0e20b9f903b3a51c0bff0b3',
    ]);
    assert.ok(accepted.has(hash(live)), 'Unrecognized historical policy source');
    const historical = execFileSync('git', ['show', '729e6ef3:tests/material-parity/input-equivalence-policy.mjs'], { maxBuffer: 8_000_000 }).toString().replaceAll('\r\n', '\n');
    assert.equal(hash(historical), 'b85f901b0b19ce6422ba4194aef63f558b6ca476f0e20b9f903b3a51c0bff0b3');
    return { ...result, source: historical };
  },
});
