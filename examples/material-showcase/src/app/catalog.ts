export const MATERIAL_FAMILIES = [
  'core', 'toolbar', 'sidenav', 'grid-list', 'divider',
  'badge', 'card', 'chips', 'icon', 'list', 'table', 'sort', 'paginator', 'tree',
  'form-field', 'input', 'autocomplete', 'checkbox', 'radio', 'select', 'slider',
  'slide-toggle', 'datepicker', 'timepicker', 'button', 'button-toggle', 'menu',
  'tabs', 'stepper', 'expansion', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip',
  'progress-bar', 'progress-spinner',
] as const;

export type MaterialFamily = typeof MATERIAL_FAMILIES[number];

export interface MaterialCatalogEntry {
  readonly id: MaterialFamily;
  readonly label: string;
  readonly group: 'Foundations' | 'Content & data' | 'Inputs' | 'Actions & navigation' | 'Overlays & feedback';
  readonly measurementIds: readonly string[];
  readonly states: readonly string[];
  readonly interactions: readonly ('inspect' | 'focus' | 'hover' | 'held' | 'activate' | 'keyboard' | 'open-dismiss')[];
  readonly expectedSemantics: Readonly<{ rootRole: 'region'; primaryRole?: string }>;
  readonly responsive: boolean;
}

const passive = new Set<MaterialFamily>(['divider', 'icon', 'progress-bar', 'progress-spinner']);
const popup = new Set<MaterialFamily>(['sidenav', 'autocomplete', 'select', 'datepicker', 'timepicker', 'menu', 'bottom-sheet', 'dialog', 'snack-bar', 'tooltip']);
const keyboard = new Set<MaterialFamily>(['chips', 'table', 'sort', 'paginator', 'tree', 'form-field', 'input', 'autocomplete', 'checkbox', 'radio', 'select', 'slider', 'slide-toggle', 'datepicker', 'timepicker', 'button', 'button-toggle', 'menu', 'tabs', 'stepper', 'expansion']);
const primaryRoles: Partial<Record<MaterialFamily, string>> = {
  core: 'button', chips: 'listbox', icon: 'img', table: 'table',
  paginator: 'group', tree: 'tree', 'form-field': 'textbox', input: 'textbox', autocomplete: 'combobox',
  checkbox: 'checkbox', radio: 'radio', select: 'combobox', slider: 'slider', 'slide-toggle': 'switch', datepicker: 'textbox',
  timepicker: 'combobox', button: 'button', 'button-toggle': 'radiogroup', menu: 'button', stepper: 'tablist',
  expansion: 'button', 'bottom-sheet': 'button', dialog: 'button', 'snack-bar': 'button', tooltip: 'button',
  'progress-bar': 'progressbar', 'progress-spinner': 'progressbar',
} as Partial<Record<MaterialFamily, string>>;

function interactions(id: MaterialFamily): MaterialCatalogEntry['interactions'] {
  if (passive.has(id)) return ['inspect'];
  const values: MaterialCatalogEntry['interactions'][number][] = ['focus', 'hover', 'held', 'activate'];
  if (keyboard.has(id)) values.push('keyboard');
  if (popup.has(id)) values.push('open-dismiss');
  return values;
}

const labels: Record<MaterialFamily, string> = Object.fromEntries(
  MATERIAL_FAMILIES.map((id) => [id, id.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')]),
) as Record<MaterialFamily, string>;

function group(id: MaterialFamily): MaterialCatalogEntry['group'] {
  const index = MATERIAL_FAMILIES.indexOf(id);
  if (index < 5) return 'Foundations';
  if (index < 14) return 'Content & data';
  if (index < 24) return 'Inputs';
  if (index < 30) return 'Actions & navigation';
  return 'Overlays & feedback';
}

export const MATERIAL_CATALOG: readonly MaterialCatalogEntry[] = Object.freeze(
  MATERIAL_FAMILIES.map((id) => Object.freeze({
    id,
    label: labels[id],
    group: group(id),
    measurementIds: [`${id}-root`, `${id}-primary`],
    states: ['default', 'focus', 'disabled'],
    interactions: interactions(id),
    expectedSemantics: Object.freeze({ rootRole: 'region' as const, primaryRole: primaryRoles[id] }),
    responsive: ['sidenav', 'grid-list', 'table', 'tabs', 'bottom-sheet', 'dialog'].includes(id),
  })),
);

export function isMaterialFamily(value: string | null | undefined): value is MaterialFamily {
  return MATERIAL_FAMILIES.includes(value as MaterialFamily);
}
