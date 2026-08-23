import { ParityFixture } from '../parity.types';

export const borderBoxBasicFixture: ParityFixture = {
  id: 'border-box-basic',
  title: 'Explicit border-box geometry',
  category: 'box-model-units',
  expectedBehavior: 'Padding and border remain inside an explicitly declared border-box size.',
  measurementIds: ['border-box'],
  reference: {
    html: '<div id="border-box">Border box</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #border-box {
        box-sizing: border-box !important; position: absolute; left: 60px; top: 50px;
        width: 260px; height: 140px; padding: 18px; border: 3px solid #7c3aed;
        border-radius: 8px; background: #ede9fe; color: #2e1065;
        font-family: Arial, sans-serif; font-size: 16px; line-height: 20px;
      }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      {
        selector: '#border-box', position: 'absolute', left: '60px', top: '50px',
        width: '260px', height: '140px', boxSizing: 'border-box', padding: '18px',
        borderWidth: '3px', borderStyle: 'solid', borderColor: '#7c3aed',
        borderRadius: '8px', background: '#ede9fe', color: '#2e1065',
        fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px'
      }
    ],
    root: { children: [{ type: 'div', id: 'border-box', textContent: 'Border box' }] }
  }
};
