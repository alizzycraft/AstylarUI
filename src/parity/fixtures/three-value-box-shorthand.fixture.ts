import { ParityFixture } from '../parity.types';

export const threeValueBoxShorthandFixture: ParityFixture = {
  id: 'three-value-box-shorthand',
  title: 'Three-value padding and margin shorthand',
  category: 'box-model-units',
  expectedBehavior: 'Intrinsic flex sizing expands three-value padding and margin shorthand as top, horizontal, and bottom values.',
  measurementIds: ['three-value-shell', 'three-value-card', 'three-value-child'],
  reference: {
    html: '<section id="three-value-shell"><div id="three-value-card"><div id="three-value-child"></div></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#fefce8; }
      #three-value-shell { box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; position:absolute; left:90px; top:60px; width:340px; height:260px; padding:20px; background:#fef9c3; }
      #three-value-card { box-sizing:border-box; display:flex; flex-direction:column; width:240px; height:auto; margin:0; padding:24px 12px 8px; border:2px solid #a16207; background:#ffffff; }
      #three-value-child { box-sizing:border-box; flex:0 0 auto; width:200px; height:40px; margin:6px 4px 10px; background:#eab308; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#fefce8' },
      { selector:'#three-value-shell', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', position:'absolute', left:'90px', top:'60px', width:'340px', height:'260px', padding:'20px', background:'#fef9c3' },
      { selector:'#three-value-card', boxSizing:'border-box', display:'flex', flexDirection:'column', width:'240px', height:'auto', margin:'0', padding:'24px 12px 8px', borderWidth:'2px', borderStyle:'solid', borderColor:'#a16207', background:'#ffffff' },
      { selector:'#three-value-child', boxSizing:'border-box', flex:'0 0 auto', width:'200px', height:'40px', margin:'6px 4px 10px', background:'#eab308' },
    ],
    root: {
      children:[{
        type:'section', id:'three-value-shell', children:[{
          type:'div', id:'three-value-card', children:[
            { type:'div', id:'three-value-child' },
          ],
        }],
      }],
    },
  },
};
