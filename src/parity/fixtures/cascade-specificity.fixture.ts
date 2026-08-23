import { ParityFixture } from '../parity.types';

export const cascadeSpecificityFixture: ParityFixture = {
  id: 'cascade-specificity',
  title: 'Cascade specificity and source order',
  category: 'cascade-defaults',
  expectedBehavior: 'Type, class, ID, source order, compound selectors, and inline styles follow the CSS cascade.',
  measurementIds: ['class-wins', 'source-order', 'inline-wins'],
  reference: {
    html: `
      <div id="class-wins" class="notice featured">Class specificity</div>
      <div id="source-order" class="later earlier">Source order</div>
      <div id="inline-wins" style="background:#f97316;color:#431407">Inline style</div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      div { box-sizing: border-box !important; background: #cbd5e1; color: #0f172a; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      .notice { background: #bbf7d0; }
      div.notice.featured { color: #14532d; }
      .earlier { background: #fecaca; color: #7f1d1d; }
      .later { background: #bfdbfe; color: #1e3a8a; }
      #class-wins, #source-order, #inline-wins { position: absolute; left: 70px; width: 260px; height: 72px; padding: 16px; border: 2px solid #475569; }
      #class-wins { top: 50px; }
      #source-order { top: 145px; }
      #inline-wins { top: 240px; background: #ddd6fe; color: #4c1d95; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: 'div', boxSizing: 'border-box', background: '#cbd5e1', color: '#0f172a', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '.notice', background: '#bbf7d0' },
      { selector: 'div.notice.featured', color: '#14532d' },
      { selector: '.earlier', background: '#fecaca', color: '#7f1d1d' },
      { selector: '.later', background: '#bfdbfe', color: '#1e3a8a' },
      { selector: '#class-wins, #source-order, #inline-wins', position: 'absolute', left: '70px', width: '260px', height: '72px', padding: '16px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#475569' },
      { selector: '#class-wins', top: '50px' },
      { selector: '#source-order', top: '145px' },
      { selector: '#inline-wins', top: '240px', background: '#ddd6fe', color: '#4c1d95' }
    ],
    root: {
      children: [
        { type: 'div', id: 'class-wins', class: 'notice featured', textContent: 'Class specificity' },
        { type: 'div', id: 'source-order', class: 'later earlier', textContent: 'Source order' },
        { type: 'div', id: 'inline-wins', style: { background: '#f97316', color: '#431407' }, textContent: 'Inline style' }
      ]
    }
  }
};
