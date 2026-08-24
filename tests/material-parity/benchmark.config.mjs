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

export const materialTextAlignmentTargets = Object.freeze({
  core: ['core-primary'],
  toolbar: ['toolbar-title', 'toolbar-action'],
  'grid-list': ['grid-tile-one', 'grid-tile-two'],
  divider: ['divider-above', 'divider-below'],
  button: ['button-primary', 'button-secondary', 'button-disabled'],
  menu: ['menu-primary'],
  'bottom-sheet': ['bottom-sheet-primary'],
  dialog: ['dialog-primary'],
  'snack-bar': ['snack-bar-primary'],
  tooltip: ['tooltip-primary'],
});
export const materialAbsoluteTextAlignmentTargets = Object.freeze(['toolbar-action', 'divider-above', 'divider-below']);
export const materialTextOnlyTargets = Object.freeze(['divider-above', 'divider-below']);
export const materialUniformBackgroundTargets = Object.freeze({
  'grid-list': Object.freeze({ container: 'grid-list-root', surfaces: Object.freeze(['grid-tile-one', 'grid-tile-two']) }),
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
