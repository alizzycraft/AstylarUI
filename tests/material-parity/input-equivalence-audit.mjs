import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadNormalLineBoxReport } from './normal-line-box-report.mjs';
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
  let parityReport, normalLineBoxReport;
  const flags = new Set();
  for (const arg of args) {
    if (arg === '--check' || arg === '--allow-partial') {
      if (flags.has(arg)) throw new Error(`Repeated audit option: ${arg}`);
      flags.add(arg);
    } else if (arg.startsWith('--parity-report=')) {
      if (parityReport !== undefined) throw new Error('Repeated audit option: --parity-report');
      parityReport = arg.slice('--parity-report='.length);
      if (!parityReport.trim()) throw new Error('--parity-report requires a path');
    } else if (arg.startsWith('--normal-line-box-report=')) {
      if (normalLineBoxReport !== undefined) throw new Error('Repeated audit option: --normal-line-box-report');
      normalLineBoxReport = arg.slice('--normal-line-box-report='.length);
      if (!normalLineBoxReport.trim()) throw new Error('--normal-line-box-report requires a path');
    } else {
      throw new Error(`Unknown audit option: ${arg}`);
    }
  }
  return {
    check: flags.has('--check'),
    allowPartial: flags.has('--allow-partial'),
    parityPath: path.resolve(root, parityReport ?? 'artifacts/material-parity/latest-report.json'),
    ...(normalLineBoxReport === undefined ? {} : { normalLineBoxPath: path.resolve(root, normalLineBoxReport) }),
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
  const rawControlTypography = collectControlTypographyEvidence(cases, elementInventory);
  const retainedTypography = collectRetainedTypographyEvidence(cases, elementInventory, rawControlTypography);
  const normalLineBoxes = options.normalLineBoxPath
    ? loadNormalLineBoxReport({ root, reportPath: path.relative(root, path.resolve(root, options.normalLineBoxPath)).replaceAll('\\', '/'), cases, inventory: elementInventory,
      controlTypography: rawControlTypography, expectedProvenance: parityReport.captureProvenance })
    : { schemaVersion: 1, observations: [], errors: [], missing: rawControlTypography.comparisons
      .filter((item) => item.case.startsWith('static:') && item.properties.lineHeight.reference === 'normal')
      .map((item) => ({ case: item.case, element: item.element, referenceNode: item.referenceNode })),
      scope: 'No supplemental static natural-line-box report selected. No line-height equivalence inferred.' };
  const controlTypography = attributeObservedNormalLineBoxes(rawControlTypography, elementInventory, normalLineBoxes);
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
    normalLineBoxes,
    summary: {
      inputEquivalent: coverage.complete && coverage.missingElements.length === 0 &&
        supplementalBehavior.missing.length === 0 && supplementalBehavior.errors.length === 0 && supplementalBehavior.mismatches.length === 0 &&
        supplementalOverlays.missing.length === 0 && supplementalOverlays.errors.length === 0 && supplementalOverlays.mismatches.length === 0 &&
        supplementalSlider.missing.length === 0 && supplementalSlider.errors.length === 0 && supplementalSlider.mismatches.length === 0 &&
        normalLineBoxes.missing.length === 0 && normalLineBoxes.errors.length === 0 &&
        elementInventory.gaps.length === 0 && elementInventory.resolvedStyleGaps.length === 0 && elementInventory.stateStyleGaps.length === 0 && elementInventory.errors.length === 0 &&
        retainedTypography.gaps.length === 0 && retainedTypography.differences.length === 0 && retainedTypography.paintMaskDifferences.length === 0 &&
        controlTypography.gaps.length === 0 && controlTypography.differences.length === 0 && controlTypography.iconSubstitutions.length === 0 &&
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
    controlTypography,
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
  if (!Array.isArray(report.retainedTypography?.controlTextMappings)) errors.push('missing retained-to-control text stage inventory');
  const controlTextMappingKeys = report.retainedTypography?.controlTextMappings?.map((mapping) =>
    JSON.stringify([mapping.case, mapping.element, mapping.referenceNode, mapping.astylarNode])) ?? [];
  if (new Set(controlTextMappingKeys).size !== controlTextMappingKeys.length) errors.push('duplicate retained-to-control text stage mappings');
  const invalidControlTextMappings = report.retainedTypography?.controlTextMappings?.filter((mapping) => {
    const matches = report.controlTypography?.comparisons.filter((comparison) => comparison.case === mapping.case &&
      comparison.element === mapping.element && comparison.referenceNode === mapping.referenceNode &&
      comparison.astylarNode === mapping.astylarNode && comparison.text === mapping.text &&
      comparison.source === mapping.source && comparison.revision === mapping.revision) ?? [];
    return mapping.source !== 'core-control-texture' || mapping.attribution !== 'reviewed-control-text-stage-ownership' ||
      mapping.classification !== 'parity-harness-defect' || mapping.inputEquivalent !== false ||
      !mapping.justification || matches.length !== 1;
  }) ?? [];
  if (invalidControlTextMappings.length > 0) errors.push(`${invalidControlTextMappings.length} retained-to-control text stage mappings lack authoritative comparison evidence`);
  if (report.controlTypography?.schemaVersion !== 1) errors.push('missing control texture typography stage report');
  const invalidCalendarMappings = report.controlTypography?.comparisons.filter((comparison) => {
    if (!['reviewed-material-calendar-day-label', 'reviewed-material-calendar-year-label'].includes(comparison.mapping?.kind)) return false;
    const inventory = report.elementInventory;
    const refs = inventory.cases.filter((entry) => entry.case === comparison.case && entry.side === 'reference');
    const asts = inventory.cases.filter((entry) => entry.case === comparison.case && entry.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1 || comparison.family !== 'datepicker') return true;
    const referenceTree = inventory.variants[refs[0].variant], astylarTree = inventory.variants[asts[0].variant];
    const nodes = referenceTree.nodes.filter((node) => node.key === comparison.referenceNode);
    const mapped = nodes.length === 1 && reviewedCalendarCellControl(nodes[0], referenceTree, astylarTree,
      comparison.mapping.kind === 'reviewed-material-calendar-year-label' ? 'year' : 'day');
    const candidate = astylarTree.nodes.filter((node) => node.authored?.id === comparison.element);
    return !mapped || mapped.id !== comparison.element || mapped.parent.key !== comparison.referenceControl ||
      candidate.length !== 1 || candidate[0].key !== comparison.astylarNode ||
      candidate[0].paintedControlText?.source !== 'core-control-texture' || comparison.source !== 'core-control-texture' ||
      candidate[0].paintedControlText.text !== comparison.text || nodes[0].ownText.trim() !== comparison.text.trim() ||
      comparison.revision !== asts[0].resolvedStyleRevision || comparison.finalRasterVerified !== false ||
      JSON.stringify(mapped.evidence) !== JSON.stringify(comparison.mapping.reviewEvidence);
  }) ?? [];
  if (invalidCalendarMappings.length) errors.push(`${invalidCalendarMappings.length} calendar cell mappings lack exact captured date/range context evidence`);
  if (requireComplete && report.controlTypography?.gaps.length > 0) errors.push(`${report.controlTypography.gaps.length} control texture mappings or stage fields require review`);
  const reviewedControlKinds = {
    'reviewed-button-tracking-input': 'application-plugin-authoring-defect',
    'reviewed-disabled-button-ink': 'application-plugin-authoring-defect',
    'reviewed-button-font-token-input': 'application-plugin-authoring-defect',
    'reviewed-core-font-list-rewrite': 'confirmed-core-renderer-defect',
    'reviewed-toolbar-button-line-height-input': 'application-plugin-authoring-defect',
    'reviewed-tab-label-typography-input': 'application-plugin-authoring-defect',
    'reviewed-calendar-day-typography-input': 'application-plugin-authoring-defect',
    'reviewed-calendar-year-typography-input': 'application-plugin-authoring-defect',
    'reviewed-normal-line-box-stage-comparison': 'parity-harness-defect',
  };
  const unresolvedControlTypography = report.controlTypography?.differences.filter((entry) =>
    !reviewedControlKinds[entry.attribution] || entry.classification !== reviewedControlKinds[entry.attribution] || !entry.reviewEvidence ||
    (entry.attribution === 'reviewed-normal-line-box-stage-comparison' &&
      !isReviewedNormalLineBoxDifference(entry, report.normalLineBoxes))) ?? [];
  if (requireComplete && unresolvedControlTypography.length > 0) errors.push(`${unresolvedControlTypography.length} control texture typography differences require attribution`);
  if (!Array.isArray(report.controlTypography?.iconSubstitutions)) errors.push('missing control icon substitution inventory');
  const unresolvedIcons = report.controlTypography?.iconSubstitutions?.filter((entry) =>
    !['reviewed-paginator-svg-to-glyph-input', 'reviewed-calendar-navigation-svg-to-glyph-input'].includes(entry.attribution) || entry.classification !== 'application-plugin-authoring-defect' ||
    !entry.reviewEvidence?.referencePath?.attributes?.d || !entry.reviewEvidence?.candidatePaintedStyle ||
    !entry.justification || entry.inputEquivalent !== false) ?? [];
  if (requireComplete && unresolvedIcons.length > 0) errors.push(`${unresolvedIcons.length} control icon substitutions require attribution`);
  const invalidCalendarIcons = report.controlTypography?.iconSubstitutions?.filter(entry => {
    if (entry.attribution !== 'reviewed-calendar-navigation-svg-to-glyph-input') return false;
    const inventory = report.elementInventory;
    const refs = inventory.cases.filter(c => c.case === entry.case && c.side === 'reference');
    const asts = inventory.cases.filter(c => c.case === entry.case && c.side === 'astylar');
    if (entry.family !== 'datepicker' || refs.length !== 1 || asts.length !== 1 || entry.revision !== asts[0].resolvedStyleRevision) return true;
    const ref = inventory.variants[refs[0].variant], ast = inventory.variants[asts[0].variant];
    const controls = ast.nodes.filter(n => n.key === entry.astylarNode && n.authored?.id === entry.element);
    const replay = controls.length === 1 && reviewedNavigationIconInput({ family: 'datepicker' }, controls[0], ref, ast, inventory, entry.revision);
    return !replay || entry.inputEquivalent !== false || entry.finalRasterVerified !== false ||
      entry.classification !== replay.classification || entry.source !== replay.source || entry.referenceNode !== replay.referenceNode ||
      JSON.stringify([entry.reference, entry.astylar, entry.reviewEvidence]) !== JSON.stringify([replay.reference, replay.astylar, replay.reviewEvidence]);
  }) ?? [];
  if (invalidCalendarIcons.length) errors.push(`${invalidCalendarIcons.length} calendar navigation substitutions lack captured vector/context evidence`);
  const retainedGaps = report.retainedTypography?.gaps ?? [];
  const invalidHiddenGaps = retainedGaps.filter((gap) => gap.attribution === 'reviewed-display-none-text-stage' &&
    !isReviewedHiddenRetainedGap(gap, report.elementInventory));
  if (invalidHiddenGaps.length) errors.push(`${invalidHiddenGaps.length} hidden retained-text stage attributions lack captured ancestry evidence`);
  const invalidStepperGaps = retainedGaps.filter((gap) => gap.attribution === 'reviewed-stepper-panel-substitution' &&
    !isReviewedStepperPanelGap(gap, report.elementInventory));
  if (invalidStepperGaps.length) errors.push(`${invalidStepperGaps.length} stepper panel substitutions lack captured structural evidence`);
  const unresolvedRetainedGaps = retainedGaps.filter((gap) => !isReviewedHiddenRetainedGap(gap, report.elementInventory) &&
    !isReviewedStepperPanelGap(gap, report.elementInventory));
  if (requireComplete && unresolvedRetainedGaps.length > 0) errors.push(`${unresolvedRetainedGaps.length} retained typography mappings or stage fields require review`);
  const reviewedTypographyKinds = { 'reviewed-heading-mask': 'parity-harness-defect',
    'reviewed-table-font-input': 'application-plugin-authoring-defect',
    'reviewed-tree-font-input': 'application-plugin-authoring-defect',
    'reviewed-control-label-token-input': 'application-plugin-authoring-defect',
    'reviewed-select-value-token-input': 'application-plugin-authoring-defect',
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
  if (report.normalLineBoxes?.schemaVersion !== 1) errors.push('missing natural-line-box evidence stage');
  if (requireComplete && report.normalLineBoxes?.missing.length > 0) errors.push(`${report.normalLineBoxes.missing.length} static normal-line-box observations are missing`);
  if (report.normalLineBoxes?.errors.length > 0) errors.push(`${report.normalLineBoxes.errors.length} natural-line-box evidence errors`);
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
    `Control-owned text routing: ${report.retainedTypography.controlTextMappings.length} exact label mappings are reviewed in the current core-control-texture stage, not treated as missing registry entries. Their independent input differences and any current-paint gaps remain enforced; this is not wrapper or input equivalence.`,
    `Hidden retained-text stage: ${report.retainedTypography.gaps.filter((gap) => isReviewedHiddenRetainedGap(gap, report.elementInventory)).length} gap records have complete captured ancestry explaining why core creates no text entry below display:none. The records and raw styles remain; reference display:none and visibility:hidden mechanisms are distinguished, not normalized into equivalent inputs.`,
    `Stepper structure: ${report.retainedTypography.gaps.filter((gap) => isReviewedStepperPanelGap(gap, report.elementInventory)).length} gap records document an omitted inactive reference panel, classified as unequal fixture structure rather than missing core text. Active-panel typography remains independently compared.`,
    '',
    `Control texture typography: ${report.controlTypography.comparisons.length} mapped current-texture observations; ${report.controlTypography.gaps.length} mapping/stage gaps and ${report.controlTypography.differences.length} raw computed-to-paint property differences, including individually reviewed stage-representation differences. Parsed CSS lengths and line-height multipliers are normalized independently of declarations. This does not prove final material effects, placement, visibility or raster parity.`,
    '',
    `Static natural line boxes: ${report.normalLineBoxes.observations.length} validated browser observations, ${report.normalLineBoxes.missing.length} missing and ${report.normalLineBoxes.errors.length} evidence errors. Matching observed heights explain only the raw normal-to-numeric stage comparison; other typography inputs, baseline, wrapping and final raster remain independent questions. No global normal-to-pixel substitution is accepted.`,
    '',
    `Control icon substitutions: ${report.controlTypography.iconSubstitutions.length} captured SVG-to-text input replacements. These are unequal content/geometry inputs, not accepted text-owner mappings or font comparisons. Their actual glyph paint inputs remain recorded separately from the reference vector path.`,
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
  if (family === 'sort') paths.push({
    element: 'sort-label',
    reference: [['div', 'sort-primary', 'mat-sort'], ['div', 'sort-trigger', 'mat-sort-header'], ['div', null, 'mat-sort-header-container'], ['div', null, 'mat-sort-header-content']],
    astylar: [['div', 'sort-primary', 'sort-header'], ['div', 'sort-trigger', 'sort-trigger'], ['span', 'sort-label']],
  });
  if (family === 'select') paths.push({
    element: 'select-value',
    reference: [['mat-form-field', 'select-primary', 'mat-mdc-form-field'], ['div', null, 'mat-mdc-text-field-wrapper'], ['div', null, 'mat-mdc-form-field-flex'], ['div', null, 'mat-mdc-form-field-infix'], ['mat-select', 'select-control', 'mat-mdc-select', { role: 'combobox' }], ['div', null, 'mat-mdc-select-trigger'], ['div', /^mat-select-value-\d+$/, 'mat-mdc-select-value'], ['span', null, 'mat-mdc-select-value-text'], ['span', null, 'mat-mdc-select-min-line']],
    astylar: [['div', 'select-primary', 'field-shell'], ['div', 'select-input-region', 'field-input-region'], ['span', 'select-value', 'select-value']],
  });
  if (family === 'button-toggle') paths.push(...['one', 'two'].map((name) => ({
    element: `button-toggle-${name}-label`,
    reference: [['mat-button-toggle-group', 'button-toggle-primary', 'mat-button-toggle-group'], ['mat-button-toggle', `button-toggle-${name}`, 'mat-button-toggle'], ['button', `button-toggle-${name}-button`, 'mat-button-toggle-button'], ['span', null, 'mat-button-toggle-label-content']],
    astylar: [['div', 'button-toggle-primary'], ['div', `button-toggle-${name}`, 'button-toggle-option'], ['span', `button-toggle-${name}-label`]],
  })));
  if (family === 'chips') paths.push(...[0, 1].map((index) => ({
    element: `chip-${index}-label`, referenceEmptyFocusChild: true,
    reference: [['mat-chip-listbox', 'chips-primary', 'mat-mdc-chip-listbox'], ['div', null, 'mdc-evolution-chip-set__chips'], ['mat-chip-option', `chip-${index}`, 'mat-mdc-chip-option'], ['span', null, 'mdc-evolution-chip__cell--primary'], ['button', null, 'mdc-evolution-chip__action--primary'], ['span', null, 'mdc-evolution-chip__text-label']],
    astylar: [['div', 'chips-primary', 'row'], ['div', `chip-${index}`, 'chip'], ['span', `chip-${index}-label`, 'chip-label']],
  })));
  if (family === 'paginator') paths.push(...[
    ['paginator-size', 'page-size', 'page-size-label', /^mat-paginator-page-size-label-\d+$/],
    ['paginator-page-size', 'page-size', 'page-size-value', null],
    ['paginator-range', 'range-actions', 'range-label', null],
  ].map(([element, group, label, id]) => ({
    element,
    reference: [['mat-paginator', 'paginator-primary', 'mat-mdc-paginator'], ['div', null, 'mat-mdc-paginator-outer-container'], ['div', null, 'mat-mdc-paginator-container'], ['div', null, `mat-mdc-paginator-${group}`], ['div', id, `mat-mdc-paginator-${label}`]],
    astylar: [['div', 'paginator-primary', 'paginator'], ['div', 'paginator-container', 'paginator-container'], ['div', group === 'page-size' ? 'paginator-page-size-group' : 'paginator-range-actions', `paginator-${group}`], ['span', element]],
  })));
  if (family === 'expansion') paths.push({
    element: 'expansion-content-label',
    reference: [['mat-expansion-panel', 'expansion-primary', 'mat-expansion-panel'], ['div', null, 'mat-expansion-panel-content-wrapper'], ['div', /^cdk-accordion-child-\d+$/, 'mat-expansion-panel-content'], ['div', null, 'mat-expansion-panel-body'], ['p', 'expansion-content']],
    astylar: [['article', 'expansion-shell', 'expansion-panel'], ['p', 'expansion-content'], ['span', 'expansion-content-label', 'expansion-content-label']],
  });
  if (family === 'sidenav') paths.push({
    element: 'sidenav-nav',
    reference: [['mat-sidenav-container', 'sidenav-primary', 'mat-sidenav-container'], ['mat-sidenav', 'sidenav-nav', 'mat-sidenav'], ['div', null, 'mat-drawer-inner-container']],
    astylar: [['div', 'sidenav-primary', 'sidenav-container'], ['aside', 'sidenav-nav', 'sidenav']],
  });
  if (family === 'stepper') {
    for (const [index, name] of ['details', 'review'].entries()) paths.push({
      element: `step-${name}-badge`,
      reference: [['mat-stepper', 'stepper-primary', 'mat-stepper-horizontal'], ['div', null, 'mat-horizontal-stepper-wrapper'], ['div', null, 'mat-horizontal-stepper-header-container'], ['mat-step-header', new RegExp(`^cdk-stepper-\\d+-label-${index}$`), 'mat-step-header'], ['div', null, 'mat-step-icon-state-number'], ['div', null, 'mat-step-icon-content'], ['span']],
      astylar: [['div', 'stepper-primary', 'stepper'], ['div', 'stepper-head', 'stepper-head'], ['div', `step-${name}`, 'step-tab'], ['span', `step-${name}-badge`, 'step-badge']],
    });
    paths.push({
      element: 'stepper-content',
      reference: [['mat-stepper', 'stepper-primary', 'mat-stepper-horizontal'], ['div', null, 'mat-horizontal-stepper-wrapper'], ['div', null, 'mat-horizontal-content-container'], ['div', /^cdk-stepper-\d+-content-[01]$/, 'mat-horizontal-stepper-content-current'], ['span', null, null, { 'data-parity-id': 'stepper-content' }]],
      astylar: [['div', 'stepper-primary', 'stepper'], ['div', 'stepper-content-container', 'stepper-content-container'], ['span', 'stepper-content']],
    });
  }
  const follow = (tree, side, steps) => {
    const data = (node) => side === 'reference' ? { ...node.attributes, type: node.type } : node.authored;
    let parent;
    const chain = [];
    for (const [type, id, className, attributes] of steps) {
      const matches = tree.nodes.filter((node) => {
        const value = data(node);
        return value?.type === type && (!parent || node.parent === parent.key) &&
          (id instanceof RegExp ? id.test(value.id ?? '') : id ? value.id === id : !value.id) &&
          (!className || String(value.class ?? '').split(/\s+/).includes(className)) &&
          (!attributes || Object.entries(attributes).every(([key, expected]) => value[key] === expected));
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
    const referenceAliasOwners = referenceTree.nodes.filter((node) => node.attributes?.id === path.element);
    // A same-ID wrapper is not a competing text owner when it is on the
    // reviewed path and has no own text (the sidenav's generated inner div).
    const wrapperAlias = referenceAliasOwners.length === 1 && reference.slice(0, -1).includes(referenceAliasOwners[0]) &&
      !referenceAliasOwners[0].ownText?.trim();
    const referenceChildren = referenceTree.nodes.filter((node) => node.parent === ref.key);
    const focusChild = referenceChildren[0];
    const knownEmptyFocusChild = path.referenceEmptyFocusChild && referenceChildren.length === 1 &&
      focusChild.type === 'span' && !focusChild.attributes?.id && !focusChild.ownText?.trim() &&
      String(focusChild.attributes?.class ?? '').split(/\s+/).filter(Boolean).sort().join(' ') ===
        'mat-focus-indicator mat-mdc-chip-primary-focus-indicator' &&
      referenceTree.nodes.filter((node) => node.key === focusChild.key).length === 1 &&
      !referenceTree.nodes.some((node) => node.parent === focusChild.key);
    if (!ref.ownText?.trim() || ref.ownText.trim() !== ast.authored.textContent?.trim() ||
        (referenceAliasOwners.length && !wrapperAlias) ||
        (path.referenceEmptyFocusChild ? !knownEmptyFocusChild : referenceChildren.length > 0) ||
        astylarTree.nodes.some((node) => node.parent === ast.key)) continue;
    pairs.push({ kind: 'reviewed-showcase-template-text', element: path.element,
      referenceNode: ref.key, astylarNode: ast.key,
      referencePath: reference.map((node) => node.key), astylarPath: astylar.map((node) => node.key),
      referenceDecorationNodes: knownEmptyFocusChild ? [focusChild.key] : [],
      justification: 'The paired reference.component.ts and astylar.component.ts templates identify this text through a unique component anchor and exact direct-child tag/ID/class path. Both text owners have identical direct own-text. They have no element children except the explicitly identified, unique, text-free chip focus-indicator leaf when required by that reviewed template. Generated Material IDs are checked by shape and uniqueness, not their unstable numeric suffix. A same-ID reference wrapper is allowed only on that path with no own text. This establishes text-owner identity only; wrapper, decoration, layout, typography, paint and interaction differences remain subject to separate comparison.' });
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

function reviewedControlLabelTokenInput(entry, mapping, property, ast, styles, referenceTree, astylarTree, inventory) {
  if (!['chips', 'button-toggle'].includes(entry.family) || mapping?.kind !== 'reviewed-showcase-template-text') return;
  const weight = property === 'fontWeight' && styles.reference.fontWeight === '500' && styles.retained.fontWeight === '400';
  const tracking = entry.family === 'chips' && property === 'letterSpacing' && styles.reference.letterSpacing === '0.096px' && styles.retained.letterSpacing === '0';
  if (!weight && !tracking) return;
  const cssProperty = weight ? 'font-weight' : 'letter-spacing';
  const token = weight ? 'weight' : 'tracking';
  const referenceSelector = entry.family === 'chips' ? '.mat-mdc-standard-chip .mdc-evolution-chip__text-label' : '.mat-button-toggle-appearance-standard';
  const component = entry.family === 'chips' ? 'chip' : 'button-toggle';
  const declaration = `var(--mat-${component}-label-text-${token}, var(--mat-sys-label-large-${token}))`;
  const referenceChain = [];
  let referenceRule;
  for (const key of [...mapping.referencePath].reverse()) {
    const nodes = referenceTree.nodes.filter((node) => node.key === key);
    if (nodes.length !== 1) return;
    const node = nodes[0], style = inventory.styles[node.style];
    if (style?.side !== 'reference' || canonicalStyle(style.value)[property] !== styles.reference[property]) return;
    referenceChain.push({ node: key, computed: style.value });
    const rules = node.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'reference' &&
      rule.value.active === true && rule.value.selector === referenceSelector && rule.value.declarations?.[cssProperty]?.value === declaration);
    if (rules.length > 1) return;
    if (rules.length === 1) { referenceRule = rules[0].value; break; }
  }
  if (!referenceRule) return;
  const candidateChain = [], seen = new Set();
  let ancestor = ast;
  while (ancestor && !seen.has(ancestor.key)) {
    seen.add(ancestor.key);
    const normal = inventory.styles[ancestor.normalStyle], effective = inventory.styles[ancestor.interactionStyle];
    if (normal?.side !== 'astylar' || effective?.side !== 'astylar' || !normal.value || !effective.value ||
        Array.isArray(normal.value) || Array.isArray(effective.value) ||
        normal.value[property] !== undefined || effective.value[property] !== undefined ||
        normal.value.font !== undefined || effective.value.font !== undefined) return;
    candidateChain.push({ node: ancestor.key, normal: normal.value, effective: effective.value });
    if (ancestor.authored?.id === 'page') break;
    const parents = astylarTree.nodes.filter((node) => node.key === ancestor.parent);
    if (parents.length !== 1) return;
    ancestor = parents[0];
  }
  if (ancestor?.authored?.id !== 'page' || ancestor.authored.type !== 'main' || ancestor.parent !== 'root' ||
      astylarTree.nodes.filter((node) => node.authored?.id === 'page').length !== 1) return;
  return {
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-control-label-token-input',
    recommendedOwner: 'showcase chip/button-toggle component label typography translation',
    justification: 'The reviewed Material label path computes an explicit component typography token. Every captured candidate normal/effective declaration from its text leaf through main#page omits that property, and core retains a different value. This is a missing component input, not an equivalent representation or evidence of incorrect rendering of a shared input. Only font-weight and chip tracking are attributed; button-toggle tracking resets at its button and is intentionally excluded. Restore the original token intent before evaluating core and do not resize labels or adjust offsets to compensate.',
    reviewEvidence: { property, referenceRule, referenceChain, candidateChain,
      referenceComputed: styles.reference[property], candidateRetained: styles.retained[property] },
  };
}

function reviewedSelectValueInput(entry, mapping, property, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'select' || mapping?.element !== 'select-value' || mapping.kind !== 'reviewed-showcase-template-text') return;
  const specs = {
    fontFamily: ['font-family', 'var(--mat-select-trigger-text-font, var(--mat-sys-body-large-font))', 'roboto', 'roboto,arial,sans-serif'],
    lineHeight: ['line-height', 'var(--mat-select-trigger-text-line-height, var(--mat-sys-body-large-line-height))', '24px', 'normal'],
    letterSpacing: ['letter-spacing', 'var(--mat-select-trigger-text-tracking, var(--mat-sys-body-large-tracking))', '0.496px', '0'],
    color: ['color', 'var(--mat-select-enabled-trigger-text-color, var(--mat-sys-on-surface))', undefined, 'rgba(29,27,32,1)'],
  };
  const spec = specs[property];
  if (!spec || styles.retained[property] !== spec[3] || (spec[2] && styles.reference[property] !== spec[2])) return;
  const [cssProperty, token] = spec, referenceChain = [];
  let referenceRule;
  for (const key of [...mapping.referencePath].reverse()) {
    const nodes = referenceTree.nodes.filter((node) => node.key === key);
    if (nodes.length !== 1) return;
    const node = nodes[0], pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || canonicalStyle(pooled.value)[property] !== styles.reference[property] ||
        node.inline?.[cssProperty] || (property !== 'color' && node.inline?.font)) return;
    referenceChain.push({ node: key, computed: pooled.value });
    const rules = node.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'reference' &&
      rule.value.active === true && (rule.value.declarations?.[cssProperty] || (property !== 'color' && rule.value.declarations?.font)));
    if (node.type === 'mat-select' && node.attributes?.id === 'select-control') {
      if (rules.length !== 1 || rules[0].value.selector !== '.mat-mdc-select' || rules[0].value.declarations[cssProperty]?.value !== token) return;
      referenceRule = rules[0].value; break;
    }
    if (rules.length) return;
  }
  if (!referenceRule) return;
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index]).filter((rule) => rule?.side === 'astylar').map((rule) => rule.value);
  const valueRules = candidateRules.filter((rule) => rule.selector === '.select-value');
  if (valueRules.length !== 1) return;
  let candidateChain, candidateRule = valueRules[0];
  if (property === 'color') {
    if (canonicalStyle(candidateRule).color !== styles.retained.color || styles.normal.color !== styles.retained.color ||
        styles.effective.color !== styles.retained.color || styles.reference.color === styles.retained.color) return;
    candidateChain = [{ node: ast.key, normal: inventory.styles[ast.normalStyle].value, effective: inventory.styles[ast.interactionStyle].value }];
  } else if (property === 'fontFamily') {
    candidateChain = [];
    const seen = new Set();
    let node = ast;
    while (node && !seen.has(node.key)) {
      seen.add(node.key);
      const normal = inventory.styles[node.normalStyle], effective = inventory.styles[node.interactionStyle];
      if (normal?.side !== 'astylar' || effective?.side !== 'astylar' || !normal.value || !effective.value ||
          normal.value.font !== undefined || effective.value.font !== undefined) return;
      candidateChain.push({ node: node.key, normal: normal.value, effective: effective.value });
      if (node.authored?.id === 'page') break;
      if (normal.value.fontFamily !== undefined || effective.value.fontFamily !== undefined) return;
      const parents = astylarTree.nodes.filter((item) => item.key === node.parent);
      if (parents.length !== 1) return;
      node = parents[0];
    }
    const pages = candidateRules.filter((rule) => rule.selector === '#page' && rule.fontFamily !== undefined);
    if (node?.authored?.id !== 'page' || node.authored.type !== 'main' || node.parent !== 'root' ||
        astylarTree.nodes.filter((item) => item.authored?.id === 'page').length !== 1 || pages.length !== 1 ||
        canonicalStyle(pages[0]).fontFamily !== styles.retained.fontFamily ||
        ['normal', 'effective'].some((stage) => canonicalStyle(candidateChain.at(-1)[stage]).fontFamily !== styles.retained.fontFamily)) return;
    candidateRule = pages[0];
  } else {
    candidateChain = candidateTypographyOmissionChain(ast, astylarTree, inventory, property);
    if (!candidateChain) return;
  }
  if (property !== 'color' && (valueRules[0][property] !== undefined || valueRules[0].font !== undefined)) return;
  return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-select-value-token-input',
    recommendedOwner: 'showcase Material select trigger typography and theme input translation',
    justification: 'The exact select-value reference path inherits an active Material trigger token with no intervening property override. Candidate declaration evidence instead shows a missing component override (page font stack or omitted line-height/tracking), or the explicitly hard-coded enabled ink retained unchanged by core. The replacement label was introduced in f286fb1. This attributes unequal authored inputs, not wrapper equivalence or a core rendering defect. Fixed label height and offsets do not replace the missing CSS inputs; restore component intent before an equal-input renderer proof.',
    reviewEvidence: { sourceFinding: 'fixture-select-value-typography-substitution', property, referenceRule, referenceChain,
      candidateRule, candidateValueRule: valueRules[0], candidateChain,
      referenceComputed: styles.reference[property], candidateRetained: styles.retained[property] } };
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

function reviewedStepperPanelEvidence(gap, inventory) {
  if (gap.family !== 'stepper' || gap.reason !== 'own-text nodes without an explicit shared ID require structural mapping' ||
      gap.referenceNodes?.length !== 1 || gap.astylarNodes?.length !== 0 || inventory.errors.some((error) => error.case === gap.case)) return;
  const trees = {}, records = {};
  for (const side of ['reference', 'astylar']) {
    const matches = inventory.cases.filter((entry) => entry.case === gap.case && entry.side === side);
    if (matches.length !== 1) return;
    records[side] = matches[0];
    trees[side] = inventory.variants[matches[0].variant];
    if (trees[side]?.side !== side || trees[side].family !== 'stepper') return;
  }
  const { reference, astylar } = trees;
  if (astylar.resolvedStyleEvidenceVersion !== 2 || astylar.resolvedStyleSource !== 'core-style-inspection' ||
      !Number.isInteger(records.astylar.resolvedStyleRevision) || records.astylar.resolvedStyleRevision < 0) return;
  const mappings = reviewedTemplateTextMappings('stepper', reference, astylar).filter((entry) => entry.element === 'stepper-content');
  if (mappings.length !== 1) return;
  const mapping = mappings[0], active = reference.nodes.find((node) => node.key === mapping.referenceNode);
  const activePanel = reference.nodes.find((node) => node.key === active.parent);
  const candidates = astylar.nodes.filter((node) => node.key === mapping.astylarNode);
  const inactiveNodes = reference.nodes.filter((node) => node.key === gap.referenceNodes[0]);
  if (candidates.length !== 1 || inactiveNodes.length !== 1) return;
  const candidate = candidates[0], inactive = inactiveNodes[0];
  const panels = reference.nodes.filter((node) => node.key === inactive.parent);
  if (panels.length !== 1) return;
  const panel = panels[0], index = activePanel.attributes?.id?.match(/^cdk-stepper-(\d+)-content-([01])$/);
  const activeText = active.ownText?.trim(), expectedActive = index?.[2] === '0' ? 'Project details' : 'Review changes';
  const inactiveText = index?.[2] === '0' ? 'Review changes' : 'Project details';
  const classes = String(panel.attributes?.class ?? '').split(/\s+/);
  if (!index || activeText !== expectedActive || candidate.authored?.role !== 'tabpanel' ||
      candidate.authored.textContent?.trim() !== activeText || panel.parent !== activePanel.parent ||
      panel.attributes?.id !== `cdk-stepper-${index[1]}-content-${1 - Number(index[2])}` ||
      reference.nodes.filter((node) => node.attributes?.id === panel.attributes.id).length !== 1 ||
      panel.attributes.role !== 'tabpanel' || activePanel.attributes.role !== 'tabpanel' ||
      !Object.hasOwn(panel.attributes, 'inert') || !classes.includes('mat-horizontal-stepper-content') ||
      !classes.includes(index[2] === '0' ? 'mat-horizontal-stepper-content-next' : 'mat-horizontal-stepper-content-previous') ||
      classes.includes('mat-horizontal-stepper-content-current') || inactive.type !== 'span' || inactive.attributes?.id ||
      inactive.attributes?.['data-parity-id'] !== 'stepper-content' || inactive.ownText?.trim() !== inactiveText ||
      reference.nodes.filter((node) => node.parent === panel.key).length !== 1 ||
      reference.nodes.filter((node) => node.parent === activePanel.parent).length !== 2 ||
      reference.nodes.some((node) => node.parent === inactive.key) ||
      astylar.nodes.filter((node) => node.authored?.role === 'tabpanel').length !== 1 ||
      astylar.nodes.filter((node) => node.parent === candidate.parent).length !== 1 ||
      astylar.nodes.some((node) => node.authored?.textContent?.trim() === inactiveText)) return;
  const observations = [];
  for (const [side, node] of [['reference', activePanel], ['reference', active], ['reference', panel], ['reference', inactive], ['astylar', candidate]]) {
    const indexes = side === 'reference' ? { computed: node.style } : { normal: node.normalStyle, effective: node.interactionStyle };
    const styles = {};
    for (const [stage, index] of Object.entries(indexes)) {
      const pooled = inventory.styles[index];
      if (pooled?.side !== side || !pooled.value || typeof pooled.value !== 'object' || Array.isArray(pooled.value)) return;
      styles[stage] = pooled.value;
    }
    observations.push({ side, node: node.key, parent: node.parent, identity: side === 'reference' ? node.attributes : node.authored, ...styles });
  }
  if (observations[2].computed.visibility !== 'hidden' || observations[2].computed.height !== '0px' ||
      observations[3].computed.visibility !== 'hidden') return;
  return structuredClone({ sourceFinding: 'fixture-stepper-inactive-panel-omitted', source: 'core-style-inspection',
    revision: records.astylar.resolvedStyleRevision, activeMapping: mapping, inactiveReferenceNode: inactive.key,
    activeText, inactiveText, observations, inputEquivalent: false, currentPseudoStatePaintVerified: false });
}

function isReviewedStepperPanelGap(gap, inventory) {
  if (gap.attribution !== 'reviewed-stepper-panel-substitution' || gap.classification !== 'application-plugin-authoring-defect' ||
      gap.inputEquivalent !== false || !gap.justification || !gap.reviewEvidence) return false;
  const evidence = reviewedStepperPanelEvidence(gap, inventory);
  return !!evidence && JSON.stringify(evidence) === JSON.stringify(gap.reviewEvidence);
}

function reviewedHiddenRetainedEvidence(gap, inventory) {
  if (gap.reason !== 'no authoritative retained core text entry for this authored text node' ||
      inventory.errors.some((error) => error.case === gap.case)) return;
  const trees = {}, revisions = {};
  for (const side of ['reference', 'astylar']) {
    const matches = inventory.cases.filter((item) => item.case === gap.case && item.side === side);
    if (matches.length !== 1) return;
    const tree = inventory.variants[matches[0].variant];
    if (!tree || tree.side !== side || tree.family !== gap.family) return;
    trees[side] = tree;
    revisions[side] = matches[0].resolvedStyleRevision;
  }
  const { reference, astylar } = trees;
  if (astylar.resolvedStyleEvidenceVersion !== 2 || astylar.resolvedStyleSource !== 'core-style-inspection' ||
      !Number.isInteger(revisions.astylar) || revisions.astylar < 0) return;
  const astNodes = astylar.nodes.filter((node) => node.authored?.id === gap.element);
  const templateMappings = [...reviewedHeadingMappings(reference, astylar),
    ...reviewedTemplateTextMappings(gap.family, reference, astylar)].filter((item) => item.element === gap.element);
  if (templateMappings.length > 1) return;
  const refs = reference.nodes.filter((node) => templateMappings.length === 1
    ? node.key === templateMappings[0].referenceNode : node.attributes?.id === gap.element);
  if (astNodes.length !== 1 || refs.length !== 1) return;
  const ast = astNodes[0], ref = refs[0];
  if (ast.key !== gap.astylarNode || ref.key !== gap.referenceNode || ast.retainedText || ast.paintedControlText ||
      !ref.ownText?.trim() || ref.ownText.trim() !== ast.authored.textContent?.trim()) return;
  const chain = (tree, leaf, side) => {
    const result = [], seen = new Set();
    let node = leaf;
    while (node) {
      if (seen.has(node.key) || tree.nodes.filter((item) => item.key === node.key).length !== 1) return;
      seen.add(node.key);
      const indexes = side === 'reference' ? { computed: node.style }
        : { normal: node.normalStyle, effective: node.interactionStyle };
      const styles = {};
      for (const [stage, index] of Object.entries(indexes)) {
        const pooled = inventory.styles[index];
        if (pooled?.side !== side || !pooled.value || typeof pooled.value !== 'object' || Array.isArray(pooled.value) ||
            typeof pooled.value.display !== 'string' || !pooled.value.display.trim() ||
            (side === 'reference' && typeof pooled.value.visibility !== 'string')) return;
        styles[stage] = structuredClone(pooled.value);
      }
      result.push({ node: node.key, ...styles });
      if (side === 'reference' && node.key === 'frame' && node.parent === null && node.type === 'main') return result;
      if (side === 'astylar' && node.authored?.id === 'page' && node.authored.type === 'main' && node.parent === 'root') {
        const roots = tree.nodes.filter((item) => item.key === 'root');
        if (roots.length !== 1 || roots[0].parent !== null || !roots[0].authored || Object.keys(roots[0].authored).length ||
            tree.nodes.filter((item) => item.authored?.id === 'page').length !== 1) return;
        return result;
      }
      const parents = tree.nodes.filter((item) => item.key === node.parent);
      if (parents.length !== 1) return;
      node = parents[0];
    }
  };
  const referenceChain = chain(reference, ref, 'reference'), candidateChain = chain(astylar, ast, 'astylar');
  if (!referenceChain || !candidateChain) return;
  const none = (value) => typeof value === 'string' && value.trim().toLowerCase() === 'none';
  const candidateDisplayNoneNodes = candidateChain.filter((item) => none(item.normal.display) && none(item.effective.display)).map((item) => item.node);
  const referenceDisplayNoneNodes = referenceChain.filter((item) => none(item.computed.display)).map((item) => item.node);
  // Computed leaf visibility accounts for overrides; a hidden ancestor alone
  // does not prove that its descendant text is hidden. Opacity is not display.
  const leafHidden = referenceChain[0].computed.visibility === 'hidden';
  if (!candidateDisplayNoneNodes.length || (!referenceDisplayNoneNodes.length && !leafHidden)) return;
  return { source: 'core-style-inspection', revision: revisions.astylar,
    referenceNode: ref.key, astylarNode: ast.key, text: ref.ownText.trim(),
    referenceMechanism: referenceDisplayNoneNodes.length ? 'display-none' : 'computed-leaf-visibility-hidden',
    referenceDisplayNoneNodes, candidateDisplayNoneNodes, referenceChain, candidateChain,
    coreOwner: 'ElementCreationService child creation skips display:none before allocating text',
    inputEquivalent: false, currentPseudoStatePaintVerified: false };
}

function isReviewedHiddenRetainedGap(gap, inventory) {
  if (gap.attribution !== 'reviewed-display-none-text-stage' || gap.classification !== 'parity-harness-defect' ||
      gap.inputEquivalent !== false || !gap.justification || !gap.reviewEvidence) return false;
  const evidence = reviewedHiddenRetainedEvidence(gap, inventory);
  return !!evidence && JSON.stringify(evidence) === JSON.stringify(gap.reviewEvidence);
}

export function collectRetainedTypographyEvidence(cases, inventory, controlTypography = collectControlTypographyEvidence(cases, inventory)) {
  const comparisons = [], differences = [], gaps = [], paintMaskDifferences = [], reviewedMappings = [], controlTextMappings = [];
  const mappings = new Map();
  for (const mapping of inventory.cases) {
    const key = JSON.stringify([mapping.case, mapping.side]);
    if (!mappings.has(key)) mappings.set(key, []);
    mappings.get(key).push(mapping);
  }
  const gap = (key, element, reason, evidence = {}) => gaps.push({ case: key, element, reason,
    classification: 'parity-harness-defect', attribution: 'unresolved',
    recommendedOwner: 'input audit direct text-node mapping and retained typography provenance', ...evidence });
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
    // Exact core-owned control labels have a different authoritative text
    // stage, already compared above. Do not invent registry entries for them.
    // Preserve the routing explicitly so removing their paint evidence fails.
    const controlMappings = controlTypography.comparisons.filter((item) => item.case === key &&
      item.source === 'core-control-texture' &&
      ['reviewed-material-button-label', 'reviewed-material-tab-label', 'reviewed-material-calendar-day-label', 'reviewed-material-calendar-year-label'].includes(item.mapping?.kind));
    const controlReferenceKeys = new Set(controlMappings.map((item) => item.referenceNode));
    const controlAstylarKeys = new Set(controlMappings.map((item) => item.astylarNode));
    controlTextMappings.push(...controlMappings.map((item) => ({ case: key, element: item.element,
      referenceNode: item.referenceNode, astylarNode: item.astylarNode, text: item.text,
      source: item.source, revision: item.revision, classification: 'parity-harness-defect',
      attribution: 'reviewed-control-text-stage-ownership', inputEquivalent: false,
      justification: 'The reviewed explicit control identity and reference label path map to current core-owned control texture text. Its normal/effective/current paint properties are independently compared in controlTypography, including any optional retained registry snapshot. A missing registry entry is not missing text evidence for this owner. This routes the audit stage only; all control-property, structure and raster discrepancies remain independent.' })));
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
      ...referenceTree.nodes.filter((node) => node.ownText?.trim() && !mappedReferenceKeys.has(node.key) && !controlReferenceKeys.has(node.key)).map((node) => node.attributes?.id),
      ...astylarTree.nodes.filter((node) => node.authored?.textContent?.trim() && !controlAstylarKeys.has(node.key)).map((node) => node.authored?.id),
    ]);
    // Anonymous/reference-wrapper mappings remain in the full tree; do not
    // fabricate text correspondences from matching strings or descendant order.
    ids.delete(undefined);
    const anonymousReference = referenceTree.nodes.filter((node) => node.ownText?.trim() && !node.attributes?.id && !mappedReferenceKeys.has(node.key) && !controlReferenceKeys.has(node.key)).map((node) => node.key);
    const anonymousAstylar = astylarTree.nodes.filter((node) => node.authored?.textContent?.trim() && !node.authored?.id && !controlAstylarKeys.has(node.key)).map((node) => node.key);
    if (anonymousReference.length || anonymousAstylar.length) {
      const reason = 'own-text nodes without an explicit shared ID require structural mapping';
      const remainingReference = [];
      for (const referenceNode of anonymousReference) {
        const identity = { family: entry.family, referenceNodes: [referenceNode], astylarNodes: anonymousAstylar };
        const reviewEvidence = reviewedStepperPanelEvidence({ case: key, reason, ...identity }, inventory);
        if (!reviewEvidence) { remainingReference.push(referenceNode); continue; }
        gap(key, undefined, reason, { ...identity,
          classification: 'application-plugin-authoring-defect', attribution: 'reviewed-stepper-panel-substitution',
          inputEquivalent: false, reviewEvidence,
          recommendedOwner: 'showcase stepper retained panel structure and transition state',
          justification: 'The reference retains both step panels, with the inactive content hidden and inert. The candidate authors a single panel containing only the active text; no corresponding inactive content exists in its captured tree. This is the structural substitution present since 2f44011, not equivalent public-API structure or a core failure to render authored text. Both panel states and captured styles remain explicit, while active-panel typography is compared separately.',
        });
      }
      if (remainingReference.length || anonymousAstylar.length) gap(key, undefined, reason,
        { family: entry.family, referenceNodes: remainingReference, astylarNodes: anonymousAstylar });
    }
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
        const reason = 'no authoritative retained core text entry for this authored text node';
        const identity = { family: entry.family, referenceNode: ref.key, astylarNode: ast.key };
        const reviewEvidence = reviewedHiddenRetainedEvidence({ case: key, element: id, reason, ...identity }, inventory);
        gap(key, id, reason, { ...identity, ...(reviewEvidence ? {
          attribution: 'reviewed-display-none-text-stage', inputEquivalent: false, reviewEvidence,
          justification: 'Complete captured ancestry shows candidate display:none in both normal and effective core inputs, so child creation intentionally creates no retained text entry. Reference text is also unpainted according to ancestor display:none or computed leaf visibility:hidden. This explains only registry-stage absence: all raw ancestor styles and the distinct visibility mechanisms are retained, not accepted as equivalent structure, typography, layout or paint.',
        } : {}) }); continue;
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
          const controlLabelToken = reviewedControlLabelTokenInput(entry, textMappingById.get(id), property, ast, styles, referenceTree, astylarTree, inventory);
          const selectValueToken = reviewedSelectValueInput(entry, textMappingById.get(id), property, ast, styles, referenceTree, astylarTree, inventory);
          differences.push({ case: key, family: entry.family, element: id, property, values,
            referenceNode: ref.key, astylarNode: ast.key, source: comparison.source, revision: comparison.revision,
            classification: 'parity-harness-defect', attribution: 'unresolved',
            recommendedOwner: 'input audit authored typography and core registry-stage attribution',
            justification: 'Browser computed and retained core text properties differ on directly mapped own-text nodes. Trace authored rules and resolution before assigning authoring or core fault; this is not proof of current pseudo-state paint.',
            ...(property === 'color' && headingMask ? headingMask : {}),
            ...(property === 'fontSize' && tableFont ? tableFont : {}),
            ...(property === 'fontSize' && treeFont ? treeFont : {}),
            ...(property === 'fontSize' && floatingLabel ? floatingLabel : {}),
            ...(controlLabelToken ?? {}),
            ...(selectValueToken ?? {}),
          });
        }
      }
      comparisons.push(comparison);
    }
  }
  return { schemaVersion: 1,
    scope: 'Direct own-text nodes joined by unique shared authored ID or explicit reviewed heading/template identity, with identical trimmed text. All eleven typography properties retain browser computed, core normal/effective declarations, and core retained-text values separately. Missing mappings/fields and unequal retained values remain explicit; no inheritance or font fallback is reconstructed. Reviewed mappings establish correspondence, not style equivalence.',
    comparisons, differences, gaps, paintMaskDifferences, reviewedMappings, controlTextMappings };
}

