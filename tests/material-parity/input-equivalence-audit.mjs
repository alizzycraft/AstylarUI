import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import {
  implicitReferenceValues,
  implicitReferenceJustifications,
  inputDifferenceClassifications,
  pluginBoundaryVerdict,
  propertyGroups,
  reviewedValueNormalizations,
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

export const materialInputAuditSchemaVersion = 3;

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
  const structures = collectStructureEvidence(cases);
  const sourceFindings = scanMaterialSources(root);
  const coverage = buildCoverage(parityReport, cases);
  const supplementalBehavior = collectSupplementalBehavior(root);
  const supplementalOverlays = collectSupplementalOverlays(root);
  const supplementalSlider = collectSupplementalSlider(root);
  const elementInventory = collectFullTreeInventory([...cases, ...supplementalBehavior.cases, ...supplementalOverlays.cases, ...supplementalSlider.cases], { root });
  const retainedTypography = collectRetainedTypographyEvidence(cases, elementInventory);
  const discrepancies = collectStyleDiscrepancies(cases, retainedTypography);
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
    reviewedValueNormalizations,
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
        retainedTypography.gaps.length === 0 && retainedTypography.differences.length === 0 && retainedTypography.paintMaskDifferences.length === 0 &&
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
    retainedTypography,
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
  if (report.retainedTypography?.schemaVersion !== 1) errors.push('missing retained typography stage report');
  if (requireComplete && report.retainedTypography?.gaps.length > 0) errors.push(`${report.retainedTypography.gaps.length} retained typography mappings or stage fields require review`);
  const reviewedTypographyKinds = { 'reviewed-heading-mask': 'parity-harness-defect',
    'reviewed-table-font-input': 'application-plugin-authoring-defect',
    'reviewed-tree-font-input': 'application-plugin-authoring-defect',
    'reviewed-floating-label-font-input': 'application-plugin-authoring-defect' };
  const unresolvedTypography = report.retainedTypography?.differences.filter((entry) =>
    !reviewedTypographyKinds[entry.attribution] || entry.classification !== reviewedTypographyKinds[entry.attribution] || !entry.reviewEvidence) ?? [];
  if (requireComplete && unresolvedTypography.length > 0) errors.push(`${unresolvedTypography.length} retained typography differences require attribution`);
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
    `Retained typography: ${report.retainedTypography.comparisons.length} directly mapped text-node observations; ${report.retainedTypography.gaps.length} mapping/stage gaps and ${report.retainedTypography.differences.length} unequal retained-property observations. The registry stage is reported separately from declarations and is not proof of current pseudo-state glyph paint.`,
    '',
    `Heading coverage: ${report.retainedTypography.reviewedMappings.length} explicit template-to-SiteData identity mappings; ${report.retainedTypography.paintMaskDifferences.length} captured benchmark paint-mask discrepancies. HTML hides headings with opacity zero while the candidate uses surface-colored ink; the benchmark cannot establish visible heading paint parity.`,
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

function collectStyleDiscrepancies(cases, retainedTypography) {
  const grouped = new Map();
  const typographyByCaseAndId = new Map(retainedTypography.comparisons.map((entry) =>
    [JSON.stringify([entry.case, entry.element]), entry]));
  const reviewedTableFonts = new Map(retainedTypography.differences.filter((entry) => entry.attribution === 'reviewed-table-font-input')
    .map((entry) => [JSON.stringify([entry.case, entry.element]), entry]));
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
          : classifyReviewedRootInput(benchmarkCase, input, property, referenceValue, astylarValue)
            ?? classifyReviewedContainerInput(benchmarkCase, input, property, referenceValue, astylarValue)
            ?? classifyReviewedBadgePaint(benchmarkCase, input, property, referenceValue, astylarValue)
            ?? classifyReviewedTableFontSnapshot(input, property, referenceValue, astylarValue,
              reviewedTableFonts.get(JSON.stringify([key, input.id])))
            ?? classifyReviewedTypographyStage(benchmarkCase, input, property, referenceValue, astylarValue,
              typographyByCaseAndId.get(JSON.stringify([key, input.id])))
            ?? classifyStyleDifference(property, referenceValue, astylarValue, reference, astylar);
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
            ...(classification.reviewEvidence ? { reviewEvidence: classification.reviewEvidence } : {}),
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

function classifyReviewedRootInput(benchmarkCase, input, property, reference, astylar) {
  // A narrowly reviewed authoring path, not a default inference from unequal
  // computed values. Require the captured node mapping and declaration witness.
  if (input.id !== `${benchmarkCase.family}-root` ||
      input.referenceStructure?.type !== 'section' || input.astylarStructure?.type !== 'section') return;
  const pairs = { position: ['static', 'relative'], display: ['block', 'flex'] };
  const pair = pairs[property];
  if (!pair || reference !== pair[0] || astylar !== pair[1]) return;
  const declaration = input.astylarAuthored?.find((rule) =>
    rule.selector === `#${input.id}` && rule.declarations?.[property] === astylar);
  if (!declaration || !input.referenceAuthored?.some((rule) => /^\.demo(?:\[|$)/.test(rule.selector))) return;
  if (input.referenceAuthored.some((rule) => {
    const value = rule.declarations?.[property]?.value;
    return value !== undefined && value !== reference;
  })) return;
  return {
    classification: 'application-plugin-authoring-defect',
    attribution: 'reviewed-authored-rule',
    owner: 'showcase demo-section block-flow translation',
    justification: `The mapped section uses reference .demo block flow, while captured candidate rule #${input.id} explicitly authors ${property}:${astylar}. The reference computed ${property}:${reference} agrees with the inspected ReferenceComponent rules. This traced shared-root translation changes formatting/containing-block behavior; it is not inferred from omitted resolved values or screenshot geometry. See fixture-demo-block-flow-replaced in source findings.`,
  };
}

const reviewedContainerInputs = {
  sidenav: {
    referenceType: 'mat-sidenav-container', referenceSelector: '.mat-drawer-container',
    candidateSelector: '.sidenav-container', candidateDisplay: 'flex',
    owner: 'showcase drawer containing block, content offset, and independent scrolling',
    justification: 'Captured .mat-drawer-container explicitly authors display:block, while .sidenav-container explicitly authors display:flex on the corresponding container. The reference absolute drawer, margin-offset content and independent scroll wrapper are replaced by flex siblings. This is the traced fixture-sidenav-positioned-flow-replaced input difference, not a core inference or acceptance of all framework-wrapper differences.',
  },
  'grid-list': {
    referenceType: 'mat-grid-list', referenceSelector: '.mat-grid-list',
    candidateSelector: '.grid-list', candidateDisplay: 'grid',
    owner: 'showcase grid-list positioned tile and gutter translation',
    justification: 'Captured .mat-grid-list explicitly authors display:block, while .grid-list explicitly authors display:grid. The reference positions tiles using percentage calc widths/offsets that leave a1px gutter; candidate instead uses two fractional tracks and gap:0. This is the reviewed fixture-grid-list-missing-reference-gutter authoring path. Different container mechanisms are not accepted merely because current geometry is similar; other properties and wrappers retain their own review requirements.',
  },
};

function classifyReviewedContainerInput(benchmarkCase, input, property, reference, astylar) {
  const review = reviewedContainerInputs[benchmarkCase.family];
  if (!review || input.id !== `${benchmarkCase.family}-primary` ||
      property !== 'display' || reference !== 'block' || astylar !== review.candidateDisplay ||
      input.referenceStructure?.type !== review.referenceType || input.astylarStructure?.type !== 'div') return;
  const referenceRule = input.referenceAuthored?.find((rule) => rule.selector === review.referenceSelector &&
    rule.declarations?.display?.value === 'block');
  const candidateRule = input.astylarAuthored?.find((rule) => rule.selector === review.candidateSelector &&
    rule.declarations?.display === review.candidateDisplay);
  if (!referenceRule || !candidateRule) return;
  // Do not resolve a conflicting cascade in the report. The reviewed source
  // path has no other display declarations with different values.
  if (input.referenceAuthored.some((rule) => rule.declarations?.display?.value !== undefined && rule.declarations.display.value !== reference) ||
      input.astylarAuthored.some((rule) => rule.declarations?.display !== undefined && rule.declarations.display !== astylar)) return;
  return {
    classification: 'application-plugin-authoring-defect',
    attribution: 'reviewed-authored-rule',
    owner: review.owner,
    justification: review.justification,
  };
}

function classifyReviewedBadgePaint(benchmarkCase, input, property, reference, astylar) {
  if (benchmarkCase.family !== 'badge' || input.id !== 'badge-count' || property !== 'backgroundColor' ||
      input.referenceStructure?.type !== 'span' || input.astylarStructure?.type !== 'span') return;
  const token = 'var(--mat-badge-background-color, var(--mat-sys-error))';
  const referenceRule = input.referenceAuthored?.find((rule) => rule.selector === '.mat-badge-content' &&
    rule.declarations?.['background-color']?.value === token);
  const candidateRule = input.astylarAuthored?.find((rule) => rule.selector === '.badge-bubble' &&
    normalizeColor(String(rule.declarations?.background ?? '')) === astylar);
  if (!referenceRule || !candidateRule || reference === astylar) return;
  if (input.referenceAuthored.some((rule) => rule.declarations?.background !== undefined ||
      (rule.declarations?.['background-color'] !== undefined && rule.declarations['background-color'].value !== token)) ||
      input.astylarAuthored.some((rule) => rule.declarations?.backgroundColor !== undefined ||
        (rule.declarations?.background !== undefined && normalizeColor(String(rule.declarations.background)) !== astylar))) return;
  return {
    classification: 'application-plugin-authoring-defect',
    attribution: 'reviewed-authored-rule',
    owner: 'showcase badge theme-token translation',
    reviewEvidence: { referenceRule, candidateRule },
    justification: 'The reference badge background uses --mat-badge-background-color with --mat-sys-error fallback. The captured .badge-bubble rule explicitly supplies the different candidate resolved color; source tracing identifies theme.primary rather than the reference error token. This is the reviewed fixture-badge-primary-instead-of-error-token mismatch, not a renderer color-conversion inference. Other badge dimensions, content and state properties remain independently reviewable.',
  };
}

function classifyReviewedTypographyStage(benchmarkCase, input, property, reference, astylar, evidence) {
  // Only attribute the demonstrated missing-declaration stage mismatch. Never
  // replace declarations with retained paint values or infer inheritance here.
  const values = evidence?.properties[property];
  if (benchmarkCase.state || astylar !== undefined || !values || reference === undefined ||
      implicitReferenceValues[property]?.includes(reference) ||
      input.astylarResolvedStyleEvidenceVersion !== 2 ||
      input.referenceStructure?.schemaVersion !== 2 || input.astylarStructure?.schemaVersion !== 2 ||
      input.referenceStructure.text !== evidence.text || input.astylarStructure.ownText !== evidence.text ||
      values.reference !== reference || values.normal !== undefined || values.effective !== undefined ||
      values.retained !== reference) return;
  return {
    classification: 'parity-harness-defect',
    attribution: 'reviewed-stage-mismatch',
    owner: 'input audit declaration versus core retained-typography stage comparison',
    reviewEvidence: { case: evidence.case, referenceNode: evidence.referenceNode, astylarNode: evidence.astylarNode,
      source: evidence.source, revision: evidence.revision, property, values },
    justification: 'The directly mapped own-text nodes agree, and the captured core text-registry value equals the browser computed value while both candidate declaration stages omit this property. This attributes the missing scalar to a diagnostic-stage comparison, not a missing authored font or a renderer defect. Keep both stages; it does not accept other properties, substitute inherited calculations, or prove current pseudo-state glyph paint.',
  };
}

function classifyReviewedTableFontSnapshot(input, property, reference, astylar, finding) {
  if (property !== 'fontSize' || !finding || reference !== finding.values.reference || astylar !== finding.values.effective ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 ||
      input.astylarStructure?.schemaVersion !== 2 || input.referenceStructure.text !== input.astylarStructure.ownText) return;
  return { classification: finding.classification, attribution: finding.attribution, owner: finding.recommendedOwner,
    justification: finding.justification, reviewEvidence: finding.reviewEvidence };
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
      justification: implicitReferenceJustifications[property] ?? `The browser serializes its implicit ${property} used value; Astylar omits the equivalent initial declaration.`,
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
  if (property === 'maxWidth' && equivalentFixedMaxWidth(reference, astylar, referenceStyle, astylarStyle)) {
    return {
      classification: 'equivalent-representation',
      justification: 'These finite max-width declarations specify the same maximum border-box width after adding fixed CSS-pixel padding and borders to the content-box side. This accepts only the maximum-width constraint, not the different box-sizing mode or other width/height declarations. Percentage, auto, intrinsic and unresolved insets are not converted.',
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

function equivalentFixedMaxWidth(reference, astylar, referenceStyle, astylarStyle) {
  if (referenceStyle.boxSizing === astylarStyle.boxSizing) return false;
  const pixels = (value) => /^(?:0|\d+(?:\.\d+)?px)$/.test(String(value)) ? parseFloat(value) : undefined;
  const borderBoxLimit = (value, style) => {
    const limit = pixels(value);
    if (limit === undefined) return;
    if (style.boxSizing === 'border-box') return limit;
    if (style.boxSizing !== 'content-box') return;
    const insets = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth'].map((key) => pixels(style[key]));
    if (insets.some((inset) => inset === undefined)) return;
    return limit + insets.reduce((sum, inset) => sum + inset, 0);
  };
  const left = borderBoxLimit(reference, referenceStyle);
  const right = borderBoxLimit(astylar, astylarStyle);
  return left !== undefined && right !== undefined && Math.abs(left - right) < .001;
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
  if (property === 'fontWeight' && normalized.toLowerCase() === 'normal') return '400';
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

const retainedTypographyProperties = Object.freeze([
  'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing',
  'wordSpacing', 'textAlign', 'textTransform', 'textDecoration', 'color',
]);

export function reviewedHeadingMappings(referenceTree, astylarTree) {
  const hasClass = (node, name) => String(node.attributes?.class ?? '').split(/\s+/).includes(name);
  const referencePages = referenceTree.nodes.filter((node) => node.parent === null && node.type === 'main' && hasClass(node, 'frame'));
  const candidatePages = astylarTree.nodes.filter((node) => node.authored?.id === 'page' && node.authored.type === 'main' && node.parent === 'root');
  if (referencePages.length !== 1 || candidatePages.length !== 1) return [];
  const pairs = [];
  for (const [id, tag] of [['eyebrow', 'p'], ['title', 'h1']]) {
    const referenceNodes = referenceTree.nodes.filter((node) => node.parent === referencePages[0].key && node.type === tag &&
      (id !== 'eyebrow' || hasClass(node, 'eyebrow')));
    const candidateNodes = astylarTree.nodes.filter((node) => node.authored?.id === id);
    if (referenceNodes.length !== 1 || candidateNodes.length !== 1) continue;
    const ref = referenceNodes[0], ast = candidateNodes[0];
    if (ref.attributes?.id || ast.authored.type !== tag || ast.parent !== candidatePages[0].key ||
        !ref.ownText?.trim() || ref.ownText.trim() !== ast.authored.textContent?.trim()) continue;
    // A conflicting authored reference ID must not be hidden by an alias.
    if (referenceTree.nodes.some((node) => node.attributes?.id === id)) continue;
    pairs.push({ kind: 'reviewed-showcase-heading', element: id, referenceNode: ref.key, astylarNode: ast.key,
      referencePage: referencePages[0].key, astylarPage: candidatePages[0].key,
      justification: 'The reference template authors one direct main.frame > p.eyebrow and one direct main.frame > h1; SiteData authors the corresponding p#eyebrow and h1#title directly in main#page. Matching unique parent/tag/identity and direct text establishes node correspondence only. Styles, opacity, color, offsets and generated content are not accepted by this mapping.' });
  }
  return pairs;
}

export function reviewedTemplateTextMappings(family, referenceTree, astylarTree) {
  // These paths come from the paired showcase templates and captured Material
  // wrappers. They identify text owners, not equivalent layout structures.
  const paths = family === 'tree' ? [0, 1, 2].map((index) => ({
    element: `tree-item-${index}-label`,
    reference: [['mat-tree', 'tree-primary', 'mat-tree'], ['mat-tree-node', `tree-item-${index}`, 'mat-tree-node']],
    astylar: [['div', 'tree-primary', 'material-tree'], ['div', `tree-item-${index}`, 'tree-item'], ['span', `tree-item-${index}-label`, 'tree-label']],
  })) : family === 'grid-list' ? ['one', 'two'].map((name) => ({
    element: `grid-tile-${name}-label`,
    reference: [['mat-grid-list', 'grid-list-primary', 'mat-grid-list'], ['div'], ['mat-grid-tile', `grid-tile-${name}`, 'mat-grid-tile'], ['div', null, 'mat-grid-tile-content']],
    astylar: [['div', 'grid-list-primary', 'grid-list'], ['div', `grid-tile-${name}`, 'grid-tile'], ['span', `grid-tile-${name}-label`, 'grid-tile-label']],
  })) : family === 'badge' ? [{
    element: 'badge-count',
    reference: [['span', 'badge-primary', 'mat-badge'], ['span', /^mat-badge-content-\d+$/, 'mat-badge-content']],
    astylar: [['span', 'badge-primary', 'badge-anchor'], ['span', 'badge-count', 'badge-bubble']],
  }] : [];
  const follow = (tree, side, steps) => {
    const data = (node) => side === 'reference' ? { ...node.attributes, type: node.type } : node.authored;
    let parent;
    const chain = [];
    for (const [type, id, className] of steps) {
      const matches = tree.nodes.filter((node) => {
        const value = data(node);
        return value?.type === type && (!parent || node.parent === parent.key) &&
          (id instanceof RegExp ? id.test(value.id ?? '') : id ? value.id === id : !value.id) &&
          (!className || String(value.class ?? '').split(/\s+/).includes(className));
      });
      if (matches.length !== 1) return;
      parent = matches[0];
      const value = data(parent);
      if (tree.nodes.filter((node) => node.key === parent.key).length !== 1 ||
          (value.id && tree.nodes.filter((node) => data(node)?.id === value.id).length !== 1)) return;
      chain.push(parent);
    }
    return chain;
  };
  const pairs = [];
  for (const path of paths) {
    const reference = follow(referenceTree, 'reference', path.reference);
    const astylar = follow(astylarTree, 'astylar', path.astylar);
    if (!reference || !astylar) continue;
    const ref = reference.at(-1), ast = astylar.at(-1);
    if (!ref.ownText?.trim() || ref.ownText.trim() !== ast.authored.textContent?.trim() ||
        referenceTree.nodes.some((node) => node.parent === ref.key || node.attributes?.id === path.element) ||
        astylarTree.nodes.some((node) => node.parent === ast.key)) continue;
    pairs.push({ kind: 'reviewed-showcase-template-text', element: path.element,
      referenceNode: ref.key, astylarNode: ast.key,
      referencePath: reference.map((node) => node.key), astylarPath: astylar.map((node) => node.key),
      justification: 'The paired reference.component.ts and astylar.component.ts templates identify this text through a unique component anchor and exact direct-child tag/ID/class path. Both terminal nodes have identical direct own-text and no element children. Generated badge IDs are checked by shape and uniqueness, not their unstable numeric suffix. This establishes text-owner identity only; wrapper, layout, typography, paint and interaction differences remain subject to separate comparison.' });
  }
  return pairs;
}

function reviewedHeadingMask(mapping, ref, styles, astylarTree, inventory) {
  if (!mapping || Number(styles.reference.opacity) !== 0 || Number(styles.normal.opacity) !== 1 || Number(styles.effective.opacity) !== 1) return;
  const referenceRule = ref.rules.map((index) => inventory.rules[index]).find((rule) =>
    rule?.side === 'reference' && rule.value.active === true &&
    rule.value.declarations?.opacity?.value === '0' && /\.benchmark\b/.test(rule.value.selector) &&
    /(?:\.eyebrow|h1)/.test(rule.value.selector));
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'astylar');
  const candidateRule = candidateRules.find((rule) => rule.value.selector === `#${mapping.element}` &&
    normalizeValue('color', rule.value.color) === styles.retained.color);
  const pageRule = candidateRules.find((rule) => rule.value.selector === '#page' &&
    normalizeValue('background', rule.value.background) === styles.retained.color);
  const page = astylarTree.nodes.find((node) => node.key === mapping.astylarPage);
  const pageStyle = inventory.styles[page?.interactionStyle];
  if (!referenceRule || !candidateRule || !pageRule || styles.retained.color === undefined ||
      styles.normal.color !== styles.retained.color || styles.effective.color !== styles.retained.color ||
      pageStyle?.side !== 'astylar' || canonicalStyle(pageStyle.value).backgroundColor !== styles.retained.color) return;
  return {
    classification: 'parity-harness-defect', attribution: 'reviewed-heading-mask',
    recommendedOwner: 'showcase benchmark heading-paint masking',
    justification: 'Benchmark HTML explicitly sets heading opacity to zero; the candidate leaves opacity at one and explicitly colors the glyphs to match its page background. These are unequal paint inputs and neither can establish visible heading raster parity. Shared heading offsets are a separate reviewed input, not justification for this masking.',
    reviewEvidence: { referenceRule: referenceRule.value, candidateRule: candidateRule.value, pageRule: pageRule.value,
      referenceOpacity: styles.reference.opacity, candidateOpacity: styles.effective.opacity,
      referenceColor: styles.reference.color, candidateColor: styles.retained.color },
  };
}

function reviewedTableFontInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'table' || !['th', 'td'].includes(ref.type) || ast.authored.type !== ref.type ||
      styles.reference.fontSize !== '14px' || styles.retained.fontSize !== '16px') return;
  const refRow = referenceTree.nodes.find((node) => node.key === ref.parent);
  const astRow = astylarTree.nodes.find((node) => node.key === ast.parent);
  if (refRow?.type !== 'tr' || astRow?.authored?.type !== 'tr') return;
  const containingTable = (tree, start, side) => {
    const seen = new Set();
    let node = start;
    while (node && !seen.has(node.key)) {
      seen.add(node.key);
      if ((side === 'reference' ? node.type : node.authored?.type) === 'table') return node;
      node = tree.nodes.find((parent) => parent.key === node.parent);
    }
  };
  const refTable = containingTable(referenceTree, refRow, 'reference');
  const astTable = containingTable(astylarTree, astRow, 'astylar');
  if (refTable?.attributes?.id !== 'table-primary' || astTable?.authored?.id !== 'table-primary' ||
      !String(astTable.authored.class ?? '').split(/\s+/).includes('material-table')) return;
  const rowStyle = inventory.styles[refRow.style];
  const fontToken = ref.type === 'th'
    ? 'var(--mat-table-header-headline-size, var(--mat-sys-title-small-size, 14px))'
    : 'var(--mat-table-row-item-label-text-size, var(--mat-sys-body-medium-size, 14px))';
  const rowRule = refRow.rules.map((index) => inventory.rules[index]).find((rule) => rule?.side === 'reference' &&
    rule.value.active === true && rule.value.declarations?.['font-size']?.value === fontToken);
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'astylar' &&
    rule.value.selector === `.material-table ${ref.type}` && rule.value.fontSize !== undefined);
  if (!rowRule || candidateRules.length !== 1 || candidateRules[0].value.fontSize !== '16px' ||
      rowStyle?.side !== 'reference' || rowStyle.value.fontSize !== '14px') return;
  const candidateRule = candidateRules[0];
  return {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-table-font-input',
    recommendedOwner: 'showcase Material table typography input translation',
    justification: 'The matched reference row/cell computes 14px from its captured Material row typography token. The candidate explicitly authors 16px on the corresponding table-cell selector and core retains 16px. Commit f980edc changed that input from 14px while modifying renderer row sizing. This is the reviewed unequal fixture font input, not a renderer font-scaling inference. The normal/effective table-cell records may omit the size; retained text and authored rules supply separate evidence without rewriting those diagnostic stages.',
    reviewEvidence: { referenceRow: refRow.key, candidateRow: astRow.key, referenceRule: rowRule.value,
      candidateRule: candidateRule.value, referenceComputedFontSize: styles.reference.fontSize, candidateRetainedFontSize: styles.retained.fontSize },
  };
}

function reviewedTreeFontInput(entry, mapping, ref, ast, styles, astylarTree, inventory) {
  if (entry.family !== 'tree' || mapping?.kind !== 'reviewed-showcase-template-text' ||
      styles.reference.fontSize !== '16px' || !['14.4px', '18.4px'].includes(styles.retained.fontSize)) return;
  const referenceRules = ref.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'reference' &&
    rule.value.active === true && rule.value.selector === '.mat-tree-node, .mat-nested-tree-node' &&
    rule.value.declarations?.['font-size']?.value === 'var(--mat-tree-node-text-size, var(--mat-sys-body-large-size))');
  if (referenceRules.length !== 1) return;
  const candidateChain = [];
  const seen = new Set();
  let ancestor = ast;
  while (ancestor && !seen.has(ancestor.key)) {
    seen.add(ancestor.key);
    const normal = inventory.styles[ancestor.normalStyle], effective = inventory.styles[ancestor.interactionStyle];
    if (normal?.side !== 'astylar' || effective?.side !== 'astylar' ||
        !normal.value || !effective.value || Array.isArray(normal.value) || Array.isArray(effective.value)) return;
    candidateChain.push({ node: ancestor.key, normal: normal.value, effective: effective.value });
    if (ancestor.authored?.id === 'page') break;
    if (normal.value.fontSize !== undefined || effective.value.fontSize !== undefined ||
        normal.value.font !== undefined || effective.value.font !== undefined) return;
    const parents = astylarTree.nodes.filter((node) => node.key === ancestor.parent);
    if (parents.length !== 1) return;
    ancestor = parents[0];
  }
  if (ancestor?.authored?.id !== 'page' || ancestor.authored.type !== 'main' || ancestor.parent !== 'root' ||
      astylarTree.nodes.filter((node) => node.authored?.id === 'page').length !== 1) return;
  const page = candidateChain.at(-1);
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'astylar' &&
    rule.value.selector === '#page' && rule.value.fontSize !== undefined);
  if (candidateRules.length !== 1 || candidateRules[0].value.fontSize !== styles.retained.fontSize ||
      page.normal.fontSize !== styles.retained.fontSize || page.effective.fontSize !== styles.retained.fontSize) return;
  return {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-tree-font-input',
    recommendedOwner: 'showcase Material tree component typography input translation',
    justification: 'Material explicitly authors its tree-node font-size token and computes 16px. The candidate has no font-size declaration on the complete leaf-to-page chain until #page, which explicitly authors the same 14.4px or 18.4px size retained by core. This is the missing component typography override present since initial showcase commit 2f44011, not proof of a renderer scaling defect. The later 7159b1d fixed-height label wrapper does not supply the missing font input. No inherited value is substituted into captured declaration stages; other typography and wrapper differences remain separate.',
    reviewEvidence: { referenceRule: referenceRules[0].value, candidateRule: candidateRules[0].value,
      candidateChain, referenceComputedFontSize: styles.reference.fontSize, candidateRetainedFontSize: styles.retained.fontSize },
  };
}

function reviewedFloatingLabelInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (!['form-field', 'input', 'select'].includes(entry.family) || ref.type !== 'mat-label' ||
      ref.attributes?.id !== `${entry.family}-label` || ast.authored.type !== 'label' ||
      !String(ast.authored.class ?? '').split(/\s+/).includes('field-label') ||
      styles.reference.fontSize !== '16px' || styles.retained.fontSize !== '12px' ||
      styles.normal.fontSize !== '12px' || styles.effective.fontSize !== '12px') return;
  const wrapper = referenceTree.nodes.find((node) => node.key === ref.parent);
  const wrapperStyle = inventory.styles[wrapper?.style];
  if (wrapper?.type !== 'label' || !String(wrapper.attributes?.class ?? '').split(/\s+/).includes('mdc-floating-label--float-above') ||
      wrapperStyle?.side !== 'reference' || wrapperStyle.value.fontSize !== '16px' ||
      wrapperStyle.value.transformOrigin !== '0px 0px' ||
      !/^matrix\(0\.75,\s*0,\s*0,\s*0\.75,\s*0,\s*-?(?:\d+(?:\.\d+)?|\.\d+)\)$/.test(wrapperStyle.value.transform ?? '')) return;
  const referenceRule = wrapper.rules.map((index) => inventory.rules[index]).find((rule) => rule?.side === 'reference' &&
    rule.value.active === true && rule.value.declarations?.transform?.value === 'translateY(-106%) scale(0.75)');
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'astylar' &&
    rule.value.selector === '.field-label' && rule.value.fontSize !== undefined);
  if (!referenceRule || candidateRules.length !== 1) return;
  const candidateRule = candidateRules[0];
  if (candidateRule.value.fontSize !== '12px' || candidateRule.value.position !== 'absolute' ||
      candidateRule.value.top !== '8px' || candidateRule.value.left !== '16px' ||
      styles.effective.position !== 'absolute' || styles.effective.top !== '8px' || styles.effective.left !== '16px') return;
  const seen = new Set();
  let ancestor = ast;
  while (ancestor && !seen.has(ancestor.key)) {
    seen.add(ancestor.key);
    const ancestorStyle = inventory.styles[ancestor.interactionStyle];
    if (ancestorStyle?.side !== 'astylar') return;
    const transform = ancestorStyle.value.transform;
    if (transform !== undefined && transform !== 'none') return;
    if (ancestor.authored?.id === 'page') break;
    ancestor = astylarTree.nodes.find((node) => node.key === ancestor.parent);
  }
  if (ancestor?.authored?.id !== 'page') return;
  return {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-floating-label-font-input',
    recommendedOwner: 'Material field-label structure and core CSS transform support',
    justification: 'The reference keeps 16px label typography under a captured .75 wrapper transform. The corresponding candidate explicitly authors and retains an untransformed 12px absolute label at fixed insets. Multiplying the reference font size by the scale describes apparent size, not equivalent input: wrapper geometry, glyph rasterization, tracking and transform-origin semantics remain different. Original-input browser reductions expose core transform-subset gaps; do not accept a font-size substitution as their fix.',
    reviewEvidence: { referenceWrapper: wrapper.key, referenceWrapperStyle: wrapperStyle.value,
      referenceRule: referenceRule.value, candidateRule: candidateRule.value,
      referenceComputedFontSize: styles.reference.fontSize, candidateRetainedFontSize: styles.retained.fontSize },
  };
}

