import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { collectFullTreeInventory } from '../tests/material-parity/input-equivalence-audit.mjs';
import { queryFindings } from './audit-findings-store.mjs';
import { rootInitialSelectorCanApply } from '../tests/material-parity/root-initial-style-evidence.mjs';
import { sourceAuditDefinitions } from '../tests/material-parity/input-equivalence-policy.mjs';

// Inspect the existing full-tree inventory,not another style normalizer or
// coverage framework. Named scalar targets are not the complete owner scope.
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const file = 'artifacts/material-parity/current-full-20261005/latest-report.json';
const bytes = readFileSync(file);
assert.equal(hash(bytes), 'ab42dbec6280e0e27784ec4bbc6697d4ea451bfab307bccb720c0dec89a83b62');
const report = JSON.parse(bytes);
const cases = [...report.results, ...report.interactions].filter(row => row.family === 'divider');
assert.equal(cases.length, 24);
const inventory = collectFullTreeInventory(cases);
for (const key of ['gaps', 'resolvedStyleGaps', 'stateStyleGaps', 'errors']) assert.deepEqual(inventory[key], []);
assert.equal(inventory.cases.length, 48); assert.equal(inventory.envelopes.length, 24);
const observations = [];
const headingFindings = queryFindings('artifacts/material-parity/working-audit', 'divider')
  .filter(row => ['eyebrow', 'title'].includes(row.element));
