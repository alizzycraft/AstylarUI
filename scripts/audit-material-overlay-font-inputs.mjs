import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveOriginAliasPair } from '../tests/material-parity/origin-alias-mapping-evidence.mjs';
import { collectOriginalOverlayContextSurvey } from '../tests/material-parity/original-overlay-context-survey.mjs';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const one = rows => { assert.equal(rows.length, 1, 'unique node required'); return rows[0]; };
const affectsSize = value => Object.keys(value ?? {}).some(k => ['font', 'fontsize', 'all'].includes(k.replaceAll('-', '').toLowerCase()));
const stages = ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle'];
export const overlayFontTargets = {
  'bottom-sheet-overlay': { family: 'bottom-sheet', ref: ['div', 'div'], ast: ['bottom-sheet-overlay', 'bottom-sheet-root', 'page', '<root>'] },
  'bottom-sheet-panel': { family: 'bottom-sheet', ref: ['mat-bottom-sheet-container', 'div', 'div', 'div'], ast: ['bottom-sheet-panel', 'bottom-sheet-overlay', 'bottom-sheet-root', 'page', '<root>'] },
  'dialog-panel': { family: 'dialog', ref: ['div', 'div', 'mat-dialog-container', 'div', 'div', 'div'], ast: ['dialog-panel', 'dialog-overlay', 'dialog-root', 'page', '<root>'] },
  'dialog-actions': { family: 'dialog', ref: ['mat-dialog-actions', 'div', 'div', 'mat-dialog-container', 'div', 'div', 'div'], ast: ['dialog-actions', 'dialog-panel', 'dialog-overlay', 'dialog-root', 'page', '<root>'] },
  'snack-bar-overlay': { family: 'snack-bar', ref: ['div', 'div'], ast: ['snack-bar-overlay', 'snack-bar-root', 'page', '<root>'] },
  'snack-bar-surface': { family: 'snack-bar', ref: ['div', 'mat-snack-bar-container', 'div', 'div', 'div'], ast: ['snack-bar-surface', 'snack-bar-overlay', 'snack-bar-root', 'page', '<root>'] },
};

export function inspectOverlayFontInput(entry, input, reference, candidate, externalContext) {
  const target = overlayFontTargets[input.id]; assert.ok(target); assert.equal(entry.family, target.family);
  const caseId = `interaction:${entry.family}@${entry.profile}/${entry.viewport.id}/${entry.state}`;
  assert.equal(externalContext.case, caseId); assert.equal(externalContext.family, entry.family);
  assert.equal(externalContext.profile, entry.profile); assert.equal(externalContext.state, entry.state);
  assert.deepEqual(externalContext.viewport, entry.viewport);
  assert.deepEqual(externalContext.referenceAncestorContext.map(n => n.type), ['div', 'body', 'html']);
  for (const n of externalContext.referenceAncestorContext) assert.equal(n.fontSize, '16px');
  const mapping = resolveOriginAliasPair(entry, reference, candidate, input);
  assert.ok(['mapped', 'mapped-with-scalar-rule-gap'].includes(mapping.status), mapping.reason);
  const rp = mapping.referencePath.map(key => one(reference.nodes.filter(n => n.key === key)));
  const ap = mapping.candidatePath.map(key => one(candidate.nodes.filter(n => n.key === key)));
  assert.deepEqual(rp.map(n => n.type), target.ref);
  assert.deepEqual(ap.map(n => n.authored.id ?? '<root>'), target.ast);
  assert.equal(rp.at(-1).parent, null); assert.ok(rp.at(-1).attributes.class.split(/\s+/).includes('cdk-overlay-container'));
  assert.ok(!rp.some(n => n.key === 'frame'));
  assert.equal(rp[0].ownText, ''); assert.equal(ap[0].authored.textContent, undefined);
  assert.equal(ap[0].retainedText, undefined); assert.equal(ap[0].paintedControlText, undefined);
  const frame = one(reference.nodes.filter(n => n.key === 'frame'));
  const scale = frame.inline['--scale']?.value; assert.ok(['1', '0.9', '1.15'].includes(scale));
  const pageSize = `${16 * Number(scale)}px`;
  assert.equal(reference.styles[frame.style].fontSize, pageSize);
  const referencePath = rp.map((n, i) => {
    assert.equal(affectsSize(n.inline), false);
    const requests = n.rules.map(index => reference.rules[index]).filter(rule => rule.active === true && affectsSize(rule.declarations));
    if (input.id === 'bottom-sheet-panel' && i === 0) {
      assert.equal(requests.length, 1); assert.equal(requests[0].selector, '.mat-bottom-sheet-container');
      assert.deepEqual(requests[0].conditions, []);
      assert.equal(requests[0].declarations['font-size']?.value,
        'var(--mat-bottom-sheet-container-text-size, var(--mat-sys-body-large-size))');
      assert.equal(Object.hasOwn(requests[0].declarations, 'font'), false); assert.equal(Object.hasOwn(requests[0].declarations, 'all'), false);
    } else assert.equal(requests.length, 0);
    assert.equal(reference.styles[n.style].fontSize, '16px');
    return { key: n.key, parent: n.parent, type: n.type, computedFontSize: '16px', requests };
  });
  assert.ok(candidate.rules.every(rule => Object.values(rule).every(v => v === null || typeof v !== 'object')));
  const candidatePath = ap.map(n => {
    const page = n.authored.id === 'page', root = n.key === 'root';
    if (root) { assert.equal(n.parent, null); assert.deepEqual(n.authored, {}); }
    assert.equal(Object.hasOwn(n.authored, 'style'), false); assert.equal(Object.hasOwn(n.authored.attributes ?? {}, 'style'), false);
    const requests = root ? [] : candidate.rules.filter(rule => affectsSize(rule) || Object.keys(rule).some(k => /^(animation|transition)/i.test(k))).filter(rule => {
      if (['.material-table th', '.material-table td'].includes(rule.selector)) return false;
      return selectorCanApply(rule.selector, n.authored);
    });
    if (page) {
      assert.equal(n.authored.type, 'main'); assert.equal(requests.length, 1);
      assert.equal(requests[0].selector, '#page'); assert.equal(requests[0].fontSize, pageSize);
      assert.ok(Object.keys(requests[0]).every(k => !/^(font|all|animation.*|transition.*|media.*)$/i.test(k)));
    } else assert.equal(requests.length, 0);
    const local = {};
    for (const stage of stages) {
      if (root) { assert.equal(n[stage], undefined); local[stage] = '<uncaptured-document-root>'; continue; }
      assert.equal(n[stage].fontSize, page ? pageSize : undefined);
      assert.equal(Object.hasOwn(n[stage], 'font'), false); assert.equal(Object.hasOwn(n[stage], 'all'), false);
      local[stage] = n[stage].fontSize ?? '<omitted>';
    }
    return { key: n.key, parent: n.parent, authored: n.authored, localFontSize: local, requests };
  });
  assert.equal(input.reference.fontSize, '16px');
  for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage].fontSize, undefined);
  return { mapping, referencePath, candidatePath, replayedReferenceExternalContext: externalContext.referenceAncestorContext,
    referenceComputedFontSize: '16px', candidateLocalFontSize: '<omitted>', candidatePageFontSize: pageSize,
    pageSizeMatchesReferenceOverlay: pageSize === '16px',
    classification: 'application-plugin-authoring-defect',
    attribution: input.id === 'bottom-sheet-panel' ? 'bottom-sheet-container-font-token-omission' : 'overlay-font-inheritance-context-substitution',
    owner: 'Material overlay authoring and inherited font context',
    inputEquivalent: false, candidateComputedFontSizeVerified: false, rendererCauseProven: false, renderingEquivalent: false,
    limitation: 'Original reference owner/root computes 16px outside the frame, while the candidate owner is nested under the scaled #page and has no intervening font-size request. Bottom-sheet container additionally omits its direct Material token. Fresh reference external ancestors independently match the recorded overlay-root size; unrecorded historical body styles are not reconstructed. Matching default page sizes do not establish context preservation across profiles. No candidate used size, descendant text paint, clipping, positioning or overlay visibility is proved.' };
}

