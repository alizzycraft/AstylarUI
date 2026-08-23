import { ParityFixture } from '../parity.types';

export const responsiveViewportUnitsFixture: ParityFixture = {
  id: 'responsive-viewport-units',
  title: 'Viewport-relative responsive geometry',
  category: 'responsive',
  expectedBehavior:
    'Viewport-relative offsets and dimensions recompute against desktop, tablet, and mobile viewport profiles.',
  measurementIds: ['responsive-vw-card'],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  reference: {
    html: '<div id="responsive-vw-card">Responsive card</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #responsive-vw-card { box-sizing: border-box; position: absolute; left: 10vw; top: 12vh; width: 55vw; height: 24vh; padding: 18px; border: 0; background: #e0f2fe; color: #0c4a6e; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#responsive-vw-card', boxSizing: 'border-box', position: 'absolute', left: '10vw', top: '12vh', width: '55vw', height: '24vh', padding: '18px', borderWidth: '0', background: '#e0f2fe', color: '#0c4a6e', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '24px' },
    ],
    root: {
      children: [
        { type: 'div', id: 'responsive-vw-card', textContent: 'Responsive card' },
      ],
    },
  },
};
