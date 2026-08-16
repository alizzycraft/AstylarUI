import { ParityFixture } from '../parity.types';

export const maxWidthAutoTextFixture: ParityFixture = {
  id: 'max-width-auto-text',
  title: 'Max-width constrained intrinsic text height',
  category: 'box-model-units',
  expectedBehavior: 'An auto-height text block wraps and grows using its final max-width-constrained content box.',
  measurementIds: ['max-width-auto-text-box'],
  reference: {
    html: '<p id="max-width-auto-text-box">Constraint-aware intrinsic sizing must wrap this sentence using the final content width.</p>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fff7ed; font-family:Arial,sans-serif; }
      #max-width-auto-text-box { box-sizing:border-box; position:absolute; left:90px; top:70px; width:420px; max-width:220px; height:auto; margin:0; padding:14px; border:3px solid #c2410c; background:#ffedd5; color:#7c2d12; font:400 18px/27px Arial,sans-serif; white-space:normal; text-align:left; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fff7ed', fontFamily:'Arial, sans-serif' },
      { selector:'#max-width-auto-text-box', boxSizing:'border-box', position:'absolute', left:'90px', top:'70px', width:'420px', maxWidth:'220px', height:'auto', margin:'0', padding:'14px', borderWidth:'3px', borderStyle:'solid', borderColor:'#c2410c', background:'#ffedd5', color:'#7c2d12', fontFamily:'Arial, sans-serif', fontSize:'18px', lineHeight:'27px', whiteSpace:'normal', textAlign:'left' },
    ],
    root: {
      children: [{
        type:'p', id:'max-width-auto-text-box',
        textContent:'Constraint-aware intrinsic sizing must wrap this sentence using the final content width.',
      }],
    },
  },
};
