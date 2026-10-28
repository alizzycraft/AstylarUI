import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { materialCaseKey } from '../tests/material-parity/run-checkpoint.mjs';
import { createDatepickerOpeningReviewReader } from '../tests/material-parity/datepicker-opening-registration.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const tooltipOpenPredecessor = 'cd9631f0dc9f7ca63b35c5d11d11611ebd3f98930166352ff56b3016d7989894';
const childKey = 'supplementaryTooltipOpen';
const sharedPrior = 'dcf312086d8c6409fb6463b9c28f68d613b689ae75368ab8fd8e39f02572a4b5';
const sharedImport = "import { restoreTooltipOpenRegistry, restoreTooltipOpenSelection } from '../../scripts/join-material-tooltip-open.mjs';\n";
const sharedBody = `  if (kind === 'producer' && bytes.toString().includes('"scripts/join-material-tooltip-open.mjs",')) bytes = restoreTooltipOpenRegistry(bytes);
  if ((kind === 'runner' && bytes.toString().includes('const tooltipOpenReaderFactory = ')) ||
    (kind === 'launcher' && bytes.toString().includes("const tooltipOpen = rawRequested.includes('--tooltip-open');"))) bytes = restoreTooltipOpenSelection(bytes, kind);
`;
export function prepareTooltipSharedBoundary(bytes) {
  const source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), sharedPrior);
  return sharedImport + source.replace('export function restoreSnackbarRegistrationIfPresent(bytes, kind) {\n',
    'export function restoreSnackbarRegistrationIfPresent(bytes, kind) {\n' + sharedBody);
}
export function restoreTooltipSharedBoundary(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === sharedPrior) return source;
  assert.ok(source.startsWith(sharedImport)); source = source.slice(sharedImport.length);
  assert.equal(source.split(sharedBody).length, 2); source = source.replace(sharedBody, '');
  assert.equal(hash(source), sharedPrior); return source;
}
export function restoreTooltipSnackbarSuite(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  const prior = '1fd52788e1e36bb7c2b476529952d262f7c60da7bc8a5a0061432e80291f1817';
  if (hash(source) === prior) return source;
  const addition = "import { createTooltipOpenHistoricalRead } from '../../scripts/join-material-tooltip-open.mjs';\n";
  assert.equal(source.split(addition).length, 2); source = source.replace(addition, '');
  source = source.replace('read: createTooltipOpenHistoricalRead({ root: process.cwd(), read: readActualFileSync })', 'read: readActualFileSync');
  assert.equal(hash(source), prior); return source;
}
const registryPredecessor = '68b3644e4fcbdb4b1865e6bb15341066e4549bf7235bbf0f7a1a280fc4e5563e';
export const tooltipOpenReview = '3a51fbe3299d2c0f3f7ee70822bb69e0a4f7d9ec77739e6942337d12917cfe9d';
const selectionPrior = {
  runner: 'f892923704a593a4966cf08c09a18c45edad00f36ffbd4fcc52994d29df61e0a',
  launcher: 'f4e69c99a0aca6399bf4cf3b1b10c7314e8205009a7501bae8f079abc1a0f849',
};
const selectionChanges = {
  runner: [
    ["import { datepickerOpeningReview, createDatepickerOpeningReviewReader } from '../tests/material-parity/datepicker-opening-registration.mjs';", "import { datepickerOpeningReview, createDatepickerOpeningReviewReader } from '../tests/material-parity/datepicker-opening-registration.mjs';\nimport { tooltipOpenReview, createTooltipOpenReviewReader } from './join-material-tooltip-open.mjs';"],
    ['const applicability=datepickerOpeningReaderFactory?.', 'const tooltipOpenReaderFactory = options.caseObligationReviewSha256===tooltipOpenReview ? createTooltipOpenReviewReader : datepickerOpeningReaderFactory;\n    const applicability=tooltipOpenReaderFactory?.'],
  ],
  launcher: [
    ["const datepickerOpening = rawRequested.includes('--datepicker-opening');", "const tooltipOpen = rawRequested.includes('--tooltip-open');\nassert.ok(!tooltipOpen || rawRequested.every(argument => ['--tooltip-open', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst datepickerOpening = rawRequested.includes('--datepicker-opening');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--tooltip-open').filter("],
    ['|--datepicker-opening]', '|--datepicker-opening|--tooltip-open]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (tooltipOpen) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${tooltipOpenReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['snackbarSingleOpen || datepickerOpening)', 'snackbarSingleOpen || datepickerOpening || tooltipOpen)'],
    ["if (requested.includes('--dry-run'))", `if (tooltipOpen) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${tooltipOpenReview}';\nif (requested.includes('--dry-run'))`],
  ],
};
export function prepareTooltipOpenSelection(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), selectionPrior[kind]);
  for (const [before, after] of selectionChanges[kind]) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreTooltipOpenSelection(bytes, kind) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === selectionPrior[kind]) return source;
  for (const [before, after] of selectionChanges[kind].toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), selectionPrior[kind]); return source;
}
export const tooltipOpenSources = Object.freeze([
  'scripts/join-material-tooltip-open.mjs',
  'scripts/audit-material-tooltip-touch.mjs',
  'tests/material-parity/tooltip-position-history.spec.mjs',
  'artifacts/material-parity/tooltip-configured-open-20261028/latest-report.json',
  'artifacts/material-parity/tooltip-configured-open-20261028-provenance/checkpoint/manifest.json',
  'artifacts/material-parity/tooltip-release-component-caller-20261027/latest-report.json',
  'artifacts/material-parity/tooltip-release-component-caller-20261027-checkpoint/checkpoint/manifest.json',
  'artifacts/material-parity/tooltip-release-caller-20261027/latest-report.json',
  'artifacts/material-parity/tooltip-release-caller-20261027-checkpoint/checkpoint/manifest.json',
  'artifacts/material-parity/tooltip-trusted-touch-20261008/latest-report.json',
]);
export const tooltipOpenProofs = Object.freeze([
  'tooltip registry preparation preserves the complete predecessor inventory',
  'tooltip open join preserves all predecessor obligations and rejects changed receipts',
  'tooltip diagnostic source applicability authenticates both exact driver revisions',
  'configured tooltip open clicks retain eight exact divergent popup endpoints',
  'supplementary Android tooltip actions cannot close responsive canonical cases',
  'first release trace retains exact producer recovery without changing current capture reads',
  'fresh tooltip release trace observes body-interaction immediate component hide after trusted click',
  'retained tooltip touch release timing excludes capture-delay expiry, not unobserved dismissal paths',
  'captured native tooltip touch exits request delayed hide while body interaction can hide immediately',
  'tooltip history records calibration followed by local-flow substitution, not restored overlay equivalence',
]);
const proofBoundary = 'Bounded tooltip action/history evidence with explicit configured-versus-Android and original-versus-fresh runtime boundaries;not current rendering,all event paths or whole-case acceptance.';
const registryAdditions = [
  ['function sourceFingerprints(root) {\n  const files = [\n', tooltipOpenSources.map(file => `    ${JSON.stringify(file)},\n`).join('')],
  ['function focusedProofInventory(root) {\n  return [\n', tooltipOpenProofs.map(title =>
    `    proof(root, "tests/material-parity/tooltip-position-history.spec.mjs", new RegExp(${JSON.stringify("test\\('" + title + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(proofBoundary)}),\n`).join('')],
];
export function prepareTooltipOpenRegistry(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), registryPredecessor);
  for (const [anchor, extra] of registryAdditions) {
    assert.equal(source.split(anchor).length, 2); source = source.replace(anchor, anchor + extra);
  }
  return source;
}
export function restoreTooltipOpenRegistry(bytes) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === registryPredecessor) return source;
  for (const [anchor, extra] of registryAdditions.toReversed()) {
    assert.equal(source.split(anchor + extra).length, 2); source = source.replace(anchor + extra, anchor);
  }
  assert.equal(hash(source), registryPredecessor); return source;
}

