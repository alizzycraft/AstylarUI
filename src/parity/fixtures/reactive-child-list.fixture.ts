import type { SiteData } from '../../app/types/site-data';
import type { ParityFixture } from '../parity.types';

const styles = [
  { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif' },
  { selector: '#live-grid', boxSizing: 'border-box' as const, display: 'grid', position: 'absolute' as const, left: '180px', top: '90px', width: '440px', height: 'auto', gridTemplateColumns: '196px 196px', gap: '12px', padding: '12px', background: '#cbd5e1' },
  { selector: '.live-card', boxSizing: 'border-box' as const, width: 'auto', height: '60px', padding: '12px', background: '#ffffff', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '36px' },
];

const createSiteData = (updated: boolean): SiteData => ({
  styles,
  root: { children: [{
    type: 'section', id: 'live-grid', children: updated
      ? [
          { type: 'article', id: 'live-gamma', class: 'live-card', textContent: 'Gamma moved first' },
          { type: 'article', id: 'live-alpha', class: 'live-card', textContent: 'Alpha moved second' },
          { type: 'article', id: 'live-delta', class: 'live-card', textContent: 'Delta added' },
        ]
      : [
          { type: 'article', id: 'live-alpha', class: 'live-card', textContent: 'Alpha' },
          { type: 'article', id: 'live-beta', class: 'live-card', textContent: 'Beta' },
          { type: 'article', id: 'live-gamma', class: 'live-card', textContent: 'Gamma' },
        ],
  }] },
});

export const reactiveChildListFixture: ParityFixture = {
  id: 'reactive-child-list',
  title: 'Reactive implicit Grid child list',
  category: 'responsive',
  expectedBehavior: 'Removing, reordering, relabeling, and adding Grid children reflows implicit rows in the existing scene without leaving the removed child behind.',
  measurementIds: ['live-grid', 'live-gamma', 'live-alpha', 'live-delta'],
  expectedMissingIds: ['live-beta'],
  reference: {
    html: '<section id="live-grid"><article id="live-alpha" class="live-card">Alpha</article><article id="live-beta" class="live-card">Beta</article><article id="live-gamma" class="live-card">Gamma</article></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #live-grid, #live-grid * { box-sizing:border-box; }
      #live-grid { display:grid; position:absolute; left:180px; top:90px; width:440px; height:auto; grid-template-columns:196px 196px; gap:12px; padding:12px; background:#cbd5e1; }
      .live-card { width:auto; height:60px; padding:12px; background:#fff; color:#0f172a; font:400 14px/36px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData(false),
  dynamicSteps: [{
    id: 'replace-grid-children',
    referenceMutations: [{
      type: 'set-children',
      elementId: 'live-grid',
      html: '<article id="live-gamma" class="live-card">Gamma moved first</article><article id="live-alpha" class="live-card">Alpha moved second</article><article id="live-delta" class="live-card">Delta added</article>',
    }],
    siteData: createSiteData(true),
  }],
};
