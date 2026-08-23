import { ParityFixture } from '../parity.types';

export const opacityStackingContextFixture: ParityFixture = {
  id:'opacity-stacking-context', title:'Opacity stacking-context containment', category:'layering-overlays',
  expectedBehavior:'Opacity creates a stacking context, so a high-z descendant remains below a root sibling with a higher stacking level.',
  measurementIds:['opacity-parent','opacity-child','opacity-sibling'],
  reference:{html:`<div id="opacity-parent"><div id="opacity-child"></div></div><div id="opacity-sibling"></div>`,css:`
    #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
    #opacity-parent { box-sizing:border-box; position:absolute; left:150px; top:130px; width:360px; height:260px; margin:0; padding:0; border:0; opacity:.82; background:#2563eb; }
    #opacity-child { box-sizing:border-box; position:absolute; left:150px; top:70px; z-index:100; width:280px; height:140px; margin:0; padding:0; border:0; background:#dc2626; }
    #opacity-sibling { box-sizing:border-box; position:absolute; left:390px; top:230px; z-index:1; width:270px; height:190px; margin:0; padding:0; border:0; background:#16a34a; }
  `},
  siteData:{styles:[
    {selector:'root',background:'#f8fafc'},
    {selector:'#opacity-parent',boxSizing:'border-box',position:'absolute',left:'150px',top:'130px',width:'360px',height:'260px',margin:'0',padding:'0',borderWidth:'0',opacity:'0.82',background:'#2563eb'},
    {selector:'#opacity-child',boxSizing:'border-box',position:'absolute',left:'150px',top:'70px',zIndex:'100',width:'280px',height:'140px',margin:'0',padding:'0',borderWidth:'0',background:'#dc2626'},
    {selector:'#opacity-sibling',boxSizing:'border-box',position:'absolute',left:'390px',top:'230px',zIndex:'1',width:'270px',height:'190px',margin:'0',padding:'0',borderWidth:'0',background:'#16a34a'},
  ],root:{children:[{type:'div',id:'opacity-parent',children:[{type:'div',id:'opacity-child'}]},{type:'div',id:'opacity-sibling'}]}},
};
