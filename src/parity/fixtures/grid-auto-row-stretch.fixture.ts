import { ParityFixture } from '../parity.types';

export const gridAutoRowStretchFixture: ParityFixture = {
  id: 'grid-auto-row-stretch',
  title: 'Auto grid rows stretch in a definite height',
  category: 'grid',
  expectedBehavior: 'Implicit auto rows first use their largest content contribution, then share remaining definite block-axis space equally under normal stretch alignment.',
  measurementIds: [
    'grid-stretch-box', 'grid-stretch-a', 'grid-stretch-b',
    'grid-stretch-c', 'grid-stretch-d',
  ],
  reference: {
    html: '<section id="grid-stretch-box"><article id="grid-stretch-a">Alpha</article><article id="grid-stretch-b">A taller first-row contribution</article><article id="grid-stretch-c">Gamma</article><article id="grid-stretch-d">A second-row contribution that wraps across lines.</article></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdf4; font-family:Arial,sans-serif; }
      #grid-stretch-box { box-sizing:border-box; display:grid; grid-template-columns:150px 180px; column-gap:12px; row-gap:10px; position:absolute; left:110px; top:80px; width:370px; height:210px; padding:12px; border:2px solid #15803d; background:#dcfce7; }
      #grid-stretch-box > article { box-sizing:border-box; width:auto; height:auto; margin:0; padding:8px; border:2px solid #4ade80; background:#ffffff; color:#14532d; font:400 14px/20px Arial,sans-serif; white-space:normal; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f0fdf4', fontFamily:'Arial, sans-serif' },
      { selector:'#grid-stretch-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'150px 180px', columnGap:'12px', rowGap:'10px', position:'absolute', left:'110px', top:'80px', width:'370px', height:'210px', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#15803d', background:'#dcfce7' },
      { selector:'#grid-stretch-box > article', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', padding:'8px', borderWidth:'2px', borderStyle:'solid', borderColor:'#4ade80', background:'#ffffff', color:'#14532d', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px', whiteSpace:'normal' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-stretch-box', children:[
          { type:'article', id:'grid-stretch-a', textContent:'Alpha' },
          { type:'article', id:'grid-stretch-b', textContent:'A taller first-row contribution' },
          { type:'article', id:'grid-stretch-c', textContent:'Gamma' },
          { type:'article', id:'grid-stretch-d', textContent:'A second-row contribution that wraps across lines.' },
        ],
      }],
    },
  },
};
