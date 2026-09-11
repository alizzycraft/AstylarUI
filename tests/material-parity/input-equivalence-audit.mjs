import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  implicitReferenceValues,
  inputDifferenceClassifications,
  pluginBoundaryVerdict,
  propertyGroups,
  sourceAuditDefinitions,
} from './input-equivalence-policy.mjs';
import {
  materialFamilies,
  materialInteractionCases,
  materialMobileFlowCases,
  materialProfiles,
  materialStaticCases,
  materialViewports,
} from './benchmark.config.mjs';

export const materialInputAuditSchemaVersion = 2;

const propertyGroupByName = new Map(Object.entries(propertyGroups)
  .flatMap(([group, properties]) => properties.map((property) => [property, group])));

export function parseMaterialInputAuditArguments(args, root = process.cwd()) {
  let parityReport;
  const flags = new Set();
  for (const arg of args) {
    if (arg === '--check' || arg === '--allow-partial') {
      if (flags.has(arg)) throw new Error(`Repeated audit option: ${arg}`);
      flags.add(arg);
    } else if (arg.startsWith('--parity-report=')) {
      if (parityReport !== undefined) throw new Error('Repeated audit option: --parity-report');
      parityReport = arg.slice('--parity-report='.length);
      if (!parityReport.trim()) throw new Error('--parity-report requires a path');
    } else {
      throw new Error(`Unknown audit option: ${arg}`);
    }
  }
  return {
    check: flags.has('--check'),
    allowPartial: flags.has('--allow-partial'),
    parityPath: path.resolve(root, parityReport ?? 'artifacts/material-parity/latest-report.json'),
  };
}

export function buildMaterialInputAudit(parityReport, options = {}) {
  const root = options.root ?? process.cwd();
  const cases = [
    ...(parityReport.results ?? []).map((entry) => ({ ...entry, kind: 'static' })),
    ...(parityReport.interactions ?? []).map((entry) => ({ ...entry, kind: 'interaction' })),
  ];
  const discrepancies = collectStyleDiscrepancies(cases);
  const structures = collectStructureEvidence(cases);
  const sourceFindings = scanMaterialSources(root);
  const coverage = buildCoverage(parityReport, cases);
  const supplementalBehavior = collectSupplementalBehavior(root);
  const supplementalOverlays = collectSupplementalOverlays(root);
  const supplementalSlider = collectSupplementalSlider(root);
  const elementInventory = collectFullTreeInventory([...cases, ...supplementalBehavior.cases, ...supplementalOverlays.cases, ...supplementalSlider.cases], { root });
  const classifications = countBy(discrepancies, (entry) => entry.classification);
  const propertyGroupCounts = countBy(discrepancies, (entry) => entry.propertyGroup);
  const familyCounts = countBy(discrepancies, (entry) => entry.family);
  const unclassified = discrepancies.filter((entry) => !inputDifferenceClassifications.includes(entry.classification));
  const report = {
    schemaVersion: materialInputAuditSchemaVersion,
    generatedFrom: {
      paritySchemaVersion: parityReport.schemaVersion,
      mode: parityReport.mode,
      browser: parityReport.browser,
    },
    contract: {
      layoutCoordinateSpace: 'CSS pixels',
      projectionBoundary: 'Babylon conversion only at final mesh creation or placement',
      pluginRule: 'Plugins extend core APIs and may not replace layout, typography, coordinates, or generic interaction.',
      verdictRule: 'Equal authored/resolved inputs with different output is a core defect; unequal Astylar inputs are never a valid parity fix.',
    },
    environment: auditEnvironment(root),
    sourceFingerprints: sourceFingerprints(root),
    coverage,
    supplementalBehavior,
    supplementalOverlays,
    supplementalSlider,
    summary: {
      inputEquivalent: coverage.complete && coverage.missingElements.length === 0 &&
        supplementalBehavior.missing.length === 0 && supplementalBehavior.errors.length === 0 && supplementalBehavior.mismatches.length === 0 &&
        supplementalOverlays.missing.length === 0 && supplementalOverlays.errors.length === 0 && supplementalOverlays.mismatches.length === 0 &&
        supplementalSlider.missing.length === 0 && supplementalSlider.errors.length === 0 && supplementalSlider.mismatches.length === 0 &&
        elementInventory.gaps.length === 0 && elementInventory.resolvedStyleGaps.length === 0 && elementInventory.stateStyleGaps.length === 0 && elementInventory.errors.length === 0 &&
        coverage.presenceDifferences.length === 0 &&
        sourceFindings.every((entry) => entry.detected && ['equivalent-representation', 'legitimate-public-api-structure'].includes(entry.classification)) &&
        structures.every((entry) => entry.classification === 'legitimate-public-api-structure') &&
        discrepancies.every((entry) => entry.classification === 'equivalent-representation' || entry.classification === 'legitimate-public-api-structure'),
      structureDifferences: structures.filter((entry) => entry.classification !== 'legitimate-public-api-structure').length,
      uniqueStyleDifferences: discrepancies.length,
      totalStyleDifferenceOccurrences: discrepancies.reduce((sum, entry) => sum + entry.occurrences, 0),
      classifications,
      propertyGroups: propertyGroupCounts,
      affectedFamilies: familyCounts,
      unclassifiedDifferences: unclassified.length,
      unresolvedAttributions: discrepancies.filter((entry) => entry.attribution === 'unresolved').length,
      sourceFindings: sourceFindings.length,
      unexplainedSourceFindings: sourceFindings.filter((entry) => !entry.classification).length,
      undetectedSourceDefinitions: sourceFindings.filter((entry) => !entry.detected).length,
    },
    discrepancies,
    structureEvidence: structures,
    elementInventory,
    sourceFindings,
    pluginBoundary: pluginBoundaryVerdict,
    focusedProofs: focusedProofInventory(root),
    implementationPlan: implementationPlan(),
  };
  return report;
}

