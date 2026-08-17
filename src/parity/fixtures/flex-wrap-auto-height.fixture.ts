import { ParityFixture } from '../parity.types';

export const flexWrapAutoHeightFixture: ParityFixture = {
  id: 'flex-wrap-auto-height',
  title: 'Wrapped row flex intrinsic height',
  category: 'flexbox',
  expectedBehavior: 'A height-auto wrapped row flex container sums its flex line cross sizes and row gaps, then adds its padding and borders.',
  measurementIds: ['flex-wrap-auto', 'flex-wrap-auto-first', 'flex-wrap-auto-second', 'flex-wrap-auto-third'],
  reference: {
    html: '<section id="flex-wrap-auto"><div id="flex-wrap-auto-first"></div><div id="flex-wrap-auto-second"></div><div id="flex-wrap-auto-third"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; }
      #flex-wrap-auto { box-sizing:border-box; display:flex; flex-direction:row; flex-wrap:wrap; align-items:flex-start; align-content:flex-start; position:absolute; left:100px; top:80px; width:260px; height:auto; column-gap:8px; row-gap:12px; padding:10px; border:2px solid #2563eb; background:#ffffff; }
      #flex-wrap-auto-first { box-sizing:border-box; flex:0 0 100px; width:100px; height:36px; margin:0; background:#93c5fd; }
      #flex-wrap-auto-second { box-sizing:border-box; flex:0 0 100px; width:100px; height:28px; margin:0; background:#60a5fa; }
      #flex-wrap-auto-third { box-sizing:border-box; flex:0 0 100px; width:100px; height:44px; margin:0; background:#1d4ed8; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#eff6ff' },
      { selector:'#flex-wrap-auto', boxSizing:'border-box', display:'flex', flexDirection:'row', flexWrap:'wrap', alignItems:'flex-start', alignContent:'flex-start', position:'absolute', left:'100px', top:'80px', width:'260px', height:'auto', columnGap:'8px', rowGap:'12px', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#2563eb', background:'#ffffff' },
      { selector:'#flex-wrap-auto-first', boxSizing:'border-box', flex:'0 0 100px', width:'100px', height:'36px', margin:'0', background:'#93c5fd' },
      { selector:'#flex-wrap-auto-second', boxSizing:'border-box', flex:'0 0 100px', width:'100px', height:'28px', margin:'0', background:'#60a5fa' },
      { selector:'#flex-wrap-auto-third', boxSizing:'border-box', flex:'0 0 100px', width:'100px', height:'44px', margin:'0', background:'#1d4ed8' },
    ],
    root: {
      children:[{
        type:'section', id:'flex-wrap-auto',
        children:[
          { type:'div', id:'flex-wrap-auto-first' },
          { type:'div', id:'flex-wrap-auto-second' },
          { type:'div', id:'flex-wrap-auto-third' },
        ],
      }],
    },
  },
};
