import { ParityFixture } from '../parity.types';

export const intrinsicInputButtonFixture: ParityFixture = {
  id: 'intrinsic-input-button',
  title: 'Content-sized input button',
  category: 'forms-interactive',
  expectedBehavior: 'An appearance-none input button with auto dimensions sizes its border box from its label, line height, padding, and borders.',
  measurementIds: ['intrinsic-input-button'],
  reference: {
    html: '<input id="intrinsic-input-button" type="button" value="Create item">',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#eff6ff; font-family:Arial,sans-serif; }
      #intrinsic-input-button { appearance:none; box-sizing:border-box; position:absolute; left:110px; top:90px; width:auto; height:auto; margin:0; padding:10px 16px; border:2px solid #1d4ed8; border-radius:6px; background:#2563eb; color:#ffffff; font:700 14px/20px Arial,sans-serif; text-align:center; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#eff6ff', fontFamily:'Arial, sans-serif' },
      { selector:'#intrinsic-input-button', boxSizing:'border-box', position:'absolute', left:'110px', top:'90px', width:'auto', height:'auto', margin:'0', padding:'10px 16px', borderWidth:'2px', borderStyle:'solid', borderColor:'#1d4ed8', borderRadius:'6px', background:'#2563eb', color:'#ffffff', fontFamily:'Arial, sans-serif', fontSize:'14px', fontWeight:'700', lineHeight:'20px', textAlign:'center' },
    ],
    root: {
      children: [{ type:'input', inputType:'button', id:'intrinsic-input-button', value:'Create item' }],
    },
  },
};
