import type { ParityFixture } from '../parity.types';

const delayedSource = '/parity/image-pattern.svg?parity-delay=120';

export const reactiveNaturalImageFixture: ParityFixture = {
  id: 'reactive-natural-image',
  title: 'Delayed natural image in nested intrinsic containers',
  category: 'lists-tables-images',
  expectedBehavior:
    'A delayed image without authored dimensions adopts its natural size, including padding and border, and reflows nested height-auto Flex and Grid ancestors plus following content.',
  measurementIds: [
    'asset-grid', 'asset-card', 'asset-title', 'asset-image', 'asset-caption', 'asset-footer',
  ],
  reference: {
    html: `
      <section id="asset-grid">
        <article id="asset-card">
          <h2 id="asset-title">Loaded artwork</h2>
          <img id="asset-image" src="${delayedSource}" alt="Color pattern">
          <p id="asset-caption">Natural media determines this card height.</p>
        </article>
        <footer id="asset-footer">Following Grid row</footer>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#e2e8f0; font-family:Arial,sans-serif; }
      #asset-grid, #asset-grid * { box-sizing:border-box; }
      #asset-grid { display:grid; position:absolute; left:180px; top:70px; width:360px; height:auto; grid-template-columns:1fr; grid-template-rows:auto auto; gap:12px; padding:12px; background:#cbd5e1; }
      #asset-card { display:flex; flex-direction:column; align-items:flex-start; gap:10px; width:auto; height:auto; padding:14px; background:#ffffff; }
      #asset-title { width:280px; height:28px; margin:0; color:#0f172a; font:700 18px/28px Arial,sans-serif; }
      #asset-image { margin:0; padding:6px; border:2px solid #0f172a; background:#f8fafc; }
      #asset-caption { width:280px; height:24px; margin:0; color:#475569; font:400 13px/24px Arial,sans-serif; }
      #asset-footer { width:auto; height:36px; padding:6px 10px; background:#dbeafe; color:#1e3a8a; font:700 13px/24px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#e2e8f0', fontFamily: 'Arial, sans-serif' },
      { selector: '#asset-grid, #asset-grid *', boxSizing: 'border-box' },
      { selector: '#asset-grid', display: 'grid', position: 'absolute', left: '180px', top: '70px', width: '360px', height: 'auto', gridTemplateColumns: '1fr', gridTemplateRows: 'auto auto', gap: '12px', padding: '12px', background: '#cbd5e1' },
      { selector: '#asset-card', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: 'auto', height: 'auto', padding: '14px', background: '#ffffff' },
      { selector: '#asset-title', width: '280px', height: '28px', margin: '0', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '18px', fontWeight: '700', lineHeight: '28px' },
      { selector: '#asset-image', margin: '0', padding: '6px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#0f172a', background: '#f8fafc' },
      { selector: '#asset-caption', width: '280px', height: '24px', margin: '0', color: '#475569', fontFamily: 'Arial, sans-serif', fontSize: '13px', lineHeight: '24px' },
      { selector: '#asset-footer', width: 'auto', height: '36px', padding: '6px 10px', background: '#dbeafe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '13px', fontWeight: '700', lineHeight: '24px' },
    ],
    root: {
      children: [{
        type: 'section', id: 'asset-grid', children: [
          {
            type: 'article', id: 'asset-card', children: [
              { type: 'h2', id: 'asset-title', textContent: 'Loaded artwork' },
              { type: 'img', id: 'asset-image', src: delayedSource, alt: 'Color pattern' },
              { type: 'p', id: 'asset-caption', textContent: 'Natural media determines this card height.' },
            ],
          },
          { type: 'footer', id: 'asset-footer', textContent: 'Following Grid row' },
        ],
      }],
    },
  },
};