export function validateMaterialInputAudit(report, { requireComplete = true } = {}) {
  const errors = [];
  if (report.schemaVersion !== materialInputAuditSchemaVersion) errors.push('unexpected audit schema version');
  if (requireComplete && !report.coverage.complete) errors.push('parity evidence does not cover the complete configured matrix');
  if (report.summary.unclassifiedDifferences !== 0) errors.push(`${report.summary.unclassifiedDifferences} style differences are unclassified`);
  if (requireComplete && report.summary.unresolvedAttributions > 0) errors.push(`${report.summary.unresolvedAttributions} resolved-style differences still lack root-cause attribution`);
  if (report.summary.unexplainedSourceFindings !== 0) errors.push(`${report.summary.unexplainedSourceFindings} source findings are unexplained`);
  if (report.summary.undetectedSourceDefinitions !== 0) errors.push(`${report.summary.undetectedSourceDefinitions} expected source findings were not detected`);
  if (report.coverage.missingElements.length > 0) errors.push(`${report.coverage.missingElements.length} measured mappings are missing on one side`);
  if (report.coverage.missingInputEvidence.length > 0) errors.push(`${report.coverage.missingInputEvidence.length} cases lack paired root style evidence`);
  if (report.coverage.duplicateCases.length > 0) errors.push(`${report.coverage.duplicateCases.length} duplicate case records`);
  if (requireComplete && report.elementInventory.gaps.length > 0) errors.push(`${report.elementInventory.gaps.length} case sides lack a full element tree`);
  if (requireComplete && report.elementInventory.resolvedStyleGaps.length > 0) errors.push(`${report.elementInventory.resolvedStyleGaps.length} inventoried elements lack resolved style evidence`);
  if (requireComplete && report.elementInventory.stateStyleGaps.length > 0) errors.push(`${report.elementInventory.stateStyleGaps.length} state cases lack effective style provenance`);
  if (report.elementInventory.errors.length > 0) errors.push(`${report.elementInventory.errors.length} full-tree collection errors`);
  if (requireComplete && report.supplementalBehavior.missing.length > 0) errors.push(`${report.supplementalBehavior.missing.length} supplemental behavior cases are missing`);
  if (report.supplementalBehavior.errors.length > 0) errors.push(`${report.supplementalBehavior.errors.length} supplemental behavior collection errors`);
  if (requireComplete && report.supplementalOverlays.missing.length > 0) errors.push(`${report.supplementalOverlays.missing.length} supplemental overlay cases are missing`);
  if (report.supplementalOverlays.errors.length > 0) errors.push(`${report.supplementalOverlays.errors.length} supplemental overlay collection errors`);
  if (requireComplete && report.supplementalSlider.missing.length > 0) errors.push(`${report.supplementalSlider.missing.length} supplemental slider cases are missing`);
  if (report.supplementalSlider.errors.length > 0) errors.push(`${report.supplementalSlider.errors.length} supplemental slider collection errors`);
  return errors;
}

export function renderMaterialInputAuditMarkdown(report) {
  const lines = [
    '# Material showcase input-equivalence audit',
    '',
    'Counts are review signatures, not counts of confirmed renderer bugs. Browser computed styles include used pixel values, while Astylar resolved styles can retain percentages, auto sizes, and track expressions. Those unresolved comparisons are reported as harness normalization gaps, not accepted equivalence.',
    '',
    `Evidence: complete enforced parity report with ${report.generatedFrom.browser?.name ?? 'browser'} ${report.generatedFrom.browser?.version ?? ''}.`,
    '',
    '## Verdict',
    '',
    `Visual parity is ${report.coverage.visualParityGreen ? 'green' : 'not green'}, but input equivalence is **${report.summary.inputEquivalent ? 'established' : 'not established'}**. ` +
      `The audit found ${report.summary.uniqueStyleDifferences} unique normalized input differences across ${report.summary.totalStyleDifferenceOccurrences} occurrences.`,
    '',
    `${report.summary.unresolvedAttributions} signatures still require authored-rule/cascade/structure attribution. These are evidence gaps, not confirmed authoring or renderer defects; complete audit acceptance rejects them. Source-level findings below carry their own traced evidence.`,
    '',
    `Coverage is ${report.coverage.complete ? 'complete' : 'incomplete'}: ${report.coverage.executedStatic}/${report.coverage.configuredStatic} static cases and ` +
      `${report.coverage.executedInteractions}/${report.coverage.configuredInteractions} interaction/mobile-flow cases. All ${report.coverage.families.length} component families are inventoried.`,
    '',
    `Full-element evidence: ${report.elementInventory.cases.length} captured case sides, ${report.elementInventory.variants.length} tree variants; ${report.elementInventory.gaps.length} missing case sides, ${report.elementInventory.resolvedStyleGaps.length} elements without resolved styles, ${report.elementInventory.stateStyleGaps.length} state cases without effective style provenance, and ${report.elementInventory.errors.length} collection errors. Inventory presence does not establish input equivalence.`,
    '',
    `Supplemental picker behavior: ${report.supplementalBehavior.cases.length}/6 cases captured; ${report.supplementalBehavior.missing.length} missing and ${report.supplementalBehavior.mismatches.length} observed mismatches. These cases cover pointer/keyboard commits and previous/next month navigation omitted by the maintained matrix. Classified behavioral failures remain evidence; they are not counted as successful parity.`,
    '',
    `Supplemental bottom-sheet breakpoints: ${report.supplementalOverlays.cases.length}/3 cases captured; ${report.supplementalOverlays.missing.length} missing and ${report.supplementalOverlays.mismatches.length} observed mismatches. This checks settled geometry at 900, 1024, and 1440 CSS px; the medium breakpoint is absent from the maintained matrix.`,
    '',
    `Supplemental slider full-domain behavior: ${report.supplementalSlider.cases.length}/4 cases captured; ${report.supplementalSlider.missing.length} missing and ${report.supplementalSlider.mismatches.length} observed mismatches. Keyboard stepping and pointer dragging exercise start=60/end=65 and start=30/end=40 without injected state.`,
    '',
    ...report.coverage.presenceDifferences.map((entry) => `- Presence discrepancy: ${entry.case}, ${entry.element}: ${entry.justification}`),
    '',
    'This means the existing screenshot score cannot be used as evidence that the renderer produced parity from equivalent inputs. The classified Astylar-only compensations must be removed through root-cause work; the reference side remains the input truth.',
    '',
    '## Difference classifications',
    '',
    '| Classification | Unique signatures |',
    '| --- | ---: |',
    ...Object.entries(report.summary.classifications).sort().map(([classification, count]) => `| ${classification} | ${count} |`),
    '',
    '## Source-level compensation findings',
    '',
    '| Finding | Classification | Introduced by | Evidence | Owner |',
    '| --- | --- | --- | --- | --- |',
    ...report.sourceFindings.map((finding) =>
      `| ${finding.id} | ${finding.classification} | ${finding.introducedBy} | ${finding.locations.map((location) => `${location.file}:${location.line}`).join(', ')} | ${finding.owner} |`),
    '',
    '## Plugin boundary verdict',
    '',
    `Status: **${report.pluginBoundary.status}**. ${report.pluginBoundary.coordinateFinding}`,
    '',
    'The Material-specific state layers, ripples, progress/range visuals, checkmark, and sort-arrow paint are legitimate plugin work. The tab-panel renderer is not: it rasterizes and positions text through its own DynamicTexture and baseline calculation, which competes with core typography. Connected-overlay placement and ripple bounds are also duplicated in the application. Inspect existing public APIs before deciding whether a new API is necessary.',
    '',
    '## Root-cause implementation order',
    '',
    ...report.implementationPlan.map((item, index) => `${index + 1}. **${item.rootCause}** — ${item.action}`),
    '',
    '## Focused evidence',
    '',
    ...report.focusedProofs.map((proof) => `- ${proof.status}: ${proof.description} (${proof.file}${proof.line ? `:${proof.line}` : ''})`),
    '',
    '## Reading the machine report',
    '',
    'The adjacent JSON report contains normalized discrepancy signatures, occurrence counts, representative cases, exact element/property values, classifications, justifications, authored-rule evidence, coverage case keys, structural mappings, and source locations. elementInventory retains full reference/Astylar trees, including anonymous nodes and generated content, with pooled style/rule tables. Each case side points to a tree variant; reference node and pseudo-element rule/style indices resolve into the shared tables. A check fails for missing full trees, collection errors, unclassified findings, or an incomplete configured matrix.',
    '',
  ];
  return lines.join('\n');
}

