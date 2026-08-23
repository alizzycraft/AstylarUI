import { ParityFixture } from '../parity.types';

export const gridIntrinsicMinmaxRowsFixture: ParityFixture = {
  id: 'grid-intrinsic-minmax-rows',
  title: 'Intrinsic minmax grid rows',
  category: 'grid',
  expectedBehavior: 'Height-auto Grid rows with min-content or auto minima and flexible maxima use measurable content bases while retaining their fractional proportions.',
  measurementIds: [
    'grid-bound-shell', 'grid-bound-box', 'grid-bound-min', 'grid-bound-auto',
  ],
  reference: {
    html: '<section id="grid-bound-shell"><div id="grid-bound-box"><article id="grid-bound-min">One measured line</article><article id="grid-bound-auto">This contribution wraps across two measured lines.</article></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fefce8; font-family:Arial,sans-serif; }
      #grid-bound-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:50px; width:360px; height:300px; padding:20px; background:#fef9c3; }
      #grid-bound-box { box-sizing:border-box; display:grid; grid-template-columns:220px; grid-template-rows:minmax(min-content, 1fr) minmax(auto, 2fr); row-gap:10px; width:248px; height:auto; margin:0; padding:10px; border:2px solid #a16207; background:#fef08a; }
      #grid-bound-box > article { box-sizing:border-box; width:auto; height:auto; margin:0; padding:8px; border:2px solid #eab308; background:#ffffff; color:#713f12; font:400 14px/20px Arial,sans-serif; white-space:normal; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fefce8', fontFamily:'Arial, sans-serif' },
      { selector:'#grid-bound-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'50px', width:'360px', height:'300px', padding:'20px', background:'#fef9c3' },
      { selector:'#grid-bound-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'220px', gridTemplateRows:'minmax(min-content, 1fr) minmax(auto, 2fr)', rowGap:'10px', width:'248px', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#a16207', background:'#fef08a' },
      { selector:'#grid-bound-box > article', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', padding:'8px', borderWidth:'2px', borderStyle:'solid', borderColor:'#eab308', background:'#ffffff', color:'#713f12', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px', whiteSpace:'normal' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-bound-shell', children:[{
          type:'div', id:'grid-bound-box', children:[
            { type:'article', id:'grid-bound-min', textContent:'One measured line' },
            { type:'article', id:'grid-bound-auto', textContent:'This contribution wraps across two measured lines.' },
          ],
        }],
      }],
    },
  },
};
