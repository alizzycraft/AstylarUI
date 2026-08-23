import { ParityFixture } from '../parity.types';

export const prelayoutDescendantStyleFixture: ParityFixture = {
  id: 'prelayout-descendant-style',
  title: 'Descendant styles during intrinsic pre-layout',
  category: 'selectors-cascade',
  expectedBehavior: 'Intrinsic pre-layout resolves child-combinator styles using the same complete DOM ancestry that is available during final element creation.',
  measurementIds: ['prelayout-shell', 'prelayout-panel', 'prelayout-row', 'prelayout-label', 'prelayout-textarea'],
  reference: {
    html: '<section id="prelayout-shell"><div id="prelayout-panel"><div id="prelayout-row" class="prelayout-row"><label id="prelayout-label">Bio</label><textarea id="prelayout-textarea" rows="2">Spatial interfaces</textarea></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fdf4ff; font-family:Arial,sans-serif; }
      #prelayout-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:50px; width:360px; height:260px; padding:20px; background:#fae8ff; }
      #prelayout-panel { box-sizing:border-box; display:flex; flex-direction:column; width:280px; height:auto; margin:0; padding:10px; border:2px solid #a21caf; background:#ffffff; }
      #prelayout-row { box-sizing:border-box; display:flex; flex-direction:row; align-items:flex-start; gap:6px; width:256px; height:auto; }
      .prelayout-row > label { box-sizing:border-box; flex:0 0 50px; width:50px; height:40px; padding:8px 0; color:#701a75; font:700 11px/24px Arial,sans-serif; }
      .prelayout-row > textarea { appearance:none; box-sizing:border-box; flex:0 0 200px; width:200px; height:auto; margin:0; padding:5px 9px; border:1px solid #86198f; border-radius:0; background:#fdf4ff; color:#4a044e; font:400 12px/24px Arial,sans-serif; resize:none; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fdf4ff', fontFamily:'Arial, sans-serif' },
      { selector:'#prelayout-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'50px', width:'360px', height:'260px', padding:'20px', background:'#fae8ff' },
      { selector:'#prelayout-panel', boxSizing:'border-box', display:'flex', flexDirection:'column', width:'280px', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#a21caf', background:'#ffffff' },
      { selector:'#prelayout-row', boxSizing:'border-box', display:'flex', flexDirection:'row', alignItems:'flex-start', gap:'6px', width:'256px', height:'auto' },
      { selector:'.prelayout-row > label', boxSizing:'border-box', flex:'0 0 50px', width:'50px', height:'40px', padding:'8px 0', color:'#701a75', fontFamily:'Arial, sans-serif', fontSize:'11px', fontWeight:'700', lineHeight:'24px' },
      { selector:'.prelayout-row > textarea', boxSizing:'border-box', flex:'0 0 200px', width:'200px', height:'auto', margin:'0', padding:'5px 9px', borderWidth:'1px', borderStyle:'solid', borderColor:'#86198f', borderRadius:'0', background:'#fdf4ff', color:'#4a044e', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'24px' },
    ],
    root: {
      children:[{
        type:'section', id:'prelayout-shell', children:[{
          type:'div', id:'prelayout-panel', children:[{
            type:'div', id:'prelayout-row', class:'prelayout-row', children:[
              { type:'label', id:'prelayout-label', textContent:'Bio' },
              { type:'textarea', id:'prelayout-textarea', rows:2, value:'Spatial interfaces' },
            ],
          }],
        }],
      }],
    },
  },
};
