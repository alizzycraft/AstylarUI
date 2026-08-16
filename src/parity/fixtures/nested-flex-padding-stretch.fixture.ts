import { ParityFixture } from '../parity.types';

export const nestedFlexPaddingStretchFixture: ParityFixture = {
  id: 'nested-flex-padding-stretch',
  title: 'Nested flex padding and stretch',
  category: 'flexbox',
  expectedBehavior: 'A padded flex container created as a flex item preserves its assigned used size while stretching an auto-sized child inside its content box.',
  measurementIds: ['nested-stretch-outer', 'nested-stretch-header', 'nested-stretch-main', 'nested-stretch-panel'],
  reference: {
    html: '<section id="nested-stretch-outer"><header id="nested-stretch-header"></header><main id="nested-stretch-main"><article id="nested-stretch-panel"><div id="nested-stretch-content"></div></article></main></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#ecfeff; }
      #nested-stretch-outer { box-sizing:border-box; display:flex; flex-direction:column; position:absolute; left:90px; top:60px; width:360px; height:300px; background:#cffafe; }
      #nested-stretch-header { box-sizing:border-box; flex:0 0 60px; background:#0891b2; }
      #nested-stretch-main { box-sizing:border-box; display:flex; flex:1 1 auto; flex-direction:row; gap:12px; min-height:0; padding:12px; background:#a5f3fc; overflow:hidden; }
      #nested-stretch-panel { box-sizing:border-box; width:140px; height:auto; margin:0; padding:10px; border:2px solid #155e75; background:#e0f2fe; overflow:hidden; }
      #nested-stretch-content { box-sizing:border-box; width:auto; height:260px; background:#67e8f9; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#ecfeff' },
      { selector:'#nested-stretch-outer', boxSizing:'border-box', display:'flex', flexDirection:'column', position:'absolute', left:'90px', top:'60px', width:'360px', height:'300px', background:'#cffafe' },
      { selector:'#nested-stretch-header', boxSizing:'border-box', flex:'0 0 60px', background:'#0891b2' },
      { selector:'#nested-stretch-main', boxSizing:'border-box', display:'flex', flex:'1 1 auto', flexDirection:'row', gap:'12px', minHeight:'0', padding:'12px', background:'#a5f3fc', overflow:'hidden' },
      { selector:'#nested-stretch-panel', boxSizing:'border-box', width:'140px', height:'auto', margin:'0', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#155e75', background:'#e0f2fe', overflow:'hidden' },
      { selector:'#nested-stretch-content', boxSizing:'border-box', width:'auto', height:'260px', background:'#67e8f9' },
    ],
    root: {
      children:[{
        type:'section', id:'nested-stretch-outer', children:[
          { type:'header', id:'nested-stretch-header' },
          { type:'main', id:'nested-stretch-main', children:[{
            type:'article', id:'nested-stretch-panel', children:[
              { type:'div', id:'nested-stretch-content' },
            ],
          }] },
        ],
      }],
    },
  },
};