function isReviewedNormalLineBoxDifference(entry, supplemental) {
  const evidence = entry.reviewEvidence, observation = evidence?.observation;
  if (entry.property !== 'lineHeight' || entry.values.reference !== 'normal' ||
      !entry.case.startsWith('static:') || entry.values.painted !== `${observation?.naturalHeight}px` ||
      !/^[a-f0-9]{64}$/.test(observation?.evidence?.sha256 ?? '') || !evidence?.candidateOmissionChain?.length ||
      evidence.inputEquivalent !== false || supplemental?.errors?.length !== 0 ||
      !/^[a-f0-9]{64}$/.test(supplemental.sha256 ?? '') ||
      evidence.supplementalReport?.sha256 !== supplemental.sha256 || evidence.supplementalReport?.file !== supplemental.file) return false;
  const matches = supplemental.observations?.filter((item) => item.case === entry.case &&
    item.element === entry.element && item.referenceNode === entry.referenceNode) ?? [];
  return matches.length === 1 && JSON.stringify(matches[0]) === JSON.stringify(observation);
}

export function attributeObservedNormalLineBoxes(controlTypography, inventory, supplemental) {
  const result = structuredClone(controlTypography);
  if (supplemental?.schemaVersion !== 1 || supplemental.errors?.length !== 0 ||
      !/^[a-f0-9]{64}$/.test(supplemental.sha256 ?? '') || !Array.isArray(supplemental.observations)) return result;
  for (const comparison of result.comparisons) {
    if (!comparison.case.startsWith('static:') || comparison.state !== 'static' ||
        comparison.mapping?.kind !== 'reviewed-material-button-label' || comparison.source !== 'core-control-texture' ||
        comparison.properties.lineHeight.reference !== 'normal') continue;
    const measurements = supplemental.observations.filter((item) => item.case === comparison.case &&
      item.element === comparison.element && item.referenceNode === comparison.referenceNode);
    if (measurements.length !== 1) continue;
    const observation = measurements[0];
    if (observation.schemaVersion !== 1 || observation.source !== 'browser-natural-single-line-box' ||
        observation.fontReady !== true || typeof observation.text !== 'string' || typeof comparison.text !== 'string' ||
        observation.text.trim() !== comparison.text.trim() ||
        !/^[a-f0-9]{64}$/.test(observation.evidence?.sha256 ?? '') ||
        !Number.isFinite(observation.naturalHeight) || observation.naturalHeight <= 0) continue;
    // Record the observed scalar even when it disagrees; do not classify a
    // core defect from this scalar alone when other typography inputs differ.
    comparison.observedNormalLineBox = observation;
    if (comparison.properties.lineHeight.painted !== `${observation.naturalHeight}px` ||
        ['fontSize', 'fontWeight', 'fontStyle'].some((property) =>
          comparison.properties[property].reference === undefined ||
          comparison.properties[property].reference !== comparison.properties[property].painted)) continue;
    const mappings = inventory.cases.filter((item) => item.case === comparison.case && item.side === 'astylar');
    if (mappings.length !== 1 || inventory.errors.some((item) => item.case === comparison.case)) continue;
    const tree = inventory.variants[mappings[0].variant];
    const nodes = tree.nodes.filter((node) => node.key === comparison.astylarNode);
    if (nodes.length !== 1) continue;
    const candidateOmissionChain = candidateTypographyOmissionChain(nodes[0], tree, inventory, 'lineHeight');
    if (!candidateOmissionChain) continue;
    const differences = result.differences.filter((item) => item.case === comparison.case &&
      item.element === comparison.element && item.referenceNode === comparison.referenceNode &&
      item.astylarNode === comparison.astylarNode && item.property === 'lineHeight');
    if (differences.length !== 1 || differences[0].attribution !== 'unresolved') continue;
    Object.assign(differences[0], {
      classification: 'parity-harness-defect', attribution: 'reviewed-normal-line-box-stage-comparison',
      recommendedOwner: 'input audit browser-used line-height observation and stage comparison',
      justification: 'The raw comparison mixed browser computed normal with a core numeric paint metric. A provenance-bound measurement of this exact reference label gives the same natural single-line height as current paint; candidate normal/effective ancestry contains no explicit line-height or font shorthand substitution. This explains the scalar comparison only, not equivalent font fallback, tracking, baseline, wrapping, glyph raster or overall inputs. Other typography differences remain independently classified; no blanket normal-to-pixel rule is accepted.',
      reviewEvidence: { supplementalReport: { file: supplemental.file, sha256: supplemental.sha256 },
        observation, candidateOmissionChain, currentPaintedLineHeight: comparison.properties.lineHeight.painted,
        coreDefaultOwner: 'TextStyleParserService.parseTextProperties -> resolveNormalLineHeight',
        inputEquivalent: false, finalRasterVerified: false },
    });
  }
  return result;
}

