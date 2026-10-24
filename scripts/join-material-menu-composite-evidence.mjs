import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';
import { dividerOwnerFrameReview } from '../tests/material-parity/divider-owner-frame-review-source.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const name = 'supplementaryMenuCompositeBehavior';
export function restoreMenuCompositeEvidence(review) {
  return { ...review, groups: review.groups.map(group => {
    if (group.family !== 'menu') return group;
    const activation = { ...group.obligations.authoredActivation }; delete activation[name];
    return { ...group, obligations: { ...group.obligations, authoredActivation: activation } };
  }) };
}
export function joinMenuCompositeEvidence(predecessor, read = readFileSync) {
  assert.equal(hash(JSON.stringify(predecessor)), dividerOwnerFrameReview);
  const finding = sourceAuditDefinitions.find(row => row.id === 'fixture-menu-item-dismissal-focus-navigation-and-typeahead-omitted');
  assert.equal(finding.classification, 'application-plugin-authoring-defect'); assert.equal(finding.evidence.length, 4);
  const reports = finding.evidence.map(receipt => {
    const bytes = read(receipt.file); assert.equal(hash(bytes), receipt.sha256);
    return { receipt, data: JSON.parse(bytes) };
  });
  assert.deepEqual(reports.map(report => report.data.results.length), [2, 14, 16, 16]);
  const witness = (file, sha256) => {
    const bytes = read(file); assert.equal(hash(bytes), sha256);
    return { receipt: { file, sha256 }, data: JSON.parse(bytes.toString('utf16le').replace(/^\ufeff/, '')) };
  };
  const supplementary = witness('artifacts/material-parity/menu-retained-theme-input-witnesses-20261024.log',
    '539191d820a8f4d159089810129f738874cacd6e4ff9ec335397cfedf9ecf163');
  const configured = witness('artifacts/material-parity/menu-configured-theme-input-witnesses-20261024.log',
    '3a3103a0e5fcde7c3f74805ec88e6b7581f29fb250dd52b1845d094301ec4cf9');
  assert.equal(supplementary.data.authenticatedTrees, 400); assert.equal(supplementary.data.mismatchCount, 0);
  assert.equal(configured.data.configuredCases, 82); assert.equal(configured.data.authenticatedTrees, 164);
  assert.equal(configured.data.mismatchCount, 0);
  assert.deepEqual(supplementary.data.reports.map(row => ({ file: row.file, sha256: row.sha256 })), finding.evidence);
  const states = [
    ['opened', 'item-held', 'item-clicked', 'reset-outside', 'reopened', 'arrow-down', 'escape'],
    ['navigation-open', 'navigation-ArrowUp', 'navigation-Home', 'navigation-End', 'navigation-r', 'tab-open', 'tab', 'enter-open', 'enter', 'space-open', 'space'],
    ['enter-item-ready', 'enter-item', 'space-item-ready', 'space-item', 'typeahead-ready', 'typeahead-immediate', 'typeahead-delayed'],
  ];
  const paired = (report, profile, dpr, expected) => {
    const rows = report.data.results.filter(row => row.profile === profile && row.viewport.width === 1440 &&
      row.viewport.height === 1000 && row.viewport.deviceScaleFactor === dpr);
    assert.equal(rows.length, 2); assert.deepEqual(rows.map(row => row.mode).sort(), ['astylar', 'reference']);
    return Object.fromEntries(rows.map(row => {
      assert.deepEqual(row.boundaries.map(boundary => boundary.state), expected);
      return [row.mode, row.boundaries.map(boundary => {
        for (const receipt of [boundary.inputTree, boundary.screenshot]) {
          assert.equal(typeof receipt.file, 'string'); assert.match(receipt.sha256, /^[a-f0-9]{64}$/);
        }
        return { state: boundary.state, observation: boundary.observation,
          evidence: { inputTree: boundary.inputTree, screenshot: boundary.screenshot } };
      })];
    }));
  };
  const producer = { file: 'scripts/join-material-menu-composite-evidence.mjs', sha256: hash(read('scripts/join-material-menu-composite-evidence.mjs')) };
  let cases = 0;
  const groups = predecessor.groups.map(group => {
    const match = /^interaction:menu@([^/]+)\/desktop-dpr([12])\/open-hover-content$/.exec(group.case);
    if (!match) return group;
    const [, profile, rawDpr] = match, dpr = Number(rawDpr);
    const activation = group.obligations.authoredActivation;
    assert.equal(activation[name], undefined);
    assert.equal(activation.supplementaryMenuActions.physicalContext, JSON.stringify([profile, 1440, 1000, dpr]));
    const action = profile === 'light' && dpr === 1 ? reports[0] : reports[1];
    assert.deepEqual(activation.supplementaryMenuActions.evidence.report, action.receipt);
    const child = { disposition: 'inspected-supplementary-composite-authoring-failure',
      physicalContext: { profile, width: 1440, height: 1000, deviceScaleFactor: dpr },
      sourceFinding: finding.id, classification: finding.classification, owner: finding.owner,
      firstDivergence: 'Application opening focus,menu navigation,item dismissal and typeahead routing differ before renderer attribution.',
      conclusion: finding.justification,
      observations: { pointerAndEscape: paired(action, profile, dpr, states[0]),
        navigation: paired(reports[2], profile, dpr, states[1]), matchedItemKeys: paired(reports[3], profile, dpr, states[2]) },
      themeInputWitnesses: { fields: ['frame surface', 'frame ink', 'frame font size'],
        supplementaryTrees: 400, configuredTrees: 164, mismatches: 0 },
      evidence: { actions: action.receipt, navigation: reports[2].receipt, matchedItemKeys: reports[3].receipt,
        captureManifests: [action.data.capture.checkpointManifest, reports[2].data.capture.checkpointManifest, reports[3].data.capture.checkpointManifest],
        supplementaryInputs: supplementary.receipt, configuredInputs: configured.receipt, producer },
      boundary: 'Existing supplementary real pointer/key sequences at matching recorded frame inputs and physical context,NOT configured open-hover-content action replay. Three frame witnesses do not prove full theme/input equivalence. Raw original event ordering,other/mobile actions,paint,ownership,current runtime and every parent remaining task stay open.' };
    cases++;
    return { ...group, obligations: { ...group.obligations, authoredActivation: { ...activation, [name]: child } } };
  });
  assert.equal(cases, 8);
  const review = { ...predecessor, groups };
  assert.equal(hash(JSON.stringify(restoreMenuCompositeEvidence(review))), dividerOwnerFrameReview);
  return { review, sha256: hash(JSON.stringify(review)), cases, addedChildren: 8 };
}
