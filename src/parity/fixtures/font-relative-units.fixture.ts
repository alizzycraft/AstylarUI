import { ParityFixture } from '../parity.types';

export const fontRelativeUnitsFixture: ParityFixture = {
  id: 'font-relative-units',
  title: 'Font-relative sizing and offsets',
  category: 'box-model-units',
  expectedBehavior:
    'Em lengths use the element font size while rem lengths use the 16px parity root for dimensions and positioned offsets.',
  measurementIds: ['em-unit-box', 'rem-unit-box'],
  reference: {
    html: '<div id="em-unit-box"></div><div id="rem-unit-box"></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f5f3ff; font-size: 16px; }
      #em-unit-box, #rem-unit-box { box-sizing: border-box; position: absolute; border: 3px solid #6d28d9; }
      #em-unit-box { left: 2em; top: 1.5em; width: 12em; height: 5em; font-size: 20px; background: #ddd6fe; }
      #rem-unit-box { left: 26rem; top: 12rem; width: 14rem; height: 5rem; font-size: 24px; background: #c4b5fd; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f5f3ff', fontSize: '16px' },
      { selector: '#em-unit-box, #rem-unit-box', boxSizing: 'border-box', position: 'absolute', borderWidth: '3px', borderStyle: 'solid', borderColor: '#6d28d9' },
      { selector: '#em-unit-box', left: '2em', top: '1.5em', width: '12em', height: '5em', fontSize: '20px', background: '#ddd6fe' },
      { selector: '#rem-unit-box', left: '26rem', top: '12rem', width: '14rem', height: '5rem', fontSize: '24px', background: '#c4b5fd' },
    ],
    root: {
      children: [
        { type: 'div', id: 'em-unit-box' },
        { type: 'div', id: 'rem-unit-box' },
      ],
    },
  },
};
