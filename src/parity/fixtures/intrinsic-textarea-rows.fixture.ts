import { ParityFixture } from '../parity.types';

export const intrinsicTextareaRowsFixture: ParityFixture = {
  id: 'intrinsic-textarea-rows',
  title: 'Textarea rows driving auto height',
  category: 'forms-interactive',
  expectedBehavior: 'A height-auto appearance-none textarea derives its border-box height from rows, line height, padding, and borders.',
  measurementIds: ['intrinsic-textarea'],
  reference: {
    html: '<textarea id="intrinsic-textarea" rows="2">Spatial interfaces</textarea>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #intrinsic-textarea { appearance:none; box-sizing:border-box; position:absolute; left:120px; top:90px; width:260px; height:auto; margin:0; padding:5px 9px; border:1px solid #475569; border-radius:0; background:#ffffff; color:#0f172a; font:400 12px/24px Arial,sans-serif; white-space:pre-wrap; resize:none; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'#intrinsic-textarea', boxSizing:'border-box', position:'absolute', left:'120px', top:'90px', width:'260px', height:'auto', margin:'0', padding:'5px 9px', borderWidth:'1px', borderStyle:'solid', borderColor:'#475569', borderRadius:'0', background:'#ffffff', color:'#0f172a', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'24px', whiteSpace:'pre-wrap' },
    ],
    root: {
      children:[{ type:'textarea', id:'intrinsic-textarea', rows:2, value:'Spatial interfaces' }],
    },
  },
};
