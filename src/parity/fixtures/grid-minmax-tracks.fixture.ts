import { ParityFixture } from '../parity.types';

export const gridMinmaxTracksFixture: ParityFixture = {
  id: 'grid-minmax-tracks',
  title: 'Minmax grid tracks',
  category: 'grid',
  expectedBehavior: 'A minmax pixel-to-fr track participates in fractional sizing but cannot shrink below its minimum.',
  measurementIds: ['grid-minmax-box', 'grid-minmax-first', 'grid-minmax-second'],
  reference: {
    html: '<section id="grid-minmax-box"><div id="grid-minmax-first"></div><div id="grid-minmax-second"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f5f3ff; }
      #grid-minmax-box { box-sizing:border-box; display:grid; grid-template-columns:minmax(260px, 1fr) 1fr; grid-template-rows:120px; column-gap:20px; position:absolute; left:150px; top:100px; width:500px; height:160px; padding:20px; background:#ede9fe; }
      #grid-minmax-first { box-sizing:border-box; min-width:0; min-height:0; background:#8b5cf6; }
      #grid-minmax-second { box-sizing:border-box; min-width:0; min-height:0; background:#6d28d9; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f5f3ff' },
      { selector:'#grid-minmax-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'minmax(260px, 1fr) 1fr', gridTemplateRows:'120px', columnGap:'20px', position:'absolute', left:'150px', top:'100px', width:'500px', height:'160px', padding:'20px', background:'#ede9fe' },
      { selector:'#grid-minmax-first', boxSizing:'border-box', minWidth:'0', minHeight:'0', background:'#8b5cf6' },
      { selector:'#grid-minmax-second', boxSizing:'border-box', minWidth:'0', minHeight:'0', background:'#6d28d9' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-minmax-box',
        children:[
          { type:'div', id:'grid-minmax-first' },
          { type:'div', id:'grid-minmax-second' },
        ],
      }],
    },
  },
};
