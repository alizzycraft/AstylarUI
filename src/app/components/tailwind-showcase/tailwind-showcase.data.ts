import type { DOMElement, SiteData } from '../../../lib';

export type TailwindShowcaseTabId = 'layout' | 'type-paint' | 'controls' | 'responsive';

export interface TailwindShowcaseTab {
  readonly id: TailwindShowcaseTabId;
  readonly label: string;
  readonly eyebrow: string;
  readonly description: string;
  readonly coverage: readonly string[];
  readonly children: readonly DOMElement[];
}

const rootClass = 'tw:flex tw:h-full tw:w-full tw:flex-col tw:gap-4 tw:overflow-auto tw:bg-slate-950 tw:p-5 tw:text-slate-100';
const pageHeaderClass = 'tw:flex tw:w-full tw:flex-col tw:gap-1 tw:border-b tw:border-slate-700 tw:pb-4';
const eyebrowClass = 'tw:m-0 tw:text-xs tw:font-bold tw:uppercase tw:leading-5 tw:tracking-widest tw:text-blue-300';
const headingClass = 'tw:m-0 tw:text-xl tw:font-bold tw:leading-8 tw:text-white';
const introClass = 'tw:m-0 tw:text-sm tw:leading-5 tw:text-slate-300';
const cardClass = 'tw:flex tw:min-w-0 tw:flex-col tw:gap-3 tw:rounded-xl tw:border tw:border-slate-700 tw:bg-slate-900 tw:p-4 tw:shadow-lg';
const labelClass = 'tw:m-0 tw:text-xs tw:font-bold tw:uppercase tw:leading-5 tw:tracking-widest tw:text-blue-300';
const noteClass = 'tw:m-0 tw:text-xs tw:leading-5 tw:text-slate-400';

function pageHeader(id: TailwindShowcaseTabId, eyebrow: string, title: string, description: string): DOMElement {
  return {
    type: 'header',
    id: `${id}-header`,
    class: pageHeaderClass,
    children: [
      { type: 'p', id: `${id}-eyebrow`, class: eyebrowClass, textContent: eyebrow },
      { type: 'h2', id: `${id}-title`, class: headingClass, textContent: title },
      { type: 'p', id: `${id}-intro`, class: introClass, textContent: description },
    ],
  };
}

function card(id: string, label: string, children: DOMElement[], note?: string): DOMElement {
  return {
    type: 'article',
    id,
    class: cardClass,
    children: [
      { type: 'p', id: `${id}-label`, class: labelClass, textContent: label },
      ...children,
      ...(note ? [{ type: 'p' as const, id: `${id}-note`, class: noteClass, textContent: note }] : []),
    ],
  };
}

const layoutChildren: readonly DOMElement[] = [
  pageHeader(
    'layout',
    'Layout utilities',
    'Flex, grid, sizing and spacing',
    'Both panes use the same static Tailwind class strings and the same element hierarchy.',
  ),
  {
    type: 'div',
    id: 'layout-grid',
    class: 'tw:grid tw:w-full tw:grid-cols-2 tw:gap-4',
    children: [
      card('layout-flex-card', 'Flexbox · flex / items-center / justify-between / gap-3', [
        {
          type: 'div',
          id: 'layout-flex-row',
          class: 'tw:flex tw:h-16 tw:w-full tw:items-center tw:justify-between tw:gap-3 tw:rounded-lg tw:bg-slate-800 tw:p-3',
          children: [
            { type: 'span', id: 'layout-flex-a', class: 'tw:rounded tw:bg-blue-600 tw:px-3 tw:py-2 tw:text-sm tw:font-bold tw:text-white', textContent: 'Start' },
            { type: 'span', id: 'layout-flex-b', class: 'tw:rounded tw:bg-violet-600 tw:px-3 tw:py-2 tw:text-sm tw:font-bold tw:text-white', textContent: 'Middle' },
            { type: 'span', id: 'layout-flex-c', class: 'tw:rounded tw:bg-emerald-600 tw:px-3 tw:py-2 tw:text-sm tw:font-bold tw:text-white', textContent: 'End' },
          ],
        },
      ]),
      card('layout-grid-card', 'Grid · grid-cols-3 / gap-2 / equal tracks', [
        {
          type: 'div',
          id: 'layout-equal-grid',
          class: 'tw:grid tw:h-16 tw:w-full tw:grid-cols-3 tw:gap-2',
          children: [1, 2, 3].map((value) => ({
            type: 'div' as const,
            id: `layout-grid-${value}`,
            class: 'tw:flex tw:items-center tw:justify-center tw:rounded-lg tw:border tw:border-slate-600 tw:bg-slate-800 tw:text-sm tw:font-bold tw:text-slate-200',
            textContent: String(value),
          })),
        },
      ]),
      card('layout-spacing-card', 'Spacing · p-* / px-* / py-* / gap-*', [
        {
          type: 'div',
          id: 'layout-spacing-outer',
          class: 'tw:flex tw:w-full tw:gap-3 tw:rounded-lg tw:bg-slate-800 tw:p-4',
          children: [
            { type: 'span', id: 'layout-space-small', class: 'tw:rounded tw:bg-blue-950 tw:px-2 tw:py-1 tw:text-xs tw:text-blue-200', textContent: 'px-2 py-1' },
            { type: 'span', id: 'layout-space-large', class: 'tw:rounded tw:bg-blue-700 tw:px-5 tw:py-3 tw:text-sm tw:font-bold tw:text-white', textContent: 'px-5 py-3' },
          ],
        },
      ]),
      card('layout-sizing-card', 'Sizing · w-full / min-w-0 / h-*', [
        { type: 'div', id: 'layout-size-wide', class: 'tw:h-3 tw:w-full tw:rounded tw:bg-blue-500' },
        { type: 'div', id: 'layout-size-mid', class: 'tw:h-3 tw:w-3/4 tw:rounded tw:bg-violet-500' },
        { type: 'div', id: 'layout-size-small', class: 'tw:h-3 tw:w-1/2 tw:rounded tw:bg-emerald-500' },
      ]),
    ],
  },
];

