import { ParityFixture } from '../parity.types';

export const gridPercentageContentWidthFixture: ParityFixture = {
  id: 'grid-percentage-content-width',
  title: 'Percentage grid track from content box',
  category: 'grid',
  expectedBehavior: 'A percentage grid column resolves against the grid content box before column gaps are removed, and fractional tracks receive the remaining space.',
  measurementIds: ['grid-percentage-box', 'grid-percentage-first', 'grid-percentage-second'],
  reference: {
    html: '<section id="grid-percentage-box"><div id="grid-percentage-first"></div><div id="grid-percentage-second"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fff7ed; }
      #grid-percentage-box { box-sizing:border-box; display:grid; grid-template-columns:40% 1fr; grid-template-rows:120px; column-gap:20px; position:absolute; left:150px; top:100px; width:500px; height:160px; padding:20px; background:#ffedd5; }
      #grid-percentage-first { box-sizing:border-box; min-width:0; min-height:0; background:#f97316; }
      #grid-percentage-second { box-sizing:border-box; min-width:0; min-height:0; background:#c2410c; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fff7ed' },
      { selector:'#grid-percentage-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'40% 1fr', gridTemplateRows:'120px', columnGap:'20px', position:'absolute', left:'150px', top:'100px', width:'500px', height:'160px', padding:'20px', background:'#ffedd5' },
      { selector:'#grid-percentage-first', boxSizing:'border-box', minWidth:'0', minHeight:'0', background:'#f97316' },
      { selector:'#grid-percentage-second', boxSizing:'border-box', minWidth:'0', minHeight:'0', background:'#c2410c' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-percentage-box',
        children:[
          { type:'div', id:'grid-percentage-first' },
          { type:'div', id:'grid-percentage-second' },
        ],
      }],
    },
  },
};
