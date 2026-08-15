import { ParityFixture } from '../parity.types';

export const percentageSizingFixture: ParityFixture = {
  id: 'percentage-sizing',
  title: 'Viewport-root percentage sizing',
  category: 'box-model-units',
  expectedBehavior: 'Percentage offsets and dimensions resolve against the root containing block.',
  measurementIds: ['percentage-box'],
  reference: {
    html: '<div id="percentage-box">Percentage sizing</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff7ed; font-family: Arial, sans-serif; }
      #percentage-box {
        box-sizing: border-box !important; position: absolute; left: 10%; top: 15%;
        width: 50%; height: 25%; padding: 16px; border: 2px solid #ea580c;
        background: #ffedd5; color: #7c2d12; font-family: Arial, sans-serif;
        font-size: 16px; line-height: 20px;
      }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff7ed' },
      {
        selector: '#percentage-box', position: 'absolute', left: '10%', top: '15%',
        width: '50%', height: '25%', boxSizing: 'border-box', padding: '16px',
        borderWidth: '2px', borderStyle: 'solid', borderColor: '#ea580c',
        background: '#ffedd5', color: '#7c2d12', fontFamily: 'Arial, sans-serif',
        fontSize: '16px', lineHeight: '20px'
      }
    ],
    root: { children: [{ type: 'div', id: 'percentage-box', textContent: 'Percentage sizing' }] }
  }
};
