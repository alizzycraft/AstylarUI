import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const file = 'examples/material-showcase/src/app/astylar.component.ts';
const source = commit => execFileSync('git', ['show', `${commit}:${file}`], { encoding: 'utf8' });
const rule = (text, selector) => {
  const matches = text.split(/\r?\n/).filter(line => line.includes(`selector: '${selector}'`));
  assert.equal(matches.length, 1);
  return matches[0];
};

test('tooltip history records calibration followed by local-flow substitution, not restored overlay equivalence', () => {
  const calibrated = source('662c179399121a8d05d9235dac42c560eb255e93');
  assert.match(calibrated, /const tooltipTransform = devicePixelRatio >= 1\.5/);
  for (const value of ['47.5px, 11.5px', '50.5px, 20.5px', '92px, 26px', '92px, 25px', '92px, 39px']) {
    assert.ok(calibrated.includes(`translate(${value})`));
  }
  assert.match(rule(calibrated, '#tooltip-popup'), /position: 'absolute'.*top: '76px'.*left: '44px'.*transform: tooltipTransform/);

  const flow = source('f3c8254');
  assert.ok(!flow.includes('const tooltipTransform'));
  assert.match(rule(flow, '.tooltip-anchor'), /width: '141px'.*height: '72px'.*flexDirection: 'column'/);
  assert.match(rule(flow, '#tooltip-popup'), /position: 'relative'.*marginLeft: '16px'.*transform: 'translate\(93px, 37px\)'/);
  assert.ok(flow.includes("id: 'tooltip-anchor', class: 'tooltip-anchor', children:"));

  const centered = source('899c741771d1a75db578d6bb0dabec8b40cd48ba');
  assert.match(rule(centered, '.tooltip-anchor'), /alignItems: 'center'.*gap: '8px'/);
  const centeredPopup = rule(centered, '#tooltip-popup');
  assert.match(centeredPopup, /position: 'relative'.*width: '107px'.*justifyContent: 'center'/);
  assert.ok(!centeredPopup.includes('transform:'));

  const typography = source('f324bd1');
  assert.match(rule(typography, '.tooltip-anchor'), /width: '138px'.*height: '72px'/);
  const finalPopup = rule(typography, '#tooltip-popup');
  assert.match(finalPopup, /position: 'relative'.*height: '24px'.*fontSize: '12px'.*lineHeight: '16px'/);
  assert.ok(!finalPopup.includes('width:'));
  assert.ok(!finalPopup.includes('transform:'));
});
