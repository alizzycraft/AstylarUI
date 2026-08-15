import { ParityFixture } from '../parity.types';

export const generalSiblingFixture: ParityFixture = {
  id: 'general-sibling',
  title: 'General-sibling combinator scoping',
  category: 'selectors-cascade',
  expectedBehavior:
    'A general-sibling combinator matches every qualifying later sibling while excluding matching elements before the anchor.',
  measurementIds: ['general-panel', 'general-before', 'general-lead', 'general-first', 'general-second'],
  reference: {
    html: `
      <section id="general-panel">
        <div id="general-before" class="general-item">Before</div>
        <div id="general-lead" class="general-lead">Lead</div>
        <div id="general-first" class="general-item">First later</div>
        <div id="general-second" class="general-item">Second later</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #general-panel { box-sizing: border-box; position: absolute; left: 70px; top: 100px; width: 660px; height: 250px; padding: 24px; background: #e2e8f0; }
      .general-lead, .general-item { box-sizing: border-box; position: absolute; top: 82px; width: 132px; height: 64px; padding: 18px 12px; border: 0; font-family: Arial, sans-serif; font-size: 15px; line-height: 28px; }
      .general-item { background: #fee2e2; color: #7f1d1d; }
      .general-lead { left: 178px; background: #fef3c7; color: #78350f; }
      .general-lead ~ .general-item { background: #ede9fe; color: #5b21b6; }
      #general-before { left: 24px; }
      #general-first { left: 332px; }
      #general-second { left: 486px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#general-panel', boxSizing: 'border-box', position: 'absolute', left: '70px', top: '100px', width: '660px', height: '250px', padding: '24px', background: '#e2e8f0' },
      { selector: '.general-lead, .general-item', boxSizing: 'border-box', position: 'absolute', top: '82px', width: '132px', height: '64px', padding: '18px 12px', borderWidth: '0', fontFamily: 'Arial, sans-serif', fontSize: '15px', lineHeight: '28px' },
      { selector: '.general-item', background: '#fee2e2', color: '#7f1d1d' },
      { selector: '.general-lead', left: '178px', background: '#fef3c7', color: '#78350f' },
      { selector: '.general-lead ~ .general-item', background: '#ede9fe', color: '#5b21b6' },
      { selector: '#general-before', left: '24px' },
      { selector: '#general-first', left: '332px' },
      { selector: '#general-second', left: '486px' },
    ],
    root: {
      children: [
        {
          type: 'section',
          id: 'general-panel',
          children: [
            { type: 'div', id: 'general-before', class: 'general-item', textContent: 'Before' },
            { type: 'div', id: 'general-lead', class: 'general-lead', textContent: 'Lead' },
            { type: 'div', id: 'general-first', class: 'general-item', textContent: 'First later' },
            { type: 'div', id: 'general-second', class: 'general-item', textContent: 'Second later' },
          ],
        },
      ],
    },
  },
};