const typePaintChildren: readonly DOMElement[] = [
  pageHeader(
    'type-paint',
    'Typography and paint',
    'Type scale, color, borders, radii and shadows',
    'Use the labels to identify the utility family exercised by each sample.',
  ),
  {
    type: 'div',
    id: 'type-paint-grid',
    class: 'tw:grid tw:w-full tw:grid-cols-2 tw:gap-4',
    children: [
      card('type-scale-card', 'Typography · text-* / font-* / leading-*', [
        { type: 'p', id: 'type-display', class: 'tw:m-0 tw:text-xl tw:font-bold tw:leading-8 tw:text-white', textContent: 'Bold display text' },
        { type: 'p', id: 'type-body', class: 'tw:m-0 tw:text-sm tw:leading-6 tw:text-slate-300', textContent: 'Readable body copy with a deliberate line height.' },
        { type: 'p', id: 'type-caption', class: 'tw:m-0 tw:text-xs tw:font-semibold tw:uppercase tw:leading-5 tw:tracking-widest tw:text-slate-400', textContent: 'Uppercase caption' },
      ]),
      card('paint-colors-card', 'Colors · bg-* / text-* / border-*', [
        { type: 'div', id: 'paint-blue', class: 'tw:rounded-lg tw:border tw:border-blue-400 tw:bg-blue-950 tw:p-3 tw:text-sm tw:font-bold tw:text-blue-200', textContent: 'Blue surface' },
        { type: 'div', id: 'paint-emerald', class: 'tw:rounded-lg tw:border tw:border-emerald-400 tw:bg-emerald-950 tw:p-3 tw:text-sm tw:font-bold tw:text-emerald-200', textContent: 'Emerald surface' },
      ]),
      card('paint-radius-card', 'Borders and radii · border / rounded-*', [
        {
          type: 'div', id: 'paint-radius-row', class: 'tw:flex tw:items-center tw:gap-3', children: [
            { type: 'span', id: 'paint-square', class: 'tw:border tw:border-slate-500 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-xs', textContent: 'square' },
            { type: 'span', id: 'paint-rounded', class: 'tw:rounded-lg tw:border tw:border-slate-500 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-xs', textContent: 'rounded-lg' },
            { type: 'span', id: 'paint-pill', class: 'tw:rounded-full tw:border tw:border-slate-500 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-xs', textContent: 'rounded-full' },
          ],
        },
      ]),
      card('paint-shadow-card', 'Elevation · shadow-md / shadow-lg / ring-2', [
        { type: 'div', id: 'paint-shadow', class: 'tw:rounded-lg tw:bg-slate-800 tw:p-4 tw:text-sm tw:text-slate-200 tw:shadow-lg tw:ring-2 tw:ring-blue-400', textContent: 'Shadow and focus-style ring' },
      ]),
    ],
  },
];

