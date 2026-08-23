import { ParityFixture } from '../parity.types';

export const unorderedListLayoutFixture: ParityFixture = {
  id: 'unordered-list-layout',
  title: 'Unordered list flow and markers',
  category: 'lists-tables-images',
  expectedBehavior:
    'List items stack at intrinsic line-box height inside the list content box and render outside disc markers.',
  measurementIds: ['unordered-list', 'unordered-one', 'unordered-two', 'unordered-three'],
  reference: {
    html: '<ul id="unordered-list"><li id="unordered-one">Alpha item</li><li id="unordered-two">Beta item</li><li id="unordered-three">Gamma item</li></ul>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f0fdf4; font-family: Arial, sans-serif; color: #14532d; }
      #unordered-list { box-sizing: border-box !important; position: absolute; left: 90px; top: 80px; width: 360px; height: 190px; margin: 0; padding: 20px 20px 20px 52px; border: 3px solid #15803d; background: #dcfce7; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; list-style-type: disc; }
      #unordered-list li { box-sizing: border-box !important; margin: 0; padding: 0; color: #14532d; }
      #unordered-one { background: #bbf7d0; }
      #unordered-two { background: #86efac; }
      #unordered-three { background: #4ade80; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdf4', fontFamily: 'Arial, sans-serif', color: '#14532d' },
      { selector: '#unordered-list', position: 'absolute', left: '90px', top: '80px', width: '360px', height: '190px', boxSizing: 'border-box', margin: '0', padding: '20px 20px 20px 52px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#15803d', background: '#dcfce7', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '24px', listStyleType: 'disc' },
      { selector: '#unordered-list li', boxSizing: 'border-box', margin: '0', padding: '0', color: '#14532d' },
      { selector: '#unordered-one', background: '#bbf7d0' },
      { selector: '#unordered-two', background: '#86efac' },
      { selector: '#unordered-three', background: '#4ade80' }
    ],
    root: {
      children: [{
        type: 'ul',
        id: 'unordered-list',
        children: [
          { type: 'li', id: 'unordered-one', textContent: 'Alpha item' },
          { type: 'li', id: 'unordered-two', textContent: 'Beta item' },
          { type: 'li', id: 'unordered-three', textContent: 'Gamma item' }
        ]
      }]
    }
  }
};
