import { ParityFixture } from '../parity.types';

export const flexWrapLinesFixture: ParityFixture = {
  id: 'flex-wrap-lines',
  title: 'Wrapped flex lines and align-content',
  category: 'flexbox',
  expectedBehavior:
    'Flex items wrap onto multiple rows, preserve row and column gaps, and distribute lines with align-content.',
  measurementIds: ['flex-wrap', 'flex-wrap-one', 'flex-wrap-two', 'flex-wrap-three', 'flex-wrap-four'],
  reference: {
    html: '<div id="flex-wrap"><div id="flex-wrap-one">One</div><div id="flex-wrap-two">Two</div><div id="flex-wrap-three">Three</div><div id="flex-wrap-four">Four</div></div>',
    css: `
      #parity-reference-viewport { position: relative; overflow: hidden; background: #ecfeff; font-family: Arial, sans-serif; }
      #flex-wrap { box-sizing: border-box; position: absolute; left: 170px; top: 100px; width: 330px; height: 220px; padding: 16px; border: 3px solid #0e7490; background: #cffafe; display: flex; flex-flow: row wrap; align-items: flex-start; align-content: space-between; column-gap: 12px; row-gap: 14px; }
      #flex-wrap-one, #flex-wrap-two, #flex-wrap-three, #flex-wrap-four { box-sizing: border-box; flex: 0 0 120px; width: 120px; height: 50px; padding: 12px; border: 2px solid #155e75; background: #67e8f9; color: #164e63; font-size: 16px; line-height: 22px; }
    `,
  },
  siteData: {
    styles: [
      { selector: 'root', background: '#ecfeff' },
      { selector: '#flex-wrap', boxSizing: 'border-box', position: 'absolute', left: '170px', top: '100px', width: '330px', height: '220px', padding: '16px', borderWidth: '3px', borderStyle: 'solid', borderColor: '#0e7490', background: '#cffafe', display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', alignContent: 'space-between', columnGap: '12px', rowGap: '14px' },
      { selector: '#flex-wrap-one, #flex-wrap-two, #flex-wrap-three, #flex-wrap-four', boxSizing: 'border-box', flexGrow: '0', flexShrink: '0', flexBasis: '120px', width: '120px', height: '50px', padding: '12px', borderWidth: '2px', borderStyle: 'solid', borderColor: '#155e75', background: '#67e8f9', color: '#164e63', fontFamily: 'Arial, sans-serif', fontSize: '16px', lineHeight: '22px' },
    ],
    root: {
      children: [
        {
          type: 'div',
          id: 'flex-wrap',
          children: [
            { type: 'div', id: 'flex-wrap-one', textContent: 'One' },
            { type: 'div', id: 'flex-wrap-two', textContent: 'Two' },
            { type: 'div', id: 'flex-wrap-three', textContent: 'Three' },
            { type: 'div', id: 'flex-wrap-four', textContent: 'Four' },
          ],
        },
      ],
    },
  },
};
