import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { collectOverlayAlignmentRecovery, recoverOverlayAlignment } from '../../scripts/audit-overlay-alignment-recovery.mjs';

const root = process.env.ASTYLAR_OVERLAY_EVIDENCE_ROOT ?? process.cwd();
const hash = x => createHash('sha256').update(x).digest('hex');
const file = new URL('../../docs/material-overlay-alignment-recovery.json', import.meta.url);
const bytes = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), saved = JSON.parse(bytes);
const sourceFor = family => {
  const finding = saved.findings.find(f => f.family === family);
  const record = JSON.parse(fs.readFileSync(path.join(root, finding.contextRecord.file)));
  const proof = structuredClone(saved.patterns[finding.pattern].proof);
  return { record, identity: proof.identity, traces: proof.traces };
};
const recover = d => recoverOverlayAlignment(d.record, d.identity, d.traces);

test('replays all 59 original observations and the 91-state owner verifier without writes', async () => {
  const protectedFiles = ['docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz', 'docs/material-remaining-text-alignment.json'];
  const before = protectedFiles.map(f => [path.join(root, f), hash(fs.readFileSync(path.join(root, f)))]);
  const write = fs.writeFileSync;
  let result;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    result = await collectOverlayAlignmentRecovery({ root });
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  assert.equal(hash(JSON.stringify(result, null, 2) + '\n'), hash(bytes), 'complete recovery replay differs');
  for (const [f, digest] of before) assert.equal(hash(fs.readFileSync(f)), digest, f);
  assert.equal(result.groupCount, 2); assert.equal(result.observations, 59);
  assert.equal(result.contextCapture.verifiedCases, 91); assert.equal(result.contextCapture.matchedOwners, 200);
  assert.equal(result.findings.filter(f => f.family === 'bottom-sheet').length, 25);
  assert.equal(result.findings.filter(f => f.family === 'snack-bar').length, 34);
  assert.equal(new Set(result.findings.map(f => f.case)).size, 59);
  for (const p of result.patterns) assert.equal(hash(JSON.stringify(p.proof)), p.sha256);
});

test('keeps the scalar rule defect and observation stages separate from recovered ancestry', () => {
  for (const family of ['bottom-sheet', 'snack-bar']) {
    const result = recover(sourceFor(family));
    assert.equal(result.identity.missingRules[0].declarations['z-index'].value, '1000');
    assert.equal(result.traces.textAlign.referencePath[0].computed, 'start');
    assert.deepEqual(Object.values(result.traces.textAlign.candidatePath[0].localValues),
      ['<omitted>', '<omitted>', '<omitted>']);
    assert.deepEqual(result.externalReferencePath.map(n => n.type), ['div', 'body', 'html']);
    for (const key of ['candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent',
      'rendererCauseProven', 'canonicalAttributionChanged', 'externalStylesheetApplicabilityResolved',
      'candidateInheritanceResolved', 'captureGapExplainsAlignment', 'captureGapExplainsMissingOverlay',
      'originalExternalAncestryCaptured']) assert.equal(result[key], false, key);
    assert.equal(result.referenceExternalAncestryReplayed, true);
  }
});

test('rejects changed identity, erased gaps, incomplete paths and invented equivalence', () => {
  const mutations = [
    d => { d.identity.status = 'mapped'; },
    d => { d.identity.method = 'guessed-selector'; },
    d => { d.identity.checkedReferenceProperties = 1; },
    d => { d.identity.inputEquivalent = true; },
    d => { d.identity.missingRules = []; },
    d => { d.identity.missingRules[0].declarations['z-index'].value = '999'; },
    d => { d.identity.extraRules.push({ selector: 'unknown' }); },
    d => { d.identity.referencePath.pop(); },
    d => { d.identity.candidatePath.pop(); },
    d => { d.traces.textAlign.referencePath.shift(); },
    d => { d.traces.direction.ruleGaps.missing = []; },
    d => { d.traces.writingMode.candidateComputedVerified = true; },
    d => { d.traces.unicodeBidi.renderingEquivalent = true; },
    d => { d.record.context.nodes.push(d.record.context.nodes[0]); },
    d => { d.record.context.errors.push('capture failure'); },
    d => { d.record.context.roots = []; },
    d => { d.record.context.nodes.find(n => n.type === 'html').parent = 'cycle'; },
    d => { delete d.record.context.nodes.find(n => n.type === 'body').computed['text-align']; },
    d => { d.record.context.nodes.find(n => n.type === 'div').computed['text-align'] = 'center'; },
    d => { d.record.candidateReplayed = true; },
  ];
  for (const family of ['bottom-sheet', 'snack-bar']) for (const [i, mutate] of mutations.entries()) {
    const data = sourceFor(family); mutate(data);
    assert.throws(() => recover(data), `unrejected ${family} mutation ${i}`);
  }
});

test('retains explicit requests and CSSOM changes without inventing a computed candidate value', () => {
  const data = sourceFor('snack-bar');
  data.traces.textAlign.candidatePath[0].inline.textAlign = 'right';
  data.record.context.sheets[0].rules.push('body { text-align: right; }');
  const result = recover(data);
  assert.equal(result.traces.textAlign.candidatePath[0].inline.textAlign, 'right');
  assert.notEqual(result.externalStylesheets[0].sha256,
    recover(sourceFor('snack-bar')).externalStylesheets[0].sha256);
  assert.equal(result.externalStylesheetApplicabilityResolved, false);
  assert.equal(result.candidateComputedVerified, false);
});
