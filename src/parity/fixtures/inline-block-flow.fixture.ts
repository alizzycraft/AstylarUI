import { ParityFixture } from '../parity.types';

export const inlineBlockFlowFixture: ParityFixture = {
  id: 'inline-block-flow',
  title: 'Inline-block run and display none',
  category: 'block-inline',
  expectedBehavior: 'Inline siblings use their intrinsic text width, inline-block siblings share a line, and display:none contributes neither rendering nor layout space.',
  measurementIds: ['inline-parent', 'inline-one', 'inline-two', 'inline-short'],
  expectedAbsentIds: ['inline-hidden'],
  reference: {
    html: '<div id="inline-parent"><span id="inline-one">One</span><span id="inline-hidden">Hidden</span><span id="inline-two">Two</span><strong id="inline-short">hello</strong></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fffbeb; font-family: Arial, sans-serif; }
      #inline-parent { box-sizing: border-box !important; position: absolute; left: 70px; top: 60px; width: 500px; height: 170px; padding: 20px; border: 3px solid #a16207; background: #fef3c7; }
      #inline-one, #inline-two, #inline-hidden { box-sizing: border-box !important; display: inline-block; vertical-align: top; height: 64px; padding: 14px; border: 2px solid #b45309; color: #78350f; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #inline-one { width: 110px; background: #fde68a; }
      #inline-two { width: 140px; background: #fed7aa; }
      #inline-hidden { display: none; width: 180px; background: #ef4444; }
      #inline-short { display:inline-block; vertical-align:top; font:700 14px/21px Arial,sans-serif; background:#bbf7d0; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fffbeb' },
      { selector: '#inline-parent', position: 'absolute', left: '70px', top: '60px', width: '500px', height: '170px', boxSizing: 'border-box', padding: '20px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#a16207', background: '#fef3c7' },
      { selector: '#inline-one, #inline-two, #inline-hidden', display: 'inline-block', verticalAlign: 'top', height: '64px', boxSizing: 'border-box', padding: '14px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#b45309', color: '#78350f', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#inline-one', width: '110px', background: '#fde68a' },
      { selector: '#inline-two', width: '140px', background: '#fed7aa' },
      { selector: '#inline-hidden', display: 'none', width: '180px', background: '#ef4444' },
      { selector: '#inline-short', display: 'inline-block', verticalAlign: 'top', fontFamily: 'Arial, sans-serif', fontSize: '14px', lineHeight: '21px', fontWeight: '700', background: '#bbf7d0' }
    ],
    root: {
      children: [{
        type: 'div', id: 'inline-parent',
        children: [
          { type: 'span', id: 'inline-one', textContent: 'One' },
          { type: 'span', id: 'inline-hidden', textContent: 'Hidden' },
          { type: 'span', id: 'inline-two', textContent: 'Two' },
          { type: 'strong', id: 'inline-short', textContent: 'hello' }
        ]
      }]
    }
  }
};
