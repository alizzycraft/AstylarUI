import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sourceAuditDefinitions as definitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { saveReviewProposal } from './audit-findings-store.mjs';
const hash = b => createHash('sha256').update(b).digest('hex'), receipt = file => ({ file, sha256: hash(fs.readFileSync(file)) });
const predecessorId = '4d8dd04ec0f56a6e28a851866a5d762a389c93bab551b1daed00e8b6c4b76887';
const predecessor = JSON.parse(fs.readFileSync(`artifacts/material-parity/working-audit/proposals/${predecessorId}.json`)).review;
assert.equal(hash(JSON.stringify(predecessor)), predecessorId); assert.equal(predecessor.groups.length, 188);
assert.equal(definitions.length, 180); assert.deepEqual(predecessor.groups.slice(0, 180), definitions);
const verifier = 'scripts/check-public-hidden-description.mjs', verification = 'artifacts/material-parity/public-hidden-description-verification-20261022.log';
assert.deepEqual(execFileSync(process.execPath, [verifier], { maxBuffer: 8000000 }), fs.readFileSync(verification));
const proof = JSON.parse(fs.readFileSync(verification)); assert.equal(proof.classification, 'confirmed-core-renderer-defect');
assert.equal(proof.negativeControlsRejected, 101); assert.equal(proof.verified.length, 2);
assert.deepEqual(proof.boundMethods, ['reconcile', 'reconcileElement', 'applyAttributes', 'semanticChildren', 'nativeId', 'nativeIdRefs']);
assert.equal(proof.verified.flatMap(r => r.failures).length, 12);
const bridge = 'src/lib/astylar-semantic-bridge.ts';
const publicDeclarations = ['examples/material-showcase/node_modules/astylarui/dist/lib/lib/index.d.ts',
  'examples/material-showcase/node_modules/astylarui/dist/lib/app/types/dom-element.d.ts'];
assert.match(fs.readFileSync(publicDeclarations[0], 'utf8'), /export type\s*\{\s*DOMElement(?:,|\s)/);
for (const field of ['hidden?: boolean;', 'ariaDescribedby?: string;']) assert.ok(fs.readFileSync(publicDeclarations[1], 'utf8').includes(field));
const evidenceFiles = [bridge, 'src/app/types/dom-element.ts', 'docs/compatibility/capabilities.json',
  'scripts/audit-public-hidden-description.mjs', verifier, verification, proof.canonicalComparator.file, proof.reusedHelpers.file,
  ...proof.methodBindings.map(r => r.file), ...publicDeclarations];
for (const run of proof.verified) {
  const directory = run.report.file.slice(0, run.report.file.lastIndexOf('/'));
  evidenceFiles.push(run.report.file, `${directory}/provenance.json`, `${directory}/producer.mjs`, `${directory}/audit.js`, `${directory}/failure.json`, ...run.observations.map(o => o.file));
}
const finding = {
  id: 'core-hidden-referenced-description-targets-pruned', file: bridge,
  pattern: '\\.filter\\(\\(element\\) => !element\\.hidden\\)|if \\(child\\.hidden\\) continue;',
  introducedBy: 'Current hidden-root/child pruning confirmed;first-bad hidden-reference source revision/runtime not established.',
  classification: 'confirmed-core-renderer-defect', owner: 'Core semantic graph reconciliation:retention of hidden native ID-reference targets versus ordinary AX exposure',
  focusedProof: 'node scripts/check-public-hidden-description.mjs',
  publicReproduction: { captureCommand: 'node scripts/audit-public-hidden-description.mjs artifacts/material-parity/NEW-UNUSED-DIRECTORY',
    verification: receipt(verification), verifiedRuns: proof.verified.map(r => r.report), packageEntry: 'astylarui',
    authoredInputsEqualPerPair: true, applicationPlugins: false, publicDeclarations: publicDeclarations.map(receipt) },
  observation: { component: 'core semantic bridge', property: 'aria-describedby to hidden target/root/ancestor',
    states: ['visible-description', 'hidden-child-target', 'hidden-root-target', 'hidden-ancestor'], dpr: [1, 2], independentRuns: 2, captures: 32,
    reference: 'All16 descriptions remain Help info;hidden text not ordinarily exposed',
    astylar: 'Visible-description controls pass;all12 hidden candidate cases lose description and DOM target while reference attribute remains',
    stage: 'Complete hidden authored identity graph reaches reconciliation;root filter/child skip precedes native target creation' },
  justification: 'Two independent package-root equal-input runs retain actual AX,DOM target presence,original SiteData and public semantic identity/reconciliation counts. Native reference creates hidden DOM nodes rather than eliding them. Both sides suppress ordinary hidden text;only candidate loses the referenced target and description. Six complete owning methods including child enumeration and ID mapping bind current TS,installed JS and both actual bundles through the existing guarded compiler comparator. The bridge elides hidden roots/children instead of preserving native hidden reference semantics;visible-description controls and101 mutations distinguish unsupported/dropped attributes from target pruning. This is separate from CSS-hidden AX overexposure and from Material fixtures that omit the association entirely.',
  evidence: [...new Set(evidenceFiles)].map(receipt),
  recommendation: 'At the general semantic reconciliation boundary,preserve native hidden ID-reference graph semantics while keeping hidden content out of ordinary exposure,focus and visual layout. Do not remove hiding,copy help text into a different ARIA field,add fixture-specific IDs,modify Material authoring to mask the defect or change coordinate/paint calculations. Add update/removal and other-reference controls before broadening support.',
  boundary: 'Static supported hidden plus ariaDescribedby atDPR1/2 only. Not CSS hiding,ariaLabelledby or all relationships,updates/inherited overrides,AT behavior,Material tooltip/sort causality,paint,current whole rendering or case closure. Historical first-bad execution remains uncertain.'
};
assert.ok(new RegExp(finding.pattern).test(fs.readFileSync(bridge, 'utf8'))); assert.ok(!predecessor.groups.some(r => r.id === finding.id));
const review = { kind: 'material-source-finding-review', registrationPending: true, predecessor: { count: 188, sha256: predecessorId }, groups: [...predecessor.groups, finding] };
assert.deepEqual(review.groups.slice(0, -1), predecessor.groups);
const saved = saveReviewProposal('artifacts/material-parity/working-audit', review);
console.log(JSON.stringify({ producer: receipt('scripts/review-hidden-description-inputs.mjs'), saved, verification: receipt(verification),
  complete188PredecessorPreserved: true, independentPublicRuns: 2, observedFailures: 12,
  registrationPending: true, canonicalPublication: false, renderingAccepted: false }));
