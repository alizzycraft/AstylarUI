import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { saveReviewProposal } from './audit-findings-store.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Existing proposal mechanism; never edits the canonical registry or package.
execFileSync(process.execPath, ['scripts/check-public-native-checkable-value.mjs'], { stdio: 'inherit' });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const receipt = file => ({ file, sha256: hash(readFileSync(file)) });
const id = 'core-native-checkable-form-value-synthesizes-visible-label';
assert.equal(sourceAuditDefinitions.length, 171, 'Review the predecessor before extending it');
assert.equal(sourceAuditDefinitions.some(row => row.id === id), false);
const file = 'src/app/services/dom/input/checkbox.manager.ts';
const pattern = "const textContent = input\\.value \\|\\| 'Option';";
assert.equal([...readFileSync(file, 'utf8').matchAll(new RegExp(pattern, 'g'))].length, 1);
const evidence = [file, 'scripts/audit-public-native-checkable-value.mjs',
  'scripts/check-public-native-checkable-value.mjs', 'scripts/review-native-checkable-value.mjs',
  'examples/material-showcase/node_modules/astylarui/dist/lib/app/services/dom/input/checkbox.manager.js',
  'artifacts/material-parity/native-checkable-value-independent-20261021.log'];
for (const run of ['public-native-checkable-value-20261021', 'public-native-checkable-value-repeat-20261021']) {
  for (const name of ['latest-report.json', 'provenance.json', 'audit.js', 'producer.mjs', 'failure.json'])
    evidence.push(`artifacts/material-parity/${run}/${name}`);
}
const finding = {
  id, introducedBy: 'Present in current source and both authenticated installed-package captures; introduction revision and compensation motive not established',
  file, pattern, classification: 'confirmed-core-renderer-defect',
  owner: 'CheckboxManager native checkbox/radio label construction before text rasterization and projection',
  focusedProof: 'node scripts/check-public-native-checkable-value.mjs',
  observation: {
    component: ['checkbox', 'radio'], state: 'unchecked,enabled,appearance:none,no textContent',
    property: 'value', reference: 'Form value changes no rendered pixels',
    astylar: 'value:VALUEONLY creates a visible label_target mesh and text pixels',
    stage: 'createCheckbox/createRadioButton request createLabelMesh;createLabelMesh substitutes input.value for visible text',
  },
  justification: 'Two package-root equal-input runs independently verify16 captures each atDPR1/2. Changing only omitted value to VALUEONLY changes zero reference pixels but580/1903 candidate pixels for both kinds in each run. Current TS,installed JS and both actual bundles bind all three complete owning methods after explicit compiler-only transformations. Label metadata corroborates the pixels;all2517 bundle dependencies per run authenticate. This is not a cursor,coordinate or text-measurement diagnosis and does not depend on replacing Material role-DIV authoring.',
  publicReproduction: {
    verificationCommand: 'node scripts/check-public-native-checkable-value.mjs',
    captureCommand: 'node scripts/audit-public-native-checkable-value.mjs --output=artifacts/material-parity/NEW-UNUSED-DIRECTORY',
    expectedCaptureExit: 1, runs: 2, capturesPerRun: 16, renderingFailuresPerRun: 4,
    semanticDriftControls: 4, currentRenderingAccepted: false,
  },
  evidence: evidence.map(receipt),
  recommendation: 'Separate native checkbox/radio form value from explicit associated label content at the core construction boundary. Preserve submitted value and label/AX contracts;then prove explicit label and no-label controls. Do not remove values or replace native controls with role-DIV composites to hide this defect.',
  boundary: 'Unchecked enabled minimal public inputs only. Does not establish full native/Material paint,checked/disabled behavior,AX associations,activation,event order,animation,all case closure or historical compensation motive. Existing button value-label typography instrumentation and showcase radio Space/structure findings remain distinct.',
};
const review = { kind: 'material-source-finding-review', registrationPending: true,
  predecessor: { count: sourceAuditDefinitions.length, sha256: hash(JSON.stringify(sourceAuditDefinitions)) },
  groups: [...sourceAuditDefinitions, finding] };
assert.deepEqual(review.groups.slice(0, -1), sourceAuditDefinitions);
assert.equal(new Set(review.groups.map(row => row.id)).size, review.groups.length);
console.log(JSON.stringify(saveReviewProposal('artifacts/material-parity/working-audit', review)));
