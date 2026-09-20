import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectControlSelfAlignment } from './audit-material-control-self-alignment.mjs';
import { collectContentFlexRequests } from './audit-material-content-flex-requests.mjs';
import { collectBadgeWhitespace } from './audit-material-badge-whitespace.mjs';
import { bindOwnerCaretNormalization } from '../tests/material-parity/owner-caret-source-binding.mjs';
import { readCaretConservationRows } from '../tests/material-parity/owner-caret-canonical-conservation.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const same = (a, b, message) => assert.ok(isDeepStrictEqual(a, b), message);
const revision = '67db724e5f258c84cfdc70e9da2ccb6ee6353ad0';
const definitions = {
  alignment: ['docs/material-control-self-alignment.json', 'f63c2a8791f8fa8be456538d446dde3b9198f06e310cbee01cbbf797142a18db', collectControlSelfAlignment],
  flex: ['docs/material-content-flex-requests.json', '46cdcbaaa758f1bb8661b47d943c39647671ba89dea414fa7b9531fe056aadd9', collectContentFlexRequests],
  whitespace: ['docs/material-badge-whitespace-audit.json', '2bb6325b1e0c409348f1af75209ea121a3b8c4da8d90347d0fac77a0fa9d71e4', collectBadgeWhitespace],
};

// This projection is not an authenticator. The collector requires complete
// fresh source replay before it can be used as an attribution proposal.
export function planLayoutRequestAttribution(sources, rows, normalize) {
  same(Object.keys(sources).sort(), Object.keys(definitions).sort(), 'source population changed');
  const groups = new Map(), members = new Set();
  for (const [kind, source] of Object.entries(sources)) {
    assert.equal(source.casesScanned, 2311); assert.equal(source.canonicalAttributionChanged, false);
    assert.equal(source.findings.length, source.observations);
    const start = members.size;
    for (const f of source.findings) {
      const pattern = kind === 'whitespace' ? undefined : source.patterns[f.pattern];
      if (pattern) assert.equal(pattern.sha256, digest(pattern.proof));
      const proof = kind === 'whitespace' ? f.proof : pattern?.proof; assert.ok(proof);
      assert.equal(proof.inputEquivalent, false); assert.equal(proof.rendererCauseProven, false);
      const properties = kind === 'flex' ? proof.properties : [kind === 'alignment'
        ? { property: f.property, referenceComputed: f.reference, candidateLocal: f.astylar, ...proof }
        : { property: proof.property, referenceComputed: proof.referenceComputed, candidateLocal: proof.candidateLocalDeclaration,
          classification: proof.classification, attribution: proof.attribution }];
      for (const p of properties) {
        assert.equal(p.classification, 'application-plugin-authoring-defect');
        const family = kind === 'whitespace' ? 'badge' : f.family;
        const element = kind === 'whitespace' ? proof.element : f.element;
        const reference = normalize({ [p.property]: p.referenceComputed })[p.property];
        const astylar = normalize({ [p.property]: p.candidateLocal })[p.property];
        assert.notEqual(reference, astylar);
        const identity = JSON.stringify([family, element, p.property, reference, astylar]);
        const member = JSON.stringify([f.case, element, p.property]);
        assert.ok(!members.has(member), 'duplicate source property observation'); members.add(member);
        if (!groups.has(identity)) groups.set(identity, { kind, family, element, property: p.property,
          reference, astylar, attribution: p.attribution, owner: proof.owner ?? 'badge-label authored whitespace request', observations: [] });
        const g = groups.get(identity); assert.equal(g.kind, kind); assert.equal(g.attribution, p.attribution);
        g.observations.push({ case: f.case, originalInputSha256: f.originalInputSha256 ?? f.inputSha256,
          inputTrees: f.inputTrees, proofSha256: digest(proof) });
      }
    }
    assert.equal(members.size - start, source.propertyObservations ?? source.observations,
      'source property population changed');
  }
  const selected = new Set(), proposed = [];
  for (const g of groups.values()) {
    const found = rows.filter(r => r.family === g.family && r.element === g.element && r.property === g.property &&
      r.reference === g.reference && r.astylar === g.astylar && r.attribution === 'unresolved');
    assert.equal(found.length, 1, 'missing or changed unresolved layout request row');
    const row = found[0], cases = g.observations.map(o => o.case);
    assert.equal(row.occurrences, cases.length); same(row.cases, cases.slice(0, 12), 'canonical cases changed');
    same(row.states, [...new Set(cases.map(k => k.startsWith('static:') ? 'static' : k.split('/').slice(2).join('/')))], 'canonical states changed');
    assert.ok(!selected.has(row)); selected.add(row);
    proposed.push({ ...g, canonicalRowSha256: digest(row), occurrences: cases.length,
      proposedClassification: 'application-plugin-authoring-defect',
      proposedAttribution: 'reviewed-' + g.attribution, inputEquivalent: false, renderingEquivalent: false,
      rendererCauseProven: false, compensationNecessityProven: false });
  }
  return { proposedGroups: proposed.length, proposedObservations: members.size, proposed,
    canonicalRows: rows.length, baselineUnresolved: rows.filter(r => r.attribution === 'unresolved').length,
    otherCompleteRows: rows.length - selected.size,
    otherOrderedRowDigestsSha256: digest(rows.filter(r => !selected.has(r)).map(digest)),
    canonicalFilesChanged: false, inputEquivalent: false, renderingEquivalent: false };
}

export async function collectLayoutRequestAttribution() {
  const sources = {}, proofs = {};
  for (const [kind, [file, sha256, collect]] of Object.entries(definitions)) {
    const bytes = readFileSync(file, 'utf8').replaceAll('\r\n', '\n'); assert.equal(hash(bytes), sha256);
    sources[kind] = collect(); same(sources[kind], JSON.parse(bytes), 'complete original source proof must freshly replay');
    proofs[kind] = { file, sha256 };
  }
  const productionNormalization = JSON.parse(readFileSync('docs/material-font-ownership-attribution-plan.json')).productionNormalization;
  assert.equal(productionNormalization.sha256, '8929720cf30769ac3148458bf954402466f6f296c0d764c3123cd797f1e9300e');
  const normalize = bindOwnerCaretNormalization(readFileSync(productionNormalization.module, 'utf8'), productionNormalization);
  const { manifest, rows } = await readCaretConservationRows(file => execFileSync('git',
    ['show', `${revision}:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
  const plan = planLayoutRequestAttribution(sources, rows, normalize);
  assert.equal(plan.proposedGroups, 8); assert.equal(plan.proposedObservations, 492);
  return { schemaVersion: 1, kind: 'source-replayed-layout-request-attribution-proposal',
    proofs, sourceProofsReplayed: true, productionNormalization, canonicalRevision: revision, canonicalPayload: manifest,
    scope: 'Historical proposal only. Unequal authoring is not a demonstrated core defect, visual effect or necessary compensation. Current canonical integration remains separate.', ...plan };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  assert.ok(process.argv.length === 2 || process.argv.length === 3 && process.argv[2] === '--check');
  const report = await collectLayoutRequestAttribution(), output = JSON.stringify(report, null, 2) + '\n';
  const file = 'docs/material-layout-request-attribution-plan.json';
  if (process.argv[2] === '--check') assert.equal(hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')), hash(output));
  else writeFileSync(file, output);
  console.log(JSON.stringify({ groups: report.proposedGroups, observations: report.proposedObservations,
    otherCompleteRows: report.otherCompleteRows, sha256: hash(output), canonicalFilesChanged: false }));
}
