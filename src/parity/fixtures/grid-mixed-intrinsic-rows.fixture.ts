import { ParityFixture } from '../parity.types';

export const gridMixedIntrinsicRowsFixture: ParityFixture = {
  id: 'grid-mixed-intrinsic-rows',
  title: 'Mixed fixed, intrinsic, and fractional grid rows',
  category: 'grid',
  expectedBehavior: 'An indefinite-height Grid combines fixed and contribution-sized rows with content-sized fractional rows that retain their authored proportions.',
  measurementIds: [
    'grid-mixed-row-shell', 'grid-mixed-row-box', 'grid-mixed-row-fixed',
    'grid-mixed-row-auto', 'grid-mixed-row-min', 'grid-mixed-row-max',
    'grid-mixed-row-one-fr', 'grid-mixed-row-two-fr',
  ],
  reference: {
    html: '<section id="grid-mixed-row-shell"><div id="grid-mixed-row-box"><div id="grid-mixed-row-fixed"></div><div id="grid-mixed-row-auto"></div><div id="grid-mixed-row-min"></div><div id="grid-mixed-row-max"></div><div id="grid-mixed-row-one-fr"></div><div id="grid-mixed-row-two-fr"></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #grid-mixed-row-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:90px; top:30px; width:340px; height:500px; padding:20px; background:#e2e8f0; }
      #grid-mixed-row-box { box-sizing:border-box; display:grid; grid-template-columns:220px; grid-template-rows:40px auto min-content max-content 1fr 2fr; row-gap:8px; width:248px; height:auto; margin:0; padding:10px; border:2px solid #334155; background:#cbd5e1; }
      #grid-mixed-row-box > div { box-sizing:border-box; width:auto; margin:0; }
      #grid-mixed-row-fixed { height:24px; background:#94a3b8; }
      #grid-mixed-row-auto { height:32px; background:#64748b; }
      #grid-mixed-row-min { height:36px; background:#475569; }
      #grid-mixed-row-max { height:44px; background:#334155; }
      #grid-mixed-row-one-fr { height:30px; background:#1e293b; }
      #grid-mixed-row-two-fr { height:50px; background:#0f172a; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc' },
      { selector:'#grid-mixed-row-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'90px', top:'30px', width:'340px', height:'500px', padding:'20px', background:'#e2e8f0' },
      { selector:'#grid-mixed-row-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'220px', gridTemplateRows:'40px auto min-content max-content 1fr 2fr', rowGap:'8px', width:'248px', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#334155', background:'#cbd5e1' },
      { selector:'#grid-mixed-row-box > div', boxSizing:'border-box', width:'auto', margin:'0' },
      { selector:'#grid-mixed-row-fixed', height:'24px', background:'#94a3b8' },
      { selector:'#grid-mixed-row-auto', height:'32px', background:'#64748b' },
      { selector:'#grid-mixed-row-min', height:'36px', background:'#475569' },
      { selector:'#grid-mixed-row-max', height:'44px', background:'#334155' },
      { selector:'#grid-mixed-row-one-fr', height:'30px', background:'#1e293b' },
      { selector:'#grid-mixed-row-two-fr', height:'50px', background:'#0f172a' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-mixed-row-shell', children:[{
          type:'div', id:'grid-mixed-row-box', children:[
            { type:'div', id:'grid-mixed-row-fixed' },
            { type:'div', id:'grid-mixed-row-auto' },
            { type:'div', id:'grid-mixed-row-min' },
            { type:'div', id:'grid-mixed-row-max' },
            { type:'div', id:'grid-mixed-row-one-fr' },
            { type:'div', id:'grid-mixed-row-two-fr' },
          ],
        }],
      }],
    },
  },
};
