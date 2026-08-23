import { ParityFixture } from '../parity.types';

export const relativeBlockFlowFixture: ParityFixture = {
  id: 'relative-block-flow',
  title: 'Relative offsets preserve block flow',
  category: 'block-inline',
  expectedBehavior:
    'A relatively positioned block is offset from its normal position while retaining its original space in sibling flow.',
  measurementIds: ['relative-parent', 'relative-first', 'relative-shifted', 'relative-third'],
  reference: {
    html: '<div id="relative-parent"><div id="relative-first"></div><div id="relative-shifted"></div><div id="relative-third"></div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #eff6ff; }
      #relative-parent { box-sizing: border-box; position: absolute; left: 120px; top: 70px; width: 400px; height: 280px; padding: 20px; border: 3px solid #1e3a8a; background: #dbeafe; }
      #relative-first, #relative-shifted, #relative-third { box-sizing: border-box; display: block; width: 240px; height: 52px; border: 2px solid #1d4ed8; }
      #relative-first { background: #bfdbfe; }
      #relative-shifted { position: relative; left: 30px; top: 14px; background: #93c5fd; }
      #relative-third { background: #60a5fa; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eff6ff' },
      { selector: '#relative-parent', boxSizing: 'border-box', position: 'absolute', left: '120px', top: '70px', width: '400px', height: '280px', padding: '20px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#1e3a8a', background: '#dbeafe' },
      { selector: '#relative-first, #relative-shifted, #relative-third', boxSizing: 'border-box', display: 'block', width: '240px', height: '52px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#1d4ed8' },
      { selector: '#relative-first', background: '#bfdbfe' },
      { selector: '#relative-shifted', position: 'relative', left: '30px', top: '14px', background: '#93c5fd' },
      { selector: '#relative-third', background: '#60a5fa' },
    ],
    root: {
      children: [{
        type: 'div',
        id: 'relative-parent',
        children: [
          { type: 'div', id: 'relative-first' },
          { type: 'div', id: 'relative-shifted' },
          { type: 'div', id: 'relative-third' },
        ],
      }],
    },
  },
};
