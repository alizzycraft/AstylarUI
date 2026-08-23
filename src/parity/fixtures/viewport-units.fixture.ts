import { ParityFixture } from '../parity.types';

export const viewportUnitsFixture: ParityFixture = {
  id: 'viewport-units',
  title: 'Viewport-relative sizing and offsets',
  category: 'box-model-units',
  expectedBehavior:
    'Viewport width and height units resolve against the rendered viewport for dimensions and positioned offsets.',
  measurementIds: ['viewport-unit-box'],
  reference: {
    html: '<div id="viewport-unit-box"></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f0fdfa; }
      #viewport-unit-box { box-sizing: border-box; position: absolute; left: 10vw; top: 12vh; width: 30vw; height: 20vh; border: 4px solid #0f766e; background: #99f6e4; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdfa' },
      { selector: '#viewport-unit-box', boxSizing: 'border-box', position: 'absolute', left: '10vw', top: '12vh', width: '30vw', height: '20vh', borderWidth: '4px', borderStyle: 'solid', borderColor: '#0f766e', background: '#99f6e4' },
    ],
    root: { children: [{ type: 'div', id: 'viewport-unit-box' }] },
  },
};
