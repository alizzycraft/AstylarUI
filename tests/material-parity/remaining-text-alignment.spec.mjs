import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import test from 'node:test';
import { collectRemainingTextAlignment, reviewRemainingTextAlignment } from '../../scripts/audit-remaining-text-alignment.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const file = 'docs/material-remaining-text-alignment.json';
const bytes = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), saved = JSON.parse(bytes);
const proofFor = element => structuredClone(saved.patterns.find(p =>
  p.sha256 === saved.groups.find(g => g.element === element).observations[0].proofSha256).proof);

test('remaining alignment review independently replays all 167 observations without writes', () => {
  const before = new Map(['docs/material-input-equivalence-audit.json',
    'docs/material-input-equivalence-audit.json.gz', file]
    .map(f => [f, hash(fs.readFileSync(f))]));
  const write = fs.writeFileSync;
  let actual;
  try {
    fs.writeFileSync = () => { throw Error('CHECK_MODE_ATTEMPTED_WRITE'); }; syncBuiltinESMExports();
    actual = collectRemainingTextAlignment();
  } finally { fs.writeFileSync = write; syncBuiltinESMExports(); }
  // The artifact contract is JSON: the shared mapper includes an optional
  // generatedIdentity:undefined for direct IDs, which JSON omits. Compare the
  // complete emitted bytes, not an object with undefined to its JSON parse.
  assert.equal(hash(JSON.stringify(actual, null, 2) + '\n'), hash(bytes), 'complete serialized source replay differs');
  for (const [f, digest] of before) assert.equal(hash(fs.readFileSync(f)), digest, f);
  assert.equal(saved.groupCount, 5); assert.equal(saved.observations, 167);
  assert.equal(saved.contextGapObservations, 59);
  const identities = saved.groups.flatMap(g => g.observations.map(o => JSON.stringify([o.case, g.element])));
  assert.equal(new Set(identities).size, 167);
  for (const g of saved.groups) {
    assert.equal(g.occurrences, g.observations.length);
    assert.match(g.canonicalRowSha256, /^[0-9a-f]{64}$/);
    for (const o of g.observations) {
      const p = saved.patterns.find(p => p.sha256 === o.proofSha256); assert.ok(p);
      assert.equal(hash(JSON.stringify(p.proof)), p.sha256);
      assert.deepEqual(reviewRemainingTextAlignment(g.element, p.proof), g.review);
    }
  }
});

test('expansion local omission cannot become a computed inheritance or rendering claim', () => {
  const element = 'expansion-title', base = proofFor(element);
  const result = reviewRemainingTextAlignment(element, base);
  assert.equal(result.alignmentInputDisposition, 'stage-mismatch-with-explicit-ancestor');
  assert.equal(result.inheritanceMechanismProven, false);
  const mutations = [
    p => { p.referencePath[0].computed.direction = 'rtl'; },
    p => { p.candidatePath[0].retainedText.textAlign = 'center'; },
    p => { p.candidatePath[0].retainedText.source = 'invented'; },
    p => { p.candidatePath[0].parent = 'different-parent'; },
    p => { p.candidatePath[1].localValues.resolvedStyle = 'center'; },
    p => { p.candidatePath[1].possibleRules[0].mediaMaxWidth = '400px'; },
    p => { p.candidatePath[1].possibleRules[0].selector = ':unreviewed(*)'; },
    p => { p.candidatePath[0].inline.all = 'initial'; },
    p => { p.candidatePath[0].authored.attributes = { style: 'text-align:right!important' }; },
    p => { p.candidateInheritanceResolved = true; },
  ];
  for (const mutate of mutations) { const p = structuredClone(base); mutate(p); assert.throws(() => reviewRemainingTextAlignment(element, p)); }
});

test('progress host requests are preserved rather than classified as absent initial values', () => {
  for (const element of ['progress-bar-primary', 'progress-spinner-primary']) {
    const base = proofFor(element), property = element === 'progress-bar-primary' ? 'text-align' : 'direction';
    const result = reviewRemainingTextAlignment(element, base);
    assert.equal(result.visualImpactProven, false);
    if (property === 'direction') assert.deepEqual(result.relatedAuthoringDifference,
      { property: 'direction', referenceRequest: 'ltr', candidateRequest: '<omitted>' });
    else assert.equal(result.classification, 'application-plugin-authoring-defect');
    const mutations = [
      p => { p.referencePath[0].requests[0].active = false; },
      p => { p.referencePath[0].requests[0].conditions = ['unverified media']; },
      p => { delete p.referencePath[0].requests[0].declarations[property]; },
      p => { p.referencePath[0].requests[0].declarations[property].important = true; },
      p => { p.candidatePath[0].declarations.resolvedStyle.direction = 'ltr'; },
      p => { p.candidatePath[0].authored.type = 'div'; },
    ];
    for (const mutate of mutations) { const p = structuredClone(base); mutate(p); assert.throws(() => reviewRemainingTextAlignment(element, p)); }
  }
});

test('overlay capture gaps remain unresolved alignment context, not a positioning diagnosis', () => {
  for (const element of ['bottom-sheet-overlay', 'snack-bar-overlay']) {
    const base = proofFor(element), result = reviewRemainingTextAlignment(element, base);
    assert.equal(result.alignmentInputDisposition, 'unresolved-context');
    assert.equal(result.captureGapExplainsScalarDifference, false);
    const mutations = [
      p => { p.identity.generatedIdentity.missingRules = []; },
      p => { p.identity.generatedIdentity.missingRules[0].declarations['z-index'].value = '9000'; },
      p => { p.identity.generatedIdentity.extraRules = [{ selector: 'invented' }]; },
      p => { p.status = 'mapped'; },
      p => { p.candidatePath = []; },
    ];
    for (const mutate of mutations) { const p = structuredClone(base); mutate(p); assert.throws(() => reviewRemainingTextAlignment(element, p)); }
  }
});

test('no review promotes source observations to input, rendering, or core-cause equivalence', () => {
  assert.equal(saved.canonicalAttributionChanged, false);
  for (const g of saved.groups) {
    for (const key of ['wholeElementInputEquivalent', 'candidateComputedVerified', 'usedAlignmentVerified',
      'renderingEquivalent', 'rendererCauseProven']) assert.equal(g.review[key], false);
    for (const flag of ['candidateComputedVerified', 'inputEquivalent', 'renderingEquivalent', 'rendererCauseProven']) {
      const p = proofFor(g.element); p[flag] = true;
      assert.throws(() => reviewRemainingTextAlignment(g.element, p));
    }
  }
});
