import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createDividerConsumerReviewReader } from './join-material-divider-consumer-inputs.mjs';

const sourceTransitions = [
  ['tests/material-parity/capture-availability-registration.mjs', 'ab859337f2585e35662ea2ece83228beabe7e4af3a00151d61b0389bd1d00d13', 'c7f8b931ab00939e6c65b4adca555a02e4622d4be9f25dbe2546797ecfdd3254'],
  ['scripts/check-divider-omitted-owner-consumers.mjs', 'b08c882e548ad27d76e39379ed64a15096352889d1389620a30cd818b6b9a277', 'cf989605fc7c727111431c0b2deb1dc3e733b39c07a4751aaf19c798625c2bcd'],
  ['tests/material-parity/snackbar-position-observation.spec.mjs', '69af83212fc53b07b6326cf388250f8c35263b8ffb67ed456422439b8aa00956', '0fb3a5d539573fcc0dfc6e2f46069ff04630545109e988b7016ed6376202872b'],
  ['tests/material-parity/input-equivalence-policy.mjs', '43e758150e13d5da4876127b7ca6755c0c66957b092499587498c66bef1a4d52', '8f1acb6af64b5cfdcddba911a4b3ddf61e241edfea74eec241d2276617fe1ea3'],
  ['tests/material-parity/input-equivalence-audit.mjs', 'cfed52bc5d431d49709955afc990b69cfcc04a11e26d0ddc8d3748d9a28a4c51', '1bce9f85f8ea18be40dab632667a84f3ca1ed324a45a1606ff738f4a0e8dfd54'],
];

