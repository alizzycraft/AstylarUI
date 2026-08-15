import { ParityFixture } from '../parity.types';

export const multilineWrappingFixture: ParityFixture = {
  id: 'multiline-wrapping',
  title: 'Multiline wrapping and pixel line height',
  category: 'typography',
  expectedBehavior:
    'Normal whitespace wraps at word boundaries and pixel line-height uses the resolved font size.',
  measurementIds: ['wrap-box'],
  reference: {
    html: '<div id="wrap-box">Astylar layouts should wrap ordinary text at the same word boundaries as a browser.</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f0fdf4; font-family: Arial, sans-serif; }
      #wrap-box { box-sizing: border-box !important; position: absolute; left: 90px; top: 70px; width: 280px; height: 170px; padding: 18px; border: 3px solid #15803d; background: #dcfce7; color: #14532d; font-family: Arial, sans-serif; font-size: 18px; line-height: 27px; white-space: normal; text-align: left; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdf4' },
      { selector: '#wrap-box', position: 'absolute', left: '90px', top: '70px', width: '280px', height: '170px', boxSizing: 'border-box', padding: '18px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#15803d', background: '#dcfce7', color: '#14532d', fontFamily: 'Arial, sans-serif', fontSize: '18px', lineHeight: '27px', whiteSpace: 'normal', textAlign: 'left' }
    ],
    root: {
      children: [{
        type: 'div',
        id: 'wrap-box',
        textContent: 'Astylar layouts should wrap ordinary text at the same word boundaries as a browser.'
      }]
    }
  }
};
