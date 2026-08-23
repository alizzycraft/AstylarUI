import { ParityFixture } from '../parity.types';

export const adjacentSiblingFixture: ParityFixture = {
  id: 'adjacent-sibling',
  title: 'Adjacent-sibling combinator scoping',
  category: 'selectors-cascade',
  expectedBehavior:
    'An adjacent-sibling combinator matches only the first matching element immediately following the left-hand sibling.',
  measurementIds: ['sibling-panel', 'sibling-lead', 'sibling-adjacent', 'sibling-later'],
  reference: {
    html: `
      <section id="sibling-panel">
        <div id="sibling-lead" class="lead">Lead</div>
        <div id="sibling-adjacent" class="sibling-item">Adjacent</div>
        <div id="sibling-later" class="sibling-item">Later</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #sibling-panel { box-sizing: border-box; position: absolute; left: 100px; top: 90px; width: 560px; height: 260px; padding: 28px; background: #e2e8f0; }
      .lead, .sibling-item { box-sizing: border-box; position: absolute; top: 88px; width: 140px; height: 64px; padding: 18px; border: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 28px; }
      .lead { left: 30px; background: #fef3c7; color: #78350f; }
      .sibling-item { background: #fee2e2; color: #7f1d1d; }
      .lead + .sibling-item { background: #dcfce7; color: #14532d; }
      #sibling-adjacent { left: 200px; }
      #sibling-later { left: 370px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#sibling-panel', boxSizing: 'border-box', position: 'absolute', left: '100px', top: '90px', width: '560px', height: '260px', padding: '28px', background: '#e2e8f0' },
      { selector: '.lead, .sibling-item', boxSizing: 'border-box', position: 'absolute', top: '88px', width: '140px', height: '64px', padding: '18px', borderWidth: '0', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '28px' },
      { selector: '.lead', left: '30px', background: '#fef3c7', color: '#78350f' },
      { selector: '.sibling-item', background: '#fee2e2', color: '#7f1d1d' },
      { selector: '.lead + .sibling-item', background: '#dcfce7', color: '#14532d' },
      { selector: '#sibling-adjacent', left: '200px' },
      { selector: '#sibling-later', left: '370px' },
    ],
    root: {
      children: [
        {
          type: 'section',
          id: 'sibling-panel',
          children: [
            { type: 'div', id: 'sibling-lead', class: 'lead', textContent: 'Lead' },
            { type: 'div', id: 'sibling-adjacent', class: 'sibling-item', textContent: 'Adjacent' },
            { type: 'div', id: 'sibling-later', class: 'sibling-item', textContent: 'Later' },
          ],
        },
      ],
    },
  },
};