function candidateTypographyOmissionChain(ast, tree, inventory, property) {
  const chain = [], seen = new Set();
  let ancestor = ast;
  while (ancestor && !seen.has(ancestor.key)) {
    seen.add(ancestor.key);
    const normal = inventory.styles[ancestor.normalStyle], effective = inventory.styles[ancestor.interactionStyle];
    if (normal?.side !== 'astylar' || effective?.side !== 'astylar' || !normal.value || !effective.value ||
        normal.value[property] !== undefined || effective.value[property] !== undefined ||
        normal.value.font !== undefined || effective.value.font !== undefined) return;
    chain.push({ node: ancestor.key, normal: normal.value, effective: effective.value });
    if (ancestor.authored?.id === 'page') break;
    const parents = tree.nodes.filter((node) => node.key === ancestor.parent);
    if (parents.length !== 1) return;
    ancestor = parents[0];
  }
  if (ancestor?.authored?.id !== 'page' || ancestor.authored.type !== 'main' || ancestor.parent !== 'root' ||
      tree.nodes.filter((node) => node.authored?.id === 'page').length !== 1) return;
  return chain;
}

function reviewedButtonPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) {
  const rulesAt = (node, side) => (node.rules ?? []).map((index) => inventory.rules[index])
    .filter((rule) => rule?.side === side).map((rule) => rule.value);
  const parentStyle = inventory.styles[parent.style];
  if (parentStyle?.side !== 'reference') return;
  const referenceParent = canonicalStyle(parentStyle.value);
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index])
    .filter((rule) => rule?.side === 'astylar').map((rule) => rule.value);
  if (property === 'lineHeight' && entry.family === 'toolbar' && stages.reference.lineHeight === '28px' &&
      referenceParent.lineHeight === stages.reference.lineHeight && ['40px', '24px'].includes(stages.normal.lineHeight) &&
      stages.effective.lineHeight === stages.normal.lineHeight && stages.painted.lineHeight === stages.normal.lineHeight &&
      String(ast.authored.class ?? '').split(/\s+/).includes('toolbar-action')) {
    const toolbars = referenceTree.nodes.filter((node) => node.key === parent.parent && node.type === 'mat-toolbar');
    if (toolbars.length !== 1) return;
    const toolbar = toolbars[0], toolbarStyle = inventory.styles[toolbar.style];
    if (toolbarStyle?.side !== 'reference' || canonicalStyle(toolbarStyle.value).lineHeight !== stages.reference.lineHeight) return;
    const toolbarRules = rulesAt(toolbar, 'reference').filter((rule) => rule.active === true &&
      rule.selector === '.mat-toolbar, .mat-toolbar h1, .mat-toolbar h2, .mat-toolbar h3, .mat-toolbar h4, .mat-toolbar h5, .mat-toolbar h6' &&
      rule.declarations?.['line-height']?.value === 'var(--mat-toolbar-title-text-line-height, var(--mat-sys-title-large-line-height))');
    const inheritRules = rulesAt(parent, 'reference').filter((rule) => rule.active === true &&
      rule.selector === '.mdc-button' && rule.declarations?.['line-height']?.value === 'inherit');
    const candidateHeightRules = candidateRules.filter((rule) => rule.selector === '.toolbar-action' &&
      canonicalStyle(rule).lineHeight === stages.normal.lineHeight && canonicalStyle(rule).height === stages.normal.lineHeight);
    if (toolbarRules.length !== 1 || inheritRules.length !== 1 || candidateHeightRules.length !== 1 ||
        rulesAt(ref, 'reference').some((rule) => rule.active === true &&
          ((rule.declarations?.['line-height']?.value && rule.declarations['line-height'].value !== 'inherit') || rule.declarations?.font))) return;
    return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-toolbar-button-line-height-input',
      recommendedOwner: 'showcase toolbar button inherited typography inputs',
      justification: 'The captured button inherits the toolbar title line-height token and its direct label computes the same 28px. The candidate toolbar-action explicitly substitutes its density-specific container height for line-height and supplies that value unchanged to normal/effective/current paint. This source-traced input substitution is not a demonstrated core line-box defect. The 28px density variant happens to agree and does not justify the other authored values.',
      reviewEvidence: { sourceFinding: 'fixture-toolbar-button-height-replaces-inherited-line-height',
        referenceToolbar: toolbar.key, referenceToolbarRule: toolbarRules[0], referenceButtonRule: inheritRules[0],
        referenceComputed: stages.reference.lineHeight, candidateRule: candidateHeightRules[0],
        candidateNormal: stages.normal.lineHeight, candidateEffective: stages.effective.lineHeight, candidatePainted: stages.painted.lineHeight } };
  }
  if (property === 'fontFamily' && ['roboto', 'arial'].includes(stages.reference.fontFamily) &&
      referenceParent.fontFamily === stages.reference.fontFamily &&
      stages.normal.fontFamily === stages.reference.fontFamily && stages.effective.fontFamily === stages.normal.fontFamily &&
      stages.painted.fontFamily === `${stages.normal.fontFamily},arial,helvetica,sans-serif`) {
    // These authoritative pre-paint stages isolate a core mutation. Unlike a
    // missing component token, the resolved input already matches the browser.
    // Limit attribution to the captured/proven single-family spellings; do not
    // reimplement CSS font-list parsing or waive arbitrary fallback lists.
    return { classification: 'confirmed-core-renderer-defect', attribution: 'reviewed-core-font-list-rewrite',
      recommendedOwner: 'TextStyleParserService explicit font-family parsing and fallback semantics',
      justification: 'Browser button/label computed font-family and both core normal/effective inputs agree. Only the currently bound control texture adds Arial, Helvetica, sans-serif, matching the source-traced parser branch. The equal-input unavailable-family proof confirms that this rewrite can change text advance; it does not prove changed glyph raster for this installed font. This is classified core input mutation, not accepted font-list equivalence or a missing fixture token.',
      reviewEvidence: { sourceFinding: 'core-explicit-font-list-appends-default-fallbacks',
        sourceFile: 'src/app/services/text/text-style-parser.service.ts',
        focusedProof: 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts',
        referenceParent: parent.key, referenceComputed: stages.reference.fontFamily,
        candidateNormal: stages.normal.fontFamily, candidateEffective: stages.effective.fontFamily,
        candidatePainted: stages.painted.fontFamily } };
  }
  if (property === 'fontFamily' && stages.reference.fontFamily === 'roboto' && referenceParent.fontFamily === 'roboto' &&
      stages.normal.fontFamily === 'roboto,arial,sans-serif' && stages.effective.fontFamily === stages.normal.fontFamily &&
      stages.painted.fontFamily === stages.normal.fontFamily &&
      ['material-button', 'text-button'].some((name) => String(ast.authored.class ?? '').split(/\s+/).includes(name))) {
    const componentSelector = String(ast.authored.class ?? '').split(/\s+/).includes('text-button') ? '.text-button' : '.material-button';
    const kinds = componentSelector === '.text-button' ? ['text'] : ['filled', 'outlined'];
    const componentRules = rulesAt(parent, 'reference').filter((rule) => rule.active === true &&
      kinds.some((kind) => rule.selector === ({ filled: '.mat-mdc-unelevated-button', outlined: '.mat-mdc-outlined-button', text: '.mat-mdc-button' })[kind] &&
        rule.declarations?.['font-family']?.value === `var(--mat-button-${kind}-label-text-font, var(--mat-sys-label-large-font))`));
    const resetRules = candidateRules.filter((rule) => rule.selector === 'button, input, select' &&
      canonicalStyle(rule).fontFamily === stages.painted.fontFamily);
    const materialRules = candidateRules.filter((rule) => rule.selector === componentSelector);
    if (componentRules.length !== 1 || resetRules.length !== 1 || materialRules.length !== 1 ||
        materialRules[0].fontFamily !== undefined || materialRules[0].font !== undefined ||
        rulesAt(ref, 'reference').some((rule) => rule.active === true &&
          ((rule.declarations?.['font-family']?.value && rule.declarations['font-family'].value !== 'inherit') || rule.declarations?.font))) return;
    return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-button-font-token-input',
      recommendedOwner: 'showcase Material button component font-token translation',
      justification: 'The reference button and label compute Roboto from an active Material component font token, overriding the document reset. The candidate copies the document font stack onto controls but has no font override in the corresponding material-button or text-button rule and supplies Roboto, Arial, sans-serif to actual texture paint. The control reset was added in af04845; it does not supply the missing component token. These font-family inputs differ even if current glyphs happen to use Roboto. This is authoring inequality, not a demonstrated renderer font-selection error.',
      reviewEvidence: { referenceRule: componentRules[0], referenceParent: parent.key, referenceComputed: stages.reference.fontFamily,
        candidateResetRule: resetRules[0], candidateMaterialRule: materialRules[0], candidatePainted: stages.painted.fontFamily } };
  }
  if (property === 'letterSpacing' && stages.reference.letterSpacing === '0.096px' &&
      referenceParent.letterSpacing === '0.096px' && stages.painted.letterSpacing === '0' &&
      String(ast.authored.class ?? '').split(/\s+/).includes('material-button')) {
    const componentRules = rulesAt(parent, 'reference').filter((rule) => rule.active === true &&
      ['filled', 'outlined'].some((kind) => rule.selector === (kind === 'filled' ? '.mat-mdc-unelevated-button' : '.mat-mdc-outlined-button') &&
        rule.declarations?.['letter-spacing']?.value === `var(--mat-button-${kind}-label-text-tracking, var(--mat-sys-label-large-tracking))`));
    if (componentRules.length !== 1 || rulesAt(ref, 'reference').some((rule) => rule.active === true &&
        rule.declarations?.['letter-spacing']?.value && rule.declarations['letter-spacing'].value !== 'inherit')) return;
    const materialRules = candidateRules.filter((rule) => rule.selector === '.material-button');
    if (materialRules.length !== 1 || materialRules[0].letterSpacing !== undefined || materialRules[0].font !== undefined) return;
    const candidateChain = candidateTypographyOmissionChain(ast, astylarTree, inventory, 'letterSpacing');
    if (!candidateChain) return;
    return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-button-tracking-input',
      recommendedOwner: 'showcase Material filled/outlined button typography input translation',
      justification: 'The reference button and direct label compute .096px from a captured active Material tracking-token rule. The candidate material-button rule and complete normal/effective control-to-page chain omit tracking, while its current core texture receives zero. This is the missing component input traced to 2f44011, not a renderer spacing defect. Other properties and final paint remain separate.',
      reviewEvidence: { referenceRule: componentRules[0], referenceParent: parent.key, referenceComputed: stages.reference.letterSpacing,
        candidateRule: materialRules[0], candidateChain, candidatePainted: stages.painted.letterSpacing } };
  }
  if (property === 'color' && entry.family === 'button' && ast.authored.id === 'button-disabled' &&
      ast.authored.disabled === true && Object.hasOwn(parent.attributes ?? {}, 'disabled') &&
      /^rgba\(\d+,\d+,\d+,0\.38\)$/.test(stages.reference.color) && referenceParent.color === stages.reference.color &&
      /^rgba\(\d+,\d+,\d+,1\)$/.test(stages.normal.color) && stages.effective.color === stages.normal.color && stages.painted.color === stages.normal.color) {
    const refRules = rulesAt(parent, 'reference').filter((rule) => rule.active === true &&
      rule.selector === '.mat-mdc-unelevated-button[disabled], .mat-mdc-unelevated-button.mat-mdc-button-disabled' &&
      rule.declarations?.color?.value === 'var(--mat-button-filled-disabled-label-text-color, color-mix(in srgb, var(--mat-sys-on-surface) 38%, transparent))');
    const astRules = candidateRules.filter((rule) => rule.selector === '#button-disabled' &&
      canonicalStyle(rule).color === stages.painted.color);
    if (refRules.length !== 1 || astRules.length !== 1 || rulesAt(ref, 'reference').some((rule) => rule.active === true &&
        rule.declarations?.color?.value && rule.declarations.color.value !== 'inherit')) return;
    return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-disabled-button-ink',
      recommendedOwner: 'showcase disabled-button alpha paint input translation',
      justification: 'The disabled reference button and label retain captured .38-alpha ink under the active Material disabled-label token rule. The candidate explicitly authors opaque ink and supplies that same value unchanged through normal/effective/current texture paint. The source rule preblends against surfaceContainer (introduced in 2f44011). This is unequal fixture paint, not a core alpha defect or accepted compositing equivalence; no theme-specific RGB value is assumed. Backgrounds, glyph-edge compositing and other state properties remain separate.',
      reviewEvidence: { sourceFinding: 'fixture-disabled-button-ink-precomposited', referenceRule: refRules[0],
        referenceParent: parent.key, referenceComputed: stages.reference.color,
        candidateRule: astRules[0], candidateNormal: stages.normal.color, candidateEffective: stages.effective.color,
        candidatePainted: stages.painted.color } };
  }
}

