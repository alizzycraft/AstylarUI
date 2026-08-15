import { ParityFixture } from '../parity.types';

export const flexColumnAlignmentFixture: ParityFixture = {
  id: 'flex-column-alignment',
  title: 'Flex column gap and end alignment',
  category: 'flexbox',
  expectedBehavior:
    'A flex column packs items at the main-axis end, aligns unequal widths at the cross-axis end, and applies row gap once.',
  measurementIds: ['flex-column', 'flex-column-one', 'flex-column-two'],
  reference: {
    html: '<div id="flex-column"><div id="flex-column-one">First</div><div id="flex-column-two">Second</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #fff7ed; font-family: Arial, sans-serif; }
      #flex-column { box-sizing: border-box !important; position: absolute; left: 420px; top: 310px; width: 300px; height: 250px; padding: 18px; border: 4px solid #c2410c; background: #ffedd5; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; row-gap: 14px; }
      #flex-column-one, #flex-column-two { box-sizing: border-box !important; flex: 0 1 auto; height: 58px; padding: 10px; border: 2px solid #9a3412; color: #7c2d12; font-family: Arial, sans-serif; font-size: 16px; line-height: 20px; }
      #flex-column-one { width: 120px; background: #fed7aa; }
      #flex-column-two { width: 160px; background: #fdba74; }
    `
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#fff7ed' },
      { selector: '#flex-column', position: 'absolute', left: '420px', top: '310px', width: '300px', height: '250px', boxSizing: 'border-box', padding: '18px', borderWidth: '4px', borderStyle: 'solid', borderColor: '#c2410c', background: '#ffedd5', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end', rowGap: '14px' },
      { selector: '#flex-column-one, #flex-column-two', boxSizing: 'border-box', height: '58px', flexGrow: '0', flexShrink: '1', flexBasis: 'auto', padding: '10px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#9a3412', color: '#7c2d12', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '20px' },
      { selector: '#flex-column-one', width: '120px', background: '#fed7aa' },
      { selector: '#flex-column-two', width: '160px', background: '#fdba74' }
    ],
    root: {
      children: [{
        type: 'div',
        id: 'flex-column',
        children: [
          { type: 'div', id: 'flex-column-one', textContent: 'First' },
          { type: 'div', id: 'flex-column-two', textContent: 'Second' }
        ]
      }]
    }
  }
};