export function collectOverlayFontInputs() {
  const contextFile = 'artifacts/material-parity/original-overlay-context-current-ancestry-audit/latest-report.json';
  const context = collectOriginalOverlayContextSurvey(contextFile);
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), findings = [], usedContexts = new Set();
  const boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => { const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes); };
  for (const [kind, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const entry of entries) {
    const key = `${kind}:${entry.family}@${entry.profile}/${entry.viewport.id}${entry.state ? '/' + entry.state : ''}`;
    assert.ok(!seen.has(key)); seen.add(key);
    const inputs = entry.styleInputs.filter(i => Object.hasOwn(overlayFontTargets, i.id));
    if (!inputs.length) continue;
    assert.equal(kind, 'interaction'); const external = one(context.observations.filter(c => c.case === key)); usedContexts.add(key);
    const reference = tree(entry.inputTrees.reference), candidate = tree(entry.inputTrees.astylar);
    for (const input of inputs) findings.push({ case: key, family: entry.family, element: input.id, state: entry.state,
      profile: entry.profile, viewport: entry.viewport, inputTrees: entry.inputTrees,
      originalInputSha256: hash(JSON.stringify(input)), proof: inspectOverlayFontInput(entry, input, reference, candidate, external) });
  }
  assert.equal(seen.size, 2311); assert.equal(findings.length, 182); assert.equal(usedContexts.size, 91);
  const counts = { owners: Object.fromEntries(Object.keys(overlayFontTargets).map(id => [id, findings.filter(f => f.element === id).length])),
    matchingPageSizes: findings.filter(f => f.proof.pageSizeMatchesReferenceOverlay).length,
    differingPageSizes: findings.filter(f => !f.proof.pageSizeMatchesReferenceOverlay).length,
    scalarRuleGapsPreserved: findings.filter(f => f.proof.mapping.status === 'mapped-with-scalar-rule-gap').length };
  assert.deepEqual(counts, { owners: { 'bottom-sheet-overlay': 25, 'bottom-sheet-panel': 25, 'dialog-panel': 32,
    'dialog-actions': 32, 'snack-bar-overlay': 34, 'snack-bar-surface': 34 },
    matchingPageSizes: 94, differingPageSizes: 88, scalarRuleGapsPreserved: 59 });
  const sources = ['examples/material-showcase/src/app/astylar.component.ts',
    'tests/material-parity/origin-alias-mapping-evidence.mjs', 'tests/material-parity/original-overlay-context-survey.mjs'];
  return { schemaVersion: 1, kind: 'original-overlay-font-inheritance-inputs', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, observations: findings.length, contextCases: usedContexts.size, counts, findings,
    referenceContext: { capture: context.capture, independentSurveySha256: hash(JSON.stringify(context)),
      browser: context.browser, originalCandidateReplayed: false, historicalAncestorsReconstructed: false },
    sources: sources.map(file => ({ file, sha256: hash(readFileSync(file, 'utf8').replaceAll('\r\n', '\n')) })),
    canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectOverlayFontInputs(), file = 'docs/material-overlay-font-inputs.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ observations: report.observations, contextCases: report.contextCases,
    counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
