import { ParityFixture } from '../parity.types';

export const flexStretchMinCrossSizeFixture: ParityFixture = {
  id: 'flex-stretch-min-cross-size',
  title: 'Flex stretch preserves cross-axis minimums',
  category: 'flexbox',
  expectedBehavior:
    'A stretched column item keeps its authored minimum and padding/border minimum when cross-axis space is exhausted, overflowing from the leading margin edge.',
  measurementIds: ['stretch-min-column', 'stretch-authored-min', 'stretch-border-box-min'],
  reference: {
    html: '<div id="stretch-min-column"><div id="stretch-authored-min"></div><div id="stretch-border-box-min"></div></div>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #stretch-min-column { position:absolute; left:180px; top:100px; width:0; height:180px; display:flex; flex-direction:column; background:#cbd5e1; }
      #stretch-authored-min { min-width:198px; height:44px; margin:16px; background:#2563eb; }
      #stretch-border-box-min { height:50px; margin:16px; padding:12px 24px; border:1px solid #0f172a; background:#f59e0b; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#stretch-min-column', position:'absolute', left:'180px', top:'100px', width:'0', height:'180px', display:'flex', flexDirection:'column', background:'#cbd5e1' },
      { selector:'#stretch-authored-min', minWidth:'198px', height:'44px', margin:'16px', background:'#2563eb' },
      { selector:'#stretch-border-box-min', height:'50px', margin:'16px', padding:'12px 24px', borderWidth:'1px', borderStyle:'solid', borderColor:'#0f172a', background:'#f59e0b' },
    ],
    root:{ children:[{ type:'div', id:'stretch-min-column', children:[
      { type:'div', id:'stretch-authored-min' },
      { type:'div', id:'stretch-border-box-min' },
    ] }] },
  },
};
