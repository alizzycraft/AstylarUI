import { ParityFixture } from '../parity.types';

export const overflowHiddenFixture: ParityFixture = {
  id: 'overflow-hidden',
  title: 'Hidden overflow clips positioned descendants',
  category: 'overflow-scrolling',
  expectedBehavior:
    'A child extending beyond an overflow-hidden parent remains laid out at its authored size but paints only inside the parent clipping edge.',
  measurementIds: ['clip-parent', 'clip-child'],
  reference: {
    html: `
      <div id="clip-parent">
        <div id="clip-child"></div>
      </div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #clip-parent { box-sizing: border-box; position: absolute; left: 180px; top: 120px; width: 240px; height: 180px; margin: 0; padding: 0; border: 0; overflow: hidden; background: #dbeafe; }
      #clip-child { box-sizing: border-box; position: absolute; left: 90px; top: 80px; width: 220px; height: 150px; margin: 0; padding: 0; border: 0; background: #f97316; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#clip-parent', boxSizing: 'border-box', position: 'absolute', left: '180px', top: '120px', width: '240px', height: '180px', margin: '0', padding: '0', borderWidth: '0', overflow: 'hidden', background: '#dbeafe' },
      { selector: '#clip-child', boxSizing: 'border-box', position: 'absolute', left: '90px', top: '80px', width: '220px', height: '150px', margin: '0', padding: '0', borderWidth: '0', background: '#f97316' },
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'clip-parent',
          children: [{ type: 'div', id: 'clip-child' }],
        },
      ],
    },
  },
};
