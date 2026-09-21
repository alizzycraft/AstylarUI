import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';
import { bindPreciseAuditNormalization, preciseAuditNormalization } from '../tests/material-parity/audit-normalization-contracts.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const signature = (family, element, reference, candidate) => JSON.stringify([family, element, reference, candidate]);
const snapshot = 'artifacts/material-parity/pre-root-classification-e5a8bf2';
const capture = { file: 'artifacts/material-parity/current-ancestry-audit/latest-report.json',
  sha256: 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a' };
const position = style => ({ present: Object.hasOwn(style ?? {}, 'position'), value: style?.position ?? null });
const declarations = rules => (rules ?? []).filter(rule => Object.hasOwn(rule.declarations ?? {}, 'position'))
  .map(rule => ({ selector: rule.selector, position: rule.declarations.position, ruleSha256: digest(rule) }));

// Membership check only; source authentication is the collector's obligation.
export function verifyPositionMembers(row, members) {
  assert.equal(members.length, row.occurrences, `membership differs: ${row.family}/${row.element}`);
  assert.equal(new Set(members.map(member => member.case)).size, members.length, 'duplicate source member');
  assert.deepEqual(members.slice(0, 12).map(member => member.case), row.cases);
  assert.deepEqual([...new Set(members.map(member => member.state))], row.states);
  for (const member of members) {
    assert.ok(member.case.startsWith(`static:${row.family}@`) || member.case.startsWith(`interaction:${row.family}@`));
    assert.equal(member.reference.value, row.reference);
    assert.equal(member.candidate.value, row.astylar ?? null);
    assert.equal(member.candidate.present, row.astylar !== undefined);
  }
}

export async function collectPositionPopulation() {
  const baseline = await readCaretConservationRows(file => {
    assert.ok(['docs/material-input-equivalence-audit.json', 'docs/material-input-equivalence-audit.json.gz'].includes(file));
    return readFileSync(path.join(snapshot, path.basename(file)));
  });
  assert.equal(baseline.manifest.compressedSha256, 'd4dc68ab9a12d9de733e2a3c9aa462724ed2bb013ec402f04f8ab9fa291b6d7c');
  const selected = baseline.rows.filter(row => row.property === 'position' && row.attribution === 'unresolved');
  assert.equal(selected.length, 58);
  const expected = new Map(selected.map(row => [signature(row.family, row.element, row.reference, row.astylar), row]));
  assert.equal(expected.size, selected.length);
  const bytes = readFileSync(capture.file); assert.equal(hash(bytes), capture.sha256);
  const original = JSON.parse(bytes), normalize = bindPreciseAuditNormalization();
  const observations = new Map([...expected.keys()].map(key => [key, []]));
  for (const [kind, cases] of [['static', original.results], ['interaction', original.interactions]]) {
    for (const entry of cases) {
      const caseId = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
      for (const input of entry.styleInputs) {
        const reference = normalize(input.reference ?? {}).position, candidate = normalize(input.astylar ?? {}).position;
        const key = signature(entry.family, input.id, reference, candidate);
        if (!expected.has(key)) continue;
        observations.get(key).push({ case: caseId, state: entry.state ?? 'static', inputSha256: digest(input),
          reference: position(input.reference), candidate: position(input.astylar),
          candidateNormal: position(input.astylarNormalResolvedStyle),
          candidateInteraction: position(input.astylarInteractionResolvedStyle),
          referenceDeclarations: declarations(input.referenceAuthored), candidateDeclarations: declarations(input.astylarAuthored),
          referenceType: input.referenceStructure?.type ?? null, candidateType: input.astylarStructure?.type ?? null,
          inputTrees: entry.inputTrees });
      }
    }
  }
  const groups = selected.map(row => {
    const members = observations.get(signature(row.family, row.element, row.reference, row.astylar));
    verifyPositionMembers(row, members);
    return { family: row.family, element: row.element, property: 'position',
      reference: row.reference, candidate: row.astylar ?? null, candidateOmitted: row.astylar === undefined,
      occurrences: members.length, priorRowSha256: digest(row),
      candidateExplicitPositionObservations: members.filter(member => member.candidateDeclarations.length).length,
      referenceExplicitPositionObservations: members.filter(member => member.referenceDeclarations.length).length,
      differingElementTypes: members.filter(member => member.referenceType !== member.candidateType).length,
      observations: members, attribution: 'unresolved', classificationChanged: false,
      requiredNextProof: 'Review authored rules, owner correspondence, containing-block and used-position semantics. Omission is not proof of a computed static value; different wrappers are not automatically equivalent.' };
  });
  const count = groups.reduce((n, group) => n + group.occurrences, 0);
  assert.equal(count, 2950);
  return { schemaVersion: 1, kind: 'remaining-position-input-population', capture,
    baseline: { directory: snapshot, manifest: baseline.manifest }, normalization: preciseAuditNormalization,
    counts: { groups: groups.length, observations: count,
      candidateExplicit: groups.reduce((n, group) => n + group.candidateExplicitPositionObservations, 0),
      referenceExplicit: groups.reduce((n, group) => n + group.referenceExplicitPositionObservations, 0),
      differingElementTypes: groups.reduce((n, group) => n + group.differingElementTypes, 0) },
    groups, canonicalAttributionChanged: false, rendererCauseProven: false, renderingEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.equal(process.argv.length, 2);
  const report = await collectPositionPopulation(), output = JSON.stringify(report, null, 2) + '\n';
  writeFileSync('docs/material-position-input-population.json', output);
  console.log(JSON.stringify({ ...report.counts, sha256: hash(output) }));
}
