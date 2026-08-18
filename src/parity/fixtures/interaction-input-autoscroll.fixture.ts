import type { ParityFixture } from '../parity.types';

export const interactionInputAutoscrollFixture: ParityFixture = {
  id: 'interaction-input-autoscroll', title: 'Single-line input caret autoscrolling', category: 'forms-interactive',
  expectedBehavior: 'Keyboard and pointer caret movement keep a long single-line input caret visible by updating horizontal text scroll state, then return to the leading edge at Home.',
  measurementIds: ['autoscroll-input'], interactionIds: ['autoscroll-input'],
  interactionEventTypes: ['pointerdown','focus','pointerup','click','keydown','keyup','input'],
  interactionSteps: [
    {id:'focus-leading-text',actions:[{type:'click',elementId:'autoscroll-input',offsetX:28,offsetY:32}]},
    {id:'move-to-end',actions:[{type:'press-key',key:'End'}]},
    {id:'extend-near-end',actions:[{type:'press-key',key:'Shift+ArrowLeft'},{type:'press-key',key:'Shift+ArrowLeft'},{type:'press-key',key:'Shift+ArrowLeft'}]},
    {id:'replace-visible-selection',actions:[{type:'type-text',text:'XYZ'}]},
    {id:'return-home',actions:[{type:'press-key',key:'Home'}]},
  ],
  reference:{html:'<input id="autoscroll-input" type="text" value="abcdefghijklmnopqrstuvwxyz">',css:`
    #parity-reference-viewport{position:relative;overflow:hidden;background:#fffbeb;font-family:Arial,sans-serif}
    #autoscroll-input{appearance:none;box-sizing:border-box;position:absolute;left:280px;top:240px;width:240px;height:64px;margin:0;padding:14px 16px;border:2px solid #92400e;border-radius:0;outline:0;background:#fff;color:#451a03;font:400 20px/32px Arial,sans-serif}
    #autoscroll-input:focus{border-color:#f59e0b}
  `},
  siteData:{styles:[
    {selector:'root',background:'#fffbeb',fontFamily:'Arial, sans-serif'},
    {selector:'#autoscroll-input',boxSizing:'border-box',position:'absolute',left:'280px',top:'240px',width:'240px',height:'64px',margin:'0',padding:'14px 16px',borderWidth:'2px',borderStyle:'solid',borderColor:'#92400e',borderRadius:'0',background:'#ffffff',color:'#451a03',fontFamily:'Arial, sans-serif',fontSize:'20px',fontWeight:'400',lineHeight:'32px'},
    {selector:'#autoscroll-input:focus',borderColor:'#f59e0b'},
  ],root:{children:[{type:'input',inputType:'text',id:'autoscroll-input',value:'abcdefghijklmnopqrstuvwxyz'}]}},
};
