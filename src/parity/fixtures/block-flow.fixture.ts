import { ParityFixture } from '../parity.types';

export const blockFlowFixture: ParityFixture = {
  id: 'block-flow',
  title: 'Normal block sibling flow',
  category: 'block-inline',
  expectedBehavior: 'Block children start at the content edge and stack vertically in source order.',
  measurementIds: ['block-parent', 'block-one', 'block-two'],
  reference: {
    html: '<div id="block-parent"><div id="block-one">First block</div><div id="block-two">Second block</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f8fafc; font-family: Arial, sans-serif; }
      #block-parent { box-sizing: border-box !important; position: absolute; left: 80px; top: 50px; width: 420px; height: 300px; padding: 20px; border: 4px solid #334155; background: #e2e8f0; }
      #block-one, #block-two { box-sizing: border-box !important; display: block; width: 280px; height: 64px; padding: 14px; border: 2px solid #0369a1; color: #0c4a6e; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #block-one { background: #bae6fd; }
      #block-two { background: #cffafe; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f8fafc' },
      { selector: '#block-parent', position: 'absolute', left: '80px', top: '50px', width: '420px', height: '300px', boxSizing: 'border-box', padding: '20px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#334155', background: '#e2e8f0' },
      { selector: '#block-one, #block-two', display: 'block', width: '280px', height: '64px', boxSizing: 'border-box', padding: '14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#0369a1', color: '#0c4a6e', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#block-one', background: '#bae6fd' },
      { selector: '#block-two', background: '#cffafe' }
    ],
    root: {
      children: [{
        type: 'div', id: 'block-parent',
        children: [
          { type: 'div', id: 'block-one', textContent: 'First block' },
          { type: 'div', id: 'block-two', textContent: 'Second block' }
        ]
      }]
    }
  }
};
