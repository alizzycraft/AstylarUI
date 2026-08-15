import { ParityFixture } from '../parity.types';

export const flexRowAlignmentFixture: ParityFixture = {
  id: 'flex-row-alignment',
  title: 'Flex row gap and centered alignment',
  category: 'flexbox',
  expectedBehavior:
    'A flex row centers its item group on the main axis, centers unequal item heights on the cross axis, and applies column gap once.',
  measurementIds: ['flex-row', 'flex-row-one', 'flex-row-two'],
  reference: {
    html: '<div id="flex-row"><div id="flex-row-one">One</div><div id="flex-row-two">Two</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #eff6ff; font-family: Arial, sans-serif; }
      #flex-row { box-sizing: border-box !important; position: absolute; left: 70px; top: 60px; width: 500px; height: 210px; padding: 20px; border: 4px solid #1d4ed8; background: #dbeafe; display: flex; flex-direction: row; justify-content: center; align-items: center; column-gap: 16px; }
      #flex-row-one, #flex-row-two { box-sizing: border-box !important; flex: 0 1 auto; padding: 12px; border: 2px solid #1e40af; color: #172554; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #flex-row-one { width: 100px; height: 60px; background: #bfdbfe; }
      #flex-row-two { width: 120px; height: 84px; background: #93c5fd; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#eff6ff' },
      { selector: '#flex-row', position: 'absolute', left: '70px', top: '60px', width: '500px', height: '210px', boxSizing: 'border-box', padding: '20px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#1d4ed8', background: '#dbeafe', display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', columnGap: '16px' },
      { selector: '#flex-row-one, #flex-row-two', boxSizing: 'border-box', flexGrow: '0', flexShrink: '1', flexBasis: 'auto', padding: '12px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#1e40af', color: '#172554', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#flex-row-one', width: '100px', height: '60px', background: '#bfdbfe' },
      { selector: '#flex-row-two', width: '120px', height: '84px', background: '#93c5fd' }
    ],
    root: {
      children: [{
        type: 'div',
        id: 'flex-row',
        children: [
          { type: 'div', id: 'flex-row-one', textContent: 'One' },
          { type: 'div', id: 'flex-row-two', textContent: 'Two' }
        ]
      }]
    }
  }
};
