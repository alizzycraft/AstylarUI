import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const hash = b => createHash('sha256').update(b).digest('hex');
export const buttonToolbarParent = '24e522ce9dce5ffe2b6f38514a588d6bc621d6d8a9076d51433b9cc140ea5515';
const key = 'retainedButtonToolbarPaint';
const directory = 'artifacts/material-parity/';
export const buttonToolbarSourceDefinitions = [
  { id: 'core-transparent-background-hover-reset-omitted',
    file: 'src/app/services/dom/elements/element-interaction.service.ts',
    pattern: 'private applyElementMaterial\\(', classification: 'confirmed-core-renderer-defect',
    introducedBy: 'Current/installed/served selected methods agree;first introduction not established',
    owner: 'core interaction material transition/reset',
    focusedProof: 'tests/material-parity/toolbar-focus-layer-inputs.spec.mjs: public equal-input hover leave fails only for transparent keyword at DPR1 and DPR2',
    evidence: [{ file: directory + 'public-transparent-hover-20261103/latest-report.json', sha256: '3a7b5c323aec32eecc31f36bc6a2a8304c32d935de60b3485742547b4ff3b587' },
      { file: directory + 'toolbar-leave-material-accessor-corrected-20261103/latest-report.json', sha256: '70b1975262dcef39545e3e2df22eedf2574eb5ebde84565162db4d1b0d161600' }],
    justification: 'Public package-root identical CSS/SiteData hover/leave leaves opaque hover fill for transparent at DPR1/2;explicit alpha-zero rgba and opaque controls reset. Matched served toolbar material remains alpha1 after settled frames despite transparent resolved background. Complete parser,interaction caller/material and normal material methods agree under shared emit/formatting. Transparent parses to null;interaction material application lacks a null/transparent reset unlike normal application. Not original October5 causal attribution or full rendering acceptance.',
    recommendation: 'Fix general interaction material reset semantics;never replace fixture transparent with rgba or add Material-specific paint branches.',
    inputEquivalent: false, currentRenderingAccepted: false },
  { id: 'fixture-toolbar-action-focus-layer-omitted',
    file: 'examples/material-showcase/src/app/astylar.component.ts',
    pattern: "selector: '\\.toolbar-action:hover'", classification: 'application-plugin-authoring-defect',
    introducedBy: 'Retained focus trees and current source agree;first introduction not established',
    owner: 'showcase toolbar action focus-state authoring',
    focusedProof: 'tests/material-parity/toolbar-focus-layer-inputs.spec.mjs: toolbar text-button focus omits the native layer independently of filled-button scope',
    evidence: [{ file: directory + 'toolbar-retained-raster-coverage-20261103.log', sha256: '66f6e9df4bf476dc9ded3be4642e9b62478c26c005c8c4a2065840d82ea38660' }],
    justification: 'Eight exact toolbar focus trees retain active native programmatic-focus primary-color layer at .12 opacity while candidate is a transparent childless action with no focus selector. Eight leave controls have native layer0. This unfilled action is outside the prior56 filled-primary scope. First divergence is omitted supplied focus composition,not lost equivalent core paint.',
    recommendation: 'Restore equivalent focus composition through supported public owners;reduce any missing general capability rather than authoring sampled colors.',
    inputEquivalent: false, currentRenderingAccepted: false },
];

const policyParent = '43e758150e13d5da4876127b7ca6755c0c66957b092499587498c66bef1a4d52';
const policyAddition = buttonToolbarSourceDefinitions.map(d => `  Object.freeze(${JSON.stringify(d, null, 2)}),\n`).join('');
export function prepareButtonToolbarPolicy(bytes) {
  const source = bytes.toString().replaceAll('\r\n', '\n'); assert.equal(hash(source), policyParent);
  return source.replace('export const sourceAuditDefinitions = Object.freeze([\n',
    'export const sourceAuditDefinitions = Object.freeze([\n' + policyAddition);
}
export function restoreButtonToolbarPolicy(bytes) {
  const source = bytes.toString().replaceAll('\r\n', '\n');
  assert.equal(source.split(policyAddition).length, 2);
  const restored = source.replace(policyAddition, ''); assert.equal(hash(restored), policyParent);
  return restored;
}
const sources = [
  ['button', 'button-pending-local-raster-20261103.log', 'bff55fd5b4ef56788fbcd2c1c89dcbf48f11ff2d28ce8f1efc674564d510e6fd'],
  ['toolbar', 'toolbar-retained-raster-coverage-20261103.log', '66f6e9df4bf476dc9ded3be4642e9b62478c26c005c8c4a2065840d82ea38660'],
];
const load = (read, file, sha256) => {
  const bytes = read(file); assert.equal(hash(bytes), sha256, `Changed paint evidence: ${file}`);
  const text = bytes[0] === 255 ? bytes.toString('utf16le') : bytes.toString();
  return JSON.parse(text.replace(/^\ufeff/, ''));
};

