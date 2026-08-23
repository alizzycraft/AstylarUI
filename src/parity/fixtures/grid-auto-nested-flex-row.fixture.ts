import { ParityFixture } from '../parity.types';

export const gridAutoNestedFlexRowFixture: ParityFixture = {
  id: 'grid-auto-nested-flex-row',
  title: 'Auto grid row from nested flex content',
  category: 'grid',
  expectedBehavior: 'An auto grid row and height-auto grid container use the intrinsic height of a nested flex item whose children are text-sized.',
  measurementIds: [
    'grid-nested-shell', 'grid-nested-box', 'grid-nested-card',
    'grid-nested-title', 'grid-nested-copy',
  ],
  reference: {
    html: '<section id="grid-nested-shell"><div id="grid-nested-box"><article id="grid-nested-card"><strong id="grid-nested-title">Storage</strong><span id="grid-nested-copy">Twelve files available</span></article></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdfa; font-family:Arial,sans-serif; }
      #grid-nested-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:90px; top:60px; width:360px; height:260px; padding:20px; background:#ccfbf1; }
      #grid-nested-box { box-sizing:border-box; display:grid; grid-template-columns:252px; grid-template-rows:auto; width:280px; height:auto; margin:0; padding:12px; border:2px solid #0f766e; background:#99f6e4; }
      #grid-nested-card { box-sizing:border-box; display:flex; flex-direction:column; gap:6px; width:auto; height:auto; margin:0; padding:10px; border:2px solid #14b8a6; background:#ffffff; }
      #grid-nested-title { box-sizing:border-box; height:auto; margin:0; color:#134e4a; font:700 14px/24px Arial,sans-serif; }
      #grid-nested-copy { box-sizing:border-box; height:auto; margin:0; color:#475569; font:400 12px/20px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f0fdfa', fontFamily:'Arial, sans-serif' },
      { selector:'#grid-nested-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'90px', top:'60px', width:'360px', height:'260px', padding:'20px', background:'#ccfbf1' },
      { selector:'#grid-nested-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'252px', gridTemplateRows:'auto', width:'280px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#0f766e', background:'#99f6e4' },
      { selector:'#grid-nested-card', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'6px', width:'auto', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#14b8a6', background:'#ffffff' },
      { selector:'#grid-nested-title', boxSizing:'border-box', height:'auto', margin:'0', color:'#134e4a', fontFamily:'Arial, sans-serif', fontSize:'14px', fontWeight:'700', lineHeight:'24px' },
      { selector:'#grid-nested-copy', boxSizing:'border-box', height:'auto', margin:'0', color:'#475569', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-nested-shell', children:[{
          type:'div', id:'grid-nested-box', children:[{
            type:'article', id:'grid-nested-card', children:[
              { type:'strong', id:'grid-nested-title', textContent:'Storage' },
              { type:'span', id:'grid-nested-copy', textContent:'Twelve files available' },
            ],
          }],
        }],
      }],
    },
  },
};
