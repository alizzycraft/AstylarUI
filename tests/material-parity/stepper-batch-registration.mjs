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
export function prepareStepperBatchRegistry(bytes, kind) {
  assert.ok(Object.hasOwn(prior, kind)); let source = normalize(bytes); assert.equal(hash(source), prior[kind]);
  for (const [anchor, extra] of additions[kind]) source = once(source, anchor, anchor + extra);
  return source;
}
export function restoreStepperBatchRegistry(bytes, kind) {
  assert.ok(Object.hasOwn(prior, kind)); let source = normalize(bytes);
  for (const [anchor, extra] of additions[kind].toReversed()) source = once(source, anchor + extra, anchor);
  assert.equal(hash(source), prior[kind], 'Complete pre-Stepper registry must recover');
  return source;
}

export function restoreStepperBatchRegistryIfPresent(bytes, kind) {
  assert.ok(Object.hasOwn(prior, kind));
  const marker = kind === 'policy' ? stepperLabelWrapperFinding.id : '"tests/material-parity/stepper-batch-registration.mjs",';
  const source = normalize(bytes);
  return source.includes(marker) ? restoreStepperBatchRegistry(source, kind) : source;
}
export function createStepperBatchPriorRead({ root, read }) {
  const files = new Map(Object.entries({
    'tests/material-parity/input-equivalence-policy.mjs': 'policy',
    'tests/material-parity/input-equivalence-audit.mjs': 'producer',
  }).map(([file, kind]) => [path.resolve(root, file), kind]));
  return (name, options) => {
    const kind = files.get(path.resolve(root, name));
    if (!kind) return read(name, options);
    const source = restoreStepperBatchRegistryIfPresent(read(name), kind);
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
