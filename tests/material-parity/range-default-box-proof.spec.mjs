import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const reportPath = 'docs/material-range-default-box-audit.json';
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
const key = value => `${value.boxSizing}/${value.mode}`;
const sorted = values => [...values].sort((a, b) => key(a).localeCompare(key(b)));

// Verifies an observed failing diagnostic, not a renderer-parity acceptance gate.
function verifyEvidence(evidence) {
  assert.equal(evidence.schemaVersion, 1);
  assert.equal(evidence.evidenceId, 'range-native-border-defaults-public-proof');
  assert.equal(evidence.repeatIdentical, true);
  assert.equal(evidence.runs.length, 2);
  assert.equal(evidence.observations.length, 6);
  assert.deepEqual(sorted(evidence.observations).map(key),
    ['border-box', 'content-box'].flatMap(box => ['omitted', 'two', 'zero'].map(mode => `${box}/${mode}`)));
  for (const run of evidence.runs) {
    assert.deepEqual([run.exitCode, run.tests, run.passed, run.failed], [1, 6, 4, 2]);
    assert.match(run.commandOutput, /TOTAL: 2 FAILED, 4 SUCCESS/);
    const records = [...run.commandOutput.matchAll(/INFO: 'MATERIAL_RANGE_DEFAULT_BOX_PROOF',\s*'(\{[\s\S]*?\})'/g)]
      .map(match => JSON.parse(match[1].replace(/\r?\n/g, '')));
    assert.deepEqual(sorted(records), sorted(evidence.observations));
  }
  for (const observation of evidence.observations) {
    const { mode, boxSizing, site, browserStyle, stages, reference, actual } = observation;
    assert.equal(observation.dpr, 1);
    assert.deepEqual(observation.renderSize, [320, 180]);
    assert.deepEqual(site.root.children, [{ type: 'input', inputType: 'range', id: 'range-box-probe',
      min: '0', max: '100', step: '5', value: '50' }]);
    assert.equal(site.styles.length, 2);
    const request = site.styles[1];
    assert.equal(request.boxSizing, boxSizing);
    assert.equal(request.width, '120px'); assert.equal(request.height, '44px');
    assert.equal(request.padding, '0'); assert.equal(request.margin, '0');
    assert.equal(observation.css, site.styles.map(({ selector, ...values }) =>
      `${selector}{${Object.entries(values).map(([name, value]) =>
        `${name.replace(/[A-Z]/g, char => '-' + char.toLowerCase())}:${value}`).join(';')}}`).join('\n'));
    const browserBorder = mode === 'two' ? 2 : 0;
    const coreBorder = mode === 'omitted' ? 1 : browserBorder;
    assert.equal(browserStyle.borderWidth, `${browserBorder}px`);
    assert.equal(browserStyle.borderStyle, browserBorder ? 'solid' : 'none');
    assert.equal(browserStyle.borderRadius, '0px');
    assert.equal(browserStyle.boxSizing, boxSizing);
    assert.equal(browserStyle.appearance, 'auto');
    assert.equal(stages.length, 2);
    for (const stage of stages) {
      assert.deepEqual(stage, { borderWidth: `${coreBorder}px`, borderStyle: coreBorder ? 'solid' : 'none',
        borderRadius: mode === 'omitted' ? '4px' : '0px', boxSizing, appearance: '<omitted>' });
    }
    if (mode === 'omitted') {
      assert.equal(Object.keys(request).some(name => name.startsWith('border') || name === 'appearance'), false);
    } else {
      assert.equal(request.borderWidth, `${browserBorder}px`);
      assert.equal(request.borderStyle, browserBorder ? 'solid' : 'none');
      assert.equal(request.borderRadius, '0px');
    }
    const extra = boxSizing === 'content-box' ? 2 : 0;
    assert.deepEqual(reference, { x: 32, y: 32, width: 120 + extra * browserBorder, height: 44 + extra * browserBorder });
    assert.deepEqual(actual, { x: 32, y: 32, width: 120 + extra * coreBorder, height: 44 + extra * coreBorder });
  }
}

test('range default-box evidence replays both failing public runs and all equal-border controls', () => {
  verifyEvidence(report);
});

test('range default-box evidence rejects missing cases, altered claims and hidden compensation', () => {
  const mutations = [
    value => value.observations.pop(),
    value => { value.repeatIdentical = false; },
    value => { value.runs[0].exitCode = 0; },
    value => { value.observations[0].actual.width += 1; },
    value => { value.observations[0].stages[0].borderWidth = '0px'; },
    value => { value.observations[0].site.styles[1].borderWidth = '0px'; },
    value => { value.runs[0].commandOutput = value.runs[0].commandOutput.replace('TOTAL: 2 FAILED', 'TOTAL: 0 FAILED'); },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(report); mutate(changed);
    assert.throws(() => verifyEvidence(changed));
  }
});

test('range default-box proof retains exact source and installed-runtime fingerprints', () => {
  assert.equal(report.sourceFingerprints.length, 18);
  assert.equal(new Set(report.sourceFingerprints.map(source => source.file)).size, 18);
  for (const source of report.sourceFingerprints) {
    assert.equal(createHash('sha256').update(readFileSync(source.file)).digest('hex'), source.sha256, source.file);
  }
});

test('fresh range default-box runs authenticate unchanged public inputs and retain every failing observation', () => {
  const probe = 'examples/material-showcase/src/app/range-default-box-audit.spec.ts';
  assert.equal(createHash('sha256').update(readFileSync(probe)).digest('hex'),
    '68de22c89904ea01aafbf359a43a870b90fbcb37887f64e2ce52fbe08d61322f');
  const receipts = [
    '32406db9ea6dfae6ac60ddd92805605606c5559cfdc0ff7fdc3736d0e42f8be1',
    'ba430f741f655825bd1baba7cfe710c42fc8922392f1fccb77d8813d9e4e53a7',
  ];
  const runs = receipts.map((receipt, index) => {
    const bytes = readFileSync(`artifacts/material-parity/range-current-689c9611-20261005/run-${index + 1}.log`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), receipt);
    return { exitCode: 1, tests: 6, passed: 4, failed: 2, commandOutput: bytes.toString('utf8') };
  });
  const observations = runs.map(run => [...run.commandOutput.matchAll(
    /INFO: 'MATERIAL_RANGE_DEFAULT_BOX_PROOF',\s*'(\{[\s\S]*?\})'/g,
  )].map(match => JSON.parse(match[1].replace(/\r?\n/g, ''))));
  assert.deepEqual(sorted(observations[0]), sorted(observations[1]));
  for (const observation of observations[0]) assert.equal(observation.userAgent,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/154.0.0.0 Safari/537.36');
  const withoutUserAgent = values => sorted(values).map(({ userAgent, ...observation }) => observation);
  assert.deepEqual(withoutUserAgent(observations[0]), withoutUserAgent(report.observations),
    'all observation fields except the explicitly changed browser version must be conserved');
  // Reuse all original input, style-stage, geometry and six-case checks. This
  // fresh observation replay does not waive the historical source-receipt test
  // above or establish current applicability of its eighteen dependencies.
  verifyEvidence({ ...report, observations: observations[0], runs });
});
