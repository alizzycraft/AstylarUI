import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, unlinkSync, rmdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { buildMaterialInputAudit, validateMaterialInputAudit, collectFullTreeInventory, collectStyleDiscrepancies,
  collectRetainedTypographyEvidence } from './input-equivalence-audit.mjs';
import { projectFollowupInputAuditInputs } from './followup-input-audit-source-binding.mjs';
import { bindPreciseAuditNormalization } from './audit-normalization-contracts.mjs';
import { bindOwnerInitialStyleSource, collectOwnerInitialStyleEvidence, classifyOwnerInitialStyleInput,
  validateOwnerInitialStyleSource, ownerInitialStyleAttribution } from './owner-initial-style-attribution.mjs';
import { queryFindings } from '../../scripts/audit-findings-store.mjs';

const index = JSON.parse(readFileSync('docs/material-owner-initial-style-membership.json'));
const bytes = readFileSync(index.capture.file);
assert.equal(createHash('sha256').update(bytes).digest('hex'), index.capture.sha256);
const original = JSON.parse(bytes);
const raw = { results: [original.results.find(e => e.family === 'stepper')],
  interactions: [original.interactions.find(e => e.family === 'stepper' && e.state === 'activate')] };
assert.ok(raw.results[0]); assert.ok(raw.interactions[0]);
const folder = mkdtempSync('artifacts/material-parity/owner-initial-integration-test-');
const file = folder + '/capture.json';
writeFileSync(file, JSON.stringify(raw));
after(() => { unlinkSync(file); rmdirSync(folder); });
const binding = bindOwnerInitialStyleSource(raw, { parityPath: file });
const cases = [...raw.results.map(e => ({ ...e, kind: 'static' })), ...raw.interactions.map(e => ({ ...e, kind: 'interaction' }))];
const inventory = collectFullTreeInventory(cases);
const evidence = collectOwnerInitialStyleEvidence(raw, inventory);

test('owner initial attribution binds original cases and replays inventory without promoting omissions to equality', () => {
  assert.equal(binding.status, 'bound');
  assert.deepEqual(validateOwnerInitialStyleSource(binding, evidence), []);
  const proof = evidence.observations.find(p => p.element === 'stepper-content' && p.property === 'fontStyle');
  const input = raw.results[0].styleInputs.find(i => i.id === 'stepper-content');
  const result = classifyOwnerInitialStyleInput(input, 'fontStyle', 'normal', undefined, proof);
  assert.equal(result.attribution, ownerInitialStyleAttribution);
  assert.equal(result.classification, 'parity-harness-defect');
  assert.equal(result.reviewEvidence.computedCandidateVerified, false);
  assert.equal(result.reviewEvidence.renderingEquivalent, false);
  assert.ok(evidence.observations.filter(p => p.element === 'stepper-content' && p.property === 'visibility')
    .every(p => p.issues.some(i => i.reason === 'explicit-relevant-request')));
});

test('owner initial attribution rejects altered sources, observations and false equivalence', () => {
  assert.equal(bindOwnerInitialStyleSource(raw).status, 'unbound');
  const changed = structuredClone(raw); changed.interactions = [];
  assert.equal(bindOwnerInitialStyleSource(changed, { parityPath: file }).status, 'invalid');
  assert.equal(bindOwnerInitialStyleSource(raw, { parityPath: 'package.json' }).status, 'invalid');
  assert.ok(validateOwnerInitialStyleSource({ ...binding, sha256: '0'.repeat(64) }, evidence).length);
  for (const mutate of [
    e => e.observations.pop(),
    e => e.observations.push(structuredClone(e.observations[0])),
    e => { e.observations[0].computedCandidateVerified = true; },
    e => { e.observations[0].referenceValue = 'fabricated'; },
    e => { e.observations[0].issues = [{ reason: 'invented' }]; },
    e => { e.observations[0].case = 'foreign'; },
  ]) {
    const modified = structuredClone(evidence); mutate(modified);
    assert.ok(validateOwnerInitialStyleSource(binding, modified).length);
  }
  const input = raw.results[0].styleInputs.find(i => i.id === 'stepper-content');
  const proof = evidence.observations.find(p => p.element === input.id && p.property === 'fontStyle');
  for (const patch of [{ renderingEquivalent: true }, { computedCandidateVerified: true },
    { source: 'guessed' }, { revision: -1 }, { element: 'foreign' }, { issues: [{ reason: 'explicit-relevant-request' }] }])
    assert.equal(classifyOwnerInitialStyleInput(input, 'fontStyle', 'normal', undefined, { ...proof, ...patch }), undefined);
  assert.equal(classifyOwnerInitialStyleInput(input, 'fontStyle', 'normal', 'normal', proof), undefined);
});

