import { ParityFixture } from '../parity.types';

export const gridAutoHeightFixture: ParityFixture = {
  id: 'grid-auto-height',
  title: 'Explicit grid tracks driving auto height',
  category: 'grid',
  expectedBehavior: 'A height-auto grid contributes the sum of its explicit row tracks, row gaps, padding, and borders before its flex parent positions it.',
  measurementIds: ['grid-auto-shell', 'grid-auto-box', 'grid-auto-one', 'grid-auto-two'],
  reference: {
    html: '<section id="grid-auto-shell"><div id="grid-auto-box"><div id="grid-auto-one"></div><div id="grid-auto-two"></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdf4; }
      #grid-auto-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:90px; top:60px; width:340px; height:260px; padding:20px; background:#dcfce7; }
      #grid-auto-box { box-sizing:border-box; display:grid; grid-template-columns:220px; grid-template-rows:40px 60px; row-gap:10px; width:248px; height:auto; margin:0; padding:12px; border:2px solid #15803d; background:#bbf7d0; }
      #grid-auto-one, #grid-auto-two { box-sizing:border-box; width:auto; height:auto; margin:0; background:#4ade80; }
      #grid-auto-two { background:#22c55e; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f0fdf4' },
      { selector:'#grid-auto-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'90px', top:'60px', width:'340px', height:'260px', padding:'20px', background:'#dcfce7' },
      { selector:'#grid-auto-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'220px', gridTemplateRows:'40px 60px', rowGap:'10px', width:'248px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#15803d', background:'#bbf7d0' },
      { selector:'#grid-auto-one, #grid-auto-two', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', background:'#4ade80' },
      { selector:'#grid-auto-two', background:'#22c55e' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-auto-shell', children:[{
          type:'div', id:'grid-auto-box', children:[
            { type:'div', id:'grid-auto-one' },
            { type:'div', id:'grid-auto-two' },
          ],
        }],
      }],
    },
  },
};
