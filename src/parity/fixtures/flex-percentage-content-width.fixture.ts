import { ParityFixture } from '../parity.types';

export const flexPercentageContentWidthFixture: ParityFixture = {
  id: 'flex-percentage-content-width',
  title: 'Percentage flex item width from content box',
  category: 'flexbox',
  expectedBehavior: 'A percentage width on a flex item resolves against the flex container content box, excluding its padding and borders.',
  measurementIds: ['flex-percent-container', 'flex-percent-item'],
  reference: {
    html: '<section id="flex-percent-container"><div id="flex-percent-item"></div></section>',
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #flex-percent-container { box-sizing:border-box; display:flex; align-items:flex-start; position:absolute; left:100px; top:80px; width:300px; height:160px; padding:20px; border:2px solid #475569; background:#e2e8f0; }
      #flex-percent-item { box-sizing:border-box; flex:0 0 auto; width:50%; height:40px; background:#2563eb; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc' },
      { selector:'#flex-percent-container', boxSizing:'border-box', display:'flex', alignItems:'flex-start', position:'absolute', left:'100px', top:'80px', width:'300px', height:'160px', padding:'20px', borderWidth:'2px', borderStyle:'solid', borderColor:'#475569', background:'#e2e8f0' },
      { selector:'#flex-percent-item', boxSizing:'border-box', flex:'0 0 auto', width:'50%', height:'40px', background:'#2563eb' },
    ],
    root: {
      children:[{
        type:'section', id:'flex-percent-container',
        children:[{ type:'div', id:'flex-percent-item' }],
      }],
    },
  },
};
