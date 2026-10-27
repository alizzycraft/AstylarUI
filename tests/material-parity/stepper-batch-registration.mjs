// Staged only: live historical readers must be reconciled before installation.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { stepperLabelWrapperFinding } from './stepper-label-wrapper-finding.mjs';
import { createChipsAlternateReviewReader } from '../../scripts/join-material-chips-alternate.mjs';
import { joinStepperLeave } from '../../scripts/join-material-stepper-leave.mjs';

export const stepperBatchReview = '863d24f5c259f5ae2cca0ffd9356dd9e16ff8d340aad850bd96ef488e71cca92';

const prior = {
  policy: '3a3b957723df7a7abef027b4317a4c3aaf7f73d47e36dbcef4e5929b0bd81cb0',
  producer: '7603854ee4bc7954aad29c97de2de347ac4f97f25eb36e056081c07e8e92f747',
  runner: 'ec5546ce4a6349aa3a66ea55aacfb51fa29f229c58bfc615272f73ead5f9e579',
  launcher: 'fa7bf7a9d0ac23aa542bac9e9f085f2a7abec60c2ba7ce8740d2e9df23e19833',
};
export const stepperBatchSources = [
  'scripts/audit-material-stepper-leave.mjs', 'scripts/join-material-stepper-leave.mjs',
  'tests/material-parity/stepper-leave-evidence.spec.mjs',
  'tests/material-parity/stepper-label-wrapper-inputs.spec.mjs',
  'tests/material-parity/stepper-label-wrapper-finding.mjs',
  'tests/material-parity/stepper-batch-registration.mjs',
  'tests/material-parity/stepper-batch-registration.spec.mjs',
  'artifacts/material-parity/stepper-leave-observed-20261027/latest-report.json',
];
export const stepperBatchProofs = [
  ['tests/material-parity/stepper-leave-evidence.spec.mjs', 'Stepper leave capture authenticates actual tab observations without promoting authored endpoints'],
  ['tests/material-parity/stepper-leave-evidence.spec.mjs', 'Stepper evidence rejects missing state, wrong identity, missing leave and forged event trust'],
  ['tests/material-parity/stepper-leave-evidence.spec.mjs', 'Stepper join changes only eight activation obligations and restores the accepted predecessor'],
  ['tests/material-parity/stepper-label-wrapper-inputs.spec.mjs', '68 retained Stepper cases omit native clipped minimum-width label wrappers'],
  ['tests/material-parity/stepper-label-wrapper-inputs.spec.mjs', 'pending Stepper wrapper finding preserves the complete registry and pins initial authoring'],
  ['tests/material-parity/stepper-batch-registration.spec.mjs', 'staged Stepper batch preserves complete source proof finding and plan inventories'],
  ['tests/material-parity/stepper-batch-registration.spec.mjs', 'staged Stepper selection preserves every older choice and rejects mixed supplements'],
];
const boundary = 'Retained Stepper wrapper input mismatch and supplementary actual tab transitions; not core clipping, historical hit reconstruction, current-library rendering or case closure.';
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const additions = {
  policy: [['export const sourceAuditDefinitions = Object.freeze([\n', `  Object.freeze(${JSON.stringify(stepperLabelWrapperFinding, null, 2)}),\n`]],
  producer: [
    ['function sourceFingerprints(root) {\n  const files = [\n', stepperBatchSources.map(file => `    ${JSON.stringify(file)},\n`).join('')],
    ['function focusedProofInventory(root) {\n  return [\n', stepperBatchProofs.map(([file, title]) =>
      `    proof(root, ${JSON.stringify(file)}, new RegExp(${JSON.stringify("test\\('" + escape(title) + "'")}), ${JSON.stringify(title)}, ${JSON.stringify(boundary)}),\n`).join('')],
    ['function implementationPlan() {\n  return [\n', `    ${JSON.stringify({ priority: 2.25, rootCause: stepperLabelWrapperFinding.owner, action: stepperLabelWrapperFinding.recommendation + ' ' + stepperLabelWrapperFinding.boundary })},\n`],
  ],
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = bytes => bytes.toString().replaceAll('\r\n', '\n');
const once = (source, before, after) => { assert.equal(source.split(before).length, 2); return source.replace(before, after); };
const sharedFile = 'tests/material-parity/chips-alternate-registration.mjs';
const sharedPrior = '6db59f93c845b8c419340a982a34555a8c50e7dc928d5419137d288e6822c420';
const sharedChanges = [
  ["import path from 'node:path';", "import path from 'node:path';\nimport {createStepperBatchPriorRead,restoreStepperBatchRegistryIfPresent} from './stepper-batch-registration.mjs';"],
  ['export function restoreChipsAlternateRegistrationIfPresent(bytes, kind) {', 'export function restoreChipsAlternateRegistrationIfPresent(bytes, kind) {\n  bytes = restoreStepperBatchRegistryIfPresent(bytes, kind);'],
  ['export function createChipsAlternatePriorRead({root, read}) {', 'export function createChipsAlternatePriorRead({root, read}) {\n  read = createStepperBatchPriorRead({root, read});'],
];
const sharedSpecFile = 'tests/material-parity/chips-alternate-registration.spec.mjs';
const sharedSpecPrior = 'b20c342b0c4eef865113da1dfa0d848d925e49646cae0a08e62b041d7ea2e497';
const sharedSpecChanges = [
  ["import ts from 'typescript';", "import ts from 'typescript';\nimport { createStepperBatchPriorRead } from './stepper-batch-registration.mjs';"],
  ["const read = file => readFileSync(file, 'utf8').replaceAll('\\r\\n', '\\n');", "const read = file => createStepperBatchPriorRead({root:process.cwd(),read:readFileSync})(file, 'utf8').replaceAll('\\r\\n', '\\n');"],
];
const sharedEntries = {
  [sharedFile]: { prior: sharedPrior, changes: sharedChanges },
  [sharedSpecFile]: { prior: sharedSpecPrior, changes: sharedSpecChanges },
  'tests/material-parity/public-email-selection.spec.mjs': {
    prior: '75fe04037daceb6e1f2c8319abac7b2fae6c86929f50f0444ea0cd763688457b',
    changes: [[
      "    const rawLive=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n');const live=kind==='producer'?restoreDividerMarginRegistry(rawLive):rawLive;raw[kind]=acceptedRead(file,'utf8');staged[kind]=prepare(raw[kind],kind,readFileSync);",
      "    const rawLive=readFileSync(file,'utf8').replaceAll('\\r\\n','\\n');const live=kind==='producer'?restoreDividerMarginRegistry(rawLive):restoreChipsAlternateRegistrationIfPresent(rawLive,kind);raw[kind]=acceptedRead(file,'utf8');staged[kind]=prepare(raw[kind],kind,readFileSync);",
    ]],
  },
};
export const stepperBatchSharedFiles = Object.freeze(Object.keys(sharedEntries));
export function prepareStepperBatchSharedSource(bytes, file = sharedFile) {
  assert.ok(Object.hasOwn(sharedEntries, file));
  const { prior: expected, changes } = sharedEntries[file];
  let source = normalize(bytes); assert.equal(hash(source), expected);
  for (const [before, after] of changes) source = once(source, '\n' + before, '\n' + after);
  return source;
}
export function restoreStepperBatchSharedSource(bytes, file = sharedFile) {
  assert.ok(Object.hasOwn(sharedEntries, file));
  const { prior: expected, changes } = sharedEntries[file];
  let source = normalize(bytes);
  if (!source.includes(changes.at(-1)[1])) return source;
  for (const [before, after] of changes.toReversed()) source = once(source, '\n' + after, '\n' + before);
  assert.equal(hash(source), expected, 'Complete pre-Stepper shared entry must recover');
  return source;
}
const selectionChanges = {
  runner: [
    ["import { createChipsAlternateReviewReader } from './join-material-chips-alternate.mjs';", "import { createChipsAlternateReviewReader } from './join-material-chips-alternate.mjs';\nimport { stepperBatchReview, createStepperBatchReviewReader } from '../tests/material-parity/stepper-batch-registration.mjs';"],
    ['const applicability=chipsAlternateReaderFactory?.', 'const stepperBatchReaderFactory = options.caseObligationReviewSha256===stepperBatchReview ? createStepperBatchReviewReader : chipsAlternateReaderFactory;\n    const applicability=stepperBatchReaderFactory?.'],
  ],
  launcher: [
    ["const chipsAlternate = rawRequested.includes('--chips-alternate');", "const stepperBatch = rawRequested.includes('--stepper-batch');\nassert.ok(!stepperBatch || rawRequested.every(argument => ['--stepper-batch', '--check', '--dry-run'].includes(argument)), 'Choose one case-review supplement');\nconst chipsAlternate = rawRequested.includes('--chips-alternate');"],
    ['const requested = rawRequested.filter(', "const requested = rawRequested.filter(argument => argument !== '--stepper-batch').filter("],
    ['|--chips-alternate]', '|--chips-alternate|--stepper-batch]'],
    ['for (const [name, relative] of Object.entries(inputs)) {', `if (stepperBatch) inputs['case-obligation-review'] = 'artifacts/material-parity/working-audit/proposals/${stepperBatchReview}.json';\nfor (const [name, relative] of Object.entries(inputs)) {`],
    ['focusSelection || chipsAlternate)', 'focusSelection || chipsAlternate || stepperBatch)'],
    ["if (requested.includes('--dry-run'))", `if (stepperBatch) args[args.findIndex(argument => argument.startsWith('--case-obligation-review-sha256='))] = '--case-obligation-review-sha256=${stepperBatchReview}';\nif (requested.includes('--dry-run'))`],
  ],
};
export function prepareStepperBatchSelection(bytes, kind) {
  assert.ok(Object.hasOwn(selectionChanges, kind));
  let source = normalize(bytes); assert.equal(hash(source), prior[kind]);
  for (const [before, after] of selectionChanges[kind]) source = once(source, before, after);
  return source;
}
export function restoreStepperBatchSelection(bytes, kind) {
  assert.ok(Object.hasOwn(selectionChanges, kind));
  let source = normalize(bytes);
  for (const [before, after] of selectionChanges[kind].toReversed()) source = once(source, after, before);
  assert.equal(hash(source), prior[kind], 'Complete pre-Stepper selection source must recover');
  return source;
}
export function prepareStepperBatchRegistry(bytes, kind) {
  assert.ok(Object.hasOwn(additions, kind)); let source = normalize(bytes); assert.equal(hash(source), prior[kind]);
  for (const [anchor, extra] of additions[kind]) source = once(source, anchor, anchor + extra);
  return source;
}
export function restoreStepperBatchRegistry(bytes, kind) {
  assert.ok(Object.hasOwn(additions, kind)); let source = normalize(bytes);
  for (const [anchor, extra] of additions[kind].toReversed()) source = once(source, anchor + extra, anchor);
  assert.equal(hash(source), prior[kind], 'Complete pre-Stepper registry must recover');
  return source;
}

export function restoreStepperBatchRegistryIfPresent(bytes, kind) {
  assert.ok(Object.hasOwn(prior, kind));
  const marker = { policy: stepperLabelWrapperFinding.id, producer: '"tests/material-parity/stepper-batch-registration.mjs",',
    runner: 'const stepperBatchReaderFactory = ', launcher: "const stepperBatch = rawRequested.includes('--stepper-batch');" }[kind];
  const source = normalize(bytes);
  return source.includes(marker) ? (Object.hasOwn(selectionChanges, kind) ? restoreStepperBatchSelection(source, kind) : restoreStepperBatchRegistry(source, kind)) : source;
}
export function createStepperBatchPriorRead({ root, read }) {
  const files = new Map(Object.entries({
    'tests/material-parity/input-equivalence-policy.mjs': 'policy',
    'tests/material-parity/input-equivalence-audit.mjs': 'producer',
    'scripts/run-material-input-audit.mjs': 'runner',
    'scripts/export-material-input-audit-current-ancestry.mjs': 'launcher',
  }).map(([file, kind]) => [path.resolve(root, file), kind]));
  return (name, options) => {
    const kind = files.get(path.resolve(root, name));
    const shared = stepperBatchSharedFiles.find(file => path.resolve(root, name) === path.resolve(root, file));
    if (!kind && !shared) return read(name, options);
    const source = shared ? restoreStepperBatchSharedSource(read(name), shared) : restoreStepperBatchRegistryIfPresent(read(name), kind);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? Buffer.from(source).toString(encoding) : Buffer.from(source);
  };
}
export function createStepperBatchReviewReader({ root, read }) {
  const prior = createChipsAlternateReviewReader({ root, read: createStepperBatchPriorRead({ root, read }) });
  const joined = joinStepperLeave(JSON.parse(prior.read(prior.file)).review, read);
  assert.equal(joined.sha256, stepperBatchReview);
  const file = path.resolve(root, `artifacts/material-parity/working-audit/proposals/${joined.sha256}.json`);
  const bytes = Buffer.from(JSON.stringify({ status: 'proposal-not-canonical', sha256: joined.sha256, review: joined.review }));
  return { ...joined, file, read(name, options) {
    if (path.resolve(root, name) !== file) return prior.read(name, options);
    const encoding = typeof options === 'string' ? options : options?.encoding;
    return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
  }, sourceApplicability: { mode: 'supplementary-stepper-leave-selection', predecessorApplicability: prior.sourceApplicability,
    boundary: 'Retained-build actual tab state and reported logical pointer targets only; original historical evidence and all final acceptance gates remain.' } };
}
