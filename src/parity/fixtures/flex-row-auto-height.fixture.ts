import { ParityFixture } from '../parity.types';

export const flexRowAutoHeightFixture: ParityFixture = {
  id: 'flex-row-auto-height',
  title: 'Row flex container intrinsic height',
  category: 'flexbox',
  expectedBehavior: 'A nowrap row flex container with height auto uses the largest outer cross size of its in-flow items, plus its own padding and borders.',
  measurementIds: ['flex-row-auto-shell', 'flex-row-auto', 'flex-row-auto-label', 'flex-row-auto-textarea'],
  reference: {
    html: '<section id="flex-row-auto-shell"><div id="flex-row-auto"><label id="flex-row-auto-label">Bio</label><textarea id="flex-row-auto-textarea" rows="2">Spatial interfaces</textarea></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; font-family:Arial,sans-serif; }
      #flex-row-auto-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:60px; width:360px; height:240px; padding:20px; background:#dbeafe; }
      #flex-row-auto { box-sizing:border-box; display:flex; flex-direction:row; flex-wrap:nowrap; align-items:flex-start; gap:8px; width:280px; height:auto; margin:0; padding:8px; border:2px solid #2563eb; background:#ffffff; }
      #flex-row-auto-label { box-sizing:border-box; flex:0 0 72px; width:72px; height:32px; margin:0; padding:4px 0; color:#1e3a8a; font:700 12px/24px Arial,sans-serif; }
      #flex-row-auto-textarea { appearance:none; box-sizing:border-box; flex:0 0 176px; width:176px; height:auto; margin:0; padding:5px 9px; border:1px solid #64748b; border-radius:0; background:#f8fafc; color:#0f172a; font:400 12px/24px Arial,sans-serif; resize:none; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#eff6ff', fontFamily:'Arial, sans-serif' },
      { selector:'#flex-row-auto-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'60px', width:'360px', height:'240px', padding:'20px', background:'#dbeafe' },
      { selector:'#flex-row-auto', boxSizing:'border-box', display:'flex', flexDirection:'row', flexWrap:'nowrap', alignItems:'flex-start', gap:'8px', width:'280px', height:'auto', margin:'0', padding:'8px', borderWidth:'2px', borderStyle:'solid', borderColor:'#2563eb', background:'#ffffff' },
      { selector:'#flex-row-auto-label', boxSizing:'border-box', flex:'0 0 72px', width:'72px', height:'32px', margin:'0', padding:'4px 0', color:'#1e3a8a', fontFamily:'Arial, sans-serif', fontSize:'12px', fontWeight:'700', lineHeight:'24px' },
      { selector:'#flex-row-auto-textarea', boxSizing:'border-box', flex:'0 0 176px', width:'176px', height:'auto', margin:'0', padding:'5px 9px', borderWidth:'1px', borderStyle:'solid', borderColor:'#64748b', borderRadius:'0', background:'#f8fafc', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'24px' },
    ],
    root: {
      children:[{
        type:'section', id:'flex-row-auto-shell',
        children:[{
          type:'div', id:'flex-row-auto',
          children:[
            { type:'label', id:'flex-row-auto-label', textContent:'Bio' },
            { type:'textarea', id:'flex-row-auto-textarea', rows:2, value:'Spatial interfaces' },
          ],
        }],
      }],
    },
  },
};