export function createTriggerPaintHistoricalRead({ root = process.cwd(), read = fs.readFileSync } = {}) {
  const transitions = new Map(sourceTransitions.map(row => [path.resolve(root, row[0]), row]));
  const cache = new Map();
  return (name, options) => {
    const absolute = path.resolve(root, name), transition = transitions.get(absolute);
    const selectionKind = absolute === path.resolve(root, 'scripts/run-material-input-audit.mjs') ? 'runner'
      : absolute === path.resolve(root, 'scripts/export-material-input-audit-current-ancestry.mjs') ? 'launcher' : undefined;
    if (selectionKind) {
      const source = read(absolute).toString().replaceAll('\r\n', '\n');
      const marker = selectionKind === 'runner' ? 'const triggerPaintHistoricalRead = ' : 'const triggerPaint = ';
      if (source.includes(marker)) {
        const expression = selectionKind === 'runner' ? /const applicability=options.caseObligationReviewSha256==='([a-f0-9]{64})'/
          : /if \(triggerPaint\) inputs\['case-obligation-review'\] = 'artifacts\/material-parity\/working-audit\/proposals\/([a-f0-9]{64})\.json'/;
        const match = source.match(expression); assert.ok(match, 'Exact trigger-paint selection required');
        const bytes = Buffer.from(restoreTriggerPaintSelection(source, selectionKind, match[1]));
        const encoding = typeof options === 'string' ? options : options?.encoding;
        return encoding ? bytes.toString(encoding) : bytes;
      }
    }
    if (!transition) return read(absolute, options);
    const current = read(absolute), normalized = hash(current.toString().replaceAll('\r\n', '\n'));
    assert.ok([transition[1], transition[2]].includes(normalized), `Unknown trigger-paint source generation: ${transition[0]}`);
    if (!cache.has(absolute)) {
      const prior = execFileSync('git', ['show', `c8095ca7:${transition[0]}`], { cwd: root, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(hash(prior), transition[2], 'Exact accepted Git predecessor required'); cache.set(absolute, prior);
    }
    const bytes = cache.get(absolute), encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  };
}

export function createTriggerPaintReviewReader({ root = process.cwd(), read = fs.readFileSync, reviewSha256 } = {}) {
  const historicalRead = createTriggerPaintHistoricalRead({ root, read });
  const indexFile = path.resolve(root, 'artifacts/material-parity/working-audit/695dea7b4cf15915138ac671c75edf2655587db4719c3be9fe7724b402ed6249/index.json');
  const indexBytes = read(indexFile);
  assert.equal(hash(indexBytes), '23dc19f652886ea2c02b2a3e8aedb6074beb2046837223fbd222f36cbb3ea045');
  const inspection = JSON.parse(indexBytes).metadata.coverage.inspectionEvidence;
  const parent = { kind: 'case-obligation-coverage-extension', status: 'proposal-not-canonical',
    ...(inspection.schemaVersion === 2 ? { inspectionSchemaVersion: 2 } : {}), scope: inspection.scope, groups: inspection.cases };
  assert.equal(hash(JSON.stringify(parent)), 'b49ef7e0b1470909f1b41f306642c946f4ccec3afda6b3fadedf31d9fd170d21');
  const joined = joinRetainedTriggerPaintInputs(parent.groups, name => read(path.resolve(root, name)));
  const prior = createDividerConsumerReviewReader({ root, read: historicalRead, reviewSha256: inspection.reviewSha256 });
  const review = { ...parent, groups: joined.cases }, sha256 = hash(JSON.stringify(review));
  if (reviewSha256 !== undefined) assert.equal(reviewSha256, sha256, 'Exact trigger-paint successor required');
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256, review }));
  const expected = new Map(inspection.evidenceFingerprints.map(r => [path.resolve(root, r.file), r.sha256]));
  for (const row of joined.cases) for (const child of [row.obligations.inputStyleStructure[clipKey], row.obligations.localPaint[paintKey]].filter(Boolean))
    for (const receipt of child.evidence) {
      const absolute = path.resolve(root, receipt.file);
      if (expected.has(absolute)) assert.equal(expected.get(absolute), receipt.sha256, 'Never replace a historical dependency');
      expected.set(absolute, receipt.sha256);
    }
  return { file, sha256, changed: joined.changed, read(name, options) {
    const absolute = path.resolve(root, name), encoding = typeof options === 'string' ? options : options?.encoding;
    let selected;
    if (absolute === file) selected = bytes;
    else {
      const sha = expected.get(absolute), current = sha ? read(absolute) : undefined;
      selected = sha && hash(current) === sha ? current : prior.read(absolute);
      if (sha) assert.equal(hash(selected), sha, `Unreconciled trigger-paint dependency: ${name}`);
    }
    return encoding ? selected.toString(encoding) : Buffer.from(selected);
  }, sourceApplicability: { mode: 'pending-trigger-paint-case-join', predecessorReview: inspection.reviewSha256,
    acceptedIndexSha256: hash(indexBytes), predecessorApplicability: prior.sourceApplicability,
    boundary: 'Exact historical parent plus bounded evidence children;not current source equivalence,canonical publication or inspection closure.' } };
}

