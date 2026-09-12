import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { loadNormalLineBoxReport } from './normal-line-box-report.mjs';
import { validateSupplementalCapture } from './supplemental-capture-evidence.mjs';
import { borderColorProperties, borderInitialAttribution, collectBorderInitialInputs, classifyBorderInitialInput,
  buttonBorderResetAttribution, collectButtonBorderResetInputs, classifyButtonBorderResetInput,
  outlineTokenAttribution, collectOutlineTokenInputs, classifyOutlineTokenInput } from './border-initial-input-evidence.mjs';
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
  let parityReport, normalLineBoxReport, supplementalRoot;
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
    } else if (arg.startsWith('--supplemental-root=')) {
      if (supplementalRoot !== undefined) throw new Error('Repeated audit option: --supplemental-root');
      supplementalRoot = arg.slice('--supplemental-root='.length);
      if (!supplementalRoot.trim()) throw new Error('--supplemental-root requires a path');
    } else {
      throw new Error(`Unknown audit option: ${arg}`);
    }
  }
  return {
    check: flags.has('--check'),
    allowPartial: flags.has('--allow-partial'),
    parityPath: path.resolve(root, parityReport ?? 'artifacts/material-parity/latest-report.json'),
    ...(normalLineBoxReport === undefined ? {} : { normalLineBoxPath: path.resolve(root, normalLineBoxReport) }),
    ...(supplementalRoot === undefined ? {} : { supplementalRoot: path.resolve(root, supplementalRoot) }),
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
  const supplementalOptions = { supplementalRoot: options.supplementalRoot, expectedProvenance: parityReport.captureProvenance };
  const supplementalBehavior = collectSupplementalBehavior(root, supplementalOptions);
  const supplementalOverlays = collectSupplementalOverlays(root, supplementalOptions);
  const supplementalSlider = collectSupplementalSlider(root, supplementalOptions);
  const elementInventory = collectFullTreeInventory([...cases, ...supplementalBehavior.cases, ...supplementalOverlays.cases, ...supplementalSlider.cases], { root });
  const visibleOverflowInputs = collectVisibleOverflowInputs(elementInventory);
  const borderInitialInputs = collectBorderInitialInputs(elementInventory, canonicalStyle);
  const buttonBorderResetInputs = collectButtonBorderResetInputs(elementInventory, canonicalStyle);
  const outlineTokenInputs = collectOutlineTokenInputs(elementInventory, canonicalStyle);
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
  const discrepancies = collectStyleDiscrepancies(cases, retainedTypography, visibleOverflowInputs, borderInitialInputs, buttonBorderResetInputs, outlineTokenInputs);
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
        [supplementalBehavior, supplementalOverlays, supplementalSlider].every(entry => entry.binding?.status === 'checkpoint-bound') &&
        supplementalBehavior.missing.length === 0 && supplementalBehavior.errors.length === 0 && supplementalBehavior.mismatches.length === 0 &&
        supplementalOverlays.missing.length === 0 && supplementalOverlays.errors.length === 0 && supplementalOverlays.mismatches.length === 0 &&
        supplementalSlider.missing.length === 0 && supplementalSlider.errors.length === 0 && supplementalSlider.mismatches.length === 0 &&
        normalLineBoxes.missing.length === 0 && normalLineBoxes.errors.length === 0 &&
        elementInventory.gaps.length === 0 && elementInventory.resolvedStyleGaps.length === 0 && elementInventory.stateStyleGaps.length === 0 && elementInventory.referenceContextGaps.length === 0 && elementInventory.errors.length === 0 &&
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
    visibleOverflowInputs,
    borderInitialInputs,
    buttonBorderResetInputs,
    outlineTokenInputs,
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
  if (JSON.stringify(report.reviewedValueNormalizations) !== JSON.stringify(reviewedValueNormalizations)) {
    errors.push('reviewed value normalizations lack the current exact property, scope and evidence policy');
  }
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
  if (JSON.stringify(report.outlineTokenInputs) !== JSON.stringify(collectOutlineTokenInputs(report.elementInventory, canonicalStyle))) {
    errors.push('outline token evidence does not replay from the captured inventory');
  }
  for (const entry of report.discrepancies.filter(entry => entry.attribution === outlineTokenAttribution)) {
    const proof = report.outlineTokenInputs?.find(proof => proof.case === entry.reviewEvidence?.case && proof.element === entry.element);
    if (!proof || !proof.properties.includes(entry.property) || entry.reference !== proof.referenceColor ||
        entry.astylar !== proof.candidateBorderColor || entry.classification !== 'application-plugin-authoring-defect' ||
        JSON.stringify(proof) !== JSON.stringify(entry.reviewEvidence) || !Array.isArray(entry.reviewedCases) ||
        entry.reviewedCases.length !== entry.occurrences || new Set(entry.reviewedCases).size !== entry.occurrences ||
        entry.reviewedCases.some(key => !report.outlineTokenInputs?.some(item => item.case === key && item.element === entry.element &&
          item.properties.includes(entry.property) && item.referenceColor === entry.reference && item.candidateBorderColor === entry.astylar))) {
      errors.push('outline token classification lacks exact captured declaration and style evidence');
    }
  }
  if (JSON.stringify(report.buttonBorderResetInputs) !== JSON.stringify(collectButtonBorderResetInputs(report.elementInventory, canonicalStyle))) {
    errors.push('button border-reset evidence does not replay from the captured inventory');
  }
  for (const entry of report.discrepancies.filter(entry => entry.attribution === buttonBorderResetAttribution)) {
    const proof = report.buttonBorderResetInputs?.find(proof => proof.case === entry.reviewEvidence?.case && proof.element === entry.element);
    if (!proof || !borderColorProperties.includes(entry.property) || entry.reference !== proof.referenceColor ||
        entry.astylar !== proof.candidateBorderColor || entry.classification !== 'application-plugin-authoring-defect' ||
        JSON.stringify(proof) !== JSON.stringify(entry.reviewEvidence) || !Array.isArray(entry.reviewedCases) ||
        entry.reviewedCases.length !== entry.occurrences || new Set(entry.reviewedCases).size !== entry.occurrences ||
        entry.reviewedCases.some(key => !report.buttonBorderResetInputs?.some(item => item.case === key && item.element === entry.element &&
          item.referenceColor === entry.reference && item.candidateBorderColor === entry.astylar))) {
      errors.push('button border-reset classification lacks exact captured reset and omission evidence');
    }
  }
  if (JSON.stringify(report.borderInitialInputs) !== JSON.stringify(collectBorderInitialInputs(report.elementInventory, canonicalStyle))) {
    errors.push('border initial-color evidence does not replay from the captured inventory');
  }
  for (const entry of report.discrepancies.filter(entry => entry.attribution === borderInitialAttribution)) {
    const proof = report.borderInitialInputs?.find(proof => proof.case === entry.reviewEvidence?.case && proof.element === entry.element);
    if (!proof || !borderColorProperties.includes(entry.property) || entry.reference !== proof.referenceColor ||
        entry.astylar !== proof.candidateBorderColor || entry.classification !== 'intentional-documented-limitation' ||
        JSON.stringify(proof) !== JSON.stringify(entry.reviewEvidence) || !Array.isArray(entry.reviewedCases) ||
        entry.reviewedCases.length !== entry.occurrences || new Set(entry.reviewedCases).size !== entry.occurrences ||
        entry.reviewedCases.some(key => !report.borderInitialInputs?.some(item => item.case === key && item.element === entry.element &&
          item.referenceColor === entry.reference && item.candidateBorderColor === entry.astylar))) {
      errors.push('border initial-color classification lacks exact captured omission evidence');
    }
  }
  if (JSON.stringify(report.visibleOverflowInputs) !== JSON.stringify(collectVisibleOverflowInputs(report.elementInventory))) {
    errors.push('visible overflow initial-value evidence does not replay from the captured inventory');
  }
  for (const entry of report.discrepancies.filter(entry => entry.attribution === 'reviewed-visible-overflow-initial-value')) {
    const proof = report.visibleOverflowInputs?.find(proof => proof.case === entry.reviewEvidence?.case && proof.element === entry.element);
    if (!proof || !['overflowX', 'overflowY'].includes(entry.property) || entry.reference !== 'visible' || entry.astylar !== undefined ||
        entry.classification !== 'equivalent-representation' || JSON.stringify(proof) !== JSON.stringify(entry.reviewEvidence)) {
      errors.push('visible overflow classification lacks exact paired-axis initial-value evidence');
    }
  }
  const contextGaps = collectReferenceContextGaps(report.elementInventory);
  if (JSON.stringify(report.elementInventory.referenceContextGaps) !== JSON.stringify(contextGaps)) {
    errors.push('reference computed-context gaps do not replay from the captured inventory');
  }
  if (requireComplete && contextGaps.length) errors.push(`${contextGaps.length} reference computed-context observations are missing`);
  if (report.retainedTypography?.schemaVersion !== 1) errors.push('missing retained typography stage report');
  if (!Array.isArray(report.retainedTypography?.controlTextMappings)) errors.push('missing retained-to-control text stage inventory');
  const controlTextMappingKeys = report.retainedTypography?.controlTextMappings?.map((mapping) =>
    JSON.stringify([mapping.case, mapping.element, mapping.referenceNode, mapping.astylarNode])) ?? [];
  if (new Set(controlTextMappingKeys).size !== controlTextMappingKeys.length) errors.push('duplicate retained-to-control text stage mappings');
  const invalidControlTextMappings = report.retainedTypography?.controlTextMappings?.filter((mapping) => {
    const matches = report.controlTypography?.comparisons.filter((comparison) => comparison.case === mapping.case &&
      comparison.element === mapping.element && comparison.referenceNode === mapping.referenceNode &&
      comparison.astylarNode === mapping.astylarNode && comparison.text === mapping.text &&
      comparison.referenceText === mapping.referenceText &&
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
  for (const [family, kind, inspect, label] of [
    ['snack-bar', 'reviewed-material-snackbar-action-label', reviewedSnackbarActionControl, 'snackbar action'],
    ['bottom-sheet', 'reviewed-material-bottom-sheet-item-label', reviewedBottomSheetItemControl, 'bottom-sheet item'],
    ['datepicker', 'reviewed-material-calendar-period-composition', (leaf, ref, ast, inventory) => {
      const mapping = reviewedCalendarPeriodControl(ref, ast, inventory);
      return mapping?.ref === leaf ? mapping : undefined;
    }, 'calendar period'],
  ]) {
    const invalidMappings = report.controlTypography?.comparisons.filter((comparison) => {
      if (comparison.mapping?.kind !== kind) return false;
      const inventory = report.elementInventory;
      const refs = inventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
      const asts = inventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
      if (comparison.family !== family || refs.length !== 1 || asts.length !== 1) return true;
      const ref = inventory.variants[refs[0].variant], ast = inventory.variants[asts[0].variant];
      const leaves = ref.nodes.filter(n => n.key === comparison.referenceNode);
      const mapping = leaves.length === 1 && inspect(leaves[0], ref, ast, inventory);
      const candidates = ast.nodes.filter(n => n.key === comparison.astylarNode && n.authored?.id === comparison.element);
      return !mapping || mapping.id !== comparison.element || mapping.parent.key !== comparison.referenceControl ||
        candidates.length !== 1 || candidates[0].paintedControlText?.source !== 'core-control-texture' ||
        candidates[0].paintedControlText.text !== comparison.text ||
        (kind === 'reviewed-material-calendar-period-composition'
          ? mapping.candidateText !== comparison.text || mapping.referenceText !== comparison.referenceText
          : leaves[0].ownText.trim() !== comparison.text.trim()) ||
        comparison.source !== 'core-control-texture' || comparison.revision !== asts[0].resolvedStyleRevision ||
        comparison.finalRasterVerified !== false ||
        JSON.stringify(mapping.evidence) !== JSON.stringify(comparison.mapping.reviewEvidence);
    }) ?? [];
    if (invalidMappings.length) errors.push(`${invalidMappings.length} ${label} mappings lack captured overlay/content context evidence`);
  }
  const unresolvedControlGaps = report.controlTypography?.gaps.filter(gap => !isReviewedCalendarCloseGap(gap, report.elementInventory)) ?? [];
  if (requireComplete && unresolvedControlGaps.length > 0) errors.push(`${unresolvedControlGaps.length} control texture mappings or stage fields require review`);
  for (const [stage, gaps] of [['control', report.controlTypography?.gaps ?? []], ['retained', report.retainedTypography?.gaps ?? []]]) {
    const omissions = gaps.filter(gap => gap.attribution === 'reviewed-calendar-close-control-omission');
    if (omissions.some(gap => !isReviewedCalendarCloseGap(gap, report.elementInventory))) {
      errors.push(`${stage} calendar close omissions lack exact captured structural evidence`);
    }
    const identities = omissions.map(gap => JSON.stringify([gap.case, gap.referenceNode ?? gap.referenceNodes?.[0]]));
    if (new Set(identities).size !== identities.length) errors.push(`duplicate ${stage} calendar close omissions`);
    // Replay expected omissions too: deleting the reviewed record must not turn
    // the absent control into a green/missing typography observation.
    for (const item of report.elementInventory.cases.filter(c => c.side === 'reference' && /^(static|interaction):datepicker@/.test(c.case))) {
      for (const node of report.elementInventory.variants[item.variant].nodes.filter(n => n.ownText?.trim() === 'Close calendar')) {
        if (reviewedCalendarCloseOmission(item.case, node.key, report.elementInventory) &&
            !identities.includes(JSON.stringify([item.case, node.key]))) errors.push(`missing ${stage} calendar close omission: ${item.case}`);
      }
    }
  }
  const reviewedControlKinds = {
    'reviewed-horizontal-start-alignment': 'equivalent-representation',
    'reviewed-button-tracking-input': 'application-plugin-authoring-defect',
    'reviewed-disabled-button-ink': 'application-plugin-authoring-defect',
    'reviewed-button-font-token-input': 'application-plugin-authoring-defect',
    'reviewed-core-font-list-rewrite': 'confirmed-core-renderer-defect',
    'reviewed-toolbar-button-line-height-input': 'application-plugin-authoring-defect',
    'reviewed-tab-label-typography-input': 'application-plugin-authoring-defect',
    'reviewed-calendar-day-typography-input': 'application-plugin-authoring-defect',
    'reviewed-calendar-year-typography-input': 'application-plugin-authoring-defect',
    'reviewed-snackbar-action-typography-input': 'application-plugin-authoring-defect',
    'reviewed-bottom-sheet-item-typography-input': 'application-plugin-authoring-defect',
    'reviewed-calendar-period-typography-input': 'application-plugin-authoring-defect',
    'reviewed-normal-line-box-stage-comparison': 'parity-harness-defect',
  };
  const unresolvedControlTypography = report.controlTypography?.differences.filter((entry) =>
    !reviewedControlKinds[entry.attribution] || entry.classification !== reviewedControlKinds[entry.attribution] || !entry.reviewEvidence ||
    (entry.attribution === 'reviewed-normal-line-box-stage-comparison' &&
      !isReviewedNormalLineBoxDifference(entry, report.normalLineBoxes))) ?? [];
  if (requireComplete && unresolvedControlTypography.length > 0) errors.push(`${unresolvedControlTypography.length} control texture typography differences require attribution`);
  for (const [family, attribution, label] of [
    ['snack-bar', 'reviewed-snackbar-action-typography-input', 'snackbar action'],
    ['bottom-sheet', 'reviewed-bottom-sheet-item-typography-input', 'bottom-sheet item'],
    ['datepicker', 'reviewed-calendar-period-typography-input', 'calendar period'],
  ]) {
    const replays = new Map();
    const invalidTypography = report.controlTypography?.differences.filter(difference => {
      if (difference.attribution !== attribution) return false;
      if (difference.family !== family) return true;
      if (!replays.has(difference.case)) {
        const comparison = report.controlTypography.comparisons.find(c => c.case === difference.case && c.element === difference.element);
        const match = new RegExp(`^(static|interaction):${family}@([^/]+)\\/([^/]+)(?:\\/(.+))?$`).exec(difference.case);
        const replay = comparison && match ? collectControlTypographyEvidence([{ kind: match[1], family,
          profile: match[2], viewport: { id: match[3] }, ...(match[4] ? { state: match[4] } : {}) }], report.elementInventory) : undefined;
        replays.set(difference.case, replay);
      }
      const matches = replays.get(difference.case)?.differences.filter(d => d.element === difference.element && d.property === difference.property) ?? [];
      return matches.length !== 1 || JSON.stringify(matches[0]) !== JSON.stringify(difference);
    }) ?? [];
    if (invalidTypography.length) errors.push(`${invalidTypography.length} ${label} typography attributions lack replayable captured input evidence`);
  }
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
  validateSelectArrowSubstitutions(report, errors);
  validatePluginTabPanelSubstitutions(report, errors);
  const unresolvedRetainedGaps = retainedGaps.filter((gap) => !isReviewedHiddenRetainedGap(gap, report.elementInventory) &&
    !isReviewedStepperPanelGap(gap, report.elementInventory) && !isReviewedCalendarCloseGap(gap, report.elementInventory) &&
    !isReviewedCalendarWeekdayNameGap(gap, report.elementInventory) && !isReviewedSelectArrowGap(gap, report.elementInventory) &&
    !isReviewedPluginTabPanelGap(gap, report.elementInventory));
  if (requireComplete && unresolvedRetainedGaps.length > 0) errors.push(`${unresolvedRetainedGaps.length} retained typography mappings or stage fields require review`);
  const reviewedTypographyKinds = { 'reviewed-heading-mask': 'parity-harness-defect',
    'reviewed-horizontal-start-alignment': 'equivalent-representation',
    'reviewed-inherited-component-font-stack': 'application-plugin-authoring-defect',
    'reviewed-omitted-component-text-metric': 'application-plugin-authoring-defect',
    'reviewed-field-label-tracking-substitution': 'application-plugin-authoring-defect',
    'reviewed-field-label-color-substitution': 'application-plugin-authoring-defect',
    'reviewed-sidenav-color-substitution': 'application-plugin-authoring-defect',
    'reviewed-sort-typography-substitution': 'application-plugin-authoring-defect',
    'reviewed-expansion-font-token-omission': 'application-plugin-authoring-defect',
    'reviewed-table-font-input': 'application-plugin-authoring-defect',
    'reviewed-tree-font-input': 'application-plugin-authoring-defect',
    'reviewed-tree-label-line-box-substitution': 'application-plugin-authoring-defect',
    'reviewed-stepper-number-wrapper-substitution': 'application-plugin-authoring-defect',
    'reviewed-toggle-button-wrapper-substitution': 'application-plugin-authoring-defect',
    'reviewed-stepper-text-input': 'application-plugin-authoring-defect',
    'reviewed-control-label-token-input': 'application-plugin-authoring-defect',
    'reviewed-select-value-token-input': 'application-plugin-authoring-defect',
    'reviewed-calendar-weekday-typography-input': 'application-plugin-authoring-defect',
    'reviewed-floating-label-font-input': 'application-plugin-authoring-defect' };
  const unresolvedTypography = report.retainedTypography?.differences.filter((entry) =>
    !reviewedTypographyKinds[entry.attribution] || entry.classification !== reviewedTypographyKinds[entry.attribution] || !entry.reviewEvidence) ?? [];
  if (requireComplete && unresolvedTypography.length > 0) errors.push(`${unresolvedTypography.length} retained typography differences require attribution`);
  validateCalendarWeekdayEvidence(report, errors);
  validateHorizontalStartAlignment(report, errors);
  validateInheritedComponentFontStack(report, errors);
  validateOmittedComponentTextMetrics(report, errors);
  validateFieldLabelTracking(report, errors);
  validateFieldLabelColors(report, errors);
  validateSidenavColors(report, errors);
  validateSortTypography(report, errors);
  validateExpansionFont(report, errors);
  validateTreeLabelLineBoxes(report, errors);
  validateStepperNumberAlignment(report, errors);
  validateToggleButtonAlignment(report, errors);
  validateStepperTextInputs(report, errors);
  if (requireComplete && report.supplementalBehavior.missing.length > 0) errors.push(`${report.supplementalBehavior.missing.length} supplemental behavior cases are missing`);
  if (report.supplementalBehavior.errors.length > 0) errors.push(`${report.supplementalBehavior.errors.length} supplemental behavior collection errors`);
  if (requireComplete && report.supplementalOverlays.missing.length > 0) errors.push(`${report.supplementalOverlays.missing.length} supplemental overlay cases are missing`);
  if (report.supplementalOverlays.errors.length > 0) errors.push(`${report.supplementalOverlays.errors.length} supplemental overlay collection errors`);
  if (requireComplete && report.supplementalSlider.missing.length > 0) errors.push(`${report.supplementalSlider.missing.length} supplemental slider cases are missing`);
  if (report.supplementalSlider.errors.length > 0) errors.push(`${report.supplementalSlider.errors.length} supplemental slider collection errors`);
  if (requireComplete) for (const [name, evidence] of [['picker', report.supplementalBehavior],
    ['bottom-sheet', report.supplementalOverlays], ['slider', report.supplementalSlider]]) {
    if (evidence.binding?.status !== 'checkpoint-bound') errors.push(`${name} supplemental evidence is not bound to the selected capture run`);
  }
  if (report.normalLineBoxes?.schemaVersion !== 1) errors.push('missing natural-line-box evidence stage');
  if (requireComplete && report.normalLineBoxes?.missing.length > 0) errors.push(`${report.normalLineBoxes.missing.length} static normal-line-box observations are missing`);
  if (report.normalLineBoxes?.errors.length > 0) errors.push(`${report.normalLineBoxes.errors.length} natural-line-box evidence errors`);
  return errors;
}

export function renderMaterialInputAuditMarkdown(report) {
  const lines = [
    '# Material showcase input-equivalence audit',
    '',
    'Full machine evidence is stored losslessly in [the gzip JSON payload](material-input-equivalence-audit.json.gz). The [readable manifest](material-input-equivalence-audit.json) records its format, schema version, byte lengths and SHA-256 digests. Decompressing the payload yields the entire ordinary JSON audit, not a summary. The audit command with --check validates package integrity and compares every decoded value with freshly generated evidence; packaging does not establish audit acceptance.',
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
    `Border initial-color evidence: ${report.borderInitialInputs.length} uniquely paired node observations prove omitted author/inline color inputs with browser currentColor versus core transparent defaults. Attribution rejects possibly applicable state/media/reset rules and unknown selectors, and is not an equivalence waiver. Alpha paint, contextual-color paint, structure and final raster require separate evidence.`,
    '',
    `Material button border-reset evidence: ${report.buttonBorderResetInputs.length} uniquely paired nodes have the explicit reference medium/none/currentColor reset but candidate width-only authoring. These remain authoring defects, not accepted initial-value aliases or equal-input paint failures.`,
    '',
    `Material outline-token evidence: ${report.outlineTokenInputs.length} uniquely paired nodes have the exact active serialized reference token shorthand versus a captured candidate literal at all three resolved stages. Only their explicitly proved border-color sides are attributed; no token is reconstructed from an empty expanded longhand or substituted into fixture paint.`,
    '',
    'Reviewed tracking representation: CSS Text 3 defines letter-spacing normal as computed zero, serialized by CSSOM as normal. Only that alias is canonicalized; raw pooled values remain available. The independent Arial equal-input advance failure remains a core finding. Numeric precision preserves tiny nonzero tracking rather than rounding it to normal. This accepts neither different fonts nor missing paint, line-height, shaping, alignment or final raster.',
    '',
    `Coverage is ${report.coverage.complete ? 'complete' : 'incomplete'}: ${report.coverage.executedStatic}/${report.coverage.configuredStatic} static cases and ` +
      `${report.coverage.executedInteractions}/${report.coverage.configuredInteractions} interaction/mobile-flow cases. All ${report.coverage.families.length} component families are inventoried.`,
    '',
    `Full-element evidence: ${report.elementInventory.cases.length} captured case sides, ${report.elementInventory.variants.length} tree variants; ${report.elementInventory.gaps.length} missing case sides, ${report.elementInventory.resolvedStyleGaps.length} elements without resolved styles, ${report.elementInventory.stateStyleGaps.length} state cases without effective style provenance, and ${report.elementInventory.errors.length} collection errors. Inventory presence does not establish input equivalence.`,
    '',
    `Reference computed context: ${report.elementInventory.referenceContextGaps.length} missing capture declarations or node/pseudo-element fields for direction, writing mode, bidi, last-line alignment, shaping and clipping. Legacy captures remain readable but cannot establish these inputs. A full new capture is required; no direction or clip value is inferred from class names, defaults or screenshots.`,
    '',
    `Retained typography: ${report.retainedTypography.comparisons.length} directly mapped text-node observations; ${report.retainedTypography.gaps.length} mapping/stage gaps and ${report.retainedTypography.differences.length} unequal retained-property observations. The registry stage is reported separately from declarations and is not proof of current pseudo-state glyph paint.`,
    '',
    `Inherited component font inputs: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-inherited-component-font-stack').length} records trace an active reference Material font token to Roboto, while complete candidate declaration ancestry omits that component override and retains the page fallback stack. These are unequal authored inputs, not equivalent font lists or proof of current physical font selection. The independent core single-family rewrite finding remains separate.`,
    '',
    `Omitted component text metrics: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-omitted-component-text-metric').length} records trace explicit reference line-height/tracking tokens through captured inheritance while the candidate text-to-page declaration chain omits them and retains normal/zero. This is unequal input, not a normal-to-pixel normalization or proof of current line placement and glyph paint. Fixed label/container dimensions do not replace the missing metrics.`,
    '',
    `Field-label tracking substitutions: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-field-label-tracking-substitution').length} records preserve the reference filled-label tracking token and wrapper styles alongside the explicit candidate base/empty-state rules. The 0.4px or 0.65px candidate input is not accepted as equivalent to 0.496px reference tracking, including when the reference wrapper is scaled. Current glyph paint and the separate core transform defects remain independently unproven or investigated.`,
    `Field-label colors: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-field-label-color-substitution').length} records preserve the reference filled-label color token and the candidate base/empty/picker-shell declarations in source order. Attribution requires the selected literal to agree across normal, effective and retained stages; stale ancestry or unexplained state divergence is not waived. These unequal color inputs are not a core color-conversion or raster-equivalence claim.`,
    `Sidenav colors: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-sidenav-color-substitution').length} records preserve distinct reference drawer/content token inheritance and candidate literal declarations. These are classified unequal authored inputs, not RGB tolerances or evidence of equivalent paint. Competing declarations, incomplete chains and disagreement between candidate stages prevent attribution.`,
    `Sort typography: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-sort-typography-substitution').length} records preserve complete reference frame inheritance against candidate fixed trigger font size or contrast ink. Missing leaf declarations remain missing in the evidence; parent declarations and retained values are recorded independently rather than synthesized as equivalent resolved input.`,
    `Expansion title size: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-expansion-font-token-omission').length} records preserve the reference header size token and complete candidate title-to-page omission chain. The candidate page scale is not accepted as the component font input; the compact-only override and separate positional corrections remain independent authoring differences.`,
    '',
    `Tree label line-box substitutions: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-tree-label-line-box-substitution').length} records preserve complete reference normal-line-height ancestry and direct flex text ownership alongside the candidate fixed-20px label wrapper. This is unequal structure and line-box input, not a normal-to-20px normalization. Natural line-box height, anonymous flex-item behavior and current glyph paint require separate equal-input proof.`,
    '',
    `Contextual start/left alignment: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-horizontal-start-alignment').length} retained and ${report.controlTypography.differences.filter(d => d.attribution === 'reviewed-horizontal-start-alignment').length} current-control observations have a complete captured horizontal-LTR ancestor chain with normal/isolate bidi and automatic last-line alignment. These records preserve the raw start/left values and justify only their physical alignment meaning. Other contexts remain unresolved; equal line containers, structure, typography, placement and raster are not inferred.`,
    '',
    `Control-owned text routing: ${report.retainedTypography.controlTextMappings.length} reviewed text-owner correspondences use the current core-control-texture stage, not invented registry entries. Composite calendar headers preserve different reference and candidate strings plus original vector inputs. Independent input differences and any current-paint gaps remain enforced; this is not wrapper or input equivalence.`,
    `Hidden retained-text stage: ${report.retainedTypography.gaps.filter((gap) => isReviewedHiddenRetainedGap(gap, report.elementInventory)).length} gap records have complete captured ancestry explaining why core creates no text entry below display:none. The records and raw styles remain; reference display:none and visibility:hidden mechanisms are distinguished, not normalized into equivalent inputs.`,
    `Stepper structure: ${report.retainedTypography.gaps.filter((gap) => isReviewedStepperPanelGap(gap, report.elementInventory)).length} gap records document an omitted inactive reference panel, classified as unequal fixture structure rather than missing core text. Active-panel typography remains independently compared.`,
    '',
    `Stepper number positioning: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-stepper-number-wrapper-substitution').length} records preserve the reference start-aligned numeral inside a separate percentage-positioned/transformed wrapper versus the candidate fixed centered span. This is unequal authored structure and alignment, not equivalent start/center values or proof of a core text-alignment defect.`,
    `Button-toggle alignment: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-toggle-button-wrapper-substitution').length} records retain native-button/inline-block center versus substituted flex-div/span left. Exact structure and complete captured ancestry establish unequal inputs, not equivalent alignment or a core default-style failure.`,
    `Stepper typography: ${report.retainedTypography.differences.filter(d => d.attribution === 'reviewed-stepper-text-input').length} records retain fixed 14px numeral substitution or omitted Material label-color inheritance. Raw computed, normal/effective and retained inputs stay distinct; no core scale/color or current raster claim follows from these unequal inputs.`,
    `Calendar close control: ${report.controlTypography.gaps.filter(gap => isReviewedCalendarCloseGap(gap, report.elementInventory)).length} preserved gap records identify a reference close-button/label path omitted from the candidate popup. The retained stage preserves the same omission separately from remaining anonymous labels. These are unequal authored controls, not invented paint entries, harmless hidden text or equivalent Escape/outside dismissal. Computed clipping and focus-to-reveal behavior remain unverified by these structural captures.`,
    `Calendar weekday headers: ${report.retainedTypography.reviewedMappings.filter(m => m.kind === 'reviewed-calendar-weekday-text').length} abbreviated labels have exact ordered-header/date-context correspondence. Their separate full-name omissions remain explicit gap records, and replacing column headers with spans is classified as unequal authoring. Font/ink substitutions, unresolved tracking, original divider structure and unknown clipping remain independent; no glyph raster is inferred from retained text.`,
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
    `Supplemental provenance: picker=${report.supplementalBehavior.binding?.status ?? 'unavailable'}, bottom-sheet=${report.supplementalOverlays.binding?.status ?? 'unavailable'}, slider=${report.supplementalSlider.binding?.status ?? 'unavailable'}. Checkpoint-bound evidence independently verifies the selected manifest, collector sources, served document/scripts/styles/fonts, and each side's complete input-tree digest. Legacy captures do not establish current-run provenance.`,
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

function collectStyleDiscrepancies(cases, retainedTypography, visibleOverflowInputs, borderInitialInputs, buttonBorderResetInputs, outlineTokenInputs) {
  const grouped = new Map();
  const borderInitialByCaseAndId = new Map(borderInitialInputs.map(entry => [JSON.stringify([entry.case, entry.element]), entry]));
  const buttonBorderResetByCaseAndId = new Map(buttonBorderResetInputs.map(entry => [JSON.stringify([entry.case, entry.element]), entry]));
  const outlineTokenByCaseAndId = new Map(outlineTokenInputs.map(entry => [JSON.stringify([entry.case, entry.element]), entry]));
  const visibleOverflowByCaseAndId = new Map(visibleOverflowInputs.map(entry => [JSON.stringify([entry.case, entry.element]), entry]));
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
          : classifyReviewedVisibleOverflow(input, property, referenceValue, astylarValue,
              visibleOverflowByCaseAndId.get(JSON.stringify([key, input.id])))
            ?? classifyBorderInitialInput(input, property, referenceValue, astylarValue,
              borderInitialByCaseAndId.get(JSON.stringify([key, input.id])), canonicalStyle)
            ?? classifyButtonBorderResetInput(input, property, referenceValue, astylarValue,
              buttonBorderResetByCaseAndId.get(JSON.stringify([key, input.id])), canonicalStyle)
            ?? classifyOutlineTokenInput(input, property, referenceValue, astylarValue,
              outlineTokenByCaseAndId.get(JSON.stringify([key, input.id])), canonicalStyle)
            ?? classifyReviewedRootInput(benchmarkCase, input, property, referenceValue, astylarValue)
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
            ...([borderInitialAttribution, buttonBorderResetAttribution, outlineTokenAttribution].includes(classification.attribution) ? { reviewedCases: [] } : {}),
            occurrences: 0,
            cases: [],
            states: [],
            referenceAuthoredExamples: compactAuthored(input.referenceAuthored),
            astylarAuthoredExamples: compactAuthored(input.astylarAuthored),
          };
          grouped.set(signature, entry);
        }
        entry.occurrences += 1;
        if (entry.reviewedCases) entry.reviewedCases.push(key);
        if (entry.cases.length < 12) entry.cases.push(key);
        const state = benchmarkCase.state ?? 'static';
        if (!entry.states.includes(state)) entry.states.push(state);
      }
    }
  }
  return [...grouped.values()].sort((a, b) =>
    a.family.localeCompare(b.family) || a.element.localeCompare(b.element) || a.property.localeCompare(b.property));
}

