import { ParityFixture } from '../parity.types';

export const gridAutoWrappedTextRowFixture: ParityFixture = {
  id: 'grid-auto-wrapped-text-row',
  title: 'Responsive auto grid row from wrapped text',
  category: 'grid',
  expectedBehavior: 'A Grid item is measured at its resolved column width, so responsive text wrapping drives the auto row and height-auto Grid container consistently.',
  measurementIds: ['grid-wrap-shell', 'grid-wrap-box', 'grid-wrap-card', 'grid-wrap-copy'],
  viewportIds: ['desktop', 'tablet', 'mobile'],
  reference: {
    html: '<section id="grid-wrap-shell"><div id="grid-wrap-box"><article id="grid-wrap-card"><p id="grid-wrap-copy">Responsive grid content wraps into additional lines as the available track becomes narrower.</p></article></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; font-family:Arial,sans-serif; }
      #grid-wrap-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:80px; top:60px; width:640px; height:300px; padding:20px; background:#dbeafe; }
      #grid-wrap-box { box-sizing:border-box; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:auto; column-gap:16px; width:520px; height:auto; margin:0; padding:12px; border:2px solid #2563eb; background:#bfdbfe; }
      #grid-wrap-card { box-sizing:border-box; width:auto; height:auto; margin:0; padding:10px; border:2px solid #60a5fa; background:#ffffff; }
      #grid-wrap-copy { box-sizing:border-box; width:auto; height:auto; margin:0; color:#1e3a8a; font:400 14px/20px Arial,sans-serif; white-space:normal; }
      @media (min-width:600px) and (max-width:749px) {
        #grid-wrap-shell { left:40px; width:560px; }
        #grid-wrap-box { width:440px; }
      }
      @media (max-width:599px) {
        #grid-wrap-shell { left:10px; top:80px; width:370px; }
        #grid-wrap-box { width:350px; column-gap:12px; padding:10px; }
      }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#eff6ff', fontFamily:'Arial, sans-serif' },
      { selector:'#grid-wrap-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'80px', top:'60px', width:'640px', height:'300px', padding:'20px', background:'#dbeafe' },
      { selector:'#grid-wrap-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'1fr 1fr', gridTemplateRows:'auto', columnGap:'16px', width:'520px', height:'auto', margin:'0', padding:'12px', borderWidth:'2px', borderStyle:'solid', borderColor:'#2563eb', background:'#bfdbfe' },
      { selector:'#grid-wrap-card', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#60a5fa', background:'#ffffff' },
      { selector:'#grid-wrap-copy', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', color:'#1e3a8a', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px', whiteSpace:'normal' },
      { selector:'#grid-wrap-shell', mediaMinWidth:'600px', mediaMaxWidth:'749px', left:'40px', width:'560px' },
      { selector:'#grid-wrap-box', mediaMinWidth:'600px', mediaMaxWidth:'749px', width:'440px' },
      { selector:'#grid-wrap-shell', mediaMaxWidth:'599px', left:'10px', top:'80px', width:'370px' },
      { selector:'#grid-wrap-box', mediaMaxWidth:'599px', width:'350px', columnGap:'12px', padding:'10px' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-wrap-shell', children:[{
          type:'div', id:'grid-wrap-box', children:[{
            type:'article', id:'grid-wrap-card', children:[{
              type:'p', id:'grid-wrap-copy', textContent:'Responsive grid content wraps into additional lines as the available track becomes narrower.',
            }],
          }],
        }],
      }],
    },
  },
};