test('descendant color source replay rejects lost membership and altered ancestry', () => {
  const proof = evidence.observations.find(p => p.property === 'color' && p.element === 'stepper-content' && p.descendantColor);
  assert.ok(proof);
  const input = raw.results[0].styleInputs.find(i => i.id === 'stepper-content');
  assert.equal(classifyOwnerInitialStyleInput(input, 'color', proof.referenceValue, undefined, proof)?.attribution,
    ownerInitialStyleAttribution);
  for (const mutate of [
    e => {e.observations = e.observations.filter(p => p.property !== 'color');},
    e => {e.observations.find(p => p.descendantColor).descendantColor.referencePath.pop();},
  ]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateOwnerInitialStyleSource(binding, changed).length);
  }
  const changed = structuredClone(raw);
  changed.results[0].styleInputs.find(i => i.id === input.id).reference.color = 'red';
  assert.equal(bindOwnerInitialStyleSource(changed, {parityPath: file}).status, 'invalid');
});

test('appearance attribution binds original observations and refuses explicit values, auto and missing coverage', () => {
  const proof = evidence.observations.find(p => p.property === 'appearance' && p.issues.length === 0);
  assert.ok(proof, 'the real captured stepper must supply a positive appearance observation');
  const entry = cases.find(e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}` === proof.case);
  const input = entry.styleInputs.find(i => i.id === proof.element);
  const before = JSON.stringify(input);
  assert.equal(classifyOwnerInitialStyleInput(input, 'appearance', 'none', undefined, proof)?.attribution,
    ownerInitialStyleAttribution);
  assert.equal(classifyOwnerInitialStyleInput(input, 'appearance', 'auto', undefined, proof), undefined);
  assert.equal(classifyOwnerInitialStyleInput(input, 'appearance', 'none', 'none', proof), undefined);
  assert.equal(classifyOwnerInitialStyleInput(input, 'appearance', 'none', undefined,
    { ...proof, issues: [{ reason: 'explicit-relevant-request', key: '-webkit-appearance' }] }), undefined);
  for (const patch of [{ renderingEquivalent: true }, { computedCandidateVerified: true }, { referenceValue: 'auto' }])
    assert.equal(classifyOwnerInitialStyleInput(input, 'appearance', 'none', undefined, { ...proof, ...patch }), undefined);
  const missing = structuredClone(evidence);
  missing.observations = missing.observations.filter(p => p.property !== 'appearance');
  assert.ok(validateOwnerInitialStyleSource(binding, missing).length,
    'source replay must reject omission of the newly reviewed property');
  const changed = structuredClone(raw);
  changed.results[0].styleInputs.find(i => i.id === input.id).reference.appearance = 'auto';
  assert.equal(bindOwnerInitialStyleSource(changed, { parityPath: file }).status, 'invalid');
  assert.equal(JSON.stringify(input), before);
});

test('font-weight attribution is source-bound and refuses lost observations or equivalence claims', () => {
  const proof = evidence.observations.find(p => p.property === 'fontWeight' && p.element === 'stepper-content' && !p.issues.length);
  assert.ok(proof);
  const input = raw.results[0].styleInputs.find(i => i.id === proof.element);
  const result = classifyOwnerInitialStyleInput(input, 'fontWeight', '400', undefined, proof);
  assert.equal(result.attribution, ownerInitialStyleAttribution);
  assert.equal(result.classification, 'parity-harness-defect');
  assert.equal(result.reviewEvidence.computedCandidateVerified, false);
  assert.equal(result.reviewEvidence.renderingEquivalent, false);
  for (const patch of [{ referenceValue: '500' }, { renderingEquivalent: true },
    { computedCandidateVerified: true }, { issues: [{ reason: 'explicit-relevant-request', key: 'font' }] }])
    assert.equal(classifyOwnerInitialStyleInput(input, 'fontWeight', '400', undefined, { ...proof, ...patch }), undefined);
  assert.equal(classifyOwnerInitialStyleInput(input, 'fontWeight', '500', undefined, proof), undefined);
  assert.equal(classifyOwnerInitialStyleInput(input, 'fontWeight', '400', '400', proof), undefined);
  for (const mutate of [
    e => { e.observations = e.observations.filter(p => p.property !== 'fontWeight'); },
    e => { e.observations.push(structuredClone(proof)); },
    e => { e.observations.find(p => p.property === 'fontWeight').referencePath = ['fabricated']; },
  ]) {
    const changed = structuredClone(evidence); mutate(changed);
    assert.ok(validateOwnerInitialStyleSource(binding, changed).length);
  }
});

test('appearance precedence preserves an existing panel-header owner mismatch in the production chain', () => {
  const entry = original.results.find(e => e.family === 'expansion');
  assert.ok(entry);
  const supplied = { results: original.results.filter(e => e.family === 'expansion'),
    interactions: original.interactions.filter(e => e.family === 'expansion') };
  const entries = [...supplied.results.map(e => ({ ...e, kind: 'static' })),
    ...supplied.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  assert.equal(entries.length, 68);
  const ownerEvidence = collectOwnerInitialStyleEvidence(supplied, collectFullTreeInventory(entries));
  const proof = ownerEvidence.observations.find(p => p.element === 'expansion-primary' && p.property === 'appearance');
  const input = entry.styleInputs.find(i => i.id === 'expansion-primary');
  assert.equal(classifyOwnerInitialStyleInput(input, 'appearance', 'none', undefined, proof)?.attribution,
    ownerInitialStyleAttribution, 'the regression must exercise genuinely competing classifiers');
  const followup = { binding: { status: 'bound' }, ...projectFollowupInputAuditInputs(
    JSON.parse(readFileSync('docs/material-followup-input-proposal-binding.json')),
    JSON.parse(readFileSync('docs/material-followup-input-transition-dry-run.json')),
    supplied, original, bindPreciseAuditNormalization()) };
  // Supply only the two competing evidence sets to the real production chain.
  // Earlier collection parameters 3..21 and 25 are arrays; 22..24 are wrappers.
  const args = [entries, { observations: [] }, { comparisons: [], differences: [] },
    ...Array.from({ length: 19 }, () => []),
    { observations: [] }, { observations: [] }, { observations: [] }, [], ownerEvidence];
  args[42] = followup;
  const before = JSON.stringify([supplied, ownerEvidence, followup]);
  const find = rows => rows.find(r => r.element === input.id && r.property === 'appearance');
  const row = find(collectStyleDiscrepancies(...args));
  assert.equal(row.attribution, 'reviewed-expansion-panel-header-owner-mismatch');
  assert.equal(row.reviewEvidence.rendererCauseProven, false);
  assert.equal(row.occurrences, 68);
  assert.equal(row.reviewedCases.length, 68);
  assert.deepEqual(row.states, ['static', 'focus', 'hover', 'held', 'activate', 'activate-leave', 'disabled', 'open']);
  assert.equal(row.reference, 'none'); assert.equal(row.astylar, undefined);
  assert.equal(JSON.stringify([supplied, ownerEvidence, followup]), before);
  args[42] = undefined;
  assert.equal(find(collectStyleDiscrepancies(...args)).attribution, ownerInitialStyleAttribution,
    'a remaining unresolved observation must still reach the new fallback');
});

test('font-weight fallback preserves previously reviewed leaf classifications', () => {
  const families = new Set(['badge', 'card', 'divider']);
  const supplied = { results: [], interactions: original.interactions.filter(e => families.has(e.family)) };
  const entries = supplied.interactions.map(e => ({ ...e, kind: 'interaction' }));
  const ownerEvidence = collectOwnerInitialStyleEvidence(supplied, collectFullTreeInventory(entries));
  const followup = { binding: { status: 'bound' }, ...projectFollowupInputAuditInputs(
    JSON.parse(readFileSync('docs/material-followup-input-proposal-binding.json')),
    JSON.parse(readFileSync('docs/material-followup-input-transition-dry-run.json')),
    supplied, original, bindPreciseAuditNormalization()) };
  const wanted = followup.groups.filter(r => r.property === 'fontWeight');
  assert.equal(wanted.length, 4);
  assert.equal(wanted.reduce((n, r) => n + r.occurrences, 0), 96);
  const args = [entries, { observations: [] }, { comparisons: [], differences: [] },
    ...Array.from({ length: 19 }, () => []),
    { observations: [] }, { observations: [] }, { observations: [] }, [], { observations: [] }];
  args[42] = followup;
  const select = rows => rows.filter(r => wanted.some(w => w.element === r.element && r.property === 'fontWeight'));
  const before = select(collectStyleDiscrepancies(...args));
  assert.equal(before.length, 4);
  assert.ok(before.every(r => r.attribution === 'reviewed-leaf-weight-tracking-observation-stage'));
  args[26] = ownerEvidence;
  assert.deepEqual(select(collectStyleDiscrepancies(...args)), before,
    'generic weight evidence must not replace source-reviewed leaf findings');
  args[42] = undefined;
  const fallback = select(collectStyleDiscrepancies(...args));
  assert.equal(fallback.length, 4);
  assert.ok(fallback.every(r => r.attribution === ownerInitialStyleAttribution),
    'test must exercise actual competing classifications');
});

test('font-weight source extension conserves predecessor observations and retained-stage precedence', async () => {
  const file = 'tests/material-parity/owner-initial-style-attribution.mjs';
  const before = execFileSync('git', ['show', `16e7979:${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const restored = current.replace("appearance: 'none', fontWeight: '400'", "appearance: 'none'")
    .replace('reviewedAppearance: true, reviewedFontWeight: true', 'reviewedAppearance: true');
  assert.equal(restored, before, 'only the two reviewed opt-in integration sites may differ');
  const resolved = before.replace(/from '([^']+)'/g, (match, specifier) =>
    specifier.startsWith('.') ? `from '${new URL(specifier, import.meta.url).href}'` : match);
  const previous = await import('data:text/javascript;base64,' + Buffer.from(resolved).toString('base64'));
  const oldEvidence = previous.collectOwnerInitialStyleEvidence(raw, inventory);
  assert.deepEqual({ ...evidence, observations: evidence.observations.filter(p => p.property !== 'fontWeight') }, oldEvidence);
  const retained = collectRetainedTypographyEvidence(cases, inventory);
  const args = [cases, { observations: [] }, retained, ...Array.from({ length: 19 }, () => []),
    { observations: [] }, { observations: [] }, { observations: [] }, [], oldEvidence];
  const oldRows = collectStyleDiscrepancies(...args);
  args[26] = evidence;
  const newRows = collectStyleDiscrepancies(...args);
  assert.deepEqual(newRows.filter(r => r.property !== 'fontWeight'), oldRows.filter(r => r.property !== 'fontWeight'));
  const staticRow = rows => rows.find(r => r.element === 'stepper-content' && r.property === 'fontWeight' && r.states.includes('static'));
  assert.equal(staticRow(oldRows).attribution, 'reviewed-stage-mismatch');
  assert.deepEqual(staticRow(newRows), staticRow(oldRows));
  const interactiveRow = rows => rows.find(r => r.element === 'stepper-content' && r.property === 'fontWeight' && r.states.includes('activate'));
  assert.equal(interactiveRow(oldRows).attribution, 'unresolved');
  assert.equal(interactiveRow(newRows).attribution, ownerInitialStyleAttribution);
  for (const field of ['reference', 'astylar', 'occurrences', 'cases', 'states'])
    assert.deepEqual(interactiveRow(newRows)[field], interactiveRow(oldRows)[field]);
});