// Only the initial no-clipping/no-scroll-container request is represented here.
// Mixed axes, controls, plugins, viewport propagation and an explicit candidate
// longhand are deliberately outside this proof. Never fill missing style stages.
function collectVisibleOverflowInputs(inventory) {
  const result = [];
  const ordinaryTypes = new Set(['div', 'section', 'article', 'header', 'footer', 'nav', 'main', 'aside', 'span', 'p', 'label']);
  const hasOverflowInput = value => !value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => key.replaceAll('-', '').toLowerCase().startsWith('overflow') || key === 'all');
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  for (const refCase of inventory.cases.filter(entry => entry.side === 'reference')) {
    if (inventory.cases.filter(entry => entry.case === refCase.case && entry.side === 'reference').length !== 1) continue;
    const astCases = inventory.cases.filter(entry => entry.case === refCase.case && entry.side === 'astylar');
    if (astCases.length !== 1 || !Number.isInteger(astCases[0].resolvedStyleRevision) || astCases[0].resolvedStyleRevision < 0) continue;
    if (inventory.errors.some(entry => entry.case === refCase.case)) continue;
    const referenceTree = inventory.variants[refCase.variant], astylarTree = inventory.variants[astCases[0].variant];
    if (!referenceTree || !astylarTree || astylarTree.resolvedStyleEvidenceVersion !== 2 || astylarTree.resolvedStyleSource !== 'core-style-inspection') continue;
    const idOf = node => node.attributes?.['data-parity-id'] ?? node.attributes?.id;
    for (const referenceNode of referenceTree.nodes) {
      const id = idOf(referenceNode);
      if (!id || ['html', 'body', 'input', 'textarea', 'select', 'button', 'img', 'svg'].includes(referenceNode.type) ||
          referenceTree.nodes.filter(node => idOf(node) === id).length !== 1) continue;
      const candidates = astylarTree.nodes.filter(node => node.authored?.id === id);
      if (candidates.length !== 1 || !ordinaryTypes.has(candidates[0].authored.type)) continue;
      const candidate = candidates[0], referenceStyle = styleAt(referenceNode.style, 'reference');
      if (referenceStyle?.overflowX !== 'visible' || referenceStyle?.overflowY !== 'visible') continue;
      if ([candidate.style, candidate.normalStyle, candidate.interactionStyle].some(index => hasOverflowInput(styleAt(index, 'astylar'))) ||
          hasOverflowInput(candidate.authored.style ?? {})) continue;
      result.push({ case: refCase.case, element: id, referenceNode: referenceNode.key, astylarNode: candidate.key,
        referenceType: referenceNode.type, astylarType: candidate.authored.type,
        source: astylarTree.resolvedStyleSource, revision: astCases[0].resolvedStyleRevision,
        referenceAxes: { overflowX: 'visible', overflowY: 'visible' },
        candidateAxes: 'omitted in normal, effective, interaction and inline inputs',
        scope: 'initial overflow declaration only; no container, clipping, reachability or final-raster equivalence claim' });
    }
  }
  return result;
}

function classifyReviewedVisibleOverflow(input, property, reference, astylar, proof) {
  if (!proof || !['overflowX', 'overflowY'].includes(property) || reference !== 'visible' || astylar !== undefined ||
      input.astylarResolvedStyleEvidenceVersion !== 2 || input.referenceStructure?.schemaVersion !== 2 ||
      input.astylarStructure?.schemaVersion !== 2 || input.referenceStructure.type !== proof.referenceType ||
      input.astylarStructure.type !== proof.astylarType || input.reference?.overflowX !== 'visible' || input.reference?.overflowY !== 'visible') return;
  const stages = [input.astylar, input.astylarNormalResolvedStyle, input.astylarInteractionResolvedStyle];
  if (stages.some(style => !style || Object.keys(style).some(key => key.replaceAll('-', '').toLowerCase().startsWith('overflow') || key === 'all'))) return;
  // A dropped authored declaration would be a resolution defect, not an
  // implicit initial value. The matching-rule capture is a separate witness;
  // do not accept even an inactive/overridden overflow rule without more proof.
  if (!Array.isArray(input.astylarAuthored) || input.astylarAuthored.some(rule =>
    !rule.declarations || typeof rule.declarations !== 'object' || Object.keys(rule.declarations).some(key =>
      key.replaceAll('-', '').toLowerCase().startsWith('overflow') || key === 'all'))) return;
  return { classification: 'equivalent-representation', attribution: 'reviewed-visible-overflow-initial-value',
    owner: 'none', reviewEvidence: structuredClone(proof),
    justification: 'Both browser axes compute to the non-inherited initial visible value. The uniquely mapped ordinary candidate node has no overflow/reset declaration in any captured core stage or inline style. Core defaults omit overflow; OverflowClipService.apply and AstylarScrollRuntime.reconcile take the same no-clipping/no-scroll-container branch for omission and visible. Browser and core sensitivity tests retain hidden/clip/auto/scroll as distinct. This accepts only the initial overflow request: mixed axes, missing stages, controls, custom plugins, viewport propagation, inherited ancestor clipping, layout differences and final raster remain outside the claim. See CSS Overflow 3 section 3.1 and the focused omitted-overflow proofs.' };
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
  // CSS Text 3 7.2: normal computes to zero; CSSOM serializes zero as
  // normal. This is specific to letter-spacing, not line-height or alignment.
  // Preserve raw pooled inputs and keep missing/relative/token values distinct.
  if (property === 'letterSpacing' && normalized.toLowerCase() === 'normal') return '0';
  if (property === 'letterSpacing' && /^-?\d*\.?\d+px$/i.test(normalized)) {
    const pixels = Number(normalized.slice(0, -2));
    // Unlike box-coordinate tolerances, tiny tracking is still nonzero and
    // can accumulate over a run. Do not round it into the normal/zero alias.
    return pixels === 0 ? '0' : `${pixels}px`;
  }
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

function reviewedCalendarWeekdayMappings(referenceTree, astylarTree) {
  const rn = referenceTree.nodes, an = astylarTree.nodes, unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  const cls = (n, name) => String(n?.attributes?.class ?? '').split(/\s+/).includes(name);
  if (new Set(rn.map(n => n.key)).size !== rn.length || new Set(an.map(n => n.key)).size !== an.length) return [];
  let context;
  for (const leaf of rn.filter(n => n.type === 'span' && cls(n, 'mat-calendar-body-cell-content'))) {
    context = reviewedCalendarCellControl(leaf, referenceTree, astylarTree);
    if (context) break;
  }
  if (!context) return [];
  const contextChain = context.evidence.referenceChain.map(key => rn.find(n => n.key === key));
  const tableIndex = contextChain.findIndex(n => n.type === 'table');
  const table = contextChain[tableIndex];
  const head = unique(rn.filter(n => n.parent === table.key && n.type === 'thead' && cls(n, 'mat-calendar-table-header')));
  const rows = head && rn.filter(n => n.parent === head.key);
  if (!rows || rows.length !== 2 || rows.some(n => n.type !== 'tr' || n.ownText?.trim()) || rows[1].attributes?.['aria-hidden'] !== 'true') return [];
  const cells = rn.filter(n => n.parent === rows[0].key);
  const divider = unique(rn.filter(n => n.parent === rows[1].key));
  if (head.ownText?.trim() || cells.length !== 7 || cells.some(n => n.type !== 'th' || n.attributes?.scope !== 'col' || n.ownText?.trim()) ||
      !divider || divider.type !== 'th' || !cls(divider, 'mat-calendar-table-header-divider') || divider.attributes?.colspan !== '7' ||
      divider.ownText?.trim() || rn.some(n => n.parent === divider.key)) return [];
  const days = [['Sunday', 'S'], ['Monday', 'M'], ['Tuesday', 'T'], ['Wednesday', 'W'], ['Thursday', 'T'], ['Friday', 'F'], ['Saturday', 'S']];
  const grid = unique(an.filter(n => n.key === context.evidence.candidateChain[1]));
  const gridChildren = grid && an.filter(n => n.parent === grid.key);
  if (!gridChildren || gridChildren.length < 7 || an.some(n => [n.authored?.textContent, n.authored?.value, n.authored?.ariaLabel]
      .some(text => days.some(([long]) => typeof text === 'string' && text.trim() === long)))) return [];
  const pairs = [];
  for (const [index, [long, short]] of days.entries()) {
    const children = rn.filter(n => n.parent === cells[index].key), [full, narrow] = children;
    const element = `datepicker-weekday-${index}`, ast = gridChildren[index];
    if (children.length !== 2 || children.some(n => n.type !== 'span' || rn.some(c => c.parent === n.key)) ||
        !cls(full, 'cdk-visually-hidden') || full.ownText?.trim() !== long || narrow.ownText?.trim() !== short ||
        narrow.attributes?.['aria-hidden'] !== 'true' || cls(narrow, 'cdk-visually-hidden') ||
        rn.some(n => n.attributes?.id === element) || ast.authored?.id !== element || ast.authored.type !== 'span' ||
        ast.authored.class !== 'datepicker-cell datepicker-weekday' || ast.authored.textContent !== short ||
        ast.authored.ariaLabel !== undefined || ast.authored.ariaHidden !== undefined || ast.authored.role !== undefined ||
        an.filter(n => n.authored?.id === element).length !== 1 || an.some(n => n.parent === ast.key)) return [];
    const referencePath = [narrow, cells[index], rows[0], head, ...contextChain.slice(tableIndex)].map(n => n.key);
    pairs.push({ kind: 'reviewed-calendar-weekday-text', element, referenceNode: narrow.key, astylarNode: ast.key,
      referencePath, astylarPath: [ast.key, ...context.evidence.candidateChain.slice(1)],
      referenceDecorationNodes: [], classification: 'application-plugin-authoring-defect', inputEquivalent: false,
      reviewEvidence: { sourceFinding: 'fixture-calendar-weekday-structure-and-token-substitution', context: context.evidence,
        index, fullName: long, narrowText: short, omittedFullNameNode: full.key,
        referenceHeaderCells: cells.map(n => n.key), candidateWeekdayOrder: gridChildren.slice(0, 7).map(n => n.key),
        referenceFullName: { key: full.key, parent: full.parent, attributes: full.attributes, text: full.ownText },
        referenceNarrowLabel: { key: narrow.key, parent: narrow.parent, attributes: narrow.attributes, text: narrow.ownText },
        referenceDivider: { key: divider.key, attributes: divider.attributes }, candidateAuthored: ast.authored,
        inputEquivalent: false, finalRasterVerified: false, computedClippingVerified: false },
      justification: 'The complete ordered seven-column month-view header identifies both full and abbreviated weekday labels, including repeated S/T abbreviations. The candidate authors ordered single-text spans in the matching calendar grid. This maps only the abbreviated text owners; full weekday names, column-header semantics, divider and table/span structure are not equivalent or silently removed. Captured typography is compared separately; no clipping, layout or final raster equivalence is inferred.' });
  }
  return structuredClone(pairs);
}

function calendarWeekdayNameGap(mapping) {
  return { family: 'datepicker', referenceNodes: [mapping.reviewEvidence.omittedFullNameNode], astylarNodes: [],
    classification: 'application-plugin-authoring-defect', attribution: 'reviewed-calendar-weekday-name-omission',
    inputEquivalent: false, finalRasterVerified: false,
    recommendedOwner: 'showcase calendar full weekday names and column-header semantics',
    reviewEvidence: structuredClone(mapping),
    justification: 'The reference column header includes this full weekday name separately from its aria-hidden abbreviated label. The candidate replacement span contains only the abbreviation and no full-name counterpart. The captured ordered header/calendar context establishes this source-authored omission; a hidden class or a similar screenshot does not make the omitted text, semantics or structure equivalent.' };
}

function isReviewedCalendarWeekdayNameGap(gap, inventory) {
  if (gap.attribution !== 'reviewed-calendar-weekday-name-omission' || gap.classification !== 'application-plugin-authoring-defect' ||
      gap.family !== 'datepicker' || gap.element !== undefined || gap.referenceNodes?.length !== 1 || gap.astylarNodes?.length !== 0 ||
      gap.reason !== 'own-text nodes without an explicit shared ID require structural mapping' || !gap.justification ||
      gap.inputEquivalent !== false || gap.finalRasterVerified !== false || inventory.errors.some(e => e.case === gap.case)) return false;
  const refs = inventory.cases.filter(c => c.case === gap.case && c.side === 'reference');
  const asts = inventory.cases.filter(c => c.case === gap.case && c.side === 'astylar');
  if (refs.length !== 1 || asts.length !== 1) return false;
  const maps = reviewedCalendarWeekdayMappings(inventory.variants[refs[0].variant], inventory.variants[asts[0].variant]);
  return maps.some(mapping => mapping.reviewEvidence.omittedFullNameNode === gap.referenceNodes[0] &&
    JSON.stringify(mapping) === JSON.stringify(gap.reviewEvidence));
}

function validateCalendarWeekdayEvidence(report, errors) {
  const inventory = report.elementInventory, retained = report.retainedTypography;
  // The enclosing validator already reports a missing retained stage. Keep
  // that diagnostic intact instead of throwing while replaying a subset.
  if (!retained) return;
  const gaps = retained.gaps.filter(g => g.attribution === 'reviewed-calendar-weekday-name-omission');
  if (gaps.some(g => !isReviewedCalendarWeekdayNameGap(g, inventory))) errors.push('calendar weekday omissions lack exact captured header evidence');
  const replays = new Map();
  const replay = key => {
    if (!replays.has(key)) {
      const match = /^(static|interaction):datepicker@([^/]+)\/([^/]+)(?:\/(.+))?$/.exec(key);
      replays.set(key, match ? collectRetainedTypographyEvidence([{ kind: match[1], family: 'datepicker', profile: match[2],
        viewport: { id: match[3] }, ...(match[4] ? { state: match[4] } : {}) }], inventory) : undefined);
    }
    return replays.get(key);
  };
  for (const [list, predicate] of [
    ['reviewedMappings', m => m.kind === 'reviewed-calendar-weekday-text'],
    ['comparisons', m => m.mapping?.kind === 'reviewed-calendar-weekday-text'],
    ['differences', d => d.attribution === 'reviewed-calendar-weekday-typography-input'],
    ['gaps', g => g.attribution === 'reviewed-calendar-weekday-name-omission'],
  ]) {
    const reviewed = retained[list].filter(predicate), ids = new Set();
    for (const value of reviewed) {
      const id = JSON.stringify([value.case, value.element, value.referenceNode ?? value.referenceNodes, value.property]);
      if (ids.has(id)) errors.push(`duplicate calendar weekday ${list} record`);
      ids.add(id);
      if (!replay(value.case)?.[list].some(expected => JSON.stringify(expected) === JSON.stringify(value)))
        errors.push(`calendar weekday ${list} record lacks replayed input evidence`);
    }
    // Preserve the full ordered header and omitted names: deleting a record
    // cannot make this structural replacement appear equivalent.
    for (const item of inventory.cases.filter(c => c.side === 'reference' && /^(static|interaction):datepicker@/.test(c.case))) {
      for (const expected of replay(item.case)?.[list].filter(predicate) ?? []) {
        if (!reviewed.some(value => JSON.stringify(value) === JSON.stringify(expected))) errors.push(`missing calendar weekday ${list} record: ${item.case}`);
      }
    }
  }
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
  const pairs = family === 'datepicker' ? reviewedCalendarWeekdayMappings(referenceTree, astylarTree) : [];
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

function reviewedCalendarWeekdayTypography(entry, mapping, property, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'datepicker' || mapping?.kind !== 'reviewed-calendar-weekday-text' ||
      !['fontFamily', 'color'].includes(property)) return;
  const replay = reviewedCalendarWeekdayMappings(referenceTree, astylarTree).find(m => m.element === mapping.element);
  if (!replay || JSON.stringify(replay) !== JSON.stringify(mapping)) return;
  const cssProperty = property === 'fontFamily' ? 'font-family' : 'color';
  const refNodes = mapping.referencePath.map(key => referenceTree.nodes.find(n => n.key === key));
  const ownerIndex = property === 'fontFamily' ? refNodes.findIndex(n => n.type === 'mat-calendar') : 1;
  const owner = refNodes[ownerIndex];
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const referenceChain = [];
  let referenceRule;
  for (const node of refNodes.slice(0, ownerIndex + 1)) {
    const computed = styleAt(node.style, 'reference');
    const rules = (node.rules ?? []).map(i => inventory.rules[i]);
    if (!computed || canonicalStyle(computed)[property] !== styles.reference[property] || rules.some(r => r?.side !== 'reference') ||
        new RegExp(`(?:^|;)\\s*(?:${cssProperty}|font)\\s*:`, 'i').test(node.attributes?.style ?? '') ||
        node.inline?.[cssProperty] || node.inline?.font) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.[cssProperty] !== undefined || r.declarations?.font !== undefined));
    if (node === owner) {
      const selector = property === 'fontFamily' ? '.mat-calendar' : '.mat-calendar-table-header th';
      const token = property === 'fontFamily'
        ? 'var(--mat-datepicker-calendar-text-font, var(--mat-sys-body-medium-font))'
        : 'var(--mat-datepicker-calendar-header-text-color, var(--mat-sys-on-surface-variant))';
      if (declarations.length !== 1 || declarations[0].selector !== selector ||
          declarations[0].declarations[cssProperty]?.value !== token || declarations[0].declarations.font !== undefined) return;
      referenceRule = declarations[0];
    } else if (declarations.some(r => r.declarations.font || r.declarations[cssProperty]?.value !== 'inherit')) return;
    referenceChain.push({ key: node.key, computed, rules: rules.map(r => r.value) });
  }
  if (!referenceRule) return;
  const candidateRules = astylarTree.rules.map(i => inventory.rules[i]).filter(r => r?.side === 'astylar').map(r => r.value);
  const cells = candidateRules.filter(r => r.selector === '.datepicker-cell');
  const weekdays = candidateRules.filter(r => r.selector === '.datepicker-weekday, .datepicker-month-marker');
  if (cells.length !== 1 || weekdays.length !== 1 || cells[0].font !== undefined || weekdays[0].font !== undefined ||
      weekdays[0][property] !== undefined) return;
  const candidateChain = [];
  let candidateRule;
  if (property === 'color') {
    if (styles.normal.color !== 'rgba(29,27,32,1)' || styles.effective.color !== styles.normal.color ||
        styles.retained.color !== styles.normal.color || canonicalStyle(cells[0]).color !== styles.normal.color) return;
    candidateRule = cells[0];
    candidateChain.push({ key: ast.key, normal: styleAt(ast.normalStyle, 'astylar'), effective: styleAt(ast.interactionStyle, 'astylar') });
  } else {
    if (styles.reference.fontFamily !== 'roboto' || styles.retained.fontFamily !== 'roboto,arial,sans-serif' || cells[0].fontFamily !== undefined) return;
    let node = ast;
    const seen = new Set();
    while (node && !seen.has(node.key)) {
      seen.add(node.key);
      const normal = styleAt(node.normalStyle, 'astylar'), effective = styleAt(node.interactionStyle, 'astylar');
      if (!normal || !effective || normal.font !== undefined || effective.font !== undefined) return;
      candidateChain.push({ key: node.key, normal, effective });
      if (node.authored?.id === 'page') break;
      if (normal.fontFamily !== undefined || effective.fontFamily !== undefined) return;
      const parents = astylarTree.nodes.filter(n => n.key === node.parent);
      if (parents.length !== 1) return;
      node = parents[0];
    }
    const pages = candidateRules.filter(r => r.selector === '#page' && r.fontFamily !== undefined);
    if (node?.authored?.id !== 'page' || node.authored.type !== 'main' || node.parent !== 'root' ||
        astylarTree.nodes.filter(n => n.authored?.id === 'page').length !== 1 || pages.length !== 1 ||
        canonicalStyle(pages[0]).fontFamily !== styles.retained.fontFamily ||
        ['normal', 'effective'].some(stage => canonicalStyle(candidateChain.at(-1)[stage]).fontFamily !== styles.retained.fontFamily)) return;
    candidateRule = pages[0];
  }
  return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-calendar-weekday-typography-input',
    recommendedOwner: 'showcase calendar weekday component tokens and header structure',
    justification: property === 'fontFamily'
      ? 'The reference abbreviated weekday inherits the calendar font token through the exact table/header/span chain. Candidate declarations omit that token through the complete leaf-to-page chain and retain the explicitly authored page font stack. This is unequal component authoring, not a core font defect for equal inputs; registry evidence is not proof of current glyph paint or physical font selection.'
      : 'The reference abbreviated weekday inherits the calendar header on-surface-variant color token from its column header. The replacement candidate cell fixes #1d1b20 in authored, normal, effective and retained inputs. Restore the original component token and header structure before assigning any equal-input color/paint discrepancy to core; screenshot similarity does not equate these inks.',
    reviewEvidence: { sourceFinding: 'fixture-calendar-weekday-structure-and-token-substitution', property,
      referenceRule, referenceChain, candidateRule, candidateCellRule: cells[0], candidateWeekdayRule: weekdays[0], candidateChain,
      referenceComputed: styles.reference[property], candidateRetained: styles.retained[property], inputEquivalent: false,
      currentPseudoStatePaintVerified: false } };
}

function reviewedReferenceComponentFontRule(node, declarations) {
  if (declarations.some(r => r.declarations.font)) return;
  if (declarations.length === 1) {
    const rule = declarations[0], token = rule.declarations['font-family']?.value;
    const standardToken = /^var\(--mat-[a-z0-9-]+-font, var\(--mat-sys-[a-z0-9-]+-font\)\)$/.test(token ?? '');
    const mdcLabel = ['.mdc-list-item__primary-text', '.mdc-text-field--filled .mdc-floating-label'].includes(rule.selector);
    const tableTokens = {
      '.mat-mdc-header-row': 'var(--mat-table-header-headline-font, var(--mat-sys-title-small-font, Roboto, sans-serif))',
      '.mat-mdc-row, .mdc-data-table__content': 'var(--mat-table-row-item-label-text-font, var(--mat-sys-body-medium-font, Roboto, sans-serif))',
    };
    if ((standardToken && (rule.selector.includes('.mat-') || mdcLabel)) ||
        (Object.hasOwn(tableTokens, rule.selector) && tableTokens[rule.selector] === token)) return rule;
    return;
  }
  // Both selectors have specificity 0,1,0. Only this exact pair of ordinary
  // same-sheet, top-level, non-important author rules has a reviewed winner.
  // Nested/layered rules cannot be ordered by their numeric source suffix.
  if (declarations.length !== 2 || node.type !== 'mat-button-toggle' ||
      !['mat-button-toggle', 'mat-button-toggle-appearance-standard'].every(c =>
        String(node.attributes?.class ?? '').split(/\s+/).includes(c))) return;
  const legacy = declarations.find(r => r.selector === '.mat-button-toggle');
  const standard = declarations.find(r => r.selector === '.mat-button-toggle-appearance-standard');
  if (!legacy || !standard || legacy.declarations['font-family']?.value !== 'var(--mat-button-toggle-legacy-label-text-font)' ||
      standard.declarations['font-family']?.value !== 'var(--mat-button-toggle-label-text-font, var(--mat-sys-label-large-font))' ||
      declarations.some(r => r.declarations['font-family'].important !== false || !Array.isArray(r.conditions) || r.conditions.length)) return;
  const a = /^sheet:(\d+)\/(\d+)$/.exec(legacy.source ?? ''), b = /^sheet:(\d+)\/(\d+)$/.exec(standard.source ?? '');
  if (a && b && [...a.slice(1), ...b.slice(1)].every(value => Number.isSafeInteger(Number(value))) &&
      a[1] === b[1] && Number(b[2]) > Number(a[2])) return standard;
}

