import { ParityFixture } from '../parity.types';

export const nestedPositioningFixture: ParityFixture = {
  id: 'nested-positioning',
  title: 'Nested absolute positioning',
  category: 'positioning-stacking',
  expectedBehavior: 'An absolute child uses the padding box of its positioned parent as its containing block.',
  measurementIds: ['position-parent', 'position-child'],
  reference: {
    html: '<div id="position-parent"><div id="position-child">Nested</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f0fdf4; font-family: Arial, sans-serif; }
      #position-parent {
        box-sizing: border-box !important; position: absolute; left: 90px; top: 70px;
        width: 420px; height: 300px; padding: 24px; border: 4px solid #15803d;
        background: #dcfce7;
      }
      #position-child {
        box-sizing: border-box !important; position: absolute; left: 36px; top: 42px;
        width: 180px; height: 90px; padding: 12px; border: 2px solid #0f766e;
        background: #ccfbf1; color: #134e4a; font-family: Arial, sans-serif;
        font-size: 16px; line-height: 20px;
      }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdf4' },
      {
        selector: '#position-parent', position: 'absolute', left: '90px', top: '70px',
        width: '420px', height: '300px', boxSizing: 'border-box', padding: '24px',
        borderWidth: '4px', borderStyle: 'solid', borderColor: '#15803d', background: '#dcfce7'
      },
      {
        selector: '#position-child', position: 'absolute', left: '36px', top: '42px',
        width: '180px', height: '90px', boxSizing: 'border-box', padding: '12px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#0f766e',
        background: '#ccfbf1', color: '#134e4a', fontFamily: 'Arial, sans-serif',
        fontSize: '16px', lineHeight: '20px'
      }
    ],
    root: {
      children: [{
        type: 'div', id: 'position-parent',
        children: [{ type: 'div', id: 'position-child', textContent: 'Nested' }]
      }]
    }
  }
};