test('font-weight attribution replays complete unresolved membership and retains excluded owners', () => {
  const snapshot = { generation: 'fcb44846abf9e0b7a63a0277d3990b8420709765748ef27fb625c2ebf40812a9',
    indexSha256: '95d98fbe2cafb17e8a2ef0d9ed3cd04c3a909637461a684bd237de7bf3bfa4b8' };
  const entries = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const rows = [...new Set(entries.map(e => e.family))]
    .flatMap(f => queryFindings('artifacts/material-parity/working-audit', f, snapshot))
    .filter(r => r.evidence.section === 'discrepancies' && r.attribution === 'unresolved' && r.property === 'fontWeight');
  assert.equal(rows.length, 42);
  const source = bindOwnerInitialStyleSource(original, { parityPath: index.capture.file });
  assert.equal(source.status, 'bound');
  const full = collectOwnerInitialStyleEvidence(original, collectFullTreeInventory(entries));
  const byOwner = new Map(full.observations.map(p => [JSON.stringify([p.case, p.element, p.property]), p]));
  assert.equal(byOwner.size, full.observations.length);
  let groups = 0, occurrences = 0, excluded = 0;
  for (const row of rows) {
    const cases = entries.filter(e => e.family === row.family && row.states.includes(e.state ?? 'static'))
      .flatMap(e => e.styleInputs.filter(i => i.id === row.element && i.reference?.fontWeight === row.reference &&
        i.astylar?.fontWeight === row.astylar).map(input => ({ e, input, case: keyOf(e) })));
    assert.equal(cases.length, row.occurrences);
    assert.equal(new Set(cases.map(c => c.case)).size, cases.length);
    assert.deepEqual(cases.slice(0, 12).map(c => c.case), row.cases);
    assert.deepEqual([...new Set(cases.map(c => c.e.state ?? 'static'))], row.states);
    const outcomes = cases.map(c => classifyOwnerInitialStyleInput(c.input, 'fontWeight', row.reference, row.astylar,
      byOwner.get(JSON.stringify([c.case, row.element, row.property]))));
    assert.equal(new Set(outcomes.map(Boolean)).size, 1, 'mixed eligibility must stay explicit');
    if (outcomes[0]) {
      groups++; occurrences += cases.length;
      for (const result of outcomes) {
        assert.equal(result.attribution, ownerInitialStyleAttribution);
        assert.equal(result.classification, 'parity-harness-defect');
        assert.equal(result.reviewEvidence.computedCandidateVerified, false);
        assert.equal(result.reviewEvidence.renderingEquivalent, false);
      }
    } else excluded += cases.length;
  }
  assert.equal(groups, 20); assert.equal(occurrences, 1142); assert.equal(excluded, 1042);
});

