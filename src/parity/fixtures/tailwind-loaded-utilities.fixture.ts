import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const rootClass = 'tw:absolute tw:left-[40px] tw:top-[40px] tw:flex tw:h-[500px] tw:w-[620px] tw:flex-col tw:bg-slate-900 tw:text-slate-100';
const headerClass = 'tw:flex tw:h-20 tw:w-[620px] tw:items-center tw:justify-between tw:bg-slate-800 tw:p-5';
const titleClass = 'tw:m-0 tw:h-10 tw:w-[300px] tw:py-1 tw:text-xl tw:font-bold tw:leading-8 tw:text-white';
const badgeClass = 'tw:block tw:h-8 tw:w-[120px] tw:rounded-lg tw:bg-blue-600 tw:px-3 tw:py-2 tw:text-center tw:text-xs tw:font-bold tw:leading-4 tw:text-white';
const contentClass = 'tw:flex tw:h-[420px] tw:w-[620px] tw:flex-col tw:gap-4 tw:md:flex-row';
const copyClass = 'tw:block tw:h-[104px] tw:w-[620px] tw:rounded-lg tw:bg-slate-800 tw:p-4 tw:md:h-[420px] tw:md:w-[204px]';
const kickerClass = 'tw:m-0 tw:h-5 tw:w-[588px] tw:text-xs tw:font-bold tw:uppercase tw:leading-5 tw:tracking-widest tw:text-blue-300 tw:md:w-[172px]';
const descriptionClass = 'tw:m-0 tw:h-12 tw:w-[588px] tw:text-sm tw:leading-5 tw:text-slate-300 tw:md:w-[172px]';
const controlsClass = 'tw:grid tw:h-[300px] tw:w-[620px] tw:grid-cols-2 tw:grid-rows-[44px_44px_64px] tw:items-start tw:gap-3 tw:bg-slate-900 tw:md:h-[420px] tw:md:w-[400px]';
const actionClass = 'tw:m-0 tw:h-11 tw:w-full tw:appearance-none tw:rounded-lg tw:border tw:border-blue-400 tw:bg-blue-600 tw:px-4 tw:py-2 tw:text-sm tw:font-bold tw:text-white tw:hover:bg-blue-500 tw:active:scale-[0.98] tw:focus:ring-2 tw:focus:ring-blue-300';
const inputClass = 'tw:m-0 tw:h-11 tw:w-full tw:appearance-none tw:rounded-lg tw:border tw:border-slate-600 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-sm tw:text-white tw:focus:border-blue-400';
const selectClass = 'tw:m-0 tw:h-11 tw:w-full tw:appearance-none tw:rounded-lg tw:border tw:border-slate-600 tw:bg-slate-800 tw:px-3 tw:py-2 tw:text-sm tw:text-white';
const checkLabelClass = 'tw:inline-flex tw:h-11 tw:w-full tw:items-center tw:gap-2 tw:text-sm tw:text-slate-200';
const checkClass = 'tw:m-0 tw:h-4 tw:w-4 tw:rounded tw:bg-blue-500';
const disabledClass = 'tw:m-0 tw:h-11 tw:w-full tw:rounded-lg tw:bg-slate-600 tw:px-4 tw:py-2 tw:text-center tw:text-sm tw:font-bold tw:text-slate-300';
const scrollClass = 'tw:h-16 tw:w-full tw:overflow-auto tw:rounded-lg tw:bg-slate-800 tw:p-0 tw:text-xs tw:text-slate-300 tw:shadow-inner';
const scrollContentClass = 'tw:h-[120px] tw:w-full tw:p-2';
const scrollLineClass = 'tw:m-0 tw:h-5 tw:leading-5';

