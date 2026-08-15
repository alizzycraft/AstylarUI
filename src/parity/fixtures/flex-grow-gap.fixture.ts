import { ParityFixture } from '../parity.types';

export const flexGrowGapFixture: ParityFixture = {
  id: 'flex-grow-gap',
  title: 'Flex growth with gap',
  category: 'flexbox',
  expectedBehavior:
    'Flex growth distributes content-box free space by grow factor after reserving the main-axis gap exactly once.',
  measurementIds: ['flex-grow', 'flex-grow-one', 'flex-grow-two'],
  reference: {
    html: '<div id="flex-grow"><div id="flex-grow-one">1x</div><div id="flex-grow-two">2x</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #f0fdfa; font-family: Arial, sans-serif; }
      #flex-grow { box-sizing: border-box !important; position: absolute; left: 130px; top: 250px; width: 500px; height: 150px; padding: 20px; border: 4px solid #0f766e; background: #ccfbf1; display: flex; align-items: stretch; column-gap: 12px; }
      #flex-grow-one, #flex-grow-two { box-sizing: border-box !important; flex-basis: 80px; min-width: 0; padding: 12px; border: 2px solid #115e59; color: #134e4a; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #flex-grow-one { flex-grow: 1; background: #99f6e4; }
      #flex-grow-two { flex-grow: 2; background: #5eead4; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#f0fdfa' },
      { selector: '#flex-grow', position: 'absolute', left: '130px', top: '250px', width: '500px', height: '150px', boxSizing: 'border-box', padding: '20px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#0f766e', background: '#ccfbf1', display: 'flex', alignItems: 'stretch', columnGap: '12px' },
      { selector: '#flex-grow-one, #flex-grow-two', boxSizing: 'border-box', flexBasis: '80px', minWidth: '0', padding: '12px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#115e59', color: '#134e4a', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#flex-grow-one', flexGrow: '1', background: '#99f6e4' },
      { selector: '#flex-grow-two', flexGrow: '2', background: '#5eead4' }
    ],
    root: {
      children: [{
        type: 'div',
        id: 'flex-grow',
        children: [
          { type: 'div', id: 'flex-grow-one', textContent: '1x' },
          { type: 'div', id: 'flex-grow-two', textContent: '2x' }
        ]
      }]
    }
  }
};
