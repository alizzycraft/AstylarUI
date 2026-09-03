export const materialFamilies = [
  'core', 'toolbar', 'sidenav', 'grid-list', 'divider', 'badge', 'card', 'chips',
  'icon', 'list', 'table', 'sort', 'paginator', 'tree', 'form-field', 'input',
  'autocomplete', 'checkbox', 'radio', 'select', 'slider', 'slide-toggle',
  'datepicker', 'timepicker', 'button', 'button-toggle', 'menu', 'tabs', 'stepper',
  'expansion', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip', 'progress-bar',
  'progress-spinner',
];
export const materialProfiles = ['light', 'dark', 'contrast', 'custom'];
export const materialViewports = [
  { id: 'desktop', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'tablet', width: 768, height: 1024, deviceScaleFactor: 1 },
  { id: 'mobile', width: 390, height: 844, deviceScaleFactor: 2 },
];
export const materialComparisonViewport = Object.freeze({ id: 'comparison', width: 609, height: 844, deviceScaleFactor: 1 });
export const materialThresholds = Object.freeze({
  edgeTolerancePx: 2,
  maximumEdgeErrorPx: 5,
  minimumEdgesWithinTolerance: .95,
  resultSsim: .95,
  aggregateMedianSsim: .98,
  maximumTextCenterOffsetErrorPx: .75,
});

