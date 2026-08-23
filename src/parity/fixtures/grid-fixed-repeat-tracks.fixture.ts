import { ParityFixture } from '../parity.types';

export const gridFixedRepeatTracksFixture: ParityFixture = {
  id: 'grid-fixed-repeat-tracks',
  title: 'Fixed-count repeated grid tracks',
  category: 'grid',
  expectedBehavior: 'A fixed-count repeat expands complete track functions before sizing and auto-placement, including repeated minmax columns and fixed rows.',
  measurementIds: [
    'grid-repeat-box', 'grid-repeat-a', 'grid-repeat-b', 'grid-repeat-c',
    'grid-repeat-d', 'grid-repeat-e', 'grid-repeat-f',
  ],
  reference: {
    html: '<section id="grid-repeat-box"><div id="grid-repeat-a"></div><div id="grid-repeat-b"></div><div id="grid-repeat-c"></div><div id="grid-repeat-d"></div><div id="grid-repeat-e"></div><div id="grid-repeat-f"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fff7ed; }
      #grid-repeat-box { box-sizing:border-box; display:grid; grid-template-columns:repeat(2, minmax(100px, 1fr)) 80px; grid-template-rows:repeat(2, 54px); column-gap:12px; row-gap:10px; position:absolute; left:100px; top:90px; width:460px; height:154px; padding:16px; border:2px solid #c2410c; background:#ffedd5; }
      #grid-repeat-box > div { box-sizing:border-box; min-width:0; min-height:0; margin:0; }
      #grid-repeat-a { background:#fb923c; } #grid-repeat-b { background:#f97316; }
      #grid-repeat-c { background:#ea580c; } #grid-repeat-d { background:#c2410c; }
      #grid-repeat-e { background:#9a3412; } #grid-repeat-f { background:#7c2d12; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fff7ed' },
      { selector:'#grid-repeat-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'repeat(2, minmax(100px, 1fr)) 80px', gridTemplateRows:'repeat(2, 54px)', columnGap:'12px', rowGap:'10px', position:'absolute', left:'100px', top:'90px', width:'460px', height:'154px', padding:'16px', borderWidth:'2px', borderStyle:'solid', borderColor:'#c2410c', background:'#ffedd5' },
      { selector:'#grid-repeat-box > div', boxSizing:'border-box', minWidth:'0', minHeight:'0', margin:'0' },
      { selector:'#grid-repeat-a', background:'#fb923c' },
      { selector:'#grid-repeat-b', background:'#f97316' },
      { selector:'#grid-repeat-c', background:'#ea580c' },
      { selector:'#grid-repeat-d', background:'#c2410c' },
      { selector:'#grid-repeat-e', background:'#9a3412' },
      { selector:'#grid-repeat-f', background:'#7c2d12' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-repeat-box', children:[
          { type:'div', id:'grid-repeat-a' }, { type:'div', id:'grid-repeat-b' },
          { type:'div', id:'grid-repeat-c' }, { type:'div', id:'grid-repeat-d' },
          { type:'div', id:'grid-repeat-e' }, { type:'div', id:'grid-repeat-f' },
        ],
      }],
    },
  },
};
