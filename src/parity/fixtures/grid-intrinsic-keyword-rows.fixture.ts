import { ParityFixture } from '../parity.types';

export const gridIntrinsicKeywordRowsFixture: ParityFixture = {
  id: 'grid-intrinsic-keyword-rows',
  title: 'Min-content and max-content grid rows',
  category: 'grid',
  expectedBehavior: 'Non-spanning min-content and max-content rows use the largest measurable text contribution at the resolved column width and drive a height-auto Grid container.',
  measurementIds: [
    'grid-keyword-shell', 'grid-keyword-box', 'grid-keyword-a', 'grid-keyword-b',
    'grid-keyword-c', 'grid-keyword-d',
  ],
  reference: {
    html: '<section id="grid-keyword-shell"><div id="grid-keyword-box"><article id="grid-keyword-a">Short row</article><article id="grid-keyword-b">This min-content row wraps onto another line.</article><article id="grid-keyword-c">Max content</article><article id="grid-keyword-d">The second intrinsic row also follows its tallest wrapped contribution.</article></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0f9ff; font-family:Arial,sans-serif; }
      #grid-keyword-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:70px; top:50px; width:480px; height:340px; padding:20px; background:#e0f2fe; }
      #grid-keyword-box { box-sizing:border-box; display:grid; grid-template-columns:160px 160px; grid-template-rows:min-content max-content; column-gap:12px; row-gap:10px; width:368px; height:auto; margin:0; padding:12px; border:2px solid #0369a1; background:#bae6fd; }
      #grid-keyword-box > article { box-sizing:border-box; width:auto; height:auto; margin:0; padding:8px; border:2px solid #38bdf8; background:#ffffff; color:#0c4a6e; font:400 14px/20px Arial,sans-serif; white-space:normal; }
      #grid-keyword-c { font-weight:700; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f0f9ff', fontFamily:'Arial, sans-serif' },
      { selector:'#grid-keyword-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'70px', top:'50px', width:'480px', height:'340px', padding:'20px', background:'#e0f2fe' },
      { selector:'#grid-keyword-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'160px 160px', gridTemplateRows:'min-content max-content', columnGap:'12px', rowGap:'10px', width:'368px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#0369a1', background:'#bae6fd' },
      { selector:'#grid-keyword-box > article', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', padding:'8px', borderWidth:'2px', borderStyle:'solid', borderColor:'#38bdf8', background:'#ffffff', color:'#0c4a6e', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px', whiteSpace:'normal' },
      { selector:'#grid-keyword-c', fontWeight:'700' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-keyword-shell', children:[{
          type:'div', id:'grid-keyword-box', children:[
            { type:'article', id:'grid-keyword-a', textContent:'Short row' },
            { type:'article', id:'grid-keyword-b', textContent:'This min-content row wraps onto another line.' },
            { type:'article', id:'grid-keyword-c', textContent:'Max content' },
            { type:'article', id:'grid-keyword-d', textContent:'The second intrinsic row also follows its tallest wrapped contribution.' },
          ],
        }],
      }],
    },
  },
};
