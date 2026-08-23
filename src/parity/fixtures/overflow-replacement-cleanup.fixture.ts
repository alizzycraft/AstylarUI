import type { DOMElement } from '../../app/types/dom-element';
import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const sharedStyles: SiteData['styles'] = [
  { selector: 'root', background: '#f5f3ff', fontFamily: 'Arial, sans-serif' },
  { selector: '#cleanup-shell', position: 'absolute', left: '180px', top: '90px', width: '440px', height: '420px', padding: '40px', background: '#ddd6fe' },
  { selector: '#volatile-scroll', boxSizing: 'border-box', width: '240px', height: '140px', margin: '0 0 20px', padding: '0', overflow: 'auto', background: '#ffffff' },
  { selector: '#volatile-scroll.disabled-scroll', overflow: 'hidden' },
  { selector: '#volatile-scroll.duplicate-scroll', position: 'absolute', left: '40px', top: '40px', width: '240px', height: '100px', margin: '0' },
  { selector: '.cleanup-content', boxSizing: 'border-box', width: '240px', height: '300px', margin: '0', padding: '0' },
  { selector: '.cleanup-panel', boxSizing: 'border-box', width: '240px', height: '60px', margin: '0', padding: '14px 18px', background: '#6d28d9', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '32px' },
  { selector: '#cleanup-status', width: '320px', height: '36px', margin: '0', color: '#4c1d95', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px' },
];

const makeContent = (withIds = true): DOMElement => ({
  type: 'div',
  id: withIds ? 'cleanup-content' : undefined,
  class: 'cleanup-content',
  children: Array.from({ length: 5 }, (_, index) => ({
    type: 'div',
    id: withIds ? `cleanup-panel-${index + 1}` : undefined,
    class: 'cleanup-panel',
    textContent: `Panel ${index + 1}`,
  })),
});

const makeScroll = (className?: string, withIds = true): DOMElement => ({
  type: 'div', id: 'volatile-scroll', class: className, children: [makeContent(withIds)],
});

const createSiteData = (
  status: string,
  content: DOMElement[],
): SiteData => ({
  styles: sharedStyles,
  root: { children: [{
    type: 'section', id: 'cleanup-shell', children: [
      ...content,
      { type: 'div', id: 'cleanup-status', textContent: status },
    ],
  }] },
});

const panelHtml = Array.from({ length: 5 }, (_, index) =>
  `<div class="cleanup-panel">Panel ${index + 1}</div>`).join('');
const uniqueHtml = `<div id="volatile-scroll"><div id="cleanup-content" class="cleanup-content">${panelHtml}</div></div>`;

export const overflowReplacementCleanupFixture: ParityFixture = {
  id: 'overflow-replacement-cleanup',
  title: 'Removed and incompatible scroll cleanup',
  category: 'overflow-scrolling',
  expectedBehavior:
    'A disabled, removed, or duplicate scroll-container identity leaves no live registry state, and later reuse of the ID starts from the authored zero offset rather than resurrecting stale state.',
  measurementIds: ['cleanup-shell', 'volatile-scroll', 'cleanup-status'],
  optionalMeasurementIds: ['volatile-scroll'],
  scrollIds: ['volatile-scroll'],
  interactionSteps: [
    { id: 'scroll-original', actions: [{ type: 'wheel', elementId: 'volatile-scroll', deltaY: 100 }] },
    { id: 'replace-with-disabled-overflow', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    { id: 'remove-container', actions: [{ type: 'apply-update', stepIndex: 1 }] },
    { id: 'readd-unique-container', actions: [{ type: 'apply-update', stepIndex: 2 }] },
    { id: 'scroll-readded-container', actions: [{ type: 'wheel', elementId: 'volatile-scroll', deltaY: 80 }] },
    { id: 'replace-with-duplicates', actions: [{ type: 'apply-update', stepIndex: 3 }] },
    { id: 'readd-unique-after-duplicates', actions: [{ type: 'apply-update', stepIndex: 2 }] },
  ],
  reference: {
    html: `<section id="cleanup-shell">${uniqueHtml}<div id="cleanup-status">Original container</div></section>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f5f3ff; font-family:Arial,sans-serif; }
      #cleanup-shell { position:absolute; left:180px; top:90px; width:440px; height:420px; padding:40px; background:#ddd6fe; }
      #volatile-scroll { box-sizing:border-box; width:240px; height:140px; margin:0 0 20px; padding:0; overflow:auto; scrollbar-width:none; background:#ffffff; }
      #volatile-scroll::-webkit-scrollbar { display:none; }
      #volatile-scroll.disabled-scroll { overflow:hidden; }
      #volatile-scroll.duplicate-scroll { position:absolute; left:40px; top:40px; width:240px; height:100px; margin:0; }
      .cleanup-content { box-sizing:border-box; width:240px; height:300px; margin:0; padding:0; }
      .cleanup-panel { box-sizing:border-box; width:240px; height:60px; margin:0; padding:14px 18px; background:#6d28d9; color:#ffffff; font:700 16px/32px Arial,sans-serif; }
      #cleanup-status { width:320px; height:36px; margin:0; color:#4c1d95; font:700 16px/24px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData('Original container', [makeScroll()]),
  dynamicSteps: [{
    id: 'disabled-replacement',
    referenceMutations: [{
      type: 'set-children', elementId: 'cleanup-shell',
      html: `<div id="volatile-scroll" class="disabled-scroll"><div class="cleanup-content">${panelHtml}</div></div><div id="cleanup-status">Overflow disabled</div>`,
    }],
    siteData: createSiteData('Overflow disabled', [makeScroll('disabled-scroll', false)]),
  }, {
    id: 'container-removed',
    referenceMutations: [{
      type: 'set-children', elementId: 'cleanup-shell',
      html: '<div id="cleanup-status">Container removed</div>',
    }],
    siteData: createSiteData('Container removed', []),
  }, {
    id: 'unique-container-readded',
    referenceMutations: [{
      type: 'set-children', elementId: 'cleanup-shell',
      html: `${uniqueHtml}<div id="cleanup-status">Unique container re-added</div>`,
    }],
    siteData: createSiteData('Unique container re-added', [makeScroll()]),
  }, {
    id: 'duplicate-container-replacement',
    referenceMutations: [{
      type: 'set-children', elementId: 'cleanup-shell',
      html: `<div id="volatile-scroll" class="duplicate-scroll"><div class="cleanup-content">${panelHtml}</div></div><div id="volatile-scroll" class="duplicate-scroll"><div class="cleanup-content">${panelHtml}</div></div><div id="cleanup-status">Duplicate containers</div>`,
    }],
    siteData: createSiteData('Duplicate containers', [
      makeScroll('duplicate-scroll', false), makeScroll('duplicate-scroll', false),
    ]),
  }],
};