export const materialTextAuditTargets = Object.freeze({
  core: ['core-primary'],
  toolbar: ['toolbar-title', 'toolbar-action'],
  sidenav: ['sidenav-nav', 'sidenav-content'],
  'grid-list': ['grid-tile-one', 'grid-tile-two'],
  divider: ['divider-above', 'divider-below'],
  badge: ['badge-label', 'badge-count'],
  card: ['card-title', 'card-copy', 'card-open'],
  chips: ['chip-0', 'chip-1'],
  list: ['list-inbox-label', 'list-archive-label'],
  table: ['table-name-header', 'table-atlas', 'table-northstar'],
  sort: ['sort-trigger'],
  paginator: ['paginator-size', 'paginator-range'],
  tree: ['tree-item-0', 'tree-item-1', 'tree-item-2'],
  'form-field': ['form-field-label', 'form-field-control', 'form-field-hint'],
  input: ['input-label', 'input-control'],
  autocomplete: ['autocomplete-label'],
  checkbox: ['checkbox-label'],
  radio: ['radio-solo-label', 'radio-team-label'],
  select: ['select-label', 'select-control'],
  'slide-toggle': ['slide-toggle-label'],
  datepicker: ['datepicker-label'],
  timepicker: ['timepicker-label'],
  button: ['button-primary', 'button-secondary', 'button-disabled'],
  'button-toggle': ['button-toggle-one', 'button-toggle-two'],
  menu: ['menu-primary'],
  tabs: ['tab-overview', 'tab-activity', 'tab-panel'],
  stepper: ['step-details-text', 'step-review-text', 'stepper-content'],
  expansion: ['expansion-title'],
  'bottom-sheet': ['bottom-sheet-primary'],
  dialog: ['dialog-primary'],
  'snack-bar': ['snack-bar-primary'],
  tooltip: ['tooltip-primary'],
});
export const materialTextAlignmentTargets = Object.freeze({
  core: ['core-primary'],
  toolbar: ['toolbar-title', 'toolbar-action'],
  'grid-list': ['grid-tile-one', 'grid-tile-two'],
  divider: ['divider-above', 'divider-below'],
  badge: ['badge-label', 'badge-count'],
  card: ['card-title', 'card-copy', 'card-open'],
  checkbox: ['checkbox-label'],
  radio: ['radio-solo-label', 'radio-team-label'],
  'slide-toggle': ['slide-toggle-label'],
  'button-toggle': ['button-toggle-one', 'button-toggle-two'],
  tabs: ['tab-overview', 'tab-activity', 'tab-panel'],
  stepper: ['step-details-text', 'step-review-text', 'stepper-content'],
  expansion: ['expansion-title'],
  paginator: ['paginator-size', 'paginator-range'],
  button: ['button-primary', 'button-secondary', 'button-disabled'],
  menu: ['menu-primary'],
  'bottom-sheet': ['bottom-sheet-primary'],
  dialog: ['dialog-primary'],
  'snack-bar': ['snack-bar-primary'],
  tooltip: ['tooltip-primary'],
});
export const materialTextlessFamilies = Object.freeze(['icon', 'slider', 'progress-bar', 'progress-spinner']);
export const materialAbsoluteTextAlignmentTargets = Object.freeze([
  'toolbar-action', 'divider-above', 'divider-below', 'badge-label', 'badge-count',
  'card-title', 'card-copy', 'card-open', 'paginator-range', 'tab-overview', 'tab-activity',
]);
export const materialLeftAlignedTextTargets = Object.freeze([
  'form-field-control', 'input-control', 'select-control', 'tab-panel',
]);
export const materialTextAlignmentToleranceOverrides = Object.freeze({
  'tab-overview': 1.25,
  'tab-activity': 1.25,
  'button-toggle-one': 1,
});
export const materialTextOnlyTargets = Object.freeze([
  'divider-above', 'divider-below', 'badge-label', 'card-title', 'card-copy',
  'checkbox-label', 'radio-solo-label', 'radio-team-label', 'slide-toggle-label',
  'tab-overview', 'tab-activity', 'tab-panel', 'step-details-text', 'step-review-text',
  'stepper-content', 'expansion-title', 'expansion-content',
]);
export const materialSemanticExcludedTargets = Object.freeze([
  ...materialTextOnlyTargets,
  'button-toggle-one', 'button-toggle-two', 'chip-0', 'chip-1', 'tooltip-popup',
]);
export const materialUniformBackgroundTargets = Object.freeze({
  'grid-list': Object.freeze({ container: 'grid-list-root', surfaces: Object.freeze(['grid-tile-one', 'grid-tile-two']) }),
});
export const materialFocusedRasterTargets = Object.freeze({
  sort: Object.freeze({ element: 'sort-primary', padding: 8, minimumSsim: .80 }),
  icon: Object.freeze({ element: 'icon-primary', padding: 8, minimumSsim: .80 }),
  table: Object.freeze({ element: 'table-primary', padding: 8, minimumSsim: .80 }),
  paginator: Object.freeze({ element: 'paginator-primary', padding: 8, minimumSsim: .80 }),
  'form-field': Object.freeze({ element: 'form-field-primary', padding: 8, minimumSsim: .80 }),
  chips: Object.freeze({ element: 'chips-primary', padding: 8, minimumSsim: .79 }),
  checkbox: Object.freeze({ element: 'checkbox-primary', padding: 8, minimumSsim: .40 }),
  'button-toggle': Object.freeze({ element: 'button-toggle-primary', padding: 8, minimumSsim: .40 }),
  tabs: Object.freeze({ element: 'tabs-primary', padding: 8, minimumSsim: .80 }),
  stepper: Object.freeze({ element: 'stepper-primary', padding: 8, minimumSsim: .90 }),
});
export const materialInteractionFocusedRasterTargets = Object.freeze({
  'form-field': Object.freeze({ element: 'form-field-primary', padding: 8, minimumSsim: .80, states: Object.freeze(['edit-empty-blur']) }),
  input: Object.freeze({ element: 'input-primary', padding: 8, minimumSsim: .80, states: Object.freeze(['edit-empty-blur']) }),
  chips: Object.freeze({ element: 'chips-primary', padding: 8, minimumSsim: .70, states: Object.freeze(['activate', 'activate-alternate', 'activate-leave']) }),
  expansion: Object.freeze({ element: 'expansion-root', padding: 8, minimumSsim: .90 }),
  sort: Object.freeze({ element: 'sort-primary', padding: 8, minimumSsim: .80 }),
  'slide-toggle': Object.freeze({ element: 'slide-toggle-primary', padding: 8, minimumSsim: .40 }),
  'button-toggle': Object.freeze({ element: 'button-toggle-primary', padding: 8, minimumSsim: .40 }),
  tabs: Object.freeze({ element: 'tabs-primary', padding: 8, minimumSsim: .80 }),
  stepper: Object.freeze({ element: 'stepper-primary', padding: 8, minimumSsim: .90 }),
  autocomplete: Object.freeze({ element: 'autocomplete-primary', padding: 8, paddingBottom: 130, minimumSsim: .85 }),
  select: Object.freeze({ element: 'select-primary', padding: 8, paddingBottom: 130, minimumSsim: .85 }),
  datepicker: Object.freeze({ element: 'datepicker-primary', padding: 8, paddingBottom: 370, minimumSsim: .86 }),
  timepicker: Object.freeze({ element: 'timepicker-primary', padding: 8, paddingBottom: 270, minimumSsim: .88 }),
  menu: Object.freeze({ element: 'menu-primary', padding: 8, paddingBottom: 160, minimumSsim: .86 }),
  tooltip: Object.freeze({ element: 'tooltip-popup', padding: 4, minimumSsim: .14, states: Object.freeze(['hover', 'held']) }),
});
export const materialInteractionTextAlignmentTargets = Object.freeze({
  chips: Object.freeze(['chip-0', 'chip-1']),
  expansion: Object.freeze(['expansion-content']),
});
export const materialShadowProfileTargets = Object.freeze({
  card: Object.freeze({ element: 'card-primary', maximumRowError: 22 }),
});
export const materialSupplementalStaticCases = materialProfiles.map((profile) =>
  ({ family: 'divider', profile, viewport: materialComparisonViewport }));