const hash = value => createHash('sha256').update(value).digest('hex');
const selectionPredecessors = {
  runner: '2ad71026b5377e36c479a8d67d0b6fd4bc65377d080d4ce7283e3d06fefb566c',
  launcher: '9adaeef25a49792ee453d56c7f1c0d2bcf817ba3322e69c097fff18209606a96',
};
function selectionEdits(kind, review) {
  assert.match(review, /^[a-f0-9]{64}$/);
  if (kind === 'launcher') return [
    ["const rawRequested = process.argv.slice(2);", `const rawRequested = process.argv.slice(2);\nconst triggerPaint = rawRequested.includes('--trigger-paint');\nassert.ok(!triggerPaint || rawRequested.every(argument => ['--trigger-paint', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');`],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--trigger-paint').filter("],
    ['|--divider-consumer-inputs]', '|--divider-consumer-inputs|--trigger-paint]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (triggerPaint) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${review}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['|| dividerConsumerInputs)', '|| dividerConsumerInputs || triggerPaint)'],
    ["if (requested.includes('--dry-run'))", `if (triggerPaint) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${review}';\nif (requested.includes('--dry-run'))`],
  ];
  assert.equal(kind, 'runner');
  return [
    ["import { createDividerConsumerReviewReader } from './join-material-divider-consumer-inputs.mjs';", "import { createDividerConsumerReviewReader } from './join-material-divider-consumer-inputs.mjs';\nimport { createTriggerPaintReviewReader, createTriggerPaintHistoricalRead } from './join-material-trigger-paint-inputs.mjs';"],
    ['const dividerConsumerEvidenceRead = createDividerConsumerRegistrationHistoricalRead({root,read:auditReadFileSync});', 'const triggerPaintHistoricalRead = createTriggerPaintHistoricalRead({root,read:auditReadFileSync});\n    const dividerConsumerEvidenceRead = createDividerConsumerRegistrationHistoricalRead({root,read:triggerPaintHistoricalRead});'],
    ['const applicability=dividerConsumerReaderFactory?.({root,read:captureAvailabilityEvidenceRead,reviewSha256:options.caseObligationReviewSha256});', `const applicability=options.caseObligationReviewSha256==='${review}'\n      ? createTriggerPaintReviewReader({root,read:auditReadFileSync,reviewSha256:options.caseObligationReviewSha256})\n      : dividerConsumerReaderFactory?.({root,read:captureAvailabilityEvidenceRead,reviewSha256:options.caseObligationReviewSha256});`],
    ["diagnosticRead: (options.caseObligationReviewSha256===captureAvailabilityReview", `diagnosticRead: options.caseObligationReviewSha256==='${review}'\n      ? createCaptureAvailabilityHistoricalRead({root,read:createTriggerPaintHistoricalRead({root,read:auditReadFileSync})})\n      : (options.caseObligationReviewSha256===captureAvailabilityReview`],
  ];
}
export function prepareTriggerPaintSelection(bytes, kind, review) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(hash(source), selectionPredecessors[kind], 'Exact selection predecessor required');
  for (const [before, after] of selectionEdits(kind, review)) {
    assert.equal(source.split(before).length, 2); source = source.replace(before, after);
  }
  return source;
}
export function restoreTriggerPaintSelection(bytes, kind, review) {
  let source = bytes.toString().replaceAll('\r\n', '\n');
  if (hash(source) === selectionPredecessors[kind]) return source;
  for (const [before, after] of selectionEdits(kind, review).toReversed()) {
    assert.equal(source.split(after).length, 2); source = source.replace(after, before);
  }
  assert.equal(hash(source), selectionPredecessors[kind], 'Unknown selection changes'); return source;
}
export const triggerPaintPredecessor = '38aca39a69052334314e3584d33682195702b9690b024c5150fbd22c338e8ee1';
const clipKey = 'retainedClippingCallerRouting', paintKey = 'retainedTriggerStatePaint';
const base = 'artifacts/material-parity/';
const clipReceipt = { file: base + 'divider-clipping-caller-routing-ancestry-bound-20261102.log',
  sha256: 'd22da5998550d9f33c89c9139efaa240bcd85900f974b9937515597688861475' };
const paintReceipt = { file: base + 'snackbar-paint-classification-array-integration-20261102.log',
  sha256: '271927651863a32c1a4ca76b3ec631644de2f5a0cd868e3100fac4ca0203e93c' };
const producerSnapshot = { file: base + 'trigger-paint-clipping-producer-20261102.mjs',
  sha256: 'b08c882e548ad27d76e39379ed64a15096352889d1389620a30cd818b6b9a277' };
const decode = bytes => (bytes[0] === 255 ? bytes.toString('utf16le') : bytes.toString()).replace(/^\ufeff/, '');

