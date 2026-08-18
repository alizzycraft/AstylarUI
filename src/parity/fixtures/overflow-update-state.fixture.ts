import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const panelColors = ['#4338ca', '#0f766e', '#b45309', '#be123c', '#0369a1'];
const panelNames = ['One', 'Two', 'Three', 'Four', 'Five'];

const createSiteData = (panelCount: number, status: string): SiteData => ({
  styles: [
    { selector: 'root', background: '#fff7ed', fontFamily: 'Arial, sans-serif' },
    { selector: '#update-shell', position: 'absolute', left: '190px', top: '100px', width: '420px', height: '360px', padding: '40px', background: '#fed7aa' },
    { selector: '#update-scroll', boxSizing: 'border-box', width: '240px', height: '160px', margin: '0', padding: '0', overflow: 'auto', background: '#ffffff' },
    { selector: '#update-content', boxSizing: 'border-box', width: '240px', height: `${panelCount * 60}px`, margin: '0', padding: '0' },
    { selector: '#update-content > div', boxSizing: 'border-box', width: '240px', height: '60px', margin: '0', padding: '14px 18px', color: '#ffffff', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '32px' },
    ...panelColors.map((background, index) => ({
      selector: `#update-panel-${index + 1}`,
      background,
    })),
    { selector: '#update-status', width: '300px', height: '40px', margin: '24px 0 0', color: '#7c2d12', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px' },
  ],
  root: { children: [{
    type: 'section', id: 'update-shell', children: [
      { type: 'div', id: 'update-scroll', children: [{
        type: 'div', id: 'update-content', children: panelNames.slice(0, panelCount).map((name, index) => ({
          type: 'div', id: `update-panel-${index + 1}`, textContent: `Panel ${name}`,
        })),
      }] },
      { type: 'div', id: 'update-status', textContent: status },
    ],
  }] },
});

export const overflowUpdateStateFixture: ParityFixture = {
  id: 'overflow-update-state',
  title: 'Scroll state across compatible updates',
  category: 'overflow-scrolling',
  expectedBehavior:
    'A stable unique scroll container preserves its offset through a compatible sibling update and clamps that offset when a later compatible update shortens its content.',
  measurementIds: [
    'update-shell', 'update-scroll', 'update-content',
    'update-panel-1', 'update-panel-2', 'update-panel-3', 'update-status',
  ],
  scrollIds: ['update-scroll'],
  interactionSteps: [
    { id: 'scroll-before-update', actions: [{ type: 'wheel', elementId: 'update-scroll', deltaY: 120 }] },
    { id: 'preserve-compatible-offset', actions: [{ type: 'apply-update', stepIndex: 0 }] },
    { id: 'clamp-after-content-shrink', actions: [{ type: 'apply-update', stepIndex: 1 }] },
  ],
  reference: {
    html: `
      <section id="update-shell">
        <div id="update-scroll">
          <div id="update-content">
            <div id="update-panel-1">Panel One</div>
            <div id="update-panel-2">Panel Two</div>
            <div id="update-panel-3">Panel Three</div>
            <div id="update-panel-4">Panel Four</div>
            <div id="update-panel-5">Panel Five</div>
          </div>
        </div>
        <div id="update-status">Initial content</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fff7ed; font-family:Arial,sans-serif; }
      #update-shell { position:absolute; left:190px; top:100px; width:420px; height:360px; padding:40px; background:#fed7aa; }
      #update-scroll { box-sizing:border-box; width:240px; height:160px; margin:0; padding:0; overflow:auto; scrollbar-width:none; background:#ffffff; }
      #update-scroll::-webkit-scrollbar { display:none; }
      #update-content { box-sizing:border-box; width:240px; height:300px; margin:0; padding:0; }
      #update-content > div { box-sizing:border-box; width:240px; height:60px; margin:0; padding:14px 18px; color:#ffffff; font:700 16px/32px Arial,sans-serif; }
      #update-panel-1 { background:#4338ca; }
      #update-panel-2 { background:#0f766e; }
      #update-panel-3 { background:#b45309; }
      #update-panel-4 { background:#be123c; }
      #update-panel-5 { background:#0369a1; }
      #update-status { width:300px; height:40px; margin:24px 0 0; color:#7c2d12; font:700 16px/24px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData(5, 'Initial content'),
  dynamicSteps: [{
    id: 'compatible-sibling-update',
    referenceMutations: [{
      type: 'set-text', elementId: 'update-status', textContent: 'Sibling updated',
    }],
    siteData: createSiteData(5, 'Sibling updated'),
  }, {
    id: 'compatible-content-shrink',
    referenceMutations: [{
      type: 'set-children', elementId: 'update-content',
      html: '<div id="update-panel-1">Panel One</div><div id="update-panel-2">Panel Two</div><div id="update-panel-3">Panel Three</div>',
    }, {
      type: 'set-style', elementId: 'update-content', property: 'height', value: '180px',
    }, {
      type: 'set-text', elementId: 'update-status', textContent: 'Content shortened',
    }],
    siteData: createSiteData(3, 'Content shortened'),
  }],
};
