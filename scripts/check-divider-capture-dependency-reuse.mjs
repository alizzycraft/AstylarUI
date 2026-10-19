import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { transformSync } from 'esbuild';

// Join two immutable capture inventories; do not rerun the dependency linker
// population or turn source/asset equality into current rendering acceptance.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const oldManifestFile = 'artifacts/material-parity/current-full-20261005/checkpoint/manifest.json';
const oldBytes = readFileSync(oldManifestFile);
assert.equal(hash(oldBytes), '7ae2cba1739353661a0c84e28ef70819157311cc824fd00ae94ced29fadeb352');
const newReportFile = 'artifacts/material-parity/divider-alignment-provenance-20261015/latest-report.json';
const newBytes = readFileSync(newReportFile);
assert.equal(hash(newBytes), '4be9c6d199952f35203f31d08def08d0d936071f4eb313b75ad3bbf72dd46f11');
const captures = [
  { root: 'artifacts/material-parity/icon-fresh-producer-retained-build-20261016-browser', provenance: JSON.parse(oldBytes).provenance },
  { root: 'examples/material-showcase/dist/material-showcase/browser', provenance: JSON.parse(newBytes).captureProvenance },
];
const manifests = [];
const inventories = captures.map(capture => {
  const inventory = new Map(), selected = capture.provenance.browserFiles.filter(row => row.file.endsWith('.js.map'));
  assert.equal(selected.length, 912);
  for (const receipt of selected) {
    assert.ok(!path.isAbsolute(receipt.file) && !receipt.file.split(/[\\/]/).includes('..'));
    const bytes = readFileSync(path.join(capture.root, receipt.file)); assert.equal(hash(bytes), receipt.sha256);
    const map = JSON.parse(bytes); assert.equal(map.sources.length, map.sourcesContent.length);
    for (const [index, file] of map.sources.entries()) {
      assert.equal(typeof map.sourcesContent[index], 'string');
      const sourceSha256 = hash(map.sourcesContent[index]);
      if (inventory.has(file)) assert.equal(inventory.get(file).sourceSha256, sourceSha256, `Conflicting duplicate ${file}`);
      else inventory.set(file, { file, sourceSha256, map: receipt.file, mapSha256: receipt.sha256, index });
    }
  }
  manifests.push({ root: capture.root, authenticatedJavaScriptMaps: selected.length, uniqueSources: inventory.size });
  return inventory;
});
const [old, current] = inventories;
const missing = [...old.keys()].filter(file => !current.has(file));
const added = [...current.keys()].filter(file => !old.has(file));
const changed = [];
let identical = 0, formattingOnly = 0;
for (const [file, before] of old) {
  const after = current.get(file); if (!after) continue;
  if (before.sourceSha256 === after.sourceSha256) { identical++; continue; }
  let completeJavaScriptFormattingEqual = null;
  if (file.endsWith('.js')) {
    const texts = [before, after].map((entry, i) => JSON.parse(readFileSync(path.join(captures[i].root, entry.map))).sourcesContent[entry.index]);
    const format = text => transformSync(text, { loader: 'js', legalComments: 'none', minifyWhitespace: true }).code;
    completeJavaScriptFormattingEqual = format(texts[0]) === format(texts[1]);
    formattingOnly += completeJavaScriptFormattingEqual;
  }
  changed.push({ file, before, after, completeJavaScriptFormattingEqual });
}
const media = captures.map(capture => new Map(capture.provenance.browserFiles
  .filter(row => /\.(woff2?|ttf|otf|svg|png|jpe?g|webp)$/.test(row.file))
  .map(row => { assert.equal(hash(readFileSync(path.join(capture.root, row.file))), row.sha256); return [row.file, row.sha256]; })));
assert.equal(media[0].size, 55); assert.equal(media[1].size, 55); assert.deepEqual(media[0], media[1]);
const styles = captures.map(capture => new Map(capture.provenance.browserFiles
  .filter(row => row.file.endsWith('.css') || row.file.endsWith('.css.map'))
  .map(row => { assert.equal(hash(readFileSync(path.join(capture.root, row.file))), row.sha256); return [row.file, row.sha256]; })));
const styleDifferences = [...new Set([...styles[0].keys(), ...styles[1].keys()])]
  .filter(file => styles[0].get(file) !== styles[1].get(file))
  .map(file => ({ file, before: styles[0].get(file) ?? null, after: styles[1].get(file) ?? null }));
console.log(JSON.stringify({ producerSha256: hash(readFileSync(import.meta.filename)),
  previousManifest: { file: oldManifestFile, sha256: hash(oldBytes) },
  dividerReport: { file: newReportFile, sha256: hash(newBytes) }, manifests,
  missing, added, identicalRawSources: identical, formattingOnlyJavaScriptSources: formattingOnly,
  changedSources: changed, identicalMediaAssets: media[0].size,
  styleFiles: styles.map(files => files.size), styleDifferences,
  boundary: 'Authenticated mapped-source and media/style-byte comparison between two captures only. Changed declarations remain explicit;no current-installed dependency replay,execution coverage,environment/clock equivalence,whole-case or rendering acceptance.' }));
