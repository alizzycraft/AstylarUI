import type { ParityFixture } from '../parity.types';

export const interactionPointerDragSelectionFixture: ParityFixture = {
  id: 'interaction-pointer-drag-selection',
  title: 'Bidirectional pointer drag selection',
  category: 'forms-interactive',
  expectedBehavior:
    'Forward and backward pointer drags expose ordered selection endpoints while retaining the active caret direction, and typing replaces each selected range with browser-equivalent events.',
  measurementIds: ['forward-input', 'backward-input'],
  interactionIds: ['forward-input', 'backward-input'],
  enforcePointerCursor: true,
  controlVisualStateIds: ['forward-input', 'backward-input'],
  interactionEventTypes: ['pointerdown', 'focus', 'pointerup', 'click', 'input', 'change', 'blur'],
  interactionSteps: [
    { id: 'drag-forward', actions: [
      { type: 'pointer-down', elementId: 'forward-input', offsetX: 31, offsetY: 32 },
      { type: 'hover', elementId: 'forward-input', offsetX: 94, offsetY: 32 },
      { type: 'pointer-up' },
    ] },
    { id: 'replace-forward-selection', actions: [{ type: 'type-text', text: 'X' }] },
    { id: 'drag-backward', actions: [
      { type: 'pointer-down', elementId: 'backward-input', offsetX: 94, offsetY: 32 },
      { type: 'hover', elementId: 'backward-input', offsetX: 31, offsetY: 32 },
      { type: 'pointer-up' },
    ] },
    { id: 'replace-backward-selection', actions: [{ type: 'type-text', text: 'Y' }] },
  ],
  reference: {
    html: '<input id="forward-input" type="text" value="abcdefghij"><input id="backward-input" type="text" value="abcdefghij">',
    css: `
      #parity-reference-viewport{position:relative;overflow:hidden;background:#f0fdfa;font-family:Arial,sans-serif}
      #forward-input,#backward-input{appearance:none;box-sizing:border-box;position:absolute;left:200px;width:360px;height:64px;margin:0;padding:14px 16px;border:2px solid #134e4a;border-radius:0;outline:0;background:#fff;color:#0f172a;font:400 20px/32px Arial,sans-serif}
      #forward-input{top:170px} #backward-input{top:310px}
      #forward-input:focus,#backward-input:focus{border-color:#0d9488}
    `,
  },
  siteData: { styles: [
    {selector:'root',background:'#f0fdfa',fontFamily:'Arial, sans-serif'},
    {selector:'#forward-input, #backward-input',boxSizing:'border-box',position:'absolute',left:'200px',width:'360px',height:'64px',margin:'0',padding:'14px 16px',borderWidth:'2px',borderStyle:'solid',borderColor:'#134e4a',borderRadius:'0',background:'#ffffff',color:'#0f172a',fontFamily:'Arial, sans-serif',fontSize:'20px',fontWeight:'400',lineHeight:'32px'},
    {selector:'#forward-input',top:'170px'}, {selector:'#backward-input',top:'310px'},
    {selector:'#forward-input:focus, #backward-input:focus',borderColor:'#0d9488'},
  ],root:{children:[
    {type:'input',inputType:'text',id:'forward-input',value:'abcdefghij'},
    {type:'input',inputType:'text',id:'backward-input',value:'abcdefghij'},
  ]}},
};
