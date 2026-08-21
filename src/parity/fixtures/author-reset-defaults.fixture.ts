import { ParityFixture } from '../parity.types';

export const authorResetDefaultsFixture: ParityFixture = {
  id: 'author-reset-defaults',
  title: 'Author reset over browser defaults',
  category: 'cascade-defaults',
  expectedBehavior:
    'Author margin and padding shorthands clear lower-origin browser-default heading and paragraph longhands.',
  measurementIds: ['reset-shell', 'reset-heading', 'reset-copy'],
  reference: {
    html: '<section id="reset-shell"><h2 id="reset-heading">Reset heading</h2><p id="reset-copy">Reset paragraph</p></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #reset-shell { position:absolute; left:120px; top:90px; width:360px; height:140px; padding:18px; background:#dbeafe; }
      #reset-heading { height:36px; font:700 20px/36px Arial,sans-serif; color:#172554; }
      #reset-copy { height:28px; font:400 14px/28px Arial,sans-serif; color:#1e3a8a; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#reset-shell', position:'absolute', left:'120px', top:'90px', width:'360px', height:'140px', padding:'18px', background:'#dbeafe' },
      { selector:'#reset-heading', height:'36px', fontFamily:'Arial, sans-serif', fontSize:'20px', fontWeight:'700', lineHeight:'36px', color:'#172554' },
      { selector:'#reset-copy', height:'28px', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'28px', color:'#1e3a8a' },
    ],
    root:{ children:[{ type:'section', id:'reset-shell', children:[
      { type:'h2', id:'reset-heading', textContent:'Reset heading' },
      { type:'p', id:'reset-copy', textContent:'Reset paragraph' },
    ] }] },
  },
};