function reviewedTabLabelControl(ref, tree) {
  let child = ref;
  for (const [type, className] of [['span', 'mdc-tab__text-label'], ['span', 'mdc-tab__content'], ['div', 'mdc-tab']]) {
    const parents = tree.nodes.filter((node) => node.key === child.parent && node.type === type &&
      String(node.attributes?.class ?? '').split(/\s+/).includes(className));
    if (parents.length !== 1 || parents[0].ownText?.trim()) return;
    const parent = parents[0];
    if (className !== 'mdc-tab' && tree.nodes.filter((node) => node.parent === parent.key).length !== 1) return;
    if (className === 'mdc-tab' && tree.nodes.filter((node) => node.parent === parent.key &&
        String(node.attributes?.class ?? '').split(/\s+/).includes('mdc-tab__content')).length !== 1) return;
    child = parent;
  }
  if (child.attributes?.role !== 'tab') return;
  return child;
}

function reviewedTabPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'tabs' || !['fontFamily', 'letterSpacing', 'lineHeight'].includes(property) ||
      reviewedTabLabelControl(ref, referenceTree) !== parent || ast.authored.role !== 'tab' ||
      !String(ast.authored.class ?? '').split(/\s+/).includes('tab')) return;
  const rulesAt = (node) => (node.rules ?? []).map((index) => inventory.rules[index])
    .filter((rule) => rule?.side === 'reference' && rule.value.active === true).map((rule) => rule.value);
  const textLabel = referenceTree.nodes.find((node) => node.key === ref.parent);
  const content = referenceTree.nodes.find((node) => node.key === textLabel.parent);
  const chain = [ref, textLabel, content, parent];
  const referenceChain = chain.map((node) => ({ node: node.key, style: inventory.styles[node.style] }));
  if (referenceChain.some(({ style }) => style?.side !== 'reference')) return;
  const styles = referenceChain.map(({ style }) => canonicalStyle(style.value));
  const candidateRules = astylarTree.rules.map((index) => inventory.rules[index])
    .filter((rule) => rule?.side === 'astylar').map((rule) => rule.value);
  const tabRules = candidateRules.filter((rule) => rule.selector === '.tab');
  if (tabRules.length !== 1 || tabRules[0].font !== undefined) return;
  const candidateRule = tabRules[0];
  const cssProperty = property.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase());
  const descendantOverride = (nodes) => nodes.some((node) => rulesAt(node).some((rule) =>
    (rule.declarations?.[cssProperty]?.value && rule.declarations[cssProperty].value !== 'inherit') || rule.declarations?.font));
  const evidence = { sourceFinding: 'fixture-tab-label-typography-flattened', candidateRule,
    referenceChain: referenceChain.map(({ node, style }) => ({ node, style: style.value })),
    candidateNormal: stages.normal[property], candidateEffective: stages.effective[property], candidatePainted: stages.painted[property] };
  let reason;
  if (property === 'fontFamily' && styles.every((style) => style.fontFamily === 'roboto') &&
      stages.normal.fontFamily === 'roboto,arial,sans-serif' && stages.effective.fontFamily === stages.normal.fontFamily &&
      stages.painted.fontFamily === stages.normal.fontFamily && candidateRule.fontFamily === undefined && !descendantOverride(chain.slice(0, 3))) {
    const tokens = rulesAt(parent).filter((rule) => rule.selector === '.mat-mdc-tab' &&
      rule.declarations?.['font-family']?.value === 'var(--mat-tab-label-text-font, var(--mat-sys-title-small-font))');
    const resets = candidateRules.filter((rule) => rule.selector === 'button, input, select' &&
      canonicalStyle(rule).fontFamily === stages.normal.fontFamily);
    if (tokens.length !== 1 || resets.length !== 1) return;
    Object.assign(evidence, { referenceRule: tokens[0], candidateResetRule: resets[0] });
    reason = 'The tab component font token overrides the reference document stack, but the candidate tab omits that token and passes its longer document control stack unchanged into actual paint.';
  } else if (property === 'letterSpacing' && styles.every((style) => style.letterSpacing === '0.096px') &&
      stages.painted.letterSpacing === '0' && candidateRule.letterSpacing === undefined && !descendantOverride(chain.slice(0, 3))) {
    const tokens = rulesAt(parent).filter((rule) => rule.selector === '.mat-mdc-tab' &&
      rule.declarations?.['letter-spacing']?.value === 'var(--mat-tab-label-text-tracking, var(--mat-sys-title-small-tracking))');
    const candidateChain = candidateTypographyOmissionChain(ast, astylarTree, inventory, 'letterSpacing');
    if (tokens.length !== 1 || !candidateChain) return;
    Object.assign(evidence, { referenceRule: tokens[0], candidateChain });
    reason = 'The reference tab tracking token reaches its label; the candidate tab rule and complete normal/effective ancestry omit tracking and actual paint receives zero.';
  } else if (property === 'lineHeight' && styles.every((style) => style.fontSize === '14px') &&
      styles[0].lineHeight === '14px' && styles[1].lineHeight === '14px' && styles[2].lineHeight === '20px' && styles[3].lineHeight === '20px' &&
      canonicalStyle(candidateRule).lineHeight === '20px' && stages.normal.lineHeight === '20px' &&
      stages.effective.lineHeight === '20px' && stages.painted.lineHeight === '20px' &&
      stages.normal.fontSize === '14px' && stages.effective.fontSize === '14px' && stages.painted.fontSize === '14px' && !descendantOverride([ref])) {
    const labelRules = rulesAt(textLabel).filter((rule) => rule.selector === '.mdc-tab__text-label' &&
      rule.declarations?.['line-height']?.value === '1');
    if (labelRules.length !== 1) return;
    evidence.referenceRule = labelRules[0];
    reason = 'The reference text-label wrapper applies line-height:1 inside a separately sized 20px content/control line box. The candidate flattens the label into a control value and explicitly applies the outer 20px line-height to the actual text texture.';
  } else return;
  return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-tab-label-typography-input',
    recommendedOwner: 'showcase Material tab content/label structure and typography input translation',
    justification: `${reason} This is unequal authored intent, not proof of a core text defect or permission to compensate with a glyph offset. Other properties, structure and final raster remain independent.`,
    reviewEvidence: evidence };
}

