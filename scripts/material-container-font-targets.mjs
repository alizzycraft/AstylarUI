// Shared evidence population. Keep this data independent of collectors and the
// production audit builder so either font collector can be imported first.
export const containerFontStageTargets = Object.fromEntries([
  ['badge', 'span', 'span'], ['button-toggle', 'mat-button-toggle-group', 'div'], ['card', 'mat-card', 'div'],
  ['checkbox', 'mat-checkbox', 'div'], ['chips', 'mat-chip-listbox', 'div'], ['divider', 'mat-divider', 'div'],
  ['expansion', 'mat-expansion-panel', 'div'], ['grid-list', 'mat-grid-list', 'div'], ['radio', 'mat-radio-group', 'div'],
  ['sidenav', 'mat-sidenav-container', 'div'], ['slide-toggle', 'mat-slide-toggle', 'div'], ['sort', 'div', 'div'],
  ['stepper', 'mat-stepper', 'div'], ['tabs', 'mat-tab-group', 'div'], ['tree', 'mat-tree', 'div'],
].map(([family, referenceType, candidateType]) => [family + '-primary', { family, referenceType, candidateType }]));
for (const id of ['grid-tile-one', 'grid-tile-two']) containerFontStageTargets[id] =
  { family: 'grid-list', referenceType: 'mat-grid-tile', candidateType: 'div' };
// Mapped visual owners have no captured own/retained/control text. Their font
// observation stage does not establish image geometry or plugin paint parity.
for (const [family, id, referenceType, candidateType] of [
  ['icon', 'icon-primary', 'mat-icon', 'img'],
  ['progress-bar', 'progress-bar-primary', 'mat-progress-bar', 'showcase.material:linear-progress'],
  ['progress-spinner', 'progress-spinner-primary', 'mat-progress-spinner', 'showcase.material:circular-progress'],
  ['slider', 'slider-visual', 'mat-slider', 'showcase.material:range-visual'],
]) containerFontStageTargets[id] = { family, referenceType, candidateType };