export function restoreButtonToolbarPaint(cases) {
  return cases.map(row => {
    const paint = row.obligations.localPaint, child = paint[key];
    if (!child) return row;
    const restored = { ...paint, disposition: child.parentDisposition }; delete restored[key];
    return { ...row, obligations: { ...row.obligations, localPaint: restored } };
  });
}

// Evidence-only coverage join. It cannot close cases, mutate fixtures, or infer
// renderer causality from diagnostic thresholds. Canonical registration is separate.
export function joinButtonToolbarPaint(cases, read = fs.readFileSync) {
  assert.equal(hash(JSON.stringify(cases)), buttonToolbarParent, 'Exact accepted parent required');
  const groups = new Map();
  const imageReceipts = new Map();
  for (const [family, relative, sha256] of sources) {
    const file = directory + relative, report = load(read, file, sha256);
    const observations = family === 'button' ? report.rows : report.observations;
    for (const receipt of report.receipts ?? []) {
      const file = receipt.file.replaceAll('\\', '/');
      if (imageReceipts.has(file)) assert.equal(imageReceipts.get(file).sha256, receipt.sha256);
      imageReceipts.set(file, { file, sha256: receipt.sha256 });
    }
    const expectedOwners = family === 'button' ? ['button-primary', 'button-secondary', 'button-disabled'] : ['toolbar-title', 'toolbar-action'];
    for (const observation of observations) {
      const rows = groups.get(observation.case) ?? [];
      assert.ok(expectedOwners.includes(observation.id));
      assert.ok(!rows.some(r => r.observation.id === observation.id));
      rows.push({ family, observation, report: { file, sha256 } }); groups.set(observation.case, rows);
    }
    assert.equal(report.cases ?? 52, 52);
    assert.equal(observations.length, expectedOwners.length * 52);
  }
  assert.equal(groups.size, 104);
  const ownEvidence = ['scripts/join-material-button-toolbar-paint.mjs',
    'tests/material-parity/toolbar-focus-layer-inputs.spec.mjs'].map(file => ({ file, sha256: hash(read(file)) }));
  const counts = { button: 0, toolbar: 0 };
  const joined = cases.map(row => {
    const selected = groups.get(row.case); if (!selected) return row;
    assert.equal(row.inspection, 'partial'); assert.equal(row.currentRendering, 'unverified');
    assert.equal(row.family, selected[0].family);
    assert.equal(selected.length, row.family === 'button' ? 3 : 2);
    const paint = row.obligations.localPaint; assert.equal(paint[key], undefined);
    const evidence = [selected[0].report, ...ownEvidence];
    const owners = selected.map(({ observation }) => {
      for (const side of ['reference', 'astylar']) {
        const file = row.evidence.pairedTrees[side].file.replace(`${side}-input-tree.json`,
          `${observation.id}-alignment-${side}.png`).replaceAll('\\', '/');
        const receipt = observation[side]?.file ? observation[side] : imageReceipts.get(file);
        assert.ok(receipt, `Missing owner raster receipt: ${file}`);
        assert.equal(receipt.file.replaceAll('\\', '/'), file);
        assert.equal(hash(read(receipt.file)), receipt.sha256);
        evidence.push(receipt);
      }
      return { id: observation.id, similarity: observation.similarity,
        phaseOffset: observation.phaseOffset, colorError: observation.colorError,
        sharpness: observation.sharpness, storedCenterErrorPx: observation.storedCenterErrorPx,
        defaultDiagnosticMatches: observation.matches };
    });
    counts[row.family]++;
    return { ...row, obligations: { ...row.obligations, localPaint: { ...paint, disposition: 'partial', [key]: {
      disposition: 'inspected-retained-owner-raster-diagnostics', parentDisposition: paint.disposition,
      owners, evidence, configuredGateChanged: false, originalRuntimeCauseProven: false,
      remaining: ['Complete owner paint/composition and source/runtime applicability beyond these retained diagnostics'],
      boundary: 'Exact retained owner crops,not equal inputs,current rendering,new calibrated gates or whole-case closure. Toolbar focus omission and public transparent reset evidence require separate finding/source integration.',
    } } } };
  });
  assert.deepEqual(counts, { button: 52, toolbar: 52 });
  assert.equal(hash(JSON.stringify(restoreButtonToolbarPaint(joined))), buttonToolbarParent);
  return { cases: joined, changed: 104, counts, sha256: hash(JSON.stringify(joined)), canonicalPublished: false };
}
