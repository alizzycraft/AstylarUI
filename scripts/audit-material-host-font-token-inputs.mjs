import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { selectorCanApply } from '../tests/material-parity/border-initial-input-evidence.mjs';
import { inspectFontScopeInputs } from './audit-material-font-scope-inputs.mjs';
import { inspectContainerFontStages } from './audit-material-container-font-stages.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
const digest = value => hash(JSON.stringify(value));
const one = values => { assert.equal(values.length, 1); return values[0]; };
const rid = n => n.attributes?.['data-parity-id'] ?? n.attributes?.id;
const properties = { fontFamily: { css: 'font-family', suffix: 'font' },
  fontWeight: { css: 'font-weight', suffix: 'weight' }, letterSpacing: { css: 'letter-spacing', suffix: 'tracking' } };
const targets = {
  toolbar: { prefix: 'toolbar-title', system: 'title-large', properties: ['fontFamily', 'fontWeight', 'letterSpacing'],
    selector: '.mat-toolbar, .mat-toolbar h1, .mat-toolbar h2, .mat-toolbar h3, .mat-toolbar h4, .mat-toolbar h5, .mat-toolbar h6',
    computed: { fontFamily: 'Roboto', fontWeight: '400', letterSpacing: 'normal' } },
  paginator: { prefix: 'paginator-container', system: 'body-small', properties: ['fontFamily', 'fontWeight', 'letterSpacing'],
    selector: '.mat-mdc-paginator', computed: { fontFamily: 'Roboto', fontWeight: '400', letterSpacing: '0.4px' } },
  stepper: { prefix: 'stepper-container', system: 'body-medium', properties: ['fontFamily'],
    selector: '.mat-stepper-vertical, .mat-stepper-horizontal', computed: { fontFamily: 'Roboto' } },
};
const affects = (value, property) => Object.keys(value ?? {}).some(k =>
  ['font', 'all', property.toLowerCase()].includes(k.replaceAll('-', '').toLowerCase()) || /^(animation|transition)/i.test(k));

export function inspectHostFontTokens(family, input, reference, candidate) {
  const target = targets[family]; assert.ok(target);
  // Reuse independent identity/ancestry guards, not their font-size conclusions
  // as evidence for other properties. Each token below is checked separately.
  const identity = family === 'stepper' ? inspectContainerFontStages(family, input, reference, candidate)
    : inspectFontScopeInputs(family, input, reference, candidate);
  const rpath = identity.referencePath.map(p => one(reference.nodes.filter(n => n.key === p.key)));
  const apath = identity.candidatePath.map(p => one(candidate.nodes.filter(n => n.key === p.key)));
  assert.equal(rpath.length, 3); assert.equal(apath.length, 3);
  const findings = [];
  for (const property of target.properties) {
    const { css, suffix } = properties[property];
    const token = `var(--mat-${target.prefix}-text-${suffix}, var(--mat-sys-${target.system}-${suffix}))`;
    const referencePath = rpath.map((node, index) => {
      assert.equal(affects(node.inline, property), false);
      assert.equal(new RegExp(`(?:^|;)\\s*(?:font|all|${css}|animation[^:]*|transition[^:]*)\\s*:`, 'i').test(node.attributes?.style ?? ''), false);
      const requests = node.rules.map(i => reference.rules[i]).filter(rule => rule.active === true && affects(rule.declarations, property));
      const expected = index === 0 ? target.computed[property] : property === 'fontFamily' ? 'Roboto, Arial, sans-serif'
        : property === 'fontWeight' ? '400' : 'normal';
      assert.equal(reference.styles[node.style][property], expected);
      if (index === 0) {
        assert.equal(requests.length, 1); assert.equal(requests[0].selector, target.selector);
        assert.deepEqual(requests[0].declarations[css], { value: token, important: false });
      } else if (index === 2 && property === 'fontFamily') {
        assert.equal(requests.length, 1);
        assert.deepEqual(requests[0].declarations[css], { value: 'Roboto, Arial, sans-serif', important: false });
      } else assert.equal(requests.length, 0);
      for (const rule of requests) assert.deepEqual(Object.keys(rule.declarations).filter(k => affects({ [k]: true }, property)), [css]);
      return { key: node.key, parent: node.parent, type: node.type, id: rid(node) ?? null, inline: node.inline,
        computed: reference.styles[node.style][property], requests };
    });
    const ruleInventory = candidate.rules.filter(rule => affects(rule, property));
    const candidatePath = apath.map((node, index) => {
      const requests = ruleInventory.filter(rule => {
        if (['.material-table th', '.material-table td'].includes(rule.selector) && !['th', 'td'].includes(node.authored.type)) return false;
        return selectorCanApply(rule.selector, node.authored);
      });
      const expected = index === 2 && property === 'fontFamily' ? 'Roboto, Arial, sans-serif' : undefined;
      if (expected) {
        assert.equal(requests.length, 1); assert.equal(requests[0].selector, '#page'); assert.equal(requests[0][property], expected);
        assert.deepEqual(Object.keys(requests[0]).filter(k => affects({ [k]: true }, property)), [property]);
      } else assert.equal(requests.length, 0, 'candidate host/ancestor token request present');
      const values = {};
      for (const stage of ['normalResolvedStyle', 'interactionResolvedStyle', 'resolvedStyle']) {
        assert.equal(node[stage][property], expected);
        assert.deepEqual(Object.keys(node[stage]).filter(k => affects({ [k]: true }, property)), expected ? [property] : []);
        values[stage] = node[stage][property] ?? '<omitted>';
      }
      return { key: node.key, parent: node.parent, authored: node.authored, values, requests };
    });
    assert.equal(input.reference[property], target.computed[property]);
    for (const stage of ['astylar', 'astylarNormalResolvedStyle', 'astylarInteractionResolvedStyle']) assert.equal(input[stage][property], undefined);
    const scalarRequests = input.referenceAuthored.filter(rule => affects(rule.declarations, property));
    assert.equal(scalarRequests.length, 1); assert.equal(scalarRequests[0].selector, target.selector);
    assert.deepEqual(scalarRequests[0].declarations, referencePath[0].requests[0].declarations);
    assert.equal(input.astylarAuthored.filter(rule => affects(rule.declarations, property)).length, 0);
    findings.push({ property, referenceComputed: target.computed[property], referenceToken: token,
      candidateLocalDeclaration: '<omitted>', referencePath, candidatePath,
      candidateRelevantRules: ruleInventory.map(rule => ({ selector: rule.selector, sha256: digest(rule) })),
      classification: 'application-plugin-authoring-defect', attribution: 'component-host-font-token-omission',
      owner: 'Material comparison component typography authoring',
      computedCandidateVerified: false, wholeElementInputEquivalent: false, rendererCauseProven: false,
      renderingEquivalent: false, descendantConsumersVerified: false, themeTokenOriginVerified: false });
  }
  return findings;
}

