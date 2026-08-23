import { ParityFixture } from '../parity.types';

export const flexMinMainSizeFixture: ParityFixture = {
  id: 'flex-min-main-size',
  title: 'Flex shrink respects main-axis minimums',
  category: 'flexbox',
  expectedBehavior:
    'Negative free space is redistributed after an item freezes at its authored min-width.',
  measurementIds: ['min-main-row', 'min-main-fixed', 'min-main-fluid'],
  reference: {
    html: '<div id="min-main-row"><div id="min-main-fixed"></div><div id="min-main-fluid"></div></div>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #min-main-row { position:absolute; left:90px; top:120px; width:260px; height:80px; display:flex; background:#dbeafe; }
      #min-main-fixed { width:180px; min-width:160px; height:80px; background:#2563eb; }
      #min-main-fluid { width:180px; min-width:0; height:80px; background:#f59e0b; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#min-main-row', position:'absolute', left:'90px', top:'120px', width:'260px', height:'80px', display:'flex', background:'#dbeafe' },
      { selector:'#min-main-fixed', width:'180px', minWidth:'160px', height:'80px', background:'#2563eb' },
      { selector:'#min-main-fluid', width:'180px', minWidth:'0', height:'80px', background:'#f59e0b' },
    ],
    root:{ children:[{ type:'div', id:'min-main-row', children:[
      { type:'div', id:'min-main-fixed' },
      { type:'div', id:'min-main-fluid' },
    ] }] },
  },
};
