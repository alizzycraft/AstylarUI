import { ParityFixture } from '../parity.types';

export const flexScaledShrinkFixture: ParityFixture = {
  id: 'flex-scaled-shrink',
  title: 'Flex shrink scaled by base size',
  category: 'flexbox',
  expectedBehavior: 'Negative free space is distributed using each item flex-shrink factor multiplied by its flex base size.',
  measurementIds: ['scaled-shrink-row', 'scaled-shrink-large', 'scaled-shrink-small'],
  reference: {
    html: '<section id="scaled-shrink-row"><div id="scaled-shrink-large"></div><div id="scaled-shrink-small"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f1f5f9; }
      #scaled-shrink-row { box-sizing:border-box; display:flex; flex-direction:row; gap:10px; position:absolute; left:100px; top:90px; width:300px; height:100px; padding:10px; background:#cbd5e1; }
      #scaled-shrink-large { box-sizing:border-box; flex:0 1 200px; width:200px; height:80px; background:#2563eb; }
      #scaled-shrink-small { box-sizing:border-box; flex:0 1 150px; width:150px; height:80px; background:#7c3aed; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f1f5f9' },
      { selector:'#scaled-shrink-row', boxSizing:'border-box', display:'flex', flexDirection:'row', gap:'10px', position:'absolute', left:'100px', top:'90px', width:'300px', height:'100px', padding:'10px', background:'#cbd5e1' },
      { selector:'#scaled-shrink-large', boxSizing:'border-box', flex:'0 1 200px', width:'200px', height:'80px', background:'#2563eb' },
      { selector:'#scaled-shrink-small', boxSizing:'border-box', flex:'0 1 150px', width:'150px', height:'80px', background:'#7c3aed' },
    ],
    root: {
      children:[{
        type:'section', id:'scaled-shrink-row', children:[
          { type:'div', id:'scaled-shrink-large' },
          { type:'div', id:'scaled-shrink-small' },
        ],
      }],
    },
  },
};
