import { ParityFixture } from '../parity.types';

export const flexViewportHeightFixture: ParityFixture = {
  id: 'flex-viewport-height',
  title: 'Viewport-height flex items',
  category: 'box-model-units',
  expectedBehavior:
    'Viewport-relative heights on flex items resolve against the rendered viewport rather than being parsed as unitless pixel values.',
  measurementIds: ['viewport-flex-shell', 'viewport-full-height', 'viewport-half-height'],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  reference: {
    html: `
      <div id="viewport-flex-shell">
        <div id="viewport-full-height"></div>
        <div id="viewport-half-height"></div>
      </div>
    `,
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; }
      #viewport-flex-shell { display: flex; align-items: flex-start; width: 100vw; height: 100vh; background: #e2e8f0; }
      #viewport-full-height { width: 180px; height: 100vh; background: #0f766e; }
      #viewport-half-height { width: 180px; height: 50vh; background: #67e8f9; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#viewport-flex-shell', display: 'flex', alignItems: 'flex-start', width: '100vw', height: '100vh', background: '#e2e8f0' },
      { selector: '#viewport-full-height', width: '180px', height: '100vh', background: '#0f766e' },
      { selector: '#viewport-half-height', width: '180px', height: '50vh', background: '#67e8f9' },
    ],
    root: {
      children: [{
        type: 'div',
        id: 'viewport-flex-shell',
        children: [
          { type: 'div', id: 'viewport-full-height' },
          { type: 'div', id: 'viewport-half-height' },
        ],
      }],
    },
  },
};