const createSiteData = (revision: number): SiteData => ({
  styles: [{ selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' }],
  root: {
    children: [{
      type: 'section', id: 'tailwind-parity-root', class: rootClass,
      children: [
        {
          type: 'header', id: 'tailwind-parity-header', class: headerClass,
          children: [
            { type: 'h1', id: 'tailwind-parity-title', class: titleClass, textContent: `Tailwind workspace ${revision}` },
            { type: 'div', id: 'tailwind-parity-badge', class: badgeClass, textContent: `Revision ${revision}` },
          ],
        },
        {
          type: 'main', id: 'tailwind-parity-content', class: contentClass,
          children: [
            {
              type: 'article', id: 'tailwind-parity-copy', class: copyClass,
              children: [
                { type: 'p', id: 'tailwind-parity-kicker', class: kickerClass, textContent: 'Loaded global CSS' },
                { type: 'p', id: 'tailwind-parity-description', class: descriptionClass, textContent: 'Browser-generated Tailwind utilities feed the Astylar style pipeline.' },
              ],
            },
            {
              type: 'div', id: 'tailwind-parity-controls', class: controlsClass,
              children: [
                { type: 'div', id: 'tailwind-parity-action', textContent: 'Preview', class: actionClass },
                { type: 'input', id: 'tailwind-parity-input', inputType: 'text', value: '', placeholder: 'Utility input', class: inputClass },
                { type: 'div', id: 'tailwind-parity-select', textContent: 'Ready', class: selectClass },
                {
                  type: 'div', id: 'tailwind-parity-check-label', class: checkLabelClass,
                  children: [
                    { type: 'span', id: 'tailwind-parity-check', class: checkClass },
                    { type: 'span', id: 'tailwind-parity-check-copy', textContent: 'Checked' },
                  ],
                },
                { type: 'div', id: 'tailwind-parity-disabled', textContent: 'Disabled', class: disabledClass },
                {
                  type: 'div', id: 'tailwind-parity-scroll', class: scrollClass,
                  children: [{
                    type: 'div', id: 'tailwind-parity-scroll-content', class: scrollContentClass,
                    children: Array.from({ length: 6 }, (_, index) => ({
                      type: 'p' as const,
                      id: `tailwind-parity-line-${index + 1}`,
                      class: scrollLineClass,
                      textContent: `Line ${index + 1}`,
                    })),
                  }],
                },
              ],
            },
          ],
        },
      ],
    }],
  },
});

export const tailwindLoadedUtilitiesFixture: ParityFixture = {
  id: 'tailwind-loaded-utilities',
  title: 'Loaded Tailwind utilities',
  category: 'composed-application',
  expectedBehavior:
    'The browser and Astylar consume the same prefixed Tailwind 4.3.3 utility output, including escaped classes, browser-resolved values, responsive variants, controls, states, and overflow.',
  viewportIds: ['desktop', 'tailwind-retina'],
  measurementIds: [
    'tailwind-parity-root', 'tailwind-parity-header', 'tailwind-parity-title',
    'tailwind-parity-badge', 'tailwind-parity-content', 'tailwind-parity-copy',
    'tailwind-parity-kicker', 'tailwind-parity-description', 'tailwind-parity-controls',
    'tailwind-parity-action', 'tailwind-parity-input', 'tailwind-parity-select',
    'tailwind-parity-check-label', 'tailwind-parity-check', 'tailwind-parity-disabled',
    'tailwind-parity-scroll', 'tailwind-parity-scroll-content', 'tailwind-parity-line-6',
  ],
  scrollIds: ['tailwind-parity-scroll'],
  scrollStateTolerancePx: 2.1,
  sharpnessIds: ['tailwind-parity-title', 'tailwind-parity-action'],
  enforcedStyleProperties: {
    'tailwind-parity-root': ['display', 'flexDirection', 'width', 'height', 'backgroundColor'],
    'tailwind-parity-content': ['display', 'flexDirection', 'gap', 'width', 'height'],
    'tailwind-parity-copy': ['display', 'width', 'height', 'paddingTop', 'backgroundColor'],
    'tailwind-parity-controls': ['display', 'width', 'height', 'gridTemplateColumns', 'gridTemplateRows', 'gap'],
    'tailwind-parity-action': ['width', 'height', 'backgroundColor', 'color', 'borderRadius', 'borderTopColor'],
    'tailwind-parity-disabled': ['backgroundColor', 'color'],
    'tailwind-parity-scroll': ['overflowX', 'overflowY', 'width', 'height', 'backgroundColor'],
  },
  interactionIds: ['tailwind-parity-action', 'tailwind-parity-input'],
  interactionEventTypes: [
    'pointerenter', 'pointerdown', 'pointerup', 'click', 'focus', 'blur',
    'keydown', 'keyup', 'input', 'change',
  ],
  interactionSteps: [
    { id: 'hover-action', actions: [{ type: 'hover', elementId: 'tailwind-parity-action' }] },
    { id: 'hold-action', actions: [{ type: 'pointer-down', elementId: 'tailwind-parity-action' }] },
    { id: 'release-action', actions: [{ type: 'pointer-up' }] },
    { id: 'focus-input', actions: [{ type: 'press-key', key: 'Tab' }] },
    { id: 'scroll-content', actions: [{ type: 'wheel', elementId: 'tailwind-parity-scroll', deltaY: 40 }] },
    { id: 'reach-scroll-end', actions: [{ type: 'wheel', elementId: 'tailwind-parity-scroll', deltaY: 500 }] },
    { id: 'update-revision', actions: [{ type: 'apply-update', stepIndex: 0 }] },
  ],
  reference: {
    html: `
      <section id="tailwind-parity-root" class="${rootClass}">
        <header id="tailwind-parity-header" class="${headerClass}">
          <h1 id="tailwind-parity-title" class="${titleClass}">Tailwind workspace 1</h1>
          <div id="tailwind-parity-badge" class="${badgeClass}">Revision 1</div>
        </header>
        <main id="tailwind-parity-content" class="${contentClass}">
          <article id="tailwind-parity-copy" class="${copyClass}">
            <p id="tailwind-parity-kicker" class="${kickerClass}">Loaded global CSS</p>
            <p id="tailwind-parity-description" class="${descriptionClass}">Browser-generated Tailwind utilities feed the Astylar style pipeline.</p>
          </article>
          <div id="tailwind-parity-controls" class="${controlsClass}">
            <div id="tailwind-parity-action" class="${actionClass}">Preview</div>
            <input id="tailwind-parity-input" type="text" class="${inputClass}" placeholder="Utility input">
            <div id="tailwind-parity-select" class="${selectClass}">Ready</div>
            <div id="tailwind-parity-check-label" class="${checkLabelClass}"><span id="tailwind-parity-check" class="${checkClass}"></span><span id="tailwind-parity-check-copy">Checked</span></div>
            <div id="tailwind-parity-disabled" class="${disabledClass}">Disabled</div>
            <div id="tailwind-parity-scroll" class="${scrollClass}">
              <div id="tailwind-parity-scroll-content" class="${scrollContentClass}"><p id="tailwind-parity-line-1" class="${scrollLineClass}">Line 1</p><p id="tailwind-parity-line-2" class="${scrollLineClass}">Line 2</p><p id="tailwind-parity-line-3" class="${scrollLineClass}">Line 3</p><p id="tailwind-parity-line-4" class="${scrollLineClass}">Line 4</p><p id="tailwind-parity-line-5" class="${scrollLineClass}">Line 5</p><p id="tailwind-parity-line-6" class="${scrollLineClass}">Line 6</p></div>
            </div>
          </div>
        </main>
      </section>
    `,
    css: '#parity-reference-viewport { position:relative; overflow:hidden; background:#e2e8f0; font-family:Arial,sans-serif; }',
  },
  siteData: createSiteData(1),
  dynamicSteps: [{
    id: 'revision-two',
    referenceMutations: [
      { type: 'set-text', elementId: 'tailwind-parity-title', textContent: 'Tailwind workspace 2' },
      { type: 'set-text', elementId: 'tailwind-parity-badge', textContent: 'Revision 2' },
    ],
    siteData: createSiteData(2),
  }],
};