function collectStyleDiscrepancies(cases) {
  const grouped = new Map();
  for (const benchmarkCase of cases) {
    const key = caseKey(benchmarkCase);
    for (const input of benchmarkCase.styleInputs ?? []) {
      const reference = canonicalStyle(input.reference ?? {});
      const astylar = canonicalStyle(input.astylar ?? {});
      const properties = new Set([...Object.keys(reference), ...Object.keys(astylar)]);
      for (const property of [...properties].sort()) {
        const referenceValue = reference[property];
        const astylarValue = astylar[property];
        if (equivalentValue(property, referenceValue, astylarValue, reference, astylar)) continue;
        const classification = benchmarkCase.state && input.reference && input.astylar && input.astylarResolvedStyleEvidenceVersion !== 2
          ? { classification: 'parity-harness-defect', owner: 'audit effective pseudo-state style capture',
            justification: 'This interaction capture predates effective-style provenance. It can compare browser state styles against candidate normal-only declarations; recapture with evidence version2 before attributing the difference to authoring or core.' }
          : classifyStyleDifference(property, referenceValue, astylarValue, reference, astylar);
        const signature = JSON.stringify([benchmarkCase.family, input.id, property, referenceValue ?? null, astylarValue ?? null,
          classification.classification, classification.attribution ?? null, classification.justification]);
        let entry = grouped.get(signature);
        if (!entry) {
          entry = {
            family: benchmarkCase.family,
            element: input.id,
            property,
            propertyGroup: propertyGroupByName.get(property) ?? 'other',
            reference: referenceValue,
            astylar: astylarValue,
            classification: classification.classification,
            justification: classification.justification,
            recommendedOwner: classification.owner,
            ...(classification.attribution ? { attribution: classification.attribution } : {}),
            occurrences: 0,
            cases: [],
            states: [],
            referenceAuthoredExamples: compactAuthored(input.referenceAuthored),
            astylarAuthoredExamples: compactAuthored(input.astylarAuthored),
          };
          grouped.set(signature, entry);
        }
        entry.occurrences += 1;
        if (entry.cases.length < 12) entry.cases.push(key);
        const state = benchmarkCase.state ?? 'static';
        if (!entry.states.includes(state)) entry.states.push(state);
      }
    }
  }
  return [...grouped.values()].sort((a, b) =>
    a.family.localeCompare(b.family) || a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

function classifyStyleDifference(property, reference, astylar, referenceStyle, astylarStyle) {
  if (['background', 'flex', 'padding', 'margin', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius', 'gap', 'overflow'].includes(property)) {
    return {
      classification: 'parity-harness-defect',
      justification: `The ${property} shorthand has not been safely expanded into comparable longhands. Retain the declaration (${reference ?? 'omitted'} versus ${astylar ?? 'omitted'}) and resolve its CSS semantics before assigning equivalence or a fixture/core defect.`,
      owner: 'input audit shorthand canonicalization',
    };
  }
  if (property === 'cursor' && [reference, astylar].includes('auto')) {
    return {
      classification: 'parity-harness-defect',
      justification: 'cursor:auto depends on the actual hit target (for example selectable text versus an empty box). These scalar styles cannot establish equivalence to an explicit cursor; compare the maintained effective-cursor probe at the same point and state.',
      owner: 'input audit hit-target context and effective cursor evidence',
    };
  }
  if (['alignItems', 'alignContent', 'justifyContent'].includes(property) && [reference, astylar].includes('normal')) {
    return {
      classification: 'parity-harness-defect',
      justification: 'Alignment normal has layout-dependent semantics. This pair is not a proven flex-context equivalent; preserve the difference until container and item constraints establish its meaning.',
      owner: 'input audit layout-context canonicalization',
    };
  }
  if (astylar === undefined && implicitReferenceValues[property]?.includes(reference)) {
    return {
      classification: 'equivalent-representation',
      justification: `The browser serializes its implicit ${property} used value; Astylar omits the equivalent initial declaration.`,
      owner: 'none',
    };
  }
  if (property === 'transformOrigin' && astylar === undefined &&
      (!referenceStyle.transform || ['none', 'matrix(1,0,0,1,0,0)'].includes(referenceStyle.transform)) &&
      (!astylarStyle.transform || ['none', 'matrix(1,0,0,1,0,0)'].includes(astylarStyle.transform))) {
    return {
      classification: 'equivalent-representation',
      justification: 'Browser transform-origin is a derived used value; Astylar has no transform, so omission carries the same rendering intent.',
      owner: 'none',
    };
  }
  if (property === 'caretColor' && astylar === undefined && reference === astylarStyle.color) {
    return {
      classification: 'equivalent-representation',
      justification: 'An omitted Astylar caret color follows the resolved text color, matching CSS caret-color:auto semantics.',
      owner: 'none',
    };
  }
  const group = propertyGroupByName.get(property) ?? 'other';
  if (group === 'layout' && reference !== undefined && astylar !== undefined &&
      /(?:-?\d+(?:\.\d+)?px)/.test(reference) &&
      /(?:%|\bauto\b|\bfr\b|\b(?:repeat|minmax|calc|var)\()/.test(astylar)) {
    return {
      classification: 'parity-harness-defect',
      justification: `The reference exposes a used pixel value (${reference}) while Astylar retains a layout expression (${astylar}). The harness must compare equivalent authored expressions or authoritative CSS used values before deciding equivalence or assigning an authoring/core defect.`,
      owner: 'input audit canonicalization and core pre-projection CSS layout evidence',
    };
  }
  return {
    classification: 'parity-harness-defect',
    attribution: 'unresolved',
    justification: `The captured ${group} values differ (${reference ?? 'omitted'} versus ${astylar ?? 'omitted'}). Resolved values alone do not distinguish unequal authored declarations from default/cascade resolution, mismapped wrappers, or non-comparable used values. Trace the winning authored rules and corresponding semantic boxes before attributing this signature to the application/plugin or core. Omission is not proof that the fixture omitted the CSS intent.`,
    owner: `input audit ${group} authored-rule and resolution provenance`,
  };
}

function canonicalStyle(style) {
  const result = Object.fromEntries(Object.entries(style).map(([property, value]) =>
    [property === 'wordWrap' ? 'overflowWrap' : property, normalizeValue(property, value)]));
  // Only a single recognized color can be represented by backgroundColor here.
  // Preserve image/layer/position/reset declarations and ambiguous shorthand +
  // longhand pairs; object insertion order is not a CSS cascade proof.
  if (result.background !== undefined && result.backgroundColor === undefined && normalizeColor(result.background)) {
    result.backgroundColor = result.background;
    delete result.background;
  }
  expandQuad(result, 'padding', ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']);
  expandQuad(result, 'margin', ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']);
  expandQuad(result, 'borderWidth', ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']);
  expandQuad(result, 'borderStyle', ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle']);
  expandQuad(result, 'borderColor', ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']);
  expandQuad(result, 'borderRadius', ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']);
  expandPair(result, 'gap', ['rowGap', 'columnGap']);
  expandPair(result, 'overflow', ['overflowX', 'overflowY']);
  return result;
}

function expandQuad(style, shorthand, longhands) {
  if (style[shorthand] === undefined) return;
  const parts = splitCssTerms(style[shorthand]);
  if (parts.length < 1 || parts.length > 4 || parts.some((part) => part.includes('/'))) return;
  const values = parts.length === 1 ? [parts[0], parts[0], parts[0], parts[0]]
    : parts.length === 2 ? [parts[0], parts[1], parts[0], parts[1]]
      : parts.length === 3 ? [parts[0], parts[1], parts[2], parts[1]] : parts;
  for (let index = 0; index < longhands.length; index += 1) {
    if (style[longhands[index]] === undefined) style[longhands[index]] = values[index];
  }
  delete style[shorthand];
}

function expandPair(style, shorthand, longhands) {
  if (style[shorthand] === undefined) return;
  const parts = splitCssTerms(style[shorthand]);
  if (parts.length === 0 || parts.length > 2) return;
  if (style[longhands[0]] === undefined) style[longhands[0]] = parts[0];
  if (style[longhands[1]] === undefined) style[longhands[1]] = parts[1] ?? parts[0];
  delete style[shorthand];
}

function splitCssTerms(value) {
  const result = [];
  let depth = 0;
  let token = '';
  for (const character of String(value).trim()) {
    if (character === '(') depth += 1;
    if (character === ')') depth -= 1;
    if (/\s/.test(character) && depth === 0) {
      if (token) result.push(token), token = '';
    } else token += character;
  }
  if (token) result.push(token);
  return result;
}

function normalizeValue(property, value) {
  if (value === undefined || value === null || value === '') return undefined;
  // URL paths, custom property names, and string contents can be case-sensitive.
  // Do not lowercase or collapse whitespace inside these token streams.
  if (property !== 'fontFamily' && /\b(?:url|var|env)\s*\(|["']/i.test(String(value))) return String(value).trim();
  let normalized = String(value).trim().replace(/\s+/g, ' ');
  if (property === 'fontFamily') return normalized.replace(/["']/g, '').replace(/\s*,\s*/g, ',').toLowerCase();
  if (property === 'fontWeight' && normalized.toLowerCase() === 'bold') return '700';
  const color = normalizeColor(normalized);
  if (color) return color;
  normalized = normalized.replace(/(^|[ (,:])(-?\d*\.?\d+)px(?=$|[ ),])/g, (_match, prefix, number) =>
    `${prefix}${formatNumber(Number(number))}px`);
  // A zero percentage can retain a dependency on a definite containing size
  // (notably flex-basis). It is not universally equivalent to an absolute zero.
  normalized = normalized.replace(/(^|[ (,:])-?0(?:\.0+)?(?:px|em|rem)?(?=$|[ ),])/g, '$10');
  return normalized.toLowerCase().replace(/,\s+/g, ',');
}

function normalizeColor(value) {
  const lower = value.toLowerCase();
  if (lower === 'transparent') return 'rgba(0,0,0,0)';
  const hex = lower.match(/^#([0-9a-f]{3,8})$/)?.[1];
  if (hex) {
    const expanded = hex.length <= 4 ? [...hex].map((channel) => channel + channel).join('') : hex;
    if (![6, 8].includes(expanded.length)) return undefined;
    const channels = [0, 2, 4].map((index) => Number.parseInt(expanded.slice(index, index + 2), 16));
    const alpha = expanded.length === 8 ? Number.parseInt(expanded.slice(6, 8), 16) / 255 : 1;
    return `rgba(${channels.join(',')},${formatNumber(alpha)})`;
  }
  const rgb = lower.match(/^rgba?\(([^)]+)\)$/);
  if (rgb) {
    const channels = rgb[1].replace(/\//g, ' ').split(/[ ,]+/).filter(Boolean).map(Number);
    if (channels.length >= 3 && channels.every(Number.isFinite)) {
      return `rgba(${channels.slice(0, 3).map((channel) => formatNumber(channel)).join(',')},${formatNumber(channels[3] ?? 1)})`;
    }
  }
  const srgb = lower.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
  if (srgb) {
    const channels = srgb.slice(1, 4).map((channel) => Math.round(Number(channel) * 255));
    return `rgba(${channels.join(',')},${formatNumber(Number(srgb[4] ?? 1))})`;
  }
  return undefined;
}

function equivalentValue(property, reference, astylar, referenceStyle, astylarStyle) {
  if (reference === astylar) return true;
  if (property === 'caretColor' && astylar === undefined && reference === astylarStyle.color) return true;
  if (property === 'lineHeight' && reference === 'normal' && astylar === undefined) return true;
  const bothFlex = [referenceStyle.display, astylarStyle.display].every((display) => ['flex', 'inline-flex'].includes(display));
  if (bothFlex && reference === 'normal' && (
    (['alignItems', 'alignContent'].includes(property) && astylar === 'stretch') ||
    (property === 'justifyContent' && astylar === 'flex-start'))) return true;
  if (property === 'opacity' && Number(reference) === Number(astylar)) return true;
  return false;
}

function collectStructureEvidence(cases) {
  const grouped = new Map();
  for (const benchmarkCase of cases) {
    for (const input of benchmarkCase.styleInputs ?? []) {
      if (!input.referenceStructure && !input.astylarStructure) continue;
      const signature = JSON.stringify([benchmarkCase.family, input.id, input.referenceStructure, input.astylarStructure]);
      const compatibleEvidence = input.referenceStructure?.schemaVersion === 2 && input.astylarStructure?.schemaVersion === 2;
      const sameMappedContent = compatibleEvidence &&
        input.referenceStructure.text === input.astylarStructure.text &&
        JSON.stringify(input.referenceStructure.descendantIds) === JSON.stringify(input.astylarStructure.descendantIds);
      const sameType = compatibleEvidence && input.referenceStructure.type === input.astylarStructure.type &&
        typeof input.referenceStructure.type === 'string';
      if (!grouped.has(signature)) grouped.set(signature, {
        family: benchmarkCase.family,
        element: input.id,
        reference: input.referenceStructure,
        astylar: input.astylarStructure,
        classification: !compatibleEvidence ? 'parity-harness-defect' : sameMappedContent
          ? sameType ? 'legitimate-public-api-structure' : 'parity-harness-defect'
          : 'application-plugin-authoring-defect',
        justification: !compatibleEvidence
          ? 'Legacy collectors compare reference subtree text and requested-ID order against Astylar own text and all descendant IDs. Recapture with structural schema 2 before attributing this signature to the fixture.'
          : sameMappedContent
          ? sameType
            ? 'Mapped tag, content and descendant order agree. This accepts only those recorded fields; anonymous wrappers, generated content, layout and paint require the separate full-tree and style evidence.'
            : 'Mapped content and descendant order agree, but differing host types are not proof of equivalent structure. Review wrapper styles, generated content, defaults and layout ownership in the full trees before accepting a public-API representation.'
          : 'Mapped content or containment differs. The mapping/fixture must be reconciled before claiming equivalent structure; framework wrapper differences alone do not justify accepting it.',
        occurrences: 0,
        cases: [],
      });
      const entry = grouped.get(signature);
      entry.occurrences += 1;
      if (entry.cases.length < 8) entry.cases.push(caseKey(benchmarkCase));
    }
  }
  return [...grouped.values()];
}

export function collectFullTreeInventory(cases, { root = process.cwd() } = {}) {
  const styles = [], rules = [], variants = [], mappings = [], gaps = [], resolvedStyleGaps = [], stateStyleGaps = [], envelopes = [], errors = [];
  const styleIds = new Map(), ruleIds = new Map(), variantIds = new Map();
  const intern = (value, table, index) => {
    const key = JSON.stringify(value);
    if (!index.has(key)) { index.set(key, table.length); table.push(value); }
    return index.get(key);
  };
  for (const entry of cases) {
    const key = caseKey(entry);
    for (const side of ['reference', 'astylar']) {
      let tree = entry.inputTrees?.[side];
      if (tree?.file) {
        try {
          const file = path.resolve(root, tree.file);
          const allowed = path.resolve(root, 'artifacts/material-parity') + path.sep;
          if (!file.startsWith(allowed)) throw new Error('tree path is outside Material artifacts');
          const contents = readFileSync(file, 'utf8');
          if (createHash('sha256').update(contents).digest('hex') !== tree.sha256) throw new Error('tree digest changed since capture');
          tree = JSON.parse(contents);
        } catch (error) {
          errors.push({ case: key, side, error: String(error) });
          tree = undefined;
        }
      }
      if (tree?.schemaVersion !== 1 || !Array.isArray(tree.nodes) || tree.nodes.length === 0) {
        gaps.push({ case: key, side }); continue;
      }
      for (const error of tree.errors ?? []) errors.push({ case: key, side, error });
      if (side === 'astylar' && entry.state && tree.resolvedStyleEvidenceVersion !== 2) stateStyleGaps.push({ case: key, side,
        classification: 'parity-harness-defect', owner: 'audit effective pseudo-state style capture',
        justification: 'Tree does not identify normal and effective core state-style provenance. Normal-only legacy snapshots cannot establish complete state input evidence.' });
      for (const node of tree.nodes) {
        // The SiteData root envelope has children but no element type/identity.
        // Retain it in the tree; do not confuse it with a missing element mesh.
        if (side === 'astylar' && node.key === 'root' && node.parent === null &&
            node.authored && Object.keys(node.authored).length === 0) {
          envelopes.push({ case: key, node: node.key, justification: 'SiteData structural root envelope, not an authored element.' });
          continue;
        }
        const style = side === 'reference' ? tree.styles?.[node.style] : node.resolvedStyle;
        if (!style || Object.keys(style).length === 0) resolvedStyleGaps.push({ case: key, side, node: node.key,
          element: side === 'reference' ? node.attributes?.id : node.authored?.id,
          classification: 'parity-harness-defect', owner: 'input collector pre-projection style resolution evidence',
          justification: 'The authored/DOM node is inventoried but has no resolved-style snapshot. Hidden or non-rendered nodes still require style evidence; missing mesh metadata must not count as complete capture.' });
      }
      const ruleMap = (tree.rules ?? []).map((value) => intern({ side, value }, rules, ruleIds));
      const styleMap = (tree.styles ?? []).map((value) => intern({ side, value }, styles, styleIds));
      const nodes = tree.nodes.map((node) => side === 'reference' ? {
        ...node, style: styleMap[node.style], rules: node.rules.map((index) => ruleMap[index]),
        pseudoElements: node.pseudoElements.map((pseudo) => ({ ...pseudo,
          style: pseudo.style === undefined ? undefined : styleMap[pseudo.style],
          rules: pseudo.rules.map((index) => ruleMap[index]),
        })),
      } : {
        ...node, resolvedStyle: undefined, normalResolvedStyle: undefined, interactionResolvedStyle: undefined,
        style: node.resolvedStyle ? intern({ side, value: node.resolvedStyle }, styles, styleIds) : undefined,
        normalStyle: node.normalResolvedStyle ? intern({ side, value: node.normalResolvedStyle }, styles, styleIds) : undefined,
        interactionStyle: node.interactionResolvedStyle ? intern({ side, value: node.interactionResolvedStyle }, styles, styleIds) : undefined,
      });
      const variant = intern({ family: entry.family, side, resolvedStyleEvidenceVersion: tree.resolvedStyleEvidenceVersion,
        resolvedStyleSource: tree.resolvedStyleSource, nodes, rules: ruleMap }, variants, variantIds);
      mappings.push({ case: key, side, variant, resolvedStyleRevision: tree.resolvedStyleRevision });
    }
  }
  return {
    schemaVersion: 1,
    scope: 'All authored Astylar nodes, reference frame/overlay DOM descendants, SVG attributes, and before/after pseudo-elements. Tables retain raw inputs; presence in the inventory is not acceptance of equivalence.',
    styles, rules, variants, cases: mappings, gaps, resolvedStyleGaps, stateStyleGaps, envelopes, errors,
  };
}

export function collectSupplementalBehavior(root) {
  const file = 'artifacts/material-parity/picker-commit-audit/latest-report.json';
  if (!existsSync(path.resolve(root, file))) return { file, ...summarizeSupplementalBehavior({}) };
  const contents = readFileSync(path.resolve(root, file));
  return { file, sha256: createHash('sha256').update(contents).digest('hex'), ...summarizeSupplementalBehavior(JSON.parse(contents)) };
}

export function collectSupplementalOverlays(root) {
  const file = 'artifacts/material-parity/overlay-breakpoint-audit/latest-report.json';
  if (!existsSync(path.resolve(root, file))) return { file, ...summarizeSupplementalOverlays({}) };
  const contents = readFileSync(path.resolve(root, file));
  return { file, sha256: createHash('sha256').update(contents).digest('hex'), ...summarizeSupplementalOverlays(JSON.parse(contents)) };
}

export function collectSupplementalSlider(root) {
  const file = 'artifacts/material-parity/slider-domain-audit/latest-report.json';
  if (!existsSync(path.resolve(root, file))) return { file, ...summarizeSupplementalSlider({}) };
  const contents = readFileSync(path.resolve(root, file));
  return { file, sha256: createHash('sha256').update(contents).digest('hex'), ...summarizeSupplementalSlider(JSON.parse(contents)) };
}

export function summarizeSupplementalSlider(raw) {
  const required = ['keyboard', 'pointer'].flatMap((method) => ['start', 'end'].map((thumb) => `${method}-${thumb}-full-domain`));
  const errors = [];
  const cases = (raw.results ?? []).map((entry) => {
    const key = entry.state;
    if (!required.includes(key) || entry.family !== 'slider' || key !== `${entry.method}-${entry.thumb}-full-domain` ||
        raw.profile !== 'light' || raw.deviceScaleFactor !== 1 || raw.viewport?.width !== 1440 || raw.viewport?.height !== 900) {
      errors.push({ case: key, error: 'unexpected slider case or environment' });
    }
    const expected = entry.thumb === 'start' ? { start: 60, end: 65 } : { start: 30, end: 40 };
    const count = entry.method === 'pointer' ? 14 : entry.thumb === 'start' ? 7 : 6;
    const reached = {};
    for (const side of ['reference', 'astylar']) {
      const trace = entry[side]?.trace;
      const valid = Array.isArray(trace) && trace.length === count && trace.every((sample) => ['start', 'end'].every((thumb) =>
        ['value', 'min', 'max', 'step'].every((property) => sample[thumb]?.[property] !== undefined &&
          sample[thumb][property] !== '' && Number.isFinite(Number(sample[thumb][property])))));
      if (!valid) errors.push({ case: key, side, error: 'missing or invalid slider trace' });
      for (const error of entry[side]?.errors ?? ['missing side errors']) errors.push({ case: key, side, error });
      reached[side] = valid && ['start', 'end'].every((thumb) => Number(trace.at(-1)[thumb].value) === expected[thumb]) &&
        trace.every((sample, index) => ['start', 'end'].every((thumb) => {
          const value = Number(sample[thumb].value);
          const initial = thumb === 'start' ? 30 : 65;
          if (Number(sample[thumb].step) !== 5 || value % 5 !== 0) return false;
          if (thumb !== entry.thumb || index === 0) return value === initial;
          const direction = thumb === 'start' ? 1 : -1;
          if (entry.method === 'keyboard') return value === initial + direction * index * 5;
          const delta = (value - Number(trace[index - 1][thumb].value)) * direction;
          return delta >= 0 && delta <= 5;
        }));
      if (side === 'reference' && valid && !reached[side]) errors.push({ case: key, side, error: 'reference did not establish the expected full-domain action' });
    }
    return { ...entry, expected, kind: 'supplemental', profile: raw.profile,
      viewport: { ...raw.viewport, deviceScaleFactor: raw.deviceScaleFactor, id: 'supplemental-desktop-dpr1' },
      matches: reached.reference && reached.astylar && !errors.some((error) => error.case === key),
      inputTrees: { reference: entry.reference?.inputTree, astylar: entry.astylar?.inputTree } };
  });
  const keys = cases.map((entry) => entry.state);
  if (new Set(keys).size !== keys.length) errors.push({ error: 'duplicate supplemental slider case' });
  return { browser: raw.browser, cases, errors, missing: required.filter((key) => !keys.includes(key)),
    mismatches: cases.filter((entry) => !entry.matches && !errors.some((error) => !error.case || error.case === entry.state))
      .map((entry) => ({ family: entry.family, state: entry.state,
        classification: 'application-plugin-authoring-defect', owner: 'showcase range domain and step/state normalization',
        justification: 'Equivalent real actions expose the candidate fixed half-domains and step1 inputs versus reference step5 and peer-constrained full-domain thumbs. Candidate shared-state rounding adds discontinuities. Native attributes, intermediate values, and full input trees retain the evidence; no core targeting defect is inferred from unequal inputs.' })) };
}

export function summarizeSupplementalOverlays(raw) {
  const required = [900, 1024, 1440].map((width) => `bottom-sheet/open/${width}x900`);
  const errors = [];
  const cases = (raw.results ?? []).map((entry) => {
    const key = `${entry.family}/${entry.state}/${entry.viewport?.width}x${entry.viewport?.height}`;
    if (!required.includes(key) || raw.profile !== 'light' || raw.deviceScaleFactor !== 1) {
      errors.push({ case: key, error: 'unexpected overlay case or environment' });
    }
    const boxes = ['reference', 'astylar'].map((side) => entry[side]?.box);
    const valid = boxes.every((box) => box && ['left', 'top', 'width', 'height'].every((property) => Number.isFinite(box[property])) && box.width > 0 && box.height > 0);
    if (!valid) errors.push({ case: key, error: 'missing or invalid overlay geometry' });
    for (const side of ['reference', 'astylar']) {
      for (const error of entry[side]?.errors ?? ['missing side errors']) errors.push({ case: key, side, error });
    }
    const geometryError = valid ? Math.max(...['left', 'top', 'width', 'height'].map((property) => Math.abs(boxes[0][property] - boxes[1][property]))) : null;
    return { ...entry, kind: 'supplemental', profile: raw.profile,
      viewport: { ...entry.viewport, deviceScaleFactor: raw.deviceScaleFactor, id: `supplemental-${entry.viewport?.width}-dpr1` },
      geometryError, matches: valid && geometryError <= 0.5 && !errors.some((error) => error.case === key),
      inputTrees: { reference: entry.reference?.inputTree, astylar: entry.astylar?.inputTree } };
  });
  const keys = cases.map((entry) => `${entry.family}/${entry.state}/${entry.viewport.width}x${entry.viewport.height}`);
  if (new Set(keys).size !== keys.length) errors.push({ error: 'duplicate supplemental overlay case' });
  return { browser: raw.browser, cases, errors, missing: required.filter((key) => !keys.includes(key)),
    mismatches: cases.filter((entry) => entry.geometryError !== null && entry.geometryError > 0.5 &&
      !errors.some((error) => !error.case || error.case === `${entry.family}/${entry.state}/${entry.viewport.width}x${entry.viewport.height}`))
      .map((entry) => ({ family: entry.family, state: entry.state, viewport: entry.viewport,
      classification: 'application-plugin-authoring-defect', owner: 'showcase bottom-sheet responsive constraints',
      justification: 'Reference responsive minimum widths and content flow are replaced by fixed candidate dimensions. The medium breakpoint width differs after settling; inspect full input trees. Collection errors remain separate audit failures, not confirmed rendering defects.' })) };
}

export function summarizeSupplementalBehavior(raw) {
  const required = ['datepicker/open-commit-pointer', 'datepicker/open-commit-keyboard',
    'timepicker/open-commit-pointer', 'timepicker/open-commit-keyboard',
    'datepicker/open-previous-month', 'datepicker/open-next-month'];
  const cases = (raw.results ?? []).map((entry) => ({ ...entry, kind: 'supplemental', profile: raw.profile,
    matches: entry.state.includes('commit')
      ? typeof entry.reference?.value === 'string' && entry.reference.value.length > 0 && entry.reference?.open === false &&
        entry.reference.value === entry.astylar?.value && entry.reference.open === entry.astylar?.open
      : typeof entry.reference?.before === 'string' && typeof entry.reference?.after === 'string' && entry.reference.before !== entry.reference.after &&
        entry.reference.before === entry.astylar?.before && entry.reference.after === entry.astylar?.after,
    viewport: { ...raw.viewport, id: 'supplemental-desktop-dpr1' },
    inputTrees: { reference: entry.reference?.inputTree, astylar: entry.astylar?.inputTree } }));
  const keys = cases.map((entry) => `${entry.family}/${entry.state}`);
  const errors = cases.flatMap((entry) => ['reference', 'astylar'].flatMap((side) =>
    (entry[side]?.errors ?? ['missing side']).map((error) => ({ case: `${entry.family}/${entry.state}`, side, error }))));
  if (new Set(keys).size !== keys.length) errors.push({ error: 'duplicate supplemental behavior case' });
  return { browser: raw.browser, cases,
    missing: required.filter((key) => !keys.includes(key)), errors,
    mismatches: cases.filter((entry) => !entry.matches).map((entry) => ({ family: entry.family, state: entry.state,
      classification: 'application-plugin-authoring-defect', owner: 'showcase picker state and interaction logic',
      justification: 'Reference value/open state or displayed month differs after the same delivered input. Inspect the per-side event and input-tree evidence; current source has no picker commit/navigation state handler.' })) };
}

function buildCoverage(parityReport, cases) {
  const expectedStatic = new Set(materialStaticCases.map((entry) => caseKey({ ...entry, kind: 'static' })));
  const expectedInteractions = new Set([...materialInteractionCases, ...materialMobileFlowCases]
    .map((entry) => caseKey({ ...entry, kind: 'interaction' })));
  const actualStatic = new Set((parityReport.results ?? []).map((entry) => caseKey({ ...entry, kind: 'static' })));
  const actualInteractions = new Set((parityReport.interactions ?? []).map((entry) => caseKey({ ...entry, kind: 'interaction' })));
  const elementMappings = Object.fromEntries(materialFamilies.map((family) => [family,
    [...new Set(cases.filter((entry) => entry.family === family)
      .flatMap((entry) => (entry.styleInputs ?? []).map((input) => input.id)))].sort()]));
  const oneSidedElements = cases.flatMap((entry) => (entry.styleInputs ?? []).flatMap((input) =>
    input.reference === undefined || input.astylar === undefined
      ? [{ case: caseKey(entry), element: input.id, referencePresent: input.reference !== undefined, astylarPresent: input.astylar !== undefined }]
      : []));
  // This is observed state divergence, not a selector waiver: the reference
  // tooltip closes on click, while the benchmark-only Astylar click handler
  // forces state.open=true. Keep the case and its unequal input in the audit.
  const presenceDifferences = oneSidedElements.filter((entry) =>
    /^interaction:tooltip@[^/]+\/[^/]+\/open$/.test(entry.case) &&
    entry.element === 'tooltip-popup' && !entry.referencePresent && entry.astylarPresent)
    .map((entry) => ({ ...entry,
      classification: 'application-plugin-authoring-defect',
      file: 'examples/material-showcase/src/app/astylar.component.ts',
      symbol: 'handleClick: tooltip-primary benchmarkInteraction === open',
      recommendedOwner: 'showcase tooltip state adapter',
      justification: 'The identical click dismisses Angular Material tooltip, but the Astylar benchmark-only click handler forces it open. The popup exists on only one side; hover/held mappings remain mandatory.',
    }));
  const classifiedPresence = new Set(presenceDifferences.map((entry) => `${entry.case}:${entry.element}`));
  const missingElements = oneSidedElements.filter((entry) => !classifiedPresence.has(`${entry.case}:${entry.element}`));
  const missingStatic = [...expectedStatic].filter((key) => !actualStatic.has(key));
  const missingInteractions = [...expectedInteractions].filter((key) => !actualInteractions.has(key));
  const missingInputEvidence = cases.filter((entry) => {
    const root = entry.styleInputs?.find((input) => input.id === `${entry.family}-root`);
    return !root || !Object.keys(root.reference ?? {}).length || !Object.keys(root.astylar ?? {}).length;
  }).map(caseKey);
  const occurrences = countBy(cases, caseKey);
  const duplicateCases = Object.entries(occurrences).filter(([, count]) => count > 1)
    .map(([key, count]) => ({ case: key, count }));
  return {
    complete: missingStatic.length === 0 && missingInteractions.length === 0 &&
      missingInputEvidence.length === 0 && duplicateCases.length === 0,
    scope: 'Configured matrix and mapped elements; anonymous descendants and pseudo-elements require separate structural review.',
    visualParityGreen: parityReport.summary?.meetsAcceptance === true && parityReport.interactionSummary?.meetsAcceptance === true,
    configuredStatic: expectedStatic.size,
    executedStatic: actualStatic.size,
    configuredInteractions: expectedInteractions.size,
    executedInteractions: actualInteractions.size,
    profiles: materialProfiles,
    viewports: materialViewports,
    families: materialFamilies,
    elementMappings,
    missingStatic,
    missingInteractions,
    missingElements,
    missingInputEvidence,
    duplicateCases,
    presenceDifferences,
    caseInventory: {
      static: [...expectedStatic],
      interaction: [...expectedInteractions],
    },
  };
}

function scanMaterialSources(root) {
  return sourceAuditDefinitions.map((definition) => {
    const absolute = path.resolve(root, definition.file);
    const source = readFileSync(absolute, 'utf8');
    const expression = new RegExp(definition.pattern, 'g');
    const locations = [...source.matchAll(expression)].map((match) => ({
      file: definition.file.replaceAll('\\', '/'),
      line: source.slice(0, match.index).split(/\r?\n/).length,
      excerpt: source.slice(match.index, source.indexOf('\n', match.index) < 0 ? source.length : source.indexOf('\n', match.index)).trim(),
    }));
    return { ...definition, locations, detected: locations.length > 0 };
  });
}

function auditEnvironment(root) {
  const packageJson = JSON.parse(readFileSync(path.resolve(root, 'package.json'), 'utf8'));
  const consumerRoot = path.resolve(root, 'examples/material-showcase');
  const materialPackage = JSON.parse(readFileSync(path.resolve(consumerRoot, 'node_modules/@angular/material/package.json'), 'utf8'));
  const angularPackage = JSON.parse(readFileSync(path.resolve(consumerRoot, 'node_modules/@angular/core/package.json'), 'utf8'));
  const babylonPackage = JSON.parse(readFileSync(path.resolve(consumerRoot, 'node_modules/@babylonjs/core/package.json'), 'utf8'));
  return {
    package: `${packageJson.name}@${packageJson.version}`,
    angular: angularPackage.version,
    angularMaterial: materialPackage.version,
    babylon: babylonPackage.version,
    fonts: ['Roboto', 'Arial', 'sans-serif'],
    themes: materialProfiles,
    deviceScaleFactors: [1, 2],
    settlement: 'Astylar waitForSettled, document.fonts.ready, then two requestAnimationFrame callbacks on both sides.',
  };
}

function sourceFingerprints(root) {
  const files = [
    'src/lib/astylar.ts',
    'src/lib/astylar-surface.ts',
    'src/app/services/dom/style.service.ts',
    'src/app/services/dom/elements/element-dimension.service.ts',
    'src/app/services/dom/elements/element-creation.service.ts',
    'examples/material-showcase/src/app/astylar.component.ts',
    'examples/material-showcase/src/app/material-input-evidence.ts',
    'examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/theme.ts',
    'examples/material-showcase/src/app/showcase.store.ts',
    'examples/material-showcase/src/styles.scss',
    'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    'examples/material-showcase/src/app/material-plugin/material-ripple.controller.ts',
    'tests/material-parity/benchmark.config.mjs',
    'tests/material-parity/run-material-parity.mjs',
    'tests/material-parity/input-tree-evidence.mjs',
  ];
  return files.map((file) => ({ file, sha256: createHash('sha256')
    .update(readFileSync(path.resolve(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex') }));
}

function focusedProofInventory(root) {
  return [
    proof(root, 'scripts/audit-material-picker-commits.mjs', /select day 1/,
      'supplemental diagnostic; known mismatches recorded in investigation', 'Real pointer selection of a date/time reaches the correct candidate target but does not commit a value or close the popup. This case supplements, rather than replaces, the unfiltered maintained matrix.'),
    proof(root, 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts', /describe\('Material audit/,
      'six executable browser reductions; one honest core failure retained', 'Five reductions pass for intrinsic toolbar sizing, a flex stepper connector, content-derived flex height, a full-span calendar marker, and fixed bottom overlay. The new paragraph/divider reduction fails twice because the empty separator retains parent-content height (302px versus1px). Consult the investigation for commands and limitations; full Material compositions still require review.'),
    proof(root, 'src/app/services/dom/elements/grid.service.spec.ts', /gridColumn:\s*'1 \/ -1'/,
      'existing unit evidence', 'Core grid covers browser-style full-span gridColumn; the new browser reduction also passes. This does not prove every calendar composition.'),
    proof(root, 'src/lib/astylar-document-style-integration.spec.ts', /equivalent/,
      'covered', 'Document-style integration has an equivalent-input integration fixture before projection.'),
    proof(root, 'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.spec.ts', /logical CSS\/screen X/,
      'covered', 'Plugin range geometry proves increasing CSS X remains increasing render-local X at the final projection boundary.'),
    proof(root, 'docs/coordinate-system-remediation.md', /right-handed/i,
      'documented', 'Coordinate remediation records the right-handed scene and final CssBabylonProjection boundary.'),
  ];
}

function proof(root, file, expression, status, description) {
  const source = readFileSync(path.resolve(root, file), 'utf8');
  const match = expression.exec(source);
  return { file, line: match ? source.slice(0, match.index).split(/\r?\n/).length : undefined, status: match ? status : 'missing', description };
}

function implementationPlan() {
  return [
    { priority: 1, rootCause: 'Rendered output feeds subsequent layout', action: 'Replace connectedOverlayTop mesh projection with a public read-only query of the authoritative core CSS layout boxes. Verify nested transforms, scroll, resize, DPR, and first-open/update cycles. Diagnostic projection may measure output but must never determine authored input.' },
    { priority: 2, rootCause: 'Range fixture changes reachable values', action: 'Restore the reference 0..100 range and step=5 with inter-thumb constraints. Exercise start=60/end=80 and start=20/end=40, drag both directions across the midpoint, and compare keyboard steps. Remove fixed half-domain clamping; reduce any resulting core interaction failure before implementation.' },
    { priority: 3, rootCause: 'Empty-block auto height and fixture flow compensation', action: 'First fix the confirmed empty-block parent-height fallback in ElementDimensionService/ElementCreationService; the paragraph/divider reduction must pass unchanged. Preserve explicit constraints, flex/grid stretch and replaced elements, and add padded/bordered/nested/resize cases. Then replace absolute flow placement, fixed family heights and measured dimensions with the reference declarations, reducing any further core discrepancies instead of restoring offsets.' },
    { priority: 4, rootCause: 'Generic overlay composition is duplicated', action: 'Audit existing core primitives before adding APIs for connected anchors, viewport collision, clipping, focus scope, and dismissal. Migrate popup families with equivalent state inputs; retain different datepicker and timepicker focus behavior. Remove the tooltip benchmark-only forced-open handler.' },
    { priority: 5, rootCause: 'Plugin competes with core typography', action: 'Remove DynamicTexture glyph/baseline rendering from MaterialTabPanelRenderer. Keep only Material transition orchestration while composing core-rendered text/content.' },
    { priority: 6, rootCause: 'Interaction geometry duplicated by the application', action: 'Expose resolved CSS-space target bounds and local pointer coordinates in the core event/plugin contract; remove ripple width tables.' },
    { priority: 7, rootCause: 'Material paint calibration constants', action: 'Express progress angles, state layers, checkmarks, selection rings, and indicators from reference Material geometry in CSS space; remove screenshot-derived angle and fractional-position constants.' },
    { priority: 8, rootCause: 'Regression gate permits unequal inputs', action: 'Run this audit in CI after the full parity matrix, require complete coverage and zero unclassified differences, and review any new Astylar-only authored rule before updating the checked-in report.' },
  ];
}

function compactAuthored(rules) {
  return (rules ?? []).slice(-4).map((rule) => ({ selector: rule.selector, declarations: rule.declarations }));
}

function countBy(entries, selector) {
  return Object.fromEntries([...entries.reduce((map, entry) => {
    const key = selector(entry);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map()).entries()].sort(([left], [right]) => String(left).localeCompare(String(right))));
}

function formatNumber(value) {
  return String(Math.round(value * 1000) / 1000);
}

function caseKey(entry) {
  return `${entry.kind ?? (entry.state ? 'interaction' : 'static')}:${entry.family}@${entry.profile}/${entry.viewport?.id}${entry.state ? `/${entry.state}` : ''}`;
}
