import { ParityFixture } from '../parity.types';

export const nestedOverflowIntersectionFixture: ParityFixture = {
  id: 'nested-overflow-intersection', title: 'Intersected nested overflow clips', category: 'overflow-scrolling',
  expectedBehavior: 'A positioned descendant is clipped to the intersection of two overflow-hidden ancestor padding boxes.',
  measurementIds: ['clip-outer', 'clip-inner', 'clip-wide'],
  reference: {
    html: `<div id="clip-outer"><div id="clip-inner"><div id="clip-wide"></div></div></div>`,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #clip-outer { box-sizing:border-box; position:absolute; left:120px; top:100px; width:420px; height:280px; padding:30px; border:0; overflow:hidden; background:#dbeafe; }
      #clip-inner { box-sizing:border-box; position:absolute; left:250px; top:70px; width:240px; height:170px; padding:20px; border:0; overflow:hidden; background:#bfdbfe; }
      #clip-wide { box-sizing:border-box; position:absolute; left:-80px; top:60px; width:380px; height:150px; margin:0; padding:0; border:0; background:#dc2626; }
    `,
  },
  siteData: { styles: [
    { selector:'root', background:'#f8fafc' },
    { selector:'#clip-outer', boxSizing:'border-box', position:'absolute', left:'120px', top:'100px', width:'420px', height:'280px', padding:'30px', borderWidth:'0', overflow:'hidden', background:'#dbeafe' },
    { selector:'#clip-inner', boxSizing:'border-box', position:'absolute', left:'250px', top:'70px', width:'240px', height:'170px', padding:'20px', borderWidth:'0', overflow:'hidden', background:'#bfdbfe' },
    { selector:'#clip-wide', boxSizing:'border-box', position:'absolute', left:'-80px', top:'60px', width:'380px', height:'150px', margin:'0', padding:'0', borderWidth:'0', background:'#dc2626' },
  ], root:{ children:[{ type:'div', id:'clip-outer', children:[{ type:'div', id:'clip-inner', children:[{ type:'div', id:'clip-wide' }] }] }] } },
};
