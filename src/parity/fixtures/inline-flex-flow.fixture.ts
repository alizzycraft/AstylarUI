import { ParityFixture } from '../parity.types';

export const inlineFlexFlowFixture: ParityFixture = {
  id: 'inline-flex-flow',
  title: 'Inline flex outer and inner flow',
  category: 'block-inline',
  expectedBehavior:
    'Inline-flex containers participate in an inline formatting row while laying out their own children with flexbox.',
  measurementIds: [
    'inline-flex-parent',
    'inline-flex-one',
    'inline-flex-one-a',
    'inline-flex-one-b',
    'inline-flex-two',
    'inline-flex-two-a',
    'inline-flex-two-b',
  ],
  reference: {
    html: '<div id="inline-flex-parent"><div id="inline-flex-one"><span id="inline-flex-one-a">A</span><span id="inline-flex-one-b">B</span></div><div id="inline-flex-two"><span id="inline-flex-two-a">C</span><span id="inline-flex-two-b">D</span></div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f5f3ff; font-family: Arial, sans-serif; }
      #inline-flex-parent { box-sizing: border-box; position: absolute; left: 90px; top: 140px; width: 500px; height: 100px; padding: 12px; border: 2px solid #5b21b6; background: #ede9fe; white-space: nowrap; }
      #inline-flex-one, #inline-flex-two { box-sizing: border-box; display: inline-flex; height: 72px; padding: 8px; border: 2px solid #6d28d9; align-items: center; justify-content: center; column-gap: 10px; vertical-align: top; }
      #inline-flex-one { width: 210px; margin-right: 14px; background: #ddd6fe; }
      #inline-flex-two { width: 180px; background: #c4b5fd; }
      #inline-flex-one-a, #inline-flex-one-b, #inline-flex-two-a, #inline-flex-two-b { box-sizing: border-box; display: block; width: 54px; height: 34px; padding: 6px; border: 1px solid #4c1d95; background: #a78bfa; color: #2e1065; font-size: 16px; line-height: 20px; text-align: center; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f5f3ff' },
      { selector: '#inline-flex-parent', boxSizing: 'border-box', position: 'absolute', left: '90px', top: '140px', width: '500px', height: '100px', padding: '12px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#5b21b6', background: '#ede9fe', whiteSpace: 'nowrap' },
      { selector: '#inline-flex-one, #inline-flex-two', boxSizing: 'border-box', display: 'inline-flex', height: '72px', padding: '8px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#6d28d9', alignItems: 'center', justifyContent: 'center', columnGap: '10px', verticalAlign: 'top' },
      { selector: '#inline-flex-one', width: '210px', marginRight: '14px', background: '#ddd6fe' },
      { selector: '#inline-flex-two', width: '180px', background: '#c4b5fd' },
      { selector: '#inline-flex-one-a, #inline-flex-one-b, #inline-flex-two-a, #inline-flex-two-b', boxSizing: 'border-box', display: 'block', width: '54px', height: '34px', padding: '6px', borderWidth: '1px', borderStyle: 'solid', borderColor: '#4c1d95', background: '#a78bfa', color: '#2e1065', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px', textAlign: 'center' },
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'inline-flex-parent',
          children: [
            {
              type: 'div',
              id: 'inline-flex-one',
              children: [
                { type: 'span', id: 'inline-flex-one-a', textContent: 'A' },
                { type: 'span', id: 'inline-flex-one-b', textContent: 'B' },
              ],
            },
            {
              type: 'div',
              id: 'inline-flex-two',
              children: [
                { type: 'span', id: 'inline-flex-two-a', textContent: 'C' },
                { type: 'span', id: 'inline-flex-two-b', textContent: 'D' },
              ],
            },
          ],
        },
      ],
    },
  },
};