function reviewedNavigationIconInput(entry, ast, referenceTree, astylarTree, inventory, revision) {
  if (!['paginator', 'datepicker'].includes(entry.family)) return;
  const calendar = entry.family === 'datepicker';
  let calendarContext, yearView = false;
  if (calendar) {
    for (const leaf of referenceTree.nodes.filter(node => node.type === 'span' &&
        String(node.attributes?.class ?? '').split(/\s+/).includes('mat-calendar-body-cell-content'))) {
      calendarContext = reviewedCalendarCellControl(leaf, referenceTree, astylarTree);
      if (calendarContext) break;
      calendarContext = reviewedCalendarCellControl(leaf, referenceTree, astylarTree, 'year');
      if (calendarContext) { yearView = true; break; }
    }
    if (!calendarContext) return;
  }
  const definitions = {
    'paginator-previous': { direction: 'previous', label: 'Previous page', glyph: '‹', path: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' },
    'paginator-next': { direction: 'next', label: 'Next page', glyph: '›', path: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z' },
    'datepicker-previous': { direction: 'previous', label: 'Previous month', glyph: '‹', path: 'M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z' },
    'datepicker-next': { direction: 'next', label: 'Next month', glyph: '›', path: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z' },
  };
  const definition = definitions[ast.authored?.id];
  const hasClass = (node, value) => String(node.attributes?.class ?? '').split(/\s+/).includes(value);
  if (!definition || !ast.authored.id.startsWith(calendar ? 'datepicker-' : 'paginator-') || ast.authored.type !== 'button' || ast.authored.ariaLabel !== definition.label ||
      !String(ast.authored.class ?? '').split(/\s+/).includes(calendar ? 'datepicker-nav' : 'paginator-button') || ast.authored.value !== definition.glyph ||
      (ast.authored.textContent !== undefined && ast.authored.textContent !== definition.glyph) ||
      ast.paintedControlText?.source !== 'core-control-texture' || ast.paintedControlText.text !== definition.glyph ||
      astylarTree.nodes.filter((node) => node.authored?.id === ast.authored.id).length !== 1 ||
      astylarTree.nodes.some((node) => node.parent === ast.key)) return;
  const controls = referenceTree.nodes.filter((node) => hasClass(node, calendar ? `mat-calendar-${definition.direction}-button` : `mat-mdc-paginator-navigation-${definition.direction}`));
  const referenceLabel = calendar && yearView ? definition.label.replace('month', '24 years') : definition.label;
  if (controls.length !== 1 || controls[0].type !== 'button' || controls[0].attributes['aria-label'] !== referenceLabel || controls[0].ownText?.trim()) return;
  const control = controls[0];
  if (calendar) {
    const period = referenceTree.nodes.filter(node => node.key === calendarContext.evidence.referencePeriodLabel);
    const header = astylarTree.nodes.filter(node => node.authored?.id === 'datepicker-header');
    if (period.length !== 1 || control.parent !== period[0].parent || header.length !== 1 || ast.parent !== header[0].key ||
        header[0].parent !== calendarContext.evidence.candidateChain.at(-1)) return;
  }
  const icons = referenceTree.nodes.filter((node) => node.parent === control.key && node.type === 'svg');
  if (icons.length !== 1 || (!calendar && !hasClass(icons[0], 'mat-mdc-paginator-icon')) || icons[0].attributes.viewBox !== '0 0 24 24' ||
      icons[0].attributes['aria-hidden'] !== 'true' || icons[0].attributes.focusable !== 'false' || icons[0].ownText?.trim()) return;
  const icon = icons[0], paths = referenceTree.nodes.filter((node) => node.parent === icon.key);
  if (paths.length !== 1 || paths[0].type !== 'path' || paths[0].attributes?.d !== definition.path || paths[0].ownText?.trim() ||
      referenceTree.nodes.some((node) => node.parent === paths[0].key)) return;
  const pathNode = paths[0];
  // No other descendant may silently supply text or another vector icon.
  const descendants = new Set([control.key]);
  for (let changed = true; changed;) {
    changed = false;
    for (const node of referenceTree.nodes) if (descendants.has(node.parent) && !descendants.has(node.key)) {
      descendants.add(node.key); changed = true;
    }
  }
  if (referenceTree.nodes.some((node) => descendants.has(node.key) &&
      (node.ownText?.trim() || (['svg', 'path'].includes(node.type) && node !== icon && node !== pathNode)))) return;
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const referenceNodes = [control, icon, pathNode].map((node) => ({ node: node.key, type: node.type,
    attributes: node.attributes, style: styleAt(node.style, 'reference') }));
  const normal = styleAt(ast.normalStyle, 'astylar'), effective = styleAt(ast.interactionStyle, 'astylar');
  const painted = styleAt(ast.paintedControlText.style, 'astylar');
  if (referenceNodes.some((node) => !node.style) || !normal || !effective || !painted ||
      typeof painted.fontFamily !== 'string' || !painted.fontFamily || !Number.isFinite(painted.fontSize) || painted.fontSize <= 0) return;
  return { case: caseKey(entry), family: entry.family, state: entry.state ?? 'static', element: ast.authored.id,
    referenceNode: control.key, astylarNode: ast.key, source: ast.paintedControlText.source, revision,
    reference: { kind: 'svg-path', viewBox: icon.attributes.viewBox, path: definition.path },
    astylar: { kind: 'text-glyph', authored: definition.glyph, painted: ast.paintedControlText.text },
    classification: 'application-plugin-authoring-defect', attribution: calendar ? 'reviewed-calendar-navigation-svg-to-glyph-input' : 'reviewed-paginator-svg-to-glyph-input',
    recommendedOwner: `showcase Material ${calendar ? 'calendar navigation' : 'paginator'} icon authoring through core vector/image APIs`,
    inputEquivalent: false, finalRasterVerified: false,
    justification: calendar
      ? 'The unique previous/next controls are anchored to the independently reviewed calendar date/range context and header ancestry. The reference authors an explicit SVG path; the candidate authors and currently paints a font glyph instead. This is unequal geometry/content, not a missing text mapping or a core SVG/font defect. In year view the reference accessible name also says 24 years while the candidate still says month; both names are retained without treating them as equivalent. Navigation behavior, state, placement and final raster remain independent.'
      : 'The unique previous/next navigation control and matching accessible label identify the corresponding controls. The reference authors an explicit SVG path; the candidate authors and currently paints a font glyph instead. This is a content/geometry input substitution traced to the initial fixture, not equivalent icon geometry, a reference text label, or proof of a core SVG/font defect. State, wrapper layout, vector support and final raster require independent review.',
    reviewEvidence: { sourceFinding: calendar ? 'fixture-calendar-navigation-svg-icons-replaced-by-text-glyphs' : 'fixture-paginator-svg-icons-replaced-by-text-glyphs',
      ...(calendar ? { calendarContext: calendarContext.evidence, yearView,
        accessibleNames: { reference: referenceLabel, candidate: definition.label, inputEquivalent: referenceLabel === definition.label } } : {}),
      referenceControl: referenceNodes[0], referenceSvg: referenceNodes[1], referencePath: referenceNodes[2],
      candidateAuthored: ast.authored, candidateNormal: normal, candidateEffective: effective, candidatePaintedStyle: painted } };
}

// Match accessible dates/years plus month/range context, never bare numeric text.
function reviewedCalendarCellControl(ref, referenceTree, astylarTree, kind = 'day') {
  const isYear = kind === 'year', viewType = isYear ? 'mat-multi-year-view' : 'mat-month-view';
  const unique = (nodes, predicate) => { const matches = nodes.filter(predicate); return matches.length === 1 ? matches[0] : undefined; };
  const cls = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);
  const astCls = (node, name) => String(node?.authored?.class ?? '').split(/\s+/).includes(name);
  const rn = referenceTree.nodes, an = astylarTree.nodes;
  if (unique(rn, (node) => node.key === ref.key) !== ref || ref.type !== 'span' ||
      !cls(ref, 'mat-calendar-body-cell-content') || rn.some((node) => node.parent === ref.key)) return;
  const chain = [ref];
  for (const [type, className, role] of [
    ['button', 'mat-calendar-body-cell'], ['td', 'mat-calendar-body-cell-container', 'gridcell'],
    ['tr', undefined, 'row'], ['tbody', 'mat-calendar-body'], ['table', 'mat-calendar-table', 'grid'],
    [viewType], ['div', 'mat-calendar-content'], ['mat-calendar', 'mat-calendar'],
    ['div', 'mat-datepicker-content-container', 'dialog'],
  ]) {
    const parent = unique(rn, (node) => node.key === chain.at(-1).parent);
    if (!parent || parent.type !== type || (className && !cls(parent, className)) ||
        (role && parent.attributes?.role !== role) || parent.ownText?.trim()) return;
    chain.push(parent);
  }
  const parent = chain[1], calendar = chain[8];
  if (rn.filter((node) => node.type === viewType).length !== 1 ||
      rn.some((node) => node.type === (isYear ? 'mat-month-view' : 'mat-multi-year-view')) ||
      rn.filter((node) => node.type === 'mat-calendar').length !== 1 ||
      unique(rn, (node) => node.parent === parent.key && cls(node, 'mat-calendar-body-cell-content')) !== ref) return;
  const date = /^(January|February|March|April|May|June|July|August|September|October|November|December) ([1-9]|[12]\d|3[01]), (\d{4})$/.exec(parent.attributes?.['aria-label'] ?? '');
  const yearLabel = /^\d{4}$/.test(parent.attributes?.['aria-label'] ?? '') ? parent.attributes['aria-label'] : undefined;
  const numericLabel = isYear ? yearLabel : date?.[2];
  if (!numericLabel || ref.ownText?.trim() !== numericLabel ||
      rn.filter((node) => node.type === 'button' && cls(node, 'mat-calendar-body-cell') &&
        node.attributes?.['aria-label'] === parent.attributes['aria-label']).length !== 1) return;
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (!isYear) {
    const year = Number(date[3]), month = monthNames.indexOf(date[1]), day = Number(date[2]);
    if (year < 100 || day > new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) return;
  }
  const header = unique(rn, (node) => node.parent === calendar.key && node.type === 'mat-calendar-header');
  const headerBox = header && unique(rn, (node) => node.parent === header.key && node.type === 'div' && cls(node, 'mat-calendar-header'));
  const controls = headerBox && unique(rn, (node) => node.parent === headerBox.key && node.type === 'div' && cls(node, 'mat-calendar-controls'));
  const periodLabel = controls && unique(rn, (node) => node.parent === controls.key && node.type === 'span' &&
    cls(node, 'cdk-visually-hidden') && node.attributes?.['aria-live'] === 'polite' && /^mat-calendar-period-label-\d+$/.test(node.attributes?.id));
  if (!periodLabel || rn.some((node) => node.parent === periodLabel.key)) return;
  let period, candidatePeriod;
  if (isYear) {
    const range = /^(\d{4}) to (\d{4})$/.exec(periodLabel.ownText?.trim() ?? '');
    if (!range || Number(range[2]) - Number(range[1]) !== 23 ||
        Number(yearLabel) < Number(range[1]) || Number(yearLabel) > Number(range[2])) return;
    period = range[0]; candidatePeriod = `${range[1]} – ${range[2]} ▴`;
  } else {
    period = `${date[1].slice(0, 3).toUpperCase()} ${date[3]}`;
    if (periodLabel.ownText?.trim() !== period) return;
    candidatePeriod = `${period} ▾`;
  }
  const id = `datepicker-${kind}-${numericLabel}`, gridId = isYear ? 'datepicker-year-grid' : 'datepicker-grid';
  const ast = unique(an, (node) => node.authored?.id === id);
  const grid = unique(an, (node) => node.authored?.id === gridId);
  const popup = unique(an, (node) => node.authored?.id === 'datepicker-popup');
  const astHeader = unique(an, (node) => node.authored?.id === 'datepicker-header');
  const astPeriod = unique(an, (node) => node.authored?.id === 'datepicker-month');
  const marker = unique(an, (node) => node.authored?.id === 'datepicker-month-marker');
  if (!ast || ast.authored.type !== 'button' || !astCls(ast, `datepicker-${kind}`) ||
      (!isYear && ast.authored.ariaLabel !== numericLabel) || ast.authored.value !== numericLabel || an.some((node) => node.parent === ast.key) ||
      !grid || grid.authored.type !== 'div' || !astCls(grid, gridId) || ast.parent !== grid.key ||
      an.some(node => node.authored?.id === (isYear ? 'datepicker-grid' : 'datepicker-year-grid')) ||
      !popup || popup.authored.type !== 'div' || popup.authored.role !== 'dialog' || !astCls(popup, 'datepicker-popup') || grid.parent !== popup.key ||
      !astHeader || astHeader.authored.type !== 'div' || astHeader.parent !== popup.key ||
      !astPeriod || astPeriod.authored.type !== 'button' || astPeriod.parent !== astHeader.key ||
      astPeriod.authored.ariaLabel !== (isYear ? 'Choose date' : 'Choose month and year') || astPeriod.authored.value !== candidatePeriod ||
      (!isYear && (!marker || marker.authored.type !== 'span' || marker.parent !== grid.key || marker.authored.textContent !== period.slice(0, 3)))) return;
  return { parent, id, evidence: { ...(isYear ? { accessibleYear: yearLabel } : { accessibleDate: parent.attributes['aria-label'] }), period,
    referenceChain: chain.map((node) => node.key), referencePeriodLabel: periodLabel.key,
    candidateChain: [ast.key, grid.key, popup.key], candidatePeriod: astPeriod.key, ...(!isYear ? { candidateMonthMarker: marker.key } : {}) } };
}

function reviewedCalendarCellPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'datepicker' || !['fontFamily', 'lineHeight', 'color'].includes(property)) return;
  const kind = reviewedCalendarCellControl(ref, referenceTree, astylarTree) ? 'day'
    : reviewedCalendarCellControl(ref, referenceTree, astylarTree, 'year') ? 'year' : undefined;
  if (!kind) return;
  const referenceRules = (node) => (node.rules ?? []).map(index => inventory.rules[index])
    .filter(rule => rule?.side === 'reference' && rule.value.active === true).map(rule => rule.value);
  const candidateRules = astylarTree.rules.map(index => inventory.rules[index])
    .filter(rule => rule?.side === 'astylar').map(rule => rule.value);
  const cells = candidateRules.filter(rule => rule.selector === (kind === 'year' ? '.datepicker-year' : '.datepicker-cell'));
  const days = kind === 'year' ? cells : candidateRules.filter(rule => rule.selector === '.datepicker-day');
  if (cells.length !== 1 || days.length !== 1 || cells[0].font !== undefined || days[0].font !== undefined) return;
  const cssProperty = property.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
  // Do not attribute through conflicting leaf declarations or an inline override.
  if (ref.inline?.[cssProperty] || ref.inline?.font) return;
  const evidence = { sourceFinding: `fixture-calendar-${kind}-typography-substitution`,
    referenceNode: ref.key, referenceControl: parent.key, referenceComputed: stages.reference[property],
    candidateCellRule: cells[0], candidateControlRule: days[0], candidateNormal: stages.normal[property],
    candidateEffective: stages.effective[property], candidatePainted: stages.painted[property] };
  let reason;
  if (property === 'fontFamily') {
    const parentStyle = inventory.styles[parent.style];
    const tokens = referenceRules(parent).filter(rule => rule.selector === '.mat-calendar-body-cell' &&
      rule.declarations?.['font-family']?.value === 'var(--mat-datepicker-calendar-text-font, var(--mat-sys-body-medium-font))');
    const resets = candidateRules.filter(rule => rule.selector === 'button, input, select' &&
      canonicalStyle(rule).fontFamily === stages.normal.fontFamily);
    if (tokens.length !== 1 || resets.length !== 1 || parentStyle?.side !== 'reference' ||
        canonicalStyle(parentStyle.value).fontFamily !== stages.reference.fontFamily || stages.reference.fontFamily !== 'roboto' ||
        stages.normal.fontFamily !== 'roboto,arial,sans-serif' || stages.effective.fontFamily !== stages.normal.fontFamily ||
        stages.painted.fontFamily !== stages.normal.fontFamily || cells[0].fontFamily !== undefined || days[0].fontFamily !== undefined ||
        parent.inline?.['font-family'] || parent.inline?.font || referenceRules(ref).some(rule => rule.declarations?.font ||
          (rule.declarations?.['font-family']?.value && rule.declarations['font-family'].value !== 'inherit'))) return;
    Object.assign(evidence, { referenceRule: tokens[0], candidateResetRule: resets[0], referenceParentComputed: stages.reference.fontFamily });
    reason = `The captured calendar font token reaches the reference ${kind} label. The replacement button omits that component font and passes the longer document control stack unchanged through normal, effective and actual texture paint. This is unequal authoring, not evidence that core selected a wrong font for equal inputs.`;
  } else {
    const tokens = referenceRules(ref).filter(rule => rule.selector === '.mat-calendar-body-cell-content' &&
      rule.declarations?.[cssProperty]?.value === (property === 'lineHeight' ? '1' : 'var(--mat-datepicker-calendar-date-text-color, var(--mat-sys-on-surface))'));
    if (tokens.length !== 1 || referenceRules(ref).some(rule => rule !== tokens[0] &&
        (rule.declarations?.font || (rule.declarations?.[cssProperty]?.value && rule.declarations[cssProperty].value !== 'inherit')))) return;
    evidence.referenceRule = tokens[0];
    if (property === 'lineHeight') {
      const chain = candidateTypographyOmissionChain(ast, astylarTree, inventory, 'lineHeight');
      if (!chain || cells[0].lineHeight !== undefined || days[0].lineHeight !== undefined ||
          stages.reference.lineHeight !== stages.reference.fontSize || stages.painted.fontSize !== stages.reference.fontSize ||
          !/^\d+(?:\.\d+)?px$/.test(stages.painted.lineHeight ?? '')) return;
      evidence.candidateOmissionChain = chain;
      reason = 'The inner reference date label explicitly declares line-height:1, but the flattened candidate button and its entire normal/effective ancestry omit line-height. Actual control paint consequently uses a different line height. Restore the reference inner line-box input before assessing any remaining core metric defect; a fixed container height or baseline adjustment is not an equivalent input.';
    } else {
      if (canonicalStyle(cells[0]).color !== stages.normal.color || stages.normal.color !== 'rgba(29,27,32,1)' ||
          stages.effective.color !== stages.normal.color || stages.painted.color !== stages.normal.color || (kind === 'day' && days[0].color !== undefined)) return;
      reason = `The reference ${kind} label uses the captured date-text/on-surface token, while the candidate cell fixes #1d1b20 and retains it unchanged in normal, effective and actual texture paint. The fixed ink dates to ${kind === 'year' ? 'd973f84' : '87f7f83'} and is not equivalent to the observed token result. No color-distance tolerance or screenshot similarity waives this input difference.`;
    }
  }
  return { classification: 'application-plugin-authoring-defect', attribution: `reviewed-calendar-${kind}-typography-input`,
    recommendedOwner: 'showcase calendar token translation and core-composed inner text structure',
    justification: reason, reviewEvidence: evidence };
}

