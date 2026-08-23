import { ParityFixture } from '../parity.types';

export const universalSelectorFixture: ParityFixture = {
  id: 'universal-selector',
  title: 'Universal selector cascade',
  category: 'cascade-defaults',
  expectedBehavior:
    'The universal selector applies with zero specificity and remains overridden property-by-property by type and class rules.',
  measurementIds: ['universal-one', 'universal-two'],
  reference: {
    html: '<div id="universal-one" class="accent">Universal base</div><span id="universal-two">Type override</span>',
    css: `
      * { box-sizing: border-box; margin: 0; padding: 10px; border: 3px solid #475569; background: #e2e8f0; color: #334155; font-family: Arial, sans-serif; font-size: 16px; line-height: 22px; }
      html, body { padding: 0; border: 0; background: #f8fafc; }
      #parity-reference-viewport { position: relative; overflow: hidden; padding: 0; border: 0; background: #f8fafc; }
      #universal-one, #universal-two { position: absolute; left: 100px; width: 260px; height: 60px; }
      #universal-one { top: 100px; }
      #universal-two { display: block; top: 190px; background: #dbeafe; }
      .accent { color: #7c2d12; }
    `,
  },
  siteData: {
    styles: [
      { selector: '*', boxSizing: 'border-box', margin: '0', padding: '10px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#475569', background: '#e2e8f0', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '22px' },
      { selector: 'root', padding: '0', borderWidth: '0', background: '#f8fafc' },
      { selector: '#universal-one, #universal-two', position: 'absolute', left: '100px', width: '260px', height: '60px' },
      { selector: '#universal-one', top: '100px' },
      { selector: '#universal-two', display: 'block', top: '190px', background: '#dbeafe' },
      { selector: '.accent', color: '#7c2d12' },
    ],
    root: {
      children: [
        { type: 'div', id: 'universal-one', class: 'accent', textContent: 'Universal base' },
        { type: 'span', id: 'universal-two', textContent: 'Type override' },
      ],
    },
  },
};
