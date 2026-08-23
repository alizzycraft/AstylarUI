import { ParityFixture } from '../parity.types';

export const structuralPseudoFixture: ParityFixture = {
  id: 'structural-pseudo',
  title: 'First and last child pseudo-classes',
  category: 'selectors-cascade',
  expectedBehavior:
    'The first-child and last-child pseudo-classes match authored sibling order and contribute class-level specificity.',
  measurementIds: ['pseudo-list', 'pseudo-first', 'pseudo-middle', 'pseudo-last'],
  reference: {
    html: `
      <section id="pseudo-list">
        <div id="pseudo-first" class="edge-item">First</div>
        <div id="pseudo-middle" class="edge-item">Middle</div>
        <div id="pseudo-last" class="edge-item">Last</div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #pseudo-list { box-sizing: border-box; position: absolute; left: 110px; top: 100px; width: 580px; height: 250px; padding: 28px; background: #e2e8f0; }
      .edge-item { box-sizing: border-box; position: absolute; top: 82px; width: 150px; height: 64px; padding: 18px; border: 0; background: #f1f5f9; color: #334155; font-family: Arial, sans-serif; font-size: 16px; line-height: 28px; }
      .edge-item:first-child { background: #dcfce7; color: #14532d; }
      .edge-item:last-child { background: #dbeafe; color: #1e3a8a; }
      #pseudo-first { left: 30px; }
      #pseudo-middle { left: 215px; }
      #pseudo-last { left: 400px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#pseudo-list', boxSizing: 'border-box', position: 'absolute', left: '110px', top: '100px', width: '580px', height: '250px', padding: '28px', background: '#e2e8f0' },
      { selector: '.edge-item', boxSizing: 'border-box', position: 'absolute', top: '82px', width: '150px', height: '64px', padding: '18px', borderWidth: '0', background: '#f1f5f9', color: '#334155', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '28px' },
      { selector: '.edge-item:first-child', background: '#dcfce7', color: '#14532d' },
      { selector: '.edge-item:last-child', background: '#dbeafe', color: '#1e3a8a' },
      { selector: '#pseudo-first', left: '30px' },
      { selector: '#pseudo-middle', left: '215px' },
      { selector: '#pseudo-last', left: '400px' },
    ],
    root: {
      children: [
        {
          type: 'section',
          id: 'pseudo-list',
          children: [
            { type: 'div', id: 'pseudo-first', class: 'edge-item', textContent: 'First' },
            { type: 'div', id: 'pseudo-middle', class: 'edge-item', textContent: 'Middle' },
            { type: 'div', id: 'pseudo-last', class: 'edge-item', textContent: 'Last' },
          ],
        },
      ],
    },
  },
};