// Explicit read-only applicability boundary. Neither recorded receipt nor source
// is rewritten, and unknown revisions must not fall through to historical bytes.
export function reconcileTooltipActivationDriver(current, previous) {
  assert.equal(hash(current), 'f97c4459373bcca113d05842aec5179425a551d7c8ccd064e62d0693d9438fda');
  assert.equal(hash(previous), '837098a21a29cb1e1c50a65803d398a7588b9c6d05dd815eeea5d18e4b581118');
  return Buffer.from(previous);
}

export function createTooltipOpenHistoricalRead({ root, read }) {
  const file = 'scripts/audit-material-configured-control-activation.mjs';
  let previous;
  return (name, options) => {
    if (path.resolve(root, name) === path.resolve(root, 'tests/material-parity/snackbar-single-open-registration.spec.mjs')) {
      const bytes = Buffer.from(restoreTooltipSnackbarSuite(read(name)));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    if (path.resolve(root, name) === path.resolve(root, 'tests/material-parity/snackbar-single-open-registration.mjs')) {
      const bytes = Buffer.from(restoreTooltipSharedBoundary(read(name)));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    const kind = path.resolve(root, name) === path.resolve(root, 'scripts/run-material-input-audit.mjs') ? 'runner'
      : path.resolve(root, name) === path.resolve(root, 'scripts/export-material-input-audit-current-ancestry.mjs') ? 'launcher' : null;
    if (kind) {
      const bytes = Buffer.from(restoreTooltipOpenSelection(read(name), kind));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    if (path.resolve(root, name) === path.resolve(root, 'tests/material-parity/input-equivalence-audit.mjs')) {
      const bytes = Buffer.from(restoreTooltipOpenRegistry(read(name)));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : bytes;
    }
    if (path.resolve(root, name) !== path.resolve(root, file)) return read(name, options);
    const input = read(name);
    if (!previous) previous = execFileSync('git', ['show', `a566bdf0:${file}`], { cwd: root });
    const bytes = reconcileTooltipActivationDriver(input, previous);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : bytes;
  };
}

export function createTooltipOpenReviewReader({ root, read }) {
  const prior = createDatepickerOpeningReviewReader({ root, read: createTooltipOpenHistoricalRead({ root, read }) });
  const joined = joinTooltipOpen(JSON.parse(prior.read(prior.file)).review, read);
  assert.equal(joined.sha256, tooltipOpenReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: joined.sha256, review: joined.review }));
  return { ...joined, file, read(name, options) {
    if (path.resolve(root, name) !== file) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'supplementary-tooltip-open', predecessorApplicability: prior.sourceApplicability,
    boundary: 'Exact configured open click observations in retained assets;not touch,original runtime causality,current rendering or whole-case acceptance.' } };
}

export function restoreTooltipOpen(review) {
  return { ...review, groups: review.groups.map(group => {
    if (!group.obligations.authoredActivation[childKey]) return group;
    const activation = { ...group.obligations.authoredActivation, disposition: 'evidence-join-pending' };
    delete activation[childKey];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}

export function joinTooltipOpen(parent, read = readFileSync) {
  assert.equal(hash(JSON.stringify(parent)), tooltipOpenPredecessor);
  const receipt = { file: 'artifacts/material-parity/tooltip-configured-open-20261028/latest-report.json',
    sha256: '48dfc121bb0788f4f2d595fd0d3097adae4a48edd53bd1bd6eb381b75ca26dbd' };
  const load = r => { const bytes = read(r.file); assert.equal(hash(bytes), r.sha256); return bytes; };
  const report = JSON.parse(load(receipt));
  const manifest = report.capture.checkpointManifest;
  load(manifest);
  assert.equal(report.browser, '156.0.8078.48');
  const expected = ['light', 'dark', 'contrast', 'custom'].flatMap(profile => [1, 2].map(dpr =>
    `interaction:tooltip@${profile}/desktop-dpr${dpr}/open`));
  const caseName = row => `interaction:${row.family}@${row.profile}/${row.viewport.id}/${row.state}`;
  assert.deepEqual(report.results.map(caseName).sort(), expected.toSorted());
  const rows = new Map(report.results.map(row => [caseName(row), row]));
  for (const row of rows.values()) {
    assert.equal(row.caseId, materialCaseKey('interaction', row));
    for (const side of ['reference', 'astylar']) {
      const evidence = row[side];
      const tree = JSON.parse(load(evidence.inputTree)); load(evidence.screenshot);
      assert.deepEqual(evidence.runtime.errors, []);
      const samples = evidence.observations;
      assert.deepEqual(samples.map(o => o.boundary), ['before', 'after-action', 'settled']);
      assert.deepEqual(samples.map(o => o.state.open), side === 'reference' ? [false, false, false] : [false, true, true]);
      assert.equal(samples.at(-1).active.logicalId, 'tooltip-primary');
      const events = samples.at(-1).events.filter(e => ['pointerdown', 'pointerup', 'click'].includes(e.type));
      assert.deepEqual(events.map(e => e.type), ['pointerdown', 'pointerup', 'click']);
      assert.ok(events.every(e => e.trusted));
      const popup = tree.nodes.filter(n => side === 'reference'
        ? String(n.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-tooltip-surface')
        : n.authored?.id === 'tooltip-popup');
      assert.equal(popup.length, side === 'reference' ? 0 : 1);
    }
  }
  let changed = 0;
  const groups = parent.groups.map(group => {
    const row = rows.get(group.case); if (!row) return group;
    changed++;
    assert.equal(group.inspection, 'partial'); assert.equal(group.currentRendering, 'unverified');
    const activation = group.obligations.authoredActivation;
    assert.equal(activation.disposition, 'evidence-join-pending'); assert.equal(activation[childKey], undefined);
    return { ...group, obligations: { ...group.obligations, authoredActivation: {
      ...activation, disposition: 'partial', [childKey]: {
        disposition: 'inspected-supplementary-open-state-failure',
        evidence: { report: receipt, manifest,
          reference: { inputTree: row.reference.inputTree, screenshot: row.reference.screenshot },
          astylar: { inputTree: row.astylar.inputTree, screenshot: row.astylar.screenshot } },
        observations: { reference: row.reference.observations, astylar: row.astylar.observations },
        remaining: ['Intermediate paint and complete raw native hit ancestry are not established.',
          'Historical versus current runtime applicability and complete rendering remain unverified.'],
        boundary: 'Eight exact configured open click actions over retained application assets in Chrome156. Both triggers receive focus; candidate retains a popup while the reference endpoint has none. Native store.open alone is not visibility evidence. Not Android touch, original Chrome154 causality, equal-input core failure or whole-case acceptance. All other obligations preserve.',
      },
    } } };
  });
  assert.equal(changed, 8);
  const review = { ...parent, groups };
  assert.equal(hash(JSON.stringify(restoreTooltipOpen(review))), tooltipOpenPredecessor);
  return { review, sha256: hash(JSON.stringify(review)), cases: changed };
}
