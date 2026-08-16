import { ParityFixture } from '../parity.types';

export const autoWrappedTextFixture: ParityFixture = {
  id: 'auto-wrapped-text',
  title: 'Wrapped text intrinsic height',
  category: 'typography',
  expectedBehavior: 'A width-constrained block with auto height grows to contain every wrapped line plus its padding and borders.',
  measurementIds: ['auto-wrap-box'],
  reference: {
    html: '<p id="auto-wrap-box">Astylar layouts should wrap ordinary text at the same word boundaries as a browser.</p>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f0fdf4; font-family:Arial,sans-serif; }
      #auto-wrap-box { box-sizing:border-box; position:absolute; left:90px; top:70px; width:280px; height:auto; margin:0; padding:18px; border:3px solid #15803d; background:#dcfce7; color:#14532d; font:400 18px/27px Arial,sans-serif; white-space:normal; text-align:left; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f0fdf4', fontFamily:'Arial, sans-serif' },
      { selector:'#auto-wrap-box', boxSizing:'border-box', position:'absolute', left:'90px', top:'70px', width:'280px', height:'auto', margin:'0', padding:'18px', borderWidth:'3px', borderStyle:'solid', borderColor:'#15803d', background:'#dcfce7', color:'#14532d', fontFamily:'Arial, sans-serif', fontSize:'18px', lineHeight:'27px', whiteSpace:'normal', textAlign:'left' },
    ],
    root: {
      children: [{
        type:'p', id:'auto-wrap-box',
        textContent:'Astylar layouts should wrap ordinary text at the same word boundaries as a browser.',
      }],
    },
  },
};
