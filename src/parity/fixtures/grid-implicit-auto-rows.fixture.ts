import { ParityFixture } from '../parity.types';

export const gridImplicitAutoRowsFixture: ParityFixture = {
  id: 'grid-implicit-auto-rows',
  title: 'Content-sized implicit grid rows',
  category: 'grid',
  expectedBehavior: 'Items overflowing the explicit column structure create implicit auto rows whose heights use the largest item contribution in each row.',
  measurementIds: [
    'grid-implicit-shell', 'grid-implicit-box', 'grid-implicit-a',
    'grid-implicit-b', 'grid-implicit-c', 'grid-implicit-d', 'grid-implicit-e',
  ],
  reference: {
    html: '<section id="grid-implicit-shell"><div id="grid-implicit-box"><div id="grid-implicit-a"></div><div id="grid-implicit-b"></div><div id="grid-implicit-c"></div><div id="grid-implicit-d"></div><div id="grid-implicit-e"></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fdf4ff; }
      #grid-implicit-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:50px; width:440px; height:340px; padding:20px; background:#fae8ff; }
      #grid-implicit-box { box-sizing:border-box; display:grid; grid-template-columns:150px 180px; column-gap:14px; row-gap:10px; width:372px; height:auto; margin:0; padding:12px; border:2px solid #a21caf; background:#f5d0fe; }
      #grid-implicit-a { box-sizing:border-box; width:auto; height:28px; margin:0; background:#e879f9; }
      #grid-implicit-b { box-sizing:border-box; width:auto; height:44px; margin:0; background:#d946ef; }
      #grid-implicit-c { box-sizing:border-box; width:auto; height:36px; margin:0; background:#c026d3; }
      #grid-implicit-d { box-sizing:border-box; width:auto; height:52px; margin:0; background:#a21caf; }
      #grid-implicit-e { box-sizing:border-box; width:auto; height:40px; margin:0; background:#86198f; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fdf4ff' },
      { selector:'#grid-implicit-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'50px', width:'440px', height:'340px', padding:'20px', background:'#fae8ff' },
      { selector:'#grid-implicit-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'150px 180px', columnGap:'14px', rowGap:'10px', width:'372px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#a21caf', background:'#f5d0fe' },
      { selector:'#grid-implicit-a', boxSizing:'border-box', width:'auto', height:'28px', margin:'0', background:'#e879f9' },
      { selector:'#grid-implicit-b', boxSizing:'border-box', width:'auto', height:'44px', margin:'0', background:'#d946ef' },
      { selector:'#grid-implicit-c', boxSizing:'border-box', width:'auto', height:'36px', margin:'0', background:'#c026d3' },
      { selector:'#grid-implicit-d', boxSizing:'border-box', width:'auto', height:'52px', margin:'0', background:'#a21caf' },
      { selector:'#grid-implicit-e', boxSizing:'border-box', width:'auto', height:'40px', margin:'0', background:'#86198f' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-implicit-shell', children:[{
          type:'div', id:'grid-implicit-box', children:[
            { type:'div', id:'grid-implicit-a' },
            { type:'div', id:'grid-implicit-b' },
            { type:'div', id:'grid-implicit-c' },
            { type:'div', id:'grid-implicit-d' },
            { type:'div', id:'grid-implicit-e' },
          ],
        }],
      }],
    },
  },
};
