import { ParityFixture } from '../parity.types';

export const intrinsicMinHeightFixture: ParityFixture = {
  id: 'intrinsic-min-height',
  title: 'Intrinsic parent includes a child minimum height',
  category: 'block-inline',
  expectedBehavior:
    'An auto-height block uses its in-flow child min-height contribution, including margins.',
  measurementIds: ['min-height-list', 'min-height-empty', 'min-height-copy'],
  reference: {
    html: '<div id="min-height-list"><article id="min-height-empty"><p id="min-height-copy">No items yet</p></article></div>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #min-height-list { position:absolute; left:100px; top:90px; width:320px; background:#e2e8f0; }
      #min-height-empty { min-height:200px; margin:8px; padding:48px 16px; background:transparent; text-align:center; }
      #min-height-copy { height:24px; font:400 14px/24px Arial,sans-serif; color:#334155; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#min-height-list', position:'absolute', left:'100px', top:'90px', width:'320px', background:'#e2e8f0' },
      { selector:'#min-height-empty', minHeight:'200px', margin:'8px', padding:'48px 16px', background:'transparent', textAlign:'center' },
      { selector:'#min-height-copy', height:'24px', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'24px', color:'#334155' },
    ],
    root:{ children:[{ type:'div', id:'min-height-list', children:[
      { type:'article', id:'min-height-empty', children:[
        { type:'p', id:'min-height-copy', textContent:'No items yet' },
      ] },
    ] }] },
  },
};