test('owner initial full-population appearance integration preserves native auto and excluded owners', () => {
  // Immutable predecessor, not whichever snapshot happens to be current later.
  const snapshot = { generation: '0a6c0f6defafd4e27f0b93f3d4e732621a8f8a7d4807fc516f09c21270091296',
    indexSha256: 'ed6ddb547a1f61c6c7fecb37a1efaf8df602d504e8927b16b0ac2fee6809bea0' };
  const entries = [...original.results.map(e => ({ ...e, kind: 'static' })),
    ...original.interactions.map(e => ({ ...e, kind: 'interaction' }))];
  const keyOf = e => `${e.kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
  const rows = [...new Set(entries.map(e => e.family))]
    .flatMap(family => queryFindings('artifacts/material-parity/working-audit', family, snapshot))
    .filter(r => r.attribution === 'unresolved' && r.property === 'appearance');
  assert.equal(rows.length, 54);
  const fullBinding = bindOwnerInitialStyleSource(original, { parityPath: index.capture.file });
  assert.equal(fullBinding.status, 'bound');
  const fullInventory = collectFullTreeInventory(entries);
  const fullEvidence = collectOwnerInitialStyleEvidence(original, fullInventory);
  const byOwner = new Map(fullEvidence.observations.map(p => [JSON.stringify([p.case, p.element, p.property]), p]));
  assert.equal(byOwner.size, fullEvidence.observations.length);
  let eligibleGroups = 0, eligibleOccurrences = 0, excludedGroups = 0, excludedOccurrences = 0, autoOccurrences = 0;
  for (const row of rows) {
    const matching = entries.filter(e => e.family === row.family).flatMap(e => e.styleInputs
      .filter(i => i.id === row.element && i.reference?.appearance === row.reference && i.astylar?.appearance === row.astylar)
      .map(input => ({ entry: e, input, case: keyOf(e) })));
    assert.equal(matching.length, row.occurrences);
    assert.deepEqual(matching.slice(0, 12).map(o => o.case), row.cases);
    assert.deepEqual([...new Set(matching.map(o => o.entry.state ?? 'static'))], row.states);
    const dispositions = matching.map(o => {
      const proof = byOwner.get(JSON.stringify([o.case, row.element, 'appearance']));
      const classification = classifyOwnerInitialStyleInput(o.input, 'appearance', row.reference, row.astylar, proof);
      if (classification) {
        assert.equal(classification.classification, 'parity-harness-defect');
        assert.equal(classification.reviewEvidence.computedCandidateVerified, false);
        assert.equal(classification.reviewEvidence.renderingEquivalent, false);
        if (proof.motionReview) {
          assert.ok(proof.issues.length, 'retain original motion issues instead of erasing them');
          assert.match(classification.justification, /same-owner/);
          for (const mutate of [p => { p.motionReview.computedCandidateVerified = true; },
            p => { p.motionReview.proof.revision = -1; },
            p => { p.issues = []; }, p => { p.motionReview.reasons.push('unknown-motion'); }]) {
            const changed = structuredClone(proof); mutate(changed);
            assert.equal(classifyOwnerInitialStyleInput(o.input, 'appearance', row.reference, row.astylar, changed), undefined);
          }
        }
      }
      return !!classification;
    });
    assert.equal(new Set(dispositions).size, 1, 'do not silently split a mixed-eligibility group');
    if (row.reference === 'auto') {
      assert.equal(dispositions[0], false); autoOccurrences += matching.length;
    } else if (dispositions[0]) { eligibleGroups++; eligibleOccurrences += matching.length; }
    else { excludedGroups++; excludedOccurrences += matching.length; }
  }
  assert.deepEqual({ eligibleGroups, eligibleOccurrences, excludedGroups, excludedOccurrences, autoOccurrences },
    { eligibleGroups: 39, eligibleOccurrences: 2427, excludedGroups: 13, excludedOccurrences: 504, autoOccurrences: 156 });
});

test('owner initial canonical integration preserves earlier classifications and enforces exact new attribution coverage', () => {
  const audit = buildMaterialInputAudit(raw, { parityPath: file });
  const ownerRows = audit.discrepancies.filter(r => r.attribution === ownerInitialStyleAttribution);
  assert.ok(ownerRows.length > 0);
  assert.ok(ownerRows.every(r => r.reviewedCases.length === r.occurrences && r.classification === 'parity-harness-defect'));
  const content = audit.discrepancies.filter(r => r.element === 'stepper-content');
  assert.ok(content.some(r => r.attribution === 'reviewed-stage-mismatch'), 'existing static retained-text classification must survive');
  assert.ok(content.some(r => r.property === 'visibility' && r.attribution === 'unresolved'), 'visibility requests must not be waived');
  assert.ok(content.some(r => r.property === 'fontStyle' && r.attribution === ownerInitialStyleAttribution && r.occurrences === 1));
  const errors = a => validateMaterialInputAudit(a, { requireComplete: false }).filter(e => e.includes('owner initial-style'));
  assert.deepEqual(errors(audit), []);
  for (const mutate of [
    a => { a.ownerInitialStyleEvidence.observations.pop(); },
    a => { a.ownerInitialStyleBinding.status = 'unbound'; },
    a => { a.discrepancies = a.discrepancies.filter(r => r.attribution !== ownerInitialStyleAttribution); },
    a => { a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution).classification = 'equivalent-representation'; },
    a => { a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution).reviewedCases = []; },
    a => { a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution).reference = 'wrong'; },
    a => { a.discrepancies.push(structuredClone(a.discrepancies.find(r => r.attribution === ownerInitialStyleAttribution))); },
  ]) {
    const modified = structuredClone(audit); mutate(modified);
    assert.ok(errors(modified).length);
  }
});
