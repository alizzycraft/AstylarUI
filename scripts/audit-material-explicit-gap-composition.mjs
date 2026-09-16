import assert from 'node:assert/strict';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { inspectOwnerGapInput } from '../tests/material-parity/owner-gap-input-evidence.mjs';

// Audit original inputs, not an alternate layout implementation. No candidate
// computed gaps or renderer causes are inferred from these structural proofs.
const args = process.argv.slice(2);
assert.ok(!args.length || args.length === 1 && args[0] === '--check');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const canonicalFiles = ['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz',
  'docs/material-input-equivalence-audit.md'];
const canonicalBefore = canonicalFiles.map(file => hash(readFileSync(file)));
const one = nodes => { assert.equal(nodes.length, 1); return nodes[0]; };
const stages = ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle'];
const expected = { 'button-toggle-one': '8px', 'button-toggle-two': '8px', 'checkbox-primary': '14px',
  'chip-0': '8px', 'chip-1': '8px', 'chips-primary': '8px', 'dialog-actions': '8px', 'grid-list-primary': '0' };
const properties = ['display', 'position', 'gap', 'rowGap', 'columnGap', 'padding', 'paddingLeft', 'paddingRight',
  'margin', 'marginLeft', 'marginRight', 'marginTop', 'marginBottom', 'width', 'height', 'minWidth',
  'flexWrap', 'gridTemplateColumns', 'top', 'left', 'transform'];
const pick = style => Object.fromEntries(properties.filter(p => Object.hasOwn(style, p)).map(p => [p, style[p]]));

