import type { ParityFixture } from '../parity.types';

export const overflowScrolledTargetFixture: ParityFixture = {
  id: 'overflow-scrolled-target', title: 'Pointer targeting after scrolling', category: 'overflow-scrolling',
  expectedBehavior: 'A clipped control cannot be activated, becomes pointer-targetable and focusable after scrolling into view, and becomes inert again when scrolled back outside the clip.',
  measurementIds: ['target-shell', 'target-scroll', 'target-content', 'target-button'],
  scrollIds: ['target-scroll'], interactionIds: ['target-button'],
  interactionEventTypes: ['pointerdown', 'pointerup', 'click', 'focus', 'blur'],
  interactionSteps: [
    { id: 'click-while-clipped', actions: [{ type: 'click', elementId: 'target-button' }] },
    { id: 'scroll-into-view', actions: [{ type: 'wheel', elementId: 'target-scroll', deltaY: 100 }] },
    { id: 'activate-visible-button', actions: [{ type: 'click', elementId: 'target-button' }] },
    { id: 'scroll-out-of-view', actions: [{ type: 'wheel', elementId: 'target-scroll', deltaY: -100 }] },
    { id: 'click-clipped-area-again', actions: [{ type: 'click', elementId: 'target-button' }] },
  ],
  reference: {
    html: `<section id="target-shell"><div id="target-scroll"><div id="target-content"><div id="target-spacer"></div><input id="target-button" type="button" value="Run task"><div id="target-tail"></div></div></div></section>`,
    css: `
      #parity-reference-viewport{position:relative;overflow:hidden;background:#eff6ff;font-family:Arial,sans-serif}
      #target-shell{position:absolute;left:190px;top:90px;width:420px;height:420px;padding:60px;background:#bfdbfe}
      #target-scroll{box-sizing:border-box;width:260px;height:140px;margin:0;padding:0;overflow:auto;scrollbar-width:none;background:#fff}
      #target-scroll::-webkit-scrollbar{display:none}
      #target-content{box-sizing:border-box;width:260px;height:280px;margin:0;padding:0;background:#dbeafe}
      #target-spacer{box-sizing:border-box;width:260px;height:180px;background:#1e3a8a}
      #target-button{appearance:none;box-sizing:border-box;width:180px;height:60px;margin:0 40px;padding:12px;border:0;border-radius:0;outline:0;background:#dc2626;color:#fff;font:700 16px/36px Arial,sans-serif;text-align:center}
      #target-button:focus{background:#991b1b}
      #target-tail{box-sizing:border-box;width:260px;height:40px;background:#93c5fd}
    `,
  },
  siteData: { styles: [
    {selector:'root',background:'#eff6ff',fontFamily:'Arial, sans-serif'},
    {selector:'#target-shell',position:'absolute',left:'190px',top:'90px',width:'420px',height:'420px',padding:'60px',background:'#bfdbfe'},
    {selector:'#target-scroll',boxSizing:'border-box',width:'260px',height:'140px',margin:'0',padding:'0',overflow:'auto',background:'#ffffff'},
    {selector:'#target-content',boxSizing:'border-box',width:'260px',height:'280px',margin:'0',padding:'0',background:'#dbeafe'},
    {selector:'#target-spacer',boxSizing:'border-box',width:'260px',height:'180px',background:'#1e3a8a'},
    {selector:'#target-button',boxSizing:'border-box',width:'180px',height:'60px',margin:'0 40px',padding:'12px',borderWidth:'0',borderRadius:'0',background:'#dc2626',color:'#ffffff',fontFamily:'Arial, sans-serif',fontSize:'16px',fontWeight:'700',lineHeight:'36px',textAlign:'center'},
    {selector:'#target-button:focus',background:'#991b1b'},
    {selector:'#target-tail',boxSizing:'border-box',width:'260px',height:'40px',background:'#93c5fd'},
  ], root:{children:[{type:'section',id:'target-shell',children:[{type:'div',id:'target-scroll',children:[{type:'div',id:'target-content',children:[{type:'div',id:'target-spacer'},{type:'input',inputType:'button',id:'target-button',value:'Run task'},{type:'div',id:'target-tail'}]}]}]}]}},
};