function reviewedInheritedComponentFontStack(mapping, ref, ast, styles, referenceTree, astylarTree, inventory) {
  // More specific select/weekday investigations already preserve their token,
  // structure and declaration evidence together. Do not replace those records.
  if (mapping?.kind === 'reviewed-calendar-weekday-text' || mapping?.element === 'select-value' ||
      styles.reference.fontFamily !== 'roboto' || styles.retained.fontFamily !== 'roboto,arial,sans-serif' ||
      ast.retainedText?.source !== 'core-text-registry') return;
  const referenceChain = [], candidateChain = [], seen = new Set();
  let node = ref, referenceRule;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || canonicalStyle(pooled.value).fontFamily !== 'roboto' ||
        node.inline?.['font-family'] || node.inline?.font ||
        /(?:^|;)\s*(?:font-family|font)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.['font-family'] || r.declarations?.font));
    referenceChain.push({ node: node.key, computed: pooled.value, fontRules: declarations });
    const explicit = declarations.filter(r => r.declarations?.font || r.declarations['font-family'].value !== 'inherit');
    if (explicit.length) {
      referenceRule = reviewedReferenceComponentFontRule(node, declarations);
      if (!referenceRule) return;
      break;
    }
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (!referenceRule) return;
  seen.clear();
  node = ast;
  while (node) {
    if (seen.has(node.key) || astylarTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const normal = inventory.styles[node.normalStyle], effective = inventory.styles[node.interactionStyle];
    if (normal?.side !== 'astylar' || effective?.side !== 'astylar' || !normal.value || !effective.value ||
        typeof normal.value !== 'object' || typeof effective.value !== 'object' ||
        Array.isArray(normal.value) || Array.isArray(effective.value) ||
        normal.value.font !== undefined || effective.value.font !== undefined) return;
    candidateChain.push({ node: node.key, normal: normal.value, effective: effective.value });
    if (node.authored?.id === 'page') break;
    if (normal.value.fontFamily !== undefined || effective.value.fontFamily !== undefined) return;
    const parents = astylarTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (node?.authored?.id !== 'page' || node.authored.type !== 'main' || node.parent !== 'root' ||
      astylarTree.nodes.filter(n => n.authored?.id === 'page').length !== 1 ||
      ['normal', 'effective'].some(stage => canonicalStyle(candidateChain.at(-1)[stage]).fontFamily !== styles.retained.fontFamily)) return;
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const pageRules = rules.map(r => r.value).filter(r => r.selector === '#page' && r.fontFamily !== undefined);
  if (pageRules.length !== 1 || pageRules[0].font !== undefined ||
      canonicalStyle(pageRules[0]).fontFamily !== styles.retained.fontFamily) return;
  return { attribution: 'reviewed-inherited-component-font-stack', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase Material component font-token translation and reference structure',
    justification: 'The captured reference text inherits or directly applies a reviewed winning Material component font-family token, computing Roboto with no intervening override. Unique active token rules are accepted directly; the exact standard/legacy button-toggle pair additionally requires equal-specificity, same-sheet, top-level, non-important source-order evidence. Both competing declarations remain in the reference chain. The candidate normal/effective declarations omit font-family through the complete leaf-to-page chain and core retains the explicit page stack Roboto, Arial, sans-serif. The page reset itself is legitimate; omitting the component override is unequal authoring. This is separate from core appending fallback fonts to an explicit single-family input. Preserve the component font intent before assessing fallback selection, shaping, geometry or current glyph paint; matching installed Roboto glyphs would not equate the fallback lists.',
    reviewEvidence: { sourceFinding: 'fixture-retained-component-font-tokens-omitted', referenceRule, referenceChain,
      candidatePageRule: pageRules[0], candidateChain, referenceComputed: styles.reference.fontFamily,
      candidateRetained: styles.retained.fontFamily } };
}

function validateInheritedComponentFontStack(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const refsByKey = refTree.nodes.filter(n => n.key === comparison.referenceNode);
    const astsByKey = astTree.nodes.filter(n => n.key === comparison.astylarNode);
    if (refsByKey.length !== 1 || astsByKey.length !== 1) continue;
    const ref = refsByKey[0], ast = astsByKey[0];
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    const review = reviewedInheritedComponentFontStack(comparison.mapping, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style.fontFamily])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-inherited-component-font-stack') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'fontFamily' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.fontFamily) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('retained component font-stack attributions do not replay from captured component tokens and page inheritance');
}

function reviewedOmittedComponentTextMetric(mapping, property, ref, ast, styles, referenceTree, astylarTree, inventory) {
  // Keep the previously reviewed select/chip/calendar records and their more
  // specific structural evidence. This path attributes omissions, never equality.
  if (mapping?.element === 'select-value' || mapping?.kind === 'reviewed-calendar-weekday-text' ||
      ast.retainedText?.source !== 'core-text-registry') return;
  const spec = { lineHeight: ['line-height', 'line-height', 'normal'], letterSpacing: ['letter-spacing', 'tracking', '0'] }[property];
  if (!spec || styles.retained[property] !== spec[2] || styles.reference[property] === styles.retained[property] ||
      !/^-?(?:\d+(?:\.\d+)?|\.\d+)px$/.test(styles.reference[property] ?? '') ||
      (property === 'lineHeight' && parseFloat(styles.reference[property]) < 0)) return;
  const [cssProperty, tokenSuffix] = spec, referenceChain = [], seen = new Set();
  let node = ref, referenceRule;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || canonicalStyle(pooled.value)[property] !== styles.reference[property] ||
        node.inline?.[cssProperty] || node.inline?.font || node.inline?.all ||
        new RegExp(`(?:^|;)\\s*(?:${cssProperty}|font|all)\\s*:`, 'i').test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.[cssProperty] || r.declarations?.font || r.declarations?.all));
    if (declarations.some(r => r.declarations?.font || r.declarations?.all)) return;
    referenceChain.push({ node: node.key, computed: pooled.value, metricRules: declarations });
    if (declarations.some(r => r.declarations[cssProperty].value !== 'inherit')) {
      if (declarations.length !== 1) return;
      const rule = declarations[0];
      if (!(rule.selector.includes('.mat-') || rule.selector === '.mdc-list-item__primary-text') ||
          !new RegExp(`^var\\(--mat-[a-z0-9-]+-${tokenSuffix}, var\\(--mat-sys-[a-z0-9-]+-${tokenSuffix}\\)\\)$`).test(rule.declarations[cssProperty].value)) return;
      referenceRule = rule;
      break;
    }
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (!referenceRule) return;
  const candidateChain = candidateTypographyOmissionChain(ast, astylarTree, inventory, property);
  if (!candidateChain || candidateChain.some(c => astylarTree.nodes.filter(n => n.key === c.node).length !== 1 ||
      ['normal', 'effective'].some(stage => typeof c[stage] !== 'object' || Array.isArray(c[stage]) || c[stage].all !== undefined))) return;
  return { attribution: 'reviewed-omitted-component-text-metric', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase Material component line-height/tracking token translation and inherited text structure',
    justification: 'The exact captured reference text reaches a unique active Material line-height or tracking token through a property-consistent ancestor chain, with no intervening override or ambiguous cascade. The entire candidate normal/effective text-to-page chain omits that property and core retains normal line-height or zero tracking. This identifies unequal component inputs, not an equivalent representation or proof that core misrenders an explicit shared value. Fixed heights, vertical alignment, padding and positioned labels do not replace inherited text metrics. Restore the reference token and structure before testing natural line metrics, shaping, wrapping, placement or current glyph paint; no normal-to-pixel conversion is inferred.',
    reviewEvidence: { sourceFinding: 'fixture-retained-component-text-metrics-omitted', property, referenceRule, referenceChain,
      candidateChain, referenceComputed: styles.reference[property], candidateRetained: styles.retained[property] } };
}

function validateOmittedComponentTextMetrics(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const refsByKey = refTree.nodes.filter(n => n.key === comparison.referenceNode), astsByKey = astTree.nodes.filter(n => n.key === comparison.astylarNode);
    if (refsByKey.length !== 1 || astsByKey.length !== 1) continue;
    const ref = refsByKey[0], ast = astsByKey[0];
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    for (const property of ['lineHeight', 'letterSpacing']) {
      // The chip-specific tracking attribution takes precedence in collection.
      if (reviewedControlLabelTokenInput(comparison, comparison.mapping, property, ast, styles, refTree, astTree, report.elementInventory)) continue;
      const review = reviewedOmittedComponentTextMetric(comparison.mapping, property, ref, ast, styles, refTree, astTree, report.elementInventory);
      if (review) expected.push({ comparison, property, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style[property]])) });
    }
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-omitted-component-text-metric') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, property, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === property &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties[property]) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('retained component text-metric attributions do not replay from captured tokens and complete omission ancestry');
}

function reviewedTreeLabelLineBox(entry, mapping, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'tree' || mapping?.kind !== 'reviewed-showcase-template-text' ||
      styles.reference.lineHeight !== 'normal' || styles.retained.lineHeight !== '20px' ||
      ast.retainedText?.source !== 'core-text-registry') return;
  const mappings = reviewedTemplateTextMappings('tree', referenceTree, astylarTree).filter(m =>
    m.element === mapping.element && m.referenceNode === ref.key && m.astylarNode === ast.key);
  if (mappings.length !== 1 || JSON.stringify(mappings[0]) !== JSON.stringify(mapping) ||
      referenceTree.nodes.some(n => n.parent === ref.key) || astylarTree.nodes.some(n => n.parent === ast.key)) return;
  const referenceChain = [], seen = new Set();
  let node = ref;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || pooled.value.lineHeight !== 'normal' ||
        node.inline?.['line-height'] || node.inline?.font || node.inline?.all ||
        /(?:^|;)\s*(?:line-height|font|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.['line-height'] || r.declarations?.font || r.declarations?.all));
    if (declarations.some(r => r.declarations.font || r.declarations.all ||
        !['normal', 'inherit'].includes(r.declarations['line-height']?.value))) return;
    referenceChain.push({ node: node.key, computed: pooled.value, lineHeightRules: declarations });
    if (node.key === 'frame') break;
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (node?.key !== 'frame' || node.parent !== null || node.type !== 'main' ||
      !String(node.attributes?.class ?? '').split(/\s+/).includes('frame') ||
      referenceChain[0].computed.display !== 'flex') return;
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const candidateRules = rules.map(r => r.value).filter(r => r.selector?.includes('.tree-label'));
  if (candidateRules.length !== 1 || candidateRules[0].selector !== '.tree-label' ||
      candidateRules[0].font !== undefined || candidateRules[0].all !== undefined ||
      Object.keys(candidateRules[0]).some(key => key.startsWith('media'))) return;
  const candidateRule = candidateRules[0];
  if (['normal', 'effective'].some(stage => styles[stage].height !== '20px' || styles[stage].lineHeight !== '20px' ||
      styles[stage].verticalAlign !== 'middle' || styles[stage].font !== undefined || styles[stage].all !== undefined) ||
      candidateRule.height !== '20px' || candidateRule.lineHeight !== '20px' || candidateRule.verticalAlign !== 'middle') return;
  const parents = astylarTree.nodes.filter(n => n.key === ast.parent);
  if (parents.length !== 1 || astylarTree.nodes.filter(n => n.parent === ast.parent).length !== 1) return;
  const parent = parents[0], parentStyles = { normal: inventory.styles[parent.normalStyle], effective: inventory.styles[parent.interactionStyle] };
  if (Object.values(parentStyles).some(s => s?.side !== 'astylar' || s.value?.display !== 'flex' || s.value?.alignItems !== 'center')) return;
  return { attribution: 'reviewed-tree-label-line-box-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase tree text structure and core anonymous flex-item/normal-line-box verification',
    justification: 'The reference tree node owns its text directly in a flex container, and complete captured ancestry through the frame computes normal line-height with no conflicting declaration. The candidate inserts a single tree-label span into its centered flex item and explicitly supplies height:20px, line-height:20px and vertical-align:middle; normal/effective/retained line-height agrees with the authored rule introduced in 7159b1d. This is unequal structure and line-box input, not an accepted normal-to-20px conversion or evidence that core changed an explicit shared value. Restore the original text ownership and normal line-height before assessing core anonymous flex items, font fallback, line metrics, baseline or raster. No browser natural-height measurement or current glyph-paint equivalence is inferred.',
    reviewEvidence: { sourceFinding: 'fixture-tree-component-typography-omitted', mapping: mappings[0], referenceChain, candidateRule,
      candidateNormal: inventory.styles[ast.normalStyle].value, candidateEffective: inventory.styles[ast.interactionStyle].value,
      candidateParent: { node: parent.key, authored: parent.authored, normal: parentStyles.normal.value, effective: parentStyles.effective.value },
      referenceComputed: styles.reference.lineHeight, candidateRetained: styles.retained.lineHeight } };
}

function reviewedStepperTextInput(entry, mapping, property, ref, ast, styles, referenceTree, astylarTree, inventory) {
  const badge = property === 'fontSize' && /^step-(details|review)-badge$/.test(mapping?.element ?? '');
  const label = property === 'color' && /^step-(details|review)-text$/.test(ast.authored?.id ?? '');
  if (entry.family !== 'stepper' || (!badge && !label) ||
      ast.retainedText?.source !== 'core-text-registry' || ast.authored?.style !== undefined) return;
  let reviewedMapping;
  if (badge) {
    const mappings = reviewedTemplateTextMappings('stepper', referenceTree, astylarTree).filter(m => m.element === mapping.element);
    if (mapping?.kind !== 'reviewed-showcase-template-text' || mappings.length !== 1 || JSON.stringify(mappings[0]) !== JSON.stringify(mapping)) return;
    reviewedMapping = mappings[0];
  } else {
    const id = ast.authored.id, details = id === 'step-details-text', text = details ? 'Details' : 'Review';
    const wrapper = referenceTree.nodes.find(n => n.key === ref.parent), owner = referenceTree.nodes.find(n => n.key === wrapper?.parent);
    const header = referenceTree.nodes.find(n => n.key === owner?.parent), parent = astylarTree.nodes.find(n => n.key === ast.parent);
    if (JSON.stringify(mapping ?? { kind: 'shared-id' }) !== JSON.stringify({ kind: 'shared-id' }) ||
        ref.attributes?.id !== id || ref.type !== 'span' || ast.authored.type !== 'span' || ref.ownText !== text || ast.authored.textContent !== text ||
        referenceTree.nodes.filter(n => n.attributes?.id === id).length !== 1 || astylarTree.nodes.filter(n => n.authored?.id === id).length !== 1 ||
        wrapper?.type !== 'div' || !String(wrapper.attributes?.class ?? '').split(/\s+/).includes('mat-step-text-label') ||
        header?.type !== 'mat-step-header' || !new RegExp(`^cdk-stepper-\\d+-label-${details ? 0 : 1}$`).test(header.attributes?.id ?? '') ||
        referenceTree.nodes.filter(n => n.key === header.key || n.attributes?.id === header.attributes.id).length !== 1 ||
        parent?.authored.type !== 'div' || parent.authored.id !== (details ? 'step-details' : 'step-review')) return;
    reviewedMapping = { kind: 'shared-id', element: id, referenceNode: ref.key, astylarNode: ast.key,
      referenceTextWrapper: wrapper.key, referenceHeader: header.key, candidateParent: parent.key };
  }
  if (referenceTree.nodes.some(n => n.parent === ref.key) || astylarTree.nodes.some(n => n.parent === ast.key)) return;
  const cssProperty = badge ? 'font-size' : 'color', referenceChain = [], seen = new Set();
  let node = ref;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || canonicalStyle(pooled.value)[property] !== styles.reference[property] ||
        node.inline?.[cssProperty] || node.inline?.all || (badge && node.inline?.font) ||
        new RegExp(`(?:^|;)\\s*(?:${cssProperty}|all${badge ? '|font' : ''})\\s*:`, 'i').test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const propertyRules = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.[cssProperty] || r.declarations?.all || (badge && r.declarations?.font)));
    if (propertyRules.some(r => r.declarations.all || (badge && r.declarations.font))) return;
    referenceChain.push({ node: node.key, parent: node.parent, type: node.type,
      computed: styles.reference[property], propertyRules });
    if (badge ? node.key === 'frame' : String(node.attributes?.class ?? '').split(/\s+/).includes('mat-step-label')) break;
    if (propertyRules.some(r => r.declarations[cssProperty]?.value !== 'inherit')) return;
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  const ownerRules = referenceChain.at(-1)?.propertyRules ?? [], candidateRules = astylarTree.rules.map(i => inventory.rules[i]);
  if (candidateRules.some(r => r?.side !== 'astylar')) return;
  let evidence;
  if (badge) {
    if (node?.key !== 'frame' || node.parent !== null || node.type !== 'main' ||
        !String(node.attributes?.class ?? '').split(/\s+/).includes('frame') ||
        !/^\d+(?:\.\d+)?px$/.test(styles.reference.fontSize ?? '') ||
        ['normal', 'effective', 'retained'].some(s => styles[s].fontSize !== '14px') ||
        ['normal', 'effective'].some(s => styles[s].font !== undefined || styles[s].all !== undefined) ||
        ownerRules.length !== 1 || !/^\.frame\[_ngcontent-[\w-]+\]$/.test(ownerRules[0].selector ?? '') ||
        ownerRules[0].declarations['font-size']?.value !== 'calc(16px * var(--scale))' ||
        ownerRules[0].declarations['font-size'].important !== false ||
        !Array.isArray(ownerRules[0].conditions) || ownerRules[0].conditions.length) return;
    const rules = candidateRules.map(r => r.value).filter(r => r.selector?.includes('.step-badge') && r.fontSize !== undefined);
    if (rules.length !== 1 || rules[0].selector !== '.step-badge' || rules[0].fontSize !== '14px' ||
        rules[0].font !== undefined || rules[0].all !== undefined || Object.keys(rules[0]).some(k => k.startsWith('media'))) return;
    evidence = { candidateRule: rules[0], candidateNormal: styles.normal, candidateEffective: styles.effective,
      referenceScale: node.inline?.['--scale'], sourceFinding: 'fixture-stepper-number-font-substitution' };
  } else {
    const classes = String(node?.attributes?.class ?? '').split(/\s+/);
    const tokens = { '.mat-step-label': 'var(--mat-stepper-header-label-text-color, var(--mat-sys-on-surface-variant))',
      '.mat-step-label.mat-step-label-active': 'var(--mat-stepper-header-selected-state-label-text-color, var(--mat-sys-on-surface-variant))' };
    if (referenceChain.length !== 3 || node?.type !== 'div' || !classes.includes('mat-step-label-active') || ownerRules.length !== 2 ||
        new Set(ownerRules.map(r => r.selector)).size !== 2 || ownerRules.some(r =>
          !tokens[r.selector] || r.declarations.color?.value !== tokens[r.selector] || r.declarations.color.important !== false ||
          !Array.isArray(r.conditions) || r.conditions.length)) return;
    const candidateChain = [], visited = new Set();
    let current = ast;
    while (current) {
      if (visited.has(current.key) || astylarTree.nodes.filter(n => n.key === current.key).length !== 1 || current.authored?.style !== undefined) return;
      visited.add(current.key);
      const normal = inventory.styles[current.normalStyle], effective = inventory.styles[current.interactionStyle];
      if (normal?.side !== 'astylar' || effective?.side !== 'astylar' ||
          normal.value.all !== undefined || effective.value.all !== undefined) return;
      candidateChain.push({ node: current.key, normal: normal.value, effective: effective.value });
      if (current.authored?.id === 'page') break;
      if (normal.value.color !== undefined || effective.value.color !== undefined) return;
      const parents = astylarTree.nodes.filter(n => n.key === current.parent);
      if (parents.length !== 1) return;
      current = parents[0];
    }
    if (current?.authored?.id !== 'page' || current.authored.type !== 'main' || current.parent !== 'root' ||
        astylarTree.nodes.filter(n => n.authored?.id === 'page').length !== 1 ||
        ['normal', 'effective'].some(s => canonicalStyle(candidateChain.at(-1)[s]).color !== styles.retained.color)) return;
    const pageRules = candidateRules.map(r => r.value).filter(r => r.selector === '#page' && r.color !== undefined);
    if (pageRules.length !== 1 || canonicalStyle(pageRules[0]).color !== styles.retained.color ||
        pageRules[0].all !== undefined || Object.keys(pageRules[0]).some(k => k.startsWith('media'))) return;
    evidence = { candidateChain, candidatePageRule: pageRules[0], sourceFinding: 'fixture-stepper-label-color-omitted' };
  }
  return { attribution: 'reviewed-stepper-text-input', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase stepper typography and token inheritance',
    justification: badge
      ? 'The reference numeral inherits its frame font size through the complete captured path; the frame authors calc(16px * var(--scale)). Candidate step-badge explicitly declares and retains 14px. This is a fixed-size input substitution, not a core font-scaling or raster defect. Preserve the original inherited font together with its original icon wrapper; do not calibrate the number to its circle.'
      : 'The reference label inherits the captured active Material on-surface-variant color token through its inner wrappers. The candidate omits color through its full normal/effective path until the page and retains that page color. These are unequal token/inheritance inputs, not a core color conversion failure. Restore the reference component token and wrappers without retuning theme colors or changing reference truth. Actual state paint remains independently unverified by retained text.',
    reviewEvidence: { property, mapping: reviewedMapping, referenceChain, ...evidence } };
}

function validateStepperTextInputs(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    if (comparison.family !== 'stepper') continue;
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const ref = refTree.nodes.find(n => n.key === comparison.referenceNode), ast = astTree.nodes.find(n => n.key === comparison.astylarNode);
    if (!ref || !ast) continue;
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([k, i]) => [k, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([k, p]) => p?.side !== (k === 'reference' ? 'reference' : 'astylar') || !p.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([k, p]) => [k, canonicalStyle(p.value)]));
    for (const property of ['fontSize', 'color']) {
      if (styles.reference[property] === styles.retained[property]) continue;
      const review = reviewedStepperTextInput(comparison, comparison.mapping, property, ref, ast, styles, refTree, astTree, report.elementInventory);
      if (review) expected.push({ comparison, property, review, values: Object.fromEntries(Object.entries(styles).map(([k, s]) => [k, s[property]])) });
    }
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-stepper-text-input') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, property, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === property &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties[property]) !== JSON.stringify(values) ||
      Object.entries(review).some(([k, v]) => JSON.stringify(matches[0][k]) !== JSON.stringify(v));
  })) errors.push('stepper typography attributions do not replay from inherited reference and substituted candidate inputs');
}

function reviewedToggleButtonAlignment(entry, mapping, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'button-toggle' || mapping?.kind !== 'reviewed-showcase-template-text' ||
      !/^button-toggle-(one|two)-label$/.test(mapping.element) || styles.reference.textAlign !== 'center' ||
      styles.retained.textAlign !== 'left' || ast.retainedText?.source !== 'core-text-registry') return;
  const mappings = reviewedTemplateTextMappings('button-toggle', referenceTree, astylarTree).filter(m => m.element === mapping.element);
  if (mappings.length !== 1 || JSON.stringify(mappings[0]) !== JSON.stringify(mapping) ||
      referenceTree.nodes.some(n => n.parent === ref.key) || astylarTree.nodes.some(n => n.parent === ast.key)) return;
  const referenceChain = [], seen = new Set();
  let node = ref;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style], value = pooled?.value, depth = referenceChain.length;
    if (pooled?.side !== 'reference' || value?.textAlign !== (depth < 2 ? 'center' : 'start') ||
        value.direction !== 'ltr' || value.writingMode !== 'horizontal-tb' ||
        !['normal', 'isolate'].includes(value.unicodeBidi) || value.textAlignLast !== 'auto' ||
        (depth < 2 && value.display !== 'inline-block') ||
        node.inline?.['text-align'] || node.inline?.all || /(?:^|;)\s*(?:text-align|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const alignmentRules = rules.map(r => r.value).filter(r => r.active === true && (r.declarations?.['text-align'] || r.declarations?.all));
    if (alignmentRules.some(r => r.declarations.all || !['inherit', ...(depth < 2 ? [] : ['start'])].includes(r.declarations['text-align']?.value))) return;
    referenceChain.push({ node: node.key, parent: node.parent, type: node.type, alignmentRules,
      computed: Object.fromEntries(['textAlign', 'textAlignLast', 'direction', 'writingMode', 'unicodeBidi', 'display'].map(p => [p, value[p]])) });
    if (node.key === 'frame') break;
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (node?.key !== 'frame' || node.parent !== null || node.type !== 'main' ||
      !String(node.attributes?.class ?? '').split(/\s+/).includes('frame')) return;
  const candidateChain = candidateTypographyOmissionChain(ast, astylarTree, inventory, 'textAlign');
  if (!candidateChain || candidateChain.some(c => astylarTree.nodes.filter(n => n.key === c.node).length !== 1 ||
      ['normal', 'effective'].some(s => c[s].all !== undefined) ||
      astylarTree.nodes.find(n => n.key === c.node).authored?.style !== undefined)) return;
  const parent = astylarTree.nodes.find(n => n.key === ast.parent);
  if (parent?.authored.type !== 'div' || ['normalStyle', 'interactionStyle'].some(stage => {
    const value = inventory.styles[parent[stage]]?.value;
    return value?.display !== 'flex' || value.justifyContent !== 'center';
  })) return;
  const pooledRules = astylarTree.rules.map(i => inventory.rules[i]);
  if (pooledRules.some(r => r?.side !== 'astylar')) return;
  const candidateRules = pooledRules.map(r => r.value).filter(r => r.selector === '.button-toggle-option' && r.display !== undefined);
  if (candidateRules.length !== 1 || candidateRules[0].display !== 'flex' || candidateRules[0].justifyContent !== 'center' ||
      candidateRules[0].textAlign !== undefined || candidateRules[0].all !== undefined ||
      Object.keys(candidateRules[0]).some(k => k.startsWith('media'))) return;
  return { attribution: 'reviewed-toggle-button-wrapper-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase native-button structure and core defaults/inline layout verification',
    justification: 'The captured reference retains an inline-block native button and inline-block label computing center, inside start-aligned ancestry. The candidate substitutes a centered flex div and ordinary span, omits alignment through its complete normal/effective ancestry and retains left. These are different layout and default-style inputs, not equivalent center/left values or proof of a core alignment bug. The separate browser-default probe identifies user-agent button centering in the light reference; this per-case attribution rests on captured structure and computed/resolved inputs, not an assumed user-agent rule in every state. Restore the native wrapper and original CSS mechanism before testing core defaults or inline layout; do not tune label offsets.',
    reviewEvidence: { sourceFinding: 'fixture-toggle-native-button-substitution', mapping: mappings[0], referenceChain,
      candidateChain, candidateRule: candidateRules[0], candidateAuthored: ast.authored,
      candidateParent: { node: parent.key, authored: parent.authored },
      nativeDefaultProbe: 'scripts/audit-material-button-defaults.mjs' } };
}

function validateToggleButtonAlignment(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    if (comparison.family !== 'button-toggle') continue;
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const ref = refTree.nodes.find(n => n.key === comparison.referenceNode), ast = astTree.nodes.find(n => n.key === comparison.astylarNode);
    if (!ref || !ast) continue;
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([k, i]) => [k, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([k, p]) => p?.side !== (k === 'reference' ? 'reference' : 'astylar') || !p.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([k, p]) => [k, canonicalStyle(p.value)]));
    const review = reviewedToggleButtonAlignment(comparison, comparison.mapping, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([k, s]) => [k, s.textAlign])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-toggle-button-wrapper-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'textAlign' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.textAlign) !== JSON.stringify(values) ||
      Object.entries(review).some(([k, v]) => JSON.stringify(matches[0][k]) !== JSON.stringify(v));
  })) errors.push('toggle button alignment attributions do not replay from native-wrapper and flex-span inputs');
}