function composition(input, r, a, family) {
  const proof = inspectOwnerGapInput(input, 'columnGap', r, a, { family });
  assert.ok(proof.referenceNode && proof.astylarNode);
  const rn = one(r.nodes.filter(n => n.key === proof.referenceNode));
  const an = one(a.nodes.filter(n => n.key === proof.astylarNode));
  const children = (tree, node) => tree.nodes.filter(n => n.parent === node.key);
  const byClass = (parent, className) => one(children(r, parent).filter(n => n.attributes?.class?.split(/\s+/).includes(className)));
  const rs = node => r.styles[node.style];
  const label = id => one(children(a, an).filter(n => n.authored?.id === id));
  const refs = [rn], candidates = [an];
  const keep = (...nodes) => { refs.push(...nodes); return nodes.at(-1); };
  for (const p of ['columnGap', 'rowGap']) assert.equal(rs(rn)[p], 'normal');
  for (const stage of stages) assert.equal(an[stage].gap, expected[input.id]);
  assert.ok(proof.requests.astylar.some(q => q.declarations.gap === expected[input.id]));
  assert.ok(proof.requests.reference.every(q => Object.keys(q.declarations).every(p => /^(transition|animation)/i.test(p))));
  let finding;
  if (family === 'button-toggle') {
    assert.equal(rs(rn).display, 'block'); assert.equal(an.resolvedStyle.display, 'flex');
    const button = keep(one(children(r, rn).filter(n => n.type === 'button')));
    const indicator = keep(byClass(button, 'mat-button-toggle-checkbox-wrapper'));
    keep(byClass(button, 'mat-button-toggle-label-content'));
    assert.equal(rs(indicator).position, 'absolute');
    candidates.push(label(input.id + '-label'));
    const selected = an.authored.ariaChecked === true;
    assert.deepEqual(children(a, an).map(n => n.authored.id),
      [...(selected ? [input.id + '-mark'] : []), input.id + '-label']);
    for (const n of children(a, an)) assert.notEqual(n.resolvedStyle.position, 'absolute');
    finding = 'reference positioned indicator and inline button content replaced by conditional direct flex items';
  } else if (family === 'checkbox') {
    assert.equal(rs(rn).display, 'inline-block'); assert.equal(an.resolvedStyle.display, 'flex');
    const wrapper = keep(byClass(rn, 'mdc-form-field'));
    assert.equal(rs(wrapper).display, 'inline-flex');
    const box = keep(byClass(wrapper, 'mdc-checkbox')), text = keep(byClass(wrapper, 'mdc-label'));
    assert.equal(rs(box).width, '18px'); assert.equal(rs(text).paddingLeft, '4px');
    assert.deepEqual(children(a, an).map(n => n.authored.id), ['checkbox-state-layer', 'checkbox-box', 'checkbox-label']);
    candidates.push(label('checkbox-box'), label('checkbox-label'));
    assert.equal(an.resolvedStyle.padding, '0 11px');
    finding = 'reference padded checkbox and padded label inside inline-flex wrapper replaced by direct flex gap';
  } else if (input.id === 'chips-primary') {
    const wrapper = keep(byClass(rn, 'mdc-evolution-chip-set__chips'));
    assert.equal(rs(rn).flexWrap, 'nowrap'); assert.equal(rs(wrapper).flexWrap, 'wrap');
    assert.equal(rs(wrapper).marginLeft, '-8px'); assert.equal(rs(wrapper).minWidth, '100%');
    const chips = children(r, wrapper).filter(n => n.type === 'mat-chip-option');
    assert.deepEqual(chips.map(n => n.attributes.id), ['chip-0', 'chip-1']); refs.push(...chips);
    assert.deepEqual(children(a, an).map(n => n.authored.id), ['chip-0', 'chip-1']);
    candidates.push(...children(a, an));
    assert.equal(an.resolvedStyle.flexWrap, 'wrap');
    for (const n of chips) {
      assert.equal(rs(n).marginLeft, '8px'); assert.equal(rs(n).marginTop, '4px'); assert.equal(rs(n).marginBottom, '4px');
    }
    for (const n of children(a, an)) assert.equal(n.resolvedStyle.margin, '0');
    finding = 'reference negative-margin wrapping wrapper and chip margins replaced by direct gap composition';
  } else if (family === 'chips') {
    const cell = keep(byClass(rn, 'mdc-evolution-chip__cell'));
    const button = keep(one(children(r, cell).filter(n => n.type === 'button')));
    const graphic = keep(byClass(button, 'mdc-evolution-chip__graphic'));
    keep(byClass(button, 'mdc-evolution-chip__text-label'));
    assert.equal(rs(button).paddingRight, '12px');
    assert.equal(rs(graphic).paddingLeft, '6px'); assert.equal(rs(graphic).paddingRight, '6px');
    assert.equal(an.resolvedStyle.padding, '0 12px'); candidates.push(label(input.id + '-label'));
    const selected = an.authored.ariaSelected === true;
    assert.deepEqual(children(a, an).map(n => n.authored.id),
      [...(selected ? [input.id + '-mark'] : []), input.id + '-label']);
    finding = 'reference retained padded graphic/action wrappers replaced by conditional direct mark and gap';
  } else if (family === 'dialog') {
    assert.equal(rs(rn).display, 'flex'); assert.equal(rs(rn).flexWrap, 'wrap');
    assert.equal(an.resolvedStyle.display, 'flex'); assert.equal(an.resolvedStyle.flexWrap, 'nowrap');
    const buttons = children(r, rn).filter(n => n.type === 'button'); assert.equal(buttons.length, 2);
    assert.equal(rs(buttons[0]).marginLeft, '0px'); assert.equal(rs(buttons[1]).marginLeft, '8px'); refs.push(...buttons);
    assert.deepEqual(children(a, an).map(n => n.authored.id), ['dialog-cancel', 'dialog-save']);
    candidates.push(...children(a, an));
    for (const n of children(a, an)) assert.equal(n.resolvedStyle.margin, '0');
    finding = 'reference wrapping actions with second-button margin replaced by nonwrapping gap';
  } else if (family === 'grid-list') {
    assert.equal(rs(rn).display, 'block'); assert.equal(rs(rn).position, 'relative');
    assert.equal(an.resolvedStyle.display, 'grid'); assert.equal(an.resolvedStyle.gridTemplateColumns, '1fr 1fr');
    const wrapper = keep(one(children(r, rn).filter(n => n.type === 'div')));
    const tiles = children(r, wrapper).filter(n => n.type === 'mat-grid-tile');
    assert.deepEqual(tiles.map(n => n.attributes.id), ['grid-tile-one', 'grid-tile-two']); refs.push(...tiles);
    for (const tile of tiles) { assert.equal(rs(tile).position, 'absolute'); assert.match(tile.attributes.style, /width: calc\(50% - 0\.5px\)/); }
    assert.deepEqual(children(a, an).map(n => n.authored.id), ['grid-tile-one', 'grid-tile-two']);
    candidates.push(...children(a, an));
    for (const n of children(a, an)) assert.equal(n.resolvedStyle.position, 'relative');
    finding = 'reference absolutely positioned calc-sized tiles and gutter replaced by equal grid tracks and zero gap';
  } else assert.fail('unreviewed owner');
  return { finding, referenceNode: rn.key, candidateNode: an.key,
    reference: refs.map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: n.attributes,
      computed: pick(rs(n)), inline: n.inline, rules: n.rules.map(i => r.rules[i]) })),
    candidate: candidates.map(n => ({ key: n.key, parent: n.parent, authored: n.authored,
      stages: Object.fromEntries(stages.map(stage => [stage, pick(n[stage])])) })),
    inputEquivalent: false, usedGapVerified: false, rendererCauseProven: false };
}

