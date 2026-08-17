import { ParityFixture } from '../parity.types';

export const gridAutoNestedCompositeFixture: ParityFixture = {
  id: 'grid-auto-nested-composite',
  title: 'Auto grid row with nested application content',
  category: 'grid',
  expectedBehavior: 'A height-auto Grid row recursively includes a nested Grid card containing wrapped block text, controls, and an explicitly sized image.',
  measurementIds: [
    'grid-composite-shell', 'grid-composite-box', 'grid-composite-card',
    'grid-composite-image', 'grid-composite-copy', 'grid-composite-action',
    'grid-composite-input',
  ],
  reference: {
    html: '<section id="grid-composite-shell"><div id="grid-composite-box"><article id="grid-composite-card"><img id="grid-composite-image" src="/parity/article-pattern.svg" alt="Project preview"><div id="grid-composite-copy">A compact project card with wrapping descriptive text.</div><input id="grid-composite-action" type="button" value="Open"><input id="grid-composite-input" type="text" value="Ready for review"></article></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #grid-composite-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:90px; top:45px; width:420px; height:310px; padding:20px; background:#e2e8f0; }
      #grid-composite-box { box-sizing:border-box; display:grid; grid-template-columns:300px; grid-template-rows:auto; width:324px; height:auto; margin:0; padding:10px; border:2px solid #475569; background:#cbd5e1; }
      #grid-composite-card { box-sizing:border-box; display:grid; grid-template-columns:72px 1fr; grid-template-rows:auto auto; column-gap:10px; row-gap:8px; width:auto; height:auto; margin:0; padding:10px; border:2px solid #2563eb; background:#dbeafe; }
      #grid-composite-image { box-sizing:border-box; display:block; width:72px; height:56px; margin:0; border:0; object-fit:cover; }
      #grid-composite-copy { box-sizing:border-box; width:auto; height:auto; margin:0; padding:6px; border:1px solid #93c5fd; background:#ffffff; color:#1e3a8a; font:400 14px/20px Arial,sans-serif; white-space:normal; }
      #grid-composite-action, #grid-composite-input { box-sizing:border-box; height:34px; margin:0; padding:6px 8px; border:1px solid #60a5fa; border-radius:0; background:#ffffff; color:#1e3a8a; font:400 14px/20px Arial,sans-serif; }
      #grid-composite-action { width:72px; }
      #grid-composite-input { width:auto; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'#grid-composite-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'90px', top:'45px', width:'420px', height:'310px', padding:'20px', background:'#e2e8f0' },
      { selector:'#grid-composite-box', boxSizing:'border-box', display:'grid', gridTemplateColumns:'300px', gridTemplateRows:'auto', width:'324px', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#475569', background:'#cbd5e1' },
      { selector:'#grid-composite-card', boxSizing:'border-box', display:'grid', gridTemplateColumns:'72px 1fr', gridTemplateRows:'auto auto', columnGap:'10px', rowGap:'8px', width:'auto', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#2563eb', background:'#dbeafe' },
      { selector:'#grid-composite-image', boxSizing:'border-box', display:'block', width:'72px', height:'56px', margin:'0', borderWidth:'0', objectFit:'cover' },
      { selector:'#grid-composite-copy', boxSizing:'border-box', width:'auto', height:'auto', margin:'0', padding:'6px', borderWidth:'1px', borderStyle:'solid', borderColor:'#93c5fd', background:'#ffffff', color:'#1e3a8a', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px', whiteSpace:'normal' },
      { selector:'#grid-composite-action, #grid-composite-input', boxSizing:'border-box', height:'34px', margin:'0', padding:'6px 8px', borderWidth:'1px', borderStyle:'solid', borderColor:'#60a5fa', borderRadius:'0', background:'#ffffff', color:'#1e3a8a', fontFamily:'Arial, sans-serif', fontSize:'14px', lineHeight:'20px' },
      { selector:'#grid-composite-action', width:'72px' },
      { selector:'#grid-composite-input', width:'auto' },
    ],
    root: {
      children:[{
        type:'section', id:'grid-composite-shell', children:[{
          type:'div', id:'grid-composite-box', children:[{
            type:'article', id:'grid-composite-card', children:[
              { type:'img', id:'grid-composite-image', src:'/parity/article-pattern.svg', alt:'Project preview' },
              { type:'div', id:'grid-composite-copy', textContent:'A compact project card with wrapping descriptive text.' },
              { type:'input', inputType:'button', id:'grid-composite-action', value:'Open' },
              { type:'input', inputType:'text', id:'grid-composite-input', value:'Ready for review' },
            ],
          }],
        }],
      }],
    },
  },
};
