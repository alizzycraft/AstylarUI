import { ParityFixture } from '../parity.types';

export const fixedPositioningFixture: ParityFixture = {
  id: 'fixed-positioning',
  title: 'Fixed positioning against the viewport',
  category: 'positioning-stacking',
  expectedBehavior:
    'A fixed descendant is removed from normal flow and resolves its offsets against the viewport rather than its positioned ancestor.',
  measurementIds: ['fixed-parent', 'fixed-child'],
  reference: {
    html: '<div id="fixed-parent"><div id="fixed-child">Viewport fixed</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff7ed; font-family: Arial, sans-serif; }
      #fixed-parent { box-sizing: border-box; position: absolute; left: 260px; top: 180px; width: 330px; height: 220px; padding: 24px; border: 4px solid #c2410c; background: #ffedd5; }
      #fixed-child { box-sizing: border-box; position: fixed; left: 40px; top: 50px; width: 210px; height: 64px; padding: 14px; border: 3px solid #1d4ed8; background: #dbeafe; color: #1e3a8a; font-family: Arial, sans-serif; font-size: 17px; line-height: 24px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff7ed' },
      { selector: '#fixed-parent', boxSizing: 'border-box', position: 'absolute', left: '260px', top: '180px', width: '330px', height: '220px', padding: '24px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#c2410c', background: '#ffedd5' },
      { selector: '#fixed-child', boxSizing: 'border-box', position: 'fixed', left: '40px', top: '50px', width: '210px', height: '64px', padding: '14px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#1d4ed8', background: '#dbeafe', color: '#1e3a8a', fontFamily: 'Arial, sans-serif', fontSize: '17px', lineHeight: '24px' },
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'fixed-parent',
          children: [{ type: 'div', id: 'fixed-child', textContent: 'Viewport fixed' }],
        },
      ],
    },
  },
};