const surveyFile = 'docs/material-owner-gap-input-survey.json', joinFile = 'docs/material-owner-gap-canonical-join.json';
const surveyBytes = readFileSync(surveyFile), survey = JSON.parse(surveyBytes), joinBytes = readFileSync(joinFile), join = JSON.parse(joinBytes);
assert.equal(hash(surveyBytes), join.survey.sha256);
for (const source of survey.sourceFingerprints) assert.equal(hash(readFileSync(source.file, 'utf8').replaceAll('\r\n', '\n')), source.sha256);
const originalBytes = readFileSync(survey.capture.file); assert.equal(hash(originalBytes), survey.capture.sha256);
const original = JSON.parse(originalBytes), entries = new Map();
for (const [kind, list] of [['static', original.results], ['interaction', original.interactions]]) for (const e of list) {
  const key = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  assert.ok(!entries.has(key)); entries.set(key, e);
}
const groups = survey.groups.filter(g => g.candidate !== '<omitted>'); assert.equal(groups.length, 16);
assert.deepEqual([...new Set(groups.map(g => g.element))].sort(), Object.keys(expected).sort());
const boundary = realpathSync('artifacts/material-parity') + path.sep;
const tree = descriptor => {
  const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
  const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
};
const owners = [], allCases = new Set(); let negativeControls = 0;
for (const element of Object.keys(expected)) {
  const pair = groups.filter(g => g.element === element); assert.equal(pair.length, 2);
  assert.deepEqual(pair.map(g => g.property).sort(), ['columnGap', 'rowGap']);
  assert.deepEqual(pair[0].originalCases, pair[1].originalCases);
  for (const g of pair) {
    const row = one(join.rows.filter(row => row.family === g.family && row.element === element && row.property === g.property));
    assert.equal(row.surveyGroupSha256, hash(JSON.stringify(g)));
    assert.deepEqual(row.observations.map(o => o.case), g.originalCases);
  }
  const records = [], proofs = pair.map(() => createHash('sha256')); let witness;
  for (const caseId of pair[0].originalCases) {
    allCases.add(caseId); const e = entries.get(caseId); assert.ok(e);
    const input = one(e.styleInputs.filter(i => i.id === element));
    const r = tree(e.inputTrees.reference), a = tree(e.inputTrees.astylar);
    const result = composition(input, r, a, e.family); witness ??= { case: caseId, ...result };
    for (const [i, g] of pair.entries()) proofs[i].update(JSON.stringify({ case: caseId,
      proof: inspectOwnerGapInput(input, g.property, r, a, { family: e.family }) }) + '\n');
    records.push({ case: caseId, inputTrees: e.inputTrees, inputSha256: hash(JSON.stringify(input)),
      compositionSha256: hash(JSON.stringify(result)), finding: result.finding });
    if (records.length === 1) {
      const mutations = [
        (rr, aa) => { rr.styles[rr.nodes.find(n => n.key === result.referenceNode).style].columnGap = '1px'; },
        (rr, aa) => { aa.nodes.find(n => n.key === result.candidateNode).resolvedStyle.gap = '99px'; },
        (rr, aa) => { rr.nodes.push(structuredClone(rr.nodes.find(n => n.key === result.referenceNode))); },
        (rr, aa) => { aa.nodes.find(n => n.parent === result.candidateNode).parent = 'detached'; },
        (rr, aa) => {
          // Mutate a descendant, not the mapped owner's scalar snapshot, so
          // this exercises the actual composition assertions above.
          const targets = {
            'button-toggle': ['mat-button-toggle-checkbox-wrapper', 'position', 'relative'],
            checkbox: ['mdc-label', 'paddingLeft', '99px'],
            chips: [element === 'chips-primary' ? 'mdc-evolution-chip-set__chips' : 'mdc-evolution-chip__graphic',
              element === 'chips-primary' ? 'marginLeft' : 'paddingLeft', '99px'],
            dialog: ['mat-mdc-unelevated-button', 'marginLeft', '99px'],
            'grid-list': ['mat-grid-tile', 'position', 'relative'],
          };
          const [className, property, value] = targets[e.family];
          const n = rr.nodes.find(n => result.reference.some(p => p.key === n.key) && n.attributes?.class?.split(/\s+/).includes(className));
          assert.ok(n); rr.styles[n.style][property] = value;
        },
      ];
      for (const mutate of mutations) {
        const rr = structuredClone(r), aa = structuredClone(a); mutate(rr, aa);
        assert.throws(() => composition(input, rr, aa, e.family)); negativeControls++;
      }
    }
  }
  for (const [i, g] of pair.entries()) assert.equal(proofs[i].digest('hex'), g.proofSha256);
  owners.push({ family: pair[0].family, element, candidateGap: expected[element],
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-unequal-spacing-composition',
    scope: 'Unequal layout requests and topology; historical renderer motivation and final effects are not established.',
    cases: records.length, propertyObservations: records.length * 2, records, witness,
    inputEquivalent: false, usedGapVerified: false, rendererCauseProven: false });
}
assert.equal(allCases.size, 296); assert.equal(negativeControls, 40);
assert.equal(owners.reduce((n, o) => n + o.propertyObservations, 0), 1032);
const report = { schemaVersion: 1, kind: 'explicit-gap-original-composition-review',
  survey: { file: surveyFile, sha256: hash(surveyBytes) }, join: { file: joinFile, sha256: hash(joinBytes) },
  counts: { groups: 16, owners: 8, cases: allCases.size, propertyObservations: 1032, negativeControls },
  owners, canonicalIntegration: false, inputEquivalent: false, rendererCauseProven: false,
  sourceFingerprint: { file: 'scripts/audit-material-explicit-gap-composition.mjs',
    sha256: hash(readFileSync('scripts/audit-material-explicit-gap-composition.mjs', 'utf8').replaceAll('\r\n', '\n')) },
  limits: ['This reviews original authoring relationships; no production or comparison source changes.',
    'Matching one-line output does not establish equivalent wrapping, intrinsic sizing, indicator placement or hit targets.',
    'Canonical attribution remains unchanged; these evidence-backed authoring classifications are a separate supplement.',
    'Equivalent-input renderer reductions and historical causality remain separate required investigations.'] };
const target = 'docs/material-explicit-gap-composition.json', output = JSON.stringify(report, null, 2) + '\n';
if (args[0] === '--check') assert.equal(readFileSync(target, 'utf8').replaceAll('\r\n', '\n'), output);
else writeFileSync(target, output);
assert.deepEqual(canonicalFiles.map(file => hash(readFileSync(file))), canonicalBefore);
console.log(JSON.stringify({ ...report.counts, canonicalIntegration: false, canonicalUnchanged: true }));
