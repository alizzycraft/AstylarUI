import { ParityFixture } from '../parity.types';

export const standaloneFlexAutoHeightFixture: ParityFixture = {
  id: 'standalone-flex-auto-height',
  title: 'Standalone flex container intrinsic height',
  category: 'flexbox',
  expectedBehavior: 'A positioned height-auto flex container sizes its own border box from its in-flow children before laying them out.',
  measurementIds: ['standalone-flex', 'standalone-flex-first', 'standalone-flex-second'],
  reference: {
    html: '<section id="standalone-flex"><div id="standalone-flex-first"></div><div id="standalone-flex-second"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; }
      #standalone-flex { box-sizing:border-box; display:flex; flex-direction:column; flex-wrap:nowrap; position:absolute; left:100px; top:80px; width:240px; height:auto; gap:8px; padding:12px; border:2px solid #2563eb; background:#ffffff; }
      #standalone-flex-first { box-sizing:border-box; flex:0 0 32px; width:212px; height:32px; background:#93c5fd; }
      #standalone-flex-second { box-sizing:border-box; flex:0 0 44px; width:212px; height:44px; background:#1d4ed8; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#eff6ff' },
      { selector:'#standalone-flex', boxSizing:'border-box', display:'flex', flexDirection:'column', flexWrap:'nowrap', position:'absolute', left:'100px', top:'80px', width:'240px', height:'auto', gap:'8px', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#2563eb', background:'#ffffff' },
      { selector:'#standalone-flex-first', boxSizing:'border-box', flex:'0 0 32px', width:'212px', height:'32px', background:'#93c5fd' },
      { selector:'#standalone-flex-second', boxSizing:'border-box', flex:'0 0 44px', width:'212px', height:'44px', background:'#1d4ed8' },
    ],
    root: {
      children:[{
        type:'section', id:'standalone-flex',
        children:[
          { type:'div', id:'standalone-flex-first' },
          { type:'div', id:'standalone-flex-second' },
        ],
      }],
    },
  },
};
