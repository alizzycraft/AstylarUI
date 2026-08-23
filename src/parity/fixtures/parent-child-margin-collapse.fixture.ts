import { ParityFixture } from '../parity.types';

export const parentChildMarginCollapseFixture: ParityFixture = {
  id: 'parent-child-margin-collapse',
  title: 'Parent and child vertical margin collapse',
  category: 'box-model-units',
  expectedBehavior: 'The first and last child margins collapse through an unbordered, unpadded auto-height block and participate in its surrounding sibling flow.',
  measurementIds: [
    'margin-collapse-host',
    'margin-collapse-before',
    'margin-collapse-parent',
    'margin-collapse-child',
    'margin-collapse-after',
  ],
  reference: {
    html: `
      <section id="margin-collapse-host">
        <div id="margin-collapse-before"></div>
        <div id="margin-collapse-parent"><div id="margin-collapse-child"></div></div>
        <div id="margin-collapse-after"></div>
      </section>
    `,
    css: `
      #parity-reference-viewport { position:relative; overflow:hidden; background:#f8fafc; }
      #margin-collapse-host { box-sizing:border-box; position:absolute; left:80px; top:50px; width:240px; padding:10px; border:2px solid #334155; background:#e2e8f0; }
      #margin-collapse-before { box-sizing:border-box; height:20px; background:#38bdf8; }
      #margin-collapse-parent { box-sizing:border-box; background:#fef3c7; }
      #margin-collapse-child { box-sizing:border-box; height:60px; margin:8px 0 12px; background:#f59e0b; }
      #margin-collapse-after { box-sizing:border-box; height:20px; margin-top:4px; background:#22c55e; }
    `,
  },
  siteData: {
    styles: [
      { selector:'root', background:'#f8fafc' },
      { selector:'#margin-collapse-host', boxSizing:'border-box', position:'absolute', left:'80px', top:'50px', width:'240px', padding:'10px', borderWidth:'2px', borderStyle:'solid', borderColor:'#334155', background:'#e2e8f0' },
      { selector:'#margin-collapse-before', boxSizing:'border-box', height:'20px', background:'#38bdf8' },
      { selector:'#margin-collapse-parent', boxSizing:'border-box', background:'#fef3c7' },
      { selector:'#margin-collapse-child', boxSizing:'border-box', height:'60px', margin:'8px 0 12px', background:'#f59e0b' },
      { selector:'#margin-collapse-after', boxSizing:'border-box', height:'20px', marginTop:'4px', background:'#22c55e' },
    ],
    root: {
      children: [{
        type:'section', id:'margin-collapse-host', children:[
          { type:'div', id:'margin-collapse-before' },
          { type:'div', id:'margin-collapse-parent', children:[
            { type:'div', id:'margin-collapse-child' },
          ] },
          { type:'div', id:'margin-collapse-after' },
        ],
      }],
    },
  },
};
