import { ParityFixture } from '../parity.types';

export const semanticContainerTransparentDefaultsFixture: ParityFixture = {
  id: 'semantic-container-transparent-defaults',
  title: 'Semantic grouping container transparent defaults',
  category: 'cascade-defaults',
  expectedBehavior:
    'Unstyled section, article, and header containers remain transparent instead of receiving decorative renderer paint.',
  measurementIds: [
    'transparent-default-shell',
    'transparent-default-section',
    'transparent-default-article',
    'transparent-default-header',
  ],
  enforcedStyleProperties: {
    'transparent-default-section': ['backgroundColor'],
    'transparent-default-article': ['backgroundColor'],
    'transparent-default-header': ['backgroundColor'],
  },
  reference: {
    html: `
      <div id="transparent-default-shell">
        <section id="transparent-default-section">Section remains transparent</section>
        <article id="transparent-default-article">Article remains transparent</article>
        <header id="transparent-default-header">Header remains transparent</header>
      </div>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; color:#172033; }
      #transparent-default-shell { box-sizing:border-box; position:absolute; left:180px; top:80px; display:flex; flex-direction:column; gap:16px; width:440px; height:288px; padding:24px; background:#dbeafe; }
      #transparent-default-section,
      #transparent-default-article,
      #transparent-default-header { box-sizing:border-box; width:392px; height:64px; margin:0; padding:18px; border:2px solid #64748b; font:700 16px/24px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc', fontFamily: 'Arial, sans-serif', color: '#172033' },
      { selector: '#transparent-default-shell', boxSizing: 'border-box', position: 'absolute', left: '180px', top: '80px', display: 'flex', flexDirection: 'column', gap: '16px', width: '440px', height: '288px', padding: '24px', background: '#dbeafe' },
      { selector: '#transparent-default-section', boxSizing: 'border-box', width: '392px', height: '64px', margin: '0', padding: '18px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#64748b', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px' },
      { selector: '#transparent-default-article', boxSizing: 'border-box', width: '392px', height: '64px', margin: '0', padding: '18px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#64748b', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px' },
      { selector: '#transparent-default-header', boxSizing: 'border-box', width: '392px', height: '64px', margin: '0', padding: '18px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#64748b', fontFamily: 'Arial, sans-serif', fontSize: '16px', fontWeight: '700', lineHeight: '24px' },
    ],
    root: {
      children: [{
        type: 'div',
        id: 'transparent-default-shell',
        children: [
          { type: 'section', id: 'transparent-default-section', textContent: 'Section remains transparent' },
          { type: 'article', id: 'transparent-default-article', textContent: 'Article remains transparent' },
          { type: 'header', id: 'transparent-default-header', textContent: 'Header remains transparent' },
        ],
      }],
    },
  },
};
