import { ParityFixture } from '../parity.types';

export const blockAutoMarginWidthFixture: ParityFixture = {
  id: 'block-auto-margin-width',
  title: 'Auto block width with horizontal margins',
  category: 'block-inline',
  expectedBehavior:
    'An in-flow block with auto width fills the containing block after its horizontal margins are subtracted.',
  measurementIds: ['auto-margin-parent', 'auto-margin-child'],
  reference: {
    html: '<section id="auto-margin-parent"><article id="auto-margin-child">Margin-sized block</article></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #auto-margin-parent { position:absolute; left:100px; top:80px; width:420px; height:220px; padding:20px; background:#e2e8f0; }
      #auto-margin-child { height:72px; margin:10px 12px 14px 16px; padding:16px; background:#bae6fd; color:#0c4a6e; font:400 16px/24px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#auto-margin-parent', position:'absolute', left:'100px', top:'80px', width:'420px', height:'220px', padding:'20px', background:'#e2e8f0' },
      { selector:'#auto-margin-child', height:'72px', margin:'10px 12px 14px 16px', padding:'16px', background:'#bae6fd', color:'#0c4a6e', fontFamily:'Arial, sans-serif', fontSize:'16px', lineHeight:'24px' },
    ],
    root:{ children:[{ type:'section', id:'auto-margin-parent', children:[
      { type:'article', id:'auto-margin-child', textContent:'Margin-sized block' },
    ] }] },
  },
};
