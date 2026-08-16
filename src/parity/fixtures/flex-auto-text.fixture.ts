import { ParityFixture } from '../parity.types';

export const flexAutoTextFixture: ParityFixture = {
  id: 'flex-auto-text', title: 'Intrinsic text sizing in flex layout', category: 'flexbox',
  expectedBehavior: 'Height-auto text flex items use their wrapped line-box height when justify-content positions the item group.',
  measurementIds: ['fat-parent', 'fat-value', 'fat-label'],
  reference: {
    html: '<article id="fat-parent"><strong id="fat-value">72%</strong><span id="fat-label">Completed</span></article>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; font-family:Arial,sans-serif; }
      #fat-parent { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; position:absolute; left:100px; top:70px; width:180px; height:130px; padding:10px; background:#dcfce7; color:#166534; }
      #fat-value { box-sizing:border-box; width:160px; height:32px; font:700 20px/32px Arial,sans-serif; }
      #fat-label { box-sizing:border-box; width:160px; font:400 12px/20px Arial,sans-serif; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc', fontFamily:'Arial, sans-serif' },
      { selector:'#fat-parent', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', position:'absolute', left:'100px', top:'70px', width:'180px', height:'130px', padding:'10px', background:'#dcfce7', color:'#166534' },
      { selector:'#fat-value', boxSizing:'border-box', width:'160px', height:'32px', fontFamily:'Arial, sans-serif', fontSize:'20px', fontWeight:'700', lineHeight:'32px' },
      { selector:'#fat-label', boxSizing:'border-box', width:'160px', fontFamily:'Arial, sans-serif', fontSize:'12px', lineHeight:'20px' },
    ],
    root:{ children:[{ type:'article', id:'fat-parent', children:[
      { type:'strong', id:'fat-value', textContent:'72%' },
      { type:'span', id:'fat-label', textContent:'Completed' },
    ] }] },
  },
};
