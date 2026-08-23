import { ParityFixture } from '../parity.types';

export const orderedListLayoutFixture: ParityFixture = {
  id: 'ordered-list-layout',
  title: 'Ordered list flow and markers',
  category: 'lists-tables-images',
  expectedBehavior:
    'Ordered list items stack at intrinsic line-box height and render sequential decimal markers outside the content box.',
  measurementIds: ['ordered-list', 'ordered-one', 'ordered-two', 'ordered-three'],
  reference: {
    html: '<ol id="ordered-list"><li id="ordered-one">First step</li><li id="ordered-two">Second step</li><li id="ordered-three">Third step</li></ol>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #eff6ff; font-family: Arial, sans-serif; color: #1e3a8a; }
      #ordered-list { box-sizing: border-box !important; position: absolute; left: 350px; top: 300px; width: 360px; height: 190px; margin: 0; padding: 20px 20px 20px 52px; border: 3px solid #1d4ed8; background: #dbeafe; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; list-style-type: decimal; }
      #ordered-list li { box-sizing: border-box !important; margin: 0; padding: 0; color: #1e3a8a; }
      #ordered-one { background: #bfdbfe; }
      #ordered-two { background: #93c5fd; }
      #ordered-three { background: #60a5fa; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eff6ff', fontFamily: 'Arial, sans-serif', color: '#1e3a8a' },
      { selector: '#ordered-list', position: 'absolute', left: '350px', top: '300px', width: '360px', height: '190px', boxSizing: 'border-box', margin: '0', padding: '20px 20px 20px 52px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#1d4ed8', background: '#dbeafe', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '24px', listStyleType: 'decimal' },
      { selector: '#ordered-list li', boxSizing: 'border-box', margin: '0', padding: '0', color: '#1e3a8a' },
      { selector: '#ordered-one', background: '#bfdbfe' },
      { selector: '#ordered-two', background: '#93c5fd' },
      { selector: '#ordered-three', background: '#60a5fa' }
    ],
    root: {
      children: [{
        type: 'ol',
        id: 'ordered-list',
        children: [
          { type: 'li', id: 'ordered-one', textContent: 'First step' },
          { type: 'li', id: 'ordered-two', textContent: 'Second step' },
          { type: 'li', id: 'ordered-three', textContent: 'Third step' }
        ]
      }]
    }
  }
};
