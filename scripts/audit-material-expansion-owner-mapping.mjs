import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { inspectExpansionTitleInput } from './audit-material-expansion-title-inputs.mjs';

const hash = x => createHash('sha256').update(x).digest('hex');
const digest = x => hash(JSON.stringify(x));
const one = xs => { assert.equal(xs.length, 1, 'unique reviewed owner required'); return xs[0]; };
const stages = [['astylar', 'resolvedStyle'], ['astylarNormalResolvedStyle', 'normalResolvedStyle'],
  ['astylarInteractionResolvedStyle', 'interactionResolvedStyle']];

export function inspectExpansionOwnerMapping(input, titleInput, reference, candidate) {
  // Reuse the existing exact title/header/panel/section/page path, including
  // original text, node types, ancestry and retained-title provenance checks.
  const identity = inspectExpansionTitleInput(titleInput, reference, candidate);
  assert.equal(input.id, 'expansion-primary'); assert.equal(input.astylarResolvedStyleEvidenceVersion, 2);
  const rp = identity.referencePath.map(p => one(reference.nodes.filter(n => n.key === p.key)));
  const ap = identity.candidatePath.map(p => one(candidate.nodes.filter(n => n.key === p.key)));
  const panel = rp[3], header = rp[2], shell = ap[2], trigger = ap[1];
  assert.equal(panel.attributes.id, input.id); assert.equal(trigger.authored.id, input.id);
  assert.equal(header.parent, panel.key); assert.equal(trigger.parent, shell.key);
  assert.equal(header.attributes.role, 'button'); assert.equal(trigger.authored.role, 'button');
  assert.equal(panel.attributes.role, undefined); assert.equal(shell.authored.role, undefined);
  assert.equal(input.referenceStructure.type, panel.type); assert.equal(input.astylarStructure.type, trigger.authored.type);
  assert.deepEqual(input.astylarStructure.directChildIds, ['expansion-title']);
  assert.deepEqual(candidate.nodes.filter(n => n.parent === shell.key).map(n => n.authored.id),
    ['expansion-primary', 'expansion-chevron', 'expansion-content']);
  for (const [property, value] of Object.entries(input.reference))
    assert.equal(reference.styles[panel.style][property], value, `original scalar is not panel ${property}`);
  assert.equal(Object.keys(input.reference).length, 89);
  for (const [scalar, tree] of stages) assert.deepEqual(input[scalar], trigger[tree], `original candidate ${scalar} is not trigger`);
  const disabled = trigger.authored.ariaDisabled, expanded = trigger.authored.ariaExpanded;
  assert.equal(typeof disabled, 'boolean'); assert.equal(typeof expanded, 'boolean');
  assert.equal(header.attributes['aria-disabled'], String(disabled));
  assert.equal(header.attributes['aria-expanded'], String(expanded));
  assert.equal(header.attributes.tabindex, disabled ? '-1' : '0');
  assert.equal(trigger.authored.tabindex, disabled ? -1 : 0);
  const panelStyle = reference.styles[panel.style], headerStyle = reference.styles[header.style];
  assert.equal(panelStyle.fontWeight, '400'); assert.equal(headerStyle.fontWeight, '500');
  for (const [, stage] of stages) assert.equal(trigger[stage].fontWeight, '500');
  assert.equal(headerStyle.cursor, disabled ? 'auto' : 'pointer');
  assert.equal(trigger.resolvedStyle.cursor, 'pointer');
  const headerRules = header.rules.map(i => reference.rules[i]).filter(r => r.active);
  const typography = one(headerRules.filter(r => r.selector === '.mat-expansion-panel-header'));
  assert.deepEqual(typography.declarations['font-weight'], {
    value: 'var(--mat-expansion-header-text-weight, var(--mat-sys-title-medium-weight))', important: false });
  const pointerRules = headerRules.filter(r => Object.hasOwn(r.declarations, 'cursor'));
  assert.equal(pointerRules.length, disabled ? 0 : 1);
  if (!disabled) {
    assert.equal(pointerRules[0].selector, '.mat-expansion-panel-header:not([aria-disabled="true"])');
    assert.deepEqual(pointerRules[0].declarations.cursor, { value: 'pointer', important: false });
  }
  const candidateTriggerRule = one(candidate.rules.filter(r => r.selector === '.expansion-trigger'));
  assert.equal(candidateTriggerRule.cursor, 'pointer'); assert.equal(candidateTriggerRule.fontWeight, '500');
  return {
    classification: 'parity-harness-defect', attribution: 'same-id-compares-expansion-panel-to-header',
    originalReferenceOwner: { key: panel.key, type: panel.type, attributes: panel.attributes, computed: panelStyle },
    originalCandidateOwner: { key: trigger.key, authored: trigger.authored,
      stages: Object.fromEntries(stages.map(([, s]) => [s, trigger[s]])) },
    structuralCorrespondences: [
      { role: 'panel', referenceKey: panel.key, candidateKey: shell.key, candidateAuthored: shell.authored },
      { role: 'header-button', referenceKey: header.key, candidateKey: trigger.key,
        referenceAttributes: header.attributes, referenceComputed: headerStyle, referenceRules: headerRules,
        candidateRule: candidateTriggerRule },
    ],
    state: { disabled, expanded }, checkedOriginalReferenceProperties: 89,
    fontWeight: { originalReferencePanel: '400', referenceHeader: '500', candidateHeader: '500',
      apparentMismatchFromDifferentRoles: true, renderingEquivalent: false },
    headerCursor: { reference: headerStyle.cursor, candidate: trigger.resolvedStyle.cursor,
      unequal: disabled, classification: disabled ? 'application-plugin-authoring-defect' : 'matching-captured-header-cursor',
      inputEquivalent: false, pointerHitTestingVerified: false },
    inputEquivalent: false, renderingEquivalent: false, rendererCauseProven: false,
    canonicalMappingChanged: false,
    limitation: 'Role correspondence is not structural/style equivalence. The original raw comparison is preserved, not rewritten to matching values. Header font-size/tracking, panel paint, descendant wrappers, hit testing and rendering require their own evidence. The disabled header retains a genuine cursor-authoring difference after the role error is exposed.',
  };
}

