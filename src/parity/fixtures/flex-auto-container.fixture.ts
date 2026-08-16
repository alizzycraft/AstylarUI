import { ParityFixture } from '../parity.types';

export const flexAutoContainerFixture: ParityFixture = {
  id: 'flex-auto-container',
  title: 'Content-sized non-text flex item',
  category: 'flexbox',
  expectedBehavior: 'A non-text flex item contributes its descendant-driven auto height before its flex parent centers the item.',
  measurementIds: ['flex-auto-container-shell', 'flex-auto-container-card', 'flex-auto-container-first', 'flex-auto-container-second'],
  reference: {
    html: '<section id="flex-auto-container-shell"><article id="flex-auto-container-card"><div id="flex-auto-container-first"></div><div id="flex-auto-container-second"></div></article></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f5f3ff; }
      #flex-auto-container-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:50px; width:320px; height:240px; padding:20px; background:#ddd6fe; }
      #flex-auto-container-card { box-sizing:border-box; width:240px; height:auto; margin:0; padding:12px; border:2px solid #6d28d9; background:#ede9fe; }
      #flex-auto-container-first, #flex-auto-container-second { box-sizing:border-box; display:block; width:auto; margin:0; border:0; }
      #flex-auto-container-first { height:32px; background:#a78bfa; }
      #flex-auto-container-second { height:44px; margin-top:8px; background:#7c3aed; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f5f3ff' },
      { selector:'#flex-auto-container-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'50px', width:'320px', height:'240px', padding:'20px', background:'#ddd6fe' },
      { selector:'#flex-auto-container-card', boxSizing:'border-box', width:'240px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#6d28d9', background:'#ede9fe' },
      { selector:'#flex-auto-container-first, #flex-auto-container-second', boxSizing:'border-box', display:'block', width:'auto', margin:'0', borderWidth:'0' },
      { selector:'#flex-auto-container-first', height:'32px', background:'#a78bfa' },
      { selector:'#flex-auto-container-second', height:'44px', marginTop:'8px', background:'#7c3aed' },
    ],
    root: {
      children: [{
        type:'section', id:'flex-auto-container-shell',
        children:[{
          type:'article', id:'flex-auto-container-card',
          children:[
            { type:'div', id:'flex-auto-container-first' },
            { type:'div', id:'flex-auto-container-second' },
          ],
        }],
      }],
    },
  },
};