function reviewedStepperNumberAlignment(entry, mapping, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'stepper' || mapping?.kind !== 'reviewed-showcase-template-text' ||
      !/^step-(details|review)-badge$/.test(mapping.element) || styles.reference.textAlign !== 'start' ||
      ast.retainedText?.source !== 'core-text-registry' || ast.authored?.style !== undefined ||
      ['normal', 'effective', 'retained'].some(stage => styles[stage].textAlign !== 'center') ||
      ['normal', 'effective'].some(stage => styles[stage].width !== '24px' || styles[stage].height !== '24px')) return;
  const mappings = reviewedTemplateTextMappings('stepper', referenceTree, astylarTree).filter(m => m.element === mapping.element);
  if (mappings.length !== 1 || JSON.stringify(mappings[0]) !== JSON.stringify(mapping) ||
      referenceTree.nodes.some(n => n.parent === ref.key) || astylarTree.nodes.some(n => n.parent === ast.key)) return;
  const chain = [], seen = new Set();
  let node = ref;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style], value = pooled?.value;
    if (pooled?.side !== 'reference' || value?.textAlign !== 'start' || value.direction !== 'ltr' ||
        value.writingMode !== 'horizontal-tb' || !['normal', 'isolate'].includes(value.unicodeBidi) || value.textAlignLast !== 'auto' ||
        node.inline?.['text-align'] || node.inline?.all || /(?:^|;)\s*(?:text-align|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const alignmentRules = rules.map(r => r.value).filter(r => r.active === true && (r.declarations?.['text-align'] || r.declarations?.all));
    if (alignmentRules.some(r => r.declarations.all || !['start', 'inherit'].includes(r.declarations['text-align']?.value))) return;
    chain.push({ node: node.key, parent: node.parent, type: node.type, alignmentRules,
      computed: Object.fromEntries(['textAlign', 'textAlignLast', 'direction', 'writingMode', 'unicodeBidi', 'display',
        'position', 'width', 'height', 'top', 'left', 'transform'].map(p => [p, value[p]])) });
    if (node.key === 'frame') break;
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (node?.key !== 'frame' || node.parent !== null || node.type !== 'main' ||
      !String(node.attributes?.class ?? '').split(/\s+/).includes('frame')) return;
  const content = referenceTree.nodes.find(n => n.key === ref.parent);
  const contentStyle = inventory.styles[content?.style]?.value;
  const contentRules = content?.rules.map(i => inventory.rules[i].value).filter(r => r.active === true && r.selector === '.mat-step-icon-content') ?? [];
  const expected = { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex' };
  if (Object.keys(expected).some(p => content?.inline?.[p]) ||
      /(?:^|;)\s*(?:position|top|left|transform|display|all)\s*:/i.test(content?.attributes?.style ?? '') ||
      content?.rules.map(i => inventory.rules[i].value).some(r => r.active === true && r !== contentRules[0] &&
        (r.declarations?.all || Object.keys(expected).some(p => r.declarations?.[p])))) return;
  if (contentRules.length !== 1 || contentStyle?.position !== 'absolute' || contentStyle.display !== 'flex' ||
      !Array.isArray(contentRules[0].conditions) || contentRules[0].conditions.length ||
      Object.entries(expected).some(([p, v]) => contentRules[0].declarations?.[p]?.value !== v || contentRules[0].declarations[p].important !== false)) return;
  const candidateRules = astylarTree.rules.map(i => inventory.rules[i]);
  if (candidateRules.some(r => r?.side !== 'astylar')) return;
  const badgeRules = candidateRules.map(r => r.value).filter(r => r.selector?.includes('.step-badge') && r.textAlign !== undefined);
  if (badgeRules.length !== 1 || badgeRules[0].selector !== '.step-badge' || badgeRules[0].textAlign !== 'center' ||
      badgeRules[0].width !== '24px' || badgeRules[0].height !== '24px' || badgeRules[0].all !== undefined ||
      Object.keys(badgeRules[0]).some(k => k.startsWith('media'))) return;
  return { attribution: 'reviewed-stepper-number-wrapper-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase stepper numeric-icon structure and core CSS percentage-transform verification',
    justification: 'The reference number retains start alignment through its complete horizontal-LTR ancestry. Its separate mat-step-icon-content wrapper is positioned at top/left 50% and translated by -50% of its own size. The candidate removes that wrapper and explicitly centers text in a 24px square span; normal/effective/retained center agrees with the authored step-badge rule. This is unequal structure and alignment input, not a core alignment fault or an equivalent way to validate the original transform. Restore the original wrapper and percentage transform after correcting the independently reproduced core transform semantics; do not tune badge text offsets. Other typography, line placement and current glyph paint remain separate.',
    reviewEvidence: { sourceFinding: 'fixture-stepper-number-wrapper-substitution', mapping: mappings[0], referenceChain: chain,
      referenceContentRule: contentRules[0], candidateRule: badgeRules[0], candidateAuthored: ast.authored,
      candidateNormal: styles.normal, candidateEffective: styles.effective, candidateRetainedAlignment: styles.retained.textAlign } };
}

function validateStepperNumberAlignment(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    if (comparison.family !== 'stepper') continue;
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const ref = refTree.nodes.find(n => n.key === comparison.referenceNode), ast = astTree.nodes.find(n => n.key === comparison.astylarNode);
    if (!ref || !ast) continue;
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([k, i]) => [k, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([k, p]) => p?.side !== (k === 'reference' ? 'reference' : 'astylar') || !p.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([k, p]) => [k, canonicalStyle(p.value)]));
    const review = reviewedStepperNumberAlignment(comparison, comparison.mapping, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([k, s]) => [k, s.textAlign])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-stepper-number-wrapper-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'textAlign' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.textAlign) !== JSON.stringify(values) ||
      Object.entries(review).some(([k, v]) => JSON.stringify(matches[0][k]) !== JSON.stringify(v));
  })) errors.push('stepper number alignment attributions do not replay from original wrappers and captured inputs');
}

function validateTreeLabelLineBoxes(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const refsByKey = refTree.nodes.filter(n => n.key === comparison.referenceNode), astsByKey = astTree.nodes.filter(n => n.key === comparison.astylarNode);
    if (refsByKey.length !== 1 || astsByKey.length !== 1) continue;
    const ref = refsByKey[0], ast = astsByKey[0];
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    const review = reviewedTreeLabelLineBox(comparison, comparison.mapping, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style.lineHeight])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-tree-label-line-box-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'lineHeight' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.lineHeight) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('tree label line-box attributions do not replay from captured normal ancestry and explicit wrapper inputs');
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

function reviewedExpansionFontInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'expansion' || ref.type !== 'mat-panel-title' || ref.attributes?.id !== 'expansion-title' ||
      ast.authored?.type !== 'span' || ast.authored.id !== 'expansion-title' ||
      !String(ast.authored.class ?? '').split(/\s+/).includes('expansion-title') ||
      ast.retainedText?.source !== 'core-text-registry' || styles.reference.fontSize !== '16px' ||
      !['14.4px', '18.4px'].includes(styles.retained.fontSize)) return;
  const referenceChain = [], seen = new Set();
  let node = ref;
  for (const [type, className] of [['mat-panel-title', 'mat-expansion-panel-header-title'], ['span', 'mat-content'],
    ['mat-expansion-panel-header', 'mat-expansion-panel-header']]) {
    if (!node || seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1 ||
        node.type !== type || !String(node.attributes?.class ?? '').split(/\s+/).includes(className)) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || canonicalStyle(pooled.value).fontSize !== '16px' ||
        node.inline?.['font-size'] || node.inline?.font || node.inline?.all ||
        /(?:^|;)\s*(?:font-size|font|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.['font-size'] || r.declarations?.font || r.declarations?.all));
    if (type !== 'mat-expansion-panel-header' && declarations.length) return;
    if (type === 'mat-expansion-panel-header' && (declarations.length !== 1 ||
        declarations[0].selector !== '.mat-expansion-panel-header' || declarations[0].declarations.font || declarations[0].declarations.all ||
        declarations[0].declarations['font-size']?.value !== 'var(--mat-expansion-header-text-size, var(--mat-sys-title-medium-size))' ||
        declarations[0].declarations['font-size'].important !== false || !Array.isArray(declarations[0].conditions) || declarations[0].conditions.length)) return;
    referenceChain.push({ node: node.key, parent: node.parent, computed: pooled.value, fontSizeRules: declarations });
    if (type !== 'mat-expansion-panel-header') {
      const parents = referenceTree.nodes.filter(n => n.key === node.parent);
      if (parents.length !== 1) return;
      node = parents[0];
    }
  }
  const candidateChain = [];
  node = ast; seen.clear();
  while (node) {
    if (seen.has(node.key) || astylarTree.nodes.filter(n => n.key === node.key).length !== 1 || node.authored?.style !== undefined) return;
    seen.add(node.key);
    const normal = inventory.styles[node.normalStyle], effective = inventory.styles[node.interactionStyle];
    if (normal?.side !== 'astylar' || effective?.side !== 'astylar' || !normal.value || !effective.value ||
        [normal.value, effective.value].some(s => Array.isArray(s) || s.font !== undefined || s.all !== undefined)) return;
    candidateChain.push({ node: node.key, authored: node.authored, normal: normal.value, effective: effective.value });
    if (node.authored?.id === 'page') break;
    if (normal.value.fontSize !== undefined || effective.value.fontSize !== undefined) return;
    const parents = astylarTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (node?.authored?.type !== 'main' || node.authored.id !== 'page' || node.parent !== 'root' ||
      astylarTree.nodes.filter(n => n.authored?.id === 'page').length !== 1 ||
      ['normal', 'effective'].some(stage => canonicalStyle(candidateChain.at(-1)[stage]).fontSize !== styles.retained.fontSize)) return;
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const pageRules = rules.map(r => r.value).filter(r => r.selector === '#page' && (r.fontSize !== undefined || r.font !== undefined || r.all !== undefined));
  if (pageRules.length !== 1 || pageRules[0].fontSize !== styles.retained.fontSize || pageRules[0].font !== undefined ||
      pageRules[0].all !== undefined || Object.keys(pageRules[0]).some(k => k.startsWith('media'))) return;
  return { attribution: 'reviewed-expansion-font-token-omission', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase expansion header font-size token and inheritance',
    justification: 'The reference title inherits its unique active 16px Material header font-size token through the captured mat-content wrapper. The entire candidate title-to-page normal/effective chain omits that component size and core retains the explicitly scaled page size. This is a missing component typography input, not a core font-scaling defect or an accepted inverse-scale adjustment. Restore the reference header token and wrapper intent before evaluating renderer shaping, placement and paint. The separate compact-only 16px fixture override is not evidence that other states supply the token.',
    reviewEvidence: { sourceFinding: 'fixture-expansion-font-size-token-omitted', referenceChain, candidateChain,
      candidatePageRule: pageRules[0], referenceComputed: styles.reference.fontSize, candidateRetained: styles.retained.fontSize } };
}

function validateExpansionFont(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    if (comparison.family !== 'expansion') continue;
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const ref = refTree.nodes.find(n => n.key === comparison.referenceNode), ast = astTree.nodes.find(n => n.key === comparison.astylarNode);
    if (!ref || !ast) continue;
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    const review = reviewedExpansionFontInput(comparison, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style.fontSize])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-expansion-font-token-omission') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'fontSize' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.fontSize) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('expansion font attributions do not replay from component token and complete candidate inheritance');
}

function reviewedSortTypographyInput(entry, mapping, property, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'sort' || !['fontSize', 'color'].includes(property) ||
      mapping?.kind !== 'reviewed-showcase-template-text' || mapping.element !== 'sort-label' ||
      ast.retainedText?.source !== 'core-text-registry' || !styles.reference[property] ||
      styles.reference[property] === styles.retained[property]) return;
  const mappings = reviewedTemplateTextMappings('sort', referenceTree, astylarTree).filter(m => m.element === mapping.element);
  if (mappings.length !== 1 || JSON.stringify(mappings[0]) !== JSON.stringify(mapping) ||
      ref.key !== mapping.referenceNode || ast.key !== mapping.astylarNode) return;
  const cssProperty = property === 'fontSize' ? 'font-size' : 'color', referenceChain = [], seen = new Set();
  let node = ref;
  while (node) {
    if (seen.has(node.key) || referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    seen.add(node.key);
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || canonicalStyle(pooled.value)[property] !== styles.reference[property] ||
        node.inline?.[cssProperty] || node.inline?.all || (property === 'fontSize' && node.inline?.font) ||
        new RegExp(`(?:^|;)\\s*(?:${cssProperty}|all${property === 'fontSize' ? '|font' : ''})\\s*:`, 'i').test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.[cssProperty] || r.declarations?.all || (property === 'fontSize' && r.declarations?.font)));
    if (declarations.some(r => r.declarations.all || (property === 'fontSize' && r.declarations.font))) return;
    referenceChain.push({ node: node.key, parent: node.parent, type: node.type, computed: pooled.value, propertyRules: declarations });
    if (node.key === 'frame') break;
    if (declarations.some(r => r.declarations[cssProperty]?.value !== 'inherit')) return;
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  const ownerRules = referenceChain.at(-1)?.propertyRules ?? [];
  if (node?.key !== 'frame' || node.type !== 'main' || node.parent !== null ||
      !String(node.attributes?.class ?? '').split(/\s+/).includes('frame') || ownerRules.length !== 1 ||
      !/^\.frame\[_ngcontent-[\w-]+\]$/.test(ownerRules[0].selector ?? '') ||
      ownerRules[0].declarations[cssProperty]?.value !== (property === 'fontSize' ? 'calc(16px * var(--scale))' : 'rgb(29, 27, 32)') ||
      ownerRules[0].declarations[cssProperty].important !== false || !Array.isArray(ownerRules[0].conditions) || ownerRules[0].conditions.length) return;
  const parent = astylarTree.nodes.find(n => n.key === ast.parent), candidateChain = [];
  if (parent?.authored?.id !== 'sort-trigger' || ast.authored?.style !== undefined || parent.authored.style !== undefined) return;
  for (const current of [ast, parent]) {
    if (astylarTree.nodes.filter(n => n.key === current.key).length !== 1) return;
    const normal = inventory.styles[current.normalStyle], effective = inventory.styles[current.interactionStyle];
    if (normal?.side !== 'astylar' || effective?.side !== 'astylar' || !normal.value || !effective.value ||
        [normal.value, effective.value].some(s => s.all !== undefined || (property === 'fontSize' && s.font !== undefined))) return;
    if (current === ast ? [normal.value, effective.value].some(s => s[property] !== undefined)
      : [normal.value, effective.value].some(s => canonicalStyle(s)[property] !== styles.retained[property])) return;
    candidateChain.push({ node: current.key, authored: current.authored, normal: normal.value, effective: effective.value });
  }
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const candidateRules = rules.map((r, order) => ({ order, rule: r.value })).filter(({ rule }) =>
    (rule[property] !== undefined || rule.all !== undefined || (property === 'fontSize' && rule.font !== undefined)) &&
    (rule.all !== undefined || rule.selector?.includes('.sort-trigger') || rule.selector?.includes('#sort-trigger') ||
      rule.selector?.includes('#sort-label') || /(?:^|[\s>+~,])(?:span|div|\*)(?:$|[\s.#[:>+~,])/.test(rule.selector ?? '')));
  if (candidateRules.length !== 1 || candidateRules[0].rule.selector !== '.sort-trigger' ||
      Object.keys(candidateRules[0].rule).some(k => k.startsWith('media')) ||
      candidateRules[0].rule[property] !== (property === 'fontSize' ? '16px' : '#000000') ||
      canonicalStyle(candidateRules[0].rule)[property] !== styles.retained[property]) return;
  return { attribution: 'reviewed-sort-typography-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase sort typography inheritance and contrast styling',
    justification: 'The reference sort text inherits the frame font-size or color through its complete captured ancestry without an intervening override. The candidate leaf omits that property, but its immediate sort-trigger explicitly supplies the retained fixed 16px size or black ink instead. These are unequal authored inputs, not a core font-scaling or color-conversion defect. Preserve the reference inheritance and structure before evaluating shaping, paint or placement; do not normalize the differing theme values or add offsets.',
    reviewEvidence: { sourceFinding: 'fixture-sort-typography-substitution', property, mapping: mappings[0], referenceChain,
      referenceScale: node.inline?.['--scale'], candidateChain, candidateRule: candidateRules[0],
      referenceComputed: styles.reference[property], candidateRetained: styles.retained[property] } };
}

function validateSortTypography(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    if (comparison.family !== 'sort') continue;
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const ref = refTree.nodes.find(n => n.key === comparison.referenceNode), ast = astTree.nodes.find(n => n.key === comparison.astylarNode);
    if (!ref || !ast) continue;
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    for (const property of ['fontSize', 'color']) {
      const review = reviewedSortTypographyInput(comparison, comparison.mapping, property, ref, ast, styles, refTree, astTree, report.elementInventory);
      if (review) expected.push({ comparison, property, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style[property]])) });
    }
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-sort-typography-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, property, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === property &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties[property]) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('sort typography attributions do not replay from frame inheritance and candidate trigger declarations');
}

function reviewedSidenavColorInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'sidenav' || !['sidenav-nav', 'sidenav-content'].includes(ast.authored?.id) ||
      ast.retainedText?.source !== 'core-text-registry' || !styles.reference.color ||
      styles.reference.color === styles.retained.color ||
      ['normal', 'effective'].some(stage => styles[stage].color !== styles.retained.color)) return;
  const nav = ast.authored.id === 'sidenav-nav', selector = nav ? '.sidenav' : '.sidenav-content';
  const classes = String(ast.authored.class ?? '').split(/\s+/);
  if (ast.authored.type !== (nav ? 'aside' : 'main') || !classes.includes(selector.slice(1)) ||
      ast.authored.style?.color !== undefined || ast.authored.style?.all !== undefined) return;
  const parents = astylarTree.nodes.filter(n => n.key === ast.parent);
  if (parents.length !== 1 || parents[0].authored?.type !== 'div' || parents[0].authored.id !== 'sidenav-primary' ||
      !String(parents[0].authored.class ?? '').split(/\s+/).includes('sidenav-container')) return;
  const wrappers = referenceTree.nodes.filter(n => n.key === ref.parent);
  if (wrappers.length !== 1) return;
  const wrapper = wrappers[0];
  if (nav) {
    const mappings = reviewedTemplateTextMappings('sidenav', referenceTree, astylarTree).filter(m =>
      m.element === 'sidenav-nav' && m.referenceNode === ref.key && m.astylarNode === ast.key);
    if (mappings.length !== 1 || !String(wrapper.attributes?.class ?? '').split(/\s+/).includes('mat-drawer')) return;
  } else if (ref.type !== 'mat-sidenav-content' || ref.attributes?.id !== 'sidenav-content' ||
      !String(ref.attributes.class ?? '').split(/\s+/).includes('mat-sidenav-content') ||
      wrapper.type !== 'mat-sidenav-container' || wrapper.attributes?.id !== 'sidenav-primary' ||
      !String(wrapper.attributes.class ?? '').split(/\s+/).includes('mat-drawer-container')) return;
  const referenceSelector = nav ? '.mat-drawer' : '.mat-drawer-container';
  const referenceToken = nav ? 'var(--mat-sidenav-container-text-color, var(--mat-sys-on-surface-variant))'
    : 'var(--mat-sidenav-content-text-color, var(--mat-sys-on-background))';
  const referenceChain = [];
  for (const node of [ref, wrapper]) {
    if (referenceTree.nodes.filter(n => n.key === node.key).length !== 1) return;
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || canonicalStyle(pooled.value).color !== styles.reference.color ||
        node.inline?.color || node.inline?.all || /(?:^|;)\s*(?:color|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true && (r.declarations?.color || r.declarations?.all));
    if (node === ref && declarations.length) return;
    if (node === wrapper && (declarations.length !== 1 || declarations[0].declarations.all ||
        declarations[0].selector !== referenceSelector || declarations[0].declarations.color?.value !== referenceToken ||
        declarations[0].declarations.color.important !== false || !Array.isArray(declarations[0].conditions) || declarations[0].conditions.length)) return;
    referenceChain.push({ node: node.key, computed: pooled.value, colorRules: declarations });
  }
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const ownTag = new RegExp(`(?:^|[\\s>+~,])${ast.authored.type}(?:$|[\\s.#[:>+~,])`);
  const escapedClasses = classes.filter(Boolean).map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const candidates = rules.map((r, order) => ({ order, rule: r.value })).filter(({ rule }) =>
    (rule.color !== undefined || rule.all !== undefined) && (rule.all !== undefined ||
      rule.selector === '*' || rule.selector?.includes(`#${ast.authored.id}`) || ownTag.test(rule.selector ?? '') ||
      escapedClasses.some(c => new RegExp(`\\.${c}(?:$|[\\s.#[:>+~,])`).test(rule.selector ?? ''))));
  if (candidates.length !== 1 || candidates[0].rule.selector !== selector || candidates[0].rule.all !== undefined ||
      Object.keys(candidates[0].rule).some(key => key.startsWith('media')) || !/^#[a-f\d]{6}$/i.test(candidates[0].rule.color ?? '') ||
      canonicalStyle(candidates[0].rule).color !== styles.retained.color) return;
  return { attribution: 'reviewed-sidenav-color-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase sidenav component color-token translation',
    justification: 'The reference text inherits a component-specific Material color token from its drawer or container, without an intervening color declaration. The candidate supplies a different literal on the text owner; that declaration agrees with normal, effective and retained stages. This is an authored-input substitution, including one-channel RGB differences, not evidence of a core color-conversion defect or equivalent paint. Restore the component token semantics before judging renderer output. Separate sidenav structure and padding findings remain unchanged.',
    reviewEvidence: { sourceFinding: 'fixture-sidenav-color-token-substitution', referenceChain, candidateRule: candidates[0],
      candidateParent: { key: parents[0].key, authored: parents[0].authored }, candidateAuthored: ast.authored,
      candidateNormal: inventory.styles[ast.normalStyle].value, candidateEffective: inventory.styles[ast.interactionStyle].value,
      referenceComputed: styles.reference.color, candidateRetained: styles.retained.color } };
}

function validateSidenavColors(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    if (comparison.family !== 'sidenav') continue;
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const refsByKey = refTree.nodes.filter(n => n.key === comparison.referenceNode), astsByKey = astTree.nodes.filter(n => n.key === comparison.astylarNode);
    if (refsByKey.length !== 1 || astsByKey.length !== 1) continue;
    const ref = refsByKey[0], ast = astsByKey[0];
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    const review = reviewedSidenavColorInput(comparison, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style.color])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-sidenav-color-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'color' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.color) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('sidenav color attributions do not replay from captured component tokens and candidate declarations');
}

function reviewedFieldLabelColorInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (!['form-field', 'input', 'select', 'autocomplete', 'datepicker', 'timepicker'].includes(entry.family) ||
      ref.type !== 'mat-label' || ref.attributes?.id !== `${entry.family}-label` ||
      ast.authored?.type !== 'label' || ast.authored.id !== ref.attributes.id ||
      ast.retainedText?.source !== 'core-text-registry' || !styles.reference.color ||
      styles.reference.color === styles.retained.color ||
      ['normal', 'effective'].some(stage => styles[stage].color !== styles.retained.color)) return;
  const classes = String(ast.authored.class ?? '').split(/\s+/);
  if (!classes.includes('field-label') || ast.authored.style?.color !== undefined || ast.authored.style?.all !== undefined) return;
  const wrappers = referenceTree.nodes.filter(n => n.key === ref.parent);
  const parents = astylarTree.nodes.filter(n => n.key === ast.parent);
  if (wrappers.length !== 1 || parents.length !== 1 || referenceTree.nodes.filter(n => n.key === ref.key).length !== 1) return;
  const wrapper = wrappers[0], parent = parents[0];
  const parentClasses = String(parent.authored?.class ?? '').split(/\s+/);
  if (wrapper.type !== 'label' || !String(wrapper.attributes?.class ?? '').split(/\s+/).includes('mdc-floating-label') ||
      parent.authored?.type !== 'div' || parent.authored.id !== `${entry.family}-primary` || !parentClasses.includes('field-shell')) return;
  const referenceChain = [];
  for (const node of [ref, wrapper]) {
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value || canonicalStyle(pooled.value).color !== styles.reference.color ||
        node.inline?.color || node.inline?.all || /(?:^|;)\s*(?:color|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true && (r.declarations?.color || r.declarations?.all));
    if (node === ref && declarations.length) return;
    if (node === wrapper && (declarations.length !== 1 || declarations[0].declarations.all ||
        declarations[0].selector !== '.mdc-text-field--filled:not(.mdc-text-field--disabled) .mdc-floating-label' ||
        declarations[0].declarations.color?.value !== 'var(--mat-form-field-filled-label-text-color, var(--mat-sys-on-surface-variant))' ||
        declarations[0].declarations.color.important !== false || !Array.isArray(declarations[0].conditions) || declarations[0].conditions.length)) return;
    referenceChain.push({ node: node.key, computed: pooled.value, colorRules: declarations });
  }
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const selectors = ['.field-label', '.field-label.empty-field-label', '.timepicker-shell .field-label', '.datepicker-shell .field-label'];
  if (rules.some(({ value: rule }) => (rule.color !== undefined || rule.all !== undefined) &&
      !selectors.includes(rule.selector) && (rule.selector?.includes(`#${ast.authored.id}`) ||
        /(?:^|[\s>+~,])label(?:$|[\s.#[:>+~,])/.test(rule.selector ?? '') || rule.all !== undefined))) return;
  const candidateRules = rules.map((r, order) => ({ order, rule: r.value })).filter(({ rule }) =>
    rule.selector?.includes('.field-label') && (rule.color !== undefined || rule.all !== undefined));
  if (candidateRules.length !== 4 || selectors.some(selector => candidateRules.filter(r => r.rule.selector === selector).length !== 1) ||
      candidateRules.some(({ rule }) => rule.all !== undefined || Object.keys(rule).some(key => key.startsWith('media')) ||
        !/^#[a-f\d]{6}$/i.test(rule.color ?? ''))) return;
  // Only these four inspected declarations and this explicit parent/class
  // relationship are reviewed. This is not a second general CSS cascade.
  const matchingRules = candidateRules.filter(({ rule }) => rule.selector === '.field-label' ||
    (rule.selector === '.field-label.empty-field-label' && classes.includes('empty-field-label')) ||
    (rule.selector === '.timepicker-shell .field-label' && parentClasses.includes('timepicker-shell')) ||
    (rule.selector === '.datepicker-shell .field-label' && parentClasses.includes('datepicker-shell')));
  if (parentClasses.includes('timepicker-shell') !== (entry.family === 'timepicker') ||
      parentClasses.includes('datepicker-shell') !== (entry.family === 'datepicker')) return;
  const selectedRule = matchingRules.filter(r => r.rule.selector !== '.field-label').at(-1) ?? matchingRules[0];
  if (!selectedRule || canonicalStyle(selectedRule.rule).color !== styles.retained.color) return;
  return { attribution: 'reviewed-field-label-color-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'showcase filled-label color tokens and state-rule translation',
    justification: 'The reference mat-label inherits the unique active filled-label color token from its floating-label wrapper. The candidate supplies literal base, empty-state and picker-shell colors instead. Captured classes and original rule order select the reviewed declaration, whose color agrees with normal, effective and retained values. Thus these color inputs differ before rendering; no core color-conversion defect or equivalent glyph paint is inferred. A disagreement between inspected and retained stages, competing reference rules, or unreviewed state/media rules prevents this attribution. Preserve wrapper and state inputs before evaluating rendering.',
    reviewEvidence: { sourceFinding: 'fixture-field-label-color-substitution', referenceChain, candidateRules, matchingRules, selectedRule,
      candidateParent: { key: parent.key, authored: parent.authored }, candidateAuthored: ast.authored,
      candidateNormal: inventory.styles[ast.normalStyle].value, candidateEffective: inventory.styles[ast.interactionStyle].value,
      referenceComputed: styles.reference.color, candidateRetained: styles.retained.color } };
}

function validateFieldLabelColors(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const refsByKey = refTree.nodes.filter(n => n.key === comparison.referenceNode), astsByKey = astTree.nodes.filter(n => n.key === comparison.astylarNode);
    if (refsByKey.length !== 1 || astsByKey.length !== 1) continue;
    const ref = refsByKey[0], ast = astsByKey[0];
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    const review = reviewedFieldLabelColorInput(comparison, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style.color])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-field-label-color-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'color' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.color) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('field-label color attributions do not replay from captured wrapper token and candidate rule order');
}

function reviewedFieldLabelTrackingInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) {
  if (!['form-field', 'input', 'select', 'autocomplete', 'datepicker', 'timepicker'].includes(entry.family) ||
      ref.type !== 'mat-label' || ref.attributes?.id !== `${entry.family}-label` || ast.authored.type !== 'label' ||
      ast.authored.id !== ref.attributes.id || ast.retainedText?.source !== 'core-text-registry' ||
      styles.reference.letterSpacing !== '0.496px' || !['0.4px', '0.65px'].includes(styles.retained.letterSpacing) ||
      ['normal', 'effective'].some(stage => styles[stage].letterSpacing !== styles.retained.letterSpacing)) return;
  const classes = String(ast.authored.class ?? '').split(/\s+/);
  if (!classes.includes('field-label')) return;
  const wrappers = referenceTree.nodes.filter(n => n.key === ref.parent);
  if (wrappers.length !== 1 || referenceTree.nodes.filter(n => n.key === ref.key).length !== 1) return;
  const wrapper = wrappers[0], wrapperStyle = inventory.styles[wrapper.style];
  if (wrapper.type !== 'label' || !String(wrapper.attributes?.class ?? '').split(/\s+/).includes('mdc-floating-label') ||
      wrapperStyle?.side !== 'reference' || canonicalStyle(wrapperStyle.value).letterSpacing !== styles.reference.letterSpacing) return;
  const referenceChain = [];
  for (const node of [ref, wrapper]) {
    const pooled = inventory.styles[node.style];
    if (pooled?.side !== 'reference' || !pooled.value ||
        node.inline?.['letter-spacing'] || node.inline?.font || node.inline?.all ||
        /(?:^|;)\s*(?:letter-spacing|font|all)\s*:/i.test(node.attributes?.style ?? '')) return;
    const rules = node.rules.map(i => inventory.rules[i]);
    if (rules.some(r => r?.side !== 'reference')) return;
    const declarations = rules.map(r => r.value).filter(r => r.active === true &&
      (r.declarations?.['letter-spacing'] || r.declarations?.font || r.declarations?.all));
    if (node === ref && declarations.length) return;
    if (node === wrapper && (declarations.length !== 1 || declarations[0].declarations.font || declarations[0].declarations.all ||
        declarations[0].selector !== '.mdc-text-field--filled .mdc-floating-label' ||
        declarations[0].declarations['letter-spacing']?.value !== 'var(--mat-form-field-filled-label-text-tracking, var(--mat-sys-body-large-tracking))')) return;
    referenceChain.push({ node: node.key, computed: pooled.value, trackingRules: declarations });
  }
  const rules = astylarTree.rules.map(i => inventory.rules[i]);
  if (rules.some(r => r?.side !== 'astylar')) return;
  const candidateRules = rules.map(r => r.value).filter(r => r.selector?.includes('.field-label') &&
    (r.letterSpacing !== undefined || r.font !== undefined || r.all !== undefined));
  if (candidateRules.some(r => r.font !== undefined || r.all !== undefined || Object.keys(r).some(key => key.startsWith('media')) ||
      !['.field-label', '.field-label.empty-field-label'].includes(r.selector))) return;
  const bases = candidateRules.filter(r => r.selector === '.field-label');
  const emptyRules = candidateRules.filter(r => r.selector === '.field-label.empty-field-label');
  if (bases.length !== 1 || emptyRules.length > 1 || canonicalStyle(bases[0]).letterSpacing !== '0.4px') return;
  const selectedRule = classes.includes('empty-field-label') ? emptyRules[0] : bases[0];
  if (!selectedRule || canonicalStyle(selectedRule).letterSpacing !== styles.retained.letterSpacing) return;
  return { attribution: 'reviewed-field-label-tracking-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, currentPseudoStatePaintVerified: false,
    recommendedOwner: 'Material field-label typography/transform input translation and core transform semantics',
    justification: 'The reference mat-label inherits 0.496px tracking from the captured filled floating-label token. The candidate explicitly authors 0.4px on the base field-label or 0.4/0.65px on its more-specific empty-field-label rule, and normal/effective/core-retained values agree with that selected declaration. History traces the base tracking to 87bc351 and the empty-state split to 354084e. These are unequal inputs, not a core spacing error or an accepted scale adjustment. Full wrapper styles, including transform and font size, remain evidence; no transformed apparent spacing is substituted for the reference CSS input, and matching current glyphs would not establish equivalent layout or raster.',
    reviewEvidence: { sourceFinding: 'fixture-field-label-tracking-substitution', referenceChain, candidateRules, selectedRule,
      candidateNormal: inventory.styles[ast.normalStyle].value, candidateEffective: inventory.styles[ast.interactionStyle].value,
      referenceComputed: styles.reference.letterSpacing, candidateRetained: styles.retained.letterSpacing } };
}

function validateFieldLabelTracking(report, errors) {
  const expected = [];
  for (const comparison of report.retainedTypography?.comparisons ?? []) {
    const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
    const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
    if (refs.length !== 1 || asts.length !== 1) continue;
    const refTree = report.elementInventory.variants[refs[0].variant], astTree = report.elementInventory.variants[asts[0].variant];
    const refsByKey = refTree.nodes.filter(n => n.key === comparison.referenceNode), astsByKey = astTree.nodes.filter(n => n.key === comparison.astylarNode);
    if (refsByKey.length !== 1 || astsByKey.length !== 1) continue;
    const ref = refsByKey[0], ast = astsByKey[0];
    const indices = { reference: ref.style, normal: ast.normalStyle, effective: ast.interactionStyle, retained: ast.retainedText?.style };
    const pooled = Object.fromEntries(Object.entries(indices).map(([key, i]) => [key, report.elementInventory.styles[i]]));
    if (Object.entries(pooled).some(([key, value]) => value?.side !== (key === 'reference' ? 'reference' : 'astylar') || !value.value)) continue;
    const styles = Object.fromEntries(Object.entries(pooled).map(([key, value]) => [key, canonicalStyle(value.value)]));
    const review = reviewedFieldLabelTrackingInput(comparison, ref, ast, styles, refTree, astTree, report.elementInventory);
    if (review) expected.push({ comparison, review, values: Object.fromEntries(Object.entries(styles).map(([key, style]) => [key, style.letterSpacing])) });
  }
  const claimed = report.retainedTypography?.differences.filter(d => d.attribution === 'reviewed-field-label-tracking-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(({ comparison, review, values }) => {
    const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element && d.property === 'letterSpacing' &&
      d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode);
    return matches.length !== 1 || JSON.stringify(matches[0].values) !== JSON.stringify(values) ||
      JSON.stringify(comparison.properties.letterSpacing) !== JSON.stringify(values) ||
      Object.entries(review).some(([key, value]) => JSON.stringify(matches[0][key]) !== JSON.stringify(value));
  })) errors.push('field-label tracking attributions do not replay from captured wrapper tokens and explicit candidate rules');
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

function reviewedHorizontalStartAlignment(property, values, referenceTree, ref, inventory) {
  // This is a contextual interpretation, never a global start -> left alias.
  // In particular, unicode-bidi is not inherited: an innocent-looking inline
  // leaf can belong to a plaintext paragraph with a different base direction.
  const stage = Object.hasOwn(values, 'painted') ? 'painted' : 'retained';
  if (property !== 'textAlign' || values.reference !== 'start' || values[stage] !== 'left' ||
      referenceTree?.contextStyleEvidenceVersion !== 1 ||
      JSON.stringify(referenceTree.contextStyleProperties) !== JSON.stringify(referenceContextProperties)) return;
  if (inventory.styles[ref?.style]?.value?.textAlign !== 'start') return;
  const chain = [], seen = new Set();
  let node = ref;
  while (node) {
    if (seen.has(node.key)) return;
    seen.add(node.key);
    const duplicates = referenceTree.nodes.filter(n => n.key === node.key);
    if (duplicates.length !== 1) return;
    const pooled = inventory.styles[node.style], style = pooled?.value;
    if (pooled?.side !== 'reference' || !style || style.direction !== 'ltr' ||
        style.writingMode !== 'horizontal-tb' || !['normal', 'isolate'].includes(style.unicodeBidi) ||
        !['start', 'left'].includes(style.textAlign) || style.textAlignLast !== 'auto' ||
        !['inline', 'block', 'inline-block', 'flow-root', 'flex', 'inline-flex', 'grid', 'inline-grid',
          'table', 'inline-table', 'table-row-group', 'table-header-group', 'table-footer-group',
          'table-row', 'table-cell', 'table-caption', 'list-item'].includes(style.display)) return;
    chain.push({ node: node.key, parent: node.parent, type: node.type, style: node.style,
      computed: Object.fromEntries(['display', 'direction', 'writingMode', 'unicodeBidi', 'textAlign', 'textAlignLast']
        .map(p => [p, style[p]])) });
    if (node.parent === null) {
      // Do not treat a truncated inline subtree as a containing-block boundary.
      if (!/^(frame|overlay:\d+)$/.test(node.key) ||
          !['block', 'flow-root', 'flex', 'grid'].includes(style.display)) return;
      break;
    }
    const parents = referenceTree.nodes.filter(n => n.key === node.parent);
    if (parents.length !== 1) return;
    node = parents[0];
  }
  if (!chain.length || chain.at(-1).parent !== null) return;
  return { attribution: 'reviewed-horizontal-start-alignment', classification: 'equivalent-representation',
    inputEquivalent: false, propertyEquivalent: true, finalRasterVerified: false,
    recommendedOwner: 'input audit contextual CSS logical-to-physical alignment interpretation',
    justification: 'Only the alignment value is equivalent in this captured context: the complete reference leaf-to-block-root chain is horizontal LTR with normal/isolate bidi, start/left alignment and automatic last-line alignment. Start therefore denotes the physical left edge. Raw values and ancestry remain recorded. This does not certify matching line containers, structure, placement, bidi support, other styles or final raster; plaintext, RTL, vertical, missing, hidden and unreviewed contexts are not accepted.',
    reviewEvidence: { source: 'browser-computed-ancestry', contextStyleEvidenceVersion: 1,
      referenceValue: 'start', physicalValue: 'left', comparedStage: stage, chain,
      specification: 'https://www.w3.org/TR/2026/CRD-css-text-3-20260814/#bidi-linebox',
      proof: 'tests/material-parity/input-tree-evidence.spec.mjs: start alignment requires the line-container context' } };
}

function validateHorizontalStartAlignment(report, errors) {
  for (const [name, stage] of [['retainedTypography', 'retained'], ['controlTypography', 'painted']]) {
    const section = report[name];
    const expected = [];
    for (const comparison of section?.comparisons ?? []) {
      const refs = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'reference');
      if (refs.length !== 1) continue;
      const tree = report.elementInventory.variants[refs[0].variant];
      const nodes = tree?.nodes.filter(n => n.key === comparison.referenceNode) ?? [];
      if (nodes.length !== 1) continue;
      const asts = report.elementInventory.cases.filter(c => c.case === comparison.case && c.side === 'astylar');
      const astNodes = asts.length === 1 ? report.elementInventory.variants[asts[0].variant]?.nodes
        .filter(n => n.key === comparison.astylarNode) ?? [] : [];
      if (astNodes.length !== 1) continue;
      const ast = astNodes[0], indices = { reference: nodes[0].style,
        normal: ast.normalStyle, effective: ast.interactionStyle,
        ...(stage === 'painted' ? { painted: ast.paintedControlText?.style } : {}),
        ...(ast.retainedText ? { retained: ast.retainedText.style } : {}) };
      const values = Object.fromEntries(Object.entries(indices).map(([key, index]) => {
        const pooled = report.elementInventory.styles[index];
        return [key, pooled?.side === (key === 'reference' ? 'reference' : 'astylar')
          ? canonicalStyle(pooled.value).textAlign : undefined];
      }));
      const review = reviewedHorizontalStartAlignment('textAlign', values, tree, nodes[0], report.elementInventory);
      if (review) expected.push({ comparison, review, values });
    }
    const claimed = section?.differences.filter(d => d.attribution === 'reviewed-horizontal-start-alignment') ?? [];
    const valid = expected.length === claimed.length && expected.every(({ comparison, review, values }) => {
      const matches = claimed.filter(d => d.case === comparison.case && d.element === comparison.element &&
        d.referenceNode === comparison.referenceNode && d.astylarNode === comparison.astylarNode && d.property === 'textAlign');
      const difference = matches[0];
      return matches.length === 1 && JSON.stringify(difference.values) === JSON.stringify(values) &&
        JSON.stringify(comparison.properties.textAlign) === JSON.stringify(values) &&
        Object.entries(review).every(([key, value]) => JSON.stringify(difference[key]) === JSON.stringify(value));
    });
    if (!valid) errors.push(`${name} horizontal start alignment attributions do not replay from complete captured ancestry`);
  }
}

function isReviewedHiddenRetainedGap(gap, inventory) {
  if (gap.attribution !== 'reviewed-display-none-text-stage' || gap.classification !== 'parity-harness-defect' ||
      gap.inputEquivalent !== false || !gap.justification || !gap.reviewEvidence) return false;
  const evidence = reviewedHiddenRetainedEvidence(gap, inventory);
  return !!evidence && JSON.stringify(evidence) === JSON.stringify(gap.reviewEvidence);
}

function reviewedPluginTabPanelGap(key, inventory) {
  if (inventory.errors.some(e => e.case === key)) return;
  const mappings = side => inventory.cases.filter(c => c.case === key && c.side === side);
  const rm = mappings('reference'), am = mappings('astylar');
  if (rm.length !== 1 || am.length !== 1) return;
  const ref = inventory.variants[rm[0].variant], ast = inventory.variants[am[0].variant];
  if (ref?.family !== 'tabs' || ast?.family !== 'tabs' || ast.resolvedStyleEvidenceVersion !== 2 ||
      ast.resolvedStyleSource !== 'core-style-inspection' || !Number.isInteger(am[0].resolvedStyleRevision) || am[0].resolvedStyleRevision < 0) return;
  const unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  const cls = (n, name) => String(n?.attributes?.class ?? '').split(/\s+/).includes(name);
  if ([ref, ast].some(t => new Set(t.nodes.map(n => n.key)).size !== t.nodes.length)) return;
  const leaf = unique(ref.nodes.filter(n => n.attributes?.['data-parity-id'] === 'tab-panel'));
  const parent = n => n && unique(ref.nodes.filter(p => p.key === n.parent));
  const content = parent(leaf), body = parent(content), wrapper = parent(body), group = parent(wrapper);
  if (leaf?.type !== 'span' || leaf.attributes.id || ref.nodes.some(n => n.parent === leaf.key) ||
      content?.type !== 'div' || !cls(content, 'mat-mdc-tab-body-content') ||
      body?.type !== 'mat-tab-body' || !cls(body, 'mat-mdc-tab-body-active') || body.attributes.role !== 'tabpanel' ||
      body.attributes['aria-hidden'] !== 'false' || wrapper?.type !== 'div' || !cls(wrapper, 'mat-mdc-tab-body-wrapper') ||
      group?.type !== 'mat-tab-group' || group.attributes.id !== 'tabs-primary' ||
      ref.nodes.filter(n => n.attributes?.id === 'tabs-primary').length !== 1) return;
  const identity = body.attributes.id?.match(/^mat-tab-group-(\d+)-content-([01])$/);
  if (!identity || body.attributes['aria-labelledby'] !== `mat-tab-group-${identity[1]}-label-${identity[2]}`) return;
  const selected = identity[2] === '0', text = selected ? 'Overview content' : 'Activity content';
  if (leaf.ownText !== text || [content, body, wrapper, group].some(n => n.ownText?.trim())) return;
  const header = unique(ref.nodes.filter(n => n.attributes?.id === body.attributes['aria-labelledby']));
  const descendsFrom = (tree, node, ancestor) => {
    const seen = new Set();
    while (node && node.key !== ancestor.key) {
      if (seen.has(node.key)) return false;
      seen.add(node.key); node = unique(tree.nodes.filter(p => p.key === node.parent));
    }
    return !!node;
  };
  if (header?.attributes.role !== 'tab' || header.attributes['aria-selected'] !== 'true' ||
      header.attributes['aria-controls'] !== body.attributes.id || !descendsFrom(ref, header, group)) return;
  const panel = unique(ast.nodes.filter(n => n.authored?.id === 'tab-panel'));
  const ag = unique(ast.nodes.filter(n => n.authored?.id === 'tabs-primary'));
  if (panel?.authored.type !== 'showcase.material:tab-panel' || panel.authored.class !== 'tab-panel' ||
      panel.authored.role !== 'tabpanel' || panel.authored.ariaLabel !== text || panel.authored.textContent !== undefined ||
      panel.retainedText || panel.paintedControlText || ast.nodes.some(n => n.parent === panel.key) ||
      ag?.authored.type !== 'div' || ag.authored.class !== 'tabs' || panel.parent !== ag.key) return;
  const data = panel.authored.data;
  if (!data || data.selected !== selected || data.phase !== 1 ||
      typeof data['font-size'] !== 'number' || !Number.isFinite(data['font-size']) || data['font-size'] <= 0 ||
      typeof data['baseline-offset'] !== 'number' || !Number.isFinite(data['baseline-offset']) ||
      !/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(data['text-color'] ?? '')) return;
  const buttons = ['tab-overview', 'tab-activity'].map(id => unique(ast.nodes.filter(n => n.authored?.id === id)));
  if (buttons.some((n, i) => n?.authored.type !== 'button' || n.authored.role !== 'tab' ||
      n.authored.ariaSelected !== (i === 0 ? selected : !selected) || n.authored.ariaControls !== 'tab-panel' ||
      n.authored.value !== (i === 0 ? 'Overview' : 'Activity') || !descendsFrom(ast, n, ag))) return;
  const readStyle = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const reference = [leaf, content, body, wrapper, group, header].map(n => ({ node: n.key, parent: n.parent, type: n.type,
    attributes: n.attributes, ownText: n.ownText, computed: readStyle(n.style, 'reference'), inline: n.inline,
    rules: (n.rules ?? []).map(index => inventory.rules[index]) }));
  const candidate = [panel, ag, ...buttons].map(n => ({ node: n.key, parent: n.parent, authored: n.authored,
    normal: readStyle(n.normalStyle, 'astylar'), effective: readStyle(n.interactionStyle, 'astylar') }));
  if (reference.some(n => !object(n.computed) || n.rules.some(r => r?.side !== 'reference' || !object(r.value))) ||
      candidate.some(n => !object(n.normal) || !object(n.effective))) return;
  return { case: key, family: 'tabs', element: undefined,
    reason: 'own-text nodes without an explicit shared ID require structural mapping',
    referenceNodes: [leaf.key], astylarNodes: [], attribution: 'reviewed-plugin-tab-panel-text-substitution',
    classification: 'application-plugin-authoring-defect', inputEquivalent: false, finalRasterVerified: false,
    currentPluginPaintCaptured: false,
    recommendedOwner: 'core text composition and paint; Material plugin transition orchestration only',
    justification: 'The reference active panel contains an ordinary text span. The candidate instead authors a childless custom tab-panel with selected/font/color/baseline data and no textContent. Matching panel/tab identities and state identify the substitution; ariaLabel is not treated as painted text. MaterialTabPanelRenderer chooses literal content and rasterizes its own font/baseline through DynamicTexture, as independently characterized by the bound-texture test. This explains the missing core text stage and records unequal inputs, not equivalent structure, current plugin paint, glyph raster, or a core equal-input failure. Transition orchestration can remain in the plugin; text must be submitted to core.',
    reviewEvidence: structuredClone({ source: 'captured-plugin-authored-input', revision: am[0].resolvedStyleRevision,
      sourceFindings: ['plugin-tab-panel-competing-text-renderer', 'plugin-tab-panel-baseline-offset'],
      proof: 'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts',
      selected, referenceText: text, reference, candidate,
      missingCoreTextStage: { textContentAbsent: true, retainedTextAbsent: true, controlTextureAbsent: true },
      currentPluginPaintCaptured: false }) };
}

function isReviewedPluginTabPanelGap(gap, inventory) {
  if (gap.attribution !== 'reviewed-plugin-tab-panel-text-substitution') return false;
  const expected = reviewedPluginTabPanelGap(gap.case, inventory);
  return !!expected && Object.entries(expected).every(([k, v]) => JSON.stringify(gap[k]) === JSON.stringify(v));
}

function validatePluginTabPanelSubstitutions(report, errors) {
  const inventory = report.elementInventory;
  const expected = [...new Set(inventory.cases.filter(c => c.side === 'astylar').map(c => c.case))]
    .map(key => reviewedPluginTabPanelGap(key, inventory)).filter(Boolean);
  const claimed = report.retainedTypography?.gaps.filter(g => g.attribution === 'reviewed-plugin-tab-panel-text-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(e => {
    const matches = claimed.filter(g => g.case === e.case);
    return matches.length !== 1 || !isReviewedPluginTabPanelGap(matches[0], inventory);
  })) errors.push('plugin tab-panel substitutions do not replay from captured structure, state and style inputs');
}

function reviewedSelectArrowGap(key, inventory) {
  const mappings = side => inventory.cases.filter(c => c.case === key && c.side === side);
  const rm = mappings('reference'), am = mappings('astylar');
  if (rm.length !== 1 || am.length !== 1) return;
  const ref = inventory.variants[rm[0].variant], ast = inventory.variants[am[0].variant];
  if (ref?.family !== 'select' || ast?.family !== 'select' || ast.resolvedStyleEvidenceVersion !== 2 ||
      ast.resolvedStyleSource !== 'core-style-inspection' || !Number.isInteger(am[0].resolvedStyleRevision) || am[0].resolvedStyleRevision < 0) return;
  const unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  const cls = (n, name) => String(n?.attributes?.class ?? '').split(/\s+/).includes(name);
  if ([ref, ast].some(t => new Set(t.nodes.map(n => n.key)).size !== t.nodes.length)) return;
  const control = unique(ref.nodes.filter(n => n.attributes?.id === 'select-control'));
  if (control?.type !== 'mat-select' || !cls(control, 'mat-mdc-select') || control.attributes.role !== 'combobox' ||
      !control.attributes['aria-label']?.trim()) return;
  const child = (n, type, name) => n && unique(ref.nodes.filter(c => c.parent === n.key && c.type === type && (!name || cls(c, name))));
  const trigger = child(control, 'div', 'mat-mdc-select-trigger');
  const wrapper = child(trigger, 'div', 'mat-mdc-select-arrow-wrapper');
  const arrow = child(wrapper, 'div', 'mat-mdc-select-arrow');
  const svg = child(arrow, 'svg'), path = child(svg, 'path');
  const chain = [control, trigger, wrapper, arrow, svg, path];
  if (chain.some(n => !n || n.ownText?.trim()) ||
      [wrapper, arrow, svg].some(n => ref.nodes.filter(c => c.parent === n.key).length !== 1) ||
      ref.nodes.some(n => n.parent === path.key) || svg.attributes.viewBox !== '0 0 24 24' ||
      svg.attributes.width !== '24px' || svg.attributes.height !== '24px' ||
      svg.attributes.focusable !== 'false' || svg.attributes['aria-hidden'] !== 'true' ||
      path.attributes.d !== 'M7 10l5 5 5-5z' || ref.nodes.some(n => n.attributes?.id === 'select-caret')) return;
  const caret = unique(ast.nodes.filter(n => n.authored?.id === 'select-caret'));
  const shell = unique(ast.nodes.filter(n => n.authored?.id === 'select-primary'));
  const ac = unique(ast.nodes.filter(n => n.authored?.id === 'select-control'));
  if (caret?.authored.type !== 'span' || caret.authored.class !== 'select-caret' ||
      caret.authored.role !== 'presentation' || caret.authored.textContent !== '▼' ||
      shell?.authored.type !== 'div' || shell.authored.class !== 'field-shell' || caret.parent !== shell.key ||
      ac?.authored.role !== 'combobox' || ac.authored.ariaLabel !== control.attributes['aria-label'] ||
      ast.nodes.some(n => n.parent === caret.key) || caret.retainedText?.source !== 'core-text-registry' || caret.paintedControlText) return;
  const ancestry = [], seen = new Set();
  let n = ac;
  while (n && n.key !== shell.key) {
    if (seen.has(n.key)) return;
    seen.add(n.key); ancestry.push(n.key);
    n = unique(ast.nodes.filter(p => p.key === n.parent));
  }
  if (!n) return;
  const style = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const object = v => v && typeof v === 'object' && !Array.isArray(v);
  const referenceChain = chain.map(n => ({ node: n.key, parent: n.parent, type: n.type,
    attributes: n.attributes, computed: style(n.style, 'reference'), inline: n.inline,
    rules: (n.rules ?? []).map(index => inventory.rules[index]) }));
  const stages = { normal: style(caret.normalStyle, 'astylar'), effective: style(caret.interactionStyle, 'astylar'),
    retained: style(caret.retainedText.style, 'astylar') };
  if (referenceChain.some(n => !object(n.computed) || n.rules.some(r => r?.side !== 'reference' || !object(r.value))) ||
      Object.values(stages).some(s => !object(s))) return;
  const rules = (ast.rules ?? []).map(index => inventory.rules[index]);
  const caretRules = rules.filter(r => r?.side === 'astylar' && r.value?.selector === '.select-caret');
  if (caretRules.length !== 1) return;
  const rule = caretRules[0].value;
  if (rule.position !== 'absolute' || !rule.top || !rule.right || !rule.fontSize || !rule.color || rule.media ||
      rule.mediaMinWidth || rule.mediaMaxWidth) return;
  for (const p of ['position', 'top', 'right', 'fontSize', 'color']) {
    const value = canonicalStyle(rule)[p];
    if (Object.values(stages).some(s => canonicalStyle(s)[p] !== value)) return;
  }
  return { case: key, family: 'select', element: 'select-caret',
    reason: 'own-text ID is missing or duplicated on one side', referenceNodes: [], astylarNodes: [caret.key],
    attribution: 'reviewed-select-vector-to-glyph-substitution', classification: 'application-plugin-authoring-defect',
    inputEquivalent: false, finalRasterVerified: false,
    recommendedOwner: 'showcase select arrow content and vector/layout input translation',
    justification: 'The unique Material select arrow is a 24px SVG containing M7 10l5 5 5-5z under trigger/arrow wrappers. The candidate instead authors a presentation span containing U+25BC with an absolute-positioned font-size-dependent glyph. These are different content and layout inputs, not equivalent typography or evidence that core misrenders the original vector. Preserve both input paths and restore the vector/composition before assessing equal-input rendering; no screenshot or glyph font metrics can certify vector equivalence.',
    reviewEvidence: structuredClone({ sourceFinding: 'fixture-select-arrow-vector-to-glyph-substitution', revision: am[0].resolvedStyleRevision,
      referenceChain, candidate: { node: caret.key, parent: caret.parent, authored: caret.authored,
        shell: shell.authored, control: ac.authored, controlAncestry: ancestry, ...stages, rule } }) };
}

function isReviewedSelectArrowGap(gap, inventory) {
  if (gap.attribution !== 'reviewed-select-vector-to-glyph-substitution') return false;
  const expected = reviewedSelectArrowGap(gap.case, inventory);
  return !!expected && Object.entries(expected).every(([k, v]) => JSON.stringify(gap[k]) === JSON.stringify(v));
}

