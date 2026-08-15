import { ParityFixture } from '../parity.types';

export const preLineAlignmentFixture: ParityFixture = {
  id: 'pre-line-alignment',
  title: 'Preserved lines and centered text',
  category: 'typography',
  expectedBehavior:
    'Pre-line preserves explicit line breaks, collapses spaces, and centers each rendered line.',
  measurementIds: ['pre-line-box'],
  reference: {
    html: '<div id="pre-line-box">First centered line\nSecond   centered line</div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #faf5ff; font-family: Arial, sans-serif; }
      #pre-line-box { box-sizing: border-box !important; position: absolute; left: 410px; top: 80px; width: 300px; height: 150px; padding: 16px; border: 3px solid #7e22ce; background: #f3e8ff; color: #581c87; font-family: Arial, sans-serif; font-size: 20px; line-height: 30px; white-space: pre-line; text-align: center; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#faf5ff' },
      { selector: '#pre-line-box', position: 'absolute', left: '410px', top: '80px', width: '300px', height: '150px', boxSizing: 'border-box', padding: '16px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#7e22ce', background: '#f3e8ff', color: '#581c87', fontFamily: 'Arial, sans-serif', fontSize: '20px', lineHeight: '30px', whiteSpace: 'pre-line', textAlign: 'center' }
    ],
    root: {
      children: [{
        type: 'div',
        id: 'pre-line-box',
        textContent: 'First centered line\nSecond   centered line'
      }]
    }
  }
};
