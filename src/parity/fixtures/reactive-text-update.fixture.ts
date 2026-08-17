import { ParityFixture } from '../parity.types';
import { SiteData } from '../../app/types/site-data';
import { StyleRule } from '../../app/types/style-rule';

const finalText = 'This updated project status wraps across several lines and grows every intrinsic ancestor.';

const styles: StyleRule[] = [
  { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
  { selector:'#reactive-text-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'160px', top:'100px', width:'480px', height:'360px', padding:'20px', background:'#e2e8f0' },
  { selector:'#reactive-text-panel', boxSizing:'border-box', display:'flex', flexDirection:'column', gap:'10px', width:'300px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#475569', background:'#cbd5e1' },
  { selector:'#reactive-text-copy', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', padding:'8px', borderWidth:'2px', borderStyle:'solid', borderColor:'#2563eb', background:'#ffffff', color:'#1e3a8a', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px', whiteSpace:'normal' },
  { selector:'#reactive-text-footer', boxSizing:'border-box', width:'auto', height:'30px', margin:'0', padding:'5px 8px', borderWidth:'1px', borderStyle:'solid', borderColor:'#64748b', background:'#f1f5f9', color:'#334155', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'18px' },
];

const createSiteData = (textContent: string): SiteData => ({
  styles,
  root: {
    children:[{
      type:'section' as const,
      id:'reactive-text-shell',
      children:[{
        type:'article' as const,
        id:'reactive-text-panel',
        children:[
          { type:'p' as const, id:'reactive-text-copy', textContent },
          { type:'footer' as const, id:'reactive-text-footer', textContent:'Following content' },
        ],
      }],
    }],
  },
});

export const reactiveTextUpdateFixture: ParityFixture = {
  id: 'reactive-text-update',
  title: 'Reactive wrapped text update',
  category: 'responsive',
  expectedBehavior: 'Updating short text to wrapped text in the same render session grows auto-height ancestors and moves following content exactly as browser reflow does.',
  measurementIds: [
    'reactive-text-shell', 'reactive-text-panel', 'reactive-text-copy',
    'reactive-text-footer',
  ],
  reference: {
    html: '<section id="reactive-text-shell"><article id="reactive-text-panel"><p id="reactive-text-copy">Short status.</p><footer id="reactive-text-footer">Following content</footer></article></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #reactive-text-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:160px; top:100px; width:480px; height:360px; padding:20px; background:#e2e8f0; }
      #reactive-text-panel { box-sizing:border-box; display:flex; flex-direction:column; gap:10px; width:300px; height:auto; margin:0; padding:12px; border:2px solid #475569; background:#cbd5e1; }
      #reactive-text-copy { box-sizing:border-box; width:auto; height:auto; margin:0; padding:8px; border:2px solid #2563eb; background:#ffffff; color:#1e3a8a; font:400 14px/20px Arial,sans-serif; white-space:normal; }
      #reactive-text-footer { box-sizing:border-box; width:auto; height:30px; margin:0; padding:5px 8px; border:1px solid #64748b; background:#f1f5f9; color:#334155; font:400 14px/18px Arial,sans-serif; }
    `,
  },
  siteData: createSiteData('Short status.'),
  dynamicSteps: [{
    id: 'wrapped-text',
    referenceMutations: [{
      type: 'set-text',
      elementId: 'reactive-text-copy',
      textContent: finalText,
    }],
    siteData: createSiteData(finalText),
  }],
};