assert.equal(headingFindings.length, 96);
const boxFinding = sourceAuditDefinitions.find(row => row.id === 'core-box-sizing-omission-violates-content-box-default');
assert.equal(boxFinding.classification, 'confirmed-core-renderer-defect');
for (const receipt of boxFinding.evidence) assert.equal(hash(readFileSync(receipt.file)), receipt.sha256);
const relevantBoxKey = key => ['boxsizing', 'all'].includes(key.replaceAll('-', '').toLowerCase());
// A literal CSS-pixel offset only,not calc evaluation or a style normalizer.
const literalPixel = value => {
  assert.match(value, /^-?(?:\d+(?:\.\d+)?|\.\d+)px$/);
  return Number(value.slice(0, -2));
};
for (let index = 0; index < cases.length; index++) {
  const entry = cases[index];
  const mappings = inventory.cases.slice(index * 2, index * 2 + 2);
  assert.deepEqual(mappings.map(row => row.side), ['reference', 'astylar']);
  assert.equal(mappings[0].case, mappings[1].case);
  const native = inventory.variants[mappings[0].variant];
  const candidate = inventory.variants[mappings[1].variant];
  const owners = candidate.nodes.filter(node => node.authored?.type);
  assert.equal(native.nodes.length, 9); assert.equal(owners.length, 9);
  const byId = id => {
    const rows = owners.filter(node => node.authored.id === id); assert.equal(rows.length, 1); return rows[0];
  };
  const mapped = new Map();
  const add = (node, id) => { assert.ok(node); assert.equal(mapped.has(node.key), false); mapped.set(node.key, byId(id)); };
  const frame = native.nodes.find(node => node.parent === null && node.type === 'main');
  add(frame, 'page');
  add(native.nodes.find(node => node.parent === frame.key && node.type === 'p' && node.attributes.class === 'eyebrow'), 'eyebrow');
  add(native.nodes.find(node => node.parent === frame.key && node.type === 'h1'), 'title');
  for (const id of ['divider-root', 'divider-primary', 'divider-above', 'divider-below'])
    add(native.nodes.find(node => node.attributes.id === id), id);
  for (const id of ['divider-above', 'divider-below']) {
    const leaf = native.nodes.find(node => node.attributes.id === id);
    add(native.nodes.find(node => node.key === leaf.parent), `${id}-row`);
  }
  assert.equal(mapped.size, 9); assert.equal(new Set([...mapped.values()].map(node => node.key)).size, 9);
  for (const node of native.nodes) {
    const other = mapped.get(node.key);
    if (node.parent !== null) assert.equal(other.parent, mapped.get(node.parent).key);
    assert.equal(other.authored.type, node.type === 'mat-divider' ? 'div' : node.type);
    if (node.ownText.trim()) assert.equal(other.authored.textContent, node.ownText.trim());
    assert.deepEqual(native.nodes.filter(child => child.parent === node.key).map(child => mapped.get(child.key).key),
      owners.filter(child => child.parent === other.key).map(child => child.key));
  }
  const scalarIds = entry.styleInputs.map(row => row.id).sort();
  assert.deepEqual(scalarIds, ['divider-above', 'divider-below', 'divider-primary', 'divider-root']);
  const outsideScalarTargets = [...mapped].filter(([, node]) => !scalarIds.includes(node.authored.id)).map(([key, node]) => {
    const reference = native.nodes.find(owner => owner.key === key);
    const style = inventory.styles[reference.style]; assert.equal(style.side, 'reference');
    return { reference: key, candidate: node.key, id: node.authored.id,
      recordedReferenceProperties: Object.keys(style.value).length,
      referenceStyleSha256: hash(JSON.stringify(style.value)),
      candidateStyleSha256: hash(JSON.stringify(inventory.styles[node.style].value)),
      boundary: 'Inventoried and mapped,not all properties classified by this census.' };
  });
  assert.equal(outsideScalarTargets.length, 5);
  assert.ok(outsideScalarTargets.every(row => row.recordedReferenceProperties === 104));
  const page = byId('page'), nativeFrameStyle = inventory.styles[frame.style].value;
  const frameRules = frame.rules.map(index => inventory.rules[index].value);
  const pageRules = candidate.rules.map(index => inventory.rules[index].value)
    .filter(rule => rootInitialSelectorCanApply(rule.selector, page.authored));
  assert.equal(nativeFrameStyle.boxSizing, 'border-box');
  assert.ok(frameRules.some(rule => rule.active && rule.declarations['box-sizing']?.value === 'border-box'));
  assert.ok(!Object.keys(frame.inline).some(relevantBoxKey));
  assert.equal(page.authored.style, undefined); assert.equal(page.authored.attributes?.style, undefined);
  assert.ok(pageRules.every(rule => !Object.keys(rule).some(relevantBoxKey)));
  for (const index of [page.style, page.normalStyle, page.interactionStyle])
    assert.equal(Object.hasOwn(inventory.styles[index].value, 'boxSizing'), false);
  assert.equal(inventory.styles[page.style].value.padding, '36px');
  for (const side of ['Top', 'Right', 'Bottom', 'Left']) assert.equal(nativeFrameStyle[`padding${side}`], '36px');
  const frameBoxInputs = {
    classification: 'application-plugin-authoring-defect',
    owner: 'showcase #page box-model authoring',
    firstDivergence: 'Native .frame explicitly requests border-box;candidate #page omits boxSizing before layout.',
    reference: { computedBoxSizing: nativeFrameStyle.boxSizing,
      authoredBoxSizing: frameRules.filter(rule => rule.active && rule.declarations['box-sizing'])
        .map(rule => ({ selector: rule.selector, value: rule.declarations['box-sizing'].value })),
      computedWidth: nativeFrameStyle.width, computedHeight: nativeFrameStyle.height },
    astylar: { boxSizing: 'omitted in normal/effective/resolved stages and potentially applicable authored rules',
      widthRequest: inventory.styles[page.style].value.width,
      minHeightRequest: inventory.styles[page.style].value.minHeight },
    existingCoreFinding: { id: boxFinding.id, classification: boxFinding.classification, owner: boxFinding.owner, evidence: boxFinding.evidence },
    conclusion: 'Explicit native border-box versus omitted candidate boxSizing is an unequal request. The separately proved core omission default must not be used to certify these inputs as equivalent.',
    boundary: 'Recorded requests and existing general default finding only;not actual used frame dimensions,overflow,percentage/min-height resolution or historical author intent. Shared36px padding does not erase the request difference.' };
  const headingDomains = [];
  for (const id of ['eyebrow', 'title']) {
    const candidateNode = byId(id);
    const referenceKey = [...mapped].find(([, node]) => node.key === candidateNode.key)[0];
    const referenceNode = native.nodes.find(node => node.key === referenceKey);
    const ref = inventory.styles[referenceNode.style].value;
    const actual = inventory.styles[candidateNode.style].value;
    assert.equal(ref.position, 'relative'); assert.equal(actual.position, 'relative');
    assert.equal(literalPixel(ref.top), literalPixel(actual.top));
    assert.equal(ref.opacity, '0'); assert.equal(Number(actual.opacity), 1);
    const existing = headingFindings.filter(row => row.case === mappings[0].case && row.element === id);
    assert.equal(existing.length, 2);
    assert.deepEqual(existing.map(row => [row.property, row.attribution, row.classification]).sort(), [
      ['color', 'reviewed-heading-mask', 'parity-harness-defect'],
      ['textAlign', 'reviewed-horizontal-start-alignment', 'equivalent-representation'],
    ]);
    headingDomains.push({ id, relativeTopInputs: { reference: ref.top, astylar: actual.top },
      maskingInputs: { referenceOpacity: ref.opacity, astylarOpacity: actual.opacity,
        referenceColor: ref.color, astylarColor: actual.color },
      existingFindings: existing.map(row => ({ id: row.id, property: row.property, attribution: row.attribution, evidence: row.evidence })),
      boundary: 'Offset literals and reuse of accepted masking/logical-alignment findings only;not other properties,used flow,paint or full heading inspection.' });
  }
  observations.push({ case: mappings[0].case, scalarIds, outsideScalarTargets, frameBoxInputs, headingDomains, evidence: entry.inputTrees });
}
console.log(JSON.stringify({ producer: { file: 'scripts/check-divider-owner-coverage.mjs', sha256: hash(readFileSync(import.meta.filename)) },
  collector: { file: 'tests/material-parity/input-equivalence-audit.mjs', sha256: hash(readFileSync('tests/material-parity/input-equivalence-audit.mjs')) },
  report: { file, sha256: hash(bytes) }, cases: 24, completeOwnerPairs: 216,
  outsideScalarOwnerPairs: 120, referencePropertySlotsOutsideScalarTargets: 12480, observations,
  reusedHeadingFindings: headingFindings.length, matchingRelativeHeadingOffsets: 48,
  unequalFrameBoxSizingRequests: 24,
  conclusion: 'All nine recorded owners map one-to-one after excluding the synthetic SiteData envelope. The scalar loop covers four targets;five other owners require their separate inspection evidence. These are not missing tree captures or newly discovered fixture nodes.',
  boundary: 'Recorded tree/structure and scalar-target membership only. Counts are not additional unresolved differences,an inspection percentage,complete CSS support or current rendering. Existing partial proofs may cover subsets of these property slots;no blanket uninspected classification or case promotion.' }));