// These paths describe Material's actual button and explicit template tab
// labels, not an inferred text match. Other texture owners stay visible gaps.
export function collectControlTypographyEvidence(cases, inventory) {
  const comparisons = [], differences = [], gaps = [], iconSubstitutions = [];
  const gap = (key, element, reason, evidence = {}) => gaps.push({ case: key, element, reason, ...evidence,
    classification: 'parity-harness-defect', attribution: 'unresolved',
    recommendedOwner: 'input audit control text identity and actual paint-input provenance' });
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  for (const entry of cases) {
    const key = caseKey(entry);
    const refs = inventory.cases.filter((item) => item.case === key && item.side === 'reference');
    const asts = inventory.cases.filter((item) => item.case === key && item.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1 || inventory.errors.some((error) => error.case === key)) {
      gap(key, undefined, 'missing, ambiguous, or invalid full-tree capture'); continue;
    }
    const referenceTree = inventory.variants[refs[0].variant], astylarTree = inventory.variants[asts[0].variant];
    const buttonLabelNodes = referenceTree.nodes.filter((node) => node.type === 'span' &&
      String(node.attributes?.class ?? '').split(/\s+/).includes('mdc-button__label'));
    const tabLabelNodes = entry.family === 'tabs' ? referenceTree.nodes.filter((node) => node.type === 'span' &&
      ['tab-overview', 'tab-activity'].includes(node.attributes?.id)) : [];
    const calendarLabelNodes = entry.family === 'datepicker' ? referenceTree.nodes.filter((node) => node.type === 'span' &&
      String(node.attributes?.class ?? '').split(/\s+/).includes('mat-calendar-body-cell-content')) : [];
    const labelNodes = [...buttonLabelNodes, ...tabLabelNodes, ...calendarLabelNodes];
    const paintedNodes = astylarTree.nodes.filter((node) => node.paintedControlText);
    if (!labelNodes.length && !paintedNodes.length) continue;
    if (astylarTree.resolvedStyleEvidenceVersion !== 2 || astylarTree.resolvedStyleSource !== 'core-style-inspection' ||
        !Number.isInteger(asts[0].resolvedStyleRevision) || astylarTree.paintedControlTextEvidenceVersion !== 1) {
      gap(key, undefined, 'missing control texture evidence version, core source, or revision'); continue;
    }
    const mapped = new Set();
    for (const ref of labelNodes) {
      const tabLabel = tabLabelNodes.includes(ref);
      const calendarLabel = calendarLabelNodes.includes(ref);
      const calendarDay = calendarLabel ? reviewedCalendarCellControl(ref, referenceTree, astylarTree) : undefined;
      const calendarYear = calendarLabel && !calendarDay ? reviewedCalendarCellControl(ref, referenceTree, astylarTree, 'year') : undefined;
      const calendar = calendarDay ?? calendarYear;
      const parents = calendarLabel ? [calendar?.parent].filter(Boolean) : tabLabel ? [reviewedTabLabelControl(ref, referenceTree)].filter(Boolean)
        : referenceTree.nodes.filter((node) => node.key === ref.parent && node.type === 'button');
      const parent = parents.length === 1 ? parents[0] : undefined;
      const id = calendarLabel ? calendar?.id : tabLabel ? ref.attributes.id : parent?.attributes?.id || parent?.attributes?.['data-parity-id'];
      const astNodes = astylarTree.nodes.filter((node) => id && node.authored?.id === id);
      const referenceOwners = referenceTree.nodes.filter((node) => id &&
        (node.attributes?.id === id || node.attributes?.['data-parity-id'] === id));
      if (!parent || !id || (!calendarLabel && referenceOwners.length !== 1) || astNodes.length !== 1 || astNodes[0].authored.type !== 'button' ||
          (tabLabel && (astNodes[0].authored.role !== 'tab' || !String(astNodes[0].authored.class ?? '').split(/\s+/).includes('tab'))) ||
          referenceTree.nodes.filter((node) => node.key === ref.key).length !== 1 ||
          (!tabLabel && !calendarLabel && buttonLabelNodes.filter((node) => node.parent === parent.key).length !== 1) ||
          referenceTree.nodes.some((node) => node.parent === ref.key) || parent.ownText?.trim()) {
        gap(key, id, 'Material control label lacks a unique reviewed leaf path and shared control identity', { referenceNode: ref.key }); continue;
      }
      const ast = astNodes[0], paint = ast.paintedControlText;
      if (mapped.has(ast.key)) { gap(key, id, 'multiple labels map to the same control'); continue; }
      mapped.add(ast.key);
      const authoredText = ast.authored.value ?? ast.authored.textContent;
      if (!ref.ownText?.trim() || ref.ownText.trim() !== String(authoredText ?? '').trim() ||
          ref.ownText.trim() !== paint?.text?.trim()) {
        gap(key, id, 'reference, authored control label and current texture text are not identical',
          { reference: ref.ownText, authored: authoredText, painted: paint?.text }); continue;
      }
      if (paint.source !== 'core-control-texture') {
        gap(key, id, 'control label has no authoritative current texture source'); continue;
      }
      const raw = { reference: styleAt(ref.style, 'reference'), normal: styleAt(ast.normalStyle, 'astylar'),
        effective: styleAt(ast.interactionStyle, 'astylar'), painted: styleAt(paint.style, 'astylar') };
      if (Object.values(raw).some((style) => !style || typeof style !== 'object' || Array.isArray(style))) {
        gap(key, id, 'missing or wrongly attributed pooled control text style'); continue;
      }
      if (ast.retainedText?.source === 'core-text-registry') raw.retained = styleAt(ast.retainedText.style, 'astylar');
      const parsed = { ...raw.painted };
      for (const property of ['fontSize', 'letterSpacing', 'wordSpacing']) {
        parsed[property] = typeof raw.painted[property] === 'number' && Number.isFinite(raw.painted[property])
          ? `${raw.painted[property]}px` : undefined;
      }
      parsed.lineHeight = Number.isFinite(raw.painted.lineHeight) && typeof raw.painted.lineHeight === 'number' &&
        Number.isFinite(raw.painted.fontSize) && typeof raw.painted.fontSize === 'number' && raw.painted.fontSize > 0
        ? `${raw.painted.lineHeight * raw.painted.fontSize}px` : undefined;
      const stages = Object.fromEntries(Object.entries(raw).filter(([, style]) => style)
        .map(([stage, style]) => [stage, canonicalStyle(stage === 'painted'
          ? Object.fromEntries(Object.entries(parsed).filter(([, value]) => value !== undefined)) : style)]));
      const comparison = { case: key, family: entry.family, element: id, state: entry.state ?? 'static',
        referenceNode: ref.key, referenceControl: parent.key, astylarNode: ast.key, text: paint.text,
        source: paint.source, revision: asts[0].resolvedStyleRevision, rawPaintedStyle: paint.style,
        maxWidth: paint.maxWidth, finalRasterVerified: false,
        mapping: calendarYear ? { kind: 'reviewed-material-calendar-year-label', reviewEvidence: calendar.evidence,
          justification: 'A unique accessible year in the multi-year-view table maps to one authored year button only when the reference 24-year live-label range and candidate header range agree and contain that year, and both exact ancestry paths are present. This establishes year text correspondence only, not equal table/grid geometry, selected state, header icon/content, typography or final raster.' }
          : calendarLabel ? { kind: 'reviewed-material-calendar-day-label', reviewEvidence: calendar.evidence,
          justification: 'A unique full accessible date in the month-view table maps to one authored day button only when the reference period and candidate month/year context agree and both exact ancestry paths are present. Numeric text alone is insufficient. This establishes text-owner correspondence, not equal table/grid layout, accessibility, selected state, typography, placement or final raster.' }
          : tabLabel ? { kind: 'reviewed-material-tab-label',
          justification: 'The explicit template span ID identifies one leaf inside span.mdc-tab__text-label, span.mdc-tab__content and a div.mdc-tab with role tab. It matches a unique candidate button with role tab and the same authored label/current texture text. This establishes label correspondence only; replacing the reference wrappers with one control does not establish equivalent line boxes, typography, state, structure or raster.' }
          : { kind: 'reviewed-material-button-label',
            justification: 'A unique shared button ID or reference data-parity-id anchors one direct span.mdc-button__label leaf. Its direct text matches both the authored candidate control label and current core-owned texture text. This establishes text-owner identity only, not layout, style, state, material or raster equivalence.' }, properties: {} };
      for (const property of retainedTypographyProperties) {
        const values = Object.fromEntries(Object.entries(stages).map(([stage, style]) => [stage, style[property]]));
        comparison.properties[property] = values;
        if (values.reference === undefined || values.painted === undefined) {
          gap(key, id, 'missing reference or valid parsed control typography property', { property, values });
        } else if (values.reference !== values.painted) {
          differences.push({ case: key, family: entry.family, element: id, property, values,
            referenceNode: ref.key, astylarNode: ast.key, source: paint.source, revision: comparison.revision,
            classification: 'parity-harness-defect', attribution: 'unresolved',
            recommendedOwner: 'input audit control authored-token and core paint-input attribution',
            justification: 'Browser computed and actual control texture paint inputs differ. Attribute authored tokens and parser/runtime behavior before assigning fault. CSS normal line-height, font fallback and composited colors are not automatically equivalent to numeric or opaque substitutes.',
            ...(reviewedButtonPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ??
              reviewedTabPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ??
              reviewedCalendarCellPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ?? {}) });
        }
      }
      comparisons.push(comparison);
    }
    for (const node of paintedNodes) if (!mapped.has(node.key)) {
      const substitution = reviewedNavigationIconInput(entry, node, referenceTree, astylarTree, inventory, asts[0].resolvedStyleRevision);
      if (substitution) iconSubstitutions.push(substitution);
      else gap(key, node.authored?.id, 'current control texture has no reviewed reference text-owner mapping', { astylarNode: node.key });
    }
  }
  return { schemaVersion: 1, scope: 'Current core-owned control texture inputs, separately from normal/effective declarations and registry-retained text. Exact direct Material button labels, explicit template tab-label paths, month-view day paths with full date context, and multi-year table paths with matching year-range context are reviewed. Paginator and calendar navigation SVG-to-glyph substitutions are separately classified unequal content, never typography equivalence; calendar year-view accessible-name mismatches remain explicit. Other observed control owners remain gaps. Numeric parsed CSS lengths and line-height multipliers are normalized without authored or projected fallbacks. Other effects remain in the full inventory and are not certified by these eleven typography comparisons.', comparisons, differences, gaps, iconSubstitutions };
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
        ...(node.paintedControlText ? { paintedControlText: { ...node.paintedControlText,
          style: intern({ side, value: node.paintedControlText.style }, styles, styleIds) } } : {}),
      });
      const variant = intern({ family: entry.family, side, resolvedStyleEvidenceVersion: tree.resolvedStyleEvidenceVersion,
        resolvedStyleSource: tree.resolvedStyleSource,
        paintedControlTextEvidenceVersion: tree.paintedControlTextEvidenceVersion, nodes, rules: ruleMap }, variants, variantIds);
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
    'src/app/services/dom/input/button.manager.ts',
    'src/app/services/text/text-style-parser.service.ts',
    'src/app/types/style-rule.ts',
    'examples/material-showcase/src/app/astylar.component.ts',
    'examples/material-showcase/src/app/material-input-evidence.ts',
    'examples/material-showcase/src/app/normal-line-height-audit.spec.ts',
    'examples/material-showcase/angular.json',
    'examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/src/app/theme.ts',
    'examples/material-showcase/src/app/showcase.store.ts',
    'examples/material-showcase/src/styles.scss',
    'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts',
    'examples/material-showcase/src/app/material-plugin/material-ripple.controller.ts',
    'tests/material-parity/benchmark.config.mjs',
    'tests/material-parity/run-material-parity.mjs',
    'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/input-equivalence-policy.mjs',
    'tests/material-parity/normal-line-box-report.mjs',
    'tests/material-parity/normal-line-box-evidence.mjs',
    'scripts/audit-material-normal-line-boxes.mjs',
  ];
  return files.map((file) => ({ file, sha256: createHash('sha256')
    .update(readFileSync(path.resolve(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex') }));
}

function focusedProofInventory(root) {
  return [
    proof(root, 'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts', /describe\('Material input audit/,
      'one real-browser characterization passes across three independent surface mounts', 'Actual fillText calls are observed only on the texture bound to the private tab-panel content plane. CSS font sizes 24px and 30px both paint with a 32px texture font when plugin font-size is 16; changing only plugin font-size to 20 paints at 40px. The 2x backing texture stays 480 by 96, ink follows data #ff0000 instead of CSS #123456, and the baseline follows the plugin formula. This confirms competing plugin typography, not a core equal-input failure. Font asset warnings prevent any claim about the selected physical font; glyph sharpness, final baseline alignment and complete matrix paint provenance remain separate obligations.'),
    proof(root, 'scripts/audit-material-normal-line-boxes.mjs', /const targets =/,
      '120 validated static natural-line-box observations across 96 cases; scope-limited stage evidence', 'Pinned browser assets, text, typography, viewport/DPR and paired checkpoint trees bind a supplemental natural reference line box to each mapped static label. The measured scalar matches current core paint for these observations; font-list, tracking and disabled-ink substitutions remain independently classified. No universal normal-line-height rule, input-equivalence or final raster claim is inferred.'),
    proof(root, 'examples/material-showcase/src/app/normal-line-height-audit.spec.ts', /describe\('Material audit/,
      'nine browser reductions; five pass and four diagnostic failures are retained', 'Equal typography compares actual core control paint and bound-texture CSS height with a natural single-line DOM block, not the fixed button container or a guessed normal multiplier. Local Roboto 14px normal/omitted, 17.5px normal, and explicit 21px/1.5 controls pass. Arial 16px and serif 20px normal are one pixel too short; Roboto 14px containing emoji or CJK fallback glyphs is two pixels too short. Repeated after fixing test-only local font asset serving. This confirms a core normal-metrics defect without assigning it to every Material occurrence or claiming final glyph raster parity.'),
    proof(root, 'scripts/audit-material-picker-commits.mjs', /select day 1/,
      'supplemental diagnostic; known mismatches recorded in investigation', 'Real pointer selection of a date/time reaches the correct candidate target but does not commit a value or close the popup. This case supplements, rather than replaces, the unfiltered maintained matrix.'),
    proof(root, 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts', /describe\('Material audit/,
      'thirty-nine executable browser reductions; seventeen pass and twenty-two diagnostic failures are retained', 'Eight original reductions pass: toolbar, stepper, content-derived flex height, calendar span, bottom overlay, table cells, inherited text stage, and positioned drawer geometry. Floating-label untransformed, literal-translation, default-origin scaling, and translate-then-scale controls also pass. Both value/textContent control texture inspections, the Arial explicit-generic font-list control, and unavailable-family serif/sans-serif text-width controls pass. The single-family Arial paint-input preservation case fails because core appends Arial, Helvetica, sans-serif. An unavailable single family also fails actual bound-texture CSS advance versus browser Range width by 3.734875px, confirming observable fallback semantics without claiming final glyph raster or the exact chosen font. Percentage translation, top-left origin scaling, their combination, reversed scale/translate order, and repeated-translation composition fail. Transform-origin is deliberately preserved as original CSS diagnostic input outside the current public StyleRule subset; order/repetition controls use only existing functions and default origin. Fifteen earlier failures remain: divider empty-block height; two direct-calc grid-list limitations; two literal grid-list and two plain opposing-inset height cases; two loaded-CSS grid-list cases with correct expression resolution but wrong inner auto height; four inline/inline-block intrinsic parent-width cases; and two absolute-margin cases. Inline fragment vertical bounds are not equated to core text planes. Retained typography is not current-paint proof; geometry is not glyph/border raster, scrolling, or full Material composition evidence. Consult the investigation for exact commands and limits.'),
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
    { priority: 5.1, rootCause: 'Core rewrites an explicit font-family list before paint', action: 'The parser appends Arial, Helvetica, sans-serif to explicit lists without a recognized generic. Preserve this as distinct from missing Material font-token authoring. The equal-input unavailable-family proof now confirms changed text advance, while both explicit-generic controls pass. Preserve authored family ordering/quoting and browser fallback semantics at the core parser boundary; verify available/unavailable and missing-glyph cases without assuming a particular platform font. Do not add a generic family to the showcase merely to avoid the parser branch. Final raster verification remains separate from the measured advance proof.' },
    { priority: 5.2, rootCause: 'Material control typography tokens and nested line boxes are replaced by fixture defaults', action: 'Translate the original filled/outlined/text button and tab font/tracking tokens instead of inheriting the document control stack or omitting tracking. Restore toolbar button line-height inheritance instead of copying the density-specific container height. Preserve the tab text-label line-height:1 inside its independently sized content/control rather than applying the outer line-height to a flattened value label. Preserve alpha ink as a distinct authored input. Then investigate any core API or equal-input text mismatch; do not adjust font size, baseline, or offsets to recover screenshot similarity.' },
    { priority: 5.3, rootCause: 'Core normal line-height is approximated by a fixed Mg font-box probe', action: 'Resolve browser normal line-box metrics and actual fallback runs in core. The equal-input Arial/serif cases expose one-pixel texture-height errors; Roboto plus emoji/CJK exposes two-pixel errors while plain Roboto and explicit line heights pass. Preserve those controls, extend multiline/baseline/DPR verification and avoid a universal multiplier, constant pixel addition, or fixed Material line-height compensation. Current-texture evidence must remain separate from declared normal and from final glyph raster.' },
    { priority: 5.4, rootCause: 'Calendar cell text tokens and inner line boxes were flattened away', action: 'Restore the reference calendar font and date-text ink tokens and its inner line-height:1 label inside both day and year controls. Keep reference cell/container sizing, state and selection structure instead of copying a normal-metric result or tuning the baseline. Separate date/range-context proofs isolate 990 day and 192 year occurrences each of missing font-token, omitted inner line-height and fixed-ink inputs; core metric defects must be assessed only after those inputs are equivalent. Independently resolve normal-versus-zero tracking and the still-unmapped header/icon owners.' },
    { priority: 6, rootCause: 'Interaction geometry duplicated by the application', action: 'Expose resolved CSS-space target bounds and local pointer coordinates in the core event/plugin contract; remove ripple width tables.' },
    { priority: 7, rootCause: 'Material paint inputs are substituted or calibrated', action: 'Supply paginator and calendar navigation reference SVG paths and their CSS/state paint through core vector/image rendering instead of font-character approximations. Preserve calendar navigation accessible names for the active month or multi-year view; do not copy month labels into the year view. Express progress angles, state layers, checkmarks, selection rings, and indicators from reference Material geometry in CSS space; remove screenshot-derived angle and fractional-position constants. Diagnose core only after the actual same geometry is supplied.' },
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