export const materialStaticCases = [
  ...materialFamilies.flatMap((family) =>
    materialProfiles.flatMap((profile) => materialViewports.map((viewport) => ({ family, profile, viewport })))),
  ...materialSupplementalStaticCases,
];

export const materialInteractionViewports = [
  { id: 'desktop-dpr1', width: 1440, height: 1000, deviceScaleFactor: 1 },
  { id: 'desktop-dpr2', width: 1440, height: 1000, deviceScaleFactor: 2 },
];

const passiveFamilies = new Set(['divider', 'icon', 'progress-bar', 'progress-spinner']);
const selectableFamilies = new Set(['chips', 'checkbox', 'radio', 'select', 'slide-toggle', 'button-toggle', 'tabs', 'stepper']);
const errorFamilies = new Set(['form-field', 'input', 'autocomplete', 'datepicker', 'timepicker']);
const openableFamilies = new Set(['sidenav', 'autocomplete', 'select', 'datepicker', 'timepicker', 'menu', 'expansion', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip']);
const disabledFamilies = new Set(['button', 'chips', 'form-field', 'input', 'autocomplete', 'checkbox', 'radio', 'select', 'slider', 'slide-toggle', 'datepicker', 'timepicker', 'button-toggle', 'menu', 'tabs', 'stepper', 'expansion']);

export const materialInteractionCases = materialFamilies.flatMap((family) => {
  const states = passiveFamilies.has(family) ? ['inspect'] : ['focus', 'hover', 'held', 'activate', 'activate-leave'];
  if (family === 'sort' || family === 'snack-bar') states.push('activate-twice');
  if (family === 'slider') states.push('drag-start', 'drag-end');
  if (family === 'timepicker') states.push('open-scroll');
  if (family === 'chips') states.push('activate-alternate');
  if (family === 'autocomplete' || family === 'select') states.push('open-commit-reopen');
  if (family === 'datepicker') states.push('open-secondary');
  if (['autocomplete', 'select', 'datepicker', 'timepicker', 'menu', 'dialog'].includes(family)) states.push('open-hover-content');
  if (family === 'form-field' || family === 'input') states.push('edit-empty-blur');
  if (['autocomplete', 'datepicker', 'timepicker', 'menu', 'dialog'].includes(family)) states.push('open-dismiss-outside');
  if (disabledFamilies.has(family)) states.push('disabled');
  if (selectableFamilies.has(family)) states.push('selected');
  if (errorFamilies.has(family)) states.push('error');
  if (openableFamilies.has(family)) states.push('open');
  return materialProfiles.flatMap((profile) => materialInteractionViewports.flatMap((viewport) =>
    states.map((state) => ({ family, profile, viewport, state }))));
});

export const materialMobileFlowFamilies = [
  'sidenav', 'autocomplete', 'select', 'datepicker', 'timepicker', 'menu', 'tabs', 'bottom-sheet', 'dialog',
];
export const materialMobileFlowCases = materialMobileFlowFamilies.flatMap((family) =>
  ['light', 'dark'].map((profile) => ({
    family,
    profile,
    viewport: { id: 'mobile-dpr2', width: 390, height: 844, deviceScaleFactor: 2 },
    state: 'open-dismiss',
  })));
