import { readFileSync } from 'node:fs';
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

export const materialInputAuditSchemaVersion = 1;

const propertyGroupByName = new Map(Object.entries(propertyGroups)
  .flatMap(([group, properties]) => properties.map((property) => [property, group])));

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
  const classifications = countBy(discrepancies, (entry) => entry.classification);
  const propertyGroupCounts = countBy(discrepancies, (entry) => entry.propertyGroup);
  const familyCounts = countBy(discrepancies, (entry) => entry.family);
  const unclassified = discrepancies.filter((entry) => !inputDifferenceClassifications.includes(entry.classification));
  const report = {
    schemaVersion: materialInputAuditSchemaVersion,
    generatedFrom: {
      paritySchemaVersion: parityReport.schemaVersion,
      parityGeneratedAt: parityReport.generatedAt,
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
    coverage,
    summary: {
      inputEquivalent: discrepancies.every((entry) => entry.classification === 'equivalent-representation' || entry.classification === 'legitimate-public-api-structure'),
      uniqueStyleDifferences: discrepancies.length,
      totalStyleDifferenceOccurrences: discrepancies.reduce((sum, entry) => sum + entry.occurrences, 0),
      classifications,
      propertyGroups: propertyGroupCounts,
      affectedFamilies: familyCounts,
      unclassifiedDifferences: unclassified.length,
      sourceFindings: sourceFindings.length,
      unexplainedSourceFindings: sourceFindings.filter((entry) => !entry.classification).length,
      undetectedSourceDefinitions: sourceFindings.filter((entry) => !entry.detected).length,
    },
    discrepancies,
    structureEvidence: structures,
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
  if (report.summary.unexplainedSourceFindings !== 0) errors.push(`${report.summary.unexplainedSourceFindings} source findings are unexplained`);
  if (report.summary.undetectedSourceDefinitions !== 0) errors.push(`${report.summary.undetectedSourceDefinitions} expected source findings were not detected`);
  if (report.coverage.missingElements.length > 0) errors.push(`${report.coverage.missingElements.length} measured mappings are missing on one side`);
  return errors;
}

export function renderMaterialInputAuditMarkdown(report) {
  const lines = [
    '# Material showcase input-equivalence audit',
    '',
    `Evidence: parity report generated ${report.generatedFrom.parityGeneratedAt} with ${report.generatedFrom.browser?.name ?? 'browser'} ${report.generatedFrom.browser?.version ?? ''}.`,
    '',
    '## Verdict',
    '',
    `Visual parity is ${report.coverage.visualParityGreen ? 'green' : 'not green'}, but input equivalence is **${report.summary.inputEquivalent ? 'established' : 'not established'}**. ` +
      `The audit found ${report.summary.uniqueStyleDifferences} unique normalized input differences across ${report.summary.totalStyleDifferenceOccurrences} occurrences.`,
    '',
    `Coverage is ${report.coverage.complete ? 'complete' : 'incomplete'}: ${report.coverage.executedStatic}/${report.coverage.configuredStatic} static cases and ` +
      `${report.coverage.executedInteractions}/${report.coverage.configuredInteractions} interaction/mobile-flow cases. All ${report.coverage.families.length} component families are inventoried.`,
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
    '| Finding | Classification | Evidence | Owner |',
    '| --- | --- | --- | --- |',
    ...report.sourceFindings.map((finding) =>
      `| ${finding.id} | ${finding.classification} | ${finding.locations.map((location) => `${location.file}:${location.line}`).join(', ')} | ${finding.owner} |`),
    '',
    '## Plugin boundary verdict',
    '',
    `Status: **${report.pluginBoundary.status}**. ${report.pluginBoundary.coordinateFinding}`,
    '',
    'The Material-specific state layers, ripples, progress/range visuals, checkmark, and sort-arrow paint are legitimate plugin work. The tab-panel renderer is not: it rasterizes and positions text through its own DynamicTexture and baseline calculation, which competes with core typography. Connected-overlay placement and ripple bounds are also duplicated in the application because generic core APIs are missing.',
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
    'The adjacent JSON report contains every normalized discrepancy signature, occurrence count, representative cases, exact element/property values, classification, justification, authored-rule evidence, coverage case keys, structural mappings, and source locations. A check fails if a future difference or source scan result has no classification, or if the complete configured matrix was not executed.',
    '',
  ];
  return lines.join('\n');
}

function collectStyleDiscrepancies(cases) {
  const grouped = new Map();
  for (const benchmarkCase of cases) {
    const key = caseKey(benchmarkCase);
    for (const input of benchmarkCase.styleInputs ?? []) {
      const reference = canonicalStyle(input.reference ?? {}, 'reference');
      const astylar = canonicalStyle(input.astylar ?? {}, 'astylar');
      const properties = new Set([...Object.keys(reference), ...Object.keys(astylar)]);
      for (const property of [...properties].sort()) {
        const referenceValue = reference[property];
        const astylarValue = astylar[property];
        if (equivalentValue(property, referenceValue, astylarValue, reference, astylar)) continue;
        const classification = classifyStyleDifference(property, referenceValue, astylarValue);
        const signature = JSON.stringify([benchmarkCase.family, input.id, property, referenceValue ?? null, astylarValue ?? null, classification.classification]);
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

function classifyStyleDifference(property, reference, astylar) {
  if (astylar === undefined && implicitReferenceValues[property]?.includes(reference)) {
    return {
      classification: 'equivalent-representation',
      justification: `The browser serializes its implicit ${property} used value; Astylar omits the equivalent initial declaration.`,
      owner: 'none',
    };
  }
  if (property === 'transformOrigin' && astylar === undefined) {
    return {
      classification: 'equivalent-representation',
      justification: 'Browser transform-origin is a derived used value; Astylar has no transform, so omission carries the same rendering intent.',
      owner: 'none',
    };
  }
  if (property === 'caretColor' && astylar === undefined) {
    return {
      classification: 'equivalent-representation',
      justification: 'An omitted Astylar caret color follows the resolved text color, matching CSS caret-color:auto semantics.',
      owner: 'none',
    };
  }
  const group = propertyGroupByName.get(property) ?? 'other';
  return {
    classification: 'application-plugin-authoring-defect',
    justification: astylar === undefined
      ? `The reference resolves ${property}=${reference}, but the Astylar input does not express an equivalent ${group} value.`
      : reference === undefined
        ? `The Astylar fixture adds ${property}=${astylar} without a corresponding reference input.`
        : `The two fixtures resolve different ${group} inputs (${reference} versus ${astylar}); matching output therefore cannot prove renderer parity.`,
    owner: group === 'interaction' ? 'showcase fixture and core interaction defaults'
      : group === 'typography' ? 'showcase fixture and core typography'
        : group === 'layout' || group === 'transform' ? 'showcase fixture and core CSS layout'
          : group === 'paint' ? 'showcase fixture or Material-specific paint adapter'
            : 'showcase fixture',
  };
}

function canonicalStyle(style, side) {
  const result = Object.fromEntries(Object.entries(style).map(([property, value]) =>
    [property === 'background' ? 'backgroundColor' : property === 'wordWrap' ? 'overflowWrap' : property, normalizeValue(property, value)]));
  if (side === 'astylar') {
    expandQuad(result, 'padding', ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']);
    expandQuad(result, 'margin', ['marginTop', 'marginRight', 'marginBottom', 'marginLeft']);
    expandQuad(result, 'borderWidth', ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth']);
    expandQuad(result, 'borderStyle', ['borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle']);
    expandQuad(result, 'borderColor', ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']);
    expandQuad(result, 'borderRadius', ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius']);
    expandPair(result, 'gap', ['rowGap', 'columnGap']);
    expandPair(result, 'overflow', ['overflowX', 'overflowY']);
  }
  for (const shorthand of ['padding', 'margin', 'borderWidth', 'borderStyle', 'borderColor', 'borderRadius', 'gap', 'overflow', 'flex']) delete result[shorthand];
  return result;
}

function expandQuad(style, shorthand, longhands) {
  if (style[shorthand] === undefined) return;
  const parts = splitCssTerms(style[shorthand]);
  if (parts.length < 1 || parts.length > 4) return;
  const values = parts.length === 1 ? [parts[0], parts[0], parts[0], parts[0]]
    : parts.length === 2 ? [parts[0], parts[1], parts[0], parts[1]]
      : parts.length === 3 ? [parts[0], parts[1], parts[2], parts[1]] : parts;
  for (let index = 0; index < longhands.length; index += 1) {
    if (style[longhands[index]] === undefined) style[longhands[index]] = values[index];
  }
}

function expandPair(style, shorthand, longhands) {
  if (style[shorthand] === undefined) return;
  const parts = splitCssTerms(style[shorthand]);
  if (parts.length === 0 || parts.length > 2) return;
  if (style[longhands[0]] === undefined) style[longhands[0]] = parts[0];
  if (style[longhands[1]] === undefined) style[longhands[1]] = parts[1] ?? parts[0];
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
  let normalized = String(value).trim().replace(/\s+/g, ' ');
  if (property === 'fontFamily') return normalized.replace(/["']/g, '').replace(/\s*,\s*/g, ',').toLowerCase();
  if (property === 'fontWeight' && normalized.toLowerCase() === 'bold') return '700';
  const color = normalizeColor(normalized);
  if (color) return color;
  normalized = normalized.replace(/(^|[ (,:])(-?\d*\.?\d+)px(?=$|[ ),])/g, (_match, prefix, number) =>
    `${prefix}${formatNumber(Number(number))}px`);
  normalized = normalized.replace(/(^|[ (,:])-?0(?:\.0+)?(?:px|em|rem|%)?(?=$|[ ),])/g, '$10');
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
  if (property === 'alignItems' && reference === 'normal' && astylar === 'stretch') return true;
  if (property === 'alignContent' && reference === 'normal' && astylar === 'stretch') return true;
  if (property === 'justifyContent' && reference === 'normal' && astylar === 'flex-start') return true;
  if (property === 'cursor' && reference === 'auto' && astylar === 'default') return true;
  if (property === 'opacity' && Number(reference) === Number(astylar)) return true;
  return false;
}

function collectStructureEvidence(cases) {
  const grouped = new Map();
  for (const benchmarkCase of cases) {
    for (const input of benchmarkCase.styleInputs ?? []) {
      if (!input.referenceStructure && !input.astylarStructure) continue;
      const signature = JSON.stringify([benchmarkCase.family, input.id, input.referenceStructure, input.astylarStructure]);
      if (!grouped.has(signature)) grouped.set(signature, {
        family: benchmarkCase.family,
        element: input.id,
        reference: input.referenceStructure,
        astylar: input.astylarStructure,
        classification: 'legitimate-public-api-structure',
        justification: 'Angular Material expands components into framework-private DOM while Astylar uses public SiteData nodes. Text, semantic state, mapped descendant order, and measured geometry remain separately enforced.',
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

function buildCoverage(parityReport, cases) {
  const expectedStatic = new Set(materialStaticCases.map((entry) => caseKey({ ...entry, kind: 'static' })));
  const expectedInteractions = new Set([...materialInteractionCases, ...materialMobileFlowCases]
    .map((entry) => caseKey({ ...entry, kind: 'interaction' })));
  const actualStatic = new Set((parityReport.results ?? []).map((entry) => caseKey({ ...entry, kind: 'static' })));
  const actualInteractions = new Set((parityReport.interactions ?? []).map((entry) => caseKey({ ...entry, kind: 'interaction' })));
  const elementMappings = Object.fromEntries(materialFamilies.map((family) => [family,
    [...new Set(cases.filter((entry) => entry.family === family)
      .flatMap((entry) => (entry.styleInputs ?? []).map((input) => input.id)))].sort()]));
  const missingElements = cases.flatMap((entry) => (entry.styleInputs ?? []).flatMap((input) =>
    input.reference === undefined || input.astylar === undefined
      ? [{ case: caseKey(entry), element: input.id, referencePresent: input.reference !== undefined, astylarPresent: input.astylar !== undefined }]
      : []));
  const missingStatic = [...expectedStatic].filter((key) => !actualStatic.has(key));
  const missingInteractions = [...expectedInteractions].filter((key) => !actualInteractions.has(key));
  return {
    complete: missingStatic.length === 0 && missingInteractions.length === 0,
    visualParityGreen: parityReport.summary?.failing === 0 && parityReport.interactionSummary?.failing === 0,
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
  const materialPackage = JSON.parse(readFileSync(path.resolve(root, 'node_modules/@angular/material/package.json'), 'utf8'));
  const angularPackage = JSON.parse(readFileSync(path.resolve(root, 'node_modules/@angular/core/package.json'), 'utf8'));
  const babylonPackage = JSON.parse(readFileSync(path.resolve(root, 'node_modules/@babylonjs/core/package.json'), 'utf8'));
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

function focusedProofInventory(root) {
  return [
    proof(root, 'src/app/services/dom/elements/grid.service.spec.ts', /gridColumn:\s*'1 \/ -1'/,
      'covered', 'Core grid explicitly covers browser-style full-span gridColumn; calendar explicit-cell code is not justified by a missing span primitive.'),
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
    { priority: 1, rootCause: 'Fixture outcome compensation', action: 'Replace fixed family heights, absolute flow placement, responsive/DPR offsets, and duplicated measured dimensions with the same layout declarations and structure used by the reference. Let newly honest parity failures identify the owning core subsystem.' },
    { priority: 2, rootCause: 'Missing generic overlay geometry API', action: 'Add a core CSS-space connected-overlay primitive for anchor rectangles, viewport collision, clipping, focus scope, and dismissal. Migrate autocomplete, select, date/time pickers, menu, tooltip, snackbar, dialog, and bottom sheet without per-component coordinate arithmetic.' },
    { priority: 3, rootCause: 'Plugin competes with core typography', action: 'Remove DynamicTexture glyph/baseline rendering from MaterialTabPanelRenderer. Keep only Material transition orchestration while composing core-rendered text/content.' },
    { priority: 4, rootCause: 'Interaction geometry duplicated by the application', action: 'Expose resolved CSS-space target bounds and local pointer coordinates in the core event/plugin contract; remove ripple width tables and half-track value remapping.' },
    { priority: 5, rootCause: 'Material paint calibration constants', action: 'Express progress angles, state layers, checkmarks, selection rings, and indicators from documented Material geometry in CSS space; remove screenshot-derived angle and fractional-position constants.' },
    { priority: 6, rootCause: 'Regression gate permits unequal inputs', action: 'Run this audit in CI after the full parity matrix, require complete coverage and zero unclassified differences, and review any new Astylar-only authored rule before updating the checked-in report.' },
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
