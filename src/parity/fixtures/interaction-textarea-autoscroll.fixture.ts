import type { ParityFixture } from '../parity.types';

const value = 'Line one\nLine two\nLine three\nLine four\nLine five\nLine six\nLine seven';

export const interactionTextareaAutoscrollFixture: ParityFixture = {
  id:'interaction-textarea-autoscroll',title:'Textarea caret autoscrolling',category:'forms-interactive',
  expectedBehavior:'Moving the caret beyond a multiline textarea viewport scrolls vertically to keep it visible, preserves selection/editing state there, and returns to the leading viewport with the caret.',
  measurementIds:['autoscroll-textarea'],interactionIds:['autoscroll-textarea'],
  interactionEventTypes:['pointerdown','focus','pointerup','click','keydown','keyup','input'],
  interactionSteps:[
    {id:'focus-textarea',actions:[{type:'click',elementId:'autoscroll-textarea',offsetX:30,offsetY:16}]},
    {id:'select-all',actions:[{type:'press-key',key:'Control+A'}]},
    {id:'collapse-at-end',actions:[{type:'press-key',key:'ArrowRight'}]},
    {id:'insert-at-scrolled-caret',actions:[{type:'type-text',text:'!'}]},
    {id:'select-all-again',actions:[{type:'press-key',key:'Control+A'}]},
    {id:'collapse-at-start',actions:[{type:'press-key',key:'ArrowLeft'}]},
  ],
  reference:{html:`<textarea id="autoscroll-textarea">${value}</textarea>`,css:`
    #parity-reference-viewport{position:relative;overflow:hidden;background:#fdf2f8;font-family:Arial,sans-serif}
    #autoscroll-textarea{appearance:none;box-sizing:border-box;position:absolute;left:250px;top:180px;width:300px;height:144px;margin:0;padding:12px 14px;border:2px solid #9d174d;border-radius:0;outline:0;resize:none;overflow:auto;scrollbar-width:none;background:#fff;color:#500724;font:400 16px/24px Arial,sans-serif;white-space:pre-wrap}
    #autoscroll-textarea::-webkit-scrollbar{display:none} #autoscroll-textarea:focus{border-color:#ec4899}
  `},
  siteData:{styles:[
    {selector:'root',background:'#fdf2f8',fontFamily:'Arial, sans-serif'},
    {selector:'#autoscroll-textarea',boxSizing:'border-box',position:'absolute',left:'250px',top:'180px',width:'300px',height:'144px',margin:'0',padding:'12px 14px',borderWidth:'2px',borderStyle:'solid',borderColor:'#9d174d',borderRadius:'0',overflow:'auto',background:'#ffffff',color:'#500724',fontFamily:'Arial, sans-serif',fontSize:'16px',fontWeight:'400',lineHeight:'24px',whiteSpace:'pre-wrap'},
    {selector:'#autoscroll-textarea:focus',borderColor:'#ec4899'},
  ],root:{children:[{type:'textarea',id:'autoscroll-textarea',value,rows:5}]}},
};