export function collectExpansionOwnerMapping() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file);
  assert.equal(hash(bytes), 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = d => { const target = realpathSync(d.file); assert.ok(target.startsWith(boundary));
    const bytes = readFileSync(target); assert.equal(hash(bytes), d.sha256); return JSON.parse(bytes); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${kind}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId); if (e.family !== 'expansion') continue;
    const input = one(e.styleInputs.filter(i => i.id === 'expansion-primary'));
    const title = one(e.styleInputs.filter(i => i.id === 'expansion-title'));
    findings.push({ case: caseId, family: e.family, element: input.id, state: e.state ?? 'static', profile: e.profile,
      viewport: e.viewport, inputTrees: e.inputTrees, originalInputSha256: digest(input), titleInputSha256: digest(title),
      proof: inspectExpansionOwnerMapping(input, title, tree(e.inputTrees.reference), tree(e.inputTrees.astylar)) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 68);
  const sourceFiles = ['examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/astylar.component.ts', 'tests/material-parity/run-material-parity.mjs'];
  const introduced = execFileSync('git', ['rev-parse', '2f44011'], { encoding: 'utf8' }).trim();
  const history = sourceFiles.slice(0, 2).map(file => {
    const before = execFileSync('git', ['show', `${introduced}:${file}`], { encoding: 'utf8' });
    const current = readFileSync(file, 'utf8');
    const matches = text => text.split(/\r?\n/).flatMap((text, i) =>
      /id(?:: |\s*=)["']expansion-primary["']/.test(text) ? [{ line: i + 1, text: text.trim() }] : []);
    const first = one(matches(before)), now = one(matches(current));
    if (file.includes('/reference.')) {
      for (const match of [first, now]) assert.match(match.text, /<mat-expansion-panel id="expansion-primary"/);
    } else {
      assert.match(first.text, /type: 'button', id: 'expansion-primary', class: 'expansion-trigger'/);
      assert.match(now.text, /type: 'div', id: 'expansion-primary', class: `expansion-trigger/);
      for (const match of [first, now]) assert.match(match.text, /id: 'expansion-shell', class: 'expansion-panel', children:/);
    }
    return { file, introduced, introducedSourceSha256: hash(before), currentSourceSha256: hash(current), first, current: now };
  });
  return { schemaVersion: 1, kind: 'original-expansion-panel-header-owner-mapping-audit',
    originalCapture: { file, sha256: hash(bytes) }, originalCasesScanned: seen.size, observations: findings.length,
    counts: { sameIdRoleMismatches: findings.length, headerWeightMatches: findings.length,
      disabledHeaderCursorDifferences: findings.filter(f => f.proof.headerCursor.unequal).length }, findings, history,
    sourceFingerprints: [...sourceFiles, 'scripts/audit-material-expansion-title-inputs.mjs',
      'scripts/audit-material-expansion-owner-mapping.mjs'].map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false,
    historyLimitation: 'The differing diagnostic-ID roles exist in the initial showcase commit and current source. This is not evidence that a later parity fix introduced them, nor proof of any developer intent.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectExpansionOwnerMapping(), file = 'docs/material-expansion-owner-mapping.json';
  const output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
