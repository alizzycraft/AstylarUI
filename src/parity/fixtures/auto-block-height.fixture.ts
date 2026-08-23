import { ParityFixture } from '../parity.types';

export const autoBlockHeightFixture: ParityFixture = {
  id: 'auto-block-height',
  title: 'Content-sized block height',
  category: 'box-model-units',
  expectedBehavior: 'An auto-height block grows from in-flow children, collapsed sibling margins, padding, and borders while auto-width children fill its content box.',
  measurementIds: ['auto-block-parent', 'auto-block-one', 'auto-block-two'],
  reference: {
    html: '<section id="auto-block-parent"><div id="auto-block-one">First content block</div><div id="auto-block-two">Second content block</div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #auto-block-parent { box-sizing:border-box; position:absolute; left:80px; top:50px; width:320px; padding:16px; border:2px solid #334155; background:#e2e8f0; }
      #auto-block-one, #auto-block-two { box-sizing:border-box; display:block; width:auto; padding:10px; border:1px solid #0284c7; color:#0c4a6e; font:400 14px/20px Arial,sans-serif; }
      #auto-block-one { height:48px; margin:0 0 12px; background:#bae6fd; }
      #auto-block-two { height:64px; margin:0; background:#cffafe; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'#auto-block-parent', boxSizing:'border-box', position:'absolute', left:'80px', top:'50px', width:'320px', padding:'16px', borderWidth:'2px', borderStyle:'solid', borderColor:'#334155', background:'#e2e8f0' },
      { selector:'#auto-block-one, #auto-block-two', boxSizing:'border-box', display:'block', width:'auto', padding:'10px', borderWidth:'1px', borderStyle:'solid', borderColor:'#0284c7', color:'#0c4a6e', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px' },
      { selector:'#auto-block-one', height:'48px', margin:'0 0 12px', background:'#bae6fd' },
      { selector:'#auto-block-two', height:'64px', margin:'0', background:'#cffafe' },
    ],
    root: {
      children: [{
        type:'section', id:'auto-block-parent',
        children:[
          { type:'div', id:'auto-block-one', textContent:'First content block' },
          { type:'div', id:'auto-block-two', textContent:'Second content block' },
        ],
      }],
    },
  },
};
