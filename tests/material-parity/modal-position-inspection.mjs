import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveOriginAliasPair } from './origin-alias-mapping-evidence.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const ids = ['bottom-sheet-copy', 'bottom-sheet-dismiss', 'bottom-sheet-panel', 'dialog-actions',
  'dialog-cancel', 'dialog-copy', 'dialog-panel', 'dialog-save', 'dialog-title'];
const one = ns => { assert.equal(ns.length, 1); return ns[0]; };
const caseKey = (e, kind) => `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;

// Adapt only the inventory's indexed storage, preserving captured values and
// rule order. No defaults or inferred style values are introduced.
export function modalInventoryTrees(inventory, key) {
  assert.deepEqual(inventory.errors, []);
  return ['reference', 'astylar'].map(side => {
    const entry = one(inventory.cases.filter(c => c.case === key && c.side === side));
    const variant = inventory.variants[entry.variant]; assert.equal(variant.side, side);
    const style = index => {
      assert.equal(inventory.styles[index].side, side); return inventory.styles[index].value;
    };
    return { ...variant, schemaVersion: 1, errors: [], resolvedStyleRevision: entry.resolvedStyleRevision,
      styles: inventory.styles.map(s => s.value),
      rules: side === 'reference' ? inventory.rules.map(r => r.value) : variant.rules.map(index => {
        assert.equal(inventory.rules[index].side, side); return inventory.rules[index].value;
      }),
      nodes: variant.nodes.map(n => side === 'reference' ? n : { ...n,
        resolvedStyle: n.style === undefined ? undefined : style(n.style),
        normalResolvedStyle: n.normalStyle === undefined ? undefined : style(n.normalStyle),
        interactionResolvedStyle: n.interactionStyle === undefined ? undefined : style(n.interactionStyle) }) };
  });
}

// Pure semantic join over evidence already collected by the audit. The caller
// owns capture authentication and complete scalar population selection.
// This does not reread trees, normalize omitted values, or accept raster parity.
export function proveDialogScalarTypographyJoin(row, proofs, inventory, caseKeys) {
  const allowed = {
    'dialog-copy': ['fontFamily', 'letterSpacing', 'color'],
    'dialog-cancel': ['fontFamily', 'letterSpacing'],
    'dialog-save': ['fontFamily', 'letterSpacing'],
    'dialog-title': ['fontFamily', 'color'],
  };
  const { element, property } = row, title = element === 'dialog-title';
  assert.equal(row.family, 'dialog'); assert.ok(allowed[element]?.includes(property));
  assert.equal(row.attribution, 'unresolved');
  assert.ok(caseKeys.length > 0); assert.equal(new Set(caseKeys).size, caseKeys.length);
  assert.equal(row.occurrences, caseKeys.length); assert.deepEqual(row.cases, caseKeys.slice(0, 12));
  assert.deepEqual(proofs.map(p => p.case), caseKeys);
  const attribution = !['dialog-copy', 'dialog-title'].includes(element) ? 'reviewed-dialog-action-typography-input'
    : property === 'color' ? 'reviewed-dialog-text-ink-input' : 'reviewed-dialog-text-metric-omission';
  for (const proof of proofs) {
    assert.equal(proof.family, 'dialog'); assert.equal(proof.attribution, attribution);
    assert.equal(proof.element, title ? 'dialog-title-label' : element); assert.equal(proof.property, property);
    assert.equal(proof.classification, 'application-plugin-authoring-defect');
    assert.equal(proof.inputEquivalent, false); assert.equal(proof.values.reference, row.reference);
    const entry = one(inventory.cases.filter(c => c.case === proof.case && c.side === 'astylar'));
    const node = one(inventory.variants[entry.variant].nodes.filter(n => n.authored?.id === element));
    const normal = inventory.styles[node.normalStyle].value, effective = inventory.styles[node.interactionStyle].value;
    const referenceOwner = element === 'dialog-copy' || title ? proof.reviewEvidence.referenceLeaf : proof.reviewEvidence.referenceChain[1];
    assert.equal(referenceOwner.attributes['data-parity-id'], element);
    if (title) {
      const [label, owner] = proof.reviewEvidence.candidateChain;
      assert.equal(label.authored.id, 'dialog-title-label'); assert.equal(label.authored.type, 'span');
      assert.equal(label.authored.textContent, 'Confirm action'); assert.equal(label.parent, owner.node);
      assert.equal(owner.node, node.key); assert.equal(owner.authored.type, 'h2');
      assert.equal(owner.authored.id, element); assert.equal(node.parent, owner.parent);
      for (const stage of ['normal', 'effective']) assert.equal(label[stage][property], undefined);
    } else if (element === 'dialog-copy') assert.equal(proof.reviewEvidence.candidateChain[0].node, node.key);
    else assert.ok(proof.reviewEvidence.structure.candidateActions.some(n => n.key === node.key));
    if (row.astylar === undefined) {
      assert.ok(['fontFamily', 'letterSpacing'].includes(property));
      for (const stage of [normal, effective]) assert.equal(Object.hasOwn(stage, property), false);
    } else {
      if (title) assert.equal(proof.values.retained, row.astylar);
      else { assert.equal(proof.values.normal, row.astylar); assert.equal(proof.values.effective, row.astylar); }
      for (const stage of [normal, effective]) assert.equal(stage[property], property === 'color'
        ? title ? '#1d1b20' : '#49454f' : 'Roboto, Arial, sans-serif');
    }
  }
  return { element, property, sourceAttribution: attribution, cases: [...caseKeys],
    classification: 'application-plugin-authoring-defect', inputEquivalent: false,
    renderingEquivalent: false };
}

export function applyDialogScalarTypography(rows, cases, inventory, retained, control, canonicalStyle) {
  const pairs = new Set(['dialog-copy/fontFamily', 'dialog-copy/letterSpacing', 'dialog-copy/color',
    'dialog-cancel/fontFamily', 'dialog-cancel/letterSpacing', 'dialog-save/fontFamily',
    'dialog-save/letterSpacing', 'dialog-title/fontFamily', 'dialog-title/color']);
  const metadata = ['classification', 'attribution', 'justification', 'recommendedOwner', 'reviewEvidence', 'reviewedCases'];
  return rows.map(row => {
    if (row.family !== 'dialog' || row.attribution !== 'unresolved' || !pairs.has(`${row.element}/${row.property}`)) return row;
    const matching = cases.filter(c => c.family === row.family).flatMap(c => (c.styleInputs ?? [])
      .filter(i => i.id === row.element && canonicalStyle(i.reference ?? {})[row.property] === row.reference &&
        canonicalStyle(i.astylar ?? {})[row.property] === row.astylar)
      .map(i => { assert.equal(i.astylarResolvedStyleEvidenceVersion, 2); return caseKey(c, c.kind); }));
    const proofElement = row.element === 'dialog-title' ? 'dialog-title-label' : row.element;
    const proofs = [...retained.differences, ...control.differences].filter(p =>
      p.family === row.family && p.element === proofElement && p.property === row.property && matching.includes(p.case));
    const joined = proveDialogScalarTypographyJoin(row, proofs, inventory, matching);
    return { ...row, classification: joined.classification, attribution: 'reviewed-dialog-scalar-typography-owner',
      recommendedOwner: 'showcase dialog component typography inputs',
      justification: 'The complete scalar population joins existing component-token authoring proofs at the same native owner and candidate declaration stage. Missing local declarations remain missing; inherited/retained values are not substituted into scalar inputs. No glyph or raster equivalence is inferred.',
      reviewedCases: matching,
      reviewEvidence: { sourceAttribution: joined.sourceAttribution,
        originalRowSha256: hash(JSON.stringify(row)), proofRowsSha256: hash(JSON.stringify(proofs)),
        priorMetadata: Object.fromEntries(metadata.filter(k => Object.hasOwn(row, k)).map(k => [k, structuredClone(row[k])])),
        observations: proofs.map(p => ({ case: p.case, element: p.element, property: p.property,
          referenceNode: p.referenceNode, astylarNode: p.astylarNode })),
        inputEquivalent: false, renderingEquivalent: false } };
  });
}

export function validateDialogScalarTypography(rows, originalRows, cases, inventory, retained, control, canonicalStyle) {
  try {
    const select = values => values.filter(r => r.attribution === 'reviewed-dialog-scalar-typography-owner');
    const expected = select(applyDialogScalarTypography(originalRows, cases, inventory, retained, control, canonicalStyle));
    // Original rows come from independent scalar replay, never from the saved
    // row's own priorMetadata. JSON comparison preserves omission on disk.
    assert.equal(JSON.stringify(select(rows)), JSON.stringify(expected));
    return [];
  } catch (error) { return [`dialog scalar typography does not replay from original cases and existing owner proofs: ${error.message}`]; }
}

export function proveModalPositionInspection(entry, r, a, id) {
  assert.ok(ids.includes(id));
  const input = one(entry.styleInputs.filter(i => i.id === id));
  const mapping = resolveOriginAliasPair(entry, r, a, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status), mapping.reason);
  const rn = one(r.nodes.filter(n => n.key === mapping.referenceNode));
  const an = one(a.nodes.filter(n => n.key === mapping.candidateNode));
  const rs = r.styles[rn.style];
  assert.equal(rs.position, id === 'dialog-copy' ? 'static' : 'relative');
  for (const stage of ['resolvedStyle', 'normalResolvedStyle', 'interactionResolvedStyle']) assert.ok(!Object.hasOwn(an[stage], 'position'));
  const properties = ['position', 'display', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
    'boxSizing', 'padding', 'margin', 'fontSize', 'lineHeight', 'transform', 'borderRadius',
    'borderTopLeftRadius', 'overflow', 'overflowX', 'overflowY'];
  const project = style => Object.fromEntries(properties.map(p => [p,
    Object.hasOwn(style, p) ? { present: true, value: style[p] } : { present: false }]));
  return { element: id, mapping, reference: { type: rn.type, style: project(rs) },
    candidate: { type: an.authored.type, style: project(an.resolvedStyle) },
    classification: 'unresolved', inputEquivalenceProven: false, rendererCauseProven: false,
    remainingQuestion: 'Generated reference owner is mapped, but differing modal structure and sizing must be compared before position omission can be classified.' };
}
export function collectModalPositionInspection() {
  const file = 'docs/material-position-input-population.json', b = readFileSync(file);
  assert.equal(hash(b), '71ed7689534232fe8c167532455abbf9510e89ae69b4c918d9dc7f40d3d346ff');
  const captureFile = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', source = readFileSync(captureFile);
  assert.equal(hash(source), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const capture = JSON.parse(source), entries = new Map();
  for (const [kind, list] of [['static', capture.results], ['interaction', capture.interactions]]) for (const e of list) {
    const key = caseKey(e, kind); assert.ok(!entries.has(key)); entries.set(key, e);
  }
  const groups = JSON.parse(b).groups.filter(g => ids.includes(g.element)); assert.deepEqual(groups.map(g => g.element), ids);
  const reviewed = groups.map(g => {
    const expected = g.family === 'dialog' ? 32 : 25;
    assert.equal(g.observations.length, expected); assert.equal(new Set(g.observations.map(o => o.case)).size, expected);
    return { element: g.element, priorRowSha256: g.priorRowSha256, observations: g.observations.map(o => {
      const entry = entries.get(o.case); assert.ok(entry);
      const trees = ['reference', 'astylar'].map(side => { const receipt = o.inputTrees[side], bytes = readFileSync(receipt.file);
        assert.equal(hash(bytes), receipt.sha256); return JSON.parse(bytes); });
      return { case: o.case, inputTrees: o.inputTrees, proof: proveModalPositionInspection(entry, ...trees, g.element) };
    }) };
  });
  return { schemaVersion: 1, kind: 'modal-position-inspection', population: { file, sha256: hash(b) },
    capture: { file: captureFile, sha256: hash(source) }, groups: reviewed,
    counts: { groups: 9, observations: 267 }, canonicalAttributionChanged: false };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = collectModalPositionInspection();
  writeFileSync('docs/material-modal-position-inspection.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.counts));
}