export function collectRetainedTypographyEvidence(cases, inventory) {
  const comparisons = [], differences = [], gaps = [], paintMaskDifferences = [], reviewedMappings = [];
  const mappings = new Map();
  for (const mapping of inventory.cases) {
    const key = JSON.stringify([mapping.case, mapping.side]);
    if (!mappings.has(key)) mappings.set(key, []);
    mappings.get(key).push(mapping);
  }
  const gap = (key, element, reason, evidence = {}) => gaps.push({ case: key, element, reason, ...evidence,
    classification: 'parity-harness-defect', attribution: 'unresolved',
    recommendedOwner: 'input audit direct text-node mapping and retained typography provenance' });
  for (const entry of cases) {
    const key = caseKey(entry);
    const referenceMappings = mappings.get(JSON.stringify([key, 'reference'])) ?? [];
    const astylarMappings = mappings.get(JSON.stringify([key, 'astylar'])) ?? [];
    if (referenceMappings.length !== 1 || astylarMappings.length !== 1 || inventory.errors.some((error) => error.case === key)) {
      gap(key, undefined, 'missing, ambiguous, or invalid full-tree capture'); continue;
    }
    const referenceTree = inventory.variants[referenceMappings[0].variant];
    const astylarTree = inventory.variants[astylarMappings[0].variant];
    if (astylarTree.resolvedStyleEvidenceVersion !== 2 || astylarTree.resolvedStyleSource !== 'core-style-inspection' ||
        !Number.isInteger(astylarMappings[0].resolvedStyleRevision)) {
      gap(key, undefined, 'missing core style-inspection version, source, or revision'); continue;
    }
    const nodesById = (nodes, idOf) => {
      const index = new Map();
      for (const node of nodes) {
        const id = idOf(node);
        if (!id) continue;
        if (!index.has(id)) index.set(id, []);
        index.get(id).push(node);
      }
      return index;
    };
    const referenceNodes = nodesById(referenceTree.nodes, (node) => node.attributes?.id);
    const astylarNodes = nodesById(astylarTree.nodes, (node) => node.authored?.id);
    const headings = reviewedHeadingMappings(referenceTree, astylarTree);
    const headingById = new Map(headings.map((mapping) => [mapping.element, mapping]));
    const textMappings = [...headings, ...reviewedTemplateTextMappings(entry.family, referenceTree, astylarTree)];
    const textMappingById = new Map(textMappings.map((mapping) => [mapping.element, mapping]));
    const mappedReferenceKeys = new Set(textMappings.map((mapping) => mapping.referenceNode));
    for (const mapping of textMappings) {
      referenceNodes.set(mapping.element, [referenceTree.nodes.find((node) => node.key === mapping.referenceNode)]);
      reviewedMappings.push({ case: key, ...mapping });
    }
    const ids = new Set([
      ...referenceTree.nodes.filter((node) => node.ownText?.trim() && !mappedReferenceKeys.has(node.key)).map((node) => node.attributes?.id),
      ...astylarTree.nodes.filter((node) => node.authored?.textContent?.trim()).map((node) => node.authored?.id),
    ]);
    // Anonymous/reference-wrapper mappings remain in the full tree; do not
    // fabricate text correspondences from matching strings or descendant order.
    ids.delete(undefined);
    const anonymousReference = referenceTree.nodes.filter((node) => node.ownText?.trim() && !node.attributes?.id && !mappedReferenceKeys.has(node.key)).map((node) => node.key);
    const anonymousAstylar = astylarTree.nodes.filter((node) => node.authored?.textContent?.trim() && !node.authored?.id).map((node) => node.key);
    if (anonymousReference.length || anonymousAstylar.length) gap(key, undefined, 'own-text nodes without an explicit shared ID require structural mapping',
      { referenceNodes: anonymousReference, astylarNodes: anonymousAstylar });
    for (const id of ids) {
      const refNodes = referenceNodes.get(id) ?? [], astNodes = astylarNodes.get(id) ?? [];
      if (refNodes.length !== 1 || astNodes.length !== 1) {
        gap(key, id, 'own-text ID is missing or duplicated on one side',
          { referenceNodes: refNodes.map((node) => node.key), astylarNodes: astNodes.map((node) => node.key) }); continue;
      }
      const ref = refNodes[0], ast = astNodes[0];
      const refText = ref.ownText?.trim(), astText = ast.authored?.textContent?.trim();
      if (!refText || refText !== astText) {
        gap(key, id, 'direct own-text differs; subtree or transformed text is not an automatic mapping',
          { reference: refText, astylar: astText }); continue;
      }
      if (ast.retainedText?.source !== 'core-text-registry') {
        gap(key, id, 'no authoritative retained core text entry for this authored text node'); continue;
      }
      const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
      const raw = { reference: styleAt(ref.style, 'reference'), normal: styleAt(ast.normalStyle, 'astylar'),
        effective: styleAt(ast.interactionStyle, 'astylar'), retained: styleAt(ast.retainedText.style, 'astylar') };
      if (Object.values(raw).some((style) => !style || typeof style !== 'object' || Array.isArray(style))) {
        gap(key, id, 'missing or wrongly attributed pooled typography style'); continue;
      }
      const styles = Object.fromEntries(Object.entries(raw).map(([stage, style]) => [stage, canonicalStyle(style)]));
      const headingMapping = headingById.get(id);
      const headingMask = reviewedHeadingMask(headingMapping, ref, styles, astylarTree, inventory);
      const tableFont = reviewedTableFontInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory);
      const treeFont = reviewedTreeFontInput(entry, textMappingById.get(id), ref, ast, styles, astylarTree, inventory);
      const floatingLabel = reviewedFloatingLabelInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory);
      if (headingMask) paintMaskDifferences.push({ case: key, element: id, referenceNode: ref.key, astylarNode: ast.key, ...headingMask });
      const comparison = { case: key, family: entry.family, element: id, text: refText,
        referenceNode: ref.key, astylarNode: ast.key, source: 'core-text-registry',
        mapping: textMappingById.get(id) ?? { kind: 'shared-id' },
        revision: astylarMappings[0].resolvedStyleRevision, state: entry.state ?? 'static',
        currentPseudoStatePaintVerified: false, properties: {} };
      for (const property of retainedTypographyProperties) {
        const values = Object.fromEntries(Object.entries(styles).map(([stage, style]) => [stage, style[property]]));
        comparison.properties[property] = values;
        if (values.reference === undefined || values.retained === undefined) {
          gap(key, id, 'missing reference or retained typography property', { property, values });
        } else if (values.reference !== values.retained) {
          differences.push({ case: key, family: entry.family, element: id, property, values,
            referenceNode: ref.key, astylarNode: ast.key, source: comparison.source, revision: comparison.revision,
            classification: 'parity-harness-defect', attribution: 'unresolved',
            recommendedOwner: 'input audit authored typography and core registry-stage attribution',
            justification: 'Browser computed and retained core text properties differ on directly mapped own-text nodes. Trace authored rules and resolution before assigning authoring or core fault; this is not proof of current pseudo-state paint.',
            ...(property === 'color' && headingMask ? headingMask : {}),
            ...(property === 'fontSize' && tableFont ? tableFont : {}),
            ...(property === 'fontSize' && treeFont ? treeFont : {}),
            ...(property === 'fontSize' && floatingLabel ? floatingLabel : {}),
          });
        }
      }
      comparisons.push(comparison);
    }
  }
  return { schemaVersion: 1,
    scope: 'Direct own-text nodes joined by unique shared authored ID or explicit reviewed heading/template identity, with identical trimmed text. All eleven typography properties retain browser computed, core normal/effective declarations, and core retained-text values separately. Missing mappings/fields and unequal retained values remain explicit; no inheritance or font fallback is reconstructed. Reviewed mappings establish correspondence, not style equivalence.',
    comparisons, differences, gaps, paintMaskDifferences, reviewedMappings };
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
        ...(node.retainedText ? { retainedText: { source: node.retainedText.source,
          style: intern({ side, value: node.retainedText.style }, styles, styleIds) } } : {}),
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
    'src/app/services/dom/elements/css-transform.ts',
    'src/app/services/dom/elements/element-material.service.ts',
    'src/app/types/style-rule.ts',
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
      'thirty-two executable browser reductions; twelve pass and twenty diagnostic failures are retained', 'Eight original reductions pass: toolbar, stepper, content-derived flex height, calendar span, bottom overlay, table cells, inherited text stage, and positioned drawer geometry. Floating-label untransformed, literal-translation, default-origin scaling, and translate-then-scale controls also pass. Percentage translation, top-left origin scaling, their combination, reversed scale/translate order, and repeated-translation composition fail. Transform-origin is deliberately preserved as original CSS diagnostic input outside the current public StyleRule subset; order/repetition controls use only existing functions and default origin. Fifteen earlier failures remain: divider empty-block height; two direct-calc grid-list limitations; two literal grid-list and two plain opposing-inset height cases; two loaded-CSS grid-list cases with correct expression resolution but wrong inner auto height; four inline/inline-block intrinsic parent-width cases; and two absolute-margin cases. Inline fragment vertical bounds are not equated to core text planes. Retained typography is not current-paint proof; geometry is not glyph/border raster, scrolling, or full Material composition evidence. Consult the investigation for exact commands and limits.'),
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
    { priority: 0, rootCause: 'Diagnostic declarations are not fully resolved typography', action: 'Complete trustworthy input-stage coverage before accepting the audit. The existing core retained-text stage and inherited-typography reduction now expose font size and line height independently of declarations; preserve that separation and extend missing control/plugin/anonymous-text mappings and current pseudo-state paint provenance. Do not add a competing inheritance algorithm to the showcase or infer resolved values from projected geometry.' },
    { priority: .5, rootCause: 'Benchmark paint masking hides visible heading coverage', action: 'Preserve the captured baseline but restore visible, equivalent heading inputs in the benchmark before claiming complete paint parity. HTML opacity-zero masking and candidate surface-colored ink are unequal and predate the audit. Test the actual unmasked theme/responsive/DPR inputs, retain resulting failures, and reduce them at the owning core subsystem rather than changing heading colors, opacity, offsets or sizes to recover a screenshot score.' },
    { priority: 1, rootCause: 'Rendered output feeds subsequent layout', action: 'Replace connectedOverlayTop mesh projection with a public read-only query of the authoritative core CSS layout boxes. Verify nested transforms, scroll, resize, DPR, and first-open/update cycles. Diagnostic projection may measure output but must never determine authored input.' },
    { priority: 1.1, rootCause: 'CSS transform units, origins and function order are lost before projection', action: 'Extend the incomplete core transform contract: retain translation units, resolve percentages against the CSS transform reference box, and compose transform-origin and the ordered transform list as a CSS-space affine transform, without overwriting repeated functions. Add the public origin field deliberately with compatibility and package tests. Floating-label controls isolate percentage/origin gaps; pixel-only default-origin controls independently prove wrong scale/translate ordering and repeated translations. Preserve 16px label typography and the original wrapper transform instead of substituting a 12px font or new offsets. Do not change Babylon axis mapping to compensate for already incorrect CSS transforms.' },
    { priority: 2, rootCause: 'Range fixture changes reachable values', action: 'Restore the reference 0..100 range and step=5 with inter-thumb constraints. Exercise start=60/end=80 and start=20/end=40, drag both directions across the midpoint, and compare keyboard steps. Remove fixed half-domain clamping; reduce any resulting core interaction failure before implementation.' },
    { priority: 3, rootCause: 'Used-height constraints are replaced by provisional or intrinsic height', action: 'Fix both confirmed general rules: empty blocks must not retain parent height, and auto-height absolute text boxes with top/bottom insets must use the remaining containing-block height. Preserve positioned size ownership through block/flex intrinsic resizing. Keep the divider, literal grid-list and plain opposing-inset reductions unchanged; extend padded/bordered/min-max/nested/resize cases before removing fixture flow substitutions.' },
    { priority: 3.1, rootCause: 'Inline parent intrinsic width ignores in-flow descendants', action: 'Resolve nested inline and inline-block content width before using the parent as a flow item or positioned containing block. Do not simply sum every descendant: exclude out-of-flow content and preserve wrapping, whitespace, padding, min/max and shrink-to-fit constraints. Retain the overlay-free controls and compound badge proofs, then remove measured width tables only after equivalent Material input passes.' },
    { priority: 3.2, rootCause: 'Positioned offsets target the border box instead of the margin box', action: 'Apply the CSS inset/margin sizing equations in the core positioned-box calculation. The fixed-size left/bottom positive and negative margin controls isolate the failure without text, inline layout or Material. Add right/top, auto margins and over-constrained tests; rerun the compound badge before claiming its remaining vertical placement is fully explained.' },
    { priority: 3.5, rootCause: 'Reference CSS expressions bypass direct-style support', action: 'The existing core loaded-document-style path now has a bounded proof: original grid-list calc declarations resolve correct width/height/left at 280px and 480px without fixture arithmetic, while the independent inner used-height defect remains. Verify full Material cascade/state/responsive integration before adopting this path; scope general core corrections for any further unsupported expression or constraint. Do not copy measured pixels or implement per-family arithmetic; literal controls are not acceptance of the original expressions.' },
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