const controlsChildren: readonly DOMElement[] = [
  pageHeader(
    'controls',
    'Controls and states',
    'Buttons, inputs, selects and checked/disabled states',
    'Hover, hold, focus and edit each pane independently to compare interactive paint.',
  ),
  {
    type: 'div',
    id: 'controls-stack',
    class: 'tw:flex tw:w-full tw:flex-col tw:gap-4',
    children: [
      card('controls-buttons-card', 'Buttons · hover: / active: / focus:ring-* / disabled:', [
        {
          type: 'div', id: 'controls-button-row', class: 'tw:grid tw:w-full tw:grid-cols-3 tw:gap-3', children: [
            { type: 'button', id: 'controls-primary', class: 'tw:h-11 tw:w-full tw:rounded-lg tw:border tw:border-blue-400 tw:bg-blue-600 tw:px-4 tw:py-2 tw:text-sm tw:font-bold tw:text-white tw:hover:bg-blue-500 tw:active:scale-[0.98] tw:focus:ring-2 tw:focus:ring-blue-300', value: 'Interactive' },
            { type: 'button', id: 'controls-secondary', class: 'tw:h-11 tw:w-full tw:rounded-lg tw:border tw:border-slate-600 tw:bg-slate-800 tw:px-4 tw:py-2 tw:text-sm tw:font-bold tw:text-slate-100 tw:hover:bg-slate-700 tw:focus:ring-2 tw:focus:ring-slate-400', value: 'Secondary' },
            { type: 'button', id: 'controls-disabled', class: 'tw:h-11 tw:w-full tw:rounded-lg tw:bg-blue-600 tw:px-4 tw:py-2 tw:text-sm tw:font-bold tw:text-white tw:disabled:bg-slate-700 tw:disabled:text-slate-400', value: 'Disabled', disabled: true },
          ],
        },
      ]),
      card('controls-fields-card', 'Form controls · appearance-none / focus:border-* / checked:', [
        {
          type: 'div', id: 'controls-fields-grid', class: 'tw:grid tw:w-full tw:grid-cols-2 tw:gap-3', children: [
            {
              type: 'div', id: 'controls-input-group', class: 'tw:flex tw:flex-col tw:gap-2', children: [
                { type: 'label', id: 'controls-name-label', for: 'controls-name', class: 'tw:text-xs tw:font-bold tw:text-slate-300', textContent: 'Text input · focus:border-blue-400' },
                { type: 'input', id: 'controls-name', inputType: 'text', value: '', placeholder: 'Focus and type', class: 'tw:h-11 tw:w-full tw:appearance-none tw:rounded-lg tw:border tw:border-slate-600 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-sm tw:text-white tw:focus:border-blue-400' },
              ],
            },
            {
              type: 'div', id: 'controls-select-group', class: 'tw:flex tw:flex-col tw:gap-2', children: [
                { type: 'label', id: 'controls-status-label', for: 'controls-status', class: 'tw:text-xs tw:font-bold tw:text-slate-300', textContent: 'Select · border / bg / text / rounded' },
                { type: 'select', id: 'controls-status', value: 'ready', class: 'tw:h-11 tw:w-full tw:appearance-none tw:rounded-lg tw:border tw:border-slate-600 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-sm tw:text-white', options: [
                  { value: 'ready', label: 'Ready' },
                  { value: 'review', label: 'Needs review' },
                  { value: 'blocked', label: 'Blocked' },
                ] },
              ],
            },
            {
              type: 'label', id: 'controls-check-label', for: 'controls-check', class: 'tw:inline-flex tw:h-11 tw:w-full tw:items-center tw:gap-2 tw:text-sm tw:text-slate-200', children: [
                { type: 'input', id: 'controls-check', inputType: 'checkbox', checked: true, class: 'tw:h-4 tw:w-4 tw:rounded tw:opacity-80 tw:checked:opacity-100' },
                { type: 'span', id: 'controls-check-copy', textContent: 'Checked · checked:opacity-100' },
              ],
            },
          ],
        },
      ]),
    ],
  },
];