export function restoreRetainedTriggerPaintInputs(cases) {
  return cases.map(row => {
    const input = row.obligations.inputStyleStructure, paint = row.obligations.localPaint;
    if (!input[clipKey] && !paint[paintKey]) return row;
    const obligations = { ...row.obligations };
    if (input[clipKey]) {
      const next = { ...input }; delete next[clipKey]; obligations.inputStyleStructure = next;
    }
    if (paint[paintKey]) {
      const next = { ...paint, disposition: paint[paintKey].parentDisposition };
      delete next[paintKey]; obligations.localPaint = next;
    }
    return { ...row, obligations };
  });
}

export function joinRetainedTriggerPaintInputs(cases, read = fs.readFileSync) {
  assert.equal(hash(JSON.stringify(cases)), triggerPaintPredecessor, 'Exact accepted695dea7b parent cases required');
  assert.equal(cases.length, 2311);
  const receipts = new Map();
  const bind = receipt => {
    assert.equal(hash(read(receipt.file)), receipt.sha256, receipt.file);
    if (receipts.has(receipt.file)) assert.equal(receipts.get(receipt.file), receipt.sha256, 'Conflicting source generation');
    receipts.set(receipt.file, receipt.sha256); return read(receipt.file);
  };
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.file === 'string' && typeof value.sha256 === 'string') bind(value);
    for (const child of Object.values(value)) collect(child);
  };
  const ownSources = ['scripts/join-material-trigger-paint-inputs.mjs', 'tests/material-parity/snackbar-position-observation.spec.mjs']
    .map(file => ({ file, sha256: hash(read(file)) }));
  ownSources.forEach(bind);
  const clipText = decode(bind(clipReceipt)), clip = JSON.parse(clipText.slice(clipText.indexOf('{')));
  assert.equal(clip.producer.file, 'scripts/check-divider-omitted-owner-consumers.mjs');
  assert.equal(clip.producer.sha256, producerSnapshot.sha256); bind(producerSnapshot); bind(clip.sourceMap);
  const selectedSources = clip.sources.filter(r => ['src/app/services/dom/elements/overflow-clip.service.ts',
    'src/app/services/dom/elements/element-creation.service.ts', 'src/lib/astylar-scroll-runtime.ts'].includes(r.current.file));
  assert.equal(new Set(selectedSources.map(r => r.current.file)).size, 3);
  selectedSources.forEach(r => bind(r.current));
  assert.equal(clip.ownClippingInputs.observations.length, 120);
  assert.equal(clip.ownClippingInputs.overflowEntryControls, 18);
  assert.deepEqual(Object.fromEntries(Object.entries(clip.clippingCallRouting).filter(([key]) => key !== 'treeReceipts' && key !== 'conclusion' && key !== 'boundary')),
    { clippingCallerStyles: 432, clippingCallerMissingStyle: 432, clippingReconcileContexts: 48, clippingReconcilePositiveControls: 96 });
  const clipEvidence = [...receipts].map(([file, sha256]) => ({ file, sha256 }));

  const paintText = decode(bind(paintReceipt));
  assert.match(paintText, /# tests 5\r?\n# suites 0\r?\n# pass 5\r?\n# fail 0/);
  // Decode Node TAP's escaped hash markers,not CSS values or audit differences.
  const records = paintText.split(/\r?\n/).filter(line => line.startsWith('# {'))
    .map(line => JSON.parse(line.slice(2).replaceAll('\\#', '#')));
  const one = predicate => { const rows = records.filter(predicate); assert.equal(rows.length, 1); return rows[0]; };
  const expired = one(r => r.observations?.length === 2 && r.observations.every(o => Object.hasOwn(o, 'outsideTrigger')));
  const focus = one(r => r.case === 'interaction:snack-bar@light/desktop-dpr1/focus' && r.nativeFocus);
  const states = one(r => r.observations?.map(o => o.state).join(',') === 'hover,held');
  assert.ok(expired.observations.every(o => o.outsideTrigger === 0 && o.rejectedPixelControl === 1));
  assert.equal(focus.nativeFocus.whiteOpacity, '0.12'); assert.equal(focus.candidateFocusRules.length, 2);
  assert.equal(focus.rejectedMeasuredBranchControl, 1); assert.equal(states.imageBeforeReleaseBeforeEvents, true);
  collect(expired); collect(focus); collect(states);
  bind({ file: base + 'current-full-20261005/checkpoint/aad85d65f08c81ab7b919738039cad8032be30219c31d907e50a1cf3541e72bc.json',
    sha256: 'af0cc215d1602569193b84ee4255c4a4fcda1e79ccc6578698ae818935537749' });
  const paintEvidence = [...receipts].filter(([file]) => !clipEvidence.some(r => r.file === file) || ownSources.some(r => r.file === file))
    .map(([file, sha256]) => ({ file, sha256 }));
  const stateRecords = new Map([['auto-dismiss', expired], ['focus', focus], ...states.observations.map(r => [r.state, r])]);
  const changed = { divider: 0, snackbar: 0 };
  const joined = cases.map(row => {
    assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
    if (row.family === 'divider') {
      const input = row.obligations.inputStyleStructure; assert.equal(input[clipKey], undefined);
      const pair = row.evidence.pairedTrees;
      const owners = clip.ownClippingInputs.observations.filter(r => r.referenceTree.file === pair.reference.file && r.referenceTree.sha256 === pair.reference.sha256);
      assert.deepEqual(owners.map(r => r.id), ['page', 'eyebrow', 'title', 'divider-above-row', 'divider-below-row']);
      assert.equal(clip.clippingCallRouting.treeReceipts.filter(r => r.file === pair.astylar.file && r.sha256 === pair.astylar.sha256).length, 1);
      collect(pair); changed.divider++;
      return { ...row, obligations: { ...row.obligations, inputStyleStructure: { ...input, [clipKey]: {
        disposition: 'inspected-bounded-source-routing', observations: owners,
        sharedControlCounts: { entry: 18, callerStyle: 432, missingStyle: 432, reconcileContexts: 48, positiveReconcile: 96 },
        producerSnapshot, evidence: clipEvidence,
        boundary: 'Shared captured/current source-method controls with stubbed resolver/layout/paint;not432 independent controls per case. Own/recorded-tree entry selection only,not original runtime calls,outside-tree ancestors,clip shader state,anonymous layout,current rendering or case closure.',
      } } } };
    }
    const prefix = 'interaction:snack-bar@light/desktop-dpr1/';
    if (!row.case.startsWith(prefix) || !stateRecords.has(row.case.slice(prefix.length))) return row;
    const paint = row.obligations.localPaint; assert.equal(paint[paintKey], undefined);
    assert.equal(paint.disposition, 'evidence-join-pending'); collect(row.evidence.pairedTrees); changed.snackbar++;
    const state = row.case.slice(prefix.length);
    return { ...row, obligations: { ...row.obligations, localPaint: { ...paint, disposition: 'partial', [paintKey]: {
      disposition: 'inspected-bounded-original-state-paint', parentDisposition: paint.disposition, state,
      observation: stateRecords.get(state), evidence: paintEvidence,
      sourceFindingIds: state === 'focus' ? ['fixture-filled-button-programmatic-focus-layer-omitted', 'audit-state-paint-unmeasured-family-returns-success'] : [],
      remaining: ['Full corresponding glyph/edge/ripple/animation paint and equivalent input composition',
        'Original timed/action causality beyond endpoint/recipe evidence and complete current-code applicability'],
      boundary: 'One original light/DPR1 case per state. Per-renderer expired residual,one focus input/fill mismatch or opaque hover/held samples only;not complete paint,continuous timing,current rendering or whole-case inspection closure. Post-release event lists do not timestamp held images.',
    } } } };
  });
  assert.deepEqual(changed, { divider: 24, snackbar: 4 });
  assert.equal(hash(JSON.stringify(restoreRetainedTriggerPaintInputs(joined))), triggerPaintPredecessor);
  return { cases: joined, changed, sha256: hash(JSON.stringify(joined)), canonicalPublished: false };
}