function history() {
  const file = 'examples/material-showcase/src/app/astylar.component.ts';
  const revision = execFileSync('git', ['rev-parse', '2f44011'], { encoding: 'utf8' }).trim();
  const selectors = ['.toolbar', '.paginator', '.stepper'];
  const excerpt = source => source.split(/\r?\n/).flatMap((line, index) =>
    selectors.some(s => line.includes(`selector: '${s}',`)) ? [{ line: index + 1, text: line.trim() }] : []);
  const initial = execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8' }).replaceAll('\r\n', '\n');
  const current = readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
  const before = excerpt(initial), after = excerpt(current);
  for (const rows of [before, after]) for (const selector of selectors) {
    const matches = rows.filter(r => r.text.includes(`selector: '${selector}',`)); assert.ok(matches.length);
    for (const row of matches) assert.doesNotMatch(row.text, /fontFamily:|fontWeight:|letterSpacing:|\bfont:|\ball:/);
  }
  return { file, initialRevision: revision, initialSourceSha256: hash(initial), currentSourceSha256: hash(current), before, after,
    limitation: 'The selected host omissions exist in both initial and current authoring. This does not prove every intervening revision was identical or attribute intent; prior descendant-size and width/offset findings remain separate.' };
}

export function collectHostFontTokens() {
  const file = 'artifacts/material-parity/current-ancestry-audit/latest-report.json', bytes = readFileSync(file), sha256 = hash(bytes);
  assert.equal(sha256, 'b07ef154485619ce57fdeb25727476077205c1f656430bc32fdc591ed034f93a');
  const original = JSON.parse(bytes), seen = new Set(), observations = [], boundary = realpathSync('artifacts/material-parity') + path.sep;
  const tree = descriptor => {
    const file = realpathSync(descriptor.file); assert.ok(file.startsWith(boundary));
    const bytes = readFileSync(file); assert.equal(hash(bytes), descriptor.sha256); return JSON.parse(bytes);
  };
  for (const [mode, entries] of [['static', original.results], ['interaction', original.interactions]]) for (const e of entries) {
    const caseId = `${mode}:${e.family}@${e.profile}/${e.viewport.id}${e.state ? '/' + e.state : ''}`;
    assert.ok(!seen.has(caseId)); seen.add(caseId); if (!Object.hasOwn(targets, e.family)) continue;
    const input = one(e.styleInputs.filter(i => i.id === e.family + '-primary'));
    const proofs = inspectHostFontTokens(e.family, input, tree(e.inputTrees.reference), tree(e.inputTrees.astylar));
    observations.push({ case: caseId, family: e.family, element: input.id, profile: e.profile, viewport: e.viewport,
      state: e.state ?? 'static', originalInputSha256: digest(input), inputTrees: e.inputTrees, proofs });
  }
  assert.equal(seen.size, 2311); assert.equal(observations.length, 172);
  const counts = Object.fromEntries(Object.keys(targets).map(f => [f, observations.filter(o => o.family === f).length]));
  assert.deepEqual(counts, { toolbar: 52, paginator: 52, stepper: 68 });
  const propertyObservations = observations.reduce((n, o) => n + o.proofs.length, 0); assert.equal(propertyObservations, 380);
  return { schemaVersion: 1, kind: 'original-component-host-font-token-inputs', originalCapture: { file, sha256 },
    originalCasesScanned: seen.size, ownerObservations: observations.length, propertyObservations, counts, observations,
    history: history(), canonicalAttributionChanged: false, rendererChanged: false, inputEquivalent: false, renderingEquivalent: false,
    limitation: 'Explicit component font-family/weight/tracking tokens are missing from candidate host authoring. This is not evidence of a core inheritance failure or visible glyph differences. Component descendants, original theme-token definitions and actual candidate computed/paint consumers remain separate.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2); assert.ok(!args.length || args.length === 1 && args[0] === '--check');
  const report = collectHostFontTokens(), file = 'docs/material-host-font-token-inputs.json', output = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--check') assert.equal(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'), output); else writeFileSync(file, output);
  console.log(JSON.stringify({ ownerObservations: report.ownerObservations, propertyObservations: report.propertyObservations,
    counts: report.counts, reportSha256: hash(output), canonicalAttributionChanged: false }));
}
