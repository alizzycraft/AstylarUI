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
const historicalPolicyUrl = `${policyUrl}?retained-static-semantic-review`;
// Exact retained reviewers and the bottom-sheet verifier may replay these two
// receipts. Production, other reviewers and arbitrary imports stay untouched.
const bottomReviewer = path.resolve('scripts/review-bottom-sheet-name-inputs.mjs');
const bottomVerifier = path.resolve('scripts/check-bottom-sheet-activate-ax.mjs');
const entry = process.argv[1] && path.resolve(process.argv[1]);
const allowedReviewer = entry && allowed.get(pathToFileURL(entry).href);
if (allowedReviewer || entry === bottomVerifier) {
  const read = fs.readFileSync.bind(fs);
  const expected = entry === bottomVerifier ? 'c4db8c3d0f34c2aec2f4c39f1bfe847d4f830cbcd' + 'a82810b5ca191dd661bf65d' : allowedReviewer.sha256;
  assert.equal(hash(read(entry)), expected);
  if (entry === bottomReviewer) {
    const loader = pathToFileURL(path.resolve('scripts/static-semantic-historical-loader.mjs')).href;
    if (!process.env.NODE_OPTIONS?.includes(loader)) process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --import=${loader}`.trim();
  }
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
      const liveDependencies = new Map([
        ['scripts/join-material-menu-composite-evidence.mjs', 'a40c216868f8f7cd0ef713e8384e94ee65d82ffab155a57c691bdd6b45bd8661'],
        ['scripts/join-material-snackbar-single-open.mjs', '53753650ee73d2e83a6d8242ccd0b17dd6a1887a495dd00e1d6a830b9011ad1f'],
      ].map(([file, digest]) => [pathToFileURL(path.resolve(file)).href, { file, digest }]));
      const liveDependency = liveDependencies.get(context.parentURL);
      if (entry === path.resolve('scripts/join-static-semantic-input-evidence.mjs') && liveDependency) {
        assert.equal(hash(fs.readFileSync('scripts/join-static-semantic-input-evidence.mjs')), '7f46ceb152f3d93ef8b58485b79676829bbf3117d21d53911c4552e9aecfce27');
        assert.equal(hash(fs.readFileSync(liveDependency.file)), liveDependency.digest);
        return result;
      }
      const owner = allowed.get(context.parentURL); assert.ok(owner, `Historical policy only for exact retained reviewers;not production,capture or arbitrary imports: ${context.parentURL}`);
      assert.equal(hash(fs.readFileSync(owner.file)), owner.sha256, 'Historical reviewer changed');
      return { ...result, url: historicalPolicyUrl };
    }
    return result;
  },
  load(url, context, next) {
    const result = next(url, context); if (url !== historicalPolicyUrl) return result;
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
