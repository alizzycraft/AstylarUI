import { ParityFixture } from '../parity.types';

export const flexAutoMainSizeFixture: ParityFixture = {
  id: 'flex-auto-main-size',
  title: 'Intrinsic flex main sizes and auto margin',
  category: 'flexbox',
  expectedBehavior:
    'Text flex items use their intrinsic main size, min-width constrains controls, and a main-axis auto margin absorbs positive free space.',
  measurementIds: ['auto-main-row', 'auto-main-label', 'auto-main-copy', 'auto-main-action'],
  reference: {
    html: '<div id="auto-main-row"><strong id="auto-main-label">Status</strong><span id="auto-main-copy">Ready now</span><input id="auto-main-action" type="button" value="Continue"></div>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #auto-main-row { position:absolute; left:90px; top:120px; width:560px; height:84px; padding:16px; display:flex; align-items:center; gap:18px; background:#dbeafe; }
      #auto-main-label { font:700 16px/24px Arial,sans-serif; color:#172554; }
      #auto-main-copy { font:400 14px/24px Arial,sans-serif; color:#1e3a8a; }
      #auto-main-action { min-width:160px; height:44px; margin-left:auto; padding:10px 18px; border:0; background:#2563eb; color:#fff; font:700 14px/24px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#auto-main-row', position:'absolute', left:'90px', top:'120px', width:'560px', height:'84px', padding:'16px', display:'flex', alignItems:'center', gap:'18px', background:'#dbeafe' },
      { selector:'#auto-main-label', fontFamily:'Arial, sans-serif', fontSize:'16px', fontWeight:'700', lineHeight:'24px', color:'#172554' },
      { selector:'#auto-main-copy', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'24px', color:'#1e3a8a' },
      { selector:'#auto-main-action', minWidth:'160px', height:'44px', marginLeft:'auto', padding:'10px 18px', borderWidth:'0', background:'#2563eb', color:'#fff', fontFamily:'Arial, sans-serif', fontSize:'14px', fontWeight:'700', lineHeight:'24px' },
    ],
    root:{ children:[{ type:'div', id:'auto-main-row', children:[
      { type:'strong', id:'auto-main-label', textContent:'Status' },
      { type:'span', id:'auto-main-copy', textContent:'Ready now' },
      { type:'input', id:'auto-main-action', inputType:'button', value:'Continue' },
    ] }] },
  },
};
