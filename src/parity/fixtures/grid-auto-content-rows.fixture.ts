import { ParityFixture } from '../parity.types';

export const gridAutoContentRowsFixture: ParityFixture = {
  id: 'grid-auto-content-rows',
  title: 'Content-sized auto grid rows',
  category: 'grid',
  expectedBehavior: 'Auto grid rows use the largest measurable item contribution in each row, and those rows plus gaps drive a height-auto grid container.',
  measurementIds: ['grid-auto-content-shell', 'grid-auto-content-box', 'grid-auto-content-first', 'grid-auto-content-second'],
  reference: {
    html: '<section id="grid-auto-content-shell"><div id="grid-auto-content-box"><div id="grid-auto-content-first"></div><div id="grid-auto-content-second"></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#ecfdf5; }
      #grid-auto-content-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:90px; top:60px; width:340px; height:260px; padding:20px; background:#d1fae5; }
      #grid-auto-content-box { box-sizing:border-box; display:grid; grid-template-columns:220px; grid-template-rows:auto auto; row-gap:10px; width:248px; height:auto; margin:0; padding:12px; border:2px solid #047857; background:#a7f3d0; }
      #grid-auto-content-first { box-sizing:border-box; width:auto; height:36px; margin:0; background:#34d399; }
      #grid-auto-content-second { box-sizing:border-box; width:auto; height:52px; margin:0; background:#059669; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#ecfdf5' },
      { selector:'#grid-auto-content-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'90px', top:'60px', width:'340px', height:'260px', padding:'20px', background:'#d1fae5' },
      { selector:'#grid-auto-content-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'220px', gridTemplateRows:'auto auto', rowGap:'10px', width:'248px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#047857', background:'#a7f3d0' },
      { selector:'#grid-auto-content-first', boxSizing:'border-box', width:'auto', height:'36px', margin:'0', background:'#34d399' },
      { selector:'#grid-auto-content-second', boxSizing:'border-box', width:'auto', height:'52px', margin:'0', background:'#059669' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-auto-content-shell', children:[{
          type:'div', id:'grid-auto-content-box', children:[
            { type:'div', id:'grid-auto-content-first' },
            { type:'div', id:'grid-auto-content-second' },
          ],
        }],
      }],
    },
  },
};
