import { ParityFixture } from '../parity.types';

export const flexOrderSelfFixture: ParityFixture = {
  id: 'flex-order-self',
  title: 'Flex order and individual alignment',
  category: 'flexbox',
  expectedBehavior:
    'Flex items paint in ascending order while align-self overrides the container cross-axis alignment for individual items.',
  measurementIds: ['flex-order', 'flex-order-a', 'flex-order-b', 'flex-order-c'],
  reference: {
    html: '<div id="flex-order"><div id="flex-order-a"></div><div id="flex-order-b"></div><div id="flex-order-c"></div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f7fee7; }
      #flex-order { box-sizing: border-box; position: absolute; left: 100px; top: 110px; width: 500px; height: 190px; padding: 20px; border: 4px solid #3f6212; background: #ecfccb; display: flex; align-items: flex-start; column-gap: 14px; }
      #flex-order-a, #flex-order-b, #flex-order-c { box-sizing: border-box; width: 110px; height: 60px; border: 3px solid #4d7c0f; }
      #flex-order-a { order: 2; background: #bef264; }
      #flex-order-b { order: -1; align-self: flex-end; background: #a3e635; }
      #flex-order-c { order: 0; align-self: center; background: #84cc16; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f7fee7' },
      { selector: '#flex-order', boxSizing: 'border-box', position: 'absolute', left: '100px', top: '110px', width: '500px', height: '190px', padding: '20px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#3f6212', background: '#ecfccb', display: 'flex', alignItems: 'flex-start', columnGap: '14px' },
      { selector: '#flex-order-a, #flex-order-b, #flex-order-c', boxSizing: 'border-box', width: '110px', height: '60px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#4d7c0f' },
      { selector: '#flex-order-a', order: '2', background: '#bef264' },
      { selector: '#flex-order-b', order: '-1', alignSelf: 'flex-end', background: '#a3e635' },
      { selector: '#flex-order-c', order: '0', alignSelf: 'center', background: '#84cc16' },
    ],
    root: {
      children: [{
        type: 'div',
        id: 'flex-order',
        children: [
          { type: 'div', id: 'flex-order-a' },
          { type: 'div', id: 'flex-order-b' },
          { type: 'div', id: 'flex-order-c' },
        ],
      }],
    },
  },
};