function validateSelectArrowSubstitutions(report, errors) {
  const inventory = report.elementInventory;
  const expected = [...new Set(inventory.cases.filter(c => c.side === 'astylar').map(c => c.case))]
    .map(key => reviewedSelectArrowGap(key, inventory)).filter(Boolean);
  const claimed = report.retainedTypography?.gaps.filter(g => g.attribution === 'reviewed-select-vector-to-glyph-substitution') ?? [];
  if (expected.length !== claimed.length || expected.some(e => {
    const matches = claimed.filter(g => g.case === e.case);
    return matches.length !== 1 || !isReviewedSelectArrowGap(matches[0], inventory);
  })) errors.push('select vector-to-glyph substitutions do not replay from captured content and style stages');
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
      ['reviewed-material-button-label', 'reviewed-material-tab-label', 'reviewed-material-calendar-day-label', 'reviewed-material-calendar-year-label', 'reviewed-material-snackbar-action-label', 'reviewed-material-bottom-sheet-item-label', 'reviewed-material-calendar-period-composition'].includes(item.mapping?.kind));
    const controlReferenceKeys = new Set(controlMappings.map((item) => item.referenceNode));
    const controlAstylarKeys = new Set(controlMappings.map((item) => item.astylarNode));
    controlTextMappings.push(...controlMappings.map((item) => ({ case: key, element: item.element,
      referenceNode: item.referenceNode, astylarNode: item.astylarNode, text: item.text,
      ...(item.referenceText !== undefined ? { referenceText: item.referenceText } : {}),
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
        const tabPanel = entry.family === 'tabs' && anonymousAstylar.length === 0 && reviewedPluginTabPanelGap(key, inventory);
        if (tabPanel && tabPanel.referenceNodes[0] === referenceNode) { gaps.push(tabPanel); continue; }
        const weekday = entry.family === 'datepicker' && anonymousAstylar.length === 0 && textMappings.find(m =>
          m.kind === 'reviewed-calendar-weekday-text' && m.reviewEvidence.omittedFullNameNode === referenceNode);
        if (weekday) {
          gap(key, undefined, reason, calendarWeekdayNameGap(weekday));
          continue;
        }
        const closeOmission = entry.family === 'datepicker' && anonymousAstylar.length === 0 &&
          reviewedCalendarCloseOmission(key, referenceNode, inventory);
        if (closeOmission) {
          gap(key, undefined, reason, { ...identity, ...calendarCloseGapAttribution(closeOmission) });
          continue;
        }
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
        const arrow = id === 'select-caret' && reviewedSelectArrowGap(key, inventory);
        if (arrow) { gaps.push(arrow); continue; }
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
      const inheritedFontStack = reviewedInheritedComponentFontStack(textMappingById.get(id), ref, ast, styles, referenceTree, astylarTree, inventory);
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
          const weekdayToken = reviewedCalendarWeekdayTypography(entry, textMappingById.get(id), property, ast, styles, referenceTree, astylarTree, inventory);
          differences.push({ case: key, family: entry.family, element: id, property, values,
            referenceNode: ref.key, astylarNode: ast.key, source: comparison.source, revision: comparison.revision,
            classification: 'parity-harness-defect', attribution: 'unresolved',
            recommendedOwner: 'input audit authored typography and core registry-stage attribution',
            justification: 'Browser computed and retained core text properties differ on directly mapped own-text nodes. Trace authored rules and resolution before assigning authoring or core fault; this is not proof of current pseudo-state paint.',
            ...(property === 'color' && headingMask ? headingMask : {}),
            ...(property === 'fontSize' && tableFont ? tableFont : {}),
            ...(property === 'fontSize' && treeFont ? treeFont : {}),
            ...(property === 'lineHeight' ? reviewedTreeLabelLineBox(entry, textMappingById.get(id), ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(property === 'textAlign' ? reviewedStepperNumberAlignment(entry, textMappingById.get(id), ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(property === 'textAlign' ? reviewedToggleButtonAlignment(entry, textMappingById.get(id), ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(reviewedStepperTextInput(entry, textMappingById.get(id), property, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {}),
            ...(property === 'fontSize' && floatingLabel ? floatingLabel : {}),
            ...(property === 'letterSpacing' ? reviewedFieldLabelTrackingInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(property === 'color' ? reviewedFieldLabelColorInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(property === 'color' ? reviewedSidenavColorInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(['fontSize', 'color'].includes(property) ? reviewedSortTypographyInput(entry, textMappingById.get(id), property, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(property === 'fontSize' ? reviewedExpansionFontInput(entry, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(controlLabelToken ?? {}),
            ...(selectValueToken ?? {}),
            ...(weekdayToken ?? {}),
            ...(!controlLabelToken && !selectValueToken && !weekdayToken ?
              reviewedOmittedComponentTextMetric(textMappingById.get(id), property, ref, ast, styles, referenceTree, astylarTree, inventory) ?? {} : {}),
            ...(property === 'fontFamily' && inheritedFontStack ? inheritedFontStack : {}),
            ...(reviewedHorizontalStartAlignment(property, values, referenceTree, ref, inventory) ?? {}),
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

function reviewedSnackbarActionControl(ref, referenceTree, astylarTree) {
  const hasClass = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);
  const unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  if (ref.type !== 'span' || !hasClass(ref, 'mdc-button__label') ||
      referenceTree.nodes.some(n => n.parent === ref.key) ||
      referenceTree.nodes.filter(n => n.key === ref.key).length !== 1) return;
  const chain = [ref];
  for (const [type, className] of [['button', 'mat-mdc-snack-bar-action'], ['div', 'mat-mdc-snack-bar-actions'],
    ['simple-snack-bar', 'mat-mdc-simple-snack-bar'], ['div'], ['div'], ['div', 'mat-mdc-snack-bar-label'],
    ['div', 'mat-mdc-snackbar-surface'], ['mat-snack-bar-container', 'mat-mdc-snack-bar-container'],
    ['div', 'cdk-overlay-pane'], ['div', 'cdk-global-overlay-wrapper'], ['div', 'cdk-overlay-container']]) {
    const node = unique(referenceTree.nodes.filter(n => n.key === chain.at(-1).parent));
    if (!node || node.type !== type || (className && !hasClass(node, className)) || node.ownText?.trim()) return;
    chain.push(node);
  }
  const [, parent, actions, simple, , live, , , container] = chain;
  if (chain.at(-1).parent !== null || !Object.hasOwn(parent.attributes, 'matsnackbaraction') ||
      !Object.hasOwn(actions.attributes, 'matsnackbaractions') || live.attributes?.['aria-live'] !== 'polite' ||
      !/^mat-snack-bar-container-live-\d+$/.test(live.attributes?.id ?? '') ||
      referenceTree.nodes.filter(n => n.type === 'mat-snack-bar-container').length !== 1 ||
      referenceTree.nodes.filter(n => n.type === 'simple-snack-bar').length !== 1 ||
      referenceTree.nodes.filter(n => hasClass(n, 'mat-mdc-snack-bar-action')).length !== 1 ||
      referenceTree.nodes.filter(n => n.parent === parent.key && hasClass(n, 'mdc-button__label')).length !== 1 ||
      referenceTree.nodes.filter(n => n.parent === actions.key).length !== 1) return;
  const message = unique(referenceTree.nodes.filter(n => n.parent === simple.key && n.type === 'div' &&
    hasClass(n, 'mat-mdc-snack-bar-label') && hasClass(n, 'mdc-snackbar__label') && Object.hasOwn(n.attributes, 'matsnackbarlabel')));
  if (!message?.ownText?.trim() || referenceTree.nodes.some(n => n.parent === message.key) ||
      referenceTree.nodes.filter(n => n.parent === simple.key).length !== 2) return;
  // State/message and component ancestry establish identity, not matching text
  // somewhere else in the page. Keep the replaced wrappers/roles as evidence.
  const id = 'snack-bar-dismiss';
  const candidate = unique(astylarTree.nodes.filter(n => n.authored?.id === id));
  if (!candidate || candidate.authored.type !== 'button' || candidate.authored.class !== 'overlay-dismiss' ||
      candidate.authored.value !== 'UNDO' || ref.ownText.trim() !== 'UNDO' ||
      astylarTree.nodes.some(n => n.parent === candidate.key)) return;
  const candidateChain = [candidate];
  for (const [type, nodeId] of [['div', 'snack-bar-surface'], ['div', 'snack-bar-overlay'], ['section', 'snack-bar-root'], ['main', 'page']]) {
    const node = unique(astylarTree.nodes.filter(n => n.authored?.id === nodeId));
    if (!node || node.authored.type !== type || node.key !== candidateChain.at(-1).parent) return;
    candidateChain.push(node);
  }
  const surface = candidateChain[1], overlay = candidateChain[2];
  const title = unique(astylarTree.nodes.filter(n => n.authored?.id === 'snack-bar-title'));
  if (candidateChain.at(-1).parent !== 'root' || surface.authored.class !== 'snack-surface' ||
      surface.authored.role !== 'status' || surface.authored.ariaLive !== 'polite' || surface.authored.ariaAtomic !== true ||
      overlay.authored.class !== 'snack-overlay' || !title || title.parent !== surface.key || title.authored.type !== 'span' ||
      message.ownText.trim() !== title.authored.textContent?.trim() ||
      astylarTree.nodes.some(n => n.parent === title.key) || astylarTree.nodes.filter(n => n.parent === surface.key).length !== 2) return;
  return { id, parent, evidence: {
    referenceChain: chain.map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: structuredClone(n.attributes) })),
    referenceContainer: container.key,
    referenceMessage: { key: message.key, parent: message.parent, text: message.ownText },
    candidateChain: candidateChain.map(n => ({ key: n.key, parent: n.parent, authored: structuredClone(n.authored) })),
    candidateMessage: { key: title.key, parent: title.parent, text: title.authored.textContent },
  } };
}

function reviewedCalendarCloseOmission(key, referenceNode, inventory) {
  if (!/^(static|interaction):datepicker@/.test(key) || inventory.errors.some(e => e.case === key)) return;
  const unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  const refCase = unique(inventory.cases.filter(c => c.case === key && c.side === 'reference'));
  const astCase = unique(inventory.cases.filter(c => c.case === key && c.side === 'astylar'));
  if (!refCase || !astCase || !Number.isInteger(astCase.resolvedStyleRevision)) return;
  const referenceTree = inventory.variants[refCase.variant], astylarTree = inventory.variants[astCase.variant];
  if (referenceTree.family !== 'datepicker' || astylarTree.family !== 'datepicker' ||
      astylarTree.resolvedStyleEvidenceVersion !== 2 || astylarTree.resolvedStyleSource !== 'core-style-inspection') return;
  const rn = referenceTree.nodes, an = astylarTree.nodes;
  if (new Set(rn.map(n => n.key)).size !== rn.length || new Set(an.map(n => n.key)).size !== an.length) return;
  const cls = (n, name) => String(n?.attributes?.class ?? '').split(/\s+/).includes(name);
  const leaf = unique(rn.filter(n => n.key === referenceNode));
  const button = unique(rn.filter(n => n.type === 'button' && cls(n, 'mat-datepicker-close-button')));
  const dialog = button && unique(rn.filter(n => n.key === button.parent && n.type === 'div' && cls(n, 'mat-datepicker-content-container')));
  const content = dialog && unique(rn.filter(n => n.key === dialog.parent && n.type === 'mat-datepicker-content' && cls(n, 'mat-datepicker-content')));
  const calendar = dialog && unique(rn.filter(n => n.parent === dialog.key && n.type === 'mat-calendar' && cls(n, 'mat-calendar')));
  if (!leaf || !button || !dialog || !content || !calendar || leaf.parent !== button.key || leaf.type !== 'span' ||
      !cls(leaf, 'mdc-button__label') || leaf.ownText?.trim() !== 'Close calendar' || rn.some(n => n.parent === leaf.key) ||
      button.attributes?.type !== 'button' || button.attributes.matbutton !== 'elevated' || !cls(button, 'mat-mdc-raised-button') ||
      button.attributes.disabled !== undefined || button.attributes['aria-hidden'] === 'true' || button.ownText?.trim() ||
      dialog.attributes.role !== 'dialog' || dialog.attributes['aria-modal'] !== 'true' || dialog.attributes.cdktrapfocus === undefined ||
      dialog.ownText?.trim() || content.ownText?.trim() ||
      JSON.stringify(rn.filter(n => n.parent === dialog.key).map(n => n.key)) !== JSON.stringify([calendar.key, button.key])) return;
  const descendants = (nodes, parent) => {
    const keys = new Set([parent]);
    for (let changed = true; changed;) {
      changed = false;
      for (const n of nodes) if (keys.has(n.parent) && !keys.has(n.key)) { keys.add(n.key); changed = true; }
    }
    return nodes.filter(n => keys.has(n.key));
  };
  const buttonTree = descendants(rn, button.key);
  if (buttonTree.some(n => n !== leaf && n.ownText?.trim()) ||
      buttonTree.filter(n => cls(n, 'mdc-button__label')).length !== 1) return;
  let context;
  for (const n of rn.filter(n => n.type === 'span' && cls(n, 'mat-calendar-body-cell-content'))) {
    context = reviewedCalendarCellControl(n, referenceTree, astylarTree) ?? reviewedCalendarCellControl(n, referenceTree, astylarTree, 'year');
    if (context) break;
  }
  if (!context || context.evidence.referenceChain.at(-1) !== dialog.key) return;
  const popup = unique(an.filter(n => n.authored?.id === 'datepicker-popup'));
  const header = unique(an.filter(n => n.authored?.id === 'datepicker-header'));
  const grid = unique(an.filter(n => n.key === context.evidence.candidateChain[1]));
  if (!popup || !header || !grid || popup.key !== context.evidence.candidateChain.at(-1) ||
      popup.authored.type !== 'div' || popup.authored.role !== 'dialog' || popup.authored.class !== 'datepicker-popup' ||
      header.parent !== popup.key || header.authored.type !== 'div' || grid.parent !== popup.key) return;
  const candidateTree = descendants(an, popup.key);
  const candidateIds = candidateTree.map(n => n.authored?.id);
  if (candidateIds.some(id => !id) || new Set(candidateIds).size !== candidateIds.length ||
      an.some(n => [n.authored?.value, n.authored?.textContent, n.authored?.ariaLabel, n.paintedControlText?.text]
        .some(text => typeof text === 'string' && /close\s+calendar/i.test(text)))) return;
  // Unknown controls are not silently declared absent or equivalent. Restrict
  // the observed popup to its original header, date/year buttons and spans.
  for (const n of candidateTree) {
    const a = n.authored;
    if (!['div', 'span', 'button'].includes(a.type) ||
        (a.role && !(n === popup && a.role === 'dialog'))) return;
    if (a.type !== 'button') continue;
    if (n.parent === header.key && ['datepicker-month', 'datepicker-previous', 'datepicker-next'].includes(a.id)) continue;
    if (n.parent === grid.key && /^datepicker-(?:day|year)-\d+$/.test(a.id) && /^\d+$/.test(a.value)) continue;
    return;
  }
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const referenceNodes = [leaf, ...buttonTree.filter(n => n !== leaf), dialog, content].map(n => ({
    key: n.key, parent: n.parent, type: n.type, attributes: n.attributes, text: n.ownText,
    computed: styleAt(n.style, 'reference'), rules: (n.rules ?? []).map(index => inventory.rules[index]),
  }));
  if (referenceNodes.some(n => !n.computed || n.rules.some(r => r?.side !== 'reference'))) return;
  return structuredClone({ sourceFinding: 'fixture-calendar-close-control-omitted', source: 'core-style-inspection',
    revision: astCase.resolvedStyleRevision, referenceNode, referenceControl: button.key, context: context.evidence,
    referenceNodes, referenceDialogChildOrder: [calendar.key, button.key],
    candidatePopup: popup.key, candidateSubtree: candidateTree.map(n => ({ key: n.key, parent: n.parent, authored: n.authored })),
    candidateMatchingControls: [], inputEquivalent: false, finalRasterVerified: false,
    computedClip: styleAt(button.style, 'reference').clip ?? null,
    focusRevealAndDismissalVerified: false,
    visibilityVerdict: 'not-established-by-structural-audit',
  });
}

function calendarCloseGapAttribution(reviewEvidence) {
  return { family: 'datepicker', classification: 'application-plugin-authoring-defect',
    attribution: 'reviewed-calendar-close-control-omission', inputEquivalent: false, finalRasterVerified: false,
    recommendedOwner: 'showcase calendar close control, focus reveal and dismissal semantics', reviewEvidence,
    justification: 'The reference close-button label belongs to the same captured calendar dialog and date/range context as the candidate popup. Its authored candidate subtree contains only header/date/year controls and no close counterpart. This omission is present in the fixture, not a core failure to paint an authored button. Material source exposes the close control on focus and closes on click; those transitions and computed clipping require separate live evidence. Escape/outside dismissal and an unfocused screenshot cannot establish equivalent controls, accessibility or rendering.' };
}

function isReviewedCalendarCloseGap(gap, inventory) {
  const control = gap.reason === 'Material control label lacks a unique reviewed leaf path and shared control identity';
  const retained = gap.reason === 'own-text nodes without an explicit shared ID require structural mapping';
  if ((!control && !retained) || (retained && (gap.referenceNodes?.length !== 1 || gap.astylarNodes?.length !== 0)) ||
      gap.family !== 'datepicker' || gap.element !== undefined ||
      gap.attribution !== 'reviewed-calendar-close-control-omission' || gap.classification !== 'application-plugin-authoring-defect' ||
      gap.inputEquivalent !== false || gap.finalRasterVerified !== false || !gap.justification || !gap.reviewEvidence) return false;
  const evidence = reviewedCalendarCloseOmission(gap.case, control ? gap.referenceNode : gap.referenceNodes[0], inventory);
  return !!evidence && JSON.stringify(evidence) === JSON.stringify(gap.reviewEvidence);
}

function reviewedCalendarPeriodControl(referenceTree, astylarTree, inventory) {
  const rn = referenceTree.nodes, an = astylarTree.nodes;
  const cls = (n, name) => String(n?.attributes?.class ?? '').split(/\s+/).includes(name);
  const unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  let context, yearView = false;
  for (const leaf of rn.filter(n => n.type === 'span' && cls(n, 'mat-calendar-body-cell-content'))) {
    context = reviewedCalendarCellControl(leaf, referenceTree, astylarTree);
    if (context) break;
    context = reviewedCalendarCellControl(leaf, referenceTree, astylarTree, 'year');
    if (context) { yearView = true; break; }
  }
  if (!context) return;
  const live = unique(rn.filter(n => n.key === context.evidence.referencePeriodLabel));
  const parent = unique(rn.filter(n => n.type === 'button' && cls(n, 'mat-calendar-period-button')));
  const label = parent && unique(rn.filter(n => n.parent === parent.key && n.type === 'span' && cls(n, 'mdc-button__label')));
  const ref = label && unique(rn.filter(n => n.parent === label.key && n.type === 'span' && n.attributes?.['aria-hidden'] === 'true'));
  const svg = label && unique(rn.filter(n => n.parent === label.key && n.type === 'svg' && cls(n, 'mat-calendar-arrow')));
  const polygon = svg && unique(rn.filter(n => n.parent === svg.key));
  const period = yearView ? context.evidence.period.replace(' to ', ' – ') : context.evidence.period;
  const glyph = yearView ? '▴' : '▾', candidateText = `${period} ${glyph}`;
  const accessibleName = yearView ? 'Choose date' : 'Choose month and year';
  if (!live || !parent || !label || !ref || !svg || !polygon || parent.parent !== live.parent ||
      parent.attributes['aria-label'] !== accessibleName || parent.attributes['aria-describedby'] !== live.attributes.id ||
      parent.ownText?.trim() || label.ownText?.trim() || ref.ownText?.trim() !== period ||
      rn.some(n => n.parent === ref.key) || rn.filter(n => n.parent === label.key).length !== 2 ||
      svg.attributes.viewBox !== '0 0 10 5' || svg.attributes['aria-hidden'] !== 'true' || svg.attributes.focusable !== 'false' ||
      cls(svg, 'mat-calendar-invert') !== yearView || svg.ownText?.trim() || polygon.type !== 'polygon' ||
      polygon.attributes?.points !== '0,0 5,5 10,0' || polygon.ownText?.trim() || rn.some(n => n.parent === polygon.key)) return;
  const descendants = new Set([parent.key]);
  for (let changed = true; changed;) {
    changed = false;
    for (const n of rn) if (descendants.has(n.parent) && !descendants.has(n.key)) { descendants.add(n.key); changed = true; }
  }
  if (rn.some(n => descendants.has(n.key) && n !== ref &&
      (n.ownText?.trim() || (['svg', 'polygon', 'path'].includes(n.type) && n !== svg && n !== polygon)))) return;
  const id = 'datepicker-month', ast = unique(an.filter(n => n.authored?.id === id));
  const header = unique(an.filter(n => n.authored?.id === 'datepicker-header'));
  if (!ast || !header || ast.parent !== header.key || header.parent !== context.evidence.candidateChain.at(-1) ||
      ast.authored.type !== 'button' || ast.authored.class !== `datepicker-month${yearView ? ' year-view' : ''}` ||
      ast.authored.ariaLabel !== accessibleName || ast.authored.ariaDescribedBy !== undefined || ast.authored.value !== candidateText ||
      an.some(n => n.parent === ast.key) || ast.paintedControlText?.source !== 'core-control-texture' ||
      ast.paintedControlText.text !== candidateText) return;
  const styleAt = (index, side) => inventory.styles[index]?.side === side ? inventory.styles[index].value : undefined;
  const referenceNodes = [parent, label, ref, svg, polygon, live].map(n => ({ key: n.key, parent: n.parent, type: n.type,
    attributes: structuredClone(n.attributes), text: n.ownText, style: styleAt(n.style, 'reference') }));
  const normal = styleAt(ast.normalStyle, 'astylar'), effective = styleAt(ast.interactionStyle, 'astylar');
  const painted = styleAt(ast.paintedControlText.style, 'astylar');
  if (referenceNodes.some(n => !n.style) || !normal || !effective || !painted || typeof painted.fontFamily !== 'string' ||
      !Number.isFinite(painted.fontSize) || painted.fontSize <= 0 ||
      canonicalStyle(referenceNodes[3].style).transform !== (yearView ? 'matrix(-1,0,0,-1,0,0)' : 'none')) return;
  return { parent, label, ref, id, candidateText, referenceText: period, evidence: structuredClone({
    sourceFinding: 'fixture-calendar-period-vector-flattened-into-text', context: context.evidence, yearView,
    referenceNodes, candidateNode: ast.key, candidateAuthored: ast.authored, candidateNormal: normal,
    candidateEffective: effective, candidatePaintedStyle: painted,
    content: { referenceText: period, referenceSvg: { viewBox: svg.attributes.viewBox, points: polygon.attributes.points,
      transform: referenceNodes[3].style.transform }, candidateText, appendedGlyph: glyph, inputEquivalent: false },
    accessibility: { referenceName: parent.attributes['aria-label'], candidateName: ast.authored.ariaLabel,
      referenceDescriptionId: parent.attributes['aria-describedby'], referenceDescription: live.ownText,
      candidateDescriptionId: ast.authored.ariaDescribedBy ?? null, descriptionInputsEquivalent: false },
  }) };
}

function reviewedCalendarPeriodPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'datepicker' || ast.authored.id !== 'datepicker-month' ||
      !['fontFamily', 'letterSpacing', 'color'].includes(property)) return;
  const mapping = reviewedCalendarPeriodControl(referenceTree, astylarTree, inventory);
  if (!mapping || mapping.ref !== ref || mapping.parent !== parent) return;
  const cssProperty = { fontFamily: 'font-family', letterSpacing: 'letter-spacing', color: 'color' }[property];
  const ruleAt = node => (node.rules ?? []).map(i => inventory.rules[i]).filter(r => r?.side === 'reference').map(r => r.value);
  const selector = property === 'color' ? '.mat-mdc-button:not(:disabled)' : '.mat-mdc-button';
  const token = property === 'color' ? 'var(--mat-button-text-label-text-color, var(--mat-sys-primary))'
    : property === 'fontFamily' ? 'var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font))'
      : 'var(--mat-button-text-label-text-tracking, var(--mat-sys-label-large-tracking))';
  const referenceRules = ruleAt(parent).filter(r => r.active === true && r.selector === selector && r.declarations?.[cssProperty]?.value === token);
  const parents = [mapping.label, parent];
  if (referenceRules.length !== 1 || parents.some(n => canonicalStyle(inventory.styles[n.style].value)[property] !== stages.reference[property]) ||
      [ref, mapping.label].some(n => ruleAt(n).some(r => r.active === true && (r.declarations?.font || r.declarations?.[cssProperty])) ||
        new RegExp(`(?:^|;)\\s*(?:font|${cssProperty})\\s*:`, 'i').test(n.attributes?.style ?? ''))) return;
  const candidateRules = astylarTree.rules.map(i => inventory.rules[i]).filter(r => r?.side === 'astylar').map(r => r.value);
  const headerRules = candidateRules.filter(r => r.selector === '.datepicker-month');
  if (headerRules.length !== 1 || headerRules[0].font !== undefined) return;
  const evidence = { sourceFinding: 'fixture-calendar-period-vector-flattened-into-text', referenceRule: referenceRules[0],
    referenceComputed: stages.reference[property], candidateRule: headerRules[0], candidateNormal: stages.normal[property] ?? null,
    candidateEffective: stages.effective[property] ?? null, candidatePainted: stages.painted[property] };
  let reason;
  if (property === 'fontFamily') {
    const resets = candidateRules.filter(r => r.selector === 'button, input, select' && canonicalStyle(r).fontFamily === stages.normal.fontFamily);
    if (resets.length !== 1 || headerRules[0].fontFamily !== undefined || stages.reference.fontFamily !== 'roboto' ||
        stages.normal.fontFamily !== 'roboto,arial,sans-serif' || stages.effective.fontFamily !== stages.normal.fontFamily ||
        stages.painted.fontFamily !== stages.normal.fontFamily) return;
    evidence.candidateResetRule = resets[0];
    reason = 'The reference period text inherits the Material text-button font token through its label wrapper. The candidate period-plus-triangle string instead uses the generic control font stack unchanged at paint. Text-owner correspondence does not make these font inputs or the appended glyph equivalent to the original text/vector composition.';
  } else if (property === 'letterSpacing') {
    const chain = candidateTypographyOmissionChain(ast, astylarTree, inventory, property);
    if (!chain || headerRules[0].letterSpacing !== undefined || stages.reference.letterSpacing !== '0.096px' || stages.painted.letterSpacing !== '0') return;
    evidence.candidateChain = chain;
    reason = 'The reference period text inherits .096px tracking from the Material text-button token. The candidate header rule and complete normal/effective ancestry omit tracking and the actual composite text texture receives zero. This is missing authored input, not an equal-input core tracking defect.';
  } else {
    const overrides = ruleAt(parent).filter(r => r.active === true && r.selector === '.mat-calendar-period-button' &&
      r.declarations?.['--mat-button-text-label-text-color']?.value === 'var(--mat-datepicker-calendar-period-button-text-color, var(--mat-sys-on-surface-variant))');
    if (overrides.length !== 1) return;
    evidence.referenceTokenOverride = overrides[0];
    if (canonicalStyle(headerRules[0]).color !== stages.normal.color || stages.effective.color !== stages.normal.color ||
        stages.painted.color !== stages.normal.color || stages.reference.color === stages.normal.color) return;
    reason = 'The reference period text inherits the calendar period-button on-surface-variant token; the candidate header explicitly substitutes fixed ink and supplies it unchanged to current text paint. This is unequal authored color, not a core conversion defect. SVG fill and glyph geometry remain distinct inputs in the composition evidence.';
  }
  return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-calendar-period-typography-input',
    recommendedOwner: 'showcase calendar period text/vector structure and Material tokens', justification: reason,
    reviewEvidence: structuredClone(evidence) };
}

function reviewedBottomSheetItemControl(ref, referenceTree, astylarTree) {
  const cls = (node, name) => String(node?.attributes?.class ?? '').split(/\s+/).includes(name);
  const unique = nodes => nodes.length === 1 ? nodes[0] : undefined;
  const rn = referenceTree.nodes, an = astylarTree.nodes;
  if (ref.type !== 'span' || !cls(ref, 'mdc-list-item__primary-text') || !cls(ref, 'mat-mdc-list-item-unscoped-content') ||
      rn.some(n => n.parent === ref.key) || rn.filter(n => n.key === ref.key).length !== 1) return;
  const chain = [ref];
  for (const [type, className] of [['span', 'mdc-list-item__content'], ['a', 'mat-mdc-list-item'],
    ['mat-nav-list', 'mat-mdc-nav-list'], ['mat-bottom-sheet-container', 'mat-bottom-sheet-container'],
    ['div', 'cdk-overlay-pane'], ['div', 'cdk-global-overlay-wrapper'], ['div', 'cdk-overlay-container']]) {
    const node = unique(rn.filter(n => n.key === chain.at(-1).parent));
    if (!node || node.type !== type || !cls(node, className) || node.ownText?.trim()) return;
    chain.push(node);
  }
  const [, , parent, list, container] = chain;
  if (list.attributes.role !== 'navigation' || list.attributes['aria-disabled'] !== 'false' ||
      container.attributes.role !== 'dialog' || container.attributes['aria-label'] !== 'Sharing options' ||
      chain.at(-1).parent !== null || rn.filter(n => n.type === 'mat-bottom-sheet-container').length !== 1 ||
      rn.filter(n => n.type === 'mat-nav-list').length !== 1) return;
  const items = rn.filter(n => n.parent === list.key), labels = [], contents = [];
  if (items.length !== 2) return;
  for (const item of items) {
    if (item.type !== 'a' || !cls(item, 'mat-mdc-list-item') || !Object.hasOwn(item.attributes, 'mat-list-item') ||
        item.attributes.href !== '#' || item.attributes['aria-disabled'] !== 'false' || item.ownText?.trim()) return;
    const content = unique(rn.filter(n => n.parent === item.key && n.type === 'span' && cls(n, 'mdc-list-item__content')));
    const label = content && unique(rn.filter(n => n.parent === content.key && n.type === 'span' &&
      cls(n, 'mdc-list-item__primary-text') && cls(n, 'mat-mdc-list-item-unscoped-content')));
    if (!label || content.ownText?.trim() || rn.filter(n => n.parent === content.key).length !== 1 ||
        rn.some(n => n.parent === label.key)) return;
    contents.push(content); labels.push(label);
  }
  if (labels[0].ownText?.trim() !== 'Share' || labels[1].ownText?.trim() !== 'Copy link') return;
  const index = labels.indexOf(ref);
  if (index < 0 || items[index] !== parent) return;
  const ids = ['bottom-sheet-dismiss', 'bottom-sheet-copy'];
  const candidates = ids.map(id => unique(an.filter(n => n.authored?.id === id)));
  if (candidates.some((n, k) => !n || n.authored.type !== 'button' || n.authored.class !== 'bottom-sheet-option' ||
      n.authored.value !== labels[k].ownText.trim() || an.some(child => child.parent === n.key))) return;
  const candidateChain = [candidates[index]];
  for (const [type, id] of [['section', 'bottom-sheet-panel'], ['div', 'bottom-sheet-overlay'],
    ['section', 'bottom-sheet-root'], ['main', 'page']]) {
    const node = unique(an.filter(n => n.authored?.id === id));
    if (!node || node.authored.type !== type || node.key !== candidateChain.at(-1).parent) return;
    candidateChain.push(node);
  }
  const panel = candidateChain[1], overlay = candidateChain[2];
  const candidateItems = an.filter(n => n.parent === panel.key);
  if (candidateChain.at(-1).parent !== 'root' || panel.authored.class !== 'bottom-sheet-panel' ||
      overlay.authored.role !== 'dialog' || overlay.authored.class !== 'modal-overlay bottom-sheet-overlay' ||
      candidateItems.length !== 2 || candidateItems.some((n, k) => n !== candidates[k])) return;
  return { parent, id: ids[index], evidence: {
    sourceFinding: 'fixture-bottom-sheet-list-structure-and-token-substitution', itemIndex: index,
    referenceChain: chain.map(n => ({ key: n.key, parent: n.parent, type: n.type, attributes: structuredClone(n.attributes) })),
    referenceItems: items.map((n, k) => ({ key: n.key, href: n.attributes.href, content: contents[k].key,
      label: labels[k].key, text: labels[k].ownText })),
    candidateChain: candidateChain.map(n => ({ key: n.key, parent: n.parent, authored: structuredClone(n.authored) })),
    candidateItems: candidates.map(n => ({ key: n.key, authored: structuredClone(n.authored) })),
    accessibleNames: { reference: container.attributes['aria-label'], candidate: overlay.authored.ariaLabel,
      inputEquivalent: container.attributes['aria-label'] === overlay.authored.ariaLabel },
    inputEquivalent: false,
  } };
}

function reviewedBottomSheetItemPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'bottom-sheet' || !reviewedBottomSheetItemControl(ref, referenceTree, astylarTree) ||
      !['fontFamily', 'lineHeight', 'letterSpacing', 'color'].includes(property)) return;
  const cssProperty = { fontFamily: 'font-family', lineHeight: 'line-height', letterSpacing: 'letter-spacing', color: 'color' }[property];
  const tokenPart = { fontFamily: 'font', lineHeight: 'line-height', letterSpacing: 'tracking' }[property];
  const token = property === 'color' ? 'var(--mat-list-list-item-label-text-color, var(--mat-sys-on-surface))'
    : `var(--mat-list-list-item-label-text-${tokenPart}, var(--mat-sys-body-large-${tokenPart}))`;
  const rules = (ref.rules ?? []).map(index => inventory.rules[index]).filter(r => r?.side === 'reference').map(r => r.value);
  const tokenRules = rules.filter(r => r.active === true && r.selector === '.mdc-list-item__primary-text' &&
    r.declarations?.[cssProperty]?.value === token);
  const candidateRules = astylarTree.rules.map(index => inventory.rules[index]).filter(r => r?.side === 'astylar').map(r => r.value);
  const itemRules = candidateRules.filter(r => r.selector === '.bottom-sheet-option');
  if (tokenRules.length !== 1 || itemRules.length !== 1 || itemRules[0].font !== undefined ||
      new RegExp(`(?:^|;)\\s*(?:font|${cssProperty})\\s*:`, 'i').test(ref.attributes?.style ?? '')) return;
  const focusColorToken = 'var(--mat-list-list-item-focus-label-text-color, var(--mat-sys-on-surface))';
  if (rules.some(r => r.active === true && r !== tokenRules[0] && (r.declarations?.font ||
      (r.declarations?.[cssProperty]?.value && !(property === 'color' &&
        r.selector === '.mdc-list-item:focus .mdc-list-item__primary-text' && r.declarations.color.value === focusColorToken))))) return;
  const evidence = { sourceFinding: 'fixture-bottom-sheet-list-structure-and-token-substitution',
    referenceRule: tokenRules[0], referenceControl: parent.key, referenceComputed: stages.reference[property],
    candidateRule: itemRules[0], candidateNormal: stages.normal[property] ?? null,
    candidateEffective: stages.effective[property] ?? null, candidatePainted: stages.painted[property] };
  let reason;
  if (property === 'fontFamily') {
    const resets = candidateRules.filter(r => r.selector === 'button, input, select' && canonicalStyle(r).fontFamily === stages.normal.fontFamily);
    if (resets.length !== 1 || itemRules[0].fontFamily !== undefined || stages.reference.fontFamily !== 'roboto' ||
        stages.normal.fontFamily !== 'roboto,arial,sans-serif' || stages.effective.fontFamily !== stages.normal.fontFamily ||
        stages.painted.fontFamily !== stages.normal.fontFamily) return;
    evidence.candidateResetRule = resets[0];
    reason = 'The nested Material list label receives its component font token. The flattened candidate value button omits that token and paints the generic control reset stack unchanged. This is different font input, not proof of different physical glyphs or core font selection.';
  } else if (property === 'color') {
    if (canonicalStyle(itemRules[0]).color !== stages.normal.color || stages.effective.color !== stages.normal.color ||
        stages.painted.color !== stages.normal.color || stages.reference.color === stages.normal.color) return;
    const focusRules = rules.filter(r => r.active === true && r.selector === '.mdc-list-item:focus .mdc-list-item__primary-text');
    if (focusRules.length > 1) return;
    evidence.referenceFocusRules = focusRules;
    reason = 'The reference list label retains its Material normal/focus on-surface tokens. The candidate option supplies theme.onSurface instead and the captured normal/effective/current paint stages retain that unequal color. Overlay token scope must match the actual reference, not an assumed page-theme color; no core color-conversion defect is established.';
  } else {
    const omission = candidateTypographyOmissionChain(ast, astylarTree, inventory, property);
    if (!omission || itemRules[0][property] !== undefined) return;
    if (property === 'letterSpacing' && (stages.reference.letterSpacing !== '0.496px' || stages.painted.letterSpacing !== '0')) return;
    if (property === 'lineHeight' && (stages.reference.lineHeight !== '24px' || stages.painted.fontSize !== stages.reference.fontSize ||
        !/^\d+(?:\.\d+)?px$/.test(stages.painted.lineHeight ?? '') || stages.painted.lineHeight === stages.reference.lineHeight)) return;
    evidence.candidateChain = omission;
    reason = property === 'lineHeight'
      ? 'The original list label explicitly receives the body-large 24px line-height token. The candidate option and its entire normal/effective ancestry omit line-height and actual control paint uses a different normal metric at the same font size. An explicit line-height was removed before rendering; this is not an equal-input proof against core normal-metric calculation.'
      : 'The original list label explicitly receives the body-large .496px tracking token. The candidate option rule and complete normal/effective ancestry omit tracking and actual control paint receives zero. This missing component input precedes renderer spacing calculation.';
  }
  return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-bottom-sheet-item-typography-input',
    recommendedOwner: 'showcase bottom-sheet list structure and Material label tokens', justification: reason,
    reviewEvidence: structuredClone(evidence) };
}

function reviewedSnackbarActionPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) {
  if (entry.family !== 'snack-bar' || !reviewedSnackbarActionControl(ref, referenceTree, astylarTree) ||
      !['fontFamily', 'letterSpacing', 'color'].includes(property)) return;
  const referenceParent = inventory.styles[parent.style];
  if (referenceParent?.side !== 'reference' || canonicalStyle(referenceParent.value)[property] !== stages.reference[property]) return;
  const cssProperty = { fontFamily: 'font-family', letterSpacing: 'letter-spacing', color: 'color' }[property];
  const rulesAt = node => (node.rules ?? []).map(index => inventory.rules[index])
    .filter(rule => rule?.side === 'reference').map(rule => rule.value);
  if (rulesAt(ref).some(rule => rule.active === true && (rule.declarations?.font ||
      (rule.declarations?.[cssProperty]?.value && rule.declarations[cssProperty].value !== 'inherit'))) ||
      new RegExp(`(?:^|;)\\s*(?:font|${cssProperty})\\s*:`, 'i').test(ref.attributes?.style ?? '')) return;
  const selector = property === 'color'
    ? '.mat-mdc-snack-bar-container .mat-mdc-button.mat-mdc-snack-bar-action:not(:disabled).mat-unthemed' : '.mat-mdc-button';
  const token = property === 'color' ? 'var(--mat-snack-bar-button-color, var(--mat-sys-inverse-primary))'
    : property === 'fontFamily' ? 'var(--mat-button-text-label-text-font, var(--mat-sys-label-large-font))'
      : 'var(--mat-button-text-label-text-tracking, var(--mat-sys-label-large-tracking))';
  const referenceRules = rulesAt(parent).filter(rule => rule.active === true && rule.selector === selector &&
    rule.declarations?.[cssProperty]?.value === token);
  const candidateRules = astylarTree.rules.map(index => inventory.rules[index])
    .filter(rule => rule?.side === 'astylar').map(rule => rule.value);
  const controlRules = candidateRules.filter(rule => rule.selector === '.overlay-dismiss');
  if (referenceRules.length !== 1 || controlRules.length !== 1 || controlRules[0].font !== undefined) return;
  const evidence = { sourceFinding: 'fixture-snackbar-action-typography-substitution',
    referenceRule: referenceRules[0], referenceParent: parent.key, referenceComputed: stages.reference[property],
    candidateRule: controlRules[0], candidateNormal: stages.normal[property] ?? null,
    candidateEffective: stages.effective[property] ?? null, candidatePainted: stages.painted[property] };
  let reason;
  if (property === 'fontFamily') {
    const resets = candidateRules.filter(rule => rule.selector === 'button, input, select' &&
      canonicalStyle(rule).fontFamily === stages.normal.fontFamily);
    if (resets.length !== 1 || controlRules[0].fontFamily !== undefined || stages.reference.fontFamily !== 'roboto' ||
        stages.normal.fontFamily !== 'roboto,arial,sans-serif' || stages.effective.fontFamily !== stages.normal.fontFamily ||
        stages.painted.fontFamily !== stages.normal.fontFamily) return;
    evidence.candidateResetRule = resets[0];
    reason = 'The reference action uses the Material text-button font token; the candidate overlay-dismiss leaves it out and supplies the generic control reset stack unchanged to current texture paint. This is unequal authored font input, not proof of different physical glyphs or a core font-selection defect.';
  } else if (property === 'letterSpacing') {
    const chain = candidateTypographyOmissionChain(ast, astylarTree, inventory, property);
    if (!chain || controlRules[0].letterSpacing !== undefined || stages.reference.letterSpacing !== '0.096px' ||
        stages.painted.letterSpacing !== '0') return;
    evidence.candidateChain = chain;
    reason = 'The reference action and label compute .096px from the Material tracking token. The candidate control rule and complete normal/effective ancestry omit tracking and actual texture paint receives zero. The missing component input is not a demonstrated core tracking defect.';
  } else {
    if (canonicalStyle(controlRules[0]).color !== stages.normal.color || stages.effective.color !== stages.normal.color ||
        stages.painted.color !== stages.normal.color || stages.reference.color === stages.normal.color) return;
    reason = 'The reference action uses the snackbar inverse-primary token. The candidate overlay-dismiss explicitly substitutes theme.primary and supplies that unequal ink unchanged to normal/effective/current paint. The captured declaration and values establish authoring inequality, not a renderer color-conversion defect; no theme-specific RGB value is assumed.';
  }
  return { classification: 'application-plugin-authoring-defect', attribution: 'reviewed-snackbar-action-typography-input',
    recommendedOwner: 'showcase snackbar action Material token translation', justification: reason,
    reviewEvidence: structuredClone(evidence) };
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
    const calendarPeriod = entry.family === 'datepicker' ? reviewedCalendarPeriodControl(referenceTree, astylarTree, inventory) : undefined;
    const buttonLabelNodes = referenceTree.nodes.filter((node) => node.type === 'span' &&
      String(node.attributes?.class ?? '').split(/\s+/).includes('mdc-button__label') && node !== calendarPeriod?.label);
    const tabLabelNodes = entry.family === 'tabs' ? referenceTree.nodes.filter((node) => node.type === 'span' &&
      ['tab-overview', 'tab-activity'].includes(node.attributes?.id)) : [];
    const calendarLabelNodes = entry.family === 'datepicker' ? referenceTree.nodes.filter((node) => node.type === 'span' &&
      String(node.attributes?.class ?? '').split(/\s+/).includes('mat-calendar-body-cell-content')) : [];
    const bottomSheetLabelNodes = entry.family === 'bottom-sheet' ? referenceTree.nodes.filter(node => node.type === 'span' &&
      String(node.attributes?.class ?? '').split(/\s+/).includes('mat-mdc-list-item-unscoped-content')) : [];
    const labelNodes = [...buttonLabelNodes, ...tabLabelNodes, ...calendarLabelNodes, ...bottomSheetLabelNodes,
      ...(calendarPeriod ? [calendarPeriod.ref] : [])];
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
      const snackbar = entry.family === 'snack-bar' ? reviewedSnackbarActionControl(ref, referenceTree, astylarTree) : undefined;
      const bottomSheetLabel = bottomSheetLabelNodes.includes(ref);
      const bottomSheet = bottomSheetLabel ? reviewedBottomSheetItemControl(ref, referenceTree, astylarTree) : undefined;
      const periodLabel = calendarPeriod?.ref === ref;
      const closeOmission = entry.family === 'datepicker' && reviewedCalendarCloseOmission(key, ref.key, inventory);
      if (closeOmission) {
        gaps.push({ case: key, referenceNode: ref.key,
          reason: 'Material control label lacks a unique reviewed leaf path and shared control identity',
          ...calendarCloseGapAttribution(closeOmission) });
        continue;
      }
      const parents = periodLabel ? [calendarPeriod.parent] : bottomSheetLabel ? [bottomSheet?.parent].filter(Boolean) : calendarLabel ? [calendar?.parent].filter(Boolean) : tabLabel ? [reviewedTabLabelControl(ref, referenceTree)].filter(Boolean)
        : referenceTree.nodes.filter((node) => node.key === ref.parent && node.type === 'button');
      const parent = parents.length === 1 ? parents[0] : undefined;
      const id = periodLabel ? calendarPeriod.id : bottomSheetLabel ? bottomSheet?.id : calendarLabel ? calendar?.id : tabLabel ? ref.attributes.id : snackbar?.id || parent?.attributes?.id || parent?.attributes?.['data-parity-id'];
      const astNodes = astylarTree.nodes.filter((node) => id && node.authored?.id === id);
      const referenceOwners = referenceTree.nodes.filter((node) => id &&
        (node.attributes?.id === id || node.attributes?.['data-parity-id'] === id));
      if (!parent || !id || (!periodLabel && !calendarLabel && !snackbar && !bottomSheet && referenceOwners.length !== 1) || astNodes.length !== 1 || astNodes[0].authored.type !== 'button' ||
          (tabLabel && (astNodes[0].authored.role !== 'tab' || !String(astNodes[0].authored.class ?? '').split(/\s+/).includes('tab'))) ||
          referenceTree.nodes.filter((node) => node.key === ref.key).length !== 1 ||
          (!periodLabel && !tabLabel && !calendarLabel && !bottomSheetLabel && buttonLabelNodes.filter((node) => node.parent === parent.key).length !== 1) ||
          referenceTree.nodes.some((node) => node.parent === ref.key) || parent.ownText?.trim()) {
        gap(key, id, 'Material control label lacks a unique reviewed leaf path and shared control identity', { referenceNode: ref.key }); continue;
      }
      const ast = astNodes[0], paint = ast.paintedControlText;
      if (mapped.has(ast.key)) { gap(key, id, 'multiple labels map to the same control'); continue; }
      mapped.add(ast.key);
      const authoredText = ast.authored.value ?? ast.authored.textContent;
      const expectedPaintText = periodLabel ? calendarPeriod.candidateText : ref.ownText?.trim();
      if (!ref.ownText?.trim() || expectedPaintText !== String(authoredText ?? '').trim() ||
          expectedPaintText !== paint?.text?.trim()) {
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
        ...(periodLabel ? { referenceText: calendarPeriod.referenceText } : {}),
        mapping: periodLabel ? { kind: 'reviewed-material-calendar-period-composition', reviewEvidence: calendarPeriod.evidence,
          justification: 'The reviewed date/range context anchors the period text and its adjacent explicit SVG triangle. The candidate paints the same period prefix plus an appended triangle glyph in one control texture. The full candidate text is preserved, not stripped or equated to reference text; the text/vector substitution and accessibility-description inputs remain explicit. Typography compares the common period text using the actual single-font texture inputs, without claiming equal glyph geometry, run width, wrappers, state, placement or raster.' }
          : bottomSheet ? { kind: 'reviewed-material-bottom-sheet-item-label', reviewEvidence: bottomSheet.evidence,
          justification: 'A unique two-item Material navigation list in the bottom-sheet overlay contains the ordered Share/Copy link anchor/content/label paths. The unique candidate panel contains corresponding ordered value buttons. This maps text owners only; replacing anchors and nested wrappers with buttons is unequal input, and dialog names, navigation/dismissal behavior, overflow, typography, placement and raster remain independent audit obligations.' }
          : snackbar ? { kind: 'reviewed-material-snackbar-action-label', reviewEvidence: snackbar.evidence,
          justification: 'The unique snackbar action/label path is anchored to the captured Material overlay and its sibling message; the unique candidate action is anchored to its surface, overlay and matching sibling message. This establishes current text-owner correspondence only. Wrapper composition, live-region semantics, styles, state, placement and raster are not certified equivalent.' }
          : calendarYear ? { kind: 'reviewed-material-calendar-year-label', reviewEvidence: calendar.evidence,
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
              reviewedSnackbarActionPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ??
              reviewedBottomSheetItemPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ??
              reviewedCalendarPeriodPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ??
              reviewedCalendarCellPaintInput(entry, property, ref, parent, ast, stages, referenceTree, astylarTree, inventory) ?? {}),
            ...(reviewedHorizontalStartAlignment(property, values, referenceTree, ref, inventory) ?? {}) });
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
  return { schemaVersion: 1, scope: 'Current core-owned control texture inputs, separately from normal/effective declarations and registry-retained text. Exact direct Material button labels, explicit template tab-label paths, month-view day paths with full date context, multi-year table paths with matching year-range context, snackbar action paths anchored by overlay/message context, and ordered bottom-sheet list-label/value-button correspondence are reviewed. The bottom-sheet anchor/button structures and accessible names remain explicitly unequal. Calendar period typography compares the shared text prefix in a single-font texture while preserving the full unequal text-plus-glyph string, original adjacent SVG geometry, and accessibility-description inputs. Paginator and calendar navigation SVG-to-glyph substitutions are separately classified unequal content, never typography equivalence; calendar year-view accessible-name mismatches remain explicit. Other observed control owners remain gaps. Numeric parsed CSS lengths and line-height multipliers are normalized without authored or projected fallbacks. Other effects remain in the full inventory and are not certified by these eleven typography comparisons.', comparisons, differences, gaps, iconSubstitutions };
}

const referenceContextProperties = Object.freeze(['direction', 'writingMode', 'unicodeBidi', 'textAlign',
  'textAlignLast', 'textJustify', 'clip', 'fontKerning', 'textRendering',
  'fontVariantLigatures', 'fontFeatureSettings', 'fontVariationSettings']);

function collectReferenceContextGaps(inventory) {
  const gaps = [];
  for (const mapping of inventory.cases.filter(entry => entry.side === 'reference')) {
    const tree = inventory.variants[mapping.variant];
    const gap = (reason, detail = {}) => gaps.push({ case: mapping.case, side: 'reference', ...detail, reason,
      classification: 'parity-harness-defect', owner: 'browser computed text-context and clipping capture' });
    if (tree?.contextStyleEvidenceVersion !== 1 ||
        JSON.stringify(tree.contextStyleProperties) !== JSON.stringify(referenceContextProperties)) {
      gap('capture lacks the exact computed-context property/version declaration');
      continue;
    }
    for (const node of tree.nodes) {
      const observations = [{ style: node.style }, ...(node.pseudoElements ?? []).filter(p => p.generated)];
      for (const observation of observations) {
        const pooled = inventory.styles[observation.style];
        for (const property of referenceContextProperties) {
          if (pooled?.side !== 'reference' || typeof pooled.value?.[property] !== 'string' || !pooled.value[property].trim()) {
            gap('computed context field was not observed', { node: node.key, property,
              ...(observation.pseudo ? { pseudo: observation.pseudo } : {}) });
          }
        }
      }
    }
  }
  return gaps;
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
        ruleEvidenceComplete: Array.isArray(tree.rules) && Array.isArray(tree.errors),
        resolvedStyleSource: tree.resolvedStyleSource,
        ...(side === 'reference' ? { contextStyleEvidenceVersion: tree.contextStyleEvidenceVersion,
          contextStyleProperties: tree.contextStyleProperties } : {}),
        paintedControlTextEvidenceVersion: tree.paintedControlTextEvidenceVersion, nodes, rules: ruleMap }, variants, variantIds);
      mappings.push({ case: key, side, variant, resolvedStyleRevision: tree.resolvedStyleRevision });
    }
  }
  const inventory = {
    schemaVersion: 1,
    scope: 'All authored Astylar nodes, reference frame/overlay DOM descendants, SVG attributes, and before/after pseudo-elements. Tables retain raw inputs; presence in the inventory is not acceptance of equivalence.',
    styles, rules, variants, cases: mappings, gaps, resolvedStyleGaps, stateStyleGaps, envelopes, errors,
  };
  return { ...inventory, referenceContextGaps: collectReferenceContextGaps(inventory) };
}

export function collectSupplementalBehavior(root, options = {}) {
  return collectSupplementalReport(root, options, 'picker-commit-audit', 'scripts/audit-material-picker-commits.mjs', summarizeSupplementalBehavior);
}

export function collectSupplementalOverlays(root, options = {}) {
  return collectSupplementalReport(root, options, 'overlay-breakpoint-audit', 'scripts/audit-material-overlay-breakpoints.mjs', summarizeSupplementalOverlays);
}

export function collectSupplementalSlider(root, options = {}) {
  return collectSupplementalReport(root, options, 'slider-domain-audit', 'scripts/audit-material-slider-domain.mjs', summarizeSupplementalSlider);
}

function collectSupplementalReport(root, options, directory, script, summarize) {
  const absolute = path.resolve(root, options.supplementalRoot ?? 'artifacts/material-parity', directory, 'latest-report.json');
  const file = path.relative(root, absolute).replaceAll('\\', '/');
  if (!existsSync(absolute)) return { file, binding: { status: 'missing', errors: [] }, ...summarize({}) };
  const contents = readFileSync(absolute), raw = JSON.parse(contents);
  const summary = summarize(raw);
  const binding = validateSupplementalCapture(raw, { root, reportFile: file, expectedProvenance: options.expectedProvenance,
    script, styleProperties: Object.values(propertyGroups).flat() });
  return { file, sha256: createHash('sha256').update(contents).digest('hex'), ...summary, binding,
    ...(raw.capture ? { capture: raw.capture } : {}),
    errors: [...summary.errors, ...binding.errors] };
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
    viewport: { ...raw.viewport, deviceScaleFactor: raw.deviceScaleFactor, id: 'supplemental-desktop-dpr1' },
    inputTrees: { reference: entry.reference?.inputTree, astylar: entry.astylar?.inputTree } }));
  const keys = cases.map((entry) => `${entry.family}/${entry.state}`);
  const errors = cases.flatMap((entry) => ['reference', 'astylar'].flatMap((side) =>
    (entry[side]?.errors ?? ['missing side']).map((error) => ({ case: `${entry.family}/${entry.state}`, side, error }))));
  for (const key of keys) if (!required.includes(key)) errors.push({ case: key, error: 'unexpected supplemental behavior case' });
  if (raw.capture && (raw.profile !== 'light' || raw.deviceScaleFactor !== 1 || raw.viewport?.width !== 1440 || raw.viewport?.height !== 900)) {
    errors.push({ error: 'unexpected captured picker environment' });
  }
  if (new Set(keys).size !== keys.length) errors.push({ error: 'duplicate supplemental behavior case' });
  return { browser: raw.browser, cases,
    missing: required.filter((key) => !keys.includes(key)), errors,
    mismatches: cases.filter((entry) => !entry.matches && !errors.some(error => !error.case || error.case === `${entry.family}/${entry.state}`))
      .map((entry) => ({ family: entry.family, state: entry.state,
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
    'src/app/services/dom/dom-ancestry.service.ts',
    'src/app/config/browser-defaults.ts',
    'src/app/services/dom/elements/element-border.service.ts',
    'src/app/services/babylon-mesh.service.ts',
    'examples/material-showcase/src/app/border-color-input-audit.spec.ts',
    'src/app/services/dom/elements/overflow-clip.service.ts',
    'src/app/services/dom/elements/overflow-clip.service.spec.ts',
    'src/lib/astylar-scroll-runtime.ts',
    'src/lib/astylar-scroll-runtime.spec.ts',
    'src/app/services/dom/elements/element-dimension.service.ts',
    'src/app/services/dom/elements/element-creation.service.ts',
    'src/app/services/dom/elements/css-transform.ts',
    'src/app/services/dom/elements/element-material.service.ts',
    'src/app/services/dom/input/button.manager.ts',
    'src/app/services/text/text-style-parser.service.ts',
    'src/app/services/text/text-canvas-renderer.service.ts',
    'src/app/types/style-rule.ts',
    'examples/material-showcase/src/app/astylar.component.ts',
    'examples/material-showcase/src/app/material-input-evidence.ts',
    'examples/material-showcase/src/app/normal-line-height-audit.spec.ts',
    'examples/material-showcase/src/app/normal-letter-spacing-audit.spec.ts',
    'examples/material-showcase/src/app/label-cascade-input-audit.spec.ts',
    'examples/material-showcase/angular.json',
    'examples/material-showcase/src/app/reference.component.ts',
    'examples/material-showcase/node_modules/@angular/material/fesm2022/datepicker.mjs',
    'examples/material-showcase/src/app/theme.ts',
    'examples/material-showcase/src/app/showcase.store.ts',
    'examples/material-showcase/src/styles.scss',
    'examples/material-showcase/src/app/material-plugin/material-showcase.plugin.ts',
    'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts',
    'examples/material-showcase/src/app/material-plugin/material-ripple.controller.ts',
    'tests/material-parity/benchmark.config.mjs',
    'tests/material-parity/run-material-parity.mjs',
    'tests/material-parity/input-tree-evidence.mjs',
    'tests/material-parity/input-tree-evidence.spec.mjs',
    'tests/material-parity/input-equivalence-audit.mjs',
    'tests/material-parity/input-equivalence-audit.spec.mjs',
    'tests/material-parity/input-equivalence-policy.mjs',
    'tests/material-parity/border-initial-input-evidence.mjs',
    'tests/material-parity/normal-line-box-report.mjs',
    'tests/material-parity/normal-line-box-evidence.mjs',
    'scripts/audit-material-normal-line-boxes.mjs',
    'scripts/audit-material-button-defaults.mjs',
    'scripts/audit-material-outline-inputs.mjs',
    'scripts/audit-material-chip-inputs.mjs',
  ];
  return files.map((file) => ({ file, sha256: createHash('sha256')
    .update(readFileSync(path.resolve(root, file), 'utf8').replace(/\r\n/g, '\n')).digest('hex') }));
}

function focusedProofInventory(root) {
  return [
    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\('browser pseudo outline/,
      'pseudo outline versus host border keeps distinct box-model ownership', 'At DPR 1 and 2, selected and unselected browser controls retain the same 100x32 outer box. Moving the unselected 1px pseudo outline onto the border-box host shrinks its child by 2px and shifts it 1px. The full-tree collector must keep generated styles/rules on the pseudo rather than on the host. This isolates unequal browser inputs, not a core rendering failure or full chip parity.'),
    proof(root, 'scripts/audit-material-chip-inputs.mjs', /const expected =/,
      'all checkpoint-bound chip outline owners and states', 'Requires every configured chip case, verifies record/tree digests, and preserves reference host, action and generated-outline styles plus actual pseudo rules and all three candidate core style stages. The 152 observations demonstrate structural outline relocation and token substitution; no host/pseudo alias or visual equality is inferred.'),
    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\('outline token attribution requires/,
      'capture-backed outline token attribution with side, conflict and replay guards', 'The exact active serialized token declaration must agree with its pending longhands and the separately captured shared-ID snapshot. Complete candidate author rules must contain the literal without any possibly applicable competing color/reset; all three current core stages and relevant 1px solid border sides must agree. Tests reject 36 conflicting or incomplete captures, forged report evidence and the use of only twelve displayed samples for fourteen reviewed states. This is classified unequal input, not a core paint or whole-component equivalence claim.'),
    proof(root, 'scripts/audit-material-outline-inputs.mjs', /const targets =/,
      'twelve unchanged Material outline/divider observations in eight paired pages', 'All four profiles compute RGB 123,117,127 from the active original token rule; the component token is absent and its fallback remains light-dark(#7b757f, #958e99). Candidate outlined-button, toggle-group and second-toggle rules explicitly supply #79747e at normal/effective/interaction stages. Separate source findings account for the three locations and history. This supplemental producer binds actual served bytes and full trees to the selected checkpoint; it does not automatically attribute every matrix state or prove equal-input core paint.'),
    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\('browser outline token/,
      'eighteen browser token, override and literal input controls', 'Three border shorthand forms across light/dark color schemes preserve their authored variable expression while expanded color fields serialize empty. Computed borders follow the inherited light-dark token or component override; literal borders do not. The full-tree collector preserves cssText and computed values. These controls prevent empty pending longhands from being called omitted inputs; they do not implement a JS cascade or establish core var/light-dark support.'),
    proof(root, 'tests/material-parity/input-equivalence-audit.spec.mjs', /test\('browser border reset/,
      'twelve browser border-reset sensitivity controls', 'Two authored colors and ordinary div/native button controls distinguish border:none from border-width:0 after a preexisting colored solid border. The reset changes style and color to none/currentColor while width-only preserves both; explicit equivalent longhands reproduce the reset. This establishes input semantics, not a core or final-raster pass. Captured Material button classifications additionally require their complete author/reset, no-animation and three core style-stage witnesses.'),
    proof(root, 'examples/material-showcase/src/app/border-color-input-audit.spec.ts', /describe\('Material input audit/,
      'ten equal-input browser reductions; two pass and eight honest failures are retained', 'Two explicit opaque-color controls pass. Omitted border color resolves to transparent rather than browser currentColor and paints black. Explicit currentColor paints fixed fallback RGB 51,51,77. Transparent and half-alpha inputs reach the bound border material with alpha 1 and incorrect framebuffer pixels. Ten independent mounts preserve authored inputs and dispose all owned resources. This separates the documented default difference from core contextual-color and alpha-paint gaps; it does not automatically classify showcase occurrences, prove geometry or claim a paired full-screen raster comparison.'),
    proof(root, 'tests/material-parity/input-tree-evidence.spec.mjs', /test\('browser omitted overflow/,
      'nine browser initial, mixed-axis and ancestor-clipping observations', 'Omitted and visible overflow have the same visible/visible computed axes, outside-box hit reachability and zero programmatic scroll. Hidden/clip/auto/scroll remain distinct. A visible axis computes auto beside hidden; a visible child can still be clipped by its ancestor. These controls justify only paired-axis initial-value representation, never whole-node visibility or mixed-axis equivalence.'),
    proof(root, 'src/app/services/dom/elements/overflow-clip.service.spec.ts', /it\('omitted and visible overflow/,
      'core omitted/visible clipping branch and eleven ordinary element defaults', 'Both inputs bypass clip-plane creation and CSS-to-render projection. Core ordinary element defaults actually omit overflow. This is a NullEngine owner-boundary proof, not final WebGL raster or general overflow conformance.'),
    proof(root, 'src/lib/astylar-scroll-runtime.spec.ts', /it\('omitted and visible overflow/,
      'core omitted/visible/auto/scroll registration and consumption controls', 'Omitted and visible inputs create no scroll container and do not consume scroll; auto/scroll create a container and consume scroll, with scrollbar meshes only for scroll. This does not accept hidden as clip or infer full browser scrolling conformance.'),
    proof(root, 'examples/material-showcase/src/app/label-cascade-input-audit.spec.ts', /describe\('Material input audit/,
      'four browser reductions preserve the a1968ed update-only failure contract', 'Identical color declarations and label/span trees pass on fresh mounts in both source orders. The original equivalent-update run failed two cases because normal/effective inspection lost descendant rules while retained text stayed browser-correct. The core query-context repair must pass the unchanged assertions after repacking; original capture evidence is not rewritten. Core tests additionally cover hidden descendants, sibling rules, inherited cursor, semantic-only reuse, active pseudo sources, resource stability, and nested/error context restoration. This is inspection evidence, not a final glyph-raster claim.'),
    proof(root, 'scripts/audit-material-button-defaults.mjs', /CSS.getMatchedStylesForNode/,
      'two reference/candidate label pairs and eight browser default controls pass', 'Read-only CDP identifies user-agent text-align:center on the original light-profile native buttons, inherited by inline-block labels. Candidate flex divs replace those buttons and their spans retain left. Blank-document button/div/role-button/button-inherit controls distinguish tag defaults from inheritance and author overrides. This is evidence of different inputs, not a core or raster equivalence proof; the full per-case classification separately requires its captured structure, styles and ancestry.'),
    proof(root, 'examples/material-showcase/src/app/normal-letter-spacing-audit.spec.ts', /describe\('Material audit/,
      'six real-browser reductions; five pass and one independent advance failure is retained', 'All six normal/zero pairs have identical DOM Range widths, parsed core tracking zero, CSS texture dimensions and actual bound texture bytes. Explicit 2px increases both widths. Local Roboto and Arial numeric/action controls pass. Arial office AV fails equal-input advance by 0.882825px under both normal and zero: DOM 61.671875px, bound texture 62.5547px. An independent canvas probe reproduces the core width with fontKerning:auto and the DOM width with fontKerning:normal; none yields 64.03125px. This isolates an additional shaping/default-context discrepancy, not a tracking-alias defect or permission to change fixture tracking. No final screen raster claim or universal forced-kerning remedy is inferred.'),
    proof(root, 'examples/material-showcase/src/app/material-plugin/tab-panel-input-audit.spec.ts', /describe\('Material input audit/,
      'one real-browser characterization passes across three independent surface mounts', 'Actual fillText calls are observed only on the texture bound to the private tab-panel content plane. CSS font sizes 24px and 30px both paint with a 32px texture font when plugin font-size is 16; changing only plugin font-size to 20 paints at 40px. The 2x backing texture stays 480 by 96, ink follows data #ff0000 instead of CSS #123456, and the baseline follows the plugin formula. This confirms competing plugin typography, not a core equal-input failure. Font asset warnings prevent any claim about the selected physical font; glyph sharpness, final baseline alignment and complete matrix paint provenance remain separate obligations.'),
    proof(root, 'scripts/audit-material-normal-line-boxes.mjs', /const targets =/,
      '120 validated static natural-line-box observations across 96 cases; scope-limited stage evidence', 'Pinned browser assets, text, typography, viewport/DPR and paired checkpoint trees bind a supplemental natural reference line box to each mapped static label. The measured scalar matches current core paint for these observations; font-list, tracking and disabled-ink substitutions remain independently classified. No universal normal-line-height rule, input-equivalence or final raster claim is inferred.'),
    proof(root, 'examples/material-showcase/src/app/normal-line-height-audit.spec.ts', /describe\('Material audit/,
      'nine browser reductions; five pass and four diagnostic failures are retained', 'Equal typography compares actual core control paint and bound-texture CSS height with a natural single-line DOM block, not the fixed button container or a guessed normal multiplier. Local Roboto 14px normal/omitted, 17.5px normal, and explicit 21px/1.5 controls pass. Arial 16px and serif 20px normal are one pixel too short; Roboto 14px containing emoji or CJK fallback glyphs is two pixels too short. Repeated after fixing test-only local font asset serving. This confirms a core normal-metrics defect without assigning it to every Material occurrence or claiming final glyph raster parity.'),
    proof(root, 'scripts/audit-material-picker-commits.mjs', /select day 1/,
      'supplemental diagnostic; known mismatches recorded in investigation', 'Real pointer selection of a date/time reaches the correct candidate target but does not commit a value or close the popup. This case supplements, rather than replaces, the unfiltered maintained matrix.'),
    proof(root, 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts', /describe\('Material audit/,
      'fifty-one executable browser reductions; twenty-five pass and twenty-six diagnostic failures are retained', 'Twelve flex-text extensions add four passing single-item line-box-centering controls, four passing explicit-span flow controls, and four failing anonymous-text row/column start/center flows; exact case evidence is recorded separately below. Eight original reductions pass: toolbar, stepper, content-derived flex height, calendar span, bottom overlay, table cells, inherited text stage, and positioned drawer geometry. Floating-label untransformed, literal-translation, default-origin scaling, and translate-then-scale controls also pass. Both value/textContent control texture inspections, the Arial explicit-generic font-list control, and unavailable-family serif/sans-serif text-width controls pass. The single-family Arial paint-input preservation case fails because core appends Arial, Helvetica, sans-serif. An unavailable single family also fails actual bound-texture CSS advance versus browser Range width by 3.734875px, confirming observable fallback semantics without claiming final glyph raster or the exact chosen font. Percentage translation, top-left origin scaling, their combination, reversed scale/translate order, and repeated-translation composition fail. Transform-origin is deliberately preserved as original CSS diagnostic input outside the current public StyleRule subset; order/repetition controls use only existing functions and default origin. Fifteen earlier failures remain: divider empty-block height; two direct-calc grid-list limitations; two literal grid-list and two plain opposing-inset height cases; two loaded-CSS grid-list cases with correct expression resolution but wrong inner auto height; four inline/inline-block intrinsic parent-width cases; and two absolute-margin cases. Inline fragment vertical bounds are not equated to core text planes. Retained typography is not current-paint proof; geometry is not glyph/border raster, scrolling, or full Material composition evidence. Consult the investigation for exact commands and limits.'),
    proof(root, 'examples/material-showcase/src/app/input-equivalence-proof.spec.ts', /direct flex text line box is centered without a wrapper/,
      'twelve flex-text reductions; eight pass and four equal-input failures are retained', 'Single direct text centers correctly in 48px/80px rows with normal/20px line-height; this observes current text-plane placement, not natural used height or glyph raster. Mixed direct text plus a marker fails in both row/column and start/center flow, while explicit-span controls pass. Browser marker DOM boxes expose missing anonymous-item size and gap contributions: 88.921875px/44.453125px horizontal errors and 28px/14px vertical errors. Authored input preservation, core-resolved flex properties, error-free settlement and zero final scene meshes/materials/textures are asserted. The core item-generation boundary, not application wrappers or projected offsets, owns the correction.'),
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
    { priority: -.1, rootCause: 'Equivalent document updates detach inspected nodes from retained renderer ancestry', action: 'Verify the core inspection query-context repair through fresh/update/semantic-only/structural-selector and packed-consumer tests, then recapture affected evidence before accepting resolved-style attributions. The correction uses the existing core resolver with current-document ancestry and remapped pseudo sources, restores live rendering ancestry, and preserves visual reuse. Do not use fixture-side selector matching, rewrite old captures, force all updates to rebuild, or substitute retained glyph color for resolved inputs. Actual interaction and raster behavior remain separate verification obligations.' },
    { priority: 0, rootCause: 'Diagnostic declarations are not fully resolved typography', action: 'Complete trustworthy input-stage coverage before accepting the audit. The existing core retained-text stage and inherited-typography reduction now expose font size and line height independently of declarations; preserve that separation and extend missing control/plugin/anonymous-text mappings and current pseudo-state paint provenance. Do not add a competing inheritance algorithm to the showcase or infer resolved values from projected geometry.' },
    { priority: .5, rootCause: 'Benchmark paint masking hides visible heading coverage', action: 'Preserve the captured baseline but restore visible, equivalent heading inputs in the benchmark before claiming complete paint parity. HTML opacity-zero masking and candidate surface-colored ink are unequal and predate the audit. Test the actual unmasked theme/responsive/DPR inputs, retain resulting failures, and reduce them at the owning core subsystem rather than changing heading colors, opacity, offsets or sizes to recover a screenshot score.' },
    { priority: 1, rootCause: 'Rendered output feeds subsequent layout', action: 'Replace connectedOverlayTop mesh projection with a public read-only query of the authoritative core CSS layout boxes. Verify nested transforms, scroll, resize, DPR, and first-open/update cycles. Diagnostic projection may measure output but must never determine authored input.' },
    { priority: 1.1, rootCause: 'CSS transform units, origins and function order are lost before projection', action: 'Extend the incomplete core transform contract: retain translation units, resolve percentages against the CSS transform reference box, and compose transform-origin and the ordered transform list as a CSS-space affine transform, without overwriting repeated functions. Add the public origin field deliberately with compatibility and package tests. Floating-label controls isolate percentage/origin gaps; pixel-only default-origin controls independently prove wrong scale/translate ordering and repeated translations. Preserve 16px label typography and the original wrapper transform instead of substituting a 12px font or new offsets. Do not change Babylon axis mapping to compensate for already incorrect CSS transforms.' },
    { priority: 2, rootCause: 'Range fixture changes reachable values', action: 'Restore the reference 0..100 range and step=5 with inter-thumb constraints. Exercise start=60/end=80 and start=20/end=40, drag both directions across the midpoint, and compare keyboard steps. Remove fixed half-domain clamping; reduce any resulting core interaction failure before implementation.' },
    { priority: 3, rootCause: 'Used-height constraints are replaced by provisional or intrinsic height', action: 'Fix both confirmed general rules: empty blocks must not retain parent height, and auto-height absolute text boxes with top/bottom insets must use the remaining containing-block height. Preserve positioned size ownership through block/flex intrinsic resizing. Keep the divider, literal grid-list and plain opposing-inset reductions unchanged; extend padded/bordered/min-max/nested/resize cases before removing fixture flow substitutions.' },
    { priority: 3.1, rootCause: 'Inline parent intrinsic width ignores in-flow descendants', action: 'Resolve nested inline and inline-block content width before using the parent as a flow item or positioned containing block. Do not simply sum every descendant: exclude out-of-flow content and preserve wrapping, whitespace, padding, min/max and shrink-to-fit constraints. Retain the overlay-free controls and compound badge proofs, then remove measured width tables only after equivalent Material input passes.' },
    { priority: 3.2, rootCause: 'Positioned offsets target the border box instead of the margin box', action: 'Apply the CSS inset/margin sizing equations in the core positioned-box calculation. The fixed-size left/bottom positive and negative margin controls isolate the failure without text, inline layout or Material. Add right/top, auto margins and over-constrained tests; rerun the compound badge before claiming its remaining vertical placement is fully explained.' },
    { priority: 3.3, rootCause: 'Direct flex text is painted separately from the shared item flow', action: 'Generate anonymous text items at the core CSS-space flex layout boundary so text and element children share intrinsic sizing, gaps, main/cross-axis placement and subsequent paint boxes. The four mixed-text row/column start/center reductions fail while explicit-span and single-direct-text centering controls pass. Extend wrapping, whitespace, reversed axes, padding and update cases before implementing; preserve authored direct text and do not solve the failure with application wrappers, fixed line heights or position offsets. Single-item centering success does not prove composed layout or normal-line-height raster fidelity.' },
    { priority: 3.5, rootCause: 'Reference CSS expressions bypass direct-style support', action: 'The existing core loaded-document-style path now has a bounded proof: original grid-list calc declarations resolve correct width/height/left at 280px and 480px without fixture arithmetic, while the independent inner used-height defect remains. Verify full Material cascade/state/responsive integration before adopting this path; scope general core corrections for any further unsupported expression or constraint. Do not copy measured pixels or implement per-family arithmetic; literal controls are not acceptance of the original expressions.' },
    { priority: 4, rootCause: 'Generic overlay composition is duplicated', action: 'Audit existing core primitives before adding APIs for connected anchors, viewport collision, clipping, focus scope, and dismissal. Migrate popup families with equivalent state inputs; retain different datepicker and timepicker focus behavior. Remove the tooltip benchmark-only forced-open handler.' },
    { priority: 4.5, rootCause: 'Border initial values, contextual colors and paint alpha diverge at separate core stages', action: 'Reconcile the documented transparent border default with CSS currentColor semantics, resolve contextual colors using the element computed color, and preserve color alpha through border material creation and state updates. The two opaque controls pass while omission, currentColor, transparent and half-alpha each fail for two colors. Keep these equal-input proofs, extend inheritance, opacity composition and hover/update behavior, and compare actual paired border rasters before claiming full paint parity. Then restore the missing Material button border-reset semantics, preserving currentColor rather than sampling literal colors; the captured width-only rules are a separate authoring defect. Do not inject explicit showcase colors, replace borders with sibling meshes or waive zero-width input differences. Attribute captured Material cases only after verifying each authored/resolved witness.' },
    { priority: 4.6, rootCause: 'Material outline and divider token inputs are replaced by a fixed palette literal', action: 'Restore the original outlined-button and toggle border token/side semantics through the supported shared CSS/theme input path. The current reference resolves light-dark(#7b757f, #958e99) to RGB 123,117,127 in all four named profiles; candidate #79747e is a different input. Do not infer browser color scheme from the profile name, alter the reference dark theme, or substitute a sampled literal. Preserve serialized var-containing shorthand declarations when expanded CSSOM longhands are empty. Extend source-backed attribution across the full state matrix before judging core parsing/paint under equal inputs; current supplemental evidence covers only three at-rest targets.' },
    { priority: 5, rootCause: 'Plugin competes with core typography', action: 'Remove DynamicTexture glyph/baseline rendering from MaterialTabPanelRenderer. Keep only Material transition orchestration while composing core-rendered text/content.' },
    { priority: 5.1, rootCause: 'Core rewrites an explicit font-family list before paint', action: 'The parser appends Arial, Helvetica, sans-serif to explicit lists without a recognized generic. Preserve this as distinct from missing Material font-token authoring. The equal-input unavailable-family proof now confirms changed text advance, while both explicit-generic controls pass. Preserve authored family ordering/quoting and browser fallback semantics at the core parser boundary; verify available/unavailable and missing-glyph cases without assuming a particular platform font. Do not add a generic family to the showcase merely to avoid the parser branch. Final raster verification remains separate from the measured advance proof.' },
    { priority: 5.15, rootCause: 'Canvas default shaping does not reproduce CSS text advance', action: 'Trace font-kerning and text-rendering semantics through the core text parser, single/multiline measurement, actual canvas paint and caret/selection metrics. The Arial office AV reduction proves a 0.882825px bound-texture advance difference with identical normal or zero tracking; a separate canvas probe isolates auto-versus-normal kerning behavior. Extend fonts, sizes, explicit kerning modes, retained text and wrapping before implementing a shared CSS-to-canvas rule. Do not force a showcase font, alter tracking or calibrate label widths; normal/zero representation equivalence is not proof of shaping or final raster parity.' },
    { priority: 5.2, rootCause: 'Material control typography tokens and nested line boxes are replaced by fixture defaults', action: 'Translate the original filled/outlined/text button and tab font/tracking tokens instead of inheriting the document control stack or omitting tracking. Restore toolbar button line-height inheritance instead of copying the density-specific container height. Preserve the tab text-label line-height:1 inside its independently sized content/control rather than applying the outer line-height to a flattened value label. Preserve alpha ink as a distinct authored input. Then investigate any core API or equal-input text mismatch; do not adjust font size, baseline, or offsets to recover screenshot similarity.' },
    { priority: 5.21, rootCause: 'Retained labels inherit the page fallback stack instead of component font tokens', action: 'Preserve the legitimate page font reset but restore each captured Material component font-family override and its inheritance path. Complete normal/effective candidate ancestry plus retained text distinguish this omission from the separate core font-list rewrite. Do not declare fallback lists equivalent because the installed Roboto renders current characters similarly, and do not change the page reset globally to hide missing component declarations. Re-run equal-input fallback, shaping, line-box and state-paint proofs after input restoration.' },
    { priority: 5.22, rootCause: 'Retained labels omit inherited component line-height and tracking tokens', action: 'Restore the captured reference text-metric tokens and inheritance structure instead of substituting fixed label heights, padding, vertical alignment or offsets. Complete normal/effective ancestry separates missing input from core metric defects. Preserve independent equal-input natural-line-height and shaping failures, and verify wrapping, placement and state paint only after equivalent inputs are supplied.' },
    { priority: 5.23, rootCause: 'Field-label tracking is tuned separately from the reference typography and transform', action: 'Restore the captured filled-label tracking token together with the reference wrapper typography and transform. The explicit .4/.65px state-dependent substitutions are not the reference .496px CSS input and must not be justified by scaling or calibrating apparent glyph widths. Preserve the independent core transform-order, percentage-translation, origin and text-shaping proofs; verify equivalent inputs before assessing any remaining label placement or raster mismatch.' },
    { priority: 5.24, rootCause: 'Tree direct flex text is replaced by a fixed-height label wrapper', action: 'Restore original direct text ownership and normal line-height together with the reference component font tokens. The explicit 20px height/line-height wrapper introduced in 7159b1d is not equivalent to the original anonymous flex text item. Reduce any remaining discrepancy through equal-input anonymous flex-item sizing, natural line metrics and centering tests; do not preserve or recalibrate a fixed wrapper to match a screenshot. Keep the separate font-stack, font-size and core normal-line-box findings visible.' },
    { priority: 5.25, rootCause: 'Stepper numeric icon positioning is replaced by centered text in a fixed span', action: 'Restore the original numeric span, separate icon-content wrapper, top/left 50% and translate(-50%, -50%) inputs. The current step-badge textAlign:center substitution does not exercise those semantics. Address the independently proven core percentage-transform defect first, then verify the original wrapper under varied digit widths, fonts, density, themes and state changes. Do not move the number with fixture-specific offsets or claim start/center alignment equivalent merely because both screenshots look centered.' },
    { priority: 5.26, rootCause: 'Native button/inline-block input is replaced by flex-div centering', action: 'Restore the original button wrapper and inline label layout, preserving CSS defaults, inheritance and Material rules. The candidate flex div omits native button defaults; adding label offsets or textAlign:center to that substitute would not test the original mechanism. Verify native-button default resolution and inline formatting through equivalent core inputs after removing the authoring divergence. Keep the separate CDP default controls and per-case captured center/left mismatch evidence.' },
    { priority: 5.27, rootCause: 'Stepper numeral font and label-color inheritance are replaced or omitted', action: 'Keep the original frame-scaled inherited numeral font with the icon-content wrapper instead of fixed 14px step-badge text. Restore the Material active-label color token and inner label inheritance instead of accepting the page on-surface fallback. Preserve actual reference theme inputs; do not retune the dark reference or calibrate text to the circle. Verify core inheritance, transforms and glyph paint only after equivalent authoring is restored.' },
    { priority: 5.28, rootCause: 'Filled-label component color tokens are replaced by independent literal state rules', action: 'Restore the captured reference label-color token, wrapper inheritance and state semantics rather than adjusting candidate colors to sampled pixels. Base/empty/picker-shell declarations currently supply different inputs, independently of the repaired inspection ancestry bug. Preserve normal/effective/retained stages and original rule order; investigate core cascade or current paint only when equivalent authored inputs still diverge. Do not normalize small RGB differences away or reuse pre-repair inconsistent captures as proof.' },
    { priority: 5.29, rootCause: 'Sidenav component text-color tokens are replaced by fixture theme literals', action: 'Restore the distinct drawer and content token semantics together with the separately identified sidenav structure/padding inputs. Reference color ownership is the drawer or container, while candidate aside/main rules directly set theme.onSurface or dark-mode literals. Preserve exact channels and captured inheritance; only an equal-input reproduction can establish a core color defect. The initial implementation introduced these substitutions, so do not describe them as confirmed later compensating fixes.' },
    { priority: 5.295, rootCause: 'Sort typography replaces inherited frame inputs with fixed trigger declarations', action: 'Restore the reference frame-scaled font-size inheritance and actual frame color through the original sort text structure. The candidate fixed 16px trigger and contrast-only black declaration differ before rendering. Keep the history of screenshot-oriented changes and complete per-case ancestor evidence. Evaluate core inheritance or font scaling only after inputs agree; no inverse scale, font-size calibration or theme-specific ink override is an acceptable renderer fix.' },
    { priority: 5.296, rootCause: 'Expansion header font-size token is omitted outside a compact fixture override', action: 'Restore the reference component header font-size token and its inheritance through mat-content/title equivalents across all states. A compact-only fixed 16px branch does not translate the general component rule; custom titles inherit a different page size. Keep the independent layout/transform findings and assess core scaling or text placement only with equivalent inputs, not new font-size or baseline corrections.' },
    { priority: 5.297, rootCause: 'Select arrow vector/composition replaced by a density-tuned font glyph', action: 'Restore the original Material SVG path, viewBox, arrow wrappers and CSS positioning through the shared rendering path. Do not resize or reposition U+25BC to approximate the vector. Reduce any unsupported SVG/layout behavior to equal-input core proof, and keep the separate select value/control, popup and interaction findings explicit.' },
    { priority: 5.3, rootCause: 'Core normal line-height is approximated by a fixed Mg font-box probe', action: 'Resolve browser normal line-box metrics and actual fallback runs in core. The equal-input Arial/serif cases expose one-pixel texture-height errors; Roboto plus emoji/CJK exposes two-pixel errors while plain Roboto and explicit line heights pass. Preserve those controls, extend multiline/baseline/DPR verification and avoid a universal multiplier, constant pixel addition, or fixed Material line-height compensation. Current-texture evidence must remain separate from declared normal and from final glyph raster.' },
    { priority: 5.4, rootCause: 'Calendar cell text tokens and inner line boxes were flattened away', action: 'Restore the reference calendar font and date-text ink tokens and its inner line-height:1 label inside both day and year controls. Keep reference cell/container sizing, state and selection structure instead of copying a normal-metric result or tuning the baseline. Separate date/range-context proofs isolate 990 day and 192 year occurrences each of missing font-token, omitted inner line-height and fixed-ink inputs; core metric defects must be assessed only after those inputs are equivalent. Independently resolve normal-versus-zero tracking and the still-unmapped header/icon owners.' },
    { priority: 5.5, rootCause: 'Snackbar action inherits generic control inputs instead of Material action tokens', action: 'Restore the original text-button font, size and tracking declarations and the snackbar inverse-primary ink, keeping the reference label/action wrapper intent. The exact overlay/message mapping isolates 34 current action textures and source-traces font-stack, tracking and ink substitutions. Trace the remaining 14px-versus-16px and normal-line-box observations through the core defaults/inheritance and metric stages before assigning core ownership; do not calibrate a baseline or line height. Retain the separate intrinsic-width, live-region, visibility, lifetime and placement obligations.' },
    { priority: 5.6, rootCause: 'Nested list inputs are replaced by generic value buttons', action: 'Restore bottom-sheet navigation/list/anchor/content/label structure and the original label font, explicit line-height, tracking, ink and overflow declarations. Preserve the actual reference overlay token scope and accessible name instead of borrowing page theme colors or calling the opener text the dialog name. Restore reference navigation behavior rather than generic dismiss handling, then reduce any equal-input core failure. Do not infer start/left alignment equivalence without direction evidence. Keep the separate fixed-width/content-height and responsive-constraint findings.' },
    { priority: 5.7, rootCause: 'Calendar period text and vector inputs are collapsed into a glyph string', action: 'Restore the reference period text span beside the 10x5 polygon SVG, using the original year-view CSS inversion, text-button font/tracking tokens and calendar period color-token override. Preserve the live-period description relationship. Do not strip the candidate triangle during comparison, substitute another font character or tune offsets. The current 41 texture witnesses compare common period text inputs while retaining both unequal full compositions; normal-line-height, wrapper layout and glyph/vector raster still need independent proof.' },
    { priority: 5.8, rootCause: 'Calendar close control and its focus-reveal interaction were omitted', action: 'Restore the reference close-button/label, original unfocused clipping and focus-to-reveal declarations, focus order and close activation through core APIs. The source template binds focus/blur and datepicker.close(); the candidate popup never authors that control. Preserve each omission as unequal structure, not a missing paint sample or harmless hidden element. Add live keyboard traversal, focused visibility, activation, focus restoration and computed clip evidence in both views. Investigate core only against those restored equal declarations; outside-click and Escape dismissal are not replacements for the missing control.' },
    { priority: 5.9, rootCause: 'Calendar weekday header structure and tokens are flattened into date-cell spans', action: 'Restore the seven column headers, separate full/narrow weekday labels, original aria-hidden and visually-hidden declarations, and spanning divider row. Preserve the calendar font and header ink tokens instead of inheriting the page fallback stack and fixed cell ink. Repeated initials require ordered full-name context, not text-only pairing. The source-authored omissions and typography substitutions precede core rendering; restore equal structure and styles before reducing table/grid, clipping, fallback, tracking or baseline discrepancies.' },
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
