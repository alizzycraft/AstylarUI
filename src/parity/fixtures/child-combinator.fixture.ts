import { ParityFixture } from '../parity.types';

export const childCombinatorFixture: ParityFixture = {
  id: 'child-combinator',
  title: 'Direct-child combinator scoping',
  category: 'selectors-cascade',
  expectedBehavior:
    'A child combinator matches only an immediate child, not an otherwise identical element nested more deeply.',
  measurementIds: ['child-card', 'direct-child', 'nested-child'],
  reference: {
    html: `
      <section id="child-card" class="child-card">
        <div id="direct-child" class="status-chip">Direct child</div>
        <div id="child-wrapper"><div id="nested-child" class="status-chip">Nested child</div></div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #child-card { box-sizing: border-box; position: absolute; left: 110px; top: 80px; width: 500px; height: 300px; padding: 28px; background: #e2e8f0; }
      .status-chip { box-sizing: border-box; position: absolute; width: 190px; height: 64px; padding: 18px; border: 0; background: #fee2e2; color: #7f1d1d; font-family: Arial, sans-serif; font-size: 16px; line-height: 28px; }
      .child-card > .status-chip { background: #dbeafe; color: #1e3a8a; }
      #direct-child { left: 34px; top: 38px; }
      #child-wrapper { box-sizing: border-box; position: absolute; left: 250px; top: 136px; width: 220px; height: 110px; background: #ffffff; }
      #nested-child { left: 14px; top: 20px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#child-card', boxSizing: 'border-box', position: 'absolute', left: '110px', top: '80px', width: '500px', height: '300px', padding: '28px', background: '#e2e8f0' },
      { selector: '.status-chip', boxSizing: 'border-box', position: 'absolute', width: '190px', height: '64px', padding: '18px', borderWidth: '0', background: '#fee2e2', color: '#7f1d1d', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '28px' },
      { selector: '.child-card > .status-chip', background: '#dbeafe', color: '#1e3a8a' },
      { selector: '#direct-child', left: '34px', top: '38px' },
      { selector: '#child-wrapper', boxSizing: 'border-box', position: 'absolute', left: '250px', top: '136px', width: '220px', height: '110px', background: '#ffffff' },
      { selector: '#nested-child', left: '14px', top: '20px' },
    ],
    root: {
      children: [
        {
          type: 'section',
          id: 'child-card',
          class: 'child-card',
          children: [
            { type: 'div', id: 'direct-child', class: 'status-chip', textContent: 'Direct child' },
            {
              type: 'div',
              id: 'child-wrapper',
              children: [
                { type: 'div', id: 'nested-child', class: 'status-chip', textContent: 'Nested child' },
              ],
            },
          ],
        },
      ],
    },
  },
};
