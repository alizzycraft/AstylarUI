// Historical module population only;no filesystem reads or receipt bytes are replaced.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { restoreStaticSemanticPolicy } from '../tests/material-parity/static-semantic-registration.mjs';
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
    return { ...result, source: restoreStaticSemanticPolicy(result.source) };
  },
});
