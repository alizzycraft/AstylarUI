import { ParityFixture } from '../parity.types';

export const flexIntrinsicWrapFixture: ParityFixture = {
  id: 'flex-intrinsic-wrap',
  title: 'Flex intrinsic minimums and stretched text wrapping',
  category: 'flexbox',
  expectedBehavior:
    'Row flex text items preserve their automatic min-content width, while column flex text items stretch to the cross-axis width and recompute their wrapped intrinsic height.',
  measurementIds: [
    'intrinsic-row',
    'intrinsic-row-text',
    'stretch-wrap-column',
    'stretch-wrap-text',
    'nested-stretch-column',
    'nested-stretch-text',
    'auto-row-cross-size',
    'auto-row-cross-text',
  ],
  reference: {
    html: `
      <div id="intrinsic-row"><span id="intrinsic-row-text">text-to-speech.txt</span></div>
      <div id="stretch-wrap-column"><span id="stretch-wrap-text">Generate speech to see audio controls here</span></div>
      <div id="nested-stretch-column"><div id="nested-fixed"></div><span id="nested-stretch-text">Save speech to history</span></div>
      <div id="auto-row-cross-size"><strong id="auto-row-cross-text">Generate speech to see audio controls here</strong></div>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      * { box-sizing:border-box; margin:0; padding:0; }
      #intrinsic-row { position:absolute; left:80px; top:80px; width:70px; height:90px; display:flex; background:#cbd5e1; }
      #intrinsic-row-text { font:400 12px/18px Arial,sans-serif; background:#bfdbfe; }
      #stretch-wrap-column { position:absolute; left:260px; top:80px; width:80px; height:180px; display:flex; flex-direction:column; background:#cbd5e1; }
      #stretch-wrap-text { font:400 14px/21px Arial,sans-serif; background:#bbf7d0; }
      #nested-stretch-column { position:absolute; left:420px; top:80px; width:70px; display:flex; flex-direction:column; gap:10px; background:#cbd5e1; }
      #nested-fixed { height:30px; background:#fca5a5; }
      #nested-stretch-text { font:400 14px/21px Arial,sans-serif; background:#fde68a; }
      #auto-row-cross-size { position:absolute; left:560px; top:80px; width:80px; min-height:60px; padding:16px; display:flex; align-items:center; justify-content:center; background:#cbd5e1; border:1px solid #475569; }
      #auto-row-cross-text { font:700 14px/21px Arial,sans-serif; background:#ddd6fe; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'*', boxSizing:'border-box', margin:'0', padding:'0' },
      { selector:'#intrinsic-row', position:'absolute', left:'80px', top:'80px', width:'70px', height:'90px', display:'flex', background:'#cbd5e1' },
      { selector:'#intrinsic-row-text', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'18px', background:'#bfdbfe' },
      { selector:'#stretch-wrap-column', position:'absolute', left:'260px', top:'80px', width:'80px', height:'180px', display:'flex', flexDirection:'column', background:'#cbd5e1' },
      { selector:'#stretch-wrap-text', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'21px', background:'#bbf7d0' },
      { selector:'#nested-stretch-column', position:'absolute', left:'420px', top:'80px', width:'70px', display:'flex', flexDirection:'column', gap:'10px', background:'#cbd5e1' },
      { selector:'#nested-fixed', height:'30px', background:'#fca5a5' },
      { selector:'#nested-stretch-text', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'21px', background:'#fde68a' },
      { selector:'#auto-row-cross-size', position:'absolute', left:'560px', top:'80px', width:'80px', minHeight:'60px', padding:'16px', display:'flex', alignItems:'center', justifyContent:'center', background:'#cbd5e1', borderWidth:'1px', borderStyle:'solid', borderColor:'#475569' },
      { selector:'#auto-row-cross-text', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'21px', fontWeight:'700', background:'#ddd6fe' },
    ],
    root: { children: [
      { type:'div', id:'intrinsic-row', children:[
        { type:'span', id:'intrinsic-row-text', textContent:'text-to-speech.txt' },
      ] },
      { type:'div', id:'stretch-wrap-column', children:[
        { type:'span', id:'stretch-wrap-text', textContent:'Generate speech to see audio controls here' },
      ] },
      { type:'div', id:'nested-stretch-column', children:[
        { type:'div', id:'nested-fixed' },
        { type:'span', id:'nested-stretch-text', textContent:'Save speech to history' },
      ] },
      { type:'div', id:'auto-row-cross-size', children:[
        { type:'strong', id:'auto-row-cross-text', textContent:'Generate speech to see audio controls here' },
      ] },
    ] },
  },
};
