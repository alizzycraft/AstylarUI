import { ParityFixture } from '../parity.types';

export const flexColumnAutoHeightFixture: ParityFixture = {
  id: 'flex-column-auto-height',
  title: 'Column flex container intrinsic height',
  category: 'flexbox',
  expectedBehavior: 'A height-auto nowrap column flex container sums its in-flow items, non-collapsing main-axis margins, gaps, padding, and borders.',
  measurementIds: ['flex-column-auto-shell', 'flex-column-auto', 'flex-column-auto-first', 'flex-column-auto-second'],
  reference: {
    html: '<section id="flex-column-auto-shell"><div id="flex-column-auto"><div id="flex-column-auto-first"></div><div id="flex-column-auto-second"></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdf4; }
      #flex-column-auto-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:50px; width:340px; height:260px; padding:20px; background:#dcfce7; }
      #flex-column-auto { box-sizing:border-box; display:flex; flex-direction:column; flex-wrap:nowrap; gap:10px; width:240px; height:auto; margin:0; padding:12px; border:2px solid #15803d; background:#ffffff; }
      #flex-column-auto-first, #flex-column-auto-second { box-sizing:border-box; flex:0 0 auto; width:212px; }
      #flex-column-auto-first { height:32px; margin:0; margin-bottom:5px; background:#86efac; }
      #flex-column-auto-second { height:44px; margin:0; margin-top:7px; background:#22c55e; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f0fdf4' },
      { selector:'#flex-column-auto-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'50px', width:'340px', height:'260px', padding:'20px', background:'#dcfce7' },
      { selector:'#flex-column-auto', boxSizing:'border-box', display:'flex', flexDirection:'column', flexWrap:'nowrap', gap:'10px', width:'240px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#15803d', background:'#ffffff' },
      { selector:'#flex-column-auto-first, #flex-column-auto-second', boxSizing:'border-box', flex:'0 0 auto', width:'212px' },
      { selector:'#flex-column-auto-first', height:'32px', margin:'0', marginBottom:'5px', background:'#86efac' },
      { selector:'#flex-column-auto-second', height:'44px', margin:'0', marginTop:'7px', background:'#22c55e' },
    ],
    root: {
      children:[{
        type:'section', id:'flex-column-auto-shell', children:[{
          type:'div', id:'flex-column-auto', children:[
            { type:'div', id:'flex-column-auto-first' },
            { type:'div', id:'flex-column-auto-second' },
          ],
        }],
      }],
    },
  },
};
