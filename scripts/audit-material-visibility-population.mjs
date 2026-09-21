import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { bindPreciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const signature = (family, element, reference, candidate) => JSON.stringify([family, element, reference, candidate]);
const snapshot = 'artifacts/material-parity/pre-disabled-ink-308e8bd';
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const visibility = style => ({ present: Object.hasOwn(style ?? {}, 'visibility'), value: style?.visibility ?? null });
const declarations = rules => (rules ?? []).filter(rule => Object.hasOwn(rule.declarations ?? {}, 'visibility'))
  .map(rule => ({ selector: rule.selector, visibility: rule.declarations.visibility, ruleSha256: digest(rule) }));

export function verifyVisibilityMembers(row, members) {
  assert.equal(members.length, row.occurrences);
  assert.equal(new Set(members.map(member => member.case)).size, members.length);
  assert.deepEqual(members.slice(0, 12).map(member => member.case), row.cases);
  assert.deepEqual([...new Set(members.map(member => member.state))], row.states);
  for (const member of members) {
    assert.ok(member.case.startsWith(`static:${row.family}@`) || member.case.startsWith(`interaction:${row.family}@`));
    assert.equal(member.reference.value, row.reference);
    assert.equal(member.candidate.value, row.astylar ?? null);
    assert.equal(member.candidate.present, row.astylar !== undefined);
  }
}

export function traceVisibilityAncestry(tree, side, element) {
  // The paired scalar is explicitly visible. Step transitions can retain a
  // second, hidden node with the same parity ID. Never take the first match.
  const nodes = tree.nodes.filter(n => side === 'reference'
    ? n.attributes?.['data-parity-id'] === element && tree.styles[n.style]?.visibility === 'visible'
    : n.authored?.id === element);
  assert.equal(nodes.length, 1, `ambiguous ${side} owner: ${element}`);
  const chain = [], seen = new Set();
  let node = nodes[0];
  while (node) {
    assert.ok(!seen.has(node.key), 'cyclic ancestry'); seen.add(node.key);
    if (side === 'astylar' && node.key === 'root' && node.parent === null && node.resolvedStyle === undefined) {
      assert.deepEqual(node, { key: 'root', parent: null, authored: {} }, 'unexpected unstyled root');
      chain.push({ key: node.key, syntheticDocumentRoot: true, visibilityNotCaptured: true, rules: [] });
      break;
    }
    const style = side === 'reference' ? tree.styles[node.style] : node.resolvedStyle;
    assert.ok(style, 'missing owner style');
    chain.push({ key: node.key, type: node.type ?? node.authored?.type,
      visibility: visibility(style),
      rules: side === 'reference' ? node.rules.map(index => {
        const rule = tree.rules[index]; assert.ok(rule, 'missing rule'); return rule;
      }).filter(rule => Object.hasOwn(rule.declarations ?? {}, 'visibility')) : [],
      ...(side === 'astylar' ? { authored: node.authored } : {}) });
    if (node.parent === null || node.parent === undefined) break;
    const parents = tree.nodes.filter(n => n.key === node.parent);
    assert.equal(parents.length, 1, 'missing or duplicate ancestor'); node = parents[0];
  }
  return chain;
}

export async function collectVisibilityPopulation() {
  const baseline = await readCaretConservationRows(file => {
    assert.ok(['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'].includes(file));
    return readFileSync(path.join(snapshot, path.basename(file)));
  });
  assert.equal(baseline.manifest.uncompressedSha256, 'b1a0e6e9f8c2a72625666444f9828f46e42d649acafd95354b5b75e62731424e');
  const selected = baseline.rows.filter(row => row.property === 'visibility' && row.attribution === 'unresolved');
  assert.equal(selected.length, 17);
  const expected = new Map(selected.map(row => [signature(row.family, row.element, row.reference, row.astylar), row]));
  assert.equal(expected.size, selected.length);
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const original = JSON.parse(bytes), normalize = bindPreciseAuditNormalization();
  const observations = new Map([...expected.keys()].map(key => [key, []]));
  for (const [kind, cases] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of cases) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      for (const input of entry.styleInputs) {
        const key = signature(entry.family, input.id, normalize(input.reference ?? {}).visibility, normalize(input.astylar ?? {}).visibility);
        if (!expected.has(key)) continue;
        observations.get(key).push({ case: caseId, state: entry.state ?? 'static', inputSha256: digest(input),
          reference: visibility(input.reference), candidate: visibility(input.astylar),
          candidateNormal: visibility(input.astylarNormalResolvedStyle),
          candidateInteraction: visibility(input.astylarInteractionResolvedStyle),
          referenceDeclarations: declarations(input.referenceAuthored), candidateDeclarations: declarations(input.astylarAuthored),
          referenceType: input.referenceStructure?.type ?? null, candidateType: input.astylarStructure?.type ?? null,
          inputTrees: entry.inputTrees });
      }
    }
  }
  const groups = selected.map(row => {
    const members = observations.get(signature(row.family, row.element, row.reference, row.astylar));
    verifyVisibilityMembers(row, members);
    if (['tab-panel', 'stepper-content'].includes(row.element)) for (const member of members) {
      member.ancestry = {};
      for (const side of ['reference', 'astylar']) {
        const receipt = member.inputTrees[side], bytes = readFileSync(receipt.file);
        assert.equal(hash(bytes), receipt.sha256, 'input tree receipt mismatch');
        member.ancestry[side] = traceVisibilityAncestry(JSON.parse(bytes), side, row.element);
      }
      assert.equal(member.ancestry.reference[0].visibility.value, member.reference.value);
      assert.deepEqual(member.ancestry.astylar[0].visibility, member.candidate);
      const rules = member.ancestry.reference.flatMap(node => node.rules).filter(rule => rule.active);
      assert.ok(rules.some(rule => rule.declarations.visibility.value === 'hidden'));
      assert.ok(rules.some(rule => rule.declarations.visibility.value === 'visible'));
    }
    return { family: row.family, element: row.element, property: 'visibility',
      reference: row.reference, candidate: row.astylar ?? null, candidateOmitted: row.astylar === undefined,
      occurrences: members.length, priorRowSha256: digest(row), observations: members,
      attribution: 'unresolved', classificationChanged: false };
  });
  return { schemaVersion: 1, kind: 'remaining-visibility-input-population', capture,
    baseline: { directory: snapshot, manifest: baseline.manifest },
    counts: { groups: groups.length, observations: groups.reduce((n, group) => n + group.occurrences, 0) },
    groups, canonicalAttributionChanged: false, rendererCauseProven: false, renderingEquivalent: false,
    requiredNextProof: 'Trace inherited visibility and state-dependent rules through full owner ancestry. Omission does not prove computed visible, and conditional mounting is not equivalent to visibility:hidden.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const report = await collectVisibilityPopulation(), output = JSON.stringify(report, null, 2) + '\n';
  writeFileSync('docs/material-visibility-input-population.json', output);
  console.log(JSON.stringify({ ...report.counts, sha256: hash(output), groups: report.groups.map(g => ({
    family: g.family, element: g.element, reference: g.reference, candidate: g.candidate,
    occurrences: g.occurrences, referenceRules: [...new Set(g.observations.flatMap(o => o.referenceDeclarations.map(d => JSON.stringify(d))))] })) }, null, 2));
}
