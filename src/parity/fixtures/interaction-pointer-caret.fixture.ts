import type { ParityFixture } from '../parity.types';

export const interactionPointerCaretFixture: ParityFixture = {
  id: 'interaction-pointer-caret', title: 'Pointer caret placement', category: 'forms-interactive',
  expectedBehavior: 'Clicking at different horizontal positions in a text input focuses it and places a collapsed caret at the nearest browser text boundary.',
  measurementIds: ['caret-input'], interactionIds: ['caret-input'],
  enforcePointerCursor: true,
  controlVisualStateIds: ['caret-input'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click'],
  interactionSteps: [
    { id: 'place-near-start', actions: [{ type: 'click', elementId: 'caret-input', offsetX: 31, offsetY: 32 }] },
    { id: 'place-near-middle', actions: [{ type: 'click', elementId: 'caret-input', offsetX: 94, offsetY: 32 }] },
    { id: 'place-near-end', actions: [{ type: 'click', elementId: 'caret-input', offsetX: 150, offsetY: 32 }] },
  ],
  reference: { html: '<input id="caret-input" type="text" value="abcdefghij">', css: `
    #parity-reference-viewport{position:relative;overflow:hidden;background:#f8fafc;font-family:Arial,sans-serif}
    #caret-input{appearance:none;box-sizing:border-box;position:absolute;left:200px;top:220px;width:360px;height:64px;margin:0;padding:14px 16px;border:2px solid #334155;border-radius:0;outline:0;background:#fff;color:#0f172a;font:400 20px/32px Arial,sans-serif}
    #caret-input:focus{border-color:#2563eb}
  ` },
  siteData: { styles: [
    {selector:'root',background:'#f8fafc',fontFamily:'Arial, sans-serif'},
    {selector:'#caret-input',boxSizing:'border-box',position:'absolute',left:'200px',top:'220px',width:'360px',height:'64px',margin:'0',padding:'14px 16px',borderWidth:'2px',borderStyle:'solid',borderColor:'#334155',borderRadius:'0',background:'#ffffff',color:'#0f172a',fontFamily:'Arial, sans-serif',fontSize:'20px',fontWeight:'400',lineHeight:'32px'},
    {selector:'#caret-input:focus',borderColor:'#2563eb'},
  ],root:{children:[{type:'input',inputType:'text',id:'caret-input',value:'abcdefghij'}]}},
};
