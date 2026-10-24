import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = b => createHash('sha256').update(b).digest('hex');
const load = (file, sha256) => {
  const b = readFileSync(file); assert.equal(hash(b), sha256);
  return JSON.parse((b[0] === 255 ? b.toString('utf16le') : b.toString()).replace(/^\ufeff/, ''));
};
test('Divider block alignment context does not erase normal/stretch formatting differences', () => {
  const context = load('artifacts/material-parity/divider-owner-block-alignment-context-20261025.log', 'cd06cbc51d6959c551e982bff83184d11ede1e59139e62ee1dc95d3903887475');
  const owners = load(context.ownerReview.file, context.ownerReview.sha256);
  assert.equal(context.ownerPairs, 120); assert.equal(context.rows.length, 120);
  for (const observation of owners.observations) {
    const candidate = load(observation.evidence.astylar.file, observation.evidence.astylar.sha256);
    // Other component rules contain alignItems/justifyContent. They are not
    // evidence of an authored alignContent override on the Divider owners.
    assert.deepEqual(candidate.rules.filter(r => ['alignContent','placeContent','all'].some(p => Object.hasOwn(r,p))), []);
    for (const mapping of observation.outsideScalarTargets) {
      const node = candidate.nodes.find(n => n.key === mapping.candidate);
      for (const style of [node.normalResolvedStyle,node.resolvedStyle,node.interactionResolvedStyle]) {
        assert.equal(style.display, 'block'); assert.equal(style.alignContent, 'stretch');
      }
      const row = context.rows.find(r => r.case === observation.case && r.id === mapping.id);
      assert.equal(row.reference.display, 'block'); assert.equal(row.reference.alignContent, 'normal');
    }
  }
  assert.equal(hash(readFileSync(context.sourceDefaults.file)), context.sourceDefaults.sha256);
  assert.match(readFileSync(context.sourceDefaults.file,'utf8'), /alignContent: "stretch"/);
  const control = load('artifacts/material-parity/block-align-content-native-control-20261025.log', '4b4934c072878e5b12c0a8ac9e2cbeb80fecfece9a985e6181d6452a0c769405');
  for (const source of control.sources) assert.equal(hash(readFileSync(source.file)), source.sha256);
  assert.equal(hash(control.html), control.htmlSha256);
  assert.deepEqual(control.results.map(r => [r.id,r.alignContent,r.childOffset]), [['normal','normal',0],['stretch','stretch',20],['center','center',55]]);
  assert.match(control.boundary, /not a package-root candidate reproduction/);
});