const responsiveChildren: readonly DOMElement[] = [
  pageHeader(
    'responsive',
    'Responsive and overflow',
    'Surface-relative breakpoints, arbitrary sizing and scrolling',
    'Switch the shared viewport width above; md: rules resolve against each comparison pane.',
  ),
  card('responsive-direction-card', 'Responsive flex · flex-col / md:flex-row', [
    {
      type: 'div', id: 'responsive-direction', class: 'tw:flex tw:w-full tw:flex-col tw:gap-3 tw:md:flex-row', children: [
        { type: 'div', id: 'responsive-a', class: 'tw:h-16 tw:w-full tw:rounded-lg tw:bg-blue-700 tw:p-3 tw:text-sm tw:font-bold tw:text-white', textContent: 'Panel A' },
        { type: 'div', id: 'responsive-b', class: 'tw:h-16 tw:w-full tw:rounded-lg tw:bg-violet-700 tw:p-3 tw:text-sm tw:font-bold tw:text-white', textContent: 'Panel B' },
        { type: 'div', id: 'responsive-c', class: 'tw:h-16 tw:w-full tw:rounded-lg tw:bg-emerald-700 tw:p-3 tw:text-sm tw:font-bold tw:text-white', textContent: 'Panel C' },
      ],
    },
  ], 'Compact is stacked; desktop is a row.'),
  {
    type: 'div', id: 'responsive-lower-grid', class: 'tw:grid tw:w-full tw:grid-cols-2 tw:gap-4', children: [
      card('responsive-arbitrary-card', 'Arbitrary value · w-[13rem] / max-w-full', [
        { type: 'div', id: 'responsive-arbitrary', class: 'tw:h-12 tw:w-[13rem] tw:max-w-full tw:rounded-lg tw:bg-blue-600 tw:p-3 tw:text-sm tw:font-bold tw:text-white', textContent: 'Exactly 13rem wide' },
      ]),
      card('responsive-overflow-card', 'Overflow · max-h-24 / overflow-auto', [
        {
          type: 'div', id: 'responsive-scroll', class: 'tw:max-h-24 tw:w-full tw:overflow-auto tw:rounded-lg tw:border tw:border-slate-700 tw:bg-slate-800 tw:p-2 tw:text-xs tw:text-slate-300 tw:shadow-inner', children: [
            { type: 'p', id: 'responsive-line-1', class: 'tw:m-0 tw:mb-2 tw:leading-5', textContent: 'Scrollable line one' },
            { type: 'p', id: 'responsive-line-2', class: 'tw:m-0 tw:mb-2 tw:leading-5', textContent: 'Scrollable line two' },
            { type: 'p', id: 'responsive-line-3', class: 'tw:m-0 tw:mb-2 tw:leading-5', textContent: 'Scrollable line three' },
            { type: 'p', id: 'responsive-line-4', class: 'tw:m-0 tw:mb-2 tw:leading-5', textContent: 'Scrollable line four' },
            { type: 'p', id: 'responsive-line-5', class: 'tw:m-0 tw:leading-5', textContent: 'Bottom reachability marker' },
          ],
        },
      ]),
    ],
  },
];

export const TAILWIND_SHOWCASE_TABS: readonly TailwindShowcaseTab[] = [
  {
    id: 'layout',
    label: 'Layout',
    eyebrow: 'Layout utilities',
    description: 'Flexbox, Grid, sizing and spacing arrangements.',
    coverage: ['flex', 'grid', 'gap', 'padding', 'width', 'height'],
    children: layoutChildren,
  },
  {
    id: 'type-paint',
    label: 'Type & paint',
    eyebrow: 'Typography and paint',
    description: 'Type scale, colors, borders, radii, shadows and rings.',
    coverage: ['text', 'font', 'leading', 'colors', 'border', 'rounded', 'shadow', 'ring'],
    children: typePaintChildren,
  },
  {
    id: 'controls',
    label: 'Controls & states',
    eyebrow: 'Controls and states',
    description: 'Native controls with hover, active, focus, checked and disabled variants.',
    coverage: ['button', 'input', 'select', 'hover', 'active', 'focus', 'checked', 'disabled'],
    children: controlsChildren,
  },
  {
    id: 'responsive',
    label: 'Responsive & overflow',
    eyebrow: 'Responsive and overflow',
    description: 'Surface-relative breakpoints, arbitrary values and scroll ownership.',
    coverage: ['md:', 'w-[13rem]', 'max-w-full', 'overflow-auto', 'max-height'],
    children: responsiveChildren,
  },
];

export function createTailwindShowcaseSiteData(tab: TailwindShowcaseTab): SiteData {
  return {
    root: {
      children: [{
        type: 'main',
        id: `showcase-${tab.id}-root`,
        class: rootClass,
        children: [...tab.children],
      }],
    },
    styles: [{
      selector: 'root',
      background: '#020617',
      color: '#f1f5f9',
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
    }],
    meta: {
      description: `Tailwind visual comparison: ${tab.label}`,
    },
  };
}

export function tailwindShowcaseReferenceNodes(tab: TailwindShowcaseTab): readonly DOMElement[] {
  return createTailwindShowcaseSiteData(tab).root.children;
}
